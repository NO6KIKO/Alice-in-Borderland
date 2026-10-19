// Real building massing from PLATEAU LOD2 (Project PLATEAU, MLIT; see CREDITS.md), converted by tools/citygml_lod2.mjs
// into one GLB per area in local metres around a real reference point (x east, y up from each building's base, z south),
// one mesh per facade class. Here the classes get the scene's own materials — office / curtain-wall / tiled facades with
// recessed windows and interior mapping, the storefront strip on the street floor, roof coatings, parapets, rooftop
// plant (penthouses, water tanks, AC condensers) — so real footprints,
// heights and roof shapes read in the same style as the rest of the city. Walls and roofs collide.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as K from '../kit.js';
import { buildingMats } from './buildings.js';

const MAT = { office0: 'bOff0', office1: 'bOff1', office2: 'bOff2', glass0: 'bCur0', glass1: 'bCur1', tile0: 'bTile0', tile1: 'bTile1', tile2: 'bTile2', house0: 'bHouse0', house1: 'bHouse1', house2: 'bHouse2', shop: 'shib_shop',
  roof0: 'bRoofG', roof1: 'bRoofL', roof2: 'bRoofT', roof3: 'bRoofR', inst: 'bBandD', para: 'bBand', pent: 'bBandD', unit: 'bTank' };   // roofs: coating / grey / tar / rust sheet

// street furniture (tools/citygml_frn.mjs, already in map metres): the street kit's paint, guardrails, poles and
// signals plus galvanised steel and sign-plate colours; UV-exact classes keep their UVs
export const FRN = { paint: 'stZebra', tactile: 'stTactile', manhole: 'stManhole', guard: 'stGuard', wall: 'conc', pole: 'stPole', steel: 'rfSteel', signal: 'stSignal', box: 'stTrans', signB: 'rfSignB', signR: 'rfSignR', signW: 'rfSignW' };
const RAW_UV = new Set(['manhole', 'guard']), NO_COLLIDE = new Set(['paint', 'tactile', 'manhole']);
function furnitureMats() {
  if (K.mats.rfSteel) return;
  K.def('rfSteel', K.std({ color: 0x8a9096, roughness: .45, metalness: .6 }));
  K.def('rfSignB', K.std({ color: 0x1d4f9c, roughness: .5 })); K.def('rfSignR', K.std({ color: 0xb3332b, roughness: .5 })); K.def('rfSignW', K.std({ color: 0xdcdcd6, roughness: .55 }));
}

// place the area so its reference point sits at world (x, 0, z), turned by ry; resolves after collision meshes are queued
export function realBuildings(ctx, file, x, z, ry = 0, MAP = MAT) {
  buildingMats(); furnitureMats();
  return new GLTFLoader().loadAsync(file).then((gltf) => {
    const root = new THREE.Group(); root.name = 'real|' + file; root.position.set(x, 0, z); root.rotation.y = ry;
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      const cls = o.name.replace(/_\d+$/, ''), key = MAP[cls] || 'bBandD', mat = K.mats[key] || K.mats.bBandD;
      const g = o.geometry, uv = g.attributes.uv, t = mat.userData.tile || 4;
      // metre UVs → material tiles; the storefront strip holds 8 bays of 4 m side by side
      if (!RAW_UV.has(cls)) for (let i = 0; i < uv.count; i++) cls === 'shop' ? uv.setXY(i, uv.getX(i) / 32, uv.getY(i) / 4) : uv.setXY(i, uv.getX(i) / t, uv.getY(i) / t);
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, mat); m.name = 'real|' + cls; m.castShadow = true; m.receiveShadow = true;
      root.add(m); if (!NO_COLLIDE.has(cls)) ctx.collidables.push(m);
    });
    ctx.scene.add(root); root.updateMatrixWorld(true);
    return root;
  }).catch((e) => console.warn('real buildings not loaded', file, e));
}
