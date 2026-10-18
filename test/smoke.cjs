// Headless smoke test (not part of `node --test`).
//   NODE_PATH=$(npm root -g) node test/smoke.cjs
// Starts its own static server, runs Chromium at 390x844 and 1280x720 with the
// Poki SDK blocked (and localStorage throwing in the portrait run), plays
// shift 1 to a win via window.__door, opens the Daily Door, checks for console
// errors and page scroll, and writes screenshots to test/screenshots/ plus the
// promo PNGs to promo/.
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = path.join(__dirname, 'screenshots');
const PROMO = path.join(ROOT, 'promo');
const SDK = /game-cdn\.poki\.com/;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
};

function serve() {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(ROOT, path.normalize(p));
    if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('not found'); return; }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(buf);
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${detail ? ` (${detail})` : ''}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run(browser, base, cfg) {
  console.log(`\n== ${cfg.name} ${cfg.viewport.width}x${cfg.viewport.height}${cfg.throwStorage ? ' (localStorage throws)' : ''}`);
  const ctx = await browser.newContext({
    viewport: cfg.viewport,
    deviceScaleFactor: 1,
    hasTouch: !!cfg.touch,
    isMobile: !!cfg.touch,
  });
  await ctx.route(SDK, (r) => r.abort());
  if (cfg.throwStorage) {
    await ctx.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() { throw new DOMException('storage blocked', 'SecurityError'); },
      });
    });
  }
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const url = m.location()?.url || '';
    if (SDK.test(url) || SDK.test(m.text())) return;
    errors.push(`console: ${m.text()} @ ${url}`);
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => { if (!SDK.test(r.url())) errors.push(`requestfailed: ${r.url()}`); });
  page.on('response', (r) => { if (r.status() >= 400 && !SDK.test(r.url())) errors.push(`http ${r.status()}: ${r.url()}`); });
  const external = [];
  page.on('request', (r) => { const u = r.url(); if (!u.startsWith(base) && !SDK.test(u) && !u.startsWith('data:')) external.push(u); });

  const shot = (n) => page.screenshot({ path: path.join(SHOTS, `${cfg.name}-${n}.png`) });
  const door = (fn, arg) => page.evaluate(fn, arg);
  const waitFor = (fn, arg, timeout = 15000) => page.waitForFunction(fn, arg, { timeout, polling: 50 });

  const t0 = Date.now();
  await page.goto(`${base}/?debug&nopoki`);
  await waitFor(() => window.__door && window.__door.screen === 'shift');
  check('first visit auto-starts shift 1', true);
  await sleep(700);
  await shot('01-intro');

  // keyboard must not scroll the page (iframe on Poki)
  await page.evaluate(() => {
    window.__keyLog = [];
    window.addEventListener('keydown', (e) => window.__keyLog.push([e.code, e.defaultPrevented]));
  });
  for (const k of ['ArrowDown', 'ArrowUp', 'PageDown', 'Space', 'ArrowDown']) await page.keyboard.press(k);
  const scroll = await page.evaluate(() => ({
    y: window.scrollY, x: window.scrollX,
    doc: document.scrollingElement.scrollTop, app: document.getElementById('app').scrollTop,
    log: window.__keyLog,
  }));
  const allPrevented = scroll.log.filter(([c]) => /Arrow|Space/.test(c)).every(([, p]) => p);
  check('arrow/space keys do not scroll', scroll.y === 0 && scroll.x === 0 && scroll.doc === 0 && scroll.app === 0 && allPrevented, JSON.stringify(scroll.log));

  await waitFor(() => window.__door.state && window.__door.state.phase === 'play');
  const tPlay = Date.now() - t0;
  check('first verdict possible within 10 s of load', tPlay < 10000, `${tPlay} ms`);
  await sleep(500);
  await shot('02-play');

  const lvl = await door(() => ({ id: window.__door.level.id, n: window.__door.level.guests.length, demo: window.__door.level.demoCount }));
  console.log(`   level ${lvl.id}: ${lvl.demo} demo + ${lvl.n - lvl.demo} judged`);

  // play to a win with the true labels
  let guard = 0;
  while (guard++ < 40) {
    const ph = await door(() => window.__door.state.phase);
    if (ph !== 'play') break;
    await door(() => window.__door.step({ type: 'verdict', admit: !!window.__door.level.labels[window.__door.state.idx] }));
    if (guard === 1) await shot('03-after-first');
  }
  const ph = await door(() => window.__door.state.phase);
  check('win opens name-the-rule (or result)', ph === 'guess' || ph === 'result', ph);
  if (ph === 'guess') {
    await waitFor(() => !document.querySelector('.guess-panel').hidden);
    await sleep(400);
    await shot('04-guess');
    await door(() => window.__door.step({ type: 'guess', idx: window.__door.level.correctIdx }));
  }
  await waitFor(() => window.__door.screen === 'result');
  await sleep(1400);
  await shot('05-result');
  const st = await door(() => ({ outcome: window.__door.state.outcome, stars: window.__door.state.stars }));
  check('shift 1 cleared', st.outcome === 'cleared', `stars ${st.stars}`);
  const elapsed = Date.now() - t0;
  check('shift 1 cleared by script in < 30 s', elapsed < 30000, `${elapsed} ms`);
  await page.keyboard.press('Escape'); // cancel next-shift countdown
  await sleep(1300);
  check('countdown cancel keeps result screen', (await door(() => window.__door.screen)) === 'result');

  // Daily Door
  await door(() => window.__door.daily());
  await waitFor(() => window.__door.screen === 'daily');
  await sleep(400);
  await shot('06-daily');
  const canPlay = await page.$('.daily .btn-primary');
  if (canPlay) {
    await canPlay.click();
    await waitFor(() => window.__door.screen === 'shift');
    await waitFor(() => window.__door.state.phase === 'play', null, 20000);
    await sleep(400);
    await shot('07-daily-play');
    // play the daily out quickly (alternate right/wrong) to reach its result
    let g = 0;
    while (g++ < 40) {
      const p = await door(() => window.__door.state.phase);
      if (p !== 'play') break;
      await door((k) => window.__door.step({ type: 'verdict', admit: (k % 4 === 3) ? !window.__door.level.labels[window.__door.state.idx] : !!window.__door.level.labels[window.__door.state.idx] }), g);
    }
    if ((await door(() => window.__door.state.phase)) === 'guess') {
      await door(() => window.__door.step({ type: 'guess', idx: window.__door.level.correctIdx }));
    }
    await waitFor(() => window.__door.screen === 'dailyResult');
    await sleep(600);
    await shot('08-daily-result');
    check('daily door playable to result', true);
  } else {
    check('daily door screen opens', true, 'no playable door today');
  }

  // Map
  await door(() => window.__door.map());
  await waitFor(() => window.__door.screen === 'map');
  await sleep(400);
  await shot('09-map');

  // Fired: replay shift 1 with wrong calls
  await door(() => window.__door.start(1, 0));
  await waitFor(() => window.__door.state && window.__door.state.phase === 'play' && window.__door.screen === 'shift');
  // use the free hint first so the log highlight is visible
  await door(() => window.__door.step({ type: 'hint' }));
  await sleep(500);
  await shot('10-hint');
  let w = 0;
  while (w++ < 10) {
    const p = await door(() => window.__door.state.phase);
    if (p !== 'play') break;
    await door(() => window.__door.step({ type: 'verdict', admit: !window.__door.level.labels[window.__door.state.idx] }));
    if (w === 1) await shot('11-wrong');
  }
  await waitFor(() => window.__door.screen === 'fired' || window.__door.screen === 'result');
  await sleep(900);
  await shot('12-fired');
  check('wrong calls lead to fired/out screen', ['fired', 'result'].includes(await door(() => window.__door.screen)));

  // Title + settings
  await door(() => window.__door.title());
  await waitFor(() => window.__door.screen === 'title');
  await sleep(500);
  await shot('13-title');
  await page.click('.menu-row .btn-icon');
  await sleep(400);
  await shot('14-settings');
  await page.click('.modal .btn-primary');

  // real input path: start shift 1, swipe with the mouse
  await door(() => window.__door.start(1, 0));
  await waitFor(() => window.__door.state && window.__door.state.phase === 'play' && document.querySelector('.card.live'));
  await sleep(500);
  const box = await (await page.$('.card.live')).boundingBox();
  const before = await door(() => window.__door.state.history.length);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 20, box.y + box.height / 2, { steps: 4 });
  await page.mouse.up();
  await sleep(300);
  const afterShort = await door(() => window.__door.state.history.length);
  check('short drag springs back', afterShort === before);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 260, box.y + box.height / 2, { steps: 10 });
  await page.mouse.up();
  await sleep(900);
  const afterSwipe = await door(() => window.__door.state.history.length);
  check('swipe commits a verdict', afterSwipe === before + 1);
  await page.keyboard.press('ArrowLeft');
  await sleep(900);
  check('arrow key commits a verdict', (await door(() => window.__door.state.history.length)) >= before + 2 || (await door(() => window.__door.state.phase)) !== 'play');

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth || document.body.scrollWidth > window.innerWidth);
  check('no horizontal overflow', !overflow);
  check('no external requests', external.length === 0, external.join(', '));
  check('no console errors / page errors', errors.length === 0, errors.slice(0, 6).join(' | '));
  await ctx.close();
}

// Third run: a mock Poki SDK (ads "work") on a small landscape phone. Covers
// the 🎬 hint, second chance, special nights and ad-call ordering.
async function runMockSdk(browser, base) {
  const cfg = { name: 'phone-land', viewport: { width: 844, height: 390 } };
  console.log(`\n== ${cfg.name} ${cfg.viewport.width}x${cfg.viewport.height} (mock Poki SDK)`);
  const ctx = await browser.newContext({ viewport: cfg.viewport, deviceScaleFactor: 1 });
  await ctx.route(SDK, (r) => r.abort());
  await ctx.addInitScript(() => {
    const calls = (window.__pokiCalls = []);
    const log = (n) => calls.push(n);
    window.PokiSDK = {
      init: () => Promise.resolve(),
      gameLoadingFinished: () => log('gameLoadingFinished'),
      gameplayStart: () => log('gameplayStart'),
      gameplayStop: () => log('gameplayStop'),
      commercialBreak: () => { log('commercialBreak'); return new Promise((r) => setTimeout(r, 200)); },
      rewardedBreak: () => { log('rewardedBreak'); return new Promise((r) => setTimeout(() => r(true), 200)); },
    };
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !SDK.test(m.location()?.url || '')) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  const shot = (n) => page.screenshot({ path: path.join(SHOTS, `${cfg.name}-${n}.png`) });
  const door = (fn, arg) => page.evaluate(fn, arg);
  const waitFor = (fn, arg, timeout = 15000) => page.waitForFunction(fn, arg, { timeout, polling: 50 });
  const playUntil = async (pred) => {
    for (let k = 0; k < 40; k++) {
      const st = await door(() => ({ ph: window.__door.state.phase, sp: !!window.__door.level.guests[window.__door.state.idx]?.special }));
      if (st.ph !== 'play' || (pred === 'special' && st.sp)) return st;
      await door(() => window.__door.step({ type: 'verdict', admit: !!window.__door.level.labels[window.__door.state.idx] }));
    }
    return null;
  };

  await page.goto(`${base}/?debug`);
  await waitFor(() => window.__door && window.__door.screen === 'shift');
  await waitFor(() => window.__door.state.phase === 'play');
  await sleep(300);
  await shot('01-play');
  const calls0 = await door(() => window.__pokiCalls.slice());
  check('mock SDK: loading finished + gameplayStart at first judged guest', calls0.includes('gameLoadingFinished') && calls0.includes('gameplayStart'), calls0.join(','));

  // Boss in Disguise (club 1 shift 9)
  await door(() => window.__door.start(1, 8));
  await waitFor(() => window.__door.screen === 'shift' && window.__door.state && window.__door.state.phase === 'play');
  const boss = await playUntil('special');
  if (boss && boss.sp) {
    await sleep(500);
    await shot('02-boss');
    check('boss guest shows 🥸', await page.$eval('.card.live', (el) => el.textContent.includes('🥸')));
  } else check('boss special night reachable', false);
  // hints: free then 🎬
  await door(() => window.__door.step({ type: 'hint' }));
  await door(() => window.__door.step({ type: 'hint' }));
  await sleep(500);
  await shot('03-hints');
  const hints = await door(() => window.__door.state.hintsUsed);
  check('🎬 hint granted via rewardedBreak', hints === 2, `hintsUsed ${hints}`);
  // get fired, then use the second chance
  for (let k = 0; k < 12; k++) {
    if ((await door(() => window.__door.state.phase)) !== 'play') break;
    await door(() => window.__door.step({ type: 'verdict', admit: !window.__door.level.labels[window.__door.state.idx] }));
  }
  await waitFor(() => window.__door.screen === 'fired');
  await sleep(800);
  await shot('04-fired');
  const reviveBtn = await page.$('.fired .btn-ad');
  check('fired screen offers 🎬 second chance beside Retry', !!reviveBtn);
  if (reviveBtn) {
    const sizes = await page.$$eval('.fired .equal-row .btn', (bs) => bs.map((b) => Math.round(b.getBoundingClientRect().width)));
    check('second chance + retry equal size', sizes.length === 2 && Math.abs(sizes[0] - sizes[1]) <= 2, sizes.join('/'));
    await reviveBtn.click();
    await waitFor(() => window.__door.screen === 'shift' && window.__door.state.phase === 'play');
    await sleep(500);
    await shot('05-revived');
    check('revive returns to the shift with 2 strikes', (await door(() => window.__door.state.strikes)) === 2);
  }

  // Dog in a Trench Coat (club 2 shift 9)
  await door(() => window.__door.start(2, 8));
  await waitFor(() => window.__door.screen === 'shift' && window.__door.state && window.__door.state.phase === 'play');
  const tc = await playUntil('special');
  if (tc && tc.sp) {
    await sleep(500);
    await shot('06-trenchcoat');
    await page.click('.card.live .figure', { force: true });
    await sleep(500);
    await shot('07-trenchcoat-revealed');
    check('trench coat reveals 🐶 on tap', await page.$eval('.card.live', (el) => el.classList.contains('revealed') && el.textContent.includes('🐶')));
  } else check('trenchcoat special night reachable', false);

  // commercialBreak: none going 1 -> 2, one before shift 3
  await door(() => { window.__pokiCalls.length = 0; });
  await door(() => window.__door.start(1, 1));
  await waitFor(() => window.__door.screen === 'shift' && window.__door.state && window.__door.state.phase === 'play');
  await playUntil('end');
  if ((await door(() => window.__door.state.phase)) === 'guess') await door(() => window.__door.step({ type: 'skipGuess' }));
  await waitFor(() => window.__door.screen === 'result');
  await sleep(300);
  await shot('08-result');
  await page.click('.result .btn-primary.btn-big');
  await waitFor(() => window.__door.screen === 'shift' && window.__door.state.level.id === 'c1s3');
  const calls1 = await door(() => window.__pokiCalls.slice());
  check('commercialBreak before shift 3, preceded by gameplayStop', calls1.includes('commercialBreak') && calls1.lastIndexOf('gameplayStop') < calls1.indexOf('commercialBreak'), calls1.join(','));
  check('mock SDK run: no console errors', errors.length === 0, errors.slice(0, 4).join(' | '));
  await ctx.close();
}

// Small phones (360x640, 320x568): the 💡 confirm never shows the options, a
// committed pick has no Back, all 4 options fit on screen, and the log zoom
// overlay swallows verdict keys.
async function runSmallPhone(browser, base, viewport) {
  const name = `phone-${viewport.width}x${viewport.height}`;
  console.log(`\n== ${name} (small phone)`);
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  await ctx.route(SDK, (r) => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !SDK.test(m.location()?.url || '') && !SDK.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  const shot = (n) => page.screenshot({ path: path.join(SHOTS, `${name}-${n}.png`) });
  const door = (fn, arg) => page.evaluate(fn, arg);
  const waitFor = (fn, arg, timeout = 15000) => page.waitForFunction(fn, arg, { timeout, polling: 50 });
  const optsInView = () => page.$$eval('.guess-panel:not([hidden]) .opt', (bs) => {
    const vw = window.innerWidth, vh = window.innerHeight;
    return bs.map((b) => {
      const r = b.getBoundingClientRect();
      return r.top >= 0 && r.left >= 0 && r.bottom <= vh + 0.5 && r.right <= vw + 0.5 && r.height > 20;
    });
  });

  await page.goto(`${base}/?debug&nopoki`);
  await waitFor(() => window.__door && window.__door.screen === 'shift');
  await waitFor(() => window.__door.state.phase === 'play' && document.querySelector('.card.live'));
  await sleep(400);
  await shot('01-play');

  // 💡 -> confirm (no options), "Not yet" backs out at no cost
  await page.tap('.btn-gotit');
  await waitFor(() => !document.querySelector('.confirm-panel').hidden);
  const leak = await page.$$eval('.confirm-panel .opt, .guess-panel:not([hidden]) .opt', (x) => x.length);
  check(`${name}: 💡 confirm does not reveal the options`, leak === 0, `${leak} options visible`);
  await sleep(250);
  await shot('02-confirm');
  await page.tap('.confirm-panel .btn-ghost');
  await sleep(200);
  const back = await door(() => ({ ph: window.__door.state.phase, st: window.__door.state.strikes, hidden: document.querySelector('.confirm-panel').hidden }));
  check(`${name}: "Not yet" closes the confirm, no strike`, back.ph === 'play' && back.st === 0 && back.hidden, JSON.stringify(back));

  // commit: Name it -> 4 options on screen, no Back
  await page.tap('.btn-gotit');
  await waitFor(() => !document.querySelector('.confirm-panel').hidden);
  await page.tap('.confirm-panel .btn-gotit');
  await waitFor(() => window.__door.state.phase === 'guess' && !document.querySelector('.guess-panel').hidden);
  await sleep(450);
  await shot('03-guess-gotit');
  const vis = await optsInView();
  check(`${name}: all 4 options fully in the viewport (💡)`, vis.length === 4 && vis.every(Boolean), JSON.stringify(vis));
  const noBack = await page.$$eval('.guess-panel .btn-ghost', (x) => x.length);
  check(`${name}: committed guess has no Back`, noBack === 0);
  const rowsHidden = await page.$$eval('.shift .aux, .shift .decide', (xs) => xs.every((x) => getComputedStyle(x).display === 'none'));
  check(`${name}: aux + decide rows hidden while naming`, rowsHidden);
  // wrong pick: a strike, back to play
  const wrong = await door(() => (window.__door.level.correctIdx + 1) % window.__door.level.choices.length);
  await page.tap(`.guess-panel .opt[data-k="${wrong}"]`);
  await waitFor(() => window.__door.state.phase === 'play' && document.querySelector('.guess-panel').hidden);
  check(`${name}: wrong 💡 pick costs a strike`, (await door(() => window.__door.state.strikes)) === 1);

  // zoom overlay in the log blocks verdict keys
  await waitFor(() => document.querySelector('.card.live'));
  await sleep(300);
  const mini = await page.$('.log .mini');
  if (mini) {
    await mini.tap();
    await waitFor(() => document.querySelector('.overlay.zoom'));
    const h0 = await door(() => window.__door.state.history.length);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowLeft');
    await sleep(500);
    await shot('04-zoom');
    const h1 = await door(() => window.__door.state.history.length);
    check(`${name}: zoom overlay blocks verdict keys`, h1 === h0, `${h0} -> ${h1}`);
    await page.keyboard.press('Escape');
    await sleep(150);
    check(`${name}: Esc closes the zoom`, !(await page.$('.overlay.zoom')) && (await door(() => window.__door.screen)) === 'shift');
  } else check(`${name}: log has a mini card to zoom`, false);

  // play to the end-of-shift pick: options fit too, and it can be skipped
  for (let k = 0; k < 30; k++) {
    if ((await door(() => window.__door.state.phase)) !== 'play') break;
    await door(() => window.__door.step({ type: 'verdict', admit: !!window.__door.level.labels[window.__door.state.idx] }));
  }
  const ph = await door(() => window.__door.state.phase);
  if (ph === 'guess') {
    await waitFor(() => !document.querySelector('.guess-panel').hidden);
    await sleep(450);
    await shot('05-guess-end');
    const vis2 = await optsInView();
    check(`${name}: all 4 options fully in the viewport (end of shift)`, vis2.length === 4 && vis2.every(Boolean), JSON.stringify(vis2));
    check(`${name}: end-of-shift pick offers Skip`, (await page.$$eval('.guess-panel .btn-ghost', (x) => x.length)) === 1);
  } else check(`${name}: shift reaches the end-of-shift pick`, false, ph);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check(`${name}: no horizontal overflow`, !overflow);
  check(`${name}: no console errors`, errors.length === 0, errors.slice(0, 4).join(' | '));
  await ctx.close();
}

async function promo(browser, base) {
  console.log('\n== promo art');
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}/promo/thumbnail.html`);
  await sleep(500);
  const a = await page.$('#t512');
  const b = await page.$('#t628');
  if (a) await a.screenshot({ path: path.join(PROMO, 'thumb-512.png') });
  if (b) await b.screenshot({ path: path.join(PROMO, 'thumb-628x314.png') });
  check('promo thumbnails rendered', !!a && !!b && errors.length === 0, errors.join(' | '));
  await ctx.close();
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  try {
    await run(browser, base, { name: 'portrait', viewport: { width: 390, height: 844 }, throwStorage: true, touch: false });
    await run(browser, base, { name: 'landscape', viewport: { width: 1280, height: 720 }, throwStorage: false });
    await runMockSdk(browser, base);
    await runSmallPhone(browser, base, { width: 360, height: 640 });
    await runSmallPhone(browser, base, { width: 320, height: 568 });
    if (fs.existsSync(path.join(PROMO, 'thumbnail.html'))) await promo(browser, base);
  } catch (e) {
    check('smoke run completed', false, e.stack || String(e));
  } finally {
    await browser.close();
    server.close();
  }
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed. Screenshots: ${SHOTS}`);
  process.exit(failed.length ? 1 : 0);
})();
