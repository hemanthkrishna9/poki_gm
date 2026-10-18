import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VALUES, NAMES, AGE_MIN, AGE_MAX, emojiOf, prop, randomGuest, TRAIT_IDS } from '../../src/engine/traits.js';
import { evalRule, compile, ruleCost, ruleTraits, describe, tEn, RULES, usesPrev } from '../../src/engine/rules.js';
import EN from '../../src/engine/ruleStrings.en.js';
import { createRng } from '../../src/engine/rng.js';
import { atomsFor, mutations } from '../../src/engine/hypotheses.js';

const G = (o = {}) => ({ hat: 'none', item: 'none', shirt: 'white', pet: 'none', mood: 'think', name: 'Bruno', age: 33, quote: 0, ...o });

test('every trait value has an emoji (except none / shirts) and derived props are right', () => {
  for (const t of ['hat', 'item', 'pet', 'mood']) {
    for (const v of VALUES[t]) if (v !== 'none') assert.ok(emojiOf(t, v).length > 0, `${t}.${v}`);
  }
  for (const n of NAMES) {
    const g = G({ name: n });
    assert.equal(prop(g, 'name', 'len'), n.length);
    assert.equal(prop(g, 'name', 'startsVowel'), 'AEIOU'.includes(n[0].toUpperCase()));
    assert.equal(prop(g, 'name', 'endsVowel'), 'AEIOU'.includes(n[n.length - 1].toUpperCase()));
  }
  for (let a = AGE_MIN; a <= AGE_MAX; a++) {
    const g = G({ age: a });
    assert.equal(prop(g, 'age', 'even'), a % 2 === 0);
    assert.equal(prop(g, 'age', 'lastDigit'), a % 10);
    assert.equal(prop(g, 'age', 'decade'), Math.floor(a / 10));
  }
  assert.equal(prop(G({ pet: 'bird' }), 'pet', 'legs'), 2);
  assert.equal(prop(G({ pet: 'none' }), 'pet', 'legs'), 0);
});

// [rule, guest overrides, expected]
const CASES = [
  ['crown', { hat: 'crown' }, true], ['crown', { hat: 'top' }, false],
  ['food', { item: 'pizza' }, true], ['food', { item: 'rose' }, false], ['food', { item: 'broccoli' }, true],
  ['blueShirt', { shirt: 'blue' }, true], ['blueShirt', { shirt: 'purple' }, false],
  ['dog', { pet: 'dog' }, true], ['dog', { pet: 'cat' }, false],
  ['happy', { mood: 'cool' }, true], ['happy', { mood: 'sad' }, false],
  ['noHat', {}, true], ['noHat', { hat: 'cap' }, false],
  ['redItem', { item: 'balloon' }, true], ['redItem', { item: 'banana' }, false], ['redItem', {}, false],
  ['furryPet', { pet: 'cat' }, true], ['furryPet', { pet: 'turtle' }, false],
  ['over40', { age: 41 }, true], ['over40', { age: 40 }, false],
  ['evenAge', { age: 42 }, true], ['evenAge', { age: 43 }, false],
  ['name3', { name: 'Ada' }, true], ['name3', { name: 'Omar' }, false],
  ['vowelStart', { name: 'Ines' }, true], ['vowelStart', { name: 'Kofi' }, false],
  ['fourLegs', { pet: 'turtle' }, true], ['fourLegs', { pet: 'bird' }, false],
  ['warmShirt', { shirt: 'orange' }, true], ['warmShirt', { shirt: 'green' }, false],
  ['noFood', { item: 'book' }, true], ['noFood', { item: 'donut' }, false],
  ['fancyHat', { hat: 'bow' }, true], ['fancyHat', { hat: 'cap' }, false],
  ['foodAndHappy', { item: 'apple', mood: 'grin' }, true], ['foodAndHappy', { item: 'apple', mood: 'sad' }, false], ['foodAndHappy', { mood: 'grin' }, false],
  ['crownOrTop', { hat: 'top' }, true], ['crownOrTop', { hat: 'crown' }, true], ['crownOrTop', { hat: 'grad' }, false],
  ['shirtMatchesItem', { shirt: 'red', item: 'apple' }, true], ['shirtMatchesItem', { shirt: 'red', item: 'banana' }, false], ['shirtMatchesItem', { shirt: 'red', item: 'book' }, false],
  ['over30AndPet', { age: 31, pet: 'fish' }, true], ['over30AndPet', { age: 31 }, false], ['over30AndPet', { age: 30, pet: 'fish' }, false],
  ['vowelEndOrCap', { name: 'Nina' }, true], ['vowelEndOrCap', { name: 'Omar', hat: 'cap' }, true], ['vowelEndOrCap', { name: 'Omar' }, false],
  ['coolNoHat', { shirt: 'green' }, true], ['coolNoHat', { shirt: 'green', hat: 'top' }, false], ['coolNoHat', { shirt: 'red' }, false],
  ['nameLenIsAgeDigit', { name: 'Kai', age: 23 }, true], ['nameLenIsAgeDigit', { name: 'Kai', age: 24 }, false],
  ['hatMatchesShirt', { hat: 'crown', shirt: 'yellow' }, true], ['hatMatchesShirt', { hat: 'top', shirt: 'black' }, false],
  ['foodXorHappy', { item: 'apple' }, true], ['foodXorHappy', { mood: 'grin' }, true], ['foodXorHappy', { item: 'apple', mood: 'grin' }, false],
  ['twoRed', { shirt: 'red', item: 'rose' }, true], ['twoRed', { shirt: 'red' }, false],
  ['oneFancy', { hat: 'top' }, true], ['oneFancy', {}, false],
  ['evenNotFourLegs', { age: 30, pet: 'bird' }, true], ['evenNotFourLegs', { age: 30, pet: 'dog' }, false], ['evenNotFourLegs', { age: 31 }, false],
  ['plantOrRoundAndWarm', { item: 'rose', shirt: 'red' }, true], ['plantOrRoundAndWarm', { item: 'ball', shirt: 'yellow' }, true], ['plantOrRoundAndWarm', { item: 'rose', shirt: 'blue' }, false],
  ['vowelBothEnds', { name: 'Ola' }, true], ['vowelBothEnds', { name: 'Omar' }, false],
  ['nameLenNotLegs', { name: 'Omar', pet: 'cat' }, false], ['nameLenNotLegs', { name: 'Ada', pet: 'cat' }, true],
  ['notBlueOrCap', {}, true], ['notBlueOrCap', { shirt: 'blue' }, false], ['notBlueOrCap', { hat: 'cap' }, false],
  ['foodXorWarmAndPet', { item: 'pizza', pet: 'dog' }, true], ['foodXorWarmAndPet', { item: 'pizza', shirt: 'red', pet: 'dog' }, false], ['foodXorWarmAndPet', { item: 'pizza' }, false],
  ['twoYellowAndUnder50', { item: 'banana', shirt: 'yellow', age: 20 }, true], ['twoYellowAndUnder50', { item: 'banana', shirt: 'yellow', age: 60 }, false], ['twoYellowAndUnder50', { hat: 'crown', item: 'sunflower', age: 20 }, true],
];

test('example rules evaluate correctly on hand-written guests', () => {
  for (const [name, o, want] of CASES) {
    assert.equal(evalRule(RULES[name], G(o), null), want, `${name} ${JSON.stringify(o)}`);
  }
  // every non-prev named rule is covered by at least 2 cases
  for (const [name, r] of Object.entries(RULES)) {
    if (usesPrev(r)) continue;
    const n = CASES.filter((c) => c[0] === name).length;
    if (!['topHat', 'banana', 'turtle', 'redShirt', 'guitar', 'balloon', 'yellowShirt', 'bird', 'emptyHanded', 'notBlackShirt', 'notCap', 'plant', 'noPet', 'music', 'round'].includes(name)) {
      assert.ok(n >= 2, `${name} has ${n} cases`);
    }
  }
});

test('prev rules: false without prev, use queue order', () => {
  const a = G({ shirt: 'red', age: 30, name: 'Kai', hat: 'top' });
  const b = G({ shirt: 'blue', age: 40, name: 'Ada', hat: 'top' });
  for (const name of ['shirtDiffPrev', 'sameHatPrev', 'olderThanPrev', 'nameLaterThanPrev']) {
    assert.equal(evalRule(RULES[name], a, null), false, name);
  }
  assert.equal(evalRule(RULES.shirtDiffPrev, b, a), true);
  assert.equal(evalRule(RULES.shirtDiffPrev, a, a), false);
  assert.equal(evalRule(RULES.sameHatPrev, b, a), true);
  assert.equal(evalRule(RULES.olderThanPrev, b, a), true);
  assert.equal(evalRule(RULES.olderThanPrev, a, b), false);
  assert.equal(evalRule(RULES.nameLaterThanPrev, a, b), true);
  // queue order, not admitted-only: a rejected guest still becomes prev
  const queue = [a, b, G({ shirt: 'blue' })];
  const labels = queue.map((g, i) => evalRule(RULES.shirtDiffPrev, g, i ? queue[i - 1] : null));
  assert.deepEqual(labels, [false, true, false]);
  assert.equal(evalRule(RULES.legsDiffPrevOrNoHat, G({ hat: 'cap' }), null), false);
  assert.equal(evalRule(RULES.legsDiffPrevOrNoHat, G(), null), true);
});

test('compiled closures agree with evalRule on 5000 random guests', () => {
  const rng = createRng('compile');
  const vis = ['hat', 'item', 'shirt', 'pet', 'mood', 'name', 'age'];
  const rules = [...Object.values(RULES), ...atomsFor(vis, null, { relational: true, prev: true })];
  for (const r of [...rules]) rules.push(...mutations(r, vis, null).slice(0, 3));
  const fns = rules.map((r) => compile(r, vis));
  let prev = null;
  for (let i = 0; i < 5000; i++) {
    const g = randomGuest(rng);
    fns.forEach((f, k) => assert.equal(f(g, prev), evalRule(rules[k], g, prev, vis)));
    prev = g;
  }
});

test('ruleCost follows 01 §5', () => {
  assert.equal(ruleCost(RULES.crown), 1);
  assert.equal(ruleCost(RULES.food), 1.5);
  assert.equal(ruleCost(RULES.over40), 1.5);
  assert.equal(ruleCost(RULES.vowelStart), 2);
  assert.equal(ruleCost(RULES.shirtMatchesItem), 3);
  assert.equal(ruleCost(RULES.twoRed), 3);
  assert.equal(ruleCost(RULES.noFood), 2.5);
  assert.equal(ruleCost(RULES.crownOrTop), 3);
  assert.equal(ruleCost(RULES.foodXorHappy), 5.5);
  assert.equal(ruleCost(RULES.shirtDiffPrev), 6);
});

test('ruleTraits lists referenced traits', () => {
  assert.deepEqual(ruleTraits(RULES.foodAndHappy), ['item', 'mood']);
  assert.deepEqual(ruleTraits(RULES.nameLenIsAgeDigit), ['name', 'age']);
  assert.deepEqual(ruleTraits(RULES.twoRed, ['hat', 'item', 'shirt', 'pet']), ['hat', 'item', 'shirt']);
  assert.deepEqual(ruleTraits(RULES.olderThanPrev), ['age']);
});

test('describe renders a complete string for every op, value and atom', () => {
  const vis = TRAIT_IDS;
  const rules = [...Object.values(RULES), ...atomsFor(vis, null, { relational: true, prev: true })];
  for (const t of ['hat', 'item', 'shirt', 'pet', 'mood']) for (const v of VALUES[t]) rules.push({ op: 'is', t, v }, { op: 'not', arg: { op: 'is', t, v } });
  for (const r of [...rules]) rules.push(...mutations(r, vis, null), { op: 'not', arg: r });
  const ops = new Set();
  for (const r of rules) {
    ops.add(r.op);
    const s = describe(r);
    assert.ok(s.length > 0, JSON.stringify(r));
    assert.ok(!/[{}]/.test(s), `unfilled template: ${s}`);
    assert.ok(!/rule\./.test(s), `missing key: ${s} for ${JSON.stringify(r)}`);
    assert.equal(s[0], s[0].toUpperCase());
  }
  for (const op of ['is', 'has', 'cmp', 'same', 'diff', 'count', 'prev', 'and', 'or', 'not', 'xor']) assert.ok(ops.has(op), op);
  for (const k of Object.keys(EN)) assert.ok(k.startsWith('rule.'), k);
  // custom translator is used for every fragment
  const seen = [];
  const t = (k, p) => { seen.push(k); return tEn(k, p); };
  describe(RULES.foodAndHappy, t);
  assert.ok(seen.includes('rule.and') && seen.includes('rule.has.item.food'));
  assert.equal(describe(RULES.topHat), 'Wears a top hat 🎩');
  assert.equal(describe(RULES.over40), 'Age is over 40');
  assert.equal(describe({ op: 'not', arg: RULES.over40 }), 'Age is at most 40');
});
