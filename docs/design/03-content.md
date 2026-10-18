# Door Policy: content bible

Trait vocabulary assumed throughout: **hat** (🎩 🧢 👒 🎓 none), **shirt color** (red/blue/green/yellow), **held item** (🍌 🍕 🎈 📚 🌂 🧸 🍦 🎸 none), **pet** (🐱 🐶 🐢 none), **name**, **age** (8–99), **quote**. A rule is always about traits you can see on the card, and nothing else.

---

## 1. Clubs (progression order)

### Club 1: The Juice Box (Tier 1, single value)
- **Theme:** orange `#FF9F1C` and lemon `#FFE66D` stripes, cream door. Decor: 🧃 🍊 🪩
- **Manager:** Gus 🐻. A big soft bear who takes his clipboard very seriously.
- **Intro:** "Watch me work. Then you try."
- **Praise:** "Beautiful. I might cry into my juice."
- **Scold:** "Nope! Did you even look?"
- **Fired:** "Hand back the clipboard, buddy."
- **Win:** "You're a natural! Go tell the Snail."

### Club 2: Disco Snail (Tier 2, property)
- **Theme:** purple `#7B2CBF` floor, pink `#FF5DA2` neon, slow spinning ball (CSS rotate). Decor: 🐌 🪩 ✨
- **Manager:** Madame Shelly 🐌. Very slow, very fabulous, never rushes a decision.
- **Intro:** "Darling... take... your... time."
- **Praise:** "Exquisite. Like a perfect slow dance."
- **Scold:** "Ugh. I felt that in my shell."
- **Fired:** "Off you glide, sweetie."
- **Win:** "Fabulous! The Burrow needs you."

### Club 3: The Velvet Burrow (Tier 3, negation/numeric)
- **Theme:** deep green `#1B4332` velvet with gold `#D4A017` trim, round hobbit door. Decor: 🐇 🕯️ 🔢
- **Manager:** Professor Hops 🐰. A rabbit accountant who counts everything twice.
- **Intro:** "Numbers never lie. Count carefully."
- **Praise:** "Correct! Carry the one!"
- **Scold:** "Wrong. Did you count on your ears?"
- **Fired:** "You're subtracted. Goodbye."
- **Win:** "Perfect score. Noodles await."

### Club 4: Neon Noodle (Tier 4, AND/OR)
- **Theme:** black `#111` with cyan `#00F5D4` and hot pink `#F15BB5` glow, steam (CSS blur). Decor: 🍜 🏮 🥢
- **Manager:** Chef Twirl 🐙. An octopus who does eight things at once and expects you to do two.
- **Intro:** "Two rules, one door. Keep up!"
- **Praise:** "Delicious call. Chef's kiss times eight."
- **Scold:** "You forgot half the recipe!"
- **Fired:** "You're overcooked. Out!"
- **Win:** "Impressive. The Lodge sent an invitation."

### Club 5: The Riddle Lodge (Tier 5, relational)
- **Theme:** midnight blue `#14213D` and parchment `#E9D8A6`, keyhole-shaped door. Decor: 🦉 🗝️ 📜
- **Manager:** Grand Hoot 🦉. A secret-society owl who speaks only in whispers and winks.
- **Intro:** "Here, guests are judged... by each other."
- **Praise:** "Hoo. You see what others miss."
- **Scold:** "Look again. Look *between* them."
- **Fired:** "You're now a former member. Shh."
- **Win:** "You've earned the Moon key."

### Club 6: The Moon Room (mixed Tiers 1–5, shuffled)
- **Theme:** silver `#C0C0D8` craters on violet `#3C096C`, door floats with a CSS bob. Decor: 🌙 🪐 👽
- **Manager:** Zib 👽. A tiny alien who has been to every club in the galaxy and finds Earth adorable.
- **Intro:** "Any rule, any time. Ready, Earthling?"
- **Praise:** "Zibtastic! Earth is lucky to have you."
- **Scold:** "Even my moon rock knew that."
- **Fired:** "Beaming you home now. Bye!"
- **Win:** "Legend! You run the galaxy's door."

---

## 2. Onboarding shifts 1–12

"Demo" = guests Gus/Shelly judge while you watch. "Judge" = guests you rule on. The first demos are built so that **only one trait differs** between an admit and a reject.

| # | Club | Rule (internal) | Description shown on reveal | Demo | Judge | Teaching purpose |
|---|---|---|---|---|---|---|
| 1 | Juice Box | `hat == 🎩` | "Top hats only." | 2 | 3 | Teach swiping. Demo 1 is a 🎩 guest (ADMIT); demo 2 is the same guest with no hat (REJECT). Every guest you judge has a hat or no hat at all, nothing in between. Solvable in under 30 seconds. |
| 2 | Juice Box | `item == 🍌` | "Banana holders welcome." | 3 | 4 | The rule can be about *any* trait. Hats now vary randomly to act as a red herring. |
| 3 | Juice Box | `shirt == blue` | "Blue shirts only." | 3 | 5 | Color is a trait too. The first "name the rule" bonus pick appears, with 3 options. |
| 4 | Juice Box | `pet == 🐢` | "Turtle owners only." | 3 | 5 | Look at the whole card, including the corners. Pets sit in the card's corner slot. |
| 5 | Juice Box | `hat == none` | "No hats allowed." | 4 | 5 | Absence is a value. The first two demos are rejects, so you learn to reason from rejects as well as admits. |
| 6 | Juice Box | `shirt == red` | "Red shirts only." | 2 | 6 | First shift with only 2 demos, plus a mid-shift recap ("Here's who I let in so far"). Teaches you to watch the admitted line. |
| 7 | Disco Snail | `item ∈ food` (🍌🍕🍦) | "Snacks get in." | 4 | 5 | First category rule. Each demo admit holds a *different* food, so no single item can be the rule. |
| 8 | Disco Snail | `hat ∈ {🎩 👒 🎓}` (fancy) | "Fancy hats only." | 4 | 5 | Categories can be loose. The 🧢 is the outsider, and you'll see it rejected twice. |
| 9 | Disco Snail | `pet != none` | "Pets are plus-ones." | 4 | 6 | "Has any X" property. The pet species varies. |
| 10 | Disco Snail | `item ∈ music` (🎸🥁🎺) | "Musicians only." | 3 | 6 | Fewer demos for a category rule. Introduces the "Ask Shelly" hint (a rewarded 🎬 option that reveals one more demo). |
| 11 | Disco Snail | `shirt ∈ warm` (red/yellow) | "Warm colors only." | 4 | 6 | A property of a color rather than an object. Blue/green rejects alternate with red/yellow admits. |
| 12 | Disco Snail | `item ∈ round` (🎈🍩⚽) | "Round things only." | 4 | 7 | Graduation: you must spot the abstract shape property. Name-the-rule offers 4 options, including the decoy "Snacks". The ending foreshadows the Burrow's numbers. |

Implementation notes: shift 12 uses 🎈 🍩 ⚽ for admits and 🌂 📚 🍌 for rejects. Add 🍩 🥁 🎺 ⚽ to the item pool (🍩 counts as food). Every shift must be validated so that at least one demo guest separates the true rule from the top 3 decoy rules.

---

## 3. Guest flavor

### Quotes (rule-neutral, at most 8 words)
1. "I know the DJ. Personally."
2. "My cousin is on the list."
3. "I've been practicing my dance moves."
4. "Is this the line for fun?"
5. "I brought exact change. For nothing."
6. "My mom said I'm cool."
7. "I'm basically famous in my building."
8. "Please, I've waited all week."
9. "I only dance on Tuesdays."
10. "Do you validate parking? For bikes?"
11. "I'm here for the vibes."
12. "I wore my lucky socks."
13. "Is the floor sticky? Asking for me."
14. "I can moonwalk. Badly."
15. "You have kind eyebrows."
16. "I rehearsed this in the mirror."
17. "My horoscope said tonight's the night."
18. "I'm not nervous. You're nervous."
19. "I've never been rejected. Ever. Today."
20. "Can I just peek inside?"
21. "I'm the plus-one of a plus-one."
22. "Nice door. Very door-like."
23. "I've got a good feeling about this."
24. "Do you like jokes? I have three."
25. "My grandma got in last week."
26. "I'll be quiet. Mostly."
27. "I've been told I'm delightful."
28. "Is there a secret handshake?"
29. "I brought my best smile."
30. "I'm only here to stand nearby."
31. "My robot vacuum believes in me."
32. "I came all the way from next door."
33. "Is this where the party lives?"
34. "Psst. What's the password?"
35. "I'm the mystery guest. Surprise!"
36. "I dance like nobody's paying attention."
37. "I've waited in line since breakfast."
38. "I promise I'm not three raccoons."
39. "Will there be confetti?"
40. "I wrote you a tiny poem."
41. "My shoes are new. Be gentle."
42. "Hi! I'm extremely normal."
43. "I've heard the music is loud."
44. "Can my shadow come too?"
45. "I'm on a very important mission."
46. "This is my best outfit. Probably."
47. "I can do the worm."
48. "My goldfish says hello."
49. "Please, it's my un-birthday."
50. "I searched 'how to look cool.'"
51. "I'm just here for the music."
52. "One dance. Then I leave. Maybe."
53. "Do I look like a winner?"
54. "My aunt owns a very nice spoon."
55. "I trust your judgment completely."
56. "I've been here before. In a dream."
57. "Let me in, I'm hilarious."
58. "I've got rhythm. Somewhere."
59. "I'll tell everyone you're awesome."
60. "Whatever happens, I respect you."

### Names (40, grouped by length so rules like "4-letter name" are easy to generate)
- **3:** Ada, Kai, Zoe, Leo, Ana, Raj, Mei, Ivo, Noa, Eli
- **4:** Yuki, Omar, Lena, Theo, Ines, Kofi, Nina, Arlo, Sven, Amir
- **5:** Priya, Mateo, Chloe, Aisha, Bruno, Freya, Kenji, Lucia, Tomas, Zaria
- **6:** Ingrid, Rafael, Soraya, Dmitri, Amelie
- **7:** Leilani, Matilda, Gustavo
- **8:** Fernanda, Cornelia

Palindromes (Ana, Otto, Hannah, Elle, Bob) are kept in a separate pool and used only on Mirror Night.

---

## 4. Special nights (Brain Test-style twists)

Each one shows up as a "🌟 Special Night" sign on the map. All six are fair: the clue is always visible before the trick guest arrives.

1. **The Boss in Disguise** (Juice Box). The rule is "has a 🎈". Late in the shift, a guest with no balloon arrives: Gus in a fake mustache 🥸, named "Sug", with the quote "I definitely don't own this place." The clue is Gus's intro line, "Rule one: never turn away the boss." **Correct: ADMIT.** Gus: "You saw right through me!"
2. **Dog in a Trench Coat** (Disco Snail). The rule is "humans only, no pets" (pet == none). One guest has no pet listed, wears a 🧥 and 🕶️, and is named "Definitely Steve". A wagging 🐕 tail pokes out from the card's edge (CSS wiggle), and tapping the coat reveals 🐶. **Correct: REJECT.** Bonus star if you tap first.
3. **Read the Sign** (Velvet Burrow). Professor Hops: "I will NEVER tell you tonight's rule." The second demo guest holds a 🪧 that says, in tiny print, "PSST: age under 20." The rule really is age < 20. A bonus star goes to anyone who names the rule before the first judge guest.
4. **Lights Out** (Neon Noodle). The power flickers and the cards go dark (brightness 0.1). The rule is "🕶️ AND blue shirt", which can't be seen in the dark. A light switch 💡 is visible on the club wall, and Chef Twirl says "Someone find the switch, I have no free arms!" Tap it to restore the colors. The judge timer pauses until the lights are on.
5. **Mirror Night** (Riddle Lodge). The club sign reads "YCILOP ROOD" and the guest cards slide in flipped. The rule is "name reads the same backwards": Ana, Otto, Hannah, Elle and Bob get in. The clue is the mirrored sign plus Grand Hoot's line "Tonight, everything reflects."
6. **Last Guest: You** (Moon Room). The rule is "wearing 🎧". Your bouncer avatar has worn 🎧 in the HUD corner all game. The final card is *you* (🕴️🎧, name "Bouncer", quote "Wait, that's me?"). Zib: "Even the door obeys the door." **Correct: ADMIT**, and a fun fake-out ending follows where you dance inside while Zib takes over the door.

---

## 5. Tone guide

- **Audience:** all ages, family-friendly. Humor is silly and gentle and lands on the situation, never on a person. Think of a kind teacher doing voices.
- **Clubs are dance clubs, juice bars, snack spots and secret societies.** No alcohol, bars, drinks other than juice/milk/soda, smoking, gambling or dating.
- **Rejected guests are never humiliated.** Rejection lines are light ("Aw, next time!"), and rejected guests walk off to a 🍦 cart or shrug happily.
- **Age and appearance traits are neutral data.** Never use "old", "young", "fat", "ugly", "weird-looking" or anything similar. Age rules always say "age under/over N". Shirt and hat colors are fashion, not identity. Skin tones use the default yellow emoji (or a random seed across tones) and are **never** used in rules.
- **Names are international and never tied to traits.** No name, accent or nationality maps to an outfit, food or behavior. Names are shuffled independently of every other trait.
- **No real brands, celebrities, politics, religion, flags or current events.** Use made-up items and verbs ("searched", not a company name).
- **Managers are lovable, not bullies.** Scolds are playful and tease the call, never the player. "Fired" is a cartoon moment, followed by an instant retry.
- **Copy rules:** quotes stay under 8 words and quips under 10, written in plain language a 9-year-old can read. Use punctuation for jokes, not caps-lock shouting (one ALL-CAPS word at most per line).
- **Tricks are fair.** Every special-night trick has an on-screen clue before it pays off, and failing a trick only costs a heart, never progress.
