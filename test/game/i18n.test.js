import test from 'node:test';
import assert from 'node:assert/strict';
import { t, addStrings, has } from '../../src/i18n.js';
import STRINGS from '../../src/data/strings.en.js';

test('substitutes {params}', () => {
  assert.equal(t('share.header', { n: 214 }), 'Door Policy #214');
  assert.equal(t('hud.streak', { n: 2, max: 5 }), 'Streak 2/5');
});

test('missing key returns the key; missing params stay as placeholders', () => {
  assert.equal(t('nope.not.here'), 'nope.not.here');
  assert.equal(t('hud.streak', { n: 1 }), 'Streak 1/{max}');
  assert.equal(t('share.header'), 'Door Policy #{n}');
});

test('plural forms chosen by n', () => {
  assert.equal(t('fired.nearMiss', { n: 1 }), '1 more and you had it!');
  assert.equal(t('fired.nearMiss', { n: 3 }), '3 more and you had it!');
  assert.equal(t('hud.guestsLeft', { n: 1 }), '1 guest left');
  assert.equal(t('hud.guestsLeft', { n: 4 }), '4 guests left');
});

test('addStrings merges (e.g. rule.* templates)', () => {
  addStrings({ 'rule.test.x': 'Wears {v}' });
  assert.equal(t('rule.test.x', { v: 'a hat' }), 'Wears a hat');
  assert.ok(has('btn.admit'));
});

test('strings table: required keys, all strings, rewarded buttons carry 🎬', () => {
  for (const k of ['btn.admit', 'btn.reject', 'btn.gotIt', 'btn.continue', 'btn.next', 'btn.retry', 'share.header',
    'daily.title', 'settings.title', 'result.cleared', 'result.fired', 'result.out', 'hint.free', 'feedback.lenient',
    'special.boss.intro']) {
    assert.equal(typeof STRINGS[k], 'string', k);
  }
  for (const [k, v] of Object.entries(STRINGS)) {
    assert.equal(typeof v, 'string', k);
    if (k.startsWith('ad.') && /watch/i.test(v)) assert.ok(v.includes('🎬'), k);
    assert.doesNotMatch(v, /https?:\/\//, k);
  }
  assert.equal(STRINGS['special.boss.intro'], 'Rule one: never turn away the boss.');
});
