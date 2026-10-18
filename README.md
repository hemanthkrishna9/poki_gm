# Tricky Taps

A small "tricky puzzle" HTML5 game for [Poki](https://developers.poki.com): one screen, one question, and an answer that needs lateral thinking. Drag the sun below the hill, tap a word in the question, and so on.

It's plain HTML, CSS and JS with no build step and no asset files. All the art is inline SVG and the sounds are generated with WebAudio, so the game is about 40 KB.

## Run locally

```sh
python3 -m http.server 8080
# open http://localhost:8080
```

On `localhost` the Poki SDK runs in debug mode and shows a placeholder ad between levels.

## Files

| File | What it does |
| --- | --- |
| `index.html` | Layout, plus the Poki SDK `<script>` |
| `src/game.js` | Engine: scaling, drag/tap helpers, hints and bulbs, save data, Poki SDK wrapper |
| `src/levels.js` | SVG art and the 12 levels |
| `src/style.css` | Styling |

## Adding a level

Add an object to `LEVELS` in `src/levels.js`:

```js
{
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
| Level won, hint panel opened, or menu shown | `gameplayStop()` |
| "Next" pressed | `commercialBreak()` (Poki decides whether an ad actually plays). Sound is muted during ads. |
| "🎬 +50 💡" pressed | `rewardedBreak()`; the bulbs are granted only if it returns `true` |

If the SDK fails to load (for example because of an adblocker), the wrapper in `game.js` turns every call into a no-op, so the game still works.

## Submitting to Poki

1. Sign up at https://developers.poki.com and create a game.
2. Zip the folder contents. `index.html` must sit at the root of the zip:
   `zip -r tricky-taps.zip index.html src`
3. Upload the zip in Poki for Developers and test it in their QA tool (the "Inspector").
4. Before submitting, add more levels. Poki looks for retention, and 12 levels takes about 5 minutes to finish. Aim for 30 or more.
