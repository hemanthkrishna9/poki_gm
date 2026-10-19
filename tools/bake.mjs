#!/usr/bin/env node
// Bake every club level, 366 Daily Doors and one pre-launch preview into src/data/levels.js.
// Deterministic: same code -> byte-identical output. Usage: node tools/bake.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { VALUES } from '../src/engine/traits.js';
import { RULES, ruleKey, ruleCost, usesPrev, describe } from '../src/engine/rules.js';
import { dealLevel, lastFail } from '../src/engine/dealer.js';
import { encodeLevel } from '../src/engine/codec.js';
import { createRng, hashString } from '../src/engine/rng.js';
import { DAILY_EPOCH_MS } from '../src/engine/daily.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'src/data/levels.js');
const SEED_RETRIES = 50;
const PROC_SEEDS_PER_TARGET = 10;
const PROC_TARGET_TRIES = 60;
const CLUB_SHIFTS = 20; // every club, handcrafted + procedural
const PREV_SHIFTS = 4; // C5: rules about the previous guest only in its last shifts

const V1 = ['hat', 'item', 'shirt', 'pet'];
const V2 = ['hat', 'item', 'shirt', 'pet', 'mood'];
const V6 = ['hat', 'item', 'shirt', 'pet', 'name', 'age'];
const VISIBLE = { 1: V1, 2: V2, 3: V6, 4: V6, 5: V6, 6: V6, 0: V6 };

const A = true; const R = false;

// ---- handcrafted shifts (03 §2 mapped onto the catalog) ---------------------------
// Club 1 = 03 §2 rows 1-6 + more single-value rules; shift 9 = Boss in Disguise.
// Club 2 = C2 warm-up 1-6 + 03 §2 rows 7-12; shift 9 = Dog in a Trench Coat (replaces row 9).
const HAND = {
  1: [
    // Tutorial: the minimal pair stays at [0,1]. All decoys are demo-contradicted only if no
    // gamble decoy (demo-consistent, refuted by the first judged guests) exists.
    { target: RULES.topHat, demoCount: 2, judged: 5, win: { inRow: 3, total: 3 }, demoLabels: [A, R], hintPair: [0, 1], gambleOptional: true,
      palette: { hat: ['none', 'top'], item: ['banana', 'rose'], shirt: ['red', 'blue'], pet: ['none', 'dog'] } },
    { target: RULES.banana, demoCount: 3, judged: 8, win: { inRow: 4, total: 5 }, demoLabels: [A, R, A],
      palette: { hat: ['none', 'top', 'cap'], item: ['banana', 'apple', 'book'], shirt: ['red', 'green', 'blue'], pet: ['none', 'dog', 'cat'] } },
    { target: RULES.blueShirt, demoCount: 3, judged: 9, win: { inRow: 5, total: 6 }, demoLabels: [A, R, R],
      paletteSize: { hat: 3, item: 4, shirt: 4, pet: 3 } },
    { target: RULES.turtle, demoCount: 3, demoLabels: [A, R, A], paletteSize: { item: 5 } },
    { target: RULES.noHat, demoLabels: [R, R, A, A] },
    { target: RULES.redShirt, demoCount: 2, demoLabels: [A, R], paletteSize: { item: 5 } },
    { target: RULES.dog },
    { target: RULES.guitar },
    { target: RULES.balloon, special: 'boss', intro: 'intro.boss' },
    { target: RULES.crown },
    { target: RULES.yellowShirt },
    { target: RULES.bird },
  ],
  2: [
    { target: RULES.emptyHanded },
    { target: RULES.happy },
    { target: RULES.notBlackShirt },
    { target: RULES.furryPet },
    { target: RULES.notCap },
    { target: RULES.plant },
    { target: RULES.food },
    { target: RULES.fancyHat, palette: { hat: ['none', 'top', 'cap', 'crown', 'bow'] } },
    { target: RULES.noPet, special: 'trenchcoat', intro: 'intro.trenchcoat' },
    { target: RULES.music, demoCount: 3, demoLabels: [A, R, A] },
    { target: RULES.warmShirt, palette: { shirt: ['red', 'orange', 'yellow', 'green', 'blue'] } },
    { target: RULES.round, palette: { item: ['banana', 'donut', 'balloon', 'ball', 'book', 'umbrella'] } },
  ],
};

// ---- procedural target families -------------------------------------------------------
const is = (t, v) => ({ op: 'is', t, v });
const has = (t, p, v) => (v === undefined ? { op: 'has', t, p } : { op: 'has', t, p, v });
const cmp = (t, p, c, n) => (p ? { op: 'cmp', t, p, c, n } : { op: 'cmp', t, c, n });
const not = (arg) => ({ op: 'not', arg });

const CATEGORIES = [
  has('hat', 'fancy'), has('hat', 'any'),
  has('item', 'food'), has('item', 'round'), has('item', 'plant'), has('item', 'music'), has('item', 'sweet'),
  has('item', 'color', 'red'), has('item', 'color', 'yellow'), has('item', 'any'),
  has('shirt', 'warm'), has('shirt', 'cool'), has('shirt', 'neutral'),
  has('pet', 'fur'), has('pet', 'water'), has('pet', 'any'),
  has('mood', 'happy'), has('mood', 'sad'), has('mood', 'glasses'),
];
const enumVis = (vis) => vis.filter((t) => VALUES[t]);
const onVis = (vis) => (r) => vis.includes(r.t);

function genC1(rng, vis) {
  const t = rng.pick(enumVis(vis));
  return is(t, rng.pick(VALUES[t].filter((v) => v !== 'none')));
}
function genC2(rng, vis) {
  const x = rng.next();
  if (x < 0.6) return rng.pick(CATEGORIES.filter(onVis(vis)));
  if (x < 0.8) return is(rng.pick(['hat', 'item', 'pet'].filter((t) => vis.includes(t))), 'none');
  const t = rng.pick(enumVis(vis));
  return not(is(t, rng.pick(VALUES[t].filter((v) => v !== 'none'))));
}
function c3Atom(rng, vis) {
  const x = rng.next();
  if (x < 0.4 && vis.includes('age')) return cmp('age', undefined, rng.pick(['>', '<']), rng.pick([25, 30, 35, 40, 45, 50, 55, 60]));
  if (x < 0.6 && vis.includes('name')) return rng.pick([cmp('name', 'len', '>=', 5), cmp('name', 'len', '<=', 4), cmp('name', 'len', '=', 4), cmp('name', 'len', '=', 3)]);
  if (x < 0.7 && vis.includes('pet')) return rng.pick([cmp('pet', 'legs', '=', 4), cmp('pet', 'legs', '>=', 2), cmp('pet', 'legs', '=', 0)]);
  if (vis.includes('name')) return has('name', rng.pick(['startsVowel', 'endsVowel']));
  return rng.pick(CATEGORIES.filter(onVis(vis)));
}
function genC3(rng, vis) {
  if (rng.next() < 0.25) return not(rng.pick(CATEGORIES.filter(onVis(vis))));
  return c3Atom(rng, vis);
}
function anyAtom(rng, vis) {
  const x = rng.next();
  if (x < 0.25) return genC1(rng, vis);
  if (x < 0.6) return rng.pick(CATEGORIES.filter(onVis(vis)));
  return c3Atom(rng, vis);
}
const traitOf = (r) => (r.op === 'not' ? r.arg.t : r.t);
function genC4(rng, vis) {
  for (;;) {
    const a = anyAtom(rng, vis); const b = anyAtom(rng, vis);
    if (traitOf(a) === traitOf(b)) continue;
    return { op: rng.next() < 0.5 ? 'and' : 'or', args: [a, b] };
  }
}
function genC5(rng, vis, allowPrev) {
  if (allowPrev) {
    return rng.pick([
      { op: 'prev', inner: { op: 'same', a: ['hat'] } },
      { op: 'prev', inner: { op: 'diff', a: ['shirt', 'color'] } },
      { op: 'prev', inner: { op: 'same', a: ['pet'] } },
      { op: 'prev', inner: { op: 'cmp2', a: ['age'], c: '>' } },
      { op: 'prev', inner: { op: 'cmp2', a: ['age'], c: '<' } },
      { op: 'prev', inner: { op: 'cmp2', a: ['name', 'len'], c: '>' } },
    ]);
  }
  const x = rng.next();
  if (x < 0.3) return { op: rng.next() < 0.6 ? 'same' : 'diff', a: ['shirt', 'color'], b: ['item', 'color'] };
  if (x < 0.55) return { op: 'count', p: 'color', v: rng.pick(['red', 'yellow']), c: '>=', n: 1 };
  for (;;) {
    const a = rng.next() < 0.5 ? genC1(rng, vis) : rng.pick(CATEGORIES.filter(onVis(vis)));
    const b = rng.next() < 0.5 ? rng.pick(CATEGORIES.filter(onVis(vis))) : c3Atom(rng, vis);
    if (traitOf(a) === traitOf(b)) continue;
    return { op: 'xor', args: [a, b] };
  }
}
function genC6(rng, vis) {
  return [genC2, genC3, genC4, genC5][rng.int(0, 3)](rng, vis, false);
}
const FAMILY = { 1: genC1, 2: genC2, 3: genC3, 4: genC4, 5: genC5, 6: genC6 };

// ---- dealing helpers ----------------------------------------------------------------
const stats = { deals: 0, levels: 0, failReasons: {} };

function dealWithRetries(spec, seedBase, tries) {
  for (let attempt = 0; attempt < tries; attempt++) {
    stats.deals++;
    const L = dealLevel(spec, hashString(`${seedBase}:${attempt}`));
    if (L) { stats.levels++; return L; }
    stats.failReasons[lastFail.reason] = (stats.failReasons[lastFail.reason] || 0) + 1;
  }
  return null;
}

function proceduralLevel(baseSpec, gen, rng, usedKeys, label) {
  for (let t = 0; t < PROC_TARGET_TRIES; t++) {
    const target = gen(rng);
    const key = ruleKey(target);
    if (usedKeys.has(key)) continue;
    const L = dealWithRetries({ ...baseSpec, target }, `${label}:${key}`, PROC_SEEDS_PER_TARGET);
    if (L) { usedKeys.add(key); return L; }
  }
  throw new Error(`could not bake ${label}`);
}

// ---- clubs -------------------------------------------------------------------------------
function bakeClub(club) {
  const vis = VISIBLE[club];
  const levels = [];
  const used = new Set();
  const early = club <= 2;
  const hand = HAND[club] || [];
  hand.forEach((h, i) => {
    const id = `c${club}s${i + 1}`;
    const spec = { id, club, visible: vis, earlyCheck: early, baseRate: false, ...h };
    const L = dealWithRetries(spec, id, SEED_RETRIES);
    if (!L) throw new Error(`handcrafted ${id} (${describe(h.target)}) failed: ${lastFail.reason}`);
    used.add(ruleKey(h.target));
    levels.push(L);
  });
  const nProc = CLUB_SHIFTS - hand.length;
  const rng = createRng(`club:${club}`);
  const proc = [];
  for (let k = 0; k < nProc; k++) {
    const allowPrev = club === 5 && k >= nProc - PREV_SHIFTS;
    const gen = (r) => FAMILY[club](r, vis, allowPrev);
    const spec = { id: '', club, visible: vis, earlyCheck: early };
    proc.push(proceduralLevel(spec, gen, rng, used, `club${club}:${k}`));
  }
  // ramp: cheaper rules first; C5 keeps its prev rules in its last shifts
  const order = proc.map((L, i) => ({ L, i, prev: usesPrev(L.target) }));
  order.sort((a, b) => (a.prev - b.prev) || (ruleCost(a.L.target) - ruleCost(b.L.target)) || (a.i - b.i));
  order.forEach(({ L }) => levels.push(L));
  levels.forEach((L, i) => { L.id = `c${club}s${i + 1}`; });
  return levels;
}

// ---- daily ----------------------------------------------------------------------------------
// Mon-Tue C2, Wed-Thu C3, Fri C4, Sat-Sun C5 (no prev). getUTCDay: 0 = Sunday.
const DAILY_FAMILY = { 0: 5, 1: 2, 2: 2, 3: 3, 4: 3, 5: 4, 6: 5 };

function bakeDaily(days) {
  const out = {};
  const recent = [];
  for (let d = 0; d < days; d++) {
    const date = new Date(DAILY_EPOCH_MS + d * 86400000);
    const key = date.toISOString().slice(0, 10);
    const fam = DAILY_FAMILY[date.getUTCDay()];
    const rng = createRng(hashString(`door:${key}`));
    const used = new Set(recent);
    const spec = { id: `daily-${key}`, club: 0, visible: V6, demoCount: 4, judged: 12, win: { inRow: 5, total: 8 } };
    const L = proceduralLevel(spec, (r) => FAMILY[fam](r, V6, false), rng, used, `daily:${key}`);
    recent.push(ruleKey(L.target));
    if (recent.length > 14) recent.shift(); // no repeat within two weeks
    out[key] = L;
  }
  return out;
}

// Pre-launch sneak peek: Daily-shaped, C2 family, a rule none of the first four weeks uses.
function bakePreview(daily) {
  const used = new Set(Object.values(daily).slice(0, 28).map((L) => ruleKey(L.target)));
  const rng = createRng(hashString('door:preview'));
  const spec = { id: 'daily-preview', club: 0, visible: V6, demoCount: 4, judged: 12, win: { inRow: 5, total: 8 } };
  return proceduralLevel(spec, (r) => FAMILY[2](r, V6, false), rng, used, 'daily:preview');
}

// ---- main ------------------------------------------------------------------------------------
const t0 = process.hrtime.bigint();
const clubs = {};
for (let c = 1; c <= 6; c++) {
  clubs[c] = bakeClub(c);
  process.stdout.write(`club ${c}: ${clubs[c].length} levels\n`);
}
const daily = bakeDaily(366);
process.stdout.write(`daily: ${Object.keys(daily).length} levels\n`);
const preview = bakePreview(daily);

const enc = {
  clubs: Object.fromEntries(Object.entries(clubs).map(([c, ls]) => [c, ls.map(encodeLevel)])),
  daily: Object.fromEntries(Object.entries(daily).map(([k, L]) => [k, encodeLevel(L)])),
  preview: encodeLevel(preview),
};
const src = `// GENERATED by tools/bake.mjs. Do not edit by hand; re-run \`node tools/bake.mjs\`.
// Encoded levels (see src/engine/codec.js): decode with decodeLevel(LEVELS.clubs[club][i]),
// decodeLevel(LEVELS.daily[key]) or decodeLevel(LEVELS.preview).
export { decodeLevel } from '../engine/codec.js';
export const LEVELS = ${JSON.stringify(enc)};
`;
writeFileSync(OUT, src);
const secs = Number(process.hrtime.bigint() - t0) / 1e9;

const all = [...Object.values(clubs).flat(), ...Object.values(daily), preview];
const opCount = {};
for (const L of all) { const op = L.target.op === 'not' ? `not(${L.target.arg.op})` : L.target.op; opCount[op] = (opCount[op] || 0) + 1; }
const lenientN = all.reduce((s, L) => s + L.lenient.filter((x) => x.admit || x.reject).length, 0);
console.log('---- bake summary ----');
console.log(`levels: ${all.length} (clubs ${Object.values(clubs).flat().length}, daily ${Object.keys(daily).length}, preview 1: ${describe(preview.target)})`);
console.log(`deals attempted: ${stats.deals}, failures by reason: ${JSON.stringify(stats.failReasons)}`);
console.log(`target ops: ${JSON.stringify(opCount)}`);
console.log(`lenient guest slots: ${lenientN}`);
console.log(`levels.js: ${(Buffer.byteLength(src) / 1024).toFixed(1)} KB -> ${OUT}`);
console.log(`time: ${secs.toFixed(1)} s`);
for (let c = 1; c <= 2; c++) {
  console.log(`club ${c}: ${clubs[c].map((L) => describe(L.target)).join(' | ')}`);
}
const pair01 = all.filter((L) => L.hintPair[0] === 0 && L.hintPair[1] === 1).length;
console.log(`hintPair at [0,1]: ${pair01}/${all.length}`);
if (Buffer.byteLength(src) > 220 * 1024) { console.error('levels.js exceeds 220 KB'); process.exit(1); }
