# Door Policy

A deduction game for the web (built for Poki). You're the bouncer of a weird club with a secret admission rule. Watch the manager judge a few guests, then swipe ADMIT / REJECT — or hit **💡 I've got it!** and name the rule. Three strikes and you're fired.

- 6 clubs, 80 shifts, 2 special nights, and a Daily Door with a shareable result.
- Every level is generated offline and checked for fairness: the rule is always the only simple explanation of what you've seen.
- Zero dependencies: plain ES modules, HTML and CSS.

## Run

```sh
npx serve .            # then open http://localhost:3000/?nopoki
```

`?nopoki` skips the Poki SDK, `?debug` exposes `window.__door`.

## Test

```sh
node --test                                     # unit tests (engine ~3 min)
NODE_PATH=$(npm root -g) node test/smoke.cjs   # headless browser smoke test
```

## Levels

```sh
node tools/bake.mjs    # regenerates src/data/levels.js (deterministic)
```

Design docs live in `docs/design/` — `05-plan.md` is the source of truth.
