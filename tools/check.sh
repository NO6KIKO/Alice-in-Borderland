#!/bin/bash
# Syntax-check every ES module (node treats .js as CommonJS here, so check copies as .mjs).
cd "$(dirname "$0")/.."; mkdir -p .tmp/chk; bad=0
for f in *.js city/*.js; do c=".tmp/chk/$(echo $f | tr / _).mjs"; cp "$f" "$c"; node --check "$c" 2>.tmp/chk/err || { echo "FAIL $f"; head -5 .tmp/chk/err; bad=1; }; done
[ $bad = 0 ] && echo "all ok"
