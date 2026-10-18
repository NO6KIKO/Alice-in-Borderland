// Queen of Hearts tower (P6): an ivy-draped white-stone tower (~85 m) with a framed Q♥ mural on its south-east
// face, standing in a small overgrown plaza. The roof is a walled croquet garden: balustraded parapet with
// ball-topped posts, striped lawn with hoops & stakes, white-rose planters, cone topiaries in urns, rose arch,
// domed iron gazebo with a laid tea table, mallet rack, stair house, AC units and an external service walkway.
// Warm lanterns + festoon bulbs light the lawn at night.
import * as THREE from 'three';
import { tree as cityTree } from './index.js';
import * as K from '../kit.js';

const { box, cyl, plane, put, M4, withFrame, def, std, canvasTex, noise, fpos, ang, strut, torus } = K;
const H = 84, TW = 46, TD = 38, RY = H + .3, TR = Math.PI / 4;   // tower height, footprint, roof-deck top, rotation (main face → SE)
const PI = Math.PI;
let r = Math.random;

/* ───────────── helpers ───────────── */
const idx = (g) => { if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]); return g; };   // keep buckets uniformly indexed
const ico = (k, s, x, y, z, sx = 1, sy = 1, sz = 1) => { const g = idx(new THREE.IcosahedronGeometry(s, 0)); g.scale(sx, sy, sz); put(k, g, M4(x, y, z, 0, r() * 6, 0)); };
const ball = (k, s, x, y, z, ws = 10, hs = 7) => put(k, new THREE.SphereGeometry(s, ws, hs), M4(x, y, z));
const cone = (k, rad, h, x, y0, z, seg = 10) => put(k, new THREE.ConeGeometry(rad, h, seg), M4(x, y0 + h / 2, z));
const rose = (s, x, y, z) => ico(r() < .05 ? 'hearts_redrose' : 'hearts_rose', s, x, y, z);   // somebody has been painting the roses red
const seg = (x1, z1, x2, z2, fn) => { const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz); withFrame((x1 + x2) / 2, 0, (z1 + z2) / 2, ang(dx, dz), () => fn(L)); };

/* ───────────── materials ───────────── */
let defined = false;
function materials() {
  if (defined) return; defined = true;
  const leafy = (base, n, lo, hi) => canvasTex(128, 128, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); for (let i = 0; i < n; i++) { const t = Math.random(); g.fillStyle = `rgba(${lo[0] + t * (hi[0] - lo[0])},${lo[1] + t * (hi[1] - lo[1])},${lo[2] + t * (hi[2] - lo[2])},.85)`; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 1.5 + Math.random() * 3, 1 + Math.random() * 2, Math.random() * 3, 0, 7); g.fill(); } }, { repeat: true });
  const stone = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#ece8e0'; g.fillRect(0, 0, w, h); noise(g, w, h, 12);
    g.strokeStyle = 'rgba(120,115,110,.16)'; g.lineWidth = 1;
    for (let i = 0; i < 10; i++) { g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (Math.random() - .5) * 80; y += Math.random() * 50; g.lineTo(x, y); } g.stroke(); }
    for (let i = 0; i < 8; i++) { const x = Math.random() * w, gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(90,85,70,.12)'); gr.addColorStop(1, 'rgba(90,85,70,0)'); g.fillStyle = gr; g.fillRect(x, 0, 2 + Math.random() * 4, h * Math.random()); }
  }, { repeat: true });
  // white-stone facade: 4 bays × 4 floors per 14 m tile, deep window reveals, moss & rain streaks; emissive twin for night
  const W = 256, cw = 64, ch = 64, lit = [];
  const fac = canvasTex(W, W, (g) => {
    g.fillStyle = '#e4e0d7'; g.fillRect(0, 0, W, W); noise(g, W, W, 14);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const x = i * cw, y = j * ch;
      g.fillStyle = '#c8c3b7'; g.fillRect(x + cw * .14, y + ch * .12, cw * .72, ch * .66);
      const gr = g.createLinearGradient(x, y, x + cw, y + ch); gr.addColorStop(0, '#3e4b57'); gr.addColorStop(1, '#1e262e'); g.fillStyle = gr; g.fillRect(x + cw * .2, y + ch * .17, cw * .6, ch * .56);
      g.fillStyle = 'rgba(200,225,240,.18)'; g.fillRect(x + cw * .2, y + ch * .17, cw * .6, ch * .12);
      g.fillStyle = '#d6d1c6'; g.fillRect(x + cw * .49, y + ch * .17, cw * .025, ch * .56);
      g.fillStyle = '#f5f2eb'; g.fillRect(x + cw * .1, y + ch * .74, cw * .8, ch * .06);
      g.fillStyle = 'rgba(0,0,0,.1)'; g.fillRect(x, y + ch - 2, cw, 2);
      lit.push(Math.random() < .3 ? (Math.random() < .75 ? 'rgb(255,205,140)' : 'rgb(200,228,255)') : null);
    }
    for (let i = 0; i < 22; i++) { const x = Math.random() * W, gr = g.createLinearGradient(0, 0, 0, W); gr.addColorStop(0, 'rgba(70,64,50,.22)'); gr.addColorStop(1, 'rgba(70,64,50,0)'); g.fillStyle = gr; g.fillRect(x, 0, 1 + Math.random() * 4, W * Math.random()); }
    for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${60 + Math.random() * 30},${95 + Math.random() * 50},${40 + Math.random() * 20},${.2 + Math.random() * .4})`; g.beginPath(); g.ellipse(Math.random() * W, Math.random() < .5 ? Math.random() * 30 : W - Math.random() * 20, 2 + Math.random() * 10, 2 + Math.random() * 14, 0, 0, 7); g.fill(); }
  }, { repeat: true });
  const facGlow = canvasTex(W, W, (g) => { g.fillStyle = '#000'; g.fillRect(0, 0, W, W); lit.forEach((c, n) => { if (!c) return; const i = Math.floor(n / 4), j = n % 4; g.fillStyle = c; g.fillRect(i * cw + cw * .21, j * ch + ch * .18, cw * .58, ch * .54); }); }, { repeat: true });
  const pave = (base, line, moss) => canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h); noise(g, w, h, 16);
    g.strokeStyle = line; g.lineWidth = 3; for (let i = 0; i <= w; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
    if (moss) { for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(${55 + Math.random() * 30},${85 + Math.random() * 50},${30},${.3 + Math.random() * .4})`; const a = Math.floor(Math.random() * 5) * 64, b = Math.random() * h; if (Math.random() < .5) g.fillRect(a - 3, b, 6, 4 + Math.random() * 16); else g.fillRect(b, a - 3, 4 + Math.random() * 16, 6); }
      g.strokeStyle = 'rgba(30,30,28,.5)'; g.lineWidth = 1; for (let i = 0; i < 10; i++) { g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (Math.random() - .5) * 50; y += (Math.random() - .5) * 50; g.lineTo(x, y); } g.stroke(); } }
  }, { repeat: true });
  const lawn = canvasTex(256, 256, (g, w, h) => {   // two mowing stripes per tile
    for (let s = 0; s < 2; s++) { g.fillStyle = s ? '#4e8a2d' : '#66a63d'; g.fillRect(s * w / 2, 0, w / 2, h); }
    noise(g, w, h, 20);
    for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${40 + Math.random() * 60},${100 + Math.random() * 80},${20 + Math.random() * 30},.45)`; g.fillRect(Math.random() * w, Math.random() * h, 1, 2 + Math.random() * 3); }
  }, { repeat: true });

  def('hearts_stone', std({ map: stone, color: 0xf4f1ea, roughness: .62 }), 3);
  const fm = std({ map: fac, emissiveMap: facGlow, emissive: 0xffffff, emissiveIntensity: 0, roughness: .75 }); def('hearts_fac', fm, 14);
  def('hearts_pave', std({ map: pave('#ddd9d0', 'rgba(150,145,135,.6)', false), roughness: .7 }), 2);
  def('hearts_paveD', std({ map: pave('#a9a69e', 'rgba(70,70,64,.7)', true), roughness: .9 }), 3);
  def('hearts_lawn', std({ map: lawn, roughness: .95 }), 4);
  def('hearts_hedge', std({ map: leafy('#20351a', 900, [25, 55, 20], [70, 120, 50]), roughness: 1 }), 1.2);
  def('hearts_ivyL', std({ map: leafy('#3a6328', 600, [40, 80, 25], [110, 160, 70]), roughness: 1, flatShading: true }), 1.5);
  def('hearts_rose', std({ color: 0xf6f4ec, emissive: 0x2a2a26, roughness: .8, flatShading: true }));
  def('hearts_redrose', std({ color: 0xb3152a, emissive: 0x200004, roughness: .7, flatShading: true }));
  def('hearts_iron', std({ color: 0xf0f0ea, roughness: .4, metalness: .35 }));
  def('hearts_dome', std({ color: 0x6f978c, roughness: .3, metalness: .55 }));
  def('hearts_rail', std({ color: 0xb4bac0, roughness: .4, metalness: .8 }));
  def('hearts_wood', std({ color: 0x7a4a28, roughness: .7 }));
  def('hearts_cane', std({ color: 0xb48c5c, roughness: .8 }));
  def('hearts_cloth', std({ color: 0xfaf8f2, roughness: .9 }));
  def('hearts_china', std({ color: 0xffffff, roughness: .25 }));
  def('hearts_cake', std({ color: 0xe89ab0, roughness: .8 }));
  def('hearts_gold', std({ color: 0xc9a440, roughness: .35, metalness: .9 }));
  def('hearts_red', std({ color: 0xa8182a, roughness: .5 }));
  def('hearts_dark', std({ color: 0x1b232b, roughness: .15, metalness: .7 }));
  def('hearts_water', std({ color: 0x2f4a32, roughness: .1, metalness: .3 }));
  [['bR', 0xc0202a], ['bB', 0x2448a8], ['bY', 0xe0b818], ['bK', 0x18181a], ['bG', 0x2a8a3a]].forEach(([k, c]) => def('hearts_' + k, std({ color: c, roughness: .4 })));
  def('hearts_lamp', std({ color: 0xfff0d0, emissive: new THREE.Color(3, 1.9, .8), emissiveIntensity: .15, roughness: .3 }));
  def('hearts_door', std({ color: 0x3a3020, emissive: new THREE.Color(2.4, 1.6, .8), emissiveIntensity: .25, roughness: .2 }));
  def('hearts_bulb', std({ color: 0xfff2d0, emissive: new THREE.Color(3, 2.2, 1.1), emissiveIntensity: .05 }));
  def('hearts_wire', std({ color: 0x222222, roughness: .6 }));
  def('hearts_pool', K.poolMat(new THREE.Color(.55, .36, .14)));
  const M = K.mats;
  for (const k of ['hearts_bulb', 'hearts_wire', 'hearts_pool', 'hearts_ivyL', 'hearts_rose', 'hearts_redrose']) M[k].userData.noCollide = true;
  M.hearts_pool.visible = false;
}

/* ───────────── roof pieces (tower-local frame, deck top at RY) ───────────── */
function post(x, y, z) { box('hearts_stone', .62, 1.2, .62, x, y + .6, z); box('hearts_stone', .76, .12, .76, x, y + 1.26, z); cyl('hearts_stone', .1, .14, x, y + 1.39, z, 0, 0, 0, 8); ball('hearts_stone', .19, x, y + 1.64, z); }
// white balustrade with ball-topped posts; gaps = [[s0,s1]] along-distances left open
function balus(x1, z1, x2, z2, y, gaps = []) {
  seg(x1, z1, x2, z2, (L) => {
    let runs = [[0, L]];
    for (const [g0, g1] of gaps) runs = runs.flatMap(([a, b]) => (g1 <= a || g0 >= b) ? [[a, b]] : [[a, g0], [g1, b]].filter(([p, q]) => q - p > .2));
    for (const [a0, b0] of runs) {
      const a = a0 - L / 2, b = b0 - L / 2, l = b - a, c = (a + b) / 2;
      box('hearts_stone', l, .3, .5, c, y + .15, 0);
      box('hearts_stone', l, .14, .56, c, y + 1.03, 0);
      const n = Math.max(1, Math.floor(l / .36));
      for (let i = 0; i < n; i++) cyl('hearts_stone', .075, .66, a + (i + .5) * l / n, y + .63, 0, 0, 0, 0, 6, .05);
      const np = Math.max(1, Math.round(l / 4.2));
      for (let i = 0; i <= np; i++) post(a + i * l / np, y, 0);
    }
  });
}
function urn(x, y, z, s = 1) {
  const pts = [[0, 0], [.22, 0], [.15, .1], [.17, .22], [.34, .45], [.4, .62], [.36, .67], [0, .67]].map(([a, b]) => new THREE.Vector2(a * s, b * s));
  put('hearts_stone', new THREE.LatheGeometry(pts, 10), M4(x, y, z));
  return y + .64 * s;
}
function topiary(x, y0, z, h) { cyl('hearts_wood', .06, .4, x, y0 + .2, z, 0, 0, 0, 5); cone('hearts_hedge', h * .23, h, x, y0 + .3, z, 10); }
function urnTopiary(x, y, z, h = 2) { box('hearts_stone', .75, .7, .75, x, y + .35, z); box('hearts_stone', .9, .1, .9, x, y + .75, z); topiary(x, urn(x, y + .8, z) - .1, z, h); }
// white-rose planter: stone box, clipped hedge, lumpy bushes and scattered blooms; optional cone topiaries
function planter(x1, z1, x2, z2, y, cones = true) {
  seg(x1, z1, x2, z2, (L) => {
    box('hearts_stone', L, .7, 1.3, 0, y + .35, 0);
    box('hearts_stone', L, .08, 1.4, 0, y + .74, 0);
    box('hearts_hedge', L - .2, .72, 1.05, 0, y + 1.14, 0);
    for (let s = -L / 2 + .7; s < L / 2 - .5; s += 1.6 + r() * .8) ico('hearts_hedge', .42 + r() * .15, s, y + 1.5, (r() - .5) * .3, 1.3, .75, 1.1);
    const n = Math.round(L * 5.5);
    for (let i = 0; i < n; i++) {
      const u = (r() - .5) * (L - .3), q = r();
      if (q < .65) rose(.08 + r() * .07, u, y + 1.52 + r() * .3, (r() - .5) * .95);
      else rose(.08 + r() * .05, u, y + .9 + r() * .55, (q < .85 ? 1 : -1) * .55);
    }
    if (cones) for (let s = -L / 2 + 3 + r() * 2; s < L / 2 - 2; s += 8 + r() * 3) topiary(s, y + .75, 0, 2.6 + r() * 1.2);
  });
}
function rail(x1, z1, x2, z2, y) {
  seg(x1, z1, x2, z2, (L) => {
    box('hearts_rail', L, .05, .05, 0, y + 1.1, 0); box('hearts_rail', L, .035, .035, 0, y + .6, 0); box('hearts_rail', L, .12, .03, 0, y + .08, 0);
    const n = Math.max(1, Math.round(L / 1.5)); for (let i = 0; i <= n; i++) box('hearts_rail', .05, 1.1, .05, -L / 2 + i * L / n, y + .55, 0);
  });
}
function hoop(x, z, y, ry) { withFrame(x, y, z, ry, () => { for (const s of [-1, 1]) box('hearts_iron', .025, .34, .025, s * .2, .17, 0); box('hearts_iron', .425, .025, .025, 0, .34, 0); }); }
function stake(x, z, y, cols) { cyl('hearts_iron', .025, .9, x, y + .45, z, 0, 0, 0, 6); cols.forEach((c, i) => cyl(c, .03, .09, x, y + .52 + i * .1, z, 0, 0, 0, 6)); }
const BALLS = ['hearts_bR', 'hearts_bB', 'hearts_bY', 'hearts_bK', 'hearts_bG'];

function lawn(cx, cz, w, dd) {
  const y = RY;
  box('hearts_lawn', w, .12, dd, cx, y + .06, cz);
  for (const s of [-1, 1]) { box('hearts_stone', w + .5, .14, .25, cx, y + .07, cz + s * (dd / 2 + .125)); box('hearts_stone', .25, .14, dd, cx + s * (w / 2 + .125), y + .07, cz); }
  const ty = y + .12;
  [[-.32, -.3], [.32, -.3], [.32, .3], [-.32, .3], [-.12, 0], [.12, 0]].forEach(([u, v], i) => hoop(cx + u * w, cz + v * dd, ty, (r() - .5) * .3 + (i > 3 ? PI / 2 : 0)));
  stake(cx, cz, ty, ['hearts_bB', 'hearts_bR', 'hearts_bK', 'hearts_bY']);
  for (const s of [-1, 1]) stake(cx + s * .44 * w, cz, ty, ['hearts_bB', 'hearts_bR', 'hearts_bK', 'hearts_bY']);
  [['hearts_bB', -.2, -.15], ['hearts_bR', .25, .12], ['hearts_bY', .05, .22], ['hearts_bB', .3, -.2], ['hearts_bY', -.26, .2], ['hearts_bR', -.05, -.32]].forEach(([c, u, v]) => stake(cx + u * w, cz + v * dd, ty, [c, c]));
  for (let i = 0; i < 5; i++) ball(BALLS[i], .09, cx + (r() - .5) * w * .7, ty + .09, cz + (r() - .5) * dd * .7);
}
function roseArch(x, z) {
  const y = RY, R = 1.35, hp = 2.1;
  for (const dz of [-.35, .35]) { for (const s of [-1, 1]) box('hearts_iron', .06, hp, .06, x + s * R, y + hp / 2, z + dz); torus('hearts_iron', R, .04, PI, x, y + hp, z + dz, 0, 0, 0, 16); }
  for (let k = 0; k <= 8; k++) { const a = k * PI / 8; strut('hearts_iron', [x + Math.cos(a) * R, y + hp + Math.sin(a) * R, z - .35], [x + Math.cos(a) * R, y + hp + Math.sin(a) * R, z + .35], .025, 4); }
  for (let yy = .3; yy < hp; yy += .45) for (const s of [-1, 1]) box('hearts_iron', .03, .03, .7, x + s * R, y + yy, z);
  for (let k = 0; k < 44; k++) {
    let px, py; if (r() < .45) { px = x + (r() < .5 ? -1 : 1) * R; py = y + r() * hp; } else { const a = r() * PI; px = x + Math.cos(a) * R; py = y + hp + Math.sin(a) * R; }
    ico('hearts_ivyL', .2 + r() * .14, px + (r() - .5) * .2, py, z + (r() - .5) * .7);
    for (let j = 0; j < 3; j++) rose(.07 + r() * .05, px + (r() - .5) * .35, py + (r() - .5) * .3, z + (r() - .5) * .9);
  }
}
function chair(x, y, z, ry) {
  withFrame(x, y, z, ry, () => {
    box('hearts_cane', .46, .05, .46, 0, .45, 0);
    for (const a of [-1, 1]) for (const b of [-1, 1]) box('hearts_cane', .04, .45, .04, a * .2, .225, b * .2);
    box('hearts_cane', .46, .5, .04, 0, .72, .21); box('hearts_cane', .5, .05, .06, 0, .98, .21);
  });
}
function gazebo(gx, gz) {
  const y = RY, R = 2.9, F = y + .3;
  cyl('hearts_stone', 3.7, .15, gx, y + .075, gz, 0, 0, 0, 16);
  cyl('hearts_stone', 3.35, .3, gx, y + .15, gz, 0, PI / 8, 0, 8);
  const P = [...Array(8)].map((_, i) => { const a = i * PI / 4 + PI / 8; return [gx + Math.cos(a) * R, gz + Math.sin(a) * R]; });
  P.forEach(([px, pz], i) => {
    box('hearts_iron', .2, .2, .2, px, F + .1, pz); cyl('hearts_iron', .06, 2.75, px, F + 1.375, pz, 0, 0, 0, 8); box('hearts_iron', .18, .12, .18, px, F + 2.7, pz);
    const [qx, qz] = P[(i + 1) % 8], mx = (px + qx) / 2, mz = (pz + qz) / 2, a = ang(qx - px, qz - pz), half = Math.hypot(qx - px, qz - pz) / 2;
    torus('hearts_iron', half, .035, PI, mx, F + 2.75 - half, mz, 0, a, 0, 12);   // scalloped arch
    if (i !== 3 && i !== 1) {   // low railing except the sides facing the lawn and the stair house
      strut('hearts_iron', [px, F + .85, pz], [qx, F + .85, qz], .025, 5); strut('hearts_iron', [px, F + .12, pz], [qx, F + .12, qz], .025, 5);
      for (let k = 1; k < 8; k++) { const t = k / 8, bx = px + (qx - px) * t, bz = pz + (qz - pz) * t; strut('hearts_iron', [bx, F + .12, bz], [bx, F + .85, bz], .012, 4); }
    }
    if (i % 3 !== 1) for (let k = 0; k < 9; k++) { const t = r(), hy = F + .2 + t * 2.6; ico('hearts_ivyL', .16 + r() * .12, px + (r() - .5) * .2, hy, pz + (r() - .5) * .2); rose(.07 + r() * .04, px + (r() - .5) * .3, hy + .1, pz + (r() - .5) * .3); }
  });
  torus('hearts_iron', R, .07, 2 * PI, gx, F + 2.75, gz, PI / 2, 0, 0, 24);
  torus('hearts_iron', R + .15, .05, 2 * PI, gx, F + 2.95, gz, PI / 2, 0, 0, 24);
  const dome = new THREE.SphereGeometry(3.15, 16, 6, 0, 2 * PI, 0, PI / 2); dome.scale(1, .72, 1); put('hearts_dome', dome, M4(gx, F + 2.95, gz));
  for (let k = 0; k < 4; k++) { const g = new THREE.TorusGeometry(3.17, .05, 5, 16, PI); g.scale(1, .72, 1); put('hearts_iron', g, M4(gx, F + 2.95, gz, 0, k * PI / 4, 0)); }
  cyl('hearts_iron', .35, .4, gx, F + 5.3, gz, 0, 0, 0, 8); ball('hearts_dome', .4, gx, F + 5.5, gz); cone('hearts_gold', .06, .7, gx, F + 5.85, gz, 6); ball('hearts_gold', .08, gx, F + 6.0, gz, 8, 6);
  for (let k = 0; k < 14; k++) { const a = r() * 2 * PI; ico('hearts_ivyL', .25 + r() * .15, gx + Math.cos(a) * (R + .1), F + 2.85, gz + Math.sin(a) * (R + .1)); rose(.08, gx + Math.cos(a) * (R + .25), F + 2.9 + r() * .2, gz + Math.sin(a) * (R + .25)); }
  // hanging lantern
  strut('hearts_iron', [gx, F + 5.1, gz], [gx, F + 2.75, gz], .015, 4); box('hearts_lamp', .22, .3, .22, gx, F + 2.6, gz); cyl('hearts_iron', .18, .14, gx, F + 2.82, gz, 0, PI / 4, 0, 4, .02);
  // the tea party
  cyl('hearts_cloth', .8, .76, gx, F + .38, gz, 0, 0, 0, 16, .74);
  const T = F + .76;
  for (let k = 0; k < 4; k++) { const a = k * PI / 2 + PI / 4, px = gx + Math.cos(a) * .52, pz = gz + Math.sin(a) * .52; cyl('hearts_china', .12, .015, px, T + .008, pz, 0, 0, 0, 12); cyl('hearts_china', .04, .065, px + .14 * Math.cos(a + 1), T + .04, pz + .14 * Math.sin(a + 1), 0, 0, 0, 8, .045);
    chair(gx + Math.cos(a) * 1.3, F, gz + Math.sin(a) * 1.3, Math.atan2(Math.cos(a), Math.sin(a))); }
  const tp = new THREE.SphereGeometry(.13, 12, 8); tp.scale(1, .8, 1); put('hearts_china', tp, M4(gx + .22, T + .1, gz - .1)); strut('hearts_china', [gx + .33, T + .08, gz - .1], [gx + .45, T + .18, gz - .1], .018, 5); ball('hearts_gold', .03, gx + .22, T + .21, gz - .1, 6, 4);
  strut('hearts_gold', [gx - .2, T, gz + .1], [gx - .2, T + .5, gz + .1], .012, 5);
  [[.18, .08], [.14, .24], [.1, .4]].forEach(([rr, h]) => { cyl('hearts_china', rr, .012, gx - .2, T + h, gz + .1, 0, 0, 0, 12); for (let j = 0; j < 4; j++) box('hearts_cake', .05, .04, .05, gx - .2 + Math.cos(j * 1.57) * rr * .6, T + h + .03, gz + .1 + Math.sin(j * 1.57) * rr * .6); });
  cyl('hearts_china', .05, .2, gx, T + .1, gz, 0, 0, 0, 8, .04); for (let j = 0; j < 6; j++) rose(.05, gx + (r() - .5) * .14, T + .25 + r() * .08, gz + (r() - .5) * .14);
}
function malletRack(x, z) {
  withFrame(x, RY, z, 0, () => {
    for (const s of [-1, 1]) box('hearts_wood', .08, 1.1, .35, s * .8, .55, 0);
    box('hearts_wood', 1.68, .06, .35, 0, 1.08, 0); box('hearts_wood', 1.68, .05, .35, 0, .1, 0); box('hearts_wood', 1.68, .9, .03, 0, .6, .17); box('hearts_wood', 1.6, .04, .08, 0, .85, -.12);
    const cols = ['hearts_bR', 'hearts_bB', 'hearts_bY', 'hearts_bK', 'hearts_bG', 'hearts_bR'];
    for (let i = 0; i < 6; i++) { const px = -.62 + i * .25; strut('hearts_wood', [px, .2, -.04], [px, 1.0, -.12], .018, 5); cyl(cols[i], .055, .26, px, .17, -.04, 0, 0, PI / 2, 8); }
    withFrame(1.6, 0, 0, 0, () => {
      for (const yy of [.05, .62, .92]) box('hearts_wood', 1, .05, .4, 0, yy, 0);
      for (const s of [-1, 1]) box('hearts_wood', .05, .95, .4, s * .5, .47, 0);
      for (let i = 0; i < 4; i++) { ball(BALLS[i], .1, -.33 + i * .22, .18, -.02, 10, 8); ball(BALLS[(i + 2) % 5], .1, -.33 + i * .22, .745, -.02, 10, 8); }
    });
    box('hearts_wood', .7, .5, .5, -1.5, .25, 0); box('hearts_wood', .74, .04, .54, -1.5, .5, 0);
  });
}
function bench(x, y, z, ry) {
  withFrame(x, y, z, ry, () => {
    for (let i = 0; i < 3; i++) box('hearts_iron', 1.6, .04, .12, 0, .45, -.15 + i * .15);
    for (let i = 0; i < 2; i++) box('hearts_iron', 1.6, .1, .03, 0, .65 + i * .2, .24);
    for (const s of [-1, 1]) { box('hearts_iron', .05, .45, .4, s * .75, .225, 0); box('hearts_iron', .05, .5, .05, s * .75, .7, .24); }
  });
}
function lantern(x, z, y) {
  cyl('hearts_iron', .05, 2.5, x, y + 1.25, z, 0, 0, 0, 6); cyl('hearts_iron', .14, .1, x, y + .05, z, 0, 0, 0, 8);
  box('hearts_iron', .28, .04, .28, x, y + 2.5, z); box('hearts_lamp', .22, .3, .22, x, y + 2.67, z);
  for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) box('hearts_iron', .03, .34, .03, x + a * .12, y + 2.67, z + b * .12);
  cyl('hearts_iron', .2, .16, x, y + 2.92, z, 0, PI / 4, 0, 4, .02);
  const g = new THREE.PlaneGeometry(6, 6); g.rotateX(-PI / 2); put('hearts_pool', g, M4(x, y + .15, z));
}
function festoon(a, b, y) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(2, Math.round(L / .7)); let prev = null;
  for (let i = 0; i <= n; i++) {
    const t = i / n, p = [a[0] + (b[0] - a[0]) * t, y - .45 * 4 * t * (1 - t), a[1] + (b[1] - a[1]) * t];
    if (prev) strut('hearts_wire', prev, p, .008, 3);
    if (i > 0 && i < n) ico('hearts_bulb', .055, p[0], p[1] - .07, p[2]);
    prev = p;
  }
}
function stairHouse(x, z) {
  const y = RY, dx = x - 3.75;   // west face (door toward the garden)
  box('hearts_stone', 7.7, .2, 7.7, x, y + .1, z); box('hearts_stone', 7.5, 3.8, 7.5, x, y + 1.9, z); box('hearts_stone', 7.9, .3, 7.9, x, y + 3.95, z);
  box('hearts_stone', .3, 2.75, 1.9, dx - .1, y + 1.375, z); box('hearts_door', .1, 2.3, 1.3, dx - .27, y + 1.15, z);
  box('hearts_iron', .12, 2.3, .06, dx - .3, y + 1.15, z); box('hearts_iron', .12, .06, 1.3, dx - .3, y + 1.6, z);
  box('hearts_stone', .9, .12, 2.2, dx - .45, y + .06, z);
  for (const s of [-1, 1]) { box('hearts_lamp', .16, .26, .16, dx - .2, y + 2.15, z + s * 1.25); cyl('hearts_iron', .13, .1, dx - .2, y + 2.33, z + s * 1.25, 0, PI / 4, 0, 4, .02); }
  plane('grille', 1.8, 1, x + 1.5, y + 2.6, z + 3.76); plane('grille', 1.8, 1, x - 1.5, y + 2.6, z + 3.76);
  K.acUnit(x - 1.6, y + 4.1, z - 1.6, 0); K.acUnit(x + 1.7, y + 4.1, z + 1.3, PI / 2);
  box('steelL', 1.2, 1.4, 1.2, x + 1.8, y + 4.8, z - 2.2); cyl('pipeD', .25, 1.2, x - 2.6, y + 4.7, z + 2.4, 0, 0, 0, 10);
  // ivy crawling over the stair house
  for (let k = 0; k < 10; k++) ico('hearts_ivyL', .4 + r() * .3, x + 3.8, y + 3.9 - r() * 3, z + (r() - .5) * 7, .5, 1.4, 1);
}

/* ───────────── tower ───────────── */
function ivyFace(w, mural) {
  const n = Math.round(w / 3.2);
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + (i + r()) * w / n, iw = 1.2 + r() * 3, top = H + .9;
    let len = 4 + r() ** 1.5 * (H - 14);
    if (mural && Math.abs(x) < 12.8) len = Math.min(len, Math.abs(x) > 10 ? 18 : 3.5);
    box('ivy', iw, len, .35, x, top - len / 2, .6);
    box('ivy', iw * .55, 1.5 + r() * 3, .3, x + (r() - .5) * iw * .4, top - len - .8, .58);
    for (let k = 0; k < 3; k++) ico('hearts_ivyL', .45 + r() * .35, x + (r() - .5) * iw, top - r() * len * .9, .75, 1.3, 1, .6);
    for (let k = 0; k < len / 4; k++) rose(.1 + r() * .06, x + (r() - .5) * iw, top - r() * len, .82);
  }
  for (let i = 0; i < 3; i++) {   // climbing up from the podium
    const x = (r() - .5) * (w - 4); if (mural && Math.abs(x) < 13) continue;
    const len = 6 + r() * 25, iw = 1.5 + r() * 3; box('ivy', iw, len, .35, x, 7 + len / 2, .6);
    for (let k = 0; k < 3; k++) ico('hearts_ivyL', .5 + r() * .3, x + (r() - .5) * iw, 7 + r() * len, .75, 1.2, 1, .6);
  }
}
function tower(ctx) {
  // podium + lobby
  box('hearts_stone', 52, 7, 44, 0, 3.5, 0);
  box('hearts_dark', 52.1, 3.4, 44.1, 0, 2.5, 0);
  for (let s = -24; s <= 24; s += 4) { box('hearts_stone', .7, 7, .5, s, 3.5, 22.1); box('hearts_stone', .7, 7, .5, s, 3.5, -22.1); }
  for (let s = -20; s <= 20; s += 4) { box('hearts_stone', .5, 7, .7, 26.1, 3.5, s); box('hearts_stone', .5, 7, .7, -26.1, 3.5, s); }
  box('hearts_stone', 52.6, .6, 44.6, 0, 7.1, 0);
  box('hearts_stone', 12, .4, 4.5, 0, 4.6, 24.3); box('hearts_lamp', 10, .05, .2, 0, 4.38, 25.8);
  for (const s of [-1, 1]) cyl('hearts_stone', .3, 4.4, s * 5.5, 2.34, 26.1, 0, 0, 0, 12);
  for (let i = 0; i < 3; i++) box('hearts_stone', 14 - i, .15, 1.2, 0, .14 + .075 + i * .15, 27.6 - i * .9);
  for (let i = 0; i < 70; i++) { const side = Math.floor(r() * 4), t = (r() - .5); const [x, z] = [[t * 52, 22.4], [26.4, t * 44], [t * 52, -22.4], [-26.4, t * 44]][side]; if (side === 0 && Math.abs(x) < 7.5) continue; ico('leaf', .7 + r() * .6, x, .5, z, 1.3, .8, 1.3); }
  // shaft
  box('hearts_fac', TW, H - 7, TD, 0, 7 + (H - 7) / 2, 0);
  for (const a of [-1, 1]) for (const b of [-1, 1]) box('hearts_stone', 1.4, H - 7, 1.4, a * (TW / 2 - .1), 7 + (H - 7) / 2, b * (TD / 2 - .1));
  for (const yy of [28, 49, 70]) box('hearts_stone', TW + .6, .45, TD + .6, 0, yy, 0);
  box('hearts_stone', TW + .8, .5, TD + .8, 0, H - 1.25, 0); box('hearts_stone', TW + 1.4, 1, TD + 1.4, 0, H - .5, 0);
  box('hearts_pave', TW, .3, TD, 0, H + .15, 0);
  // the Queen of Hearts mural on the main (SE) face
  const mw = 22, mh = 33, my = H - 6 - mh / 2, mz = TD / 2;
  const card = new THREE.Mesh(new THREE.PlaneGeometry(mw, mh), ctx.cards.cardMaterial('Q', 'H'));
  card.position.copy(fpos(0, my, mz + .1)); card.rotation.y = TR; card.receiveShadow = true; ctx.scene.add(card);
  for (const s of [-1, 1]) { box('hearts_red', mw + 2.4, 1.2, .4, 0, my + s * (mh / 2 + .6), mz + .2); box('hearts_red', 1.2, mh + 2.4, .4, s * (mw / 2 + .6), my, mz + .2);
    box('hearts_gold', mw + .5, .25, .2, 0, my + s * (mh / 2 + .05), mz + .3); box('hearts_gold', .25, mh + .5, .2, s * (mw / 2 + .05), my, mz + .3); }
  for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) ball('hearts_gold', .7, a * (mw / 2 + .6), my + b * (mh / 2 + .6), mz + .45);
  // ivy curtains on all four faces (local +z of each frame = outward)
  withFrame(0, 0, TD / 2, 0, () => ivyFace(TW, true));
  withFrame(0, 0, -TD / 2, PI, () => ivyFace(TW, false));
  withFrame(TW / 2, 0, 0, PI / 2, () => ivyFace(TD, false));
  withFrame(-TW / 2, 0, 0, -PI / 2, () => ivyFace(TD, false));
}

/* ───────────── roof garden ───────────── */
function roof(ctx) {
  const y = RY, X0 = -TW / 2, X1 = TW / 2, Z = TD / 2, XI = -20.5;   // XI: inner parapet line (walkway outside it)
  // parapets
  balus(X0, -Z + .25, X1, -Z + .25, y); balus(X0, Z - .25, X1, Z - .25, y); balus(X1 - .25, -Z, X1 - .25, Z, y);
  balus(XI, -Z + .5, XI, Z - .5, y, [[3.3, 5.7], [30.8, 33.2]]);   // gates to the walkway at z≈-14 and z≈13.5
  // service walkway (west edge, outside the balustrade)
  box('grate', XI - X0 - .25, .06, TD - 1, (X0 + XI - .25) / 2, y + .03, 0);
  rail(X0 + .15, -Z + .5, X0 + .15, Z - .5, y + .06);
  strut('pipeG', [XI - .4, y + .3, -Z + .6], [XI - .4, y + .3, Z - .6], .07, 8);
  K.acUnit(XI - .8, y + .06, -6, -PI / 2); K.acUnit(XI - .8, y + .06, 4, -PI / 2);
  for (let k = 0; k < 18; k++) ico('hearts_ivyL', .35 + r() * .3, X0 + .15, y + .3 + r() * .9, (r() - .5) * (TD - 2), .6, 1.2, 1);
  // planters inside the parapet
  const pz = Z - .5 - .65, px1 = X1 - .5 - .65, pxi = XI + .25 + .65;
  planter(XI + .25, -pz, X1 - .5, -pz, y);
  planter(XI + .25, pz, 14.8, pz, y);
  planter(px1, -pz + .65, px1, 10.8, y);
  planter(pxi, -Z + 1.8, pxi, -15.4, y, false); planter(pxi, -12.6, pxi, 12.1, y); planter(pxi, 14.9, pxi, Z - 1.8, y, false);
  // croquet lawn
  const lx = -2.75, lz = -.75, lw = 26.5, ld = 23.5;
  lawn(lx, lz, lw, ld);
  for (const a of [-1, 1]) for (const b of [-1, 1]) urnTopiary(lx + a * (lw / 2 + 1.4), y, lz + b * (ld / 2 + 1.4), 1.8 + r() * .5);
  // lanterns ringing the lawn + festoon bulbs between them
  const zb = lz - ld / 2 - .9, zf = lz + ld / 2 + .9, xl = lx - lw / 2 - .9, xr = lx + lw / 2 + .9;
  const L = [[-11.6, zb], [-2.75, zb], [6.1, zb], [xr, -4.7], [xr, 3.2], [6.1, zf], [-2.75, zf], [-11.6, zf], [xl, 3.2], [xl, -4.7]];
  L.forEach(([x, z], i) => { lantern(x, z, y); festoon([x, z], L[(i + 1) % L.length], y + 2.55); });
  roseArch(4, -14.9);
  gazebo(16.5, 2);
  stairHouse(18.75, 14.75);
  malletRack(10, 16.8);
  bench(-9, y, -16.3, PI); bench(-15, y, -16.3, PI); bench(-18.3, y, -2, -PI / 2);
  // paint bucket by the front roses
  cyl('steelL', .14, .28, -6, y + .14, 16.6, 0, 0, 0, 10); cyl('hearts_redrose', .13, .01, -6, y + .27, 16.6, 0, 0, 0, 10); strut('hearts_wood', [-6, y + .2, 16.6], [-5.75, y + .55, 16.5], .015, 4);
  // two real lights: lawn wash + gazebo (both auto-hidden by day)
  K.addSpot(0xffc27a, 520, 34, .8, .7, fpos(lx, y + 14, lz), fpos(lx, y, lz));
  K.addSpot(0xffb070, 90, 9, 1.2, .8, fpos(16.5, y + 2.6, 2), fpos(16.5, y, 2));
}

/* ───────────── plaza ───────────── */
function tree(x, z, s, y = .14) { cityTree(x, z, s, y); }   // shared leaf-card tree
function plaza(d) {
  const hw = d.w / 2, hd = d.d / 2;
  const inTower = (x, z, pad) => { const c = Math.cos(TR), s = Math.sin(TR), lx = x * c - z * s, lz = x * s + z * c; return Math.abs(lx) < 26 + pad && Math.abs(lz) < 22 + pad; };
  box('hearts_paveD', d.w - 2, .14, d.d - 2, 0, .07, 0);
  for (let i = 0; i < 30; i++) { const x = (r() - .5) * (d.w - 12), z = (r() - .5) * (d.d - 12); if (!inTower(x, z, 3)) box('grass', 3 + r() * 8, .05, 2 + r() * 6, x, .165, z, r() * 3); }
  for (let i = 0; i < 50; i++) { const x = (r() - .5) * (d.w - 6), z = (r() - .5) * (d.d - 6); if (!inTower(x, z, 1)) ico('leaf', .4 + r() * .6, x, .3, z, 1.3, .7, 1.3); }
  for (let i = 0; i < 40; i++) { const x = (r() - .5) * (d.w - 10), z = (r() - .5) * (d.d - 10); if (!inTower(x, z, 6) && Math.hypot(x - 40, z - 36) > 8) tree(x, z, .8 + r() * .6); }
  // ragged hedge border with entries at the middle of each side
  for (const [ax, az, L, alongX] of [[0, -hd + 2, d.w - 4, true], [0, hd - 2, d.w - 4, true], [-hw + 2, 0, d.d - 4, false], [hw - 2, 0, d.d - 4, false]])
    for (let s = -L / 2; s < L / 2 - 1;) { const l = Math.min(3 + r() * 6, L / 2 - s); if (Math.abs(s + l / 2) > 6 && r() > .12) { const hh = .9 + r() * .5; alongX ? box('hearts_hedge', l, hh, 1.2, ax + s + l / 2, .14 + hh / 2, az) : box('hearts_hedge', 1.2, hh, l, ax, .14 + hh / 2, az + s + l / 2); } s += l; }
  // SE forecourt: path to the lobby, dry heart fountain, lamps and benches (tower frame)
  withFrame(0, 0, 0, TR, () => {
    box('hearts_pave', 7, .04, 26, 0, .16, 35);
    for (const s of [-1, 1]) for (const zz of [30, 42]) K.lamp(s * 4.8, zz, 5.5, { spot: false, warm: true, dir: s < 0 ? PI / 2 : -PI / 2, arm: .9, y0: .14 });
    const fz = 54;
    cyl('hearts_stone', 5, .8, 0, .54, fz, 0, 0, 0, 16); cyl('hearts_water', 4.55, .05, 0, .93, fz, 0, 0, 0, 16);
    torus('hearts_stone', 4.8, .22, 2 * PI, 0, .95, fz, PI / 2, 0, 0, 24);
    cyl('hearts_stone', .6, 1.6, 0, 1.7, fz, 0, 0, 0, 10);
    const hs = new THREE.Shape(); hs.moveTo(0, -1); hs.bezierCurveTo(.2, -.6, 1.1, -.1, 1.1, .45); hs.bezierCurveTo(1.1, .95, .45, 1.15, 0, .65); hs.bezierCurveTo(-.45, 1.15, -1.1, .95, -1.1, .45); hs.bezierCurveTo(-1.1, -.1, -.2, -.6, 0, -1);
    const hg = idx(new THREE.ExtrudeGeometry(hs, { depth: .5, bevelEnabled: true, bevelSize: .08, bevelThickness: .08, bevelSegments: 2, curveSegments: 8 }));
    hg.translate(0, 0, -.25); hg.scale(1.4, 1.4, 1.4); put('hearts_red', hg, M4(0, 3.9, fz));
    for (let k = 0; k < 12; k++) { const a = r() * 2 * PI; ico('leaf', .3 + r() * .3, Math.cos(a) * (2 + r() * 2.2), .95, fz + Math.sin(a) * (2 + r() * 2.2), 1.4, .25, 1.4); }
    for (const s of [-1, 1]) { bench(s * 8, .14, 50, s * PI / 2); bench(s * 8, .14, 58, s * PI / 2); }
  });
}

/* ───────────── build ───────────── */
export function build(ctx, d) {
  r = K.rng(1120);
  materials();
  const M = K.mats;
  let spawn, yaw, cam, tgt;
  withFrame(d.x, 0, d.z, 0, () => {
    plaza(d);
    withFrame(0, 0, 0, TR, () => {
      tower(ctx);
      roof(ctx);
      const sp = fpos(-9, RY + .3, 1), gz = fpos(16.5, RY, 2);
      spawn = [sp.x, sp.y, sp.z]; yaw = Math.atan2(-(gz.x - sp.x), -(gz.z - sp.z));
      cam = fpos(-34, RY + 34, 58).toArray(); tgt = fpos(0, RY, 0).toArray();
    });
  });
  ctx.pois.push({ id: d.id, cam, tgt, spawn, yaw });
  ctx.dayNight.push((day) => {
    M.hearts_fac.emissiveIntensity = day ? 0 : 1;
    M.hearts_lamp.emissiveIntensity = day ? .15 : 1.3;
    M.hearts_bulb.emissiveIntensity = day ? .05 : 1.5;
    M.hearts_door.emissiveIntensity = day ? .25 : 1.2;
    M.hearts_pool.visible = !day;
  });
}
