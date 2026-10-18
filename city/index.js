// The city around the night compound: land + bay, quay walls, street grid, overgrown filler blocks,
// street trees, card airships, and the hero districts (one module each, see DISTRICT_MODULES).
import * as THREE from 'three';
import * as K from '../kit.js';
import * as cards from './cards.js';
import * as map from './map.js';
import { COAST, WATER_Y, BLOCK, ROAD_W, GRID_X0, GRID_Z0, inDistrict, onLand, underExpress } from './map.js';
import * as port from './port.js';
import * as arena from './arena.js';
import * as prison from './prison.js';
import * as tokyotower from './tokyotower.js';
import * as palace from './palace.js';
import * as diamond from './diamond.js';
import * as clubs from './clubs.js';
import * as hearts from './hearts.js';
import * as shibuya from './shibuya.js';
import * as fire from './fire.js';

const DISTRICT_MODULES = { port, arena, prison, tokyotower, palace, diamond, clubs, hearts, shibuya, fire };
const { box, cyl, sph, plane, put, strut, beacon, M4, withFrame, setZone, canvasTex, noise, def, std } = K;

/* ───────────── city materials ───────────── */
// facade atlas tiles are 4 bays × 4 floors of 3.5 m; the emissive twin holds lit windows for night
const FLOOR = 3.5, FAC_TILE = 14;
function facade(kind, seed) {
  const r = K.rng(seed), W = 256, H = 256, cw = W / 4, ch = H / 4;
  const base = { conc: '#9b9c98', glass: '#4c5a66', tile: '#c9c2b2', dark: '#5f5852', white: '#d8d8d2' }[kind];
  const day = canvasTex(W, H, (g) => {
    g.fillStyle = base; g.fillRect(0, 0, W, H); noise(g, W, H, 26);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const x = i * cw, y = j * ch;
      if (kind === 'glass') { g.fillStyle = `rgb(${50 + r() * 30},${70 + r() * 30},${88 + r() * 30})`; g.fillRect(x + 2, y + 2, cw - 4, ch - 8); g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(x + 2, y + 2, cw * .4, ch - 8); }
      else if (kind === 'conc') { g.fillStyle = '#2a3036'; g.fillRect(x, y + ch * .3, cw, ch * .42); g.fillStyle = 'rgba(160,190,210,.25)'; g.fillRect(x, y + ch * .3, cw, ch * .12); }
      else { g.fillStyle = '#23292f'; g.fillRect(x + cw * .22, y + ch * .22, cw * .56, ch * .55); g.fillStyle = 'rgba(170,200,220,.2)'; g.fillRect(x + cw * .22, y + ch * .22, cw * .56, ch * .14); if (kind === 'dark') { g.fillStyle = '#3e3832'; g.fillRect(x, y + ch * .78, cw, ch * .08); } }
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x, y + ch - 3, cw, 3);
    }
    // decay: rust / water streaks and creeping moss from the top and bottom
    for (let i = 0; i < 26; i++) { const x = r() * W, gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(40,30,20,.35)'); gr.addColorStop(1, 'rgba(40,30,20,0)'); g.fillStyle = gr; g.fillRect(x, 0, 2 + r() * 6, H * r()); }
    for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(${50 + r() * 30},${80 + r() * 50},${30 + r() * 20},${.25 + r() * .5})`; const x = r() * W, y = r() < .5 ? r() * 40 : H - r() * 30; g.beginPath(); g.ellipse(x, y, 3 + r() * 14, 3 + r() * 20, 0, 0, 7); g.fill(); }
  }, { repeat: true });
  const glow = canvasTex(W, H, (g) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      if (r() > .36) continue;
      const warm = r() < .7; g.fillStyle = warm ? `rgb(255,${190 + r() * 40},${120 + r() * 40})` : 'rgb(190,225,255)';
      const x = i * cw, y = j * ch;
      if (kind === 'conc') g.fillRect(x + 2, y + ch * .32, cw - 4, ch * .38); else if (kind === 'glass') g.fillRect(x + 3, y + 3, cw - 6, ch - 10); else g.fillRect(x + cw * .24, y + ch * .24, cw * .52, ch * .5);
    }
  }, { repeat: true });
  const m = std({ map: day, emissiveMap: glow, emissive: 0xffffff, emissiveIntensity: 0, roughness: kind === 'glass' ? .25 : .85, metalness: kind === 'glass' ? .6 : .05 });
  m.userData.nightGlow = kind === 'glass' ? .9 : 1.1;
  return m;
}
const FACADES = ['conc', 'glass', 'tile', 'dark', 'white', 'conc'];
const texLeaf = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#3d5a2a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(${30 + Math.random() * 60},${70 + Math.random() * 70},${20 + Math.random() * 30},.8)`; g.fillRect(Math.random() * w, Math.random() * h, 3, 3); } }, { repeat: true });
const texRoad = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#34373b'; g.fillRect(0, 0, w, h); noise(g, w, h, 30); for (let i = 0; i < 30; i++) { g.strokeStyle = `rgba(0,0,0,${Math.random() * .3})`; g.beginPath(); g.moveTo(Math.random() * w, Math.random() * h); g.lineTo(Math.random() * w, Math.random() * h); g.stroke(); } for (let i = 0; i < 25; i++) { g.fillStyle = 'rgba(70,100,40,.5)'; g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 10, 1 + Math.random() * 3); } }, { repeat: true });
const texWaterN = canvasTex(512, 512, (g, w, h) => {   // tileable ripple normal map
  const id = g.createImageData(w, h), d = id.data, P = Math.PI * 2;
  const waves = Array.from({ length: 9 }, () => [Math.ceil(Math.random() * 6) * (Math.random() < .5 ? -1 : 1), Math.ceil(Math.random() * 6), Math.random() * P, .3 + Math.random()]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let nx = 0, ny = 0;
    for (const [a, b, ph, amp] of waves) { const c = Math.cos(P * (a * x / w + b * y / h) + ph) * amp; nx += c * a; ny += c * b; }
    const i = (y * w + x) * 4; d[i] = 128 + nx * 5; d[i + 1] = 128 + ny * 5; d[i + 2] = 255; d[i + 3] = 255;
  }
  g.putImageData(id, 0, 0);
}, { srgb: false, repeat: true });

let defined = false;
function defineMaterials() {
  if (defined) return; defined = true;
  FACADES.forEach((k, i) => def('fac' + i, facade(k, 101 + i * 17), FAC_TILE));
  def('roof', std({ map: K.texConcrete, color: 0x6c6d6a, roughness: .95 }), 6);
  def('roofG', std({ map: texLeaf, color: 0xa8c08a, roughness: 1 }), 3);
  def('ivy', std({ map: texLeaf, color: 0x9fbf80, roughness: 1 }), 2);
  def('leaf', std({ map: texLeaf, color: 0xb6d090, roughness: 1, flatShading: true }), 3);
  def('trunk', std({ color: 0x4a3a2c, roughness: 1 }));
  def('road', std({ map: texRoad, color: 0xb8bcc0, roughness: .9 }), 12);
  def('walk', std({ map: K.texConcrete, color: 0x9a9a94, roughness: .9 }), 4);
  def('quay', std({ map: K.texPanel, color: 0x8e9294, roughness: .9 }), 5);
  def('lineW', std({ color: 0xd8d8d0, roughness: .6 }));
  def('lineY', std({ color: 0xd8a820, roughness: .6 }));
  def('grass', std({ map: texLeaf, color: 0x8fb070, roughness: 1 }), 6);
  def('bridgeW', std({ color: 0xe4e6e6, roughness: .5, metalness: .3 }));
  mats.leaf.userData.noCollide = true;
}
const mats = K.mats;

/* ───────────── geometry helpers for the city ───────────── */
function tree(x, z, s = 1, y = 0) {
  const h = (4 + Math.random() * 3) * s;
  put('trunk', new THREE.CylinderGeometry(.18 * s, .28 * s, h * .55, 5), M4(x, y + h * .27, z));
  const g = new THREE.IcosahedronGeometry(1, 0); g.scale(2.4 * s, 2 * s * (1 + Math.random() * .4), 2.4 * s);
  put('leaf', g, M4(x, y + h * .7, z, 0, Math.random() * 3, 0));
  if (Math.random() < .5) { const g2 = new THREE.IcosahedronGeometry(1, 0); g2.scale(1.6 * s, 1.5 * s, 1.6 * s); put('leaf', g2, M4(x + (Math.random() - .5) * 2 * s, y + h * .95, z + (Math.random() - .5) * 2 * s)); }
}
export { tree };

// one filler building on a lot (lot centre x,z; footprint w×d; height h)
function building(x, z, w, d, h, r) {
  const fk = 'fac' + Math.floor(r() * FACADES.length);
  const floors = Math.max(1, Math.round(h / FLOOR)); h = floors * FLOOR;
  box(fk, w, h, d, x, h / 2 + .12, z);
  const green = r() < .35;
  box(green ? 'roofG' : 'roof', w + .4, .5, d + .4, x, h + .37, z);
  if (h > 30 && r() < .55) {   // setback crown
    const w2 = w * (.5 + r() * .3), d2 = d * (.5 + r() * .3), h2 = FLOOR * (2 + Math.floor(r() * 5));
    box(fk, w2, h2, d2, x, h + .62 + h2 / 2, z); box('roof', w2 + .3, .4, d2 + .3, x, h + .62 + h2 + .2, z);
  }
  if (!green && r() < .5) for (let i = 0; i < 1 + r() * 3; i++) box('steelL', 2 + r() * 2, 1.4, 1.6 + r(), x + (r() - .5) * (w - 4), h + 1.3, z + (r() - .5) * (d - 4));
  if (green) for (let i = 0; i < Math.min(6, w * d / 120); i++) tree(x + (r() - .5) * (w - 4), z + (r() - .5) * (d - 4), .7 + r() * .4, h + .6);
  // ivy curtains climbing the facades
  const nIvy = r() < .55 ? 1 + Math.floor(r() * 4) : 0;
  for (let i = 0; i < nIvy; i++) {
    const side = Math.floor(r() * 4), ih = h * (.25 + r() * .75), iw = 2 + r() * Math.min(10, (side % 2 ? d : w) * .5);
    const along = (r() - .5) * ((side % 2 ? d : w) - iw);
    if (side === 0) box('ivy', iw, ih, .5, x + along, ih / 2 + .1, z + d / 2 + .2);
    else if (side === 1) box('ivy', .5, ih, iw, x + w / 2 + .2, ih / 2 + .1, z + along);
    else if (side === 2) box('ivy', iw, ih, .5, x + along, ih / 2 + .1, z - d / 2 - .2);
    else box('ivy', .5, ih, iw, x - w / 2 - .2, ih / 2 + .1, z + along);
  }
}

// height falloff: tallest around the business core west of the palace, low near the docks
function heightAt(x, z, r) {
  const core = Math.exp(-(((x + 380) / 520) ** 2 + ((z + 380) / 480) ** 2));
  const base = 10 + core * 70;
  return Math.max(7, base * (.45 + r() * .9) + (r() < .06 ? 40 + core * 60 : 0));
}

/* ───────────── airships with hanging card banners ───────────── */
function airships(scene, updates) {
  const body = new THREE.MeshStandardMaterial({ color: 0xc9ccd0, roughness: .35, metalness: .75 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2c3036, roughness: .5, metalness: .6 });
  const list = [['Q', 'H', -900, -250, 330, 170], ['K', 'D', -300, -420, 260, 190], ['J', 'C', -620, -720, 300, 160], ['K', 'S', -200, 120, 380, 210], ['K', 'S', -1150, 80, 260, 150], ['10', 'D', 150, -500, 340, 230]];
  list.forEach(([rk, st, cx, cz, R, y], i) => {
    const g = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), body); hull.scale.set(26, 6.5, 6.5); g.add(hull);
    for (let k = 0; k < 4; k++) { const fin = new THREE.Mesh(new THREE.BoxGeometry(7, .3, 5), body); fin.position.x = -22; fin.rotation.x = k * Math.PI / 2; fin.translateY(0); fin.geometry.translate(0, 0, 4.5); g.add(fin); }
    for (let k = -2; k <= 2; k++) { const rib = new THREE.Mesh(new THREE.TorusGeometry(6.4 * Math.sqrt(1 - (k * 8 / 26) ** 2), .08, 6, 40), dark); rib.position.x = k * 8; rib.rotation.y = Math.PI / 2; g.add(rib); }
    const gond = new THREE.Mesh(new THREE.BoxGeometry(9, 2.4, 3), dark); gond.position.y = -7.4; g.add(gond);
    const card = new THREE.Mesh(new THREE.PlaneGeometry(14, 21), cards.cardMaterial(rk, st)); card.position.set(0, -21, 0); g.add(card);
    for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 4.6), dark); c.position.set(s * 6.5, -8.6, 0); g.add(c); }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(15, .35, .35), dark); bar.position.y = -10.7; g.add(bar);
    const blink = new THREE.Mesh(new THREE.SphereGeometry(.4, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, .2, .1) })); blink.position.set(-26, 0, 0); g.add(blink);
    g.traverse((o) => { o.castShadow = true; });
    scene.add(g);
    const w = (i % 2 ? 1 : -1) * (.012 + i * .002), ph = i * 1.7;
    updates.push((dt, t) => {
      const a = ph + t * w; g.position.set(cx + Math.cos(a) * R, y + Math.sin(t * .3 + i) * 3, cz + Math.sin(a) * R);
      g.rotation.y = -a + (w > 0 ? -Math.PI / 2 : Math.PI / 2); card.rotation.y = Math.sin(t * .5 + i) * .25;
      blink.visible = (t + i) % 1.4 < .2;
    });
  });
}

/* ───────────── expressway spurs + Rainbow Bridge + Odaiba-like island ───────────── */
function expressway(x1, z1, x2, z2, y = 27, w = 30) {   // same section as main.js highway(), no traffic
  const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz);
  withFrame((x1 + x2) / 2, 0, (z1 + z2) / 2, K.ang(dx, dz), () => {
    box('hwy', L, 2.6, w, 0, y, 0); box('steel', L, .4, w + .6, 0, y - 1.5, 0);
    for (const s of [-1, 1]) { box('conc', L, 1.1, .5, 0, y + 1.8, s * (w / 2 - .25)); box('glowY', L, .06, .1, 0, y + 1.2, s * (w / 2 - .6)); }
    box('conc', L, .8, .4, 0, y + 1.7, 0);
    const n = Math.floor(L / 30);
    for (let i = 0; i <= n; i++) { const s = -L / 2 + i * L / n; box('hwy', 4.2, y - 1.4, 4.4, s, (y - 1.4) / 2, 0); box('hwy', 6, 1.4, w - 6, s, y - 2, 0); }
    for (let s = -L / 2 + 15; s < L / 2; s += 30) for (const t of [-1, 1]) { box('steel', .2, 6, .2, s, y + 4.5, t * (w / 2 - .5)); box('glow', .8, .1, 1.6, s, y + 7.6, t * (w / 2 - 1.3)); }
  });
}
function rainbowBridge() {
  const { x1, x2, z, y, towers } = map.BRIDGE, w = 30, L = x2 - x1, top = 128;
  setZone('bridge');
  withFrame((x1 + x2) / 2, 0, z, 0, () => {
    box('hwy', L, 2.4, w, 0, y, 0); box('steelL', L, 3.2, 3, 0, y - 2.6, w / 2 - 1.5); box('steelL', L, 3.2, 3, 0, y - 2.6, -w / 2 + 1.5);
    for (const s of [-1, 1]) { box('bridgeW', L, 1.2, .5, 0, y + 1.8, s * (w / 2 - .25)); box('glowC', L, .06, .1, 0, y + 1.2, s * (w / 2 - .6)); }
    for (let s = -L / 2 + 20; s < L / 2; s += 40) for (const t of [-1, 1]) { box('steel', .2, 7, .2, s, y + 4.5, t * (w / 2 - .5)); box('glow', .8, .1, 1.6, s, y + 8, t * (w / 2 - 1.3)); }
    // anchorage piers
    for (const sx of [-L / 2 + 10, L / 2 - 10]) box('quay', 24, y - map.WATER_Y + 4, w + 6, sx, (y + map.WATER_Y - 4) / 2, 0);
    const tx = towers.map((t) => t - (x1 + x2) / 2);
    for (const t of tx) {   // white portal towers with cross beams
      for (const s of [-1, 1]) box('bridgeW', 6, top - map.WATER_Y, 5, t, (top + map.WATER_Y) / 2, s * (w / 2 + 3));
      for (const hh of [y - 6, 70, 104, top - 4]) box('bridgeW', 5, 5, w + 11, t, hh, 0);
      box('quay', 16, 8, w + 18, t, map.WATER_Y + 2, 0);
      for (const s of [-1, 1]) beacon(t, top + 1.5, s * (w / 2 + 3), 1);
    }
    // main cables (catenary between tower tops, back-stays to the anchorages) + suspenders
    for (const s of [-1, 1]) {
      const zc = s * (w / 2 + 3), cab = (xa, xb, ya, yb, sag) => {
        const N = 24, pts = [];
        for (let i = 0; i <= N; i++) { const u = i / N, xx = xa + (xb - xa) * u; pts.push([xx, ya + (yb - ya) * u - sag * 4 * u * (1 - u), zc]); }
        for (let i = 0; i < N; i++) strut('steelL', pts[i], pts[i + 1], .55, 6);
        return (xx) => { const u = (xx - xa) / (xb - xa); return ya + (yb - ya) * u - sag * 4 * u * (1 - u); };
      };
      const mid = cab(tx[0], tx[1], top, top, top - y - 6);
      cab(-L / 2 + 10, tx[0], y + 3, top, 12); cab(tx[1], L / 2 - 10, top, y + 3, 12);
      for (let xx = tx[0] + 12; xx < tx[1] - 6; xx += 12) strut('steel', [xx, mid(xx), zc], [xx, y + 1.5, s * (w / 2 - .2)], .08, 4);
    }
  });
  setZone('island');   // Odaiba-like island at the far end
  const I = map.ISLAND, r = K.rng(4242);
  box('quay', I.x1 - I.x0, 6, I.z1 - I.z0, (I.x0 + I.x1) / 2, -2.94, (I.z0 + I.z1) / 2);
  box('walk', I.x1 - I.x0 - 4, .12, I.z1 - I.z0 - 4, (I.x0 + I.x1) / 2, .06, (I.z0 + I.z1) / 2);
  expressway(x2 - 20, z, I.x0 + 60, z, y, 30); box('road', 140, .06, 16, I.x0 + 130, .14, z);
  // ramp down from the bridge deck
  for (let i = 0; i < 12; i++) { const yy = y - (i + .5) * y / 12; box('hwy', 10, 1, 16, I.x0 + 65 + i * 10, Math.max(.5, yy) - .5, z + 0, 0, Math.atan2(y / 12, 10)); }
  for (let gx = I.x0 + 30; gx < I.x1 - 30; gx += 55) for (let gz = I.z0 + 30; gz < I.z1 - 30; gz += 55) {
    if (Math.abs(gz - z) < 30) continue;
    if (r() < .2) { for (let k = 0; k < 8; k++) tree(gx + (r() - .5) * 40, gz + (r() - .5) * 40, 1, .12); continue; }
    building(gx, gz, 26 + r() * 14, 26 + r() * 14, 12 + r() * 50, r);
  }
  // the dome-topped TV building silhouette (Fuji TV-ish)
  withFrame(I.x0 + 260, 0, I.z0 + 120, 0, () => {
    for (const s of [-1, 1]) box('fac1', 14, 90, 50, s * 22, 45, 0);
    for (const hh of [30, 60, 88]) box('steelL', 58, 4, 50, 0, hh, 0);
    sph('pipeG', 16, 0, 72, 0);
  });
}

/* ───────────── build ───────────── */
export function buildCity({ scene, camera }) {
  defineMaterials();
  const updates = [], pois = [], collidables = [], dayNight = [];
  const R = K.rng(777);

  // land slab (sits just under the compound's wet-asphalt + reflector plane)
  const shape = new THREE.Shape(COAST.map(([x, z]) => new THREE.Vector2(x, -z)));
  const landGeo = new THREE.ShapeGeometry(shape); landGeo.rotateX(-Math.PI / 2);
  const uv = landGeo.attributes.uv, pos = landGeo.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / 8, pos.getZ(i) / 8);
  const land = new THREE.Mesh(landGeo, std({ map: K.texConcrete, color: 0x6f716e, roughness: .95 })); land.position.y = -.08; land.receiveShadow = true; scene.add(land); collidables.push(land);

  // bay
  texWaterN.repeat.set(160, 160);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshStandardMaterial({ color: 0x24465c, roughness: .07, metalness: .2, normalMap: texWaterN, normalScale: new THREE.Vector2(.35, .35) }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, WATER_Y, 0); scene.add(water);
  updates.push((dt) => { texWaterN.offset.x += dt * .004; texWaterN.offset.y += dt * .0025; });

  // quay walls along the coastline
  setZone('quay');
  for (let i = 0; i < COAST.length; i++) {
    const [x1, z1] = COAST[i], [x2, z2] = COAST[(i + 1) % COAST.length];
    if (x1 === -1650 && x2 === -1650) continue;
    const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz);
    withFrame((x1 + x2) / 2, 0, (z1 + z2) / 2, K.ang(dx, dz), () => {
      box('quay', L + 3, -WATER_Y + 3, 3, 0, (WATER_Y - 3) / 2 + 0, 0);
      box('lineY', L, .12, .3, 0, .06, 0);
      for (let s = -L / 2 + 6; s < L / 2; s += 18) cyl('steel', .35, .8, s, .4, 0, 0, 0, 0, 10);
    });
  }

  // streets: grid of road segments on land, skipped inside hero districts and the compound area
  const nx = Math.ceil((330 - GRID_X0) / BLOCK), nz = Math.ceil((420 - GRID_Z0) / BLOCK);
  const roadOK = (x, z) => onLand(x, z) && !inDistrict(x, z, -6) && !(Math.abs(x) < 300 && Math.abs(z) < 300);
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) {
    const x = GRID_X0 + i * BLOCK, z = GRID_Z0 + j * BLOCK;
    setZone(`city_${Math.floor((x - GRID_X0) / 440)}_${Math.floor((z - GRID_Z0) / 440)}`);
    // a segment is kept when its middle is clear; ends may run up to a district edge
    if (roadOK(x + BLOCK / 2, z) && onLand(x, z) && onLand(x + BLOCK, z)) {   // E-W segment
      box('road', BLOCK, .06, ROAD_W, x + BLOCK / 2, .03, z);
      for (let s = 6; s < BLOCK - 4; s += 8) box('lineW', 3, .02, .18, x + s, .07, z);
    }
    if (roadOK(x, z + BLOCK / 2) && onLand(x, z) && onLand(x, z + BLOCK)) {   // N-S segment
      box('road', ROAD_W, .06, BLOCK, x, .031, z + BLOCK / 2);
      for (let s = 6; s < BLOCK - 4; s += 8) box('lineW', .18, .02, 3, x, .071, z + s);
    }
  }

  // filler blocks: sidewalk slab + 1–9 buildings + street trees
  const inner = BLOCK - ROAD_W;
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const cx = GRID_X0 + i * BLOCK + BLOCK / 2, cz = GRID_Z0 + j * BLOCK + BLOCK / 2;
    setZone(`city_${Math.floor((cx - GRID_X0) / 440)}_${Math.floor((cz - GRID_Z0) / 440)}`);
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [cx + a * inner / 2, cz + b * inner / 2]);
    if (!corners.every(([x, z]) => onLand(x, z))) continue;
    if (inDistrict(cx, cz, inner / 2 - 4) || corners.some(([x, z]) => inDistrict(x, z, 2))) continue;
    if (Math.abs(cx) < 330 && Math.abs(cz) < 330) continue;   // compound / port / expressway apron
    const park = R() < .07;
    box(park ? 'grass' : 'walk', inner, .12, inner, cx, .06, cz);
    if (park) { for (let k = 0; k < 40; k++) tree(cx + (R() - .5) * (inner - 8), cz + (R() - .5) * (inner - 8), .8 + R() * .7, .12); continue; }
    const sx = 1 + Math.floor(R() * 3), sz = 1 + Math.floor(R() * 3), lw = (inner - 8) / sx, ld = (inner - 8) / sz;
    for (let a = 0; a < sx; a++) for (let b = 0; b < sz; b++) {
      if (R() < .08) continue;
      const bx = cx - (inner - 8) / 2 + lw * (a + .5), bz = cz - (inner - 8) / 2 + ld * (b + .5);
      const w = lw - 3 - R() * 6, d = ld - 3 - R() * 6;
      if (underExpress(bx, bz, Math.max(w, d) / 2 + 2)) continue;
      building(bx, bz, w, d, heightAt(bx, bz, R), R);
    }
    for (let s = -inner / 2 + 4; s < inner / 2; s += 16) { tree(cx + s, cz - inner / 2 + 2, .9, .12); tree(cx + s, cz + inner / 2 - 2, .9, .12); }
  }

  // hero districts
  const ctx = { THREE, K, cards, map, scene, camera, updates, pois, collidables, dayNight, tree };
  for (const d of map.DISTRICTS) {
    const mod = DISTRICT_MODULES[d.id]; if (!mod) continue;
    try { setZone(d.id); mod.build(ctx, d); } catch (e) { console.error('district failed', d.id, e); }
  }
  setZone('compound');

  setZone('express');
  expressway(-100, -700, -100, -105); expressway(-500, -700, 300, -700); box('hwy', 30, 2.6, 30, -100, 27, -700);
  rainbowBridge();
  setZone('compound');
  airships(scene, updates);
  return { collidables, updates, pois, dayNight };
}
