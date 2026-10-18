// BINDING shared types (JSDoc only, no runtime code). See docs/design/05-plan.md.
// docs/design/04-tech.md §3 type definitions are VOID; use these.

/**
 * @typedef {'hat'|'item'|'shirt'|'pet'|'mood'|'name'|'age'} TraitId
 *
 * @typedef {Object} Guest   ids only; see src/engine/traits.js
 * @property {string} hat     e.g. 'top' | 'none'
 * @property {string} item
 * @property {string} shirt   a color id
 * @property {string} pet
 * @property {string} mood
 * @property {string} name
 * @property {number} age     18..79
 * @property {number} quote   index into data/content.js QUOTES
 * @property {'boss'|'trenchcoat'} [special]  scripted special-night guest
 *
 * @typedef {Object} Rule     JSON AST, see docs/design/01-rule-engine.md §2
 *   Atoms:
 *   {op:'is', t, v}                       trait value equals v
 *   {op:'has', t, p, v?=true}             prop(guest,t,p) === v
 *   {op:'cmp', t, p?, c, n}               numeric compare, c in '<','<=','>','>=','=','!='
 *   {op:'same'|'diff', a:[t,p], b:[t,p]}  cross-trait prop equality (null never equals)
 *   {op:'count', p, v?=true, c, n}        # of visible enum traits with prop p === v, compared to n
 *   {op:'prev', inner:{op:'same'|'diff', a:[t,p]} | {op:'cmp2', a:[t,p], c}}  vs previous guest in queue
 *   Combinators: {op:'and'|'or', args:Rule[]} (2-3 args), {op:'not', arg}, {op:'xor', args:[a,b]}
 *   Every rule MAY carry {id?:string}. Rule text comes from describe(rule, t), never stored.
 *
 * @typedef {Object} Level    produced by tools/bake.mjs, stored in src/data/levels.js
 * @property {string} id            e.g. 'c1s3' or 'daily-2026-11-05'
 * @property {number} club          1..6 (0 for daily)
 * @property {TraitId[]} visible    traits shown on cards (4..6)
 * @property {Rule} target
 * @property {Guest[]} guests       demo guests first, then judged guests
 * @property {boolean[]} labels     true = ADMIT, aligned with guests
 * @property {number} demoCount
 * @property {{inRow:number,total:number}} win   win condition for judged guests
 * @property {Rule[]} choices       4 options for name-the-rule, includes target
 * @property {number} correctIdx    index of target in choices
 * @property {{admit:boolean,reject:boolean}[]} lenient  per guest index: call forgiven if wrong
 * @property {[number,number]} hintPair   indices of a minimal pair among demo guests (differ in 1 visible trait, opposite labels)
 * @property {TraitId[]} ruleTraits       traits the target references (for the 🎬 hint)
 * @property {string} [intro]       manager intro override (string key), e.g. special nights
 *
 * @typedef {Object} RoundState     src/game/state.js reducer state
 * @property {Level} level
 * @property {'demo'|'play'|'guess'|'result'} phase
 * @property {number} idx           index into level.guests of the current guest
 * @property {number} strikes       0..3
 * @property {number} streak        current consecutive correct judged calls
 * @property {number} correct       total correct judged calls
 * @property {number} lenientUsed   0..2
 * @property {{i:number, call:boolean, ok:boolean, lenient?:boolean}[]} history  judged calls
 * @property {number} hintsUsed     0..2 (1 = free nudge, 2 = 🎬 traits)
 * @property {boolean} revived
 * @property {null|'cleared'|'fired'|'out'} outcome   'out' = queue ran out
 * @property {null|boolean} guessedRight             null = not guessed
 * @property {0|1|2|3} stars
 */
export {};
