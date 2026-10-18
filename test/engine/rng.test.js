import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, createRng, hashString } from '../../src/engine/rng.js';
import { dateKey } from '../../src/engine/daily.js';

test('mulberry32(1) produces the known sequence', () => {
  const f = mulberry32(1);
  assert.deepEqual([f(), f(), f(), f()], [0.6270739405881613, 0.002735721180215478, 0.5274470399599522, 0.9810509674716741]);
});

test('hashString is FNV-1a', () => {
  assert.equal(hashString(''), 2166136261);
  assert.equal(hashString('door:2026-11-01'), 4255710808);
});

test('createRng: deterministic, int in range, shuffle copies, fork independent of consumption', () => {
  const a = createRng(42); const b = createRng(42);
  const xs = Array.from({ length: 50 }, () => a.next());
  assert.deepEqual(xs, Array.from({ length: 50 }, () => b.next()));
  const r = createRng('seed');
  for (let i = 0; i < 1000; i++) { const v = r.int(3, 7); assert.ok(v >= 3 && v <= 7 && Number.isInteger(v)); }
  const arr = [1, 2, 3, 4, 5];
  const sh = r.shuffle(arr);
  assert.deepEqual(arr, [1, 2, 3, 4, 5]);
  assert.deepEqual([...sh].sort(), [1, 2, 3, 4, 5]);
  const c = createRng(7); const d = createRng(7);
  c.next(); c.next();
  assert.equal(c.fork('deal').next(), d.fork('deal').next());
  assert.notEqual(c.fork('deal').next(), c.fork('decoys').next());
  assert.equal(createRng('abc').next(), createRng(hashString('abc')).next());
});

test('daily seed is stable within a UTC day and differs between days', () => {
  const seed = (d) => hashString(`door:${dateKey(d)}`);
  assert.equal(seed(new Date('2026-11-05T00:00:00Z')), seed(new Date('2026-11-05T23:59:59Z')));
  assert.notEqual(seed(new Date('2026-11-05T12:00:00Z')), seed(new Date('2026-11-06T12:00:00Z')));
});
