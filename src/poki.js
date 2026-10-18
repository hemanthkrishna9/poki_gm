// Poki SDK wrapper with a no-op fallback (docs/design/04-tech.md §4).
// Safe to import in Node: `window` is only read inside functions.
//
// - init() never throws. If window.PokiSDK is missing, init() rejects, or it
//   times out, or the URL has ?nopoki, every call becomes a no-op:
//   commercialBreak() resolves, rewardedBreak() resolves false.
// - ?pokidebug calls PokiSDK.setDebug(true).
// - gameplayStart/Stop are idempotent; breaks always call gameplayStop first.
// - onBreakStart/onBreakEnd hooks (mute audio, block input) run around every
//   real break and onBreakEnd always runs, whatever the result.

const INIT_TIMEOUT_MS = 6000;

/**
 * @param {{win?:any, timeoutMs?:number}} [env]  inject a fake window in tests
 */
export function createPoki(env = {}) {
  const getWin = () => env.win ?? (typeof window !== 'undefined' ? window : undefined);
  const timeoutMs = env.timeoutMs ?? INIT_TIMEOUT_MS;
  let sdk = null;
  let available = false;
  let initPromise = null;
  let playing = false;
  let inBreak = false;
  let loadingFinished = false;
  const hooks = { onBreakStart: null, onBreakEnd: null };

  function params() {
    try {
      return new URLSearchParams(getWin()?.location?.search || '');
    } catch {
      return new URLSearchParams('');
    }
  }

  function safe(fn) {
    try {
      return fn();
    } catch {
      return undefined;
    }
  }

  function setHooks(h = {}) {
    if ('onBreakStart' in h) hooks.onBreakStart = h.onBreakStart;
    if ('onBreakEnd' in h) hooks.onBreakEnd = h.onBreakEnd;
  }

  /** @param {{onBreakStart?:Function, onBreakEnd?:Function}} [opts] */
  function init(opts = {}) {
    setHooks(opts);
    if (initPromise) return initPromise;
    initPromise = (async () => {
      const w = getWin();
      const q = params();
      const candidate = w?.PokiSDK;
      if (q.has('nopoki') || !candidate || typeof candidate.init !== 'function') {
        available = false;
        return false;
      }
      try {
        let timer;
        const timeout = new Promise((_, rej) => {
          timer = setTimeout(() => rej(new Error('poki init timeout')), timeoutMs);
        });
        try {
          await Promise.race([Promise.resolve(candidate.init()), timeout]);
        } finally {
          clearTimeout(timer);
        }
        sdk = candidate;
        available = true;
        if (q.has('pokidebug')) safe(() => sdk.setDebug?.(true));
        // forward calls made while init was still pending
        if (loadingFinished) safe(() => sdk.gameLoadingFinished?.());
        if (playing) safe(() => sdk.gameplayStart?.());
      } catch {
        sdk = null;
        available = false;
      }
      return available;
    })();
    return initPromise;
  }

  function isAvailable() {
    return available;
  }

  function gameLoadingFinished() {
    if (loadingFinished) return;
    loadingFinished = true;
    if (available) safe(() => sdk.gameLoadingFinished?.());
  }

  function gameplayStart() {
    if (playing || inBreak) return;
    playing = true;
    if (available) safe(() => sdk.gameplayStart?.());
  }

  function gameplayStop() {
    if (!playing) return;
    playing = false;
    if (available) safe(() => sdk.gameplayStop?.());
  }

  function isPlaying() {
    return playing;
  }

  async function runBreak(call) {
    gameplayStop();
    inBreak = true;
    safe(() => hooks.onBreakStart?.());
    try {
      return await call();
    } finally {
      inBreak = false;
      safe(() => hooks.onBreakEnd?.());
    }
  }

  /** @returns {Promise<void>} always resolves */
  async function commercialBreak() {
    if (!available || inBreak) {
      gameplayStop();
      return;
    }
    try {
      await runBreak(() => sdk.commercialBreak());
    } catch {
      /* ad failed: carry on */
    }
  }

  /** @returns {Promise<boolean>} true only if the reward should be granted */
  async function rewardedBreak() {
    if (!available || inBreak) return false;
    try {
      const r = await runBreak(() => sdk.rewardedBreak());
      return r === true;
    } catch {
      return false;
    }
  }

  return {
    init,
    setHooks,
    isAvailable,
    gameLoadingFinished,
    gameplayStart,
    gameplayStop,
    isPlaying,
    commercialBreak,
    rewardedBreak,
    isInBreak: () => inBreak,
  };
}

const poki = createPoki();

export const init = poki.init;
export const setHooks = poki.setHooks;
export const isAvailable = poki.isAvailable;
export const gameLoadingFinished = poki.gameLoadingFinished;
export const gameplayStart = poki.gameplayStart;
export const gameplayStop = poki.gameplayStop;
export const isPlaying = poki.isPlaying;
export const commercialBreak = poki.commercialBreak;
export const rewardedBreak = poki.rewardedBreak;
export const isInBreak = poki.isInBreak;
export default poki;
