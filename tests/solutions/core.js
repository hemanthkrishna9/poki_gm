// Winning move sequences for src/levels/core.js + finale.js, keyed by level id.
// h.tap(i) taps the i-th .obj on the stage (creation order); h.drag(i, x, y) drags it to stage coords;
// h.tapAt(x, y) taps stage coords; h.word(id) taps a word in the question.
module.exports = {
  largest: async (h) => { await h.tap(0); await h.tap(2); },
  mouse: async (h) => { await h.drag(2, 150, 120); await h.tap(1); },
  jar: async (h) => { for (let i = 0; i < 4; i++) await h.tap(1); await h.wait(500); await h.tap(0); },
  snowman: async (h) => { await h.drag(0, 760, 420); },
  fastest: async (h) => { await h.tap(0); await h.tap(2); },
  elephant: async (h) => { await h.drag(2, 700, 220); await h.wait(300); await h.tap(1); await h.drag(2, 700, 220); },
  heavier: async (h) => { await h.tap(1); await h.tapAt(480, 330); },
  baby: async (h) => { await h.drag(2, 700, 200); await h.wait(300); await h.drag(2, 375, 310); await h.drag(2, 700, 200); },
  light: async (h) => { await h.tap(2); await h.word('light'); },
  balloons: async (h) => { for (let i = 0; i < 4; i++) await h.tap(0); await h.word('o'); },
  six: async (h) => { await h.drag(0, 660, 210, 30); },
  finish: async (h) => { for (let i = 0; i < 6; i++) { await h.tap(0); await h.wait(250); } },
};
