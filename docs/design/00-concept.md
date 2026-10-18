# Door Policy — concept brief

**Pitch:** You're the bouncer at a strange club. The door has a secret rule. Work it out from who gets in, then enforce it.

**Core loop (≈30s):** Guests walk up one at a time as cards with 3–5 emoji-based traits (outfit, item, name, age, a quote...). For the first few guests the manager demonstrates (ADMIT / REJECT). Then the player swipes ADMIT / REJECT. 3 wrong calls = fired. Optionally the player names the rule (pick from options) for bonus stars.

**Why this niche (market research, Oct 2026):**
- Brain Test-style trick puzzles are saturated on Poki (Unico Studio: Brain Test 2.2M likes, 5+ sequels). Don't fight them head-on.
- Underserved on web portals: deduction/logic, daily puzzle formats with streaks.
- Inductive rule-finding (Zendo/Eleusis) is essentially absent from Poki/CrazyGames.
- Procedural rules + emoji = near-infinite, auto-verifiable content, very low art cost, little localization.

**Poki constraints:** Poki SDK only (commercialBreak / rewardedBreak; rewarded button has 🎬 icon, not green, next to an equal-size continue button), works desktop + mobile + tablet, 16:9-friendly, fast load (aim < 3 MB initial), no external network requests, localStorage wrapped in try/catch, no IAP.

**Retention hooks:** Daily Door (one global seeded rule, shareable emoji result), club progression map with escalating rule complexity, streaks, stars.

**Borrowed from ideation round:** Brain Test-style humor and character voice; occasional "special night" trick levels (fourth-wall / browser tricks) as spice, not core.
