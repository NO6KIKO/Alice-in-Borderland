// Shared build kit: procedural textures, material palette, a zone-aware geometry batcher and the
// structural pieces (truss, catwalk, stairs, railings, lamps…). Every district module draws with these;
// geometry is merged per (zone, material) so each district culls as a unit and collides via the BVH.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

let _scene = null;
export function initKit(scene) { _scene = scene; }

/* ───────────── helpers ───────────── */
export function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const R = rng(20241018);

export function canvasTex(w, h, draw, { srgb = true, repeat = false } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
export function noise(g, w, h, amt) {
  const id = g.getImageData(0, 0, w, h), d = id.data;
  for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - .5) * amt; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(id, 0, 0);
}

/* textures */
export const texConcrete = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#8b8f93'; g.fillRect(0, 0, w, h); noise(g, w, h, 40);
  for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(20,24,28,${Math.random() * .12})`; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 5 + Math.random() * 50, 3 + Math.random() * 30, Math.random() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 14; i++) { const x = Math.random() * w; const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(10,10,10,.25)'); gr.addColorStop(1, 'rgba(10,10,10,0)'); g.fillStyle = gr; g.fillRect(x, 0, 2 + Math.random() * 5, h * (.3 + Math.random() * .6)); }
  g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2; g.strokeRect(0, 0, w, h);
}, { repeat: true });
export const texPanel = canvasTex(512, 512, (g, w, h) => {   // precast wall panels with bolt holes & rust streaks
  g.fillStyle = '#868a8e'; g.fillRect(0, 0, w, h); noise(g, w, h, 34);
  g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4); g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
  g.fillStyle = 'rgba(0,0,0,.5)'; for (const x of [40, w - 40]) for (const y of [40, h / 2 - 40, h / 2 + 40, h - 40]) { g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); }
  for (let i = 0; i < 20; i++) { const x = Math.random() * w; const gr = g.createLinearGradient(0, h / 2, 0, h); gr.addColorStop(0, 'rgba(60,40,20,.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x, h / 2, 3, h / 2); }
}, { repeat: true });
export const texWall = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#7d848c'; g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 16) { const gr = g.createLinearGradient(x, 0, x + 16, 0); gr.addColorStop(0, 'rgba(255,255,255,.18)'); gr.addColorStop(.5, 'rgba(0,0,0,.0)'); gr.addColorStop(1, 'rgba(0,0,0,.35)'); g.fillStyle = gr; g.fillRect(x, 0, 16, h); }
  noise(g, w, h, 22);
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(30,20,10,.25)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
}, { repeat: true });
export const texCorr = canvasTex(256, 256, (g, w, h) => {   // painted corrugated steel (light, tinted by material colour)
  g.fillStyle = '#e8e8e8'; g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 16) { const gr = g.createLinearGradient(x, 0, x + 16, 0); gr.addColorStop(0, 'rgba(255,255,255,.25)'); gr.addColorStop(.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.22)'); g.fillStyle = gr; g.fillRect(x, 0, 16, h); }
  noise(g, w, h, 16);
  for (let i = 0; i < 14; i++) { const x = Math.random() * w, gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(90,50,20,.3)'); gr.addColorStop(1, 'rgba(90,50,20,0)'); g.fillStyle = gr; g.fillRect(x, 0, 2 + Math.random() * 4, h * Math.random()); }
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(.7, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(60,40,20,.25)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
}, { repeat: true });
export const texGrate = canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#1c2026'; g.fillRect(0, 0, w, h); g.strokeStyle = '#9aa2ac'; g.lineWidth = 3;
  for (let i = 0; i <= w; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
}, { repeat: true });
export const texHaz = canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#e8b50f'; g.fillRect(0, 0, w, h); g.fillStyle = '#16181b';
  for (let i = -h; i < w + h; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 16, 0); g.lineTo(i + 16 + h, h); g.lineTo(i + h, h); g.fill(); }
}, { repeat: true });
export const texFence = canvasTex(64, 64, (g, w, h) => {
  g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(140,150,160,.9)'; g.lineWidth = 2.2;
  for (let i = -h; i < w + h; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); g.beginPath(); g.moveTo(i + h, 0); g.lineTo(i, h); g.stroke(); }
}, { repeat: true });
export const texWin = canvasTex(256, 64, (g, w, h) => {
  g.fillStyle = '#10161c'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 8; i++) { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#bff2ff'); gr.addColorStop(1, '#6bb8d2'); g.fillStyle = gr; g.fillRect(i * 32 + 3, 6, 26, h - 12); }
}, { repeat: true });
export const texGrille = canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#3a3f45'; g.fillRect(0, 0, w, h); g.fillStyle = '#16191d'; for (let y = 4; y < h; y += 8) g.fillRect(4, y, w - 8, 4); }, { repeat: true });
export const texAsphalt = canvasTex(1024, 1024, (g, w, h) => {
  g.fillStyle = '#25282c'; g.fillRect(0, 0, w, h); noise(g, w, h, 34);
  for (let i = 0; i < 120; i++) { g.strokeStyle = `rgba(0,0,0,${Math.random() * .35})`; g.lineWidth = 1 + Math.random() * 2; g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (Math.random() - .5) * 90; y += (Math.random() - .5) * 90; g.lineTo(x, y); } g.stroke(); }
}, { repeat: true });
texAsphalt.repeat.set(50, 50);
export const texPuddle = canvasTex(1024, 1024, (g, w, h) => {
  g.fillStyle = 'rgb(220,220,220)'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 130; i++) {
    const x = Math.random() * w, y = Math.random() * h, r = 16 + Math.random() * 80, e = .4 + Math.random() * .5;
    for (const [ox, oy] of [[0, 0], [-w, 0], [w, 0], [0, -h], [0, h]]) {
      const gr = g.createRadialGradient(x + ox, y + oy, r * .3, x + ox, y + oy, r); gr.addColorStop(0, 'rgba(55,55,55,.95)'); gr.addColorStop(1, 'rgba(55,55,55,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(x + ox, y + oy, r, r * e, 0, 0, 7); g.fill();
    }
  }
  noise(g, w, h, 30);
}, { srgb: false, repeat: true });
texPuddle.repeat.set(4, 4);

/* ───────────── materials + batcher ───────────── */
export const batches = new Map();   // "zone|matKey" → geometries
export const mats = {};
export function def(key, mat, tile = 1) { mat.userData.tile = tile; mats[key] = mat; }
export let zone = 'compound';
export function setZone(z) { zone = z; }
function bucket(key) { if (!mats[key]) throw new Error('unknown material ' + key); const id = zone + '|' + key; let b = batches.get(id); if (!b) batches.set(id, b = []); return b; }
export const std = (o) => new THREE.MeshStandardMaterial(o);
export const bas = (o) => new THREE.MeshBasicMaterial(o);
def('conc', std({ map: texConcrete, color: 0xb0b4b8, roughness: .92 }), 4);
def('concD', std({ map: texConcrete, color: 0x6a6e72, roughness: .95 }), 4);
def('panel', std({ map: texPanel, color: 0xa6aaae, roughness: .9 }), 6);
def('hwy', std({ map: texConcrete, color: 0x5a6270, emissive: 0x161d28, roughness: .9 }), 4);
def('wall', std({ map: texWall, color: 0xbcc4cc, roughness: .5, metalness: .45 }), 2.4);
def('wallD', std({ map: texWall, color: 0x76808a, roughness: .55, metalness: .45 }), 2.4);
def('steel', std({ color: 0x1c2026, roughness: .5, metalness: .85 }));
def('steelL', std({ color: 0x4b525a, roughness: .45, metalness: .8 }));
def('yel', std({ color: 0xe0a812, emissive: 0x3a2800, roughness: .5, metalness: .25 }));
def('grate', std({ map: texGrate, roughness: .55, metalness: .7 }), 1);
def('grille', std({ map: texGrille, roughness: .6, metalness: .6 }), .6);
def('haz', std({ map: texHaz, roughness: .6 }), 1.2);
def('paint', std({ color: 0xcfa51a, roughness: .55 }));
def('paintW', std({ color: 0xc8ccd0, roughness: .55 }));
def('pipeG', std({ color: 0x8a9199, roughness: .32, metalness: .9 }));
def('pipeR', std({ color: 0x7a4f35, roughness: .6, metalness: .7 }));
def('pipeD', std({ color: 0x2b3036, roughness: .45, metalness: .85 }));
def('valve', std({ color: 0xb02820, roughness: .5, metalness: .4 }));
def('truckW', std({ color: 0xd2d6d9, roughness: .45, metalness: .3 }));
def('truckB', std({ color: 0x1c3a5f, roughness: .35, metalness: .5 }));
def('tire', std({ color: 0x0c0d0f, roughness: .8 }));
def('contG', std({ map: texCorr, color: 0x3f6e58, roughness: .7, metalness: .08 }), 2.4);
def('contR', std({ map: texCorr, color: 0xa8402e, roughness: .7, metalness: .08 }), 2.4);
def('contB', std({ map: texCorr, color: 0x2f5d92, roughness: .7, metalness: .08 }), 2.4);
def('cone', std({ color: 0xe8631a, roughness: .6 }));
def('barrel', std({ color: 0x264f8c, roughness: .5, metalness: .4 }));
def('glow', bas({ color: new THREE.Color(3.2, 2.8, 2.1) }));
def('glowC', bas({ color: new THREE.Color(2.2, 2.8, 3.4) }));
def('glowY', bas({ color: new THREE.Color(2.6, 1.7, .5) }));
def('arrow', bas({ color: new THREE.Color(.25, 1.3, 1.8) }));
def('redS', bas({ color: new THREE.Color(3, .15, .1) }));
def('win', bas({ map: texWin, color: new THREE.Color(1.4, 1.4, 1.4) }), 4);
def('fence', new THREE.MeshStandardMaterial({ map: texFence, transparent: true, alphaTest: .35, side: THREE.DoubleSide, roughness: .6, metalness: .8, color: 0x9aa3ad }), 1.6);
export const texPool = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }, { srgb: false });
export const poolMat = (c) => new THREE.MeshBasicMaterial({ map: texPool, color: c, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
def('poolC', poolMat(new THREE.Color(.34, .4, .48)));
def('poolY', poolMat(new THREE.Color(.5, .34, .14)));
def('beam', new THREE.MeshBasicMaterial({ color: 0xaecbff, transparent: true, opacity: .018, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }));

export let frame = new THREE.Matrix4();
export const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);
export function M4(x, y, z, rx = 0, ry = 0, rz = 0) { _e.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_e); return new THREE.Matrix4().compose(_v.set(x, y, z), _q, _s); }
export function put(key, geo, m) { geo.applyMatrix4(frame.clone().multiply(m)); bucket(key).push(geo); }
export function withFrame(x, y, z, ry, fn) { const old = frame; frame = old.clone().multiply(M4(x, y, z, 0, ry, 0)); fn(); frame = old; }
export const fpos = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(frame);   // local → world point
export const ang = (dx, dz) => Math.atan2(-dz, dx);   // rotation that maps local +x onto world (dx,dz)

export function boxGeo(key, w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, t = mats[key].userData.tile;
  const f = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let i = 0; i < 24; i++) { const [a, b] = f[i >> 2]; uv.setXY(i, uv.getX(i) * a / t, uv.getY(i) * b / t); }
  return g;
}
export const box = (k, w, h, d, x, y, z, ry = 0, rz = 0, rx = 0) => put(k, boxGeo(k, w, h, d), M4(x, y, z, rx, ry, rz));
export const cyl = (k, r, h, x, y, z, rx = 0, ry = 0, rz = 0, seg = 18, r2 = r) => put(k, new THREE.CylinderGeometry(r2, r, h, seg), M4(x, y, z, rx, ry, rz));
export const sph = (k, r, x, y, z, sx = 1, sy = 1, sz = 1) => { const g = new THREE.SphereGeometry(r, 18, 12); g.scale(sx, sy, sz); put(k, g, M4(x, y, z)); };
export const plane = (k, w, h, x, y, z, ry = 0, rx = 0) => { const g = new THREE.PlaneGeometry(w, h); const t = mats[k].userData.tile; const uv = g.attributes.uv; for (let i = 0; i < 4; i++) uv.setXY(i, uv.getX(i) * w / t, uv.getY(i) * h / t); put(k, g, M4(x, y, z, rx, ry, 0)); };
export function strut(k, a, b, r = .07, seg = 6) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), L = d.length();
  if (L < 1e-4) return;
  const g = new THREE.CylinderGeometry(r, r, L, seg);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  put(k, g, new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(.5), q, _s));
}
export function torus(k, R_, r, arc, x, y, z, rx, ry, rz, seg = 10) { put(k, new THREE.TorusGeometry(R_, r, 8, seg, arc), M4(x, y, z, rx, ry, rz)); }
// pipe run through points, with ball joints and flanges
export function pipePath(k, r, pts, flange = true) {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = new THREE.Vector3(...pts[i]), b = new THREE.Vector3(...pts[i + 1]), d = b.clone().sub(a), L = d.length(); d.normalize();
    strut(k, pts[i], pts[i + 1], r, 18);
    if (flange && L > r * 4) for (const t of [r * 1.6, L - r * 1.6]) { const p = a.clone().addScaledVector(d, t); strut('pipeD', p.clone().addScaledVector(d, -.08).toArray(), p.clone().addScaledVector(d, .08).toArray(), r * 1.28, 18); }
    if (i > 0) sph(k, r * 1.02, ...pts[i]);
  }
}

/* blinking beacons */
export const beacons = [];
export const beacon = (x, y, z, mast = .5) => { const p = fpos(x, y, z); beacons.push([p.x, p.y, p.z]); box('steel', .08, mast, .08, x, y - mast / 2, z); };

/* lights (budgeted) */
export const MAX_SPOTS = 48; export let spotCount = 0;
export const spots = [];
export function addSpot(col, I, dist, a, pen, pos, tgt) {
  if (spotCount >= MAX_SPOTS) return; spotCount++;
  const L = new THREE.SpotLight(col, I, dist, a, pen, 1.7); L.position.copy(pos); L.target.position.copy(tgt); _scene.add(L, L.target);
  L.userData.I = I; spots.push(L); return L;
}
export function lamp(x, z, h, { dir = 0, spot = true, warm = false, intensity = 900, arm = 1.6, y0 = 0 } = {}) {
  const ax = x + Math.sin(dir) * arm, az = z + Math.cos(dir) * arm, top = y0 + h;
  box('steel', .16, h, .16, x, y0 + h / 2, z);
  strut('steel', [x, top, z], [ax, top + .2, az], .06);
  withFrame(ax, top + .1, az, dir, () => { box(warm ? 'glowY' : 'glow', .5, .1, 1.0, 0, 0, 0); box('steel', .6, .08, 1.1, 0, .08, 0); });
  if (spot) {
    addSpot(warm ? 0xffc27a : 0xd8ecff, intensity, 70, .95, .75, new THREE.Vector3(ax, top, az), new THREE.Vector3(ax * .85 + x * .15, 0, az * .85 + z * .15));
    put('beam', new THREE.ConeGeometry(top * .62, top, 20, 1, true), M4(ax, top / 2, az));
  }
  pool(ax, az, spot ? h * .55 : h * 1.1, warm, y0);
}
// fake light pool decal on the floor (cheap stand-in for extra lights)
export function pool(x, z, r, warm = false, y = 0) {
  const g = new THREE.PlaneGeometry(r * 2, r * 2); g.rotateX(-Math.PI / 2);
  put(warm ? 'poolY' : 'poolC', g, M4(x, y + .16, z));
}
export function floodlight(x, y, z, tx, ty, tz, col = 0xe8f2ff, I = 3000, a = .5, light = true) {
  if (light) addSpot(col, I * .22, 90, a, .6, new THREE.Vector3(x, y, z), new THREE.Vector3(tx, ty, tz));
  const d = new THREE.Vector3(tx - x, ty - y, tz - z).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d);
  put('glow', new THREE.BoxGeometry(.9, .6, .15), new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, _s));
  put('steel', new THREE.BoxGeometry(1.05, .72, .2), new THREE.Matrix4().compose(new THREE.Vector3(x - d.x * .1, y - d.y * .1, z - d.z * .1), q, _s));
}

/* ───────────── structural kit ───────────── */
export function truss(x, z, w, d, h, { y0 = 0, leg = .32, n = Math.max(2, Math.round(h / 4)), k = 'steel', rb = .07 } = {}) {
  const c = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([a, b]) => [x + a, z + b]);
  c.forEach(([a, b]) => box(k, leg, h, leg, a, y0 + h / 2, b));
  const dy = h / n;
  for (let i = 0; i <= n; i++) {
    const y = y0 + i * dy;
    for (let j = 0; j < 4; j++) { const A = c[j], B = c[(j + 1) % 4]; strut(k, [A[0], y, A[1]], [B[0], y, B[1]], rb); }
    if (i < n) for (let j = 0; j < 4; j++) { const A = c[j], B = c[(j + 1) % 4]; const f = (i + j) % 2; strut(k, [f ? A[0] : B[0], y, f ? A[1] : B[1]], [f ? B[0] : A[0], y + dy, f ? B[1] : A[1]], rb * .8); }
  }
}
/* Railings are deferred: walk decks and stair mouths register "openings", and at the end any railing
   stretch lying over another deck or across a stair mouth is cut — so junctions and stair heads stay open. */
export const openings = [], railJobs = [];
export function openingLocal(x0, x1, z0, z1, y) {
  const p = [fpos(x0, 0, z0), fpos(x1, 0, z0), fpos(x0, 0, z1), fpos(x1, 0, z1)];
  openings.push({ x0: Math.min(...p.map((v) => v.x)), x1: Math.max(...p.map((v) => v.x)), z0: Math.min(...p.map((v) => v.z)), z1: Math.max(...p.map((v) => v.z)), y });
}
export const opening = (x0, x1, z0, z1, y) => openings.push({ x0, x1, z0, z1, y });
export function railings(L, y, w, sides = [-1, 1]) { const f = frame.clone(), z = zone; railJobs.push(() => { const old = frame, oz = zone; frame = f; zone = z; railingsNow(L, y, w, sides); frame = old; zone = oz; }); }
export function railingsNow(L, y, w, sides) {
  const n = Math.max(1, Math.ceil(L / .25)), cell = L / n;
  for (const s of sides) {
    const runs = []; let start = null;
    for (let i = 0; i <= n; i++) {
      let blocked = true;
      if (i < n) { const p = fpos(-L / 2 + (i + .5) * cell, 0, s * w / 2); blocked = openings.some((o) => p.x > o.x0 && p.x < o.x1 && p.z > o.z0 && p.z < o.z1 && Math.abs(o.y - y) < 1); }
      if (!blocked && start === null) start = i;
      if (blocked && start !== null) { runs.push([-L / 2 + start * cell, -L / 2 + i * cell]); start = null; }
    }
    for (const [a, b] of runs) {
      const l = b - a, c = (a + b) / 2; if (l < .3) continue;
      box('steel', l, .22, .04, c, y + .17, s * w / 2);
      box('yel', l, .06, .06, c, y + 1.1, s * w / 2); box('yel', l, .04, .04, c, y + .65, s * w / 2);
      const np = Math.max(1, Math.round(l / 1.8));
      for (let i = 0; i <= np; i++) box('yel', .06, 1.1, .06, a + i * l / np, y + .55, s * w / 2);
    }
  }
}
// free-standing railing from (x1,z1) to (x2,z2)
export function railSeg(x1, z1, x2, z2, y) { const dx = x2 - x1, dz = z2 - z1; withFrame((x1 + x2) / 2, 0, (z1 + z2) / 2, ang(dx, dz), () => railings(Math.hypot(dx, dz), y, .0001, [1])); }
// legs: 'truss' (lattice pylons), 'frame' (H-frames), 'none'
export function catwalk(x1, z1, x2, z2, y, w = 2.6, { legs = 'frame', every = 12, sides = [-1, 1], lights = true } = {}) {
  const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz);
  withFrame((x1 + x2) / 2, 0, (z1 + z2) / 2, ang(dx, dz), () => {
    box('grate', L, .1, w, 0, y, 0);
    openingLocal(-L / 2 - .5, L / 2 + .5, -w / 2 + .05, w / 2 - .05, y);   // deck: cuts foreign railings crossing it
    box('steelL', L, .35, .12, 0, y - .22, w / 2 - .06); box('steelL', L, .35, .12, 0, y - .22, -w / 2 + .06);
    const nb = Math.round(L / 1.2);
    for (let i = 0; i <= nb; i++) box('steel', .06, .1, w, -L / 2 + i * L / nb, y - .08, 0);
    railings(L, y, w, sides);
    const ns = Math.max(1, Math.round(L / every));
    for (let i = 0; i <= ns; i++) {
      const s = -L / 2 + i * L / ns;
      if (lights && i < ns) box('glowC', 1.2, .05, .25, s + L / ns / 2, y - .42, 0);
      if (legs === 'frame') {
        for (const t of [-1, 1]) box('steel', .28, y - .4, .28, s, (y - .4) / 2, t * (w / 2 + .1));
        box('steel', .22, .4, w + .6, s, y - .4, 0);
        for (const hh of [y * .3, y * .65]) strut('steel', [s, hh, w / 2 + .1], [s, hh, -w / 2 - .1], .06);
        strut('steel', [s, y * .3, w / 2 + .1], [s, y * .65, -w / 2 - .1], .05); strut('steel', [s, y * .3, -w / 2 - .1], [s, y * .65, w / 2 + .1], .05);
      } else if (legs === 'truss') {
        truss(s, 0, 1.6, w, y - .3, { n: Math.max(2, Math.round(y / 3.5)), leg: .26, rb: .06 });
      }
    }
  });
}
export function stairs(x, z, dx, dz, y0, y1, w = 1.6, run = .3) {
  const rise = .2, n = Math.ceil((y1 - y0) / rise), r = (y1 - y0) / n, L = n * run, th = Math.atan2(y1 - y0, L), len = Math.hypot(L, y1 - y0);
  withFrame(x, 0, z, ang(dx, dz), () => {
    openingLocal(-.9, .4, -w / 2 - .15, w / 2 + .15, y0); openingLocal(L - .4, L + .9, -w / 2 - .15, w / 2 + .15, y1);   // stair mouths
    for (let i = 0; i < n; i++) box('grate', run, .05, w, run * (i + .5), y0 + r * (i + 1), 0);
    for (const s of [-1, 1]) {
      box('steelL', len, .3, .06, L / 2, y0 + (y1 - y0) / 2 - .1, s * w / 2, 0, th);
      box('yel', len, .06, .06, L / 2, y0 + (y1 - y0) / 2 + 1.0, s * w / 2, 0, th);
      box('yel', len, .04, .04, L / 2, y0 + (y1 - y0) / 2 + .55, s * w / 2, 0, th);
      for (let i = 0; i <= n; i += 3) box('yel', .05, 1.0, .05, run * i, y0 + r * i + .5, s * w / 2);
    }
    for (let i = 1; i <= 3; i++) { const t = i / 3, hh = y0 + (y1 - y0) * t; if (hh > 1.5) for (const s of [-1, 1]) box('steel', .2, hh, .2, L * t, hh / 2 - .1, s * (w / 2 + .1)); }
  });
  return L;
}
// switchback stair: two flights joined by a landing
export function switchback(x, z, dx, dz, y0, y1, w = 1.6) {
  const mid = (y0 + y1) / 2, L = stairs(x, z, dx, dz, y0, mid, w), nx = -dz, nz = dx;
  const lx = x + dx * (L + w / 2), lz = z + dz * (L + w / 2);
  withFrame(lx + nx * (w / 2 + .1), 0, lz + nz * (w / 2 + .1), ang(dx, dz), () => {
    box('grate', w + .2, .1, w * 2 + .2, 0, mid, 0); railings(w + .2, mid, w * 2 + .2, [-1, 1]);
    withFrame((w + .2) / 2, 0, 0, Math.PI / 2, () => railings(w * 2 + .2, mid, .0001, [1]));   // far edge
    for (const a of [-1, 1]) for (const b of [-1, 1]) box('steel', .2, mid, .2, a * w / 2, mid / 2, b * w);
  });
  stairs(x + dx * L + nx * (w + .2), z + dz * L + nz * (w + .2), -dx, -dz, mid, y1, w);
}
export function chainFence(x1, z1, x2, z2, y, h) {
  const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz);
  plane('fence', L, h, (x1 + x2) / 2, y + h / 2, (z1 + z2) / 2, ang(dx, dz));
  const np = Math.max(1, Math.round(L / 3));
  for (let i = 0; i <= np; i++) { const t = i / np; box('steel', .08, h, .08, x1 + dx * t, y + h / 2, z1 + dz * t); }
  strut('steelL', [x1, y + h, z1], [x2, y + h, z2], .04);
}
export function arrow(x, z, dx, dz, len = 6) {   // cyan floor wayfinding arrow
  withFrame(x, 0, z, ang(dx, dz), () => {
    box('arrow', len - 1.2, .02, .35, -.6, .13, 0);
    const g = new THREE.CylinderGeometry(.9, .9, .02, 3); put('arrow', g, M4(len / 2 - .7, .13, 0, 0, Math.PI / 2, 0));
  });
}
/* people: rigged Mixamo characters loaded later; idle spots collected here, walkers defined near the loader */
export const idleSpots = [];
export function person(x, z, y = 0) { idleSpots.push({ x, y: y + .06, z }); }

/* small kit props */
export function acUnit(x, y, z, ry = 0) { withFrame(x, y, z, ry, () => { box('steelL', 1.6, 1.1, 1, 0, .55, 0); plane('grille', 1.4, .9, 0, .55, .51); cyl('pipeD', .4, .05, 0, 1.12, 0, 0, 0, 0, 16); box('steel', 1.7, .08, 1.1, 0, 0, 0); }); }
export function cabinet(x, y, z, ry = 0) { withFrame(x, y, z, ry, () => { box('wallD', 1.2, 2, .6, 0, 1, 0); box('steelL', .02, 1.8, .02, 0, 1, .31); box('glowC', .08, .04, .02, .35, 1.7, .31); box('redS', .06, .06, .02, .2, 1.7, .31); }); }
export function generator(x, z, ry = 0) { withFrame(x, 0, z, ry, () => { box('steelL', 4, 2.2, 1.8, 0, 1.25, 0); box('steel', 4.2, .15, 2, 0, .08, 0); plane('grille', 1.4, 1.4, -1.2, 1.3, .91); plane('grille', 1.4, 1.4, 1.2, 1.3, .91); cyl('pipeD', .15, 1, 1.5, 2.8, 0, 0, 0, 0, 10); box('haz', 4, .12, .02, 0, .3, .91); }); }
export function crateStack(x, z, n = 3) { for (let i = 0; i < n; i++) box(['contG', 'wall', 'contB'][i % 3], 1.4, 1.2, 1.4, x + (i % 2) * 1.5, .6 + Math.floor(i / 2) * 1.2, z); }
export function gasCylinders(x, z) { for (let i = 0; i < 5; i++) { cyl(i % 2 ? 'valve' : 'pipeG', .18, 1.4, x + i * .42, .75, z, 0, 0, 0, 10); sph('steelL', .17, x + i * .42, 1.48, z); } box('steel', 2.4, .06, .06, x + .84, 1.1, z + .25); }
export function container(k, x, y, z, ry = 0) { withFrame(x, y, z, ry, () => { box(k, 6.06, 2.59, 2.44, 0, 1.3, 0); for (const s of [-1, 1]) box('steel', .12, 2.6, 2.46, s * 3, 1.3, 0); box('steel', 6.1, .1, 2.46, 0, 2.58, 0); box('steelL', .03, 2.3, 1, 3.04, 1.3, .55); box('steelL', .03, 2.3, 1, 3.04, 1.3, -.55); }); }

/* ───────────── merge everything into meshes, one per (zone, material) ───────────── */
export const NO_COLLIDE = new Set(['beam', 'poolC', 'poolY', 'arrow']);
export const zoneMeshes = new Map();   // zone → Mesh[]
export function buildBatches(scene) {
  railJobs.forEach((j) => j()); railJobs.length = 0;
  let tris = 0; const collidables = [];
  for (const [id, list] of batches) {
    if (!list.length) continue;
    const [z, k] = id.split('|');
    // normalise: same attribute set (position/normal/uv) and all-indexed or all-non-indexed
    for (let i = 0; i < list.length; i++) {
      const g = list[i];
      if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]);
      for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(n)) g.deleteAttribute(n);
      if (!g.attributes.normal) g.computeVertexNormals();
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      g.morphAttributes = {};
    }
    const geo = mergeGeometries(list, false);
    if (!geo) { console.warn('merge failed', id); continue; }
    tris += geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3;
    geo.computeBoundingSphere();
    const m = new THREE.Mesh(geo, mats[k]); m.name = id; m.userData.zone = z;
    m.frustumCulled = !NO_COLLIDE.has(k);   // additive decals/beams stay drawn (huge flat spheres)
    scene.add(m);
    if (!NO_COLLIDE.has(k) && !mats[k].userData.noCollide) collidables.push(m);
    if (!zoneMeshes.has(z)) zoneMeshes.set(z, []); zoneMeshes.get(z).push(m);
    list.forEach((g) => g.dispose());
  }
  batches.clear();
  return { collidables, tris };
}
