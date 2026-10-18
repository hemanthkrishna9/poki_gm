import { readFileSync } from 'node:fs';

const FIX = new URL('../fixtures/level.sample.json', import.meta.url);

export function fixtureLevel() {
  return JSON.parse(readFileSync(FIX, 'utf8'));
}

const BASE = { hat: 'none', item: 'none', shirt: 'blue', pet: 'none', mood: 'grin', name: 'Ada', age: 30, quote: 0 };

/**
 * Synthetic level: `labels` covers demo + judged guests.
 * @param {{demoCount?:number, labels:boolean[], win?:{inRow:number,total:number}, lenient?:object, special?:object}} o
 */
export function makeLevel(o) {
  const labels = o.labels;
  const guests = labels.map((l, i) => ({ ...BASE, hat: l ? 'top' : 'none', age: 20 + i, ...(o.special?.[i] ? { special: o.special[i] } : {}) }));
  const lenient = labels.map((_, i) => ({ admit: false, reject: false, ...(o.lenient?.[i] || {}) }));
  return {
    id: 'test',
    club: 1,
    visible: ['hat', 'item', 'shirt', 'pet'],
    target: { op: 'is', t: 'hat', v: 'top' },
    guests,
    labels,
    demoCount: o.demoCount ?? 2,
    win: o.win ?? { inRow: 5, total: 8 },
    choices: [
      { op: 'is', t: 'hat', v: 'top' },
      { op: 'is', t: 'item', v: 'banana' },
      { op: 'is', t: 'pet', v: 'dog' },
      { op: 'is', t: 'shirt', v: 'blue' },
    ],
    correctIdx: 0,
    lenient,
    hintPair: [0, 1],
    ruleTraits: ['hat'],
  };
}

/** Deep-freeze so any mutation in the reducer throws in strict mode. */
export function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
}
