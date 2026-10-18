#!/bin/bash
# Build game LODs for every Tripo prop in models/props that doesn't have one yet.
cd "$(dirname "$0")/.."
B="/c/Program Files/Blender Foundation/Blender 5.1/blender.exe"
mkdir -p models/props/lod
for f in models/props/*.glb; do
  n=$(basename "$f" .glb); o="models/props/lod/$n.glb"; [ -f "$o" ] && continue
  case $n in city_bus) t=6000;; jp_*|kcar|kei_truck|wreck_car) t=5000;; bicycle|scooter|ramen_counter|konbini_shelf|deer) t=4000;; *) t=2500;; esac
  "$B" -b -P blender/prop_lod.py -- "$f" "$o" $t 1024 2>&1 | grep "^LOD"
done
