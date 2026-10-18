# Door Policy: rule engine

Scope: the guest model, the rule grammar and evaluator, how guests are dealt, the "Name the rule" step, difficulty scoring and seeding. Everything is plain JS with no dependencies. All randomness goes through one seeded PRNG.

## 1. Guest model

A guest has 7 traits. A card shows 4–5 of them; the level config sets `visible` traits, and rules may only use visible traits. Each value carries a property bag, so rules can target properties as well as exact values.

| Trait | Values (id: emoji, props) |
|---|---|
| `hat` | top 🎩 {color:black, fancy}, cap 🧢 {color:blue}, crown 👑 {color:yellow, fancy}, grad 🎓 {color:black}, cowboy 🤠 {color:brown}, bow 🎀 {color:red, fancy}, none ∅ {} |
| `item` | apple 🍎 {color:red, food, round}, banana 🍌 {color:yellow, food}, cupcake 🧁 {color:pink, food, sweet}, rose 🌹 {color:red, plant}, sunflower 🌻 {color:yellow, plant, round}, phone 📱 {color:black, tech}, guitar 🎸 {color:brown, music}, balloon 🎈 {color:red, round} |
| `shirt` | red, orange, yellow, green, blue, purple, black, white. Props: {warm: red/orange/yellow}, {cool: green/blue/purple}, {neutral: black/white} |
| `pet` | dog 🐶 {legs:4, fur}, cat 🐱 {legs:4, fur}, fish 🐟 {legs:0, water}, bird 🐦 {legs:2, flies}, snake 🐍 {legs:0}, turtle 🐢 {legs:4, water}, none ∅ {legs:0} |
| `mood` | 😀 {happy}, 😎 {happy, glasses}, 😢 {sad}, 😠 {sad}, 😴 {}, 🤔 {} |
| `name` | 24 short Latin names (Ava, Bob, Cleo, Dex, Eli, Finn, Gus, Ivy, Jo, Kai, Leo, Max, Nia, Otto, Pip, Rex, Sam, Tia, Uma, Vic, Wes, Yara, Zed, Ana). Derived props: `len` (2–4), `first`, `startsVowel`, `endsVowel`, `palindrome` (Bob, Ana, Otto), `double` (Otto) |
| `age` | integer 18–79. Derived props: `even`, `decade` (1–7), `lastDigit`, `sameDigits` (22, 33…) |

Colors are a single shared enum (red, orange, yellow, green, blue, purple, pink, brown, black, white), which is what makes cross-trait matching possible. Display names are used only in the rule text and get localized; the cards themselves need no words apart from names.

```js
const TRAITS = { hat: { kind:'enum', values:{ top:{e:'🎩',color:'black',fancy:true}, ... } },
                 age: { kind:'int', min:18, max:79 }, name: { kind:'name', values:[...] }, ... };
// guest: { hat:'top', item:'apple', shirt:'red', pet:'dog', mood:'happy1', name:'Otto', age:42 }
function prop(guest, trait, p) { /* returns TRAITS lookup or derived (len, even, ...) */ }
```

## 2. Rule grammar

A rule is a JSON AST, evaluated by `evalRule(node, guest, ctx)` → boolean. `ctx = { prev }`, where `prev` is the previous guest in the queue (admitted or not; `null` for the first guest, in which case `prev` predicates are false).

Atoms:
- `{op:'is', t, v}`: the trait equals a value (`hat is crown`).
- `{op:'has', t, p, v=true}`: a property test (`item.food`, `shirt.warm`, `pet.legs = 4`).
- `{op:'cmp', t, p?, c:'<'|'<='|'>'|'>='|'='|'!=', n}`: a numeric test (`age > 40`, `name.len <= 3`, `pet.legs >= 2`).
- `{op:'letter', which:'first'|'last', set:'vowel'|[...letters]}`: a name letter rule.
- `{op:'same', a:[t,p], b:[t,p]}` / `{op:'diff', ...}`: a cross-trait match (`shirt.color = item.color`, `name.len = age.lastDigit`).
- `{op:'count', p, c, n}`: the number of visible traits whose value has property `p` (e.g. color `red`, or `fancy`) is compared with `n`.
- `{op:'prev', inner:{op:'same'|'diff', a:[t,p]}}`: compares this guest with `prev` on the same trait property (`shirt.color` differs from the previous guest's).

Combinators: `and`, `or` (taking `args[]`, with at most 3 args), `not`, `xor`. The maximum depth is 3.

Each rule has `text` (an i18n template, e.g. `"Wears a {color} shirt"`) and a `cost` (see §5).

### Example rules (40)

**Tier 1, one atom on a value** (cost 1–1.5): 1 Hat is a crown. 2 Holds food. 3 Shirt is blue. 4 Has a dog. 5 Is smiling (happy). 6 No hat. 7 Holds something red. 8 Has a pet that has fur.

**Tier 2, a property or a number** (cost 1.5–2.5): 9 Age over 40. 10 Age is even. 11 Name has 3 letters. 12 Name starts with a vowel. 13 Pet has 4 legs. 14 Shirt is a warm color. 15 Does NOT hold food. 16 Fancy hat.

**Tier 3, two atoms or a cross-trait match** (cost 3–4): 17 Food AND happy. 18 Crown OR top hat. 19 Shirt color matches the item's color. 20 Over 30 AND has a pet. 21 Name ends with a vowel OR wears a cap. 22 Cool shirt AND no hat. 23 Name length equals the last digit of age. 24 Hat color matches shirt color.

**Tier 4, NOT/XOR, counting, nested** (cost 4–6): 25 Food XOR happy. 26 At least 2 red things on the card. 27 Exactly one fancy thing. 28 Even age AND NOT a 4-legged pet. 29 (Plant OR round item) AND warm shirt. 30 Palindrome name OR age with matching digits. 31 Name length ≠ number of pet legs. 32 NOT (blue shirt OR cap).

**Tier 5, sequential and compound** (cost 6–9): 33 Shirt color differs from the previous guest's. 34 Same hat as the previous guest. 35 Older than the previous guest. 36 Item color differs from the previous guest's AND smiling. 37 Name's first letter comes later in the alphabet than the previous guest's. 38 (Food XOR warm shirt) AND has a pet. 39 Pet legs differ from the previous guest's OR no hat. 40 At least 2 black things AND age under 50.

Comparisons with `prev` (35, 37) are `{op:'prev', inner:{op:'cmp2', a:[t,p], c}}`, the two-guest form of `cmp`.

## 3. Guest dealing

### Hypothesis set H

Built once per level from the target T:
1. Every atom over the visible traits (about 150–250), plus the negation of each one.
2. Every 2-arg `and`/`or` combining atoms that share a trait or a property with T, or that appear in T. This gives about 3–6k rules.
3. Mutations of T: swap one value, flip a comparator, n±1, and↔or, drop a NOT, drop the `prev`.
4. Cap at 6000, sorted by cost, and remove T itself.

Speed: every atom is evaluated once per guest into a `Uint32Array` bitset of atom results, and each hypothesis is compiled into a closure that reads those bits. Testing 6k hypotheses against one guest takes under 1 ms on a phone.

**Equivalence pruning:** generate 2000 random guests from the seed. If a hypothesis agrees with T on all of them, it counts as an *alias* of T and is dropped from H. For sequential rules, the guests are generated as a random sequence.

### Algorithm

```
deal(T, H, rng, {demo=4, shift=12, maxExtra=8}):
  obs = []; S = H                                   // S = survivors
  for i in 0 .. demo+shift+maxExtra-1:
    needLabel = balanceNeed(obs)                    // admit/reject/null
    if i % 3 == 2 and lastGuest: cands = nearMisses(lastGuest, T, rng, 12)
    else cands = randomGuests(rng, 40)
    if needLabel: cands = cands.filter(g => T(g)==needLabel) (fall back to unfiltered if empty)
    g = argmax over cands of score(g) = min(|S_admit|,|S_reject|) weighted by 1/cost
                                       + 0.5*isNearMiss + tiny rng jitter
    obs.push({g, admit: T(g)}); S = S.filter(h => h(g)==T(g))
    if i >= demo+shift-1 and S has no hypothesis of cost <= cost(T)+2: stop
  return {guests, survivors:S}
```

- **balanceNeed:** keep the admit fraction between 40% and 60%. If the fraction so far is above 0.6, the next guest must be a reject, and below 0.4 it must be an admit. Two guards apply as well: no run of 4 guests with the same label, and the demo is exactly 2 admits and 2 rejects with at least one near-miss pair.
- **nearMisses(g):** change one visible trait of `g` (or, for numeric traits, nudge it across a threshold in T) so that T's label flips. These pairs carry most of the information.
- `randomGuests` samples values uniformly, then rejection-samples so that a card's trait values never all share one color (that would be a visual tell).

### Distinguishability guarantee

Every level is generated in full at load time, so the game knows its whole guest queue before the first card appears. It is then validated:
- **Must hold:** after all dealt guests, no surviving hypothesis has cost ≤ cost(T)+2 (aliases excluded). If this fails, retry with `seed+attempt`, up to 20 attempts, then switch to a different target rule. All of this is deterministic.
- **Should hold:** after the demo plus 6 guests, at most 3 cheap survivors remain.
- **Fairness during play:** with `lenientAmbiguous` on (the default), a wrong call on guest *k* gives no strike if some survivor of cost ≤ cost(T) at that moment, computed from guests 0..k−1, would have agreed with the player. The manager says "Fair guess. Here's the rule-book page." This only happens early, and it keeps "3 strikes" honest.
- The shift ends at `demo+shift` guests, or later (up to `maxExtra` more) if the must-hold condition needs those extra guests.

## 4. "Name the rule"

Pick 3 decoys from `H ∪ mutations(T)` that meet all of these:
1. Not an alias of T, and the decoys are not aliases of each other (checked with the same 2000-guest sample).
2. Each decoy is contradicted by at least 1 observed guest, so an attentive player can rule it out.
3. Diversity: at most 2 decoys mention T's main trait, and the 4 options all have different texts.

Rank candidates by `agree(h)/|obs|`, where higher is more plausible, then by |cost(h) − cost(T)| ascending. Take the top 3 greedily under the constraints above. If fewer than 3 qualify, fill from mutations of T. Shuffle the 4 options with the rng. The UI can show which card disproves a decoy after the player answers, which doubles as a learning moment.

## 5. Difficulty and seeding

`cost(node)`: is 1, has 1.5, cmp 1.5, letter 2, same/diff 3, count 3, prev +3 (plus its inner cost), not +1, and/or +1 per extra arg, xor +2.5.

The level difficulty score combines the rule cost with how hard the deal turned out to be:
`D = cost(T) + 0.5*log2(1 + survivorsAfterDemo) + 1.5*|baseRate(T) − 0.5|`
Here `baseRate` is T's admit rate on the 2000-guest sample. Rules with a base rate outside 0.15–0.85 are rejected outright, because they produce bad pacing. Tier bands for D: T1 < 2, T2 < 3.5, T3 < 5, T4 < 7, T5 ≥ 7. The progression map draws targets by tier, either from a hand-curated list (the 40 above plus more) or procedurally (by sampling the grammar within a cost band).

**PRNG**

```js
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);
  t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function hashStr(s){let h=2166136261>>>0;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
const dailySeed = d => hashStr('door:' + d.toISOString().slice(0,10)); // UTC date
```

Daily Door: the tier follows the UTC weekday (Mon T2, Tue T2, Wed T3, Thu T3, Fri T4, Sat T4, Sun T5). The rule is drawn procedurally from `rng = mulberry32(dailySeed)`. Each subsystem forks its own stream (`mulberry32(seed ^ hashStr('deal'))`, and the same for `'decoys'` and `'equiv'`), so changing one subsystem does not reshuffle the others. Bump `ENGINE_VERSION` in the hash whenever the content tables change, so every player still sees the same rule on a given day.

## 6. Data structures

```js
Rule      = { op, ...fields, args?, inner?, text, cost }
Guest     = { hat, item, shirt, pet, mood, name, age }        // ids only
Obs       = { guest, admit:boolean }
Level     = { seed, tier, visible:[...traits], target:Rule, guests:Guest[],
              demoCount, labels:boolean[], choices:Rule[4], correctIdx, D }
Hyp       = { rule, fn:(bits, guest, prev)=>bool, cost }
// API
compile(rule) -> fn;  evalRule(rule, guest, prev) -> bool
buildHypotheses(target, visible, rng) -> Hyp[]
dealLevel(target, opts, seed) -> Level   // includes validation + retries
pickDecoys(target, H, obs, rng) -> Rule[3]
isAmbiguous(level, k, playerCall) -> bool
ruleText(rule, locale) -> string
```

## 7. Unit tests

1. `mulberry32(1)` produces a fixed known sequence; `dailySeed` gives the same value for any time within one UTC day and different values on consecutive days.
2. Every trait value has an emoji, and derived properties (len, even, palindrome, legs) are correct for every name and age.
3. Each of the 40 example rules evaluates correctly on 2–3 hand-written guests (positive and negative cases).
4. `prev` rules return false when `prev` is null, and evaluate using the queue order rather than only admitted guests.
5. The compiled closure agrees with `evalRule` on 5000 random guests for every rule.
6. Alias detection treats `not(not(x))` and `x` as aliases, and does not treat `age>40` and `age>41` as aliases.
7. `dealLevel` gives a demo of exactly 2 admits and 2 rejects with at least 1 near-miss pair, and an admit ratio between 0.4 and 0.6 over the full shift.
8. `dealLevel` never produces 4 guests in a row with the same label.
9. Distinguishability: for every one of the 40 rules over 50 seeds, no non-alias hypothesis of cost ≤ cost(T)+2 survives.
10. Determinism: the same seed gives the same Level, deep-equal.
11. `pickDecoys` returns 3 distinct non-aliases, each contradicted by at least 1 observation, with unique texts and the correct option included.
12. `isAmbiguous` is true when a cheaper survivor agrees with the player's wrong call and false otherwise.
13. Performance: `dealLevel` for a T5 rule finishes in under 150 ms in Node (as a proxy for a mid-range phone).
14. Base-rate filter: rules with an admit rate under 0.15 or over 0.85 are rejected.
15. `ruleText` renders a non-empty string for every op in every supported locale.
