#!/bin/bash
# Web versions of the animated Tripo characters: 1024 px JPEG textures (models/people/web/<id>.glb).
cd "$(dirname "$0")/.."
mkdir -p models/people/web
for f in models/people/*.glb; do
  n=$(basename "$f" .glb); case $n in *_tpose|*_rig) continue;; esac
  o=models/people/web/$n.glb; [ -f "$o" ] && continue
  npx gltf-transform resize "$f" "$TEMP/p_$n.glb" --width 1024 --height 1024 >/dev/null 2>&1 && npx gltf-transform jpeg "$TEMP/p_$n.glb" "$o" --quality 85 >/dev/null 2>&1 && rm -f "$TEMP/p_$n.glb"
  echo "$n $(du -h "$o" | cut -f1)"
done
