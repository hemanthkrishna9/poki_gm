// Regression tests for bugs found in code review. Usage: node tests/regressions.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { execSync } = require('child_process');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }

const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' };
const serve = (dir) => new Promise((res) => {
  const srv = http.createServer((req, rsp) => {
    const f = path.join(dir, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
    if (!f.startsWith(dir) || !fs.existsSync(f)) { rsp.writeHead(404); return rsp.end(); }
    rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(rsp);
  }).listen(0, () => res(srv));
});

let failed = 0;
const check = (name, ok, detail = '') => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  — ' + detail}`); };

(async () => {
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-reg-'));
  execSync('./build.sh web poki', { cwd: ROOT, stdio: 'ignore', env: { ...process.env, DIST: dist } });
  const srv = await serve(dist);
  const base = `http://localhost:${srv.address().port}`;
  const browser = await chromium.launch();

  const open = async (target = 'web', o = {}) => {
    const ctx = await browser.newContext({ viewport: { width: 960, height: 540 }, hasTouch: !!o.touch });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    if (o.init) await page.addInitScript(o.init);
    await page.route(/poki-sdk|crazygames-sdk/, (r) => r.fulfill({ body: '', contentType: 'text/javascript' }));
    await page.goto(`${base}/${target}/index.html`);
    return { ctx, page, errors };
  };
  const booted = (page, timeout = 8000) => page.waitForFunction(() => !document.querySelector('#title').classList.contains('hidden'), null, { timeout });
  const levelIndex = (page, id) => page.evaluate((i) => LEVELS.findIndex((l) => l.id === i), id);
  const center = async (page, i) => { const b = await page.locator('#stage .obj').nth(i).boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };

  // 1. a timer left over from the previous level must not win, mark or talk on the new one
  {
    const { ctx, page, errors } = await open();
    await booted(page);
    await page.evaluate(() => { localStorage.clear(); Save.data.cleared = []; startLevel(5); });
    await page.evaluate(() => { const old = api; setTimeout(() => { old.say('stale', 100, 100); old.wrong(); old.win('stale win'); }, 300); });
    await page.evaluate(() => startLevel(0));
    await page.waitForTimeout(1800);
    const st = await page.evaluate(() => ({ done: api.done, panel: !document.querySelector('#panel').classList.contains('hidden'),
      cleared: Save.data.cleared.length, junk: document.querySelectorAll('#stage .bubble, #stage .mark').length }));
    check('stale timer from previous level cannot win/mark the new level', !st.done && !st.panel && st.cleared === 0 && st.junk === 0, JSON.stringify(st));
    check('no page errors (1)', !errors.length, errors.join(' | '));
    await ctx.close();
  }

  // 2. pointercancel mid-drag puts the object back instead of dropping it
  {
    const { ctx, page } = await open('web', { touch: true });
    await booted(page);
    await page.evaluate((i) => startLevel(i), await levelIndex(page, 'catdown'));
    await page.waitForTimeout(200);
    const can = await center(page, 3);
    const before = await page.evaluate(() => document.querySelectorAll('#stage .obj')[3].style.left);
    const cdp = await ctx.newCDPSession(page);
    const t = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchCancel' ? [] : [{ x, y, id: 1 }] });
    await t('touchStart', can.x, can.y);
    for (let k = 1; k <= 10; k++) await t('touchMove', can.x + k * 30, can.y + k * 2);
    await t('touchCancel');
    await page.waitForTimeout(400);
    const st = await page.evaluate(() => ({ done: api.done, left: document.querySelectorAll('#stage .obj')[3].style.left }));
    check('touch cancelled at the tree does not win and returns the tuna can', !st.done && st.left === before, JSON.stringify({ ...st, before }));
    await ctx.close();
  }

  // (multi-touch guard in drag(): not covered — headless Chromium doesn't reproduce the two-finger bug)

  // 4. the ad input blocker must not block the SDK's own ad UI (appended to <body>)
  {
    const { ctx, page } = await open();
    await booted(page);
    const pe = await page.evaluate(() => {
      const f = document.createElement('iframe'); document.body.appendChild(f);
      Platform.onAd(true);
      const r = [getComputedStyle(f).pointerEvents, getComputedStyle(document.querySelector('#btn-hint')).pointerEvents];
      Platform.onAd(false); f.remove();
      return r;
    });
    check('during an ad, game UI is blocked but SDK UI in <body> is clickable', pe[0] !== 'none' && pe[1] === 'none', JSON.stringify(pe));
    await ctx.close();
  }

  // 5. an SDK whose init() never settles must not leave a blank screen
  {
    const { ctx, page } = await open('poki', { init: () => {
      Object.defineProperty(window, 'PokiSDK', { value: { init: () => new Promise(() => {}), gameLoadingFinished() {}, gameplayStart() {}, gameplayStop() {},
        commercialBreak: () => Promise.resolve(), rewardedBreak: () => Promise.resolve(false), setDebug() {} } });
    } });
    let ok = true;
    try { await booted(page, 9000); } catch (e) { ok = false; }
    check('hung SDK init still reaches the title screen', ok, 'title never shown');
    await ctx.close();
  }

  // 6. the drag does not lag behind the finger on levels that animate left/top
  {
    const { ctx, page } = await open();
    await booted(page);
    await page.evaluate((i) => startLevel(i), await levelIndex(page, 'seveneven'));
    await page.waitForTimeout(300);
    const s = await center(page, 0);
    await page.mouse.move(s.x, s.y); await page.mouse.down();
    await page.mouse.move(s.x + 120, s.y + 80, { steps: 4 });
    const tr = await page.evaluate(() => getComputedStyle(document.querySelectorAll('#stage .obj')[0]).transitionDuration);
    await page.mouse.up();
    check('dragged element has no left/top transition while held', tr.split(',').every((d) => parseFloat(d) === 0), `transition-duration ${tr}`);
    await ctx.close();
  }

  await browser.close();
  srv.close();
  fs.rmSync(dist, { recursive: true, force: true });
  console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
  process.exit(failed ? 1 : 0);
})();
