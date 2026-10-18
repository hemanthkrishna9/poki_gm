import test from 'node:test';
import assert from 'node:assert/strict';
import { CLUBS, clubById } from '../../src/data/clubs.js';
import { QUOTES, SPECIAL, SPECIAL_INTROS, nearMissLine, quoteFor } from '../../src/data/content.js';
import { QUOTE_COUNT } from '../../src/engine/traits.js';

const words = (s) => s.trim().split(/\s+/).length;

test('6 clubs with full data', () => {
  assert.equal(CLUBS.length, 6);
  CLUBS.forEach((c, i) => {
    assert.equal(c.id, i + 1);
    assert.ok(c.name && c.manager.name && c.manager.emoji);
    for (const k of ['bg', 'accent', 'door', 'text']) assert.match(c.colors[k], /^#[0-9A-Fa-f]{3,6}$/);
    assert.ok(c.decor.length >= 3);
    for (const k of ['intro', 'praise', 'scold', 'fired', 'win']) {
      assert.equal(typeof c.quips[k], 'string');
      assert.ok(words(c.quips[k]) < 10, `${c.key}.${k} too long`);
    }
    assert.ok(c.fairGuess);
  });
  assert.equal(CLUBS[0].fairGuess, "Fair guess! Here's the rule-book page.");
  assert.equal(clubById(1).manager.name, 'Gus');
  assert.equal(clubById('2').name, 'Disco Snail');
});

test('60 quotes, each ≤ 8 words, unique', () => {
  assert.equal(QUOTES.length, QUOTE_COUNT);
  assert.equal(new Set(QUOTES).size, QUOTES.length);
  for (const q of QUOTES) assert.ok(words(q) <= 8, q);
  assert.equal(quoteFor({ quote: 3 }), 'Is this the line for fun?');
  assert.equal(quoteFor({ quote: 3, special: 'boss' }), SPECIAL.boss.quote);
});

test('special nights and near-miss lines', () => {
  assert.equal(SPECIAL_INTROS.boss, 'Rule one: never turn away the boss.');
  assert.equal(SPECIAL.boss.label, true);
  assert.equal(SPECIAL.trenchcoat.label, false);
  assert.equal(nearMissLine(1), '1 more and you had it!');
  assert.match(nearMissLine(2), /2/);
  assert.match(nearMissLine(5), /5/);
  assert.equal(nearMissLine(0), '1 more and you had it!');
});
