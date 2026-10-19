'use strict';

// Ad / analytics adapter. Each build sets window.PLATFORM in index.html (see build.sh):
//   'poki'       — Poki SDK v2
//   'crazygames' — CrazyGames SDK v3
//   'none'       — no SDK, no ads (itch.io, your own site, …)
// Every call is wrapped so a missing or ad-blocked SDK never breaks the game.

const Platform = (() => {
  const safe = (f) => { try { return f(); } catch (e) { return undefined; } };

  const adapters = {
    none: {
      hasRewarded: false,
      async init() {},
      loaded() {},
      start() {},
      stop() {},
      async commercial() {},
      async rewarded() { return false; },
    },

    poki: {
      hasRewarded: true,
      sdk: () => window.PokiSDK,
      async init() {
        const s = this.sdk();
        if (!s) return;
        try { await s.init(); } catch (e) { /* adblock — game must still work */ }
        if (location.hostname === 'localhost' || location.protocol === 'file:') safe(() => s.setDebug(true));
      },
      loaded() { safe(() => this.sdk()?.gameLoadingFinished()); },
      start() { safe(() => this.sdk()?.gameplayStart()); },
      stop() { safe(() => this.sdk()?.gameplayStop()); },
      async commercial() {
        const s = this.sdk();
        if (s) try { await s.commercialBreak(); } catch (e) {}
      },
      async rewarded() {
        const s = this.sdk();
        if (!s) return false;
        try { return !!(await s.rewardedBreak()); } catch (e) { return false; }
      },
    },

    crazygames: {
      hasRewarded: true,
      sdk: () => window.CrazyGames?.SDK,
      async init() {
        const s = this.sdk();
        if (!s) return;
        try { await s.init(); safe(() => s.game.loadingStart()); } catch (e) {}
      },
      loaded() { safe(() => this.sdk()?.game.loadingStop()); },
      start() { safe(() => this.sdk()?.game.gameplayStart()); },
      stop() { safe(() => this.sdk()?.game.gameplayStop()); },
      ad(type) {
        return new Promise((done) => {
          const s = this.sdk();
          if (!s) return done(false);
          try {
            s.ad.requestAd(type, { adStarted() {}, adFinished: () => done(true), adError: () => done(false) });
          } catch (e) { done(false); }
        });
      },
      async commercial() { await this.ad('midgame'); },
      async rewarded() { return this.ad('rewarded'); },
    },
  };

  const impl = adapters[window.PLATFORM] || adapters.none;
  let playing = false;

  // Shared bookkeeping on top of the adapter: never send duplicate start/stop,
  // and tell the game to mute while an ad is showing.
  return {
    name: window.PLATFORM in adapters ? window.PLATFORM : 'none',
    hasRewarded: impl.hasRewarded,
    onAdMute: () => {},
    init: () => impl.init(),
    loaded: () => impl.loaded(),
    start() { if (!playing) { playing = true; impl.start(); } },
    stop() { if (playing) { playing = false; impl.stop(); } },
    async commercial() {
      this.stop();
      this.onAdMute(true);
      try { await impl.commercial(); } finally { this.onAdMute(false); }
    },
    async rewarded() {
      this.stop();
      this.onAdMute(true);
      try { return await impl.rewarded(); } finally { this.onAdMute(false); }
    },
  };
})();
