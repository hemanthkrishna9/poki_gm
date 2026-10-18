'use strict';

const W = 960, H = 640;
const HINT_COST = 25, SKIP_COST = 50, REWARD = 50, CLEAR_BONUS = 5;
const $ = (s) => document.querySelector(s);
const stage = $('#stage');
let scale = 1;

// ---------- persistence ----------
const Save = {
  data: { unlocked: 1, cleared: [], bulbs: 50, muted: false },
  load() {
    try { Object.assign(this.data, JSON.parse(localStorage.getItem('trickytaps') || '{}')); } catch (e) {}
  },
  save() {
    try { localStorage.setItem('trickytaps', JSON.stringify(this.data)); } catch (e) {}
  },
};

// ---------- sound (tiny WebAudio beeps, no asset files) ----------
const Sfx = {
  ctx: null,
  muted: false,
  tunes: {
    tap: [[520, 0.06]],
    pop: [[900, 0.05], [1300, 0.04]],
    wrong: [[220, 0.12], [160, 0.18]],
    win: [[523, 0.1], [659, 0.1], [784, 0.1], [1046, 0.3]],
  },
  play(name) {
    if (this.muted || Save.data.muted) return;
    try {
      this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
      const c = this.ctx;
      let t = c.currentTime;
      for (const [f, d] of this.tunes[name]) {
        const o = c.createOscillator(), g = c.createGain();
        o.type = name === 'wrong' ? 'square' : 'triangle';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.12, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + d);
        o.connect(g).connect(c.destination);
        o.start(t); o.stop(t + d);
        t += d * 0.9;
      }
    } catch (e) {}
  },
};

// ---------- Poki SDK wrapper (no-ops when the SDK is absent, e.g. local dev) ----------
const Poki = {
  playing: false,
  sdk() { return window.PokiSDK; },
  async init() {
    const s = this.sdk();
    if (!s) return;
    try { await s.init(); } catch (e) { /* adblock etc. — game must still work */ }
    if (location.hostname === 'localhost' || location.protocol === 'file:') {
      try { s.setDebug(true); } catch (e) {}
    }
  },
  loaded() { try { this.sdk()?.gameLoadingFinished(); } catch (e) {} },
  start() {
    if (this.playing) return;
    this.playing = true;
    try { this.sdk()?.gameplayStart(); } catch (e) {}
  },
  stop() {
    if (!this.playing) return;
    this.playing = false;
    try { this.sdk()?.gameplayStop(); } catch (e) {}
  },
  async commercial() {
    const s = this.sdk();
    if (!s) return;
    Sfx.muted = true;
    try { await s.commercialBreak(); } catch (e) {}
    Sfx.muted = false;
  },
  async rewarded() {
    const s = this.sdk();
    if (!s) return true; // local dev: pretend the ad was watched
    Sfx.muted = true;
    let ok = false;
    try { ok = await s.rewardedBreak(); } catch (e) {}
    Sfx.muted = false;
    return ok;
  },
};

// ---------- layout ----------
function fit() {
  scale = Math.min(innerWidth / W, innerHeight / H);
  $('#app').style.transform = `translate(-50%, -50%) scale(${scale})`;
}

function toStage(e) {
  const r = stage.getBoundingClientRect();
  return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
}

// ---------- level API handed to each level's setup() ----------
function makeApi() {
  const api = {
    done: false,
    stage,

    // Place an element (SVG/HTML string) on the stage at logical coords.
    put(html, x, y, w, h, o = {}) {
      const d = document.createElement('div');
      d.className = 'obj ' + (o.cls || '');
      Object.assign(d.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px', zIndex: o.z || 1 });
      d.innerHTML = html;
      stage.appendChild(d);
      if (o.tap) api.tap(d, o.tap);
      return d;
    },

    tap(el, fn) {
      el.classList.add('tap');
      el.addEventListener('pointerdown', (e) => {
        if (api.done) return;
        e.stopPropagation();
        Sfx.play('tap');
        fn(e, el);
      });
    },

    // onDrop(el, back) — call back() to return the element to where the drag started.
    drag(el, o = {}) {
      el.classList.add('drag');
      el.addEventListener('pointerdown', (e) => {
        if (api.done) return;
        e.preventDefault(); e.stopPropagation();
        const p0 = toStage(e);
        const ox = parseFloat(el.style.left), oy = parseFloat(el.style.top);
        const oz = el.style.zIndex;
        let moved = false;
        el.setPointerCapture(e.pointerId);
        el.style.zIndex = o.z || 60;
        const move = (ev) => {
          const p = toStage(ev);
          const dx = p.x - p0.x, dy = p.y - p0.y;
          if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;
          el.style.left = ox + dx + 'px';
          el.style.top = oy + dy + 'px';
          if (o.onMove && !api.done) o.onMove(el);
        };
        const up = () => {
          el.removeEventListener('pointermove', move);
          el.removeEventListener('pointerup', up);
          el.removeEventListener('pointercancel', up);
          el.style.zIndex = o.keepZ ? el.style.zIndex : oz;
          const back = () => { el.style.left = ox + 'px'; el.style.top = oy + 'px'; };
          if (api.done) return;
          if (!moved) { Sfx.play('tap'); if (o.onTap) o.onTap(el); return; }
          if (o.onDrop) o.onDrop(el, back);
        };
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerup', up);
        el.addEventListener('pointercancel', up);
      });
    },

    // A clickable word inside the question text.
    word(id) { return document.querySelector(`#question [data-w="${id}"]`); },

    box(el) {
      const x = parseFloat(el.style.left), y = parseFloat(el.style.top);
      const w = parseFloat(el.style.width), h = parseFloat(el.style.height);
      return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
    },

    // Is the centre of a inside b?
    over(a, b) {
      const A = api.box(a), B = api.box(b);
      return A.cx > B.x && A.cx < B.x + B.w && A.cy > B.y && A.cy < B.y + B.h;
    },

    wrong(el) {
      Sfx.play('wrong');
      let x = 480, y = 220;
      if (el && el.style && el.style.left) ({ cx: x, cy: y } = api.box(el));
      mark('✗', 'bad', x, y);
      if (el && el.classList) {
        el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
      }
    },

    say(text, x, y) {
      const b = document.createElement('div');
      b.className = 'bubble';
      b.textContent = text;
      Object.assign(b.style, { left: x + 'px', top: y + 'px' });
      stage.appendChild(b);
      setTimeout(() => b.remove(), 1400);
    },

    win(msg) {
      if (api.done) return;
      api.done = true;
      winLevel(msg);
    },
  };
  return api;
}

function mark(ch, cls, x, y) {
  const m = document.createElement('div');
  m.className = 'mark ' + cls;
  m.textContent = ch;
  Object.assign(m.style, { left: x + 'px', top: y + 'px' });
  stage.appendChild(m);
  setTimeout(() => m.remove(), cls === 'good' ? 1500 : 700);
}

// ---------- game flow ----------
let cur = 0, api = null, hintBought = {};

function renderQuestion(q) {
  const el = $('#question');
  el.innerHTML = '';
  for (const seg of q) {
    if (typeof seg === 'string') {
      el.appendChild(document.createTextNode(seg));
    } else {
      const s = document.createElement('span');
      s.className = 'w';
      s.dataset.w = seg.w;
      s.textContent = seg.t || seg.w;
      el.appendChild(s);
    }
  }
}

function startLevel(i) {
  cur = i;
  stage.innerHTML = '';
  stage.style.background = '';
  const lvl = LEVELS[i];
  $('#level-label').textContent = 'LEVEL ' + (i + 1);
  renderQuestion(lvl.q);
  api = makeApi();
  lvl.setup(api);
  hide('#title'); hide('#panel');
  updateHud();
  Poki.start();
}

function winLevel(msg) {
  Sfx.play('win');
  Poki.stop();
  mark('✓', 'good', 480, 220);
  const d = Save.data;
  if (!d.cleared.includes(cur)) { d.cleared.push(cur); d.bulbs += CLEAR_BONUS; }
  d.unlocked = Math.max(d.unlocked, Math.min(cur + 2, LEVELS.length));
  Save.save();
  updateHud();
  setTimeout(() => {
    const last = cur === LEVELS.length - 1;
    showPanel(last ? 'You did it!' : 'Brilliant!', last ? 'You beat every tricky level. More coming soon!' : msg,
      last ? 'MENU' : 'NEXT', async () => {
        hide('#panel');
        if (last) return showTitle();
        await Poki.commercial();
        startLevel(cur + 1);
      });
  }, 1100);
}

function showPanel(title, text, btn, fn) {
  $('#panel-title').textContent = title;
  $('#panel-text').textContent = text;
  const b = $('#panel-btn');
  b.textContent = btn;
  b.onclick = fn;
  show('#panel');
}

function showTitle() {
  Poki.stop();
  const grid = $('#level-grid');
  grid.innerHTML = '';
  LEVELS.forEach((_, i) => {
    const b = document.createElement('button');
    b.textContent = i + 1;
    b.disabled = i >= Save.data.unlocked;
    if (Save.data.cleared.includes(i)) b.classList.add('done');
    b.onclick = () => startLevel(i);
    grid.appendChild(b);
  });
  show('#title');
}

function updateHud() {
  $('#bulb-count').textContent = Save.data.bulbs;
  $('#btn-sound').classList.toggle('off', Save.data.muted);
}

const show = (s) => $(s).classList.remove('hidden');
const hide = (s) => $(s).classList.add('hidden');

function resume() { hide('#panel'); if (!api.done) Poki.start(); }

// ---------- buttons ----------
$('#btn-play').onclick = () => {
  const next = Math.min(Save.data.unlocked, LEVELS.length) - 1;
  startLevel(next);
};
$('#btn-home').onclick = showTitle;
$('#btn-sound').onclick = () => { Save.data.muted = !Save.data.muted; Save.save(); updateHud(); };

$('#btn-hint').onclick = () => {
  if (api.done) return;
  if (!hintBought[cur]) {
    if (Save.data.bulbs < HINT_COST) return showPanel('Out of bulbs', 'Watch an ad to get more 💡', 'OK', resume);
    Save.data.bulbs -= HINT_COST;
    hintBought[cur] = true;
    Save.save(); updateHud();
  }
  Poki.stop();
  showPanel('Hint', LEVELS[cur].hint, 'OK', resume);
};

$('#btn-skip').onclick = () => {
  if (api.done) return;
  if (Save.data.bulbs < SKIP_COST) return showPanel('Out of bulbs', 'Watch an ad to get more 💡', 'OK', resume);
  Save.data.bulbs -= SKIP_COST;
  Save.save();
  api.win('Skipped! ' + LEVELS[cur].answer);
};

$('#btn-reward').onclick = async () => {
  Poki.stop();
  const ok = await Poki.rewarded();
  if (ok) { Save.data.bulbs += REWARD; Save.save(); updateHud(); }
  if (api && !api.done && $('#panel').classList.contains('hidden') && $('#title').classList.contains('hidden')) Poki.start();
};

// stop the page from scrolling / zooming while playing on mobile
['touchmove', 'gesturestart', 'contextmenu'].forEach((ev) =>
  document.addEventListener(ev, (e) => e.preventDefault(), { passive: false }));
addEventListener('keydown', (e) => { if ([' ', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault(); });
addEventListener('resize', fit);

(async function boot() {
  Save.load();
  fit();
  await Poki.init();
  updateHud();
  showTitle();
  Poki.loaded();
})();
