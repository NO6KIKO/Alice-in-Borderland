// Instanced trees. While the city builds, tree() only records a placement here: world position from the kit frame, a
// seed from that position, and a kind (street / park / wild / shrine / temple / palace / roof) that sets the species
// mix. After the build, buildTrees() draws all of them through InstancedMesh pools — per species variant a near
// version (full branching, ~200 twig cards) and a mid version (main limbs, fewer larger cards), plus one shared far
// crown — reassigned around the camera a few times a second, with dithered hand-overs between versions. Crowns sway in
// the wind, are darker inside than on the outside and let sunlight through when you look toward the sun. Only trunks
// collide. Geometry: city/treegen.js; leaf atlas and bark: city/treetex.js.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as K from '../kit.js';
import { SPECIES, buildVariant, buildBlob } from './treegen.js';
import { leafAtlas, barkTex, leafMean, farLeafTex } from './treetex.js';

let LITE = false;
export function setTreeLite(v) { LITE = !!v; }
const TU = {   // shared by every tree material
  uTime: { value: 0 }, uWind: { value: new THREE.Vector4(.8, .6, .2, .03) },   // wind dir x, dir z, sway at the top (m), card flutter (m)
  uTrans: { value: 1 }, uTransTint: { value: new THREE.Color(1, .95, .72) }, uSunDir: { value: new THREE.Vector3(.5, .8, .3).normalize() },
};
export function setTreeSun(dir) { if (dir) TU.uSunDir.value = dir; }   // sky.js's live sun direction (leaf shadow lookups lean toward it)

// species mixes per kind (weights). A whole street row shares one species.
const KINDS = {
  street: [['icho', 45], ['keyaki', 40], ['sakura', 15]],
  park: [['keyaki', 25], ['sakura', 25], ['kusunoki', 20], ['zoki', 25], ['sapling', 5]],
  wild: [['zoki', 38], ['keyaki', 18], ['sakura', 12], ['kusunoki', 10], ['sapling', 22]],
  shrine: [['kusunoki', 70], ['icho', 30]],
  temple: [['kusunoki', 30], ['icho', 25], ['sakura', 25], ['keyaki', 20]],
  palace: [['kusunoki', 35], ['zoki', 35], ['keyaki', 20], ['sakura', 10]],
  roof: [['zoki', 45], ['sapling', 35], ['keyaki', 20]],
};
// widest crown half-width (m) each kind has room for: street trees stand on a kerb a few metres from the facades
const ROOM = { street: 4, roof: 2.4, shrine: 6, park: 7.5, wild: 7.5, temple: 7, palace: 7.5 };
const ZONE_KIND = { palace: 'palace', tokyotower: 'temple', shibuya: 'street' }, VARIANTS = 2;
export const hash = (a, b, c = 0) => { let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x2545f491); h = Math.imul(h ^ h >>> 15, 0x2c1b3c6d); h = Math.imul(h ^ h >>> 12, 0x297a2d39); return (h ^ h >>> 15) >>> 0; };
const pick = (mix, r) => { const tot = mix.reduce((s, m) => s + m[1], 0); let x = r() * tot; for (const [n, w] of mix) if ((x -= w) < 0) return n; return mix[0][0]; };

const P = [];   // placements
// record one tree; x, z, y in the current kit frame. opts: { kind, species, row, collide, room }
export function plantTree(x, z, s = 1, y = 0, opts = {}) {
  const w = K.fpos(x, y, z), seed = hash(Math.round(w.x * 10), Math.round(w.z * 10), 7), r = K.rng(seed);
  const kind = opts.kind || (w.y > 2 ? 'roof' : ZONE_KIND[K.zone] || 'park'), mix = KINDS[kind] || KINDS.park;
  const row = opts.row ?? hash(Math.round(w.x / 60), Math.round(w.z / 60), 3), rowR = K.rng(row);
  let sp = opts.species;
  if (!sp) {
    if (kind === 'street') sp = pick(mix, rowR);
    else { const gx = Math.floor(w.x / 150), gz = Math.floor(w.z / 150);   // groves: each 150 m cell favours a few species
      sp = pick(mix.map(([n, wt]) => [n, wt * (.4 + 1.6 * hash(gx, gz, n.charCodeAt(0) * 31 + n.length) / 4294967296)]), r); }
  }
  const spec = SPECIES[sp] || SPECIES.keyaki, v = Math.floor(r() * VARIANTS);
  let size = Math.pow(Math.min(2, Math.max(.4, s)), .75) * (.85 + r() * .3);
  if (kind === 'street') size = Math.min(size, 11 / spec.H);
  if (kind === 'roof') size = Math.min(size, 6 / spec.H);
  const b = .9 + r() * .2, g = 1 + (r() - .5) * .06; let tint = [b, b * g, b * (.94 + r() * .1)];
  const turn = kind === 'street' && sp === 'icho' ? rowR() < .12 : r() < ({ keyaki: .04, sakura: .06, zoki: .06 }[sp] || 0);   // a few crowns turning early
  if (turn) tint = (sp === 'icho' ? [1.45, 1.18, .45] : sp === 'sakura' ? [1.5, .85, .55] : sp === 'zoki' && v ? [1.6, .7, .45] : [1.35, 1, .55]).map((c) => c * b);
  P.push({ sp, v, x: w.x, y: w.y, z: w.z, yaw: r() * 6.283, size, sx: .88 + r() * .24, sy: .9 + r() * .2, sz: .88 + r() * .24, tint,
    collide: opts.collide ?? (sp !== 'sapling' && size >= .5), kind, room: opts.room });
}
export function treeStats() { return P.length; }

/* ── species variants, built once; crowns then shrunk to fit their room ── */
let V = null;   // V[sp][v] = buildVariant output
function ensure() {
  if (V) return V; V = {};
  for (const sp of new Set(P.map((p) => p.sp))) V[sp] = Array.from({ length: VARIANTS }, (_, i) => buildVariant(sp, i, LITE));
  for (const p of P) { const cr = V[p.sp][p.v].crown, room = p.room ?? ROOM[p.kind] ?? 7.5; p.size = Math.min(p.size, room / (Math.max(cr.rx, cr.rz) * Math.max(p.sx, p.sz))); }
  return V;
}
// merged invisible trunk prisms (up to the fork or 3.2 m) for the player collider
export function treeColliders() {
  if (!P.length) return null;
  ensure(); const geos = [];
  for (const p of P) {
    if (!p.collide || p.size < .3) continue;
    const vr = V[p.sp][p.v], h = Math.min(3.2, vr.fork * p.size * p.sy), rad = SPECIES[p.sp].r0 * p.size * Math.max(p.sx, p.sz) * 1.05;
    const g = new THREE.CylinderGeometry(rad, rad * 1.15, h + .2, 6, 1, true); g.translate(0, h / 2 - .1, 0); g.rotateY(p.yaw); g.translate(p.x, p.y, p.z); geos.push(g);
  }
  if (!geos.length) return null;
  const mesh = new THREE.Mesh(mergeGeometries(geos), new THREE.MeshBasicMaterial()); mesh.visible = false; mesh.name = 'treeColliders';
  return mesh;
}

/* ── materials ── */
const need = (src, a, label) => { if (!src.includes(a)) { console.warn('trees: shader anchor missing', label); return false; } return true; };
const INST = 'mvPosition = instanceMatrix * mvPosition;', WPOS = 'worldPosition = modelMatrix * worldPosition;';
const SHN = 'shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias';
// sway: a gusting push along the wind, growing with the square of the height in the tree, plus a smaller side swing;
// kept in tWind so the shadow lookups can follow the drawn geometry
const WIND = `
	{ vec3 tO = instanceMatrix[3].xyz; float tH = max( 0.0, mvPosition.y - tO.y ) / ( uH * length( instanceMatrix[1].xyz ) ); tH *= tH;
	  float tG = 0.6 + 0.4 * sin( dot( tO.xz, uWind.xy ) * 0.05 - uTime * 0.8 ) * sin( uTime * 0.37 + tO.z * 0.11 );
	  float tS = uWind.z * tG * tH * ( 0.7 + 0.3 * sin( uTime * 1.07 + tO.x * 0.29 ) );
	  tWind = vec3( uWind.x, 0.0, uWind.y ) * tS + vec3( -uWind.y, 0.0, uWind.x ) * ( tS * 0.2 * sin( uTime * 1.9 + tO.z * 0.23 ) );
	  mvPosition.xyz += tWind; }`;
const DITHER = `
	{ float tb = fract( 52.9829189 * fract( dot( gl_FragCoord.xy, vec2( 0.06711056, 0.00583715 ) ) ) );
	  if ( vFade > 0.0 ? tb >= vFade : tb < -vFade ) discard; }`;
// leaves. Both faces of a card carry the crown's outward normal, so "which side of the crown surface am I looking at"
// (facing) decides the mix: from outside, sunlight reflects off the blades (soft-wrapped into the shadow side); from
// underneath or inside, reflection fades and light coming through the leaves dominates — a Henyey–Greenstein lobe
// around the sun direction plus a weak diffuse share, strongest on open (outer) leaves. Shadowed light arrives already
// dimmed in directLight.color, so leaves in shade do not glow.
const LEAF_LIGHT = `
uniform float uTrans; uniform vec3 uTransTint;
float treePhase( float c, float g ) { float g2 = g * g; return ( 1.0 - g2 ) / ( 4.0 * PI * pow( max( 1e-4, 1.0 + g2 - 2.0 * g * c ), 1.5 ) ); }
void RE_Direct_Leaf( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float nl = dot( geometryNormal, directLight.direction ), facing = smoothstep( -0.2, 0.25, dot( geometryNormal, geometryViewDir ) );
	vec3 alb = directLight.color * material.diffuseColor;
	reflectedLight.directDiffuse += alb * RECIPROCAL_PI * mix( 0.2, 1.0, facing ) * saturate( ( nl + 0.4 ) / 1.4 );
	reflectedLight.directSpecular += saturate( nl ) * directLight.color * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material ) * facing;
	float thin = smoothstep( 0.45, 0.95, vCrown.x );
	float through = treePhase( dot( -geometryViewDir, directLight.direction ), 0.75 ) * 0.25 + saturate( ( 0.3 - nl ) / 1.3 ) * 0.3 * RECIPROCAL_PI;
	reflectedLight.directDiffuse += alb * uTransTint * ( uTrans * thin * through );
}
#undef RE_Direct
#define RE_Direct RE_Direct_Leaf`;
// sky light on the underside of the crown surface is mostly blocked by the leaves above
const LEAF_AMBIENT = `
	{ float fc = smoothstep( -0.2, 0.25, dot( geometryNormal, geometryViewDir ) ); reflectedLight.indirectDiffuse *= mix( 0.5, 1.0, fc ); reflectedLight.indirectSpecular *= fc; }`;
// far crowns: world-space triplanar leaf-clump brightness, and a ragged silhouette (low-brightness texels drop out
// where the surface turns away from the camera)
const FAR_FRAG = `
	{ vec3 bw = abs( normalize( vTreeN ) ); bw /= bw.x + bw.y + bw.z;
	  float lt = texture2D( uFarLeaf, vTreeW.zy * 0.3 ).r * bw.x + texture2D( uFarLeaf, vTreeW.xz * 0.3 ).r * bw.y + texture2D( uFarLeaf, vTreeW.xy * 0.3 ).r * bw.z;
	  float rim = abs( dot( normalize( vTreeN ), normalize( cameraPosition - vTreeW ) ) );
	  if ( rim < 0.4 && lt < mix( 0.8, 0.35, rim / 0.4 ) ) discard;
	  diffuseColor.rgb *= mix( 0.45, 1.3, lt ); }`;
// patch a pool material: wind sway (+ card flutter), dithered hand-over; leaves also get tint, fades for cards seen
// edge-on or right at the camera, the same normal on both faces, leaf lighting and sun-leaning shadow lookups
function patch(mat, { leaf = false, depth = false, wind = true, far = false, H = 10 }) {
  const uH = { value: H }, uFarLeaf = { value: far ? farLeafTex(LITE) : null };
  mat.defines = { ...(mat.defines || {}), ...(leaf ? { TREE_LEAF: '' } : {}), ...(depth ? { TREE_DEPTH: '' } : {}), ...(far ? { TREE_FAR: '' } : {}) };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, TU, { uH, uFarLeaf });
    let v = sh.vertexShader, f = sh.fragmentShader;
    const pv = THREE.ShaderChunk.project_vertex;
    if (!need(v, '#include <begin_vertex>', 'begin_vertex') || !need(pv, INST, 'project_vertex') || !need(f, '#include <map_fragment>', 'map_fragment')) return;
    v = v.replace('#include <common>', `#include <common>
uniform float uTime, uH; uniform vec4 uWind; uniform vec3 uSunDir;
attribute float iFade; varying float vFade;
#ifdef TREE_LEAF
attribute vec2 aCrown; attribute vec3 iTint; varying vec2 vCrown; varying vec3 vTint;
#endif
#ifdef TREE_FAR
varying vec3 vTreeW, vTreeN;
#endif`);
    v = v.replace('#include <begin_vertex>', `#include <begin_vertex>
	vec3 tWind = vec3( 0.0 ); vFade = iFade;
#ifdef TREE_LEAF
	vCrown = aCrown; vTint = iTint;
	#ifndef TREE_DEPTH
	transformed += normal * sin( uTime * 5.3 + dot( position, vec3( 0.83, 3.7, 1.21 ) ) + aCrown.y * 6.28 ) * uWind.w * aCrown.y;
	#endif
#endif`);
    if (wind) {
      v = v.replace('#include <project_vertex>', pv.replace(INST, INST + WIND));
      const wp = THREE.ShaderChunk.worldpos_vertex;
      if (!depth && need(wp, WPOS, 'worldpos_vertex')) v = v.replace('#include <worldpos_vertex>', wp.replace(WPOS, WPOS + '\n\tworldPosition.xyz += mat3( modelMatrix ) * tWind;'));
    }
    if (leaf && !depth) {   // shadow lookups step toward the sun, not along the crown normal: leaves facing away from it are not self-shadowed
      const sv = THREE.ShaderChunk.shadowmap_vertex;
      if (need(sv, SHN, 'shadowmap_vertex')) v = v.replace('#include <shadowmap_vertex>', sv.replace(SHN, 'uSunDir * directionalLightShadows[ i ].shadowNormalBias'));
    }
    if (far) v = v.replace('#include <project_vertex>', `#include <project_vertex>
	vTreeW = ( modelMatrix * instanceMatrix * vec4( transformed, 1.0 ) ).xyz; vTreeN = mat3( modelMatrix * instanceMatrix ) * objectNormal;`);
    f = f.replace('#include <common>', `#include <common>
varying float vFade;
#ifdef TREE_LEAF
varying vec2 vCrown; varying vec3 vTint;
#endif
#ifdef TREE_FAR
uniform sampler2D uFarLeaf; varying vec3 vTreeW, vTreeN;
#endif`);
    let after = DITHER + (far ? FAR_FRAG : '');
    if (leaf && !depth) after += `
	diffuseColor.rgb *= vTint;
	{ vec3 fN = normalize( cross( dFdx( vViewPosition ), dFdy( vViewPosition ) ) );
	  diffuseColor.a *= smoothstep( 0.05, 0.25, abs( dot( fN, normalize( vViewPosition ) ) ) ) * smoothstep( 0.5, 2.0, length( vViewPosition ) ); }`;
    f = f.replace('#include <map_fragment>', '#include <map_fragment>' + after);
    if (leaf && !depth) {
      const nb = THREE.ShaderChunk.normal_fragment_begin, flip = 'normal *= faceDirection;';
      if (need(nb, flip, 'normal_fragment_begin')) f = f.replace('#include <normal_fragment_begin>', nb.replace(flip, '// crown normals: same on both faces'));
      if (need(f, '#include <lights_physical_pars_fragment>', 'lights_physical_pars')) f = f.replace('#include <lights_physical_pars_fragment>', '#include <lights_physical_pars_fragment>' + LEAF_LIGHT);
      if (need(f, '#include <lights_fragment_end>', 'lights_fragment_end')) f = f.replace('#include <lights_fragment_end>', '#include <lights_fragment_end>' + LEAF_AMBIENT);
    }
    sh.vertexShader = v; sh.fragmentShader = f;
  };
  mat.customProgramCacheKey = () => 'tree' + (leaf ? 'L' : 'W') + (depth ? 'D' : '') + (wind ? '' : 'S') + (far ? 'F' : '');
  return mat;
}
let M = null;
function materials() {
  if (M) return M;
  const atlas = leafAtlas(LITE); M = { wood: {}, leaf: {}, woodD: {}, leafD: {} };
  for (const sp of Object.keys(V)) {
    const H = SPECIES[sp].H, bark = barkTex(SPECIES[sp].bark, LITE);
    M.wood[sp] = patch(new THREE.MeshStandardMaterial({ map: bark.map, normalMap: bark.normal, vertexColors: true, roughness: .92 }), { H });
    M.leaf[sp] = patch(new THREE.MeshStandardMaterial({ map: atlas, alphaTest: .5, side: THREE.DoubleSide, vertexColors: true, roughness: .72 }), { leaf: true, H });
    M.woodD[sp] = patch(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), { depth: true, H });
    M.leafD[sp] = patch(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), { depth: true, leaf: true, H });
  }
  M.far = patch(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95 }), { wind: false, far: true });
  return M;
}

/* ── pools, detail bands and the reassignment ── */
// band radii (m, scaled by tree size): near / mid with hand-over widths, far edge with an outer fade; caps per pool
const NEAR = () => LITE ? 36 : 55, NB = 8, MIDR = () => LITE ? 150 : 230, MB = 20, FARR = () => LITE ? 700 : 950, FB = .12;
const KCAP = () => LITE ? 36 : 64, MIDCAP = () => LITE ? 150 : 220, CULLR = () => LITE ? 50 : 80;
function mkPool(geo, mat, depth, cap, { tint = false, color = false, shadow = true, receive = true } = {}) {
  geo = geo.clone();
  const fade = new THREE.InstancedBufferAttribute(new Float32Array(cap), 1).setUsage(THREE.DynamicDrawUsage); geo.setAttribute('iFade', fade);
  let tn = null; if (tint) { tn = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3).setUsage(THREE.DynamicDrawUsage); geo.setAttribute('iTint', tn); }
  const mesh = new THREE.InstancedMesh(geo, mat, cap); mesh.count = 0; mesh.visible = false; mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.castShadow = shadow; mesh.receiveShadow = receive;
  if (depth) mesh.customDepthMaterial = depth;
  if (color) mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3).setUsage(THREE.DynamicDrawUsage);
  return { mesh, fade, tint: tn, n: 0, cap };
}
// partially order (keys, idx)[0..n) so the k smallest keys come first (quickselect, Hoare partition)
function selectK(keys, idx, n, k) {
  let lo = 0, hi = n - 1;
  while (lo < hi) {
    const piv = keys[(lo + hi) >> 1]; let i = lo, j = hi;
    while (i <= j) { while (keys[i] < piv) i++; while (keys[j] > piv) j--; if (i <= j) { const tk = keys[i]; keys[i] = keys[j]; keys[j] = tk; const ti = idx[i]; idx[i] = idx[j]; idx[j] = ti; i++; j--; } }
    if (k <= j) hi = j; else if (k >= i) lo = i; else break;
  }
}
export function buildTrees({ scene, camera, updates, dayNight }) {
  if (!P.length) return;
  ensure(); materials();
  const root = new THREE.Group(); root.name = 'trees'; scene.add(root);
  // per placement: tree matrix, far-crown matrix, crown centre (world) + radius, band scale
  const N = P.length, MAT = new Float32Array(N * 16), FMAT = new Float32Array(N * 16), CEN = new Float32Array(N * 4), BAND = new Float32Array(N);
  const m = new THREE.Matrix4(), fm = new THREE.Matrix4(), q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3(), sc = new THREE.Vector3();
  P.forEach((p, i) => {
    const cr = V[p.sp][p.v].crown;
    m.compose(v.set(p.x, p.y, p.z), q.setFromAxisAngle(Y, p.yaw), sc.set(p.size * p.sx, p.size * p.sy, p.size * p.sz)); m.toArray(MAT, i * 16);
    fm.makeTranslation(cr.c[0], cr.c[1], cr.c[2]).scale(sc.set(cr.rx * .92, cr.ry * .95, cr.rz * .92)); fm.premultiply(m); fm.toArray(FMAT, i * 16);
    v.set(cr.c[0], cr.c[1], cr.c[2]).applyMatrix4(m); CEN[i * 4] = v.x; CEN[i * 4 + 1] = v.y; CEN[i * 4 + 2] = v.z;
    CEN[i * 4 + 3] = Math.max(cr.rx, cr.ry, cr.rz) * p.size * Math.max(p.sx, p.sy, p.sz); BAND[i] = Math.sqrt(Math.max(.3, p.size * Math.max(p.sx, p.sz)));
  });
  // pools: near / mid × species variant × wood / leaf; one far pool for everything
  const pools = { near: {}, mid: {} }, all = [];
  for (const sp of Object.keys(V)) for (let vi = 0; vi < VARIANTS; vi++) for (const tier of ['near', 'mid']) {
    const g = V[sp][vi][tier], cap = tier === 'near' ? KCAP() : MIDCAP();
    const wood = mkPool(g.wood, M.wood[sp], M.woodD[sp], cap), leaf = mkPool(g.leaf, M.leaf[sp], M.leafD[sp], cap, { tint: true });
    leaf.mesh.userData.noAO = true; wood.mesh.name = `tree|${sp}${vi}|${tier}|wood`; leaf.mesh.name = `tree|${sp}${vi}|${tier}|leaf`;
    pools[tier][sp + vi] = { wood, leaf, n: 0, cap }; all.push(wood, leaf); root.add(wood.mesh, leaf.mesh);
  }
  const far = mkPool(buildBlob(LITE), M.far, null, N, { color: true, receive: false }); far.mesh.name = 'tree|far'; all.push(far); root.add(far.mesh);
  const FARCOL = new Float32Array(N * 3), col = new THREE.Color();
  P.forEach((p, i) => {   // the palette is sRGB: convert to the linear working space before it becomes an instance colour
    const mm = leafMean(p.sp === 'zoki' ? (p.v ? 'maple' : 'oak') : p.sp); col.setRGB(mm[0], mm[1], mm[2], THREE.SRGBColorSpace);
    FARCOL[i * 3] = col.r * p.tint[0] * .75; FARCOL[i * 3 + 1] = col.g * p.tint[1] * .75; FARCOL[i * 3 + 2] = col.b * p.tint[2] * .75;
  });

  const put = (pair, i, fade) => {   // one placement into a near/mid pair (wood and leaves share the slot)
    if (pair.n >= pair.cap) return false; const n = pair.n++;
    for (const pl of [pair.wood, pair.leaf]) { pl.mesh.instanceMatrix.array.set(MAT.subarray(i * 16, i * 16 + 16), n * 16); pl.fade.array[n] = fade; }
    pair.leaf.tint.array.set(P[i].tint, n * 3); return true;
  };
  const putFar = (i, fade) => { const n = far.n++; far.mesh.instanceMatrix.array.set(FMAT.subarray(i * 16, i * 16 + 16), n * 16); far.fade.array[n] = fade; far.mesh.instanceColor.array.set(FARCOL.subarray(i * 3, i * 3 + 3), n * 3); };
  const frustum = new THREE.Frustum(), pm = new THREE.Matrix4(), sph = new THREE.Sphere();
  const cKey = new Float32Array(N), cIdx = new Int32Array(N), cDist = new Float32Array(N), mids = [];
  const stats = { near: 0, mid: 0, far: 0, ms: 0 }; let capEdge = Infinity;
  function reassign() {
    const t0 = performance.now(), cp = camera.position, farR = FARR() + Math.max(0, cp.y - 30) * 1.2;
    camera.updateMatrixWorld(); pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(pm);
    for (const t of ['near', 'mid']) for (const k in pools[t]) pools[t][k].n = 0;
    far.n = 0; mids.length = 0; let nc = 0;
    for (let i = 0; i < N; i++) {
      const dx = CEN[i * 4] - cp.x, dy = CEN[i * 4 + 1] - cp.y, dz = CEN[i * 4 + 2] - cp.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz), R = CEN[i * 4 + 3], e = d - R;
      if (e > farR) continue;
      // the margin grows with distance so a turn up to the reassign threshold never uncovers an empty strip
      const seen = frustum.intersectsSphere(sph.set(v.set(CEN[i * 4], CEN[i * 4 + 1], CEN[i * 4 + 2]), R * 1.3 + 8 + d * .22));
      if (!seen && d > CULLR()) continue;
      const nr = NEAR() * BAND[i], mr = MIDR() * BAND[i];
      if (d < nr) { cIdx[nc] = i; cDist[i] = d; cKey[nc++] = d + (seen ? 0 : 1000); }   // what is on screen claims the full trees first
      else if (d < mr) mids.push(i, d);
      else putFar(i, e > farR * (1 - FB) ? (farR - e) / (farR * FB) : 1);
    }
    const K0 = Math.min(KCAP(), nc);
    if (nc > K0) selectK(cKey, cIdx, nc, K0);
    // where the cap bites before the band edge, hand over at the cap distance instead (smoothed between passes)
    let edge = Infinity; if (nc > K0) { let lo = Infinity; for (let j = K0; j < nc; j++) lo = Math.min(lo, cKey[j]); if (lo < 1000) edge = lo; }
    capEdge = edge === Infinity ? Infinity : capEdge === Infinity ? edge : capEdge + (edge - capEdge) * .5;
    for (let j = 0; j < nc; j++) {
      const i = cIdx[j], d = cDist[i], p = P[i], key = p.sp + p.v;
      if (j >= K0) { mids.push(i, d); continue; }
      const nrEff = Math.min(NEAR() * BAND[i], capEdge - .5), fd = Math.max(.02, Math.min(1, (nrEff - d) / NB));
      put(pools.near[key], i, fd);
      if (fd < 1) put(pools.mid[key], i, -fd);
    }
    for (let j = 0; j < mids.length; j += 2) {
      const i = mids[j], d = mids[j + 1], p = P[i], fd = Math.min(1, (MIDR() * BAND[i] - d) / MB);
      if (!put(pools.mid[p.sp + p.v], i, fd)) { putFar(i, 1); continue; }   // mid pool full: far crown instead
      if (fd < 1) putFar(i, -fd);
    }
    stats.near = stats.mid = 0;
    for (const t of ['near', 'mid']) for (const k in pools[t]) { const pr = pools[t][k]; stats[t] += pr.n; pr.wood.n = pr.leaf.n = pr.n; }
    stats.far = far.n;
    for (const pl of all) {
      const n = pl.n; pl.mesh.count = n; pl.mesh.visible = n > 0; if (!n) continue;
      for (const [a, k] of [[pl.mesh.instanceMatrix, 16], [pl.fade, 1], [pl.tint, 3], [pl.mesh.instanceColor, 3]]) if (a) { a.clearUpdateRanges(); a.addUpdateRange(0, n * k); a.needsUpdate = true; }
    }
    stats.ms = performance.now() - t0;
  }
  // reassign every .3 s (LITE .4), or sooner after 5 m of travel or a 10° turn
  let wait = 0, dirty = true; const at = new THREE.Vector3(), look = new THREE.Vector3(), dir = new THREE.Vector3();
  updates.push((dt, t) => {
    TU.uTime.value = t; wait -= dt;
    camera.getWorldDirection(dir);
    if (!dirty && wait > 0 && camera.position.distanceToSquared(at) < 25 && dir.dot(look) > .985) return;
    dirty = false; wait = LITE ? .4 : .3; at.copy(camera.position); look.copy(dir); reassign();
  });
  dayNight.push((day, dusk) => {   // light through leaves: full by day, golden at dusk, nearly none under the moon
    TU.uTrans.value = dusk ? 1.4 : day ? 1 : .25; TU.uTransTint.value.set(dusk ? 0xffc48a : 0xfff2b8); TU.uWind.value.z = day ? .2 : .14;
  });
  reassign();
  window.__forest = { stats: () => ({ placements: N, ...stats }), reassign, P };
  console.log('trees', N, Object.fromEntries(Object.keys(V).map((sp) => [sp, P.filter((p) => p.sp === sp).length])));
}
