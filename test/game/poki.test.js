import test from 'node:test';
import assert from 'node:assert/strict';
import * as defaultPoki from '../../src/poki.js';
import { createPoki } from '../../src/poki.js';

function fakeSdk(opts = {}) {
  const calls = [];
  const sdk = {
    calls,
    init: () => { calls.push('init'); return opts.initReject ? Promise.reject(new Error('adblock')) : opts.initHang ? new Promise(() => {}) : Promise.resolve(); },
    setDebug: (v) => calls.push(`setDebug:${v}`),
    gameLoadingFinished: () => calls.push('loaded'),
    gameplayStart: () => calls.push('start'),
    gameplayStop: () => calls.push('stop'),
    commercialBreak: () => { calls.push('cb'); return opts.cbReject ? Promise.reject(new Error('x')) : Promise.resolve(); },
    rewardedBreak: () => { calls.push('rb'); return opts.rbReject ? Promise.reject(new Error('x')) : Promise.resolve(opts.reward ?? true); },
  };
  return sdk;
}
const win = (sdk, search = '') => ({ PokiSDK: sdk, location: { search } });

test('default instance imports in Node without window and is a safe no-op', async () => {
  assert.equal(typeof globalThis.window, 'undefined');
  assert.equal(await defaultPoki.init(), false);
  assert.equal(defaultPoki.isAvailable(), false);
  defaultPoki.gameLoadingFinished();
  defaultPoki.gameplayStart();
  defaultPoki.gameplayStop();
  await defaultPoki.commercialBreak();
  assert.equal(await defaultPoki.rewardedBreak(), false);
});

test('missing SDK -> fallback', async () => {
  const p = createPoki({ win: { location: { search: '' } } });
  assert.equal(await p.init(), false);
  assert.equal(await p.rewardedBreak(), false);
});

test('init rejects (adblock) -> fallback, no throw', async () => {
  const sdk = fakeSdk({ initReject: true });
  const p = createPoki({ win: win(sdk) });
  assert.equal(await p.init(), false);
  assert.equal(p.isAvailable(), false);
  p.gameplayStart();
  assert.deepEqual(sdk.calls, ['init']);
});

test('init hangs -> times out to fallback', async () => {
  const p = createPoki({ win: win(fakeSdk({ initHang: true })), timeoutMs: 20 });
  assert.equal(await p.init(), false);
});

test('?nopoki forces fallback even with SDK present', async () => {
  const sdk = fakeSdk();
  const p = createPoki({ win: win(sdk, '?nopoki') });
  assert.equal(await p.init(), false);
  assert.deepEqual(sdk.calls, []);
});

test('?pokidebug calls setDebug(true)', async () => {
  const sdk = fakeSdk();
  const p = createPoki({ win: win(sdk, '?pokidebug&x=1') });
  assert.equal(await p.init(), true);
  assert.ok(sdk.calls.includes('setDebug:true'));
});

test('gameplayStart/Stop idempotent; loading finished once; pre-init calls forwarded', async () => {
  const sdk = fakeSdk();
  const p = createPoki({ win: win(sdk) });
  p.gameLoadingFinished();
  const ready = p.init();
  assert.equal(ready, p.init(), 'init memoized');
  await ready;
  assert.ok(sdk.calls.includes('loaded'));
  sdk.calls.length = 0;
  p.gameLoadingFinished();
  p.gameplayStart(); p.gameplayStart();
  p.gameplayStop(); p.gameplayStop();
  assert.deepEqual(sdk.calls, ['start', 'stop']);
});

test('commercialBreak: stops gameplay, runs hooks, resolves even on failure', async () => {
  const sdk = fakeSdk({ cbReject: true });
  const log = [];
  const p = createPoki({ win: win(sdk) });
  await p.init({ onBreakStart: () => log.push('mute'), onBreakEnd: () => log.push('unmute') });
  p.gameplayStart();
  await p.commercialBreak();
  assert.deepEqual(sdk.calls.slice(1), ['start', 'stop', 'cb']);
  assert.deepEqual(log, ['mute', 'unmute']);
  assert.equal(p.isPlaying(), false);
  assert.equal(p.isInBreak(), false);
});

test('rewardedBreak returns the SDK boolean; false on failure; hooks always end', async () => {
  const log = [];
  const hooks = { onBreakStart: () => log.push('s'), onBreakEnd: () => log.push('e') };
  const ok = createPoki({ win: win(fakeSdk({ reward: true })) });
  await ok.init(hooks);
  assert.equal(await ok.rewardedBreak(), true);
  const no = createPoki({ win: win(fakeSdk({ reward: false })) });
  await no.init(hooks);
  assert.equal(await no.rewardedBreak(), false);
  const bad = createPoki({ win: win(fakeSdk({ rbReject: true })) });
  await bad.init(hooks);
  assert.equal(await bad.rewardedBreak(), false);
  assert.deepEqual(log, ['s', 'e', 's', 'e', 's', 'e']);
});

test('throwing hook does not break the ad flow', async () => {
  const p = createPoki({ win: win(fakeSdk()) });
  await p.init({ onBreakStart: () => { throw new Error('audio'); } });
  assert.equal(await p.rewardedBreak(), true);
});
