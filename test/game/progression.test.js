import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultProgress, levelFor, dailyLevelFor, shiftsInClub, clubUnlocked, lockInfo, applyResult, applyDaily,
  useUnlockSkip, canUseUnlockSkip, starsInClub, nextShift, resumePoint, nextBreakAllowed, dailyNo, currentStreak,
  normalizeProgress, playedDaily, DAILY_RESULTS_KEEP, startedDaily, markDailyStarted, dailyPreviewLevel, DAILY_EPOCH,
} from '../../src/game/progression.js';
import { DAILY_EPOCH as ENGINE_EPOCH } from '../../src/engine/daily.js';
import { LEVELS } from '../../src/data/levels.js';
import { encodeGuest } from '../../src/engine/traits.js';
import { fixtureLevel } from './helpers.js';

function fakeLevels() {
  const L = fixtureLevel();
  const enc = { ...L, guests: L.guests.map(encodeGuest) };
  const club = (n) => Array.from({ length: 10 }, (_, i) => ({ ...enc, id: `c${n}s${i + 1}`, club: n }));
  return { clubs: { 1: club(1), 2: club(2), 3: club(3) }, daily: { '2026-11-01': { ...enc, id: 'daily-2026-11-01', club: 0 } } };
}

function withStars(p, club, starsArr) {
  starsArr.forEach((st, idx) => { p = applyResult(p, { club, idx, stars: st, outcome: 'cleared' }); });
  return p;
}

test('levelFor decodes encoded guests (fallback decoder) and handles missing', () => {
  const LV = fakeLevels();
  const l = levelFor(1, 0, LV);
  assert.deepEqual(l.guests, fixtureLevel().guests);
  assert.equal(l.id, 'c1s1');
  assert.equal(levelFor(1, 99, LV), null);
  assert.equal(levelFor(9, 0, LV), null);
  assert.equal(shiftsInClub(1, LV), 10);
  assert.equal(shiftsInClub(6, LV), 0);
  assert.equal(dailyLevelFor('2026-11-01', LV).club, 0);
  assert.equal(dailyLevelFor('2020-01-01', LV), null);
  // already-decoded levels pass through untouched
  const dec = { clubs: { 1: [fixtureLevel()] } };
  assert.deepEqual(levelFor(1, 0, dec), fixtureLevel());
});

test('club 1 always unlocked; club 2 needs shift 10 AND 15 stars', () => {
  let p = defaultProgress();
  assert.equal(clubUnlocked(p, 1), true);
  assert.equal(clubUnlocked(p, 2), false);
  p = withStars(p, 1, [3, 3, 3, 3, 3]); // 15 stars, shifts 1-5
  assert.equal(starsInClub(p, 1), 15);
  assert.equal(clubUnlocked(p, 2), false, 'shift 10 not cleared');
  assert.deepEqual(lockInfo(p, 2), { prev: 1, needShift10: true, needStars: false, have: 15, need: 15 });
  p = applyResult(p, { club: 1, idx: 9, stars: 1 });
  assert.equal(clubUnlocked(p, 2), true);
  assert.equal(lockInfo(p, 2), null);
  assert.equal(clubUnlocked(p, 3), false);
  assert.equal(clubUnlocked(p, 7), false);
});

test('shift 10 cleared but < 15 stars: locked; skip waives the star gate once', () => {
  let p = withStars(defaultProgress(), 1, [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
  assert.equal(starsInClub(p, 1), 10);
  assert.equal(clubUnlocked(p, 2), false);
  assert.equal(canUseUnlockSkip(p, 2), true);
  const before = p;
  p = useUnlockSkip(p, 2);
  assert.notEqual(p, before);
  assert.equal(before.clubs[2], undefined, 'input not mutated');
  assert.equal(clubUnlocked(p, 2), true);
  assert.equal(canUseUnlockSkip(p, 2), false);
  assert.equal(useUnlockSkip(p, 2), p, 'second skip is a no-op');
});

test('skip alone does not open a club whose previous shift 10 is uncleared', () => {
  let p = useUnlockSkip(defaultProgress(), 2);
  assert.equal(clubUnlocked(p, 2), false);
  assert.equal(canUseUnlockSkip(defaultProgress(), 2), false);
});

test('unlock chain: club 3 requires club 2 open', () => {
  let p = withStars(defaultProgress(), 2, Array(10).fill(3)); // club 2 maxed but club 2 never unlocked
  assert.equal(clubUnlocked(p, 3), false);
  p = withStars(p, 1, Array(10).fill(2));
  assert.equal(clubUnlocked(p, 2), true);
  assert.equal(clubUnlocked(p, 3), true);
});

test('applyResult keeps best stars, ignores losses for stars, counts stats, pure', () => {
  const p0 = defaultProgress();
  const p1 = applyResult(p0, { club: 1, idx: 0, stars: 2, outcome: 'cleared', correct: 5 });
  assert.deepEqual(p0, defaultProgress(), 'not mutated');
  assert.equal(p1.clubs[1].levels[0], 2);
  const p2 = applyResult(p1, { club: 1, idx: 0, stars: 1, outcome: 'cleared' });
  assert.equal(p2.clubs[1].levels[0], 2);
  const p3 = applyResult(p2, { club: 1, idx: 1, stars: 0, outcome: 'fired' });
  assert.equal(p3.clubs[1].levels[1], undefined);
  assert.equal(p3.stats.rounds, 3);
  assert.equal(p3.stats.fired, 1);
  assert.equal(p3.stats.cleared, 2);
  assert.equal(p3.stats.correct, 5);
  assert.equal(nextShift(p3, 1, fakeLevels()), 1);
});

test('resumePoint: highest unlocked club with levels, first uncleared shift', () => {
  const LV = fakeLevels();
  assert.deepEqual(resumePoint(defaultProgress(), LV), { club: 1, idx: 0 });
  let p = withStars(defaultProgress(), 1, Array(10).fill(3));
  assert.deepEqual(resumePoint(p, LV), { club: 2, idx: 0 });
});

test('nextBreakAllowed: never before shift 3 of club 1', () => {
  assert.equal(nextBreakAllowed(1), false);
  assert.equal(nextBreakAllowed(2), false);
  assert.equal(nextBreakAllowed(3), true);
  assert.equal(nextBreakAllowed(1, 2), true);
});

test('dailyNo: 2026-11-01 is #1', () => {
  assert.equal(dailyNo('2026-11-01'), 1);
  assert.equal(dailyNo('2026-11-02'), 2);
  assert.equal(dailyNo('2027-11-01'), 366);
});

test('daily streak: consecutive days, missed day resets, replay no double count', () => {
  let p = applyDaily(defaultProgress(), '2026-11-01', 9);
  assert.equal(p.daily.streak, 1);
  assert.equal(p.daily.last, '2026-11-01');
  p = applyDaily(p, '2026-11-02', 10, { named: true });
  assert.equal(p.daily.streak, 2);
  assert.deepEqual(p.daily.results['2026-11-02'], { score: 10, max: 12, named: true });
  const same = applyDaily(p, '2026-11-02', 12);
  assert.equal(same, p, 'same-day replay is a no-op');
  p = applyDaily(p, '2026-11-03', 5);
  assert.equal(p.daily.streak, 3);
  assert.equal(p.daily.best, 3);
  p = applyDaily(p, '2026-11-05', 5); // missed the 4th
  assert.equal(p.daily.streak, 1);
  assert.equal(p.daily.best, 3);
  assert.equal(playedDaily(p, '2026-11-04'), false);
  assert.equal(playedDaily(p, '2026-11-05'), true);
});

test('daily streak across month/year boundaries (UTC days)', () => {
  let p = applyDaily(defaultProgress(), '2026-11-30', 1);
  p = applyDaily(p, '2026-12-01', 1);
  p = applyDaily(p, '2026-12-31', 1);
  assert.equal(p.daily.streak, 1);
  p = applyDaily(p, '2027-01-01', 1);
  assert.equal(p.daily.streak, 2);
});

test('currentStreak shows 0 once a day is missed', () => {
  let p = applyDaily(defaultProgress(), '2026-11-01', 1);
  p = applyDaily(p, '2026-11-02', 1);
  assert.equal(currentStreak(p, '2026-11-02'), 2);
  assert.equal(currentStreak(p, '2026-11-03'), 2);
  assert.equal(currentStreak(p, '2026-11-04'), 0);
  assert.equal(currentStreak(defaultProgress(), '2026-11-04'), 0);
});

test('daily results pruned to the last 60', () => {
  let p = defaultProgress();
  const start = Date.UTC(2026, 10, 1);
  for (let d = 0; d < 70; d++) p = applyDaily(p, new Date(start + d * 86400000).toISOString().slice(0, 10), 1);
  assert.equal(Object.keys(p.daily.results).length, DAILY_RESULTS_KEEP);
  assert.equal(p.daily.streak, 70);
  assert.ok(!p.daily.results['2026-11-01']);
});

test('normalizeProgress fills missing fields', () => {
  const p = normalizeProgress({ v: 1, clubs: { 1: { levels: { 0: 3 } } } });
  assert.equal(p.clubs[1].skip, false);
  assert.equal(p.daily.streak, 0);
  assert.equal(p.stats.rounds, 0);
  assert.deepEqual(normalizeProgress(null), defaultProgress());
});

test('DAILY_EPOCH comes from the engine', () => {
  assert.equal(DAILY_EPOCH, ENGINE_EPOCH);
  assert.equal(DAILY_EPOCH, '2026-11-01');
});

test('dailyLevelFor wraps beyond the baked range; null before the epoch', () => {
  const LV = fakeLevels();
  assert.equal(dailyLevelFor('2026-10-31', LV), null);
  const far = dailyLevelFor('2031-06-15', LV);
  assert.ok(far && Array.isArray(far.guests) && typeof far.guests[0] === 'object');
});

test('preview level is decoded and is not any real daily', () => {
  const pv = dailyPreviewLevel(LEVELS);
  if (!pv) return; // table without a preview: nothing to check
  assert.equal(typeof pv.guests[0], 'object');
  const ids = new Set(Object.keys(LEVELS.daily || {}).map((k) => `daily-${k}`));
  assert.equal(ids.has(pv.id), false);
});

test('daily started flag: begun once, any replay is practice', () => {
  let p = defaultProgress();
  assert.equal(startedDaily(p, '2026-11-03'), false);
  p = markDailyStarted(p, '2026-11-03');
  assert.equal(startedDaily(p, '2026-11-03'), true);
  assert.equal(startedDaily(p, '2026-11-04'), false);
  assert.equal(markDailyStarted(p, '2026-11-03'), p, 'idempotent');
  assert.equal(playedDaily(p, '2026-11-03'), false, 'started is not played');
  // a finished day counts as started even without the flag (old saves)
  const q = applyDaily(defaultProgress(), '2026-11-05', 7, { share: 'Door Policy #5' });
  assert.equal(startedDaily(q, '2026-11-05'), true);
  assert.equal(q.daily.results['2026-11-05'].share, 'Door Policy #5');
  // survives normalize
  assert.equal(normalizeProgress(JSON.parse(JSON.stringify(p))).daily.started['2026-11-03'], true);
  assert.deepEqual(normalizeProgress({ v: 1, daily: { last: null } }).daily.started, {});
});
