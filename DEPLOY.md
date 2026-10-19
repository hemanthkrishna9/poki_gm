# Deploying Tricky Taps

`./build.sh` produces one zip per platform in `dist/`. Each zip has `index.html` at its root.

| Zip | Upload to | Ads |
| --- | --- | --- |
| `tricky-taps-poki.zip` | Poki for Developers | Poki SDK (`commercialBreak`, `rewardedBreak`) |
| `tricky-taps-crazygames.zip` | CrazyGames developer portal | CrazyGames SDK v3 (`requestAd('midgame' / 'rewarded')`) |
| `tricky-taps-web.zip` | itch.io, Newgrounds, GitHub Pages, your own site | None. The 🎬 button is hidden and each clear gives 15 💡 instead of 5. |

Before every upload, run `npm test`. It must print `ALL PASSED`.

Store images are in `promo/`. Regenerate them with `node promo/make.js`.

## Poki

Sign up at https://developers.poki.com.

Poki's SDK rules, and how this game handles each one ([sdk.poki.com/new-requirements](https://sdk.poki.com/new-requirements)):

- [x] `gameplayStart()` fires on the player's first input (pressing PLAY or picking a level), not on page load.
- [x] `gameplayStop()` fires on every interruption: level won, hint panel, home menu, and before every ad.
- [x] The same event never fires twice in a row. `Platform.start/stop` in `src/platform.js` guards this.
- [x] No SDK events fire during an ad. Gameplay is stopped before the ad and only restarts once the ad's promise resolves.
- [x] Sound is muted during ads.
- [x] The game still works if the SDK is blocked (adblock).
- [x] Small download (under 100 KB) and a 16:9 canvas.
- [ ] Test the uploaded build with Poki Inspector.
- [ ] Poki wants an animated thumbnail at soft release ([sdk.poki.com/game-thumbnail](https://sdk.poki.com/game-thumbnail)). Record a 3–5 second clip of a level being solved. Keep the title readable at tile size.

Poki's review process is: add the game → gather player feedback → Player Fit Test → Web Fit Test → final review.

## CrazyGames

The docs are at https://docs.crazygames.com.

- Covers ([requirements](https://docs.crazygames.com/requirements/game-covers/)): 1920×1080 landscape, 800×1200 portrait and 800×800 square. These are `promo/thumb-1920x1080.png`, `thumb-800x1200.png` and `thumb-800x800.png`. Covers may show only the game title: no "Play now" text, store logos or borders.
- CrazyGames also asks for a preview video at submission.
- A Basic Launch doesn't need the SDK. A Full Launch requires full SDK integration, which the crazygames build already has.

## Other sites (web build)

- **itch.io:** create a new project → Kind: HTML → upload `tricky-taps-web.zip` → tick "This file will be played in the browser" → set the viewport to 960×640 and enable the fullscreen button.
- **GitHub Pages / your own host:** unzip `tricky-taps-web.zip` and upload its contents. The game is plain static files, so any static host works.
- **Ad networks with their own SDK** (e.g. GameDistribution): add an adapter to `src/platform.js` and a target to `build.sh`, the same way the CrazyGames one is done.

Some portals offer better terms or promotion in exchange for exclusivity. Read each portal's terms before uploading the same game to several of them, and decide the order: Poki first, then the others.
