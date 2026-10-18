# Door Policy: master build plan (v0.1 MVP, revision 2)

**This plan is the single source of truth.** Where docs 01–04 disagree with it, this doc wins.

Revision 2 applies the red-team review. It accepts the review's edits 1–11, plus its fun and pacing changes.

**Binding contracts (written by the lead, WP-0):**
- `src/engine/types.js`: the Guest, Rule, Level and RoundState shapes.
- `src/engine/traits.js`: the only trait catalog.
- `test/fixtures/level.sample.json` and `test/fixtures/roundstate.sample.json`.

**Docs that no longer apply:**
- `04-tech.md` §3 types and interfaces are void.
- The trait vocabulary at the top of `03-content.md` is void.

## 1. What we ship

You are the bouncer of a weird club. Guests (emoji cards) arrive one by one, and the club has a secret admission rule.
- The manager judges a few guests to show you the rule. Then you swipe ADMIT or REJECT.
- Press **💡 I've got it!** at any time to name the rule. A correct pick clears the shift instantly with a ★; a wrong pick costs a strike.
- 3 strikes and you're fired.

**MVP scope:**
- **Clubs:**
  - Clubs 1–2: handcrafted shifts 1–12 (from `03-content.md` §2, rewritten onto the catalog), plus procedural shifts 13–20.
  - Clubs 3–6: 10 baked procedural shifts each.
- **Special nights:** two, both in the MVP: Boss in Disguise (club 1 shift 9) and Dog in a Trench Coat (club 2 shift 9).
- **Daily Door:** 12 judged guests and you are never fired. You score x/12, then name the rule at the end. The result is an emoji grid you can share, with no URL.
- **Guest log:** shown as two columns, **IN ✓ / OUT ✗**. The minimal pair is highlighted when the hint is used.
- **Hints:**
  - Hint 1 is free and highlights `hintPair` in the log.
  - Hint 2 is a 🎬 rewarded ad that pulses the `ruleTraits` slots on the current card.
  - Being fired also offers a 🎬 second chance, at most once per shift.
- **Platform:** Poki SDK wrapper with a no-op fallback, localStorage saves (every access in try/catch), WebAudio sound effects, and settings for sound, reduced motion and colour-blind labels. Pause when the tab is hidden.
- **Screens:** layouts for 16:9 landscape (desktop) and portrait mobile. First visit auto-starts shift 1 with no menu.
- **Fired screen:** shows the near-miss line ("1 more and you had it!") and the true rule.

**Deferred to v0.2:** the other special nights, endless mode after club 6, other locales (ES/PT/FR/DE/NL/TR), cosmetics and tips, music loop, and streak freeze.

## 2. Decisions

| Topic | Decision |
|---|---|
| Catalog | `src/engine/traits.js` only: 7 traits (hat, item, shirt, pet, mood, name, age 18–79), 40 names. Fancy hats are top, crown, bow. Warm colours are red, orange, yellow. Emoji carry a `color` property only where the colour is the same on every platform. Shirts are palette-tinted inline SVG, with a text colour label in colour-blind mode. `quote` is flavour only. |
| Rule model | The JSON AST in `types.js`. `describe(rule, t)` builds the text from i18n templates, and a test checks every baked rule's text is unique within its level's choices. |
| Visible traits | Club 1: hat, item, shirt, pet. Club 2: plus mood. Clubs 3–6 and Daily: hat, item, shirt, pet, name, age (6). Rules use only visible traits. |
| Club op families (tier comes from the family, not from D) | C1: `is`. C2: `has` (category), `is none`, `not is`. C3: `not`, `cmp` (age, name.len, pet.legs), name `startsVowel`/`endsVowel`. C4: `and`/`or` of 2 atoms from C1–C3. C5: `same`/`diff`, `count`, `xor`; `prev` only in shifts 8–10. C6: mixed, drawn from C2–C5. Daily: Mon–Tue C2, Wed–Thu C3, Fri C4, Sat–Sun C5 (no `prev`). |
| Shift shape | Default: 4 demo guests (2 admit, 2 reject, including a minimal pair) and 12 judged. **Win = 5 in a row OR 8 correct total**, or a correct "I've got it!" at any time. Handcrafted shifts 1–3 may override, e.g. shift 1 has 2 demo, 3 judged, win 3 in a row. If the queue runs out without a win, the outcome is `out`, which is a loss (retry, no stars). |
| Fairness (checked at bake time) | Must hold: after demo + 8 judged guests, no non-alias hypothesis with cost ≤ cost(T)+2 survives. Clubs 1–2 must also hold: at most 3 cheap survivors after demo + 4 judged. Decoys: each of the 3 is contradicted by at least one **demo** guest, so "I've got it!" is fair at any moment. |
| Lenient calls | A wrong call on guest k is forgiven (`level.lenient[k]`) if a non-alias hypothesis with cost ≤ cost(T), consistent with guests 0..k−1, agrees with the player's call. At most 2 per shift. A lenient call resets the streak and doesn't count as correct. Manager line: "Fair guess! Here's the rule-book page." |
| Alias check | Exact equivalence: enumerate the joint domain of the traits both rules reference (cap 50k combinations; age is collapsed into its distinct threshold buckets). Random sampling is used only for `prev` rules. |
| Hypothesis set H | Every atom over the visible traits and its negation, plus **all** 2-atom and/or combinations over the 60 cheapest atoms, plus mutations of T. Capped at 8000 by cost. A test checks that nothing with cost ≤ cost(T)+2 is ever dropped by the cap. |
| Baking | `tools/bake.mjs` (Node) generates and validates every club level and **366 Daily Doors** (from 2026-11-01) into `src/data/levels.js`. Guests use the 8-char encoding in `traits.js`. Budget is ≤ 300 KB. The runtime does no generation, so the loading screen is instant. |
| Stars | ★ clear, ★ ≤ 1 strike, ★ named the rule (via "I've got it!" or the end-of-shift pick). |
| Unlocks | The next club opens after clearing its shift 10 AND earning 15 of the club's 30 stars. A 🎬 ad can skip this once per club. |
| Streaks | The Daily streak counts consecutive UTC days played. A missed day resets it. Daily #N = days since 2026-11-01, plus 1. |
| Revive | The 🎬 second chance after being fired: strikes go to 2, the streak is kept at 0, the same guest is re-shown, once per shift. |
| Controls | → or D admit, ← or A reject, G "I've got it!", H hint, 1–4 choose an option, Enter/Space continue, Esc pause. Arrow and space default actions are always prevented. |
| Ads | `gameplayStart` when the first judged guest appears and on resume. `gameplayStop` at results, pause and before any break. Name-the-rule counts as gameplay. `commercialBreak` at every natural break (next shift or retry) from shift 3 on; Poki throttles. The rewarded button shows 🎬, is purple, sits beside an equal-size Continue, and is hidden when the SDK is unavailable. No reward if the ad fails. |
| Special nights | The guest carries `special` and a forced label, sits at judged position 2, and is excluded from fairness checks (and from lenient handling). **Boss:** the rule is `item is balloon`; the guest is Gus in disguise (🥸 face, no balloon) and the label is ADMIT; the clue is in the intro line. **Trenchcoat:** the rule is pet none; the guest shows 🧥 and pet none, tapping the coat reveals 🐶, and the label is REJECT. |

## 3. Work packages

Each package owns its files exclusively. All packages code against `types.js` and `traits.js`, which nobody but the lead edits.

### WP-A Engine and bake (pure, no DOM)
**Files:** `src/engine/{rng,rules,hypotheses,dealer,daily}.js`, `tools/bake.mjs`, `src/data/levels.js` (generated), `test/engine/*.test.js`

- **`rng.js`:** `createRng(seed:number|string)` returns `{next,int(lo,hi),pick,shuffle(copy),fork(label)}`. Also `hashString(s)`. Uses mulberry32.
- **`rules.js`:**
  - `evalRule(rule, guest, prev, visible)` returns a boolean.
  - `ruleCost(rule)` returns a number.
  - `ruleTraits(rule)` returns a TraitId[].
  - `describe(rule, t)` returns a string. `t(key, params)` comes from i18n; the engine only uses keys under `rule.*`, and WP-A provides the English templates as `src/engine/ruleStrings.en.js`, which WP-B merges.
  - `RULES` is a library of named rules for the handcrafted shifts.
- **`hypotheses.js`:** `buildHypotheses(target, visible)`, `isAlias(a, b, visible)`, `pickDecoys(target, H, demoObs, rng)`.
- **`dealer.js`:** `dealLevel(spec, seed)` returns a Level or null (null means validation failed). `spec = {id, club, visible, target, demoCount, judged, win, special?}`.
- **`daily.js`:** `dateKey(date)` returns `'YYYY-MM-DD'` (UTC). `dailyNumber(key)` returns a number. `dailyLevel(key, LEVELS)` looks up the baked level.
- **`tools/bake.mjs`:**
  - Builds the club 1–6 specs: handcrafted ones from the WP-A table that mirrors `03` §2 on the catalog, procedural ones by op family.
  - Retries seeds up to 50 times.
  - Writes `src/data/levels.js`: `export const LEVELS = {clubs:{1:[...10..20 levels]}, daily:{'2026-11-01':level,...}}` with guests encoded.
  - Also exports `decodeLevel` (via a tiny runtime helper in `dealer.js`) so callers get Guest objects.
- **Tests:** everything in `01` §7, re-targeted. Fairness is checked on the baked levels. One perf threshold: dealing one level takes < 2 s in Node (bake time only; runtime cost is zero).

### WP-B Game logic, data and platform
**Files:** `src/game/{state,progression,save}.js`, `src/data/{clubs,content,strings.en}.js`, `src/poki.js`, `src/i18n.js`, `test/game/*.test.js`

- **`state.js`:** a pure reducer.
  - `createRound(level, {mode:'shift'|'daily'})`, `step(state, action)`.
  - Actions: `{type:'advanceDemo'}`, `{type:'verdict', admit}`, `{type:'gotIt'}` (opens the guess phase), `{type:'guess', idx}`, `{type:'hint'}`, `{type:'revive'}`, `{type:'skipGuess'}`.
  - Implements all the §2 rules: win and fired; Daily is never fired and ends with a guess at the end; lenient calls; stars; revive.
  - Selectors: `currentGuest(s)`, `logColumns(s)` returns `{in:[i], out:[i]}` of resolved guests (demo plus judged, using the true labels), `shareText(s, dailyNo)`.
- **`progression.js`:**
  - `levelFor(clubId, idx)`, which decodes from `LEVELS`.
  - `clubUnlocked`, `applyResult(progress, {club, idx, stars})`, `applyDaily(progress, key, score)` (streak logic), `nextBreakAllowed(shiftNo)`.
- **`save.js`:** `createSave(storage)` with keys `doorpolicy.save.v1` and `doorpolicy.settings.v1`, falling back to memory.
- **`data/clubs.js`:** the 6 clubs from `03` §1 (colours, manager emoji, name, quips).
- **`data/content.js`:** `QUOTES` (60 from `03` §3) and special-night lines.
- **`strings.en.js`:** all UI text.
- **`poki.js`, `i18n.js`:** as in `04` §4 (`init`, `gameLoadingFinished`, `gameplayStart/Stop`, `commercialBreak`, `rewardedBreak` returning a boolean, `isAvailable`). `t(key, params)` merges `strings.en` and `ruleStrings.en`.
- **Tests:**
  - The reducer is tested against `test/fixtures/level.sample.json`: demo, then win by streak, by total, and by gotIt; fired; revive; lenient cap; Daily never fired.
  - Also: unlocks, the Daily streak, and saving with a storage that throws.

### WP-C UI shell
**Files:** `index.html`, `styles/*.css`, `src/ui/*.js`, `src/main.js`, `test/smoke.cjs`, `promo/thumbnail.html`

- **Screens:**
  - Title, with first-visit auto-start.
  - Club map.
  - Shift: manager speech bubble, card stage, IN/OUT log, strikes, streak, 💡 button, hint buttons.
  - Name-the-rule.
  - Result, with a cancellable next-shift countdown.
  - Fired, with the near-miss line.
  - Daily and settings.
- **Card:** emoji slots for the visible traits, a shirt SVG tinted from `COLORS`, a name/age tag, and the quote bubble. Special guests: 🥸 face; the trench coat has a tap-to-reveal tail wiggle.
- **Input:** swipe, buttons and keys as in `04` §5, with this plan's key map. Locked for 250 ms while a card animates out. Iframe focus handling.
- **Behaviour:** pause on `visibilitychange`. WebAudio SFX as in `02`. Effects respect reduced motion. Share uses clipboard with a textarea fallback.
- **`main.js`** wires everything together. `?debug` exposes `window.__door = {state, level}`. `?nopoki` forces the SDK fallback.
- **`test/smoke.cjs`:** Playwright at 390×844 and 1280×720 with the SDK URL blocked and a storage that throws. It plays shift 1 to a win using `__door`, opens Daily, and asserts no console errors and that arrow keys don't scroll the page.
- **`promo/thumbnail.html`:** renders 512×512 and 628×314 promo art, captured as PNGs by the smoke script into `promo/`.

**Order:** WP-A, WP-B and WP-C start in parallel against the contracts. WP-B and WP-C use the fixture level until `levels.js` lands. The lead integrates afterwards. Then an Opus reviewer audits bugs, Poki compliance and fun **before** the final commit.

## 4. Definition of done

1. `node --test` and the smoke test are green, with no console errors at either viewport.
2. All baked levels pass the fairness checks, and `levels.js` is ≤ 300 KB. Total payload is ≤ 500 KB, with no external requests except the Poki SDK.
3. Shift 1 can be cleared in under 30 s by a scripted solver, and the first verdict is possible within 10 s of load.
4. The game fully works with the SDK blocked and with localStorage throwing.
5. Thumbnail and icon PNGs are generated.
6. The reviewer's blocking findings are fixed.
7. **Before Poki submission (outside this build):** 5 cold human playtesters. Shift 1 median under 30 s, and at least 4 of 5 clear club 1 shift 5 without hints.
