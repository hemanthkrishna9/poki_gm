// Seeded PRNG (mulberry32) and string hashing (FNV-1a). Pure, deterministic.

/** FNV-1a 32-bit hash of a string (unsigned). */
export function hashString(s) {
  let h = 2166136261 >>> 0;
  const str = String(s);
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Raw mulberry32 generator returning floats in [0, 1). */
export function mulberry32(a) {
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {number|string} seed
 * @returns {{seed:number,next():number,int(lo:number,hi:number):number,pick<T>(a:T[]):T,shuffle<T>(a:T[]):T[],fork(label:string):any}}
 */
export function createRng(seed) {
  const base = (typeof seed === 'string' ? hashString(seed) : Number(seed)) >>> 0;
  const next = mulberry32(base);
  const rng = {
    seed: base,
    next,
    /** Integer in [lo, hi] inclusive. */
    int(lo, hi) {
      return lo + Math.floor(next() * (hi - lo + 1));
    },
    pick(a) {
      return a[Math.floor(next() * a.length)];
    },
    /** Fisher-Yates on a copy. */
    shuffle(a) {
      const c = a.slice();
      for (let i = c.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        const tmp = c[i]; c[i] = c[j]; c[j] = tmp;
      }
      return c;
    },
    /** Independent stream derived from the base seed (not from consumed state). */
    fork(label) {
      return createRng((base ^ hashString(label)) >>> 0);
    },
  };
  return rng;
}
