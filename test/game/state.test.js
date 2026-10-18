import test from 'node:test';
import assert from 'node:assert/strict';
import { createRound, step, currentGuest, logColumns, shareText, nearMiss, computeStars, guestsLeft } from '../../src/game/state.js';
import { fixtureLevel, makeLevel, deepFreeze } from './helpers.js';

// run a sequence of actions; freezes every intermediate state to catch mutation
function run(s, actions) {
  for (const a of actions) s = step(deepFreeze(s), a);
  return s;
}
const demo = { type: 'advanceDemo' };
const V = (admit) => ({ type: 'verdict', admit });
// correct verdict for current guest
const right = (s) => V(s.level.labels[s.idx]);
const wrong = (s) => V(!s.level.labels[s.idx]);
function play(s, pattern) {
  for (const ch of pattern) s = step(deepFreeze(s), ch === 'o' ? right(s) : wrong(s));
  return s;
}

test('createRound: initial shape matches the fixture contract', () => {
  const L = fixtureLevel();
  const s = createRound(L, { mode: 'shift' });
  assert.equal(s.phase, 'demo');
  assert.equal(s.idx, 0);
  for (const k of ['strikes', 'streak', 'correct', 'lenientUsed', 'hintsUsed', 'stars']) assert.equal(s[k], 0);
  assert.deepEqual(s.history, []);
  assert.equal(s.revived, false);
  assert.equal(s.outcome, null);
  assert.equal(s.guessedRight, null);
  assert.equal(s.mode, 'shift');
  assert.equal(createRound({ ...L, demoCount: 0 }).phase, 'play');
});

test('demo phase advances to play after demoCount guests; verdicts ignored in demo', () => {
  const L = fixtureLevel();
  let s = createRound(L);
  assert.equal(step(s, V(true)), s);
  s = run(s, [demo]);
  assert.equal(s.phase, 'demo');
  assert.equal(s.idx, 1);
  assert.deepEqual(logColumns(s), { in: [0], out: [] });
  s = run(s, [demo]);
  assert.equal(s.phase, 'play');
  assert.equal(s.idx, 2);
  assert.deepEqual(currentGuest(s), L.guests[2]);
  assert.equal(step(s, demo), s, 'advanceDemo is a no-op in play');
  assert.deepEqual(logColumns(s), { in: [0], out: [1] });
});

test('fixture: matches roundstate.sample.json after one correct call', () => {
  let s = run(createRound(fixtureLevel()), [demo, demo, V(true)]);
  assert.equal(s.phase, 'play');
  assert.equal(s.idx, 3);
  assert.equal(s.streak, 1);
  assert.equal(s.correct, 1);
  assert.deepEqual(s.history, [{ i: 2, call: true, ok: true }]);
});

test('fixture: win by streak (3 in a row) -> guess -> result with stars', () => {
  let s = run(createRound(fixtureLevel()), [demo, demo, V(true), V(false), V(true)]);
  assert.equal(s.phase, 'guess');
  assert.equal(s.outcome, 'cleared');
  assert.equal(s.guessFrom, 'end');
  const named = step(s, { type: 'guess', idx: 0 });
  assert.equal(named.phase, 'result');
  assert.equal(named.guessedRight, true);
  assert.equal(named.stars, 3);
  const miss = step(s, { type: 'guess', idx: 2 });
  assert.equal(miss.guessedRight, false);
  assert.equal(miss.stars, 2);
  const skip = step(s, { type: 'skipGuess' });
  assert.equal(skip.phase, 'result');
  assert.equal(skip.guessedRight, null);
  assert.equal(skip.stars, 2);
  assert.deepEqual(logColumns(skip), { in: [0, 2, 4], out: [1, 3] });
});

test('win by total (not in a row)', () => {
  const L = makeLevel({ labels: [true, false, ...Array(10).fill(true)], win: { inRow: 5, total: 6 } });
  let s = run(createRound(L), [demo, demo]);
  s = play(s, 'ooxooxoo');
  assert.equal(s.correct, 6);
  assert.equal(s.strikes, 2);
  assert.equal(s.phase, 'guess');
  assert.equal(s.outcome, 'cleared');
  s = step(s, { type: 'guess', idx: 0 });
  assert.equal(s.stars, 2, 'clear + named, but 2 strikes');
});

test('win by streak in default shape (5 in a row)', () => {
  const L = makeLevel({ labels: [true, false, ...Array(12).fill(false)] });
  let s = run(createRound(L), [demo, demo]);
  s = play(s, 'xooooo');
  assert.equal(s.outcome, 'cleared');
  assert.equal(s.streak, 5);
  assert.equal(s.bestStreak, 5);
});

test('gotIt: correct guess clears instantly with named star', () => {
  let s = run(createRound(fixtureLevel()), [demo, demo]);
  s = run(s, [{ type: 'gotIt' }]);
  assert.equal(s.phase, 'guess');
  assert.equal(s.guessFrom, 'gotIt');
  s = run(s, [{ type: 'guess', idx: 0 }]);
  assert.equal(s.phase, 'result');
  assert.equal(s.outcome, 'cleared');
  assert.equal(s.guessedRight, true);
  assert.equal(s.stars, 3);
});

test('gotIt works during demo too and is a commitment: skipGuess cannot cancel it', () => {
  let s = run(createRound(fixtureLevel()), [{ type: 'gotIt' }]);
  assert.equal(s.phase, 'guess');
  assert.equal(step(s, { type: 'skipGuess' }), s, 'no Back from a gotIt guess');
  // the unseen demo guests stay out of the log while the guess is open
  assert.deepEqual(logColumns(s), { in: [], out: [] });
  s = run(s, [{ type: 'guess', idx: 2 }]);
  assert.equal(s.phase, 'demo', 'a wrong pick returns to the demo');
  assert.equal(s.strikes, 1);
});

test('end-of-shift guess can still be skipped', () => {
  let s = run(createRound(fixtureLevel()), [demo, demo]);
  s = play(s, 'ooo');
  assert.equal(s.phase, 'guess');
  assert.equal(s.guessFrom, 'end');
  s = step(s, { type: 'skipGuess' });
  assert.equal(s.phase, 'result');
  assert.equal(s.outcome, 'cleared');
});

test('gotIt: wrong guess = strike, back to play, same guest', () => {
  let s = run(createRound(fixtureLevel()), [demo, demo, V(true), { type: 'gotIt' }]);
  s = run(s, [{ type: 'guess', idx: 1 }]);
  assert.equal(s.phase, 'play');
  assert.equal(s.strikes, 1);
  assert.equal(s.idx, 3);
  assert.equal(s.streak, 1, 'a guess is not a judged call; streak is kept');
  assert.deepEqual(s.wrongGuesses, [1]);
  assert.equal(s.guessedRight, null);
});

test('gotIt: wrong guess as 3rd strike fires', () => {
  let s = run(createRound(makeLevel({ labels: [true, false, ...Array(12).fill(true)] })), [demo, demo]);
  s = play(s, 'xx');
  s = run(s, [{ type: 'gotIt' }, { type: 'guess', idx: 3 }]);
  assert.equal(s.phase, 'result');
  assert.equal(s.outcome, 'fired');
  assert.equal(s.stars, 0);
});

test('invalid guess idx is ignored; guess outside guess phase ignored', () => {
  let s = run(createRound(fixtureLevel()), [demo, demo]);
  assert.equal(step(s, { type: 'guess', idx: 0 }), s);
  s = step(s, { type: 'gotIt' });
  assert.equal(step(s, { type: 'guess', idx: 9 }), s);
  assert.equal(step(s, { type: 'guess', idx: -1 }), s);
});

test('3 strikes = fired; idx stays on the guest; nearMiss info', () => {
  const L = makeLevel({ labels: [true, false, ...Array(12).fill(true)] });
  let s = run(createRound(L), [demo, demo]);
  s = play(s, 'oooxoxx');
  assert.equal(s.phase, 'result');
  assert.equal(s.outcome, 'fired');
  assert.equal(s.strikes, 3);
  assert.equal(s.idx, 8, 'fired on guest 8, not advanced');
  assert.equal(s.stars, 0);
  assert.equal(step(s, V(true)), s, 'no verdicts after result');
  const nm = nearMiss(s);
  assert.equal(nm.bestStreak, 3);
  assert.equal(nm.correct, 4);
  assert.equal(nm.needInRow, 2);
  assert.equal(nm.needTotal, 4);
  assert.equal(nm.toWin, 2);
  assert.deepEqual(nm.target, L.target);
});

test('revive: once, strikes -> 2, back to play on the same guest', () => {
  const L = makeLevel({ labels: [true, false, ...Array(12).fill(true)] });
  let s = run(createRound(L), [demo, demo]);
  s = play(s, 'oxxx');
  const firedIdx = s.idx;
  assert.equal(s.outcome, 'fired');
  s = run(s, [{ type: 'revive' }]);
  assert.equal(s.phase, 'play');
  assert.equal(s.outcome, null);
  assert.equal(s.strikes, 2);
  assert.equal(s.streak, 0);
  assert.equal(s.revived, true);
  assert.equal(s.idx, firedIdx);
  // the re-shown guest is NOT in the log (that would leak its label) and its
  // fatal verdict is dropped from the history / share grid
  const cols = logColumns(s);
  assert.equal([...cols.in, ...cols.out].includes(firedIdx), false);
  assert.equal(s.history.some((h) => h.i === firedIdx), false);
  assert.equal(s.last.type, 'revived');
  s = play(s, 'x');
  assert.equal(s.outcome, 'fired');
  assert.equal(step(s, { type: 'revive' }), s, 'second revive refused');
});

test('revive after being fired during the demo returns to the demo', () => {
  const L = makeLevel({ demoCount: 4, labels: [true, false, true, false, ...Array(10).fill(true)] });
  // A wrong 💡 locks 💡 until more guests are judged, so start from 2 strikes.
  let s = { ...createRound(L), strikes: 2 };
  s = run(s, [{ type: 'gotIt' }, { type: 'guess', idx: 1 }]);
  assert.equal(s.outcome, 'fired');
  assert.equal(s.idx, 0);
  s = step(s, { type: 'revive' });
  assert.equal(s.phase, 'demo');
  assert.equal(s.strikes, 2);
  assert.deepEqual(logColumns(s), { in: [], out: [] });
  s = run(s, [demo, demo, demo, demo]);
  assert.equal(s.phase, 'play');
});

test('revive refused unless fired', () => {
  let s = run(createRound(fixtureLevel()), [demo, demo]);
  assert.equal(step(s, { type: 'revive' }), s);
  s = play(s, 'ooo');
  s = step(s, { type: 'skipGuess' });
  assert.equal(step(s, { type: 'revive' }), s);
});

test('queue exhausted without a win -> out (loss, no stars)', () => {
  const L = makeLevel({ labels: [true, false, true, false, true, false], win: { inRow: 5, total: 8 } });
  let s = run(createRound(L), [demo, demo]);
  s = play(s, 'oxoo');
  assert.equal(s.phase, 'result');
  assert.equal(s.outcome, 'out');
  assert.equal(s.stars, 0);
  assert.equal(currentGuest(s), null);
  assert.equal(guestsLeft(s), 0);
});

test('lenient: forgiven wrong call = no strike, streak reset, not counted, max 2', () => {
  const labels = [true, false, ...Array(10).fill(true)];
  const lenient = { 2: { reject: true }, 3: { reject: true }, 4: { reject: true }, 5: { admit: true } };
  const L = makeLevel({ labels, lenient });
  let s = run(createRound(L), [demo, demo]);
  s = run(s, [V(false)]); // guest 2, forgiven
  assert.equal(s.strikes, 0);
  assert.equal(s.lenientUsed, 1);
  assert.equal(s.correct, 0);
  assert.equal(s.streak, 0);
  assert.deepEqual(s.history[0], { i: 2, call: false, ok: false, lenient: true });
  assert.equal(s.last.type, 'lenient');
  s = run(s, [V(false)]); // guest 3, forgiven (2nd)
  assert.equal(s.lenientUsed, 2);
  assert.equal(s.strikes, 0);
  s = run(s, [V(false)]); // guest 4, cap reached -> strike
  assert.equal(s.lenientUsed, 2);
  assert.equal(s.strikes, 1);
  assert.equal(s.history[2].lenient, undefined);
});

test('lenient only for the matching call direction', () => {
  const L = makeLevel({ labels: [true, false, true, true], lenient: { 2: { admit: true } } });
  let s = run(createRound(L), [demo, demo, V(false)]);
  assert.equal(s.strikes, 1, 'reject is not forgiven when only admit is lenient');
});

test('lenient: correct call with streak >0 then lenient resets streak', () => {
  const L = makeLevel({ labels: [true, false, true, true, true], lenient: { 3: { reject: true } } });
  let s = run(createRound(L), [demo, demo, V(true)]);
  assert.equal(s.streak, 1);
  s = step(s, V(false));
  assert.equal(s.streak, 0);
  assert.equal(s.strikes, 0);
});

test('special guests are never lenient', () => {
  const L = makeLevel({ labels: [true, false, true, true], lenient: { 2: { reject: true } }, special: { 2: 'boss' } });
  const s = run(createRound(L), [demo, demo, V(false)]);
  assert.equal(s.strikes, 1);
  assert.equal(s.lenientUsed, 0);
});

test('stars: clear + <=1 strike + named', () => {
  assert.equal(computeStars({ outcome: 'cleared', strikes: 0, guessedRight: true }), 3);
  assert.equal(computeStars({ outcome: 'cleared', strikes: 1, guessedRight: null }), 2);
  assert.equal(computeStars({ outcome: 'cleared', strikes: 2, guessedRight: false }), 1);
  assert.equal(computeStars({ outcome: 'fired', strikes: 3, guessedRight: true }), 0);
  assert.equal(computeStars({ outcome: 'out', strikes: 0, guessedRight: null }), 0);
});

test('hints: 0 -> 1 -> 2, capped; not in daily', () => {
  let s = run(createRound(fixtureLevel()), [demo, demo]);
  s = run(s, [{ type: 'hint' }]);
  assert.equal(s.hintsUsed, 1);
  s = run(s, [{ type: 'hint' }]);
  assert.equal(s.hintsUsed, 2);
  assert.equal(step(s, { type: 'hint' }), s);
  const d = run(createRound(fixtureLevel(), { mode: 'daily' }), [demo, demo]);
  assert.equal(step(d, { type: 'hint' }), d);
});

test('daily: never fired, goes through all guests, then guess, score = correct', () => {
  const labels = [true, false, ...Array(12).fill(true)];
  const L = makeLevel({ labels, lenient: { 2: { reject: true } } });
  let s = run(createRound(L, { mode: 'daily' }), [demo, demo]);
  assert.equal(step(s, { type: 'gotIt' }), s, 'no early gotIt in daily');
  s = play(s, 'xxxxoooooooo');
  assert.equal(s.strikes, 4, 'strikes pile up; never fired; no lenient in daily');
  assert.equal(s.phase, 'guess');
  assert.equal(s.guessFrom, 'end');
  assert.equal(s.correct, 8);
  assert.equal(s.history.length, 12);
  const r = step(s, { type: 'guess', idx: 0 });
  assert.equal(r.phase, 'result');
  assert.equal(r.guessedRight, true);
  assert.equal(r.outcome, 'cleared');
  assert.equal(step(r, { type: 'revive' }), r);
  // no early win in daily even with a long streak
  let d2 = run(createRound(L, { mode: 'daily' }), [demo, demo]);
  d2 = play(d2, 'oooooooooo');
  assert.equal(d2.phase, 'play');
});

test('daily share text: header, grid, brain, streak, no URL', () => {
  const L = makeLevel({ labels: [true, false, ...Array(12).fill(true)] });
  let s = run(createRound(L, { mode: 'daily' }), [demo, demo]);
  s = play(s, 'ooxoooooooox');
  s = step(s, { type: 'guess', idx: 0 });
  const txt = shareText(s, 214, { streak: 5 });
  const lines = txt.split('\n');
  assert.equal(lines[0], 'Door Policy #214 🚪 10/12');
  assert.equal(lines[1], '✅✅❌✅✅✅');
  assert.equal(lines[2], '✅✅✅✅✅❌');
  assert.match(lines[3], /🧠/);
  assert.match(lines[3], /🔥5/);
  assert.doesNotMatch(txt, /https?:|www\./);
  const noBrain = shareText(step(step(s, { type: 'revive' }), { type: 'skipGuess' }), 1);
  assert.ok(noBrain.startsWith('Door Policy #1 '));
});

test('share text says which guest the rule was named at after an early gotIt', () => {
  let s = run(createRound(fixtureLevel()), [demo, demo, V(true)]);
  s = run(s, [{ type: 'gotIt' }, { type: 'guess', idx: 0 }]);
  assert.equal(s.namedAt, 4);
  assert.match(shareText(s), /🧠 named at guest #4/);
});

test('share text without brain when rule not named', () => {
  const L = makeLevel({ labels: [true, false, true, true] });
  let s = run(createRound(L, { mode: 'daily' }), [demo, demo]);
  s = play(s, 'ox');
  s = step(s, { type: 'skipGuess' });
  assert.equal(shareText(s, 3), 'Door Policy #3 🚪 1/2\n✅❌');
});

test('unknown actions and null action return the same state', () => {
  const s = createRound(fixtureLevel());
  assert.equal(step(s, { type: 'nope' }), s);
  assert.equal(step(s, null), s);
});

test('wrong 💡 pick forfeits the named star and locks 💡 for 3 judged guests', async () => {
  const { createRound, step, canGotIt, GOTIT_LOCK } = await import('../../src/game/state.js');
  const { readFileSync } = await import('node:fs');
  const level = JSON.parse(readFileSync(new URL('../fixtures/level.sample.json', import.meta.url)));
  let s = createRound(level, { mode: 'shift' });
  while (s.phase === 'demo') s = step(s, { type: 'advanceDemo' });
  s = step(s, { type: 'gotIt' });
  const wrong = (level.correctIdx + 1) % level.choices.length;
  s = step(s, { type: 'guess', idx: wrong });
  assert.equal(s.strikes, 1);
  assert.equal(canGotIt(s), false);
  assert.equal(step(s, { type: 'gotIt' }).phase, s.phase, 'gotIt ignored while locked');
  assert.equal(GOTIT_LOCK, 3);
  // Judge the remaining guests correctly; the fixture wins at 3 in a row.
  while (s.phase === 'play') s = step(s, { type: 'verdict', admit: level.labels[s.idx] });
  assert.equal(s.outcome, 'cleared');
  assert.ok(s.stars <= 2, 'named-rule star requires a first-try pick');
});
