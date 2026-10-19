// Abuse / chaos playtest: tries to break every level like a curious, chaotic player.
//   node tests/abuse.js                 → all levels
//   node tests/abuse.js kite snowman    → only those level ids
//   node tests/abuse.js --shots DIR     → also save a start-state screenshot per level into DIR
//   node tests/abuse.js --quick         → skip the (slow) "drop on top of every other object" pass
// Per level it runs:
//   solve      the scripted solution (tests/solutions) wins exactly once, no page errors
//   offstage   every draggable dropped beyond each stage edge → object must come back or the level must
//              still be solvable (re-runs the scripted solution)
//   stack      every draggable dropped on every other interactive object → same check
//   monkey     300 random taps + 60 random drags (stage + question text); reports a chance win, and
//              FAILs if it leaves an object the solution needs off-stage or buried under another object
//   leave      tap everything / start the solution, then leave via Home → another level: the new level must
//              not get stray bubbles, marks, panels or a win from timers of the old level
//   next       win, press NEXT: the next level must start clean
//   hintskip   hint shows LEVELS[i].hint and costs bulbs; skip wins and shows the answer; no bulbs → no skip
//   touch      the scripted solution also works with touch input (CDP touch events)
// PASS/FAIL per level; exit code 1 if anything FAILs. WARN lines are informational.
const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');
const { execSync } = require('child_process');

let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }

const ROOT = path.join(__dirname, '..');
const solutions = {};
for (const f of fs.readdirSync(path.join(__dirname, 'solutions'))) Object.assign(solutions, require('./solutions/' + f));

const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf(n); if (i < 0) return false; argv.splice(i, 1); return true; };
const opt = (n) => { const i = argv.indexOf(n); if (i < 0) return null; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const QUICK = flag('--quick');
const SHOTS = opt('--shots');
const WORKERS = Number(opt('--workers') || 4);
const ONLY = argv;

// A big viewport leaves room around the 960x640 game so drags can really end beyond the stage edges.
const VW = 1600, VH = 1000; // game is pinned to scale 1 in the middle (see instrument())
const OFF = [['left', -110, 220], ['right', 1070, 220], ['top', 480, -90], ['bottom', 480, 505]];

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' };
function serve(dir) {
  return new Promise((res) => {
    const srv = http.createServer((req, rsp) => {
      const f = path.join(dir, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
      if (!f.startsWith(dir) || !fs.existsSync(f)) { rsp.writeHead(404); return rsp.end(); }
      rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(rsp);
    }).listen(0, () => res(srv));
  });
}

function rng(seed) { // mulberry32
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- page-side instrumentation ----------
function instrument() {
  // pin the game at 1:1 in the middle of the big viewport so there is room on every side of the stage
  scale = 1;
  $('#app').style.transform = 'translate(-50%, -50%) scale(1)';
  removeEventListener('resize', fit);
  window.__wins = [];
  const orig = winLevel;
  window.winLevel = function (msg) { window.__wins.push({ lvl: cur, msg }); return orig(msg); };
  window.__key = new Set();      // elements the player pressed while solving (the "needed" objects)
  window.__track = false;
  stage.addEventListener('pointerdown', (e) => {
    if (!window.__track) return;
    const o = e.target.closest && e.target.closest('#stage > .obj');
    if (o) window.__key.add(o);
  }, true);
  const objs = () => [...stage.querySelectorAll(':scope > .obj')];
  const visible = (el) => {
    if (!el.isConnected) return false;
    for (let n = el; n && n !== stage; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) return false;
    }
    return el.getClientRects().length > 0;
  };
  // A stage-coords point where a real press would land on el, or null if it is off-stage/buried.
  const grab = (el) => {
    if (!visible(el)) return null;
    const r = stage.getBoundingClientRect(), b = el.getBoundingClientRect();
    const fs = [0.5, 0.35, 0.65, 0.2, 0.8, 0.08, 0.92];
    for (const fy of fs) for (const fx of fs) {
      const x = b.left + b.width * fx, y = b.top + b.height * fy;
      if (x <= r.left + 1 || x >= r.right - 1 || y <= r.top + 1 || y >= r.bottom - 1) continue;
      const h = document.elementFromPoint(x, y);
      if (h && (h === el || el.contains(h))) return { x: (x - r.left) / scale, y: (y - r.top) / scale };
    }
    return null;
  };
  const describe = (el) => {
    const i = objs().indexOf(el);
    const b = api.box(el);
    return `obj#${i}${el.classList.contains('drag') ? '(drag)' : el.classList.contains('tap') ? '(tap)' : ''}@${Math.round(b.cx)},${Math.round(b.cy)}`;
  };
  window.__qa = {
    objs, visible, grab, describe,
    interactive: () => objs().filter((o) => o.classList.contains('tap') || o.classList.contains('drag')),
    draggables: () => objs().filter((o) => o.classList.contains('drag')),
    // needed objects that are still on the page and visible but can't be pressed any more
    lostKeys: () => [...window.__key].filter((el) => visible(el) && !grab(el)).map(describe),
    strays: () => stage.querySelectorAll('.bubble, .mark').length,
  };
}

// ---------- input helpers (mouse or CDP touch), same interface as tests/run.js ----------
async function makeHelper(page, touch) {
  const cdp = touch ? await page.context().newCDPSession(page) : null;
  const geo = () => page.evaluate(() => { const r = stage.getBoundingClientRect(); return { x: r.left, y: r.top, k: scale }; });
  const P = (g, x, y) => [g.x + x * g.k, g.y + y * g.k];
  const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y]) => ({ x, y })) });
  const down = (x, y) => (touch ? T('touchStart', [[x, y]]) : page.mouse.move(x, y).then(() => page.mouse.down()));
  const move = async (x0, y0, x, y, steps) => {
    if (!touch) return page.mouse.move(x, y, { steps });
    for (let s = 1; s <= steps; s++) await T('touchMove', [[x0 + ((x - x0) * s) / steps, y0 + ((y - y0) * s) / steps]]);
  };
  const up = () => (touch ? T('touchEnd', []) : page.mouse.up());
  const clickPage = async (x, y) => { await down(x, y); await up(); };
  const center = async (i) => { const b = await page.locator('#stage > .obj').nth(i).boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
  const h = {
    page,
    wait: (ms) => page.waitForTimeout(ms),
    clickPage,
    async tapStage(x, y) { const g = await geo(); await clickPage(...P(g, x, y)); },
    async dragStage(fx, fy, x, y, steps = 10) {
      const g = await geo(); const [ax, ay] = P(g, fx, fy), [bx, by] = P(g, x, y);
      await down(ax, ay); await move(ax, ay, bx, by, steps); await up();
    },
    async tap(i) { const [x, y] = await center(i); await clickPage(x, y); await h.wait(150); },
    async tapAt(x, y) { await h.tapStage(x, y); await h.wait(150); },
    async drag(i, x, y, steps = 12) {
      const [fx, fy] = await center(i); const g = await geo(); const [bx, by] = P(g, x, y);
      await down(fx, fy); await move(fx, fy, bx, by, steps); await up(); await h.wait(250);
    },
    async dragFrom(fx, fy, x, y, steps = 12) { await h.dragStage(fx, fy, x, y, steps); await h.wait(250); },
    async word(id) {
      const b = await page.locator(`#question [data-w="${id}"]`).boundingBox();
      await clickPage(b.x + b.width / 2, b.y + b.height / 2); await h.wait(150);
    },
  };
  return h;
}

async function newPage(browser, url, touch) {
  const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, hasTouch: touch });
  const page = await ctx.newPage();
  page.__errors = [];
  page.on('pageerror', (e) => page.__errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/POKI|Blocked script|Cross-Origin/.test(m.text())) page.__errors.push(m.text()); });
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => !document.querySelector('#title').classList.contains('hidden'));
  await page.evaluate(instrument);
  return page;
}

// ---------- per-level test ----------
async function testLevel(page, tpage, L, i, n) {
  const id = L.id;
  const fails = [], warns = [], info = [];
  const h = await makeHelper(page, false);
  const ev = (f, a) => page.evaluate(f, a);
  const errs = () => page.__errors.splice(0);
  const wins = () => ev(() => window.__wins.length);
  const done = () => ev(() => !!(api && api.done));

  // start level i fresh; wait out any pending win panel from the previous sub-test first
  const start = async (k = i) => {
    if (await done()) { await page.waitForSelector('#panel:not(.hidden)', { timeout: 3000 }).catch(() => {}); }
    await ev((k) => { window.__wins = []; window.__key = new Set(); window.__track = false; Save.data.bulbs = 1000; startLevel(k); }, k);
    await h.wait(120);
  };
  const solve = async (helper = h) => {
    try { await solutions[id](helper); await page.waitForFunction(() => api.done, null, { timeout: 2500 }); return true; } catch (e) { return false; }
  };
  const checkWins = async (label) => { await h.wait(50); const w = await wins(); if (w > 1) fails.push(`${label}: a.win fired ${w} times`); };

  // --- solve + record which objects the solution needs
  await start();
  if (SHOTS) await page.locator('#app').screenshot({ path: path.join(SHOTS, `${String(i + 1).padStart(2, '0')}-${id}.png`) });
  const blocked = await ev(() => {
    const out = [];
    for (const el of __qa.interactive()) {
      const b = el.getBoundingClientRect();
      const t = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      if (t && t !== el && !el.contains(t)) {
        const o = t.closest('#stage > .obj');
        out.push(`${__qa.describe(el)} centre is covered by ${o ? __qa.describe(o) : t.tagName + '#' + t.id}`);
      }
      if (b.width / scale < 60 || b.height / scale < 60) out.push(`${__qa.describe(el)} is small: ${Math.round(b.width / scale)}x${Math.round(b.height / scale)}`);
    }
    for (const w of document.querySelectorAll('#question .w')) {
      const b = w.getBoundingClientRect();
      if (b.width / scale < 44) out.push(`question word "${w.textContent}" is only ${Math.round(b.width / scale)}x${Math.round(b.height / scale)}px`);
    }
    return out;
  });
  for (const b of blocked) info.push('hit-test: ' + b);
  await ev(() => { window.__track = true; });
  if (!(await solve())) fails.push('solve: scripted solution did not win');
  await checkWins('solve');
  const keyCount = await ev(() => { window.__track = false; return window.__key.size; });
  const keys = await ev(() => [...window.__key].map((el) => __qa.objs().indexOf(el)));
  let e = errs(); if (e.length) fails.push('solve: page errors: ' + e.join(' | '));

  // re-key: after a restart the "needed" objects are the same creation indices
  const rekey = (idx) => ev((idx) => { const o = __qa.objs(); window.__key = new Set(idx.map((j) => o[j]).filter(Boolean)); }, idx);

  // --- abuse helper: perform an abusive drop, then expect "returns or still solvable"
  const abuse = async (label, act) => {
    await start(); await rekey(keys);
    await act();
    await h.wait(450);
    if (await done()) { info.push(`${label}: wins the level`); await checkWins(label); return; }
    const lost = await ev(() => __qa.lostKeys());
    const ok = await solve();
    await checkWins(label);
    if (!ok) {
      if (lost.length) fails.push(`${label}: SOFTLOCK — needed object can't be pressed any more: ${lost.join(', ')}`);
      else warns.push(`${label}: scripted solution no longer applies (state changed) — check by hand`);
    }
    const er = errs(); if (er.length) fails.push(`${label}: page errors: ${er.join(' | ')}`);
  };

  // --- off-stage drops
  await start();
  const nDrag = await ev(() => __qa.draggables().map((d) => __qa.objs().indexOf(d)));
  for (const d of nDrag) {
    for (const [side, x, y] of OFF) {
      await abuse(`offstage obj#${d}→${side}`, async () => {
        const g = await ev((d) => __qa.grab(__qa.objs()[d]), d);
        if (g) await h.dragStage(g.x, g.y, x, y, 14);
      });
    }
  }

  // --- drop each draggable on top of every other interactive object
  if (!QUICK) {
    await start();
    const targets = await ev(() => __qa.interactive().map((o) => ({ j: __qa.objs().indexOf(o), ...api.box(o) })));
    for (const d of nDrag) {
      for (const t of targets) {
        if (t.j === d) continue;
        await abuse(`stack obj#${d}→obj#${t.j}`, async () => {
          const g = await ev((d) => __qa.grab(__qa.objs()[d]), d);
          if (g) await h.dragStage(g.x, g.y, t.cx, t.cy, 10);
        });
      }
    }
  }

  // --- monkey: 300 random taps + 60 random drags across the stage and the question text
  {
    await start(); await rekey(keys);
    const R = rng(1000 + i * 7919);
    const qBox = await ev(() => { const r = document.createRange(); r.selectNodeContents($('#question')); const b = r.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
    let taps = 300, drags = 60, count = 0, wonBy = null, last = '';
    while (taps + drags > 0) {
      count++;
      if (R() < taps / (taps + drags)) {
        taps--;
        if (R() < 0.15) { const x = qBox.x + R() * qBox.w, y = qBox.y + R() * qBox.h; last = `tap question @${Math.round(x - qBox.x)}px`; await h.clickPage(x, y); }
        else { const x = R() * 960, y = R() * 440; last = `tap stage ${Math.round(x)},${Math.round(y)}`; await h.tapStage(x, y); }
      } else {
        drags--;
        let fx = R() * 960, fy = R() * 440;
        const ds = await ev(() => __qa.draggables().map((d) => __qa.grab(d)).filter(Boolean));
        if (ds.length && R() < 0.6) ({ x: fx, y: fy } = ds[Math.floor(R() * ds.length)]);
        const tx = -100 + R() * 1160, ty = -80 + R() * 580;
        last = `drag ${Math.round(fx)},${Math.round(fy)}→${Math.round(tx)},${Math.round(ty)}`;
        await h.dragStage(fx, fy, tx, ty, 6 + Math.floor(R() * 10));
      }
      if (count % 10 === 0 || /drag/.test(last)) await h.wait(15);
      if (await done()) { wonBy = { count, last }; break; }
    }
    await h.wait(1100);
    if (!wonBy && (await done())) wonBy = { count, last: last + ' (via a delayed timer)' };
    if (wonBy) info.push(`monkey: WON BY CHANCE after ${wonBy.count} actions (last: ${wonBy.last})`);
    else {
      info.push('monkey: not won by 360 random actions');
      const lost = await ev(() => __qa.lostKeys());
      if (lost.length) fails.push(`monkey: SOFTLOCK — needed object lost: ${lost.join(', ')}`);
    }
    await checkWins('monkey');
    e = errs(); if (e.length) fails.push('monkey: page errors: ' + e.join(' | '));
  }

  // --- leave mid-level (Home → another level) and look for leftovers in the new level
  const other = i === 0 ? 6 : 0; // 'largest' (or 'heavier') — no timers or bubbles of its own
  const leaveAndWatch = async (label) => {
    if (await done()) { info.push(`${label}: level won before leaving`); return; }
    await ev((k) => { Save.data.cleared = LEVELS.map((l) => l.id); }, other);
    await page.click('#btn-home');
    await page.click(`#level-grid button:nth-child(${other + 1})`);
    await ev(() => { window.__wins = []; });
    let stray = 0;
    for (let t = 0; t < 15; t++) { await h.wait(100); stray = Math.max(stray, await ev(() => __qa.strays())); }
    const st = await ev(() => ({ done: api.done, panel: !$('#panel').classList.contains('hidden'), wins: window.__wins.length, label: $('#level-label').textContent }));
    if (st.done || st.wins) fails.push(`${label}: a timer from this level WON the next level (${st.label})`);
    if (stray) fails.push(`${label}: ${stray} stray bubble/mark appeared in the next level (old timer)`);
    if (st.panel) fails.push(`${label}: a panel popped up over the next level`);
    const er = errs(); if (er.length) fails.push(`${label}: page errors: ${er.join(' | ')}`);
  };
  await start();
  for (const g of await ev(() => __qa.interactive().map((el) => __qa.grab(el)).filter(Boolean))) {
    if (await done()) break;
    await h.tapStage(g.x, g.y);
  }
  await leaveAndWatch('leave after tapping everything');
  await start();
  try { await solutions[id]({ ...h, wait: (ms) => h.wait(Math.min(ms, 250)) }); } catch (er) {}
  await leaveAndWatch('leave right after the solution');
  await page.waitForTimeout(100);

  // --- win, then NEXT: the next level must start clean
  await start();
  await solve();
  try {
    await page.waitForSelector('#panel:not(.hidden)', { timeout: 3000 });
    await page.click('#panel-btn');
    await h.wait(100);
    if (i < n - 1) {
      let stray = 0;
      for (let t = 0; t < 12; t++) { await h.wait(100); stray = Math.max(stray, await ev(() => __qa.strays())); }
      const st = await ev(() => ({ done: api.done, panel: !$('#panel').classList.contains('hidden'), label: $('#level-label').textContent }));
      if (st.label !== 'LEVEL ' + (i + 2)) fails.push(`next: NEXT went to ${st.label}`);
      if (st.done) fails.push('next: next level is already won');
      if (stray) fails.push(`next: ${stray} stray bubble/mark in the next level`);
      if (st.panel) fails.push('next: a panel is showing over the next level');
    } else if (!(await ev(() => !$('#title').classList.contains('hidden')))) fails.push('next: MENU did not return to the title');
  } catch (er) { fails.push('next: no win panel after solving'); }
  e = errs(); if (e.length) fails.push('next: page errors: ' + e.join(' | '));

  // --- hint + skip
  await start();
  await ev(() => { hintBought = {}; Save.data.bulbs = 100; updateHud(); });
  await page.click('#btn-hint');
  let s = await ev(() => ({ text: $('#panel-text').textContent, bulbs: Save.data.bulbs, shown: !$('#panel').classList.contains('hidden') }));
  if (!s.shown || s.text !== L.hint) fails.push(`hint: panel shows "${s.text}"`);
  if (s.bulbs !== 75) fails.push(`hint: bulbs ${s.bulbs}, expected 75`);
  await page.click('#panel-btn');
  await page.click('#btn-hint'); await page.click('#panel-btn'); // second look is free
  s = await ev(() => ({ bulbs: Save.data.bulbs, done: api.done, shown: !$('#panel').classList.contains('hidden') }));
  if (s.bulbs !== 75) fails.push('hint: re-opening the hint charged again');
  if (s.done || s.shown) fails.push('hint: closing the hint did not return to play');
  await page.click('#btn-skip');
  try {
    await page.waitForSelector('#panel:not(.hidden)', { timeout: 3000 });
    s = await ev(() => ({ text: $('#panel-text').textContent, bulbs: Save.data.bulbs, done: api.done }));
    const want = i === n - 1 ? 'You beat every tricky level. More coming soon!' : 'Skipped! ' + L.answer;
    if (s.text !== want) fails.push(`skip: panel shows "${s.text}" (answer is never shown${i === n - 1 ? ' on the last level' : ''})`);
    if (s.bulbs !== 25) fails.push(`skip: bulbs ${s.bulbs}, expected 25`);
  } catch (er) { fails.push('skip: no panel after skip'); }
  await checkWins('skip');
  await start();
  await ev(() => { Save.data.bulbs = 10; updateHud(); });
  await page.click('#btn-skip');
  s = await ev(() => ({ text: $('#panel-title').textContent, done: api.done }));
  if (s.done || s.text !== 'Out of bulbs') fails.push('skip with 10 bulbs did not refuse');
  await page.click('#panel-btn');
  e = errs(); if (e.length) fails.push('hintskip: page errors: ' + e.join(' | '));

  // --- touch: the solution, then one off-stage drop of each draggable + re-solve
  {
    const th = await makeHelper(tpage, true);
    const tev = (f, a) => tpage.evaluate(f, a);
    const tstart = async () => {
      if (await tev(() => !!(api && api.done))) await tpage.waitForSelector('#panel:not(.hidden)', { timeout: 3000 }).catch(() => {});
      await tev((k) => { window.__wins = []; Save.data.bulbs = 1000; startLevel(k); }, i); await th.wait(120);
    };
    const tsolve = async () => { try { await solutions[id](th); await tpage.waitForFunction(() => api.done, null, { timeout: 2500 }); return true; } catch (er) { return false; } };
    await tstart();
    if (!(await tsolve())) fails.push('touch: scripted solution did not win with touch input');
    for (const d of nDrag) {
      await tstart();
      const g = await tev((d) => __qa.grab(__qa.objs()[d]), d);
      if (!g) continue;
      await th.dragStage(g.x, g.y, 1070, -90, 14); // top-right corner, off both edges
      await th.wait(450);
      if (await tev(() => api.done)) continue;
      if (!(await tsolve())) {
        await tev((d) => { window.__key = new Set([__qa.objs()[d]]); }, d);
        const lost = await tev(() => __qa.lostKeys());
        if (lost.length && keys.includes(d)) fails.push(`touch offstage obj#${d}→top-right: SOFTLOCK, ${lost.join(', ')}`);
        else warns.push(`touch offstage obj#${d}→top-right: scripted solution no longer applies`);
      }
    }
    const te = tpage.__errors.splice(0); if (te.length) fails.push('touch: page errors: ' + te.join(' | '));
  }
  return { id, i, fails, warns, info, keyCount };
}

// ---------- game-wide checks (not tied to one level) ----------
async function globalChecks(page) {
  const fails = [];
  // Home pressed during the 1.1 s between a win and its panel, then a level picked from the menu
  await page.evaluate(() => { Save.data.cleared = LEVELS.map((l) => l.id); startLevel(0); });
  await page.waitForTimeout(150);
  await page.evaluate(() => api.win('test'));
  await page.waitForTimeout(150);
  await page.click('#btn-home');
  await page.click('#level-grid button:nth-child(5)');
  await page.waitForTimeout(1400);
  const st = await page.evaluate(() => ({ panel: !$('#panel').classList.contains('hidden'), title: $('#panel-title').textContent, label: $('#level-label').textContent }));
  if (st.panel) fails.push(`win → Home within 1.1s → pick level 5: the old "${st.title}" panel pops up over ${st.label}; its NEXT starts level 6`);
  await page.evaluate(() => hide('#panel'));
  return fails;
}

(async () => {
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-abuse-'));
  execSync('./build.sh web', { cwd: ROOT, stdio: 'ignore', env: { ...process.env, DIST: dist } });
  const srv = await serve(path.join(dist, 'web'));
  const url = `http://localhost:${srv.address().port}/index.html`;
  const browser = await chromium.launch();
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

  const probe = await newPage(browser, url, false);
  const levels = await probe.evaluate(() => LEVELS.map((l) => ({ id: l.id, hint: l.hint, answer: l.answer })));
  const globalFails = await globalChecks(probe);
  await probe.context().close();

  const queue = levels.map((L, i) => ({ L, i })).filter(({ L }) => !ONLY.length || ONLY.includes(L.id));
  const results = [];
  const t0 = Date.now();
  await Promise.all(Array.from({ length: Math.min(WORKERS, queue.length) }, async () => {
    const page = await newPage(browser, url, false);
    const tpage = await newPage(browser, url, true);
    while (queue.length) {
      const { L, i } = queue.shift();
      if (!solutions[L.id]) { results.push({ id: L.id, i, fails: ['no solution in tests/solutions'], warns: [], info: [] }); continue; }
      try { results.push(await testLevel(page, tpage, L, i, levels.length)); } catch (e) {
        results.push({ id: L.id, i, fails: ['harness error: ' + e.message.split('\n')[0]], warns: [], info: [] });
      }
    }
    await page.context().close(); await tpage.context().close();
  }));

  let failed = 0;
  results.sort((a, b) => a.i - b.i);
  for (const r of results) {
    const ok = !r.fails.length;
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${String(r.i + 1).padStart(2)}. ${r.id}`);
    for (const f of r.fails) console.log('      FAIL ' + f);
    for (const w of r.warns) console.log('      WARN ' + w);
    for (const n of r.info) console.log('      info ' + n);
  }
  console.log(globalFails.length ? 'FAIL  game-wide' : 'PASS  game-wide');
  for (const f of globalFails) console.log('      FAIL ' + f);
  if (globalFails.length) failed++;
  const chance = results.filter((r) => r.info.some((n) => /WON BY CHANCE/.test(n))).map((r) => r.id);
  console.log(`\nmonkey wins by chance: ${chance.length}/${results.length}${chance.length ? ' (' + chance.join(', ') + ')' : ''}`);
  console.log(`${failed ? failed + ' FAILED' : 'ALL PASSED'} in ${Math.round((Date.now() - t0) / 1000)}s`);

  await browser.close();
  srv.close();
  fs.rmSync(dist, { recursive: true, force: true });
  process.exit(failed ? 1 : 0);
})();
