// Visual effects. All respect reduced motion (html[data-motion="reduced"]).
import { h, replay } from './dom.js';

export function reducedMotion() {
  return document.documentElement.dataset.motion === 'reduced';
}

export function shake(el) {
  if (!el || reducedMotion()) return;
  replay(el, 'fx-shake');
  setTimeout(() => el.classList.remove('fx-shake'), 260);
}

export function pop(el, cls = 'fx-pop') {
  if (!el) return;
  replay(el, cls);
}

/** Flash the whole screen ('ok' | 'bad'). Works with reduced motion (opacity only). */
export function flash(host, kind) {
  const f = h('div', { class: `fx-flash fx-flash-${kind}`, 'aria-hidden': 'true' });
  host.append(f);
  setTimeout(() => f.remove(), 450);
}

const CONFETTI = ['#FF5DA2', '#FFC93C', '#3A86FF', '#2BD46B', '#FF9F1C', '#8338EC', '#00F5D4'];

export function confetti(host, { count = 60, emoji = null } = {}) {
  if (!host || reducedMotion()) return;
  const layer = h('div', { class: 'fx-confetti', 'aria-hidden': 'true' });
  for (let i = 0; i < count; i++) {
    const isEmoji = emoji && i % 4 === 0;
    const p = h('i', { class: isEmoji ? 'cf cf-emoji' : 'cf' }, isEmoji ? emoji : null);
    const x = Math.random() * 100;
    p.style.left = `${x}%`;
    p.style.setProperty('--dx', `${(Math.random() - 0.5) * 240}px`);
    p.style.setProperty('--rot', `${(Math.random() - 0.5) * 1080}deg`);
    p.style.setProperty('--dur', `${1.4 + Math.random() * 1.2}s`);
    p.style.setProperty('--delay', `${Math.random() * 0.25}s`);
    if (!isEmoji) {
      p.style.background = CONFETTI[i % CONFETTI.length];
      p.style.width = `${6 + Math.random() * 6}px`;
      p.style.height = `${8 + Math.random() * 10}px`;
    }
    layer.append(p);
  }
  host.append(layer);
  setTimeout(() => layer.remove(), 3000);
}

/** Text that floats up from an element, e.g. "+1" or "🔥 3". */
export function floatText(host, text, cls = '') {
  if (!host) return;
  const el = h('div', { class: `fx-float ${cls}`, 'aria-hidden': 'true' }, text);
  host.append(el);
  setTimeout(() => el.remove(), 1100);
}
