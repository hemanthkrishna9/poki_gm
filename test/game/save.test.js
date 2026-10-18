import test from 'node:test';
import assert from 'node:assert/strict';
import { createSave, SAVE_KEY, SETTINGS_KEY, defaultSettings, migrate } from '../../src/game/save.js';
import { defaultProgress, applyResult } from '../../src/game/progression.js';

function memStorage(init = {}) {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
    _m: m,
  };
}
const throwing = {
  getItem() { throw new Error('SecurityError'); },
  setItem() { throw new Error('QuotaExceeded'); },
  removeItem() { throw new Error('nope'); },
};

test('round-trips progress and settings under the v1 keys', () => {
  const st = memStorage();
  const s = createSave(st);
  assert.deepEqual(s.load(), defaultProgress());
  const p = applyResult(defaultProgress(), { club: 1, idx: 0, stars: 3 });
  assert.equal(s.save(p), true);
  assert.ok(st._m.has(SAVE_KEY));
  assert.deepEqual(createSave(st).load(), p);
  const set = { ...defaultSettings(), sound: false };
  assert.equal(s.saveSettings(set), true);
  assert.ok(st._m.has(SETTINGS_KEY));
  assert.equal(createSave(st).loadSettings().sound, false);
  assert.equal(s.isPersistent(), true);
});

test('throwing storage: never throws, falls back to memory', () => {
  const s = createSave(throwing);
  assert.deepEqual(s.load(), defaultProgress());
  const p = applyResult(defaultProgress(), { club: 1, idx: 2, stars: 2 });
  assert.equal(s.save(p), false);
  assert.deepEqual(s.load(), p, 'memory copy survives');
  assert.equal(s.saveSettings({ ...defaultSettings(), colorBlind: true }), false);
  assert.equal(s.loadSettings().colorBlind, true);
  assert.equal(s.reset(), true);
  assert.deepEqual(s.load(), defaultProgress());
  assert.equal(s.isPersistent(), false);
});

test('null storage and a throwing localStorage getter', () => {
  const s = createSave(null);
  s.save({ ...defaultProgress(), seenTutorial: true });
  assert.equal(s.load().seenTutorial, true);
  const desc = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('blocked'); } });
  try {
    const d = createSave();
    assert.deepEqual(d.load(), defaultProgress());
    assert.equal(d.save(defaultProgress()), false);
  } finally {
    if (desc) Object.defineProperty(globalThis, 'localStorage', desc);
    else delete globalThis.localStorage;
  }
});

test('corrupt JSON -> defaults', () => {
  const st = memStorage({ [SAVE_KEY]: '{not json', [SETTINGS_KEY]: '[]' });
  const s = createSave(st);
  assert.deepEqual(s.load(), defaultProgress());
  assert.deepEqual(s.loadSettings(), defaultSettings());
});

test('setItem throws (quota) but getItem works: memory wins', () => {
  const st = memStorage();
  st.setItem = () => { throw new Error('quota'); };
  const s = createSave(st);
  s.save({ ...defaultProgress(), seenTutorial: true });
  assert.equal(s.load().seenTutorial, true);
});

test('unknown future version is read-only and never overwritten', () => {
  const future = JSON.stringify({ v: 2, something: 'new' });
  const st = memStorage({ [SAVE_KEY]: future });
  const s = createSave(st);
  const data = s.load();
  assert.equal(data.v, 2);
  assert.equal(s.isReadOnly(), true);
  assert.equal(s.save(defaultProgress()), false);
  assert.equal(s.reset(), false);
  assert.equal(st._m.get(SAVE_KEY), future);
  assert.equal(migrate({ v: 9 }, 'settings').readOnly, true);
});

test('partial v1 save is normalized', () => {
  const st = memStorage({ [SAVE_KEY]: JSON.stringify({ v: 1, clubs: { 1: { levels: { 0: 2 } } } }) });
  const p = createSave(st).load();
  assert.equal(p.clubs[1].levels[0], 2);
  assert.equal(p.daily.streak, 0);
});
