// Bundles the no-ads web build into one self-contained HTML file (CSS, JS and font inlined).
//   node tools/single-file.js [out.html]   (default: dist/tricky-taps.html)
// Pass --fragment to drop <!doctype>/<html>/<head>/<body> for hosts that add their own skeleton.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const fragment = args.includes('--fragment');
const out = args.find((a) => !a.startsWith('--')) || path.join(ROOT, 'dist', 'tricky-taps.html');

const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-single-'));
execSync('./build.sh web', { cwd: ROOT, stdio: 'ignore', env: { ...process.env, DIST: dist } });
const dir = path.join(dist, 'web');
let html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');

const font = fs.readFileSync(path.join(dir, 'src/fonts/PatrickHand.woff2')).toString('base64');
const css = fs.readFileSync(path.join(dir, 'src/style.css'), 'utf8')
  .replace('url(fonts/PatrickHand.woff2)', `url(data:font/woff2;base64,${font})`);
html = html.replace('<link rel="stylesheet" href="src/style.css">', () => `<style>\n${css}</style>`);
html = html.replace(/<script src="(src\/[^"]+)"><\/script>/g, (_, src) =>
  `<script>\n${fs.readFileSync(path.join(dir, src), 'utf8').replace(/<\/script/gi, '<\\/script')}</script>`);
if (/(src|href)="src\//.test(html)) throw new Error('a local file was not inlined');

if (fragment) {
  html = html.replace(/<!doctype html>\s*/i, '').replace(/<\/?html[^>]*>\s*/gi, '').replace(/<\/?head>\s*/gi, '')
    .replace(/<\/?body>\s*/gi, '').replace(/\s*<meta charset[^>]*>/i, '').replace(/\s*<meta name="viewport"[^>]*>/i, '');
}
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
fs.rmSync(dist, { recursive: true, force: true });
console.log(`${out} (${Math.round(html.length / 1024)} KB)`);
