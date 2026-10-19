// Port City Takeshiba office tower (209 m, 港区海岸一丁目) from PLATEAU's BIM-derived LOD4 model (東京都23区 LOD4 2023,
// MLIT; see CREDITS.md), converted by tools/citygml_lod4.mjs: the whole exterior by BIM element (curtain-wall glass,
// mullions, precast panels, aluminium louvres and fins, soffits, terraces) and the real street-level interior — the
// 竹芝ガレリア galleria, shops, foyer, lift halls, toilets — behind storefronts that are partly shattered, so it can be
// walked into. No textures in the survey: materials by class, box-projected UVs in metres. Walls, floors, columns,
// fittings and the remaining glass collide.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as K from '../kit.js';
import SPOTS from '../models/real/takeshiba_spots.js';

const { canvasTex, noise } = K;
let M = null;
function mats() {
  if (M) return M;
  const tex = (draw, tile) => { const t = canvasTex(256, 256, draw, { repeat: true }); t.userData = { tile }; return t; };
  // 60 cm honed stone floor tiles, faint veining, dust drifts and footprints of the vanished crowd
  const floor = tex((g, w, h) => { g.fillStyle = '#6f685e'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const v = (Math.random() - .5) * 12; g.fillStyle = `rgb(${140 + v},${132 + v},${120 + v})`; g.fillRect(i * 64 + 1, j * 64 + 1, 62, 62); }
    g.strokeStyle = 'rgba(120,112,100,.25)'; for (let k = 0; k < 10; k++) { g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let s = 0; s < 4; s++) { x += (Math.random() - .5) * 60; y += (Math.random() - .5) * 60; g.lineTo(x, y); } g.stroke(); }
    noise(g, w, h, 14); for (let i = 0; i < 12; i++) { g.fillStyle = 'rgba(90,82,70,.1)'; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 10 + Math.random() * 40, 4 + Math.random() * 14, Math.random() * 3, 0, 7); g.fill(); } }, 2.4);
  // painted plasterboard with a stainless skirting and scuffs
  const wall = tex((g, w, h) => { g.fillStyle = '#aaa59c'; g.fillRect(0, 0, w, h); noise(g, w, h, 10); g.fillStyle = '#7c8082'; g.fillRect(0, h - 10, w, 10);
    for (let i = 0; i < 10; i++) { g.fillStyle = 'rgba(60,56,50,.12)'; g.fillRect(Math.random() * w, h - 40 - Math.random() * 40, 10 + Math.random() * 30, 2 + Math.random() * 3); }
    for (let i = 0; i < 5; i++) { g.fillStyle = 'rgba(80,72,60,.08)'; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 20 + Math.random() * 50, 10 + Math.random() * 30, Math.random() * 3, 0, 7); g.fill(); } }, 3);   // damp patches
  // white ceiling board with round downlights (emissive map carries only the lamps; some are dead)
  const ceilDay = tex((g, w, h) => { g.fillStyle = '#e6e5e0'; g.fillRect(0, 0, w, h); noise(g, w, h, 8); g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(0, 127, w, 2); g.fillRect(127, 0, 2, h);
    for (const [x, y] of [[64, 64], [192, 64], [64, 192], [192, 192]]) { g.fillStyle = '#c9cbcc'; g.beginPath(); g.arc(x, y, 13, 0, 7); g.fill(); g.fillStyle = '#fbfbf6'; g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); } }, 3.6);
  const ceilGlow = tex((g, w, h) => { g.fillStyle = '#141414'; g.fillRect(0, 0, w, h); for (const [x, y] of [[64, 64], [192, 64], [64, 192], [192, 192]]) if (Math.random() < .7) { const gr = g.createRadialGradient(x, y, 2, x, y, 22); gr.addColorStop(0, '#fff'); gr.addColorStop(.45, 'rgba(255,250,235,.9)'); gr.addColorStop(1, 'rgba(255,250,235,0)'); g.fillStyle = gr; g.fillRect(x - 24, y - 24, 48, 48); } }, 3.6);
  const pc = tex((g, w, h) => { g.fillStyle = '#d2cfc6'; g.fillRect(0, 0, w, h); noise(g, w, h, 16); g.fillStyle = 'rgba(80,76,70,.25)'; g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h);
    for (let i = 0; i < 8; i++) { const x = Math.random() * w, gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(70,64,54,.22)'); gr.addColorStop(1, 'rgba(70,64,54,0)'); g.fillStyle = gr; g.fillRect(x, 0, 2 + Math.random() * 6, h * (.3 + Math.random() * .6)); } }, 3);   // precast panel joints, rain streaks
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: .8, ...o });
  const glass = std({ color: 0x6f8792, roughness: .18, metalness: .45 });   // blue-grey curtain wall; fully metallic glass went black under this sky
  const frame = std({ color: 0x8e959b, roughness: .35, metalness: .8 }), alu = std({ color: 0xc4c8ca, roughness: .4, metalness: .7 });
  const panel = std({ map: pc, roughness: .85 }), soffit = std({ map: pc, color: 0xe6e4de, roughness: .8 }), roof = std({ map: K.texConcrete, color: 0x9a9b94, roughness: .9 });
  M = {
    glass, glassHi: glass, frame, frameHi: frame, alu, aluHi: alu, panel, panelHi: panel, soffit, soffitHi: soffit, roof, roofHi: roof,
    glassLow: std({ color: 0xa8bcc2, roughness: .04, metalness: .3, transparent: true, opacity: .25, depthWrite: false }),
    // a faint emissive fill stands in for the bounce of the downlights, so deep rooms are not black
    floor: std({ map: floor, roughness: .55, emissive: 0x101010, envMapIntensity: .35 }),
    iwall: std({ map: wall, roughness: .8, emissive: 0x121212, envMapIntensity: .35 }),
    ceil: std({ map: ceilDay, emissiveMap: ceilGlow, emissive: 0xfff6e8, emissiveIntensity: 1.2, roughness: .7, side: THREE.DoubleSide }),
    column: std({ map: pc, color: 0xb0aca4, roughness: .8, emissive: 0x101010, envMapIntensity: .35 }),
    inst: std({ color: 0x80868a, roughness: .45, metalness: .6, emissive: 0x0e0e0e, envMapIntensity: .5 }),
  };
  return M;
}
function prepare(g, tile) {   // box-projected UVs (metres / tile) from each vertex's dominant normal axis
  g = g.index ? g.toNonIndexed() : g; g.computeVertexNormals();
  const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i)), x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const [u, v] = ay >= ax && ay >= az ? [x, z] : ax >= az ? [z, y] : [x, y];
    uv[i * 2] = u / tile; uv[i * 2 + 1] = v / tile;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g;
}
const NO_COLLIDE = new Set(['ceil', 'soffit', 'soffitHi']);
const INTERIOR = new Set(['floor', 'iwall', 'ceil', 'column', 'inst']);

// place the model's centre at world (x, 0, z), turned by ry; resolves after its collision meshes are queued
export function takeshiba(ctx, x, z, ry = 0) {
  const m = mats();
  // the galleria the crowd left: benches, planters, bins and carts on the open floor spots found by the converter
  const c = Math.cos(ry), s = Math.sin(ry), DRESS = ['bench', 'potted_plants', 'trash_bin', 'bench', 'aframe_sign', 'shopping_cart', 'potted_plants', 'trash_bags', 'recycle_bin', 'umbrella_open'];
  SPOTS.forEach(([lx, lz, cl], i) => {
    if (i % 3 === 2) return;
    const name = DRESS[i % DRESS.length], a = ry + (i * 2.39) % 6.28, wx = x + lx * c + lz * s, wz = z - lx * s + lz * c;
    ctx.prop(name, wx, .2, wz, a);
    if (name === 'bench' && cl > 4) ctx.prop('bench', wx + 2.4 * Math.sin(a), .2, wz + 2.4 * Math.cos(a), a + Math.PI);   // back-to-back pair
  });
  return new GLTFLoader().loadAsync('./models/real/takeshiba.glb').then((gltf) => {
    const root = new THREE.Group(); root.name = 'takeshiba'; root.position.set(x, 0, z); root.rotation.y = ry;
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      const cls = o.name.replace(/_\d+$/, ''), mat = m[cls] || m.panel, tile = mat.map?.userData?.tile || 3;
      const mesh = new THREE.Mesh(prepare(o.geometry, tile), mat); mesh.name = 'takeshiba|' + cls;
      mesh.castShadow = !INTERIOR.has(cls) && cls !== 'glassLow'; mesh.receiveShadow = true;
      if (cls === 'glassLow') mesh.renderOrder = 2;
      root.add(mesh); if (!NO_COLLIDE.has(cls)) ctx.collidables.push(mesh);
    });
    ctx.scene.add(root); root.updateMatrixWorld(true);
    ctx.dayNight.push((day) => { m.ceil.emissiveIntensity = day ? 1.2 : .9; });   // emergency power, dimmer at night
    return root;
  }).catch((e) => console.warn('Port City Takeshiba not loaded', e));
}
