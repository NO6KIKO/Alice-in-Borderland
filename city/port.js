// Container terminal (ref 1.webp / 8.webp), drawn in WORLD coordinates. The image camera stands on the land
// side looking at the water: image back = +x (east quay), right = +z (south quay), front = −x (west road).
// Enclosure x 196..310, z 182..300: front edge of containers + red arch gate (x≈199, z≈232.5), central plaza
// with the camera mast, terraced north block, back container wall with a second arch, south compound with
// corridor / catwalk / bridge. Outside: west road + zebra, perimeter road with light masts, STS cranes,
// loose container yard north of the enclosure and two moored container ships in the bay.
import * as THREE from 'three';
import * as K from '../kit.js';

const { box, cyl, sph, strut, put, M4, withFrame } = K;
const G = .06;                                   // slab top
const CH = 2.59, HC = 2.9, CW = 2.44, L40 = 12.19, L20 = 6.06;
const GX = 199, GZ = 232.5;                      // main gate (arch) centre
const MX = 250, MZ = 232.5;                      // plaza mast
let r = K.rng(330175);

/* ───────────── materials ───────────── */
function defMats() {
  if (K.mats.port_red) return;
  const c = (hex) => K.std({ map: K.texCorr, color: hex, roughness: .7, metalness: .08 });   // painted steel
  K.def('port_cW', c(0xe2e2dc), 2.4);    // white
  K.def('port_cS', c(0x7f868b), 2.4);    // grey
  K.def('port_cD', c(0x4a4f54), 2.4);    // dark grey
  K.def('port_cO', c(0xa9502c), 2.4);    // rust orange
  K.def('port_cT', c(0x3f7a78), 2.4);    // teal
  K.def('port_cY', c(0xb9a27a), 2.4);    // beige
  K.def('port_cM', c(0x7a2e28), 2.4);    // maroon
  K.def('port_cRB', c(0xa8402e), 2.4);   // bright red (gate / bridges)
  K.def('port_cBB', c(0x2f5d92), 2.4);   // bright blue
  K.def('port_red', K.std({ color: 0xb4321f, roughness: .5, metalness: .45 }));
  K.def('port_hull', K.std({ color: 0x1d2a38, roughness: .6, metalness: .3 }));    // extrude-only (non-indexed)
  K.def('port_hullR', K.std({ color: 0x7a2a22, roughness: .7, metalness: .2 }));   // extrude-only
  K.def('port_wood', K.std({ color: 0xbfa77c, roughness: .9 }), 1);
  K.def('port_pal', K.std({ color: 0x8d7450, roughness: .95 }), 1);
  K.def('port_tarp', K.std({ color: 0x2f5f7a, roughness: .85 }), 2);
  K.def('port_slab', K.std({ map: K.texConcrete, color: 0xb4b5b0, roughness: .93 }), 7);
  K.def('port_chrome', K.std({ color: 0xe6ecf2, roughness: .08, metalness: 1, emissive: 0x9fd0ff, emissiveIntensity: 0 }));
  K.def('port_head', K.std({ color: 0xc4c8cc, roughness: .5, metalness: .3, emissive: 0xbfe0ff, emissiveIntensity: 0 }));
}
const PAL = ['contR', 'contR', 'contB', 'contB', 'contG', 'port_cW', 'port_cW', 'port_cS', 'port_cO', 'port_cT', 'port_cY', 'port_cM', 'port_cBB'];
const pick = (a) => a[Math.floor(r() * a.length)];
const col = () => pick(PAL);
const RWB = ['contR', 'port_cRB', 'port_cW', 'port_cW', 'contB', 'port_cBB'];

/* ───────────── containers ───────────── */
// one ISO box along local x: lod 0 bare box, 1 + end frames, 2 + door bars & top rails
function ctr(k, len, x, y, z, ry = 0, lod = 1, h = CH) {
  withFrame(x, y, z, ry, () => {
    box(k, len, h, CW, 0, h / 2, 0);
    if (lod < 1) return;
    for (const s of [-1, 1]) box('steel', .12, h + .01, CW + .02, s * (len / 2 - .05), h / 2, 0);
    if (lod < 2) return;
    for (const zz of [-.85, -.3, .3, .85]) box('steelL', .04, h - .3, .05, len / 2 + .02, h / 2, zz);
    for (const s of [-1, 1]) box('steel', len - .2, .12, .06, 0, h - .08, s * (CW / 2 + .01));
  });
}
// stacked block: nc columns along the container axis `ax`, nr rows across; H(c,r) tiers. Only boxes with an
// exposed face are drawn (the hidden core stays solid for collision because it is fully enclosed).
function blockGrid(x0, z0, nc, nr, ax, len, H, colF = col, lod = 2) {
  const pl = len + .06, pr = 2.5;
  const h = (c, q) => (c < 0 || q < 0 || c >= nc || q >= nr) ? 0 : H(c, q);
  for (let c = 0; c < nc; c++) for (let q = 0; q < nr; q++) {
    const t = h(c, q);
    for (let k = 0; k < t; k++) {
      if (k < t - 1 && h(c - 1, q) > k && h(c + 1, q) > k && h(c, q - 1) > k && h(c, q + 1) > k) continue;
      const u = (c + .5) * pl, v = (q + .5) * pr, kk = colF(c, q, k);
      if (ax === 'x') ctr(kk, len, x0 + u, G + k * CH, z0 + v, 0, lod);
      else ctr(kk, len, x0 + v, G + k * CH, z0 + u, Math.PI / 2, lod);
    }
  }
}

/* ───────────── walkway pieces ───────────── */
// ground/terrace stair along +x beside a stack face at zf (stair on side s), with a top landing that opens onto the stack
function faceStair(x0, zf, s, y0, y1) {
  const zc = zf + s * .9, L = K.stairs(x0, zc, 1, 0, y0, y1, 1.6), xl = x0 + L, zo = zf + s * 1.8;
  box('grate', 2, .1, 1.8, xl + 1, y1 - .05, zc);
  K.opening(xl - .2, xl + 2.2, Math.min(zf - s * .6, zf + s * 1.6), Math.max(zf - s * .6, zf + s * 1.6), y1);
  K.railSeg(xl, zo, xl + 2, zo, y1); K.railSeg(xl + 2, zo, xl + 2, zf, y1);
  box('steel', .14, y1 - y0, .14, xl + 2, (y1 + y0) / 2, zo);
  return xl;
}
const rail = (x1, z1, x2, z2, y) => K.railSeg(x1, z1, x2, z2, y);

/* ───────────── props ───────────── */
function forklift(x, z, ry, k = 'yel') {
  withFrame(x, G, z, ry, () => {
    box(k, 2.2, .9, 1.2, 0, .75, 0); box('steel', .5, .8, 1.15, -1.05, .9, 0);
    for (const [a, b] of [[-.8, -.5], [-.8, .5], [.5, -.5], [.5, .5]]) box('steel', .07, 1.3, .07, a, 1.85, b);
    box('grille', 1.45, .06, 1.15, -.15, 2.5, 0); box('pipeD', .5, .5, .6, -.3, 1.45, 0);
    for (const s of [-1, 1]) { box('steel', .1, 3, .12, 1.25, 1.6, s * .35); box('steelL', 1.2, .06, .14, 1.9, .12, s * .3); }
    box('steelL', .06, .6, .9, 1.32, .5, 0);
    for (const [a, b] of [[-.7, -.62], [-.7, .62], [.7, -.62], [.7, .62]]) cyl('tire', .32, .24, a, .32, b, Math.PI / 2, 0, 0, 10);
  });
}
function stacker(x, z, ry, load = true) {   // reach stacker
  withFrame(x, G, z, ry, () => {
    box('yel', 7, 1.4, 2.8, 0, 1.5, 0); box('steel', 1.6, 1.5, 2.8, -3.6, 1.6, 0);
    box('yel', 1.8, 2.2, 1.6, .8, 3.3, -.7); box('win', 1.82, .9, 1.62, .8, 3.8, -.7);
    const a = Math.atan2(5.1, 7.3), Lb = Math.hypot(7.3, 5.1);
    box('yel', Lb, .9, .9, .85, 4.95, .5, 0, a);
    box('yel', .8, .5, 6.2, 4.6, 7.2, .5); box('steel', .4, .8, .4, 4.6, 7.7, .5);
    if (load) ctr(col(), L20, 4.6, 7.2 - .25 - CH, .5, Math.PI / 2, 1);
    for (const [a2, b] of [[-2.4, -1.35], [-2.4, 1.35], [2.3, -1.35], [2.3, 1.35]]) cyl('tire', .8, .6, a2, .8, b, Math.PI / 2, 0, 0, 12);
  });
}
function truck(x, z, ry, load = true) {     // tractor + skeletal trailer (+ 40ft)
  withFrame(x, G, z, ry, () => {
    box('truckB', 2.4, 2.6, 2.5, 7.4, 2.1, 0); box('win', 1, .9, 2.3, 8.2, 2.7, 0); box('steel', 2.6, .5, 2.4, 7.3, .95, 0);
    box('steel', 14, .35, 1.2, .2, 1.15, 0);
    for (const a of [-5, -3.8, 6.8, 8]) for (const s of [-1, 1]) cyl('tire', .5, .35, a, .5, s * 1.0, Math.PI / 2, 0, 0, 10);
    if (load) ctr(col(), L40, -.2, 1.33, 0, 0, 1);
  });
}
function pickup(x, z, ry) {
  withFrame(x, G, z, ry, () => {
    box('truckW', 5.2, .7, 1.9, 0, .85, 0); box('truckW', 2.2, .9, 1.85, .7, 1.65, 0); box('win', 2, .55, 1.87, .7, 1.75, 0);
    box('truckW', 2.3, .45, .08, -1.5, 1.4, .9); box('truckW', 2.3, .45, .08, -1.5, 1.4, -.9); box('truckW', .08, .45, 1.9, -2.6, 1.4, 0);
    for (const a of [-1.7, 1.6]) for (const s of [-1, 1]) cyl('tire', .38, .25, a, .38, s * .9, Math.PI / 2, 0, 0, 10);
  });
}
function crates(x, z, n, y = G) {   // beige pallet crates
  for (let i = 0; i < n; i++) {
    const s = .9 + r() * .5, px = x + (r() - .5) * 3, pz = z + (r() - .5) * 3, a = r() * .4;
    box('port_pal', s + .1, .14, s + .1, px, y + .07, pz, a); box('port_wood', s, s * .9, s, px, y + .14 + s * .45, pz, a);
    if (r() < .35) box('port_wood', s * .8, s * .7, s * .8, px, y + .14 + s * .9 + s * .35, pz, a + .2);
  }
}
const cone = (x, z) => { cyl('cone', .22, .72, x, G + .38, z, 0, 0, 0, 8, .03); box('cone', .44, .04, .44, x, G + .02, z); };
const bollard = (x, z) => { cyl('haz', .14, 1, x, G + .5, z, 0, 0, 0, 8); };
const ubox = (x, z, ry = 0) => withFrame(x, G, z, ry, () => { box('steelL', .9, 1.1, .6, 0, .55, 0); box('steel', 1, .06, .7, 0, 1.13, 0); });
function booth(x, z, ry) {      // white guard booth with windows
  withFrame(x, G, z, ry, () => {
    box('paintW', 3, 2.6, 2.4, 0, 1.3, 0); box('win', 3.02, 1, 2.42, 0, 1.75, 0);
    box('steelL', 3.5, .18, 2.9, 0, 2.7, 0); box('steelL', .05, 2, .9, 1.52, 1.0, .5);
    K.acUnit(-.6, 2.8, 0, 0); box('glowY', .3, .1, .1, 1.55, 2.4, .5);
  });
}
function barrierArm(x, z, len, a) {   // post at (x,z), arm along +z, raised by a
  box('yel', .4, 1.1, .4, x, G + .55, z); box('steel', .5, .2, .5, x, G + 1.15, z);
  box('haz', .12, .12, len, x, G + 1.05 + len / 2 * Math.sin(a), z + len / 2 * Math.cos(a), 0, 0, -a);
}
function fmast(x, z, h, tx, tz) {     // tall floodlight mast with a 4×4 head
  cyl('steelL', .55, h, x, G + h / 2, z, 0, 0, 0, 10, .28);
  cyl('concD', .9, .6, x, G + .3, z, 0, 0, 0, 10);
  const a = Math.atan2(tz - z, tx - x), px = -Math.sin(a), pz = Math.cos(a), top = G + h;
  box('grate', 1.6, .12, 4.2, x, top, z, -a);
  for (let i = 0; i < 4; i++) {
    box('steel', .14, .14, 4.4, x + Math.cos(a) * .4, top + .55 + i * .75, z + Math.sin(a) * .4, -a);
    for (let j = 0; j < 4; j++) {
      const u = (j - 1.5) * 1.05, fx = x + px * u + Math.cos(a) * .6, fz = z + pz * u + Math.sin(a) * .6, fy = top + .55 + i * .75;
      K.floodlight(fx, fy, fz, tx, 0, tz, 0xe8f2ff, 3000, .5, false);
    }
  }
  K.beacon(x, top + 4.2, z, 1);
  K.pool(tx, tz, 16, false, G);
}

/* ───────────── STS crane (local +x = seaward boom) ───────────── */
function crane(x, z, ry, { span = 24, raise = 0, trolley = 40 } = {}) {
  withFrame(x, 0, z, ry, () => {
    const HB = 42, HT = 46, GZ = 8.5, X0 = -45, X1 = 54, LAND = -span, red = 'port_red';
    const P = (s, y, zz) => { if (s <= 0 || !raise) return [s, y, zz]; const c = Math.cos(raise), sn = Math.sin(raise), dy = y - HB; return [s * c - dy * sn, HB + s * sn + dy * c, zz]; };
    const seg = (a, b, rr) => strut(red, P(...a), P(...b), rr, 6);
    const hTop = (s) => s <= 0 ? HT : HT - 2.5 * s / X1;
    for (const lx of [0, LAND]) {
      for (const s of [-1, 1]) {
        box(red, 1.6, HB - 2, 1.6, lx, (HB + 2) / 2, s * GZ);
        box('steel', 2.2, 1.6, 7, lx, G + .9, s * GZ);
        for (const w of [-2.2, 2.2]) cyl('steelL', .5, .5, lx, .5, s * GZ + w, 0, 0, Math.PI / 2, 10);
      }
      box(red, 1.4, 2.4, 2 * GZ + 1.6, lx, 14, 0);
    }
    for (const s of [-1, 1]) {
      box(red, span, 2.2, 1.4, LAND / 2, 14, s * GZ);
      strut(red, [0, 15.2, s * GZ], [LAND, HB - 1, s * GZ], .35, 6); strut(red, [LAND, 15.2, s * GZ], [0, HB - 1, s * GZ], .35, 6);
    }
    // girder (back) + boom (out over the water): lattice side frames
    for (const zz of [-GZ, GZ]) {
      seg([X0, HB, zz], [0, HB, zz], .55); seg([X0, HT, zz], [0, HT, zz], .55);
      seg([0, HB, zz], [X1, HB, zz], .5); seg([0, HT, zz], [X1, hTop(X1), zz], .5);
      for (let s = X0; s < X1 - .1; s += 4.5) {
        const n = s + 4.5;
        seg([s, HB, zz], [s, hTop(s), zz], .17);
        if (s < 0 && n > 0) continue;
        seg([s, HB, zz], [n, hTop(n), zz], .15);
      }
    }
    for (let s = X0; s <= X1; s += 9) { seg([s, hTop(s), -GZ], [s, hTop(s), GZ], .16); seg([s, HB, -GZ], [s, HB, GZ], .16); }
    seg([X1, HB, -GZ], [X1, HB, GZ], .3);
    // A-frame + stays
    const AX = -10, AY = 68, AZ = 6;
    for (const s of [-1, 1]) {
      strut(red, [0, HT, s * GZ], [AX, AY, s * AZ], .6, 8); strut(red, [LAND, HT, s * GZ], [AX, AY, s * AZ], .6, 8);
      for (const t of [18, 36, X1]) strut('steel', [AX, AY, s * AZ], P(t, hTop(t), s * GZ), .1, 4);
      strut('steel', [AX, AY, s * AZ], [X0, HT, s * GZ], .12, 4);
    }
    strut(red, [AX, AY, -AZ], [AX, AY, AZ], .5, 8);
    // machinery house, cab, trolley + spreader
    box('paintW', 12, 6, 2 * GZ + 2, X0 + 8, HT + 3.4, 0); box(red, 12.1, .8, 2 * GZ + 2.1, X0 + 8, HT + .8, 0);
    box('steelL', 12.4, .3, 2 * GZ + 2.4, X0 + 8, HT + 6.5, 0);
    if (!raise) {
      const tx = trolley, SY = 28;
      box(red, 6, 2.2, 2 * GZ - 1.4, tx, HB - .5, 0);
      box('paintW', 3.2, 3, 3.2, tx - 2, HB - 3.4, GZ - 3); box('win', 3.22, 1.2, 3.22, tx - 2, HB - 3.1, GZ - 3);
      for (const a of [-1.2, 1.2]) for (const b of [-4, 4]) strut('steel', [tx + a, HB - 1.6, b], [tx + a, SY + .3, b], .05, 4);
      box('yel', 2.6, .6, 12.2, tx, SY, 0); ctr(col(), L40, tx, SY - .3 - CH, 0, Math.PI / 2, 1);
    }
    for (const fx of [-20, -36]) for (const s of [-1, 1]) K.floodlight(fx, HB - .9, s * (GZ - 1), fx, 0, s * (GZ - 1), 0xe8f2ff, 3000, .5, false);
    K.beacon(AX, AY + 1.6, 0, 1.2); K.beacon(...P(X1, hTop(X1) + 1, 0), .8);
  });
}

/* ───────────── container ship (bow to −z) ───────────── */
function ship(cx, cz, Lh, B, quayX) {
  withFrame(cx, 0, cz, 0, () => {
    const b = B / 2, bow = B * .9, sh = new THREE.Shape();
    sh.moveTo(-b, -Lh / 2); sh.lineTo(b, -Lh / 2); sh.lineTo(b, Lh / 2 - bow);
    sh.quadraticCurveTo(b, Lh / 2 - bow * .2, 0, Lh / 2); sh.quadraticCurveTo(-b, Lh / 2 - bow * .2, -b, Lh / 2 - bow); sh.lineTo(-b, -Lh / 2);
    const ex = (d) => { const g = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false, curveSegments: 8 }); g.rotateX(-Math.PI / 2); return g; };
    put('port_hullR', ex(6), M4(0, -8, 0)); put('port_hull', ex(8), M4(0, -2, 0));
    box('paintW', B - .6, .3, 1.2, 0, 6, -Lh / 2 + bow + .5);
    const n = Math.floor((B - 2) / 2.5);
    for (let zb = -Lh / 2 + bow + 7; zb < Lh / 2 - 26; zb += 12.5) {
      box('steelL', n * 2.5, .5, 12.3, 0, 6.25, zb);
      for (let i = 0; i < n; i++) {
        if (r() < .05) continue;
        const xx = (i - (n - 1) / 2) * 2.5, t = 2 + Math.floor(r() * 4) + (Math.abs(i - n / 2) < n / 3 ? 1 : 0);
        for (let k = 0; k < t; k++) box(col(), CW, CH, L40, xx, 6.5 + k * CH + CH / 2, zb);
      }
    }
    const zB = Lh / 2 - 16;
    box('paintW', B - 6, 16, 10, 0, 14, zB); box('win', B - 5.9, 1.4, 10.1, 0, 20.6, zB);
    box('paintW', B + 1, 1.2, 3, 0, 20.4, zB - 5.2); box('steelL', B - 5, .3, 11, 0, 22.15, zB);
    for (const s of [-1, 1]) box('cone', 1.8, 1.6, 6, s * (b - 4.5), 12, zB + 1);
    box('paintW', B - 8, 6, 7, 0, 9, Lh / 2 - 5);
    box('port_red', 4.5, 8, 5, 0, 16, Lh / 2 - 5); box('steel', 4.6, 1.2, 5.1, 0, 20.6, Lh / 2 - 5);
    strut('steel', [0, 22.3, zB], [0, 30, zB], .15, 6); K.beacon(0, 30.5, zB, .5);
    strut('steel', [0, 6, -Lh / 2 + 4], [0, 16, -Lh / 2 + 4], .15, 6);
    for (const zz of [-Lh / 2 + 12, -Lh / 2 + 26, Lh / 2 - 8, Lh / 2 - 22]) strut('steel', [-b, 5.5, zz], [quayX - cx, .8, zz + (zz < 0 ? -9 : 9)], .06, 4);
  });
}

/* ───────────── the enclosure ───────────── */
function frontEdge() {
  const X = GX;
  booth(198.4, 185.6, 0);
  ctr('port_cD', L40, X, G, 194.4, Math.PI / 2, 2);
  ctr('port_cW', L40, X, G, 207, Math.PI / 2, 2);
  ctr('port_cBB', L40, X, G, 219.6, Math.PI / 2, 2, HC);
  // the arch: two pillars of 2 red 20ft (lying across the edge), red 40ft lintel on top
  for (const pz of [GZ - 4.72, GZ + 4.72]) for (let k = 0; k < 2; k++) ctr(k ? 'contR' : 'port_cRB', L20, X, G + k * CH, pz, 0, 2);
  ctr('port_cRB', L40, X, G + 2 * CH, GZ, Math.PI / 2, 2);
  box('haz', .06, .4, 7, X - 1.25, G + 2 * CH + .3, GZ); box('glowY', .05, .12, 6, X - 1.26, G + 2 * CH + .65, GZ);
  // south of the gate: blue lengthwise, then a perpendicular red 40ft
  ctr('contB', L40, X, G, 245.3, Math.PI / 2, 2);
  ctr('contR', L40, 203.9, G, 253.1, 0, 2);
  // walkway along the top of the lintel, continuing north over the blue/white containers
  const yT = G + 3 * CH;
  K.catwalk(X, 201.5, X, GZ - 6.1, yT + .05, 2.8, { legs: 'frame', every: 12, lights: false });
  K.catwalk(X, GZ - 6.1, X, GZ + 6.1, yT + .05, 2.8, { legs: 'none', lights: false });
  rail(X - 1.4, GZ + 6.1, X + 1.4, GZ + 6.1, yT + .05);
  rail(X - 1.4, 201.5, X + 1.4, 201.5, yT + .05);
  // stair up from the plaza side onto the walkway
  K.stairs(201.3, 213.6, 0, 1, G, yT + .05, 1.6);
  const zl = 213.6 + Math.ceil((yT + .05 - G) / .2) * .3;
  box('grate', 1.9, .1, 2, 201.35, yT, zl + 1);
  K.opening(200.2, 202.4, zl - .2, zl + 2.2, yT + .05);
  rail(202.3, zl, 202.3, zl + 2, yT + .05); rail(200.4, zl + 2, 202.3, zl + 2, yT + .05);
  // fence + gate furniture in front
  const FX = 194;
  K.chainFence(FX, 182, FX, GZ - 4.5, G, 2.5); K.chainFence(FX, GZ + 4.5, FX, 300, G, 2.5);
  barrierArm(FX - .6, GZ - 4.2, 4, 0); barrierArm(FX - .6, GZ + 4.2, 4, Math.PI * .42);
  for (const dz of [-4.8, -5.6, 4.8, 5.6]) bollard(FX - 1.2, GZ + dz);
  for (let z = 186; z < 300; z += 9 + r() * 7) { if (Math.abs(z - GZ) < 8) continue; r() < .5 ? K.cabinet(FX + 1.1, G, z, -Math.PI / 2) : ubox(FX + 1, z, 0); }
  for (const z of [189, 211, 226, 260, 278]) crates(FX - 2, z, 2 + Math.floor(r() * 3));
  for (const z of [198, 203, 248, 268, 290]) ubox(FX - 1.6, z, Math.PI / 2);
  K.cabinet(FX + 1.4, G, GZ - 6.5, -Math.PI / 2); K.cabinet(FX + 1.4, G, GZ + 6.5, -Math.PI / 2);
  pickup(191, 262, Math.PI / 2);
  for (let i = 0; i < 6; i++) cone(190.5 + (i % 2) * .8, GZ - 9 - i * 1.2);
  // real light #1: over the gate
  K.floodlight(X - 1, yT + 1.6, GZ - 3, 180, 0, GZ, 0xffe6c0, 3000, .6, false);
  K.addSpot(0xffe6c0, 1300, 60, .8, .6, new THREE.Vector3(X - 1.5, yT + 1.6, GZ), new THREE.Vector3(182, 0, GZ));
}

function plaza() {
  // worn yellow lines + mast circle
  const ln = (x1, z1, x2, z2) => { const dx = x2 - x1, dz = z2 - z1; box('lineY', Math.hypot(dx, dz), .02, .2, (x1 + x2) / 2, G + .01, (z1 + z2) / 2, K.ang(dx, dz)); };
  ln(206, 218, 292, 218); ln(206, 243, 292, 243); ln(206, 225, 236, 225); ln(264, 240, 292, 240);
  for (let x = 210; x < 290; x += 6) if (Math.abs(x - MX) > 7) box('lineW', 2.6, .02, .16, x, G + .01, GZ);
  K.torus('lineY', 4, .07, Math.PI * 2, MX, G, MZ, Math.PI / 2, 0, 0, 48);
  K.torus('lineY', 7, .05, Math.PI * 1.4, MX, G, MZ, Math.PI / 2, 0, .4, 40);
  // the camera mast
  cyl('concD', 1.5, .5, MX, G + .25, MZ, 0, 0, 0, 16); cyl('steel', .9, .5, MX, G + .75, MZ, 0, 0, 0, 16, .5);
  cyl('steel', .26, 9, MX, G + 5.4, MZ, 0, 0, 0, 12, .2);
  cyl('steelL', .45, .3, MX, G + 4.5, MZ, 0, 0, 0, 12); sph('port_chrome', .62, MX, G + 5.25, MZ);
  cyl('steelL', .4, .25, MX, G + 9.8, MZ, 0, 0, 0, 12);
  box('port_head', 2.5, 1.8, 1.8, MX, G + 10.9, MZ); box('steelL', 2.7, .15, 2, MX, G + 11.85, MZ);
  box('glowC', 2.52, .12, 1.82, MX, G + 10.4, MZ); box('steel', .6, .5, .05, MX + .8, G + 10.9, MZ + .92);
  for (const [a, b, h] of [[-.9, -.6, 1.6], [.9, .6, 1.1], [0, .7, .8]]) strut('steel', [MX + a, G + 11.9, MZ + b], [MX + a, G + 11.9 + h, MZ + b], .03, 4);
  sph('steelL', .22, MX - .4, G + 12.2, MZ - .5); box('redS', .1, .1, .1, MX + .9, G + 13.05, MZ + .6);
  K.pool(MX, MZ, 10, false, G);
  K.addSpot(0xdcecff, 1200, 60, 1.0, .6, new THREE.Vector3(MX, G + 10, MZ), new THREE.Vector3(MX, 0, MZ));   // real light #2
  // loose plaza pieces: green + white pair at the north edge with crates, a lone low pair near the back
  ctr('contG', L40, 251, G, 217.4, 0, 2); ctr('port_cS', L40, 251, G, 219.9, 0, 2);
  crates(243, 222, 4); crates(259, 222.5, 3); crates(211, 239, 3); crates(287, 226, 4);
  ctr('port_cW', L20, 284, G, 238.5, .2, 2); ctr('contB', L20, 286, G, 241.3, .25, 2);
  forklift(232, 238, .5); forklift(272, 228, 2.4, 'paint');
  for (let i = 0; i < 5; i++) cone(225 + i * 1.6, 230 + (i % 2) * .4);
  K.generator(266, 241.5, 0);
  for (let i = 0; i < 3; i++) cyl('barrel', .3, .9, 215 + i * .65, G + .45, 220, 0, 0, 0, 10);
}

function northBlock() {
  // 7 × 40ft columns (x 204.5..290) × 13 rows (z 182.5..215): terraces 2 → 3 → 4, tallest corner 5
  const H = (c, q) => {
    if (c === 6 && q <= 3) return 5;
    if (c <= 2) return q >= 10 ? 2 : 3;
    return q >= 9 ? 3 : 4;
  };
  const front = ['port_cW', 'port_cW', 'port_cT', 'contR', 'contB', 'port_cBB', 'port_cRB'];
  const corner = ['contG', 'contR', 'contB', 'port_cW'];
  blockGrid(204.5, 182.5, 7, 13, 'x', L40, H, (c, q, k) => c === 6 && q <= 3 ? corner[(k + q) % 4] : c <= 2 ? pick(front) : col());
  const zf = 182.5 + 13 * 2.5 - .03, xm = 204.5 + 3 * 12.25 - .03, xe = 204.5 + 7 * 12.25 - .03, y2 = G + 2 * CH, y3 = G + 3 * CH, y4 = G + 4 * CH;
  // terrace edge railings
  rail(204.6, zf - .05, xm, zf - .05, y2); rail(xm + .06, zf - .05, xe, zf - .05, y3);
  rail(xm + .05, 207.5, xm + .05, zf, y3); rail(xe - .05, 205.05, xe - .05, zf, y3);
  rail(204.6, 207.42, xm, 207.42, y3);
  // stairs: plaza → 2-high terrace (mid-left), terrace → 3-high, plaza → back 3-high terrace, terrace → 4-high
  faceStair(214.5, zf, 1, G, y2);
  K.stairs(229, 211.4, 0, -1, y2, y3, 1.6);
  faceStair(268, zf, 1, G, y3);
  K.stairs(262, 208.9, 0, -1, y3, y4, 1.6);
  rail(241.4, 205.05 - .05, xe - .1, 205.05 - .05, y4);
  // roof clutter
  K.acUnit(276, y4, 192, 0); K.acUnit(252, y4, 186, Math.PI / 2); crates(218, 196, 3, y3); crates(284, 210, 2, y3);
  box('port_tarp', 6.4, 1.2, 2.8, 236, y3 + .6, 188);
  // edge clutter at the stack bases
  crates(208, 178.5, 3); crates(262, 178, 2); ubox(232, 179.5); K.gasCylinders(270, 179.5);
}

function backRow() {
  // x 297..309: 40ft laid east-west, side by side along z, 2–3 high, second arch at the gate axis
  const x0 = 297, gap0 = GZ - 3.5, gap1 = GZ + 3.5, BC = ['contR', 'contB', 'port_cW', 'port_cY', 'port_cBB', 'port_cRB', 'port_cS'];
  const n1 = 18, z1 = gap0 - n1 * 2.5, n2 = Math.floor((300 - gap1) / 2.5);
  const t1 = Array.from({ length: n1 }, (_, q) => q >= n1 - 2 ? 2 : 2 + (r() < .55 ? 1 : 0));
  const t2 = Array.from({ length: n2 }, (_, q) => q < 2 ? 2 : 2 + (r() < .55 ? 1 : 0));
  blockGrid(x0, z1, 1, n1, 'x', L40, (c, q) => t1[q], () => pick(BC));
  blockGrid(x0, gap1, 1, n2, 'x', L40, (c, q) => t2[q], () => pick(BC));
  ctr('port_cRB', L40, x0 + 6.1, G + 2 * CH, GZ, Math.PI / 2, 2);
  box('haz', .06, .4, 7, x0 - .05, G + 2 * CH + .3, GZ);
  fmast(311.5, 248, 30, 270, 236);
  crates(294, 190, 2); crates(294, 268, 3);
}

function southBlock() {
  const y2 = G + 2 * CH;
  // plaza-side row, 2 high, with a catwalk on top
  blockGrid(211, 245, 6, 3, 'x', L40, () => 2);
  K.catwalk(211.6, 248.75, 284.1, 248.75, y2 + .05, 2.4, { legs: 'none', lights: false });
  faceStair(262, 244.97, -1, G, y2);
  K.opening(263.5, 272.5, 244, 248.5, y2 + .05);
  // corridor z 252.5..259.5, then the inner row (2 high, a notch) + bridge container across the corridor
  blockGrid(211, 259.5, 6, 3, 'x', L40, (c, q) => c === 2 && q === 2 ? 1 : 2);
  ctr('port_cRB', L40, 250, y2, 256, Math.PI / 2, 2);
  K.acUnit(225, y2, 262, 0); K.acUnit(270, y2, 264.5, Math.PI); crates(238, 264, 3, y2); crates(281, 261, 2, y2);
  for (let x = 216; x < 282; x += 11) cone(x, 256 + (r() - .5) * 3);
  crates(214, 255, 2); forklift(276, 256.5, Math.PI);
  // interior yard
  withFrame(226, G, 276, .05, () => { box('contB', L40, CH, CW, 0, CH / 2, 0); box('port_tarp', 12.6, .25, 3.1, 0, CH + .12, 0); box('port_tarp', 12.6, 1.8, .08, 0, CH - .8, 1.55); box('port_tarp', 12.6, 1.8, .08, 0, CH - .8, -1.55); });
  blockGrid(244, 270.5, 2, 2, 'x', L40, (c, q) => 1 + ((c + q) % 2), col, 2);
  ctr('port_cW', L20, 276, G, 278, Math.PI / 2, 2); ctr('port_cW', L20, 276, G + CH, 278, Math.PI / 2, 2);
  booth(286, 270, Math.PI); K.generator(212, 281, 0); crates(271, 267.5, 3); crates(214, 270, 3);
  stacker(230, 280.5, 0, false);
  // outermost south stacks: 3 high red/white/blue
  blockGrid(205, 285, 7, 6, 'x', L40, (c, q) => q === 0 && c % 3 === 1 ? 2 : 3, () => pick(RWB));
  crates(291, 280, 3);
}

function frontRoad() {
  // west road (x 168..188) running north–south, zebra crossing into the gate
  box('road', 20, .03, 296, 178, G + .015, 176);
  for (let z = 30; z < 323; z += 6) { box('lineY', .18, .02, 3.2, 168.6, G + .04, z); box('lineY', .18, .02, 3.2, 187.4, G + .04, z); }
  for (let z = 30; z < 323; z += 10) if (Math.abs(z - GZ) > 6) box('lineW', .16, .02, 4, 178, G + .04, z);
  for (let z = GZ - 3.5; z <= GZ + 3.6; z += 1) box('lineW', 19, .02, .5, 178, G + .04, z);
  K.lamp(189.6, GZ - 8, 9, { dir: -Math.PI / 2, spot: false, y0: G });
  K.lamp(166.4, 150, 9, { dir: Math.PI / 2, spot: false, y0: G }); K.lamp(166.4, 290, 9, { dir: Math.PI / 2, spot: false, y0: G });
  fmast(190.5, 179, 30, 225, 205);
  // forklifts parked on the left foreground + a couple of stacks beyond the road
  for (let i = 0; i < 4; i++) forklift(163, 203 + i * 3.2, Math.PI / 2 + (r() - .5) * .3);
  forklift(184.5, 214, .2);
  blockGrid(146, 196, 1, 5, 'x', L40, () => 2 + Math.floor(r() * 2), col, 1);
  blockGrid(146, 240, 1, 6, 'x', L40, () => 1 + Math.floor(r() * 3), col, 1);
  blockGrid(130, 170, 2, 3, 'z', L20, () => 1 + Math.floor(r() * 3), col, 1);
  crates(160, 230, 4); crates(158, 188, 3);
  K.chainFence(94, 30, 94, 320, G, 2.6);
  for (const [x, z] of [[100, 60], [104, 130], [99, 210], [106, 300], [120, 40], [115, 260]]) { K.box('grass', 8 + r() * 8, .04, 6 + r() * 6, x, G + .02, z); tree(x, z, 1 + r() * .4, G); }
}
let tree = () => {};

function perimeterRoad() {
  // south perimeter road z 302..325 with chain fence + light masts; quay apron road x 312..330
  box('road', 232, .03, 22, 212, G + .015, 313.5);
  box('road', 18, .03, 296, 321, G + .016, 176);
  for (let x = 100; x < 330; x += 8) box('lineW', 3.5, .02, .16, x, G + .04, 313.5);
  for (let z = 30; z < 300; z += 8) box('lineW', .16, .02, 3.5, 321, G + .04, z);
  K.chainFence(196, 301, 310, 301, G, 2.5);
  for (let x = 200; x < 310; x += 4.5) bollard(x, 302.2);
  for (const x of [208, 236, 259, 283]) K.cabinet(x, G, 300.2, Math.PI);
  for (const x of [200, 222, 244, 266, 312]) fmast(x, 303.2, 28, x - 2, 280);
  fmast(293, 180, 30, 262, 205);
}

function northYard() {
  // loose container yard north of the enclosure (cheap boxes), reach stackers + trucks
  K.setZone('port_yard');
  for (const x0 of [205, 236, 267]) for (const z0 of [36, 62, 88, 114, 140]) {
    const hs = Array.from({ length: 16 }, () => r() < .08 ? 0 : 1 + Math.floor(r() * 4));
    blockGrid(x0, z0, 2, 8, 'x', L40, (c, q) => hs[c * 8 + q], col, 0);
  }
  blockGrid(150, 40, 3, 6, 'z', L40, () => 1 + Math.floor(r() * 3), col, 0);
  stacker(262, 161, Math.PI / 2); stacker(232.7, 58, -Math.PI / 2); stacker(298.5, 108, Math.PI);
  truck(306, 90, Math.PI / 2); truck(306, 140, -Math.PI / 2, false); truck(250, 168, 0);
  for (const [x, z] of [[230, 172], [292, 30], [200, 100]]) crates(x, z, 3);
  fmast(260, 32, 28, 240, 70); fmast(199, 130, 28, 230, 110);
  K.setZone('port');
}

function sea() {
  K.setZone('port_sea');
  for (const x of [304, 326]) box('steelL', .3, .16, 160, x, G + .08, 110);
  for (const z of [304, 326]) box('steelL', 70, .16, .3, 290, G + .08, z);
  crane(326, 62, 0, { span: 22, trolley: 38 });
  crane(326, 112, 0, { span: 22, trolley: 30 });
  crane(326, 162, 0, { span: 22, raise: 1.25 });
  crane(290, 326, -Math.PI / 2, { span: 22, trolley: 26 });
  ship(363, 120, 150, 30, 330);
  ship(368, 262, 100, 26, 330);
  K.setZone('port');
}

export function build(ctx, d) {
  r = K.rng(330175);
  defMats();
  tree = ctx.tree;
  const lampMats = [K.mats.port_chrome, K.mats.port_head];
  ctx.dayNight.push((isDay) => { lampMats[0].emissiveIntensity = isDay ? 0 : 1.6; lampMats[1].emissiveIntensity = isDay ? 0 : .5; });
  // concrete apron over the whole district
  box('port_slab', 240, .06, 303, 210, .03, 177);
  frontEdge(); plaza(); northBlock(); backRow(); southBlock();
  frontRoad(); perimeterRoad(); northYard(); sea();
  ctx.pois.push({ id: d.id, cam: [120, 70, 290], tgt: [255, 0, 235], spawn: [181, G + .1, GZ], yaw: -Math.PI / 2 });
}
