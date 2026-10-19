'use strict';

// Level pack 4 — numbers, words, logic and playful "meta" tricks. Appended to LEVELS.
{
  // ---------- helpers & art (block-scoped so they don't clash with other packs) ----------
  const ink = '#2b2b2b';
  const card = (t, bg, fs = 56) =>
    `<div class="num" style="width:100%;height:100%;box-sizing:border-box;border:4px solid ${ink};border-radius:18px;` +
    `background:${bg};font-size:${fs}px;box-shadow:0 6px 0 ${ink}">${t}</div>`;

  const P4 = {
    door: () => svg('0 0 140 260', `
      <rect x="6" y="6" width="128" height="250" rx="6" fill="#b5835a"/>
      <rect x="22" y="24" width="96" height="90" rx="6" fill="#c99a6e" stroke-width="3"/>
      <rect x="22" y="132" width="96" height="104" rx="6" fill="#c99a6e" stroke-width="3"/>
      <circle cx="112" cy="130" r="9" fill="#ffd23f"/>
      <rect x="104" y="146" width="16" height="26" rx="4" fill="#ffd23f" stroke-width="3"/>
      <circle cx="112" cy="155" r="3" fill="${ink}" stroke="none"/><rect x="110.5" y="155" width="3" height="10" fill="${ink}" stroke="none"/>`),
    keyring: () => svg('0 0 120 120', `
      <circle cx="40" cy="34" r="22" fill="none" stroke-width="5"/>
      <g transform="rotate(-25 60 70)">
        <circle cx="70" cy="50" r="13" fill="#ffcc33"/><circle cx="70" cy="50" r="4" fill="#fffdf7"/>
        <rect x="66" y="62" width="8" height="48" fill="#ffcc33"/><rect x="74" y="94" width="10" height="6" fill="#ffcc33" stroke-width="3"/>
      </g>
      <g transform="rotate(20 40 70)">
        <circle cx="34" cy="58" r="12" fill="#b8c4cc"/><circle cx="34" cy="58" r="4" fill="#fffdf7"/>
        <rect x="30" y="69" width="8" height="40" fill="#b8c4cc"/><rect x="38" y="96" width="9" height="6" fill="#b8c4cc" stroke-width="3"/>
      </g>`),
    piano: () => {
      let white = '', black = '';
      for (let i = 0; i < 10; i++) white += `<rect x="${22 + i * 19.6}" y="96" width="19.6" height="46" fill="#fff" stroke-width="3"/>`;
      for (const i of [0, 1, 3, 4, 5, 7, 8]) black += `<rect x="${35 + i * 19.6}" y="96" width="12" height="28" fill="${ink}" stroke-width="2"/>`;
      return svg('0 0 240 220', `
        <rect x="26" y="150" width="14" height="62" fill="#7a4b2a"/><rect x="200" y="150" width="14" height="62" fill="#7a4b2a"/>
        <rect x="10" y="10" width="220" height="90" rx="10" fill="#8d5a34"/>
        <rect x="34" y="26" width="172" height="44" rx="6" fill="#a8703f" stroke-width="3"/>
        <circle cx="96" cy="46" r="4" fill="${ink}" stroke="none"/><circle cx="144" cy="46" r="4" fill="${ink}" stroke="none"/>
        <path d="M108 54 Q120 63 132 54" fill="none" stroke-width="3"/>
        <rect x="10" y="92" width="220" height="58" rx="6" fill="#8d5a34"/>
        ${white}${black}`);
    },
    chest: () => svg('0 0 170 150', `
      <rect x="10" y="60" width="150" height="82" rx="6" fill="#b5835a"/>
      <path d="M10 64 Q10 14 85 14 Q160 14 160 64 Z" fill="#c99a6e"/>
      <rect x="10" y="56" width="150" height="12" fill="#8d5a34" stroke-width="3"/>
      <rect x="30" y="16" width="14" height="126" fill="#999" stroke-width="3"/><rect x="126" y="16" width="14" height="126" fill="#999" stroke-width="3"/>
      <path d="M74 72 Q74 56 85 56 Q96 56 96 72" fill="none" stroke-width="4"/>
      <rect x="70" y="70" width="30" height="28" rx="4" fill="#ffd23f"/>
      <circle cx="85" cy="82" r="3" fill="${ink}" stroke="none"/><rect x="83.5" y="82" width="3" height="9" fill="${ink}" stroke="none"/>`),
    poster: () => {
      const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const cols = ['#e53935', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa'];
      let t = '';
      for (let i = 0; i < 26; i++) {
        const r = i < 13 ? 0 : 1, c = i % 13;
        t += `<text x="${40 + c * 44}" y="${62 + r * 58}" font-size="44" text-anchor="middle" fill="${cols[i % 5]}" stroke="none" font-family="Patrick Hand, cursive" font-weight="bold">${L[i]}</text>`;
      }
      return svg('0 0 600 150', `
        <rect x="4" y="4" width="592" height="142" rx="10" fill="#fff"/>
        <circle cx="300" cy="4" r="6" fill="#e53935" stroke-width="3"/>${t}`);
    },
    blocks: () => svg('0 0 200 120', `
      <rect x="10" y="50" width="64" height="64" rx="6" fill="#ff8a80"/>
      <rect x="80" y="50" width="64" height="64" rx="6" fill="#80d8ff"/>
      <rect x="44" y="4" width="64" height="50" rx="6" fill="#ffe57f" transform="rotate(-8 76 30)"/>
      <g fill="${ink}" stroke="none" font-family="Patrick Hand, cursive" font-size="44" font-weight="bold" text-anchor="middle">
        <text x="42" y="98">A</text><text x="112" y="98">B</text><text x="76" y="44" transform="rotate(-8 76 30)">C</text>
      </g>`),
    clock: (hour) => {
      let n = '', t = '';
      for (let i = 1; i <= 12; i++) {
        const a = (i * Math.PI) / 6;
        n += `<text x="${140 + Math.sin(a) * 96}" y="${140 - Math.cos(a) * 96 + 12}" font-size="34" text-anchor="middle" fill="${ink}" stroke="none" font-family="Patrick Hand, cursive" font-weight="bold">${i}</text>`;
        t += `<line x1="${140 + Math.sin(a) * 122}" y1="${140 - Math.cos(a) * 122}" x2="${140 + Math.sin(a) * 114}" y2="${140 - Math.cos(a) * 114}" stroke-width="3"/>`;
      }
      return svg('0 0 280 280', `
        <circle cx="140" cy="140" r="132" fill="#ffd23f"/><circle cx="140" cy="140" r="122" fill="#fffdf7"/>${t}${n}
        <g class="p4-hand" style="transform-origin:140px 140px;transform:rotate(${hour * 30}deg);transition:transform .9s ease-in-out">
          <line x1="140" y1="140" x2="140" y2="92" stroke-width="10"/></g>
        <line x1="140" y1="140" x2="140" y2="68" stroke-width="6"/>
        <circle cx="140" cy="140" r="10" fill="#e53935"/>`);
    },
    // a doodle matchstick from (x1,y1) to (x2,y2), red head at the start
    stick: (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="12"/>
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#f1c27d" stroke-width="6"/>
      <circle cx="${x1}" cy="${y1}" r="6.5" fill="#e53935" stroke-width="3"/>`,
  };

  // seven-segment matchstick glyphs in a 70x120 box
  const SEG = { a: [12, 10, 58, 10], b: [60, 12, 60, 58], c: [60, 62, 60, 108], d: [12, 110, 58, 110],
    e: [10, 62, 10, 108], f: [10, 12, 10, 58], g: [12, 60, 58, 60] };
  const GLYPH = {
    5: ['a', 'f', 'g', 'c', 'd'].map((s) => SEG[s]),
    0: ['a', 'b', 'c', 'd', 'e', 'f'].map((s) => SEG[s]),
    '+': [[35, 32, 35, 88], [10, 60, 60, 60]],
    4: [[40, 108, 40, 12], [62, 76, 6, 76], [40, 12, 8, 76]],
    '=': [[10, 46, 60, 46], [10, 74, 60, 74]],
    '≠': [[10, 46, 60, 46], [10, 74, 60, 74], [50, 22, 20, 98]],
  };
  const glyph = (ch) => svg('0 0 70 120', GLYPH[ch].map((s) => P4.stick(...s)).join(''));

  LEVELS.push(
    // ---------- 24: riddle answered with an object ----------
    {
      id: 'pianokeys',
      q: ['What has keys but can\'t open a lock?'],
      hint: 'Not every key is made of metal. Some of them make music.',
      answer: 'The piano — it has lots of keys and no locks!',
      setup(a) {
        a.stage.style.background = '#f6ecd9';
        a.put(svg('0 0 960 60', '<rect x="-10" y="10" width="980" height="60" fill="#e0c9a6"/>'), 0, 390, 960, 60);
        const door = a.put(P4.door(), 60, 125, 140, 260);
        a.tap(door, () => { a.wrong(door); a.say('I HAVE a lock!', 130, 130); });
        const ring = a.put(P4.keyring(), 255, 225, 150, 150);
        a.tap(ring, () => { a.wrong(ring); a.say('We open locks!', 330, 230); });
        const piano = a.put(P4.piano(), 440, 160, 240, 220);
        a.tap(piano, () => { a.say('♪ Plink plonk! ♫', 560, 160); a.win('A piano: 88 keys, zero locks!'); });
        const chest = a.put(P4.chest(), 740, 232, 170, 150);
        a.tap(chest, () => { a.wrong(chest); a.say('Locked tight!', 825, 230); });
      },
    },

    // ---------- 25: read the question literally ----------
    {
      id: 'abc11',
      q: ['How many letters are in "the alphabet"?'],
      hint: 'Forget A to Z. Look at exactly what\'s inside the quotes.',
      answer: '11 — t-h-e a-l-p-h-a-b-e-t.',
      setup(a) {
        a.put(P4.poster(), 180, 14, 600, 150);
        a.put(P4.blocks(), 760, 300, 180, 108);
        const opts = [[26, '#9fe0f5'], [10, '#ffd23f'], [11, '#7bd389'], [13, '#f7a1a1']];
        opts.forEach(([n, bg], i) => {
          const b = a.put(card(n, bg, 64), 120 + i * 150, 210, 120, 110);
          a.tap(b, () => {
            if (n !== 11) {
              a.wrong(b);
              if (n === 26) a.say('That\'s A to Z…', a.box(b).cx, 210);
              return;
            }
            a.say('t-h-e a-l-p-h-a-b-e-t', 480, 200);
            a.win('"the alphabet" has 11 letters. Read carefully!');
          });
        });
      },
    },

    // ---------- 26: remove a letter to change the meaning ----------
    {
      id: 'seveneven',
      q: ['Make this number even.'],
      hint: 'No maths needed. Is there a letter too many?',
      answer: 'Drag the S away: SEVEN becomes EVEN.',
      setup(a) {
        const cols = ['#f7a1a1', '#9fe0f5', '#ffd23f', '#7bd389', '#d1b3ff'];
        const tiles = [...'SEVEN'].map((ch, i) => {
          const t = a.put(card(ch, cols[i], 120), 115 + i * 150, 120, 130, 160, { z: 2 });
          t.style.transition = 'left .4s, top .4s, transform .15s';
          return t;
        });
        const [s, ...rest] = tiles;
        tiles.forEach((t, i) => {
          const x0 = 115 + i * 150, y0 = 120;
          a.drag(t, {
            onTap: () => a.wrong(t),
            onDrop(el, back) {
              const B = a.box(el);
              const far = Math.hypot(B.x - x0, B.y - y0) > 110;
              if (!far) return back();
              if (el !== s) { a.wrong(el); return back(); }
              rest.forEach((r, j) => { r.style.left = 190 + j * 150 + 'px'; });
              el.style.transition = 'opacity .4s'; el.style.opacity = '0';
              a.say('EVEN!', 480, 110);
              a.win('Take the S off SEVEN and it\'s EVEN!');
            },
          });
        });
      },
    },

    // ---------- 27: maths with a twist ----------
    {
      id: 'clockmath',
      q: ['If 9 + 5 = 2, what is 10 + 4?'],
      hint: 'That sum is right on the wall. What goes round and round?',
      answer: '2 — on a clock, 10 o\'clock plus 4 hours is 2 o\'clock.',
      setup(a) {
        a.stage.style.background = '#eef6fb';
        const clock = a.put(P4.clock(9), 90, 60, 300, 300);
        a.tap(clock, () => a.say('Tick tock…', 240, 70));
        const opts = [[14, '#9fe0f5'], [3, '#ffd23f'], [2, '#7bd389'], [12, '#f7a1a1']];
        opts.forEach(([n, bg], i) => {
          const b = a.put(card(n, bg, 64), 500 + (i % 2) * 190, 80 + Math.floor(i / 2) * 160, 140, 120);
          a.tap(b, () => {
            if (n !== 2) return a.wrong(b);
            clock.querySelector('.p4-hand').style.transform = 'rotate(420deg)';
            a.say('10 + 4 hours = 2 o\'clock', 240, 60);
            a.win('Clock maths: 10 o\'clock + 4 hours = 2!');
          });
        });
      },
    },

    // ---------- 28: add one matchstick ----------
    {
      id: 'sticks550',
      q: ['Add ONE stick to make it true.'],
      hint: 'A plus sign plus one more stick can become a number.',
      answer: 'Put the stick on the first + to make 545 + 5 = 550.',
      setup(a) {
        a.stage.style.background = '#e9f4e4';
        const chars = ['5', '+', '5', '+', '5', '=', '5', '5', '0'];
        const cells = chars.map((ch, i) => a.put(glyph(ch), 93 + i * 88, 80, 70, 120));
        a.put(svg('0 0 200 90', `<rect x="6" y="20" width="188" height="64" rx="8" fill="#e53935"/>
          <rect x="22" y="34" width="156" height="36" rx="5" fill="#fff3c4" stroke-width="3"/>
          <text x="100" y="62" font-size="26" text-anchor="middle" fill="${ink}" stroke="none" font-family="Patrick Hand, cursive" font-weight="bold">MATCHES</text>`),
        380, 300, 200, 90);
        const stick = a.put(svg('0 0 110 30', P4.stick(12, 15, 98, 15)), 425, 270, 110, 30, { z: 5 });
        const hit = (el) => {
          const S = a.box(el);
          return cells.findIndex((c) => {
            const B = a.box(c);
            return S.cx > B.x - 14 && S.cx < B.x + B.w + 14 && S.cy > B.y - 10 && S.cy < B.y + B.h + 10;
          });
        };
        a.drag(stick, {
          onTap: () => a.say('Drag me!', 480, 270),
          onDrop(el, back) {
            const i = hit(el);
            if (i < 0) return back();
            const ch = chars[i];
            if (ch === '+' || ch === '=') {
              el.style.display = 'none';
              cells[i].innerHTML = glyph(ch === '+' ? '4' : '≠');
              if (ch === '=') return a.win('5 + 5 + 5 ≠ 550 — sneaky, and true!');
              return a.win(i === 1 ? '545 + 5 = 550. Plus became 4!' : '5 + 545 = 550. Plus became 4!');
            }
            a.wrong(cells[i]);
            back();
          },
        });
      },
    },

    // ---------- 29: sequence ----------
    {
      id: 'ottffss',
      q: ['What letter comes next?'],
      hint: 'Count out loud from one. Listen to the first sounds.',
      answer: 'E for Eight: One Two Three Four Five Six Seven Eight.',
      setup(a) {
        const seq = [...'OTTFFSS'];
        seq.forEach((ch, i) => a.put(card(ch, '#fff', 64), 85 + i * 100, 50, 90, 100));
        const slot = a.put(`<div class="num" style="width:100%;height:100%;box-sizing:border-box;border:4px dashed ${ink};border-radius:18px;font-size:64px;color:#999">?</div>`,
          85 + 7 * 100, 50, 90, 100);
        const opts = [['N', '#f7a1a1'], ['S', '#9fe0f5'], ['E', '#ffd23f'], ['T', '#7bd389'], ['O', '#d1b3ff']];
        opts.forEach(([ch, bg], i) => {
          const t = a.put(card(ch, bg, 64), 190 + i * 130, 260, 100, 110, { z: 3 });
          a.drag(t, {
            onTap: () => a.say('Drag me to the ?', a.box(t).cx, 260),
            onDrop(el, back) {
              if (!a.over(el, slot)) return back();
              if (ch !== 'E') { a.wrong(slot); return back(); }
              Object.assign(el.style, { left: a.box(slot).x - 5 + 'px', top: '45px' });
              ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'].forEach((w, j) =>
                a.put(`<div class="num" style="width:100%;height:100%;font-size:24px">${w}</div>`, 85 + j * 100, 160, 90, 34));
              a.win('One, Two, Three… Eight! E is next.');
            },
          });
        });
      },
    },
  );
}
