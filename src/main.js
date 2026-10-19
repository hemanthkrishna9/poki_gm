// Boot + router. The only orchestrator: wires the round reducer to the UI,
// progression/save after results, Poki SDK calls and pause handling.

import * as S from './game/state.js';
import * as P from './game/progression.js';
import { createSave } from './game/save.js';
import { CLUBS, DAILY_CLUB, clubById } from './data/clubs.js';
import { quoteFor, nearMissLine } from './data/content.js';
import { t } from './i18n.js';
import poki from './poki.js';
import { h } from './ui/dom.js';
import { describe as describeRule } from './engine/rules.js';
import { installInput, focusGame, setKeys, getKeys } from './ui/swipe.js';
import * as audio from './ui/audio.js';
import { createShiftView } from './ui/shift.js';
import * as screens from './ui/screens.js';

const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');
const root = document.getElementById('app');

const app = {
  save: null,
  progress: null,
  settings: null,
  round: null,
  view: null,
  ctx: null,
  screen: 'loading',
  overlay: null,
  pausedByHide: false,
};

// ---- i18n helper -----------------------------------------------------------

function fill(s, p) {
  if (!p) return s;
  return String(s).replace(/\{(\w+)\}/g, (m, k) => (k in p && p[k] != null ? String(p[k]) : m));
}

/** t() with an English fallback for keys not (yet) in the string table. */
function L(key, fb, p) {
  const s = t(key, p);
  if (s !== key && s !== `${key}.one` && s !== `${key}.other`) return s;
  return fill(fb ?? key, p);
}

function describe(rule) {
  if (!rule) return '';
  try { return describeRule(rule, t); } catch (e) { console.warn(e); return ''; }
}

// ---- storage / settings ----------------------------------------------------

function getStorage() {
  try {
    const ls = window.localStorage;
    if (!ls) return null;
    void ls.length;
    return ls;
  } catch {
    return null;
  }
}

function osReducedMotion() {
  try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

function reducedNow() {
  const r = app.settings?.reducedMotion;
  return r == null ? osReducedMotion() : !!r;
}

function applySettings() {
  const html = document.documentElement;
  html.dataset.motion = reducedNow() ? 'reduced' : 'full';
  html.classList.toggle('cb', !!app.settings.colorBlind);
  audio.setEnabled(app.settings.sound !== false);
}

function persist() {
  try { app.save.save(app.progress); } catch { /* save.js already guards */ }
}

// ---- theme / mounting ------------------------------------------------------

function applyTheme(club) {
  const c = club?.colors || DAILY_CLUB.colors;
  const st = root.style;
  st.setProperty('--club-bg', c.bg);
  st.setProperty('--club-accent', c.accent);
  st.setProperty('--club-door', c.door);
  st.setProperty('--club-text', c.text);
  root.dataset.club = String(club?.id ?? 'menu');
}

function mount(el, name) {
  closeOverlay();
  if (app.view && name !== 'shift') {
    app.view.destroy();
    app.view = null;
  }
  root.replaceChildren(el);
  app.screen = name;
  root.dataset.screen = name;
  focusGame(root);
}

function openOverlay(el) {
  closeOverlay();
  app.overlay = el;
  root.append(el);
}

function closeOverlay() {
  app.overlay?.remove();
  app.overlay = null;
}

// ---- helpers over progression ---------------------------------------------

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function levelAt(club, idx) {
  return P.levelFor(club, idx);
}

function shiftCount(club) {
  return P.shiftsInClub(club);
}

/** Today's door is a real (scorable) daily that hasn't been begun yet. */
function dailyIsNew() {
  const key = todayKey();
  return key >= P.DAILY_EPOCH && !P.startedDaily(app.progress, key);
}

function nextAfter(club, idx) {
  if (idx + 1 < shiftCount(club)) return { club, idx: idx + 1 };
  const nc = club + 1;
  if (clubById(nc) && P.clubUnlocked(app.progress, nc) && shiftCount(nc) > 0) return { club: nc, idx: 0 };
  return null;
}

function firstVisit() {
  return !app.progress.seenTutorial && P.totalStars(app.progress) === 0;
}

function gameplay(on) {
  if (on) poki.gameplayStart();
  else poki.gameplayStop();
}

// ---- ads -------------------------------------------------------------------

async function maybeBreak(shiftNo, clubId) {
  if (!P.nextBreakAllowed(shiftNo, clubId)) return;
  poki.gameplayStop();
  await poki.commercialBreak();
  focusGame(root);
}

async function rewarded() {
  poki.gameplayStop();
  const ok = await poki.rewardedBreak();
  focusGame(root);
  return ok === true;
}

// ---- screens ---------------------------------------------------------------

function showTitle() {
  applyTheme(null);
  const rp = P.resumePoint(app.progress);
  const club = clubById(rp.club);
  mount(screens.titleScreen({
    L,
    playSub: club ? `${club.manager.emoji} ${club.name} · ${L('hud.shift', 'Shift {n}', { n: rp.idx + 1 })}` : '',
    dailyStreak: P.currentStreak(app.progress, todayKey()),
    dailyNew: dailyIsNew(),
    onPlay: () => startShift(rp.club, rp.idx),
    onDaily: showDaily,
    onMap: showMap,
    onSettings: () => showSettings(),
  }), 'title');
}

function showMap() {
  applyTheme(null);
  const p = app.progress;
  mount(screens.mapScreen({
    L,
    clubs: CLUBS,
    dailyStreak: P.currentStreak(p, todayKey()),
    totalStars: P.totalStars(p),
    unlocked: (id) => P.clubUnlocked(p, id),
    shiftCount,
    starsInClub: (id) => P.starsInClub(p, id),
    starsFor: (id, i) => P.starsFor(p, id, i),
    isCleared: (id, i) => P.isCleared(p, id, i),
    nextShift: (id) => P.nextShift(p, id),
    lockInfo: (id) => P.lockInfo(p, id),
    clubName: (id) => clubById(id)?.name ?? '',
    canSkip: (id) => poki.isAvailable() && P.canUseUnlockSkip(p, id),
    onSkip: async (id) => {
      const ok = await rewarded();
      if (ok) {
        app.progress = P.useUnlockSkip(app.progress, id);
        persist();
        showMap();
      }
      return ok;
    },
    onShift: (club, idx) => startShift(club, idx),
    onDaily: showDaily,
    onBack: showTitle,
  }), 'map');
}

function showSettings(onClose) {
  const storageNote = app.save.isReadOnly?.()
    ? L('settings.readOnly', '')
    : app.save.isPersistent && !app.save.isPersistent() ? L('settings.storageOff', '') : '';
  const prevKeys = app.screen;
  openOverlay(screens.settingsOverlay({
    L,
    settings: app.settings,
    reducedNow: reducedNow(),
    storageNote,
    onChange: (patch) => {
      app.settings = { ...app.settings, ...patch };
      applySettings();
      try { app.save.saveSettings(app.settings); } catch { /* guarded */ }
    },
    onReset: () => {
      app.save.reset();
      app.progress = P.defaultProgress();
      app.progress.seenTutorial = true;
      persist();
    },
    onClose: () => {
      app.overlay = null;
      if (onClose) onClose();
      else if (prevKeys === 'title') showTitle();
      else if (prevKeys === 'map') showMap();
    },
  }));
}

// ---- rounds ----------------------------------------------------------------

function startShift(club, idx) {
  const level = levelAt(club, idx);
  if (!level) { showMap(); return; }
  const ctx = {
    mode: 'shift',
    club,
    idx,
    tutorial: club === 1 && idx === 0,
    firstOfClub: idx === 0,
  };
  runRound(S.createRound(level, { mode: 'shift' }), ctx);
}

function dailyInfo() {
  const key = todayKey();
  // Before the first Daily Door: an unscored sneak peek (never a real daily).
  const preview = key < P.DAILY_EPOCH;
  const level = preview ? P.dailyPreviewLevel() : P.dailyLevelFor(key);
  const dailyNo = preview ? 0 : P.dailyNo(key);
  return { key, level, preview, dailyNo };
}

function showDaily() {
  applyTheme(DAILY_CLUB);
  const d = dailyInfo();
  const p = app.progress;
  const played = !d.preview && P.playedDaily(p, d.key);
  const started = !d.preview && P.startedDaily(p, d.key);
  const dt = new Date();
  mount(screens.dailyScreen({
    L,
    available: !!d.level,
    preview: d.preview,
    played,
    started,
    playedScore: played ? p.daily.results[d.key] : null,
    dailyNo: d.dailyNo,
    streak: P.currentStreak(p, d.key),
    best: p.daily?.best | 0,
    monthDay: [dt.toLocaleString('en', { month: 'short', timeZone: 'UTC' }).toUpperCase(), String(dt.getUTCDate())],
    onPlay: () => startDaily(),
    onBack: showTitle,
  }), 'daily');
}

function startDaily() {
  const d = dailyInfo();
  if (!d.level) return;
  // One scored attempt per day: once begun (finished or not), replays are practice.
  const practice = d.preview || P.startedDaily(app.progress, d.key);
  if (!practice) {
    app.progress = P.markDailyStarted(app.progress, d.key);
    persist();
  }
  runRound(S.createRound(d.level, { mode: 'daily' }), {
    mode: 'daily', club: 0, idx: 0, dailyNo: d.dailyNo, key: d.key, preview: d.preview, practice,
  });
}

function runRound(round, ctx) {
  const club = ctx.mode === 'daily' ? DAILY_CLUB : clubById(ctx.club);
  applyTheme(club);
  app.round = round;
  app.ctx = ctx;
  if (app.view) { app.view.destroy(); app.view = null; }
  const view = createShiftView({
    round,
    club,
    ctx,
    L,
    describe,
    quoteFor,
    sel: S,
    step: (action) => {
      app.round = S.step(app.round, action);
      return app.round;
    },
    onEnd: (s) => endRound(s),
    onPause: () => openPause(),
    // after the ad, resume gameplay only if the player is really back in play
    // (not paused by a hidden tab, not on another screen, not in the demo)
    onRewardHint: () => rewarded().then((ok) => {
      if (app.view === view && view.canPlay()) gameplay(true);
      return ok;
    }),
    gameplay,
    adsAvailable: () => poki.isAvailable(),
  });
  app.view = view;
  mount(view.el, 'shift');
}

function endRound(s) {
  const ctx = app.ctx;
  gameplay(false);
  const club = ctx.mode === 'daily' ? DAILY_CLUB : clubById(ctx.club);
  const ruleText = describe(s.level.target);
  if (!app.progress.seenTutorial) {
    app.progress = { ...app.progress, seenTutorial: true };
  }

  if (ctx.mode === 'daily') {
    let share = '';
    if (!ctx.practice) {
      const max = s.level.guests.length - s.level.demoCount;
      const streakAfter = P.currentStreak(P.applyDaily(app.progress, ctx.key, s.correct, { max }), ctx.key);
      share = S.shareText(s, ctx.dailyNo, { streak: streakAfter });
      app.progress = P.applyDaily(app.progress, ctx.key, s.correct, { max, named: s.guessedRight === true, share });
    } else if (!ctx.preview) {
      // practice never overwrites the day's share: offer the first result instead
      share = app.progress.daily?.results?.[ctx.key]?.share || '';
    }
    persist();
    const streak = ctx.preview ? 0 : P.currentStreak(app.progress, ctx.key);
    mount(screens.dailyResultScreen({
      L,
      round: s,
      ruleText,
      streak,
      practice: !!ctx.practice,
      preview: !!ctx.preview,
      shareText: share,
      onMap: showMap,
      onHome: showTitle,
    }), 'dailyResult');
    return;
  }

  const wasUnlocked = CLUBS.map((c) => P.clubUnlocked(app.progress, c.id));
  app.progress = P.applyResult(app.progress, { club: ctx.club, idx: ctx.idx, stars: s.stars, outcome: s.outcome, correct: s.correct });
  persist();
  const newly = CLUBS.find((c, k) => !wasUnlocked[k] && P.clubUnlocked(app.progress, c.id));

  const retry = async () => {
    await maybeBreak(ctx.idx + 1, ctx.club);
    startShift(ctx.club, ctx.idx);
  };

  if (s.outcome === 'fired') {
    const nm = S.nearMiss(s);
    mount(screens.firedScreen({
      L,
      club,
      ruleText,
      // "N more and you had it" only means something when N is short of a full streak
      nearMissLine: nm.toWin < (s.level.win?.inRow ?? Infinity) ? nearMissLine(nm.toWin) : '',
      bestStreak: nm.bestStreak,
      canRevive: !s.revived && poki.isAvailable(),
      onRevive: async () => {
        const ok = await rewarded();
        if (!ok) return false;
        const revived = S.step(app.round, { type: 'revive' });
        if (revived === app.round) return false;
        runRound(revived, { ...ctx, tutorial: false, firstOfClub: false });
        return true;
      },
      onRetry: retry,
      onMap: showMap,
    }), 'fired');
    return;
  }

  const next = s.outcome === 'cleared' ? nextAfter(ctx.club, ctx.idx) : null;
  mount(screens.resultScreen({
    L,
    round: s,
    club,
    ruleText,
    hasNext: !!next,
    autoNext: !!next,
    unlockedMsg: newly ? L('result.clubUnlocked', '{club} is now open!', { club: newly.name }) : '',
    onNext: async () => {
      if (!next) return;
      await maybeBreak(next.idx + 1, next.club);
      startShift(next.club, next.idx);
    },
    onRetry: retry,
    onMap: showMap,
  }), 'result');
}

// ---- pause -----------------------------------------------------------------

function openPause() {
  if (!app.view || app.screen !== 'shift' || app.overlay) return;
  app.view.pause();
  const resume = () => {
    closeOverlay();
    app.pausedByHide = false;
    app.view?.resume();
  };
  openOverlay(screens.pauseOverlay({
    L,
    sound: app.settings.sound !== false,
    onSound: (v) => {
      app.settings = { ...app.settings, sound: v };
      applySettings();
      try { app.save.saveSettings(app.settings); } catch { /* guarded */ }
    },
    onResume: resume,
    onRetry: async () => {
      closeOverlay();
      gameplay(false);
      const { club, idx, mode } = app.ctx;
      if (mode === 'daily') { startDaily(); return; }
      await maybeBreak(idx + 1, club);
      startShift(club, idx);
    },
    onMap: () => { gameplay(false); showMap(); },
  }));
}

function onVisibility() {
  if (document.hidden) {
    audio.duck('hidden', true);
    if (app.screen === 'shift' && app.view && !app.overlay) {
      app.pausedByHide = true;
      openPause();
    }
  } else {
    audio.duck('hidden', false);
  }
}

// ---- boot ------------------------------------------------------------------

async function boot() {
  installInput(root);
  // null (blocked storage) makes save.js keep everything in memory
  app.save = createSave(getStorage());
  app.progress = app.save.load();
  app.settings = app.save.loadSettings();
  applySettings();

  let keysBeforeBreak = null;
  poki.setHooks?.({
    onBreakStart: () => {
      audio.duck('ad', true);
      keysBeforeBreak = getKeys();
      setKeys({});
      root.append(screens.adBlocker(L));
    },
    onBreakEnd: () => {
      audio.duck('ad', false);
      root.querySelectorAll('.ad-block').forEach((x) => x.remove());
      setKeys(keysBeforeBreak);
      keysBeforeBreak = null;
      focusGame(root);
    },
  });

  const unlock = () => audio.unlock();
  window.addEventListener('pointerdown', unlock, { capture: true });
  window.addEventListener('keydown', unlock, { capture: true });
  document.addEventListener('visibilitychange', onVisibility);

  await poki.init();
  poki.gameLoadingFinished();

  if (DEBUG) {
    window.__door = {
      get state() { return app.round; },
      get level() { return app.round?.level ?? null; },
      get screen() { return app.screen; },
      get progress() { return app.progress; },
      step: (action) => (app.view && app.screen === 'shift' ? app.view.act(action) : Promise.resolve(app.round)),
      start: (club, idx) => startShift(club, idx),
      daily: () => showDaily(),
      startDaily: () => startDaily(),
      map: () => showMap(),
      title: () => showTitle(),
    };
  }

  if (params.has('screen')) {
    const sc = params.get('screen');
    if (sc === 'map') return showMap();
    if (sc === 'daily') return showDaily();
    if (sc === 'title') return showTitle();
  }
  if (firstVisit()) startShift(1, 0);
  else showTitle();
}

boot().catch((e) => {
  console.error(e);
  root.replaceChildren(h('div', { class: 'screen boot-error' }, h('p', null, '🚪 Something jammed the door. Please reload.')));
});
