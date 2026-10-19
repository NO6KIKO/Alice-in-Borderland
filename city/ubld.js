// The real underground under the Shibuya scramble: PLATEAU 地下街 (uro:UndergroundBuilding) LOD4.1, 渋谷駅周辺エリア
// (MLIT Project PLATEAU, Shibuya ward FY2025, CC BY 4.0-compatible; see CREDITS.md), converted by tools/ubld_convert.mjs
// into one GLB in local metres around the scramble (x east, y up from street level, z south), one mesh per CityGML
// surface type. The survey has no textures or UVs: materials are assigned by type here, UVs are box-projected in
// world metres, and the ceiling carries emergency-power light strips. Floors, walls, doors and installations collide.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as K from '../kit.js';

const { canvasTex, noise } = K;
let M = null;
function mats() {
  if (M) return M;
  const tex = (draw, tile, srgb = true) => { const t = canvasTex(256, 256, draw, { repeat: true, srgb }); t.userData = { tile }; return t; };
  // floor: 30 cm grey anti-slip tiles with a darker border course every 1.2 m, scuffs and grime toward the walls
  const floor = tex((g, w, h) => { g.fillStyle = '#8f8e88'; g.fillRect(0, 0, w, h); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const v = 136 + (Math.random() - .5) * 14; g.fillStyle = `rgb(${v},${v - 1},${v - 5})`; g.fillRect(i * 64 + 1, j * 64 + 1, 62, 62); }
    g.fillStyle = 'rgba(40,38,34,.5)'; g.fillRect(0, 0, w, 3); g.fillRect(0, 0, 3, h); noise(g, w, h, 22); for (let i = 0; i < 14; i++) { g.fillStyle = 'rgba(30,26,22,.12)'; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 8 + Math.random() * 30, 3 + Math.random() * 10, Math.random() * 3, 0, 7); g.fill(); } }, 1.2);
  // walls: white 10×20 cm ceramic tile with a dado band, water stains running down
  const wall = tex((g, w, h) => { g.fillStyle = '#c9c8c2'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(70,70,66,.35)'; g.lineWidth = 1; for (let y = 0; y <= h; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } for (let y = 0; y < h; y += 16) for (let x = (y / 16) % 2 ? 16 : 0; x <= w; x += 32) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 16); g.stroke(); }
    g.fillStyle = 'rgba(60,96,120,.55)'; g.fillRect(0, 176, w, 18); noise(g, w, h, 16);
    for (let i = 0; i < 18; i++) { const x = Math.random() * w, gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(80,70,50,.25)'); gr.addColorStop(1, 'rgba(80,70,50,0)'); g.fillStyle = gr; g.fillRect(x, 0, 2 + Math.random() * 6, h * (.3 + Math.random() * .7)); } }, 1.6);
  // ceiling: aluminium spandrel panels, a fluorescent strip every 2.4 m (emissive map carries only the tubes)
  const ceilDay = tex((g, w, h) => { g.fillStyle = '#a7a8a6'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 8) { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x, 0, 1, h); } g.fillStyle = '#e8ece8'; g.fillRect(0, 120, w, 16); noise(g, w, h, 12); }, 2.4);
  const ceilGlow = tex((g, w, h) => { g.fillStyle = '#121212'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; for (let x = 0; x < w; x += 64) if (Math.random() < .75) g.fillRect(x + 4, 122, 56, 12); }, 2.4);   // a quarter of the tubes are dead   // panels catch a little of the tubes' light
  const conc = tex((g, w, h) => { g.fillStyle = '#7b7a74'; g.fillRect(0, 0, w, h); noise(g, w, h, 30); for (let i = 0; i < 10; i++) { g.fillStyle = 'rgba(40,38,34,.18)'; g.fillRect(Math.random() * w, Math.random() * h, 20 + Math.random() * 60, 2); } }, 2);
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: .8, ...o });
  M = {
    // a faint emissive fill stands in for the bounce light of the ceiling tubes, so far corridors are not pitch black
    FloorSurface: std({ map: floor, roughness: .55, emissive: 0x16171a }),
    WallSurface: std({ map: wall, roughness: .35, emissive: 0x1a1b1e }),
    InteriorWallSurface: std({ map: wall, roughness: .35, emissive: 0x1a1b1e }),
    CeilingSurface: std({ map: ceilDay, emissiveMap: ceilGlow, emissive: 0xf2f6ff, emissiveIntensity: 1.6, roughness: .5, metalness: .4, side: THREE.DoubleSide }),
    Door: std({ color: 0x6c7276, roughness: .45, metalness: .7 }),
    Window: std({ color: 0x9fb4bc, roughness: .08, metalness: .2, transparent: true, opacity: .3 }),
    IntBuildingInstallation: std({ map: conc, roughness: .75, metalness: .15 }),   // stairs, columns, escalator housings, rails
  };
  return M;
}
// box-projected UVs (metres / tile) from the dominant axis of each triangle; flat normals
function prepare(g, tile) {
  g = g.index ? g.toNonIndexed() : g; g.computeVertexNormals();
  const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i)), x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const [u, v] = ay >= ax && ay >= az ? [x, z] : ax >= az ? [z, y] : [x, y];
    uv[i * 2] = u / tile; uv[i * 2 + 1] = v / tile;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g;
}
const COLLIDE = new Set(['FloorSurface', 'WallSurface', 'InteriorWallSurface', 'Door', 'IntBuildingInstallation']);

// place the model so its origin (the scramble reference point) sits at world (x, y, z); returns a promise that
// resolves after its collision meshes are pushed to ctx.collidables (main.js waits for ctx.pending before the BVH build)
export function shibuyaUnderground(ctx, x, y, z, ry = 0) {
  const m = mats();
  return new GLTFLoader().loadAsync('./models/real/shibuya_ubld.glb').then((gltf) => {
    const root = new THREE.Group(); root.name = 'shibuya_ubld'; root.position.set(x, y, z); root.rotation.y = ry;
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      const type = o.name.replace(/_\d+$/, ''), mat = m[type] || m.IntBuildingInstallation, tile = mat.map?.userData?.tile || 2;
      const mesh = new THREE.Mesh(prepare(o.geometry, tile), mat); mesh.name = 'ubld|' + type;
      mesh.castShadow = false; mesh.receiveShadow = false;   // no sun down here
      root.add(mesh);
      if (COLLIDE.has(type)) ctx.collidables.push(mesh);
    });
    ctx.scene.add(root); root.updateMatrixWorld(true);
    // emergency-generator mood: ceiling tubes a little dimmer at night (the venue runs on the same generator)
    ctx.dayNight.push((day) => { m.CeilingSurface.emissiveIntensity = day ? 1.6 : 1.25; });
    return root;
  }).catch((e) => console.warn('real Shibuya underground not loaded', e));
}
