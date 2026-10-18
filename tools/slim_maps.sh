#!/bin/bash
# Shrink the secondary PBR maps (normal + occlusion/roughness/metal) of characters and vehicles to 512 px;
# base colour stays as it is. Saves ~8 MB of GPU memory per model (integrated GPUs share system memory).
cd "$(dirname "$0")/.."; mkdir -p .tmp
files=(models/people/web/*.glb models/cars/lod/*.glb)
for n in jp_sedan jp_taxi kcar kei_truck wreck_car box_truck city_bus burnt_bus motorcycle airship koban tiger panther deer; do [ -f "models/props/lod/$n.glb" ] && files+=("models/props/lod/$n.glb"); done
for f in "${files[@]}"; do
  t=.tmp/slim_$(basename "$f")
  npx --no-install gltf-transform resize "$f" "$t" --width 512 --height 512 --pattern "NormalGL*" >/dev/null 2>&1 &&
  npx --no-install gltf-transform resize "$t" "$t" --width 512 --height 512 --pattern "ORM*" >/dev/null 2>&1 &&
  mv -f "$t" "$f" && echo "slim $f" || echo "FAIL $f"
done
