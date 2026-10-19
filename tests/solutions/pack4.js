// Winning move sequences for src/levels/pack4.js, keyed by level id.
module.exports = {
  // objs: floor, door, keyring, piano, chest
  pianokeys: async (h) => { await h.tap(2); await h.tap(3); },
  // objs: poster, blocks, 26, 10, 11, 13
  abc11: async (h) => { await h.tap(2); await h.tap(4); },
  // objs: S E V E N — dragging N away is wrong, dragging S away wins
  seveneven: async (h) => { await h.drag(4, 800, 380); await h.wait(200); await h.drag(0, 180, 380); },
  // objs: clock, 14, 3, 2, 12
  clockmath: async (h) => { await h.tap(1); await h.tap(3); },
  // objs: 9 glyph cells (0-8), matchbox (9), stick (10); cell i centre x = 128 + 88i, y = 140
  sticks550: async (h) => { await h.drag(10, 128, 140); await h.wait(200); await h.drag(10, 216, 140); },
  // objs: 7 letters (0-6), slot (7), N S E T O (8-12); slot centre = (830, 100)
  ottffss: async (h) => { await h.drag(8, 830, 100); await h.wait(200); await h.drag(10, 830, 100); },
};
