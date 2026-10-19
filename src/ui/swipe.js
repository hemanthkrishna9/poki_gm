// Input: pointer swipe on the card, keyboard map, iframe focus handling.

export const LOCK_MS = 250;

/**
 * Make a card draggable. Right = admit (+1), left = reject (-1).
 * @param {HTMLElement} card
 * @param {{canDrag:()=>boolean, onMove?:(dx:number, frac:number)=>void,
 *          onCommit:(dir:1|-1)=>void, onCancel?:()=>void}} o
 * @returns {() => void} detach
 */
export function attachSwipe(card, o) {
  let id = null;
  let x0 = 0;
  let y0 = 0;
  let dx = 0;
  let samples = [];

  const threshold = () => Math.max(80, card.getBoundingClientRect().width * 0.25);

  function down(e) {
    if (id !== null || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (!o.canDrag()) return;
    id = e.pointerId;
    x0 = e.clientX;
    y0 = e.clientY;
    dx = 0;
    samples = [{ x: e.clientX, t: e.timeStamp }];
    card.classList.remove('dragged');
    try { card.setPointerCapture(id); } catch { /* ignore */ }
  }

  function move(e) {
    if (e.pointerId !== id) return;
    dx = e.clientX - x0;
    const dy = e.clientY - y0;
    if (Math.abs(dx) > 6) {
      card.classList.add('dragging', 'dragged');
    }
    samples.push({ x: e.clientX, t: e.timeStamp });
    if (samples.length > 6) samples.shift();
    const frac = Math.max(-1, Math.min(1, dx / threshold()));
    card.style.transform = `translate(${dx}px, ${dy * 0.15}px) rotate(${dx * 0.05}deg)`;
    o.onMove?.(dx, frac);
  }

  function end(e, cancelled) {
    if (e.pointerId !== id) return;
    id = null;
    try { card.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    card.classList.remove('dragging');
    const a = samples[0];
    const b = samples[samples.length - 1];
    const v = a && b && b.t > a.t ? (b.x - a.x) / (b.t - a.t) : 0;
    const commit = !cancelled && (Math.abs(dx) > threshold() || (Math.abs(v) > 0.5 && Math.abs(dx) > 30 && Math.sign(v) === Math.sign(dx)));
    if (commit) {
      o.onCommit(dx > 0 ? 1 : -1);
    } else {
      card.style.transform = '';
      o.onMove?.(0, 0);
      o.onCancel?.();
    }
    dx = 0;
    // keep 'dragged' for this event loop so a click after a drag is ignored
    setTimeout(() => card.classList.remove('dragged'), 0);
  }

  const up = (e) => end(e, false);
  const cancel = (e) => end(e, true);
  const ctx = (e) => e.preventDefault();
  card.addEventListener('pointerdown', down);
  card.addEventListener('pointermove', move);
  card.addEventListener('pointerup', up);
  card.addEventListener('pointercancel', cancel);
  card.addEventListener('contextmenu', ctx);
  return () => {
    card.removeEventListener('pointerdown', down);
    card.removeEventListener('pointermove', move);
    card.removeEventListener('pointerup', up);
    card.removeEventListener('pointercancel', cancel);
    card.removeEventListener('contextmenu', ctx);
  };
}

const KEYMAP = {
  ArrowRight: 'admit', KeyD: 'admit',
  ArrowLeft: 'reject', KeyA: 'reject',
  KeyG: 'gotIt',
  KeyH: 'hint',
  Digit1: 'opt1', Digit2: 'opt2', Digit3: 'opt3', Digit4: 'opt4',
  Numpad1: 'opt1', Numpad2: 'opt2', Numpad3: 'opt3', Numpad4: 'opt4',
  Enter: 'continue', NumpadEnter: 'continue', Space: 'continue',
  Escape: 'pause',
};
const PREVENT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'PageUp', 'PageDown', 'Home', 'End']);

let handlers = {};
let installed = false;

/** Replace the active key handlers ({admit(), reject(), ..., opt(n), continue(), pause()}). */
export function setKeys(h) {
  handlers = h || {};
}
export function getKeys() {
  return handlers;
}

export function installInput(root) {
  if (installed) return;
  installed = true;
  document.addEventListener('keydown', (e) => {
    if (PREVENT.has(e.code) || e.key === ' ') e.preventDefault();
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    const tgt = e.target;
    if (tgt && (tgt.tagName === 'TEXTAREA' || tgt.tagName === 'INPUT')) return;
    const act = KEYMAP[e.code];
    if (!act) return;
    if (act.startsWith('opt')) {
      if (handlers.opt) { e.preventDefault(); handlers.opt(Number(act.slice(3)) - 1); }
      return;
    }
    // Enter/Space on a focused button: let the button handle it natively
    if (act === 'continue' && tgt && tgt.tagName === 'BUTTON' && tgt !== root) {
      e.preventDefault();
      tgt.click();
      return;
    }
    const fn = handlers[act];
    if (fn) { e.preventDefault(); fn(); }
  }, { capture: true });

  // Iframe focus: grab focus on first interaction and whenever focus drifts to <body>.
  const refocus = () => {
    if (document.activeElement === document.body || !document.activeElement) {
      try { root.focus({ preventScroll: true }); } catch { /* ignore */ }
    }
  };
  window.addEventListener('pointerdown', () => {
    try { window.focus(); } catch { /* ignore */ }
    setTimeout(refocus, 0);
  }, { capture: true });
  document.addEventListener('wheel', (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
  focusGame(root);
}

export function focusGame(root = document.getElementById('app')) {
  try { window.focus(); } catch { /* ignore */ }
  try { root?.focus({ preventScroll: true }); } catch { /* ignore */ }
}
