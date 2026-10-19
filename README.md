# Tricky Taps

A small "tricky puzzle" HTML5 game for [Poki](https://developers.poki.com): one screen, one question, and an answer that needs lateral thinking. Drag the sun below the hill, tap a word in the question, and so on.

It's plain HTML, CSS and JS with no build step and no asset files. All the art is inline SVG and the sounds are generated with WebAudio, so each zip is about 65 KB.

There are 30 levels. The game is 16:9 (960×540) and landscape-only; a phone held upright is asked to rotate.

## Run locally

```sh
python3 -m http.server 8080
# open http://localhost:8080
```

On `localhost` the Poki SDK runs in debug mode and shows a placeholder ad between levels.

## Tests

```sh
npm test                    # solves all 30 levels + a full playthrough (tests/run.js)
node tests/requirements.js  # 25 Poki / CrazyGames / web / mobile / robustness requirements (~4 min)
node tests/abuse.js         # tries to break every level (softlocks, random tapping, leftovers)
node tests/regressions.js   # bugs found in code review must stay fixed
```

Run all four before every upload.

## Files

| File | What it does |
| --- | --- |
| `index.html` | Layout. `build.sh` swaps the SDK block between the `PLATFORM` markers per target |
| `src/platform.js` | Ad/analytics adapter for Poki, CrazyGames, or none |
| `src/game.js` | Engine: scaling, drag/tap helpers, hints and bulbs, save data |
| `src/art.js` | Shared SVG art |
| `src/levels/core.js` | Levels 1–11 |
| `src/levels/pack2.js` · `pack3.js` · `pack4.js` | Levels 12–17 (home), 18–23 (outdoors), 24–29 (numbers and words) |
| `src/levels/finale.js` | Level 30. Always loaded last |
| `src/style.css` · `src/fonts/` | Styling and the bundled Patrick Hand font (OFL) |
| `tests/` | Automated tests; `tests/solutions/` holds the winning moves for every level |
| `build.sh` · `DEPLOY.md` · `promo/` | Builds, the platform checklist, store images |

## Adding a level

Add a level object to a pack in `src/levels/` (or make a new pack file, list it in `index.html` before `finale.js`, and wrap it in `{ ... }` so its helpers don't clash with other files). Then add its winning moves to `tests/solutions/`:

```js
{
  id: 'redcircle',                            // unique, used for save data
  q: ['Tap the ', { w: 'red' }, ' circle.'],  // {w:...} makes a tappable word in the question
  hint: 'Shown when the player buys a hint',
  answer: 'Shown when the player skips',
  setup(a) {
    const el = a.put(svgString, x, y, w, h, { z: 1 });  // stage is 960x440
    a.tap(el, () => a.win('Message on the win screen'));
    a.drag(el2, { onDrop(el, back) { a.over(el, target) ? a.win('…') : back(); } });
    a.word('red').addEventListener('pointerdown', ...);
    a.wrong(el); a.say('text', x, y);
  },
}
```

## Poki integration

| Event | SDK call |
| --- | --- |
| Boot | `PokiSDK.init()`, then `gameLoadingFinished()` |
| Level starts | `gameplayStart()` |
| Level won, hint or out-of-bulbs panel opened, or menu shown | `gameplayStop()` |
| "Next" pressed | `commercialBreak()` (Poki decides whether an ad actually plays). Sound is muted during ads. |
| "🎬 +50 💡" pressed | `rewardedBreak()`; the bulbs are granted only if it returns `true` |

While an ad is showing, all input is blocked, sound is muted, and no other SDK event can fire. Only one ad can run at a time.

If the SDK fails to load (for example because of an adblocker), every call becomes a no-op, the 🎬 button is hidden, and the game still works.

## Submitting to Poki

1. Sign up at https://developers.poki.com and create a game.
2. Run `./build.sh poki`. It produces `dist/tricky-taps-poki.zip` with `index.html` at its root.
3. Upload the zip in Poki for Developers and test it in their QA tool (the "Inspector").
4. See `DEPLOY.md` for the full checklist.
