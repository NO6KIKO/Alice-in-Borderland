#!/bin/bash
# Build game LODs for every Tripo prop in models/props that doesn't have one yet.
cd "$(dirname "$0")/.."
B="/c/Program Files/Blender Foundation/Blender 5.1/blender.exe"
mkdir -p models/props/lod
for f in models/props/*.glb; do
  n=$(basename "$f" .glb); o="models/props/lod/$n.glb"; [ -f "$o" ] && continue
  case $n in city_bus) t=6000;; jp_*|kcar|kei_truck|wreck_car|box_truck|motorcycle) t=5000;;
    airship) t=9000;; burnt_bus) t=6000;; rubble_pile|slab_rebar|charred_tree) t=3500;; rifle) t=2500;; koban|phone_booth|bento_case|konbini_counter) t=4000;; bicycle|scooter|ramen_counter|konbini_shelf|deer|tiger|panther) t=4500;; *) t=2500;; esac
  case $n in city_bus|jp_*|kcar|kei_truck|wreck_car|box_truck|motorcycle|airship|koban|tiger|panther|deer) px=1024;; *) px=512;; esac   # texture budget
  "$B" -b -P blender/prop_lod.py -- "$f" "$o" $t $px 2>&1 | grep "^LOD"
done
