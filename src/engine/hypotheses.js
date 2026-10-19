// Hypothesis space H, exact alias detection, decoy picking. Pure.
import { VALUES, NAMES, AGE_MIN, AGE_MAX, QUOTE_COUNT, isEnumTrait, propsOf, prop } from './traits.js';
import { evalRule, compile, ruleCost, ruleTraits, ruleKey, usesPrev, describe } from './rules.js';
import { createRng, hashString } from './rng.js';

const ENUMS = ['hat', 'item', 'shirt', 'pet', 'mood'];
const AGES = Array.from({ length: AGE_MAX - AGE_MIN + 1 }, (_, i) => AGE_MIN + i);
export const AGE_THRESHOLDS = [20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70];
const ALIAS_CAP = 50000;

/** Domain of a trait within a level palette (enum traits may be restricted). */
export function domainOf(t, palette) {
  if (t === 'name') return NAMES;
  if (t === 'age') return AGES;
  return (palette && palette[t]) || VALUES[t];
}

/** A random guest whose enum traits come from the palette. No all-one-color tell. */
export function randomGuestIn(rng, palette) {
  for (let tries = 0; ; tries++) {
    const g = {};
    for (const t of ENUMS) g[t] = rng.pick(domainOf(t, palette));
    g.name = rng.pick(NAMES);
    g.age = rng.int(AGE_MIN, AGE_MAX);
    g.quote = rng.int(0, QUOTE_COUNT - 1);
    const cs = [prop(g, 'hat', 'color'), prop(g, 'item', 'color'), prop(g, 'shirt', 'color')];
    if (tries > 20 || !(cs[0] && cs[0] === cs[1] && cs[1] === cs[2])) return g;
  }
}

function baseGuest(palette) {
  const g = {};
  for (const t of ENUMS) g[t] = domainOf(t, palette)[0];
  g.name = NAMES[0]; g.age = 30; g.quote = 0;
  return g;
}

// ---- atoms -----------------------------------------------------------------

const LEN_ATOMS = [['=', 3], ['=', 4], ['=', 5], ['<=', 3], ['<=', 4], ['>=', 5], ['>=', 6]];
const LEG_ATOMS = [['=', 0], ['=', 2], ['=', 4], ['>=', 2], ['<', 4]];

/** Every atom over the visible traits (before semantic dedupe). */
export function atomsFor(visible, palette, { relational = false, prev = false } = {}) {
  const out = [];
  for (const t of visible) {
    if (isEnumTrait(t)) {
      const dom = domainOf(t, palette);
      for (const v of dom) out.push({ op: 'is', t, v });
      for (const p of propsOf(t)) {
        if (p === 'color') {
          const cols = [...new Set(dom.map((v) => prop({ [t]: v }, t, 'color')).filter(Boolean))];
          for (const c of cols) out.push({ op: 'has', t, p: 'color', v: c });
        } else if (p === 'legs') {
          for (const [c, n] of LEG_ATOMS) out.push({ op: 'cmp', t, p: 'legs', c, n });
        } else out.push({ op: 'has', t, p });
      }
    } else if (t === 'name') {
      out.push({ op: 'has', t, p: 'startsVowel' }, { op: 'has', t, p: 'endsVowel' });
      for (const [c, n] of LEN_ATOMS) out.push({ op: 'cmp', t, p: 'len', c, n });
    } else if (t === 'age') {
      for (const n of AGE_THRESHOLDS) out.push({ op: 'cmp', t, c: '>', n });
      for (const n of AGE_THRESHOLDS) out.push({ op: 'cmp', t, c: '<', n });
      out.push({ op: 'has', t, p: 'even' });
    }
  }
  const vis = new Set(visible);
  if (relational) {
    const colorRefs = ['hat', 'item', 'shirt'].filter((t) => vis.has(t));
    for (let i = 0; i < colorRefs.length; i++) {
      for (let j = i + 1; j < colorRefs.length; j++) {
        out.push({ op: 'same', a: [colorRefs[j], 'color'], b: [colorRefs[i], 'color'] });
      }
    }
    if (vis.has('name') && vis.has('age')) out.push({ op: 'same', a: ['name', 'len'], b: ['age', 'lastDigit'] });
    if (vis.has('name') && vis.has('pet')) out.push({ op: 'same', a: ['name', 'len'], b: ['pet', 'legs'] });
    const cols = new Set();
    for (const t of colorRefs) for (const v of domainOf(t, palette)) { const c = prop({ [t]: v }, t, 'color'); if (c) cols.add(c); }
    for (const c of cols) out.push({ op: 'count', p: 'color', v: c, c: '>=', n: 2 });
  }
  if (prev) {
    for (const t of visible) {
      if (isEnumTrait(t)) out.push({ op: 'prev', inner: { op: 'same', a: [t] } });
    }
    if (vis.has('item')) out.push({ op: 'prev', inner: { op: 'same', a: ['item', 'color'] } });
    if (vis.has('pet')) out.push({ op: 'prev', inner: { op: 'same', a: ['pet', 'legs'] } });
    if (vis.has('age')) out.push({ op: 'prev', inner: { op: 'cmp2', a: ['age'], c: '>' } }, { op: 'prev', inner: { op: 'cmp2', a: ['age'], c: '<' } });
    if (vis.has('name')) out.push({ op: 'prev', inner: { op: 'cmp2', a: ['name', 'len'], c: '>' } }, { op: 'prev', inner: { op: 'cmp2', a: ['name', 'len'], c: '<' } });
  }
  return out;
}

// ---- exact alias check ------------------------------------------------------

function collectProbes(rule, visible, probes) {
  const add = (t, f) => { (probes[t] ||= []).push(f); };
  (function walk(r) {
    switch (r.op) {
      case 'is': add(r.t, (g) => g[r.t] === r.v); break;
      case 'has': case 'cmp': add(r.t, (g) => evalRule(r, g, null, visible)); break;
      case 'same': case 'diff':
        add(r.a[0], (g) => String(r.a[1] === undefined ? g[r.a[0]] : prop(g, r.a[0], r.a[1])));
        add(r.b[0], (g) => String(r.b[1] === undefined ? g[r.b[0]] : prop(g, r.b[0], r.b[1])));
        break;
      case 'count':
        for (const t of visible) {
          if (isEnumTrait(t)) add(t, (g) => prop(g, t, r.p) === (r.v === undefined ? true : r.v));
        }
        break;
      case 'not': walk(r.arg); break;
      default: r.args.forEach(walk);
    }
  })(rule);
}

function sampledAlias(a, b, visible, palette, n = 4000) {
  const rng = createRng(hashString(`alias:${ruleKey(a)}|${ruleKey(b)}`));
  const fa = compile(a, visible); const fb = compile(b, visible);
  let prev = null;
  for (let i = 0; i < n; i++) {
    // sequences: sometimes repeat traits of prev so same-as-prev cases occur
    const g = randomGuestIn(rng, palette);
    if (prev && rng.next() < 0.3) { const t = rng.pick(visible); g[t] = prev[t]; }
    if (fa(g, prev) !== fb(g, prev)) return false;
    prev = g;
  }
  return true;
}

/**
 * Exact equivalence of two rules over the joint domain of the traits they reference
 * (within the palette). Values are grouped by every probe the rules make, so ages
 * collapse into threshold buckets. `prev` rules fall back to sequence sampling.
 */
export function isAlias(a, b, visible, palette) {
  if (usesPrev(a) || usesPrev(b)) return sampledAlias(a, b, visible, palette);
  const probes = {};
  collectProbes(a, visible, probes);
  collectProbes(b, visible, probes);
  const traits = Object.keys(probes);
  const reps = [];
  let size = 1;
  for (const t of traits) {
    const seen = new Map();
    for (const v of domainOf(t, palette)) {
      const g = { [t]: v };
      const key = probes[t].map((f) => (f(g) ? (f(g) === true ? '1' : String(f(g))) : '0')).join('|');
      if (!seen.has(key)) seen.set(key, v);
    }
    reps.push([...seen.values()]);
    size *= seen.size;
  }
  if (size > ALIAS_CAP) return sampledAlias(a, b, visible, palette);
  const g = baseGuest(palette);
  const idx = new Array(traits.length).fill(0);
  for (;;) {
    for (let i = 0; i < traits.length; i++) g[traits[i]] = reps[i][idx[i]];
    if (evalRule(a, g, null, visible) !== evalRule(b, g, null, visible)) return false;
    let k = 0;
    while (k < traits.length) {
      idx[k]++;
      if (idx[k] < reps[k].length) break;
      idx[k] = 0; k++;
    }
    if (k === traits.length) return true;
  }
}

// ---- mutations ------------------------------------------------------------------

const CMPS = ['<', '<=', '>', '>=', '=', '!='];

/** Single-step mutations of a rule (swap value, flip comparator, n±1, and<->or, drop NOT, drop arg...). */
export function mutations(rule, visible, palette) {
  const out = [];
  switch (rule.op) {
    case 'is':
      if (isEnumTrait(rule.t)) for (const v of domainOf(rule.t, palette)) if (v !== rule.v) out.push({ ...rule, v });
      break;
    case 'has':
      if (rule.p === 'color') {
        for (const c of ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'black', 'white']) if (c !== rule.v) out.push({ ...rule, v: c });
      } else if (isEnumTrait(rule.t)) {
        for (const p of propsOf(rule.t)) {
          if (p === rule.p || p === 'color' || p === 'legs' || (p === 'any' && !VALUES[rule.t].includes('none'))) continue;
          out.push({ op: 'has', t: rule.t, p });
        }
      } else if (rule.t === 'name') {
        for (const p of ['startsVowel', 'endsVowel']) if (p !== rule.p) out.push({ op: 'has', t: 'name', p });
      }
      break;
    case 'cmp':
      for (const c of CMPS) if (c !== rule.c) out.push({ ...rule, c });
      out.push({ ...rule, n: rule.n + 1 }, { ...rule, n: rule.n - 1 });
      break;
    case 'same': out.push({ ...rule, op: 'diff' }); break;
    case 'diff': out.push({ ...rule, op: 'same' }); break;
    case 'count':
      for (const c of CMPS) if (c !== rule.c) out.push({ ...rule, c });
      out.push({ ...rule, n: rule.n + 1 });
      if (rule.n > 0) out.push({ ...rule, n: rule.n - 1 });
      break;
    case 'prev': {
      const inner = rule.inner;
      if (inner.op === 'same') out.push({ op: 'prev', inner: { ...inner, op: 'diff' } });
      else if (inner.op === 'diff') out.push({ op: 'prev', inner: { ...inner, op: 'same' } });
      else for (const c of CMPS) if (c !== inner.c) out.push({ op: 'prev', inner: { ...inner, c } });
      break;
    }
    case 'not':
      out.push(rule.arg);
      for (const m of mutations(rule.arg, visible, palette)) out.push({ op: 'not', arg: m });
      break;
    case 'and': case 'or': case 'xor': {
      const others = ['and', 'or', 'xor'].filter((o) => o !== rule.op && (o !== 'xor' || rule.args.length === 2));
      for (const o of others) out.push({ op: o, args: rule.args });
      rule.args.forEach((a, i) => {
        if (rule.args.length === 2) out.push(rule.args[1 - i]);
        else out.push({ op: rule.op, args: rule.args.filter((_, j) => j !== i) });
        out.push({ op: rule.op, args: rule.args.map((x, j) => (j === i ? { op: 'not', arg: x } : x)) });
        for (const m of mutations(a, visible, palette)) out.push({ op: rule.op, args: rule.args.map((x, j) => (j === i ? m : x)) });
      });
      break;
    }
    default: break;
  }
  return out;
}

function subRules(rule, out = []) {
  out.push(rule);
  if (rule.op === 'not') subRules(rule.arg, out);
  else if (rule.args) rule.args.forEach((a) => subRules(a, out));
  return out;
}

const isAtomOp = (r) => r.op !== 'and' && r.op !== 'or' && r.op !== 'not' && r.op !== 'xor';

// ---- H ------------------------------------------------------------------------

/**
 * Build the hypothesis set H for a target.
 * @param {object} target
 * @param {string[]} visible
 * @param {{palette?:object, relational?:boolean, cap?:number, sampleSize?:number, pairAtoms?:number}} [opts]
 * @returns {Array<{rule:object,cost:number,rate:number}>} with non-enumerable helpers:
 *   atomVals(g, prev) -> Uint8Array, test(i, A, g, prev) -> boolean, capCost, palette, visible, targetRate
 */
export function buildHypotheses(target, visible, opts = {}) {
  const palette = opts.palette || null;
  const cap = opts.cap ?? 8000;
  const nPair = opts.pairAtoms ?? 60;
  const sampleSize = opts.sampleSize ?? 2000;
  const tPrev = usesPrev(target);
  const relational = opts.relational ?? false;

  // Atoms: candidates + target's own sub-atoms, deduped exactly by truth table, constants dropped.
  const raw = atomsFor(visible, palette, { relational, prev: tPrev });
  for (const s of subRules(target)) if (isAtomOp(s)) raw.push(s);
  raw.forEach((r, i) => { r.__i = i; });
  raw.sort((a, b) => ruleCost(a) - ruleCost(b) || a.__i - b.__i);
  const atoms = [];
  const seenSig = new Set();
  const seenKey = new Set();
  for (const r of raw) {
    delete r.__i;
    const k = ruleKey(r);
    if (seenKey.has(k)) continue;
    seenKey.add(k);
    if (r.op === 'prev') { atoms.push(r); continue; }
    const sig = truthSig(r, visible, palette);
    if (sig === null) { atoms.push(r); continue; }
    if (!/0/.test(sig.bits) || !/1/.test(sig.bits)) continue; // constant
    const key = `${sig.traits}:${sig.bits}`;
    if (seenSig.has(key)) continue;
    seenSig.add(key);
    atoms.push(r);
  }
  const atomFns = atoms.map((r) => compile(r, visible));
  const atomIdx = new Map(atoms.map((r, i) => [ruleKey(r), i]));

  // Hypothesis records: kind 0 atom, 1 not atom, 2 and, 3 or, 4 generic
  const recs = [];
  const keys = new Set();
  const push = (rule, kind, a, b) => {
    const k = ruleKey(rule);
    if (keys.has(k)) return;
    keys.add(k);
    recs.push({ rule, cost: ruleCost(rule), kind, a, b, ord: recs.length });
  };
  atoms.forEach((r, i) => push(r, 0, i, -1));
  atoms.forEach((r, i) => push({ op: 'not', arg: r }, 1, i, -1));
  const pairIdx = atoms.map((r, i) => i).filter((i) => atoms[i].op !== 'prev').slice(0, nPair);
  for (let x = 0; x < pairIdx.length; x++) {
    for (let y = x + 1; y < pairIdx.length; y++) {
      const i = pairIdx[x]; const j = pairIdx[y];
      push({ op: 'and', args: [atoms[i], atoms[j]] }, 2, i, j);
      push({ op: 'or', args: [atoms[i], atoms[j]] }, 3, i, j);
    }
  }
  const extra = [];
  for (const s of subRules(target)) { extra.push(s, { op: 'not', arg: s }); }
  for (const m of mutations(target, visible, palette)) extra.push(m, { op: 'not', arg: m });
  for (const r of extra) {
    const k = ruleKey(r);
    if (atomIdx.has(k)) { push(r, 0, atomIdx.get(k), -1); continue; }
    if (r.op === 'not' && atomIdx.has(ruleKey(r.arg))) { push(r, 1, atomIdx.get(ruleKey(r.arg)), -1); continue; }
    push(r, 4, -1, -1);
  }
  recs.sort((p, q) => p.cost - q.cost || p.ord - q.ord);
  const capCost = recs.length > cap ? recs[cap].cost : Infinity;
  const kept = recs.slice(0, cap);

  // Sample-based prefilter for aliases of the target, then exact check.
  const srng = createRng(hashString(`equiv:${ruleKey(target)}:${JSON.stringify(palette)}`));
  const sample = [];
  let prev = null;
  for (let i = 0; i < sampleSize; i++) {
    const g = randomGuestIn(srng, palette);
    if (tPrev && prev && srng.next() < 0.3) { const t = srng.pick(visible); g[t] = prev[t]; }
    sample.push([g, prev]);
    prev = g;
  }
  const W = Math.ceil(sampleSize / 32);
  const bitsOf = (fn) => {
    const out = new Uint32Array(W);
    for (let i = 0; i < sampleSize; i++) if (fn(sample[i][0], sample[i][1])) out[i >> 5] |= 1 << (i & 31);
    return out;
  };
  const atomBits = atomFns.map(bitsOf);
  const tFn = compile(target, visible);
  const tBits = bitsOf(tFn);
  const pop = (v) => { let c = 0; for (let i = 0; i < W; i++) { let x = v[i]; x -= (x >>> 1) & 0x55555555; x = (x & 0x33333333) + ((x >>> 2) & 0x33333333); c += (((x + (x >>> 4)) & 0xf0f0f0f) * 0x1010101) >>> 24; } return c; };
  const tKey = ruleKey(target);
  const H = [];
  const K = []; const IA = []; const IB = []; const F = [];
  const tmp = new Uint32Array(W);
  for (const rec of kept) {
    let bits;
    if (rec.kind === 0) bits = atomBits[rec.a];
    else if (rec.kind === 1) { for (let i = 0; i < W; i++) tmp[i] = ~atomBits[rec.a][i]; bits = tmp; }
    else if (rec.kind === 2) { for (let i = 0; i < W; i++) tmp[i] = atomBits[rec.a][i] & atomBits[rec.b][i]; bits = tmp; }
    else if (rec.kind === 3) { for (let i = 0; i < W; i++) tmp[i] = atomBits[rec.a][i] | atomBits[rec.b][i]; bits = tmp; }
    else { rec.fn = compile(rec.rule, visible); bits = bitsOf(rec.fn); }
    if (bits === tmp && sampleSize % 32) tmp[W - 1] &= (1 << (sampleSize % 32)) - 1;
    if (ruleKey(rec.rule) === tKey) continue;
    let same = true;
    for (let i = 0; i < W; i++) if (bits[i] !== tBits[i]) { same = false; break; }
    if (same && isAlias(rec.rule, target, visible, palette)) continue;
    H.push({ rule: rec.rule, cost: rec.cost, rate: pop(bits) / sampleSize });
    K.push(rec.kind); IA.push(rec.a); IB.push(rec.b); F.push(rec.fn || null);
  }

  const nAtoms = atoms.length;
  const atomVals = (g, p) => {
    const A = new Uint8Array(nAtoms);
    for (let i = 0; i < nAtoms; i++) A[i] = atomFns[i](g, p) ? 1 : 0;
    return A;
  };
  const test = (i, A, g, p) => {
    switch (K[i]) {
      case 0: return A[IA[i]] === 1;
      case 1: return A[IA[i]] === 0;
      case 2: return A[IA[i]] === 1 && A[IB[i]] === 1;
      case 3: return A[IA[i]] === 1 || A[IB[i]] === 1;
      default: return F[i](g, p);
    }
  };
  Object.defineProperties(H, {
    atoms: { value: atoms },
    atomVals: { value: atomVals },
    test: { value: test },
    capCost: { value: capCost },
    palette: { value: palette },
    visible: { value: visible },
    targetRate: { value: pop(tBits) / sampleSize },
    totalGenerated: { value: recs.length },
  });
  return H;
}

function truthSig(r, visible, palette) {
  const traits = ruleTraits(r, visible);
  let size = 1;
  for (const t of traits) size *= domainOf(t, palette).length;
  if (size > 5000) return null;
  const g = baseGuest(palette);
  const doms = traits.map((t) => domainOf(t, palette));
  const idx = new Array(traits.length).fill(0);
  let bits = '';
  for (;;) {
    for (let i = 0; i < traits.length; i++) g[traits[i]] = doms[i][idx[i]];
    bits += evalRule(r, g, null, visible) ? '1' : '0';
    let k = 0;
    while (k < traits.length) { idx[k]++; if (idx[k] < doms[k].length) break; idx[k] = 0; k++; }
    if (k === traits.length) break;
  }
  return { traits: traits.join(','), bits };
}

// ---- decoys --------------------------------------------------------------------

/**
 * Pick 3 decoy rules for name-the-rule. Every decoy is a non-alias of the target with a
 * unique text. Without opts.earlyObs, all 3 are contradicted by a demo guest. With
 * opts.earlyObs (the first few judged observations), exactly ONE decoy (the "gamble") is
 * consistent with every demo guest but contradicted by an early judged guest, and the other
 * two are contradicted by a demo guest. Returns fewer than 3 rules when that is impossible.
 * @param {object} target
 * @param {object[]} H  buildHypotheses() result
 * @param {{guest:object, admit:boolean, prev?:object|null}[]} demoObs
 * @param {object} rng
 * @param {object[]} [allObs]  every non-special observation (scores plausibility)
 * @param {{earlyObs?:object[]}} [opts]
 */
export function pickDecoys(target, H, demoObs, rng, allObs = demoObs, opts = {}) {
  const cT = ruleCost(target);
  const main = ruleTraits(target, H.visible)[0];
  const tText = describe(target);
  const prep = (obs) => obs.map((o) => [H.atomVals(o.guest, o.prev ?? null), o]);
  const demoA = prep(demoObs);
  const allA = prep(allObs);
  const earlyA = opts.earlyObs ? prep(opts.earlyObs) : null;
  const contraCount = (i, list) => {
    let c = 0;
    for (const [A, o] of list) if (H.test(i, A, o.guest, o.prev ?? null) !== o.admit) c++;
    return c;
  };
  const demoCands = [];
  const gambleCands = [];
  for (let i = 0; i < H.length; i++) {
    const h = H[i];
    if (h.rate < 0.04 || h.rate > 0.96) continue;
    const contra = contraCount(i, demoA);
    let list;
    if (contra) list = demoCands;
    else if (earlyA && contraCount(i, earlyA)) list = gambleCands;
    else continue;
    const agree = allA.length - contraCount(i, allA);
    const score = agree / allA.length - 0.12 * Math.abs(h.cost - cT) + 0.05 * rng.next();
    list.push({ h, score });
  }
  demoCands.sort((a, b) => b.score - a.score);
  gambleCands.sort((a, b) => b.score - a.score);
  const chosen = [];
  const texts = new Set([tText]);
  const tryPick = (cands, want, maxCost) => {
    for (const { h } of cands) {
      if (chosen.length >= want) return;
      if (h.cost > maxCost || chosen.includes(h) || tooClose(h.rule, target)) continue;
      const text = describe(h.rule);
      if (texts.has(text)) continue;
      if (redundantPair(h.rule, H.visible, H.palette)) continue;
      const onMain = ruleTraits(h.rule, H.visible).includes(main);
      if (onMain && chosen.filter((c) => ruleTraits(c.rule, H.visible).includes(main)).length >= 2) continue;
      if (chosen.some((c) => isAlias(c.rule, h.rule, H.visible, H.palette))) continue;
      chosen.push(h);
      texts.add(text);
    }
  };
  const tiers = [cT + 1.5, cT + 3, Infinity];
  if (earlyA) {
    for (const m of tiers) if (chosen.length < 1) tryPick(gambleCands, 1, m);
    if (chosen.length < 1) return [];
  }
  for (const m of tiers) if (chosen.length < 3) tryPick(demoCands, 3, m);
  return chosen.map((h) => h.rule);
}

const INV_C = { '<': '>=', '>=': '<', '>': '<=', '<=': '>', '=': '!=', '!=': '=' };
/** cmp nodes of a rule, with comparators flipped under NOT. */
function cmpNodes(rule) {
  const out = [];
  (function walk(r, neg) {
    if (r.op === 'cmp') out.push(neg ? { ...r, c: INV_C[r.c] } : r);
    else if (r.op === 'not') walk(r.arg, !neg);
    else if (r.args) r.args.forEach((a) => walk(a, neg));
  })(rule, false);
  return out;
}

/** Normalized integer threshold of a cmp node: [direction, n] with > / < folded into >= / <=. */
function normCmp(c) {
  if (c.c === '>') return ['ge', c.n + 1];
  if (c.c === '>=') return ['ge', c.n];
  if (c.c === '<') return ['le', c.n - 1];
  if (c.c === '<=') return ['le', c.n];
  return [c.c, c.n];
}

/** A decoy whose threshold nearly equals the target's (same direction) is too mean to tell apart;
 *  age equality tests read oddly as decoys. */
function tooClose(rule, target) {
  const rc = cmpNodes(rule);
  if (rc.some((c) => c.t === 'age' && c.p === undefined && (c.c === '=' || c.c === '!='))) return true;
  const tc = cmpNodes(target);
  if (!tc.length) return false;
  return rc.some((c) => tc.some((d) => {
    if (d.t !== c.t || d.p !== c.p) return false;
    const [dc, dn] = normCmp(d); const [cc, cn] = normCmp(c);
    if (dc !== cc || dn === cn) return false;
    return Math.abs(dn - cn) < (c.t === 'age' && c.p === undefined ? 10 : 2);
  }));
}

/** and/or pair that is equivalent to one of its own args (e.g. "over 45 AND over 60"). */
function redundantPair(rule, visible, palette) {
  if ((rule.op !== 'and' && rule.op !== 'or') || rule.args.length !== 2) return false;
  return isAlias(rule, rule.args[0], visible, palette) || isAlias(rule, rule.args[1], visible, palette);
}
