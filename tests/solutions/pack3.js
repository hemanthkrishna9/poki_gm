// Winning move sequences for src/levels/pack3.js (outdoors pack), keyed by level id. Stage coords.
module.exports = {
  nearstar: async (h) => { await h.tapAt(295, 370); await h.tapAt(820, 180); },
  rainbow: async (h) => { await h.tapAt(700, 370); await h.dragFrom(180, 100, 620, 130); },
  liftoff: async (h) => {
    await h.tapAt(685, 358); // LAUNCH too early
    await h.tapAt(555, 260); // counting up: 1 first
    for (const x of [815, 685, 555]) await h.tapAt(x, 260); // 3, 2, 1
  },
  kite: async (h) => { await h.tapAt(255, 340); await h.dragFrom(145, 285, 860, 285, 40); },
  iceberg: async (h) => { await h.tapAt(160, 120); await h.tapAt(710, 300); },
  bear: async (h) => {
    await h.tapAt(680, 320); // poke the bear
    await h.tapAt(375, 350); // alarm clock
    await h.wait(600);
    for (let i = 0; i < 3; i++) { await h.tapAt(160, 215); await h.wait(250); }
  },
};
