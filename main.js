import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { createPlayer } from './player.js';
import { M4, MAX_SPOTS, R, _e, _m, _q, _s, _v, acUnit, addSpot, ang, arrow, bas, beacon, beacons, box, boxGeo, cabinet, canvasTex, catwalk, chainFence, container, crateStack, cyl, def, floodlight, fpos, gasCylinders, generator, idleSpots, lamp, mats, noise, opening, openingLocal, person, pipePath, plane, pool, poolMat, put, railSeg, railings, rng, sph, spotCount, stairs, std, strut, switchback, texAsphalt, texConcrete, texPuddle, texWall, texWin, torus, truss, withFrame, spots, setZone, initKit, buildBatches, zoneMeshes } from './kit.js';
import { buildCity } from './city/index.js';
import { createDayNight } from './city/sky.js';
import { DISTRICTS } from './city/map.js';

/* 场地尺寸（来自参考图）: 120m × 85m，围墙 6m，廊道 10m / 15m，04 牌塔 38m，05 控制塔 28m */
const SX = 60, SZ = 42.5, WH = 6, L1 = 10, L2 = 15;

/* ───────────── renderer / scene ───────────── */
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x04070c);
scene.fog = new THREE.FogExp2(0x0b1424, 0.0034);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
scene.environmentIntensity = .22;   // dim env so metals read at night

const camera = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, 0.5, 9000);
camera.position.set(-95, 72, 112);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 6, -4);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.495;
controls.maxDistance = 2600;

const hemi = new THREE.HemisphereLight(0x5a78a0, 0x1a1e26, 1.1); scene.add(hemi);
const moon = new THREE.DirectionalLight(0x7f9fd0, 0.8);
moon.position.set(-80, 120, 60);
scene.add(moon);
initKit(scene);
setZone('compound');


/* ───────────── ground ───────────── */
const groundGeo = new THREE.PlaneGeometry(640, 640);   // compound apron only: the city has its own land slab
const asphalt = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ map: texAsphalt, color: 0xb0b4ba, roughnessMap: texPuddle, roughness: 1, metalness: .05, alphaMap: texPuddle, transparent: true }));
asphalt.rotation.x = -Math.PI / 2; asphalt.position.set(10, 0, 10); asphalt.receiveShadow = true; scene.add(asphalt);
const refl = new Reflector(groundGeo, { textureWidth: Math.max(512, Math.floor(innerWidth * .6)), textureHeight: Math.max(512, Math.floor(innerHeight * .6)), color: 0xa4b0c0, clipBias: .003 });
refl.rotation.x = -Math.PI / 2; refl.position.set(10, -.03, 10); scene.add(refl);

/* slab + markings */
box('concD', SX * 2, .1, SZ * 2, 0, .04, 0);
const ring = (x0, z0, x1, z1, k = 'paint', t = .25) => { box(k, x1 - x0, .02, t, (x0 + x1) / 2, .11, z0); box(k, x1 - x0, .02, t, (x0 + x1) / 2, .11, z1); box(k, t, .02, z1 - z0, x0, .11, (z0 + z1) / 2); box(k, t, .02, z1 - z0, x1, .11, (z0 + z1) / 2); };
ring(-31.5, -23, 31.5, 17.5);            // inner edge of the ring road
ring(-54, -37, 54, 37, 'paint', .2);     // service road outer edge
box('conc', 10, .12, 26, 0, .06, 30);   // main road 02
for (let i = 0; i < 6; i++) box('paint', .25, .02, 2.4, 0, .13, 20 + i * 4);
for (const s of [-1, 1]) box('paintW', .18, .02, 26, s * 4.6, .13, 30);
for (let i = 0; i < 7; i++) box('paintW', .8, .02, 3, -3.6 + i * 1.2, .13, 41);
// flow arrows (cyan): inbound along the road, clockwise service loop
arrow(0, 56, 0, -1); arrow(0, 36, 0, -1); arrow(0, 25, 0, -1);
for (const z of [24, 4, -16]) { arrow(-50, z, 0, -1); arrow(50, -z, 0, 1); }
for (const x of [-30, -10, 14, 34]) arrow(x, -36, 1, 0);
arrow(-38, 12, 0, -1); arrow(38, -8, 0, 1); arrow(-36, 31, -1, 0); arrow(36, 34, 1, 0);

/* ───────────── perimeter wall (chamfered corners) + wall-top walkway ───────────── */
const C = 5;
const perim = [[-16, SZ], [-SX + C, SZ], [-SX, SZ - C], [-SX, -SZ + C], [-SX + C, -SZ], [SX - C, -SZ], [SX, -SZ + C], [SX, SZ - C], [SX - C, SZ], [16, SZ]];
function wallRun(x1, z1, x2, z2, h = WH, walk = true) {
  const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L;
  let nx = -uz, nz = ux; const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2; if (nx * -mx + nz * -mz < 0) { nx = -nx; nz = -nz; }
  const inS = Math.sign(nx * -uz + nz * ux) || 1;     // local +z points inward when inS > 0
  withFrame(mx, 0, mz, ang(dx, dz), () => {
    box('panel', L, h, .9, 0, h / 2, 0);
    box('steelL', L + .2, .25, 1.1, 0, h + .12, 0);
    const n = Math.max(1, Math.round(L / 6));
    for (let i = 0; i <= n; i++) {
      const s = -L / 2 + i * L / n;
      box('steel', .4, h + .3, .3, s, (h + .3) / 2, -inS * .58);   // outer pilaster
      box('concD', .6, h, .5, s, h / 2, inS * .66);                 // inner buttress
      if (i % 2 === 0) beacon(s, h + 1.8, -inS * .3, 1.5);
    }
    box('haz', L, .35, .02, 0, .18, -inS * .46);
    if (walk) {
      box('grate', L, .1, 2.4, 0, h + .05, inS * 1.6);
      railings(L, h + .05, 2.4, [inS]);
      const nb = Math.round(L / 3);
      for (let i = 0; i <= nb; i++) { const s = -L / 2 + i * L / nb; strut('steel', [s, h - 1.4, inS * .5], [s, h - .05, inS * 2.7], .06); }
    }
  });
}
for (let i = 0; i < perim.length - 1; i++) wallRun(...perim[i], ...perim[i + 1]);
// gate bay (protruding, lower walls)
wallRun(-16, SZ, -16, 49, 4, false); wallRun(16, SZ, 16, 49, 4, false);
wallRun(-16, 49, -9.5, 49, 4, false); wallRun(9.5, 49, 16, 49, 4, false);
// stairs up to the wall walk
switchback(-52, 39.6, 0, -1, 0, WH, 1.4);
switchback(52, -39.6, 0, 1, 0, WH, 1.4);
// outside apron lamps
for (let i = -50; i <= 50; i += 25) { lamp(-SX - 5, i, 9, { dir: Math.PI / 2, spot: false }); lamp(SX + 5, i, 9, { dir: -Math.PI / 2, spot: false }); }

/* ───────────── 01 entrance (18 × 4m gantry, 5m clear) ───────────── */
function entrance() {
  const z = 47;
  for (const s of [-1, 1]) { truss(s * 9, z, 1.6, 4, 5.2, { n: 2, leg: .3 }); box('wallD', 1.6, .8, 4.2, s * 9, .4, z); }
  withFrame(0, 0, z, 0, () => {
    for (const zz of [-1.6, 1.6]) { box('steel', 19.6, .3, .3, 0, 5.3, zz); box('steel', 19.6, .3, .3, 0, 6.5, zz); for (let i = -9; i < 9; i += 1.5) strut('steel', [i, 5.3, zz], [i + .75, 6.5, zz], .06); }
    for (let i = -9; i <= 9; i += 3) { box('steel', .2, .2, 3.4, i, 5.3, 0); box('steel', .2, .2, 3.4, i, 6.5, 0); }
    box('haz', 19.6, .45, .1, 0, 5.9, 1.8); box('haz', 19.6, .45, .1, 0, 5.9, -1.8);
    for (let i = -7.5; i <= 7.5; i += 3) box('glowC', 1.6, .08, .3, i, 5.12, 0);
    box('steelL', 5, 1.4, .3, 0, 7.6, 1.6); box('win', 4.4, .9, .1, 0, 7.6, 1.78);
  });
  for (const s of [-1, 1]) {
    floodlight(s * 7, 6.4, z + 2, s * 4, 0, z + 12, 0xdaf0ff, 1800, .6);
    beacon(s * 9.6, 7.2, z - 1.6, .8); beacon(s * 9.6, 7.2, z + 1.6, .8);
    withFrame(s * 12.3, 0, 45.5, 0, () => {   // guard booth
      box('concD', 4, .3, 4, 0, .15, 0); box('wallD', 3.2, 3, 3.2, 0, 1.8, 0); box('steel', 4, .25, 4, 0, 3.4, 0);
      plane('win', 2.8, 1.2, 0, 2.1, 1.62); plane('win', 2.8, 1.2, -s * 1.62, 2.1, 0, -s * Math.PI / 2);
      box('glowC', 2.8, .08, .3, 0, 3.2, 1.8); acUnit(0, 3.5, -.6); beacon(1.4 * s, 4.2, 1.4);
    });
    box('haz', 1.2, .25, 4, s * 7.6, .13, z); box('steel', .5, 1.1, .5, s * 7.6, .6, z + 1.4); box('paintW', .5, .5, .5, s * 7.6, 1.4, z + 1.4); beacon(s * 7.6, 2, z + 1.4);
    for (let i = 0; i < 7; i++) box(i % 2 ? 'paintW' : 'valve', .9, .14, .14, s * (6.9 - i * .9), 1.25, z + 1.4);
    for (let i = 0; i < 5; i++) withFrame(s * (10.5 + i * 1.7), 0, 51 + i * .6, s * .35, () => { box('haz', 1.6, .45, .7, 0, .22, 0); box('haz', 1.6, .5, .42, 0, .7, 0); });
    chainFence(s * 9.5, 49, s * 9.5, 52, 0, 3);
    for (let i = 0; i < 3; i++) cyl('cone', .02, .7, s * (3 + i * 1.6), .38, 52, 0, 0, 0, 10, .22);
  }
  box('conc', 18, .1, 40, 0, .05, 70); for (let i = 0; i < 6; i++) box('paint', .25, .02, 3, 0, .12, 54 + i * 6);
  for (const s of [-1, 1]) box('paintW', .18, .02, 40, s * 8.6, .12, 70);
  lamp(-12, 40, 9, { dir: Math.PI / 2, warm: true }); lamp(12, 40, 9, { dir: -Math.PI / 2 });
  person(-12.5, 48.4); person(11, 43.2);
}
entrance();

/* ───────────── 03 maze (4m cells, 6m walls) — DFS-carved ───────────── */
function maze() {
  const cs = 4, nx = 10, nz = 8, x0 = -20, z0 = -18, H = 6;
  box('conc', nx * cs + 1, .08, nz * cs + 1, 0, .1, z0 + nz * cs / 2);
  const hW = Array.from({ length: nz + 1 }, () => Array(nx).fill(true));   // walls along x on z-lines
  const vW = Array.from({ length: nx + 1 }, () => Array(nz).fill(true));   // walls along z on x-lines
  const seen = Array.from({ length: nx }, () => Array(nz).fill(false));
  const stack = [[4, nz - 1]]; seen[4][nz - 1] = true;
  while (stack.length) {
    const [i, j] = stack[stack.length - 1];
    const nb = [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]].filter(([a, b]) => a >= 0 && b >= 0 && a < nx && b < nz && !seen[a][b]);
    if (!nb.length) { stack.pop(); continue; }
    const [a, b] = nb[Math.floor(R() * nb.length)];
    if (a !== i) vW[Math.max(a, i)][j] = false; else hW[Math.max(b, j)][i] = false;
    seen[a][b] = true; stack.push([a, b]);
  }
  for (let j = 1; j < nz; j++) for (let i = 0; i < nx; i++) if (R() < .1) hW[j][i] = false;
  for (let i = 1; i < nx; i++) for (let j = 0; j < nz; j++) if (R() < .1) vW[i][j] = false;
  hW[nz][4] = hW[nz][5] = false; hW[0][2] = hW[0][7] = false; vW[0][3] = vW[nx][4] = false;
  const seg = (cx, cz, vert, dark) => withFrame(cx, 0, cz, vert ? Math.PI / 2 : 0, () => {
    box(dark ? 'wallD' : 'wall', cs, H, .2, 0, H / 2, 0);
    box('steel', cs, .14, .14, 0, H * .33, .12); box('steel', cs, .14, .14, 0, H * .66, -.12); box('steel', cs + .1, .12, .36, 0, H + .06, 0);
    if (R() < .22) { box('glowC', 1.4, .06, .12, 0, H + .16, 0); pool(0, 1.6, 3.2); pool(0, -1.6, 3.2); }
    if (R() < .06) box('haz', cs, .5, .02, 0, .25, .11);
  });
  for (let j = 0; j <= nz; j++) for (let i = 0; i < nx; i++) if (hW[j][i]) seg(x0 + i * cs + cs / 2, z0 + j * cs, false, R() < .35);
  for (let i = 0; i <= nx; i++) for (let j = 0; j < nz; j++) if (vW[i][j]) seg(x0 + i * cs, z0 + j * cs + cs / 2, true, R() < .35);
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) box('steel', .3, H + .2, .3, x0 + i * cs, (H + .2) / 2, z0 + j * cs);
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const cx = x0 + i * cs + cs / 2, cz = z0 + j * cs + cs / 2;
    const walls = hW[j][i] + hW[j + 1][i] + vW[i][j] + vW[i + 1][j];
    if (walls >= 3 && R() < .45) {   // roofed room with roof kit
      box('wallD', cs - .1, .2, cs - .1, cx, H + .1, cz);
      if (R() < .6) acUnit(cx - .4, H + .2, cz, R() * 3); else { box('steelL', 1, .6, 1, cx, H + .5, cz); cyl('pipeD', .15, 1.6, cx + .9, H + .9, cz, 0, 0, 0, 8); }
    } else if (R() < .12) lamp(cx + 1.4, cz + 1.4, 3.6, { spot: false, arm: .5 });
    if (R() < .05) crateStack(cx - .7, cz - .7, 2);
  }
  // overlook platform in the middle
  box('grate', 6, .12, 4, -2, 6.2, -6); for (const [a, b] of [[-4.8, -7.8], [.8, -7.8], [-4.8, -4.2], [.8, -4.2]]) box('steel', .2, 6.2, .2, a, 3.1, b);
  withFrame(-2, 0, -6, 0, () => railings(6, 6.2, 4));
  lamp(-2, -2, 9, { intensity: 700 }); lamp(10, -12, 9, { intensity: 700, dir: Math.PI }); lamp(-14, 6, 9, { intensity: 650 }); lamp(14, 6, 9, { intensity: 650, dir: Math.PI });
  person(2, 6); person(-7, -11); person(-2, -6, 6.2);
}
maze();

/* ───────────── catwalks: 02 ramps, 10m loop, 15m deck, 07 gantry ───────────── */
function catwalks() {
  // 10m loop around maze on lattice pylons
  catwalk(-28, 14.5, 28, 14.5, L1, 3, { legs: 'truss', every: 14 });
  catwalk(-28, -20, 28, -20, L1, 3, { legs: 'truss', every: 14 });
  catwalk(-28, -20, -28, 14.5, L1, 3, { legs: 'truss', every: 12 });
  catwalk(28, -20, 28, 14.5, L1, 3, { legs: 'truss', every: 12 });
  for (const [x, z] of [[-28, 14.5], [28, 14.5], [-28, -20], [28, -20]]) {   // outer corner railings
    const sx = Math.sign(x) * 1.5, sz = z > 0 ? 1.5 : -1.5;
    railSeg(x, z + sz, x + sx, z + sz, L1); railSeg(x + sx, z, x + sx, z + sz, L1);
  }
  for (const [x, z] of [[-28, 14.5], [28, 14.5], [-28, -20], [28, -20]]) { box('grate', 3.4, .12, 3.4, x, L1, z); beacon(x, L1 + 1.8, z, 1.6); lamp(x + .9, z + .9, 3, { y0: L1, spot: false, arm: .6 }); }
  // 02 — 4m-wide, ~18m ramps (ground → 6m) flanking the road, then stairs to the 10m loop
  for (const s of [-1, 1]) {
    stairs(s * 8, 38, 0, -1, .1, 6, 4, .6);
    box('grate', 4, .12, 4, s * 8, 6, 18);
    withFrame(s * 8, 0, 18, 0, () => railings(4, 6, 4, [-1]));   // open on the ramp side
    withFrame(s * 6, 0, 18, Math.PI / 2, () => railings(4, 6, .01, [1]));            // inner edge
    withFrame(s * 10, 0, 19.15, Math.PI / 2, () => railings(1.7, 6, .01, [1]));      // outer edge beside the stair
    for (const a of [-1.8, 1.8]) for (const b of [16.2, 19.8]) box('steel', .25, 6, .25, s * 8 + a, 3, b);
    stairs(s * 10, 17.2, s, 0, 6, L1, 2.2, .3);
    box('grate', 2.7, .12, 3, s * 17.25, L1, 16.9);
    opening(Math.min(s * 15.9, s * 18.6), Math.max(s * 15.9, s * 18.6), 15.4, 18.4, L1);
    railSeg(s * 18.6, 15.4, s * 18.6, 18.4, L1); railSeg(s * 15.9, 18.4, s * 18.6, 18.4, L1);
  }
  // 15m upper deck
  catwalk(-45, 16, -45, -28, L2, 2.6, { legs: 'frame', every: 11 });
  catwalk(-45, -28, -6.5, -28, L2, 2.6, { legs: 'none' });
  catwalk(6.5, -28, 38.5, -28, L2, 2.6, { legs: 'none' });
  catwalk(43, -22.5, 43, 2, L2, 2.4, { legs: 'frame', every: 12 });
  for (const x of [-20, 20]) truss(x, -28, 2, 2.6, L2 - .3, { n: 4, leg: .3 });
  for (const x of [-12, 30]) truss(x, -28, 1.6, 2.6, L2 - .3, { n: 4, leg: .26 });
  // links between levels
  stairs(-24, -21.6, 0, -1, L1, L2, 1.6, .2); stairs(24, -21.6, 0, -1, L1, L2, 1.6, .2);
  catwalk(-45, 0, -29.6, 0, L1, 2, { legs: 'frame', every: 8 });
  switchback(-43.2, 17.6, 0, 1, 0, L2, 1.6);   // ground → 15m (west), tops out on the deck end
  switchback(41.7, -4, -1, 0, 0, L2, 1.6);     // ground → 15m east spur
  box('grate', 3, .12, 3, -45, L2, 16); beacon(-45, L2 + 2, 16, 1.6);
  // 07 — 15m lattice gantry, towers 16m apart, 8m deep
  for (const x of [-46, -30]) {
    truss(x, -28, 3, 8, L2, { n: 5, leg: .38, rb: .09 }); box('steel', 3.6, .4, 8.6, x, L2 + .2, -28);
    beacon(x - 1.5, L2 + 2, -31.8, 1.6); beacon(x + 1.5, L2 + 2, -24.2, 1.6);
    floodlight(x, L2 + 1.2, -24, x * .7, 0, -10, 0xe0efff, 2200, .55);
  }
  for (const y of [5, L1]) box('grate', 16, .1, 2.2, -38, y, -28);
  floodlight(28, L1 + 1.2, 15.8, 18, 0, 28, 0xe0efff, 1800, .6); floodlight(-28, L1 + 1.2, 15.8, -40, 0, 28, 0xe0efff, 1800, .6);
  person(-38, -28, L2); person(10, 14.5, L1); person(-28, 2, L1);
}
catwalks();

/* ───────────── 04 card tower (12 × 12m, 38m) ───────────── */
const cardTex = canvasTex(64, 96, (g, w, h) => { g.fillStyle = '#efe7d8'; g.fillRect(0, 0, w, h); g.fillStyle = '#b3202f'; g.font = 'bold 30px serif'; g.fillText('Q', 6, 30); });
function cardTower() {
  const cx = 0, cz = -33, S = 12, H = 38;
  truss(cx, cz, S, S, H, { n: 10, leg: .6, rb: .12 });
  truss(cx, cz, S - 5, S - 5, H - 4, { n: 6, leg: .35, rb: .08 });
  for (const y of [L1, L2, 28]) { box('grate', S + 1.4, .14, S + 1.4, cx, y, cz); withFrame(cx, 0, cz, 0, () => { for (let r = 0; r < 4; r++) withFrame(0, 0, 0, r * Math.PI / 2, () => railings(S + 1.4, y, S + 1.4, [1])); }); }
  box('steel', S + 1, .6, S + 1, cx, H + .3, cz);
  for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { box('steel', .2, 2.6, .2, cx + a * S / 2, H + 1.6, cz + b * S / 2); beacon(cx + a * S / 2, H + 3.1, cz + b * S / 2, .2); }
  beacon(cx, H + 4, cz, 3);
  // base room with lit portal
  box('wallD', 8, 5, 6, cx, 2.5, cz - .5); box('steel', 8.6, .4, 6.6, cx, 5.2, cz - .5);
  box('glowC', 3.4, 3.4, .1, cx, 1.8, cz + 2.52); box('steelL', 4, 4, .15, cx, 2, cz + 2.45); box('haz', 4, .3, .2, cx, .15, cz + 3);
  // card on the front face (≈11 × 16.5m)
  const cw = 11, ch = cw * 1.5, cy = 23, fz = cz + S / 2 + .9;
  const card = new THREE.Mesh(new THREE.PlaneGeometry(cw, ch), new THREE.MeshStandardMaterial({ map: cardTex, emissiveMap: cardTex, emissive: 0xffffff, emissiveIntensity: .22, roughness: .6, transparent: true, alphaTest: .5 }));
  new THREE.TextureLoader().load('./cards/QH.webp', (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; card.material.map = t; card.material.emissiveMap = t; card.material.needsUpdate = true; });
  card.position.set(cx, cy, fz); scene.add(card);
  box('steel', cw + 1, ch + 1, .3, cx, cy, fz - .3);
  for (const s of [-1, 1]) box('steel', .3, ch + 1.4, .5, cx + s * (cw / 2 + .5), cy, fz - .1);
  box('steel', cw + 1.4, .35, .5, cx, cy + ch / 2 + .5, fz - .1); box('steel', cw + 1.4, .35, .5, cx, cy - ch / 2 - .5, fz - .1);
  for (const s of [-1, 1]) for (const y of [cy - 6, cy, cy + 6]) strut('steel', [cx + s * (cw / 2 + .5), y, fz - .3], [cx + s * S / 2, y, cz + S / 2], .1);
  // light bar above the card
  box('steel', cw + 2, .3, 2.6, cx, cy + ch / 2 + 1.6, fz + 1);
  for (const x of [-4.5, -1.5, 1.5, 4.5]) floodlight(cx + x, cy + ch / 2 + 1.3, fz + 2.1, cx + x * .4, cy, fz, 0xffffff, 1100, .45, Math.abs(x) > 2);
  for (const x of [-6, 6]) { box('steel', .6, .8, .6, x, .4, cz + 14); floodlight(x, 1, cz + 14, x * .4, cy, fz, 0xfff3e0, 700, .35); }
}
cardTower();

/* ───────────── 05 control tower (8 × 8m, 28m) ───────────── */
function controlTower() {
  withFrame(43, 0, -27, 0, () => {
    truss(0, 0, 8, 8, 22, { n: 6, leg: .5, rb: .1 });
    box('wallD', 5, 22, 5, 0, 11, 0);
    for (const y of [6, 12, 18]) for (let r = 0; r < 4; r++) withFrame(0, 0, 0, r * Math.PI / 2, () => { plane('win', 4.2, 1.2, 0, y, 2.52); box('steel', 4.6, .15, .3, 0, y + .7, 2.6); });
    for (const y of [L1, L2]) { box('grate', 9.4, .12, 9.4, 0, y, 0); for (let r = 0; r < 4; r++) withFrame(0, 0, 0, r * Math.PI / 2, () => railings(9.4, y, 9.4, [1])); }
    box('steel', 9.6, .5, 9.6, 0, 22.2, 0);
    for (let r = 0; r < 4; r++) withFrame(0, 0, 0, r * Math.PI / 2, () => { plane('win', 8, 2.6, 0, 24, 4.02); box('steel', 8.4, .2, .2, 0, 25.4, 4.05); box('steel', 8.4, .2, .2, 0, 22.6, 4.05); });
    for (const [a, b] of [[-4, -4], [4, -4], [4, 4], [-4, 4]]) box('steel', .35, 3.4, .35, a, 24, b);
    box('steel', 10, .45, 10, 0, 25.9, 0); box('yel', 9.8, .15, 9.8, 0, 26.2, 0);
    box('wallD', 3.6, 1.4, 3.6, 0, 26.8, 0); acUnit(-3, 26.1, 2.5); acUnit(2.6, 26.1, -2.8, Math.PI / 2);
    box('steel', .22, 6, .22, 0, 30.5, 0); beacon(0, 33.6, 0, .2); box('steel', 3, .1, .1, 0, 32, 0); box('steel', .1, .1, 3, 0, 31, 0);
    box('steel', .15, 3.5, .15, 3.8, 27.8, 3.8); beacon(3.8, 29.7, 3.8, .2); box('steel', .15, 3.5, .15, -3.8, 27.8, -3.8); beacon(-3.8, 29.7, -3.8, .2);
    for (const [a, b] of [[-4.8, -4.8], [4.8, -4.8], [4.8, 4.8], [-4.8, 4.8]]) beacon(a, 26.9, b, .7);
    box('glowY', 1.2, 2.4, .1, 0, 1.2, 4.05);
  });
  floodlight(40, 26.6, -22.5, 25, 0, -3, 0xe8f4ff, 3600, .5);
  box('concD', 11, .2, 11, 43, .1, -27);
  cabinet(37.5, 0, -21); cabinet(38.8, 0, -21); generator(52, -19, Math.PI / 2);
}
controlTower();

/* ───────────── 06 pipe / boiler plant (x 14…40, z 17…31) ───────────── */
function pipeZone() {
  box('conc', 28, .15, 16, 27, .08, 24);
  ring(13, 16, 41, 32, 'haz', .4);
  withFrame(36.5, 0, 28, 0, () => {   // pump house
    box('wallD', 7, 6, 6, 0, 3, 0); box('steel', 7.5, .4, 6.5, 0, 6.2, 0);
    plane('win', 3, 1, -1.5, 4, 3.02); box('glowY', 1.4, 2.6, .1, 2, 1.4, 3.03); box('steelL', 1.7, 2.9, .12, 2, 1.5, 3.0);
    acUnit(-2, 6.4, -1); acUnit(1, 6.4, -1); cyl('pipeG', .4, 1.5, 2.5, 7.2, 1.5, 0, 0, 0, 14);
  });
  for (const [z, r, l] of [[20.5, 1.8, 13], [25, 1.5, 11]]) {   // horizontal boilers on saddles
    const cx = 22;
    cyl('pipeG', r, l, cx, r + .9, z, 0, 0, Math.PI / 2, 28);
    sph('pipeG', r, cx - l / 2, r + .9, z, .5, 1, 1); sph('pipeG', r, cx + l / 2, r + .9, z, .5, 1, 1);
    for (let i = -2; i <= 2; i++) cyl('pipeD', r + .06, .35, cx + i * l / 5, r + .9, z, 0, 0, Math.PI / 2, 28);
    for (const s of [-.3, .3]) box('steel', .6, 1.1, r * 2.1, cx + s * l, .55, z);
    cyl('pipeD', .35, 1, cx + l / 4, r * 2 + 1.3, z); cyl('valve', .45, .08, cx + l / 4, r * 2 + 1.9, z, 0, 0, 0, 14);
    for (let i = 0; i < 3; i++) cyl('pipeG', .12, .8, cx - l / 3 + i * .5, r * 2 + 1.2, z, 0, 0, 0, 8);
  }
  // serpentine headers
  pipePath('pipeG', .65, [[14, 2.2, 29.5], [20, 2.2, 29.5], [20, 4.5, 29.5], [27, 4.5, 29.5], [27, 4.5, 23], [31, 4.5, 23], [31, 2.2, 23], [31, 2.2, 18], [27, 2.2, 18]]);
  pipePath('pipeG', .55, [[14, 1.2, 31], [29, 1.2, 31], [29, 3.6, 31], [33.5, 3.6, 31], [33.5, 3.6, 24.5]]);
  pipePath('pipeR', .35, [[15, .8, 17], [15, 4, 17], [33, 4, 17], [33, 1.2, 17]], false);
  pipePath('pipeD', .3, [[16, .7, 18.2], [16, 5.6, 18.2], [16, 5.6, 31.5], [40, 5.6, 31.5]], false);
  for (let i = 0; i < 7; i++) { const x = 14.5 + i * 4.2; for (const s of [-1, 1]) box('steel', .3, 6, .3, x, 3, 16.6 + s * 1.3); box('steel', .3, .3, 2.9, x, 6, 16.6); box('steel', .25, .25, 2.9, x, 4.4, 16.6); }
  ['pipeG', 'pipeR', 'pipeD', 'pipeG'].forEach((k, i) => cyl(k, .22 + (i % 2) * .1, 26, 27, 6.4 + (i % 2) * .1, 15.7 + i * .6, 0, 0, Math.PI / 2, 14));
  for (const [tx, tz, tr, th] of [[38, 19.5, 2, 8], [16, 24.5, 1.4, 6]]) {   // vertical tanks + ladders
    cyl('pipeR', tr, th, tx, th / 2, tz, 0, 0, 0, 28); sph('pipeR', tr, tx, th, tz, 1, .3, 1);
    for (let i = 0; i < 4; i++) cyl('pipeD', tr + .06, .15, tx, 1 + i * th / 4, tz, 0, 0, 0, 28);
    for (let i = 0; i < th * 2; i++) box('steelL', .7, .05, .05, tx, .5 + i * .5, tz + tr + .25);
    box('steelL', .05, th, .05, tx - .35, th / 2, tz + tr + .25); box('steelL', .05, th, .05, tx + .35, th / 2, tz + tr + .25);
  }
  for (const [x, z] of [[20, 29.5], [27, 23], [31, 20.5], [33.5, 27]]) { torus('valve', .5, .06, 6.28, x, 5.7, z + .8, 0, 0, 0, 16); cyl('valve', .06, 1.2, x, 5.1, z + .8, 0, 0, 0, 6); }
  for (let i = 0; i < 3; i++) withFrame(18 + i * 3, 0, 27, 0, () => { box('steel', 2, .3, 1, 0, .15, 0); cyl('pipeG', .4, 1.2, -.2, .7, 0, 0, 0, Math.PI / 2, 14); box('truckB', .6, .7, .7, .7, .65, 0); });
  box('grate', 14, .1, 1.4, 22, 5.2, 22.8); withFrame(22, 0, 22.8, 0, () => railings(14, 5.2, 1.4)); for (const x of [15.5, 28.5]) box('steel', .15, 5.2, .15, x, 2.6, 22.8);
  stairs(29.2, 22.8, 1, 0, .1, 5.2, 1.2, .3);
  gasCylinders(36, 18.5); for (let i = 0; i < 4; i++) cyl('barrel', .45, 1.1, 14.5 + i * 1.05, .6, 32.6, 0, 0, 0, 12);
  lamp(13.5, 24, 8, { dir: Math.PI / 2, warm: true }); lamp(41.5, 21, 8, { dir: -Math.PI / 2, warm: true, intensity: 380 });
  for (const [x, z] of [[19, 20.5], [27, 27], [34, 22]]) box('glowY', .5, .15, .5, x, 5.1, z);
  person(25, 26.8); person(30, 22.8, 5.2);
}
pipeZone();

/* ───────────── 08 truck yard (east strip) ───────────── */
const truckSpots = [];
function truckYard() {
  box('conc', 13, .12, 44, 51.5, .07, 9);
  chainFence(45, -12, 45, 6, 0, 3.4); chainFence(45, 14, 45, 31, 0, 3.4); chainFence(45, -12, 57, -12, 0, 3.4);
  box('haz', .5, 3.4, .5, 45, 1.7, 6); box('haz', .5, 3.4, .5, 45, 1.7, 14); box('steelL', .15, .15, 8, 45, 3.5, 10);
  for (let i = 0; i < 6; i++) box('paintW', 4.8, .02, .2, 52, .14, -8 + i * 6.5);
  // detailed Blender-built trucks (models/truck_*.glb), origin at front axle, facing local +X
  truckSpots.push({ file: 'truck_semi', x: 54, z: 8, ry: -Math.PI / 2 });
  truckSpots.push({ file: 'truck_box', x: 54.4, z: 23.5, ry: -Math.PI / 2 });
  truckSpots.push({ file: 'truck_box', x: 49.2, z: 11, ry: -Math.PI / 2 + .18 });
  container('contB', 49, 0, -9.2); container('contR', 49, 2.6, -9.2); container('contG', 55.5, 0, 29, Math.PI / 2);
  for (let i = 0; i < 6; i++) box('wall', 1.1, .15, 1.1, 47 + (i % 3) * 1.4, .1, 28 + Math.floor(i / 3) * 1.4);
  crateStack(47, 28.2, 3);
  lamp(46, -4, 9, { dir: -Math.PI / 2 }); lamp(46, 22, 9, { dir: -Math.PI / 2, warm: true });
  for (const z of [-12, 6, 14, 31]) beacon(45, 4.4, z, 1);
  person(51, 4); person(47.5, 18);
}
truckYard();

/* ───────────── west yard: containers / gensets / cabinets ───────────── */
(function westYard() {
  container('contG', -53, 0, -18, Math.PI / 2); container('contB', -53, 2.6, -18, Math.PI / 2); container('contR', -53, 0, -10, Math.PI / 2);
  container('contB', -53, 0, 6, Math.PI / 2); container('contG', -53, 0, 26, Math.PI / 2); container('contR', -53, 2.6, 26, Math.PI / 2);
  generator(-38, 24); generator(-38, 28.5);
  for (let i = 0; i < 4; i++) cabinet(-36 + i * 1.3, 0, -33);
  for (let i = 0; i < 3; i++) acUnit(-22 + i * 2, 0, 24);
  gasCylinders(-8, -24.5); crateStack(-40, -14, 4); crateStack(-36, 6, 3);
  for (let i = 0; i < 6; i++) box('conc', 1.8, 1, .6, -26 + i * 2.2, .5, 21);
  for (let i = 0; i < 8; i++) cyl('cone', .02, .7, -16 + R() * 10, .38, 22 + R() * 6, 0, 0, 0, 10, .22);
  for (const [x, z, d] of [[-34, -34, 0], [34, 34, Math.PI], [-34, 34, Math.PI], [12, -36, 0]]) lamp(x, z, 9, { dir: d, spot: x !== 12 });
  for (const [x, z] of [[-14, 30], [14, 34]]) lamp(x, z, 8, { spot: false });
  person(-50, 0); person(-24, 30); person(16, -34);
})();

/* ───────────── highway ───────────── */
const hw = [];
function highway(x1, z1, x2, z2, y = 27, w = 30) {
  const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz);
  withFrame((x1 + x2) / 2, 0, (z1 + z2) / 2, ang(dx, dz), () => {
    box('hwy', L, 2.6, w, 0, y, 0); box('steel', L, .4, w + .6, 0, y - 1.5, 0);
    box('conc', L, 1.1, .5, 0, y + 1.8, w / 2 - .25); box('conc', L, 1.1, .5, 0, y + 1.8, -w / 2 + .25); box('conc', L, .8, .4, 0, y + 1.7, 0);
    for (const s of [-1, 1]) box('glowY', L, .06, .1, 0, y + 1.2, s * (w / 2 - .6));
    const n = Math.floor(L / 26);
    for (let i = 0; i <= n; i++) { const s = -L / 2 + i * L / n; box('hwy', 4.2, y - 1.4, 4.4, s, (y - 1.4) / 2, 0); box('hwy', 6, 1.4, w - 6, s, y - 2, 0); }
    for (let i = 0; i < L / 30; i++) { const s = -L / 2 + 15 + i * 30; for (const t of [-1, 1]) { box('steel', .2, 6, .2, s, y + 4.5, t * (w / 2 - .5)); box('glow', .8, .1, 1.6, s, y + 7.6, t * (w / 2 - 1.3)); } }
  });
  hw.push({ x1, z1, y, L, ux: dx / L, uz: dz / L });
}
highway(-320, -88, 320, -88);
highway(-100, -88, -100, 260);
box('hwy', 30, 2.6, 30, -100, 27, -88);

/* ───────────── backdrop city ───────────── */
const cityTex = canvasTex(2048, 256, (g, w, h) => {
  g.fillStyle = '#06090e'; g.fillRect(0, 0, w, h);
  for (let x = 0; x < w;) { const bw = 20 + Math.random() * 60, bh = 30 + Math.random() * 190; g.fillStyle = `rgb(${10 + Math.random() * 14},${14 + Math.random() * 14},${22 + Math.random() * 18})`; g.fillRect(x, h - bh, bw, bh);
    for (let y = h - bh + 6; y < h - 4; y += 7) for (let xx = x + 3; xx < x + bw - 4; xx += 6) if (Math.random() < .22) { g.fillStyle = Math.random() < .5 ? 'rgba(255,214,140,.8)' : 'rgba(170,220,255,.8)'; g.fillRect(xx, y, 3, 3); }
    x += bw + Math.random() * 6; }
  const gr = g.createLinearGradient(0, h - 60, 0, h); gr.addColorStop(0, 'rgba(70,90,130,0)'); gr.addColorStop(1, 'rgba(70,90,130,.35)'); g.fillStyle = gr; g.fillRect(0, h - 60, w, 60);
});
cityTex.wrapS = THREE.RepeatWrapping; cityTex.repeat.set(2, 1);
const city = new THREE.Mesh(new THREE.CylinderGeometry(3600, 3600, 900, 64, 1, true), new THREE.MeshBasicMaterial({ map: cityTex, side: THREE.BackSide, fog: false, transparent: true, color: new THREE.Color(.8, .85, 1) }));
city.position.set(-650, 380, -350); scene.add(city);

/* ───────────── the rest of the city (districts in city/*.js) ───────────── */
const cityInfo = buildCity({ scene, camera });

/* ───────────── build merged meshes ───────────── */
const built = buildBatches(scene);
const collidables = [asphalt, ...built.collidables, ...cityInfo.collidables];
for (const ms of zoneMeshes.values()) for (const m of ms) { m.castShadow = !m.material.transparent && !m.material.isMeshBasicMaterial && !m.name.startsWith('det_'); m.receiveShadow = true; }
console.log('triangles', built.tris, 'spots', spotCount, 'beacons', beacons.length);

/* beacons: instanced, two blink phases, with additive halos */
const bGeo = new THREE.SphereGeometry(.24, 12, 8);
const bMatA = new THREE.MeshBasicMaterial({ color: new THREE.Color(4, .15, .1) }), bMatB = bMatA.clone();
{ const keep = beacons.filter((p, i) => p[1] > 12 || i % 3 === 0); beacons.length = 0; beacons.push(...keep); }   // fewer low beacons: calmer night
const bA = new THREE.InstancedMesh(bGeo, bMatA, beacons.length), bB = new THREE.InstancedMesh(bGeo, bMatB, beacons.length);
let ia = 0, ib = 0;
beacons.forEach((p, i) => { _m.makeTranslation(...p); if (i % 2) bA.setMatrixAt(ia++, _m); else bB.setMatrixAt(ib++, _m); });
bA.count = ia; bB.count = ib; scene.add(bA, bB);
const haloTex = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,60,40,.9)'); gr.addColorStop(.25, 'rgba(255,40,30,.35)'); gr.addColorStop(1, 'rgba(255,20,10,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
const halos = [];
for (const arr of [beacons.filter((_, i) => i % 2), beacons.filter((_, i) => !(i % 2))]) {
  const pos = new Float32Array(arr.length * 3); arr.forEach((p, i) => pos.set(p, i * 3));
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pm = new THREE.PointsMaterial({ map: haloTex, size: 2.2, sizeAttenuation: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const pts = new THREE.Points(geo, pm); pts.frustumCulled = false; scene.add(pts); halos.push(pm);
}

/* vehicles on the highway — Tripo-generated cars in models/cars/*.glb, one InstancedMesh per type
   (forward = +X, as Tripo exports). Until a file exists those cars render as plain boxes. */
const NC = 72;
const CAR_TYPES = [
  { file: 'tesla_sedan', len: 4.72 }, { file: 'tesla_suv', len: 4.75 }, { file: 'cyber_pickup', len: 5.68 },
  { file: 'hatchback', len: 4.1 }, { file: 'taxi', len: 4.6 }, { file: 'van', len: 5.3 },
];
const carData = [];
for (let i = 0; i < NC; i++) {
  const h = hw[i % 2], dir = R() < .5 ? 1 : -1, lane = dir * (3 + Math.floor(R() * 3) * 3.6);
  carData.push({ h, dir, lane, s: R(), v: (10 + R() * 10) / h.L * dir, type: i % CAR_TYPES.length });
}
CAR_TYPES.forEach((t, k) => { t.cars = carData.filter((c) => c.type === k); t.mesh = null; });
const carBox = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1.4, 1.8).translate(0, .7, 0), new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: .4, metalness: .6 }), NC);
const headL = new THREE.InstancedMesh(new THREE.BoxGeometry(.08, .12, .38), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3.7, 3.2) }), NC * 2);
const tailL = new THREE.InstancedMesh(new THREE.BoxGeometry(.08, .12, .42), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, .2, .12) }), NC * 2);
// highway traffic lives on layer 1: the main camera sees it, the ground reflector's camera (layer 0 only) skips it
camera.layers.enable(1);
for (const m of [carBox, headL, tailL]) { m.frustumCulled = false; m.layers.set(1); scene.add(m); }
const carLoader = new GLTFLoader();
CAR_TYPES.forEach((t) => carLoader.load(`./models/cars/lod/${t.file}.glb`, (g) => {   // ~2.8k-tri far LOD
  const parts = []; g.scene.updateMatrixWorld(true);
  g.scene.traverse((o) => { if (o.isMesh) { const geo = o.geometry.clone().applyMatrix4(o.matrixWorld); for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k); parts.push({ geo, mat: o.material }); } });
  const geo = parts.length === 1 ? parts[0].geo : mergeGeometries(parts.map((p) => p.geo), true);
  const box3 = new THREE.Box3().setFromBufferAttribute(geo.attributes.position), size = box3.getSize(new THREE.Vector3());
  if (size.z > size.x) { geo.rotateY(Math.PI / 2); box3.setFromBufferAttribute(geo.attributes.position); box3.getSize(size); }
  const c = box3.getCenter(new THREE.Vector3()); geo.translate(-c.x, -box3.min.y, -c.z); geo.scale(t.len / size.x, t.len / size.x, t.len / size.x);
  t.mesh = new THREE.InstancedMesh(geo, parts.length === 1 ? parts[0].mat : parts.map((p) => p.mat), t.cars.length);
  t.mesh.frustumCulled = false; t.mesh.layers.set(1); scene.add(t.mesh);
}, undefined, () => { /* not generated yet — keep boxes */ }));

const _cm = new THREE.Matrix4(), _lm = new THREE.Matrix4(), _hide = new THREE.Matrix4().makeScale(0, 0, 0);
function updateCars(dt) {
  let li = 0;
  CAR_TYPES.forEach((t) => t.cars.forEach((c, j) => {
    c.s = (c.s + c.v * dt + 1) % 1; const h = c.h, d = c.s * h.L;
    const x = h.x1 + h.ux * d - h.uz * c.lane, z = h.z1 + h.uz * d + h.ux * c.lane;
    _q.setFromAxisAngle(up, ang(h.ux * c.dir, h.uz * c.dir));
    _cm.compose(_v.set(x, h.y + 1.3, z), _q, _s);
    const i = carData.indexOf(c);
    if (t.mesh) { t.mesh.setMatrixAt(j, _cm); carBox.setMatrixAt(i, _hide); }
    else carBox.setMatrixAt(i, _lm.copy(_cm).multiply(new THREE.Matrix4().makeScale(t.len, 1, 1)));
    for (const sd of [-.62, .62]) {
      headL.setMatrixAt(li, _lm.copy(_cm).multiply(M4(t.len / 2, .72, sd)));
      tailL.setMatrixAt(li++, _lm.copy(_cm).multiply(M4(-t.len / 2, .8, sd)));
    }
  }));
  for (const m of [carBox, headL, tailL, ...CAR_TYPES.map((t) => t.mesh).filter(Boolean)]) m.instanceMatrix.needsUpdate = true;
}

/* ───────────── markers & views ───────────── */
const POI = [
  { n: '01', name: '入口闸机 (18×4m · 高5m)', p: [0, 8, 47], cam: [-18, 9, 82], tgt: [0, 3, 44] },
  { n: '02', name: '主路 + 坡道 (长18m · 高6m)', p: [0, 7, 28], cam: [26, 16, 58], tgt: [0, 4, 24] },
  { n: '03', name: '迷宫围挡 (4m格 · 高6m)', p: [0, 8, -2], cam: [-14, 52, 40], tgt: [0, 0, -2] },
  { n: '04', name: '扑克牌塔 (12×12m · 高38m)', p: [0, 42, -33], cam: [-8, 24, 14], tgt: [0, 23, -28] },
  { n: '05', name: '控制塔 (8×8m · 高28m)', p: [43, 35, -27], cam: [16, 28, 8], tgt: [43, 17, -27] },
  { n: '06', name: '管道设备区', p: [27, 8, 24], cam: [4, 15, 50], tgt: [27, 3, 24] },
  { n: '07', name: '廊道塔架 (16×8m · 高15m)', p: [-38, 19, -28], cam: [-16, 20, 2], tgt: [-38, 12, -28] },
  { n: '08', name: '货运装卸区', p: [51, 6, 10], cam: [66, 21, 27], tgt: [51, 1, 13] },
];
const mk = document.getElementById('markers'), legend = document.getElementById('legend');
POI.forEach((o) => {
  const e = document.createElement('div'); e.className = 'mk'; e.textContent = o.n; e.onclick = () => fly(o.cam, o.tgt); mk.appendChild(e); o.el = e; o.v = new THREE.Vector3(...o.p);
  const li = document.createElement('li'); li.innerHTML = `<b>${o.n}</b>${o.name}`; li.onclick = () => fly(o.cam, o.tgt); legend.appendChild(li);
});
const VIEWS = [['城市全景', [700, 900, 900], [-600, 0, -300]], ['总览', [-95, 72, 112], [0, 6, -4]], ['俯视平面', [0.01, 200, 1], [0, 0, 0]], ['正立面', [0, 16, 165], [0, 16, 0]], ['侧立面', [170, 16, 0], [0, 14, 0]], ['夜景低角度', [-30, 4, 64], [0, 10, -10]]];
const vb = document.getElementById('views');
VIEWS.forEach(([t, c, g]) => { const b = document.createElement('button'); b.textContent = t; b.onclick = () => fly(c, g); vb.appendChild(b); });
const playBtn = document.createElement('button'); playBtn.textContent = '▶ 进入漫游'; playBtn.className = 'play'; vb.appendChild(playBtn);
let anim = null;
window.__view = fly;   // console helper: __view([x,y,z],[tx,ty,tz])
function fly(c, t) { anim = { t0: performance.now(), d: 1400, c0: camera.position.clone(), t0v: controls.target.clone(), c1: new THREE.Vector3(...c), t1: new THREE.Vector3(...t) }; }
function updateMarkers() {
  const v = new THREE.Vector3();
  for (const o of POI) { v.copy(o.v).project(camera); const vis = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05 && camera.position.distanceTo(o.v) < 420; o.el.style.display = vis ? 'block' : 'none'; o.el.style.left = ((v.x + 1) / 2 * innerWidth) + 'px'; o.el.style.top = ((1 - v.y) / 2 * innerHeight) + 'px'; }
}

/* ───────────── GLB assets: Blender trucks + rigged Mixamo characters ───────────── */
const loader = new GLTFLoader();
const load = (u) => new Promise((res, rej) => loader.load(u, res, undefined, rej));
const mixers = [], walkers = [], charRoots = [];   // charRoots: distance-culled (skinned meshes can't frustum-cull reliably)
window.__walkers = walkers;   // console helper
const player = createPlayer({ scene, camera, renderer, controls, spawn: new THREE.Vector3(0, .2, 64), spawnYaw: 0 });
playBtn.onclick = () => player.enter();
// city districts: legend entries fly the camera there; ▶ drops the player at the district's spawn
const cityPOI = new Map(cityInfo.pois.map((p) => [p.id, p]));
const cityHead = document.createElement('h1'); cityHead.textContent = '城市区域'; cityHead.style.marginTop = '12px'; legend.after(cityHead);
const cityList = document.createElement('ul'); cityHead.after(cityList);
for (const d of DISTRICTS) {
  if (d.id === 'compound') continue;
  const p = cityPOI.get(d.id) || { cam: [d.x + d.w * .9, Math.max(d.w, d.d) * .8, d.z + d.d * 1.1], tgt: [d.x, 0, d.z], spawn: [d.x, 1, d.z + d.d / 2 + 8], yaw: 0 };
  const li = document.createElement('li'); li.innerHTML = `<b>${d.suit || '·'}</b>${d.name} <span class="go" title="在这里漫游">▶</span>`;
  li.onclick = (e) => { if (e.target.classList.contains('go')) { player.enter(); player.teleport(new THREE.Vector3(...p.spawn), p.yaw || 0); } else fly(p.cam, p.tgt); };
  cityList.appendChild(li);
}
{ const h = cityPOI.get('hunt'); if (h) {   // cinematic entry for the Shibuya gunfight
  const li = document.createElement('li'); li.innerHTML = `<b style="background:#d8242a;color:#fff">!</b>涩谷 · 狩猎现场 <span class="go" title="在这里漫游">▶</span>`;
  li.onclick = (e) => { if (e.target.classList.contains('go')) { player.enter(); player.teleport(new THREE.Vector3(...h.spawn), h.yaw); } else fly(h.cam, h.tgt); };
  cityList.prepend(li);
} }
const dayBtn = document.createElement('button'); vb.insertBefore(dayBtn, playBtn);
window.__player = player;   // console helper
Promise.all([load('./models/truck_semi.glb'), load('./models/truck_box.glb')]).then(([semi, boxT]) => {
  const src = { truck_semi: semi.scene, truck_box: boxT.scene };
  for (const t of truckSpots) {
    const o = src[t.file].clone(); o.position.set(t.x, 0, t.z); o.rotation.y = t.ry; scene.add(o);
    o.traverse((c) => { if (c.isMesh) collidables.push(c); });
    const f = new THREE.Vector3(Math.cos(t.ry), 0, -Math.sin(t.ry));      // truck forward in world
    const head = new THREE.Vector3(t.x, 1.3, t.z).addScaledVector(f, 1.7);
    addSpot(0xfff4e0, 260, 30, .45, .6, head, head.clone().addScaledVector(f, 12).setY(0));
  }
}).catch((e) => console.error('truck load failed', e)).finally(() => player.setCollider(collidables));

// patrol / work routes: pts in xz, y = walking surface height
const ROUTES = [
  { m: 'Soldier', pts: [[-28, 14.5], [28, 14.5], [28, -20], [-28, -20]], y: L1 + .06, loop: true, v: 1.15 },   // 10m loop
  { m: 'Soldier', pts: [[-54, 40.9], [-18, 40.9]], y: WH + .11, v: 1.05 },                                     // wall walk
  { m: 'Soldier', pts: [[-45, -28], [-8, -28]], y: L2 + .06, v: 1.05 },                                         // 15m deck
  { m: 'Soldier', pts: [[-48, -40.3], [46, -40.3]], y: .06, v: 1.25 },                                          // back service road
  { m: 'Xbot', pts: [[-2.5, 40], [-2.5, 18]], y: .12, v: 1.15 },                                                // main road
  { m: 'Xbot', pts: [[14, 34.2], [40, 34.2]], y: .06, v: 1.05 },                                                // pipe plant front
  { m: 'Xbot', pts: [[-49.3, 30], [-49.3, -30]], y: .06, v: 1.15 },                                             // west yard
  { m: 'Xbot', pts: [[51.6, -10], [51.6, 29]], y: .13, v: 1.0 },                                                // truck yard
];
Promise.all([load('./models/chars/Soldier.glb'), load('./models/chars/Xbot.glb')]).then(([sol, xb]) => {
  // Xbot dressed as hi-vis workers, Soldier kept as security patrol
  const vest = new THREE.MeshStandardMaterial({ color: 0xe0661c, roughness: .55, metalness: .1 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x24282d, roughness: .6, metalness: .35 });
  xb.scene.traverse((o) => { if (o.isMesh) o.material = /joint/i.test(o.material.name) ? dark : vest; });
  const lib = { Soldier: sol, Xbot: xb };
  const spawn = (name, clipName) => {
    const g = lib[name], o = cloneSkinned(g.scene);
    o.traverse((c) => { if (c.isMesh) c.frustumCulled = false; });
    const root = new THREE.Group(); root.add(o); scene.add(root); charRoots.push(root);
    if (name === 'Soldier') o.rotation.y = Math.PI;   // Soldier.glb faces −Z, Xbot faces +Z
    const mx = new THREE.AnimationMixer(o), clip = THREE.AnimationClip.findByName(g.animations, clipName);
    const act = mx.clipAction(clip); act.play(); act.time = Math.random() * clip.duration; mixers.push(mx);
    return root;
  };
  for (const r of ROUTES) {
    const pts = r.pts.map(([x, z]) => new THREE.Vector2(x, z)); if (r.loop) pts.push(pts[0].clone());
    const segs = []; let L = 0;
    for (let i = 0; i < pts.length - 1; i++) { const l = pts[i].distanceTo(pts[i + 1]); segs.push({ a: pts[i], b: pts[i + 1], l, s0: L }); L += l; }
    walkers.push({ ...r, o: spawn(r.m, r.m === 'Soldier' ? 'Walk' : 'walk'), segs, L, s: Math.random() * L * 2 });
  }
  const idleClips = { Soldier: ['Idle'], Xbot: ['idle', 'agree', 'headShake', 'idle'] };
  idleSpots.forEach((p, i) => {
    const m = i % 3 === 0 ? 'Soldier' : 'Xbot', list = idleClips[m];
    const o = spawn(m, list[i % list.length]); o.position.set(p.x, p.y, p.z); o.rotation.y = R() * Math.PI * 2;
  });
  console.log('characters', walkers.length + idleSpots.length);
}).catch((e) => console.error('character load failed', e));

const _p = new THREE.Vector2();
function updateWalkers(dt) {
  for (const w of walkers) {
    w.s += w.v * dt;
    let d = w.s % (w.loop ? w.L : 2 * w.L), back = false;
    if (!w.loop && d > w.L) { d = 2 * w.L - d; back = true; }
    const sg = w.segs.find((g) => d <= g.s0 + g.l) || w.segs[w.segs.length - 1];
    _p.lerpVectors(sg.a, sg.b, (d - sg.s0) / sg.l);
    const dx = (sg.b.x - sg.a.x) * (back ? -1 : 1), dz = (sg.b.y - sg.a.y) * (back ? -1 : 1);
    w.o.position.set(_p.x, w.y, _p.y);
    const target = Math.atan2(dx, dz);   // characters face +Z
    let da = target - w.o.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da));
    w.o.rotation.y += da * Math.min(1, dt * 8);
  }
}

/* ───────────── post ───────────── */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.55, 0.6, 1.0); composer.addPass(bloom);
const facadeMats = Object.values(mats).filter((m) => m.userData.nightGlow);   // lit windows / signs / shopfronts at night
const CITY_NIGHT_LIGHTS = .15;
const dayNight = createDayNight({ scene, renderer, hemi, moon, bloom, spots, nightBackdrop: city, onChange: [
  // the show's night has no city electricity: only a few windows (generators) glow; game venues light themselves
  (day) => { for (const m of facadeMats) m.emissiveIntensity = day ? 0 : m.userData.nightGlow * CITY_NIGHT_LIGHTS; },
  (day) => {   // the wet-asphalt mirror is a night look; by day the apron is plain dry asphalt
    refl.visible = !day; const am = asphalt.material;
    am.alphaMap = day ? null : texPuddle; am.transparent = !day; am.roughness = day ? .95 : 1; am.roughnessMap = day ? null : texPuddle; am.color.set(day ? 0xf0f2f4 : 0xb0b4ba); am.needsUpdate = true;
  },
  (day) => { for (const k of ['poolC', 'poolY', 'beam']) mats[k].visible = !day; },   // fake light pools / cones are night-only
  (day) => { dayBtn.textContent = day ? '☾ 切换夜晚' : '☀ 切换白天'; },
  ...(cityInfo.dayNight || []),
] });
dayBtn.onclick = () => dayNight.set(!dayNight.isDay);
dayNight.set(true);
window.__day = dayNight; window.__renderer = renderer; window.__scene = scene; window.__camera = camera;
dayNight.interiors.push([402, 618, 40, -224, -76]);   // black warehouse hall (x0,x1,yTop,z0,z1)
composer.addPass(new OutputPass());
addEventListener('resize', () => { const pr = Math.min(devicePixelRatio, 2); renderer.setPixelRatio(pr); composer.setPixelRatio(pr); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight); refl.getRenderTarget().setSize(Math.max(512, Math.floor(innerWidth * .6)), Math.max(512, Math.floor(innerHeight * .6))); });

// moving the window to a screen with another pixel ratio doesn't fire 'resize' — watch the ratio directly
(function watchDPR() { matchMedia(`(resolution: ${devicePixelRatio}dppx)`).addEventListener('change', () => { dispatchEvent(new Event('resize')); watchDPR(); }, { once: true }); })();

/* ───────────── loop ───────────── */
const clock = new THREE.Clock(), up = new THREE.Vector3(0, 1, 0);
const foliageMeshes = [...zoneMeshes.values()].flat().filter((m) => /^det_|\|(crown|ivy|leaf|trunk)/.test(m.name));   // + building detail zones
let cullT = 0;
let lastT = 0;
const prof = window.__prof = { js: 0, render: 0 };
function tick() {
  const t0 = performance.now();
  const t = clock.getElapsedTime(), dt = Math.min(.05, t - lastT); lastT = t;
  for (const mx of mixers) mx.update(dt);
  updateWalkers(dt);
  if (anim) { let k = Math.min(1, (performance.now() - anim.t0) / anim.d); k = k * k * (3 - 2 * k); camera.position.lerpVectors(anim.c0, anim.c1, k); controls.target.lerpVectors(anim.t0v, anim.t1, k); if (k >= 1) anim = null; }
  if (player.active) player.update(dt); else controls.update();
  document.body.classList.toggle('playing', player.active);
  const a = .55 + .45 * Math.sin(t * 2.4), b = .55 + .45 * Math.sin(t * 2.4 + 2.2);
  bMatA.color.setRGB(4 * a + .5, .15 * a, .1 * a); bMatB.color.setRGB(4 * b + .5, .15 * b, .1 * b);
  halos[0].opacity = .12 + .45 * a; halos[1].opacity = .12 + .45 * b;
  updateCars(dt);
  for (const f of cityInfo.updates) f(dt, t);
  if (!dayNight.isDay) refl.visible = Math.hypot(camera.position.x, camera.position.z) < 650;   // the wet-ground mirror re-renders the whole scene: only near the compound
  if ((cullT -= dt) < 0) {   // foliage / ivy beyond ~700 m is lost in haze — skip drawing it
    cullT = .4;
    for (const o of charRoots) o.visible = camera.position.distanceTo(o.position) < 260;
    for (const m of foliageMeshes) { const bs = m.geometry.boundingSphere; m.visible = camera.position.distanceTo(bs.center) - bs.radius < (m.name.startsWith('det_') ? 320 : 700); }
  }
  dayNight.update(player.active ? player.pos : controls.target, camera.position);
  updateMarkers();
  const tr = performance.now();
  if (innerWidth > 0 && innerHeight > 0) composer.render();   // hidden pane → zero-size targets
  prof.render = prof.render * .9 + (performance.now() - tr) * .1; prof.js = prof.js * .9 + (tr - t0) * .1;
  requestAnimationFrame(tick);
}
tick();
document.getElementById('load').style.opacity = 0; setTimeout(() => document.getElementById('load').remove(), 700);
