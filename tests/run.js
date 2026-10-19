// Automated playtest. Usage:
//   node tests/run.js              → solve every level in isolation + full playthrough on the web build
//   node tests/run.js mouse jar    → only those level ids (isolated)
// Screenshots of each solved level land in tests/output/.
const fs = require('fs');
const path = require('path');
const http = require('http');
const { execSync } = require('child_process');

let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }

const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'output');
fs.mkdirSync(OUT, { recursive: true });

const solutions = {};
for (const f of fs.readdirSync(path.join(__dirname, 'solutions'))) Object.assign(solutions, require('./solutions/' + f));

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

function helper(page) {
  const obj = (i) => page.locator('#stage .obj').nth(i);
  const stageBox = () => page.locator('#stage').boundingBox();
  const scale = () => page.evaluate(() => scale);
  const center = async (i) => { const b = await obj(i).boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
  const h = {
    page,
    wait: (ms) => page.waitForTimeout(ms),
    async tap(i) { const [x, y] = await center(i); await page.mouse.click(x, y); await h.wait(150); },
    async tapAt(x, y) { const s = await stageBox(), k = await scale(); await page.mouse.click(s.x + x * k, s.y + y * k); await h.wait(150); },
    async drag(i, x, y, steps = 12) {
      const [fx, fy] = await center(i); const s = await stageBox(), k = await scale();
      await page.mouse.move(fx, fy); await page.mouse.down();
      await page.mouse.move(s.x + x * k, s.y + y * k, { steps }); await page.mouse.up(); await h.wait(250);
    },
    async dragFrom(fx, fy, x, y, steps = 12) { // stage coords → stage coords
      const s = await stageBox(), k = await scale();
      await page.mouse.move(s.x + fx * k, s.y + fy * k); await page.mouse.down();
      await page.mouse.move(s.x + x * k, s.y + y * k, { steps }); await page.mouse.up(); await h.wait(250);
    },
    async word(id) { await page.click(`#question [data-w="${id}"]`); await h.wait(150); },
  };
  return h;
}

async function newPage(browser, url, errors) {
  const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/POKI|Blocked script|Cross-Origin/.test(m.text())) errors.push(m.text()); });
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => !document.querySelector('#title').classList.contains('hidden'));
  return page;
}

(async () => {
  const only = process.argv.slice(2);
  const dist = fs.mkdtempSync(path.join(require('os').tmpdir(), 'tt-run-'));
  execSync('./build.sh web', { cwd: ROOT, stdio: 'ignore', env: { ...process.env, DIST: dist } });
  const srv = await serve(path.join(dist, 'web'));
  const url = `http://localhost:${srv.address().port}/index.html`;
  const browser = await chromium.launch();
  let failed = 0;
  const fail = (msg) => { failed++; console.log('  FAIL ' + msg); };

  // --- static checks
  const errors = [];
  const page = await newPage(browser, url, errors);
  const levels = await page.evaluate(() => LEVELS.map((l) => ({ id: l.id, hint: l.hint, answer: l.answer })));
  console.log(`${levels.length} levels`);
  const ids = levels.map((l) => l.id);
  if (new Set(ids).size !== ids.length) fail('duplicate level ids');
  if (ids[ids.length - 1] !== 'finish') fail('finale is not the last level');
  for (const l of levels) {
    if (!l.id || !l.hint || !l.answer) fail(`${l.id}: missing id/hint/answer`);
    if (!solutions[l.id]) fail(`${l.id}: no solution in tests/solutions/`);
  }

  // --- each level in isolation
  const h = helper(page);
  for (let i = 0; i < levels.length; i++) {
    const id = levels[i].id;
    if (only.length && !only.includes(id)) continue;
    if (!solutions[id]) continue;
    errors.length = 0;
    await page.evaluate((n) => startLevel(n), i);
    await h.wait(300);
    try {
      await solutions[id](h);
      await page.waitForFunction(() => api.done, null, { timeout: 4000 });
      await page.waitForSelector('#panel:not(.hidden)', { timeout: 4000 });
      await page.screenshot({ path: path.join(OUT, `${String(i + 1).padStart(2, '0')}-${id}.png`) });
      if (errors.length) fail(`${id}: page errors: ${errors.join(' | ')}`);
      else console.log(`  ok   ${i + 1}. ${id}`);
    } catch (e) {
      await page.screenshot({ path: path.join(OUT, `FAIL-${id}.png`) });
      fail(`${id}: not solved (${e.message.split('\n')[0]}) ${errors.join(' | ')}`);
    }
  }

  // --- full playthrough from a fresh save, clicking NEXT like a player
  if (!only.length) {
    const errs = [];
    const p = await newPage(browser, url, errs);
    const hp = helper(p);
    await p.click('#btn-play');
    for (let i = 0; i < levels.length; i++) {
      await p.waitForFunction((n) => document.querySelector('#level-label').textContent === 'LEVEL ' + n, i + 1, { timeout: 8000 });
      await hp.wait(300);
      await solutions[levels[i].id](hp);
      await p.waitForSelector('#panel:not(.hidden)', { timeout: 5000 });
      await p.click('#panel-btn');
    }
    await p.waitForSelector('#title:not(.hidden)', { timeout: 5000 });
    const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('trickytaps')));
    if (saved.cleared.length !== levels.length) fail(`playthrough: saved ${saved.cleared.length}/${levels.length} cleared`);
    else if (errs.length) fail('playthrough errors: ' + errs.join(' | '));
    else console.log('  ok   full playthrough + save');
  }

  await browser.close();
  srv.close();
  fs.rmSync(dist, { recursive: true, force: true });
  console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
  process.exit(failed ? 1 : 0);
})();
