// Burning district: charred, broken mid-rise ruins (jagged bay columns, hanging slabs, exposed rebar),
// a pancaked block and a leaning tower, rubble heaps, burnt cars on ash-covered streets.
// FX (one draw call each, no collision): procedural flame billboards (additive shader), towering smoke
// columns (150–250 m, fogged soft puffs drifting with the wind), rising embers, one flickering PointLight.
import * as THREE from 'three';
import * as K from '../kit.js';
const { box, cyl, strut, put, M4, withFrame, def, std } = K;

function mats() {
  const r = K.rng(911), W = 256, H = 256, cw = 64, ch = 64, lit = [];
  const day = K.canvasTex(W, H, (g) => {
    g.fillStyle = '#3d3a37'; g.fillRect(0, 0, W, H); K.noise(g, W, H, 34);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const x = i * cw, y = j * ch, big = r() < .25, wx = x + cw * (big ? .08 : .18), wy = y + ch * (big ? .15 : .25), ww = cw * (big ? .84 : .64), wh = ch * (big ? .62 : .48);
      const gr = g.createLinearGradient(0, wy, 0, wy - ch * .8); gr.addColorStop(0, 'rgba(8,6,5,.85)'); gr.addColorStop(1, 'rgba(8,6,5,0)');
      g.fillStyle = gr; g.fillRect(wx - 6, wy - ch * .8, ww + 12, ch * .8);           // soot plume above the opening
      g.fillStyle = '#090807'; g.fillRect(wx, wy, ww, wh);
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x, y + ch - 4, cw, 4);
      if (r() < .42) lit.push([wx, wy, ww, wh]);
    }
    for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(0,0,0,${r() * .3})`; g.fillRect(r() * W, r() * H, 2 + r() * 8, 20 + r() * 80); }
  }, { repeat: true });
  const glow = K.canvasTex(W, H, (g) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    for (const [x, y, w, h] of lit) { const gr = g.createLinearGradient(0, y + h, 0, y); gr.addColorStop(0, '#ffd27a'); gr.addColorStop(.5, '#ff6a12'); gr.addColorStop(1, '#3a0800'); g.fillStyle = gr; g.fillRect(x + 2, y + 2, w - 4, h - 4); }
  }, { repeat: true });
  const ash = K.canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#2c2927'; g.fillRect(0, 0, w, h); K.noise(g, w, h, 40); for (let i = 0; i < 80; i++) { g.fillStyle = `rgba(${r() < .5 ? '0,0,0' : '120,110,100'},${r() * .25})`; g.beginPath(); g.ellipse(r() * w, r() * h, 4 + r() * 30, 3 + r() * 16, r() * 3, 0, 7); g.fill(); } }, { repeat: true });
  def('fire_char', std({ map: day, emissiveMap: glow, emissive: new THREE.Color(1, .5, .16), emissiveIntensity: 1, roughness: .95 }), 14);
  def('fire_charL', std({ map: day, color: 0x9a948c, roughness: .95 }), 14);
  def('fire_slab', std({ map: K.texConcrete, color: 0x5d5955, roughness: .95 }), 4);
  def('fire_rebar', std({ color: 0x4d2f1e, roughness: .7, metalness: .6 }));
  def('fire_rubble', std({ map: K.texConcrete, color: 0x55504b, roughness: 1, flatShading: true }), 4);
  def('fire_ash', std({ map: ash, roughness: 1 }), 8);
  def('fire_burnt', std({ color: 0x3a2a22, roughness: .85, metalness: .5 }));
  def('fire_coal', K.bas({ color: new THREE.Color(2.6, .55, .08) }));
  def('fire_pool', K.poolMat(new THREE.Color(.9, .32, .06)));
  K.mats.fire_pool.userData.noCollide = true;
}

/* ───────── shaders ───────── */
const NOISE = `
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 4; i++) { v += a * vn(p); p *= 2.03; a *= .5; } return v; }`;
const FLAME_VS = `
attribute vec2 corner; attribute vec4 prm; uniform float uT; varying vec2 vUv; varying float vSeed;
void main(){
  float s = prm.z, fl = 1. + .12 * sin(uT * 7. + s * 13.) + .08 * sin(uT * 13.1 + s * 5.);
  vec3 tc = cameraPosition - position; vec3 right = normalize(vec3(tc.z, 0., -tc.x) + 1e-4);
  vec3 p = position + right * corner.x * prm.x * (2. - fl) + vec3(0., (corner.y + .5) * prm.y * fl, 0.);
  vUv = corner + .5; vSeed = s;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.);
}`;
const FLAME_FS = `
uniform float uT, uI; varying vec2 vUv; varying float vSeed;${NOISE}
void main(){
  vec2 uv = vUv; float t = uT * 1.7 + vSeed * 10.;
  float q = fbm(vec2(uv.x * 3. + vSeed * 7., uv.y * 2.3 - t));
  float w = (1. - uv.y) * .5 + .06, dx = abs(uv.x - .5 + (q - .5) * .4 * uv.y);
  float body = smoothstep(w, w * .3, dx) * smoothstep(1., .1, uv.y + (q - .5) * .55) * smoothstep(0., .07, uv.y);
  if (body < .01) discard;
  float heat = body * (1.25 - uv.y);
  vec3 c = mix(vec3(.9, .1, .02), vec3(1., .5, .07), smoothstep(.15, .6, heat));
  c = mix(c, vec3(1., .93, .65), smoothstep(.7, 1.05, heat));
  gl_FragColor = vec4(c * uI, body);
}`;
const SMOKE_VS = `
attribute vec2 corner; attribute vec4 prm; uniform float uT; uniform vec3 uWind; varying vec2 vUv; varying float vLife, vSeed;
#include <fog_pars_vertex>
void main(){
  float life = fract(uT / (prm.z / 6.5) + prm.x), y = life * prm.z;
  vec3 p = position + vec3(uWind.x * y * .5 + sin(prm.y * 6.28 + uT * .15 + life * 4.) * life * 16., y, uWind.z * y * .5 + cos(prm.y * 4.1 + uT * .12 + life * 3.) * life * 16.);
  float s = prm.w * (.28 + .95 * sqrt(life)), a = prm.y * 6.28 + life * 1.6;
  vec4 mvPosition = viewMatrix * vec4(p, 1.);
  mvPosition.xy += mat2(cos(a), -sin(a), sin(a), cos(a)) * corner * s;
  vUv = corner + .5; vLife = life; vSeed = prm.y;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const SMOKE_FS = `
uniform float uT, uGlow; varying vec2 vUv; varying float vLife, vSeed;
#include <fog_pars_fragment>${NOISE}
void main(){
  float d = length(vUv - .5) * 2., n = fbm(vUv * 3. + vSeed * 17. + vec2(0., -uT * .04));
  float a = smoothstep(1., .2, d + (n - .5) * .7) * smoothstep(0., .07, vLife) * (1. - smoothstep(.5, 1., vLife)) * .82;
  if (a < .004) discard;
  vec3 c = mix(vec3(.035, .03, .028), vec3(.24, .23, .22), n * (.35 + .9 * vLife));
  c += vec3(1., .32, .06) * uGlow * (1. - smoothstep(0., .22, vLife)) * (.4 + .6 * n);
  gl_FragColor = vec4(c, a);
  #include <fog_fragment>
}`;
const EMBER_VS = `
attribute vec4 prm; uniform float uT; varying float vLife;
void main(){
  float life = fract(uT * (.1 + prm.y * .12) + prm.x);
  vec3 p = position + vec3(sin(prm.y * 40. + uT * 1.3) * prm.w * life + life * life * 10., life * prm.z, cos(prm.y * 23. + uT * 1.1) * prm.w * life);
  vec4 mv = viewMatrix * vec4(p, 1.);
  gl_PointSize = clamp(110. / -mv.z, 1., 7.); vLife = life;
  gl_Position = projectionMatrix * mv;
}`;
const EMBER_FS = `
uniform float uI; varying float vLife;
void main(){ float d = length(gl_PointCoord - .5); if (d > .5) discard; float a = (1. - d * 2.) * (1. - vLife); gl_FragColor = vec4(vec3(1., .42, .08) * uI * a, a); }`;

// quad batch: position = anchor (world), corner = quad corner, prm = per-sprite params
function quadGeo(items) {
  const n = items.length, P = new Float32Array(n * 12), C = new Float32Array(n * 8), Q = new Float32Array(n * 16), idx = [];
  const cs = [[-.5, -.5], [.5, -.5], [.5, .5], [-.5, .5]];
  items.forEach(([p, q], i) => { for (let k = 0; k < 4; k++) { const v = i * 4 + k; P.set(p, v * 3); C.set(cs[k], v * 2); Q.set(q, v * 4); } idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3); });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('corner', new THREE.BufferAttribute(C, 2)); g.setAttribute('prm', new THREE.BufferAttribute(Q, 4)); g.setIndex(idx);
  return g;
}

/* ───────── ruins ───────── */
const FLOOR = 3.5;
// broken mid-rise: base block + jagged bay columns, hanging slabs, rebar; registers flames when burning
function ruin(x, z, w, d, H, burning, r, F, lean = 0) {
  const k = burning ? 'fire_char' : 'fire_charL', fl = Math.max(2, Math.round(H * (.4 + r() * .25) / FLOOR)), hl = fl * FLOOR;
  box(k, w, hl, d, x, hl / 2, z);
  const nx = Math.max(2, Math.round(w / 3.5)), nz = Math.max(2, Math.round(d / 3.5)), bw = w / nx, bd = d / nz;
  const cx = (r() - .5) * 2, cz = (r() - .5) * 2;                    // collapse direction: lower toward (cx, cz)
  const tops = [];
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const u = (i + .5) / nx - .5, v = (j + .5) / nz - .5, slope = 1 - Math.max(0, (u * cx + v * cz) * 1.6);
    if (r() < .18) continue;
    const ex = Math.max(0, (H - hl) * slope * (.55 + r() * .45));
    if (ex < 1.5) continue;
    const px = x - w / 2 + bw * (i + .5), pz = z - d / 2 + bd * (j + .5);
    box(k, bw, ex, bd, px, hl + ex / 2, pz);
    if (i === 0 || j === 0 || i === nx - 1 || j === nz - 1) tops.push([px, hl + ex, pz]);
  }
  // rebar whiskers out of the broken tops, slabs hanging off the edges
  for (let i = 0; i < Math.min(10, tops.length); i++) {
    const [px, py, pz] = tops[Math.floor(r() * tops.length)];
    for (let k2 = 0; k2 < 3; k2++) { const a = [px + (r() - .5) * 2.4, py, pz + (r() - .5) * 2.4], m = [a[0] + (r() - .5) * .6, py + .8 + r(), a[2] + (r() - .5) * .6]; strut('fire_rebar', a, m, .04, 3); strut('fire_rebar', m, [m[0] + (r() - .5) * 1.6, m[1] + r() * .9, m[2] + (r() - .5) * 1.6], .035, 3); }
  }
  for (let i = 0; i < 2 + r() * 3; i++) {
    const side = Math.floor(r() * 4), along = (r() - .5) * .7, y = hl - FLOOR * Math.floor(r() * 2), t = .25 + r() * .5;
    if (side < 2) { const s = side ? 1 : -1; box('fire_slab', w * .3, .35, 4, x + along * w, y - 1.2, z + s * (d / 2 + 1.2), 0, 0, s * t); }
    else { const s = side === 3 ? 1 : -1; box('fire_slab', 4, .35, d * .3, x + s * (w / 2 + 1.2), y - 1.2, z + along * d, 0, -s * t, 0); }
  }
  // floor slab edges showing on the broken faces
  for (let f = 1; f < fl; f++) if (r() < .5) box('fire_slab', w + .4, .3, d + .4, x, f * FLOOR, z);
  if (!burning) return;
  for (let i = 0; i < 5 + r() * 5; i++) {   // window fires
    const side = Math.floor(r() * 4), f = Math.floor(r() * fl), y = f * FLOOR + .6, a = (r() - .5) * .8;
    const p = side === 0 ? [x + a * w, y, z + d / 2 + .5] : side === 1 ? [x + a * w, y, z - d / 2 - .5] : side === 2 ? [x + w / 2 + .5, y, z + a * d] : [x - w / 2 - .5, y, z + a * d];
    F.push([p, 2.6 + r() * 1.5, 3.4 + r() * 2.4]);
  }
  for (let i = 0; i < 2 + r() * 3; i++) F.push([[x + (r() - .5) * w * .7, hl, z + (r() - .5) * d * .7], 5 + r() * 4, 8 + r() * 7]);   // roof fire
  if (tops.length && r() < .7) { const t = tops[Math.floor(r() * tops.length)]; F.push([t, 4 + r() * 3, 6 + r() * 5]); }
}
function heap(x, z, R, r, F, coals = true) {
  const g = new THREE.IcosahedronGeometry(1, 1); g.scale(R, R * .38, R * (.7 + r() * .5)); put('fire_rubble', g, M4(x, 0, z, 0, r() * 3, 0));
  for (let i = 0; i < R * 2.2; i++) { const a = r() * 6.28, d = r() * R * .9; box(r() < .5 ? 'fire_slab' : 'fire_charL', 1 + r() * 3, .4 + r() * 1, 1 + r() * 2.5, x + Math.cos(a) * d, R * .3 * (1 - d / R) + .2, z + Math.sin(a) * d, r() * 3, (r() - .5) * 1.2, (r() - .5) * 1.2); }
  for (let i = 0; i < R; i++) { const a = [x + (r() - .5) * R, R * .25, z + (r() - .5) * R]; strut('fire_rebar', a, [a[0] + (r() - .5) * 3, a[1] + 1 + r() * 2, a[2] + (r() - .5) * 3], .04, 3); }
  if (coals) { for (let i = 0; i < 4; i++) box('fire_coal', .8 + r(), .15, .6 + r(), x + (r() - .5) * R * .8, R * .3, z + (r() - .5) * R * .8, r() * 3); for (let i = 0; i < 2 + R / 3; i++) F.push([[x + (r() - .5) * R, R * .22, z + (r() - .5) * R], 3 + r() * 2.5, 4 + r() * 4]); }
  pool(x, z, R * 1.6);
}
function pool(x, z, rad, y = .05) { const g = new THREE.PlaneGeometry(rad * 2, rad * 2); g.rotateX(-Math.PI / 2); put('fire_pool', g, M4(x, y + .12, z)); }
function pancake(x, z, w, d, r, F) {   // fully collapsed block: tilted slab stack on rubble
  heap(x, z, Math.max(w, d) * .6, r, F);
  for (let i = 0; i < 5; i++) box('fire_slab', w * (.9 - i * .08), .5, d * (.9 - i * .07), x + (r() - .5) * 3, 1 + i * 1.1, z + (r() - .5) * 3, (r() - .5) * .3, (r() - .5) * .25, (r() - .5) * .2);
  for (const [a, b] of [[-1, -1], [1, -1], [1, 1]]) box('fire_charL', 1, 4 + r() * 6, 1, x + a * w * .45, 3, z + b * d * .45, 0, (r() - .5) * .3);
}
function car(x, z, ry, flipped, r, F) {
  withFrame(x, 0, z, ry, () => {
    if (flipped) { box('fire_burnt', 4.2, .8, 1.7, 0, 1.15, 0); box('fire_burnt', 2.2, .5, 1.45, -.2, .3, 0); for (const sx of [-1.4, 1.4]) for (const sz of [-.8, .8]) cyl('fire_rebar', .28, .2, sx, 1.65, sz, Math.PI / 2, 0, 0, 8); }
    else {
      box('fire_burnt', 4.2, .75, 1.7, 0, .5, 0);
      for (const sx of [-.9, .7]) for (const sz of [-.7, .7]) strut('fire_burnt', [sx, .9, sz], [sx + (sx < 0 ? .25 : -.2), 1.45, sz * .9], .04, 3);
      box('fire_burnt', 1.6, .06, 1.3, -.1, 1.45, 0, 0, .06);
      for (const sx of [-1.4, 1.4]) for (const sz of [-.8, .8]) cyl('fire_rebar', .26, .18, sx, .26, sz, Math.PI / 2, 0, 0, 8);
    }
  });
  if (r() < .45) F.push([[x, .9, z], 2 + r() * 1.5, 2.5 + r() * 2.5]);
}

export function build(ctx, d) {
  mats();
  const r = K.rng(1666), F = [];   // F: flames [[x,y,z] local, width, height]
  withFrame(d.x, 0, d.z, 0, () => {
    box('fire_ash', d.w, .04, d.d, 0, .02, 0);
    // streets (cracked, ash-strewn): E–W z=10, N–S x=−30 and x=90
    box('road', d.w, .06, 16, 0, .05, 10); box('road', 16, .06, d.d, -30, .051, 0); box('road', 14, .06, d.d, 90, .052, 0);
    for (let i = 0; i < 40; i++) box('fire_ash', 2 + r() * 8, .02, 1 + r() * 5, (r() - .5) * d.w, .09, (r() - .5) * d.d, r() * 3);
    // ruins [x, z, w, d, H, burning]
    const R_ = [[-110, -95, 28, 20, 32, 1], [-70, -100, 22, 18, 24, 0], [-115, -40, 24, 26, 38, 1],
      [0, -95, 26, 22, 36, 1], [50, -100, 30, 20, 28, 1], [130, -95, 24, 22, 22, 0], [10, -35, 20, 24, 26, 1], [55, -40, 24, 18, 18, 1], [128, -40, 22, 26, 30, 1],
      [-110, 50, 26, 22, 28, 1], [-65, 55, 20, 20, 16, 0], [10, 50, 24, 22, 30, 1], [55, 55, 26, 20, 24, 1], [128, 50, 24, 24, 34, 1], [20, 105, 22, 16, 14, 0], [128, 110, 22, 18, 18, 0], [-62, 108, 20, 14, 12, 0]];
    for (const [x, z, w, dd, h, b] of R_) ruin(x, z, w, dd, h, !!b, r, F);
    // pancaked block + leaning tower propped on a neighbour
    pancake(-70, -45, 20, 22, r, F); pancake(62, 105, 22, 18, r, F);
    box('fire_char', 14, 42, 12, -114, 19.5, 104, 0, -.13); box('fire_slab', 14.6, .4, 12.6, -116.7, 40.4, 104, 0, -.13);
    heap(-104, 104, 8, r, F); F.push([[-113, 30, 104], 9, 16], [[-118, 12, 110.5], 4, 6]);
    // rubble heaps spilling into the streets
    for (const [x, z, R] of [[-45, -62, 8], [-88, -70, 7], [30, -65, 9], [75, -70, 6], [-16, 30, 6], [104, 30, 7], [-85, 25, 6], [40, 82, 8], [108, 82, 6], [-8, -12, 5]]) heap(x, z, R, r, F);
    // burnt cars + toppled poles with sagging wires
    for (const [x, z, ry, fp] of [[-60, 6, .1, 0], [-20, 14, 1.2, 0], [20, 5, -.2, 1], [55, 13, 3.0, 0], [120, 6, .3, 0], [-120, 14, 2.9, 1], [-34, -60, 1.6, 0], [-26, 70, 1.4, 0], [-33, 95, 1.75, 1], [87, -60, 1.5, 0], [93, 70, -1.4, 0], [-95, 4, .05, 0]]) car(x, z, ry, !!fp, r, F);
    for (const [x, z, ry] of [[-45, 22, .3], [70, -4, 2.6], [96, 40, 1.2]]) { cyl('concD', .2, 11, x, .3, z, 0, ry, Math.PI / 2, 6); strut('steel', [x, .5, z], [x + 8 * Math.cos(ry), 6, z - 8 * Math.sin(ry)], .02, 3); }
    // wall-sized fires on the burning core
    F.push([[-115, 14, -26], 14, 26], [[0, 13, -83], 13, 24], [[128, 12, 63], 12, 22]);
    for (const [p] of F) if (p[1] < 1.5) pool(p[0], p[2], 4.5);
  });
  const W = ([x, y, z]) => [d.x + x, y, d.z + z];

  // flames
  const fU = { uT: { value: 0 }, uI: { value: 1.7 } };
  const flames = new THREE.Mesh(quadGeo(F.map(([p, w, h], i) => [W(p), [w, h, (i * .618) % 1 * 10, 0]])),
    new THREE.ShaderMaterial({ uniforms: fU, vertexShader: FLAME_VS, fragmentShader: FLAME_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  flames.frustumCulled = false; flames.renderOrder = 3; ctx.scene.add(flames);
  // smoke columns from the biggest fires
  const big = F.slice().sort((a, b) => b[2] - a[2]).slice(0, 7), sm = [];
  big.forEach(([p, w, h], c) => { const H = 150 + (c * 37) % 100, S = 34 + h * 1.4; for (let i = 0; i < 38; i++) sm.push([W([p[0], p[1] + h * .5, p[2]]), [i / 38 + r() * .02, r(), H, S * (.8 + r() * .4)]]); });
  const sU = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uT: { value: 0 }, uGlow: { value: 0 }, uWind: { value: new THREE.Vector3(.55, 0, .25) } }]);
  const smoke = new THREE.Mesh(quadGeo(sm), new THREE.ShaderMaterial({ uniforms: sU, vertexShader: SMOKE_VS, fragmentShader: SMOKE_FS, transparent: true, depthWrite: false, fog: true }));
  smoke.frustumCulled = false; smoke.renderOrder = 4; ctx.scene.add(smoke);
  // embers
  const EP = [], EQ = [];
  for (let i = 0; i < 900; i++) { const [p, w, h] = F[Math.floor(r() * F.length)]; EP.push(...W([p[0] + (r() - .5) * w, p[1] + h * .3, p[2] + (r() - .5) * w])); EQ.push(r(), r(), 20 + r() * 50, 3 + r() * 8); }
  const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.Float32BufferAttribute(EP, 3)); eg.setAttribute('prm', new THREE.Float32BufferAttribute(EQ, 4));
  const eU = { uT: { value: 0 }, uI: { value: 1.6 } };
  const embers = new THREE.Points(eg, new THREE.ShaderMaterial({ uniforms: eU, vertexShader: EMBER_VS, fragmentShader: EMBER_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  embers.frustumCulled = false; ctx.scene.add(embers);
  // the one real light
  const light = new THREE.PointLight(0xff6a20, 1500, 240, 1.3); light.position.set(d.x + 5, 16, d.z - 40); ctx.scene.add(light);
  let night = 0;
  ctx.updates.push((dt, t) => {
    fU.uT.value = sU.uT.value = eU.uT.value = t;
    const f = .72 + .18 * Math.sin(t * 9.1) * Math.sin(t * 3.7) + .1 * Math.sin(t * 23.3);
    light.intensity = (night ? 1600 : 500) * f;
    K.mats.fire_char.emissiveIntensity = (night ? 2.2 : 1.1) * (.8 + .2 * f);
  });
  ctx.dayNight.push((day) => { night = day ? 0 : 1; fU.uI.value = day ? 1.7 : 2.6; eU.uI.value = day ? 1.6 : 3; sU.uGlow.value = day ? .25 : 1.2; });
  ctx.pois.push({ id: d.id, cam: [d.x + 170, 95, d.z + 240], tgt: [d.x, 35, d.z - 20], spawn: [d.x - 30, .08, d.z + 122], yaw: 0 });
}
