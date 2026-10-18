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
import { cityBuilding } from './buildings.js';
import { prop, loadProps, propColliders, propCount } from './props.js';
import { streetSegment, intersection } from './street.js';

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
    for (let i = 0; i < 40; i++) {   // damp green-black grime running down from sills
      const x = r() * W, y0 = Math.floor(r() * 4) * ch + ch * .78, gr = g.createLinearGradient(0, y0, 0, y0 + ch * (.4 + r()));
      gr.addColorStop(0, `rgba(${40 + r() * 20},${55 + r() * 25},${35},${.25 + r() * .25})`); gr.addColorStop(1, 'rgba(40,50,35,0)');
      g.fillStyle = gr; g.fillRect(x, y0, 2 + r() * 10, ch * 1.2);
    }
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

// leaf-card textures (RGBA cut-outs): a ragged round leaf cluster for tree crowns, a tileable mat for ivy
function leafCluster(seed, tile) {
  const r = K.rng(seed);
  return canvasTex(512, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const N = tile ? 1400 : 1100;
    for (let i = 0; i < N; i++) {
      let x, y;
      if (tile) { x = r() * w; y = r() * h; }
      else { const a = r() * 6.283, d = Math.sqrt(r()) * (w * .46) * (.75 + r() * .25); x = w / 2 + Math.cos(a) * d; y = h / 2 + Math.sin(a) * d; }
      const L = (tile ? 9 : 12) + r() * 10, rot = r() * 6.283, light = r(), shade = tile ? 0 : (y / h) * .35;   // lower leaves darker
      const R_ = 40 + light * 50 - shade * 40, G = 75 + light * 80 - shade * 60, B = 22 + light * 25;
      for (const [ox, oy] of tile ? [[0, 0], [-w, 0], [w, 0], [0, -h], [0, h]] : [[0, 0]]) {
        g.save(); g.translate(x + ox, y + oy); g.rotate(rot);
        g.fillStyle = `rgb(${R_ | 0},${G | 0},${B | 0})`; g.beginPath(); g.ellipse(0, 0, L, L * .45, 0, 0, 6.283); g.fill();
        g.strokeStyle = `rgba(${R_ * .6 | 0},${G * .7 | 0},${B * .6 | 0},.8)`; g.lineWidth = 1; g.beginPath(); g.moveTo(-L, 0); g.lineTo(L, 0); g.stroke();
        g.restore();
      }
    }
  }, { repeat: !!tile });
}
const texCrown = [leafCluster(11), leafCluster(23), leafCluster(37)];
const texIvy = leafCluster(51, true);

let defined = false;
function defineMaterials() {
  if (defined) return; defined = true;
  FACADES.forEach((k, i) => def('fac' + i, facade(k, 101 + i * 17), FAC_TILE));
  def('roof', std({ map: K.texConcrete, color: 0x6c6d6a, roughness: .95 }), 6);
  def('roofG', std({ map: texLeaf, color: 0xa8c08a, roughness: 1 }), 3);
  def('ivy', std({ map: texIvy, color: 0xd8ecc0, roughness: .95, alphaTest: .5, side: THREE.DoubleSide }), 2.5);
  texCrown.forEach((t, i) => def('crown' + i, std({ map: t, color: [0xe0f0c8, 0xd2e8b0, 0xe8ecc0][i], roughness: .9, alphaTest: .45, side: THREE.DoubleSide }), 1));
  def('crownCore', std({ color: 0x1c2e12, roughness: 1 }));
  def('crownP', std({ map: texCrown[1], color: 0x8fae80, roughness: .9, alphaTest: .45, side: THREE.DoubleSide }), 1);   // dark pine needles
  def('leaf', std({ map: texIvy, color: 0xc4dca8, roughness: .95 }), 1.5);
  def('trunk', std({ color: 0x4a3a2c, roughness: 1 }));
  def('road', std({ map: texRoad, color: 0xb8bcc0, roughness: .9 }), 12);
  def('walk', std({ map: K.texConcrete, color: 0x9a9a94, roughness: .9 }), 4);
  def('quay', std({ map: K.texPanel, color: 0x8e9294, roughness: .9 }), 5);
  def('lineW', std({ color: 0xd8d8d0, roughness: .6 }));
  def('lineY', std({ color: 0xd8a820, roughness: .6 }));
  def('grass', std({ map: texLeaf, color: 0x8fb070, roughness: 1 }), 6);
  def('bridgeW', std({ color: 0xe4e6e6, roughness: .5, metalness: .3 }));
  for (const k of ['leaf', 'ivy', 'crown0', 'crown1', 'crown2', 'crownP', 'crownCore']) mats[k].userData.noCollide = true;
}
const mats = K.mats;

/* ───────────── geometry helpers for the city ───────────── */
// broadleaf tree: tapered trunk + branches, crown of crossing leaf cards whose normals point out of the
// crown (so it shades like one soft canopy), and a dark core to stop it looking hollow
const _c = new THREE.Vector3(), _p = new THREE.Vector3();
let treeCount = 0;
function tree(x, z, s = 1, y = 0) {
  treeCount++;
  const r = Math.random, h = (5 + r() * 4) * s, lean = (r() - .5) * .12, la = r() * 6.283;
  const tx = x + Math.cos(la) * lean * h, tz = z + Math.sin(la) * lean * h;   // trunk top
  K.strut('trunk', [x, y, z], [tx, y + h * .62, tz], .26 * s, 5);
  const cy = y + h * .74, rx = (2.2 + r() * 1.3) * s, ry = rx * (.75 + r() * .35);
  for (let i = 0; i < 3; i++) {   // limbs
    const a = la + i * 2.1 + r(), d = rx * (.45 + r() * .3);
    K.strut('trunk', [tx, y + h * (.45 + r() * .15), tz], [tx + Math.cos(a) * d, cy + (r() - .3) * ry * .6, tz + Math.sin(a) * d], .09 * s, 3);
  }
  foliage(tx, cy, tz, rx, ry, 18 + Math.floor(r() * 6), 'crown' + Math.floor(r() * 3), s);
}
// a clump of leaf cards around (x,y,z) with radii rx/ry; normals face out of the clump
export function foliage(x, y, z, rx, ry, n, k = 'crown0', s = 1) {
  const r = Math.random, core = new THREE.IcosahedronGeometry(1, 0); core.scale(rx * .55, ry * .55, rx * .55);
  put('crownCore', core, M4(x, y, z));
  _c.set(x, y, z).applyMatrix4(K.frame);
  const card = Math.min(rx, ry * 1.6);
  for (let i = 0; i < n; i++) {
    const u = r() * 6.283, v = Math.acos(2 * r() - 1), d = .25 + Math.sqrt(r()) * .6;   // fill the volume, not just a shell
    const px = x + Math.sin(v) * Math.cos(u) * rx * d, py = y + Math.cos(v) * ry * d * .9, pz = z + Math.sin(v) * Math.sin(u) * rx * d;
    const sz = card * (1.1 + r() * .6), g = new THREE.PlaneGeometry(sz, sz);
    put(k, g, M4(px, py, pz, r() * 3, r() * 6.283, r() * 3));
    const pos = g.attributes.position, nor = g.attributes.normal;
    for (let j = 0; j < pos.count; j++) { _p.fromBufferAttribute(pos, j).sub(_c); _p.y *= rx / Math.max(.1, ry); _p.normalize(); nor.setXYZ(j, _p.x, _p.y, _p.z); }
  }
}
export function treeStats() { return treeCount; }
export { tree };

// one filler building on a lot (lot centre x,z; footprint w×d; height h) — see buildings.js
function building(x, z, w, d, h, r) { return cityBuilding(x, z, w, d, h, r); }

// abandoned traffic: a few cars stopped mid-lane (local +x along the road), some askew, doors would be open
function strandCars(x, z, ry) {
  const n = Math.random() < .55 ? 1 + Math.floor(Math.random() * 3) : 0;
  withFrame(x, .06, z, ry, () => {
    for (let i = 0; i < n; i++) {
      const lane = (Math.random() < .5 ? -1 : 1) * (2 + Math.random() * 3.5), along = (Math.random() - .5) * 90, dir = lane < 0 ? 0 : Math.PI;
      const m = ['jp_sedan', 'jp_sedan', 'kcar', 'jp_taxi', 'kei_truck', 'jp_sedan'][Math.floor(Math.random() * 6)];
      prop(Math.random() < .04 ? 'city_bus' : m, along, 0, lane, dir + (Math.random() - .5) * .5);
    }
  });
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
  const list = [['Q', 'H', -900, -250, 330, 170], ['K', 'D', -300, -420, 260, 190], ['J', 'C', -620, -720, 300, 160], ['K', 'S', -200, 120, 380, 210], ['K', 'S', -1150, 80, 260, 150], ['Q', 'D', 150, -500, 340, 230], ['J', 'S', -1350, -600, 250, 180], ['Q', 'S', -800, 250, 280, 175], ['J', 'H', 60, -250, 300, 200], ['Q', 'C', -400, -900, 260, 185], ['J', 'D', -1000, -650, 300, 165]];
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
  texWaterN.repeat.set(1100, 1100);   // ~8 m ripple tiles
  const water = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshStandardMaterial({ color: 0x24465c, roughness: .07, metalness: .2, normalMap: texWaterN, normalScale: new THREE.Vector2(.22, .22) }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, WATER_Y, 0); scene.add(water);
  updates.push((dt) => { texWaterN.offset.x += dt * .03; texWaterN.offset.y += dt * .018; });

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
  const nearCompound = (x, z, pad = 0) => Math.abs(x) < 135 + pad && Math.abs(z - 10) < 135 + pad;   // keep the night compound's apron open
  const roadOK = (x, z) => onLand(x, z) && !inDistrict(x, z, -6) && !nearCompound(x, z);
  const segs = new Set();
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) {
    const x = GRID_X0 + i * BLOCK, z = GRID_Z0 + j * BLOCK;
    setZone(`city_${Math.floor((x - GRID_X0) / 220)}_${Math.floor((z - GRID_Z0) / 220)}`);
    // a segment is kept when its middle is clear; ends may run up to a district edge
    if (roadOK(x + BLOCK / 2, z) && onLand(x, z) && onLand(x + BLOCK, z)) {   // E-W segment
      box('road', BLOCK, .06, ROAD_W, x + BLOCK / 2, .03, z);
      for (let s = 6; s < BLOCK - 4; s += 8) box('lineW', 3, .02, .18, x + s, .07, z);
      strandCars(x + BLOCK / 2, z, 0);
      streetSegment(x + BLOCK / 2, z, 0, BLOCK, ROAD_W); segs.add(`h${i},${j}`);
    }
    if (roadOK(x, z + BLOCK / 2) && onLand(x, z) && onLand(x, z + BLOCK)) {   // N-S segment
      box('road', ROAD_W, .06, BLOCK, x, .031, z + BLOCK / 2);
      for (let s = 6; s < BLOCK - 4; s += 8) box('lineW', .18, .02, 3, x, .071, z + s);
      strandCars(x, z + BLOCK / 2, -Math.PI / 2);
      streetSegment(x, z + BLOCK / 2, -Math.PI / 2, BLOCK, ROAD_W); segs.add(`v${i},${j}`);
    }
  }

  for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) {   // intersections: arms +x, −z, −x, +z
    const arms = [segs.has(`h${i},${j}`), segs.has(`v${i},${j - 1}`), segs.has(`h${i - 1},${j}`), segs.has(`v${i},${j}`)];
    if (arms.filter(Boolean).length < 2) continue;
    const x = GRID_X0 + i * BLOCK, z = GRID_Z0 + j * BLOCK;
    setZone(`city_${Math.floor((x - GRID_X0) / 220)}_${Math.floor((z - GRID_Z0) / 220)}`);
    box('road', ROAD_W, .061, ROAD_W, x, .032, z);
    intersection(x, z, arms, ROAD_W);
  }

  // filler blocks: sidewalk slab + 1–9 buildings + street trees
  const inner = BLOCK - ROAD_W;
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const cx = GRID_X0 + i * BLOCK + BLOCK / 2, cz = GRID_Z0 + j * BLOCK + BLOCK / 2;
    setZone(`city_${Math.floor((cx - GRID_X0) / 220)}_${Math.floor((cz - GRID_Z0) / 220)}`);
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [cx + a * inner / 2, cz + b * inner / 2]);
    if (!corners.every(([x, z]) => onLand(x, z))) continue;
    if (inDistrict(cx, cz, inner / 2 - 4) || corners.some(([x, z]) => inDistrict(x, z, 2))) continue;
    if (nearCompound(cx, cz, inner / 2)) continue;
    const park = R() < .07;
    box(park ? 'grass' : 'walk', inner, .12, inner, cx, .06, cz);
    if (park) { for (let k = 0; k < 40; k++) tree(cx + (R() - .5) * (inner - 8), cz + (R() - .5) * (inner - 8), .8 + R() * .7, .12); continue; }
    const sx = 2 + Math.floor(R() * 3), sz = 2 + Math.floor(R() * 3), lw = (inner - 8) / sx, ld = (inner - 8) / sz;   // 15–39 m lots
    for (let a = 0; a < sx; a++) for (let b = 0; b < sz; b++) {
      if (R() < .08) continue;
      const bx = cx - (inner - 8) / 2 + lw * (a + .5), bz = cz - (inner - 8) / 2 + ld * (b + .5);
      const w = lw - 2 - R() * 3, d = ld - 2 - R() * 3;
      if (underExpress(bx, bz, Math.max(w, d) / 2 + 2)) continue;
      building(bx, bz, w, d, heightAt(bx, bz, R), R);
    }
    for (let s = -inner / 2 + 4; s < inner / 2; s += 16) { tree(cx + s, cz - inner / 2 + 2, .9, .12); tree(cx + s, cz + inner / 2 - 2, .9, .12); }
    // corner clutter: vending clusters, parked bikes / scooters, post box
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const px = cx + sx * (inner / 2 - 1.4), pz = cz + sz * (inner / 2 - 5);
      if (R() < .35) for (let k = 0; k < 1 + Math.floor(R() * 3); k++) prop('vending', px, .12, pz - sz * k * 1.2, sx > 0 ? Math.PI : 0);
      else if (R() < .5) for (let k = 0; k < 2 + Math.floor(R() * 5); k++) prop(R() < .8 ? 'bicycle' : 'scooter', cx + sx * (inner / 2 - 6 - k * .65), .12, cz + sz * (inner / 2 - 1.3), Math.PI / 2 + (R() - .5) * .2, 1, R() < .15 ? Math.PI / 2 * .95 : 0);
      else if (R() < .2) prop('postbox', px, .12, pz, 0);
    }
  }

  // hero districts
  const ctx = { THREE, K, cards, map, scene, camera, updates, pois, collidables, dayNight, tree, prop };
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
  const pc = propColliders(); if (pc) { scene.add(pc); collidables.push(pc); }
  loadProps(scene, camera, updates); console.log('props', propCount());
  return { collidables, updates, pois, dayNight };
}
