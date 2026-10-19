# Credits and data sources

## 3D city data — Project PLATEAU (MLIT, Japan)

The underground concourse below the Shibuya scramble (`models/real/shibuya_ubld.glb`) is converted from PLATEAU's
underground-mall model (地下街モデル, `uro:UndergroundBuilding`, LOD4.1, 渋谷駅周辺エリア):

出典：「3D都市モデル（Project PLATEAU）渋谷区（2025年度）」（国土交通省）
https://www.geospatial.jp/ckan/dataset/plateau-13113-shibuya-ku-2025 を加工して作成

Source: "3D City Model (Project PLATEAU) Shibuya Ward (FY2025)", Ministry of Land, Infrastructure, Transport and
Tourism (MLIT), Japan — licensed under the PLATEAU Policy (compatible with CC BY 4.0). This project contains a
modified version: the 3D Tiles were decoded, reprojected from ECEF to local metres around the scramble, trimmed to
the drawable surface types, and given procedural materials (`tools/ubld_convert.mjs`, `city/ubld.js`). MLIT did not
produce or endorse this modified result.

## Visual reference only (not redistributed)

- Tokyo Film Commission "Tokyo Location Box" (https://www.locationbox.metro.tokyo.lg.jp/) — photos used only as
  visual reference for Japanese interiors; no images from the site are included in this repository.
- Alice in Borderland (Netflix / ROBOT) stills — reference for mood and set dressing only.

## Generated assets

- Props, vehicles and characters: generated with Tripo3D and decimated with Blender (`tools/`).
- Playing-card paintings in `cards/`: provided by the project author.
