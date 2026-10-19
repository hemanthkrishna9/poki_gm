#!/usr/bin/env bash
# Builds one upload-ready zip per platform into dist/.
#   ./build.sh            → all targets
#   ./build.sh poki       → just Poki
# Targets: poki, crazygames, web (no SDK/ads — itch.io, Newgrounds, your own site)
set -euo pipefail
cd "$(dirname "$0")"
DIST="${DIST:-dist}" # tests build into their own dir so parallel runs don't clash

targets=("$@")
[ ${#targets[@]} -eq 0 ] && targets=(poki crazygames web)

block_for() {
  case "$1" in
    poki)       printf '%s\n' "  <script>window.PLATFORM = 'poki';</script>" \
                              '  <script src="https://game-cdn.poki.com/scripts/v2/poki-sdk.js"></script>' ;;
    crazygames) printf '%s\n' "  <script>window.PLATFORM = 'crazygames';</script>" \
                              '  <script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>' ;;
    web)        printf '%s\n' "  <script>window.PLATFORM = 'none';</script>" ;;
    *) echo "unknown target: $1" >&2; exit 1 ;;
  esac
}

for t in "${targets[@]}"; do
  out="$DIST/$t"
  rm -rf "$out" "$DIST/tricky-taps-$t.zip"
  mkdir -p "$out"
  cp -r src "$out/"
  block="$(block_for "$t")"
  # swap everything between the PLATFORM markers for this target's block
  awk -v block="$block" '
    /PLATFORM:BEGIN/ { print; print block; skip = 1; next }
    /PLATFORM:END/   { skip = 0 }
    !skip
  ' index.html > "$out/index.html"
  (cd "$out" && zip -qr "../tricky-taps-$t.zip" .)
  echo "built $DIST/tricky-taps-$t.zip ($(du -h "$DIST/tricky-taps-$t.zip" | cut -f1))"
done
