// Greedy informative guest dealing + level validation. Pure. Bake-time only: the runtime
// decodes levels with ./codec.js (re-exported here for compatibility).
import { VALUES, NAMES, AGE_MIN, AGE_MAX, isEnumTrait } from './traits.js';
import { compile, ruleCost, ruleTraits, describe, evalRule, ruleKey, usesPrev } from './rules.js';
import { buildHypotheses, pickDecoys, domainOf, randomGuestIn } from './hypotheses.js';
import { createRng } from './rng.js';

export { encodeLevel, decodeLevel, encodeRule, decodeRule } from './codec.js';

const ENUMS = ['hat', 'item', 'shirt', 'pet', 'mood'];
export const PALETTE_SIZE = { hat: 4, item: 6, shirt: 4, pet: 4, mood: 4 };
const DEMO_PATTERNS = [[true, false, true, false], [true, false, false, true], [false, true, true, false], [false, true, false, true]];
const AGES = Array.from({ length: AGE_MAX - AGE_MIN + 1 }, (_, i) => AGE_MIN + i);

function subRules(rule, out = []) {
  out.push(rule);
  if (rule.op === 'not') subRules(rule.arg, out);
  else if (rule.args) rule.args.forEach((a) => subRules(a, out));
  return out;
}

/** Positive / negative value counts of single-trait atoms of T within a domain. */
function atomSpread(atom, t, dom, visible) {
  let pos = 0;
  for (const v of dom) if (evalRule(atom, { hat: 'none', item: 'none', shirt: 'red', pet: 'none', mood: 'grin', name: 'Ada', age: 30, [t]: v }, null, visible)) pos++;
  return { pos, neg: dom.length - pos };
}

/**
 * Choose a palette (value subset per visible enum trait) so that every single-trait
 * atom of T varies, categories show >= 3 (or all) positive values, and >= 2 negatives.
 */
export function choosePalette(target, visible, rng, given = {}, sizes = {}) {
  const atoms = subRules(target).filter((r) => r.op === 'is' || r.op === 'has' || r.op === 'cmp');
  const tFn = compile(target, visible);
  const srng = rng.fork('rate');
  let best = null; let bestDist = Infinity;
  for (let attempt = 0; attempt < 80; attempt++) {
    const pal = {};
    for (const t of visible) {
      if (!isEnumTrait(t)) continue;
      if (given[t]) { pal[t] = given[t].slice(); continue; }
      const k = Math.min((sizes[t] ?? PALETTE_SIZE[t]) + (attempt >= 20 ? rng.int(-1, 1) : 0), VALUES[t].length);
      // make sure the target's own values are included
      const forced = atoms.filter((a) => a.t === t && a.op === 'is').map((a) => a.v);
      const rest = rng.shuffle(VALUES[t].filter((v) => !forced.includes(v)));
      pal[t] = [...new Set([...forced, ...rest])].slice(0, k);
      pal[t].sort((a, b) => VALUES[t].indexOf(a) - VALUES[t].indexOf(b));
    }
    let ok = true;
    for (const a of atoms) {
      if (!isEnumTrait(a.t) || !visible.includes(a.t) || given[a.t]) continue;
      const full = atomSpread(a, a.t, VALUES[a.t], visible);
      const here = atomSpread(a, a.t, pal[a.t], visible);
      const wantPos = Math.min(a.op === 'is' ? 1 : 3, full.pos);
      if (here.pos < wantPos || here.neg < Math.min(2, full.neg)) { ok = false; break; }
    }
    if (!ok) continue;
    // quick base-rate estimate over the palette
    let pos = 0; let prev = null;
    const n = 400;
    for (let i = 0; i < n; i++) { const g = randomGuestIn(srng, pal); if (tFn(g, prev)) pos++; prev = g; }
    const dist = Math.abs(pos / n - 0.5);
    if (dist < bestDist) { bestDist = dist; best = pal; }
    if (dist <= 0.2) break;
  }
  return best;
}

/** All guests differing from g in exactly one visible trait. */
function oneTraitVariants(g, visible, palette) {
  const out = [];
  for (const t of visible) {
    const dom = t === 'name' ? NAMES : t === 'age' ? AGES : domainOf(t, palette);
    for (const v of dom) if (v !== g[t]) out.push({ ...g, [t]: v });
  }
  return out;
}

const visKey = (g, visible) => visible.map((t) => g[t]).join('|');

function labelRuns(labels) {
  let run = 1;
  for (let i = 1; i < labels.length; i++) {
    run = labels[i] === labels[i - 1] ? run + 1 : 1;
    if (run >= 4) return false;
  }
  return true;
}

/**
 * Palette as the player sees it: per visible enum trait, the values that occur among the
 * level's guests (catalog order). Fairness, lenient calls and decoys are all judged against
 * this, so a decoded level (which carries no palette) can be re-checked exactly.
 */
export function observedPalette(guests, visible) {
  const pal = {};
  for (const t of visible) {
    if (!isEnumTrait(t)) continue;
    const seen = new Set(guests.map((g) => g[t]));
    pal[t] = VALUES[t].filter((v) => seen.has(v));
  }
  return pal;
}

/** Cheap (cost <= cost(T)+2) surviving hypotheses after each guest (specials skipped). */
function cheapSurvivors(H, target, guests, labels) {
  const cheapMax = ruleCost(target) + 2;
  let S = Array.from(H.keys());
  const out = [];
  for (let k = 0; k < guests.length; k++) {
    const g = guests[k];
    const prev = k ? guests[k - 1] : null;
    if (!g.special) {
      const A = H.atomVals(g, prev);
      S = S.filter((s) => H.test(s, A, g, prev) === labels[k]);
    }
    let c = 0;
    for (const s of S) if (H[s].cost <= cheapMax) c++;
    out.push(c);
  }
  return out;
}

/** Non-special observations among the first `n` judged guests. */
function earlyJudged(guests, labels, demoCount, n = 4) {
  const out = [];
  for (let i = demoCount; i < Math.min(guests.length, demoCount + n); i++) {
    if (!guests[i].special) out.push({ guest: guests[i], admit: labels[i], prev: i ? guests[i - 1] : null });
  }
  return out;
}

/**
 * Deal and validate one level.
 * spec = {id, club, visible, target, demoCount=4, judged=12, win={inRow:5,total:8},
 *         special?: 'boss'|'trenchcoat', palette?, demoLabels?, intro?, relational?,
 *         earlyCheck?: boolean (clubs 1-2), baseRate?: boolean,
 *         hintPair?: [number,number] (fixed minimal-pair positions; default: seeded random),
 *         gambleOptional?: boolean (allow 3 demo-contradicted decoys if no gamble decoy exists)}
 * @returns {object|null} Level, or null when validation fails.
 */
export const lastFail = { reason: '' };

export function dealLevel(spec, seed) {
  const fail = (r) => { lastFail.reason = r; return null; };
  const rng = createRng(seed);
  const { visible, target } = spec;
  const demoCount = spec.demoCount ?? 4;
  const judged = spec.judged ?? 12;
  const N = demoCount + judged;
  const win = spec.win ?? { inRow: 5, total: 8 };
  const relational = spec.relational ?? (visible.includes('name') && visible.includes('age'));

  const palette = choosePalette(target, visible, rng.fork('palette'), spec.palette || {}, spec.paletteSize || {});
  if (!palette) return fail('palette');

  const H = buildHypotheses(target, visible, { palette, relational });
  if (spec.baseRate !== false && (H.targetRate < 0.15 || H.targetRate > 0.85)) return fail('baseRate');
  const tFn = compile(target, visible);
  const cT = ruleCost(target);
  const cheapMax = cT + 2;
  const Wt = new Float64Array(H.length);
  for (let i = 0; i < H.length; i++) Wt[i] = H[i].cost <= cheapMax ? 3 / H[i].cost : 0.15 / H[i].cost;
  // Plausible wrong rules the demo should leave alive, so a "gamble" decoy can exist.
  const plausible = new Uint8Array(H.length);
  for (let i = 0; i < H.length; i++) plausible[i] = H[i].rate >= 0.04 && H[i].rate <= 0.96 && H[i].cost <= cT + 3 ? 1 : 0;
  const KEEP_PLAUSIBLE = 6;

  const drng = rng.fork('deal');
  const patterns = usesPrev(target) ? DEMO_PATTERNS.filter((p) => !p[0]) : DEMO_PATTERNS;
  const demoLabels = spec.demoLabels ?? drng.pick(patterns).slice(0, demoCount);
  if (demoLabels.length !== demoCount) return fail('demoLabels');
  // minimal pair: two demo slots with opposite labels; the later one is a one-trait variant
  // of the earlier. Seeded random positions (adjacent only for `prev` rules).
  const pairs = [];
  for (let a = 0; a < demoCount; a++) {
    for (let b = a + 1; b < demoCount; b++) {
      if (demoLabels[a] !== demoLabels[b] && (!usesPrev(target) || b === a + 1)) pairs.push([a, b]);
    }
  }
  if (!pairs.length) return fail('noPair');
  const [pairA, pairB] = spec.hintPair ?? rng.fork(`pair:${ruleKey(target)}`).pick(pairs);
  if (!(pairA < pairB && pairB < demoCount && demoLabels[pairA] !== demoLabels[pairB])) return fail('noPair');

  const specialPos = spec.special ? demoCount + 2 : -1;
  const forced = new Array(N).fill(null);
  if (specialPos >= 0) forced[specialPos] = spec.special === 'boss';
  const minA = Math.ceil(0.4 * N - 1e-9);
  const maxA = Math.floor(0.6 * N + 1e-9);

  const balanceNeed = (labels, i) => {
    const a = labels.filter(Boolean).length;
    let fA = 0; let fR = 0;
    for (let j = i + 1; j < N; j++) if (forced[j] !== null) (forced[j] ? fA++ : fR++);
    const free = N - i - fA - fR; // includes slot i
    if (a + fA >= maxA) return false;
    if (a + fA + free <= minA) return true;
    const L = labels.length;
    if (L >= 3 && labels[L - 1] === labels[L - 2] && labels[L - 2] === labels[L - 3]) return !labels[L - 1];
    if (forced[i + 1] !== null && L >= 2 && labels[L - 1] === labels[L - 2] && labels[L - 1] === forced[i + 1]) return !forced[i + 1];
    if (i >= 4) {
      const frac = a / i;
      if (frac > 0.6) return false;
      if (frac < 0.4) return true;
    }
    return null;
  };

  let S = Array.from(H.keys());
  const guests = [];
  const labels = [];
  const cheapAfter = [];
  const seen = new Set();
  const countCheap = () => { let c = 0; for (const s of S) if (H[s].cost <= cheapMax) c++; return c; };

  for (let i = 0; i < N; i++) {
    const prev = i > 0 ? guests[i - 1] : null;
    if (i === specialPos) {
      let g = null;
      for (let k = 0; k < 500 && !g; k++) {
        const c = randomGuestIn(drng, palette);
        if (spec.special === 'boss' && !tFn(c, prev)) g = c;
        if (spec.special === 'trenchcoat' && c.pet === 'none' && tFn(c, prev)) g = c;
      }
      if (!g) return fail('special');
      g.special = spec.special;
      guests.push(g); labels.push(forced[i]);
      seen.add(visKey(g, visible));
      cheapAfter.push(countCheap());
      continue;
    }
    const need = i < demoCount ? demoLabels[i] : balanceNeed(labels, i);
    let cands = [];
    const nearSet = new Set();
    if (i === pairB) {
      cands = oneTraitVariants(guests[pairA], visible, palette).filter((c) => tFn(c, prev) === need);
      if (!cands.length) return fail('pairNearMiss');
      cands.forEach((c) => nearSet.add(c));
    } else {
      if (i > 0 && i % 3 === 2) {
        const flips = oneTraitVariants(prev, visible, palette).filter((c) => tFn(c, prev) !== labels[i - 1]);
        for (const c of drng.shuffle(flips).slice(0, 12)) { cands.push(c); nearSet.add(c); }
        for (const c of cands) c.quote = drng.int(0, 59);
      }
      for (let k = 0; k < 40; k++) cands.push(randomGuestIn(drng, palette));
      if (need !== null) {
        cands = cands.filter((c) => tFn(c, prev) === need);
        for (let k = 0; k < 600 && cands.length < 8; k++) {
          const c = randomGuestIn(drng, palette);
          if (tFn(c, prev) === need) cands.push(c);
        }
        if (!cands.length) return fail('noCandidate');
      }
    }
    let best = null; let bestScore = -Infinity;
    for (const c of cands) {
      const lab = tFn(c, prev);
      const A = H.atomVals(c, prev);
      let score = 0; let keep = 0;
      for (const s of S) {
        if (H.test(s, A, c, prev) !== lab) score += Wt[s];
        else keep += plausible[s];
      }
      if (i < demoCount && keep < KEEP_PLAUSIBLE) score -= 500;
      if (nearSet.has(c)) score += 0.3;
      if (seen.has(visKey(c, visible))) score -= 1000;
      score += 0.01 * drng.next();
      if (score > bestScore) { bestScore = score; best = c; }
    }
    const g = best;
    const lab = tFn(g, prev);
    const A = H.atomVals(g, prev);
    S = S.filter((s) => H.test(s, A, g, prev) === lab);
    guests.push(g); labels.push(lab);
    seen.add(visKey(g, visible));
    cheapAfter.push(countCheap());
  }

  // ---- validation ----
  const nA = labels.filter(Boolean).length;
  if (nA < minA || nA > maxA) return fail('ratio');
  if (!labelRuns(labels)) return fail('run');
  const cp2 = demoCount + Math.min(8, judged);
  const cp1 = demoCount + Math.min(4, judged);
  if (cheapAfter[cp2 - 1] !== 0) return fail('fairness');
  if (spec.earlyCheck && cheapAfter[cp1 - 1] > 3) return fail('early');

  // Re-judge against the palette the player actually sees (no palette is shipped).
  const obsPal = observedPalette(guests, visible);
  const H2 = buildHypotheses(target, visible, { palette: obsPal, relational });
  const seenAfter = cheapSurvivors(H2, target, guests, labels);
  if (seenAfter[cp2 - 1] !== 0) return fail('fairness');
  if (spec.earlyCheck && seenAfter[cp1 - 1] > 3) return fail('early');

  // ---- lenient ----
  const lenient = computeLenient(H2, target, visible, guests, labels, demoCount);

  // ---- decoys / choices ----
  // One "gamble" decoy survives the demo but dies within the first 4 judged guests; the
  // other two are contradicted by the demo.
  const obs = guests.map((g, i) => ({ guest: g, admit: labels[i], prev: i ? guests[i - 1] : null })).filter((o) => !o.guest.special);
  const demoObs = obs.slice(0, demoCount);
  const earlyObs = earlyJudged(guests, labels, demoCount);
  let decoys = pickDecoys(target, H2, demoObs, rng.fork('decoys'), obs, { earlyObs });
  if (decoys.length < 3 && spec.gambleOptional) decoys = pickDecoys(target, H2, demoObs, rng.fork('decoys'), obs);
  if (decoys.length < 3) return fail('decoys');
  const choices = rng.fork('choices').shuffle([target, ...decoys]);
  const correctIdx = choices.indexOf(target);

  const level = {
    id: spec.id,
    club: spec.club,
    visible: visible.slice(),
    target,
    guests,
    labels,
    demoCount,
    win: { inRow: win.inRow, total: win.total },
    choices,
    correctIdx,
    lenient,
    hintPair: [pairA, pairB],
    ruleTraits: ruleTraits(target, visible),
  };
  if (spec.intro) level.intro = spec.intro;
  Object.defineProperty(level, 'meta', {
    value: { cheapAfter: seenAfter, dealtCheapAfter: cheapAfter, survivorsAfterDemo: seenAfter[demoCount - 1], hSize: H2.length, targetRate: H.targetRate, cost: cT, palette, observedPalette: obsPal },
    enumerable: false,
  });
  return level;
}

/** lenient[k]: a wrong call on judged guest k is forgiven if a cheap (cost <= cost(T)) non-alias
 *  hypothesis consistent with guests 0..k-1 (special guests skipped) agrees with it. */
export function computeLenient(H, target, visible, guests, labels, demoCount) {
  const cT = ruleCost(target);
  let S2 = [];
  for (let i = 0; i < H.length; i++) if (H[i].cost <= cT) S2.push(i);
  const out = [];
  for (let k = 0; k < guests.length; k++) {
    const g = guests[k];
    const prev = k ? guests[k - 1] : null;
    const A = H.atomVals(g, prev);
    const entry = { admit: false, reject: false };
    if (k >= demoCount && !g.special) {
      let anyT = false; let anyF = false;
      for (const s of S2) { if (H.test(s, A, g, prev)) anyT = true; else anyF = true; if (anyT && anyF) break; }
      entry.admit = !labels[k] && anyT;
      entry.reject = labels[k] && anyF;
    }
    out.push(entry);
    if (!g.special) S2 = S2.filter((s) => H.test(s, A, g, prev) === labels[k]);
  }
  return out;
}

/**
 * Re-check a (decoded) level's fairness from scratch, against its observed palette.
 * Decoys: exactly one is consistent with all demo guests but contradicted by one of the
 * first 4 judged guests; the other two are contradicted by a demo guest (opts.gambleOptional
 * also accepts all three demo-contradicted). Returns {ok, cheapAfter, problems[], H}.
 * @param {object} level
 * @param {{earlyCheck?:boolean, gambleOptional?:boolean}} [opts]
 */
export function checkLevel(level, opts = {}) {
  const problems = [];
  const { target, visible, guests, labels, demoCount } = level;
  const relational = visible.includes('name') && visible.includes('age');
  const H = buildHypotheses(target, visible, { palette: observedPalette(guests, visible), relational });
  const tFn = compile(target, visible);
  const cheapMax = ruleCost(target) + 2;
  let S = Array.from(H.keys());
  const cheapAfter = [];
  for (let k = 0; k < guests.length; k++) {
    const g = guests[k];
    const prev = k ? guests[k - 1] : null;
    if (!g.special) {
      if (tFn(g, prev) !== labels[k]) problems.push(`label mismatch at ${k}`);
      const A = H.atomVals(g, prev);
      S = S.filter((s) => H.test(s, A, g, prev) === labels[k]);
    }
    cheapAfter.push(S.filter((s) => H[s].cost <= cheapMax).length);
  }
  const judged = guests.length - demoCount;
  if (cheapAfter[demoCount + Math.min(8, judged) - 1] !== 0) problems.push('cheap survivor after demo+8');
  if (opts.earlyCheck && cheapAfter[demoCount + Math.min(4, judged) - 1] > 3) problems.push('>3 cheap survivors after demo+4');
  const nA = labels.filter(Boolean).length;
  if (nA < Math.ceil(0.4 * labels.length - 1e-9) || nA > Math.floor(0.6 * labels.length + 1e-9)) problems.push('admit ratio');
  if (!labelRuns(labels)) problems.push('run of 4');
  // decoys: two contradicted by the demo, one "gamble" that only early judged guests refute
  const contradicts = (f, from, to) => {
    for (let k = from; k < Math.min(to, guests.length); k++) {
      if (!guests[k].special && f(guests[k], k ? guests[k - 1] : null) !== labels[k]) return true;
    }
    return false;
  };
  let gambles = 0;
  level.choices.forEach((c, i) => {
    if (i === level.correctIdx) return;
    const f = compile(c, visible);
    if (contradicts(f, 0, demoCount)) return;
    if (contradicts(f, demoCount, demoCount + 4)) gambles++;
    else problems.push(`decoy ${i} not contradicted by demo or first 4 judged`);
  });
  if (gambles > 1 || (gambles === 0 && !opts.gambleOptional)) problems.push(`${gambles} gamble decoys (want exactly 1)`);
  const texts = level.choices.map((c) => describe(c));
  if (new Set(texts).size !== texts.length) problems.push('duplicate choice text');
  if (ruleKey(level.choices[level.correctIdx]) !== ruleKey(target)) problems.push('correctIdx');
  const len = computeLenient(H, target, visible, guests, labels, demoCount);
  if (JSON.stringify(len) !== JSON.stringify(level.lenient)) problems.push('lenient mismatch');
  const [a, b] = level.hintPair;
  const diff = visible.filter((t) => guests[a][t] !== guests[b][t]).length;
  if (!(a < demoCount && b < demoCount && diff === 1 && labels[a] !== labels[b])) problems.push('hintPair');
  return { ok: problems.length === 0, cheapAfter, problems, H };
}
