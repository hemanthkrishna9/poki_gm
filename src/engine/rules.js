// Rule evaluation, cost, referenced traits, and text (describe). Pure.
import { prop, isEnumTrait, propsOf, TRAIT_IDS } from './traits.js';
import EN from './ruleStrings.en.js';

const ENUM_IDS = ['hat', 'item', 'shirt', 'pet', 'mood'];

function cmpNum(x, c, n) {
  if (x === null || x === undefined) return false;
  switch (c) {
    case '<': return x < n;
    case '<=': return x <= n;
    case '>': return x > n;
    case '>=': return x >= n;
    case '=': return x === n;
    case '!=': return x !== n;
    default: throw new Error(`bad comparator ${c}`);
  }
}

/** Value of a [trait, prop?] reference. */
export function refVal(g, ref) {
  return ref[1] === undefined ? g[ref[0]] : prop(g, ref[0], ref[1]);
}

function sameRef(x, y) {
  return x !== null && x !== undefined && y !== null && y !== undefined && x === y;
}

/**
 * Evaluate a rule against a guest.
 * @param {object} rule
 * @param {object} g guest
 * @param {object|null} [prev] previous guest in the queue (null for the first)
 * @param {string[]} [visible] visible traits (used by `count`)
 */
export function evalRule(rule, g, prev = null, visible = TRAIT_IDS) {
  switch (rule.op) {
    case 'is': return g[rule.t] === rule.v;
    case 'has': return prop(g, rule.t, rule.p) === (rule.v === undefined ? true : rule.v);
    case 'cmp': return cmpNum(rule.p === undefined ? g[rule.t] : prop(g, rule.t, rule.p), rule.c, rule.n);
    case 'same': return sameRef(refVal(g, rule.a), refVal(g, rule.b));
    case 'diff': return !sameRef(refVal(g, rule.a), refVal(g, rule.b));
    case 'count': {
      const want = rule.v === undefined ? true : rule.v;
      let k = 0;
      for (const t of visible) if (isEnumTrait(t) && prop(g, t, rule.p) === want) k++;
      return cmpNum(k, rule.c, rule.n);
    }
    case 'prev': {
      if (!prev) return false;
      const inner = rule.inner;
      const x = refVal(g, inner.a);
      const y = refVal(prev, inner.a);
      if (inner.op === 'same') return sameRef(x, y);
      if (inner.op === 'diff') return !sameRef(x, y);
      if (inner.op === 'cmp2') {
        if (x === null || y === null) return false;
        return cmpNum(x, inner.c, y);
      }
      throw new Error(`bad prev inner ${inner.op}`);
    }
    case 'and': return rule.args.every((r) => evalRule(r, g, prev, visible));
    case 'or': return rule.args.some((r) => evalRule(r, g, prev, visible));
    case 'not': return !evalRule(rule.arg, g, prev, visible);
    case 'xor': return evalRule(rule.args[0], g, prev, visible) !== evalRule(rule.args[1], g, prev, visible);
    default: throw new Error(`unknown op ${rule.op}`);
  }
}

/** Compile a rule into a closure (g, prev) => boolean. */
export function compile(rule, visible = TRAIT_IDS) {
  switch (rule.op) {
    case 'and': {
      const fs = rule.args.map((r) => compile(r, visible));
      return fs.length === 2 ? (g, p) => fs[0](g, p) && fs[1](g, p) : (g, p) => fs.every((f) => f(g, p));
    }
    case 'or': {
      const fs = rule.args.map((r) => compile(r, visible));
      return fs.length === 2 ? (g, p) => fs[0](g, p) || fs[1](g, p) : (g, p) => fs.some((f) => f(g, p));
    }
    case 'not': { const f = compile(rule.arg, visible); return (g, p) => !f(g, p); }
    case 'xor': {
      const a = compile(rule.args[0], visible); const b = compile(rule.args[1], visible);
      return (g, p) => a(g, p) !== b(g, p);
    }
    case 'is': { const { t, v } = rule; return (g) => g[t] === v; }
    default: return (g, p) => evalRule(rule, g, p ?? null, visible);
  }
}

/** Cost per 01 §5 (has on name letters counts as `letter` = 2). */
export function ruleCost(rule) {
  switch (rule.op) {
    case 'is': return 1;
    case 'has': {
      let c = rule.t === 'name' && rule.p !== 'len' ? 2 : 1.5;
      if (rule.v === false) c += 1;
      return c;
    }
    case 'cmp': return 1.5;
    case 'same': case 'diff': case 'count': return 3;
    case 'prev': return 3 + 3;
    case 'not': return 1 + ruleCost(rule.arg);
    case 'and': case 'or': return rule.args.reduce((s, r) => s + ruleCost(r), 0) + (rule.args.length - 1);
    case 'xor': return 2.5 + ruleCost(rule.args[0]) + ruleCost(rule.args[1]);
    default: throw new Error(`unknown op ${rule.op}`);
  }
}

/** Traits a rule references, in canonical order. */
export function ruleTraits(rule, visible = TRAIT_IDS) {
  const set = new Set();
  (function walk(r) {
    switch (r.op) {
      case 'is': case 'has': case 'cmp': set.add(r.t); break;
      case 'same': case 'diff': set.add(r.a[0]); set.add(r.b[0]); break;
      case 'count':
        for (const t of visible) if (isEnumTrait(t) && propsOf(t).includes(r.p)) set.add(t);
        break;
      case 'prev': set.add(r.inner.a[0]); break;
      case 'not': walk(r.arg); break;
      default: r.args.forEach(walk);
    }
  })(rule);
  return TRAIT_IDS.filter((t) => set.has(t));
}

/** True when the rule (or any sub-rule) uses `prev`. */
export function usesPrev(rule) {
  if (rule.op === 'prev') return true;
  if (rule.op === 'not') return usesPrev(rule.arg);
  if (rule.args) return rule.args.some(usesPrev);
  return false;
}

/** Canonical string key of a rule (for dedupe / equality). */
export function ruleKey(rule) {
  return JSON.stringify(rule, (k, v) => (k === 'id' ? undefined : v));
}

/** Depth of the AST (atoms = 1). */
export function ruleDepth(rule) {
  if (rule.op === 'not') return 1 + ruleDepth(rule.arg);
  if (rule.args) return 1 + Math.max(...rule.args.map(ruleDepth));
  return 1;
}

// ---- describe ---------------------------------------------------------------

function fill(tpl, params) {
  return tpl.replace(/\{(\w+)\}/g, (m, k) => (params && params[k] !== undefined ? String(params[k]) : m));
}

/** Default English translator: t(key, params) -> filled template. */
export function tEn(key, params) {
  const tpl = EN[key];
  return fill(tpl === undefined ? key : tpl, params);
}

const INV = { '<': '>=', '>=': '<', '>': '<=', '<=': '>', '=': '!=', '!=': '=' };
const has = (k) => Object.prototype.hasOwnProperty.call(EN, k);
const capFirst = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
function lowerFirst(s) {
  if (s.length > 1 && /[A-Z]/.test(s[0]) && /[a-z]/.test(s[1])) return s[0].toLowerCase() + s.slice(1);
  return s;
}

function valPhrase(t, v, tr) {
  if (isEnumTrait(t)) return tr(`rule.val.${t}.${v}`);
  return String(v);
}

function refPhrase(ref, tr) {
  const k = ref[1] === undefined ? `rule.ref.${ref[0]}` : `rule.ref.${ref[0]}.${ref[1]}`;
  return tr(has(k) ? k : `rule.ref.${ref[0]}`);
}

function cTable(t, p) {
  return (t === 'name' && p === 'len') || (t === 'pet' && p === 'legs') ? 'rule.cn.' : 'rule.c.';
}

function desc(r, tr, neg) {
  switch (r.op) {
    case 'not': return desc(r.arg, tr, !neg);
    case 'is': {
      const base = `rule.is.${r.t}`;
      if (r.v === 'none' && has(`${base}.none`)) return tr(neg ? `${base}.none.not` : `${base}.none`);
      const v = valPhrase(r.t, r.v, tr);
      return tr(neg ? `${base}.not` : base, { v });
    }
    case 'has': {
      let n = neg;
      let v = r.v === undefined ? true : r.v;
      if (v === false) { n = !n; v = true; }
      const base = `rule.has.${r.t}.${r.p}`;
      const vp = r.p === 'color' ? tr(`rule.color.${v}`) : v;
      if (has(base)) return tr(n ? `${base}.not` : base, { v: vp });
      return tr(n ? 'rule.has.not' : 'rule.has', { a: refPhrase([r.t, r.p], tr), v: vp });
    }
    case 'cmp': {
      const c = neg ? INV[r.c] : r.c;
      const base = r.p === undefined ? `rule.cmp.${r.t}` : `rule.cmp.${r.t}.${r.p}`;
      if (has(`${base}.${c}.${r.n}`)) return tr(`${base}.${c}.${r.n}`);
      if (has(`${base}.${c}`)) return tr(`${base}.${c}`, { n: r.n });
      const cp = tr(cTable(r.t, r.p) + c);
      if (has(base)) return tr(base, { c: cp, n: r.n });
      return tr('rule.cmp', { a: refPhrase([r.t, r.p], tr), c: cp, n: r.n });
    }
    case 'same': case 'diff': {
      const op = (r.op === 'same') !== neg ? 'same' : 'diff';
      return tr(`rule.${op}`, { a: refPhrase(r.a, tr), b: refPhrase(r.b, tr) });
    }
    case 'count': {
      const c = neg ? INV[r.c] : r.c;
      const v = r.v === undefined ? true : r.v;
      const pv = r.p === 'color' ? tr(`rule.color.${v}`) : tr(`rule.pv.${r.p}`);
      if (c === '=' && r.n === 0) return tr('rule.count.zero', { pv });
      return tr(r.n === 1 ? 'rule.count.one' : 'rule.count', { c: tr(`rule.cn.${c}`), n: r.n, pv });
    }
    case 'prev': {
      const inner = r.inner;
      if (inner.op === 'same' || inner.op === 'diff') {
        const op = (inner.op === 'same') !== neg ? 'same' : 'diff';
        return tr(`rule.prev.${op}`, { a: refPhrase(inner.a, tr) });
      }
      if (neg) return tr('rule.not', { a: lowerFirst(desc(r, tr, false)) });
      const path = inner.a[1] === undefined ? inner.a[0] : `${inner.a[0]}.${inner.a[1]}`;
      const k = `rule.prev.cmp2.${path}.${inner.c}`;
      if (has(k)) return tr(k);
      return tr('rule.prev.cmp2', { a: refPhrase(inner.a, tr), c: tr(`rule.cw.${inner.c}`) });
    }
    case 'and': case 'or': case 'xor': {
      if (neg) return tr('rule.not', { a: lowerFirst(desc(r, tr, false)) });
      const parts = r.args.map((x, i) => {
        const s = i ? lowerFirst(desc(x, tr, false)) : desc(x, tr, false);
        return x.op === 'and' || x.op === 'or' || x.op === 'xor' ? tr('rule.group', { a: s }) : s;
      });
      const key = r.op === 'xor' ? 'rule.xor' : r.args.length === 3 ? `rule.${r.op}3` : `rule.${r.op}`;
      return tr(key, { a: parts[0], b: parts[1], c3: parts[2] });
    }
    default: throw new Error(`unknown op ${r.op}`);
  }
}

/**
 * Human-readable rule text built from `rule.*` i18n templates.
 * @param {object} rule
 * @param {(key:string, params?:object)=>string} [t]
 */
export function describe(rule, t = tEn) {
  return capFirst(desc(rule, typeof t === 'function' ? t : tEn, false));
}

// ---- named rules ------------------------------------------------------------
const is = (t, v) => ({ op: 'is', t, v });
const hasP = (t, p, v) => (v === undefined ? { op: 'has', t, p } : { op: 'has', t, p, v });
const cmp = (t, p, c, n) => (p ? { op: 'cmp', t, p, c, n } : { op: 'cmp', t, c, n });
const not = (arg) => ({ op: 'not', arg });
const and = (...args) => ({ op: 'and', args });
const or = (...args) => ({ op: 'or', args });
const xor = (a, b) => ({ op: 'xor', args: [a, b] });

export const R = { is, has: hasP, cmp, not, and, or, xor };

/** Named rules: handcrafted onboarding shifts and the 01 §2 examples adapted to the catalog. */
export const RULES = {
  // club 1 onboarding (C1: is)
  topHat: is('hat', 'top'),
  banana: is('item', 'banana'),
  blueShirt: is('shirt', 'blue'),
  turtle: is('pet', 'turtle'),
  noHat: is('hat', 'none'),
  redShirt: is('shirt', 'red'),
  dog: is('pet', 'dog'),
  guitar: is('item', 'guitar'),
  balloon: is('item', 'balloon'),
  crown: is('hat', 'crown'),
  yellowShirt: is('shirt', 'yellow'),
  bird: is('pet', 'bird'),
  // club 2 onboarding (C2: has / is none / not is)
  emptyHanded: is('item', 'none'),
  happy: hasP('mood', 'happy'),
  notBlackShirt: not(is('shirt', 'black')),
  furryPet: hasP('pet', 'fur'),
  notCap: not(is('hat', 'cap')),
  plant: hasP('item', 'plant'),
  food: hasP('item', 'food'),
  fancyHat: hasP('hat', 'fancy'),
  noPet: is('pet', 'none'),
  music: hasP('item', 'music'),
  warmShirt: hasP('shirt', 'warm'),
  round: hasP('item', 'round'),
  // 01 §2 examples (adapted)
  redItem: hasP('item', 'color', 'red'),
  over40: cmp('age', undefined, '>', 40),
  evenAge: hasP('age', 'even'),
  name3: cmp('name', 'len', '=', 3),
  vowelStart: hasP('name', 'startsVowel'),
  fourLegs: cmp('pet', 'legs', '=', 4),
  noFood: not(hasP('item', 'food')),
  foodAndHappy: and(hasP('item', 'food'), hasP('mood', 'happy')),
  crownOrTop: or(is('hat', 'crown'), is('hat', 'top')),
  shirtMatchesItem: { op: 'same', a: ['shirt', 'color'], b: ['item', 'color'] },
  over30AndPet: and(cmp('age', undefined, '>', 30), hasP('pet', 'any')),
  vowelEndOrCap: or(hasP('name', 'endsVowel'), is('hat', 'cap')),
  coolNoHat: and(hasP('shirt', 'cool'), is('hat', 'none')),
  nameLenIsAgeDigit: { op: 'same', a: ['name', 'len'], b: ['age', 'lastDigit'] },
  hatMatchesShirt: { op: 'same', a: ['hat', 'color'], b: ['shirt', 'color'] },
  foodXorHappy: xor(hasP('item', 'food'), hasP('mood', 'happy')),
  twoRed: { op: 'count', p: 'color', v: 'red', c: '>=', n: 2 },
  oneFancy: { op: 'count', p: 'fancy', c: '=', n: 1 },
  evenNotFourLegs: and(hasP('age', 'even'), not(cmp('pet', 'legs', '=', 4))),
  plantOrRoundAndWarm: and(or(hasP('item', 'plant'), hasP('item', 'round')), hasP('shirt', 'warm')),
  vowelBothEnds: and(hasP('name', 'startsVowel'), hasP('name', 'endsVowel')),
  nameLenNotLegs: { op: 'diff', a: ['name', 'len'], b: ['pet', 'legs'] },
  notBlueOrCap: not(or(is('shirt', 'blue'), is('hat', 'cap'))),
  shirtDiffPrev: { op: 'prev', inner: { op: 'diff', a: ['shirt', 'color'] } },
  sameHatPrev: { op: 'prev', inner: { op: 'same', a: ['hat'] } },
  olderThanPrev: { op: 'prev', inner: { op: 'cmp2', a: ['age'], c: '>' } },
  itemColorDiffPrevAndHappy: and({ op: 'prev', inner: { op: 'diff', a: ['item', 'color'] } }, hasP('mood', 'happy')),
  nameLaterThanPrev: { op: 'prev', inner: { op: 'cmp2', a: ['name', 'first'], c: '>' } },
  foodXorWarmAndPet: and(xor(hasP('item', 'food'), hasP('shirt', 'warm')), hasP('pet', 'any')),
  legsDiffPrevOrNoHat: or({ op: 'prev', inner: { op: 'diff', a: ['pet', 'legs'] } }, is('hat', 'none')),
  twoYellowAndUnder50: and({ op: 'count', p: 'color', v: 'yellow', c: '>=', n: 2 }, cmp('age', undefined, '<', 50)),
};
for (const [k, r] of Object.entries(RULES)) Object.defineProperty(r, 'id', { value: k, enumerable: false });

export { ENUM_IDS };
