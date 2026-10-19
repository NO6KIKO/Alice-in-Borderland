// ♦4 ゲーム「電球」(Light Bulb): an underground storm-water tank west of the King of Diamonds tower. A stair from a
// concrete head-house drops 12 m into a teal-lit concrete chamber hung with transformer racks, black cables, insulator
// stacks and plumb-bob electrodes. When a player walks in, a shutter seals the stair, culvert pipes burst open and the
// floor floods. Three knife-switch breakers A / B / C sit on the east wall; one of them (random each round) lights a
// bare bulb in a room behind a heavy riveted door painted 開閉自由 — open and close it as often as you like, but every
// look costs time in deepening water. A bulb that has been on stays warm for a while (touch it). Give the answer on the
// console by the stair: right → GAME CLEAR, the water drains; wrong → electrocuted. When the water reaches the
// electrodes (the time limit) the room is electrified. Drowning is possible too: hold Space to tread water.
// build(ctx, d) runs as a district module; attach({ player, audio, grade, dayNight, scene, camera }) wires the runtime.
import * as THREE from 'three';
import * as K from '../kit.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

const { box, cyl, def, std, bas, canvasTex, noise, setZone } = K;
const F = -12, CEIL = -5.6, X0 = -416, X1 = -398, Z0 = -456, Z1 = -438;   // chamber interior (floor top F, ceiling underside CEIL)
const SHAFT = [-409, -405], TOPY = .12, SPAWN = [-407, TOPY + .05, -481];
const ROOM = { x0: -409.5, x1: -404.5, z0: -432, z1: -427 }, BULB = new THREE.Vector3(-407, F + 2.45, -429.5);
const T_LIMIT = 240, L0 = .1, ELEC = 2.4, BREATH = 9;   // seconds; water depth at start; electrode tips above the floor; breath (s)
const TEAL = new THREE.Color(0x0f3b3f);

let made = false;
const tex = {};
function mats() {
  if (made) return; made = true;
  // poured concrete: form-tie holes on a 0.6 × 0.9 m grid, board seams, water stains and drip streaks
  tex.conc = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#6b7876'; g.fillRect(0, 0, w, h); noise(g, w, h, 26);
    for (let y = 0; y < h; y += 115) { g.fillStyle = 'rgba(30,38,38,.25)'; g.fillRect(0, y, w, 2); }
    for (let y = 58; y < h; y += 115) for (let x = 38; x < w; x += 77) { g.fillStyle = 'rgba(28,32,32,.55)'; g.beginPath(); g.arc(x, y, 4.5, 0, 7); g.fill(); g.fillStyle = 'rgba(160,170,165,.25)'; g.beginPath(); g.arc(x - 1, y - 1, 2.5, 0, 7); g.fill(); }
    for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(${20 + Math.random() * 20},${30 + Math.random() * 20},${30},${.08 + Math.random() * .14})`; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 20 + Math.random() * 90, 10 + Math.random() * 60, Math.random() * 3, 0, 7); g.fill(); }
    for (let i = 0; i < 40; i++) { const x = Math.random() * w, y = Math.random() * h * .6, gr = g.createLinearGradient(0, y, 0, y + 120 + Math.random() * 200); gr.addColorStop(0, 'rgba(25,32,30,.3)'); gr.addColorStop(1, 'rgba(25,32,30,0)'); g.fillStyle = gr; g.fillRect(x, y, 2 + Math.random() * 5, 320); }
  }, { repeat: true });
  const cn = K.normalFrom(tex.conc, 2);
  def('lb_wall', std({ map: tex.conc, normalMap: cn, color: 0x9cb2b0, roughness: .82, emissive: 0x10201f }), 4);   // faint teal fill stands in for tube bounce light
  def('lb_floor', std({ map: tex.conc, normalMap: cn, color: 0x5e6e6c, roughness: .28, metalness: .1, emissive: 0x0a1414 }), 4);   // wet
  def('lb_ceil', std({ map: tex.conc, color: 0x4c5856, roughness: .9, emissive: 0x060a0b }), 4);
  def('lb_pipe', std({ map: tex.conc, color: 0x8c9896, roughness: .85, emissive: 0x081010 }), 2);
  def('lb_box', std({ color: 0x2c4a4d, roughness: .5, metalness: .45 }));
  def('lb_fin', std({ color: 0x1a2628, roughness: .55, metalness: .6 }));
  for (const [k, c] of [['lb_cable', 0x0b0c0d], ['lb_cabR', 0x7c1a16], ['lb_cabB', 0x1a3a7c]]) { def(k, std({ color: c, roughness: .55 })); K.mats[k].userData.noCollide = true; }
  def('lb_ins', std({ color: 0xe6e4dc, roughness: .22 })); def('lb_spike', std({ color: 0xb4b9bd, roughness: .22, metalness: .95 }));
  def('lb_tube', bas({ color: new THREE.Color(2.4, 3, 3.1) })); def('lb_tubeD', bas({ color: new THREE.Color(.25, .32, .34) }));
  def('lb_fixt', std({ color: 0x384244, roughness: .5, metalness: .6 }));
  for (const k of ['lb_ins', 'lb_spike', 'lb_tube', 'lb_tubeD', 'lb_fixt']) K.mats[k].userData.noCollide = true;
  def('lb_house', std({ map: tex.conc, normalMap: cn, color: 0xb8bcb4, roughness: .85 }), 4);   // head-house, sunlit
}
const label = (text, w, h, draw) => canvasTex(w, h, draw);
function plate(letter) {   // white enamel plate, red stencil letter, four bolts, grime
  return label(letter, 256, 160, (g, w, h) => {
    g.fillStyle = '#d9d8d0'; g.fillRect(0, 0, w, h); noise(g, w, h, 18);
    g.fillStyle = '#8c2a22'; g.font = 'bold 128px "Arial Black", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(letter, w / 2, h / 2 + 6);
    g.fillStyle = '#d9d8d0'; g.fillRect(w / 2 - 3, 20, 6, h - 40);   // stencil bridge
    g.fillStyle = '#555'; for (const [x, y] of [[16, 16], [w - 16, 16], [16, h - 16], [w - 16, h - 16]]) { g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); }
    for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(60,50,40,${Math.random() * .2})`; g.fillRect(Math.random() * w, Math.random() * h, 10 + Math.random() * 40, 3 + Math.random() * 10); }
  });
}
function doorTex(text) {   // one leaf: dark blue-black steel, riveted straps, a worn white stencil
  return label(text, 512, 1024, (g, w, h) => {
    g.fillStyle = '#18222b'; g.fillRect(0, 0, w, h); noise(g, w, h, 16);
    for (const y of [60, 330, 690, 964]) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, y - 26, w, 52); g.fillStyle = 'rgba(120,135,150,.12)'; g.fillRect(0, y - 26, w, 3); for (let x = 22; x < w; x += 44) { g.fillStyle = '#0c1116'; g.beginPath(); g.arc(x, y, 8, 0, 7); g.fill(); g.fillStyle = 'rgba(150,165,180,.35)'; g.beginPath(); g.arc(x - 2, y - 2, 3, 0, 7); g.fill(); } }
    for (const x of [24, w - 24]) for (let y = 40; y < h; y += 44) { g.fillStyle = '#0c1116'; g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(214,220,214,.85)'; g.font = 'bold 230px "Yu Gothic","Meiryo","MS Gothic",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    [...text].forEach((ch, i) => g.fillText(ch, w / 2 + (i - (text.length - 1) / 2) * 236, h * .5));
    g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * .7})`; g.fillRect(Math.random() * w, h * .38 + Math.random() * h * .24, 2 + Math.random() * 8, 2 + Math.random() * 6); }   // worn paint
    g.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(110,60,30,${.15 + Math.random() * .25})`; g.fillRect(Math.random() * w, Math.random() * h, 3 + Math.random() * 14, 10 + Math.random() * 60); }   // rust runs
  });
}
function cardCanvas() {   // the phone's difficulty card: plain white card, four red diamonds
  const c = document.createElement('canvas'); c.width = 240; c.height = 336; const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, 240, 336); g.strokeStyle = '#3a5a8a'; g.lineWidth = 3; g.beginPath(); g.roundRect(4, 4, 232, 328, 14); g.stroke();
  const dia = (x, y, s) => { g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s * .72, y); g.lineTo(x, y + s); g.lineTo(x - s * .72, y); g.closePath(); g.fill(); };
  g.fillStyle = '#d8242a'; for (const [x, y] of [[70, 70], [170, 70], [70, 266], [170, 266]]) dia(x, y, 20);
  g.font = 'bold 34px Georgia,serif'; g.fillText('4', 16, 44); dia(30, 66, 8);
  g.save(); g.translate(224, 292); g.rotate(Math.PI); g.fillText('4', 0, 0); g.restore(); dia(210, 270, 8);
  return c;
}

/* ───────────── static build (district module) ───────────── */
let L = null;   // the level instance (one per game)
export function build(ctx, d) {
  mats();
  const { scene } = ctx, root = new THREE.Group(); root.name = 'lightbulb'; scene.add(root);
  /* surface: paving with the stair opening, the head-house, signs */
  setZone('bulb');
  const ox0 = SHAFT[0] - .4, ox1 = SHAFT[1] + .4, oz0 = -474.9, oz1 = -470.3;   // opening in the ground over the stair top; beyond it the soffit runs under the paving
  for (const [a, b, c, e] of [[d.x - d.w / 2, d.z - d.d / 2, ox0, d.z + d.d / 2], [ox1, d.z - d.d / 2, d.x + d.w / 2, d.z + d.d / 2], [ox0, d.z - d.d / 2, ox1, oz0], [ox0, oz1, ox1, d.z + d.d / 2]]) box('walk', c - a, .12, e - b, (a + c) / 2, .06, (b + e) / 2);
  for (const s of [-1, 1]) box('lb_house', .35, 3.6, 12.4, -407 + s * 2.6, 1.8, -470.4);   // head-house walls
  box('lb_house', 5.55, 3.6, .35, -407, 1.8, -464.4); box('lb_house', 6.2, .4, 13.2, -407, 3.8, -470.4);   // back wall, roof slab
  box('lb_house', 5.55, .9, .35, -407, 3.15, -476.45);   // entrance lintel
  box('steelL', 6.4, .12, 2.2, -407, 3.2, -477.6);   // canopy
  { const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.6, .62), new THREE.MeshStandardMaterial({ roughness: .7, map: label('sign', 512, 88, (g, w, h) => { g.fillStyle = '#e8e6de'; g.fillRect(0, 0, w, h); g.fillStyle = '#1d3a5a'; g.font = 'bold 40px "Yu Gothic","Meiryo",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('雨水調節池 管理用出入口', w / 2, h / 2); noise(g, w, h, 14); }) }));
    sign.position.set(-407, 3.15, -476.66); sign.rotation.y = Math.PI; root.add(sign); }
  { const card = new THREE.Mesh(new THREE.PlaneGeometry(.9, 1.26), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cardCanvas()), color: new THREE.Color(1.4, 1.4, 1.4) })); card.material.map.colorSpace = THREE.SRGBColorSpace;
    card.position.set(-410.6, 1.7, -477.1); card.rotation.y = Math.PI; root.add(card); box('steelL', .08, 1.1, .08, -410.6, .55, -477.05); }   // the venue's card on a post by the door, as at every game
  cutLand(ctx, ox0, oz0, ox1, oz1); waterHole(ctx, SHAFT[0] - 1, -477, SHAFT[1] + 1, -455);

  /* underground: shaft, chamber, corridor, bulb room */
  setZone('bulb_ug');
  K.stairs(-407, Z0 - .25, 0, -1, F, TOPY, 3.6);
  for (const x of [SHAFT[0] - .2, SHAFT[1] + .2]) box('lb_wall', .4, TOPY - F + .3, Z0 - oz0 + .6, x, (TOPY + F) / 2 - .15, (oz0 + Z0) / 2 - .3);
  K.withFrame(-407, 0, 0, 0, () => {   // shaft soffit following the stair, from where it drops below ground to the chamber
    const zA = -470.3, yA = -.4, zB = Z0 - .25, yB = F + 3.25, len = Math.hypot(zB - zA, yB - yA), th = Math.atan2(yB - yA, zB - zA);
    box('lb_ceil', 4.4, .35, len, 0, (yA + yB) / 2 + .17, (zA + zB) / 2, 0, 0, -th);
    const zC = -474.55, yC = TOPY - .3, zD = Z0 - .25, yD = F - .3, l2 = Math.hypot(zD - zC, yD - yC), t2 = Math.atan2(yD - yC, zD - zC);   // solid underside of the flight
    box('lb_wall', 4.4, .4, l2, 0, (yC + yD) / 2 - .2, (zC + zD) / 2, 0, 0, -t2);
  });
  for (let z = -468; z < Z0 - 1; z += 4) {   // caged bulkhead lamps on the shaft's west wall, following the stair down
    const y = TOPY - (z + 474.55) * (TOPY - F) / 18.3 + 2.3;
    box('lb_fixt', .12, .22, .36, SHAFT[0] + .06, y, z); box('lb_tube', .05, .12, .26, SHAFT[0] + .14, y, z);
  }
  const W = X1 - X0, D = Z1 - Z0, cx = (X0 + X1) / 2, cz = (Z0 + Z1) / 2, H = CEIL - F;
  box('lb_floor', W + 1, .4, D + 1, cx, F - .2, cz); box('lb_ceil', W + 1, .5, D + 1, cx, CEIL + .25, cz);
  for (const s of [-1, 1]) box('lb_wall', .5, H, D + 1, s < 0 ? X0 - .25 : X1 + .25, F + H / 2, cz);
  const wallWithHole = (z, h0, h1, hh) => {   // an E-W wall with an opening h0..h1 (x), hh high
    box('lb_wall', h0 - X0 + .5, H, .5, (X0 - .5 + h0) / 2, F + H / 2, z); box('lb_wall', X1 + .5 - h1, H, .5, (h1 + X1 + .5) / 2, F + H / 2, z);
    box('lb_wall', h1 - h0, H - hh, .5, (h0 + h1) / 2, F + hh + (H - hh) / 2, z);
  };
  wallWithHole(Z0 - .25, SHAFT[0], SHAFT[1], 3.25); wallWithHole(Z1 + .25, -408.4, -405.6, 2.95);
  const CX0 = -408.4, CX1 = -405.6;   // corridor to the bulb room
  box('lb_floor', CX1 - CX0 + 1, .4, ROOM.z0 - Z1, -407, F - .2, (Z1 + ROOM.z0) / 2); box('lb_ceil', CX1 - CX0 + 1, .4, ROOM.z0 - Z1, -407, F + 3.2, (Z1 + ROOM.z0) / 2);
  for (const x of [CX0 - .25, CX1 + .25]) box('lb_wall', .5, 3, ROOM.z0 - Z1, x, F + 1.5, (Z1 + ROOM.z0) / 2);
  { const rw = ROOM.x1 - ROOM.x0, rd = ROOM.z1 - ROOM.z0, rcx = (ROOM.x0 + ROOM.x1) / 2, rcz = (ROOM.z0 + ROOM.z1) / 2;
    box('lb_floor', rw + 1, .4, rd + 1, rcx, F - .2, rcz); box('lb_ceil', rw + 1, .4, rd + 1, rcx, F + 3.6, rcz);
    for (const s of [-1, 1]) box('lb_wall', .5, 3.4, rd + 1, s < 0 ? ROOM.x0 - .25 : ROOM.x1 + .25, F + 1.7, rcz);
    box('lb_wall', rw + 1, 3.4, .5, rcx, F + 1.7, ROOM.z1 + .25);
    box('lb_wall', CX0 - ROOM.x0, 3.4, .5, (ROOM.x0 + CX0) / 2, F + 1.7, ROOM.z0 - .25); box('lb_wall', ROOM.x1 - CX1, 3.4, .5, (CX1 + ROOM.x1) / 2, F + 1.7, ROOM.z0 - .25);
    box('lb_wall', CX1 - CX0, .4, .5, -407, F + 3.2, ROOM.z0 - .25); }
  /* culvert outlets that will gush: concrete pipe mouths with a lip, tilted down a little */
  const PIPES = [[X0, -451.5, 1], [X0, -443, 1], [X1, -440.5, -1], [-413, Z1, 0]];   // [x or wall, z, side]: side ±1 = west/east wall, 0 = south wall
  const mouths = [];
  for (const [px, pz, side] of PIPES) {
    const y = F + 2.9 + Math.random() * .4, dir = side ? new THREE.Vector3(side, -.2, 0).normalize() : new THREE.Vector3(0, -.2, -1).normalize();
    const base = side ? new THREE.Vector3(px, y, pz) : new THREE.Vector3(px, y, Z1), mouth = base.clone().addScaledVector(dir, .9);
    const m4 = new THREE.Matrix4().lookAt(base, mouth, new THREE.Vector3(0, 1, 0));
    const place = (k, g, inward) => {   // local −z runs out of the wall along the pipe
      if (inward) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i]; ix[i] = ix[i + 1]; ix[i + 1] = t; } const n = g.attributes.normal; for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i)); }
      g.applyMatrix4(m4); g.translate(base.x, base.y, base.z); K.put(k, g, new THREE.Matrix4());
    };
    const tubeG = (r, len, z) => { const g = new THREE.CylinderGeometry(r, r, len, 22, 1, true); g.rotateX(Math.PI / 2); g.translate(0, 0, z); return g; };
    place('lb_pipe', tubeG(.72, 1.1, -.35)); place('lb_fin', tubeG(.58, 1.1, -.35), true);   // concrete barrel; the bore, seen from inside
    { const g = new THREE.RingGeometry(.58, .72, 22); g.rotateY(Math.PI); g.translate(0, 0, -.9); place('lb_pipe', g); }   // lip, facing out
    { const g = new THREE.CircleGeometry(.6, 22); g.rotateY(Math.PI); g.translate(0, 0, .15); place('lb_fin', g); }   // dark back of the bore, facing the mouth
    mouths.push({ p: mouth, dir });
  }
  /* breaker panel on the east wall: label plates, enclosures, red/blue cables up to the ceiling (levers move: below) */
  const BRK = [-451, -448.5, -446].map((z, i) => ({ z, id: 'ABC'[i] }));
  for (const b of BRK) {
    box('lb_box', .32, .78, .58, X1 - .16, F + 1.45, b.z);   // enclosure
    box('lb_box', .06, .62, .44, X1 - .34, F + 1.5, b.z); box('lb_fin', .02, .5, .03, X1 - .375, F + 1.52, b.z);   // teal cover, centre rib
    box('yel', .015, .05, .16, X1 - .38, F + 1.24, b.z);   // yellow warning sticker
    box('lb_cabR', .05, CEIL - F - 1.95, .05, X1 - .08, (F + 1.84 + CEIL) / 2, b.z - .12); box('lb_cabB', .05, CEIL - F - 1.95, .05, X1 - .08, (F + 1.84 + CEIL) / 2, b.z + .02);
    box('lb_cable', .07, CEIL - F - 1.95, .07, X1 - .08, (F + 1.84 + CEIL) / 2, b.z + .15);
  }
  /* answer console by the stair: steel pedestal with a screen and three covered buttons (buttons move: below) */
  box('lb_box', 1.6, 1.15, .55, -401.5, F + .575, Z0 + .3); box('lb_fin', 1.5, .5, .08, -401.5, F + 1.5, Z0 + .08);
  /* ceiling: transformer racks with radiator fins, insulator stacks, sagging cables, plumb-bob electrodes */
  const racks = [[-411.5, -450], [-403, -451.5], [-407.5, -444], [-401, -441.5]];
  for (const [x, z] of racks) {
    box('lb_fin', 2.2, 1.3, 1.2, x, CEIL - .9, z); box('lb_box', 2.3, .12, 1.3, x, CEIL - .2, z);
    for (let i = 0; i < 9; i++) box('lb_fin', .04, 1.1, 1.36, x - .96 + i * .24, CEIL - .9, z);   // radiator fins
    for (const [dx, dz] of [[-.7, -.35], [.7, -.35], [-.7, .35], [.7, .35]]) for (let k = 0; k < 5; k++) cyl('lb_ins', .13 - (k % 2) * .03, .09, x + dx, CEIL - 1.6 - k * .1, z + dz, 0, 0, 0, 12);
    for (const s of [-1, 1]) box('lb_fin', .1, .55, .1, x + s * .9, CEIL - .27, z);
  }
  const sag = (a, b, s, k = 'lb_cable', r = .045) => { const N = 8; let p = a.clone(); for (let i = 1; i <= N; i++) { const t = i / N, q = new THREE.Vector3().lerpVectors(a, b, t); q.y -= s * 4 * t * (1 - t); K.strut(k, p.toArray(), q.toArray(), r, 5); p = q; } };
  const rnd = K.rng(404);
  for (let i = 0; i < racks.length; i++) for (let j = i + 1; j < racks.length; j++) for (let k = 0; k < 2; k++) sag(new THREE.Vector3(racks[i][0] + (rnd() - .5), CEIL - 1.5, racks[i][1] + (rnd() - .5)), new THREE.Vector3(racks[j][0] + (rnd() - .5), CEIL - 1.5, racks[j][1] + (rnd() - .5)), .9 + rnd() * 1.4);
  for (let i = 0; i < 14; i++) { const r0 = racks[i % 4], wall = rnd() < .5 ? [rnd() < .5 ? X0 : X1, CEIL - .4 - rnd() * 1.2, Z0 + 2 + rnd() * (D - 4)] : [X0 + 2 + rnd() * (W - 4), CEIL - .4 - rnd() * 1.2, rnd() < .5 ? Z0 : Z1]; sag(new THREE.Vector3(r0[0], CEIL - 1.4, r0[1]), new THREE.Vector3(...wall), 1 + rnd() * 1.6, 'lb_cable', .035 + rnd() * .03); }
  const ELECTRODES = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    const x = X0 + 3.5 + i * 5.5 + (rnd() - .5) * 1.5, z = Z0 + 3.5 + j * 5.5 + (rnd() - .5) * 1.5, tip = F + ELEC;
    K.strut('lb_cable', [x, CEIL, z], [x, tip + .68, z], .02, 4);
    cyl('lb_spike', .07, .34, x, tip + .48, z, 0, 0, 0, 10); cyl('lb_spike', .001, .3, x, tip + .15, z, 0, 0, 0, 10, .09);   // weight + point
    ELECTRODES.push(new THREE.Vector3(x, tip, z));
  }
  /* fluorescent fittings on the walls (one flickers, one dead) and a depth gauge by the door */
  const TUBES = [[X0 + .15, -452, 0], [X0 + .15, -441, 0], [X1 - .15, -455, 0], [X1 - .15, -441.8, 0], [-412, Z0 + .15, 1], [-402.5, Z1 - .15, 1]];
  TUBES.forEach(([x, z, along], i) => { const len = 1.3; box('lb_fixt', along ? len : .16, .14, along ? .16 : len, x, F + 4.1, z); box(i === 4 ? 'lb_tubeD' : 'lb_tube', along ? len - .1 : .06, .06, along ? .06 : len - .1, x + (along ? 0 : x < cx ? .08 : -.08), F + 4.02, z + (along ? (z < cz ? .08 : -.08) : 0)); });
  { const g = new THREE.Mesh(new THREE.PlaneGeometry(.32, 3), new THREE.MeshStandardMaterial({ roughness: .6, map: label('gauge', 64, 512, (g, w, h) => { g.fillStyle = '#e4e2d8'; g.fillRect(0, 0, w, h); g.fillStyle = '#b8261e'; for (let i = 0; i <= 30; i++) { const y = h - i * h / 30; g.fillRect(0, y - 1, i % 5 ? 22 : 40, 3); } g.font = 'bold 22px Arial'; for (let m = 0; m <= 3; m++) g.fillText(m, 42, h - m * h / 3 + (m ? 18 : -4)); noise(g, w, h, 16); }) }));
    g.position.set(-404.6, F + 1.5, Z1 - .01); g.rotation.y = Math.PI; root.add(g); }
  for (const b of BRK) { const p = new THREE.Mesh(new THREE.PlaneGeometry(.5, .31), new THREE.MeshStandardMaterial({ roughness: .5, map: plate(b.id) })); p.position.set(X1 - .02, F + 2.32, b.z); p.rotation.y = -Math.PI / 2; root.add(p); }
  ctx.pois.push({ id: 'bulb', cam: [-380, 40, -510], tgt: [-407, 0, -460], spawn: SPAWN, yaw: Math.PI });
  L = createLevel(ctx, root, { mouths, BRK, ELECTRODES });
  window.__bulb = L;   // dev handle: __bulb.state, __bulb.debug
  ctx.updates.push((dt, t) => L.update(dt, t));
}

/* cooperative ground hole + bay-water discard (same scheme as shibuya.js: shared land.userData.holes, shared vSubW) */
function cutLand(ctx, x0, z0, x1, z1) {
  const land = ctx.scene.children.find((o) => o.isMesh && o.geometry && o.geometry.type === 'ShapeGeometry' && Math.abs(o.position.y + .08) < 1e-3); if (!land) return;
  const holes = land.userData.holes || (land.userData.holes = []); holes.push([x0, z0, x1, z1]);
  const sh = new THREE.Shape(ctx.map.COAST.map(([x, z]) => new THREE.Vector2(x, -z)));
  for (const [a, b, c, e] of holes) sh.holes.push(new THREE.Path([new THREE.Vector2(a, -b), new THREE.Vector2(c, -b), new THREE.Vector2(c, -e), new THREE.Vector2(a, -e)]));
  const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2);
  const uv = g.attributes.uv, pos = g.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / 8, pos.getZ(i) / 8);
  land.geometry.dispose(); land.geometry = g;
}
function waterHole(ctx, x0, z0, x1, z1) {
  const water = ctx.scene.children.find((o) => o.isMesh && o.geometry?.parameters?.width === 9000); if (!water) return;
  const m = water.material, prev = m.onBeforeCompile.bind(m), prevKey = m.customProgramCacheKey.bind(m);
  const test = `if (vSubW.x > ${x0.toFixed(1)} && vSubW.x < ${x1.toFixed(1)} && vSubW.y > ${z0.toFixed(1)} && vSubW.y < ${z1.toFixed(1)}) discard;`;
  m.onBeforeCompile = (sh, r) => {
    prev(sh, r);
    if (!sh.vertexShader.includes('vSubW')) {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vSubW;').replace('#include <project_vertex>', '#include <project_vertex>\nvSubW = (modelMatrix * vec4(transformed, 1.0)).xz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vSubW;');
    }
    sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'void main() {\n' + test);
  };
  m.customProgramCacheKey = () => prevKey() + '|bulbHole'; m.needsUpdate = true;
}

/* ───────────── moving parts, effects, people, game logic ───────────── */
const NOISE_GLSL = `float lbH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float lbN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(lbH(i), lbH(i + vec2(1, 0)), f.x), mix(lbH(i + vec2(0, 1)), lbH(i + vec2(1, 1)), f.x), f.y); }`;
function createLevel(ctx, root, { mouths, BRK, ELECTRODES }) {
  const { scene, camera } = ctx, ug = new THREE.Group(); root.add(ug);
  const S = { mode: 'idle', t: 0, level: L0, correct: 0, sw: [false, false, false], door: 0, doorGoal: 0, shutter: 0, shutterGoal: 0, jets: 0, heat: 0, breath: BREATH, pending: -1, pendT: 0, endT: 0, cause: '' };
  let P = null, A = null, G = null, DN = null;   // player, audio, grade, dayNight (attach)
  /* water: one rising plane over chamber, corridor and bulb room; foam churns around the jets and along the walls */
  const waveN = canvasTex(256, 256, (g, w, h) => { const id = g.createImageData(w, h), d = id.data; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let nx = 0, ny = 0; for (const [a, b, ph, am] of [[1, 2, .3, 1], [3, -1, 1.2, .6], [-2, 3, 2.1, .5], [5, 4, .7, .3], [-6, 1, 1.9, .25]]) { const c = Math.cos(6.283 * (a * x / w + b * y / h) + ph) * am; nx += c * a; ny += c * b; } const i = (y * w + x) * 4; d[i] = 128 + nx * 6; d[i + 1] = 128 + ny * 6; d[i + 2] = 255; d[i + 3] = 255; } g.putImageData(id, 0, 0); }, { srgb: false, repeat: true });
  waveN.repeat.set(6, 6);
  const wu = { uTime: { value: 0 }, uJet: { value: [0, 1, 2, 3].map(() => new THREE.Vector4()) } };
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x0c2a2d, roughness: .06, metalness: .1, normalMap: waveN, normalScale: new THREE.Vector2(.5, .5), transparent: true, opacity: .92, envMapIntensity: .35, side: THREE.DoubleSide });
  waterMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, wu);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vLbW;').replace('#include <project_vertex>', '#include <project_vertex>\nvLbW = (modelMatrix * vec4(transformed, 1.0)).xz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec2 vLbW; uniform float uTime; uniform vec4 uJet[4];\n${NOISE_GLSL}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
      float fo = 0.;
      for (int i = 0; i < 4; i++) { float r = length(vLbW - uJet[i].xy); fo += uJet[i].z * smoothstep(3.2, .3, r) * (.65 + .35 * sin(r * 6. - uTime * 8.)); }
      vec2 eW = min(vLbW - vec2(${X0}., ${Z0}.), vec2(${X1}., ${Z1}.) - vLbW); fo += .18 * smoothstep(.5, .0, min(eW.x, eW.y)) * step(vLbW.y, ${(Z1 + .5).toFixed(1)});   // a thin scum line at the walls
      float n = lbN(vLbW * 1.6 + vec2(uTime * .17, uTime * .09)) * lbN(vLbW * 4.3 - vec2(uTime * .3, -uTime * .2));
      fo = clamp(fo * (.35 + 1.3 * n) + n * n * .12, 0., 1.);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.62, .74, .74), fo); diffuseColor.a = mix(diffuseColor.a, 1., fo);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, .85, fo);');
  };
  waterMat.customProgramCacheKey = () => 'lbWater';
  const water = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, ROOM.z1 - Z0), waterMat); water.rotation.x = -Math.PI / 2; water.position.set((X0 + X1) / 2, F + L0, (Z0 + ROOM.z1) / 2); water.renderOrder = 3; ug.add(water);
  /* jets: a tube of water along each pipe's throw, streaks running down it, cut off at the water line */
  const ju = { uTime: { value: 0 }, uWater: { value: F }, uOn: { value: 0 }, uLight: { value: 1 } };
  const jetMat = new THREE.ShaderMaterial({ uniforms: ju, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; varying vec3 vWP, vN; void main() { vUv = uv; vec4 wp = modelMatrix * vec4(position, 1.); vWP = wp.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: `uniform float uTime, uWater, uOn, uLight; varying vec2 vUv; varying vec3 vWP, vN; ${NOISE_GLSL}
      void main() { if (vWP.y < uWater - .03 || uOn < .01 || vUv.x > uOn * 1.05) discard;
        float s1 = lbN(vec2(vUv.y * 9., vUv.x * 18. - uTime * 6.5)), s2 = lbN(vec2(vUv.y * 31., vUv.x * 64. - uTime * 13.)), s = s1 * .62 + s2 * .38;
        float tear = smoothstep(.05, 1., vUv.x);   // the sheet tears apart as it falls
        if (s < tear * .58 + .08) discard;
        float fr = 1. - abs(dot(normalize(vN), normalize(cameraPosition - vWP)));
        float a = mix(.62, .3, tear) * (.45 + .75 * s) * (1. - fr * .55) * smoothstep(0., .03, vUv.x);
        gl_FragColor = vec4(mix(vec3(.42, .56, .57), vec3(.9, .97, .97), smoothstep(.3, .9, s)) * uLight, a); }` });
  const G9 = -9.8, jets = mouths.map(({ p, dir }) => {
    const v = dir.clone().multiplyScalar(3.4), pts = [];
    for (let t = 0; ; t += .04) { const q = p.clone().addScaledVector(v, t); q.y += .5 * G9 * t * t; pts.push(q); if (q.y < F - .1 || t > 2) break; }
    const curve = new THREE.CatmullRomCurve3(pts), g = new THREE.TubeGeometry(curve, 28, 1, 10, false), pos = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) {   // flare the radius along the throw: .42 at the mouth → .8 near the floor
      const u = uv.getX(i), c = curve.getPointAt(Math.min(1, u)), r = .42 + .38 * u; const v3 = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).sub(c);
      pos.setXYZ(i, c.x + (v3.x) * r, c.y + v3.y * r, c.z + v3.z * r);
    }
    g.computeVertexNormals(); const m = new THREE.Mesh(g, jetMat); m.frustumCulled = false; m.renderOrder = 4; ug.add(m);
    return { p, v, pts, mesh: m, hit: new THREE.Vector3() };
  });
  /* droplets (CPU points) and spray puffs (sprites) where the jets hit */
  const ND = 420, dPos = new Float32Array(ND * 3), dVel = new Float32Array(ND * 3), drops = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ size: .07, color: 0xdcecec, transparent: true, opacity: .75, depthWrite: false }));
  drops.geometry.setAttribute('position', new THREE.BufferAttribute(dPos, 3)); drops.frustumCulled = false; drops.renderOrder = 4; ug.add(drops);
  const respawn = (i) => { const j = jets[i % jets.length]; dPos[i * 3] = j.p.x + (Math.random() - .5) * .6; dPos[i * 3 + 1] = j.p.y + (Math.random() - .5) * .6; dPos[i * 3 + 2] = j.p.z + (Math.random() - .5) * .6; const s = .8 + Math.random() * .5; dVel[i * 3] = j.v.x * s + (Math.random() - .5) * 1.4; dVel[i * 3 + 1] = j.v.y * s + Math.random() * 1.2; dVel[i * 3 + 2] = j.v.z * s + (Math.random() - .5) * 1.4; };
  for (let i = 0; i < ND; i++) { respawn(i); dPos[i * 3 + 1] = F - 5; }
  const soft = canvasTex(64, 64, (g, w, h) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.5, 'rgba(255,255,255,.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const puffs = Array.from({ length: 44 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, color: 0xd6eaea, transparent: true, opacity: 0, depthWrite: false })); s.userData = { life: 0, max: 1, j: 0 }; s.renderOrder = 4; ug.add(s); return s; });
  let puffK = 0;
  /* lights: two cold work lights in the chamber (constant count; intensity 0 when nobody is near) */
  const lights = [[-411, -449, F + 4.6, 70, 26], [-402.5, -442.5, F + 4.6, 70, 26], [-407, -464, -4.5, 40, 16]].map(([x, z, y, I, d]) => { const l = new THREE.PointLight(0xa8ecf0, 0, d, 1.5); l.position.set(x, y, z); l.userData.I = I; root.add(l); return l; });   // in root: the light count never changes
  /* the bulb: cord, socket, glass, filament; a short-range warm light that cannot reach past the corridor */
  const filMat = new THREE.MeshBasicMaterial({ color: 0x111111 }), glassMat = new THREE.MeshStandardMaterial({ color: 0xdfe6e6, roughness: .05, metalness: 0, transparent: true, opacity: .35, emissive: 0x000000 });
  const bulb = new THREE.Group(); bulb.position.copy(BULB); ug.add(bulb);
  { const cord = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, F + 3.4 - BULB.y), new THREE.MeshStandardMaterial({ color: 0x111111 })); cord.position.y = (F + 3.4 - BULB.y) / 2 + .14; bulb.add(cord);
    const sock = new THREE.Mesh(new THREE.CylinderGeometry(.03, .035, .09, 12), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: .4 })); sock.position.y = .1; bulb.add(sock);
    const gl = new THREE.Mesh(new THREE.SphereGeometry(.065, 18, 14), glassMat); gl.scale.y = 1.25; bulb.add(gl);
    const fil = new THREE.Mesh(new THREE.TorusGeometry(.018, .003, 6, 16), filMat); bulb.add(fil); }
  const bulbLight = new THREE.PointLight(0xffc27a, 0, 4.2, 2); bulbLight.position.copy(BULB); root.add(bulbLight);
  /* breaker levers (pivot about the wall's z axis: down = off, up = on) with an indicator lamp each */
  const levers = BRK.map((b) => {
    const piv = new THREE.Group(); piv.position.set(X1 - .4, F + 1.25, b.z); ug.add(piv);
    const armMat = new THREE.MeshStandardMaterial({ color: 0x8a9092, roughness: .4, metalness: .8 });
    for (const dz of [-.12, .12]) { const arm = new THREE.Mesh(new THREE.BoxGeometry(.34, .04, .04), armMat); arm.position.set(-.17, 0, dz); piv.add(arm); }   // two poles
    const grip = new THREE.Mesh(new THREE.BoxGeometry(.1, .08, .34), new THREE.MeshStandardMaterial({ color: 0xd8d2b8, roughness: .5 })); grip.position.x = -.34; piv.add(grip);
    const lampMat = new THREE.MeshBasicMaterial({ color: 0x220806 }), lamp = new THREE.Mesh(new THREE.SphereGeometry(.03, 10, 8), lampMat); lamp.position.set(X1 - .38, F + 1.78, b.z + .16); ug.add(lamp);
    piv.rotation.z = .75; return { piv, lampMat, rot: .75 };
  });
  /* the 開閉自由 double door (each leaf is a moving collider) and the stair shutter that seals the room */
  const leafMat = (t) => new THREE.MeshStandardMaterial({ map: doorTex(t), roughness: .55, metalness: .55 }), edge = new THREE.MeshStandardMaterial({ color: 0x141c22, roughness: .6, metalness: .6 });
  const leaves = [[-408.4, '自由', 1], [-405.6, '開閉', -1]].map(([hx, t, s]) => {
    const hinge = new THREE.Group(); hinge.position.set(hx, F, Z1 + .1); ug.add(hinge);
    const face = leafMat(t), leaf = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.95, .12), [edge, edge, edge, edge, face, face]); leaf.position.set(s * .7, 1.475, 0); hinge.add(leaf);
    return { hinge, leaf, s };
  });
  const shutTex = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#5d6669'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 8) { g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(0, y, w, 2); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, y + 6, w, 2); } noise(g, w, h, 30); for (let i = 0; i < 10; i++) { g.fillStyle = 'rgba(110,60,30,.35)'; g.fillRect(Math.random() * w, Math.random() * h, 4 + Math.random() * 16, 30); } }, { repeat: true });
  shutTex.repeat.set(2, 2);
  const shutter = new THREE.Mesh(new THREE.BoxGeometry(SHAFT[1] - SHAFT[0], 3.3, .12), new THREE.MeshStandardMaterial({ map: shutTex, roughness: .6, metalness: .5 }));
  shutter.position.set(-407, F + 3.3 + 1.65, Z0 - .2); ug.add(shutter);
  /* answer console: screen + three mushroom buttons */
  const scrC = document.createElement('canvas'); scrC.width = 512; scrC.height = 160; const scrT = new THREE.CanvasTexture(scrC); scrT.colorSpace = THREE.SRGBColorSpace;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.4, .44), new THREE.MeshBasicMaterial({ map: scrT, color: new THREE.Color(1.6, 1.6, 1.6) })); scr.position.set(-401.5, F + 1.5, Z0 + .13); ug.add(scr);
  const drawScreen = () => { const g = scrC.getContext('2d'); g.fillStyle = '#04110f'; g.fillRect(0, 0, 512, 160); g.fillStyle = '#5ff0c8'; g.font = 'bold 34px "Yu Gothic","Meiryo",sans-serif'; g.textAlign = 'center'; g.fillText(S.mode === 'clear' ? 'GAME CLEAR' : '解答 ANSWER', 256, 46); g.font = 'bold 54px Arial'; 'ABC'.split('').forEach((c, i) => { g.fillStyle = S.pending === i ? '#ffd24a' : '#5ff0c8'; g.fillText(c, 136 + i * 120, 124); }); scrT.needsUpdate = true; };
  drawScreen();
  const btns = [0, 1, 2].map((i) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(.09, .1, .08, 18), new THREE.MeshStandardMaterial({ color: 0xa8201a, roughness: .35, emissive: 0x000000 })); m.rotation.x = Math.PI / 2; m.position.set(-402.1 + i * .6, F + 1.05, Z0 + .6); ug.add(m); return m; });
  /* other players: four people up to their knees, eyes on their phones */
  const people = [];
  { const spots = [[-412.5, -452.5, .6], [-401.5, -444.5, -2.3], [-410.5, -441, 2.6], [-404, -450.5, -.9]], ids = ['player_f', 'office_lady', 'student', 'punk'], loader = new GLTFLoader();
    let phone = null; const waiting = [];
    loader.load('./models/props/lod/smartphone.glb', (g) => { phone = g.scene; for (const f of waiting) f(); });
    const _ax = new THREE.Vector3(), _pq = new THREE.Quaternion(), _rq = new THREE.Quaternion();
    const bend = (b, axis, a) => { if (!b) return; b.parent.updateWorldMatrix(true, false); b.parent.getWorldQuaternion(_pq); _rq.setFromAxisAngle(axis, a); b.quaternion.premultiply(_pq.clone().invert().multiply(_rq).multiply(_pq)); b.updateMatrixWorld(true); };
    spots.forEach(([x, z, yaw], i) => loader.load(`./models/people/web/${ids[i]}.glb`, (g) => {
      const o = cloneSkinned(g.scene); o.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.frustumCulled = false; } });
      const body = new THREE.Group(); o.rotation.y = -Math.PI / 2; body.add(o); const h = new THREE.Group(); h.add(body); h.position.set(x, F, z); h.rotation.y = yaw; ug.add(h);
      const mx = new THREE.AnimationMixer(o), clip = g.animations.find((c) => /idle|wait|look_around|standing/i.test(c.name)) || g.animations[0];
      const act = mx.clipAction(clip); act.play(); act.time = Math.random() * clip.duration; act.timeScale = .7;
      const bones = {}; o.traverse((b) => { if (b.isBone) bones[b.name] = b; });
      const P0 = { h, mx, bones, base: new THREE.Vector3(x, F, z), seed: Math.random() * 6 };
      const addPhone = () => { const hand = bones.R_Hand; if (!hand || !phone) return; const p = phone.clone(); const bb = new THREE.Box3().setFromObject(p), sz = bb.getSize(new THREE.Vector3()); p.position.sub(bb.getCenter(new THREE.Vector3())); const holder = new THREE.Group(); holder.add(p); holder.scale.setScalar(.15 / Math.max(sz.x, sz.y, sz.z)); const ws = new THREE.Vector3(); hand.getWorldScale(ws); holder.scale.divideScalar(ws.x || 1); holder.position.set(0, .05, .06); hand.add(holder);
        const glow = new THREE.Mesh(new THREE.PlaneGeometry(.06, .11), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.8, 2.1) })); glow.position.set(0, .005, 0); glow.rotation.x = -Math.PI / 2; holder.add(glow); };
      if (phone) addPhone(); else waiting.push(addPhone);
      P0.pose = () => { const lat = _ax.set(1, 0, 0).applyQuaternion(h.getWorldQuaternion(new THREE.Quaternion())).normalize(); bend(bones.R_Upperarm, lat, -.55); bend(bones.R_Forearm, lat, -1.55); bend(bones.Head, lat, .38); bend(bones.Neck, lat, .15); };
      people.push(P0);
    }));
  }
  /* DOM: phone intro, timer HUD, prompt, subtitles, breath, underwater tint, end screen */
  const css = document.createElement('style'); css.textContent = `
  #lbHud{position:fixed;left:50%;top:14px;transform:translateX(-50%);font:600 15px/1.4 "Yu Gothic","Meiryo",sans-serif;color:#dff;background:rgba(4,18,20,.66);border:1px solid #2a5a5c;border-radius:6px;padding:6px 14px;display:none;letter-spacing:.06em;pointer-events:none;z-index:20}
  #lbHud b{color:#ff5a4a} #lbPrompt{position:fixed;transform:translate(-50%,-140%);font:600 13px sans-serif;color:#fff;background:rgba(0,0,0,.6);border:1px solid #888;border-radius:4px;padding:3px 8px;display:none;pointer-events:none;z-index:20}
  #lbMsg{position:fixed;left:50%;bottom:74px;transform:translateX(-50%);font:italic 600 22px "Yu Gothic","Meiryo",sans-serif;color:#fff;text-shadow:0 2px 6px #000;display:none;pointer-events:none;z-index:20;white-space:nowrap}
  #lbPhone{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-4deg);width:270px;height:500px;background:#0b0d10;border-radius:34px;padding:16px;box-shadow:0 20px 60px rgba(0,0,0,.7);display:none;z-index:21;pointer-events:none}
  #lbPhone .s{background:#e9f0ef;border-radius:20px;height:100%;text-align:center;color:#1d3a5a;font-family:"Yu Gothic","Meiryo",sans-serif;padding-top:18px}
  #lbPhone .s div{margin:6px 0} #lbPhone img{width:120px;transform:rotate(-6deg);margin:6px 0} #lbPhone .r{font-size:12px;line-height:1.6;padding:0 14px;color:#2b3b45}
  #lbWater{position:fixed;inset:0;background:radial-gradient(ellipse at 50% 40%,rgba(30,90,92,.55),rgba(4,24,26,.9));display:none;pointer-events:none;z-index:19}
  #lbBreath{position:fixed;left:50%;top:52px;transform:translateX(-50%);width:180px;height:6px;background:rgba(0,0,0,.5);border-radius:3px;display:none;z-index:20} #lbBreath i{display:block;height:100%;background:#8ef;border-radius:3px}
  #lbEnd{position:fixed;inset:0;display:none;align-items:center;justify-content:center;flex-direction:column;z-index:22;font-family:"Yu Gothic","Meiryo",sans-serif;color:#fff;pointer-events:none;letter-spacing:.2em}
  #lbEnd h2{font-size:54px;margin:0} #lbEnd p{font-size:18px;opacity:.85} #lbEnd img{width:150px;margin-top:18px}
  body:not(.playing) #lbHud,body:not(.playing) #lbPrompt,body:not(.playing) #lbMsg,body:not(.playing) #lbBreath{display:none!important}`;
  document.head.appendChild(css);
  const el = (id, html = '') => { const e = document.createElement('div'); e.id = id; e.innerHTML = html; document.body.appendChild(e); return e; };
  const cardURL = cardCanvas().toDataURL();
  const hud = el('lbHud'), prompt = el('lbPrompt'), msg = el('lbMsg'), wet = el('lbWater'), breath = el('lbBreath', '<i></i>'), end = el('lbEnd');
  const phoneEl = el('lbPhone', `<div class="s"><div style="font-weight:700">【GAME】</div><div style="font-size:22px;font-weight:700">難易度</div><img src="${cardURL}"><div style="font-size:20px;font-weight:700">ゲーム「電球」</div><div class="r">ルール：三つのスイッチのうち、<br>電球を点けるものを一つ答えよ。<br>扉は開閉自由。<br>水位が電極に達した時点で、<br>ゲームオーバー。</div></div>`);
  let msgT = 0, phoneT = 0;
  const say = (t, s = 3.2) => { msg.textContent = t; msg.style.display = 'block'; msgT = s; };
  /* interactables: look at it, be close, press E */
  const _v = new THREE.Vector3(), _f = new THREE.Vector3();
  const ITEMS = [
    ...levers.map((lv, i) => ({ p: new THREE.Vector3(X1 - .55, F + 1.3, BRK[i].z), r: 2.1, label: () => `[E] ${S.sw[i] ? '断开' : '合上'}电闸 ${'ABC'[i]}`, act: () => toggle(i) })),
    { p: new THREE.Vector3(-407, F + 1.5, Z1), r: 2.6, label: () => S.doorGoal ? '[E] 关上门' : '[E] 打开门（開閉自由）', act: () => { S.doorGoal = S.doorGoal ? 0 : 1; A?.creak?.(); } },
    { p: BULB, r: 1.9, label: () => '[E] 摸一下电灯泡', act: () => touchBulb() },
    ...btns.map((b, i) => ({ p: b.position, r: 1.9, label: () => S.pending === i ? `[E] 确定答案 ${'ABC'[i]}` : `[E] 选择答案 ${'ABC'[i]}`, act: () => answer(i) })),
  ];
  let focus = null;
  addEventListener('keydown', (e) => { if (e.code !== 'KeyE' || e.repeat || !P?.active || !focus || S.mode !== 'run' || P.pos.distanceTo(focus.p) > focus.r + 1.5) return; focus.act(); });
  function toggle(i) { S.sw[i] = !S.sw[i]; A?.click?.(); }
  function touchBulb() {
    const lit = S.sw[S.correct];
    say(lit ? '电灯泡亮着——烫得缩回了手。' : S.heat > .5 ? '电灯泡没亮，但摸上去很烫。' : S.heat > .16 ? '电灯泡没亮，还有一点余温。' : '电灯泡没亮，冰冷的。', 3.6);
  }
  function answer(i) {
    if (S.pending !== i) { S.pending = i; S.pendT = 4; drawScreen(); say(`答案是 ${'ABC'[i]}？ 再按一次 [E] 确定。`, 3); return; }
    S.pending = -1; drawScreen();
    if (i === S.correct) clear(); else die('elec', '答案错误');
  }
  function start() {
    S.mode = 'run'; S.t = 0; S.level = L0; S.correct = Math.floor(Math.random() * 3); S.sw = [false, false, false]; S.heat = 0; S.breath = BREATH; S.shutterGoal = 1; S.doorGoal = 0; S.pending = -1;
    phoneEl.style.display = 'block'; phoneT = 7; A?.clunk?.(); say('入口被封住了……', 3); drawScreen();
  }
  function clear() { S.mode = 'clear'; S.endT = 0; drawScreen(); A?.chime?.(); showEnd('GAME CLEAR', '♦4「電球」— 正解は ' + 'ABC'[S.correct], true); }
  function die(kind, why) {
    if (S.mode !== 'run') return; S.mode = 'over'; S.endT = 0; S.cause = kind;
    if (kind === 'elec') { A?.zap?.(); flash = 1; }
    showEnd('GAME OVER', kind === 'elec' ? `${why ? why + '　' : ''}感電死` : '溺死', false);
  }
  let flash = 0;
  function showEnd(t, sub, ok) { end.innerHTML = `<h2 style="color:${ok ? '#9ff0d8' : '#ff5a4a'}">${t}</h2><p>${sub}</p>${ok ? `<img src="${cardURL}">` : ''}`; end.style.display = 'flex'; end.style.background = ok ? 'rgba(0,20,18,.35)' : 'rgba(30,0,0,.55)'; }
  function leave() {   // the player is gone (teleported away / left play mode): end the round and hand back a normal player
    if (S.mode !== 'idle' && S.mode !== 'clear') reset();
    focus = null; prompt.style.display = 'none'; msg.style.display = 'none'; msgT = 0; phoneT = 0; phoneEl.style.display = 'none'; hud.style.display = 'none'; wet.style.display = 'none'; breath.style.display = 'none';
    if (P) { P.state.waterY = -Infinity; P.state.speedMul = 1; }
  }
  function reset() {
    S.mode = 'idle'; S.level = L0; S.sw = [false, false, false]; S.door = S.doorGoal = 0; S.shutterGoal = 0; S.jets = 0; S.heat = 0; S.pending = -1;
    end.style.display = 'none'; phoneEl.style.display = 'none'; hud.style.display = 'none'; wet.style.display = 'none'; breath.style.display = 'none'; drawScreen();
  }
  /* underground mood: fog and grade toward teal while the camera is down here */
  let under = 0, baseFog = null, lastFog = null, fogged = false;
  function mood(k) {
    const fog = scene.fog; if (!fog) return;
    if (!baseFog || !lastFog || !fog.color.equals(lastFog.c) || fog.density !== lastFog.d) baseFog = { c: fog.color.clone(), d: fog.density, h: fog.height };   // sky changed the fog: new base
    if (k < .002) { if (!fogged) return; fogged = false; fog.color.copy(baseFog.c); fog.density = baseFog.d; if (fog.height !== undefined) fog.height = baseFog.h; lastFog = { c: fog.color.clone(), d: fog.density }; G?.setUnder?.(0); return; }   // back outside: restore once
    fogged = true; fog.color.copy(baseFog.c).lerp(TEAL, k); fog.density = THREE.MathUtils.lerp(baseFog.d, .028, k); if (fog.height !== undefined) fog.height = THREE.MathUtils.lerp(baseFog.h, 0, k);
    lastFog = { c: fog.color.clone(), d: fog.density }; G?.setUnder?.(k);
  }
  const zoneMeshes = () => K.zoneMeshes.get('bulb_ug') || [];
  function update(dt, t) {
    const cam = camera.position, near = Math.hypot(cam.x + 407, cam.z + 450) < 75 && cam.y < 6;
    ug.visible = near; for (const m of zoneMeshes()) m.visible = near;
    for (const l of lights) l.intensity = near ? l.userData.I * (l === lights[2] || S.mode !== 'over' ? 1 : .4 + .6 * Math.random()) : 0;
    const inBox = cam.x > X0 - 1 && cam.x < X1 + 1 && cam.z > -477 && cam.z < ROOM.z1 + 1 && cam.y < -.3;
    under += ((inBox ? 1 : 0) - under) * Math.min(1, dt * 3); mood(under); A?.drain?.(under, S.level / ELEC, S.jets, S.sw[S.correct] && near ? 1 : 0);
    const inside = P && P.pos.x > X0 - 1 && P.pos.x < X1 + 1 && P.pos.z > Z0 - 1 && P.pos.z < ROOM.z1 + 1 && P.pos.y < F + 6;
    if ((S.mode === 'run' || S.mode === 'over') && P && (!P.active || !inside)) leave();
    if (!near) {
      bulbLight.intensity = 0;
      if (focus || S.mode !== 'idle') { leave(); if (S.mode === 'clear' && P && Math.hypot(P.pos.x + 407, P.pos.z + 450) > 90) reset(); }
      return;
    }
    wu.uTime.value = ju.uTime.value = t;
    /* state machine */
    const pin = P && P.active && P.pos.x > X0 && P.pos.x < X1 && P.pos.z > Z0 + .3 && P.pos.z < ROOM.z1 && P.pos.y < F + 6;
    if (S.mode === 'idle' && pin) start();
    if (S.mode === 'run') {
      S.t += dt; S.level = Math.min(ELEC + .05, L0 + (ELEC - L0) * S.t / T_LIMIT);
      if (S.t >= T_LIMIT) die('elec', '水位が電極に到達');
    } else if (S.mode === 'clear') { S.endT += dt; S.level = Math.max(L0, S.level - dt * .12); if (S.endT > 3) S.shutterGoal = 0; if (S.endT > 6) end.style.display = 'none'; }
    else if (S.mode === 'over') {
      S.endT += dt;
      if (S.endT > 4.5) { reset(); if (P) { P.teleport(new THREE.Vector3(...SPAWN), Math.PI); P.state.waterY = -Infinity; P.state.speedMul = 1; } }
    }
    S.jets += ((S.mode === 'run' || S.mode === 'over' ? 1 : 0) - S.jets) * Math.min(1, dt * (S.mode === 'run' ? .8 : .35));
    if (S.pendT > 0 && (S.pendT -= dt) <= 0) { S.pending = -1; drawScreen(); }
    /* water, jets, spray */
    const wy = F + S.level; water.position.y = wy; ju.uWater.value = wy; ju.uOn.value = S.jets; ju.uLight.value = .8;
    jets.forEach((j, i) => {   // where each throw meets the water now
      let hit = j.pts[j.pts.length - 1]; for (const q of j.pts) if (q.y < wy) { hit = q; break; }
      j.hit.copy(hit); wu.uJet.value[i].set(hit.x, hit.z, S.jets, 0);
    });
    const dp = drops.geometry.attributes.position;
    for (let i = 0; i < ND; i++) {
      dVel[i * 3 + 1] += G9 * dt; dPos[i * 3] += dVel[i * 3] * dt; dPos[i * 3 + 1] += dVel[i * 3 + 1] * dt; dPos[i * 3 + 2] += dVel[i * 3 + 2] * dt;
      if (dPos[i * 3 + 1] < wy) { if (Math.random() < S.jets) respawn(i); else dPos[i * 3 + 1] = F - 5; }
    }
    dp.needsUpdate = true; drops.material.opacity = .75 * S.jets;
    if (S.jets > .05 && (puffK += dt * 26 * S.jets) > 1) {   // spray puffs boiling up where the jets land
      puffK = 0; const s = puffs.find((q) => q.userData.life <= 0); if (s) { const j = jets[Math.floor(Math.random() * jets.length)]; s.position.copy(j.hit).add(new THREE.Vector3((Math.random() - .5) * .8, .1, (Math.random() - .5) * .8)); s.userData.life = s.userData.max = 1.4 + Math.random() * 1.2; s.userData.j = Math.random(); }
    }
    for (const s of puffs) { const u = s.userData; if (u.life <= 0) { s.material.opacity = 0; continue; } u.life -= dt; const k = 1 - u.life / u.max; s.position.y += dt * (.5 + u.j * .4); s.scale.setScalar(.8 + k * 3.2); s.material.opacity = .32 * Math.sin(Math.PI * k) * S.jets; }
    /* door, shutter, levers, bulb */
    S.door += (S.doorGoal - S.door) * Math.min(1, dt * .9); for (const lf of leaves) lf.hinge.rotation.y = lf.s * S.door * 1.62;
    S.shutter += (S.shutterGoal - S.shutter) * Math.min(1, dt * (S.shutterGoal ? 6 : 1.2)); shutter.position.y = F + 1.65 + (1 - S.shutter) * 3.3;
    levers.forEach((lv, i) => { const goal = S.sw[i] ? -.75 : .75; lv.rot += (goal - lv.rot) * Math.min(1, dt * 14); lv.piv.rotation.z = lv.rot; lv.lampMat.color.setRGB(S.sw[i] ? 3 : .14, S.sw[i] ? .4 : .03, S.sw[i] ? .25 : .02); });
    const lit = S.sw[S.correct] && S.mode !== 'idle';
    S.heat += lit ? (1 - S.heat) * dt / 25 : -S.heat * dt / 75;
    const glow = lit ? 1 : Math.min(.35, S.heat * .25);   // a just-switched-off filament still glows faintly
    filMat.color.setRGB(lit ? 9 : glow * 2.4, lit ? 6.5 : glow * .9, lit ? 3 : glow * .2); glassMat.emissive.setRGB(lit ? 1.6 : 0, lit ? 1.2 : 0, lit ? .6 : 0);
    bulbLight.intensity = lit ? 30 : 0;
    /* people bob up as the water rises */
    for (const p of people) { p.mx.update(dt); p.pose?.(); const lift = Math.max(0, S.level - 1.3); p.h.position.y = F + lift + (lift > 0 ? Math.sin(t * 1.3 + p.seed) * .05 : 0); }
    /* the player: water depth, wading speed, breath, prompt */
    if (P && P.active) {
      const inWater = P.pos.x > X0 - .2 && P.pos.x < X1 + .2 && P.pos.z > Z0 - .2 && P.pos.z < ROOM.z1 + .2 && S.mode !== 'idle';
      P.state.waterY = inWater ? wy : -Infinity;
      const depth = inWater ? wy - P.pos.y : 0; P.state.speedMul = depth < .3 ? 1 : depth < .7 ? .75 : depth < 1.1 ? .55 : .5;
      const headUnder = inWater && (P.state.firstPerson ? cam.y < wy : P.pos.y + 1.55 < wy);
      if (S.mode === 'run') { S.breath = headUnder ? S.breath - dt : Math.min(BREATH, S.breath + dt * 2.5); if (S.breath < 0) die('drown'); }
      wet.style.display = cam.y < wy - .02 && under > .5 ? 'block' : 'none';
      breath.style.display = S.mode === 'run' && S.breath < BREATH - .1 ? 'block' : 'none'; breath.firstChild.style.width = Math.max(0, S.breath / BREATH * 100) + '%';
      focus = null;
      if (S.mode === 'run') {
        camera.getWorldDirection(_f); let best = .8;
        for (const it of ITEMS) { const d = P.pos.distanceTo(_v.set(it.p.x, Math.min(it.p.y, P.pos.y + 1.2), it.p.z)); if (d > it.r) continue; const dot = _v.copy(it.p).sub(cam).normalize().dot(_f); if (dot > best) { best = dot; focus = it; } }
      }
      if (focus) { _v.copy(focus.p).project(camera); prompt.style.left = (_v.x + 1) / 2 * innerWidth + 'px'; prompt.style.top = (1 - _v.y) / 2 * innerHeight + 'px'; prompt.textContent = focus.label(); prompt.style.display = _v.z < 1 ? 'block' : 'none'; } else prompt.style.display = 'none';
      if (S.mode === 'run') { const left = Math.max(0, T_LIMIT - S.t), mm = Math.floor(left / 60), ss = Math.floor(left % 60); hud.style.display = 'block'; hud.innerHTML = `♦4 ゲーム「電球」　残り <b>${mm}:${String(ss).padStart(2, '0')}</b>　水位 ${S.level.toFixed(2)} m / 電極 ${ELEC} m`; }
      else hud.style.display = 'none';
    } else { focus = null; prompt.style.display = 'none'; wet.style.display = 'none'; }
    if (phoneT > 0 && (phoneT -= dt) <= 0) phoneEl.style.display = 'none';
    if (msgT > 0 && (msgT -= dt) <= 0) msg.style.display = 'none';
    if (flash > 0) { flash -= dt * 1.4; end.style.background = `rgba(${200 + 55 * flash | 0},${220 * flash | 0},255,${Math.max(.55, flash)})`; }
  }
  // dev: ?bulbshot — wait for the city, walk in, fast-forward, flip the right breaker, open the door; __shot each step
  async function bulbShots() {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms)), shot = async (n) => { try { await window.__shot?.(n); } catch (e) { console.warn(e); } };
    while (document.getElementById('load') || !window.__shot) await wait(500);
    await wait(6000);
    const look = (yaw, pitch = .05) => { P.state.yaw = yaw; P.state.pitch = pitch; };
    const frames = async (n = 3) => { for (let i = 0; i < n; i++) await new Promise((r) => requestAnimationFrame(() => r())); };
    const peek = async (n, p, q) => { camera.position.set(...p); camera.lookAt(...q); camera.updateMatrixWorld(); await shot(n); };   // fixed camera, rendered at once
    P.enter(); P.state.firstPerson = true; P.teleport(new THREE.Vector3(-407, -3.2, -469), Math.PI); await frames(4);
    await peek('lb_0_house', [-400, 5.5, -496], [-407, 1.5, -474]);
    await peek('lb_1_stairs', [-407, -1.6, -471.5], [-407, -9.5, -457]);
    P.teleport(new THREE.Vector3(-407, F + .05, -447), Math.PI); look(Math.PI); await frames(4); phoneEl.style.display = 'none'; await shot('lb_2_start');
    S.t = 55; P.teleport(new THREE.Vector3(-414.5, F + .05, -454.5), Math.PI * 1.25); look(Math.PI * 1.25, -.5); await frames(4); await shot('lb_3_ceiling');
    P.teleport(new THREE.Vector3(-400.8, F + .05, -448.5), -Math.PI / 2); look(-Math.PI / 2, -.05); toggle(S.correct); for (const lv of levers) lv.rot = S.sw[levers.indexOf(lv)] ? -.75 : .75; await frames(4); await shot('lb_4_breakers');
    S.door = S.doorGoal = 1; P.teleport(new THREE.Vector3(-407, F + .05, -444), Math.PI); look(Math.PI, 0); await frames(4); await shot('lb_5_door');
    P.teleport(new THREE.Vector3(-407, F + .05, -431.3), Math.PI); look(Math.PI, -.42); await frames(4); await shot('lb_6_bulb');
    S.t = 150; P.state.firstPerson = false; P.state.dist = 6; P.teleport(new THREE.Vector3(-413, F + .05, -453), Math.PI * 1.25); look(Math.PI * 1.25, .25); await frames(5); await shot('lb_7_overview');
    document.title = 'bulbshot done';
  }
  // dev: ?bulbtest — drive the rules through the debug hooks; each check posts a capture named lbt_<step>_<ok|FAIL>_<detail>
  async function bulbTest() {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms)), frames = async (n = 3) => { for (let i = 0; i < n; i++) await new Promise((r) => requestAnimationFrame(() => r())); };
    const rec = async (step, ok, detail = '') => { try { await window.__shot?.(`lbt_${step}_${ok ? 'ok' : 'FAIL'}_${String(detail).replace(/[^\w-]/g, '').slice(0, 18)}`); } catch (e) { console.warn(e); } };
    while (document.getElementById('load') || !window.__shot) await wait(500);
    await wait(4000);
    const enter = async () => { P.enter(); P.teleport(new THREE.Vector3(-407, F + .05, -447), Math.PI); await frames(3); };
    await enter(); await rec('1start', S.mode === 'run' && S.shutterGoal === 1, S.mode);
    const wrong = (S.correct + 1) % 3;
    toggle(wrong); await frames(2); await rec('2wrongOff', bulbLight.intensity === 0, bulbLight.intensity);
    toggle(wrong); toggle(S.correct); await frames(2); await rec('3lit', bulbLight.intensity > 0, bulbLight.intensity);
    S.heat = .8; toggle(S.correct); await frames(1); touchBulb(); await rec('4warm', /烫/.test(msg.textContent), 'heat' + S.heat.toFixed(2));
    answer(wrong); await rec('5pending', S.pending === wrong && S.mode === 'run', S.pending); answer(wrong); await frames(2); await rec('6wrongAnswer', S.mode === 'over' && S.cause === 'elec', S.mode);
    while (S.mode === 'over') await frames(2);
    await rec('7respawn', S.mode === 'idle' && P.pos.z < -476, 'z' + P.pos.z.toFixed(0));
    await enter(); answer(S.correct); answer(S.correct); await frames(2); await rec('8clear', S.mode === 'clear', S.mode);
    reset(); await enter(); S.breath = .02; S.t = 200; P.teleport(new THREE.Vector3(-407, F + .05, -447), Math.PI); await frames(3); await rec('9drown', S.mode === 'over' && S.cause === 'drown', S.mode + S.cause);
    while (S.mode === 'over') await frames(2);
    await enter(); S.t = T_LIMIT - .01; await frames(3); await rec('10timeup', S.mode === 'over' && S.cause === 'elec', S.mode + S.cause);
    await rec('11levelAtLimit', Math.abs(S.level - ELEC) < .06, S.level.toFixed(2));
    while (S.mode === 'over') await frames(2);
    await enter(); S.t = 120; await frames(2); P.teleport(new THREE.Vector3(-300, .2, -300), 0); await frames(3);
    await rec('12leave', S.mode === 'idle' && S.shutterGoal === 0 && P.state.speedMul === 1 && P.state.waterY === -Infinity, S.mode + S.shutterGoal);
    document.title = 'bulbtest done'; await rec('99done', true);
  }
  return {
    update,
    attach({ player, audio, grade, dayNight }) {
      P = player; A = audio; G = grade; DN = dayNight;
      for (const lf of leaves) player.addDynamicCollider?.(lf.leaf);
      player.addDynamicCollider?.(shutter);
      DN?.interiors?.push([X0 - 1, X1 + 1, -.5, -477, ROOM.z1 + 1, F - 2]);
      if (new URLSearchParams(location.search).has('bulbshot')) bulbShots();   // dev: scripted walk-through with captures
      if (new URLSearchParams(location.search).has('bulbtest')) bulbTest();   // dev: game-logic checks, results posted as capture names
    },
    state: S,
    debug: { toggle, answer, touchBulb, start, reset, die, door: () => { S.doorGoal = S.doorGoal ? 0 : 1; } },
  };
}
export function attachBulb(o) { L?.attach(o); }
