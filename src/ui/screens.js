// Non-shift screens: title, club map, result, fired, daily, settings, pause.
// Each builder returns an element; main.js mounts it and wires callbacks.

import { h, replay, wait } from './dom.js';
import { setKeys, focusGame } from './swipe.js';
import * as audio from './audio.js';
import * as fx from './fx.js';
import { copyText } from './share.js';

const click = (fn) => (e) => { audio.play('click'); fn(e); };

function btn(label, onclick, cls = '') {
  return h('button', { class: `btn ${cls}`, onclick: click(onclick) }, label);
}

/** 🎬 rewarded-ad button (purple, never green). */
function adBtn(label, onclick, failText = 'No ad right now') {
  const b = h('button', { class: 'btn btn-ad' }, label);
  b.addEventListener('click', async () => {
    if (b.disabled) return;
    audio.play('click');
    b.disabled = true;
    const ok = await onclick();
    if (!ok && b.isConnected) {
      b.classList.add('failed');
      b.textContent = failText;
    }
  });
  return b;
}

// ---- title -----------------------------------------------------------------

export function titleScreen(a) {
  const { L } = a;
  const streak = a.dailyStreak;
  const el = h('div', { class: 'screen title' },
    h('div', { class: 'title-sky', 'aria-hidden': 'true' },
      ...['✨', '🪩', '⭐', '✨', '🎶', '⭐'].map((e, i) => h('span', { class: `sky sky-${i}` }, e))),
    h('div', { class: 'marquee' },
      h('h1', { class: 'logo' }, h('span', { class: 'logo-a' }, 'DOOR'), h('span', { class: 'logo-b' }, 'POLICY')),
      h('p', { class: 'tagline' }, L('game.tagline', 'Crack the secret rule. Work the door.'))),
    h('div', { class: 'title-scene', 'aria-hidden': 'true' },
      h('div', { class: 'title-door' }, h('span', { class: 'door-sign' }, 'VIP'), h('i', { class: 'door-knob' })),
      h('div', { class: 'title-bouncer' }, '🐻'),
      h('div', { class: 'title-queue' }, ...['🎩', '🐶', '🎈'].map((e, i) => h('span', { class: `q q-${i}` }, e)))),
    h('nav', { class: 'menu' },
      h('button', { class: 'btn btn-primary btn-big', onclick: click(a.onPlay) },
        h('span', null, '▶ ' + L('btn.play', 'Play')),
        a.playSub ? h('small', null, a.playSub) : null),
      h('button', { class: 'btn btn-daily' + (a.dailyNew ? ' is-new' : ''), onclick: click(a.onDaily) },
        '📅 ' + L('btn.daily', 'Daily Door'),
        h('span', { class: 'flame' + (streak > 0 ? '' : ' cold') }, `🔥${streak | 0}`),
        a.dailyNew ? h('span', { class: 'badge-new' }, L('daily.new', 'NEW')) : null),
      h('div', { class: 'menu-row' },
        btn('🗺️ ' + L('btn.map', 'Map'), a.onMap),
        h('button', { class: 'btn btn-icon', 'aria-label': L('btn.settings', 'Settings'), onclick: click(a.onSettings) }, '⚙️'))));
  setKeys({ continue: a.onPlay });
  return el;
}

// ---- map -------------------------------------------------------------------

export function mapScreen(a) {
  const { L, clubs } = a;
  const list = h('div', { class: 'street' });

  list.append(h('button', { class: 'facade daily-facade', onclick: click(a.onDaily) },
    h('span', { class: 'facade-emoji' }, '📅'),
    h('span', { class: 'facade-main' }, h('b', null, L('daily.title', 'Daily Door')), h('small', null, L('daily.intro', ''))),
    a.dailyStreak > 0 ? h('span', { class: 'flame' }, `🔥${a.dailyStreak}`) : h('span', { class: 'flame' }, '🚪')));

  for (const c of clubs) {
    const unlocked = a.unlocked(c.id);
    const n = a.shiftCount(c.id);
    const style = { '--c-bg': c.colors.bg, '--c-accent': c.colors.accent, '--c-door': c.colors.door, '--c-text': c.colors.text };
    const have = a.starsInClub(c.id);
    const head = h('div', { class: 'facade-head' },
      h('span', { class: 'facade-emoji' }, c.manager.emoji),
      h('span', { class: 'facade-main' }, h('b', null, c.name), h('small', null, `${c.manager.name} · ${c.decor.join(' ')}`)),
      h('span', { class: 'facade-stars' }, `★ ${have}/${n * 3}`));
    const f = h('section', { class: 'facade' + (unlocked ? '' : ' locked'), style }, head);
    if (!n) {
      f.append(h('p', { class: 'facade-note' }, L('map.comingSoon', 'Coming soon')));
    } else if (!unlocked) {
      const info = a.lockInfo(c.id);
      const reasons = [];
      if (info?.needShift10) reasons.push(L('map.lockShift10', 'Clear shift 10 of {club}', { club: a.clubName(info.prev) }));
      if (info?.needStars) reasons.push(L('map.lockStars', 'Earn {need} stars', { need: info.need, club: a.clubName(info.prev), have: info.have }));
      f.append(h('div', { class: 'lock' }, h('span', { class: 'lock-ico' }, '🔒'), h('p', null, reasons.join(' · ') || L('map.locked', 'Locked'))));
      if (a.canSkip(c.id)) {
        f.append(h('div', { class: 'equal-row' },
          adBtn(L('ad.bribe', '🎬 Watch ad: bribe the doorman'), () => a.onSkip(c.id), L('ad.none', 'No ad right now'))));
      }
    } else {
      const next = a.nextShift(c.id);
      const dots = h('div', { class: 'dots' });
      for (let i = 0; i < n; i++) {
        const stars = a.starsFor(c.id, i);
        const cleared = a.isCleared(c.id, i);
        const open = i <= next || cleared;
        const special = i === 8;
        const d = h('button', {
          class: 'dot' + (cleared ? ' cleared' : '') + (i === next && !cleared ? ' next' : '') + (special ? ' special' : ''),
          disabled: !open,
          'aria-label': `${L('map.shift', 'Shift {n}', { n: i + 1 })}${cleared ? `, ${stars} ★` : ''}`,
          onclick: click(() => a.onShift(c.id, i)),
        },
        h('b', null, special ? '🌟' : String(i + 1)),
        h('small', null, cleared ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : open ? '▶' : '🔒'));
        dots.append(d);
      }
      f.append(dots);
    }
    list.append(f);
  }

  const el = h('div', { class: 'screen map' },
    h('header', { class: 'bar' },
      h('button', { class: 'btn btn-icon', 'aria-label': L('btn.back', 'Back'), onclick: click(a.onBack) }, '←'),
      h('h1', null, '🗺️ ' + L('map.title', 'The Street')),
      h('span', { class: 'bar-stars' }, `★ ${a.totalStars}`)),
    list);
  setKeys({ pause: a.onBack });
  setTimeout(() => el.querySelector('.dot.next')?.scrollIntoView?.({ block: 'center' }), 30);
  return el;
}

// ---- result / fired --------------------------------------------------------

/** Wrap navigation callbacks so a double tap (or tap + countdown) fires once. */
function once(a, keys) {
  let done = false;
  const out = { ...a };
  for (const k of keys) {
    if (typeof a[k] !== 'function') continue;
    out[k] = (...args) => {
      if (done) return undefined;
      done = true;
      return a[k](...args);
    };
  }
  return out;
}

export function resultScreen(a0) {
  const a = once(a0, ['onNext', 'onRetry', 'onMap']);
  const { L, round: s, club } = a;
  const cleared = s.outcome === 'cleared';
  const starRow = h('div', { class: 'stars-row', 'aria-label': L('result.stars', '{n}/3 stars', { n: s.stars }) },
    ...[0, 1, 2].map(() => h('span', { class: 'big-star' }, '★')));
  const reasons = cleared ? h('ul', { class: 'reasons' },
    reason(true, L('result.star.clear', 'Cleared the shift')),
    reason(s.strikes <= 1, L('result.star.strikes', 'One strike or fewer')),
    reason(s.guessedRight === true, L('result.star.named', 'Named the rule'))) : null;
  const namedAt = cleared && s.namedAt != null ? h('p', { class: 'sub named-at' }, L('result.namedAt', '🧠 Named at guest #{n}', { n: s.namedAt })) : null;

  const countdownText = h('span', { class: 'countdown' });
  let timer = null;
  let cancelled = false;
  const cancel = () => {
    if (cancelled) return;
    cancelled = true;
    clearInterval(timer);
    countdownText.textContent = '';
    stayBtn.hidden = true;
  };
  const nextBtn = a.hasNext ? h('button', { class: 'btn btn-primary btn-big', onclick: click(() => { cancel(); a.onNext(); }) },
    h('span', null, L('btn.next', 'Next shift ▶')), countdownText) : null;
  const stayBtn = h('button', { class: 'btn btn-ghost btn-small', onclick: click(cancel) }, L('btn.cancel', 'Cancel'));

  const el = h('div', { class: 'screen result' + (cleared ? ' is-cleared' : ' is-out') },
    h('div', { class: 'panel' },
      h('div', { class: 'mgr-big' }, club.manager.emoji),
      h('h1', null, cleared ? L('result.cleared', 'Shift cleared!') : L('result.out', 'Out of guests!')),
      cleared ? starRow : h('p', { class: 'sub' }, L('result.outSub', '')),
      reasons,
      namedAt,
      h('p', { class: 'rule-reveal' }, h('small', null, L('result.rule', 'The rule: {rule}', { rule: '' }).replace(/\s*$/, '')), h('b', null, a.ruleText)),
      cleared ? h('p', { class: 'quip' }, `“${club.quips?.win || ''}”`) : null,
      a.unlockedMsg ? h('p', { class: 'unlock-msg' }, a.unlockedMsg) : null,
      nextBtn,
      nextBtn && a.autoNext ? stayBtn : null,
      h('div', { class: 'equal-row' },
        btn('↻ ' + L('btn.retry', 'Retry'), () => { cancel(); a.onRetry(); }, cleared ? '' : 'btn-primary'),
        btn('🗺️ ' + L('btn.map', 'Map'), () => { cancel(); a.onMap(); }, cleared && !a.hasNext ? 'btn-primary' : ''))));

  el.addEventListener('pointerdown', (e) => { if (!e.target.closest('.btn-primary')) cancel(); }, { capture: true });
  // never auto-advance behind the player's back: hiding the tab cancels the countdown
  const onHidden = () => {
    if (!el.isConnected) { document.removeEventListener('visibilitychange', onHidden); return; }
    if (document.hidden) cancel();
  };
  document.addEventListener('visibilitychange', onHidden);
  setKeys({
    continue: () => { cancel(); (a.hasNext ? a.onNext : a.onRetry)(); },
    pause: () => { if (!cancelled && a.autoNext) cancel(); else a.onMap(); },
  });

  (async () => {
    await wait(250);
    if (cleared) {
      const stars = [...starRow.children];
      for (let k = 0; k < 3; k++) {
        if (!el.isConnected) return;
        if (k < s.stars) {
          stars[k].classList.add('on');
          replay(stars[k], 'fx-star');
          audio.play('star', { n: k });
          await wait(fx.reducedMotion() ? 120 : 330);
        }
      }
      if (s.stars === 3) fx.confetti(el, { count: 80, emoji: '⭐' });
    }
    if (nextBtn && a.autoNext && !cancelled) {
      let n = 3;
      countdownText.textContent = ` ${n}`;
      if (document.hidden) { cancel(); return; }
      timer = setInterval(() => {
        if (cancelled || !el.isConnected) { clearInterval(timer); return; }
        if (document.hidden) { cancel(); return; }
        n -= 1;
        if (n <= 0) { cancel(); a.onNext(); return; }
        countdownText.textContent = ` ${n}`;
        audio.play('click');
      }, 1000);
    }
  })();
  return el;
}

function reason(ok, text) {
  return h('li', { class: ok ? 'ok' : 'no' }, h('span', { class: 'mark' }, ok ? '✓' : '✗'), text);
}

export function firedScreen(a0) {
  const a = once(a0, ['onRetry', 'onMap']);
  const { L, club } = a;
  const offerRevive = a.canRevive;
  const rule = h('b', { class: offerRevive ? 'spoiler' : '' }, a.ruleText);
  const reviveBtn = offerRevive ? adBtn(L('ad.revive', '🎬 Watch ad: second chance'), a.onRevive, L('ad.none', 'No ad right now')) : null;
  if (offerRevive) {
    rule.title = L('fired.peek', 'Tap to peek');
    rule.addEventListener('click', () => {
      rule.classList.remove('spoiler');
      reviveBtn?.remove();
    });
  }
  const el = h('div', { class: 'screen fired' },
    h('div', { class: 'panel' },
      h('div', { class: 'mgr-big sad' }, club.manager.emoji, h('span', { class: 'clip' }, '📋')),
      h('h1', { class: 'fired-title' }, L('fired.title', "You're fired!")),
      h('p', { class: 'quip' }, `“${club.quips?.fired || ''}”`),
      a.nearMissLine ? h('p', { class: 'near-miss' }, a.nearMissLine) : null,
      a.bestStreak > 0 ? h('p', { class: 'sub' }, L('fired.bestStreak', 'Best streak: {n}', { n: a.bestStreak })) : null,
      h('p', { class: 'rule-reveal' }, h('small', null, L('fired.trueRule', 'The rule was: {rule}', { rule: '' }).trim()), rule,
        offerRevive ? h('small', { class: 'peek-note' }, L('fired.peekNote', '(tap to peek: ends the second chance)')) : null),
      h('div', { class: 'equal-row' },
        reviveBtn,
        btn('↻ ' + L('btn.retry', 'Retry'), a.onRetry, offerRevive ? '' : 'btn-primary')),
      btn('🗺️ ' + L('btn.map', 'Map'), a.onMap, 'btn-ghost btn-small')));
  audio.play('fired');
  setKeys({ continue: a.onRetry, pause: a.onMap });
  return el;
}

// ---- daily -----------------------------------------------------------------

function untilUtcMidnight() {
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  const ms = Math.max(0, next - now.getTime());
  const hh = Math.floor(ms / 3600000);
  const mm = Math.floor((ms % 3600000) / 60000);
  const ss = Math.floor((ms % 60000) / 1000);
  return `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

function nextDoorClock(L) {
  const t = h('span', { class: 'clock' });
  const tick = () => {
    if (!t.isConnected && t._started) { clearInterval(t._iv); return; }
    t._started = true;
    t.textContent = L('daily.nextIn', 'Next door in {time}', { time: untilUtcMidnight() });
  };
  tick();
  t._iv = setInterval(tick, 1000);
  return t;
}

export function dailyScreen(a) {
  const { L } = a;
  const body = [];
  if (!a.available) {
    body.push(h('p', { class: 'sub' }, L('daily.notYet', 'The first Daily Door opens soon.')));
  } else if (a.played || a.started) {
    // Already begun today: the score (if any) stands; replays are practice.
    body.push(h('p', { class: 'sub' }, a.played ? L('daily.played', "You've played today's door.") : L('daily.walkedOut', "You walked out of today's door. Replays are practice.")));
    if (a.playedScore) body.push(h('p', { class: 'big-score' }, `${a.playedScore.score}/${a.playedScore.max}`));
    body.push(h('p', null, nextDoorClock(L)));
    body.push(h('button', { class: 'btn btn-ghost', onclick: click(a.onPlay) }, '🔁 ' + L('daily.practiceBtn', 'Practice')));
  } else {
    body.push(h('p', { class: 'sub' }, L('daily.intro', 'One rule for everyone today. 12 guests. No hints.')));
    if (a.preview) body.push(h('p', { class: 'note' }, L('daily.previewNote', '👀 Sneak peek: this one is not scored.')));
    body.push(h('button', { class: 'btn btn-primary btn-big', onclick: click(a.onPlay) }, '🚪 ' + L('btn.play', 'Play')));
  }
  const el = h('div', { class: 'screen daily' },
    h('header', { class: 'bar' },
      h('button', { class: 'btn btn-icon', 'aria-label': L('btn.back', 'Back'), onclick: click(a.onBack) }, '←'),
      h('h1', null, '📅 ' + L('daily.title', 'Daily Door')),
      h('span', { class: 'bar-stars' }, a.streak > 0 ? `🔥${a.streak}` : '')),
    h('div', { class: 'panel' },
      h('div', { class: 'calendar' }, h('small', null, a.monthDay[0]), h('b', null, a.monthDay[1])),
      h('h2', null, a.preview ? `👀 ${L('hud.sneakPeek', 'Sneak peek')}` : L('daily.number', 'Daily Door #{n}', { n: a.dailyNo })),
      h('p', { class: 'streak-line' }, L('daily.streak', '🔥 {n} day streak', { n: a.streak }), ' · ', L('daily.best', 'Best streak: {n}', { n: a.best })),
      ...body));
  setKeys({ continue: () => (a.available && !a.played && !a.started ? a.onPlay() : null), pause: a.onBack });
  return el;
}

export function dailyResultScreen(a) {
  const { L, round: s } = a;
  const max = s.level.guests.length - s.level.demoCount;
  // Practice runs never overwrite the day's share: the button copies the first result.
  const shareText = a.shareText || '';
  const pre = shareText ? h('pre', { class: 'share-text' }, shareText) : null;
  const status = h('span', { class: 'copy-status', role: 'status' });
  const share = h('button', { class: 'btn btn-primary', onclick: click(async () => {
    const ok = await copyText(shareText);
    status.textContent = ok ? L('daily.copied', 'Copied!') : L('daily.copyFailed', 'Select the text and copy it');
    if (!ok && pre) {
      const r = document.createRange();
      r.selectNodeContents(pre);
      const selObj = getSelection();
      selObj.removeAllRanges();
      selObj.addRange(r);
    }
    replay(status, 'fx-pop');
  }) }, '📋 ' + (a.practice ? L('daily.shareFirst', "Copy today's result") : L('btn.share', 'Copy result')));
  const el = h('div', { class: 'screen result daily-result' },
    h('div', { class: 'panel' },
      h('div', { class: 'mgr-big' }, '🚪'),
      a.practice ? h('p', { class: 'practice-tag' }, a.preview ? L('hud.sneakPeek', 'Sneak peek') : L('daily.practice', 'Practice run')) : null,
      h('h1', null, L('daily.score', 'You scored {n}/{max}', { n: s.correct, max })),
      a.practice ? h('p', { class: 'note' }, a.preview ? L('daily.previewNote', 'Sneak peek: not scored.') : L('daily.practiceNote', 'Practice: not scored. Your first result stands.')) : null,
      h('p', { class: 'rule-reveal' }, h('small', null, L('result.rule', 'The rule: {rule}', { rule: '' }).trim()), h('b', null, a.ruleText)),
      s.guessedRight ? h('p', { class: 'sub' }, '🧠 ' + L('share.named', 'Rule named!')) : null,
      pre,
      shareText ? h('div', { class: 'share-row' }, share, status) : null,
      a.streak > 0 ? h('p', { class: 'streak-line' }, L('daily.streak', '🔥 {n} day streak', { n: a.streak })) : null,
      h('p', null, nextDoorClock(L)),
      h('div', { class: 'equal-row' },
        btn('🗺️ ' + L('btn.map', 'Map'), a.onMap),
        btn('🏠 ' + L('game.title', 'Door Policy'), a.onHome))));
  if (s.correct >= max - 1) setTimeout(() => fx.confetti(el, { count: 70 }), 200);
  setKeys({ continue: () => (shareText ? share.click() : a.onMap()), pause: a.onMap });
  return el;
}

// ---- overlays --------------------------------------------------------------

function toggle(label, on, onChange) {
  const b = h('button', { class: 'toggle' + (on ? ' on' : ''), role: 'switch', 'aria-checked': String(on) },
    h('span', { class: 'toggle-label' }, label), h('span', { class: 'toggle-track' }, h('i')));
  b.addEventListener('click', () => {
    on = !on;
    b.classList.toggle('on', on);
    b.setAttribute('aria-checked', String(on));
    audio.play('click');
    onChange(on);
  });
  return b;
}

export function settingsOverlay(a) {
  const { L, settings } = a;
  let confirmStep = false;
  const resetBtn = h('button', { class: 'btn btn-danger btn-small' }, '🗑️ ' + L('settings.reset', 'Reset progress'));
  const note = h('p', { class: 'note' });
  resetBtn.addEventListener('click', () => {
    audio.play('click');
    if (!confirmStep) {
      confirmStep = true;
      note.textContent = L('settings.resetConfirm', 'Erase all stars and streaks? This cannot be undone.');
      resetBtn.textContent = '⚠️ ' + L('btn.confirm', 'Confirm');
      return;
    }
    a.onReset();
    note.textContent = L('settings.resetDone', 'Progress reset');
    resetBtn.disabled = true;
  });
  const close = () => { ov.remove(); a.onClose(); };
  const ov = h('div', { class: 'overlay modal-wrap', role: 'dialog', 'aria-modal': 'true' },
    h('div', { class: 'modal' },
      h('h2', null, '⚙️ ' + L('settings.title', 'Settings')),
      toggle('🔊 ' + L('settings.sound', 'Sound'), settings.sound, (v) => a.onChange({ sound: v })),
      toggle('🌀 ' + L('settings.reducedMotion', 'Reduced motion'), a.reducedNow, (v) => a.onChange({ reducedMotion: v })),
      toggle('🎨 ' + L('settings.colorBlind', 'Colour-blind labels'), settings.colorBlind, (v) => a.onChange({ colorBlind: v })),
      a.storageNote ? h('p', { class: 'note' }, a.storageNote) : null,
      h('div', { class: 'controls-help' },
        h('b', null, L('controls.title', 'Controls')),
        h('ul', null, ...['controls.admit', 'controls.reject', 'controls.gotIt', 'controls.continue', 'controls.pause'].map((k) => h('li', null, L(k, k))))),
      resetBtn, note,
      h('button', { class: 'btn btn-primary', onclick: click(close) }, L('btn.close', 'Close'))));
  ov.addEventListener('pointerdown', (e) => { if (e.target === ov) close(); });
  setKeys({ pause: close });
  return ov;
}

export function pauseOverlay(a) {
  const { L } = a;
  const ov = h('div', { class: 'overlay modal-wrap pause-wrap', role: 'dialog', 'aria-modal': 'true' },
    h('div', { class: 'modal' },
      h('h2', null, '⏸ ' + L('pause.title', 'Paused')),
      h('button', { class: 'btn btn-primary btn-big', onclick: click(a.onResume) }, '▶ ' + L('btn.resume', 'Resume')),
      toggle('🔊 ' + L('settings.sound', 'Sound'), a.sound, (v) => a.onSound(v)),
      h('div', { class: 'equal-row' },
        btn('↻ ' + L('btn.retry', 'Retry'), a.onRetry),
        btn('🗺️ ' + L('btn.map', 'Map'), a.onMap)),
      h('p', { class: 'note' }, L('pause.hint', 'Press Esc to resume'))));
  setKeys({ pause: a.onResume, continue: a.onResume });
  setTimeout(() => focusGame(), 0);
  return ov;
}

/** Full-screen blocker shown while an ad plays. */
export function adBlocker(L) {
  return h('div', { class: 'overlay ad-block', 'aria-hidden': 'true' }, h('p', null, '🎬 ' + L('ad.breakTitle', 'Quick break…')));
}
