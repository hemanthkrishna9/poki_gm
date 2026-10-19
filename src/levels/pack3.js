'use strict';

// Level pack 3 — outdoors: nature, animals, weather, seasons, the sea, space. Appended to LEVELS.
{
  const FONT = 'font-family="Patrick Hand, Comic Sans MS, sans-serif" font-weight="bold" stroke="none"';
  const face = (x1, x2, y, w = 3) => `<circle cx="${x1}" cy="${y}" r="${w}" fill="#2b2b2b" stroke="none"/><circle cx="${x2}" cy="${y}" r="${w}" fill="#2b2b2b" stroke="none"/>`;
  const starPts = (cx, cy, R, r) => Array.from({ length: 10 }, (_, i) => {
    const t = -Math.PI / 2 + (i * Math.PI) / 5, d = i % 2 ? r : R;
    return `${(cx + Math.cos(t) * d).toFixed(1)},${(cy + Math.sin(t) * d).toFixed(1)}`;
  }).join(' ');
  const dots = (n, seed, col, maxY = 440) => { // deterministic sprinkle of tiny dots (stars, snow)
    let s = seed, out = '';
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < n; i++) out += `<circle cx="${(rnd() * 960).toFixed(0)}" cy="${(rnd() * maxY).toFixed(0)}" r="${(1.5 + rnd() * 2.5).toFixed(1)}" fill="${col}" stroke="none" opacity="${(0.5 + rnd() * 0.5).toFixed(2)}"/>`;
    return svg('0 0 960 440', out);
  };
  const deco = (a, html, x, y, w, h, z) => { const d = a.put(html, x, y, w, h, { z }); d.style.pointerEvents = 'none'; return d; };

  const P3 = {
    star: () => svg('0 0 100 100', `<polygon points="${starPts(50, 54, 46, 20)}" fill="#fff3a6"/>
      ${face(42, 58, 54)}<path d="M44 63 Q50 68 56 63" fill="none" stroke-width="3"/>`),
    earth: () => svg('0 0 160 160', `<circle cx="80" cy="80" r="72" fill="#4fa3e0"/>
      <path d="M34 50 Q50 30 72 38 Q80 54 64 62 Q60 80 44 78 Q30 70 34 50 Z" fill="#7bd389" stroke-width="3"/>
      <path d="M96 96 Q118 88 128 104 Q124 124 106 130 Q92 122 96 96 Z" fill="#7bd389" stroke-width="3"/>
      <path d="M104 30 Q120 34 124 48 Q112 50 104 30 Z" fill="#7bd389" stroke-width="3"/>
      ${face(64, 96, 88, 5)}<path d="M66 106 Q80 118 94 106" fill="none"/>
      <circle cx="54" cy="102" r="7" fill="#ff9e9e" stroke="none" opacity=".7"/><circle cx="106" cy="102" r="7" fill="#ff9e9e" stroke="none" opacity=".7"/>`),
    moon: () => svg('0 0 80 80', `<circle cx="40" cy="40" r="34" fill="#dcdcdc"/>
      <circle cx="26" cy="28" r="7" fill="#c4c4c4" stroke-width="2"/><circle cx="54" cy="52" r="9" fill="#c4c4c4" stroke-width="2"/>
      <path d="M30 44 q4 3 8 0 M46 36 q4 3 8 0" fill="none" stroke-width="3"/>`),
    bigSun: (glow) => {
      let rays = '';
      for (let i = 0; i < 12; i++) {
        const t = (i * Math.PI) / 6, c = Math.cos(t), s = Math.sin(t);
        rays += `<line x1="${120 + c * 82}" y1="${120 + s * 82}" x2="${120 + c * 108}" y2="${120 + s * 108}" stroke-width="6"/>`;
      }
      return svg('0 0 240 240', `<circle cx="120" cy="120" r="${glow ? 118 : 98}" fill="${glow ? '#fff7cc' : '#fff1b0'}" stroke="none"/>
        ${rays}<circle cx="120" cy="120" r="70" fill="#ffc928"/>
        ${face(100, 140, 110, 6)}<path d="M96 134 Q120 154 144 134" fill="none" stroke-width="5"/>
        <circle cx="86" cy="132" r="9" fill="#ff8a65" stroke="none" opacity=".6"/><circle cx="154" cy="132" r="9" fill="#ff8a65" stroke="none" opacity=".6"/>`);
    },
    rainCloud: () => {
      let rain = '';
      for (let i = 0; i < 6; i++) rain += `<line x1="${54 + i * 26}" y1="${120 + (i % 2) * 14}" x2="${46 + i * 26}" y2="${148 + (i % 2) * 14}" stroke="#2f80ed" stroke-width="5"/>`;
      return svg('0 0 240 170', `${rain}
        <path d="M44 108 Q8 108 12 80 Q10 52 44 54 Q50 20 92 24 Q116 2 148 22 Q186 12 196 50 Q232 54 228 84 Q226 110 196 108 Z" fill="#a9b6c4"/>
        <path d="M86 70 q8 -6 16 0 M138 70 q8 -6 16 0" fill="none" stroke-width="3"/><path d="M108 90 Q120 84 132 90" fill="none" stroke-width="3"/>`);
    },
    rainbow: () => {
      const cols = ['#e53935', '#ff9800', '#ffd23f', '#66bb6a', '#42a5f5', '#8e5bd6'];
      return svg('0 0 560 290', cols.map((c, i) => {
        const r = 262 - i * 24;
        return `<path d="M${280 - r} 290 A${r} ${r} 0 0 1 ${280 + r} 290" fill="none" stroke="${c}" stroke-width="25" stroke-linecap="butt"/>`;
      }).join(''));
    },
    crayons: () => svg('0 0 120 120', `
      ${['#e53935', '#ffd23f', '#42a5f5', '#66bb6a'].map((c, i) => `<rect x="${16 + i * 23}" y="${22 + (i % 2) * 10}" width="18" height="60" fill="${c}"/><polygon points="${16 + i * 23},${22 + (i % 2) * 10} ${34 + i * 23},${22 + (i % 2) * 10} ${25 + i * 23},${6 + (i % 2) * 10}" fill="${c}" stroke-width="3"/>`).join('')}
      <rect x="8" y="58" width="104" height="58" rx="6" fill="#ffb74d"/>
      <text x="60" y="96" font-size="22" text-anchor="middle" fill="#2b2b2b" ${FONT}>COLORS</text>`),
    meadow: () => svg('0 0 960 140', `<path d="M0 50 Q200 0 460 36 T960 26 L960 140 L0 140 Z" fill="#8fd18b"/>
      <path d="M0 96 Q300 60 620 92 T960 84 L960 140 L0 140 Z" fill="#6fbf6a" stroke="none"/>`),
    rocket: (fire) => svg('0 0 160 330', `
      ${fire ? '<polygon points="54,286 106,286 80,330" fill="#ff8c1a"/><polygon points="64,286 96,286 80,316" fill="#ffd23f" stroke="none"/>' : ''}
      <polygon points="44,214 10,292 50,270" fill="#e53935"/><polygon points="116,214 150,292 110,270" fill="#e53935"/>
      <rect x="56" y="266" width="48" height="22" rx="4" fill="#888"/>
      <path d="M80 10 Q132 70 120 200 L114 272 L46 272 L40 200 Q28 70 80 10 Z" fill="#f2f2f2"/>
      <path d="M80 10 Q104 34 113 72 L47 72 Q56 34 80 10 Z" fill="#e53935"/>
      <circle cx="80" cy="134" r="28" fill="#9fe0f5"/><circle cx="80" cy="134" r="18" fill="#ffd9b8" stroke-width="3"/>
      ${face(74, 86, 132, 2.5)}<path d="M74 140 Q80 145 86 140" fill="none" stroke-width="2.5"/>
      <line x1="80" y1="190" x2="80" y2="250" stroke-width="3"/>`),
    panel: () => svg('0 0 450 310', `<rect x="6" y="6" width="438" height="298" rx="22" fill="#b0bec5"/>
      <rect x="28" y="20" width="394" height="74" rx="10" fill="#1d2b22"/>
      <circle cx="26" cy="284" r="5" fill="#78909c"/><circle cx="424" cy="284" r="5" fill="#78909c"/>`),
    pad: () => svg('0 0 960 60', `<rect x="-10" y="6" width="980" height="70" fill="#6d7b8a"/><rect x="90" y="0" width="220" height="16" rx="4" fill="#9aa5b1"/>`),
    kid: () => svg('0 0 110 170', `
      <rect x="34" y="116" width="15" height="46" rx="7" fill="#3f51b5" transform="rotate(22 41 118)"/>
      <rect x="54" y="116" width="15" height="46" rx="7" fill="#3f51b5" transform="rotate(-24 61 118)"/>
      <path d="M38 84 L18 112" stroke-width="13"/><path d="M38 84 L18 112" stroke="#ffd9b8" stroke-width="6"/>
      <rect x="28" y="66" width="48" height="58" rx="16" fill="#ff7043"/>
      <path d="M66 82 L96 58" stroke-width="13"/><path d="M66 82 L96 58" stroke="#ffd9b8" stroke-width="6"/>
      <circle cx="54" cy="38" r="26" fill="#ffd9b8"/>
      <path d="M28 34 Q30 8 56 10 Q80 12 80 34 Q66 22 50 26 Q38 22 28 34 Z" fill="#6b4a2b"/>
      <circle cx="66" cy="40" r="3.5" fill="#2b2b2b" stroke="none"/><path d="M58 52 Q66 58 74 50" fill="none" stroke-width="3"/>
      <circle cx="74" cy="48" r="5" fill="#ff9e9e" stroke="none" opacity=".7"/>`),
    kite: () => svg('0 0 90 130', `
      <path d="M45 96 Q30 108 48 114 Q62 120 46 128" fill="none" stroke-width="3"/>
      <polygon points="38,104 46,108 38,112" fill="#42a5f5" stroke-width="2"/><polygon points="52,118 44,121 52,126" fill="#42a5f5" stroke-width="2"/>
      <polygon points="45,4 84,44 45,96 6,44" fill="#e53935"/>
      <polygon points="45,4 84,44 45,44" fill="#ffd23f" stroke="none"/><polygon points="45,44 6,44 45,96" fill="#ffd23f" stroke="none"/>
      <polygon points="45,4 84,44 45,96 6,44" fill="none"/><line x1="45" y1="4" x2="45" y2="96" stroke-width="3"/><line x1="6" y1="44" x2="84" y2="44" stroke-width="3"/>`),
    puffCloud: () => svg('0 0 180 110', `<path d="M36 96 Q6 96 10 72 Q8 48 38 50 Q44 18 84 22 Q108 2 136 22 Q172 22 170 58 Q178 96 144 96 Z" fill="#fff"/>
      ${face(76, 116, 58)}<circle cx="96" cy="74" r="6" fill="none" stroke-width="3"/>`),
    sea: (clear) => svg('0 0 960 260', `<path d="M0 12 Q40 2 80 12 T160 12 T240 12 T320 12 T400 12 T480 12 T560 12 T640 12 T720 12 T800 12 T880 12 T960 12 L960 260 L0 260 Z"
      fill="#1e88e5" fill-opacity="${clear ? 0.3 : 1}" stroke="none"/>
      <path d="M0 12 Q40 2 80 12 T160 12 T240 12 T320 12 T400 12 T480 12 T560 12 T640 12 T720 12 T800 12 T880 12 T960 12" fill="none" stroke="#fff" stroke-width="5" opacity=".9"/>
      <path d="M60 70 q20 -8 40 0 M300 110 q20 -8 40 0 M140 200 q20 -8 40 0" fill="none" stroke="#fff" stroke-width="3" opacity=".35"/>`),
    bergA: () => svg('0 0 220 260', `<polygon points="20,170 50,90 75,110 105,15 140,80 165,60 200,170 170,212 110,234 55,212" fill="#fff"/>
      <polygon points="105,15 140,80 165,60 198,166 150,166 122,92" fill="#cfeefe" stroke="none"/>`),
    bergB: () => svg('0 0 160 190', `<polygon points="15,110 40,50 70,65 95,20 125,60 145,110 125,150 80,170 35,150" fill="#fff"/>
      <polygon points="95,20 125,60 143,106 104,106 92,56" fill="#cfeefe" stroke="none"/>`),
    bergC: () => svg('0 0 440 340', `
      <polygon points="190,100 205,72 222,64 240,78 258,100 330,128 400,170 430,232 400,300 300,332 160,335 60,300 14,232 40,160 110,126" fill="#fff"/>
      <polygon points="258,100 330,128 400,170 430,232 400,300 330,320 360,230 320,160 240,110" fill="#cfeefe" stroke="none"/>
      <ellipse cx="222" cy="40" rx="17" ry="24" fill="#2b2b2b" stroke="none"/>
      <ellipse cx="222" cy="46" rx="10" ry="16" fill="#fff" stroke="none"/>
      <circle cx="217" cy="32" r="2.5" fill="#2b2b2b" stroke="none"/><circle cx="227" cy="32" r="2.5" fill="#2b2b2b" stroke="none"/>
      <polygon points="217,37 227,37 222,44" fill="#ff8c1a" stroke-width="2"/>
      <ellipse cx="214" cy="66" rx="7" ry="3.5" fill="#ff8c1a" stroke-width="2"/><ellipse cx="230" cy="66" rx="7" ry="3.5" fill="#ff8c1a" stroke-width="2"/>`),
    fish: (c) => svg('0 0 80 50', `<polygon points="58,25 78,10 78,40" fill="${c}"/><ellipse cx="36" cy="25" rx="28" ry="17" fill="${c}"/><circle cx="22" cy="21" r="3" fill="#2b2b2b" stroke="none"/>`),
    bear: (awake) => svg('0 0 230 130', `
      <ellipse cx="128" cy="90" rx="94" ry="38" fill="#8d5a3b"/>
      <ellipse cx="96" cy="118" rx="22" ry="10" fill="#7a4a2e"/><ellipse cx="170" cy="118" rx="22" ry="10" fill="#7a4a2e"/>
      <circle cx="28" cy="48" r="12" fill="#8d5a3b"/><circle cx="76" cy="44" r="12" fill="#8d5a3b"/>
      <circle cx="52" cy="78" r="38" fill="#8d5a3b"/>
      <ellipse cx="40" cy="94" rx="18" ry="13" fill="#c69c6d"/><ellipse cx="32" cy="88" rx="7" ry="5" fill="#2b2b2b" stroke="none"/>
      ${awake
        ? `${face(42, 66, 70, 5)}<ellipse cx="44" cy="106" rx="6" ry="5" fill="#c62828" stroke-width="3"/>`
        : `<path d="M34 72 q6 5 12 0 M58 70 q6 5 12 0" fill="none" stroke-width="3"/>
           <text x="150" y="40" font-size="30" fill="#fff" ${FONT}>Zzz</text>`}`),
    cave: (snow) => svg('0 0 420 300', `<path d="M0 300 Q10 120 120 60 Q210 0 300 50 Q410 110 420 300 Z" fill="#9e9e9e"/>
      <path d="M60 230 q20 -10 40 0 M320 210 q20 -10 40 0 M200 60 q20 -10 40 0" fill="none" stroke-width="3" opacity=".5"/>
      ${snow ? '<path d="M44 160 Q70 80 150 50 Q210 22 280 44 Q350 70 380 150 Q350 128 318 136 Q290 110 250 118 Q214 98 180 116 Q140 104 116 132 Q88 124 44 160 Z" fill="#fff"/>' : ''}
      <path d="M90 300 Q90 140 210 130 Q330 140 330 300 Z" fill="#3a3a46"/>`),
    tree: (leaves, snow) => {
      const br = 'M130 190 L70 110 L46 50 M70 110 L22 92 M130 160 L134 22 M134 80 L176 44 M130 178 L204 100 L240 76 M204 100 L214 46';
      const tips = [[46, 50], [22, 92], [134, 22], [176, 44], [240, 76], [214, 46]];
      return svg('0 0 260 340', `
        ${leaves ? `<g fill="#7bd389">${[[60, 70, 44], [130, 40, 48], [200, 66, 46], [100, 110, 40], [170, 110, 40]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>` : ''}
        <path d="${br}" fill="none" stroke-width="17"/><path d="${br}" fill="none" stroke="#8d6e63" stroke-width="9"/>
        <path d="M104 340 Q114 250 116 160 L144 160 Q146 250 158 340 Z" fill="#8d6e63"/>
        <path d="M116 168 L144 168" stroke="#8d6e63" stroke-width="10"/>
        ${leaves ? [[60, 60], [200, 56], [134, 30], [96, 116], [176, 112]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="8" fill="#e53935" stroke-width="3"/>`).join('') : ''}
        ${snow ? `<g fill="#fff" stroke-width="3">${tips.map(([x, y]) => `<ellipse cx="${x}" cy="${y - 4}" rx="12" ry="6"/>`).join('')}</g>` : ''}`);
    },
    page: (m, icon, col) => svg('0 0 110 130', `<path d="M55 18 L45 4 M55 18 L65 4" fill="none" stroke-width="2"/>
      <rect x="6" y="16" width="98" height="108" rx="6" fill="#fff"/>
      <path d="M6 22 Q6 16 12 16 L98 16 Q104 16 104 22 L104 46 L6 46 Z" fill="${col}"/>
      <circle cx="32" cy="16" r="4" fill="#fff"/><circle cx="78" cy="16" r="4" fill="#fff"/>
      <text x="55" y="41" font-size="24" text-anchor="middle" fill="#fff" ${FONT}>${m}</text>
      ${icon}`),
    clock: () => svg('0 0 90 100', `<line x1="24" y1="80" x2="14" y2="96"/><line x1="66" y1="80" x2="76" y2="96"/>
      <circle cx="22" cy="20" r="13" fill="#ffd23f"/><circle cx="68" cy="20" r="13" fill="#ffd23f"/>
      <circle cx="45" cy="56" r="36" fill="#e53935"/><circle cx="45" cy="56" r="26" fill="#fff"/>
      <line x1="45" y1="56" x2="45" y2="38" stroke-width="3"/><line x1="45" y1="56" x2="58" y2="62" stroke-width="3"/>`),
    ground: (season) => svg('0 0 960 150', season === 3
      ? `<path d="M0 30 Q240 0 480 24 T960 20 L960 150 L0 150 Z" fill="#8fd18b"/>
         ${[[60, 70], [300, 96], [420, 60], [880, 80], [920, 120], [240, 128]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="9" fill="${i % 2 ? '#ffd23f' : '#f48fb1'}" stroke-width="3"/><circle cx="${x}" cy="${y}" r="3" fill="#fff" stroke="none"/>`).join('')}`
      : `<path d="M0 30 Q240 0 480 24 T960 20 L960 150 L0 150 Z" fill="${season === 2 ? '#eef5fb' : '#fff'}"/>
         ${season === 2 ? '<g fill="#8fd18b" stroke-width="3"><ellipse cx="90" cy="80" rx="60" ry="18"/><ellipse cx="380" cy="110" rx="70" ry="20"/><ellipse cx="880" cy="70" rx="50" ry="16"/></g>' : ''}`),
  };

  const flake = '<g stroke="#4fa3e0" stroke-width="4"><line x1="55" y1="62" x2="55" y2="108"/><line x1="35" y1="73" x2="75" y2="97"/><line x1="35" y1="97" x2="75" y2="73"/></g>';
  const drop = '<path d="M55 62 Q74 90 66 100 Q55 112 44 100 Q36 90 55 62 Z" fill="#6ec6ff"/>';
  const bloom = '<g stroke-width="3"><line x1="55" y1="96" x2="55" y2="118" stroke="#4c9a52"/><circle cx="55" cy="70" r="10" fill="#f48fb1"/><circle cx="41" cy="84" r="10" fill="#f48fb1"/><circle cx="69" cy="84" r="10" fill="#f48fb1"/><circle cx="55" cy="96" r="10" fill="#f48fb1"/><circle cx="55" cy="83" r="8" fill="#ffd23f"/></g>';

  LEVELS.push(
    {
      id: 'nearstar',
      q: ['Tap the star closest to Earth.'],
      hint: 'Not every star comes out at night.',
      answer: 'The Sun! It\'s a star — the closest one to Earth.',
      setup(a) {
        a.stage.style.background = '#1b2350';
        deco(a, dots(70, 7, '#fff'), 0, 0, 960, 440, 0);
        const earth = a.put(P3.earth(), 60, 250, 160, 160, { z: 2 });
        a.tap(earth, () => { a.wrong(earth); a.say('That\'s us!', 140, 250); });
        const moon = a.put(P3.moon(), 250, 190, 80, 80, { z: 2 });
        a.tap(moon, () => { a.wrong(moon); a.say('I\'m the Moon!', 290, 190); });
        for (const [x, y] of [[255, 330], [170, 40], [400, 70], [540, 250]]) {
          const s = a.put(P3.star(), x, y, 80, 80, { z: 2 });
          a.tap(s, () => { a.wrong(s); a.say('Far, far away…', x + 40, y); });
        }
        const sun = a.put(P3.bigSun(false), 700, 60, 240, 240, { z: 2 });
        a.tap(sun, () => {
          sun.innerHTML = P3.bigSun(true);
          sun.style.transform = 'scale(1.08)';
          a.win('The Sun IS a star — our closest one!');
        });
      },
    },
    {
      id: 'rainbow',
      q: ['Make a rainbow!'],
      hint: 'A rainbow needs two kinds of weather at once.',
      answer: 'Drag the rain cloud next to the sun.',
      setup(a) {
        a.stage.style.background = '#bfe9ff';
        const bow = deco(a, P3.rainbow(), 200, 50, 560, 290, 1);
        bow.style.opacity = '0';
        bow.style.transition = 'opacity 1s';
        a.put(P3.meadow(), 0, 300, 960, 140, { z: 2 });
        const sun = a.put(P3.bigSun(false), 690, 40, 160, 160, { z: 4 });
        const cloud = a.put(P3.rainCloud(), 60, 30, 240, 170, { z: 5 });
        const crayons = a.put(P3.crayons(), 640, 300, 120, 120, { z: 6 });
        a.tap(crayons, () => { a.wrong(crayons); a.say('No drawing it!', 700, 300); });
        const check = (el, back) => {
          const s = a.box(sun), c = a.box(cloud);
          if (s.cy > 330) { a.wrong(el); return back(); } // don't bury the sun
          if (Math.hypot(s.cx - c.cx, s.cy - c.cy) < 250) {
            const mid = Math.max(0, Math.min(400, (s.cx + c.cx) / 2 - 280));
            bow.style.left = mid + 'px';
            bow.style.opacity = '1';
            a.win('Sun + rain = rainbow!');
          }
        };
        a.drag(cloud, { onTap: () => a.say('Drip drop…', 180, 40), onDrop: check });
        a.drag(sun, { onTap: () => a.say('So sunny!', 770, 40), onDrop: check });
      },
    },
    {
      id: 'liftoff',
      q: ['Launch the rocket!'],
      hint: 'How does every rocket launch begin?',
      answer: 'Count down: tap 3, then 2, then 1.',
      setup(a) {
        a.stage.style.background = '#24305e';
        deco(a, dots(50, 3, '#fff', 300), 0, 0, 960, 440, 0);
        deco(a, P3.pad(), 0, 380, 960, 60, 1);
        const rocket = a.put(P3.rocket(false), 120, 88, 160, 330, { z: 3 });
        a.tap(rocket, () => a.say('Ready when you are!', 200, 100));
        deco(a, P3.panel(), 460, 100, 450, 310, 2);
        const screen = deco(a, '', 490, 122, 390, 70, 3);
        const show = (t) => { screen.innerHTML = `<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#7cfc8a;font-size:40px;font-weight:bold;letter-spacing:3px">${t}</div>`; };
        show('READY');
        const btnHtml = (n, lit) => `<div style="width:100%;height:100%;box-sizing:border-box;border:4px solid #2b2b2b;border-radius:50%;background:${lit ? '#ffd23f' : '#7bd389'};font-size:54px;font-weight:bold;display:flex;align-items:center;justify-content:center;${lit ? 'box-shadow:0 0 18px #ffd23f' : ''}">${n}</div>`;
        const btns = {};
        let seq = [];
        const reset = () => { seq = []; for (const n in btns) btns[n].innerHTML = btnHtml(n, false); };
        [1, 2, 3].forEach((n, i) => {
          const b = a.put(btnHtml(n, false), 510 + i * 130, 215, 90, 90, { z: 4 });
          btns[n] = b;
          a.tap(b, () => {
            const want = [3, 2, 1][seq.length];
            if (n !== want) { a.wrong(b); show('ERROR'); reset(); return; }
            seq.push(n);
            b.innerHTML = btnHtml(n, true);
            show(n + '…');
            if (n === 1) {
              show('LIFTOFF!');
              rocket.innerHTML = P3.rocket(true);
              rocket.style.transition = 'top 1.3s ease-in';
              rocket.style.top = '-420px';
              a.win('3… 2… 1… Blast off!');
            }
          });
        });
        const go = a.put('<div style="width:100%;height:100%;box-sizing:border-box;border:4px solid #2b2b2b;border-radius:18px;background:#e53935;color:#fff;font-size:34px;font-weight:bold;display:flex;align-items:center;justify-content:center">LAUNCH</div>',
          555, 325, 260, 66, { z: 4 });
        a.tap(go, () => { a.wrong(go); show('NOT YET'); reset(); });
      },
    },
    {
      id: 'kite',
      q: ['Make the kite fly!'],
      hint: 'No wind today? Make your own.',
      answer: 'Drag the kid to run back and forth across the field.',
      setup(a) {
        a.stage.style.background = '#bfe9ff';
        const puff = a.put(P3.puffCloud(), 600, 30, 180, 110, { z: 1 });
        a.tap(puff, () => { a.wrong(puff); a.say('Pfff… no wind.', 690, 40); });
        a.put(P3.meadow(), 0, 290, 960, 150, { z: 1 });
        const line = deco(a, '', 0, 0, 960, 440, 4);
        const kite = a.put(P3.kite(), 0, 0, 90, 130, { z: 5 });
        const kid = a.put(P3.kid(), 90, 200, 110, 170, { z: 6 });
        let dist = 0, lastX = null, dir = 1, lift = 0, rest = 0;
        const place = () => {
          const k = a.box(kid);
          const hx = k.x + (dir > 0 ? 96 : 14), hy = k.y + 58;
          const cx = Math.max(50, Math.min(910, hx + dir * (80 - 330 * lift)));
          const cy = 368 - 310 * Math.sqrt(lift);
          Object.assign(kite.style, { left: cx - 45 + 'px', top: cy - 44 + 'px', transform: `rotate(${dir * (1 - lift) * 75}deg)` });
          const sag = 40 * (1 - lift) + 30;
          line.innerHTML = svg('0 0 960 440', `<path d="M${hx} ${hy} Q${(hx + cx) / 2} ${(hy + cy) / 2 + sag} ${cx} ${cy}" fill="none" stroke-width="2"/>`);
        };
        place();
        a.drag(kite, {
          onTap: () => { a.wrong(kite); a.say('No wind…', a.box(kite).cx, a.box(kite).y); },
          onDrop: (el, back) => { a.wrong(kite); back(); place(); },
        });
        a.drag(kid, {
          onTap: () => a.say('No wind today…', a.box(kid).cx, a.box(kid).y),
          onMove: (el) => {
            clearTimeout(rest);
            const x = parseFloat(el.style.left);
            if (lastX === null) lastX = x;
            const dx = x - lastX;
            lastX = x;
            if (Math.abs(dx) > 1) {
              dir = dx > 0 ? 1 : -1;
              el.style.transform = dir > 0 ? '' : 'scaleX(-1)';
            }
            dist += Math.abs(dx);
            lift = Math.min(1, dist / 420);
            kite.style.transition = 'none';
            place();
            if (lift >= 1) {
              kid.addEventListener('pointermove', place); // keep the string attached while the finger is still down
              a.win('Run, run — it flies!');
            }
          },
          onDrop: () => {
            lastX = null;
            if (a.done) return;
            if (dist > 120) a.say('Keep running!', a.box(kid).cx, a.box(kid).y);
            // a short breather keeps the kite up; stop too long and it falls
            rest = setTimeout(() => {
              if (a.done) return;
              dist = 0; lift = 0;
              kite.style.transition = 'left .6s, top .6s, transform .6s';
              place();
            }, 1200);
          },
        });
      },
    },
    {
      id: 'iceberg',
      q: ['Which iceberg is the biggest?'],
      hint: 'You\'re only seeing the tip of it…',
      answer: 'The tiny one with the penguin — it\'s huge underwater!',
      setup(a) {
        a.stage.style.background = '#d7f1ff';
        deco(a, P3.fish('#ff8c1a'), 140, 330, 80, 50, 8);
        deco(a, P3.fish('#ffd23f'), 330, 270, 64, 40, 8).style.transform = 'scaleX(-1)';
        const A = a.put(P3.bergA(), 50, 20, 220, 260, { z: 10 });
        const B = a.put(P3.bergB(), 290, 80, 160, 190, { z: 10 });
        const C = a.put(P3.bergC(), 490, 90, 440, 340, { z: 10 });
        const sea = deco(a, P3.sea(false), 0, 180, 960, 260, 20);
        sea.style.transition = 'opacity .8s';
        a.tap(A, () => { a.wrong(A); a.say('Tall… but?', 160, 30); });
        a.tap(B, () => a.wrong(B));
        a.tap(C, () => {
          sea.innerHTML = P3.sea(true);
          a.say('Whoa!', 710, 120);
          a.win('Most of an iceberg hides underwater!');
        });
      },
    },
    {
      id: 'bear',
      q: ['Wake up the bear!'],
      hint: 'Bears sleep all winter long. Do you really want to wait?',
      answer: 'Tear the calendar pages until it\'s spring.',
      setup(a) {
        const sky = ['#dbe9f5', '#dbe9f5', '#cfe8f7', '#bfe9ff'];
        a.stage.style.background = sky[0];
        const ground = a.put(P3.ground(0), 0, 290, 960, 150, { z: 1 });
        const tree = deco(a, P3.tree(false, true), 30, 0, 260, 340, 2);
        const cave = deco(a, P3.cave(true), 470, 90, 420, 300, 2);
        const bear = a.put(P3.bear(false), 565, 255, 230, 130, { z: 3 });
        a.tap(bear, () => { a.wrong(bear); a.say('Zzz…', 680, 250); });
        const clock = a.put(P3.clock(), 330, 300, 90, 100, { z: 4 });
        a.tap(clock, () => {
          a.say('RIIING!', 375, 300);
          setTimeout(() => { if (!a.done) { a.wrong(bear); a.say('Zzz…', 680, 250); } }, 500);
        });
        const snow = deco(a, dots(60, 11, '#fff'), 0, 0, 960, 440, 30);
        snow.style.transition = 'opacity 1s';
        let season = 0;
        const pages = [
          ['APR', bloom, '#66bb6a'], ['MAR', drop, '#42a5f5'], ['FEB', flake, '#5c6bc0'], ['JAN', flake, '#e53935'],
        ].map(([m, icon, col], i) => a.put(P3.page(m, icon, col), 105, 150, 110, 130, { z: 5 + i }));
        const setSeason = (s) => {
          season = s;
          a.stage.style.background = sky[s];
          ground.innerHTML = P3.ground(s);
          snow.style.opacity = s >= 2 ? '0' : '1';
          tree.innerHTML = P3.tree(s === 3, s < 2);
          cave.innerHTML = P3.cave(s < 2);
          if (s === 3) {
            bear.innerHTML = P3.bear(true);
            a.say('*YAWN*', 680, 250);
            a.win('Spring! Good morning, bear!');
          }
        };
        const tear = (p) => {
          if (p.dataset.torn) return;
          p.dataset.torn = '1';
          p.style.pointerEvents = 'none';
          p.style.transition = 'transform .5s, opacity .5s';
          p.style.transform = 'translate(-40px, 220px) rotate(-50deg)';
          p.style.opacity = '0';
          setTimeout(() => p.remove(), 520);
          setSeason(season + 1);
        };
        pages.slice(1).forEach((p) => a.drag(p, { onTap: () => tear(p), onDrop: () => tear(p) }));
      },
    },
  );
}
