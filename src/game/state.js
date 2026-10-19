// Round reducer: pure, no DOM, never mutates its input.
// See docs/design/05-plan.md §2 (shift shape, lenient calls, stars, revive)
// and src/engine/types.js (RoundState).
//
// Phases: 'demo' -> 'play' -> ('guess') -> 'result'.
//
// Extra RoundState fields beyond types.js (all optional for readers):
//   mode         'shift' | 'daily'
//   bestStreak   highest streak reached this round (for the near-miss line)
//   guessFrom    null | 'gotIt' | 'end'   why the guess phase is open
//   returnPhase  phase to return to after a wrong gotIt guess (a gotIt guess
//                is a commitment: it cannot be cancelled, only answered)
//   namedAt      1-based guest number the rule was named on via gotIt (or null)
//   wrongGuesses choice indices already tried via a wrong gotIt guess
//   guessIdx     the choice index picked at the end (null if none)
//   last         the last event, for UI feedback:
//                {type:'correct'|'wrong'|'lenient'|'cleared'|'fired'|'out'|
//                 'wrongGuess'|'rightGuess'|'revived'|'hint', i?, idx?}

import { t } from '../i18n.js';

export const MAX_STRIKES = 3;
export const MAX_LENIENT = 2;
export const MAX_HINTS = 2;

/**
 * @param {import('../engine/types.js').Level} level
 * @param {{mode?:'shift'|'daily'}} [opts]
 * @returns {import('../engine/types.js').RoundState}
 */
export function createRound(level, opts = {}) {
  const mode = opts.mode === 'daily' ? 'daily' : 'shift';
  const demoCount = Math.max(0, Math.min(level.demoCount | 0, level.guests.length));
  return {
    level,
    mode,
    phase: demoCount > 0 ? 'demo' : 'play',
    idx: 0,
    strikes: 0,
    streak: 0,
    bestStreak: 0,
    correct: 0,
    lenientUsed: 0,
    history: [],
    hintsUsed: 0,
    revived: false,
    outcome: null,
    guessedRight: null,
    guessFrom: null,
    returnPhase: null,
    wrongGuesses: [],
    gotItLockedUntil: 0,
    guessIdx: null,
    namedAt: null,
    stars: 0,
    last: null,
  };
}

/** Stars for a finished round (0 unless cleared). */
export function computeStars(s) {
  if (s.outcome !== 'cleared') return 0;
  const namedFirstTry = s.guessedRight === true && !(s.wrongGuesses?.length);
  return 1 + (s.strikes <= 1 ? 1 : 0) + (namedFirstTry ? 1 : 0);
}

/** Judged guests that must pass after a wrong 💡 pick before 💡 opens again. */
export const GOTIT_LOCK = 3;

/** Whether "I've got it!" can be opened now. */
export function canGotIt(s) {
  if (s.mode !== 'shift') return false;
  if (s.phase !== 'play' && s.phase !== 'demo') return false;
  return s.history.length >= (s.gotItLockedUntil ?? 0);
}

function finish(s, outcome) {
  const n = { ...s, phase: 'result', outcome, guessFrom: null, returnPhase: null };
  n.stars = computeStars(n);
  return n;
}

function openEndGuess(s) {
  return { ...s, phase: 'guess', guessFrom: 'end', returnPhase: null };
}

function isWin(s) {
  const w = s.level.win || {};
  return (w.inRow > 0 && s.streak >= w.inRow) || (w.total > 0 && s.correct >= w.total);
}

/**
 * @param {import('../engine/types.js').RoundState} s
 * @param {{type:string, admit?:boolean, idx?:number}} action
 */
export function step(s, action) {
  if (!action || !s) return s;
  const L = s.level;
  switch (action.type) {
    case 'advanceDemo': {
      if (s.phase !== 'demo') return s;
      const idx = s.idx + 1;
      return { ...s, idx, phase: idx >= L.demoCount ? 'play' : 'demo', last: null };
    }

    case 'verdict': {
      if (s.phase !== 'play' || s.idx >= L.guests.length) return s;
      const i = s.idx;
      const call = !!action.admit;
      const ok = call === !!L.labels[i];
      const guest = L.guests[i];
      let n = { ...s };
      if (ok) {
        n.streak = s.streak + 1;
        n.bestStreak = Math.max(s.bestStreak || 0, n.streak);
        n.correct = s.correct + 1;
        n.history = [...s.history, { i, call, ok: true }];
        n.last = { type: 'correct', i };
      } else {
        const forgivable =
          s.mode === 'shift' &&
          !guest?.special &&
          s.lenientUsed < MAX_LENIENT &&
          !!L.lenient?.[i]?.[call ? 'admit' : 'reject'];
        n.streak = 0;
        if (forgivable) {
          n.lenientUsed = s.lenientUsed + 1;
          n.history = [...s.history, { i, call, ok: false, lenient: true }];
          n.last = { type: 'lenient', i };
        } else {
          n.strikes = s.strikes + 1;
          n.history = [...s.history, { i, call, ok: false }];
          n.last = { type: 'wrong', i };
          if (s.mode === 'shift' && n.strikes >= MAX_STRIKES) {
            // idx stays on this guest so a revive re-shows it.
            return { ...finish(n, 'fired'), last: { type: 'fired', i } };
          }
        }
      }
      n.idx = i + 1;
      if (s.mode === 'shift' && isWin(n)) {
        return { ...openEndGuess(n), outcome: 'cleared', last: { type: 'cleared', i } };
      }
      if (n.idx >= L.guests.length) {
        if (s.mode === 'daily') return openEndGuess(n);
        return { ...finish(n, 'out'), last: { type: 'out', i } };
      }
      return n;
    }

    case 'gotIt': {
      if (s.mode !== 'shift') return s;
      if (!canGotIt(s)) return s;
      return { ...s, phase: 'guess', guessFrom: 'gotIt', returnPhase: s.phase, last: null };
    }

    case 'guess': {
      if (s.phase !== 'guess') return s;
      const idx = action.idx;
      if (!Number.isInteger(idx) || idx < 0 || idx >= (L.choices?.length ?? 0)) return s;
      const right = idx === L.correctIdx;
      if (s.guessFrom === 'gotIt') {
        if (right) {
          const namedAt = s.idx + 1;
          return { ...finish({ ...s, guessedRight: true, guessIdx: idx, namedAt }, 'cleared'), last: { type: 'rightGuess', idx } };
        }
        const strikes = s.strikes + 1;
        const n = {
          ...s,
          strikes,
          wrongGuesses: s.wrongGuesses.includes(idx) ? s.wrongGuesses : [...s.wrongGuesses, idx],
          // A wrong pick reveals the options, so the next 💡 waits for more judged guests.
          gotItLockedUntil: s.history.length + GOTIT_LOCK,
          last: { type: 'wrongGuess', idx },
        };
        if (strikes >= MAX_STRIKES) return { ...finish(n, 'fired'), last: { type: 'fired', idx } };
        return { ...n, phase: n.returnPhase || 'play', guessFrom: null, returnPhase: null };
      }
      // End-of-shift (or end-of-daily) pick: wrong costs nothing.
      const outcome = s.outcome || 'cleared';
      return {
        ...finish({ ...s, guessedRight: right, guessIdx: idx }, outcome),
        last: { type: right ? 'rightGuess' : 'wrongGuess', idx },
      };
    }

    case 'skipGuess': {
      // Only the end-of-shift pick can be skipped; "I've got it!" is a commitment.
      if (s.phase !== 'guess' || s.guessFrom === 'gotIt') return s;
      return finish(s, s.outcome || 'cleared');
    }

    case 'hint': {
      if (s.mode !== 'shift' || s.hintsUsed >= MAX_HINTS) return s;
      if (s.phase !== 'play' && s.phase !== 'demo') return s;
      return { ...s, hintsUsed: s.hintsUsed + 1, last: { type: 'hint', n: s.hintsUsed + 1 } };
    }

    case 'revive': {
      if (s.mode !== 'shift' || s.revived || s.phase !== 'result' || s.outcome !== 'fired') return s;
      // The guest that got you fired is re-shown: drop its (fatal) verdict so
      // the log and share grid don't reveal its true label.
      const history = s.history.filter((h) => h.i !== s.idx);
      return {
        ...s,
        history,
        phase: s.idx < L.demoCount ? 'demo' : 'play',
        outcome: null,
        strikes: MAX_STRIKES - 1,
        streak: 0,
        revived: true,
        stars: 0,
        guessFrom: null,
        returnPhase: null,
        last: { type: 'revived' },
      };
    }

    default:
      return s;
  }
}

// ---- selectors ------------------------------------------------------------

/** The guest on screen, or null when the queue is exhausted. */
export function currentGuest(s) {
  return s.level.guests[s.idx] ?? null;
}

/** True when the round is over (result phase). */
export function isOver(s) {
  return s.phase === 'result';
}

/** Judged guests remaining after the current one (inclusive of current). */
export function guestsLeft(s) {
  return Math.max(0, s.level.guests.length - Math.max(s.idx, s.level.demoCount));
}

/**
 * Resolved guests by their TRUE label, in the order they were resolved.
 * Demo guests count once the manager has moved past them; judged guests count
 * once called (deduplicated, e.g. after a revive re-shows a guest).
 * @returns {{in:number[], out:number[]}}
 */
export function logColumns(s) {
  const L = s.level;
  const order = [];
  const seen = new Set();
  const inDemo = s.phase === 'demo' || (s.phase === 'guess' && s.returnPhase === 'demo');
  const demoDone = inDemo ? s.idx : L.demoCount;
  for (let i = 0; i < Math.min(demoDone, L.demoCount); i++) { order.push(i); seen.add(i); }
  for (const h of s.history) if (!seen.has(h.i)) { order.push(h.i); seen.add(h.i); }
  const cols = { in: [], out: [] };
  for (const i of order) (L.labels[i] ? cols.in : cols.out).push(i);
  return cols;
}

/**
 * Shareable emoji result (no URL).
 *   Door Policy #214 🚪 10/12
 *   ✅✅❌✅...
 *   🧠 Rule named!
 * @param {number} [dailyNo]
 * @param {{streak?:number}} [extra]
 */
export function shareText(s, dailyNo, extra = {}) {
  const judged = s.history.length;
  const head =
    dailyNo != null
      ? t('share.header', { n: dailyNo })
      : t('share.headerShift', { id: s.level.id });
  const lines = [`${head} 🚪 ${s.correct}/${judged}`];
  const marks = s.history.map((h) => (h.ok ? '✅' : '❌'));
  // wrap long grids at 6 per row for readability
  const rows = [];
  for (let k = 0; k < marks.length; k += 6) rows.push(marks.slice(k, k + 6).join(''));
  lines.push(...(rows.length ? rows : ['—']));
  const tail = [];
  if (s.guessedRight === true) {
    // namedAt is only set by an early "I've got it!" pick
    tail.push('🧠 ' + (s.namedAt != null ? t('share.namedAt', { n: s.namedAt }) : t('share.named')));
  }
  if (extra.streak > 0) tail.push('🔥' + extra.streak);
  if (tail.length) lines.push(tail.join('  '));
  return lines.join('\n');
}

/**
 * Near-miss info for the Fired screen.
 * @returns {{toWin:number, bestStreak:number, correct:number, needInRow:number, needTotal:number, target:object}}
 */
export function nearMiss(s) {
  const w = s.level.win || { inRow: Infinity, total: Infinity };
  const best = s.bestStreak || 0;
  const needInRow = Math.max(1, w.inRow - best);
  const needTotal = Math.max(1, w.total - s.correct);
  return {
    toWin: Math.min(needInRow, needTotal),
    bestStreak: best,
    correct: s.correct,
    needInRow,
    needTotal,
    target: s.level.target,
  };
}
