// Winning move sequences for src/levels/pack2.js (home & everyday life), keyed by level id.
// Object indices follow creation order in each level's setup().
module.exports = {
  // 0 cord, 1 toaster, 2 socket, 3 plug, 4 jam
  toaster: async (h) => {
    await h.tap(4); await h.tap(1); await h.wait(600);
    await h.drag(3, 810, 170);
    await h.tap(1);
  },
  // 0 crumbs, 1 table, 2 boy, 3 dog, 4 reader
  cakethief: async (h) => { await h.tap(2); await h.tap(3); await h.tap(4); },
  // 0 fries, 1 ketchup, 2 mustard
  ketchup: async (h) => {
    await h.drag(2, 380, 300);
    await h.tap(1);
    await h.drag(1, 380, 300);
    await h.wait(300);
    for (let i = 0; i < 3; i++) await h.tap(1);
  },
  // 0 side table, 1 alarm clock, 2 grandpa on sofa, 3 tv
  tvnap: async (h) => { await h.tap(1); await h.tap(2); }, // 0 side table, 1 grandpa (wrong), 2 TV
  // dolls 0 (230, red), 1 (130, blue), 2 (175, green), 3 (95, yellow); 4 toy box
  nesting: async (h) => {
    await h.drag(0, 805, 320);                 // box only fits one while others are out
    await h.drag(2, 279, 339);                 // bigger onto smaller → "Too big!"
    await h.drag(3, 279, 339);                 // yellow into blue
    await h.drag(1, 426, 317);                 // blue into green
    await h.drag(2, 116, 289);                 // green into red
    await h.drag(0, 805, 320);                 // red into the box
  },
  // 0 window, 1 table, 2 plant, 3 watering can
  thirsty: async (h) => { await h.tap(3); await h.drag(3, 180, 210); await h.drag(2, 760, 160); },
};
