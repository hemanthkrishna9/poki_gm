'use strict';

// Play order, easy → hard, by level id. Loaded after every pack.
// Similar tricks are kept apart (light / balloons, snowman / rainbow, tvnap / bear).
// A level missing from this list still plays (just before the finale) — but add it here.
const LEVEL_ORDER = [
  'largest', 'mouse', 'cakethief', 'jar', 'fastest', 'nearstar', 'snowman', 'heavier', 'light', 'catdown',
  'pianokeys', 'baby', 'six', 'iceberg', 'toaster', 'balloons', 'tvnap', 'thirsty', 'liftoff', 'rainbow',
  'nesting', 'abc11', 'bear', 'ketchup', 'seveneven', 'clockmath', 'kite', 'sticks550', 'ottffss', 'finish',
];

{
  const rank = (l) => {
    if (l.id === 'finish') return Infinity;
    const i = LEVEL_ORDER.indexOf(l.id);
    return i < 0 ? LEVEL_ORDER.length : i;
  };
  LEVELS.sort((a, b) => rank(a) - rank(b));
}
