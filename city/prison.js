// Prison (P4): a 10 m precast perimeter wall with lit watchtowers, a lamp- and tree-lined street on the west,
// and a 5-storey U-shaped cell block round an open atrium — galleries with mesh railings, rows of cell doors,
// zig-zag steel stairs, a mess yard, serving counter, guard station, wash block and lockers. Cold fluorescent mood.
// Local frame: centre of the footprint; block U opens south onto the forecourt, main gate in the west wall.
import * as THREE from 'three';
import * as K from '../kit.js';
const { box, cyl, plane, strut, withFrame, def, std, bas, canvasTex, noise } = K;

const FL = 4, NF = 5, H = FL * NF;           // floor height, storeys, block height
const GW = 2.5;                              // gallery depth from the facade
const LA = 3.45, SW = 1.4, PZ = 5.8;         // stair lane A centre, flight width, pad outer edge (lane B = LA + 1.6)
const WX0 = -77.5, WX1 = 91.5, WZ0 = -76.5, WZ1 = 76.5, WH = 10, GZ = 45, GWD = 7, GH = 5.6;   // perimeter wall + gate

/* ───────────── materials ───────────── */
function defineMats() {
  if (K.mats.prison_ext) return;
  const r = K.rng(4401), lit = [];
  for (let i = 0; i < 16; i++) lit.push(r() < .28 ? (r() < .75 ? 'w' : 'c') : null);
  const slit = (g, x, y) => g.fillRect(x + 56, y + 30, 16, 52);
  const ext = canvasTex(512, 512, (g, w, h) => {   // 16 m tile: 4×4 bays of slit windows, floor joints, streaks
    g.fillStyle = '#878b8d'; g.fillRect(0, 0, w, h); noise(g, w, h, 30);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const x = i * 128, y = j * 128;
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x, y + 124, 128, 4); g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(x, y, 3, 128);
      g.fillStyle = '#16191c'; slit(g, x, y); g.fillStyle = '#5d6266'; for (let k = 0; k < 3; k++) g.fillRect(x + 59 + k * 4.5, y + 30, 1.5, 52);
      const gr = g.createLinearGradient(0, y + 82, 0, y + 128); gr.addColorStop(0, 'rgba(30,24,18,.35)'); gr.addColorStop(1, 'rgba(30,24,18,0)'); g.fillStyle = gr; g.fillRect(x + 58, y + 82, 12, 46);
    }
    for (let i = 0; i < 30; i++) { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(20,18,14,.3)'); gr.addColorStop(1, 'rgba(20,18,14,0)'); g.fillStyle = gr; g.fillRect(Math.random() * w, Math.random() * h * .5, 2 + Math.random() * 5, h * Math.random()); }
  }, { repeat: true });
  const extG = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    lit.forEach((l, k) => { if (!l) return; g.fillStyle = l === 'w' ? '#ffc888' : '#bfe0ff'; slit(g, (k % 4) * 128, (k >> 2) * 128); });
  }, { repeat: true });
  def('prison_ext', std({ map: ext, emissiveMap: extG, emissive: 0xffffff, emissiveIntensity: 0, roughness: .9 }), 16);
  def('prison_in', std({ map: K.texConcrete, color: 0xc6cec6, roughness: .8 }), 4);
  def('prison_floor', std({ map: K.texConcrete, color: 0x858b8e, roughness: .28, metalness: .3 }), 5);   // wet slab
  def('prison_door', std({ color: 0x46514f, roughness: .55, metalness: .6 }));
  def('prison_dwin', std({ color: 0x2a1c10, emissive: 0xffa040, emissiveIntensity: .6 }));
  def('prison_cab', std({ color: 0x3a3020, emissive: 0xffc070, emissiveIntensity: .5, roughness: .3 }));
  def('prison_scr', bas({ color: new THREE.Color(.5, 1.5, 3) }));
  def('prison_glass', std({ color: 0x9cc4d2, transparent: true, opacity: .28, roughness: .08, metalness: .5, depthWrite: false }));
  def('prison_tile', std({ map: canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#d2d9d7'; g.fillRect(0, 0, w, h); noise(g, w, h, 14); g.fillStyle = '#98a2a2';
    for (let i = 0; i < w; i += 16) { g.fillRect(i, 0, 2, h); g.fillRect(0, i, w, 2); }
  }, { repeat: true }), roughness: .35 }), 1);
  def('prison_locker', std({ map: canvasTex(256, 256, (g, w, h) => {   // 2 m tile: 4 columns of 2-tier lockers
    g.fillStyle = '#5b6c78'; g.fillRect(0, 0, w, h); noise(g, w, h, 18);
    for (let i = 0; i < 4; i++) {
      const x = i * 64; g.fillStyle = '#262e34'; g.fillRect(x, 0, 3, h); g.fillRect(x, 126, 64, 4);
      for (const y0 of [14, 142]) for (let k = 0; k < 5; k++) g.fillRect(x + 18, y0 + k * 7, 28, 3);
      g.fillStyle = '#c8cfd4'; g.fillRect(x + 50, 90, 4, 16); g.fillRect(x + 50, 218, 4, 16);
    }
  }, { repeat: true }), roughness: .5, metalness: .4 }), 2);
  def('prison_food', std({ color: 0xb8652a, roughness: .7 }));
  def('prison_tray', std({ color: 0x8fa0a8, roughness: .35, metalness: .6 }));
}

/* ───────────── helpers ───────────── */
// grey mesh-panel railing from (x1,z1) to (x2,z2) on deck height y
function grayRail(x1, z1, x2, z2, y, h = 1.1) {
  const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz); if (L < .2) return;
  plane('fence', L, h - .15, (x1 + x2) / 2, y + .1 + (h - .15) / 2, (z1 + z2) / 2, K.ang(dx, dz));
  strut('steelL', [x1, y + h, z1], [x2, y + h, z2], .045, 6);
  const n = Math.max(1, Math.round(L / 2));
  for (let i = 0; i <= n; i++) { const t = i / n; box('steelL', .07, h, .07, x1 + dx * t, y + h / 2, z1 + dz * t); }
}
function railX(a, b, z, y, gaps) {   // rail along local x at constant z, leaving gaps
  let s = a;
  for (const [g0, g1] of [...gaps].sort((p, q) => p[0] - q[0])) { if (g1 <= s || g0 >= b) continue; grayRail(s, z, Math.max(s, g0), z, y); s = Math.max(s, g1); }
  grayRail(s, z, b, z, y);
}
// guard cabin: lit glazing band + pitched cap, floor at y
function cabin(x, y, z) {
  box('concD', 4.6, .35, 4.6, x, y + .1, z);
  for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) box('steel', .18, 3, .18, x + a * 2.1, y + 1.7, z + b * 2.1);
  box('wallD', 4.2, 1, 4.2, x, y + .8, z);
  box('prison_cab', 3.9, 1.5, 3.9, x, y + 2.05, z);
  for (const s of [-1, 1]) { box('steel', .08, 1.5, 4.0, x + s * .7, y + 2.05, z); box('steel', 4.0, 1.5, .08, x, y + 2.05, z + s * .7); }
  box('concD', 4.8, .3, 4.8, x, y + 3.35, z);
  cyl('steel', 3.5, 1.7, x, y + 4.35, z, 0, Math.PI / 4, 0, 4, .05);   // pyramid cap
  cyl('steelL', .3, .5, x + 2.5, y + 1.6, z, 0, 0, Math.PI / 2, 10);   // searchlight
  K.beacon(x, y + 5.5, z, .3);
}

/* ───────────── street + perimeter ───────────── */
function street(ctx) {
  box('road', 10, .06, 160, -90, .03, 0);
  for (let z = -76; z < 80; z += 8) box('lineW', .18, .02, 3, -90, .07, z);
  box('walk', 7.4, .16, 160, -81.5, .08, 0); box('concD', .25, .22, 160, -85.2, .11, 0);
  for (let z = -72; z <= 72; z += 12) if (Math.abs(z - GZ) > 7) ctx.tree(-81.4, z, .85 + Math.random() * .3, .16);
  for (let z = -66; z <= 70; z += 16) if (Math.abs(z - GZ) > 8) K.lamp(-84.6, z, 7.5, { dir: -Math.PI / 2, spot: false, warm: true, y0: .16 });
}
function wallRun(x1, z1, x2, z2) {   // precast wall with pilasters both faces, coping and leaning wire
  const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz);
  withFrame((x1 + x2) / 2, 0, (z1 + z2) / 2, K.ang(dx, dz), () => {
    box('panel', L, WH, 1, 0, WH / 2, 0); box('concD', L + .2, .35, 1.4, 0, WH + .17, 0);
    const n = Math.max(1, Math.round(L / 6));
    for (let i = 0; i <= n; i++) {
      const s = -L / 2 + i * L / n;
      for (const t of [-1, 1]) box('concD', .6, WH, .3, s, WH / 2, t * .65);
      strut('steel', [s, WH + .3, 0], [s, WH + 1.6, -.6], .04, 4);
    }
    for (const h of [.45, .85, 1.25]) box('steelL', L, .03, .03, 0, WH + .3 + h, -h * .46);
  });
}
function perimeter() {
  wallRun(WX0, WZ0, WX1, WZ0); wallRun(WX1, WZ0, WX1, WZ1); wallRun(WX1, WZ1, WX0, WZ1);
  wallRun(WX0, WZ1, WX0, GZ + GWD / 2); wallRun(WX0, GZ - GWD / 2, WX0, WZ0);
  // main gate: lintel, steel frame, open sliding leaf parked inside, plate above
  box('panel', 1, WH - GH, GWD, WX0, (WH + GH) / 2, GZ); box('concD', 1.4, .35, GWD, WX0, WH + .17, GZ);
  box('steel', 1.3, .4, GWD, WX0, GH + .2, GZ);
  for (const s of [-1, 1]) box('steel', 1.3, GH, .3, WX0, GH / 2, GZ + s * (GWD / 2 - .15));
  const lx = WX0 + 1, lz = GZ + GWD;   // leaf
  for (const y of [.25, 2.6, 4.9]) box('steel', .12, .14, GWD, lx, y, lz);
  for (let i = 0; i <= 26; i++) box('steelL', .05, 4.8, .05, lx, 2.6, lz - GWD / 2 + i * GWD / 26);
  box('steel', .14, .05, GWD * 2, lx, .07, GZ + GWD / 2);
  box('paintW', .06, .9, 4.2, WX0 - .56, GH + 1.5, GZ); box('glowC', .08, .06, 4.2, WX0 - .6, GH + 2.1, GZ);
  // watchtowers: 4 corners + 4 mid-wall
  for (const [x, z] of [[WX0, WZ0], [WX1, WZ0], [WX1, WZ1], [WX0, WZ1], [WX0, -15], [WX1, 0], [7, WZ0], [7, WZ1]]) {
    box('conc', 3, 14, 3, x, 7, z); box('concD', 3.4, .4, 3.4, x, 4, z); box('concD', 3.4, .4, 3.4, x, WH + .2, z);
    cabin(x, 13.9, z);
  }
  // fake wall-mounted floods on the inner faces + ivy on the street face
  for (const z of [-50, -10, 25, 62]) { K.floodlight(WX0 + .8, 8.5, z, -60, 0, z, 0xe8f2ff, 0, .5, false); K.pool(-66, z, 6); }
  for (const x of [-30, 20, 70]) { K.floodlight(x, 8.5, WZ0 + .8, x, 0, -66, 0xe8f2ff, 0, .5, false); K.floodlight(x, 8.5, WZ1 - .8, x, 0, 64, 0xe8f2ff, 0, .5, false); K.pool(x, 64, 6); }
  const r = K.rng(4403);
  for (let i = 0; i < 12; i++) {
    const h = 2 + r() * 7, w = 1.5 + r() * 4, z = -70 + r() * 140; if (Math.abs(z - GZ) < 6) continue;
    box('ivy', .4, h, w, WX0 - .95, h / 2, z);
  }
  for (let i = 0; i < 6; i++) { const h = 2 + r() * 6, w = 2 + r() * 5; box('ivy', w, h, .4, -60 + r() * 140, h / 2, WZ0 - .95); }
}

/* ───────────── cell block ───────────── */
// one courtyard facade. Frame: origin at a courtyard corner, local +x along the face, +z into the courtyard.
// o.g gallery span, o.rail outer-rail span, o.ends end-rails at [g0,g1], o.stairs stair start positions, o.roof roof-stair s0
function face(x0, z0, dx, dz, L, o) {
  withFrame(x0, 0, z0, K.ang(dx, dz), () => {
    const [g0, g1] = o.g, gaps = o.stairs.map((s) => [s - 1.6, s]);
    box('prison_in', L, H, .1, L / 2, H / 2, .05);
    for (let f = 0; f < NF; f++) {
      const y = f * FL;
      for (let s = 1.8; s < L - 1.2; s += 3.2) {   // cell doors with warm spy-windows
        box('steel', 1.24, 2.32, .06, s, y + 1.16, .13);
        box('prison_door', 1.04, 2.18, .1, s, y + 1.1, .16);
        box('prison_dwin', .2, .42, .03, s, y + 1.62, .22);
      }
      box('concD', L, .3, .12, L / 2, y + FL - .15, .12);   // slab band
      if (f > 0) {   // gallery deck, kick plate, brackets, mesh railing
        box('concD', g1 - g0, .22, GW - .1, (g0 + g1) / 2, y - .06, .1 + (GW - .1) / 2);
        box('steelL', g1 - g0, .3, .08, (g0 + g1) / 2, y - .1, GW - .04);
        for (let s = g0 + 2; s < g1; s += 6) strut('steel', [s, y - 1.3, .1], [s, y - .17, GW - .15], .05, 4);
        railX(o.rail[0], o.rail[1], GW, y + .05, gaps);
        if (o.ends[0]) grayRail(g0 + .05, .1, g0 + .05, GW, y + .05);
        if (o.ends[1]) grayRail(g1 - .05, .1, g1 - .05, GW, y + .05);
      }
      // strip lights under the gallery above (top floor: on the wall), with fake floor pools
      const top = f === NF - 1, ly = top ? y + 3.4 : y + FL - .2, lz = top ? .25 : 1.4;
      for (let s = g0 + 2, i = 0; s < g1 - 1; s += 4, i++) { box('glowC', 1.5, .06, .16, s, ly, lz); if (i % 2 === 0) K.pool(s, 1.7, 2.6, false, y + (f ? .05 : 0)); }
    }
    // zig-zag stairs: switchback per storey in two lanes beside the gallery, pads tie them to each gallery
    for (const s0 of o.stairs) {
      const nS = o.roof === s0 ? NF : NF - 1;
      for (let f = 0; f < nS; f++) K.switchback(s0, LA, 1, 0, f * FL + .05, (f + 1) * FL + .05, SW);
      for (let f = 1; f < NF; f++) {
        const y = f * FL;
        box('grate', 1.6, .1, PZ - GW, s0 - .8, y, (GW + PZ) / 2);
        grayRail(s0 - 1.6, PZ, s0, PZ, y + .05); grayRail(s0 - 1.6, GW, s0 - 1.6, PZ, y + .05);
      }
      if (o.roof === s0) {   // roof landing bridging onto the wing roof
        box('grate', 1.6, .1, PZ + .6, s0 - .8, H, (PZ - .6) / 2);
        grayRail(s0 - 1.6, PZ, s0, PZ, H + .05); grayRail(s0 - 1.6, 0, s0 - 1.6, PZ, H + .05); grayRail(s0, 0, s0, LA + SW / 2 + .1, H + .05);
      }
    }
    // roof parapet on the courtyard edge (gap at the roof stair)
    const pg = o.roof != null ? [[o.roof - 1.6, o.roof]] : [];
    let s = 0;
    for (const [a, b] of pg) { box('concD', a - s, 1.1, .3, (s + a) / 2, H + .6, -.15); s = b; }
    box('concD', L - s, 1.1, .3, (s + L) / 2, H + .6, -.15);
    // idle inmates on the galleries
    for (const [ps, pf] of o.people || []) { const p = K.fpos(ps, 0, 1.3); K.person(p.x, p.z, pf * FL + .05); }
  });
}
function cellBlock() {
  // wings: north (x −45..55, z −65..−51), west (x −45..−31, z −51..15), east (x 41..55, z −51..15)
  box('prison_ext', 100, H, 14, 5, H / 2, -58); box('prison_ext', 14, H, 66, -38, H / 2, -18); box('prison_ext', 14, H, 66, 48, H / 2, -18);
  box('roof', 100, .1, 14, 5, H, -58); box('roof', 14, .1, 66, -38, H, -18); box('roof', 14, .1, 66, 48, H, -18);
  // outer pilasters, plinth, parapets, downpipes
  for (let x = -45; x <= 55; x += 8.33) box('concD', .8, H + 1.2, .5, x, (H + 1.2) / 2, -65.25);
  for (let z = -65; z <= 15; z += 8) { box('concD', .5, H + 1.2, .8, -45.25, (H + 1.2) / 2, z); box('concD', .5, H + 1.2, .8, 55.25, (H + 1.2) / 2, z); }
  box('concD', 100.6, 1, .3, 5, .5, -65.15); box('concD', .3, 1, 80, -45.15, .5, -25); box('concD', .3, 1, 80, 55.15, .5, -25);
  box('concD', 100, 1.1, .3, 5, H + .6, -64.85); box('concD', .3, 1.1, 80, -44.85, H + .6, -25); box('concD', .3, 1.1, 80, 54.85, H + .6, -25);
  box('concD', 14, 1.1, .3, -38, H + .6, 14.85); box('concD', 14, 1.1, .3, 48, H + .6, 14.85);
  for (const z of [-40, -5]) { cyl('pipeD', .12, H, -45.6, H / 2, z, 0, 0, 0, 8); cyl('pipeD', .12, H, 55.6, H / 2, z, 0, 0, 0, 8); }
  const r = K.rng(4404);
  for (let i = 0; i < 6; i++) { const h = 3 + r() * 9, w = 2 + r() * 5; box('ivy', .4, h, w, -45.6, h / 2, -60 + r() * 70); }
  // courtyard facades
  face(-31, -51, 1, 0, 72, { g: [0, 72], rail: [2.5, 69.5], ends: [false, false], stairs: [58], people: [[20, 2], [44, 4]] });
  face(-31, 15, 0, -1, 66, { g: [0, 63.5], rail: [0, 63.5], ends: [true, false], stairs: [6], roof: 6, people: [[30, 1]] });
  face(41, -51, 0, 1, 66, { g: [2.5, 66], rail: [2.5, 66], ends: [false, true], stairs: [56], people: [[40, 3]] });
}

/* ───────────── courtyard + forecourt ───────────── */
function mess() {
  const r = K.rng(4405);
  for (const x of [-15, -5, 5, 15]) for (const z of [-42, -36, -30, -24, -18]) {
    box('paintW', 3.2, .07, .9, x, .76, z);
    for (const s of [-1, 1]) {
      box('steel', .08, .72, .7, x + s * 1.3, .38, z);
      box('steelL', 3.2, .05, .32, x, .46, z + s * .78);
      for (const t of [-1, 1]) box('steel', .06, .44, .06, x + t * 1.3, .22, z + s * .78);
    }
    for (let i = 0; i < 4; i++) if (r() < .6) box('prison_tray', .42, .03, .3, x - 1.1 + i * .73, .81, z + (i % 2 ? .22 : -.22));
  }
  for (const [x, z] of [[-10, -36], [10, -36], [-10, -24], [10, -24]]) K.pool(x, z, 7);
  // serving counter along the east wing: base, steel top, trays of food, sneeze guard, heat lamps; kitchen behind
  box('wallD', 1, .9, 20, 37.5, .45, -31); box('steelL', 1.3, .06, 20.2, 37.5, .93, -31);
  for (let z = -40.4; z < -21.6; z += .9) {
    box('prison_tray', .5, .04, .36, 37.4, .98, z);
    box('prison_food', .16, .05, .14, 37.3, 1.02, z - .07); box(r() < .5 ? 'paintW' : 'prison_food', .16, .05, .14, 37.5, 1.02, z + .08);
  }
  box('prison_glass', .04, .5, 20, 36.95, 1.4, -31);
  for (let z = -41; z <= -21; z += 4) { box('steel', .05, .6, .05, 36.95, 1.25, z); strut('steel', [37.5, 2.6, z], [37.5, 3.8, z], .02, 4); }
  for (let z = -39; z <= -23; z += 4) box('glowC', .3, .06, 1.6, 37.5, 2.6, z);
  for (const z of [-39, -35, -27, -23]) K.cabinet(40.3, 0, z, -Math.PI / 2);
  box('steelL', 1, .9, 3, 40.3, .45, -31); cyl('pipeG', .35, .5, 40.3, 1.15, -31.8, 0, 0, 0, 12); cyl('pipeG', .3, .45, 40.3, 1.12, -30.4, 0, 0, 0, 12);
  K.pool(36, -31, 5);
  K.chainFence(-22, -10, -22, 12, 0, 3.2);   // mesh partition by the west wing
}
function guardStation() {
  const gx = 4, gz = 25, w = 7, dd = 5;
  box('conc', w, 1.1, .2, gx, .55, gz - dd / 2);
  for (const s of [-1, 1]) box('conc', .2, 1.1, dd, gx + s * w / 2, .55, gz);
  box('conc', 4.3, 1.1, .2, gx - 1.35, .55, gz + dd / 2); box('conc', 1.1, 1.1, .2, gx + 2.95, .55, gz + dd / 2);   // door gap x gx+.8..gx+2.4
  box('prison_glass', w, 1.5, .05, gx, 1.85, gz - dd / 2);
  for (const s of [-1, 1]) box('prison_glass', .05, 1.5, dd, gx + s * w / 2, 1.85, gz);
  box('prison_glass', 4.3, 1.5, .05, gx - 1.35, 1.85, gz + dd / 2); box('prison_glass', 1.1, 1.5, .05, gx + 2.95, 1.85, gz + dd / 2);
  for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) box('steel', .14, 2.75, .14, gx + a * w / 2, 1.37, gz + b * dd / 2);
  for (const x of [gx + .8, gx + 2.4]) box('steel', .1, 2.75, .2, x, 1.37, gz + dd / 2);
  box('concD', w + .4, .25, dd + .4, gx, 2.85, gz); box('steel', w + .5, .12, dd + .5, gx, 3.02, gz);
  box('wallD', 5.4, .8, .7, gx, .4, gz - 1.8);
  for (let i = 0; i < 4; i++) for (const [yy, zz] of [[1.08, -1.95], [1.6, -2.2]]) {
    box('steel', .6, .42, .06, gx - 1.8 + i * 1.2, yy, gz + zz); box('prison_scr', .52, .34, .02, gx - 1.8 + i * 1.2, yy, gz + zz + .04);
  }
  box('glowC', 3, .05, .2, gx, 2.69, gz); K.pool(gx, gz, 3.5);
  cyl('steel', .3, .45, gx + 3.5, 3.3, gz - 2.5, 0, 0, Math.PI / 2, 8);   // camera
  // mesh enclosure with a gap on the south side, and yard partitions
  K.chainFence(gx - 5, gz - 4, gx + 5, gz - 4, 0, 2.6); K.chainFence(gx + 5, gz - 4, gx + 5, gz + 4, 0, 2.6);
  K.chainFence(gx - 5, gz - 4, gx - 5, gz + 4, 0, 2.6); K.chainFence(gx - 5, gz + 4, gx, gz + 4, 0, 2.6); K.chainFence(gx + 3, gz + 4, gx + 5, gz + 4, 0, 2.6);
  K.chainFence(-31, 18, -12, 18, 0, 3.2); K.chainFence(-4, 18, 41, 18, 0, 3.2);
}
function washBlock() {   // roofless tiled block x 15..40, z 26..50: wash room west, showers east, WC row south
  const T = 'prison_tile', wh = 3;
  const wall = (x1, z1, x2, z2) => { const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz); withFrame((x1 + x2) / 2, 0, (z1 + z2) / 2, K.ang(dx, dz), () => { box(T, L, wh, .2, 0, wh / 2, 0); box('concD', L + .1, .12, .3, 0, wh + .06, 0); }); };
  wall(15, 26, 40, 26); wall(15, 50, 40, 50); wall(40, 26, 40, 50);
  wall(15, 26, 15, 44); wall(15, 46.2, 15, 50);          // entrance z 44..46.2
  wall(27.5, 26, 27.5, 36); wall(27.5, 38, 27.5, 50);    // divider doorway z 36..38
  box(T, 25, .06, 24, 27.5, .08, 38);
  for (let x = 16.5; x < 27; x += 1.6) {   // sinks + mirrors on the north wall
    box('paintW', .6, .2, .45, x, .85, 26.35); box('paintW', .2, .75, .2, x, .38, 26.3);
    box('steelL', .5, .65, .03, x, 1.65, 26.12); cyl('pipeG', .025, .22, x, 1.05, 26.2, 0, 0, 0, 6);
  }
  box('steelL', 8, .25, .9, 21, .85, 33); for (const x of [17.5, 24.5]) box('steel', .1, .72, .7, x, .36, 33);
  strut('pipeG', [17, 1.3, 33], [25, 1.3, 33], .03, 6);
  for (let x = 16.2; x < 26.5; x += 1.5) { box(T, .06, 2, 1.6, x, 1.05, 49.1); box('paintW', .4, .42, .6, x + .75, .21, 49.5); }   // WC stalls
  for (let z = 27.2; z < 49; z += 1.5) {   // shower stalls on the east wall
    box(T, 1.5, 2.1, .06, 39.15, 1.1, z);
    strut('pipeG', [39.85, 2.2, z + .75], [39.4, 2.3, z + .75], .03, 6); cyl('pipeG', .1, .04, 39.4, 2.27, z + .75, 0, 0, 0, 8);
    box('valve', .1, .1, .06, 39.85, 1.2, z + .75);
  }
  for (let x = 29.5; x < 37; x += 1.5) { box(T, .06, 2.1, 1.5, x, 1.1, 49.2); cyl('pipeG', .1, .04, x + .75, 2.27, 49.5, 0, 0, 0, 8); }
  box('steelL', 6, .08, .5, 33, .45, 38); for (const x of [30.5, 35.5]) box('steel', .08, .42, .4, x, .21, 38);
  for (const [x, z, ry] of [[21, 26.25, 0], [33.5, 26.25, 0], [21, 49.75, 0], [33.5, 49.75, 0]]) box('glowC', 2.6, .06, .14, x, 2.8, z, ry);
  for (const z of [32, 44]) box('glowC', .14, .06, 2.6, 39.75, 2.8, z);
  for (const [x, z] of [[21, 30], [21, 42], [33.5, 32], [33.5, 44]]) K.pool(x, z, 4);
}
function lockers() {   // locker banks with benches, x −28..−16
  for (const z of [31, 35, 39]) { box('prison_locker', 12, 2, .5, -22, 1, z); box('steelL', 12.1, .05, .55, -22, 2.02, z); }
  for (const z of [33, 37]) { box('steelL', 10, .06, .4, -22, .45, z); for (const x of [-26.5, -22, -17.5]) box('steel', .06, .42, .3, x, .21, z); }
}
function roof() {
  const r = K.rng(4406), y = H + .05;
  for (let i = 0; i < 8; i++) K.acUnit(-12 + i * 8 + r() * 2, y, -62 + r() * 3, r() < .5 ? 0 : Math.PI);
  for (const z of [-44, -30, -12]) { K.acUnit(51, y, z, Math.PI / 2); K.acUnit(-41, y, z + 8, -Math.PI / 2); }
  for (const [x, z] of [[48, -38], [48, -26], [-38, -4]]) {   // water tanks on stands
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) box('steel', .18, 1.3, .18, x + a * 1.3, y + .65, z + b * 1.3);
    box('steel', 3.2, .15, 3.2, x, y + 1.35, z); cyl('steelL', 1.7, 3.2, x, y + 3.02, z, 0, 0, 0, 16); cyl('steel', 1.75, .5, x, y + 4.85, z, 0, 0, 0, 16, .3);
  }
  box('concD', 10, 3.6, 7, -22, y + 1.8, -58); box('roof', 10.4, .2, 7.4, -22, y + 3.7, -58); box('prison_door', 1.2, 2.2, .1, -22, y + 1.1, -54.45);
  box('concD', 7, 3, 6, 32, y + 1.5, -59); box('grille', 3, 1.4, .05, 32, y + 1.7, -55.97);
  K.truss(5, -58, 3, 3, 7, { y0: y, leg: .28, rb: .06 }); cabin(5, y + 7, -58);   // rooftop guard tower
  box('steel', .3, 3.8, .3, 5, y + 1.9, -63.6);   // mast of the courtyard floodlight (real light added in world space)
}

/* ───────────── build ───────────── */
export function build(ctx, d) {
  defineMats();
  const M = K.mats;
  ctx.dayNight.push((day) => { M.prison_ext.emissiveIntensity = day ? 0 : .3; M.prison_dwin.emissiveIntensity = day ? .6 : 2.6; M.prison_cab.emissiveIntensity = day ? .5 : 3; });
  withFrame(d.x, 0, d.z, 0, () => {
    box('prison_floor', WX1 - WX0 + 1, .1, WZ1 - WZ0 + 1, (WX0 + WX1) / 2, 0, 0);   // wet slab inside the walls (top y .05)
    street(ctx); perimeter(); cellBlock(); mess(); guardStation(); washBlock(); lockers(); roof();
    for (const [x, z] of [[-36, 32], [-36, 62], [-8, 60], [26, 60], [62, 30], [62, 62], [70, -20], [-60, -40]]) K.lamp(x, z, 6, { spot: false, dir: 0 });
  });
  // the district's two real lights (world coords): gate street lamp + courtyard flood from the north roof
  K.lamp(d.x - 83, d.z + 53, 8, { dir: Math.PI / 2, spot: true, warm: true, intensity: 700, y0: .16 });
  K.floodlight(d.x + 5, H + 3.9, d.z - 63.4, d.x + 5, 0, d.z - 22, 0xe8f2ff, 3000, .75, true);
  // idle people (world coords)
  const P = (x, z, y = 0) => K.person(d.x + x, d.z + z, y + .05);
  P(-12, -39.5); P(4, -27.5); P(14, -21.5); P(-6, -33); P(39.3, -33); P(3, 25.5); P(-74.5, 41); P(-73, 50); P(21, 36); P(-14, 34);
  ctx.pois.push({ id: d.id, cam: [d.x - 120, 72, d.z + 120], tgt: [d.x + 2, 6, d.z - 16], spawn: [d.x, .1, d.z - 5], yaw: 0 });
}
