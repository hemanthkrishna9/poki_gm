# Door Policy — technical spec

## 0. Environment (checked 2026-10-18)

| Tool | Status |
|---|---|
| node / npm | v22.22.0 / 10.9.4 (`node --test` built in) |
| python3 | 3.13 (`http.server` available) |
| npm registry | reachable (`npm view vite version` → 8.3.4) — not needed |
| Global npm | `serve@14.2.6`, `http-server@14.1.1`, `playwright@1.56.1`, `eslint`, `prettier` |
| Chromium | `/opt/pw-browsers/chromium-1194`, `PLAYWRIGHT_BROWSERS_PATH` already set; verified headless launch works |

Note: the global `playwright` cannot be resolved via bare ESM `import 'playwright'` from the repo. Smoke scripts load it via `createRequire` + `NODE_PATH=$(npm root -g)` (see §8). Nothing is installed into the repo.

## 1. Stack

**Vanilla JS (ES modules) + HTML + CSS. Zero runtime and zero dev dependencies.** No framework, no bundler required to run.

- The game is a card UI: DOM + CSS transforms + emoji give crisp text at any DPI, free accessibility, and tiny payload (target < 150 KB total vs Poki's 3 MB budget).
- No canvas/WebGL engine needed; animations are CSS transitions/keyframes driven by class toggles.
- Native ESM loads directly from a static server; no toolchain to break.
- Logic modules are pure and run unchanged under `node --test`.
- Optional `tools/build.mjs` (node built-ins only) copies `index.html`, `src/`, `assets/` to `dist/`, strips `test/`, stamps `BUILD_VERSION`, and zips nothing (Poki upload takes a folder/zip; zip manually or via `zip -r`). No minification required; may inline-concatenate later if request count matters.
- JSDoc type comments for editor help; no TypeScript compile step.

## 2. Layout

```
index.html              # single page, <script type="module" src="src/main.js">
styles/main.css         # tokens, layout, components; styles/anim.css for keyframes
src/main.js             # boot: load save, init poki, init ui, route to first screen
src/engine/             # PURE: no DOM, no globals, no Date.now/Math.random
  rng.js                # seeded PRNG (mulberry32), helpers
  traits.js             # trait catalog: categories, values, emoji, tags
  rules.js              # rule DSL: construct, evaluate, describe, complexity score
  dealer.js             # generates guest sequence for a rule (balanced, informative)
  hypotheses.js         # distractor rules for "name the rule"; consistency checks
  daily.js              # dateKey -> seed -> daily level spec
src/game/               # PURE-ish: state machines, no DOM
  state.js              # round state machine (demo -> play -> guess -> result)
  progression.js        # clubs, unlocks, stars, streaks
  save.js               # localStorage wrapper (only module touching storage)
src/ui/                 # DOM only; never contains rule logic
  screens.js            # screen router + screen builders (title, map, round, result, daily)
  card.js               # renders guest card element from Guest
  swipe.js              # pointer/keyboard/button input -> 'admit'|'reject'
  audio.js              # WebAudio synthesized blips, mute state
  fx.js                 # shake, confetti, stamp; respects reduced motion
  share.js              # emoji result string + clipboard
src/poki.js             # Poki SDK wrapper with no-op fallback
src/i18n.js             # t(key, params), locale select
src/data/
  clubs.js              # club definitions: rule pools, complexity range, theme
  content.js            # manager quips, guest names, special-night scripts
  strings.en.js         # string table (export default {key: 'text'})
test/*.test.js          # node --test, engine + game only
test/smoke.cjs          # Playwright headless smoke (§8)
tools/build.mjs         # optional dist builder
```

Rule: `engine/` and `game/` (except `save.js`, which receives a storage object) must import nothing from `ui/`, `poki.js`, or browser globals. CI-able via `node --test`.

## 3. Module interfaces

Shared types (JSDoc in `src/engine/types.js`, no runtime code):

```
Trait   = { cat: string, val: string, emoji: string, tags: string[] }   // cat e.g. 'hat','item','age','name','quote'
Guest   = { id: string, traits: Trait[], name: string, quote?: string }
Rule    = { id: string, kind: string, params: object, complexity: number }
Verdict = 'admit' | 'reject'
LevelSpec = { clubId, levelIdx, seed, rule: Rule, demoCount, guests: Guest[], options: Rule[] }
```

**engine/rng.js**
- `createRng(seed: number|string) -> { next(): number /*[0,1)*/, int(lo,hi), pick(arr), shuffle(arr) /*copy*/, fork(label): Rng }`
- `hashString(s) -> uint32`

**engine/traits.js**
- `CATEGORIES: readonly string[]`, `TRAITS: readonly Trait[]`
- `randomGuest(rng, opts?: {count?: 3|4|5, forced?: Trait[], banned?: Trait[]}) -> Guest`

**engine/rules.js**
- `RULE_KINDS` (e.g. `has`, `notHas`, `catCount`, `tagAny`, `and`, `or`, `xor`, `nameStartsWith`, `countParity`)
- `makeRule(kind, params) -> Rule`
- `randomRule(rng, {minC, maxC, kinds?}) -> Rule`
- `evaluate(rule, guest) -> boolean` (true = admit)
- `describe(rule, t) -> string` (uses i18n `t`; engine never hardcodes English)
- `equivalentOn(ruleA, ruleB, guests) -> boolean`

**engine/dealer.js**
- `dealGuests(rng, rule, {n, demoCount, admitRatio=[0.35,0.65]}) -> Guest[]` — guarantees both verdicts appear in demos and that demos rule out the top distractors where possible.

**engine/hypotheses.js**
- `makeOptions(rng, rule, seenGuests, k=4) -> Rule[]` — correct rule + k-1 distractors, each distractor *consistent with fewer* seen guests than the truth, and non-equivalent on the dealt set; shuffled.

**engine/daily.js**
- `dateKey(date: Date) -> 'YYYY-MM-DD'` (UTC) ; `dailySpec(dateKey) -> LevelSpec`

**game/state.js** (reducer style, pure)
- `createRound(spec: LevelSpec, {lives=3}) -> RoundState`
- `step(state, action) -> RoundState` with actions `{type:'verdict', v}`, `{type:'guess', ruleId}`, `{type:'continue'}`, `{type:'revive'}`
- `RoundState = { phase:'demo'|'play'|'guess'|'result', idx, lives, correct, mistakes, history:[{guestId,v,ok}], stars, outcome?:'cleared'|'fired' }`
- `selectors: currentGuest(s), isOver(s), shareGrid(s)`

**game/progression.js**
- `CLUB_ORDER`, `isUnlocked(progress, clubId)`, `applyResult(progress, {clubId, levelIdx, stars}) -> progress`, `applyDaily(progress, dateKey, result) -> progress` (streak logic), `levelSpecFor(clubId, levelIdx) -> LevelSpec`

**game/save.js**
- `createSave(storage = globalThis.localStorage) -> { load(): SaveData, save(data): boolean, reset(): void }`

**poki.js**
- `init(): Promise<void>`, `gameLoadingFinished()`, `gameplayStart()`, `gameplayStop()`, `commercialBreak(): Promise<void>`, `rewardedBreak(): Promise<boolean>`, `isAvailable(): boolean`

**ui/** (receive callbacks; never mutate state directly)
- `screens.show(name, props)`; names: `title|map|round|guess|result|daily|settings`
- `card.renderGuest(guest, {demoVerdict?}) -> HTMLElement`
- `swipe.attach(cardEl, {onDecide(v), onDrag(dx)}) -> detach()`; `swipe.bindKeys({onDecide, onConfirm, onBack}) -> unbind()`
- `audio.play(name)`, `audio.setMuted(bool)`; `fx.stamp(el, v)`, `fx.shake(el)`, `fx.confetti()`
- `i18n.t(key, params?) -> string`, `i18n.setLocale(code)`

`main.js` is the only orchestrator wiring `state.step` → `screens` → `save`/`poki`. Each module owner can work in parallel against these signatures; contract tests in `test/` pin the engine/game shapes.

## 4. Poki SDK wrapper

- `index.html` includes `<script src="https://game-cdn.poki.com/scripts/v2/poki-sdk.js"></script>` before the module script. Poki requires it on their platform; locally it may fail to load (offline) — that must be harmless.
- `poki.js` checks `window.PokiSDK`; if missing or `init()` rejects (adblock), sets `available=false` and every method becomes a no-op: `commercialBreak` resolves immediately, `rewardedBreak` resolves `false` (UI hides 🎬 button when `!isAvailable()`).
- Call order: `init` → assets ready → `gameLoadingFinished()`; `gameplayStart()` when a round's play phase begins / resumes, `gameplayStop()` on result, pause, or before any break.
- `commercialBreak` only at natural breaks (between levels, returning to map), never mid-round. `rewardedBreak` only for revive (+1 life) or hint, with 🎬 icon, not green, equal size beside "Continue".
- During any break: mute audio, block input; restore after promise settles.
- Dev flag `?nopoki` forces fallback; `?pokidebug` calls `PokiSDK.setDebug(true)`.

## 5. Input

- **Swipe (`swipe.js`)**: Pointer Events on the card, `setPointerCapture`, `touch-action: none` on the card only. Track `dx`; transform `translateX(dx) rotate(dx*0.05deg)`; live tint/stamp opacity from `|dx|/threshold`. Commit when `|dx| > max(80px, 25% card width)` **or** velocity > 0.5 px/ms with `|dx| > 30px`; otherwise spring back. Right = ADMIT, left = REJECT. Ignore secondary pointers; cancel on `pointercancel`.
- **Buttons**: always-visible ADMIT / REJECT buttons (min 48×48 px), same handler.
- **Keyboard**: `ArrowRight`/`KeyD` admit, `ArrowLeft`/`KeyA` reject, `Enter`/`Space` confirm/continue, `Escape` pause/back, `1–4` choose rule option. Ignore `event.repeat`; `preventDefault` on arrows/space to stop iframe scroll.
- **Iframe focus**: on boot and after every break call `window.focus()`; on first `pointerdown` anywhere focus the game root (`tabindex="-1"`). Prevent page scroll/zoom: `overscroll-behavior: none`, `user-select: none`, disable context menu on the card, `<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">`.
- Debounce: input locked while a card animates out (~250 ms) so one gesture = one verdict.

## 6. Responsive layout

- Root `#app` is a CSS grid filling `100dvh` (fallback `100vh`) × `100vw`, padded with `env(safe-area-inset-*)`.
- **Portrait** (default): rows `header(lives/score) | card stage (1fr) | buttons`.
- **Landscape** `@media (orientation: landscape) and (min-aspect-ratio: 4/3)`: columns `manager/hint panel | card stage | buttons stacked`, designed for Poki's 16:9 desktop frame.
- Sizing by `clamp()` and container units: card width `min(88vw, 56dvh, 420px)`, aspect 3:4; emoji `font-size: clamp(28px, 8cqi, 64px)` with `container-type: inline-size` on the card.
- Emoji font stack: `"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`. No webfonts required; optional one display font ≤ 40 KB woff2 bundled locally.
- No external requests (fonts, analytics, CDNs) except the Poki SDK script.

## 7. Persistence

- Single key `doorpolicy.save.v1`; plus `doorpolicy.settings.v1` (mute, reduced-motion override, locale) so settings survive save resets.
- `SaveData = { v:1, clubs:{[clubId]:{levels:{[idx]:stars}}}, daily:{last:'YYYY-MM-DD', streak, best, results:{[dateKey]:{ok,stars}}}, stats:{rounds, correct}, seenTutorial:bool }`; prune `daily.results` to last 60 entries.
- Every `getItem/setItem/JSON.parse` in try/catch; on failure fall back to in-memory object and continue (Safari private mode, blocked storage in iframes). Corrupt JSON → defaults, never throw.
- Migrations: `migrate(raw)` switches on `raw.v`; unknown future version → keep read-only in memory, don't overwrite.
- Write on round end and settings change only (not per swipe).

## 8. Performance, accessibility, i18n

**Performance budget**: initial payload < 300 KB (target < 150 KB), < 30 requests, first interactive < 1 s on mid-range mobile over local; 60 fps swipes (animate only `transform`/`opacity`, `will-change` on the active card only); ≤ 6 card DOM nodes alive; generation of a level < 5 ms; JS heap < 20 MB. Audio synthesized via WebAudio (no audio files), context resumed on first gesture.

**Accessibility**:
- Full keyboard play (§5); visible `:focus-visible` rings.
- `prefers-reduced-motion: reduce` (or settings toggle) → no rotation/shake/confetti; cards cross-fade.
- Colorblind-safe: traits are emoji + text label (`aria-label`); verdicts use icon + word (✅ ADMIT / ⛔ REJECT) and direction, never color alone; contrast ≥ 4.5:1.
- `aria-live="polite"` region announces guest description and verdict outcome; buttons are real `<button>`s.

**i18n**: every user-visible string via `t(key, params)` from `src/data/strings.<locale>.js` (`{n}` placeholders, simple plural keys `key.one/key.other`). Rule descriptions are composed from keyed fragments in `rules.describe(rule, t)`. Locale from `navigator.language` → fallback `en`. Avoid text baked into images; layouts tolerate +40% string length.

## 9. Running and testing

```
# serve locally (any static server; ES modules need http, not file://)
npx serve .                 # global serve@14 already present
python3 -m http.server 8080 # alternative
# open http://localhost:3000/?nopoki

node --test test/           # unit tests (engine + game), no deps
node tools/build.mjs        # optional -> dist/
```

Unit test priorities: rng determinism; `evaluate` truth tables per rule kind; dealer always yields both verdicts in demos and respects admit ratio; `makeOptions` distractors are non-equivalent and less consistent than truth; `dailySpec` stable for a fixed date key; `state.step` lives/fired/cleared transitions; save migration + corrupt-storage fallback (fake storage object).

**Headless smoke test** (`test/smoke.cjs`, not part of `node --test`):

```
npx serve -l 4173 . &   # or python3 -m http.server 4173
NODE_PATH=$(npm root -g) node test/smoke.cjs http://localhost:4173/?nopoki
```

The script `require('playwright')` (CJS so `NODE_PATH` resolves the global 1.56.1; browsers come from `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`) and checks, in Chromium at 390×844 (portrait) and 1280×720 (landscape):
1. Page loads with zero console errors and zero failed requests other than the Poki SDK URL (blocked via `page.route` to simulate offline).
2. Title → Play reaches a round; a guest card with ≥ 3 emoji traits is visible.
3. Keyboard: `ArrowRight` / `ArrowLeft` advance cards; three deliberate wrong calls (use a `?seed=` + `window.__debug.currentRule` exposed only under `?debug`) show the "fired" screen.
4. Pointer swipe via `page.mouse` drag > threshold commits a verdict; short drag springs back.
5. Reload → progress persisted; with `localStorage` stubbed to throw (`addInitScript`), game still boots.
6. No horizontal overflow (`scrollWidth <= innerWidth`); screenshots saved to the scratch dir for review.
