import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHypotheses, isAlias, pickDecoys, randomGuestIn } from '../../src/engine/hypotheses.js';
import { RULES, ruleCost, describe, evalRule, ruleKey } from '../../src/engine/rules.js';
import { createRng } from '../../src/engine/rng.js';
import { dealLevel, observedPalette } from '../../src/engine/dealer.js';

const V4 = ['hat', 'item', 'shirt', 'pet'];
const V6 = ['hat', 'item', 'shirt', 'pet', 'name', 'age'];
const PAL = { hat: ['none', 'top', 'cap', 'crown'], item: ['none', 'apple', 'banana', 'pizza', 'book', 'guitar'], shirt: ['red', 'yellow', 'blue', 'white'], pet: ['none', 'dog', 'fish', 'bird'] };

test('isAlias: not(not(x)) == x, age>40 != age>41, exact over palette', () => {
  const x = RULES.over40;
  assert.equal(isAlias({ op: 'not', arg: { op: 'not', arg: x } }, x, V6), true);
  assert.equal(isAlias(x, { ...x, n: 41 }, V6), false);
  assert.equal(isAlias(x, { op: 'cmp', t: 'age', c: '>=', n: 41 }, V6), true);
  assert.equal(isAlias(RULES.noHat, { op: 'not', arg: { op: 'has', t: 'hat', p: 'any' } }, V4), true);
  assert.equal(isAlias(RULES.food, { op: 'or', args: [{ op: 'is', t: 'item', v: 'apple' }, { op: 'is', t: 'item', v: 'banana' }] }, V4), false);
  // within a palette whose only foods are apple and banana, they are equivalent
  const pal = { ...PAL, item: ['none', 'apple', 'banana', 'book'] };
  assert.equal(isAlias(RULES.food, { op: 'or', args: [{ op: 'is', t: 'item', v: 'apple' }, { op: 'is', t: 'item', v: 'banana' }] }, V4, pal), true);
  // cross-trait and count rules
  assert.equal(isAlias(RULES.twoRed, { op: 'and', args: [{ op: 'is', t: 'shirt', v: 'red' }, { op: 'has', t: 'item', p: 'color', v: 'red' }] }, V4), true);
  assert.equal(isAlias(RULES.shirtMatchesItem, { op: 'not', arg: { op: 'diff', a: ['shirt', 'color'], b: ['item', 'color'] } }, V4), true);
  assert.equal(isAlias(RULES.nameLenIsAgeDigit, RULES.nameLenNotLegs, V6), false);
  // prev rules use sampling
  assert.equal(isAlias(RULES.shirtDiffPrev, { op: 'not', arg: { op: 'prev', inner: { op: 'same', a: ['shirt', 'color'] } } }, V6), false); // differ when prev is null
  assert.equal(isAlias(RULES.shirtDiffPrev, { op: 'prev', inner: { op: 'diff', a: ['shirt'] } }, V6), true);
});

test('buildHypotheses: atoms, negations, all pairs, mutations; no aliases of T; cap never drops cheap ones', () => {
  for (const [T, vis] of [[RULES.topHat, V4], [RULES.food, V4], [RULES.foodAndHappy, [...V4, 'mood']], [RULES.over40, V6], [RULES.shirtMatchesItem, V6]]) {
    const H = buildHypotheses(T, vis, { palette: PAL, relational: vis.length >= 6 });
    assert.ok(H.length > 300 && H.length <= 8000, `${H.length}`);
    assert.ok(H.capCost > ruleCost(T) + 2, 'cap dropped a cheap hypothesis');
    const keys = new Set(H.map((h) => ruleKey(h.rule)));
    assert.equal(keys.size, H.length, 'duplicates');
    assert.ok(!keys.has(ruleKey(T)));
    for (let i = 0; i < H.length; i++) if (H[i].cost <= ruleCost(T) + 2) assert.ok(!isAlias(H[i].rule, T, vis, PAL));
    // pairs of the cheapest atoms are present
    const a = H.atoms[0]; const b = H.atoms[1];
    assert.ok(keys.has(ruleKey({ op: 'or', args: [a, b] })) || isAlias({ op: 'or', args: [a, b] }, T, vis, PAL));
    // compiled tests agree with evalRule
    const rng = createRng('h');
    let prev = null;
    for (let k = 0; k < 50; k++) {
      const g = randomGuestIn(rng, PAL);
      const A = H.atomVals(g, prev);
      for (let i = 0; i < H.length; i += 7) assert.equal(H.test(i, A, g, prev), evalRule(H[i].rule, g, prev, vis));
      prev = g;
    }
  }
  // the cap is respected
  const Hs = buildHypotheses(RULES.foodAndHappy, V6, { palette: PAL, relational: true, cap: 500 });
  assert.equal(Hs.length <= 500, true);
  assert.ok(Hs.capCost <= 4);
});

test('pickDecoys: 3 distinct non-aliases, each contradicted by a demo guest, unique texts', () => {
  for (const name of ['topHat', 'food', 'over40', 'crownOrTop', 'shirtMatchesItem', 'foodXorHappy']) {
    const L = dealLevel({ id: 't', club: 3, visible: V6, target: RULES[name], baseRate: false }, 3);
    if (!L) continue;
    const pal = observedPalette(L.guests, V6);
    const H = buildHypotheses(L.target, V6, { palette: pal, relational: true });
    const demo = L.guests.slice(0, L.demoCount).map((g, i) => ({ guest: g, admit: L.labels[i], prev: i ? L.guests[i - 1] : null }));
    const decoys = pickDecoys(L.target, H, demo, createRng(1));
    assert.equal(decoys.length, 3, name);
    const texts = new Set([L.target, ...decoys].map((r) => describe(r)));
    assert.equal(texts.size, 4, name);
    for (const d of decoys) {
      assert.ok(!isAlias(d, L.target, V6, pal));
      assert.ok(demo.some((o) => evalRule(d, o.guest, o.prev, V6) !== o.admit), `${name}: ${describe(d)}`);
    }
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) assert.ok(!isAlias(decoys[i], decoys[j], V6, pal));
  }
});

test('pickDecoys with earlyObs: one gamble decoy (demo-consistent, refuted early), two demo-contradicted', () => {
  let n = 0;
  for (const name of ['topHat', 'food', 'over40', 'crownOrTop', 'shirtMatchesItem', 'foodXorHappy']) {
    const L = dealLevel({ id: 't', club: 3, visible: V6, target: RULES[name], baseRate: false }, 3);
    if (!L) continue;
    const pal = observedPalette(L.guests, V6);
    const H = buildHypotheses(L.target, V6, { palette: pal, relational: true });
    const obs = L.guests.map((g, i) => ({ guest: g, admit: L.labels[i], prev: i ? L.guests[i - 1] : null }));
    const demo = obs.slice(0, L.demoCount);
    const early = obs.slice(L.demoCount, L.demoCount + 4);
    const decoys = pickDecoys(L.target, H, demo, createRng(1), obs, { earlyObs: early });
    assert.equal(decoys.length, 3, name);
    n++;
    const wrong = (d, list) => list.some((o) => evalRule(d, o.guest, o.prev, V6) !== o.admit);
    const gambles = decoys.filter((d) => !wrong(d, demo));
    assert.equal(gambles.length, 1, name);
    assert.ok(wrong(gambles[0], early), name);
    assert.ok(!isAlias(gambles[0], L.target, V6, pal));
    assert.equal(new Set([L.target, ...decoys].map((r) => describe(r))).size, 4, name);
  }
  assert.ok(n >= 4);
});

test('base-rate filter rejects rules outside 0.15..0.85', () => {
  // name length = age last digit is admitted ~10% of the time
  assert.equal(dealLevel({ id: 't', club: 5, visible: V6, target: RULES.nameLenIsAgeDigit }, 1), null);
  const H = buildHypotheses(RULES.nameLenIsAgeDigit, V6, { palette: PAL, relational: true });
  assert.ok(H.targetRate < 0.15);
  // allowed when explicitly disabled (handcrafted), rate in range otherwise
  const ok = dealLevel({ id: 't', club: 1, visible: V4, target: RULES.topHat }, 1);
  assert.ok(ok);
});
