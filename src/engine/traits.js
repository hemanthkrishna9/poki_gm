// Trait catalog: the ONLY source of guest traits, values, emoji and properties.
// Pure module: no DOM, no globals, no Math.random / Date.now.
//
// Emoji colors differ across platforms, so `color` is only set where the
// color is the same everywhere (fruit, flowers, balloon). Shirts are drawn
// by the UI as a palette-tinted SVG, so shirt colors are always exact.

/** Shared color palette (UI uses these hex values for shirts). */
export const COLORS = {
  red: '#E63946',
  orange: '#F4A261',
  yellow: '#F9D949',
  green: '#2A9D8F',
  blue: '#3A86FF',
  purple: '#8338EC',
  black: '#222222',
  white: '#F5F5F5',
};

const ENUM_TRAITS = {
  hat: {
    none: { e: '', tags: {} },
    top: { e: '🎩', tags: { fancy: true } },
    cap: { e: '🧢', tags: { sporty: true } },
    crown: { e: '👑', tags: { fancy: true, color: 'yellow' } },
    grad: { e: '🎓', tags: {} },
    bow: { e: '🎀', tags: { fancy: true } },
    straw: { e: '👒', tags: {} },
  },
  item: {
    none: { e: '', tags: {} },
    apple: { e: '🍎', tags: { food: true, round: true, color: 'red' } },
    banana: { e: '🍌', tags: { food: true, color: 'yellow' } },
    pizza: { e: '🍕', tags: { food: true } },
    cupcake: { e: '🧁', tags: { food: true, sweet: true } },
    donut: { e: '🍩', tags: { food: true, sweet: true, round: true } },
    broccoli: { e: '🥦', tags: { food: true, plant: true, color: 'green' } },
    rose: { e: '🌹', tags: { plant: true, color: 'red' } },
    sunflower: { e: '🌻', tags: { plant: true, round: true, color: 'yellow' } },
    guitar: { e: '🎸', tags: { music: true } },
    drum: { e: '🥁', tags: { music: true, round: true } },
    trumpet: { e: '🎺', tags: { music: true } },
    balloon: { e: '🎈', tags: { round: true, color: 'red' } },
    ball: { e: '⚽', tags: { round: true, sporty: true } },
    book: { e: '📚', tags: {} },
    umbrella: { e: '🌂', tags: {} },
    teddy: { e: '🧸', tags: { toy: true } },
  },
  shirt: {
    red: { e: '', tags: { color: 'red', warm: true } },
    orange: { e: '', tags: { color: 'orange', warm: true } },
    yellow: { e: '', tags: { color: 'yellow', warm: true } },
    green: { e: '', tags: { color: 'green', cool: true } },
    blue: { e: '', tags: { color: 'blue', cool: true } },
    purple: { e: '', tags: { color: 'purple', cool: true } },
    black: { e: '', tags: { color: 'black', neutral: true } },
    white: { e: '', tags: { color: 'white', neutral: true } },
  },
  pet: {
    none: { e: '', tags: { legs: 0 } },
    dog: { e: '🐶', tags: { legs: 4, fur: true } },
    cat: { e: '🐱', tags: { legs: 4, fur: true } },
    turtle: { e: '🐢', tags: { legs: 4, water: true } },
    fish: { e: '🐟', tags: { legs: 0, water: true } },
    bird: { e: '🐦', tags: { legs: 2, flies: true } },
    snake: { e: '🐍', tags: { legs: 0 } },
  },
  mood: {
    grin: { e: '😀', tags: { happy: true } },
    cool: { e: '😎', tags: { happy: true, glasses: true } },
    sad: { e: '😢', tags: { sad: true } },
    grumpy: { e: '😠', tags: { sad: true } },
    sleepy: { e: '😴', tags: {} },
    think: { e: '🤔', tags: {} },
  },
};

export const NAMES = [
  'Ada', 'Kai', 'Zoe', 'Leo', 'Raj', 'Mei', 'Ivo', 'Noa', 'Eli', 'Ola',
  'Yuki', 'Omar', 'Lena', 'Theo', 'Ines', 'Kofi', 'Nina', 'Arlo', 'Sven', 'Amir',
  'Priya', 'Mateo', 'Chloe', 'Aisha', 'Bruno', 'Freya', 'Kenji', 'Lucia', 'Tomas', 'Zaria',
  'Ingrid', 'Rafael', 'Soraya', 'Dmitri', 'Amelie',
  'Leilani', 'Matilda', 'Gustavo',
  'Fernanda', 'Cornelia',
];

export const AGE_MIN = 18;
export const AGE_MAX = 79;
export const QUOTE_COUNT = 60;

/** Trait ids in canonical order. */
export const TRAIT_IDS = ['hat', 'item', 'shirt', 'pet', 'mood', 'name', 'age'];

/** Value ids per enum trait, in canonical (stable, encoding) order. */
export const VALUES = Object.fromEntries(
  Object.entries(ENUM_TRAITS).map(([t, vals]) => [t, Object.keys(vals)]),
);

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

export function isEnumTrait(trait) {
  return trait in ENUM_TRAITS;
}

/** Emoji for an enum trait value ('' for none / shirts). */
export function emojiOf(trait, valueId) {
  return ENUM_TRAITS[trait]?.[valueId]?.e ?? '';
}

/**
 * Read a property of a guest's trait.
 * - p omitted / 'id': the raw value (id string, name string, or age number)
 * - 'any': value is not 'none' (enum traits)
 * - enum tags: boolean tags default to false; 'color' defaults to null; 'legs' is a number
 * - name: 'len' | 'first' | 'last' | 'startsVowel' | 'endsVowel'
 * - age: 'even' | 'decade' | 'lastDigit'
 */
export function prop(guest, trait, p) {
  const v = guest[trait];
  if (p === undefined || p === 'id') return v;
  if (trait === 'name') {
    const up = v.toUpperCase();
    switch (p) {
      case 'len': return v.length;
      case 'first': return up[0];
      case 'last': return up[up.length - 1];
      case 'startsVowel': return VOWELS.has(up[0]);
      case 'endsVowel': return VOWELS.has(up[up.length - 1]);
      default: throw new Error(`unknown name prop ${p}`);
    }
  }
  if (trait === 'age') {
    switch (p) {
      case 'even': return v % 2 === 0;
      case 'decade': return Math.floor(v / 10);
      case 'lastDigit': return v % 10;
      default: throw new Error(`unknown age prop ${p}`);
    }
  }
  const def = ENUM_TRAITS[trait]?.[v];
  if (!def) throw new Error(`unknown value ${trait}=${v}`);
  if (p === 'any') return v !== 'none';
  const tag = def.tags[p];
  if (tag !== undefined) return tag;
  return p === 'color' ? null : false;
}

/** All property names usable in rules for a trait. */
export function propsOf(trait) {
  if (trait === 'name') return ['len', 'first', 'last', 'startsVowel', 'endsVowel'];
  if (trait === 'age') return ['even', 'decade', 'lastDigit'];
  const set = new Set(['any']);
  for (const def of Object.values(ENUM_TRAITS[trait])) Object.keys(def.tags).forEach((k) => set.add(k));
  if (trait === 'shirt') set.delete('any');
  return [...set];
}

/**
 * Random guest. Traits not in `visible` still get values (cards just don't show them).
 * @param {{next():number,int(lo:number,hi:number):number,pick<T>(a:T[]):T}} rng
 */
export function randomGuest(rng) {
  const g = {};
  for (const t of Object.keys(ENUM_TRAITS)) g[t] = rng.pick(VALUES[t]);
  g.name = rng.pick(NAMES);
  g.age = rng.int(AGE_MIN, AGE_MAX);
  g.quote = rng.int(0, QUOTE_COUNT - 1);
  return g;
}

// ---- compact encoding for baked data -------------------------------------
// Guest -> 8 chars of base62: hat,item,shirt,pet,mood,name,age-AGE_MIN,quote.
// All value counts are <= 62 (40 names, ages 0..61, 60 quotes).
const B62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const ENC_ENUMS = ['hat', 'item', 'shirt', 'pet', 'mood'];

export function encodeGuest(g) {
  const idx = [...ENC_ENUMS.map((t) => VALUES[t].indexOf(g[t])), NAMES.indexOf(g.name), g.age - AGE_MIN, g.quote];
  if (idx.some((i) => !(i >= 0 && i < 62))) throw new Error('unencodable guest');
  return idx.map((i) => B62[i]).join('');
}

export function decodeGuest(s) {
  const n = [...s].map((c) => B62.indexOf(c));
  const g = {};
  ENC_ENUMS.forEach((t, i) => { g[t] = VALUES[t][n[i]]; });
  g.name = NAMES[n[5]];
  g.age = AGE_MIN + n[6];
  g.quote = n[7];
  return g;
}
