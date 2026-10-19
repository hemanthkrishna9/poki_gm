'use strict';

// ---------- art: small inline SVGs in a doodle style ----------
const svg = (vb, body) =>
  `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" stroke="#2b2b2b" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">${body}</svg>`;

const ART = {
  sun: () => {
    let rays = '';
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4, c = Math.cos(a), s = Math.sin(a);
      rays += `<line x1="${60 + c * 40}" y1="${60 + s * 40}" x2="${60 + c * 56}" y2="${60 + s * 56}"/>`;
    }
    return svg('0 0 120 120', `${rays}<circle cx="60" cy="60" r="32" fill="#ffd23f"/>
      <circle cx="50" cy="55" r="3" fill="#2b2b2b"/><circle cx="70" cy="55" r="3" fill="#2b2b2b"/>
      <path d="M48 68 Q60 78 72 68" fill="none"/>`);
  },
  snowman: (happy) => svg('0 0 200 260', `
    <line x1="60" y1="120" x2="20" y2="95"/><line x1="140" y1="120" x2="180" y2="95"/>
    <circle cx="100" cy="200" r="55" fill="#fff"/><circle cx="100" cy="122" r="40" fill="#fff"/>
    <circle cx="100" cy="60" r="30" fill="#fff"/>
    <rect x="72" y="8" width="56" height="30" fill="#333"/><rect x="62" y="34" width="76" height="8" fill="#333"/>
    <circle cx="90" cy="55" r="3" fill="#2b2b2b"/><circle cx="110" cy="55" r="3" fill="#2b2b2b"/>
    <polygon points="100,62 128,68 100,70" fill="#ff8c1a"/>
    ${happy ? '<path d="M86 76 Q100 86 114 76" fill="none"/>' : '<path d="M86 82 Q100 74 114 82" fill="none"/>'}
    <circle cx="100" cy="112" r="4" fill="#2b2b2b"/><circle cx="100" cy="132" r="4" fill="#2b2b2b"/>
    ${happy ? '' : '<path d="M140 40 q6 10 0 14 q-6 -4 0 -14z" fill="#6ec6ff" stroke-width="2"/><path d="M58 50 q6 10 0 14 q-6 -4 0 -14z" fill="#6ec6ff" stroke-width="2"/>'}`),
  mouse: () => svg('0 0 100 64', `
    <path d="M18 44 Q2 40 6 24" fill="none" stroke-width="3"/>
    <ellipse cx="48" cy="42" rx="32" ry="18" fill="#b8b8b8"/>
    <circle cx="70" cy="22" r="11" fill="#f4b6c2"/><circle cx="80" cy="40" r="2" fill="#2b2b2b" stroke="none"/>
    <circle cx="94" cy="45" r="3" fill="#f48fb1" stroke-width="2"/>`),
  rug: () => svg('0 0 280 130', `
    <rect x="10" y="8" width="260" height="114" rx="10" fill="#d9534f"/>
    <rect x="30" y="26" width="220" height="78" rx="6" fill="none" stroke="#f6d365" stroke-width="5"/>
    <path d="M140 40 L170 65 L140 90 L110 65 Z" fill="#f6d365" stroke-width="3"/>`),
  cheese: () => svg('0 0 130 90', `
    <polygon points="8,82 122,82 122,30 8,62" fill="#ffcf33"/>
    <circle cx="40" cy="68" r="6" fill="#e6b422" stroke-width="2"/><circle cx="90" cy="55" r="9" fill="#e6b422" stroke-width="2"/>`),
  jar: () => svg('0 0 170 230', `
    <rect x="30" y="6" width="110" height="30" rx="6" fill="#8c6b4a"/>
    <rect x="12" y="36" width="146" height="186" rx="28" fill="#bfe6ff" fill-opacity=".45"/>
    <path d="M30 70 Q28 140 34 190" fill="none" stroke="#fff" stroke-width="6" opacity=".8"/>`),
  key: () => svg('0 0 60 120', `
    <circle cx="30" cy="22" r="17" fill="#ffcc33"/><circle cx="30" cy="22" r="6" fill="#fffdf7"/>
    <rect x="25" y="38" width="10" height="72" fill="#ffcc33"/>
    <rect x="35" y="88" width="14" height="8" fill="#ffcc33"/><rect x="35" y="102" width="10" height="8" fill="#ffcc33"/>`),
  crack: (n) => svg('0 0 170 230', [
    '<path d="M60 60 L80 100 L70 130" fill="none" stroke-width="3"/>',
    '<path d="M120 80 L100 120 L115 160 L95 190" fill="none" stroke-width="3"/>',
    '<path d="M40 150 L75 170 L60 205" fill="none" stroke-width="3"/>',
  ].slice(0, n).join('')),
  cheetah: () => svg('0 0 230 140', `
    <path d="M20 100 Q0 80 10 60" fill="none"/>
    <ellipse cx="100" cy="95" rx="80" ry="35" fill="#f2c14e"/>
    <circle cx="175" cy="80" r="30" fill="#f2c14e"/>
    <polygon points="158,56 162,40 172,52" fill="#f2c14e"/><polygon points="182,52 192,40 194,58" fill="#f2c14e"/>
    <path d="M162 80 q6 5 12 0 M182 80 q6 5 12 0" fill="none" stroke-width="3"/>
    <g fill="#6b4a2b" stroke="none"><circle cx="60" cy="85" r="5"/><circle cx="90" cy="100" r="5"/>
    <circle cx="120" cy="80" r="5"/><circle cx="140" cy="105" r="5"/><circle cx="75" cy="112" r="4"/></g>
    <text x="196" y="30" font-size="26" fill="#2b2b2b" stroke="none" font-family="sans-serif" font-weight="bold">Zzz</text>`),
  turtle: () => svg('0 0 170 110', `
    <rect x="35" y="70" width="18" height="26" rx="6" fill="#8fd18b"/><rect x="105" y="70" width="18" height="26" rx="6" fill="#8fd18b"/>
    <circle cx="145" cy="62" r="18" fill="#8fd18b"/><circle cx="150" cy="58" r="3" fill="#2b2b2b"/>
    <path d="M15 80 Q80 -10 140 80 Z" fill="#4c9a52"/>
    <path d="M50 70 L70 40 L95 40 L115 70" fill="none" stroke-width="3"/>`),
  snailRocket: () => svg('0 0 250 140', `
    <polygon points="10,95 50,80 50,110" fill="#ff8c1a"/><polygon points="22,95 50,88 50,102" fill="#ffd23f" stroke="none"/>
    <rect x="50" y="78" width="150" height="34" rx="10" fill="#e53935"/>
    <polygon points="200,78 240,95 200,112" fill="#e0e0e0"/>
    <circle cx="150" cy="95" r="8" fill="#9fe0f5"/>
    <path d="M70 78 Q70 60 110 60 L150 60 Q170 60 172 40" fill="#f5c28b"/>
    <line x1="168" y1="40" x2="160" y2="20" stroke-width="3"/><line x1="174" y1="40" x2="182" y2="20" stroke-width="3"/>
    <circle cx="105" cy="48" r="30" fill="#c58b4f"/>
    <path d="M105 48 m-6 0 a6 6 0 1 1 12 0 a12 12 0 1 1 -24 0 a18 18 0 1 1 36 0" fill="none" stroke-width="3"/>`),
  tree: () => svg('0 0 360 440', `
    <path d="M150 440 L160 140 L205 140 L215 440 Z" fill="#8d5a3b"/>
    <path d="M190 190 Q260 165 350 158 L350 176 Q262 184 196 214 Z" fill="#8d5a3b"/>
    <circle cx="110" cy="110" r="80" fill="#6fbf73"/><circle cx="215" cy="80" r="78" fill="#7bd389"/>
    <circle cx="160" cy="40" r="55" fill="#7bd389"/>
    <circle cx="90" cy="95" r="7" fill="#e53935"/><circle cx="230" cy="60" r="7" fill="#e53935"/><circle cx="175" cy="125" r="7" fill="#e53935"/>`),
  cat: (happy) => svg('0 0 110 90', `
    <path d="M18 70 Q0 70 4 88" fill="none" stroke-width="6"/>
    <ellipse cx="45" cy="64" rx="32" ry="20" fill="#ffab40"/>
    <polygon points="62,22 66,4 78,18" fill="#ffab40"/><polygon points="86,18 98,4 100,24" fill="#ffab40"/>
    <circle cx="82" cy="38" r="22" fill="#ffab40"/>
    <path d="M30 50 q4 8 0 16 M44 46 q4 8 0 16" fill="none" stroke="#e65100" stroke-width="3"/>
    ${happy
      ? '<path d="M71 36 q4 -5 8 0 M86 36 q4 -5 8 0" fill="none" stroke-width="3"/><path d="M78 46 q4 4 8 0" fill="none" stroke-width="3"/>'
      : '<circle cx="75" cy="36" r="4" fill="#2b2b2b"/><circle cx="90" cy="36" r="4" fill="#2b2b2b"/><ellipse cx="83" cy="49" rx="4" ry="5" fill="#c62828" stroke-width="2"/>'}`),
  ladder: () => svg('0 0 90 190', `
    <line x1="18" y1="6" x2="18" y2="186" stroke="#8d5a3b" stroke-width="10"/>
    <line x1="72" y1="6" x2="72" y2="186" stroke="#8d5a3b" stroke-width="10"/>
    ${[30, 70, 110, 150].map((y) => `<line x1="18" y1="${y}" x2="72" y2="${y}" stroke="#a1887f" stroke-width="8"/>`).join('')}`),
  tuna: () => svg('0 0 100 70', `
    <path d="M8 22 L8 54 Q50 70 92 54 L92 22 Z" fill="#4fc3f7"/>
    <ellipse cx="50" cy="22" rx="42" ry="12" fill="#cfd8dc"/>
    <path d="M30 42 q10 -9 22 0 q-12 9 -22 0 z M52 42 l9 -6 v12 z" fill="#fff" stroke-width="2"/>
    <text x="72" y="49" font-size="11" text-anchor="middle" fill="#fff" stroke="none" font-family="sans-serif" font-weight="bold">TUNA</text>`),
  feathers: () => svg('0 0 140 150', `
    <path d="M30 40 Q20 140 40 142 L100 142 Q120 140 110 40 Z" fill="#e9d8b4"/>
    <path d="M30 40 Q70 20 110 40" fill="none"/>
    <path d="M60 30 Q70 -10 95 5 Q90 30 60 30 Z" fill="#fff" stroke-width="3"/>
    <text x="70" y="105" font-size="28" text-anchor="middle" fill="#2b2b2b" stroke="none" font-family="sans-serif" font-weight="bold">1 kg</text>`),
  iron: () => svg('0 0 140 120', `
    <path d="M50 30 Q70 0 90 30" fill="none" stroke-width="8"/>
    <polygon points="30,30 110,30 130,112 10,112" fill="#555"/>
    <text x="70" y="85" font-size="28" text-anchor="middle" fill="#fff" stroke="none" font-family="sans-serif" font-weight="bold">1 kg</text>`),
  scale: () => svg('0 0 560 300', `
    <polygon points="230,290 330,290 280,240" fill="#c58b4f"/>
    <rect x="272" y="60" width="16" height="190" fill="#c58b4f"/>
    <line x1="80" y1="70" x2="480" y2="70" stroke-width="10"/>
    <circle cx="280" cy="68" r="12" fill="#ffd23f"/>
    <line x1="80" y1="70" x2="30" y2="190" stroke-width="2"/><line x1="80" y1="70" x2="130" y2="190" stroke-width="2"/>
    <line x1="480" y1="70" x2="430" y2="190" stroke-width="2"/><line x1="480" y1="70" x2="530" y2="190" stroke-width="2"/>
    <path d="M20 190 Q80 230 140 190 Z" fill="#ddd"/><path d="M420 190 Q480 230 540 190 Z" fill="#ddd"/>`),
  baby: (happy) => svg('0 0 200 200', `
    <circle cx="100" cy="105" r="80" fill="#ffd9b8"/>
    <path d="M90 30 Q100 10 115 28" fill="none"/>
    <circle cx="22" cy="105" r="12" fill="#ffd9b8"/><circle cx="178" cy="105" r="12" fill="#ffd9b8"/>
    ${happy
      ? `<circle cx="70" cy="95" r="7" fill="#2b2b2b"/><circle cx="130" cy="95" r="7" fill="#2b2b2b"/>
         <path d="M70 135 Q100 165 130 135" fill="#e57373"/>
         <circle cx="55" cy="125" r="10" fill="#ffab91" stroke="none"/><circle cx="145" cy="125" r="10" fill="#ffab91" stroke="none"/>`
      : `<path d="M58 95 Q70 85 82 95 M118 95 Q130 85 142 95" fill="none"/>
         <ellipse cx="100" cy="145" rx="24" ry="18" fill="#c62828"/>
         <path d="M64 102 q-6 18 0 28 q6 -10 0 -28z M136 102 q-6 18 0 28 q6 -10 0 -28z" fill="#6ec6ff" stroke-width="2"/>`}`),
  bottle: (full) => svg('0 0 70 150', `
    <path d="M27 6 Q35 -2 43 6 L46 26 L24 26 Z" fill="#ffcc80"/>
    <rect x="16" y="26" width="38" height="16" rx="4" fill="#4fc3f7"/>
    <rect x="12" y="42" width="46" height="100" rx="12" fill="#fff" fill-opacity=".6"/>
    ${full ? '<rect x="14" y="60" width="42" height="80" rx="10" fill="#fffaf0" stroke="none"/><rect x="12" y="42" width="46" height="100" rx="12" fill="none"/>' : ''}
    <line x1="58" y1="70" x2="48" y2="70" stroke-width="2"/><line x1="58" y1="95" x2="48" y2="95" stroke-width="2"/>
    <line x1="58" y1="120" x2="48" y2="120" stroke-width="2"/>`),
  milk: () => svg('0 0 110 160', `
    <polygon points="15,40 55,10 95,40 95,152 15,152" fill="#fff"/>
    <line x1="15" y1="40" x2="95" y2="40"/>
    <rect x="15" y="70" width="80" height="40" fill="#4fc3f7"/>
    <text x="55" y="99" font-size="22" text-anchor="middle" fill="#fff" stroke="none" font-family="sans-serif" font-weight="bold">MILK</text>`),
  balloon: (c) => svg('0 0 80 160', `
    <path d="M40 98 Q30 120 44 135 Q54 150 40 160" fill="none" stroke-width="2"/>
    <ellipse cx="40" cy="48" rx="34" ry="44" fill="${c}"/>
    <polygon points="34,98 46,98 40,90" fill="${c}" stroke-width="3"/>
    <path d="M22 30 Q26 18 36 16" fill="none" stroke="#fff" stroke-width="5" opacity=".7"/>`),
  bulb: (on) => svg('0 0 100 170', `
    <line x1="50" y1="0" x2="50" y2="70"/>
    <rect x="38" y="70" width="24" height="22" fill="#888"/>
    ${on ? '<circle cx="50" cy="122" r="48" fill="#fff59d" stroke="none" opacity=".6"/>' : ''}
    <circle cx="50" cy="122" r="32" fill="${on ? '#ffe066' : '#666'}"/>`),
  lightSwitch: (up) => svg('0 0 70 100', `
    <rect x="4" y="4" width="62" height="92" rx="8" fill="#eee"/>
    <rect x="24" y="${up ? 18 : 50}" width="22" height="32" rx="4" fill="#bbb"/>`),
};
