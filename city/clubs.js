// Clubs tower (P2 ♣): a massive weathered square tower wrapped in ivy, giant playing-card murals on its four
// faces, a crown-like parapet with gilded spikes and corner turrets, and a rooftop game venue — white
// pavilions, string lights, a central crowned marquee over a painted club. Overgrown plaza with dead cars.
import * as THREE from 'three';
import * as K from '../kit.js';
const { box, cyl, sph, strut, torus, put, M4, withFrame, def, std, bas, canvasTex, noise } = K;

const HB = 88, RF = HB + .12, TB = 29, PB = 32;   // roof slab top, walkable roof level, shaft / podium half size

/* ───────────── materials ───────────── */
let made = false;
function materials() {
  if (made) return; made = true;
  const r = K.rng(9101);
  const day = canvasTex(256, 256, (g, W, H) => {
    g.fillStyle = '#8f8b81'; g.fillRect(0, 0, W, H); noise(g, W, H, 30);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const x = i * 64, y = j * 64, broken = r() < .18;
      g.fillStyle = '#6e6a62'; g.fillRect(x + 6, y + 10, 52, 38);
      g.fillStyle = broken ? '#4c5254' : '#1d2327'; g.fillRect(x + 9, y + 13, 46, 32);
      if (!broken) { g.fillStyle = 'rgba(150,180,200,.18)'; g.fillRect(x + 9, y + 13, 46, 9); g.fillStyle = '#5d5a53'; g.fillRect(x + 31, y + 13, 2, 32); }
      else { g.strokeStyle = 'rgba(20,20,20,.7)'; g.beginPath(); g.moveTo(x + 9 + r() * 46, y + 13); g.lineTo(x + 20 + r() * 30, y + 45); g.stroke(); }
      g.fillStyle = '#a7a296'; g.fillRect(x + 4, y + 48, 56, 4);
    }
    for (let i = 0; i < 40; i++) { const x = r() * W, y = r() * H * .6, gr = g.createLinearGradient(0, y, 0, H); gr.addColorStop(0, 'rgba(45,35,25,.45)'); gr.addColorStop(1, 'rgba(45,35,25,0)'); g.fillStyle = gr; g.fillRect(x, y, 2 + r() * 7, H - y); }
    for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(${45 + r() * 30},${75 + r() * 50},${28 + r() * 20},${.3 + r() * .5})`; g.beginPath(); g.ellipse(r() * W, r() < .6 ? H - r() * 70 : r() * H, 3 + r() * 16, 3 + r() * 22, 0, 0, 7); g.fill(); }
  }, { repeat: true });
  const glow = canvasTex(256, 256, (g, W, H) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { if (r() > .16) continue; g.fillStyle = r() < .8 ? '#ffbe78' : '#bcdcff'; g.fillRect(i * 64 + 10, j * 64 + 14, 44, 30); }
  }, { repeat: true });
  def('clubs_fac', std({ map: day, emissiveMap: glow, emissive: 0xffffff, emissiveIntensity: 0, roughness: .9 }), 14);
  def('clubs_stone', std({ map: K.texConcrete, color: 0x9c978a, roughness: .95 }), 5);
  def('clubs_gold', std({ color: 0xa8894a, roughness: .42, metalness: .75 }));
  def('clubs_canvas', std({ color: 0xf1efe8, roughness: .9, side: THREE.DoubleSide }));
  def('clubs_felt', std({ color: 0x1f5a36, roughness: .95 }));
  def('clubs_flag', std({ color: 0x9e1e22, roughness: .8, side: THREE.DoubleSide }));
  def('clubs_rust', std({ color: 0x6b4a33, roughness: .95, metalness: .2 }));
  def('clubs_cwin', std({ color: 0x1a2228, roughness: .2, metalness: .6 }));
  def('clubs_bulb', bas({ color: new THREE.Color(3.2, 2.3, 1.1) })); K.mats.clubs_bulb.userData.noCollide = true;
  const art = canvasTex(512, 512, (g, W, H) => {   // faded painted club in a ring on the roof deck
    g.clearRect(0, 0, W, H); const c = W / 2;
    g.strokeStyle = 'rgba(235,228,210,.75)'; g.lineWidth = 14; g.beginPath(); g.arc(c, c, 236, 0, 7); g.stroke();
    g.lineWidth = 5; g.beginPath(); g.arc(c, c, 210, 0, 7); g.stroke();
    g.fillStyle = 'rgba(30,30,32,.8)';
    for (const [x, y] of [[c, c - 70], [c - 72, c + 30], [c + 72, c + 30]]) { g.beginPath(); g.arc(x, y, 64, 0, 7); g.fill(); }
    g.beginPath(); g.moveTo(c - 18, c + 20); g.lineTo(c + 18, c + 20); g.lineTo(c + 50, c + 160); g.lineTo(c - 50, c + 160); g.closePath(); g.fill();
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(0,0,0,${r() * .6})`; g.beginPath(); g.ellipse(r() * W, r() * H, 2 + r() * 20, 2 + r() * 10, r() * 3, 0, 7); g.fill(); }
  });
  const am = std({ map: art, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 });
  def('clubs_art', am); am.userData.noCollide = true;
}

/* ───────────── pieces ───────────── */
function car(x, z, ry, k) {
  withFrame(x, .12, z, ry, () => {
    box(k, 4.2, .8, 1.8, 0, .7, 0); box(k, 2.3, .65, 1.6, -.2, 1.42, 0);
    box('clubs_cwin', 2.34, .42, 1.63, -.2, 1.43, 0);
    for (const a of [-1, 1]) for (const b of [-1, 1]) cyl('tire', .36, .26, a * 1.35, .36, b * .82, Math.PI / 2, 0, 0, 10);
    box('steel', .1, .25, 1.7, 2.12, .55, 0); box('steel', .1, .25, 1.7, -2.12, .55, 0);
  });
}
function tent(x, z, ry) {   // white pavilion: posts, pyramid roof, valance, back wall, table, pennant
  withFrame(x, RF, z, ry, () => {
    for (const a of [-1, 1]) for (const b of [-1, 1]) cyl('paintW', .06, 2.6, a * 2.4, 1.3, b * 2.4, 0, 0, 0, 6);
    cyl('clubs_canvas', 3.6, 2, 0, 3.6, 0, 0, Math.PI / 4, 0, 4, 0);
    for (const s of [-1, 1]) { box('clubs_canvas', 5.1, .45, .04, 0, 2.4, s * 2.55); box('clubs_canvas', .04, .45, 5.1, s * 2.55, 2.4, 0); }
    box('clubs_canvas', 5, 2.2, .04, 0, 1.2, -2.5);
    box('paintW', 1.8, .06, .9, 0, .78, -.6); for (const a of [-1, 1]) box('steel', .05, .75, .8, a * .8, .38, -.6);
    for (const a of [-1, 1]) box('trunk', .4, .45, .4, a * .5, .23, .3);
    box('clubs_bulb', .18, .18, .18, 0, 2.4, 0);
    strut('steel', [0, 4.6, 0], [0, 5.6, 0], .03, 4); box('clubs_flag', .7, .4, .02, .36, 5.35, 0);
  });
}
function pavilion() {   // central crowned marquee over the painted club + card table
  const h = 4.5;
  for (const a of [-1, 1]) for (const b of [-1, 1]) cyl('paintW', .14, h, a * 6.6, RF + h / 2, b * 6.6, 0, 0, 0, 8);
  cyl('clubs_canvas', 9.9, 3.4, 0, RF + h + 1.7, 0, 0, Math.PI / 4, 0, 4, 0);
  for (const s of [-1, 1]) { box('clubs_canvas', 14, .6, .05, 0, RF + h - .1, s * 7); box('clubs_canvas', .05, .6, 14, s * 7, RF + h - .1, 0); }
  // gilded crown on the apex
  const yc = RF + h + 2.7;
  torus('clubs_gold', 1.5, .12, Math.PI * 2, 0, yc, 0, Math.PI / 2, 0, 0, 24);
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; cyl('clubs_gold', .22, 1.3, Math.cos(a) * 1.5, yc + .65, Math.sin(a) * 1.5, 0, 0, 0, 4, 0); sph('clubs_gold', .13, Math.cos(a) * 1.5, yc + 1.35, Math.sin(a) * 1.5); }
  // round card table + stools
  cyl('clubs_felt', 2.2, .1, 0, RF + .9, 0, 0, 0, 0, 16); cyl('steel', 2.3, .08, 0, RF + .83, 0, 0, 0, 0, 16); cyl('steel', .25, .8, 0, RF + .4, 0, 0, 0, 0, 8);
  for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; cyl('steel', .25, .5, Math.cos(a) * 3, RF + .25, Math.sin(a) * 3, 0, 0, 0, 8); }
  for (let k = 0; k < 4; k++) box('clubs_bulb', .22, .22, .22, (k % 2 ? 1 : -1) * 3, RF + h - .4, (k < 2 ? 1 : -1) * 3);
  K.pool(0, 0, 6, true, RF);
}
// sagging string of bulbs between two points
function lights(a, b, sag = 1) {
  const n = 10; let prev = null;
  for (let i = 0; i <= n; i++) {
    const t = i / n, p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(Math.PI * t) * sag, a[2] + (b[2] - a[2]) * t];
    if (prev) strut('steel', prev, p, .015, 4);
    if (i > 0 && i < n) box('clubs_bulb', .14, .14, .14, p[0], p[1] - .1, p[2]);
    prev = p;
  }
}

function tower(ctx, R) {
  const { cards, scene } = ctx;
  // podium with shuttered shops
  box('clubs_stone', 2 * PB, 8, 2 * PB, 0, 4, 0);
  box('roofG', 2 * PB - .4, .12, 2 * PB - .4, 0, 8.06, 0);
  for (let f = 0; f < 4; f++) withFrame(0, 0, 0, f * Math.PI / 2, () => {
    for (let k = -2; k <= 2; k++) {
      if (f === 0 && k === 0) { box('steel', 6, 5, .1, 0, 2.6, PB + .05); for (let j = 0; j < 4; j++) box('trunk', 6.4, .3, .1, 0, 1 + j * 1.2, PB + .12, 0, (j % 2 ? .2 : -.2)); continue; }
      box('grille', 8, 4.4, .1, k * 11, 2.3, PB + .05); box('clubs_rust', 9, .2, 1.2, k * 11, 4.8, PB + .6, 0, 0, .12);
    }
    box('clubs_gold', 2 * PB, .3, .2, 0, 7.6, PB + .1);
    for (let k = -3; k <= 3; k++) ctx.tree(k * 8.4, PB - 1.4, .5, 8.12);
  });
  // shaft, bands, crown band, corner piers
  box('clubs_fac', 2 * TB, 72, 2 * TB, 0, 44, 0);
  for (const y of [30, 55]) box('clubs_stone', 2 * TB + .6, .8, 2 * TB + .6, 0, y, 0);
  box('clubs_stone', 2 * TB + 1.6, 1, 2 * TB + 1.6, 0, 80, 0);
  box('clubs_stone', 2 * TB + 2, 8, 2 * TB + 2, 0, HB - 4, 0);
  for (const y of [82, 86]) box('clubs_gold', 2 * TB + 2.2, .3, 2 * TB + 2.2, 0, y, 0);
  for (const a of [-1, 1]) for (const b of [-1, 1]) box('clubs_stone', 4.5, HB - 8 + 1.4, 4.5, a * (TB + .5), (HB + 8 + 1.4) / 2, b * (TB + .5));
  // murals: one giant card per face (clubs and others), pasted slightly askew
  const C = TB + .7;
  [['K', 'C', 0, 0, 0, 30], ['Q', 'C', Math.PI / 2, 2, 46, 28], ['K', 'S', Math.PI, -3, 44, 28], ['J', 'C', -Math.PI / 2, 4, 45, 26]].forEach(([rk, st, ry, off, y, w], i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 1.5), cards.cardMaterial(rk, st));
    const dx = Math.sin(ry), dz = Math.cos(ry);   // face normal
    m.position.copy(K.fpos(dx * C + dz * off, y || 46, dz * C - dx * off)); m.rotation.y = ry; m.rotation.z = (i % 2 ? 1 : -1) * .025;
    scene.add(m);
  });
  // ivy: climbing curtains (behind the murals) and hanging vines from the crown (in front)
  for (let f = 0; f < 4; f++) withFrame(0, 0, 0, f * Math.PI / 2, () => {
    for (let k = 0; k < 9; k++) {
      const w = 3 + R() * 7, c = (R() - .5) * (2 * TB - w - 4); let h = 12 + R() * 58;
      if (Math.abs(c) < 12) h = Math.min(h, 14);
      box('ivy', w, h, .5, c, 8 + h / 2, TB + .3);
    }
    for (let k = 0; k < 7; k++) { const w = .6 + R() * 1.4, h = 5 + R() * 22, c = (R() - .5) * (2 * TB - 4); box('ivy', w, h, .35, c, 80 - h / 2, TB + 1.4); }
    box('ivy', 2 * TB + 2, 1.2, .5, 0, HB - 7.6, TB + 1.2);
    for (let k = 0; k < 4; k++) { const w = 4 + R() * 8, c = (R() - .5) * (2 * PB - w); box('ivy', w, 3 + R() * 5, .5, c, 4, PB + .3); }
  });
}

function roof(ctx) {
  box('roof', 2 * TB + 1.6, .12, 2 * TB + 1.6, 0, HB + .06, 0);
  put('clubs_art', new THREE.PlaneGeometry(22, 22), M4(0, RF + .015, 0, -Math.PI / 2, 0, 0));
  // crown parapet: wall, gilded pyramid spikes, corner turrets
  const E = TB + .7;
  for (let f = 0; f < 4; f++) withFrame(0, 0, 0, f * Math.PI / 2, () => {
    box('clubs_stone', 2 * TB + 2, 1.3, .6, 0, HB + .65, E);
    box('clubs_gold', 2 * TB + 2, .15, .7, 0, HB + 1.35, E);
    for (let k = -5; k <= 5; k++) {
      const big = k === 0, h = big ? 6 : k % 2 ? 2.4 : 3.8, rr = big ? 1.1 : .7;
      cyl('clubs_gold', rr, h, k * 5, HB + 1.4 + h / 2, E, 0, Math.PI / 4, 0, 4, 0);
      if (big || !(k % 2)) sph('clubs_gold', big ? .45 : .28, k * 5, HB + 1.4 + h + (big ? .3 : .15), E);
      if (k % 2 && k > -5 && k < 5) box('clubs_bulb', .2, .2, .2, k * 5, HB + 1.6, E - .45);
    }
  });
  for (const a of [-1, 1]) for (const b of [-1, 1]) {
    const x = a * (TB + .5), z = b * (TB + .5), y = HB + 1.4;
    cyl('clubs_stone', 2.6, 4, x, y + 2, z, 0, 0, 0, 8); cyl('clubs_gold', 2.8, .3, x, y + 4.1, z, 0, 0, 0, 8);
    cyl('clubs_gold', 2.6, 4, x, y + 6.2, z, 0, 0, 0, 8, 0); sph('clubs_gold', .5, x, y + 8.6, z);
    K.beacon(x, y + 9.4, z, .4);
    ctx.tree(x - a * 4.5, z - b * 4.5, .6, RF + .7); box('concD', 2.6, .7, 2.6, x - a * 4.5, RF + .35, z - b * 4.5);
  }
  // venue: crowned marquee, ring of white tents, string lights
  pavilion();
  const T = [[0, 21, 0], [21, 0, Math.PI / 2], [0, -21, Math.PI], [-21, 0, -Math.PI / 2], [20, 20, Math.PI / 4], [-20, 20, -Math.PI / 4], [20, -20, Math.PI * .75], [-20, -20, -Math.PI * .75]];
  for (const [x, z, ry] of T) {
    tent(x, z, ry + Math.PI);
    lights([x, RF + 4.6, z], [Math.sign(x) * 6.6, RF + 4.4, Math.sign(z) * 6.6], .9);
  }
  // service: stair head-house, rusty water tank, AC units, floodlight poles
  box('clubs_stone', 5, 3.6, 5, -13, RF + 1.8, -13); box('roof', 5.4, .3, 5.4, -13, RF + 3.75, -13); box('steel', 1.4, 2.3, .06, -13, RF + 1.15, -10.47);
  for (const a of [-1, 1]) for (const b of [-1, 1]) box('pipeR', .2, 3, .2, 13 + a * 1.4, RF + 1.5, -13 + b * 1.4);
  cyl('pipeR', 2, 3, 13, RF + 4.5, -13, 0, 0, 0, 14); cyl('pipeR', 2.05, .9, 13, RF + 6.45, -13, 0, 0, 0, 14, .2);
  K.acUnit(12, RF, 12); K.acUnit(14, RF, 12); K.acUnit(-12, RF, 13, Math.PI / 2);
  for (const [x, z] of [[26, 26], [-26, 26], [26, -26], [-26, -26]]) {
    box('steel', .25, 7, .25, x * .9, RF + 3.5, z * .9);
    K.floodlight(x * .9 - Math.sign(x) * .4, RF + 7, z * .9 - Math.sign(z) * .4, 0, RF, 0, 0xffe0b0, 3000, .5, false);
  }
  for (let k = 0; k < 10; k++) { const a = k * .63 + .3, rr = 24 + (k % 3) * 1.5; sph('leaf', .8 + (k % 3) * .3, Math.cos(a) * rr, RF + .4, Math.sin(a) * rr, 1.3, .7, 1.3); }
}

function plaza(ctx, R) {
  box('walk', 138, .12, 138, 0, .06, 0);
  const placed = [];
  const free = (x, z, rr) => Math.max(Math.abs(x), Math.abs(z)) > PB + 4 + rr && placed.every(([a, b, c]) => Math.hypot(a - x, b - z) > c + rr);
  // grass and weeds breaking through
  for (let k = 0; k < 40; k++) { const x = (R() - .5) * 130, z = (R() - .5) * 130; if (Math.max(Math.abs(x), Math.abs(z)) < PB + 2) continue; box('grass', 3 + R() * 8, .04, 3 + R() * 8, x, .14, z, R() * 3); }
  // abandoned cars, then overgrown trees around them
  const ck = ['truckW', 'truckB', 'contR', 'clubs_rust', 'paintW', 'clubs_rust'];
  for (let k = 0, n = 0; k < 60 && n < 11; k++) {
    const x = (R() - .5) * 124, z = (R() - .5) * 124; if (!free(x, z, 3)) continue;
    car(x, z, R() * Math.PI * 2, ck[n % ck.length]); placed.push([x, z, 3]); n++;
    if (R() < .5) box('ivy', 1.4 + R(), .2, 1.4, x, 1.1, z);
  }
  for (let k = 0, n = 0; k < 400 && n < 55; k++) {
    const x = (R() - .5) * 132, z = (R() - .5) * 132; if (!free(x, z, 2)) continue;
    ctx.tree(x, z, .9 + R() * .8, .12); placed.push([x, z, 2]); n++;
  }
  for (let k = 0; k < 24; k++) { const x = (R() - .5) * 132, z = (R() - .5) * 132; if (Math.max(Math.abs(x), Math.abs(z)) < PB + 3) continue; sph('leaf', .7 + R() * .8, x, .4, z, 1.4, .7, 1.4); }
  for (const [x, z] of [[-40, 40], [40, 40], [-40, -40], [40, -40]]) K.lamp(x, z, 6, { spot: false, warm: true, y0: .12 });
}

/* ───────────── build ───────────── */
export function build(ctx, d) {
  materials();
  const R = K.rng(3141);
  withFrame(d.x, 0, d.z, 0, () => {
    plaza(ctx, R);
    tower(ctx, R);
    roof(ctx);
    K.addSpot(0xffd09a, 700, 30, .9, .6, K.fpos(0, RF + 6, 0), K.fpos(0, RF, 0));
  });
  ctx.dayNight.push((day) => { K.mats.clubs_fac.emissiveIntensity = day ? 0 : .9; });
  ctx.pois.push({ id: d.id, cam: [d.x + 95, HB + 55, d.z + 110], tgt: [d.x, HB - 15, d.z], spawn: [d.x, RF + .1, d.z + 14], yaw: 0 });
}
