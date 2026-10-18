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
  elephant: () => svg('0 0 230 190', `
    <rect x="50" y="130" width="28" height="50" rx="6" fill="#a8b3bd"/><rect x="130" y="130" width="28" height="50" rx="6" fill="#a8b3bd"/>
    <ellipse cx="105" cy="105" rx="80" ry="55" fill="#a8b3bd"/>
    <path d="M190 100 Q215 140 196 175" fill="none" stroke-width="14"/>
    <path d="M190 100 Q215 140 196 175" fill="none" stroke="#a8b3bd" stroke-width="8"/>
    <circle cx="180" cy="80" r="38" fill="#a8b3bd"/>
    <ellipse cx="160" cy="80" rx="22" ry="32" fill="#c3ccd4"/>
    <circle cx="196" cy="72" r="4" fill="#2b2b2b"/>
    <path d="M27 95 Q14 110 22 125" fill="none"/>`),
  fridgeBody: () => svg('0 0 180 320', `
    <rect x="4" y="4" width="172" height="312" rx="12" fill="#f2f2f2"/>
    <rect x="16" y="16" width="148" height="288" rx="6" fill="#d8f2ff"/>
    <line x1="16" y1="110" x2="164" y2="110"/><line x1="16" y1="210" x2="164" y2="210"/>
    <circle cx="50" cy="94" r="12" fill="#e53935"/><rect x="100" y="180" width="30" height="28" fill="#fff"/>`),
  fridgeDoor: () => svg('0 0 180 320', `
    <rect x="4" y="4" width="172" height="312" rx="12" fill="#fafafa"/>
    <line x1="4" y1="110" x2="176" y2="110"/>
    <rect x="22" y="40" width="10" height="50" rx="4" fill="#bbb"/><rect x="22" y="130" width="10" height="80" rx="4" fill="#bbb"/>`),
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

// ---------- levels ----------
// Each level: q (question segments; {w:'id'} makes a tappable word), hint, answer (shown on skip), setup(api).
const LEVELS = [
  {
    q: ['Tap the largest number.'],
    hint: 'Largest doesn\'t have to mean highest value…',
    answer: 'The 3 was the LARGEST — just look at it!',
    setup(a) {
      const nums = [[19, 90, 60], [42, 260, 260], [3, 400, 0], [27, 690, 70], [88, 760, 280]];
      for (const [n, x, y] of nums) {
        const big = n === 3;
        const el = a.put(`<div class="num" style="font-size:${big ? 300 : 64}px;width:100%;height:100%">${n}</div>`,
          x, y, big ? 200 : 110, big ? 330 : 90);
        a.tap(el, () => (big ? a.win('Biggest on screen, not biggest in value!') : a.wrong(el)));
      }
    },
  },
  {
    q: ['Where is the mouse hiding?'],
    hint: 'Things on the floor can be moved.',
    answer: 'The mouse was under the rug.',
    setup(a) {
      a.stage.style.background = '#f3e5c8';
      const cheese = a.put(ART.cheese(), 120, 300, 130, 90, { z: 2 });
      a.tap(cheese, () => a.wrong(cheese));
      const mouse = a.put(ART.mouse(), 520, 320, 100, 64, { z: 2 });
      a.tap(mouse, () => a.win('Found it! Squeak!'));
      const rug = a.put(ART.rug(), 440, 280, 280, 130, { z: 5 });
      a.drag(rug, { onTap: () => a.wrong(rug), onDrop() {} });
    },
  },
  {
    q: ['Get the key out of the jar!'],
    hint: 'The lid is stuck. Sometimes you just need to keep tapping.',
    answer: 'Tap the jar until it breaks.',
    setup(a) {
      const key = a.put(ART.key(), 450, 160, 60, 120, { z: 1 });
      const jar = a.put(ART.jar(), 395, 70, 170, 230, { z: 5, cls: 'glass' });
      const crack = a.put(ART.crack(0), 395, 70, 170, 230, { z: 6 });
      crack.style.pointerEvents = 'none';
      let hits = 0;
      a.tap(jar, () => {
        hits++;
        jar.classList.remove('shake'); void jar.offsetWidth; jar.classList.add('shake');
        crack.innerHTML = ART.crack(Math.min(hits, 3));
        if (hits >= 4) {
          jar.style.opacity = '0'; jar.style.transform = 'scale(1.3)'; jar.style.pointerEvents = 'none';
          crack.remove();
          a.say('CRASH!', 480, 80);
        }
      });
      a.tap(key, () => a.win('Smashing work!'));
    },
  },
  {
    q: ['The snowman is melting! Save him.'],
    hint: 'Who says the sun has to stay up in the sky?',
    answer: 'Drag the sun down behind the hill.',
    setup(a) {
      a.stage.style.background = '#bfe9ff';
      const sun = a.put(ART.sun(), 700, 30, 120, 120, { z: 3 });
      a.put(svg('0 0 960 140', '<path d="M0 60 Q240 0 480 40 T960 30 L960 140 L0 140 Z" fill="#fff"/>'), 0, 300, 960, 140, { z: 10 });
      const man = a.put(ART.snowman(false), 300, 110, 200, 260, { z: 11 });
      a.tap(man, () => a.wrong(man));
      a.drag(sun, {
        z: 4, keepZ: true,
        onTap: () => a.wrong(sun),
        onDrop(el) {
          if (a.box(el).cy > 350) {
            a.stage.style.background = '#2c3e70';
            man.innerHTML = ART.snowman(true);
            a.win('Sunset — no more melting!');
          }
        },
      });
    },
  },
  {
    q: ['Tap the fastest animal.'],
    hint: 'A cheetah is fast… when it\'s awake.',
    answer: 'The snail — it has a rocket!',
    setup(a) {
      const ch = a.put(ART.cheetah(), 60, 60, 230, 140);
      a.tap(ch, () => { a.wrong(ch); a.say('Zzz…', 260, 70); });
      const tu = a.put(ART.turtle(), 620, 80, 170, 110);
      a.tap(tu, () => a.wrong(tu));
      const sn = a.put(ART.snailRocket(), 340, 260, 250, 140);
      a.tap(sn, () => {
        sn.style.transition = 'left .8s ease-in';
        sn.style.left = '1100px';
        a.win('Zoom! Never underestimate a snail.');
      });
    },
  },
  {
    q: ['Put the elephant in the fridge.'],
    hint: 'Step one of putting anything in a fridge…',
    answer: 'Open the door first, then drag the elephant in.',
    setup(a) {
      const body = a.put(ART.fridgeBody(), 620, 60, 180, 320, { z: 1 });
      const door = a.put(ART.fridgeDoor(), 620, 60, 180, 320, { z: 2, cls: 'door' });
      a.tap(door, () => door.classList.toggle('open'));
      const el = a.put(ART.elephant(), 90, 200, 230, 190, { z: 5 });
      a.drag(el, {
        onTap: () => a.say('Pawoo!', 200, 200),
        onDrop(e, back) {
          if (!a.over(e, body)) return back();
          if (!door.classList.contains('open')) { a.wrong(door); return back(); }
          Object.assign(e.style, { transition: 'transform .4s', transform: 'scale(.5)', left: '595px', top: '140px', zIndex: 1 });
          setTimeout(() => door.classList.remove('open'), 400);
          a.win('Open, insert, close. Easy!');
        },
      });
    },
  },
  {
    q: ['Which one is heavier?'],
    hint: 'Read the labels. Then look at the scale.',
    answer: 'Neither — 1 kg is 1 kg. Tap the balanced scale.',
    setup(a) {
      const sc = a.put(ART.scale(), 200, 60, 560, 300, { z: 1 });
      const f = a.put(ART.feathers(), 225, 100, 140, 150, { z: 2 });
      const i = a.put(ART.iron(), 610, 135, 140, 120, { z: 2 });
      a.tap(f, () => a.wrong(f));
      a.tap(i, () => a.wrong(i));
      a.tap(sc, () => a.win('They weigh the same: 1 kg each!'));
    },
  },
  {
    q: ['Stop the baby from crying.'],
    hint: 'An empty bottle won\'t help anyone.',
    answer: 'Fill the bottle with milk, then give it to the baby.',
    setup(a) {
      const baby = a.put(ART.baby(false), 600, 90, 220, 220, { z: 1 });
      a.tap(baby, () => a.say('WAAAH!', 710, 90));
      const milk = a.put(ART.milk(), 320, 230, 110, 160, { z: 1 });
      a.tap(milk, () => a.wrong(milk));
      const bottle = a.put(ART.bottle(false), 120, 240, 70, 150, { z: 5 });
      let full = false;
      a.drag(bottle, {
        onDrop(b, back) {
          if (!full && a.over(b, milk)) {
            full = true;
            b.innerHTML = ART.bottle(true);
            a.say('Glug glug', 375, 230);
            return back();
          }
          if (a.over(b, baby)) {
            if (!full) { a.wrong(baby); return back(); }
            baby.innerHTML = ART.baby(true);
            b.style.display = 'none';
            return a.win('Happy baby!');
          }
          back();
        },
      });
    },
  },
  {
    q: ['It\'s too dark! Turn on the ', { w: 'light' }, '.'],
    hint: 'The switch is broken. Read the question again — really read it.',
    answer: 'Tap the word "light" in the question.',
    setup(a) {
      const bulb = a.put(ART.bulb(false), 430, 0, 100, 170, { z: 90 });
      const dark = a.put('', 0, 0, 960, 440, { cls: 'dark', z: 80 });
      dark.style.inset = '0';
      let up = false;
      const sw = a.put(ART.lightSwitch(false), 760, 180, 70, 100, { z: 90 });
      a.tap(sw, () => { up = !up; sw.innerHTML = ART.lightSwitch(up); a.wrong(sw); });
      const w = a.word('light');
      w.addEventListener('pointerdown', () => {
        if (a.done) return;
        w.classList.add('glow');
        dark.style.opacity = '0';
        bulb.innerHTML = ART.bulb(true);
        a.win('Let there be light!');
      });
    },
  },
  {
    q: ['Pop all 5 ball', { w: 'o' }, 'ons!'],
    hint: 'Count the balloons again. Look everywhere on the page.',
    answer: 'The "o" in the question was the 5th balloon.',
    setup(a) {
      let left = 5;
      const popped = () => { Sfx.play('pop'); if (--left === 0) a.win('All popped!'); };
      const cols = ['#e53935', '#ffd23f', '#4fc3f7', '#7bd389'];
      [[140, 120], [330, 40], [560, 150], [760, 60]].forEach(([x, y], i) => {
        const b = a.put(ART.balloon(cols[i]), x, y, 80, 160);
        a.tap(b, () => { a.say('POP!', x + 40, y + 50); b.remove(); popped(); });
      });
      const o = a.word('o');
      o.addEventListener('pointerdown', () => {
        if (a.done || o.classList.contains('popped')) return;
        o.classList.add('popped');
        popped();
      });
    },
  },
  {
    q: ['Turn the 6 into a 9.'],
    hint: 'Tapping won\'t do it. Try spinning it with your finger.',
    answer: 'Drag sideways to spin the 6 upside down.',
    setup(a) {
      const six = a.put('<div class="num" style="font-size:280px;width:100%;height:100%">6</div>', 380, 40, 200, 340);
      six.style.transition = 'none';
      six.style.cursor = 'grab';
      let angle = 0;
      six.addEventListener('pointerdown', (e) => {
        if (a.done) return;
        e.preventDefault();
        six.setPointerCapture(e.pointerId);
        const x0 = e.clientX, a0 = angle;
        let moved = false;
        const move = (ev) => {
          const dx = (ev.clientX - x0) / scale;
          if (Math.abs(dx) > 6) moved = true;
          angle = a0 + dx;
          six.style.transform = `rotate(${angle}deg)`;
        };
        const up = () => {
          six.removeEventListener('pointermove', move);
          six.removeEventListener('pointerup', up);
          if (!moved) return a.wrong(six);
          const n = ((angle % 360) + 360) % 360;
          if (n > 150 && n < 210) {
            six.style.transition = 'transform .2s';
            six.style.transform = 'rotate(180deg)';
            a.win('6 upside down is 9!');
          }
        };
        six.addEventListener('pointermove', move);
        six.addEventListener('pointerup', up);
      });
    },
  },
  {
    q: ['Tap FINISH to complete the game!'],
    hint: 'Don\'t give up. Even buttons get tired.',
    answer: 'Keep chasing it — it gives up eventually.',
    setup(a) {
      const btn = a.put('<button class="finish">FINISH</button>', 380, 180, 200, 80);
      const lines = ['Nope!', 'Too slow!', 'Catch me!', 'Hehe!', 'Almost!', 'Phew… okay.'];
      let runs = 0;
      a.tap(btn, () => {
        if (runs >= 5) return a.win('Persistence pays off!');
        a.say(lines[runs], a.box(btn).cx, a.box(btn).y);
        runs++;
        if (runs === 5) { a.say(lines[5], a.box(btn).cx, a.box(btn).y - 10); return; }
        btn.style.transition = 'left .2s, top .2s';
        btn.style.left = 40 + Math.random() * 680 + 'px';
        btn.style.top = 20 + Math.random() * 320 + 'px';
      });
    },
  },
];
