// Shift screen: manager bubble, card stage, IN/OUT log, HUD, hint buttons,
// name-the-rule panel. Drives demo playback and turns state transitions into
// animations. Never decides outcomes itself: every change goes through
// opts.step(action) (the reducer, wired by main.js).

import { h, wait, replay, announce } from './dom.js';
import { renderCard, renderMini } from './card.js';
import { canGotIt } from '../game/state.js';
import { attachSwipe, setKeys, getKeys, focusGame, LOCK_MS } from './swipe.js';
import * as audio from './audio.js';
import * as fx from './fx.js';

const DEMO_HOLD = 950;
const DEMO_HOLD_FAST = 620; // from club 1 shift 4 on (and the Daily Door)
const DEMO_FLY = 380;
const ON_FIRE = 4;

/**
 * @param {object} o
 * @param {object} o.round        initial RoundState
 * @param {object} o.club         club data (CLUBS entry or DAILY_CLUB)
 * @param {{mode:'shift'|'daily', club:number, idx:number, dailyNo?:number, tutorial?:boolean, firstOfClub?:boolean, preview?:boolean}} o.ctx
 * @param {(key:string, fb?:string, p?:object)=>string} o.L
 * @param {(rule:object)=>string} o.describe
 * @param {(guest:object)=>string} o.quoteFor
 * @param {object} o.sel          selectors {currentGuest, logColumns, guestsLeft}
 * @param {(action:object)=>object} o.step   apply an action, returns the new state
 * @param {(s:object)=>void} o.onEnd
 * @param {()=>void} o.onPause
 * @param {()=>Promise<boolean>} o.onRewardHint  plays the ad; main.js resumes gameplay only via view.canPlay()
 * @param {(on:boolean)=>void} o.gameplay
 * @param {()=>boolean} o.adsAvailable
 */
export function createShiftView(o) {
  const { L, ctx, club, sel } = o;
  let s = o.round;
  const level = s.level;
  const visible = level.visible;
  let busy = false;
  let paused = false;
  let destroyed = false;
  let myKeys = null;
  let skipFlag = false;
  let cardEl = null;
  let cardIdx = -1;
  let detachSwipe = null;
  let tutorialShown = false;
  let shownLog = new Set();
  let adHintFailed = false;
  let queue = Promise.resolve();
  let demoQueued = false;   // one demo loop at a time
  let interrupt = false;    // "I've got it!" confirmed mid-demo: stop the current demo card
  let confirming = false;   // the "Name the rule now?" confirm is open
  let guessOpen = false;
  const isDaily = ctx.mode === 'daily';
  const demoHold = isDaily || ctx.club > 1 || ctx.idx >= 3 ? DEMO_HOLD_FAST : DEMO_HOLD;

  // ---- DOM -----------------------------------------------------------------
  const strikesEl = h('div', { class: 'strikes', 'aria-label': L('hud.strikes', 'Strikes') });
  const streakEl = h('div', { class: 'streak' });
  const totalEl = h('div', { class: 'total' });
  const leftEl = h('div', { class: 'left', title: L('hud.guestsLeftTitle', 'Guests left') });
  const goalsEl = isDaily ? null : h('div', { class: 'goals', 'aria-label': L('hud.goals', 'Star goals') });
  const pauseBtn = h('button', { class: 'icon-btn btn-pause', 'aria-label': L('btn.pause', 'Pause'), onclick: () => { audio.play('click'); o.onPause(); } }, '⏸');

  const title = isDaily
    ? (ctx.preview ? `📅 ${L('daily.title', 'Daily Door')}` : L('hud.daily', `📅 Daily Door #${ctx.dailyNo}`, { n: ctx.dailyNo }))
    : club.name;
  const sub = isDaily
    ? (ctx.preview ? L('hud.sneakPeek', 'Sneak peek') : ctx.practice ? L('hud.practice', 'Practice (not scored)') : L('daily.intro', ''))
    : L('hud.shift', `Shift ${ctx.idx + 1}`, { n: ctx.idx + 1 });

  const hud = h('header', { class: 'hud' },
    h('div', { class: 'hud-title' }, h('b', null, title), h('span', null, sub)),
    h('div', { class: 'hud-status' }, isDaily ? null : strikesEl, streakEl, totalEl, leftEl),
    pauseBtn,
    goalsEl);

  const bubbleText = h('p', { class: 'bubble-text' }, '');
  const avatar = h('div', { class: 'mgr-avatar', 'aria-hidden': 'true' }, club.manager.emoji);
  const mgr = h('section', { class: 'mgr', 'aria-live': 'polite' },
    avatar,
    h('div', { class: 'bubble' }, h('span', { class: 'mgr-name' }, club.manager.name), bubbleText));

  const inList = h('div', { class: 'log-list' });
  const outList = h('div', { class: 'log-list' });
  const inCount = h('span', { class: 'count' }, '0');
  const outCount = h('span', { class: 'count' }, '0');
  const log = h('section', { class: 'log', 'aria-label': L('log.title', 'Guest log') },
    h('div', { class: 'log-col col-in' }, h('h3', null, h('span', { class: 'log-head' }, L('log.in', 'IN ✓')), inCount), inList),
    h('div', { class: 'log-col col-out' }, h('h3', null, h('span', { class: 'log-head' }, L('log.out', 'OUT ✗')), outCount), outList));

  const cardSlot = h('div', { class: 'card-slot' });
  const tip = h('div', { class: 'swipe-tip', hidden: true });
  const speedTip = h('div', { class: 'speed-tip', hidden: true, 'aria-hidden': 'true' }, L('hud.tapToSpeed', 'Tap to speed up'));
  const confirmPanel = h('div', { class: 'confirm-panel', hidden: true, role: 'dialog', 'aria-modal': 'false' });
  const banner = h('div', { class: 'banner', hidden: true });
  const guessPanel = h('div', { class: 'guess-panel', hidden: true, role: 'dialog', 'aria-modal': 'false' });
  const stage = h('main', { class: 'stage' },
    h('div', { class: 'door', 'aria-hidden': 'true' }, h('span', { class: 'door-sign' }, club.decor?.[0] || '🚪'), h('i', { class: 'door-knob' })),
    h('div', { class: 'rope', 'aria-hidden': 'true' }),
    cardSlot, tip, speedTip, banner, confirmPanel, guessPanel);

  const gotItBtn = h('button', { class: 'btn btn-gotit', onclick: () => { focusGame(); gotIt(); } }, L('btn.gotIt', "💡 I've got it!"));
  const hintBtn = h('button', { class: 'btn btn-hint', onclick: () => { focusGame(); hint(); } }, '');
  const aux = h('div', { class: 'aux' }, isDaily ? null : gotItBtn, isDaily ? null : hintBtn);

  const rejectBtn = h('button', { class: 'btn btn-reject', onclick: () => { focusGame(); decide(false); } },
    h('span', { class: 'btn-ico' }, '✗'), h('span', null, L('btn.reject', 'REJECT')), h('kbd', null, '←'));
  const admitBtn = h('button', { class: 'btn btn-admit', onclick: () => { focusGame(); decide(true); } },
    h('span', { class: 'btn-ico' }, '✓'), h('span', null, L('btn.admit', 'ADMIT')), h('kbd', null, '→'));
  const decideRow = h('div', { class: 'decide' }, rejectBtn, admitBtn);

  const el = h('div', { class: `screen shift mode-${ctx.mode}`, data: { club: String(club.id) } },
    hud, mgr, log, stage, aux, decideRow);

  // Tap stage during demo / intro = speed up
  stage.addEventListener('pointerdown', (e) => {
    if (s.phase === 'demo' && !e.target.closest('.guess-panel, .confirm-panel')) skipFlag = true;
  });

  // ---- helpers -------------------------------------------------------------

  async function sleep(ms) {
    skipFlag = false;
    let left = ms;
    while (left > 0 && !destroyed) {
      if (skipFlag || interrupt) { skipFlag = false; return true; }
      await wait(40);
      if (!paused && !confirming) left -= 40;
    }
    return false;
  }
  async function whilePaused() {
    while ((paused || confirming) && !destroyed && !interrupt) await wait(60);
  }

  function zoomOpen() {
    return !!el.querySelector('.overlay.zoom');
  }

  /** Input that changes the round is blocked by pause, the zoom overlay and the confirm. */
  function blocked() {
    return busy || paused || destroyed || confirming || zoomOpen();
  }

  function say(text, cls = '') {
    if (!text) return;
    bubbleText.textContent = text;
    mgr.className = `mgr ${cls}`;
    replay(mgr.querySelector('.bubble'), 'fx-bubble');
    replay(avatar, 'fx-bob');
  }

  function quip(k) {
    return club.quips?.[k] || '';
  }

  function renderHud() {
    const w = level.win || { inRow: 5, total: 8 };
    strikesEl.replaceChildren(...[0, 1, 2].map((k) => h('span', { class: 'strike' + (k < s.strikes ? ' on' : '') }, '❌')));
    strikesEl.setAttribute('aria-label', `${L('hud.strikes', 'Strikes')}: ${s.strikes}/3`);
    if (isDaily) {
      const max = level.guests.length - level.demoCount;
      streakEl.replaceChildren(h('span', { class: 'pill' }, '🔥 ', h('b', null, String(s.streak))));
      totalEl.replaceChildren(h('span', { class: 'pill' }, '✓ ', h('b', null, `${s.correct}/${max}`)));
    } else {
      const pips = h('span', { class: 'pips', title: L('hud.streak', '', { n: s.streak, max: w.inRow }) },
        ...Array.from({ length: w.inRow }, (_, k) => h('i', { class: 'pip' + (k < s.streak ? ' on' : '') })));
      streakEl.replaceChildren(h('span', { class: 'pill' }, '🔥', pips));
      totalEl.replaceChildren(h('span', { class: 'pill', title: L('hud.total', '', { n: s.correct, max: w.total }) }, '✓ ', h('b', null, `${s.correct}/${w.total}`)));
    }
    const left = sel.guestsLeft ? sel.guestsLeft(s) : 0;
    leftEl.replaceChildren(h('span', { class: 'pill pill-left' }, '👥 ', h('b', null, String(left))));
    renderGoals();
    el.classList.toggle('on-fire', s.streak >= ON_FIRE);
    renderHintBtn();
    const canAct = s.phase === 'play' && !confirming;
    admitBtn.disabled = !canAct;
    rejectBtn.disabled = !canAct;
    gotItBtn.disabled = !canGotIt(s);
  }

  /** Live star goals: ★ clear · ★ ≤1 ❌ · ★ name it. */
  function renderGoals() {
    if (!goalsEl) return;
    const goal = (cls, text) => h('span', { class: `goal ${cls}` }, text);
    const cleared = s.outcome === 'cleared';
    const strikesState = s.strikes <= 1 ? (cleared ? 'won' : 'ok') : 'lost';
    const namedState = s.guessedRight === true ? 'won' : s.phase === 'result' ? 'lost' : '';
    goalsEl.replaceChildren(
      goal(cleared ? 'won' : '', L('hud.goal.clear', '★ clear')),
      goal(strikesState, L('hud.goal.strikes', '★ ≤1 ❌')),
      goal(namedState, L('hud.goal.named', '★ name it')));
  }

  function renderHintBtn() {
    if (isDaily) return;
    const used = s.hintsUsed | 0;
    hintBtn.classList.remove('btn-ad');
    hintBtn.hidden = false;
    hintBtn.disabled = !(s.phase === 'play' || s.phase === 'demo') || confirming;
    if (used === 0) {
      hintBtn.textContent = '🔍 ' + L('hint.free.button', 'Hint (free)');
    } else if (used === 1) {
      if (!o.adsAvailable()) { hintBtn.hidden = true; return; }
      hintBtn.classList.add('btn-ad');
      hintBtn.textContent = '🎬 ' + L('hint.button', 'Hint').replace(/^💡\s*/, '');
      hintBtn.title = L('ad.hint', '🎬 Watch ad: show the key traits');
      if (adHintFailed) hintBtn.disabled = true;
    } else {
      hintBtn.textContent = L('hint.used', 'No more hints');
      hintBtn.disabled = true;
    }
  }

  function renderLog() {
    const cols = sel.logColumns(s);
    const missed = new Set(s.history.filter((x) => !x.ok).map((x) => x.i));
    const pair = (s.hintsUsed | 0) >= 1 ? new Set(level.hintPair || []) : new Set();
    const pulse = (s.hintsUsed | 0) >= 2 ? (level.ruleTraits || []) : [];
    const build = (arr, admit) => arr.slice().reverse().map((i) => {
      const m = renderMini(level.guests[i], i, { visible, admit, demo: i < level.demoCount, missed: missed.has(i), L });
      if (!shownLog.has(i)) m.classList.add('new');
      if (pair.has(i)) m.classList.add('pair');
      for (const t of pulse) m.querySelectorAll(`[data-trait="${t}"]`).forEach((x) => x.classList.add('pulse'));
      m.addEventListener('click', () => zoomGuest(i, admit));
      return m;
    });
    inList.replaceChildren(...build(cols.in, true));
    outList.replaceChildren(...build(cols.out, false));
    if (!cols.in.length) inList.append(h('p', { class: 'log-empty' }, '—'));
    if (!cols.out.length) outList.append(h('p', { class: 'log-empty' }, '—'));
    inCount.textContent = String(cols.in.length);
    outCount.textContent = String(cols.out.length);
    shownLog = new Set([...cols.in, ...cols.out]);
    if (pair.size) {
      const first = log.querySelector('.mini.pair');
      first?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    }
  }

  function zoomGuest(i, admit) {
    const g = level.guests[i];
    const big = renderCard(g, { visible, L, quote: o.quoteFor(g) });
    big.classList.add('zoomed', admit ? 'stamped-in' : 'stamped-out');
    big.querySelector('.stamp').textContent = admit ? L('stamp.admit', '✅ ADMIT') : L('stamp.reject', '⛔ REJECT');
    big.querySelector('.stamp').classList.add('show', admit ? 'admit' : 'reject');
    const close = () => { ov.remove(); focusGame(); };
    const ov = h('div', { class: 'overlay zoom', onclick: close }, big,
      h('button', { class: 'btn btn-small', onclick: close }, L('btn.close', 'Close')));
    el.append(ov);
  }

  function applyCardHints(card) {
    if ((s.hintsUsed | 0) >= 2) {
      for (const t of level.ruleTraits || []) card.querySelectorAll(`[data-trait="${t}"]`).forEach((x) => x.classList.add('pulse'));
    }
  }

  function showCard(i, { interactive }) {
    if (cardIdx === i && cardEl) {
      cardEl.classList.toggle('live', interactive);
      return cardEl;
    }
    removeCard();
    const g = level.guests[i];
    if (!g) return null;
    const card = renderCard(g, {
      visible, L, quote: o.quoteFor(g), onReveal: () => {
        audio.play('woof');
        fx.floatText(cardSlot, L('special.trenchcoat.woof', '🐶 Woof!'), 'float-big');
      },
    });
    card.classList.add('enter');
    if (interactive) card.classList.add('live');
    applyCardHints(card);
    cardSlot.append(card);
    cardEl = card;
    cardIdx = i;
    audio.play('whoosh');
    detachSwipe = attachSwipe(card, {
      canDrag: () => !blocked() && s.phase === 'play' && cardEl === card,
      onMove: (_dx, frac) => previewStamp(card, frac),
      onCommit: (dir) => decide(dir > 0),
    });
    setTimeout(() => card.classList.remove('enter'), 450);
    return card;
  }

  function removeCard() {
    detachSwipe?.();
    detachSwipe = null;
    cardEl?.remove();
    cardEl = null;
    cardIdx = -1;
  }

  function previewStamp(card, frac) {
    const st = card.querySelector('.stamp');
    const a = Math.abs(frac);
    if (a < 0.3) {
      st.className = 'stamp';
      st.style.opacity = '';
      card.style.setProperty('--tint', '0');
      return;
    }
    const admit = frac > 0;
    st.className = `stamp preview ${admit ? 'admit' : 'reject'}`;
    st.textContent = admit ? L('stamp.admit', '✅ ADMIT') : L('stamp.reject', '⛔ REJECT');
    st.style.opacity = String(Math.min(1, (a - 0.3) / 0.7));
    card.dataset.lean = admit ? 'in' : 'out';
    card.style.setProperty('--tint', String(Math.min(1, a)));
  }

  function stamp(card, admit, kind) {
    const st = card.querySelector('.stamp');
    st.style.opacity = '';
    st.className = `stamp ${admit ? 'admit' : 'reject'} ${kind}`;
    const word = admit ? L('stamp.admit', '✅ ADMIT') : L('stamp.reject', '⛔ REJECT');
    st.textContent = kind === 'wrong' ? `✗ ${word.replace(/^\S+\s/, '')}` : word;
    void st.offsetWidth;
    st.classList.add('show');
    audio.play('stamp');
  }

  async function flyOut(card, admit) {
    card.style.transform = '';
    card.classList.remove('live');
    card.classList.add(admit ? 'fly-in' : 'fly-out');
    audio.play('whoosh');
    await wait(fx.reducedMotion() ? 120 : DEMO_FLY);
  }

  function react(card, emoji) {
    const r = card.querySelector('.react');
    if (!r) return;
    r.textContent = emoji;
    replay(r, 'show');
  }

  // ---- flow ----------------------------------------------------------------

  /** Serialise actions so debug steps and UI input never interleave. */
  function enqueue(fn) {
    queue = queue.then(fn, fn).catch((e) => { console.warn(e); });
    return queue;
  }

  async function mount() {
    renderHud();
    renderLog();
    if (s.last?.type === 'revived') {
      tutorialShown = true;
      say(L('revive.line', 'Second chance!'), 'happy');
      replay(strikesEl, 'fx-pop');
      await sleep(1200);
    } else if (s.phase === 'demo' && s.idx === 0) {
      const kind = level.guests.find((g) => g.special)?.special;
      const special = [level.intro, kind && `special.${kind}.intro`].filter(Boolean).map((k) => L(k, '')).find(Boolean) || '';
      let line = special || quip('intro');
      if (isDaily) line = L('daily.intro', quip('intro'));
      say(line);
      if (ctx.firstOfClub && !special) {
        await sleep(1700);
        say(L('tutorial.watch', 'Watch the manager first.'));
      }
      await sleep(special ? 2600 : 1500);
    }
    sync();
  }

  function sync() {
    if (destroyed) return;
    renderHud();
    if (s.phase === 'demo') {
      if (!demoQueued) { demoQueued = true; enqueue(demoStep); }
    } else if (s.phase === 'play') enterPlay();
    else if (s.phase === 'guess') openGuess();
    else if (s.phase === 'result') finishSoon();
  }

  async function demoStep() {
    demoQueued = false;
    if (destroyed || s.phase !== 'demo' || interrupt) return;
    await whilePaused();
    if (interrupt) return;
    const i = s.idx;
    const card = showCard(i, { interactive: false });
    if (!card) return;
    card.classList.add('demo');
    card.dataset.demo = `👔 ${L('hud.demo', 'Watch the manager')}`;
    speedTip.hidden = !(i === 0 && s.history.length === 0);
    await sleep(demoHold);
    speedTip.hidden = true;
    if (destroyed || s.phase !== 'demo' || s.idx !== i || interrupt) return;
    await whilePaused();
    if (interrupt || s.phase !== 'demo') return;
    const admit = !!level.labels[i];
    stamp(card, admit, 'ok manager');
    react(card, admit ? '🥳' : '🤷');
    await wait(fx.reducedMotion() ? 150 : 320);
    await flyOut(card, admit);
    if (destroyed || s.phase !== 'demo') return;
    removeCard();
    s = o.step({ type: 'advanceDemo' });
    renderLog();
    sync();
  }

  /** True while the player is actually playing (judged guest live, not paused). */
  function canPlay() {
    return !destroyed && !paused && s.phase === 'play';
  }

  function enterPlay() {
    const i = s.idx;
    if (!level.guests[i] || destroyed) return;
    if (canPlay()) o.gameplay(true);
    const card = showCard(i, { interactive: true });
    if (card) { card.classList.remove('demo'); delete card.dataset.demo; }
    if (!tutorialShown) {
      tutorialShown = true;
      say(L('hud.yourTurn', 'Your turn!') + ' ' + (ctx.tutorial ? L('tutorial.swipe', 'Swipe or tap: who gets in?') : ''));
      tip.hidden = !ctx.tutorial;
      tip.className = 'swipe-tip';
      tip.setAttribute('aria-label', L('controls.swipe', 'Swipe right to admit, left to reject'));
      tip.replaceChildren(h('span', { class: 'arrow-l' }, '✗'), h('span', { class: 'hand', 'aria-hidden': 'true' }, '👆'), h('span', { class: 'arrow-r' }, '✓'));
    } else if (!ctx.tutorial || s.history.length > 0) {
      tip.hidden = true;
    }
    if (ctx.tutorial && s.history.length === 2 && !isDaily) {
      say(L('tutorial.gotIt', "Know the rule? Press 💡 I've got it!"));
      replay(gotItBtn, 'fx-attention');
    }
  }

  function decide(admit) {
    if (blocked() || s.phase !== 'play' || !cardEl) return;
    busy = true;
    return enqueue(() => doDecide(admit));
  }

  async function doDecide(admit) {
    try {
      const card = cardEl;
      const prev = s;
      const i = s.idx;
      const guest = level.guests[i];
      s = o.step({ type: 'verdict', admit });
      if (s === prev) return;
      tip.hidden = true;
      const last = s.history[s.history.length - 1];
      const truth = !!level.labels[i];
      if (last?.ok) {
        stamp(card, admit, 'ok');
        audio.play('correct', { streak: s.streak });
        react(card, admit ? '🥳' : '🤷');
        if (s.streak === ON_FIRE && !isWinNow()) {
          fx.floatText(stage, L('hud.onFire', '🔥 ON FIRE'), 'float-big float-fire');
          fx.confetti(stage, { count: 24, emoji: '🔥' });
          audio.play('cheer');
          replay(el, 'fx-fire');
        } else if (s.streak >= 3) fx.floatText(stage, `🔥 ${s.streak}`, 'float-streak');
        else fx.floatText(stage, '+1', 'float-ok');
        if (guest?.special) say(L(`special.${guest.special}.right`, quip('praise')), 'happy');
        else if (s.streak >= 2 && s.streak % 2 === 0) say(quip('praise'), 'happy');
        replay(streakEl, 'fx-pop');
        announce(L('feedback.correct', 'Correct!'));
      } else if (last?.lenient) {
        stamp(card, admit, 'lenient');
        audio.play('pop');
        say(club.fairGuess || L('feedback.lenient', "Fair guess! Here's the rule-book page."), 'meh');
        announce(L('feedback.lenient', 'Fair guess!'));
      } else {
        stamp(card, admit, 'wrong');
        audio.play(s.strikes >= 3 && !isDaily ? 'strike' : 'wrong');
        audio.vibrate(30);
        fx.shake(el);
        fx.flash(el, 'bad');
        react(card, truth ? '😤' : '😅');
        const why = truth ? L('feedback.wasAdmit', 'They should have been admitted.') : L('feedback.wasReject', 'They should have been rejected.');
        if (guest?.special) say(L(`special.${guest.special}.wrong`, quip('scold')), 'sad');
        else say(`${quip('scold')} ${why}`, 'sad');
        replay(strikesEl, 'fx-pop');
        announce(`${L('feedback.wrong', 'Wrong call!')} ${why}`);
      }
      await wait(fx.reducedMotion() ? 120 : 260);
      // the card ends up where it truly belongs: the log is information
      await flyOut(card, truth);
      if (cardEl === card) removeCard();
      renderLog();
      renderHud();
      if (s.phase === 'guess' && s.outcome === 'cleared') await celebrateWin();
      if (s.phase === 'guess' && isDaily) {
        say(L('daily.nameAtEnd', 'Name the rule to finish.'));
      }
      await wait(Math.max(0, LOCK_MS - 200));
    } finally {
      busy = false;
    }
    sync();
  }

  function isWinNow() {
    return s.phase === 'guess' && s.outcome === 'cleared';
  }

  async function celebrateWin() {
    audio.play('win');
    audio.play('cheer');
    fx.confetti(el, { count: 70, emoji: club.decor?.[0] });
    banner.hidden = false;
    banner.textContent = L('result.cleared', 'Shift cleared!');
    replay(banner, 'show');
    say(quip('win'), 'happy');
    await sleep(1100);
    banner.hidden = true;
  }

  /** 💡 / G: first a lightweight confirm (no options shown), then the committed pick. */
  function gotIt() {
    if (isDaily) return;
    if (confirming) { confirmGotIt(); return; }
    if (blocked()) return;
    if (!canGotIt(s)) return;
    openConfirm();
  }

  function openConfirm() {
    confirming = true;
    audio.play('click');
    const yes = h('button', { class: 'btn btn-primary btn-gotit', onclick: () => { focusGame(); confirmGotIt(); } },
      L('guess.confirmYes', 'Name it'));
    const no = h('button', { class: 'btn btn-ghost', onclick: () => { focusGame(); closeConfirm(); } },
      L('guess.confirmNo', 'Not yet'));
    confirmPanel.replaceChildren(
      h('div', { class: 'confirm-card' },
        h('h2', null, `💡 ${L('guess.confirmTitle', 'Name the rule now?')}`),
        h('p', { class: 'guess-sub' }, L('guess.confirmBody', 'A wrong pick costs a strike.')),
        h('div', { class: 'equal-row' }, no, yes)));
    confirmPanel.hidden = false;
    replay(confirmPanel, 'show');
    renderHud();
    setTimeout(() => yes.focus({ preventScroll: true }), 30);
  }

  function closeConfirm() {
    if (!confirming) return;
    confirming = false;
    confirmPanel.hidden = true;
    confirmPanel.replaceChildren();
    renderHud();
  }

  function confirmGotIt() {
    closeConfirm();
    commitGotIt();
  }

  function commitGotIt() {
    if (busy || paused || destroyed || isDaily) return;
    if (s.phase !== 'play' && s.phase !== 'demo') return;
    if (s.phase === 'demo') interrupt = true; // stop the current demo card right away
    enqueue(async () => {
      interrupt = false;
      const n = o.step({ type: 'gotIt' });
      if (n === s) { sync(); return; }
      s = n;
      audio.play('pop');
      sync();
    });
  }

  function hint() {
    if (blocked() || isDaily) return;
    if (s.phase !== 'play' && s.phase !== 'demo') return;
    const used = s.hintsUsed | 0;
    if (used >= 2) return;
    enqueue(async () => {
      if (destroyed) return;
      if (used === 1) {
        if (!o.adsAvailable() || adHintFailed) return;
        busy = true;
        let ok = false;
        try { ok = await o.onRewardHint(); } finally { busy = false; }
        if (!ok) {
          adHintFailed = true;
          toast(L('ad.none', 'No ad right now'));
          renderHintBtn();
          return;
        }
      }
      const n = o.step({ type: 'hint' });
      if (n === s) return;
      s = n;
      audio.play('pop');
      if ((s.hintsUsed | 0) === 1) {
        say(L('log.compare', 'Compare these two') + ' 👀', 'happy');
        renderLog();
      } else {
        say(L('hint.traits', 'The rule cares about the glowing part of the card.'), 'happy');
        if (cardEl) applyCardHints(cardEl);
        renderLog();
      }
      renderHud();
      sync();
    });
  }

  function toast(text) {
    const t = h('div', { class: 'toast', role: 'status' }, text);
    el.append(t);
    setTimeout(() => t.remove(), 2200);
  }

  // ---- name the rule -------------------------------------------------------

  function openGuess() {
    if (guessOpen) return;
    guessOpen = true;
    const from = s.guessFrom;
    const choices = level.choices || [];
    const wrong = new Set(s.wrongGuesses || []);
    const titleText = L('guess.title', "What's the policy?");
    const subText = from === 'gotIt'
      ? L('guess.gotItSubtitle', 'Right = shift cleared! Wrong = a strike.')
      : isDaily ? L('daily.nameAtEnd', 'Name the rule to finish.') : `★ ${L('guess.subtitle', 'Pick the secret rule.')}`;
    const opts = choices.map((rule, k) => h('button', {
      class: 'btn opt' + (wrong.has(k) ? ' tried' : ''),
      disabled: wrong.has(k),
      data: { k: String(k) },
      onclick: () => pick(k),
    }, h('kbd', null, String(k + 1)), h('span', null, o.describe(rule))));
    // "I've got it!" is a commitment: no Back. Only the end-of-shift pick can be skipped.
    const skip = isDaily || from === 'gotIt' ? null
      : h('button', { class: 'btn btn-ghost btn-small', onclick: () => skipGuess() }, L('guess.skip', 'Skip'));
    guessPanel.replaceChildren(
      h('div', { class: 'guess-card' },
        h('h2', null, `${club.manager.emoji} ${titleText}`),
        h('p', { class: 'guess-sub' }, subText),
        h('div', { class: 'opts' }, ...opts),
        skip));
    guessPanel.hidden = false;
    el.classList.add('guessing');
    replay(guessPanel, 'show');
    if (cardEl) cardEl.classList.add('dim');
    admitBtn.disabled = true;
    rejectBtn.disabled = true;
    setTimeout(() => guessPanel.querySelector('.opt:not([disabled])')?.focus({ preventScroll: true }), 50);
  }

  function closeGuess() {
    guessOpen = false;
    guessPanel.hidden = true;
    el.classList.remove('guessing');
    cardEl?.classList.remove('dim');
  }

  function pick(k) {
    if (busy || s.phase !== 'guess') return;
    busy = true;
    enqueue(async () => {
      try {
        const from = s.guessFrom;
        const n = o.step({ type: 'guess', idx: k });
        if (n === s) return;
        s = n;
        const btn = guessPanel.querySelector(`.opt[data-k="${k}"]`);
        const right = k === level.correctIdx;
        if (right) {
          btn?.classList.add('right');
          audio.play('win');
          fx.confetti(el, { count: 80, emoji: '⭐' });
          say(L('guess.right', 'Spot on!'), 'happy');
          await sleep(1000);
        } else if (from === 'gotIt' && s.phase !== 'result') {
          btn?.classList.add('wrong');
          audio.play('wrong');
          fx.shake(guessPanel);
          say(L('guess.wrongGotIt', 'Nope! That costs a strike.'), 'sad');
          renderHud();
          replay(strikesEl, 'fx-pop');
          await sleep(900);
        } else {
          btn?.classList.add('wrong');
          guessPanel.querySelector(`.opt[data-k="${level.correctIdx}"]`)?.classList.add('right');
          audio.play(from === 'gotIt' ? 'strike' : 'wrong');
          say(L('guess.wrong', 'Not quite.'), 'sad');
          await sleep(1400);
        }
        closeGuess();
      } finally {
        busy = false;
      }
      sync();
    });
  }

  function skipGuess() {
    if (busy || s.phase !== 'guess') return;
    enqueue(async () => {
      const n = o.step({ type: 'skipGuess' });
      if (n === s) return;
      s = n;
      closeGuess();
      sync();
    });
  }

  let ended = false;
  function finishSoon() {
    if (ended) return;
    ended = true;
    o.gameplay(false);
    setKeys({});
    setTimeout(() => { if (!destroyed) o.onEnd(s); }, s.outcome === 'fired' ? 500 : 250);
  }

  // ---- keys ----------------------------------------------------------------

  function bindKeys() {
    setKeys(myKeys = {
      admit: () => decide(true),
      reject: () => decide(false),
      gotIt,
      hint,
      opt: (n) => { if (!zoomOpen() && s.phase === 'guess' && n < (level.choices || []).length && !(s.wrongGuesses || []).includes(n)) pick(n); },
      continue: () => {
        const z = el.querySelector('.overlay.zoom');
        if (z) { z.remove(); return; }
        if (confirming) { confirmGotIt(); return; }
        if (s.phase === 'demo') skipFlag = true;
      },
      pause: () => {
        const z = el.querySelector('.overlay.zoom');
        if (z) { z.remove(); return; }
        if (confirming) { closeConfirm(); return; }
        o.onPause();
      },
    });
  }

  bindKeys();
  // start after the element is in the DOM
  setTimeout(() => { if (!destroyed) mount(); }, 0);

  return {
    el,
    get state() { return s; },
    /** True while a judged guest is live and the game isn't paused (gameplayStart is allowed). */
    canPlay,
    /** Debug / external: apply an action through the same animated path. */
    act(action) {
      switch (action?.type) {
        case 'verdict':
          return (async () => {
            await queue;
            while (busy) await wait(20);
            if (s.phase === 'play' && cardEl) { busy = true; await enqueue(() => doDecide(!!action.admit)); }
            await queue;
            return s;
          })();
        case 'guess':
          return (async () => { await queue; while (busy) await wait(20); pick(action.idx); await queue; return s; })();
        case 'gotIt': commitGotIt(); return queue.then(() => s);
        case 'hint': hint(); return queue.then(() => s);
        case 'skipGuess': skipGuess(); return queue.then(() => s);
        case 'advanceDemo': skipFlag = true; return queue.then(() => s);
        default: return Promise.resolve(s);
      }
    },
    pause() { paused = true; el.classList.add('paused'); o.gameplay(false); },
    resume() {
      if (destroyed) return;
      paused = false;
      el.classList.remove('paused');
      bindKeys();
      if (s.phase === 'play' || s.phase === 'guess') o.gameplay(true);
      focusGame();
    },
    destroy() {
      destroyed = true;
      removeCard();
      // The next screen may already have bound its own keys; only clear ours.
      if (getKeys() === myKeys) setKeys({});
    },
  };
}
