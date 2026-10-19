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
        if (!s) return false;
        let ok = true;
        try { await s.init(); } catch (e) { ok = false; /* adblock — game must still work */ }
        if (location.hostname === 'localhost' || location.protocol === 'file:') safe(() => s.setDebug(true));
        return ok;
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
        if (!s) return false;
        try { await s.init(); } catch (e) { return false; }
        safe(() => s.game.loadingStart());
        return true;
      },
      loaded() { safe(() => this.sdk()?.game.loadingStop()); },
      start() { safe(() => this.sdk()?.game.gameplayStart()); },
      stop() { safe(() => this.sdk()?.game.gameplayStop()); },
      ad(type) {
        return new Promise((done) => {
          const s = this.sdk();
          if (!s) return done(false);
          // safety net: never leave the game stuck if the SDK never calls back
          const timer = setTimeout(() => done(false), 30000);
          const end = (ok) => { clearTimeout(timer); done(ok); };
          try {
            // the timeout only covers an ad that never starts; once it plays, wait for its real end
            s.ad.requestAd(type, { adStarted: () => clearTimeout(timer), adFinished: () => end(true), adError: () => end(false) });
          } catch (e) { end(false); }
        });
      },
      async commercial() { await this.ad('midgame'); },
      async rewarded() { return this.ad('rewarded'); },
    },
  };

  const impl = adapters[window.PLATFORM] || adapters.none;
  let playing = false;
  let adShowing = false;

  // Shared bookkeeping on top of the adapter:
  //  - never send duplicate start/stop
  //  - only one ad at a time, and no gameplay events while it shows
  //  - tell the game (onAd) to mute and block input while an ad is showing
  const P = {
    name: window.PLATFORM in adapters ? window.PLATFORM : 'none',
    hasRewarded: false, // set by init(): only true if the SDK really loaded
    onAd: () => {},
    get adShowing() { return adShowing; },
    async init() {
      const ok = await impl.init();
      P.hasRewarded = impl.hasRewarded && ok === true;
    },
    loaded: () => impl.loaded(),
    start() { if (!playing && !adShowing) { playing = true; impl.start(); } },
    stop() { if (playing) { playing = false; impl.stop(); } },
    async showAd(kind) {
      if (adShowing) return false;
      P.stop();
      adShowing = true;
      P.onAd(true);
      try { return await (kind === 'rewarded' ? impl.rewarded() : impl.commercial()); }
      catch (e) { return false; }
      finally { adShowing = false; P.onAd(false); }
    },
    async commercial() { await P.showAd('commercial'); },
    async rewarded() { return (await P.showAd('rewarded')) === true; },
  };
  return P;
})();
