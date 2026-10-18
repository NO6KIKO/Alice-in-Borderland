// Tokyo street furniture along the city grid: concrete utility poles with sagging cable bundles, transformers,
// zebra crossings + ◇ markings + stop lines at intersections, dark (unpowered) horizontal traffic signals,
// white pipe guardrails, yellow tactile paving at kerbs, manholes. Poles/wires/rails go into det_* zones
// (near-only, no collision); road paint goes into the city zone.
import * as THREE from 'three';
import * as K from '../kit.js';

const { box, cyl, plane, put, strut, M4, withFrame, setZone, canvasTex, noise, def, std } = K;
let defined = false;
function defineMats() {
  if (defined) return; defined = true;
  def('stPole', std({ map: K.texConcrete, color: 0xb8b8b2, roughness: .9 }), 3);
  def('stWire', std({ color: 0x141518, roughness: .7 }));
  def('stInsul', std({ color: 0xd8d2c6, roughness: .35 }));
  def('stTrans', std({ color: 0x9aa0a2, roughness: .5, metalness: .5 }));
  def('stTactile', std({ map: canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#d7b02a'; g.fillRect(0, 0, w, h); noise(g, w, h, 30); g.fillStyle = 'rgba(0,0,0,.25)'; for (let y = 6; y < h; y += 13) for (let x = 6; x < w; x += 13) { g.beginPath(); g.arc(x, y, 3.4, 0, 7); g.fill(); } }, { repeat: true }), roughness: .7 }), .3);
  def('stZebra', std({ map: canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#e6e4dc'; g.fillRect(0, 0, w, h); noise(g, w, h, 40); for (let i = 0; i < 18; i++) { g.fillStyle = `rgba(40,42,44,${.2 + Math.random() * .4})`; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 3 + Math.random() * 16, 2 + Math.random() * 8, Math.random() * 3, 0, 7); g.fill(); } }, { repeat: true }), roughness: .6, polygonOffset: true, polygonOffsetFactor: -1 }), 2);
  def('stGuard', std({ map: canvasTex(128, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#e8e8e2'; g.fillRect(0, 4, w, 7); g.fillRect(0, 30, w, 5); g.fillRect(0, h - 8, w, 4); for (const x of [2, w / 2, w - 9]) g.fillRect(x, 0, 7, h); for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(120,70,30,.5)'; g.fillRect(Math.random() * w, Math.random() * h, 3 + Math.random() * 8, 2); g.fillStyle = '#e8e8e2'; } }, { repeat: true }), roughness: .5, metalness: .3, alphaTest: .5, side: THREE.DoubleSide }), 2);
  def('stManhole', std({ map: canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#3b3d3f'; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill(); g.strokeStyle = '#5c5e60'; g.lineWidth = 3; for (let r = 12; r < 62; r += 10) { g.beginPath(); g.arc(64, 64, r, 0, 7); g.stroke(); } for (let a = 0; a < 6.28; a += .52) { g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + Math.cos(a) * 60, 64 + Math.sin(a) * 60); g.stroke(); } noise(g, w, h, 30); }), roughness: .45, metalness: .6, transparent: true, alphaTest: .5, polygonOffset: true, polygonOffsetFactor: -2 }), 1);
  def('stSignal', std({ color: 0x2e3236, roughness: .5, metalness: .5 }));
  def('stLamp', std({ color: 0x1a2a24, roughness: .3, emissive: 0x000000 }));
  for (const k of ['stWire', 'stGuard', 'stZebra', 'stManhole', 'stTactile']) K.mats[k].userData.noCollide = true;
}
const detZone = (x, z) => `det_${Math.floor((x + 2000) / 165)}_${Math.floor((z + 2000) / 165)}`;

/* a pole at local (x, 0, z) in a road frame whose +x runs along the street; returns attachment points (world) */
function pole(x, z, transformer) {
  const H = 11 + Math.random() * 2;
  cyl('stPole', .13, H, x, H / 2, z, 0, 0, 0, 8, .2);                          // tapered concrete shaft
  box('haz', .44, 2, .44, x, 1, z);                                              // striped guard sleeve
  for (let y = 2.6; y < H - 1; y += .45) box('steel', .03, .03, .5, x, y, z, Math.PI / 4 * (Math.round(y / .45) % 2 ? 1 : -1));   // step bolts
  for (const [y, w] of [[H - .4, 2.2], [H - 1.4, 1.6]]) {                        // crossarms + insulators
    box('steelL', .12, .12, w, x, y, z);
    for (let k = -1; k <= 1; k++) cyl('stInsul', .07, .2, x, y + .16, z + k * w * .42, 0, 0, 0, 6);
  }
  if (transformer) { cyl('stTrans', .32, 1.05, x, H - 3.2, z - .55, 0, 0, 0, 10); box('steel', .1, .5, .5, x, H - 3.2, z - .3); }
  const pts = [];
  for (const [y, dz] of [[H - .25, -.9], [H - .25, .9], [H - 1.25, -.65], [6.6, -.25], [6.1, -.25], [5.6, -.25]]) pts.push(K.fpos(x, y, z + dz));
  return pts;
}
function wire(a, b, sag, r = .025) {   // catenary-ish cable between two world points
  const N = 6; let prev = a;
  for (let i = 1; i <= N; i++) {
    const t = i / N, p = new THREE.Vector3().lerpVectors(a, b, t); p.y -= sag * 4 * t * (1 - t);
    put('stWire', new THREE.CylinderGeometry(r, r, prev.distanceTo(p), 3).applyMatrix4(new THREE.Matrix4().compose(prev.clone().add(p).multiplyScalar(.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), p.clone().sub(prev).normalize()), new THREE.Vector3(1, 1, 1))), new THREE.Matrix4().copy(K.frame).invert());
    prev = p;
  }
}

// along one road segment (centre x,z; dir 0 = along +x, π/2 = along z; length L; road width W)
export function streetSegment(cx, cz, dir, L, W) {
  defineMats();
  const zone = K.zone;
  setZone(detZone(cx, cz));
  withFrame(cx, 0, cz, dir, () => {
    const side = Math.random() < .5 ? -1 : 1, off = side * (W / 2 + 1.1);
    let prevPts = null;
    for (let s = -L / 2 + 8; s <= L / 2 - 8; s += 28 + Math.random() * 6) {
      const pts = pole(s, off, Math.random() < .4);
      if (prevPts) for (let i = 0; i < pts.length; i++) wire(prevPts[i], pts[i], .35 + Math.random() * .35, i >= 3 ? .045 : .02);
      // service drop across the street to the far facade
      if (Math.random() < .35) { const far = K.fpos(s + 3, 5.2, -off * 1.9); wire(pts[3], far, .5, .02); }
      prevPts = pts;
    }
    // white pipe guardrail along the kerb (both sides, with gaps), manholes in the lane
    for (const sd of [-1, 1]) for (let s = -L / 2 + 10; s < L / 2 - 12; s += 14) if (Math.random() < .55) {
      const len = 6 + Math.random() * 6; plane('stGuard', len, .85, s + len / 2, .55, sd * (W / 2 - .2), sd > 0 ? Math.PI : 0);
    }
    for (let s = -L / 2 + 15; s < L / 2 - 10; s += 30) if (Math.random() < .6) { const g = new THREE.CircleGeometry(.32, 12); g.rotateX(-Math.PI / 2); put('stManhole', g, M4(s, .085, (Math.random() - .5) * W * .5)); }
  });
  setZone(zone);
}

// intersection at (x, z): zebra crossings on each existing arm, ◇ marks, stop lines, tactile paving, signals
export function intersection(x, z, arms, W) {
  defineMats();
  const zone = K.zone;
  for (const [i, on] of arms.entries()) {
    if (!on) continue;
    const a = i * Math.PI / 2;   // 0:+x 1:−z 2:−x 3:+z
    withFrame(x, 0, z, a, () => {
      const d0 = W / 2 + 1.2;
      for (let k = -W / 2 + .7; k < W / 2 - .4; k += .9) box('stZebra', 4, .02, .45, d0 + 2, .075, k);   // bars parallel to traffic
      box('lineW', .4, .02, W / 2 - .5, d0 + 4.8, .075, W / 4);                                        // stop line (inbound half)
      const dm = new THREE.ShapeGeometry(diamondShape()); dm.rotateX(-Math.PI / 2);   // ◇ "crossing ahead"
      put('lineW', dm, M4(d0 + 35, .074, W / 4));
      setZone(detZone(x, z));
      for (const s of [-1, 1]) box('stTactile', 1.2, .03, .6, d0 - .9, .135, s * (W / 2 + .6));       // tactile pad at the kerb
      if (Math.random() < .7) {                                                                          // signal on the near-right corner
        const px = d0 - 1.2, pz = W / 2 + .8;
        cyl('stSignal', .11, 5.6, px, 2.8, pz, 0, 0, 0, 8);
        box('stSignal', .12, .12, 3.6, px, 5.4, pz - 1.8);
        withFrame(px, 5.2, pz - 3.4, 0, () => { box('stSignal', .35, .42, 1.3, 0, 0, 0); for (const k of [-.42, 0, .42]) { cyl('stLamp', .15, .05, .19, 0, k, 0, 0, Math.PI / 2, 10); box('stSignal', .22, .04, .32, .3, .19, k); } });
        box('stSignal', .3, .6, .3, px, 2.6, pz + .2); box('stLamp', .02, .22, .22, px - .16, 2.75, pz + .2); box('stLamp', .02, .22, .22, px - .16, 2.45, pz + .2);   // pedestrian box
      }
      setZone(zone);
    });
  }
}
function diamondShape() { return new THREE.Shape([new THREE.Vector2(0, -.75), new THREE.Vector2(2.2, 0), new THREE.Vector2(0, .75), new THREE.Vector2(-2.2, 0)]); }
