# Door Policy — game loop & UX

Builds on `00-concept.md`. Target: one shift ≈ 60–90 s, a session of 5–8 shifts.

## 1. One shift, moment to moment

**Intro (≤ 4 s, skippable by any tap/key).** The club's manager pops up in a speech bubble with a one-line, in-character hint of tone, never the rule ("Tonight we keep it *classy*. Mostly."). One line only; a second line appears only on a club's first shift.

**Demo guests (3 on tier 1, 4 on tier 2+, 5 on special nights).** Each guest card slides in. The manager decides it on screen: a hand drags the card left or right, the ADMIT/REJECT stamp lands, and the card goes into the guest log. Each demo takes 1.2 s, and the player can tap to speed it up. Demos are chosen by the generator so that at least one admit and one reject differ in exactly one trait (a minimal pair), which keeps the rule solvable rather than a guess.

**Guest card.** 3–5 trait rows, each an emoji plus a short label (👒 hat, 🐶 dog, "Gary", 34, 💬 "Is this the queue?"). The traits are large, and the label sits under each icon on mobile.

**Guest log (required).** A scrollable column of mini-cards, newest first. Each shows its trait emojis on a green ✓ strip (admitted) or a red ✗ strip (rejected). Demo entries carry a small 👔 badge. Tapping a mini-card enlarges it. A filter toggle switches between **All / In / Out**. Without the log, players are testing their memory instead of their reasoning, so the log ships in MVP with no exceptions.

**Controls.**
- Swipe right = ADMIT, swipe left = REJECT. The card tilts as it is dragged, and the stamp preview fades in past 30 % of the threshold.
- Two large on-screen buttons: REJECT (left, red ✗) and ADMIT (right, green ✓).
- Keyboard: `A` or `→` = admit, `R` or `←` = reject, `H` = hint, `Esc` = pause.
- Input locks for 350 ms after each decision so a double swipe can't make a call by accident.

**Feedback.**
- *Right:* the stamp slams down (scale 1.4 → 1, 80 ms), the card flies into the club or onto the street, a soft crowd "ooh", and the streak counter ticks up with a pitch that rises each step.
- *Wrong:* a red stamp with a 6 px / 150 ms screen shake, a buzzer, and a strike light that fills (●○○). The guest reacts with an emoji pop (😤 or 🥳), and the card is still logged **with the correct outcome** so the mistake becomes information.
- Haptics: `navigator.vibrate(30)` on a wrong call where it is supported. Reduced-motion mode disables shake.

**Fail.** At 3 strikes the manager says "You're fired." and the Fired screen offers a second chance (see §5) or Retry.

**Win.** The shift is cleared with **6 correct in a row**, *or* **10 correct in total**, whichever comes first, with a cap of 16 player guests. The cap is a fail-safe: reaching it with fewer than 3 strikes counts as a pass with 1 star. The streak meter (6 pips) and the total (x/10) both show in the HUD.

**Name the rule (optional bonus).** After a win, a card asks "What's the policy?" with 4 options: the true rule, one near miss that matches all of the logged guests except one, and two plausible decoys. Picking right earns +1 star. Picking wrong costs nothing, and the true rule is shown next to the player's pick ("So close: it was *hats* OR dogs").

**Stars (max 3).** ★ for clearing the shift. ★ for clearing it with ≤ 1 strike. ★ for naming the rule correctly. A hint used costs nothing in stars. Hints are already gated by ads, and punishing them twice turns a rewarded ad into a bad deal.

## 2. Screens

| Screen | Contents |
|---|---|
| **Title** | Neon club door with the logo. PLAY drops the player straight into the next unfinished shift, with no menu in between. Secondary: Daily Door (with a streak flame), Map, ⚙. |
| **Club map** | A vertical street of 6 club façades. Each façade shows 10 shift dots with stars, and a lock showing its requirement. Daily Door is pinned at the top. |
| **Shift** | HUD (strikes, streak pips, total, hint 🎬, pause), the guest card, the decision buttons, and the guest log. |
| **Results** | Stars animate in one by one. Shows the rule reveal, a "Next shift ▶" button (large, primary), Retry, and Map. |
| **Daily Door** | The same shift layout with a 📅 header. The results show the emoji grid, a **Copy result** button, and a countdown to the next door. |
| **Settings** | SFX volume, music on/off, reduced motion, colour-blind mode (✓/✗ shapes in addition to the colours), reset progress (asks for confirmation). |

**Landscape 16:9 (desktop/tablet).** Three columns. On the left (22 %), the manager portrait and HUD. In the centre (50 %), the card and the door, with the buttons below it. On the right (28 %), the guest log, always visible.

**Portrait mobile.** From top to bottom: the HUD bar (strikes · streak · hint 🎬); the guest log as a horizontal strip of mini-cards (2 rows, newest on the left, tap to expand into a bottom sheet); the card (≈ 55 % of the height); and two thumb buttons pinned to the bottom (min 64 px tall, full width split 50/50). The manager shows as a small avatar in the HUD, and their speech appears as a toast.

Layout is decided by aspect ratio (`w/h ≥ 1.2` → landscape) and is never blocked by a "rotate your device" screen. Everything stays readable at 360 × 640.

## 3. Progression

| # | Club | Manager | Rule tier | Example rules |
|---|---|---|---|---|
| 1 | The Velvet Rope | Big Sal, gruff but sweet | single trait | has a hat · is wearing red |
| 2 | Disco Inferno | DJ Glitter | trait category / number | any animal · age > 30 |
| 3 | The Library Lounge | Ms. Hush | negation, NOT | no phones · name doesn't start with a vowel |
| 4 | Club Paradox | Professor Twist | AND / OR | hat AND pet · red OR gold |
| 5 | The Count's Crypt | Count Ordo | counting / relational | exactly 2 accessories · age even |
| 6 | Byte Basement | SYS.ADMIN | meta / text | quote has a "?" · name length = number of items |

- **Unlocks:** a club opens when the previous club's shift 10 is cleared **and** the player holds ≥ 15 stars in that club (of 30). The star gate is soft: a rewarded ad can "Bribe the doorman" once per club to skip it.
- Each club has 10 shifts. Shifts 1–3 introduce the tier, 4–8 mix it with the earlier tiers, 9 is a special night, and 10 is the "boss" (more traits, more decoys).
- **Special nights** (shift 9, plus a 15 % chance on replays):
  - *VIP:* one guest breaks the rule and must be admitted. They carry a 🎟 wristband the player has to notice.
  - *Policy change:* halfway through, the manager phones in "New policy!". The rule shifts by one trait, and the log draws a divider line.
  - *Two doors:* two cards at once, each with its own rule, sharing one log split into two columns.
  - *Fourth wall* (club 6 only): e.g. "only admit guests whose name matches the tab title". Kept rare.

## 4. Retention and addictiveness

**First 60 seconds (exact).** 0–3 s: the game loads and the first shift starts automatically. Title and menus are skipped on the first visit. 3–7 s: Big Sal says "Hats only. Kidding! Watch me." Then 3 demos follow, all built around hats. About 15 s: an animated hand prompts the first swipe, and the first guest is an easy call. 15–45 s: 6 guests, each tuned so a careful player wins. About 45 s: the shift is cleared and the stars fly in, with the "Name the rule" question already answered by the player's own correct guess. About 55 s: shift 2 starts automatically after a 3-second "Next shift" countdown that the player can cancel. No ad plays before shift 3.

**Ranked by real impact (most to least):**
1. **Aha moment + fast restart.** Rule deduction feels good when the player cracks it. Most of the retention comes from short shifts, instant Next, and no friction.
2. **Daily Door + streak.** One seeded rule a day (`seed = YYYYMMDD`, deterministic and offline), 12 guests, no hints, no second chance. The streak flame counts consecutive days, and one missed day is forgiven per week. The share text is copied with `navigator.clipboard`, falling back to a textarea selection:
   ```
   Door Policy #214 🚪 10/12
   🟩🟩🟥🟩🟩🟩🟩🟥🟩🟩🟩🟩
   Rule named ✅  🔥5
   ```
3. **Near miss.** When the player is fired, the screen shows "You were 1 guest from clearing it" and how close the streak got. The Name-the-rule near-miss option lets players see they were nearly right.
4. **Variable rewards.** A special night drawn at random on replays. A rare "celebrity guest" card (≈ 1 in 40) with funny flavor text that adds to a collection page. Manager quips drawn from a pool.
5. **Stars and the map** give completionists a goal, but they matter less than items 1–2.

Social leaderboards and accounts are out of scope, since the game makes no network requests.

## 5. Monetization (Poki SDK)

- `PokiSDK.gameplayStart()` when the first player-decidable guest appears (not during the intro or demos), and again on resume from pause. `PokiSDK.gameplayStop()` on results, fired, pause, a map or menu opening, and before every ad.
- **commercialBreak:** only on the "Next shift"/"Retry" transition, **never before shift 3**, at most once every 3 shifts **and** at least 120 s apart. Audio is muted for the break and restored after it resolves, whatever the result.
- **rewardedBreak** offers:
  - *Hint* (from the HUD 🎬 button, at most 2 per shift; see §6).
  - *Second chance* on the Fired screen: clears 1 strike and continues the same shift. Once per shift.
  - *Bribe the doorman* (star-gate skip, §3).
- **Button rule:** every rewarded offer is a `🎬 Watch ad: <benefit>` button in neutral purple or grey (never green), shown beside an **equal-size** non-ad button (`Continue` / `Retry` / `No thanks`). Both are always visible with no countdown pressure. If the ad fails or is unavailable, the reward is not granted. A toast says "No ad right now" and the button greys out for that screen.

## 6. Hint ladder

Each hint is shown once per shift, in order. Hints never reveal the rule's literal text.
1. **Free nudge** (free after 2 strikes, or press H once): the log highlights the most informative minimal pair it holds ("Compare these two").
2. **🎬 Property hint:** "Reveal one property the rule cares about". The trait row involved (e.g. 👒 headwear) glows on every card for the rest of the shift.
3. **🎬 Ask the manager:** the manager decides the current guest for the player, it counts as correct, and their explanation names the deciding trait ("Gold shoes? Yeah, that's the thing.").

Hints are not available in Daily Door, which keeps it fair to share.

## 7. Audio (WebAudio, no files)

All sounds are synthesized in an `AudioContext` that starts on the first user gesture.
- **Stamp:** noise burst through a 400 Hz lowpass with a fast decay, plus a 90 Hz sine thump.
- **Correct:** two-note triangle chime; pitch rises one semitone per streak step.
- **Wrong:** 110 Hz square wave with a pitch drop, 200 ms buzzer.
- **Card whoosh:** filtered noise sweep from 2 kHz to 300 Hz.
- **Crowd "ooh"/cheer:** 4 detuned sawtooth waves through a formant bandpass, with an amplitude swell.
- **Strike / fired:** a low drum hit; fired adds a descending "wah-wah" made of 3 notes.
- **Stars:** rising arpeggio, one note per star.
- **UI click:** 1 ms tick at 1.5 kHz.
- **Music:** optional 4-bar bass + hi-hat loop, muffled by a lowpass while the door is closed and opened up on wins.

A master gain is applied, and audio is suspended on `visibilitychange` and during ads.

## 8. MVP acceptance criteria

1. A first-time player reaches the first decidable guest in ≤ 10 s from load with no menu taps. The initial bundle is < 3 MB.
2. Each shift shows 3–5 manager demos. The generator guarantees that the rule is consistent with every demo and that a minimal pair exists.
3. The guest log shows every past guest with its correct outcome, works in both orientations, and can be filtered.
4. Swipe, on-screen buttons, and `A`/`R`/`←`/`→` all work. A 350 ms input lock prevents double decisions.
5. Rules are enforced correctly: 3 strikes ends in Fired; 6 in a row or 10 in total ends in a win; the 16-guest cap gives a 1-star pass.
6. Stars (clear / ≤ 1 strike / named rule) persist in localStorage wrapped in try/catch, and the game is fully playable when storage is blocked.
7. Clubs 1–2 are fully playable (20 shifts) with the unlock gate working. Clubs 3–6 can be stubbed for MVP.
8. Daily Door produces the same rule for everyone on the same date and copies the emoji grid to the clipboard.
9. Poki SDK: gameplayStart/Stop are placed correctly, commercialBreak follows the frequency rules (none before shift 3), and the rewarded hint and second chance use a 🎬 non-green button beside an equal-size Continue. Audio is muted during ads.
10. Layout works at 1280×720 landscape and 360×640 portrait with no horizontal scroll, the touch targets are ≥ 48 px, and every SFX is generated in WebAudio with no audio files and no network requests.
