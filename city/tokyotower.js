// Tokyo Tower neighbourhood (reference P9; camera looked east toward the bay):
// tower (~152 m) standing on the roof of Foot Town, Zojo-ji temple precinct + vermilion Sanmon to the north,
// Shiba Park with a sunken pond to the south, an elevated expressway along the east edge, card-mural towers
// (Q♥ south-east, K♣ far south-east, K♦ north-east) and a dense overgrown street grid filling the rest.
// Local frame: district centre; tower at (−10, 0). Roads: N–S x=−80/50/115, E–W z=−45/48.
import * as THREE from 'three';
import * as K from '../kit.js';
import { prop } from './props.js';
import { cityBuilding } from './buildings.js';
const { box, cyl, strut, put, M4, withFrame, def, std } = K;

/* ───────── tower profile ───────── */
const TB = 14.3;                                             // tower base = Foot Town roof
const KP = [[TB, 18], [22, 14.6], [32, 11.6], [40.3, 9.6], [52, 7.5], [60, 6.3], [78, 4.7], [95, 3.7], [105, 3.1], [115, 2.3], [122, 1.7]];
function hw(y) { if (y <= KP[0][0]) return KP[0][1]; for (let i = 1; i < KP.length; i++) if (y <= KP[i][0]) { const [y0, a] = KP[i - 1], [y1, b] = KP[i]; return a + (b - a) * (y - y0) / (y1 - y0); } return KP[KP.length - 1][1]; }
const ARCH = TB + 26, U0 = 1 - 6 / 18;
const uIn = (y) => y >= ARCH ? 0 : U0 * Math.sqrt(Math.max(0, 1 - ((y - TB) / 26) ** 2));
const WHITE = [[46, 50], [70, 74], [86, 92], [98, 103], [109, 114], [118, 122]];
const col = (y) => WHITE.some(([a, b]) => y >= a && y < b) ? 'tt_wh' : 'tt_or';

function mats() {
  const pave = K.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#a9a59c'; g.fillRect(0, 0, w, h); K.noise(g, w, h, 30);
    g.strokeStyle = 'rgba(40,50,30,.6)'; g.lineWidth = 3;
    for (let i = 0; i <= w; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
    for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${50 + Math.random() * 30},${85 + Math.random() * 40},35,${.3 + Math.random() * .4})`; const x = Math.round(Math.random() * 4) * 64 + (Math.random() - .5) * 10, y = Math.random() * h; g.beginPath(); g.ellipse(x, y, 3 + Math.random() * 6, 6 + Math.random() * 20, 0, 0, 7); g.fill(); }
  }, { repeat: true });
  const tile = K.canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#4a4e50'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) { const gr = g.createLinearGradient(x, 0, x + 16, 0); gr.addColorStop(0, 'rgba(0,0,0,.5)'); gr.addColorStop(.5, 'rgba(255,255,255,.1)'); gr.addColorStop(1, 'rgba(0,0,0,.5)'); g.fillStyle = gr; g.fillRect(x, 0, 16, h); }
    g.fillStyle = 'rgba(0,0,0,.3)'; for (let y = 0; y < h; y += 21) g.fillRect(0, y, w, 2); K.noise(g, w, h, 16);
  }, { repeat: true });
  const waterN = K.canvasTex(128, 128, (g, w, h) => {
    const id = g.createImageData(w, h), dd = id.data, P = Math.PI * 2, wv = Array.from({ length: 6 }, () => [Math.ceil(Math.random() * 4) * (Math.random() < .5 ? -1 : 1), Math.ceil(Math.random() * 4), Math.random() * P]);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let nx = 0, ny = 0; for (const [a, b, ph] of wv) { const c = Math.cos(P * (a * x / w + b * y / h) + ph); nx += c * a; ny += c * b; } const i = (y * w + x) * 4; dd[i] = 128 + nx * 6; dd[i + 1] = 128 + ny * 6; dd[i + 2] = 255; dd[i + 3] = 255; }
    g.putImageData(id, 0, 0);
  }, { srgb: false, repeat: true });
  def('tt_or', std({ color: 0xd4471c, roughness: .55, metalness: .35, emissive: new THREE.Color(1, .3, .06), emissiveIntensity: 0 }));
  def('tt_wh', std({ color: 0xe4e0d8, roughness: .5, metalness: .3, emissive: new THREE.Color(1, .85, .6), emissiveIntensity: 0 }));
  def('tt_pave', std({ map: pave, color: 0xc0bcb2, roughness: .92 }), 6);
  def('tt_stone', std({ map: K.texConcrete, color: 0xa29c90, roughness: .95 }), 3);
  def('tt_roofT', std({ map: tile, color: 0x8a9090, roughness: .7, metalness: .15 }), 2.5);
  def('tt_verm', std({ color: 0xb3341f, roughness: .7 }));
  def('tt_woodR', std({ color: 0x5a281c, roughness: .8 }));
  def('tt_plaster', std({ color: 0xe6e0d2, roughness: .9 }));
  def('tt_gravel', std({ map: K.texConcrete, color: 0xd4cbb4, roughness: 1 }), 3);
  def('tt_mud', std({ color: 0x2f3324, roughness: 1 }));
  def('tt_water', std({ color: 0x24403a, roughness: .22, metalness: .05, envMapIntensity: .35, normalMap: waterN, normalScale: new THREE.Vector2(.3, .3) }), 8);
  K.mats.tt_water.userData.noCollide = true;
  for (const [k, c] of [['tt_car0', 0xc9c6bd], ['tt_car1', 0x6b7076], ['tt_car2', 0x2a3a55], ['tt_car3', 0x7d2a24], ['tt_taxi', 0xd9a21b], ['tt_bus', 0xd8dcd2]]) def(k, std({ color: c, roughness: .6, metalness: .35 }));
  return waterN;
}

/* ───────── generic helpers ───────── */
function frustum(w0, d0, w1, d1, h, t = 2.5) {   // flat-shaded rectangular frustum (hip roof when top → ridge)
  const a = [[-w0 / 2, 0, -d0 / 2], [w0 / 2, 0, -d0 / 2], [w0 / 2, 0, d0 / 2], [-w0 / 2, 0, d0 / 2]], b = [[-w1 / 2, h, -d1 / 2], [w1 / 2, h, -d1 / 2], [w1 / 2, h, d1 / 2], [-w1 / 2, h, d1 / 2]];
  const pos = [], quad = (p, q, r, s) => pos.push(...p, ...q, ...r, ...p, ...r, ...s);
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; quad(a[j], a[i], b[i], b[j]); }
  quad(b[0], b[3], b[2], b[1]); quad(a[0], a[1], a[2], a[3]);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const uv = []; for (let i = 0; i < pos.length; i += 3) uv.push((pos[i] + pos[i + 2]) / t, pos[i + 1] * 1.6 / t);
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex([...Array(pos.length / 3).keys()]); g.computeVertexNormals();
  return g;
}
// heavy temple roof: shallow flared eave, steeper skirt, hip to a ridge (+ gable boards), eaves at y; ridge along x
function roof(k, w, d, y, o = 3) {
  put(k, frustum(w + 2 * o, d + 2 * o, w + o, d + o, .8), M4(0, y, 0));
  put(k, frustum(w + o, d + o, w + .6, d + .6, 1.6), M4(0, y + .8, 0));
  const rh = (d + .6) * .45, wt = Math.max(.6, w - d * .7);
  put(k, frustum(w + .6, d + .6, wt, .5, rh), M4(0, y + 2.4, 0));
  const ry = y + 2.4 + rh; box(k, wt + 1.2, .9, 1, 0, ry + .3, 0);
  for (const s of [-1, 1]) { box('tt_woodR', .25, rh * .5, d * .25, s * (wt / 2 - .4), ry - rh * .25, 0); box(k, .8, 1.5, 1, s * (wt / 2 + .6), ry + .7, 0); }
}
function flat(k, pts, holes, y) {
  const v = (p) => p.map(([x, z]) => new THREE.Vector2(x, -z));
  const sh = new THREE.Shape(v(pts)); for (const h of holes) sh.holes.push(new THREE.Path(v(h)));
  const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2);
  const t = K.mats[k].userData.tile, uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / t, uv.getY(i) / t);
  put(k, g, M4(0, y, 0));
}
const ellipse = (cx, cz, rx, rz, n = 40) => Array.from({ length: n }, (_, i) => [cx + Math.cos(i / n * Math.PI * 2) * rx, cz + Math.sin(i / n * Math.PI * 2) * rz]);
function cutLand(ctx, x0, z0, x1, z1) {   // cooperative hole in the city land slab (shared with other districts)
  const land = ctx.scene.children.find((o) => o.isMesh && o.geometry && o.geometry.type === 'ShapeGeometry' && Math.abs(o.position.y + .08) < 1e-3);
  if (!land) return;
  const holes = land.userData.holes || (land.userData.holes = []); holes.push([x0, z0, x1, z1]);
  const sh = new THREE.Shape(ctx.map.COAST.map(([x, z]) => new THREE.Vector2(x, -z)));
  for (const [a, b, c, e] of holes) sh.holes.push(new THREE.Path([new THREE.Vector2(a, -b), new THREE.Vector2(c, -b), new THREE.Vector2(c, -e), new THREE.Vector2(a, -e)]));
  const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2);
  const uv = g.attributes.uv, pos = g.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / 8, pos.getZ(i) / 8);
  land.geometry.dispose(); land.geometry = g;
}
function card(ctx, rank, suit, w, x, y, z, ry) {   // local point → world mural plane
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 1.5), ctx.cards.cardMaterial(rank, suit));
  m.position.copy(K.fpos(x, y, z)); m.rotation.y = ry; ctx.scene.add(m);
}

/* ───────── the tower (drawn in the tower frame, base on the Foot Town roof) ───────── */
function lattice() {
  const ys = [];
  for (let y = TB; y < 59; y += 3.1) ys.push(y);
  for (let y = 60; y < 101; y += 4) ys.push(y);
  ys.push(104, 108, 112, 116, 119, 122);
  const P = (u, y) => [u * hw(y), y, hw(y)];
  for (let k = 0; k < 4; k++) withFrame(0, 0, 0, k * Math.PI / 2, () => {
    for (let i = 0; i < ys.length - 1; i++) {
      const y0 = ys[i], y1 = ys[i + 1], ym = (y0 + y1) / 2, h = hw(ym), c = col(ym);
      const rc = .14 + .03 * h, rb = .07 + .009 * h;
      strut(c, P(1, y0), P(1, y1), rc);
      if (y0 < ARCH) {   // legs: corner chord + elliptical arch chord, mid chord, zig-zag lacing
        for (const s of [-1, 1]) {
          const a0 = uIn(y0), a1 = uIn(y1);
          strut(c, P(s * a0, y0), P(s * a1, y1), rc * .8);
          strut(c, P(s * (1 + a0) / 2, y0), P(s * (1 + a1) / 2, y1), rb * .8);
          if (i) strut(c, P(s, y0), P(s * a0, y0), rb);
          if (i % 2) strut(c, P(s, y0), P(s * a1, y1), rb * .9); else strut(c, P(s * a0, y0), P(s, y1), rb * .9);
        }
      } else {
        const n = hw(y0) > 7 ? 3 : hw(y0) > 3.5 ? 2 : 1;
        for (let j = 0; j < n; j++) {
          const u0 = -1 + 2 * j / n, u1 = u0 + 2 / n;
          strut(c, P(u0, y0), P(u1, y0), rb);
          strut(c, P(u0, y0), P(u1, y1), rb * .85); strut(c, P(u1, y0), P(u0, y1), rb * .85);
        }
      }
      if (i === ys.length - 2) strut(c, P(-1, y1), P(1, y1), rb);
    }
  });
  ys.forEach((y, i) => { if (y > ARCH && i % 4 === 0) { const h = hw(y); strut(col(y), [-h, y, -h], [h, y, h], .1); strut(col(y), [h, y, -h], [-h, y, h], .1); } });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {   // footings on the roof + vines up the legs
    box('concD', 6, 1.2, 6, sx * 17, TB + .4, sz * 17);
    const top = TB + 5 + K.R() * 8;
    strut('ivy', [sx * 17.6, TB + .8, sz * 17.6], [sx * hw(top), top, sz * hw(top)], .7, 6);
  }
}
function deck(y0, r, floors) {
  const oct = (k, rr, h, y) => {
    const g = new THREE.CylinderGeometry(rr, rr, h, 8), uv = g.attributes.uv, n = k === 'win' ? rr * 6.1 / 8 : 1;
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * n);
    put(k, g, M4(0, y, 0, 0, Math.PI / 8, 0));
  };
  oct('tt_or', r * .9, 1, y0 - .5);
  for (let f = 0; f < floors; f++) { const y = y0 + f * 4; oct('tt_wh', r, .7, y + .35); oct('win', r - .2, 2.6, y + 2); oct('tt_wh', r + .1, .7, y + 3.65); }
  const yt = y0 + floors * 4;
  oct('tt_wh', r * .8, 1.2, yt + .6); oct('tt_or', r * .55, 1.2, yt + 1.8);
  for (let i = 0; i < 8; i += 2) { const a = i * Math.PI / 4 + Math.PI / 8; K.beacon(Math.cos(a) * r * .95, yt + .3, Math.sin(a) * r * .95, .4); }
}
function mast() {
  box('tt_wh', 4, .6, 4, 0, 122.3, 0);
  for (let i = 0; i < 4; i++) cyl(i % 2 ? 'tt_wh' : 'tt_or', 1.2, 4, 0, 124.6 + i * 4, 0, 0, 0, 0, 10);
  for (let i = 0; i < 3; i++) cyl(i % 2 ? 'tt_or' : 'tt_wh', .65, 3, 0, 140.1 + i * 3, 0, 0, 0, 0, 8);
  cyl('steelL', .16, 4.4, 0, 150.8, 0, 0, 0, 0, 6);
  K.beacon(0, 153.3, 0, .3); K.beacon(1.25, 138.9, 0, .3); K.beacon(-1.25, 138.9, 0, .3); K.beacon(0, 147.8, .7, .3);
}

/* Foot Town: 4 storeys, 70 × 50, ground-floor arcade, walkable roof terrace under the legs */
function footTown(ctx) {
  box('fac3', 64, 4.5, 44, 0, 2.37, 0);                                       // recessed ground floor (arcade)
  box('fac0', 70, 9.5, 50, 0, 9.25, 0); box('roof', 70.4, .3, 50.4, 0, 14.15, 0);
  for (let x = -34.6; x <= 34.7; x += 5.77) for (const s of [-1, 1]) box('concD', .8, 4.5, .8, x, 2.37, s * 24.6);
  for (let z = -18.5; z <= 18.6; z += 6.15) for (const s of [-1, 1]) box('concD', .8, 4.5, .8, s * 34.6, 2.37, z);
  for (const s of [-1, 1]) { box('glowY', 60, .08, .4, 0, 4.4, s * 23.5); box('glowY', .4, .08, 40, s * 33.5, 4.4, 0); }
  // parapets (gap above the south stair)
  const par = (w, dd, x, z) => box('concD', w, 1.1, dd, x, TB + .55, z);
  par(70.4, .3, 0, -25.05); par(.3, 50.4, -35.05, 0); par(.3, 50.4, 35.05, 0); par(19.9, .3, -25.25, 25.05); par(47, .3, 11.7, 25.05);
  K.stairs(-36, 28.2, 1, 0, .12, TB, 2.4);
  box('roof', 3.4, .3, 5.2, -13.4, TB - .15, 26.6);
  // roof terrace: paving between the legs, gardens and clutter round the edges
  box('tt_pave', 40, .06, 36, 0, TB + .03, 0);
  for (const [x, z, w, dd] of [[-28, -20, 12, 8], [27, -19, 14, 9], [28, 18, 12, 10], [-29, 5, 9, 18], [20, 22, 10, 4]]) { box('roofG', w, .3, dd, x, TB + .15, z); ctx.tree(x, z, .55, TB + .3); }
  K.acUnit(-30, TB, 18); K.acUnit(-27.6, TB, 18); K.acUnit(30, TB, -4, 1.57); K.acUnit(30, TB, -1.4, 1.57); K.acUnit(10, TB, -22);
  box('fac0', 6, 3.2, 5, 30, TB + 1.6, 8); box('roof', 6.4, .3, 5.4, 30, TB + 3.35, 8);           // stair housing
  for (const x of [-6, -2]) { cyl('steelL', 1.3, 2.6, x, TB + 2.5, -22.5, 0, 0, 0, 12); box('steel', 2.4, 1.2, 2.4, x, TB + .6, -22.5); }
  // weathering: ivy curtains, moss over the arcade lip
  box('ivy', 12, 8, .4, -20, 9.5, 25.25); box('ivy', .4, 9, 14, 35.25, 9.5, -8); box('ivy', 9, 7, .4, 18, 10.5, -25.25); box('ivy', .4, 6, 10, -35.25, 11, 10);
  box('roofG', 70.6, .3, 1.2, 0, 14.45, 25.4);
  // low annex blocks
  for (const [x, z, w, dd, h] of [[-46, -12, 12, 16, 7], [45, 2, 10, 24, 8.5], [15, 32, 20, 8, 6]]) { box('fac2', w, h, dd, x, h / 2 + .12, z); box('roofG', w + .3, .4, dd + .3, x, h + .3, z); ctx.tree(x, z, .5, h + .5); }
}

/* ───────── temple precinct (Zojo-ji) ───────── */
function templeHall(x, z, w, d, h, ry, pod) {   // ridge along local x, front at local +z
  withFrame(x, 0, z, ry, () => {
    box('tt_stone', w + 8, pod, d + 8, 0, pod / 2 + .12, 0);
    for (let i = 0; i < Math.ceil(pod / .25); i++) box('tt_stone', w * .4, .25 * (i + 1), .4, 0, .12 + .125 * (i + 1), d / 2 + 4 + (Math.ceil(pod / .25) - i) * .4 - .2);
    const y0 = pod + .12;
    box('tt_plaster', w, h, d, 0, y0 + h / 2, 0); box('tt_woodR', w + .1, h * .55, d + .1, 0, y0 + h * .275, 0);
    for (let i = 0; i <= Math.round(w / 4); i++) { const px = -w / 2 - .7 + i * (w + 1.4) / Math.round(w / 4); for (const s of [-1, 1]) cyl('tt_woodR', .35, h, px, y0 + h / 2, s * (d / 2 + .7), 0, 0, 0, 8); }
    box('tt_woodR', w + 2, .7, d + 2, 0, y0 + h - .2, 0);
    roof('tt_roofT', w, d, y0 + h, Math.max(3, d * .2));
  });
}
function sanmon(x, z) {   // two-storey vermilion gate, passage along local z (world x)
  withFrame(x, 0, z, Math.PI / 2, () => {
    box('tt_stone', 26, .5, 13, 0, .37, 0);
    for (const cx of [-10, -3.2, 3.2, 10]) for (const cz of [-4.5, 0, 4.5]) cyl('tt_verm', .45, 7.6, cx, 4.4, cz, 0, 0, 0, 10);
    for (const s of [-1, 1]) { box('tt_verm', 6, 6.6, .4, s * 6.6, 3.9, 0); box('tt_woodR', 6.6, .8, 10, s * 6.6, 7.6, 0); }   // side bays (guardian niches)
    box('tt_verm', 21, .8, 10, 0, 8.2, 0);
    put('tt_roofT', frustum(27, 15, 22, 10.5, 1.5), M4(0, 8.6, 0));
    box('tt_verm', 20, 5, 8.6, 0, 12.6, 0); box('win', 18, 1.8, 8.7, 0, 12.8, 0);
    box('tt_verm', 22, .3, 10.6, 0, 10.2, 0); for (let i = -5; i <= 5; i++) box('tt_verm', .15, 1, .15, i * 2.1, 10.8, 5.2);
    roof('tt_roofT', 20, 8.6, 15.1, 3.2);
  });
}
function temple(ctx, r) {
  box('tt_pave', 112, .06, 97, -14, .15, -101.5);                              // precinct ground x −70..42, z −150..−53
  box('tt_stone', 44, .08, 22, -40, .2, -105);                                 // stone forecourt
  box('tt_stone', 8, .08, 12, -66, .2, -105);
  templeHall(5, -105, 32, 24, 9, -Math.PI / 2, 2.4);                           // Daiden, facing west
  templeHall(-35, -136, 16, 10, 5, 0, 1);
  templeHall(26, -138, 20, 10, 5.5, 0, 1);
  templeHall(-36, -70, 14, 9, 5, Math.PI, 1);
  templeHall(28, -69, 16, 10, 5, Math.PI, 1);
  sanmon(-63, -105);
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) { const x = -54 + i * 9; cyl('tt_stone', .45, 1.6, x, .95, -105 + s * 9, 0, 0, 0, 6); put('tt_roofT', frustum(1.6, 1.6, .3, .3, .6), M4(x, 1.75, -105 + s * 9)); }
  for (let i = 0; i < 160; i++) {   // temple trees
    const x = -68 + r() * 108, z = -148 + r() * 93;
    if (x > -62 && x < 30 && z > -126 && z < -84) continue;
    if ([[-35, -136, 16, 10], [26, -138, 20, 10], [-36, -70, 14, 9], [28, -69, 16, 10]].some(([hx, hz, w, dd]) => Math.abs(x - hx) < w / 2 + 6 && Math.abs(z - hz) < dd / 2 + 6)) continue;
    ctx.tree(x, z, .9 + r() * .7, .18);
  }
}

/* ───────── Shiba Park with a sunken pond ───────── */
function park(ctx, r, dx, dz) {
  const P = [-5, 100, 24, 15], RECT = [[-70, 56], [42, 56], [42, 150], [-70, 150]];
  cutLand(ctx, dx + P[0] - P[2] - 3, dz + P[1] - P[3] - 3, dx + P[0] + P[2] + 3, dz + P[1] + P[3] + 3);
  const E = ellipse(P[0], P[1], P[2], P[3]);
  flat('grass', RECT, [E], .1);
  flat('tt_mud', E, [], -.9); flat('tt_water', E, [], -.45);
  for (let i = 0; i < 40; i++) {   // stone edge ring
    const a = (i + .5) / 40 * Math.PI * 2, x = P[0] + Math.cos(a) * (P[2] + .4), z = P[1] + Math.sin(a) * (P[3] + .4);
    const tx = -Math.sin(a) * P[2], tz = Math.cos(a) * P[3], seg = Math.hypot(tx, tz) * Math.PI * 2 / 40 + .4;
    box('tt_stone', seg, 1.1, .8, x, -.35, z, K.ang(tx, tz));
  }
  for (const a of [.4, 2.6, 4.4]) for (let s = 0; s < 4; s++) {   // stepping stones out of the water
    const top = -.7 + s * .2, f = 1 - (2.2 - s * .5) / P[2];
    box('tt_stone', 1.4, top + .9, 1.4, P[0] + Math.cos(a) * P[2] * f, (top - .9) / 2, P[1] + Math.sin(a) * P[3] * f, -a);
  }
  // paths
  box('tt_gravel', 4, .06, 94, -40, .13, 103); box('tt_gravel', 112, .06, 4, -14, .13, 66); box('tt_gravel', 4, .06, 30, 30, .13, 81);
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; box('tt_gravel', 5, .06, 3, P[0] + Math.cos(a) * (P[2] + 4), .13, P[1] + Math.sin(a) * (P[3] + 4), K.ang(-Math.sin(a), Math.cos(a))); }
  // trees: dense around the pond and park edges, open lawn in the north-west
  for (let i = 0; i < 320; i++) {
    const x = -68 + r() * 108, z = 58 + r() * 90;
    const e = ((x - P[0]) / (P[2] + 6)) ** 2 + ((z - P[1]) / (P[3] + 6)) ** 2;
    if (e < 1) continue;
    if (x > -64 && x < 10 && z < 84 && r() < .85) continue;                       // lawn
    if (Math.abs(x + 40) < 4 || Math.abs(z - 66) < 4) continue;
    ctx.tree(x, z, .9 + r() * .8, .1);
  }
  for (let i = 0; i < 6; i++) { const x = -60 + i * 9; box('wallD', 2, .12, .6, x, .55, 70); }   // benches by the lawn
}

/* ───────── street furniture ───────── */
function car(x, z, ry, k, y = .06) {
  const m = k === 'tt_taxi' ? 'jp_taxi' : ['jp_sedan', 'kcar', 'jp_sedan', 'kei_truck'][Math.floor(Math.random() * 4)];
  withFrame(x, y, z, ry, () => prop(m, 0, 0, 0));
}
function bus(x, z, ry, y = .06) {
  withFrame(x, y, z, ry, () => prop('city_bus', 0, 0, 0));
}
function tlight(x, z, ry) {
  withFrame(x, 0, z, ry, () => {
    box('steel', .22, 6, .22, 0, 3.1, 0); box('steel', 5, .15, .15, 2.5, 5.9, 0);
    box('steel', 1.2, .45, .35, 4.3, 5.6, 0); box('redS', .3, .3, .05, 3.9, 5.6, .2); box('glowY', .3, .3, .05, 4.3, 5.6, .2);
  });
}
// N–S (x, w) and E–W (z, w) roads with lane marks and crosswalks
function roads(r) {
  const NS = [[-80, 20], [50, 16], [115, 20]], EW = [[-45, 16], [48, 16]];
  for (const [x, w] of NS) {
    box('road', w, .06, 300, x, .031, 0);
    for (let z = -148; z < 148; z += 8) if (!EW.some(([ez, ew]) => Math.abs(z - ez) < ew / 2 + 5)) { box('lineW', .18, .02, 3, x - w / 4, .071, z); box('lineW', .18, .02, 3, x + w / 4, .071, z); }
    box('lineY', .15, .02, 300, x - .2, .072, 0); box('lineY', .15, .02, 300, x + .2, .072, 0);
  }
  for (const [z, w] of EW) {
    box('road', 280, .06, w, 0, .03, z);
    for (let x = -138; x < 138; x += 8) if (!NS.some(([nx, nw]) => Math.abs(x - nx) < nw / 2 + 5)) box('lineW', 3, .02, .18, x, .07, z);
  }
  for (const [x, w] of NS) for (const [z, ew] of EW) {   // zebra crossings
    for (let i = -w / 2 + 1; i < w / 2 - .5; i += 1.4) for (const s of [-1, 1]) box('lineW', .7, .02, 3.6, x + i, .075, z + s * (ew / 2 + 2.4));
    for (let i = -ew / 2 + 1; i < ew / 2 - .5; i += 1.4) for (const s of [-1, 1]) box('lineW', 3.6, .02, .7, x + s * (w / 2 + 2.4), .076, z + i);
    if (x < 100) { tlight(x - w / 2 - 1, z - ew / 2 - 1, 0); tlight(x + w / 2 + 1, z + ew / 2 + 1, Math.PI); }
  }
  // abandoned traffic
  const lanes = [];
  for (const [x, w] of NS) for (let i = 0; i < 9; i++) lanes.push([x + (r() < .5 ? -1 : 1) * w * (.15 + r() * .25), -140 + r() * 280, -Math.PI / 2 + (r() - .5) * .5]);
  for (const [z, w] of EW) for (let i = 0; i < 8; i++) lanes.push([-135 + r() * 270, z + (r() < .5 ? -1 : 1) * w * (.15 + r() * .2), (r() - .5) * .5]);
  lanes.forEach(([x, z, ry], i) => { if (i % 11 === 3) bus(x, z, ry); else car(x, z, ry, ['tt_car0', 'tt_car1', 'tt_car2', 'tt_car3', 'tt_taxi', 'tt_car0'][Math.floor(r() * 6)]); });
}
function expressway(r) {   // decorative, collidable; same section as the city expressways (deck y=27)
  const y = 27, w = 24, x = 115;
  withFrame(x, 0, 0, Math.PI / 2, () => {   // local +x → world −z
    const L = 300;
    box('hwy', L, 2.6, w, 0, y, 0); box('steel', L, .4, w + .6, 0, y - 1.5, 0);
    box('conc', L, 1.1, .5, 0, y + 1.8, w / 2 - .25); box('conc', L, 1.1, .5, 0, y + 1.8, -w / 2 + .25); box('conc', L, .8, .4, 0, y + 1.7, 0);
    for (let i = 0; i <= 11; i++) { const s = -L / 2 + 7 + i * 26; box('hwy', 4.2, y - 1.4, 4.4, s, (y - 1.4) / 2, 0); box('hwy', 6, 1.4, w - 6, s, y - 2, 0); }
    for (let i = 0; i < 10; i++) { const s = -L / 2 + 15 + i * 30; for (const t of [-1, 1]) { box('steel', .2, 6, .2, s, y + 4.5, t * (w / 2 - .5)); box('steelL', .8, .12, 1.6, s, y + 7.6, t * (w / 2 - 1.3)); } }   // dead lamps
    for (let i = 0; i < 12; i++) car(-140 + r() * 280, (r() < .5 ? -1 : 1) * (2.5 + r() * 7), (r() < .5 ? 0 : Math.PI) + (r() - .5) * .3, ['tt_car0', 'tt_car1', 'tt_car2', 'tt_taxi'][i % 4], y + 1.3);
    bus(40, -5, .05, y + 1.3);
    for (let i = 0; i < 8; i++) box('ivy', 3 + r() * 6, .3, 1 + r() * 3, -140 + r() * 280, y + 1.45, (r() - .5) * 18);   // weeds on the deck
  });
}

/* ───────── overgrown filler buildings ───────── */
const FLOOR = 3.5;
function bld(ctx, x, z, w, d, h, r, rot) { return cityBuilding(x, z, w, d, h, r, rot === undefined ? {} : { rot }); }   // modular detailed building (buildings.js)
// a city block between roads: sidewalk slab, street trees, lots of buildings (skipping `avoid` rects)
function block(ctx, x0, z0, x1, z1, hlo, hhi, r, avoid = []) {
  box('walk', x1 - x0, .12, z1 - z0, (x0 + x1) / 2, .06, (z0 + z1) / 2);
  for (let x = x0 + 4; x < x1 - 2; x += 13) { ctx.tree(x, z0 + 2, .8, .12); ctx.tree(x, z1 - 2, .8, .12); }
  for (let z = z0 + 10; z < z1 - 8; z += 13) { ctx.tree(x0 + 2, z, .8, .12); ctx.tree(x1 - 2, z, .8, .12); }
  const m = 4.5;
  for (let x = x0 + m; x < x1 - m - 8; ) {
    let lw = Math.min(x1 - m - x, 15 + r() * 16); if (x1 - m - x - lw < 9) lw = x1 - m - x;
    for (let z = z0 + m; z < z1 - m - 8; ) {
      let ld = Math.min(z1 - m - z, 15 + r() * 16); if (z1 - m - z - ld < 9) ld = z1 - m - z;
      const cx = x + lw / 2, cz = z + ld / 2;
      if (!avoid.some(([a, b, c, e]) => cx > a - lw / 2 && cx < c + lw / 2 && cz > b - ld / 2 && cz < e + ld / 2) && r() > .06) {
        const h = r() < .12 ? 52 + r() * 34 : hlo + r() * (hhi - hlo);
        bld(ctx, cx, cz, lw - 3 - r() * 3, ld - 3 - r() * 3, h, r);
      }
      z += ld;
    }
    x += lw;
  }
}

export function build(ctx, d) {
  const waterN = mats(), r = K.rng(4703);
  withFrame(d.x, 0, d.z, 0, () => {
    roads(r);
    expressway(r);
    // tower block: plaza slab, Foot Town and the tower (tower frame at local (−10, 0))
    box('tt_pave', 112, .12, 77, -14, .06, 1.5);
    withFrame(-10, 0, 0, 0, () => { footTown(ctx); lattice(); deck(58, 11, 2); deck(103, 6, 1); mast(); });
    for (const [x, z] of [[-66, -30], [-66, -18], [-66, 18], [-66, 32], [-58, 36], [36, 36], [38, -32], [24, -32], [-40, -32]]) ctx.tree(x, z, 1 + r() * .4, .12);
    for (const z of [-20, 20]) K.lamp(-64, z, 6, { spot: false, warm: true, y0: .12, dir: Math.PI / 2 });
    temple(ctx, r);
    park(ctx, r, d.x, d.z);
    // west side (image foreground): dense mid-rise
    block(ctx, -140, -150, -90, -53, 14, 42, r); block(ctx, -140, -37, -90, 40, 14, 40, r); block(ctx, -140, 56, -90, 150, 14, 42, r);
    // east strip between road x=50 and the expressway road
    const qh = [62, 64, 92, 88], kc = [70, 118, 100, 146], kd = [64, -142, 96, -104];
    block(ctx, 58, -150, 105, -53, 16, 45, r, [kd]); block(ctx, 58, -37, 105, 40, 14, 38, r); block(ctx, 58, 56, 105, 150, 12, 30, r, [qh, kc]);
    block(ctx, 125, -150, 140, 150, 10, 22, r);
    // card-mural towers
    const qH = bld(ctx, 77, 76, 26, 22, 45, r, Math.PI / 2); card(ctx, 'Q', 'H', 21, 63.8, qH * .52, 76, -Math.PI / 2);
    const cH = bld(ctx, 85, 132, 24, 22, 34, r, Math.PI / 2); card(ctx, 'K', 'C', 15, 72.8, cH * .5, 132, -Math.PI / 2);
    const dH = bld(ctx, 80, -123, 24, 24, 92, r, Math.PI / 2); card(ctx, 'K', 'D', 21, 67.8, dH * .62, -123, -Math.PI / 2);
  });
  ctx.updates.push((dt) => { waterN.offset.x += dt * .006; waterN.offset.y += dt * .004; });
  ctx.dayNight.push((day) => { K.mats.tt_or.emissiveIntensity = day ? 0 : .2; K.mats.tt_wh.emissiveIntensity = day ? 0 : .08; });
  ctx.pois.push({ id: d.id, cam: [d.x - 260, 165, d.z + 40], tgt: [d.x + 30, 45, d.z - 5], spawn: [d.x - 10, TB + .06, d.z + 19], yaw: 0 });
}
