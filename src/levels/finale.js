'use strict';

// The "you finished" level — always loaded last.
LEVELS.push({
  id: 'finish',
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
});
