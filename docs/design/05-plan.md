# Door Policy — master build plan (v0.1 MVP)

This plan is the single source of truth. Where the design docs (01–04) disagree, this doc wins.

## 1. What we are shipping

A browser game for Poki: you are the bouncer of a weird club. Guests (emoji cards) arrive one by one; the club has a secret admission rule; the manager demos a few, then you swipe ADMIT / REJECT. Work the rule out before you get 3 strikes. Optionally name the rule for a bonus star.

**MVP scope (must ship):**
- Clubs 1–2 fully handcrafted-tuned (Juice Box, Disco Snail: 10 shifts each, shifts 1–12 from `03-content.md` §2, 13–20 procedural within tier).
- Clubs 3–5 playable with procedurally generated shifts per tier (10 each). Club 6 (Moon Room, mixed) unlocks after club 5.
- Daily Door (seeded by UTC date, 12 judged guests, no hints, shareable emoji grid).
- Name-the-rule bonus with 4 options.
- Guest log panel (past guests with correct outcome) — required for fair reasoning.
- Hints: free nudge + 🎬 rewarded hint; 🎬 second chance after fired.
- Poki SDK wrapper with no-op fallback; save via localStorage (try/catch); WebAudio SFX; settings (sound, reduced motion).
- Works in 16:9 landscape (desktop) and portrait mobile.

**Deferred to v0.2:** special nights (`03-content.md` §4), extra locales, sequential (`prev`) rules outside Daily Sunday / club 5 late shifts, music loop.

## 2. Reconciled decisions

| Topic | Decision |
|---|---|
| Rule model | `01-rule-engine.md` JSON AST (`is/has/cmp/letter/same/diff/count/prev` + `and/or/not/xor`). The `Rule` type in `04-tech.md` §3 is replaced by it. |
| Traits | 7 traits from `01` §1: hat, item, shirt, pet, mood, name, age. Add items 🥁 drum {music}, 🎺 trumpet {music, color:yellow}, 🍩 donut {food, sweet, round, color:pink}, ⚽ ball {round, color:white}. Quote is flavor only, never in rules. |
| Names | Use the 40-name list from `03` §3 (lengths 3–8); derived props computed. Names are chosen independently of all other traits. |
| Cards | Show 4–5 traits per level (`visible`); name + age always visible from club 2 on; club 1 shows hat/item/shirt/pet only (+ name label, not a rule target). |
| Demo guests | Default 4 (2 admit + 2 reject incl. a minimal pair). Handcrafted shifts may override (shift 1 = 2). |
| Shift length / win | Pre-dealt queue: demo + 16 judged (+ up to 8 extra if fairness requires). **Win** = 6 correct in a row OR 10 correct total. **Fired** = 3 strikes. Queue exhausted without either → 1-star pass. |
| Fairness | Every level validated at generation (`01` §3 must-hold). `lenientAmbiguous` on: a wrong call that a cheaper still-consistent rule would agree with costs no strike ("Fair guess!"). |
| Stars | ★ clear, ★ ≤1 strike, ★ named the rule. |
| Unlocks | Next club after shift 10 cleared AND 15/30 stars in club (one 🎬 skip per club). |
| Ads | `gameplayStart` when first judged guest appears; `gameplayStop` at result/pause/break. `commercialBreak` only on next-shift/retry transitions, not before shift 3, ≥3 shifts and ≥120 s apart. Rewarded: hint, second chance, unlock skip. 🎬 button, purple/grey, beside equal-size Continue; hidden when SDK unavailable. |
| Module layout | `04-tech.md` §2 layout, zero dependencies, ES modules, `node --test`. |

## 3. Work packages (parallel)

Each package owns its files exclusively. Interfaces below are binding.

### WP-A Engine (pure, no DOM) — `src/engine/*`, `test/engine/*`
- `rng.js`: `createRng(seed)` → `{next,int,pick,shuffle,fork(label)}`; `hashString`. mulberry32.
- `traits.js`: `TRAITS` catalog (per `01` §1 + additions), `prop(guest, trait, p)`, `randomGuest(rng, visible)`, `guestEmoji(guest, trait)`.
- `rules.js`: `evalRule(rule, guest, prev)`, `compile(rule)`, `ruleCost(rule)`, `describe(rule, t)` (i18n keys only), `RULE_LIBRARY` (the 40 example rules + club 1–2 handcrafted rules), `randomRule(rng, tier, visible)`.
- `hypotheses.js`: `buildHypotheses(target, visible, rng)`, `isAlias`, `pickDecoys(target, H, obs, rng)`.
- `dealer.js`: `dealLevel({target, visible, demoCount, judged, seed}) -> Level` (validation + retries), `isAmbiguous(level, k, call)`.
- `daily.js`: `dateKey(date)`, `dailyLevel(dateKey) -> Level`.
- `Level = {seed, tier, visible, target, guests[], labels[], demoCount, choices[4], correctIdx, D}`.
- Tests: the 15 from `01` §7 (perf test threshold 300 ms to avoid CI flake).

### WP-B Game logic + data + platform — `src/game/*`, `src/data/*`, `src/poki.js`, `src/i18n.js`, `test/game/*`
- `data/clubs.js`: 6 clubs (theme colors, manager, tier, handcrafted shift table for clubs 1–2 using rule ids from `RULE_LIBRARY`).
- `data/content.js`: quotes, quips; `data/strings.en.js`: all UI text + rule description templates.
- `game/state.js`: pure reducer `createRound(level, opts)`, `step(state, action)`; actions `verdict | hint | revive | guess | continue`; phases `demo → play → guess → result`; implements win/fired/pass, strikes, streak, lenient ambiguity (via engine `isAmbiguous`), stars.
- `game/progression.js`: `levelFor(clubId, idx)` (handcrafted or seeded procedural: seed = hash(clubId+idx+ENGINE_VERSION)), unlocks, stars, `applyResult`, `applyDaily` (streak by UTC day).
- `game/save.js`: `createSave(storage)`; keys `doorpolicy.save.v1`, `doorpolicy.settings.v1`; in-memory fallback.
- `poki.js`, `i18n.js` per `04` §3–4.
- Tests: reducer transitions, win/fired/pass, stars, unlock, daily streak (consecutive/missed/same-day), save with throwing storage.

### WP-C UI shell — `index.html`, `styles/*`, `src/ui/*`, `src/main.js`, `test/smoke.cjs`
- Screens: title, club map, shift (manager bubble, card stage, guest log, strikes, streak, hint/🎬), name-the-rule, result, daily, settings.
- Swipe/buttons/keys per `04` §5; WebAudio SFX per `02`; fx respecting reduced motion; share grid → clipboard.
- `main.js` wires engine/game/save/poki; `?debug` exposes `window.__door = {level, state}`; `?nopoki` fallback.
- Smoke test (Playwright, 390×844 and 1280×720): load, start shift 1, use `__door` to answer correctly, reach result, no console errors.

Order: WP-A and WP-B start together (B mocks engine with a tiny stub only if needed; it imports real engine once A lands). WP-C starts together too, coding against the interfaces; integration pass by the lead after all three land.

## 4. Definition of done
1. `node --test` green; smoke test green at both viewports with no console errors.
2. Shift 1 solvable by a new player in < 30 s; first verdict within 10 s of pressing Play.
3. 200 generated levels per tier pass validation; dealLevel p95 < 150 ms in node.
4. Game fully works with SDK blocked and with localStorage throwing.
5. Total payload < 300 KB, no external requests except the Poki SDK.
6. Critical review (bugs, Poki compliance, fun/retention) passed before final commit.
