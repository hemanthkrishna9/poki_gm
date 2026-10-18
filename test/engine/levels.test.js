import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LEVELS, decodeLevel } from '../../src/data/levels.js';
import { checkLevel } from '../../src/engine/dealer.js';
import { encodeLevel } from '../../src/engine/codec.js';
import { ruleCost, ruleKey, describe, evalRule, ruleTraits } from '../../src/engine/rules.js';
import { TRAIT_IDS } from '../../src/engine/traits.js';

const clubLevels = Object.entries(LEVELS.clubs).flatMap(([c, ls]) => ls.map((e) => ({ club: +c, L: decodeLevel(e) })));
const dailyLevels = Object.entries(LEVELS.daily).map(([k, e]) => ({ key: k, L: decodeLevel(e) }));
const preview = decodeLevel(LEVELS.preview);
const all = [...clubLevels.map((x) => x.L), ...dailyLevels.map((x) => x.L), preview];

test('levels.js is within budget and has the planned shape', () => {
  const src = readFileSync(new URL('../../src/data/levels.js', import.meta.url), 'utf8');
  const size = Buffer.byteLength(src);
  assert.ok(size <= 220 * 1024, `${size} bytes`);
  assert.match(src, /export \{ decodeLevel \} from '\.\.\/engine\/codec\.js';/);
  assert.doesNotMatch(src, /dealer\.js/);
  assert.doesNotMatch(src, /"p":/, 'palette is bake-only');
  assert.equal(LEVELS.clubs[1].length, 20);
  assert.equal(LEVELS.clubs[2].length, 20);
  for (let c = 3; c <= 6; c++) assert.equal(LEVELS.clubs[c].length, 10);
  const keys = Object.keys(LEVELS.daily);
  assert.equal(keys.length, 366);
  assert.equal(keys[0], '2026-11-01');
  assert.equal(keys[365], '2027-11-01');
});

test('every level matches the Level contract', () => {
  for (const L of all) {
    assert.equal(typeof L.id, 'string');
    assert.ok(L.visible.length >= 4 && L.visible.length <= 6 && L.visible.every((t) => TRAIT_IDS.includes(t)));
    assert.equal(L.guests.length, L.labels.length);
    assert.equal(L.lenient.length, L.guests.length);
    assert.equal(L.choices.length, 4);
    assert.deepEqual(L.choices[L.correctIdx], L.target);
    assert.deepEqual(L.ruleTraits, ruleTraits(L.target, L.visible));
    assert.ok(L.ruleTraits.every((t) => L.visible.includes(t)), `${L.id} uses hidden traits`);
    for (const c of L.choices) assert.ok(ruleTraits(c, L.visible).every((t) => L.visible.includes(t)), `${L.id} choice on hidden trait`);
    assert.ok(L.win.inRow > 0 && L.win.total >= L.win.inRow);
    assert.ok(L.lenient.filter((x) => x.admit || x.reject).length >= 0);
    for (const g of L.guests) assert.ok(g.quote >= 0 && g.quote < 60);
  }
  for (const { club, L } of clubLevels) assert.equal(L.club, club);
});

test('visible traits and ids per club / daily', () => {
  for (const { club, L } of clubLevels) {
    const want = club === 1 ? ['hat', 'item', 'shirt', 'pet'] : club === 2 ? ['hat', 'item', 'shirt', 'pet', 'mood'] : ['hat', 'item', 'shirt', 'pet', 'name', 'age'];
    assert.deepEqual(L.visible, want);
  }
  LEVELS.clubs[3].forEach((e, i) => assert.equal(e.id, `c3s${i + 1}`));
  for (const { key, L } of dailyLevels) {
    assert.equal(L.id, `daily-${key}`);
    assert.equal(L.club, 0);
    assert.equal(L.demoCount, 4);
    assert.equal(L.guests.length, 16);
  }
});

test('handcrafted onboarding and special nights', () => {
  const c1 = LEVELS.clubs[1].map(decodeLevel);
  const c2 = LEVELS.clubs[2].map(decodeLevel);
  assert.deepEqual(c1[0].target, { op: 'is', t: 'hat', v: 'top' });
  assert.equal(c1[0].demoCount, 2);
  assert.equal(c1[0].guests.length, 2 + 5);
  assert.deepEqual(c1[0].win, { inRow: 3, total: 3 });
  assert.deepEqual(c1[0].hintPair, [0, 1]); // tutorial: the pair is the first two guests
  assert.equal(c1[1].demoCount, 3);
  assert.equal(c1[1].guests.length, 3 + 8);
  assert.deepEqual(c1[1].win, { inRow: 4, total: 5 });
  assert.ok(c1[2].guests.length - c1[2].demoCount >= 9);
  assert.deepEqual(c1[0].guests.map((g) => g.hat).every((h) => h === 'top' || h === 'none'), true);
  assert.deepEqual(c1[4].labels.slice(0, 2), [false, false]); // shift 5: first two demos are rejects
  assert.deepEqual(c2[6].target, { op: 'has', t: 'item', p: 'food' });
  assert.deepEqual(c2[7].target, { op: 'has', t: 'hat', p: 'fancy' });
  assert.deepEqual(c2[10].target, { op: 'has', t: 'shirt', p: 'warm' });
  assert.deepEqual(c2[11].target, { op: 'has', t: 'item', p: 'round' });
  const boss = c1[8];
  assert.deepEqual(boss.target, { op: 'is', t: 'item', v: 'balloon' });
  assert.equal(boss.intro, 'intro.boss');
  const bi = boss.guests.findIndex((g) => g.special);
  assert.equal(bi, boss.demoCount + 2);
  assert.equal(boss.guests[bi].special, 'boss');
  assert.equal(boss.labels[bi], true);
  assert.equal(evalRule(boss.target, boss.guests[bi]), false);
  const tc = c2[8];
  assert.deepEqual(tc.target, { op: 'is', t: 'pet', v: 'none' });
  assert.equal(tc.intro, 'intro.trenchcoat');
  const ti = tc.guests.findIndex((g) => g.special);
  assert.equal(ti, tc.demoCount + 2);
  assert.equal(tc.guests[ti].special, 'trenchcoat');
  assert.equal(tc.guests[ti].pet, 'none');
  assert.equal(tc.labels[ti], false);
  // no other level has specials
  for (const L of all) if (L !== boss && L.id !== 'c1s9' && L.id !== 'c2s9') assert.ok(!L.guests.some((g) => g.special), L.id);
  // club op families
  const opOf = (r) => (r.op === 'not' ? `not-${r.arg.op}` : r.op);
  for (const L of c1) assert.equal(L.target.op, 'is', L.id);
  for (const L of c2) assert.ok(['has', 'not-is'].includes(opOf(L.target)) || (L.target.op === 'is' && L.target.v === 'none'), L.id);
  for (const e of LEVELS.clubs[4]) assert.ok(['and', 'or'].includes(decodeLevel(e).target.op));
  const c5 = LEVELS.clubs[5].map(decodeLevel);
  c5.forEach((L, i) => assert.equal(L.target.op === 'prev', i >= 7, L.id));
});

test('every baked level passes the fairness re-check (and the cap keeps all cheap hypotheses)', () => {
  const bad = [];
  for (const L of all) {
    const r = checkLevel(L, { earlyCheck: L.club === 1 || L.club === 2 });
    if (!r.ok) bad.push(`${L.id}: ${r.problems.join(', ')}`);
    if (!(r.H.capCost > ruleCost(L.target) + 2)) bad.push(`${L.id}: cap dropped cheap hypotheses`);
  }
  assert.deepEqual(bad, []);
});

test('decoys: exactly one gamble (demo-consistent, refuted in first 4 judged), two demo-contradicted; unique texts; targets unique per club', () => {
  const wrongOn = (L, c, from, to) => {
    for (let k = from; k < Math.min(to, L.guests.length); k++) {
      if (!L.guests[k].special && evalRule(c, L.guests[k], k ? L.guests[k - 1] : null, L.visible) !== L.labels[k]) return true;
    }
    return false;
  };
  for (const L of all) {
    const texts = L.choices.map((c) => describe(c));
    assert.equal(new Set(texts).size, 4, `${L.id}: ${texts}`);
    let gamble = 0; let demo = 0;
    L.choices.forEach((c, i) => {
      if (i === L.correctIdx) return;
      if (wrongOn(L, c, 0, L.demoCount)) { demo++; return; }
      assert.ok(wrongOn(L, c, L.demoCount, L.demoCount + 4), `${L.id}: decoy "${texts[i]}" survives demo + 4 judged`);
      gamble++;
    });
    assert.equal(gamble, 1, `${L.id}: ${gamble} gamble decoys`);
    assert.equal(demo, 2, L.id);
  }
  for (const ls of Object.values(LEVELS.clubs)) {
    const keys = ls.map((e) => ruleKey(decodeLevel(e).target));
    assert.equal(new Set(keys).size, keys.length);
  }
});

test('minimal pair positions are randomized (except the c1s1 tutorial)', () => {
  const pairs = all.map((L) => L.hintPair.join(','));
  const at01 = pairs.filter((p) => p === '0,1').length;
  assert.ok(at01 < all.length * 0.5, `${at01}/${all.length} at [0,1]`);
  assert.ok(new Set(pairs).size >= 5, [...new Set(pairs)].join(' '));
  assert.ok(all.some((L) => L.hintPair[1] - L.hintPair[0] > 1), 'some pair is non-adjacent');
  for (let c = 1; c <= 6; c++) {
    const ls = LEVELS.clubs[c].map(decodeLevel);
    assert.ok(ls.slice(1).some((L) => L.hintPair.join(',') !== '0,1'), `club ${c}`);
  }
});

test('preview level: Daily-shaped, C2 family, not any real Daily Door', () => {
  assert.equal(preview.id, 'daily-preview');
  assert.equal(preview.club, 0);
  assert.equal(preview.demoCount, 4);
  assert.equal(preview.guests.length, 16);
  assert.deepEqual(preview.win, { inRow: 5, total: 8 });
  const t = preview.target;
  assert.ok(t.op === 'has' || (t.op === 'is' && t.v === 'none') || (t.op === 'not' && t.arg.op === 'is'), JSON.stringify(t));
  const enc = JSON.stringify(LEVELS.preview);
  for (const e of Object.values(LEVELS.daily)) assert.notEqual(JSON.stringify({ ...e, id: 'daily-preview' }), enc);
  for (const { L } of dailyLevels.slice(0, 28)) assert.notEqual(ruleKey(L.target), ruleKey(t));
});

test('codec.js is runtime-light: no dealer / hypotheses / rng / rules imports', () => {
  const src = readFileSync(new URL('../../src/engine/codec.js', import.meta.url), 'utf8');
  const imports = [...src.matchAll(/(?:import|export)[^;]*?from\s+'([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(imports, ['./traits.js']);
  for (const bad of ['dealer', 'hypotheses', 'rng', 'rules']) assert.doesNotMatch(src, new RegExp(`from '\\./${bad}\\.js'`), bad);
  const daily = readFileSync(new URL('../../src/engine/daily.js', import.meta.url), 'utf8');
  assert.deepEqual([...daily.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]), ['./codec.js']);
});

test('daily op families follow the weekday', () => {
  const fam = { 1: ['has', 'is', 'not'], 2: ['has', 'is', 'not'], 3: ['not', 'cmp', 'has'], 4: ['not', 'cmp', 'has'], 5: ['and', 'or'], 6: ['same', 'diff', 'count', 'xor'], 0: ['same', 'diff', 'count', 'xor'] };
  for (const { key, L } of dailyLevels) {
    const day = new Date(`${key}T12:00:00Z`).getUTCDay();
    assert.ok(fam[day].includes(L.target.op), `${key} ${L.target.op}`);
    assert.notEqual(L.target.op, 'prev');
  }
});

test('re-encoding a decoded level is lossless', () => {
  for (const [c, ls] of Object.entries(LEVELS.clubs)) for (const e of ls) assert.deepEqual(encodeLevel(decodeLevel(e)), e, `club ${c}`);
  for (const e of Object.values(LEVELS.daily)) assert.deepEqual(encodeLevel(decodeLevel(e)), e);
  assert.deepEqual(encodeLevel(decodeLevel(LEVELS.preview)), LEVELS.preview);
});
