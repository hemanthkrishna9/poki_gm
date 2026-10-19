// WebAudio synthesized SFX. No audio files. The context is created on the
// first user gesture. Muted while an ad plays, while the tab is hidden, or
// when sound is off in settings.

let ctx = null;
let master = null;
let enabled = true;
const ducks = new Set();
let noiseBuf = null;

function ensure() {
  if (ctx) return ctx;
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    let seed = 1;
    for (let i = 0; i < d.length; i++) {
      seed = (seed * 16807) % 2147483647;
      d[i] = (seed / 2147483647) * 2 - 1;
    }
  } catch {
    ctx = null;
  }
  applyGain();
  return ctx;
}

function audible() {
  return enabled && ducks.size === 0;
}

function applyGain() {
  if (!ctx || !master) return;
  const on = audible();
  try {
    master.gain.setTargetAtTime(on ? 0.55 : 0, ctx.currentTime, 0.02);
    if (on && ctx.state === 'suspended') ctx.resume().catch(() => {});
    if (!on && ducks.size && ctx.state === 'running') ctx.suspend().catch(() => {});
  } catch { /* ignore */ }
}

/** Call from a user gesture to start / resume the context. */
export function unlock() {
  const c = ensure();
  if (c && c.state === 'suspended' && audible()) c.resume().catch(() => {});
}

export function setEnabled(on) {
  enabled = !!on;
  applyGain();
}
export function isEnabled() {
  return enabled;
}

/** Mute for a reason ('ad', 'hidden', ...) until released. */
export function duck(reason, on) {
  if (on) ducks.add(reason);
  else ducks.delete(reason);
  applyGain();
}

// ---- building blocks ------------------------------------------------------

function env(g, t, a, peak, dec) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
}

function tone(type, freq, t, dur, peak = 0.3, to = null, dest = master) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  env(g, t, 0.005, peak, dur);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + dur + 0.05);
  return o;
}

function noise(t, dur, filter, peak = 0.4) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const g = ctx.createGain();
  env(g, t, 0.003, peak, dur);
  src.connect(filter).connect(g).connect(master);
  src.start(t);
  src.stop(t + dur + 0.05);
}

const SOUNDS = {
  stamp(t) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 400;
    noise(t, 0.09, f, 0.7);
    tone('sine', 90, t, 0.16, 0.6, 50);
  },
  correct(t, { streak = 0 } = {}) {
    const base = 523.25 * Math.pow(2, Math.min(streak, 12) / 12);
    tone('triangle', base, t, 0.18, 0.28);
    tone('triangle', base * 1.5, t + 0.08, 0.28, 0.24);
  },
  wrong(t) {
    tone('square', 110, t, 0.22, 0.18, 70);
    tone('square', 116, t, 0.22, 0.12, 74);
  },
  whoosh(t) {
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.2;
    f.frequency.setValueAtTime(2000, t);
    f.frequency.exponentialRampToValueAtTime(300, t + 0.25);
    noise(t, 0.25, f, 0.35);
  },
  cheer(t) {
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 900;
    f.Q.value = 2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    f.connect(g).connect(master);
    [0, 7, -5, 12].forEach((d, i) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(220 * Math.pow(2, d / 12) * (1 + i * 0.004), t);
      o.frequency.linearRampToValueAtTime(260 * Math.pow(2, d / 12), t + 0.6);
      o.connect(f);
      o.start(t);
      o.stop(t + 1);
    });
  },
  strike(t) {
    tone('sine', 80, t, 0.25, 0.7, 40);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 800;
    noise(t, 0.12, f, 0.35);
  },
  fired(t) {
    SOUNDS.strike(t);
    [392, 370, 349].forEach((n, i) => {
      const s = t + 0.25 + i * 0.32;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(1600, s);
      f.frequency.exponentialRampToValueAtTime(300, s + (i === 2 ? 0.7 : 0.28));
      f.connect(master);
      tone('sawtooth', n, s, i === 2 ? 0.7 : 0.28, 0.16, i === 2 ? n * 0.85 : null, f);
    });
  },
  star(t, { n = 0 } = {}) {
    const notes = [659.25, 783.99, 987.77, 1318.5];
    tone('triangle', notes[n % 4], t, 0.3, 0.26);
    tone('sine', notes[n % 4] * 2, t, 0.2, 0.08);
  },
  win(t) {
    [523.25, 659.25, 783.99, 1046.5].forEach((n, i) => tone('triangle', n, t + i * 0.08, 0.3, 0.22));
  },
  click(t) {
    tone('square', 1500, t, 0.012, 0.12);
  },
  pop(t) {
    tone('sine', 600, t, 0.08, 0.25, 1200);
  },
  woof(t) {
    tone('sawtooth', 300, t, 0.12, 0.2, 160);
    tone('sawtooth', 280, t + 0.18, 0.14, 0.2, 140);
  },
};

/** Play a named SFX. Silently does nothing if audio is unavailable or muted. */
export function play(name, opts) {
  if (!audible() || !ctx) return; // context is only created by unlock() on a gesture
  const c = ctx;
  if (!c || c.state !== 'running') {
    if (c && c.state === 'suspended') c.resume().catch(() => {});
    if (!c || c.state !== 'running') return;
  }
  const fn = SOUNDS[name];
  if (!fn) return;
  try {
    fn(c.currentTime + 0.01, opts);
  } catch { /* ignore */ }
}

export function vibrate(ms) {
  try { navigator.vibrate?.(ms); } catch { /* ignore */ }
}
