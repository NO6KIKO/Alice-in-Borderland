#!/usr/bin/env bash
# Offline screenshot of a GLB through tools/glbview.html in headless Chrome (software GL; the profile stays on D:).
#   bash tools/glbshot.sh <glb from repo root> <out.png> <camX,camY,camZ> <tgtX,tgtY,tgtZ> [extra query, e.g. &ds=1]
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd -W 2>/dev/null || pwd)"
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
mkdir -p "$ROOT/.tmp/chrome-prof"
"$CHROME" --headless=new --disable-gpu-sandbox --use-angle=swiftshader --enable-unsafe-swiftshader --allow-file-access-from-files \
  --user-data-dir="$ROOT/.tmp/chrome-prof" --window-size=1200,800 --virtual-time-budget=60000 --hide-scrollbars \
  --screenshot="$2" "file:///$ROOT/tools/glbview.html?f=$1&p=$3&t=$4$5" 2>/dev/null
