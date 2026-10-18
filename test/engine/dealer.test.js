import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dealLevel, encodeLevel, decodeLevel, checkLevel, computeLenient, observedPalette } from '../../src/engine/dealer.js';
import * as codec from '../../src/engine/codec.js';
import { buildHypotheses } from '../../src/engine/hypotheses.js';
import { RULES, ruleCost, evalRule, usesPrev, describe } from '../../src/engine/rules.js';

const V4 = ['hat', 'item', 'shirt', 'pet'];
const V6 = ['hat', 'item', 'shirt', 'pet', 'name', 'age'];
const SAMPLE = ['topHat', 'food', 'over40', 'crownOrTop', 'foodAndHappy', 'shirtMatchesItem', 'vowelStart', 'notBlueOrCap', 'foodXorHappy', 'shirtDiffPrev', 'olderThanPrev', 'sameHatPrev'];

const deals = [];
for (const name of SAMPLE) {
  for (let s = 0; s < 6; s++) {
    const vis = ['foodAndHappy', 'foodXorHappy'].includes(name) ? [...V4, 'mood'] : V6;
    const L = dealLevel({ id: `${name}-${s}`, club: 3, visible: vis, target: RULES[name] }, s);
    if (L) deals.push({ name, L });
  }
}

function runs(labels) { let r = 1; let max = 1; for (let i = 1; i < labels.length; i++) { r = labels[i] === labels[i - 1] ? r + 1 : 1; max = Math.max(max, r); } return max; }

test('most sample rules deal successfully', () => {
  for (const name of SAMPLE) assert.ok(deals.some((d) => d.name === name), `${name} never dealt`);
  assert.ok(deals.length >= SAMPLE.length * 6 * 0.6, `${deals.length}`);
});

test('demo: 2 admits + 2 rejects with a minimal pair; ratio 0.4..0.6; no run of 4', () => {
  for (const { name, L } of deals) {
    const demo = L.labels.slice(0, L.demoCount);
    assert.equal(demo.filter(Boolean).length, 2, name);
    const [a, b] = L.hintPair;
    assert.ok(a < L.demoCount && b < L.demoCount);
    assert.notEqual(L.labels[a], L.labels[b]);
    assert.equal(L.visible.filter((t) => L.guests[a][t] !== L.guests[b][t]).length, 1, name);
    const ratio = L.labels.filter(Boolean).length / L.labels.length;
    assert.ok(ratio >= 0.4 && ratio <= 0.6, `${name} ratio ${ratio}`);
    assert.ok(runs(L.labels) < 4, name);
    // labels are the target's verdicts in queue order
    L.guests.forEach((g, i) => assert.equal(L.labels[i], evalRule(L.target, g, i ? L.guests[i - 1] : null, L.visible)));
    if (usesPrev(L.target)) assert.equal(L.labels[0], false);
  }
});

test('distinguishability: no cheap non-alias hypothesis survives demo+8 (brute force with evalRule)', () => {
  for (const { name, L } of deals) {
    const H = buildHypotheses(L.target, L.visible, { palette: observedPalette(L.guests, L.visible), relational: L.visible.length >= 6 });
    const cMax = ruleCost(L.target) + 2;
    const upto = L.demoCount + 8;
    const survivors = H.filter((h) => h.cost <= cMax && L.guests.slice(0, upto).every((g, i) => evalRule(h.rule, g, i ? L.guests[i - 1] : null, L.visible) === L.labels[i]));
    assert.equal(survivors.length, 0, `${name}: ${survivors.map((h) => describe(h.rule)).join('; ')}`);
    assert.ok(checkLevel(L).ok, `${name}: ${checkLevel(L).problems}`);
  }
});

test('lenient: forgiven exactly when a cheap consistent hypothesis agrees with the wrong call', () => {
  for (const { L } of deals.slice(0, 20)) {
    const H = buildHypotheses(L.target, L.visible, { palette: observedPalette(L.guests, L.visible), relational: L.visible.length >= 6 });
    const cT = ruleCost(L.target);
    const ev = (r, k) => evalRule(r, L.guests[k], k ? L.guests[k - 1] : null, L.visible);
    for (let k = 0; k < L.guests.length; k++) {
      if (k < L.demoCount) { assert.deepEqual(L.lenient[k], { admit: false, reject: false }); continue; }
      const cons = H.filter((h) => h.cost <= cT && L.guests.slice(0, k).every((g, i) => ev(h.rule, i) === L.labels[i]));
      const admit = !L.labels[k] && cons.some((h) => ev(h.rule, k));
      const reject = L.labels[k] && cons.some((h) => !ev(h.rule, k));
      assert.deepEqual(L.lenient[k], { admit, reject });
    }
  }
});

test('isAmbiguous-style case: cheaper survivor agrees with a wrong call', () => {
  const pal = { hat: ['none', 'top'], item: ['banana'], shirt: ['red'], pet: ['none', 'dog'] };
  const T = RULES.topHat;
  const H = buildHypotheses(T, V4, { palette: pal });
  const base = { item: 'banana', shirt: 'red', mood: 'grin', name: 'Ada', age: 30, quote: 0 };
  const guests = [
    { ...base, hat: 'top', pet: 'dog' }, { ...base, hat: 'none', pet: 'none' },
    { ...base, hat: 'none', pet: 'dog' }, { ...base, hat: 'top', pet: 'none' },
  ];
  const labels = [true, false, false, true];
  const len = computeLenient(H, T, V4, guests, labels, 2);
  assert.deepEqual(len[2], { admit: true, reject: false }); // "Brings a dog" was still plausible
  assert.deepEqual(len[3], { admit: false, reject: false }); // nothing cheap left
});

test('choices: 4 options, target at correctIdx, unique texts; exactly one gamble decoy', () => {
  for (const { name, L } of deals) {
    assert.equal(L.choices.length, 4);
    assert.deepEqual(L.choices[L.correctIdx], L.target);
    assert.equal(new Set(L.choices.map((c) => describe(c))).size, 4);
    const wrongOn = (c, from, to) => L.guests.slice(from, to).some((g, j) => {
      const k = from + j;
      return !g.special && evalRule(c, g, k ? L.guests[k - 1] : null, L.visible) !== L.labels[k];
    });
    let gamble = 0;
    L.choices.forEach((c, i) => {
      if (i === L.correctIdx || wrongOn(c, 0, L.demoCount)) return;
      assert.ok(wrongOn(c, L.demoCount, L.demoCount + 4), `${name}: ${describe(c)} survives demo+4`);
      gamble++;
    });
    assert.equal(gamble, 1, name);
  }
});

test('minimal pair: seeded positions, not always [0,1], need not be adjacent', () => {
  const pairs = deals.map(({ L }) => L.hintPair.join(','));
  assert.ok(new Set(pairs).size >= 3, pairs.join(' '));
  assert.ok(pairs.filter((p) => p === '0,1').length < deals.length / 2);
  assert.ok(deals.some(({ L }) => L.hintPair[1] - L.hintPair[0] > 1));
  for (const { L } of deals) if (usesPrev(L.target)) assert.equal(L.hintPair[1], L.hintPair[0] + 1);
  const fixed = dealLevel({ id: 'f', club: 1, visible: V4, target: RULES.topHat, hintPair: [0, 1], demoLabels: [true, false, true, false] }, 4);
  assert.ok(fixed);
  assert.deepEqual(fixed.hintPair, [0, 1]);
});

test('determinism: same spec + seed -> deep-equal level', () => {
  const spec = { id: 'x', club: 4, visible: V6, target: RULES.foodXorWarmAndPet, baseRate: false };
  for (const s of [1, 2]) assert.deepEqual(dealLevel(spec, s), dealLevel(spec, s));
  const s2 = { id: 'y', club: 1, visible: V4, target: RULES.topHat };
  assert.deepEqual(dealLevel(s2, 9), dealLevel(s2, 9));
});

test('special guests: forced label at judged position 2, excluded from lenient', () => {
  const boss = dealLevel({ id: 'b', club: 1, visible: V4, target: RULES.balloon, special: 'boss', intro: 'intro.boss', earlyCheck: true }, 1)
    || dealLevel({ id: 'b', club: 1, visible: V4, target: RULES.balloon, special: 'boss', intro: 'intro.boss', earlyCheck: true }, 2);
  assert.ok(boss);
  const i = boss.demoCount + 2;
  assert.equal(boss.guests[i].special, 'boss');
  assert.equal(boss.labels[i], true);
  assert.notEqual(boss.guests[i].item, 'balloon');
  assert.deepEqual(boss.lenient[i], { admit: false, reject: false });
  assert.equal(boss.intro, 'intro.boss');
  assert.ok(checkLevel(boss).ok);
  const tc = dealLevel({ id: 't', club: 2, visible: [...V4, 'mood'], target: RULES.noPet, special: 'trenchcoat' }, 1)
    || dealLevel({ id: 't', club: 2, visible: [...V4, 'mood'], target: RULES.noPet, special: 'trenchcoat' }, 2);
  assert.ok(tc);
  const j = tc.demoCount + 2;
  assert.equal(tc.guests[j].special, 'trenchcoat');
  assert.equal(tc.guests[j].pet, 'none');
  assert.equal(tc.labels[j], false);
});

test('encode/decode round trip (palette is bake-only and not encoded)', () => {
  for (const { L } of deals) {
    assert.equal('palette' in L, false);
    const E = JSON.parse(JSON.stringify(encodeLevel(L)));
    assert.equal(E.p, undefined);
    assert.deepEqual(decodeLevel(E), JSON.parse(JSON.stringify(L)));
    assert.equal(checkLevel(decodeLevel(E)).ok, true);
  }
  assert.equal(decodeLevel, codec.decodeLevel);
  assert.equal(encodeLevel, codec.encodeLevel);
});

test('compact rule strings round-trip every rule in the library', () => {
  for (const [name, r] of Object.entries(RULES)) {
    const e = codec.encodeRule(r);
    assert.deepEqual(codec.decodeRule(e), JSON.parse(JSON.stringify(r)), name);
    if (!('id' in r)) assert.equal(typeof e, 'string', name);
  }
  assert.equal(codec.encodeRule({ op: 'has', t: 'item', p: 'food', v: false }), 'i.food!');
  assert.deepEqual(codec.decodeRule('i.food!'), { op: 'has', t: 'item', p: 'food', v: false });
  assert.deepEqual(codec.decodeRule('n.len!=4'), { op: 'cmp', t: 'name', p: 'len', c: '!=', n: 4 });
  assert.deepEqual(codec.decodeRule('@<=a'), { op: 'prev', inner: { op: 'cmp2', a: ['age'], c: '<=' } });
  assert.deepEqual(codec.decodeRule({ op: 'is', t: 'hat', v: 'top' }), { op: 'is', t: 'hat', v: 'top' });
  assert.throws(() => codec.decodeRule('h:top)'));
});

test('performance: dealing one level takes < 2 s', () => {
  for (const name of ['foodXorWarmAndPet', 'shirtDiffPrev', 'twoYellowAndUnder50']) {
    const t0 = performance.now();
    dealLevel({ id: 'p', club: 5, visible: V6, target: RULES[name], baseRate: false }, 5);
    assert.ok(performance.now() - t0 < 2000, name);
  }
});
