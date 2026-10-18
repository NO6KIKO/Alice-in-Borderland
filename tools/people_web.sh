#!/bin/bash
# Web versions of the animated Tripo characters: 1024 px JPEG textures (models/people/web/<id>.glb).
cd "$(dirname "$0")/.."
mkdir -p models/people/web
for f in models/people/*.glb; do
  n=$(basename "$f" .glb); case $n in *_tpose|*_rig) continue;; esac
  o=models/people/web/$n.glb; [ -f "$o" ] && continue
  npx gltf-transform resize "$f" ".tmp/p_$n.glb" --width 1024 --height 1024 >/dev/null 2>&1 && npx gltf-transform jpeg ".tmp/p_$n.glb" ".tmp/q_$n.glb" --quality 85 >/dev/null 2>&1 && npx gltf-transform simplify ".tmp/q_$n.glb" "$o" --ratio 0.3 --error 0.002 >/dev/null 2>&1 && rm -f ".tmp/p_$n.glb" ".tmp/q_$n.glb"   # ~12k tris, skin + clips kept
  echo "$n $(du -h "$o" | cut -f1)"
done
