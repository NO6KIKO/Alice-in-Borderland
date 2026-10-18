#!/bin/bash
# Build game LODs for every Tripo prop in models/props that doesn't have one yet (triangle + texture budget per class).
cd "$(dirname "$0")/.."
B="/c/Program Files/Blender Foundation/Blender 5.1/blender.exe"
mkdir -p models/props/lod
for f in models/props/*.glb; do
  n=$(basename "$f" .glb); o="models/props/lod/$n.glb"; [ -f "$o" ] && continue
  case $n in
    airship) t=9000;;
    city_bus|burnt_bus) t=4000;;
    jp_*|kcar|kei_truck|wreck_car|box_truck|motorcycle|tiger|panther|deer) t=3000;;
    bicycle|bicycle_fallen|scooter|koban|rubble_pile|slab_rebar|charred_tree) t=2000;;
    konbini_shelf|drink_fridge|magazine_rack|bento_case|izakaya_table|office_desk|ramen_counter|ticket_machine|station_gate|atm|coffee_machine|konbini_counter|karaoke_sofa|tatami_room_set|shutter_shop|torii|phone_booth|vending|traffic_signal|utility_pole) t=1500;;
    *) t=700;;   # lamps, bins, signs, bags, small clutter
  esac
  case $n in city_bus|jp_*|kcar|kei_truck|wreck_car|box_truck|burnt_bus|motorcycle|airship|koban|tiger|panther|deer) px=1024;; *) px=512;; esac
  "$B" -b -P blender/prop_lod.py -- "$f" "$o" $t $px 2>&1 | grep "^LOD"
done
