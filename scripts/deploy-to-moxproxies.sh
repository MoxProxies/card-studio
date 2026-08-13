#!/usr/bin/env bash
# Copies an already-built card-studio embed bundle into a moxproxies-website
# checkout, stamps SOURCE_COMMIT, and commits the result there. Meant to be
# called *after* `pnpm run build` in apps/editor — see
# deploy-to-moxproxies.ps1 for the one-command Windows+WSL wrapper that
# builds first and then calls this. Runs standalone from plain Linux/WSL
# bash too, if that's ever all you need.
#
# Usage: deploy-to-moxproxies.sh <embed-dist-dir> <website-dir> <card-studio-commit-hash> [--push]
set -euo pipefail

EMBED_DIR="$1"
WEBSITE_DIR="$2"
COMMIT="$3"
PUSH_FLAG="${4:-}"

if [ ! -f "$EMBED_DIR/card-studio-embed.js" ]; then
  echo "error: $EMBED_DIR/card-studio-embed.js not found — build card-studio first (pnpm run build in apps/editor)" >&2
  exit 1
fi

DEST="$WEBSITE_DIR/public/vendor/card-studio"
mkdir -p "$DEST"
rm -rf "${DEST:?}"/*
cp -r "$EMBED_DIR"/* "$DEST/"
echo "https://github.com/moxproxies/card-studio/commit/$COMMIT" > "$DEST/SOURCE_COMMIT"

SHORT="${COMMIT:0:7}"
cd "$WEBSITE_DIR"
git add public/vendor/card-studio
git commit -m "Redeploy embedded Card Studio bundle at card-studio@${SHORT}"

if [ "$PUSH_FLAG" = "--push" ]; then
  git push
fi

git status --short
echo "Deployed card-studio@${SHORT} to ${WEBSITE_DIR}/public/vendor/card-studio"
