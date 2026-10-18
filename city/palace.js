// Imperial Palace grounds: a chamfered moat ring cut 3.6 m into the ground (water at −3), sloped ishigaki
// ramparts with white dobei walls, Fujimi-yagura style turrets, the double-arch stone bridge + iron bridge
// leading to yagura gates, a gravel forecourt, palace halls with big hip-and-gable roofs and a dense forest.
// The city land slab is runtime-cut under the footprint (cooperative userData.holes) so the moat can sink.
import * as THREE from 'three';
import { foliage } from './index.js';
import * as K from '../kit.js';
const { box, cyl, strut, put, M4, withFrame, def, std } = K;

const cham = (X, Z, c) => [[-X + c, -Z], [X - c, -Z], [X, -Z + c], [X, Z - c], [X - c, Z], [-X + c, Z], [-X, Z - c], [-X, -Z + c]];
const inCham = (x, z, X, Z, c) => Math.abs(x) < X && Math.abs(z) < Z && Math.abs(x) + Math.abs(z) < X + Z - c;
const IN = cham(161, 126, 22), OUT = cham(185, 150, 32);
const FLOOR = -3.6, WATER = -3, TOP = 3.5;   // moat bed, water, rampart top

function mats() {
  const stone = (base) => K.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#3a3834'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) for (let x = -Math.random() * 40; x < w; ) {
      const bw = 34 + Math.random() * 40, l = base + (Math.random() - .5) * 40;
      g.fillStyle = `rgb(${l},${l * .97},${l * .9})`; g.fillRect(x + 2, y + 2, bw - 4, 28); x += bw;
    }
    K.noise(g, w, h, 30);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(60,90,40,${Math.random() * .35})`; g.beginPath(); g.ellipse(Math.random() * w, h - Math.random() * 60, 5 + Math.random() * 20, 4 + Math.random() * 10, 0, 0, 7); g.fill(); }
  }, { repeat: true });
  const gravel = K.canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#b9b2a2'; g.fillRect(0, 0, w, h); K.noise(g, w, h, 46); g.strokeStyle = 'rgba(80,72,60,.18)'; for (let y = 4; y < h; y += 10) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + 2); g.stroke(); } }, { repeat: true });
  const mud = K.canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#3b3a2c'; g.fillRect(0, 0, w, h); K.noise(g, w, h, 30); }, { repeat: true });
  const tile = K.canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#5c625e'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) { const gr = g.createLinearGradient(x, 0, x + 16, 0); gr.addColorStop(0, 'rgba(0,0,0,.45)'); gr.addColorStop(.5, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(0,0,0,.45)'); g.fillStyle = gr; g.fillRect(x, 0, 16, h); }
    g.fillStyle = 'rgba(0,0,0,.3)'; for (let y = 0; y < h; y += 21) g.fillRect(0, y, w, 2);
    K.noise(g, w, h, 16);
  }, { repeat: true });
  const waterN = K.canvasTex(128, 128, (g, w, h) => {
    const id = g.createImageData(w, h), dd = id.data, P = Math.PI * 2, wv = Array.from({ length: 6 }, () => [Math.ceil(Math.random() * 4) * (Math.random() < .5 ? -1 : 1), Math.ceil(Math.random() * 4), Math.random() * P]);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let nx = 0, ny = 0; for (const [a, b, ph] of wv) { const c = Math.cos(P * (a * x / w + b * y / h) + ph); nx += c * a; ny += c * b; } const i = (y * w + x) * 4; dd[i] = 128 + nx * 6; dd[i + 1] = 128 + ny * 6; dd[i + 2] = 255; dd[i + 3] = 255; }
    g.putImageData(id, 0, 0);
  }, { srgb: false, repeat: true });
  def('pal_stone', std({ map: stone(150), color: 0xc8c4bc, roughness: .95 }), 4);
  def('pal_stoneL', std({ map: stone(185), color: 0xe0dcd2, roughness: .9 }), 3);
  def('pal_gravel', std({ map: gravel, color: 0xe2ddd0, roughness: 1 }), 4);
  def('pal_mud', std({ map: mud, roughness: 1 }), 6);
  def('pal_plaster', std({ color: 0xe9e5da, roughness: .9 }));
  def('pal_wood', std({ color: 0x2c2520, roughness: .8 }));
  def('pal_tile', std({ map: tile, color: 0x8a9a90, roughness: .65, metalness: .2 }), 2.5);
  def('pal_copper', std({ map: tile, color: 0x8fc0a8, roughness: .6, metalness: .3 }), 2.5);
  def('pal_iron', std({ color: 0x27302d, roughness: .5, metalness: .75 }));
  def('pal_pine', std({ color: 0x35512c, roughness: 1, flatShading: true }));
  def('pal_water', std({ color: 0x2c4c40, roughness: .1, metalness: .3, normalMap: waterN, normalScale: new THREE.Vector2(.3, .3) }), 10);
  K.mats.pal_pine.userData.noCollide = true; K.mats.pal_water.userData.noCollide = true;
  return waterN;
}

/* ───────── geometry helpers ───────── */
// flat polygon (local x,z points) with holes, at height y, UVs world-scaled
function flat(k, pts, holes, y) {
  const v = (p) => p.map(([x, z]) => new THREE.Vector2(x, -z));
  const sh = new THREE.Shape(v(pts)); for (const h of holes) sh.holes.push(new THREE.Path(v(h)));
  const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2);
  const t = K.mats[k].userData.tile, uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / t, uv.getY(i) / t);
  put(k, g, M4(0, y, 0));
}
// rectangular frustum (hip roof when the top collapses to a ridge), flat-shaded, base at y=0
function frustum(w0, d0, w1, d1, h, t = 2.5) {
  const a = [[-w0 / 2, 0, -d0 / 2], [w0 / 2, 0, -d0 / 2], [w0 / 2, 0, d0 / 2], [-w0 / 2, 0, d0 / 2]], b = [[-w1 / 2, h, -d1 / 2], [w1 / 2, h, -d1 / 2], [w1 / 2, h, d1 / 2], [-w1 / 2, h, d1 / 2]];
  const pos = [], quad = (p, q, r, s) => pos.push(...p, ...q, ...r, ...p, ...r, ...s);
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; quad(a[j], a[i], b[i], b[j]); }
  quad(b[0], b[3], b[2], b[1]); quad(a[0], a[1], a[2], a[3]);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const uv = []; for (let i = 0; i < pos.length; i += 3) uv.push((pos[i] + pos[i + 2]) / t, pos[i + 1] * 1.6 / t);
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex([...Array(pos.length / 3).keys()]); g.computeVertexNormals();
  return g;
}
// two-stage flared hip-and-gable roof over a w×d body, eaves at y
function roof(k, w, d, y, o = 3) {
  const w1 = w + 1, d1 = d + 1, rh = d1 * .42;
  put(k, frustum(w + 2 * o, d + 2 * o, w1, d1, 1.2), M4(0, y, 0));
  put(k, frustum(w1, d1, Math.max(.6, w1 - d1 * .9), .5, rh), M4(0, y + 1.2, 0));
  const rl = Math.max(.6, w1 - d1 * .9) + 1, ry = y + 1.2 + rh;
  box(k, rl, .7, .9, 0, ry + .2, 0);
  for (const s of [-1, 1]) { box('pal_plaster', .2, rh * .45, d1 * .22, s * (rl / 2 - .6), ry - rh * .2, 0); box(k, .7, 1.1, .9, s * rl / 2, ry + .5, 0); }   // gable boards + onigawara
}
// orient an edge so local +x runs a→b and local +z points to the palace centre
function edge(a, b, fn, inward = true) {
  let [ax, az] = a, [bx, bz] = b, flip = false;
  const mx = (ax + bx) / 2, mz = (az + bz) / 2, L = Math.hypot(bx - ax, bz - az);
  const nx = -(bz - az) / L, nz = (bx - ax) / L;
  if ((nx * -mx + nz * -mz < 0) === inward) { [ax, az, bx, bz] = [bx, bz, ax, az]; flip = true; }
  withFrame(mx, 0, mz, K.ang(bx - ax, bz - az), () => fn(L, flip));
}

/* ───────── moat ───────── */
function moat() {
  flat('pal_mud', OUT, [IN], FLOOR);
  flat('pal_water', OUT, [IN], WATER);
  for (let i = 0; i < 8; i++) edge(OUT[i], OUT[(i + 1) % 8], (L) => {   // outer revetment, flush with the bank
    box('pal_stone', L + 3, .05 - FLOOR, 1.5, 0, (FLOOR + .05) / 2, -.75);
    box('pal_stoneL', L + 3, .12, .6, 0, .06, -.3);
  });
  // boat-landing steps down to the water from the outer bank (south + north)
  for (const [x, z, s] of [[-100, 150, -1], [70, -150, 1]]) for (let i = 0; i < 18; i++) {
    const hh = -FLOOR - .2 * i; box('pal_stone', 2.6, hh, .3, x, FLOOR + hh / 2, z + s * (.15 + .3 * i));
  }
}
// rampart along an inner-moat edge. caps: [start, end] flags close the section at a gate gap
function rampart(a, b, capA, capB, wall, rng) {
  edge(a, b, (L, flip) => {
    const [c0, c1] = flip ? [capB, capA] : [capA, capB], e0 = c0 ? 0 : 3, e1 = c1 ? 0 : 3, LL = L + e0 + e1, cx = (e1 - e0) / 2;
    const sl = Math.hypot(4.2, TOP - FLOOR), th = Math.atan2(TOP - FLOOR, 4.2);
    box('pal_stone', LL, .8, sl, cx, (TOP + FLOOR) / 2, -.9, 0, 0, -th);          // battered ishigaki face
    box('grass', LL, TOP - FLOOR, 6, cx, (TOP + FLOOR) / 2, 4.2);                  // earth body, turf on top
    const gl = Math.hypot(8.8, TOP), ga = Math.atan2(TOP, 8.8);
    box('grass', LL, .6, gl, cx, TOP / 2 - .3, 11.6, 0, 0, ga);                    // inner turf slope
    for (const [c, x] of [[c0, -L / 2], [c1, L / 2]]) if (c) box('pal_stone', 1.2, TOP - FLOOR + .1, 10.6, x, (TOP + FLOOR) / 2, 2);
    if (wall) {   // white dobei wall with tiled cap
      const wl = L + (c0 ? -1 : 2) + (c1 ? -1 : 2), wx = ((c1 ? -1 : 2) - (c0 ? -1 : 2)) / 2;
      box('pal_stoneL', wl, .5, .9, wx, TOP + .25, 3); box('pal_plaster', wl, 2, .6, wx, TOP + 1.5, 3);
      put('pal_tile', frustum(wl + .4, 1.5, wl, .25, .5), M4(wx, TOP + 2.5, 3));
      for (let s = -wl / 2 + 3; s < wl / 2 - 2; s += 6) box('pal_wood', .5, .35, .62, wx + s, TOP + 1.7, 3);   // loopholes
      for (let s = -L / 2 + 8; s < L / 2 - 6; s += 14 + rng() * 10) pine(s, 5.8, .8 + rng() * .4, TOP, rng);
    }
  });
}
// low vertical stone face under a gate gap (the bridge lands on island ground there)
function gapWall(a, b) { edge(a, b, (L) => box('pal_stone', L + .2, .05 - FLOOR, 1.5, 0, (FLOOR + .05) / 2, .75)); }

/* ───────── buildings ───────── */
function yagura(x, z, ry, tiers) {
  withFrame(x, 0, z, ry, () => {
    put('pal_stone', frustum(15, 15, 12.5, 12.5, TOP + 1.6, 4), M4(0, -1, 0));     // stone platform
    let y = TOP + .6, s = 11;
    for (let t = 0; t < tiers; t++) {
      const h = t === 0 ? 4.6 : 3.4;
      box('pal_plaster', s, h, s, 0, y + h / 2, 0); box('pal_wood', s + .1, 1, s + .1, 0, y + .5, 0);
      for (let i = -1; i <= 1; i++) for (const r of [0, 1, 2, 3]) withFrame(0, 0, 0, r * Math.PI / 2, () => box('pal_wood', 1.1, .9, .1, i * s * .3, y + h * .62, s / 2 + .02));
      const last = t === tiers - 1;
      if (last) roof('pal_tile', s, s * .8, y + h, 2.4);
      else put('pal_tile', frustum(s + 4.4, s + 4.4, s * .74, s * .74, 1.8), M4(0, y + h, 0));
      y += h + (last ? 0 : 1.2); s *= .74;
    }
  });
}
function gate(x, z, ry) {
  withFrame(x, 0, z, ry, () => {
    for (const s of [-1, 1]) {
      for (const zz of [-2.6, 2.6]) box('pal_wood', 1.2, 4.6, 1.2, s * 8.6, 2.3, zz);
      box('pal_wood', .25, 3.8, 4.2, s * 7.9, 2, -4.4, s * .15);                      // open door leaves
      for (let i = 0; i < 3; i++) box('pal_iron', .3, .12, 4.2, s * 7.75, .8 + i * 1.4, -4.4, s * .15);
      box('pal_plaster', 3.5, 1.6, 7, s * 10.6, TOP + .8, 0);
    }
    box('pal_wood', 19, .8, 6.6, 0, 4.6, 0);
    box('pal_wood', 24.2, .6, 7.2, 0, 5.3, 0); box('pal_plaster', 24, 3, 7, 0, 7.1, 0);
    for (let i = -3; i <= 3; i++) box('pal_wood', 1.2, .8, 7.1, i * 3.2, 7.2, 0);
    roof('pal_tile', 24, 7, 8.6, 2.2);
  });
}
function hall(x, z, w, d, ry, rk) {
  withFrame(x, 0, z, ry, () => {
    box('pal_stoneL', w + 5, .9, d + 5, 0, .45, 0);
    box('pal_wood', w + 2.4, .2, d + 2.4, 0, 1, 0);
    box('pal_plaster', w, 4.4, d, 0, 3.3, 0); box('pal_wood', w + .06, 2.5, d + .06, 0, 2.35, 0);
    for (let i = 0; i <= Math.round(w / 3.6); i++) { const px = -w / 2 - .6 + i * (w + 1.2) / Math.round(w / 3.6); for (const s of [-1, 1]) cyl('pal_wood', .22, 4.5, px, 3.35, s * (d / 2 + .6), 0, 0, 0, 8); }
    for (let i = 1; i < Math.round(d / 3.6); i++) { const pz = -d / 2 - .6 + i * (d + 1.2) / Math.round(d / 3.6); for (const s of [-1, 1]) cyl('pal_wood', .22, 4.5, s * (w / 2 + .6), 3.35, pz, 0, 0, 0, 8); }
    box('pal_wood', w + 1.6, .5, d + 1.6, 0, 5.6, 0);
    for (let i = 0; i < 3; i++) box('pal_stoneL', 6, .3, 1, 0, .15 + i * .3, d / 2 + 3 - i * .6 + .4);   // front steps
    roof(rk, w, d, 5.85, 3.2);
  });
}
function pine(x, z, s, y, r) {
  const lean = (r() - .5) * .8, top = [x + lean * 3 * s, y + 5.5 * s, z + (r() - .5) * 1.5 * s];
  strut('trunk', [x, y, z], top, .26 * s, 5);
  for (let i = 0; i < 4; i++) {   // flat cloud pads of needles (Japanese black pine)
    const sc = (2.6 - i * .45) * s, px = top[0] + (r() - .5) * 2.4 * s, py = y + (3.4 + i * 1.1) * s, pz = top[2] + (r() - .5) * 2.4 * s;
    strut('trunk', [top[0], py - .4 * s, top[2]], [px, py, pz], .1 * s, 4);
    foliage(px, py, pz, sc, .7 * s, 11, 'crownP', s);
  }
}

/* ───────── bridges ───────── */
function stoneBridge(x, zc) {   // Meganebashi: two elliptical arches, granite, deck flush with the ground
  const sh = new THREE.Shape([new THREE.Vector2(-14, -3.7), new THREE.Vector2(14, -3.7), new THREE.Vector2(14, 0), new THREE.Vector2(-14, 0)]);
  for (const cx of [-5.5, 5.5]) { const p = new THREE.Path(); p.moveTo(cx + 4.5, -3.4); p.absellipse(cx, -3.4, 4.5, 2.7, 0, Math.PI, false); p.lineTo(cx + 4.5, -3.4); sh.holes.push(p); }
  let g = new THREE.ExtrudeGeometry(sh, { depth: 8, bevelEnabled: false, curveSegments: 10 });
  g.translate(0, 0, -4); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 3, uv.getY(i) / 3);
  if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]);
  put('pal_stoneL', g, M4(x, 0, zc, 0, Math.PI / 2, 0));
  box('pal_gravel', 7.6, .1, 28, x, 0, zc);
  for (const s of [-1, 1]) {
    box('pal_stoneL', .55, .9, 28, x + s * 3.9, .5, zc); box('pal_stoneL', .7, .14, 28.2, x + s * 3.9, 1, zc);
    for (let i = 0; i <= 7; i++) box('pal_stoneL', .75, 1.15, .75, x + s * 3.9, .58, zc - 14 + i * 4);
    for (const e of [-1, 1]) lantern(x + s * 3.9, 1.15, zc + e * 13);
  }
}
function lantern(x, y, z) {   // cast-iron lamp post with a lit globe
  cyl('pal_iron', .1, 3.6, x, y + 1.8, z, 0, 0, 0, 6); cyl('pal_iron', .25, .4, x, y + .2, z, 0, 0, 0, 6);
  for (const s of [-1, 1]) { strut('pal_iron', [x, y + 3.2, z], [x + s * .8, y + 3.5, z], .05, 4); cyl('glowY', .22, .5, x + s * .8, y + 3.3, z, 0, 0, 0, 6); }
  cyl('glowY', .28, .6, x, y + 3.9, z, 0, 0, 0, 6);
}
function ironBridge(xc, z) {   // the iron bridge: girder deck on segmental arch ribs, ornate railings
  box('pal_iron', 28, .35, 7, xc, -.125, z); box('pal_gravel', 28, .06, 6.2, xc, .03, z);
  for (const s of [-1, 1]) {
    const zz = z + s * 3.3;
    box('pal_iron', 28, 1.1, .3, xc, -.8, zz);
    const pts = []; for (let i = 0; i <= 10; i++) { const u = i / 10 * 2 - 1; pts.push([xc + u * 13.5, -2.9 + 1.9 * (1 - u * u), zz]); }
    for (let i = 0; i < 10; i++) { strut('pal_iron', pts[i], pts[i + 1], .22, 6); if (i) strut('pal_iron', pts[i], [pts[i][0], -.5, zz], .07, 4); }
    box('pal_iron', 28, .1, .1, xc, 1.1, zz); box('pal_iron', 28, .08, .08, xc, .2, zz);
    for (let i = 0; i <= 14; i++) { const px = xc - 14 + i * 2; box('pal_iron', .12, 1.1, .12, px, .6, zz); if (i < 14) { strut('pal_iron', [px, .2, zz], [px + 2, 1.1, zz], .03, 4); strut('pal_iron', [px, 1.1, zz], [px + 2, .2, zz], .03, 4); } }
    for (const e of [-1, 1]) lantern(xc + e * 13.5, 0, zz);
  }
}

/* ───────── land cut ───────── */
function cutLand(ctx, x0, z0, x1, z1) {
  const land = ctx.scene.children.find((o) => o.isMesh && o.geometry && o.geometry.type === 'ShapeGeometry' && Math.abs(o.position.y + .08) < 1e-3);
  if (!land) return;
  const holes = land.userData.holes || (land.userData.holes = []); holes.push([x0, z0, x1, z1]);
  const sh = new THREE.Shape(ctx.map.COAST.map(([x, z]) => new THREE.Vector2(x, -z)));
  for (const [a, b, c, e] of holes) sh.holes.push(new THREE.Path([new THREE.Vector2(a, -b), new THREE.Vector2(c, -b), new THREE.Vector2(c, -e), new THREE.Vector2(a, -e)]));
  const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2);
  const uv = g.attributes.uv, pos = g.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / 8, pos.getZ(i) / 8);
  land.geometry.dispose(); land.geometry = g;
}

/* ───────── layout ───────── */
const GRAVEL = [[-20, 36, 100, 108], [31, 106, 49, 126], [-10, 2, 70, 36], [60, -24, 161, -16], [84, -64, 116, -36], [-90, 28, -50, 52], [-50, 42, -20, 50],
  [-44, -58, -36, 2], [-56, -84, -24, -58], [36, 150, 44, 165], [185, -24, 200, -16]];
const LAWN = [[104, 36, 140, 100], [-140, 62, -60, 100], [-130, -100, -80, -60]];
const HALLS = [[30, 20, 64, 22, 0, 'pal_copper'], [-70, 40, 30, 14, 0, 'pal_tile'], [100, -50, 24, 18, 0, 'pal_tile'], [-40, -71, 20, 14, 0, 'pal_tile']];
const inR = (x, z, [x0, z0, x1, z1], m = 0) => x > x0 - m && x < x1 + m && z > z0 - m && z < z1 + m;

export function build(ctx, d) {
  const waterN = mats(), r = K.rng(31337);
  cutLand(ctx, d.x - d.w / 2 + 1, d.z - d.d / 2 + 1, d.x + d.w / 2 - 1, d.z + d.d / 2 - 1);
  const W2 = d.w / 2, D2 = d.d / 2, RECT = [[-W2, -D2], [W2, -D2], [W2, D2], [-W2, D2]];
  withFrame(d.x, 0, d.z, 0, () => {
    // ground: outer bank + island (the moat channel between them is open)
    flat('grass', RECT, [OUT], 0);
    flat('grass', IN, [], 0);
    for (const [x0, z0, x1, z1] of GRAVEL) box('pal_gravel', x1 - x0, .06, z1 - z0, (x0 + x1) / 2, .03, (z0 + z1) / 2);
    // outer-bank promenade
    for (const s of [-1, 1]) { box('pal_gravel', 2 * W2 - 70, .05, 5, 0, .025, s * (D2 - 7)); box('pal_gravel', 5, .05, 2 * D2 - 70, s * (W2 - 7), .025, 0); }
    moat();
    // ramparts with the two gate gaps (south x 31..49, east z −29..−11)
    const [v0, v1, v2, v3, v4, v5, v6, v7] = IN;
    rampart(v0, v1, false, false, true, r);
    rampart(v2, [161, -29], false, true, true, r); rampart([161, -11], v3, true, false, true, r);
    rampart(v4, [49, 126], false, true, true, r); rampart([31, 126], v5, true, false, true, r);
    rampart(v6, v7, false, false, true, r);
    for (const [a, b] of [[v1, v2], [v3, v4], [v5, v6], [v7, v0]]) rampart(a, b, false, false, false, r);
    gapWall([31, 126], [49, 126]); gapWall([161, -29], [161, -11]);
    // turrets on the chamfered corners: the three-tier Fujimi-yagura on the SE, two-tier elsewhere
    const ins = (a, b, k) => [(a[0] + b[0]) / 2 - Math.sign(a[0] + b[0]) * k, (a[1] + b[1]) / 2 - Math.sign(a[1] + b[1]) * k];
    let p = ins(v3, v4, 4); yagura(p[0], p[1], Math.PI / 4, 3);
    p = ins(v1, v2, 4); yagura(p[0], p[1], -Math.PI / 4, 2);
    p = ins(v5, v6, 4); yagura(p[0], p[1], -Math.PI / 4, 2);
    p = ins(v7, v0, 4); yagura(p[0], p[1], Math.PI / 4, 2);
    // bridges + gates
    stoneBridge(40, 138); gate(40, 126 - 4.2, 0);
    ironBridge(173, -20); gate(161 - 4.2, -20, Math.PI / 2);
    // halls
    for (const [x, z, w, dd, ry, rk] of HALLS) hall(x, z, w, dd, ry, rk);
    for (const x of [-12, 72]) for (const z of [44, 100]) { cyl('pal_stoneL', .5, 1.4, x, .7, z, 0, 0, 0, 6); put('pal_tile', frustum(1.6, 1.6, .3, .3, .6), M4(x, 1.4, z)); }   // stone lanterns
    // pines: lawns + forecourt edges + outer bank
    for (const L of LAWN) for (let i = 0; i < 14; i++) pine(L[0] + r() * (L[2] - L[0]), L[1] + r() * (L[3] - L[1]), .9 + r() * .5, 0, r);
    for (let x = -14; x <= 96; x += 11) pine(x, 104 + r() * 2, .8 + r() * .3, 0, r);
    for (let i = 0; i < 220; i++) {
      const x = (r() - .5) * 2 * W2, z = (r() - .5) * 2 * D2;
      if (inCham(x, z, 189, 154, 34) || Math.abs(x) > W2 - 2 || Math.abs(z) > D2 - 2) continue;
      if (GRAVEL.some((g) => inR(x, z, g, 2)) || Math.abs(Math.abs(z) - (D2 - 7)) < 3.5 || Math.abs(Math.abs(x) - (W2 - 7)) < 3.5) continue;
      pine(x, z, .8 + r() * .5, 0, r);
    }
    // the forest: dense broadleaf canopy over everything that is not court, hall or lawn
    let n = 0;
    for (let i = 0; i < 4000 && n < 640; i++) {
      const x = (r() - .5) * 290, z = (r() - .5) * 220;
      if (!inCham(x, z, 143, 108, 30)) continue;
      if (GRAVEL.some((g) => inR(x, z, g, 3)) || LAWN.some((g) => inR(x, z, g, 1))) continue;
      if (HALLS.some(([hx, hz, w, dd]) => Math.abs(x - hx) < w / 2 + 7 && Math.abs(z - hz) < dd / 2 + 7)) continue;
      ctx.tree(x, z, .95 + r() * .8, 0); n++;
    }
    // shrub hedges along the forecourt
    for (let x = -18; x < 100; x += 3.2) { const g = new THREE.IcosahedronGeometry(1, 0); g.scale(1.8, .9, 1.4); put('leaf', g, M4(x, .5, 34 + r() * .6, 0, r() * 3, 0)); }
  });
  ctx.updates.push((dt) => { waterN.offset.x += dt * .006; waterN.offset.y += dt * .004; });
  ctx.pois.push({ id: d.id, cam: [d.x + 120, 55, d.z + 250], tgt: [d.x + 30, 4, d.z + 70], spawn: [d.x + 40, .05, d.z + 146], yaw: 0 });
}
