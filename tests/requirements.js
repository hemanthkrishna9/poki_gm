// Platform / requirements QA suite. Usage:
//   node tests/requirements.js            → run every requirement check
//   node tests/requirements.js 3 7 16     → only those requirement numbers
// Builds all targets with ./build.sh, copies dist/ to a temp dir (so concurrent builds can't race us),
// serves it, and drives the real UI with FAKE Poki / CrazyGames SDKs that log every call.
// Prints PASS / WARN / FAIL per requirement; exits 1 if anything FAILs. Screenshots → tests/output/req-*.png
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { execSync } = require('child_process');

let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }

const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'output');
fs.mkdirSync(OUT, { recursive: true });
const SOL = require('./solutions/core.js');
const SDK_RE = /game-cdn\.poki\.com|sdk\.crazygames\.com/;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- build + serve
function buildAll() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-req-'));
  for (let attempt = 0; attempt < 4; attempt++) {
    execSync('./build.sh', { cwd: ROOT, stdio: 'ignore' });
    try {
      for (const t of ['poki', 'crazygames', 'web']) {
        execSync(`cp -r "${path.join(ROOT, 'dist', t)}" "${path.join(tmp, t)}"`);
        fs.copyFileSync(path.join(ROOT, 'dist', `tricky-taps-${t}.zip`), path.join(tmp, `tricky-taps-${t}.zip`));
      }
      return tmp;
    } catch (e) { execSync(`rm -rf "${tmp}"/*`); } // another agent rebuilt dist mid-copy; retry
  }
  throw new Error('could not build/copy dist');
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png' };
function serve(dir) {
  return new Promise((res) => {
    const srv = http.createServer((req, rsp) => {
      const u = new URL(req.url, 'http://x');
      if (u.pathname === '/host.html') { // iframe embed host page, like Poki/CrazyGames
        const w = u.searchParams.get('w') || 800, h = u.searchParams.get('h') || 450, t = u.searchParams.get('t') || 'poki';
        rsp.writeHead(200, { 'Content-Type': 'text/html' });
        return rsp.end(`<!doctype html><html><body style="margin:0;background:#333">
          <div style="height:100px;color:#fff">host header</div>
          <iframe id="game" src="/${t}/index.html" width="${w}" height="${h}" style="border:0;margin-left:100px;display:block"></iframe>
          <div style="height:3000px;color:#fff">long host page content</div></body></html>`);
      }
      const f = path.join(dir, decodeURIComponent(u.pathname).replace(/\/$/, '/index.html'));
      if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); return rsp.end(); }
      rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(rsp);
    }).listen(0, '127.0.0.1', () => res(srv));
  });
}

// ---------------------------------------------------------------- fake SDKs (run in page)
function fakeSdk(cfg) {
  const log = (window.__log = []);
  window.__mute = [];
  let pending = 0;
  const rec = (ev) => log.push({ ev, t: Math.round(performance.now()), pending,
    done: (typeof api !== 'undefined' && api) ? api.done : null });
  const muted = () => (typeof Sfx !== 'undefined' ? Sfx.muted : null);
  const ms = cfg.adMs || 500;
  const ad = (name, settle) => {
    rec(name); pending++;
    return new Promise((res, rej) => {
      setTimeout(() => window.__mute.push({ ad: name, muted: muted() }), ms / 2);
      setTimeout(() => { pending--; rec(name + ':end'); settle(res, rej); }, ms);
    });
  };
  const init = () => { rec('init'); return new Promise((res, rej) => setTimeout(() => { rec('init:settled');
    cfg.initReject ? rej(new Error('init rejected (test)')) : res(); }, cfg.initMs || 300)); };
  if (cfg.platform === 'poki') {
    window.PokiSDK = {
      init, setDebug() { rec('setDebug'); },
      gameLoadingFinished() { rec('gameLoadingFinished'); },
      gameplayStart() { rec('gameplayStart'); }, gameplayStop() { rec('gameplayStop'); },
      // like the real SDK after a failed init (adblock): breaks resolve at once, rewarded resolves false
      commercialBreak() { if (cfg.initReject) { rec('commercialBreak'); return Promise.resolve(); } return ad('commercialBreak', (r) => r()); },
      rewardedBreak() { if (cfg.initReject) { rec('rewardedBreak'); return Promise.resolve(false); }
        return ad('rewardedBreak', (r, j) => (cfg.reward === 'reject' ? j(new Error('x')) : r(cfg.reward))); },
    };
  }
  if (cfg.platform === 'crazygames') {
    window.CrazyGames = { SDK: {
      init,
      game: { loadingStart() { rec('loadingStart'); }, loadingStop() { rec('loadingStop'); },
        gameplayStart() { rec('gameplayStart'); }, gameplayStop() { rec('gameplayStop'); } },
      ad: { requestAd(type, cb) {
        ad('requestAd:' + type, () => (cfg.adError ? cb.adError && cb.adError({ code: 'other' }) : cb.adFinished && cb.adFinished()));
        if (!cfg.adError) setTimeout(() => cb.adStarted && cb.adStarted(), 30);
      } },
    } };
  }
}

// ---------------------------------------------------------------- page helpers
let BASE, browser;
const allErrors = []; // [label, msg]
const allRequests = { poki: new Set(), crazygames: new Set(), web: new Set() };
const allMute = [];

async function open(target, o = {}) {
  const ctx = await browser.newContext({ viewport: o.viewport || { width: 960, height: 640 },
    hasTouch: !!o.touch, isMobile: !!o.mobile });
  await ctx.route(SDK_RE, (r) => (o.block ? r.abort() : r.fulfill({ status: 200, contentType: 'text/javascript', body: '/*fake*/' })));
  if (!o.block) await ctx.addInitScript(fakeSdk, Object.assign({ platform: target, adMs: 500, reward: true }, o.cfg || {}));
  for (const s of o.init || []) await ctx.addInitScript(s.fn, s.arg);
  await ctx.addInitScript(() => { window.__pd = []; addEventListener('pointerdown', (e) => window.__pd.push(`${e.pointerType}@${Math.round(e.clientX)},${Math.round(e.clientY)}→${e.target.className || e.target.tagName}`), true); });
  const page = await ctx.newPage();
  const errors = [], requests = [], label = o.label || target;
  page.on('pageerror', (e) => { errors.push(e.message); allErrors.push([label, e.message]); });
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text(), loc = (m.location() && m.location().url) || '';
    if (o.block && /Failed to load resource/.test(t) && (SDK_RE.test(loc) || SDK_RE.test(t) || !loc)) return; // expected for adblock
    errors.push(t); allErrors.push([label, t]);
  });
  page.on('request', (r) => { requests.push(r.url()); (allRequests[target] || new Set()).add(r.url()); });
  const navs = [];
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) navs.push(f.url()); });
  await page.goto(o.url || `${BASE}/${target}/index.html`);
  // boot is done once showTitle() has filled the level grid (the title is visible from the static HTML before that)
  if (!o.noWait) await page.waitForFunction(() => !document.querySelector('#title').classList.contains('hidden') && document.querySelector('#level-grid').children.length > 0, null, { timeout: 8000 });
  const g = {
    ctx, page, errors, requests, navs, touch: !!o.touch,
    log: () => page.evaluate(() => window.__log || []),
    mute: () => page.evaluate(() => window.__mute || []),
    ev: (fn, arg) => page.evaluate(fn, arg),
    wait: (ms) => page.waitForTimeout(ms),
    async click(sel) {
      const b = await page.locator(sel).boundingBox();
      if (!b) { await g.wait(120); return false; } // hidden (e.g. blocked during an ad): nothing to click
      if (g.touch) await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
      else await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
      await g.wait(120);
    },
    async objCenter(i) { const b = await page.locator('#stage .obj').nth(i).boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; },
    async tapObj(i) {
      const [x, y] = await g.objCenter(i);
      if (g.touch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
      await g.wait(150);
    },
    label: () => page.textContent('#level-label'),
    bulbs: () => page.evaluate(() => Save.data.bulbs),
    panelOpen: () => page.evaluate(() => !document.querySelector('#panel').classList.contains('hidden')),
    panelTitle: () => page.textContent('#panel-title'),
    async waitPanel(t = 4000) {
      try { await page.waitForSelector('#panel:not(.hidden)', { timeout: t }); } catch (e) {
        await page.screenshot({ path: path.join(OUT, `req-FAIL-${label}.png`) });
        throw new Error(`panel never opened (${label}; level ${await g.label()}, api.done=${await page.evaluate(() => api && api.done)}; pointerdowns ${await page.evaluate(() => window.__pd.slice(-6).join(' '))})`);
      }
      await g.wait(100);
    },
    async waitLevel(n, t = 6000) { await page.waitForFunction((n) => document.querySelector('#level-label').textContent === 'LEVEL ' + n && document.querySelector('#title').classList.contains('hidden'), n, { timeout: t }); await g.wait(150); },
    async waitAdEnd(name, count = 1, t = 6000) {
      await page.waitForFunction(([n, c]) => (window.__log || []).filter((e) => e.ev === n + ':end').length >= c, [name, count], { timeout: t });
      await g.wait(150);
    },
    async solve1() { await g.tapObj(2); await g.waitPanel(); },
    async solve(id) { await SOL[id](runHelper(page)); await g.waitPanel(); },
    async solveCurrent() { const id = await page.evaluate(() => LEVELS[cur].id); await g.solve(id); },
    async close() { allMute.push(...(await g.mute().catch(() => []))); await ctx.close(); },
  };
  return g;
}

// tests/run.js-style helper so tests/solutions/core.js can be reused
function runHelper(page) {
  const obj = (i) => page.locator('#stage .obj').nth(i);
  const stageBox = () => page.locator('#stage').boundingBox();
  const scale = () => page.evaluate(() => scale);
  const center = async (i) => { const b = await obj(i).boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
  const h = {
    page, wait: (ms) => page.waitForTimeout(ms),
    async tap(i) { const [x, y] = await center(i); await page.mouse.click(x, y); await h.wait(150); },
    async tapAt(x, y) { const s = await stageBox(), k = await scale(); await page.mouse.click(s.x + x * k, s.y + y * k); await h.wait(150); },
    async drag(i, x, y, steps = 12) {
      const [fx, fy] = await center(i); const s = await stageBox(), k = await scale();
      await page.mouse.move(fx, fy); await page.mouse.down();
      await page.mouse.move(s.x + x * k, s.y + y * k, { steps }); await page.mouse.up(); await h.wait(250);
    },
    async word(id) { await page.click(`#question [data-w="${id}"]`); await h.wait(150); },
  };
  return h;
}

// ---------------------------------------------------------------- log analysis
const isGameEv = (e) => !e.ev.endsWith(':end') && e.ev !== 'init:settled' && e.ev !== 'setDebug';
const playSeq = (log) => log.filter((e) => /^gameplay(Start|Stop)$/.test(e.ev));
function dupes(log) {
  const s = playSeq(log), bad = [];
  for (let i = 1; i < s.length; i++) if (s[i].ev === s[i - 1].ev) bad.push(`${s[i].ev} twice (t=${s[i - 1].t},${s[i].t})`);
  return bad;
}
const duringAd = (log) => log.filter((e) => isGameEv(e) && e.pending > 0).map((e) => `${e.ev}@${e.t}`);
const lastPlay = (log) => { const s = playSeq(log); return s.length ? s[s.length - 1].ev : 'none'; };
const isAd = (e) => /^(commercialBreak|rewardedBreak|requestAd:.*)$/.test(e.ev);
function stopBeforeAds(log) {
  const bad = [];
  log.forEach((e, i) => { if (isAd(e)) { const before = playSeq(log.slice(0, i)); const l = before[before.length - 1];
    if (l && l.ev !== 'gameplayStop') bad.push(`${e.ev}@${e.t} while gameplay running`); } });
  return bad;
}

// ---------------------------------------------------------------- results
const results = [];
const only = process.argv.slice(2).map(Number).filter(Boolean);
function report(id, name, status, detail = '') {
  results.push({ id, name, status, detail });
  console.log(`${status.padEnd(4)} ${String(id).padStart(2)}. ${name}${detail ? '\n        ' + detail.replace(/\n/g, '\n        ') : ''}`);
}
// sub-checks: [{name, ok, warn?, detail}] → one line per requirement
function reportSubs(id, name, subs) {
  const fails = subs.filter((s) => !s.ok && !s.warn), warns = subs.filter((s) => !s.ok && s.warn);
  const status = fails.length ? 'FAIL' : warns.length ? 'WARN' : 'PASS';
  const detail = subs.filter((s) => !s.ok || process.env.VERBOSE).map((s) => `${s.ok ? 'ok' : s.warn ? 'warn' : 'FAIL'}: ${s.name}${s.detail ? ' — ' + s.detail : ''}`).join('\n');
  report(id, name, status, detail);
}
async function check(id, name, fn) {
  if (only.length && !only.includes(id)) return;
  try { const subs = await fn(); if (subs) reportSubs(id, name, subs); } catch (e) { report(id, name, 'FAIL', 'exception: ' + e.message.split('\n')[0]); }
}
const sub = (name, ok, detail = '', warn = false) => ({ name, ok: !!ok, detail: ok ? '' : detail, warn });

// ================================================================ checks
async function main() {
  const DIST = buildAll();
  const srv = await serve(DIST);
  BASE = `http://localhost:${srv.address().port}`;
  browser = await chromium.launch();
  console.log(`serving ${DIST} at ${BASE}\n`);

  // ---- long Poki session, shared by 1–4 and 8
  let session = null;
  async function pokiSession() {
    if (session) return session;
    const g = await open('poki', { label: 'poki-session' });
    const inter = []; // interruptions
    const expectStopped = async (what) => inter.push(sub(`gameplayStop on: ${what}`, lastPlay(await g.log()) === 'gameplayStop', `last start/stop event is ${lastPlay(await g.log())}`));
    await g.wait(1500);
    const loadLog = await g.log();
    let nexts = 0;
    await g.click('#btn-play'); await g.waitLevel(1);
    await g.click('#btn-hint'); await g.waitPanel(); await expectStopped('hint panel (paid)');
    await g.click('#panel-btn');
    await g.click('#btn-hint'); await g.waitPanel(); await expectStopped('hint panel (re-open, free)');
    await g.click('#panel-btn');
    await g.solve1(); await expectStopped('level won (L1)');
    await g.click('#panel-btn'); nexts++; await g.waitAdEnd('commercialBreak', 1); await g.waitLevel(2);
    await g.click('#btn-reward'); await g.waitAdEnd('rewardedBreak', 1);
    await g.click('#btn-home'); await expectStopped('home button');
    await g.click('#level-grid button:nth-child(1)'); await g.waitLevel(1);
    await g.click('#btn-home'); await expectStopped('home button (2)');
    await g.click('#btn-play'); await g.waitLevel(2);
    await g.solveCurrent(); await expectStopped('level won (L2)');
    await g.click('#panel-btn'); nexts++; await g.waitAdEnd('commercialBreak', 2); await g.waitLevel(3);
    await g.click('#btn-skip'); await g.waitPanel(4000); await expectStopped('skip → won (L3)');
    await g.click('#panel-btn'); nexts++; await g.waitAdEnd('commercialBreak', 3); await g.waitLevel(4);
    await g.click('#btn-hint'); await g.waitPanel(); await g.click('#panel-btn'); // 30 → 5 bulbs
    await g.click('#btn-skip'); await g.waitPanel();
    const t1 = await g.panelTitle();
    await expectStopped(`out-of-bulbs panel via skip (panel title "${t1}", bulbs ${await g.bulbs()})`);
    await g.click('#panel-btn');
    await g.solveCurrent(); await expectStopped('level won (L4)');
    await g.click('#panel-btn'); nexts++; await g.waitAdEnd('commercialBreak', 4); await g.waitLevel(5);
    await g.click('#btn-hint'); await g.waitPanel();
    await expectStopped(`out-of-bulbs panel via hint (panel title "${await g.panelTitle()}", bulbs ${await g.bulbs()})`);
    await g.click('#panel-btn');
    await g.click('#btn-home'); await expectStopped('home button (3)');
    const log = await g.log();
    session = { g, loadLog, log, inter, nexts };
    return session;
  }

  await check(1, 'Poki: init first; gameLoadingFinished once, after init, before gameplayStart', async () => {
    const { log } = await pokiSession();
    const game = log.filter(isGameEv);
    const iInit = log.findIndex((e) => e.ev === 'init'), iSettled = log.findIndex((e) => e.ev === 'init:settled');
    const glf = log.map((e, i) => [e, i]).filter(([e]) => e.ev === 'gameLoadingFinished');
    const iStart = log.findIndex((e) => e.ev === 'gameplayStart');
    // a player who presses PLAY while PokiSDK.init() is still pending (slow network)
    const e = await open('poki', { cfg: { initMs: 2000 }, noWait: true, label: 'poki-early-play' });
    await e.page.waitForSelector('#btn-play'); await e.wait(300);
    await e.click('#btn-play'); await e.wait(2300);
    const el = await e.log(), titleBack = await e.ev(() => !document.querySelector('#title').classList.contains('hidden'));
    const iG = el.findIndex((x) => x.ev === 'gameLoadingFinished'), iS = el.findIndex((x) => x.ev === 'gameplayStart');
    await e.close();
    return [
      sub('PLAY pressed before init resolves: no gameplayStart before init/gameLoadingFinished', iS < 0 || iS > iG,
        `log ${el.map((x) => x.ev).join(' → ')}; title screen re-shown over the running level: ${titleBack} (game.js boot(): title is visible and PLAY clickable during \`await Platform.init()\`)`),
      sub('init is the first SDK call', game[0] && game[0].ev === 'init', `first: ${game[0] && game[0].ev}`),
      sub('gameLoadingFinished exactly once', glf.length === 1, `count ${glf.length}`),
      sub('gameLoadingFinished after init resolved', glf.length && glf[0][1] > iSettled && iSettled > iInit, `idx init=${iInit} settled=${iSettled} glf=${glf[0] && glf[0][1]}`),
      sub('gameLoadingFinished before first gameplayStart', glf.length && iStart > glf[0][1], `glf=${glf[0] && glf[0][1]} start=${iStart}`),
    ];
  });

  await check(2, 'Poki: no gameplayStart on load, only after first input', async () => {
    const { loadLog, log } = await pokiSession();
    return [sub('no gameplay event in the 1.5s after load', !loadLog.some((e) => /^gameplay/.test(e.ev)), JSON.stringify(loadLog.map((e) => e.ev))),
      sub('gameplayStart follows PLAY', log.some((e) => e.ev === 'gameplayStart'))];
  });

  await check(3, 'Poki: gameplayStop on every interruption (won, hint, home, ads, out-of-bulbs)', async () => {
    const { log, inter } = await pokiSession();
    const b = stopBeforeAds(log);
    return [...inter, sub('gameplayStop before every commercialBreak/rewardedBreak', !b.length, b.join('; '))];
  });

  await check(4, 'Poki: never two gameplayStart / gameplayStop in a row (long session)', async () => {
    const { log } = await pokiSession();
    const d = dupes(log);
    return [sub(`start/stop sequence alternates (${playSeq(log).length} events)`, !d.length, d.join('; '))];
  });

  await check(8, 'Poki: commercialBreak only at natural breaks (between levels)', async () => {
    const { log, nexts } = await pokiSession();
    const cb = log.filter((e) => e.ev === 'commercialBreak');
    return [sub('one commercialBreak per NEXT press, none for hint/home/skip/menu', cb.length === nexts, `${cb.length} commercialBreaks for ${nexts} NEXT presses`),
      sub('every commercialBreak happens with the level already finished', cb.every((e) => e.done === true), JSON.stringify(cb))];
  });

  await check(5, 'Poki: no SDK events while an ad is pending (incl. clicks during the ad)', async () => {
    const subs = [];
    // a) stage / hint / skip / sound clicks during commercialBreak
    let g = await open('poki', { cfg: { adMs: 2000 }, label: 'poki-5a' });
    await g.click('#btn-play'); await g.waitLevel(1); await g.solve1(); await g.click('#panel-btn'); await g.wait(200);
    for (const [x, y] of [[300, 300], [480, 350], [700, 400]]) { await g.page.mouse.click(x, y); await g.wait(60); }
    for (const s of ['#btn-hint', '#btn-skip', '#btn-sound', '#btn-sound']) await g.click(s);
    await g.waitAdEnd('commercialBreak'); await g.waitLevel(2);
    let d = duringAd(await g.log());
    subs.push(sub('stage/hint/skip/sound clicks during commercialBreak', !d.length, d.join(', ')));
    await g.close();
    // b) reward button during commercialBreak
    g = await open('poki', { cfg: { adMs: 2000 }, label: 'poki-5b' });
    await g.click('#btn-play'); await g.waitLevel(1); await g.solve1(); await g.click('#panel-btn'); await g.wait(1400);
    await g.click('#btn-reward'); // rewarded overlaps the tail of the interstitial
    await g.wait(3000);
    let log = await g.log();
    d = duringAd(log);
    subs.push(sub('🎬 reward button clicked during commercialBreak', !d.length, `events while an ad was pending: ${d.join(', ')} (reward button stays visible/clickable while the interstitial runs)`));
    const m = await g.mute();
    subs.push(sub('sound stays muted for the whole overlapping ad', m.every((x) => x.muted === true), JSON.stringify(m)));
    await g.close();
    // c) home + level select during rewardedBreak
    g = await open('poki', { cfg: { adMs: 2000 }, label: 'poki-5c' });
    await g.click('#btn-play'); await g.waitLevel(1);
    await g.click('#btn-reward'); await g.wait(200);
    await g.click('#btn-home'); await g.click('#level-grid button:nth-child(1)');
    await g.waitAdEnd('rewardedBreak'); await g.wait(300);
    d = duringAd(await g.log());
    subs.push(sub('home → level select during rewardedBreak', !d.length, `events while ad pending: ${d.join(', ')}`));
    await g.close();
    // d) home + PLAY during commercialBreak
    g = await open('poki', { cfg: { adMs: 2000 }, label: 'poki-5d' });
    await g.click('#btn-play'); await g.waitLevel(1); await g.solve1(); await g.click('#panel-btn'); await g.wait(200);
    await g.click('#btn-home'); await g.click('#btn-play');
    await g.waitAdEnd('commercialBreak'); await g.wait(300);
    log = await g.log();
    d = duringAd(log);
    subs.push(sub('home → PLAY during commercialBreak', !d.length, `events while ad pending: ${d.join(', ')}`));
    subs.push(sub('…and start/stop still alternate', !dupes(log).length, dupes(log).join('; ')));
    await g.close();
    return subs;
  });

  await check(6, 'Poki: audio muted while ads are pending', async () => {
    const g = await open('poki', { cfg: { adMs: 800 }, label: 'poki-6' });
    await g.click('#btn-play'); await g.waitLevel(1); await g.solve1(); await g.click('#panel-btn');
    await g.page.waitForFunction(() => (window.__log || []).some((e) => e.ev === 'commercialBreak'));
    const mid = await g.ev(() => Sfx.muted);
    await g.waitAdEnd('commercialBreak'); await g.waitLevel(2);
    const after = await g.ev(() => Sfx.muted);
    await g.click('#btn-reward'); await g.wait(400);
    const midR = await g.ev(() => Sfx.muted);
    await g.waitAdEnd('rewardedBreak');
    const afterR = await g.ev(() => Sfx.muted);
    const m = await g.mute();
    await g.close();
    return [sub('Sfx.muted during commercialBreak', mid === true), sub('unmuted after commercialBreak', after === false),
      sub('Sfx.muted during rewardedBreak', midR === true), sub('unmuted after rewardedBreak', afterR === false),
      sub('fake SDK mid-ad samples all muted', m.every((x) => x.muted), JSON.stringify(m))];
  });

  await check(7, 'Poki: rewarded grants only on true; double-click safe', async () => {
    const subs = [];
    for (const [reward, expect] of [[true, 50], [false, 0], ['reject', 0]]) {
      const g = await open('poki', { cfg: { reward }, label: 'poki-7' });
      await g.click('#btn-play'); await g.waitLevel(1);
      const b0 = await g.bulbs(); await g.click('#btn-reward'); await g.waitAdEnd('rewardedBreak'); await g.wait(200);
      const delta = (await g.bulbs()) - b0, hud = await g.page.textContent('#bulb-count');
      subs.push(sub(`rewardedBreak → ${reward}: +${expect}`, delta === expect && hud === String(b0 + expect), `got +${delta}, HUD ${hud}`));
      subs.push(sub(`rewardedBreak → ${reward}: gameplay resumes`, lastPlay(await g.log()) === 'gameplayStart'));
      await g.close();
    }
    const g = await open('poki', { cfg: { reward: true }, label: 'poki-7dbl' });
    await g.click('#btn-play'); await g.waitLevel(1);
    const b0 = await g.bulbs();
    const bb = await g.page.locator('#btn-reward').boundingBox();
    await g.page.mouse.dblclick(bb.x + bb.width / 2, bb.y + bb.height / 2);
    await g.wait(1500);
    const log = await g.log(), n = log.filter((e) => e.ev === 'rewardedBreak').length, delta = (await g.bulbs()) - b0;
    subs.push(sub('double-click 🎬 starts one ad and grants +50 once', n === 1 && delta === 50, `${n} rewardedBreak calls, +${delta} bulbs`));
    subs.push(sub('double-click 🎬: no duplicate start/stop', !dupes(log).length && !duringAd(log).length, [...dupes(log), ...duringAd(log)].join('; ')));
    await g.close();
    return subs;
  });

  await check(9, 'Poki: adblock (SDK blocked, or init rejects) → fully playable, no errors', async () => {
    const subs = [];
    for (const mode of ['blocked', 'initReject']) {
      const g = await open('poki', mode === 'blocked' ? { block: true, label: 'poki-adblock' } : { cfg: { initReject: true }, label: 'poki-initReject' });
      await g.click('#btn-play'); await g.waitLevel(1); await g.solve1(); await g.click('#panel-btn'); await g.waitLevel(2);
      const b0 = await g.bulbs(); await g.click('#btn-reward'); await g.wait(800);
      const b1 = await g.bulbs();
      await g.click('#btn-hint'); await g.waitPanel(); await g.click('#panel-btn');
      await g.solveCurrent(); await g.click('#panel-btn'); await g.waitLevel(3);
      const sdk = await g.ev(() => typeof window.PokiSDK);
      subs.push(sub(`${mode}: boots, levels 1→3 playable (PokiSDK ${sdk})`, true));
      subs.push(sub(`${mode}: 🎬 grants nothing`, b1 === b0, `${b0} → ${b1}`));
      const rv = await g.ev(() => getComputedStyle(document.querySelector('#btn-reward')).display);
      if (mode === 'blocked') subs.push(sub('blocked: 🎬 button hidden when no SDK (CrazyGames forbids clickable-but-dead reward buttons)', rv === 'none', `🎬 button display=${rv}, clicking does nothing`, true));
      subs.push(sub(`${mode}: no page errors`, !g.errors.length, g.errors.join(' | ')));
      await g.close();
    }
    return subs;
  });

  await check(10, 'No page scroll from Space/arrows/wheel/touch (standalone and inside an iframe)', async () => {
    const subs = [];
    const g = await open('poki', { label: 'poki-10' });
    await g.click('#btn-play'); await g.waitLevel(1);
    for (const k of ['Space', 'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'PageDown', 'End']) await g.page.keyboard.press(k);
    await g.page.mouse.move(480, 320); await g.page.mouse.wheel(0, 800); await g.page.mouse.wheel(600, 0); await g.wait(300);
    const s = await g.ev(() => [scrollX, scrollY, document.scrollingElement.scrollTop, document.documentElement.scrollWidth > innerWidth, document.documentElement.scrollHeight > innerHeight]);
    subs.push(sub('standalone: keys + wheel do not scroll', s[0] === 0 && s[1] === 0 && s[2] === 0 && !s[3] && !s[4], JSON.stringify(s)));
    await g.close();
    const t = await open('poki', { touch: true, mobile: true, viewport: { width: 844, height: 390 }, label: 'poki-10t' });
    await t.click('#btn-play'); await t.waitLevel(1);
    const cdp = await t.ctx.newCDPSession(t.page);
    await touchDrag(cdp, [420, 300], [420, 50]);
    const st = await t.ev(() => [scrollX, scrollY, visualViewport.offsetTop, visualViewport.scale]);
    subs.push(sub('standalone: touch swipe does not scroll/zoom', st[0] === 0 && st[1] === 0 && st[2] === 0 && st[3] === 1, JSON.stringify(st)));
    await t.close();
    // iframe in a long host page: game must not scroll the parent
    const h = await open('poki', { url: `${BASE}/host.html?t=poki`, noWait: true, viewport: { width: 1280, height: 720 }, label: 'poki-10-iframe' });
    const fr = h.page.frameLocator('#game');
    await fr.locator('#level-grid button').first().waitFor();
    const play = await fr.locator('#btn-play').boundingBox();
    await h.page.mouse.click(play.x + play.width / 2, play.y + play.height / 2); await h.wait(300);
    const keyRes = {};
    for (const k of ['Space', 'ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'PageDown']) {
      await h.ev(() => scrollTo(0, 0)); await h.page.keyboard.press(k); await h.wait(150);
      keyRes[k] = await h.ev(() => scrollY);
    }
    const req = ['Space', 'ArrowDown', 'ArrowUp'].filter((k) => keyRes[k] !== 0);
    subs.push(sub('iframe: Space/ArrowUp/ArrowDown do not scroll host page', !req.length, JSON.stringify(keyRes)));
    subs.push(sub('iframe: PageDown does not scroll host page', keyRes.PageDown === 0, `PageDown scrolled host to ${keyRes.PageDown}px (game.js:310 only blocks Space/ArrowUp/ArrowDown)`, true));
    await h.ev(() => scrollTo(0, 0));
    await h.page.mouse.move(play.x, play.y); await h.page.mouse.wheel(0, 600); await h.wait(400);
    const wy = await h.ev(() => scrollY);
    subs.push(sub('iframe: mouse wheel over the game does not scroll host page', wy === 0, `host scrollY=${wy} after wheel over the game iframe (no wheel preventDefault)`));
    await h.close();
    return subs;
  });

  await check(13, 'CrazyGames: init awaited, loading events, gameplay rules, midgame/rewarded, adError, mute', async () => {
    const subs = [];
    const g = await open('crazygames', { label: 'cg' });
    await g.wait(1200);
    const L0 = await g.log(), ix = (n) => L0.findIndex((e) => e.ev === n);
    subs.push(sub('init → (await) → loadingStart → loadingStop', ix('init') === 0 && ix('init:settled') < ix('loadingStart') && ix('loadingStart') < ix('loadingStop') && ix('init:settled') > 0,
      JSON.stringify(L0.map((e) => e.ev))));
    subs.push(sub('no gameplayStart on load', !L0.some((e) => /^gameplay/.test(e.ev))));
    await g.click('#btn-play'); await g.waitLevel(1);
    await g.click('#btn-hint'); await g.waitPanel(); subs.push(sub('gameplayStop on hint', lastPlay(await g.log()) === 'gameplayStop')); await g.click('#panel-btn');
    const b0 = await g.bulbs(); await g.click('#btn-reward'); await g.waitAdEnd('requestAd:rewarded'); await g.wait(200);
    subs.push(sub("requestAd('rewarded') grants +50 on adFinished", (await g.bulbs()) - b0 === 50, `+${(await g.bulbs()) - b0}`));
    await g.solve1(); subs.push(sub('gameplayStop on win', lastPlay(await g.log()) === 'gameplayStop'));
    await g.click('#panel-btn'); await g.waitAdEnd('requestAd:midgame'); await g.waitLevel(2);
    await g.click('#btn-home'); subs.push(sub('gameplayStop on home', lastPlay(await g.log()) === 'gameplayStop'));
    await g.click('#btn-play'); await g.waitLevel(2);
    let log = await g.log();
    const mid = log.filter((e) => e.ev === 'requestAd:midgame');
    subs.push(sub("requestAd('midgame') once, between levels", mid.length === 1 && mid[0].done === true, JSON.stringify(mid)));
    subs.push(sub('no duplicate start/stop', !dupes(log).length, dupes(log).join('; ')));
    subs.push(sub('no events while ad pending', !duringAd(log).length, duringAd(log).join(', ')));
    subs.push(sub('gameplayStop before each ad', !stopBeforeAds(log).length, stopBeforeAds(log).join('; ')));
    const m = await g.mute();
    subs.push(sub('sound muted while ad pending', m.length >= 2 && m.every((x) => x.muted), JSON.stringify(m)));
    await g.close();
    const e = await open('crazygames', { cfg: { adError: true }, label: 'cg-adError' });
    await e.click('#btn-play'); await e.waitLevel(1);
    const e0 = await e.bulbs(); await e.click('#btn-reward'); await e.waitAdEnd('requestAd:rewarded'); await e.wait(200);
    subs.push(sub('adError on rewarded: no bulbs', (await e.bulbs()) === e0, `${e0} → ${await e.bulbs()}`));
    subs.push(sub('adError on rewarded: gameplay resumes', lastPlay(await e.log()) === 'gameplayStart'));
    await e.solve1(); await e.click('#panel-btn'); await e.waitLevel(2);
    subs.push(sub('adError on midgame: next level starts, unmuted', (await e.ev(() => Sfx.muted)) === false));
    subs.push(sub('no errors', !e.errors.length, e.errors.join(' | ')));
    await e.close();
    const b = await open('crazygames', { block: true, label: 'cg-adblock' });
    await b.click('#btn-play'); await b.waitLevel(1); await b.solve1(); await b.click('#panel-btn'); await b.waitLevel(2);
    subs.push(sub('SDK blocked: playable', !b.errors.length, b.errors.join(' | ')));
    await b.close();
    return subs;
  });

  await check(14, 'Web build: no SDK, no 3rd-party requests, no 🎬, bigger clear bonus, playable', async () => {
    const html = fs.readFileSync(path.join(DIST, 'web', 'index.html'), 'utf8');
    const g = await open('web', { label: 'web' });
    await g.click('#btn-play'); await g.waitLevel(1);
    const vis = await g.ev(() => getComputedStyle(document.querySelector('#btn-reward')).display);
    const b0 = await g.bulbs(); await g.solve1();
    const bonus = (await g.bulbs()) - b0;
    await g.click('#panel-btn'); await g.waitLevel(2, 1500);
    await g.solveCurrent(); await g.click('#panel-btn'); await g.waitLevel(3, 1500);
    const ext = g.requests.filter((u) => !u.startsWith(BASE));
    const r = [sub('no SDK <script> in index.html', !/<script[^>]+src="https?:/.test(html) && !/poki|crazygames/i.test(html.replace(/PLATFORM = 'none'/, ''))),
      sub('zero third-party requests', !ext.length, ext.join(', ')),
      sub('🎬 hidden', vis === 'none', `display=${vis}`),
      sub('clear bonus 15 (vs 5 with ads)', bonus === 15, `+${bonus}`),
      sub('no errors', !g.errors.length, g.errors.join(' | '))];
    await g.close();
    return r;
  });

  await check(15, 'Mobile: real touch tap + touch drag work', async () => {
    const g = await open('poki', { touch: true, mobile: true, viewport: { width: 844, height: 390 }, label: 'touch' });
    await g.click('#btn-play'); await g.waitLevel(1);
    await g.tapObj(2); await g.waitPanel();
    await g.click('#panel-btn'); await g.waitAdEnd('commercialBreak'); await g.waitLevel(2);
    const cdp = await g.ctx.newCDPSession(g.page);
    const from = await g.objCenter(2);
    const s = await g.page.locator('#stage').boundingBox(), k = await g.ev(() => scale);
    await touchDrag(cdp, from, [s.x + 150 * k, s.y + 120 * k]);
    const rug = await g.ev(() => { const r = document.querySelectorAll('#stage .obj')[2]; return [parseFloat(r.style.left), parseFloat(r.style.top)]; });
    await g.tapObj(1);
    const won = await g.ev(() => api.done);
    await g.page.screenshot({ path: path.join(OUT, 'req15-touch.png') });
    const r = [sub('touch tap solves level 1 and taps NEXT', true),
      sub('touch drag moves the rug', Math.abs(rug[0] - 10) < 30 && Math.abs(rug[1] - 55) < 30, `rug at ${rug} (expected ≈10,55)`),
      sub('touch tap on revealed mouse wins level 2', won === true),
      sub('no errors', !g.errors.length, g.errors.join(' | '))];
    await g.close();
    return r;
  });

  async function layoutCheck(g, vw, vh, tag) {
    const r = await g.ev(() => { const b = document.querySelector('#app').getBoundingClientRect(); const d = document.documentElement;
      return { l: b.left, t: b.top, r: b.right, b: b.bottom, sw: d.scrollWidth, sh: d.scrollHeight, cw: d.clientWidth, ch: d.clientHeight, sx: scrollX, sy: scrollY }; });
    const subs = [];
    const e = 1;
    subs.push(sub(`${tag}: #app fully visible`, r.l >= -e && r.t >= -e && r.r <= vw + e && r.b <= vh + e, JSON.stringify(r)));
    subs.push(sub(`${tag}: centered`, Math.abs(r.l - (vw - r.r)) <= e && Math.abs(r.t - (vh - r.b)) <= e, JSON.stringify(r)));
    subs.push(sub(`${tag}: no scrollbars / scroll`, r.sw <= r.cw && r.sh <= r.ch && !r.sx && !r.sy, JSON.stringify(r)));
    return subs;
  }
  async function hitCheck(g, tag) { // does a tap at the 3rd obj's centre land on it and solve level 1?
    await g.ev(() => startLevel(0)); await g.wait(200);
    const [x, y] = await g.objCenter(2);
    const hit = await g.ev(([x, y]) => document.elementFromPoint(x, y)?.closest('.obj') === document.querySelectorAll('#stage .obj')[2], [x, y]);
    // also a non-centre point: the "3" glyph's upper part (stage 500, 120)
    const s = await g.page.locator('#stage').boundingBox(), k = await g.ev(() => scale);
    const hit2 = await g.ev(([x, y]) => document.elementFromPoint(x, y)?.closest('.obj') === document.querySelectorAll('#stage .obj')[2], [s.x + 500 * k, s.y + 120 * k]);
    await g.tapObj(2);
    const won = await g.ev(() => api.done);
    return [sub(`${tag}: taps land on the right element`, hit && hit2, `centre hit=${hit} offset hit=${hit2}`), sub(`${tag}: tap wins level 1`, won)];
  }

  await check(16, 'Viewports: #app visible, centered, no scrollbars, taps accurate', async () => {
    const subs = [];
    for (const [w, h] of [[667, 375], [844, 390], [1024, 768], [1366, 768], [1920, 1080], [2560, 1080], [480, 320]]) {
      const g = await open('poki', { viewport: { width: w, height: h }, label: `vp-${w}x${h}` });
      subs.push(...await layoutCheck(g, w, h, `${w}x${h}`));
      await g.click('#btn-play'); await g.waitLevel(1);
      subs.push(...await hitCheck(g, `${w}x${h}`));
      await g.page.screenshot({ path: path.join(OUT, `req16-${w}x${h}.png`) });
      await g.close();
    }
    return subs;
  });

  await check(17, 'Rotate overlay: portrait touch phone yes, portrait desktop no', async () => {
    const a = await open('poki', { viewport: { width: 390, height: 844 }, touch: true, mobile: true, label: 'portrait-phone' });
    const pa = await a.ev(() => getComputedStyle(document.querySelector('#rotate')).display);
    await a.page.screenshot({ path: path.join(OUT, 'req17-portrait-phone.png') }); await a.close();
    const b = await open('poki', { viewport: { width: 390, height: 844 }, label: 'portrait-desktop' });
    const pb = await b.ev(() => getComputedStyle(document.querySelector('#rotate')).display); await b.close();
    const c = await open('poki', { viewport: { width: 844, height: 390 }, touch: true, mobile: true, label: 'landscape-phone' });
    const pc = await c.ev(() => getComputedStyle(document.querySelector('#rotate')).display); await c.close();
    return [sub('portrait phone shows overlay', pa === 'flex', pa), sub('portrait desktop hides overlay', pb === 'none', pb), sub('landscape phone hides overlay', pc === 'none', pc)];
  });

  await check(18, 'Embedded in an 800x450 iframe: fits and plays', async () => {
    const g = await open('poki', { url: `${BASE}/host.html?t=poki&w=800&h=450`, noWait: true, viewport: { width: 1280, height: 720 }, label: 'iframe' });
    const fr = g.page.frameLocator('#game');
    await fr.locator('#level-grid button').first().waitFor();
    const ifb = await g.page.locator('#game').boundingBox(), app = await fr.locator('#app').boundingBox();
    const inside = app.x >= ifb.x - 1 && app.y >= ifb.y - 1 && app.x + app.width <= ifb.x + ifb.width + 1 && app.y + app.height <= ifb.y + ifb.height + 1;
    const centered = Math.abs((app.x - ifb.x) - (ifb.x + ifb.width - app.x - app.width)) <= 1;
    const c = async (loc) => { const b = await loc.boundingBox(); await g.page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); await g.wait(200); };
    await c(fr.locator('#btn-play'));
    await c(fr.locator('#stage .obj').nth(2));
    await fr.locator('#panel:not(.hidden)').waitFor({ timeout: 4000 });
    await c(fr.locator('#panel-btn'));
    await fr.locator('#level-label', { hasText: 'LEVEL 2' }).waitFor({ timeout: 4000 });
    await g.wait(700);
    await g.page.screenshot({ path: path.join(OUT, 'req18-iframe.png') });
    const frame = g.page.frames().find((f) => f.url().includes('/poki/index.html'));
    const log = await frame.evaluate(() => window.__log);
    const r = [sub('#app inside iframe and centered', inside && centered, JSON.stringify({ ifb, app })),
      sub('tap → win → NEXT → level 2 inside iframe', true),
      sub('SDK events sane in iframe', !dupes(log).length && log.some((e) => e.ev === 'commercialBreak')),
      sub('no errors', !g.errors.length, g.errors.join(' | '))];
    await g.close();
    return r;
  });

  await check(19, 'Resize mid-level (and mid-drag) keeps layout + input correct', async () => {
    const subs = [];
    const g = await open('poki', { viewport: { width: 1366, height: 768 }, label: 'resize' });
    await g.click('#btn-play'); await g.waitLevel(1);
    await g.ev(() => startLevel(1)); await g.wait(200);
    await g.page.setViewportSize({ width: 700, height: 500 }); await g.wait(200);
    subs.push(...await layoutCheck(g, 700, 500, 'after 1366x768→700x500'));
    // drag the rug, resizing in the middle of the drag
    const [fx, fy] = await g.objCenter(2);
    await g.page.mouse.move(fx, fy); await g.page.mouse.down(); await g.page.mouse.move(fx - 40, fy - 40, { steps: 4 });
    await g.page.setViewportSize({ width: 1100, height: 700 }); await g.wait(200);
    const s = await g.page.locator('#stage').boundingBox(), k = await g.ev(() => scale);
    await g.page.mouse.move(s.x + 150 * k, s.y + 120 * k, { steps: 8 }); await g.page.mouse.up(); await g.wait(200);
    const rug = await g.ev(() => { const r = document.querySelectorAll('#stage .obj')[2]; return [parseFloat(r.style.left), parseFloat(r.style.top)]; });
    subs.push(sub('rug follows pointer across a mid-drag resize (≈ stage 10,55)', Math.abs(rug[0] - 10) < 25 && Math.abs(rug[1] - 55) < 25, `rug at ${rug}`));
    subs.push(...await layoutCheck(g, 1100, 700, 'after →1100x700'));
    await g.tapObj(1);
    subs.push(sub('tap after resize hits mouse and wins', await g.ev(() => api.done)));
    subs.push(sub('no errors', !g.errors.length, g.errors.join(' | ')));
    await g.close();
    return subs;
  });

  await check(20, 'localStorage throws → still playable', async () => {
    const subs = [];
    const variants = {
      'Storage.prototype methods throw': () => { for (const m of ['getItem', 'setItem', 'removeItem', 'clear']) Storage.prototype[m] = () => { throw new Error('SecurityError (test)'); }; },
      'window.localStorage getter throws': () => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('SecurityError (test)'); } }); },
    };
    for (const [name, fn] of Object.entries(variants)) {
      const g = await open('poki', { init: [{ fn }], label: 'ls-' + name });
      await g.click('#btn-play'); await g.waitLevel(1); await g.solve1(); await g.click('#panel-btn'); await g.waitLevel(2);
      await g.click('#btn-sound'); await g.click('#btn-hint'); await g.waitPanel(); await g.click('#panel-btn');
      subs.push(sub(name, !g.errors.length, g.errors.join(' | ')));
      await g.close();
    }
    return subs;
  });

  const seed = (value) => ({ fn: (v) => { if (!sessionStorage.getItem('__seeded')) { localStorage.setItem('trickytaps', v); sessionStorage.setItem('__seeded', '1'); } }, arg: value });
  const gridState = (g) => g.ev(() => [...document.querySelectorAll('#level-grid button')].map((b) => (b.disabled ? 0 : b.classList.contains('done') ? 2 : 1)));

  await check(21, 'Save robustness: corrupt JSON, v1 save migration', async () => {
    const subs = [];
    let g = await open('poki', { init: [seed('{not json')], label: 'save-corrupt' });
    let gs = await gridState(g);
    subs.push(sub('corrupt JSON: boots, 50 bulbs, only level 1 unlocked', (await g.bulbs()) === 50 && gs[0] === 1 && gs.slice(1).every((x) => x === 0), `bulbs ${await g.bulbs()} grid ${gs.join('')}`));
    await g.click('#btn-play'); await g.waitLevel(1); await g.solve1();
    subs.push(sub('corrupt JSON: playable, overwritten with valid save', !g.errors.length && Array.isArray(JSON.parse(await g.ev(() => localStorage.getItem('trickytaps'))).cleared), g.errors.join(' | ')));
    await g.close();
    g = await open('poki', { init: [seed(JSON.stringify({ unlocked: 5, cleared: [0, 1, 2, 3], bulbs: 70 }))], label: 'save-v1' });
    gs = await gridState(g);
    // v1 cleared indices 0-3 = largest, mouse, jar, snowman; expected grid follows the current play order
    const done = ['largest', 'mouse', 'jar', 'snowman'];
    const ids = await g.ev(() => LEVELS.map((l) => l.id));
    const want = ids.map((id, i) => (done.includes(id) ? 2 : i === 0 || done.includes(ids[i - 1]) ? 1 : 0));
    subs.push(sub('v1 save: the 4 cleared levels done, their successors unlocked, rest locked', gs.join('') === want.join(''), `grid ${gs.join('')} want ${want.join('')}`));
    subs.push(sub('v1 save: 70 bulbs', (await g.bulbs()) === 70 && (await g.page.textContent('#bulb-count')) === '70'));
    const firstOpen = ids.findIndex((id) => !done.includes(id)) + 1;
    await g.click('#btn-play'); await g.waitLevel(firstOpen);
    subs.push(sub(`v1 save: PLAY resumes at the first unsolved level (${firstOpen})`, true));
    await g.click('#btn-sound');
    const saved = JSON.parse(await g.ev(() => localStorage.getItem('trickytaps')));
    subs.push(sub('v1 save: rewritten as ids, no "unlocked"', JSON.stringify(saved.cleared) === JSON.stringify(['largest', 'mouse', 'jar', 'snowman']) && !('unlocked' in saved), JSON.stringify(saved)));
    subs.push(sub('v1 save: no errors', !g.errors.length, g.errors.join(' | ')));
    await g.close();
    for (const bad of ['null', '[]', '"str"', JSON.stringify({ bulbs: 'lots', cleared: 'x', muted: 'no' }), JSON.stringify({ bulbs: -40 })]) {
      g = await open('poki', { init: [seed(bad)], label: 'save-bad' });
      await g.click('#btn-play'); await g.waitLevel(1);
      await g.click('#btn-hint'); await g.waitPanel(); await g.click('#panel-btn');
      const b = await g.bulbs();
      subs.push(sub(`wrong-typed save ${bad}: no crash`, !g.errors.length, g.errors.join(' | ')));
      subs.push(sub(`wrong-typed save ${bad}: bulbs stays a non-negative number`, typeof b === 'number' && b >= 0 && !Number.isNaN(b), `Save.data.bulbs = ${JSON.stringify(b)} (HUD "${await g.page.textContent('#bulb-count')}") — Save.load (game.js:14) doesn't validate field types`, true));
      await g.close();
    }
    return subs;
  });

  await check(22, 'Bulbs: never negative; hint 25 once per level; skip 50, blocked when short', async () => {
    const subs = [];
    const watch = { fn: () => { window.__bulbMin = Infinity; addEventListener('DOMContentLoaded', () => new MutationObserver(() => {
      window.__bulbMin = Math.min(window.__bulbMin, Number(document.querySelector('#bulb-count').textContent)); }).observe(document.querySelector('#bulb-count'), { childList: true, characterData: true, subtree: true })); } };
    let g = await open('poki', { init: [seed(JSON.stringify({ cleared: [], bulbs: 30 })), watch], label: 'bulbs-30' });
    await g.click('#btn-play'); await g.waitLevel(1);
    await g.click('#btn-hint'); await g.waitPanel(); const t1 = await g.panelTitle(); await g.click('#panel-btn');
    subs.push(sub('hint costs 25 (30→5)', (await g.bulbs()) === 5 && t1 === 'Hint', `${await g.bulbs()} "${t1}"`));
    await g.click('#btn-hint'); await g.waitPanel(); const t2 = await g.panelTitle(); await g.click('#panel-btn');
    subs.push(sub('re-opening hint is free', (await g.bulbs()) === 5 && t2 === 'Hint', `${await g.bulbs()} "${t2}"`));
    await g.click('#btn-skip'); await g.waitPanel(); const t3 = await g.panelTitle(); await g.click('#panel-btn');
    subs.push(sub('skip with 5 → "Out of bulbs" panel, level not won, bulbs unchanged', t3 === 'Out of bulbs' && (await g.bulbs()) === 5 && !(await g.ev(() => api.done)), `"${t3}" bulbs ${await g.bulbs()}`));
    await g.ev(() => startLevel(1)); await g.wait(200);
    await g.click('#btn-hint'); await g.waitPanel(); const t4 = await g.panelTitle(); await g.click('#panel-btn');
    subs.push(sub('hint with 5 on a new level → "Out of bulbs"', t4 === 'Out of bulbs' && (await g.bulbs()) === 5, `"${t4}" bulbs ${await g.bulbs()}`));
    await g.close();
    g = await open('poki', { init: [seed(JSON.stringify({ cleared: [], bulbs: 50 })), watch], label: 'bulbs-50' });
    await g.click('#btn-play'); await g.waitLevel(1);
    await g.click('#btn-skip'); await g.waitPanel();
    subs.push(sub('skip with exactly 50 → wins, bulbs 0 (+5 clear bonus = 5)', (await g.panelTitle()) === 'Brilliant!' && (await g.bulbs()) === 5, `"${await g.panelTitle()}" bulbs ${await g.bulbs()}`));
    await g.click('#panel-btn'); await g.waitLevel(2);
    for (let i = 0; i < 3; i++) { await g.click('#btn-skip'); if (await g.panelOpen()) await g.click('#panel-btn'); await g.click('#btn-hint'); if (await g.panelOpen()) await g.click('#panel-btn'); }
    const min = await g.ev(() => window.__bulbMin);
    subs.push(sub('bulbs never displayed negative', min >= 0 && (await g.bulbs()) >= 0, `min shown ${min}`));
    await g.close();
    return subs;
  });

  await check(23, 'Rapid clicks on PLAY / NEXT / level buttons', async () => {
    const subs = [];
    const dbl = async (g, sel, n = 2) => { const b = await g.page.locator(sel).boundingBox(); await g.page.mouse.click(b.x + b.width / 2, b.y + b.height / 2, { clickCount: n, delay: 10 }); };
    let g = await open('poki', { label: 'rapid' });
    await dbl(g, '#btn-play', 3); await g.wait(400);
    let log = await g.log();
    subs.push(sub('triple-click PLAY → one gameplayStart, level 1', log.filter((e) => e.ev === 'gameplayStart').length === 1 && (await g.label()) === 'LEVEL 1'));
    await g.solve1(); await dbl(g, '#panel-btn', 3); await g.waitAdEnd('commercialBreak'); await g.wait(800);
    log = await g.log();
    subs.push(sub('triple-click NEXT → one commercialBreak, level 2', log.filter((e) => e.ev === 'commercialBreak').length === 1 && (await g.label()) === 'LEVEL 2', `${log.filter((e) => e.ev === 'commercialBreak').length} breaks, ${await g.label()}`));
    await g.click('#btn-home'); await dbl(g, '#level-grid button:nth-child(1)', 3); await g.wait(400);
    log = await g.log();
    subs.push(sub('triple-click level button → one level start', !dupes(log).length && (await g.label()) === 'LEVEL 1', dupes(log).join('; ')));
    await g.close();
    // synthetic double activation in one task (e.g. touch ghost-click / keyboard+click): NEXT handler has no re-entry guard
    g = await open('poki', { label: 'rapid-synth' });
    await g.click('#btn-play'); await g.waitLevel(1); await g.solve1();
    await g.ev(() => { const b = document.querySelector('#panel-btn'); b.click(); b.click(); });
    await g.wait(1500);
    log = await g.log();
    const n = log.filter((e) => e.ev === 'commercialBreak').length;
    subs.push(sub('NEXT activated twice in one tick → still one ad, level 2', n === 1 && (await g.label()) === 'LEVEL 2', `${n} commercialBreaks, now on ${await g.label()} (game.js:230 has no in-flight guard)`, true));
    await g.close();
    // home within 1.1s of winning, then start a level: stale win timer pops "Brilliant!" over the fresh level
    g = await open('poki', { label: 'rapid-stale' });
    await g.click('#btn-play'); await g.waitLevel(1);
    await g.tapObj(2); await g.wait(200);
    await g.click('#btn-home'); await g.click('#level-grid button:nth-child(1)');
    await g.wait(1500);
    const open1 = await g.panelOpen(), playing = lastPlay(await g.log());
    subs.push(sub('home right after a win, then pick a level → no stale win panel over the new level', !open1,
      `panel "${await g.panelTitle()}" opened over the freshly started level while gameplay is ${playing === 'gameplayStart' ? 'running (no gameplayStop)' : 'stopped'}; its NEXT runs commercialBreak + startLevel(cur+1) (game.js:227 timer not cancelled)`));
    await g.close();
    return subs;
  });

  await check(24, 'Leak check: 200 startLevel calls', async () => {
    const counter = { fn: () => { const si = setInterval, ci = clearInterval; window.__iv = new Set();
      window.setInterval = function (...a) { const id = si.apply(this, a); window.__iv.add(id); return id; };
      window.clearInterval = function (id) { window.__iv.delete(id); return ci.call(this, id); }; } };
    const g = await open('poki', { init: [counter], label: 'leak' });
    await g.click('#btn-play'); await g.waitLevel(1);
    const cdp = await g.ctx.newCDPSession(g.page); await cdp.send('Performance.enable');
    const metrics = async () => { await cdp.send('HeapProfiler.collectGarbage'); const m = (await cdp.send('Performance.getMetrics')).metrics; const v = (n) => m.find((x) => x.name === n).value; return { nodes: v('Nodes'), listeners: v('JSEventListeners') }; };
    const snap = () => g.ev(() => ({ stage: document.querySelectorAll('#stage *').length, all: document.getElementsByTagName('*').length, iv: window.__iv.size }));
    await g.ev(() => startLevel(0)); await g.wait(1600);
    const s0 = await snap(), m0 = await metrics();
    await g.ev(() => { for (let k = 0; k < 200; k++) startLevel(k % LEVELS.length); startLevel(0); });
    await g.wait(1600);
    const s1 = await snap(), m1 = await metrics();
    const log = await g.log();
    const r = [sub('#stage node count stable', s1.stage === s0.stage, `${s0.stage} → ${s1.stage}`),
      sub('document element count stable', s1.all === s0.all, `${s0.all} → ${s1.all}`),
      sub('no running intervals left behind', s1.iv <= s0.iv, `${s0.iv} → ${s1.iv}`),
      sub('DOM nodes / JS listeners after GC do not grow (±200)', m1.nodes - m0.nodes < 200 && m1.listeners - m0.listeners < 200, `${JSON.stringify(m0)} → ${JSON.stringify(m1)}`),
      sub('no duplicate gameplayStart from restarts', !dupes(log).length, dupes(log).join('; ')),
      sub('no errors', !g.errors.length, g.errors.join(' | '))];
    await g.close();
    return r;
  });

  await check(11, 'No external links/navigations; requests only to own origin + SDK host', async () => {
    const subs = [];
    const allowed = { poki: /^https:\/\/game-cdn\.poki\.com\//, crazygames: /^https:\/\/sdk\.crazygames\.com\//, web: /^$/ };
    for (const t of ['poki', 'crazygames', 'web']) {
      const src = execSync(`cat "${path.join(DIST, t)}"/index.html "${path.join(DIST, t)}"/src/*.js "${path.join(DIST, t)}"/src/levels/*.js "${path.join(DIST, t)}"/src/*.css`).toString();
      const links = src.match(/<a\s[^>]*href|window\.open\(|location\.(href|assign|replace)\s*[=(]|target="_blank"/g) || [];
      subs.push(sub(`${t}: no links / window.open / location changes in source`, !links.length, links.join(', ')));
      if (!allRequests[t].size) { const g = await open(t, { label: 'net-' + t }); await g.click('#btn-play'); await g.waitLevel(1); await g.close(); }
      const ext = [...allRequests[t]].filter((u) => !u.startsWith(BASE) && !allowed[t].test(u) && !u.startsWith('data:'));
      subs.push(sub(`${t}: ${allRequests[t].size} unique requests, none third-party`, !ext.length, ext.join(', ')));
    }
    const g = await open('poki', { label: 'nav' });
    await g.click('#btn-play'); await g.waitLevel(1); await g.solve1(); await g.click('#panel-btn'); await g.waitLevel(2); await g.click('#btn-home');
    subs.push(sub('no navigations during play', g.navs.length === 1, g.navs.join(', ')));
    await g.close();
    return subs;
  });

  await check(12, 'Build size', async () => {
    const z = ['poki', 'crazygames', 'web'].map((t) => [t, fs.statSync(path.join(DIST, `tricky-taps-${t}.zip`)).size]);
    const un = Number(execSync(`du -sb "${path.join(DIST, 'poki')}" | cut -f1`).toString().trim());
    const files = Number(execSync(`find "${path.join(DIST, 'poki')}" -type f | wc -l`).toString().trim());
    const detail = z.map(([t, s]) => `${t} zip ${(s / 1024).toFixed(1)} KB`).join(', ') + `; poki unzipped ${(un / 1024).toFixed(1)} KB in ${files} files (all loaded at boot)`;
    report(12, 'Build size', z.every(([, s]) => s < 100 * 1024) ? 'PASS' : z.every(([, s]) => s < 5 * 1024 * 1024) ? 'WARN' : 'FAIL',
      detail + (z.every(([, s]) => s < 100 * 1024) ? '' : ' (DEPLOY.md promises < 100 KB)'));
  });

  await check(25, 'Zero console errors / page errors across every run above', async () => {
    const byLabel = {};
    for (const [l, m] of allErrors) (byLabel[l] = byLabel[l] || []).push(m);
    return [sub(`${allErrors.length} errors`, !allErrors.length, Object.entries(byLabel).map(([l, m]) => `${l}: ${[...new Set(m)].join(' | ')}`).join('\n'))];
  });

  if (session) await session.g.close();
  await browser.close();
  srv.close();
  execSync(`rm -rf "${DIST}"`);
  const f = results.filter((r) => r.status === 'FAIL').length, w = results.filter((r) => r.status === 'WARN').length;
  console.log(`\n${results.length} requirements: ${results.length - f - w} PASS, ${w} WARN, ${f} FAIL`);
  process.exit(f ? 1 : 0);
}

// CDP touch drag (real touch events → pointer events)
async function touchDrag(cdp, [x0, y0], [x1, y1], steps = 12) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + ((x1 - x0) * i) / steps, y: y0 + ((y1 - y0) * i) / steps }] });
    await sleep(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(250);
}

main().catch((e) => { console.error(e); process.exit(2); });
