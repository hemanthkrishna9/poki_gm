// Compact level encoding for the baked src/data/levels.js. Pure and tiny on purpose:
// the runtime imports only this (plus traits.js), never the dealer / hypothesis engine.
import { TRAIT_IDS, isEnumTrait, propsOf, encodeGuest, decodeGuest } from './traits.js';

const INITIAL = { hat: 'h', item: 'i', shirt: 's', pet: 'p', mood: 'm', name: 'n', age: 'a' };
const FROM_INITIAL = Object.fromEntries(Object.entries(INITIAL).map(([k, v]) => [v, k]));

// Defaults omitted from the encoding (the Daily / procedural shape).
const DEF_VISIBLE = 'hispna';
const DEF_DEMO = 4;
const DEF_WIN = [5, 8];

/** Traits a rule references, in canonical order (same result as rules.js ruleTraits). */
function traitsOf(rule, visible) {
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

// ---- compact rule strings ---------------------------------------------------------
// is: h:top   has: i.food | i.color:red | i.food! (v=false)   cmp: a>45 | n.len>=5
// not: !X   and/or/xor: &(X,Y) |(X,Y) ^(X,Y)   same/diff: ~(s.color,i.color) #(...)
// count: +color:red>=1 | +happy>=2   prev: @~h @#s.color @>a (cmp2)
// Anything that does not round-trip exactly stays a plain JSON object.

const CMPS = ['<=', '>=', '!=', '<', '>', '='];

function ref(r) {
  return INITIAL[r[0]] + (r.length > 1 ? `.${r[1]}` : '');
}

function ruleStr(r) {
  switch (r.op) {
    case 'is': return `${INITIAL[r.t]}:${r.v}`;
    case 'has': return `${INITIAL[r.t]}.${r.p}${r.v === undefined ? '' : r.v === false ? '!' : `:${r.v}`}`;
    case 'cmp': return `${INITIAL[r.t]}${r.p === undefined ? '' : `.${r.p}`}${r.c}${r.n}`;
    case 'not': return `!${ruleStr(r.arg)}`;
    case 'and': case 'or': case 'xor':
      return `${{ and: '&', or: '|', xor: '^' }[r.op]}(${r.args.map(ruleStr).join(',')})`;
    case 'same': case 'diff': return `${r.op === 'same' ? '~' : '#'}(${ref(r.a)},${ref(r.b)})`;
    case 'count': return `+${r.p}${r.v === undefined ? '' : `:${r.v}`}${r.c}${r.n}`;
    case 'prev': {
      const x = r.inner;
      const head = x.op === 'same' ? '~' : x.op === 'diff' ? '#' : x.c;
      return `@${head}${ref(x.a)}`;
    }
    default: throw new Error(`unknown op ${r.op}`);
  }
}

function parseRule(s) {
  let i = 0;
  const peek = () => s[i];
  const eat = (ch) => { if (s[i] !== ch) throw new Error(`rule: expected ${ch} at ${i} in ${s}`); i++; };
  const word = () => { const m = /^[A-Za-z0-9_]+/.exec(s.slice(i)); if (!m) throw new Error(`rule: word at ${i} in ${s}`); i += m[0].length; return m[0]; };
  const num = () => { const m = /^-?\d+/.exec(s.slice(i)); if (!m) throw new Error(`rule: number at ${i} in ${s}`); i += m[0].length; return +m[0]; };
  const cmpOp = () => { const c = CMPS.find((x) => s.startsWith(x, i)); if (!c) throw new Error(`rule: comparator at ${i} in ${s}`); i += c.length; return c; };
  const trait = () => { const t = FROM_INITIAL[s[i]]; if (!t) throw new Error(`rule: trait at ${i} in ${s}`); i++; return t; };
  const refP = () => { const t = trait(); if (peek() === '.') { i++; return [t, word()]; } return [t]; };
  function rule() {
    const c = peek();
    if (c === '&' || c === '|' || c === '^') {
      i++; eat('(');
      const args = [rule()];
      while (peek() === ',') { i++; args.push(rule()); }
      eat(')');
      return { op: { '&': 'and', '|': 'or', '^': 'xor' }[c], args };
    }
    if (c === '!') { i++; return { op: 'not', arg: rule() }; }
    if (c === '~' || c === '#') {
      i++; eat('(');
      const a = refP(); eat(','); const b = refP(); eat(')');
      return { op: c === '~' ? 'same' : 'diff', a, b };
    }
    if (c === '+') {
      i++;
      const out = { op: 'count', p: word() };
      if (peek() === ':') { i++; out.v = word(); }
      out.c = cmpOp(); out.n = num();
      return out;
    }
    if (c === '@') {
      i++;
      if (peek() === '~' || peek() === '#') { const op = peek() === '~' ? 'same' : 'diff'; i++; return { op: 'prev', inner: { op, a: refP() } }; }
      const cc = cmpOp();
      return { op: 'prev', inner: { op: 'cmp2', a: refP(), c: cc } };
    }
    const t = trait();
    if (peek() === ':') { i++; return { op: 'is', t, v: word() }; }
    let p;
    if (peek() === '.') { i++; p = word(); }
    const n = peek();
    if (n === '!' && s[i + 1] !== '=') { i++; return { op: 'has', t, p, v: false }; }
    if (n === ':') { i++; return { op: 'has', t, p, v: word() }; }
    if (n !== undefined && CMPS.some((x) => s.startsWith(x, i))) {
      const cc = cmpOp();
      const out = { op: 'cmp', t };
      if (p !== undefined) out.p = p;
      out.c = cc; out.n = num();
      return out;
    }
    return { op: 'has', t, p };
  }
  const r = rule();
  if (i !== s.length) throw new Error(`rule: trailing input at ${i} in ${s}`);
  return r;
}

/** Rule -> compact string, or the rule itself (deep copy) when it would not round-trip. */
export function encodeRule(r) {
  try {
    const s = ruleStr(r);
    if (JSON.stringify(parseRule(s)) === JSON.stringify(r)) return s;
  } catch { /* fall through */ }
  return JSON.parse(JSON.stringify(r));
}

/** Compact string (or plain rule object) -> Rule. */
export function decodeRule(e) {
  return typeof e === 'string' ? parseRule(e) : JSON.parse(JSON.stringify(e));
}

// ---- levels ----------------------------------------------------------------------

/**
 * Level -> compact JSON-able object. Bake-only data (palette, meta) is dropped; fields
 * equal to the Daily defaults (club 0, 6 visible traits, 4 demo, win 5/8) are omitted.
 */
export function encodeLevel(L) {
  const enc = { id: L.id };
  if (L.club) enc.c = L.club;
  const v = L.visible.map((t) => INITIAL[t]).join('');
  if (v !== DEF_VISIBLE) enc.v = v;
  enc.g = L.guests.map(encodeGuest).join('');
  enc.l = L.labels.map((x) => (x ? 1 : 0)).join('');
  if (L.demoCount !== DEF_DEMO) enc.d = L.demoCount;
  if (L.win.inRow !== DEF_WIN[0] || L.win.total !== DEF_WIN[1]) enc.w = [L.win.inRow, L.win.total];
  enc.ch = L.choices.map(encodeRule);
  enc.k = L.correctIdx;
  const n = L.lenient.map((x) => (x.admit ? 1 : 0) + (x.reject ? 2 : 0)).join('');
  if (/[^0]/.test(n)) enc.n = n;
  enc.h = [L.hintPair[0], L.hintPair[1]];
  const sp = L.guests.map((g, i) => (g.special ? [i, g.special] : null)).filter(Boolean);
  if (sp.length) enc.s = sp;
  if (L.intro) enc.i = L.intro;
  return enc;
}

/**
 * Compact object -> Level (Guest objects restored, ruleTraits derived). Also accepts a
 * full-shape Level whose guests are objects or 8-char strings (returns a copy).
 * @param {object} E
 * @returns {object|null}
 */
export function decodeLevel(E) {
  if (!E) return null;
  const dec = (g) => (typeof g === 'string' ? decodeGuest(g) : { ...g });
  if (E.ch === undefined) return { ...E, guests: E.guests.map(dec) };
  const visible = [...(E.v ?? DEF_VISIBLE)].map((c) => FROM_INITIAL[c]);
  const gs = E.g ?? E.guests;
  const guests = typeof gs === 'string' ? Array.from({ length: gs.length / 8 }, (_, i) => decodeGuest(gs.slice(8 * i, 8 * i + 8))) : gs.map(dec);
  for (const [i, kind] of E.s || []) guests[i].special = kind;
  const choices = E.ch.map(decodeRule);
  const w = E.w ?? DEF_WIN;
  const n = E.n ?? '0'.repeat(guests.length);
  const L = {
    id: E.id,
    club: E.c ?? 0,
    visible,
    target: choices[E.k],
    guests,
    labels: [...E.l].map((c) => c === '1'),
    demoCount: E.d ?? DEF_DEMO,
    win: { inRow: w[0], total: w[1] },
    choices,
    correctIdx: E.k,
    lenient: [...n].map((c) => ({ admit: (+c & 1) === 1, reject: (+c & 2) === 2 })),
    hintPair: [E.h[0], E.h[1]],
    ruleTraits: traitsOf(choices[E.k], visible),
  };
  if (E.i) L.intro = E.i;
  return L;
}

