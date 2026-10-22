#!/usr/bin/env bash
# Render every shot (or the ids given), one fresh Chrome per shot so GPU memory never piles up; finished shots are skipped.
cd "$(dirname "$0")/.."
ids="$*"; [ -z "$ids" ] && ids=$(grep -o "id: '[a-z0-9_]*'" trailer/shotlist.js | sed "s/id: '//;s/'//")
for id in $ids; do
  for try in 1 2 3; do node trailer/rec.mjs shots "$id" --scale ${SCALE:-1.25} && break; echo "retry $id"; done
done
