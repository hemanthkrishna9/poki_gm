// Renders store thumbnails from the game's own art: node promo/make.js
// Output: promo/thumb-<w>x<h>.png. Check each platform's current size list before uploading.
const fs = require('fs');
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }

const ROOT = path.join(__dirname, '..');
const SIZES = [[512, 512], [800, 800], [1280, 720], [1920, 1080], [800, 1200]]; // CrazyGames covers: 1920x1080, 800x1200, 800x800

const page = (w, h) => `<!doctype html><html><head><style>
@font-face { font-family: 'Patrick Hand'; src: url(../src/fonts/PatrickHand.woff2); }
html, body { margin: 0; width: ${w}px; height: ${h}px; overflow: hidden; }
body { font-family: 'Patrick Hand'; background: #fffdf7 repeating-linear-gradient(#fffdf7 0 ${h / 16 - 2}px, #cfe3f0 ${h / 16 - 2}px ${h / 16}px);
  display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; }
h1 { font-size: ${Math.min(w / 5.2, h / 3.4)}px; margin: 0; line-height: .95; text-align: center; transform: rotate(-4deg);
  text-shadow: ${w / 160}px ${w / 160}px 0 #ffd23f; color: #2b2b2b; z-index: 2; }
.a { position: absolute; }
.a svg { width: 100%; height: 100%; overflow: visible; }
.q { position: absolute; font-size: ${Math.min(w, h) / 3}px; color: #e53935; font-weight: bold; transform: rotate(12deg); }
</style></head><body>
<h1>Tricky<br>Taps</h1>
<div class="a" id="sun"></div><div class="a" id="snail"></div><div class="a" id="bulb"></div><div class="a" id="balloon"></div>
<div class="q">?</div>
<script src="../src/art.js"></script>
<script>
  const W = ${w}, H = ${h}, m = Math.min(W, H);
  const place = (id, html, x, y, s) => { const e = document.getElementById(id); e.innerHTML = html;
    Object.assign(e.style, { left: x + 'px', top: y + 'px', width: s + 'px', height: s + 'px' }); };
  place('sun', ART.sun(), W * .04, H * .05, m * .3);
  place('snail', ART.snailRocket(), W - m * .5, H - m * .36, m * .46);
  place('bulb', ART.bulb(true), W - m * .3, -m * .02, m * .22);
  place('balloon', ART.balloon('#4fc3f7'), W * .06, H - m * .5, m * .26);
  const q = document.querySelector('.q'); q.style.right = W * .08 + 'px'; q.style.top = H * .3 + 'px';
</script></body></html>`;

(async () => {
  const browser = await chromium.launch();
  for (const [w, h] of SIZES) {
    const file = path.join(__dirname, `.tmp-${w}x${h}.html`);
    fs.writeFileSync(file, page(w, h));
    const p = await browser.newPage({ viewport: { width: w, height: h } });
    await p.goto('file://' + file);
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(200);
    await p.screenshot({ path: path.join(__dirname, `thumb-${w}x${h}.png`) });
    fs.unlinkSync(file);
    console.log(`promo/thumb-${w}x${h}.png`);
  }
  await browser.close();
})();
