'use strict';

// ---------- levels ----------
// Each level: id (stable, used for save data), q (question segments; {w:'id'} makes a tappable word),
// hint, answer (shown on skip), setup(api). Packs in src/levels/ append to LEVELS; finale.js goes last.
const LEVELS = [
  {
    id: 'largest',
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
    id: 'mouse',
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
    id: 'jar',
    q: ['Get the key out of the jar!'],
    hint: 'The lid is stuck. Glass isn\'t as tough as it looks…',
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
    id: 'snowman',
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
    id: 'fastest',
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
    id: 'catdown',
    q: ['Get the cat down from the tree!'],
    hint: 'The ladder won\'t reach. What makes a cat come running?',
    answer: 'Put the tuna can by the tree and the cat climbs down by itself.',
    setup(a) {
      a.stage.style.background = 'linear-gradient(#cdeffd 0 360px, #8fd18b 360px)';
      const tree = a.put(ART.tree(), 520, 0, 360, 440, { z: 1 });
      a.tap(tree, () => a.say('Rustle rustle…', 680, 200));
      const cat = a.put(ART.cat(false), 760, 72, 110, 90, { z: 2 });
      a.tap(cat, () => { a.wrong(cat); a.say('MEOW! (too high!)', 815, 70); });
      const ladder = a.put(ART.ladder(), 120, 220, 90, 190, { z: 4 });
      const can = a.put(ART.tuna(), 300, 350, 100, 70, { z: 5 });
      const nearTree = (el) => { const b = a.box(el); return b.cx > 560 && b.cx < 900 && b.cy > 220; };
      a.drag(ladder, {
        onTap: () => a.say('Drag me!', 165, 220),
        onDrop(el, back) {
          if (nearTree(el)) { a.wrong(el); a.say('Too short!', a.box(el).cx, a.box(el).y); }
          back();
        },
      });
      a.drag(can, {
        onTap: () => a.say('Smells fishy…', 350, 350),
        onDrop(el) {
          if (!nearTree(el)) return;
          const b = a.box(el);
          cat.innerHTML = ART.cat(true);
          cat.style.transition = 'left .7s ease-in, top .7s ease-in';
          Object.assign(cat.style, { left: Math.min(830, b.cx + 10) + 'px', top: b.y - 70 + 'px', zIndex: 6 });
          a.win('Cats always come down for dinner!');
        },
      });
    },
  },
  {
    id: 'heavier',
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
    id: 'baby',
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
    id: 'light',
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
    id: 'balloons',
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
    id: 'six',
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
        try { six.setPointerCapture(e.pointerId); } catch (err) {}
        const x0 = toStage(e).x, a0 = angle;
        let moved = false;
        const move = (ev) => {
          const dx = toStage(ev).x - x0;
          if (Math.abs(dx) > 6) moved = true;
          angle = a0 + dx;
          six.style.transform = `rotate(${angle}deg)`;
        };
        const up = (ev) => {
          six.removeEventListener('pointermove', move);
          six.removeEventListener('pointerup', up);
          six.removeEventListener('pointercancel', up);
          if (a.done || ev.type === 'pointercancel') return;
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
        six.addEventListener('pointercancel', up);
      });
    },
  },
];
