import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dateKey, dailyNumber, dailyLevel, previewLevel, DAILY_EPOCH, DAILY_EPOCH_MS } from '../../src/engine/daily.js';
import { decodeLevel } from '../../src/engine/codec.js';
import { LEVELS } from '../../src/data/levels.js';

test('dateKey is UTC', () => {
  assert.equal(dateKey(new Date('2026-11-01T23:30:00-05:00')), '2026-11-02');
  assert.equal(dateKey(new Date('2026-11-01T00:00:00Z')), '2026-11-01');
});

test('dailyNumber counts from 2026-11-01 = #1', () => {
  assert.equal(dailyNumber('2026-11-01'), 1);
  assert.equal(dailyNumber('2026-11-02'), 2);
  assert.equal(dailyNumber('2027-11-01'), 366);
  assert.equal(dailyNumber('2026-10-31'), 0);
});

test('dailyLevel returns the baked level, and wraps outside the baked range', () => {
  const L = dailyLevel('2026-11-05', LEVELS);
  assert.equal(L.id, 'daily-2026-11-05');
  assert.equal(L.club, 0);
  assert.equal(L.guests.length, 16);
  assert.equal(L.demoCount, 4);
  const early = dailyLevel('2026-10-18', LEVELS);
  assert.equal(early.id, 'daily-2026-10-18');
  const late = dailyLevel('2028-01-01', LEVELS);
  assert.ok(late && late.guests.length === 16);
  assert.deepEqual(dailyLevel('2028-01-01', LEVELS), late);
  assert.equal(dailyLevel('2026-11-05', {}), null);
});

test('DAILY_EPOCH is the launch date key', () => {
  assert.equal(DAILY_EPOCH, '2026-11-01');
  assert.equal(DAILY_EPOCH_MS, Date.UTC(2026, 10, 1));
  assert.equal(dailyNumber(DAILY_EPOCH), 1);
});

test('dailyLevel wraps deterministically beyond the baked range', () => {
  const keys = Object.keys(LEVELS.daily).sort();
  const n = keys.length;
  // day n+1 (first unbaked) wraps to the first baked day, with its own id
  const after = new Date(Date.UTC(2026, 10, 1) + n * 86400000).toISOString().slice(0, 10);
  const L = dailyLevel(after, LEVELS);
  assert.equal(L.id, `daily-${after}`);
  assert.deepEqual({ ...L, id: 'x' }, { ...decodeLevel(LEVELS.daily[keys[0]]), id: 'x' });
  assert.ok(Array.isArray(L.guests) && typeof L.guests[0] === 'object');
  // the day before launch wraps to the last baked day
  const before = dailyLevel('2026-10-31', LEVELS);
  assert.deepEqual({ ...before, id: 'x' }, { ...decodeLevel(LEVELS.daily[keys[n - 1]]), id: 'x' });
  // far future is stable and decoded
  assert.deepEqual(dailyLevel('2031-06-15', LEVELS), dailyLevel('2031-06-15', LEVELS));
  assert.equal(dailyLevel('2031-06-15', LEVELS).id, 'daily-2031-06-15');
  // decoding must not alias the baked table (mutating one result does not affect another)
  L.guests[0].hat = 'mutated';
  assert.notEqual(dailyLevel(after, LEVELS).guests[0].hat, 'mutated');
});

test('previewLevel returns a decoded sneak-peek level that is not a real daily', () => {
  const P = previewLevel(LEVELS);
  assert.equal(P.id, 'daily-preview');
  assert.equal(P.guests.length, 16);
  assert.equal(typeof P.guests[0], 'object');
  assert.ok(P.choices.length === 4 && P.target);
  for (const k of Object.keys(LEVELS.daily)) assert.notEqual(dailyLevel(k, LEVELS).id, P.id);
  assert.equal(previewLevel({}), null);
  assert.equal(previewLevel(null), null);
});
