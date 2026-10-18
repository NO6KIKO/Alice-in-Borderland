// arena district (♣) — the black warehouse on its pier in the bay (P2, right) and its interior (P3).
// Exterior: concrete pier deck bridged from the quay, bollards / piles / harbour cranes, a 220×150×40 m
// dark-clad hall with sawtooth skylight monitors, warm window bands and a giant sliding door on the west.
// Interior (zone arena_in): front platform with a row of red/blue gate booths, seven 3 m concrete beams
// running 116 m east over 25 m-deep fog-filled pits to a wall of tall dark bays, glass control-room
// galleries on both long sides, steel stairs, gantry cranes under the roof trusses, hanging lamps.
// Local frame: origin at the footprint centre, building x −100..120, z −75..75; pits x −72..44, z −55..55.
import * as THREE from 'three';

const BX0 = -100, BX1 = 120, BZ = 75, BH = 40;        // building shell
const PX0 = -72, PX1 = 44, PZ = 55, PY = -25;         // pit volume (beams run PX0..PX1)
const BEAMS = [-45, -30, -15, 0, 15, 30, 45];          // beam centre lines (z)

export function build(ctx, d) {
  const { K, scene, cards } = ctx;
  const { box, cyl, plane, put, strut, torus, M4, withFrame, railSeg, stairs, pool, beacon, setZone, def, std, bas, canvasTex } = K;
  const R = K.rng(4417);

  /* ───── materials ───── */
  const winTex = canvasTex(256, 64, (g, w, h) => {   // warm office windows, 8 per tile, some dark
    g.fillStyle = '#121418'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) {
      const lit = R() < .7, gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, lit ? '#ffd9a0' : '#2a3038'); gr.addColorStop(1, lit ? '#d88a40' : '#161a20');
      g.fillStyle = gr; g.fillRect(i * 32 + 3, 8, 26, h - 16);
      g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(i * 32 + 15, 8, 2, h - 16);
    }
  }, { repeat: true });
  const fogTex = (seed) => canvasTex(256, 256, (g, w, h) => {   // soft tileable mist blobs on black (additive)
    const r = K.rng(seed); g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 55; i++) {
      const x = r() * w, y = r() * h, rad = 25 + r() * 75, a = .12 + r() * .3;
      for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) {
        const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
        gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2);
      }
    }
  }, { srgb: false, repeat: true });
  const fogA = fogTex(91), fogB = fogTex(173);
  const fogMat = (map, c) => { const m = new THREE.MeshBasicMaterial({ map, color: c, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }); m.userData.noCollide = true; return m; };
  if (!K.mats.arena_clad) {
    def('arena_clad', std({ map: K.texWall, color: 0x34383d, roughness: .62, metalness: .5 }), 2.4);
    def('arena_cladD', std({ map: K.texWall, color: 0x1e2125, roughness: .6, metalness: .55 }), 2.4);
    def('arena_conc', std({ map: K.texConcrete, color: 0x8e949a, roughness: .48, metalness: .12 }), 5);   // wet beams / floors
    def('arena_concD', std({ map: K.texPanel, color: 0x50555a, roughness: .9 }), 6);
    def('arena_deck', std({ map: K.texConcrete, color: 0x8a8c8a, roughness: .9 }), 6);
    def('arena_void', std({ color: 0x040506, roughness: 1 }));
    def('arena_rust', std({ color: 0x8e3324, roughness: .6, metalness: .45 }));
    def('arena_red', bas({ color: new THREE.Color(3.4, .2, .15) }));
    def('arena_blue', bas({ color: new THREE.Color(.35, .75, 3.6) }));
    def('arena_warm', bas({ color: new THREE.Color(2.8, 2.0, 1.2) }));
    def('arena_glass', std({ color: 0x8fb4c8, transparent: true, opacity: .22, roughness: .08, metalness: .9, side: THREE.DoubleSide, depthWrite: false }));
    def('arena_sky', std({ color: 0x1a222b, roughness: .15, metalness: .7, emissive: 0xffb070, emissiveIntensity: 0 }));
    def('arena_win', std({ map: winTex, emissiveMap: winTex, emissive: 0xffffff, emissiveIntensity: .25, roughness: .4 }), 8);
    def('arena_fogA', fogMat(fogA, new THREE.Color(.075, .085, .105)), 34);
    def('arena_fogB', fogMat(fogB, new THREE.Color(.05, .058, .075)), 46);
    def('arena_poolR', K.poolMat(new THREE.Color(.7, .06, .05))); K.mats.arena_poolR.userData.noCollide = true;
    def('arena_poolB', K.poolMat(new THREE.Color(.08, .2, .85))); K.mats.arena_poolB.userData.noCollide = true;
  }
  const poolC = (k, x, z, r, y = 0) => { const g = new THREE.PlaneGeometry(r * 2, r * 2); g.rotateX(-Math.PI / 2); put(k, g, M4(x, y + .05, z)); };
  const winBand = (len, h, x, y, z, ry) => { const g = new THREE.PlaneGeometry(len, h), uv = g.attributes.uv; for (let i = 0; i < 4; i++) uv.setX(i, uv.getX(i) * len / 8); put('arena_win', g, M4(x, y, z, 0, ry, 0)); };

  /* ───── the bay water must not show inside the pits: punch a hole in the shared water plane ───── */
  const water = scene.children.find((o) => o.isMesh && o.geometry?.parameters?.width === 9000);
  if (water) {
    const m = water.material, x0 = d.x + PX0 - .5, x1 = d.x + PX1 + .5, z0 = d.z - PZ - .5, z1 = d.z + PZ + .5;
    const prev = m.onBeforeCompile.bind(m), prevKey = m.customProgramCacheKey.bind(m);
    m.onBeforeCompile = (sh, r) => {
      prev(sh, r);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vArenaW;').replace('#include <project_vertex>', '#include <project_vertex>\nvArenaW = (modelMatrix * vec4(transformed, 1.0)).xz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vArenaW;').replace('void main() {', `void main() {\nif (vArenaW.x > ${x0.toFixed(1)} && vArenaW.x < ${x1.toFixed(1)} && vArenaW.y > ${z0.toFixed(1)} && vArenaW.y < ${z1.toFixed(1)}) discard;`);
    };
    m.customProgramCacheKey = () => prevKey() + '|arenaHole'; m.needsUpdate = true;
  }

  /* ───── exterior: pier, bridge, cranes ───── */
  function bollard(x, z) { cyl('steel', .26, .7, x, .35, z, 0, 0, 0, 10); cyl('steel', .36, .12, x, .76, z, 0, 0, 0, 10); }
  function dockCrane(x, z, ry) {   // portal harbour crane with a luffed lattice boom along local +x
    withFrame(x, 0, z, ry, () => {
      for (const a of [-4, 4]) for (const b of [-4, 4]) box('arena_rust', .8, 11, .8, a, 5.5, b);
      for (const b of [-4, 4]) { box('arena_rust', 8.8, .9, .9, 0, 11, b); strut('arena_rust', [-4, 1, b], [4, 10.5, b], .12, 6); }
      for (const a of [-4, 4]) box('arena_rust', .9, .9, 8.8, a, 11, 0);
      box('arena_rust', 7, 4, 6, -.5, 13.5, 0); box('steelL', 7.3, .25, 6.3, -.5, 15.6, 0);
      box('paintW', 2.2, 2, 2.2, 3.6, 13, 2.4); box('win', 2.25, .8, 2.25, 3.6, 13.4, 2.4);
      const apex = [-1.5, 24, 0];
      strut('arena_rust', [-3.5, 15.6, -2.6], apex, .3, 8); strut('arena_rust', [-3.5, 15.6, 2.6], apex, .3, 8); strut('arena_rust', [1.5, 15.6, 0], apex, .25, 8);
      const a = 1.0, Lb = 28, tip = [2.5 + Lb * Math.cos(a), 14.5 + Lb * Math.sin(a)];
      const P = (t, e) => [2.5 + (tip[0] - 2.5) * t, 14.5 + (tip[1] - 14.5) * t, e * (1.2 - .9 * t)];
      for (const e of [-1, 1]) strut('arena_rust', P(0, e), P(1, e), .26, 8);
      for (let i = 0; i < 9; i++) strut('arena_rust', P(i / 9, i % 2 ? 1 : -1), P((i + 1) / 9, i % 2 ? -1 : 1), .09, 5);
      strut('steelL', apex, [tip[0], tip[1], 0], .05, 4); strut('steelL', [tip[0], tip[1], 0], [tip[0], 6.2, 0], .04, 4);
      box('yel', .8, 1, .6, tip[0], 5.6, 0); torus('steelL', .3, .07, Math.PI * 1.4, tip[0], 4.8, 0, 0, 0, 0);
      beacon(tip[0], tip[1] + .7, 0, .5); beacon(apex[0], apex[1] + .6, 0, .4);
    });
  }

  function pier() {
    // deck around the hall (interior floors close the rest) + bridge from the quay (x=330 → local −170)
    box('arena_deck', 49.5, 1.5, 230, -125.25, -.75, 0);
    box('arena_deck', 29.5, 1.5, 230, 135.25, -.75, 0);
    for (const s of [-1, 1]) box('arena_deck', 221, 1.5, 40.5, 10, -.75, s * 94.75);
    box('arena_deck', 20, 1.5, 26, -160, -.75, -10);
    box('concD', 2, 6, 24, -160, -4.5, -10);
    railSeg(-169.5, -23, -150, -23, 0); railSeg(-169.5, 3, -150, 3, 0);
    for (const x of [-166, -154]) { K.lamp(x, -22.4, 8, { spot: false, dir: 0, arm: 1.2 }); K.lamp(x, 2.4, 8, { spot: false, dir: Math.PI, arm: 1.2 }); }
    // kerb lines, bollards, piles
    for (const s of [-1, 1]) {
      box('lineY', 300, .1, .3, 0, .03, s * 114.6);
      for (let x = -144; x <= 144; x += 12) { bollard(x, s * 113.6); cyl('concD', .7, 6, x, -4.5, s * 114.2, 0, 0, 0, 10); }
    }
    box('lineY', .3, .1, 230, 149.6, .03, 0); box('lineY', .3, .1, 90, -149.6, .03, -70); box('lineY', .3, .1, 110, -149.6, .03, 60);
    for (let z = -108; z <= 108; z += 12) {
      cyl('concD', .7, 6, 149.2, -4.5, z, 0, 0, 0, 10); bollard(148.6, z);
      cyl('concD', .7, 6, -149.2, -4.5, z, 0, 0, 0, 10); if (z < -26 || z > 6) bollard(-148.6, z);
    }
    for (let i = 0; i < 14; i++) { const t = R(); cyl('tire', .55, .5, -150 + t * 300, -.9, (i % 2 ? 1 : -1) * 115.1, Math.PI / 2, 0, 0, 12); }
    // harbour cranes on the aprons, booms over the bay
    dockCrane(-40, 96, K.ang(0, 1)); dockCrane(65, 96, K.ang(0, 1)); dockCrane(10, -96, K.ang(0, -1)); dockCrane(132, 40, 0);
    // forecourt: lamps along the approach, guard hut, barriers, containers, crates, a few weeds/trees
    for (const x of [-142, -126, -110]) { K.lamp(x, -26, 10, { spot: false, dir: 0 }); K.lamp(x, 14, 10, { spot: false, dir: Math.PI }); }
    withFrame(-114, 0, -20, 0, () => { box('paintW', 3.2, 2.8, 2.6, 0, 1.4, 0); box('steel', 3.6, .2, 3, 0, 2.9, 0); box('win', 3.24, .9, 1.8, 0, 1.8, 0); box('glowY', .2, .1, .2, -1.7, 2.6, 0); });
    for (const z of [-17, -5, 5]) { box('haz', .6, .9, 2.8, -132, .45, z); }
    [['contR', -138, -96], ['contB', -138, -92.5], ['contG', -138, -89], ['contR', -130, -96], ['contG', -138, 92], ['contB', -130, 92], ['contR', -40, -108], ['contG', 70, 108]].forEach(([k, x, z], i) => K.container(k, x, 0, z, i % 3 ? 0 : .04));
    K.container('contB', -138, 2.6, -92.5, .03); K.container('contR', -138, 2.6, 92, -.02);
    K.crateStack(-120, 40, 5); K.crateStack(-122, -46, 3); K.generator(-118, 60, Math.PI / 2); K.gasCylinders(-126, -60);
    for (let i = 0; i < 6; i++) cyl('cone', .25, .7, -104 - i * 1.6, .35, 11 + (i % 2) * .6, 0, 0, 0, 10, .04);
    for (const [x, z] of [[-146, -110], [-147, 104], [146, -60], [140, 110], [-60, 112], [100, -112]]) ctx.tree(x, z, .7 + R() * .3, 0);
  }

  /* ───── exterior: the black hall ───── */
  function shell() {
    const cx = (BX0 + BX1) / 2, L = BX1 - BX0;
    // walls (door opening 18 × 16 m in the west wall)
    box('arena_clad', 1, BH, 66, BX0, BH / 2, -42); box('arena_clad', 1, BH, 66, BX0, BH / 2, 42); box('arena_clad', 1, 24, 18, BX0, 28, 0);
    box('arena_clad', 1, BH, 151, BX1, BH / 2, 0);
    for (const s of [-1, 1]) box('arena_clad', L + 1, BH, 1, cx, BH / 2, s * BZ);
    box('arena_cladD', L + 2, .8, 152, cx, BH + .4, 0);
    // ribs + cornice
    for (let x = BX0 + 5; x < BX1; x += 10) for (const s of [-1, 1]) box('arena_cladD', 1.2, BH + .6, .8, x, BH / 2 + .3, s * (BZ + .9));
    for (let z = -70; z <= 70; z += 10) { box('arena_cladD', .8, BH + .6, 1.2, BX1 + .9, BH / 2 + .3, z); if (Math.abs(z) > 15) box('arena_cladD', .8, BH + .6, 1.2, BX0 - .9, BH / 2 + .3, z); }
    for (const s of [-1, 1]) { box('arena_cladD', L + 3, 1.2, .6, cx, BH + 1.4, s * (BZ + .9)); box('arena_cladD', .6, 1.2, 152, s > 0 ? BX1 + .9 : BX0 - .9, BH + 1.4, 0); box('steel', L + 2, .5, .4, cx, 2.2, s * (BZ + 1.3)); }
    // giant sliding door: two leaves parked open, top track, hazard jambs
    for (const s of [-1, 1]) {
      box('arena_cladD', .6, 16.6, 9.6, BX0 - 1.4, 8.3, s * 13.8);
      for (let y = 1.5; y < 16; y += 2) box('steelL', .1, .15, 9.6, BX0 - 1.75, y, s * 13.8);
      box('haz', .3, 16, .7, BX0 - .7, 8, s * 9.35);
      box('arena_red', .2, .3, .3, BX0 - .9, 16.6, s * 7.5);
    }
    box('steel', .5, .6, 42, BX0 - 1.4, 16.9, 0);
    box('steel', 1.8, .4, 21, BX0 - 1.1, 16.2, 0);
    // warm window bands: control rooms on the long sides, offices in the west corners, a few east
    for (const s of [-1, 1]) for (const y of [9, 18]) for (const xc of [-82, -52, -22, 8]) winBand(16, 2.2, xc, y + 1.8, s * (BZ + .56), s > 0 ? 0 : Math.PI);
    for (const s of [-1, 1]) for (const y of [4.2, 9.8, 15.4, 24]) winBand(40, 2.2, BX0 - .56, y, s * 50, -Math.PI / 2);
    for (const s of [-1, 1]) for (const y of [5, 11]) winBand(32, 2.2, BX1 + .56, y, s * 48, Math.PI / 2);
    // roller shutters + wall packs + ivy on the long sides
    for (const s of [-1, 1]) {
      for (const x of [-60, -20, 30, 80]) { box('grille', 6, 6, .3, x, 3, s * (BZ + .6)); box('haz', 6.4, .4, .4, x, 6.2, s * (BZ + .7)); }
      for (let x = BX0 + 10; x < BX1; x += 20) { box('glowY', .8, .3, .5, x, 7, s * (BZ + .9)); pool(x, s * (BZ + 5), 5, true); }
    }
    for (let z = -60; z <= 60; z += 20) if (Math.abs(z) > 15) { box('glowY', .5, .3, .8, BX0 - .9, 7, z); pool(BX0 - 5, z, 5, true); }
    for (let i = 0; i < 9; i++) {
      const s = i % 2 ? 1 : -1, x = BX0 + 8 + R() * (BX1 - BX0 - 16), h = 6 + R() * 20, w = 3 + R() * 6;
      box('ivy', w, h, .5, x, h / 2, s * (BZ + 1.4));
    }
    box('ivy', .5, 22, 9, BX0 - 1.4, 11, -68); box('ivy', .5, 13, 6, BX0 - 1.4, 6.5, 64); box('ivy', .5, 9, 7, BX1 + 1.4, 4.5, -30);
    // sawtooth roof monitors (glazing faces east), parapet gear, corner beacons
    const tri = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(11, 0), new THREE.Vector2(11, 4)]);
    const rz = Math.atan2(4, 11), sl = Math.hypot(11, 4);
    for (let x0 = BX0 + 6; x0 < BX1 - 12; x0 += 15) for (const zc of [-36, 36]) {
      box('arena_cladD', sl, .3, 64, x0 + 5.5, BH + .8 + 2, zc, 0, rz);
      box('arena_sky', .25, 4, 64, x0 + 11, BH + .8 + 2, zc);
      for (const ze of [zc - 32, zc + 31.8]) put('arena_cladD', new THREE.ExtrudeGeometry(tri, { depth: .2, bevelEnabled: false }), M4(x0, BH + .8, ze));
    }
    for (let i = 0; i < 8; i++) K.acUnit(BX0 + 12 + i * 26, BH + .8, (i % 2 ? 1 : -1) * 70, 0);
    for (let i = 0; i < 6; i++) box('roofG', 4 + R() * 8, .1, 3 + R() * 6, BX0 + 10 + R() * 200, BH + .85, R() < .5 ? -1.5 : 1.5);
    for (const x of [BX0, BX1]) for (const s of [-1, 1]) beacon(x, BH + 2.6, s * BZ, .8);
  }

  /* ───── interior pieces ───── */
  function booth(x, z, col, big) {   // gate cabinet, glowing panel faces the platform (−x)
    const h = big ? 2.6 : 2.2;
    box('steel', 1.1, h, 1.5, x, h / 2, z); box('steelL', 1.16, .1, 1.56, x, h + .05, z);
    box(col, .04, big ? 1.3 : .55, big ? .9 : .7, x - .57, 1.5, z);
    box(col, 1.12, .06, 1.52, x, h - .22, z);
    if (big) { box(col, .04, .7, .5, x + .57, 1.7, z); box('steelL', .06, 1.1, .06, x + .56, .55, z); }
    else if (R() < .5) box('glowC', .03, .06, .2, x - .57, .9, z);
  }
  function gateRow() {   // pit edge: big booths flank each beam head, small cabinets between
    const X = PX0 - 1.2, cols = ['arena_red', 'arena_blue'];
    const edges = [-PZ, ...BEAMS.flatMap((z) => [z - 2.4, z + 2.4]), PZ];
    BEAMS.forEach((zb, i) => {
      const c = cols[i % 2];
      booth(X, zb - 1.65, c, true); booth(X, zb + 1.65, c, true);
      poolC(i % 2 ? 'arena_poolB' : 'arena_poolR', X - 2.6, zb, 3.2);
      box('haz', .5, .02, 3, PX0 + .3, .011, zb);
    });
    for (let i = 0; i < edges.length; i += 2) {
      const a = edges[i] + (i ? 0 : .05), b = edges[i + 1], n = Math.max(1, Math.round((b - a) / 1.8));
      for (let j = 0; j < n; j++) { const z = a + (j + .5) * (b - a) / n, k = (i / 2 + j) % 3; booth(X, z, k === 0 ? 'arena_red' : k === 1 ? 'arena_blue' : 'steelL', false); }
    }
  }
  function pits() {
    box('arena_concD', 1, 23.8, 2 * PZ + 2, PX0 - .5, PY + 11.9, 0);
    for (const s of [-1, 1]) box('arena_concD', PX1 - PX0 + 1, 23.8, 1, (PX0 + PX1) / 2 - .5, PY + 11.9, s * (PZ + .5));
    box('arena_concD', PX1 - PX0 + 2, 1, 2 * PZ + 3, (PX0 + PX1) / 2, PY - .5, 0);
    for (let x = -60; x < 40; x += 20) for (const s of [-1, 1]) box('glowY', .5, .3, .15, x, -6, s * (PZ - .1));
    // beams: deep blades on piers (8 m passages at the bottom), edge marker lights, red/blue head posts
    BEAMS.forEach((zb, i) => {
      const L = PX1 - PX0, xc = (PX0 + PX1) / 2, col = i % 2 ? 'arena_blue' : 'arena_red';
      box('arena_conc', L, 21, 3, xc, -10.5, zb);
      for (let x = PX0 + 3; x < PX1 + 3; x += 14) box('arena_concD', 6, 4.2, 3, x, PY + 2.1, zb);
      for (let x = PX0 + 2; x <= PX1 - 2; x += 5) for (const s of [-1, 1]) box('glowC', .14, .1, .14, x, .05, zb + s * 1.38);
      for (const s of [-1, 1]) { box('steel', .12, .9, .12, PX0 + .6, .45, zb + s * 1.3); box(col, .22, .22, .22, PX0 + .6, 1.0, zb + s * 1.3); box(col, .18, .18, .18, PX1 - 1, .3, zb + s * 1.3); }
      for (const x of [-55, -25, 5, 35]) for (const s of [-1, 1]) box('glowY', .4, .25, .12, x, -3, zb + s * 1.56);
      for (const x of [-40, 0, 30]) { strut('steel', [x, BH - .2, zb], [x, 27, zb], .02, 3); cyl('steel', .5, .4, x, 26.8, zb, 0, 0, 0, 10, .12); cyl('glow', .45, .04, x, 26.58, zb, 0, 0, 0, 10); }
    });
    // fog layers (additive, scrolled in an update)
    for (const [y, k] of [[-23, 'arena_fogA'], [-20, 'arena_fogA'], [-16.5, 'arena_fogA'], [-13, 'arena_fogB'], [-9, 'arena_fogB'], [-5, 'arena_fogB']])
      plane(k, PX1 - PX0 + 6, 2 * PZ, (PX0 + PX1) / 2 + 3, y, 0, 0, -Math.PI / 2);
    // stairs out of the two edge pits up to the side floors
    for (const s of [-1, 1]) {
      const L = stairs(-60, s * 53.9, 1, 0, PY, 0, 1.6);
      box('grate', 2.4, .1, 2.6, -60 + L + 1.1, -.05, s * 54.2);
      railSeg(PX0, s * PZ, -60 + L - .4, s * PZ, 0); railSeg(-60 + L + 2.4, s * PZ, PX1 - 6, s * PZ, 0);
    }
  }
  function farWall() {   // tall dark bays at the beam ends, upper ledge with lights
    const x0 = PX1 - 6, xc = PX1;   // block spans x 38..50
    const zs = [-PZ - 1, ...BEAMS.flatMap((z) => [z - 4, z + 4]), PZ + 1];
    for (let i = 0; i < zs.length; i += 2) box('arena_concD', 12, 47, zs[i + 1] - zs[i], xc, PY + 23.5, (zs[i] + zs[i + 1]) / 2);
    BEAMS.forEach((zb) => {
      box('arena_concD', 12, 6, 8, xc, 19, zb);
      box('arena_void', 6, 41, 8, xc + 3, PY + 20.5, zb);
      beacon(x0 - .3, 16.6, zb, .3);
      for (const s of [-1, 1]) box('glow', .1, .35, 1, x0 - .05, 21, zb + s * 2.5);
    });
    box('arena_concD', 1, BH, 2 * BZ - 1, xc + 6.5, BH / 2, 0);
    railSeg(x0, -PZ, x0, PZ, 22);
    for (let z = -54; z <= 54; z += 4) box('glowC', .12, .1, .12, x0 + .3, 22.05, z);
  }
  function ctrlRoom(xc, y, s) {   // 16 m glass control room against the outer wall, door 5 m east of centre
    const L = 16, z0 = s * 66, zc = s * 70.25, dx = xc + 5;
    box('arena_concD', L, .35, 8.5, xc, y + 3.55, zc);
    for (const e of [-1, 1]) box('arena_concD', .3, 3.4, 8.5, xc + e * L / 2, y + 1.7, zc);
    for (const [a, b] of [[xc - L / 2, dx - .8], [dx + .8, xc + L / 2]]) box('arena_glass', b - a, 3.2, .06, (a + b) / 2, y + 1.6, z0);
    for (let x = xc - L / 2 + 2; x < xc + L / 2; x += 2) if (Math.abs(x - dx) > 1) box('steel', .08, 3.4, .1, x, y + 1.7, z0);
    box('steel', L, .2, .14, xc, y + 3.3, z0); box('steel', .1, 3.4, .14, dx - .85, y + 1.7, z0); box('steel', .1, 3.4, .14, dx + .85, y + 1.7, z0);
    for (let i = 0; i < 4; i++) {
      const x = xc - 6 + i * 3.4; if (Math.abs(x - dx) < 1.8) continue;
      box('steelL', 2.4, .8, .9, x, y + .4, s * 67.3);
      box('glowC', .7, .45, .05, x - .55, y + 1.12, s * 67.5); box(i % 2 ? 'arena_blue' : 'glowC', .7, .45, .05, x + .45, y + 1.12, s * 67.5);
    }
    box('arena_warm', L - 2, .05, .4, xc, y + 3.34, zc - s * 1.5); box('arena_warm', L - 2, .05, .4, xc, y + 3.34, zc + s * 2);
    for (const x of [xc - 6.2, xc - 4.8, xc + 2]) K.cabinet(x, y, s * 73.9, s > 0 ? Math.PI : 0);
  }
  function gallery(s) {   // north (s=−1) / south (s=+1) side: columns, two gallery levels, rooms, stairs
    const xa = BX0 + .5, xb = 36, zEdge = s * 64;
    for (let x = -90; x <= 30; x += 15) box('arena_conc', 1.2, 33, 1.2, x, 16.5, s * 64.6);
    for (let x = -85; x <= 35; x += 15) box('arena_concD', 1.2, BH, 1.2, x, BH / 2, s * 73.9);
    for (const y of [9, 18]) {
      box('arena_conc', xb - xa, .6, 10.5, (xa + xb) / 2, y - .3, s * 69.25);
      box('haz', xb - xa, .04, .3, (xa + xb) / 2, y + .02, s * 64.2);
      railSeg(xb, zEdge, xb, s * 74.4, y);
      for (const xc of [-82, -52, -22, 8]) ctrlRoom(xc, y, s);
      for (let x = -92; x < xb; x += 15) { box('glow', 1.4, .08, .4, x, y - .65, s * 69); pool(x, s * 69, 3.6, false, y - 9); }
    }
    // flight A 0→9 (x −70..−56.5), flight B 9→18 (x −40..−26.5), landings onto the slabs
    const zs = s * 63.2;
    const LA = stairs(-70, zs, 1, 0, 0, 9, 1.6), LB = stairs(-40, zs, 1, 0, 9, 18, 1.6);
    box('grate', 2.2, .1, 1.6, -70 + LA + 1.1, 8.95, zs); box('grate', 2.2, .1, 1.6, -41.1, 8.95, zs); box('grate', 2.2, .1, 1.6, -40 + LB + 1.1, 17.95, zs);
    railSeg(-70 + LA, s * 62.4, -70 + LA + 2.2, s * 62.4, 9); railSeg(-42.2, s * 62.4, -40, s * 62.4, 9); railSeg(-40 + LB, s * 62.4, -40 + LB + 2.2, s * 62.4, 18);
    railSeg(-42.2, s * 62.4, -42.2, zEdge, 9); railSeg(-40 + LB + 2.2, s * 62.4, -40 + LB + 2.2, zEdge, 18); railSeg(-70 + LA + 2.2, s * 62.4, -70 + LA + 2.2, zEdge, 9);
    railSeg(xa, zEdge, -70 + LA - .2, zEdge, 9); railSeg(-70 + LA + 2.2, zEdge, -42.2, zEdge, 9); railSeg(-40, zEdge, xb, zEdge, 9);
    railSeg(xa, zEdge, -40 + LB - .2, zEdge, 18); railSeg(-40 + LB + 2.2, zEdge, xb, zEdge, 18);
    // hanging lamps over the side walkway, ground-floor clutter
    for (const x of [-48, -18, 0, 26]) { strut('steel', [x, BH - .2, s * 59.5], [x, 14, s * 59.5], .02, 3); cyl('steel', .6, .5, x, 13.8, s * 59.5, 0, 0, 0, 10, .15); cyl('glow', .55, .04, x, 13.53, s * 59.5, 0, 0, 0, 10); pool(x, s * 59.5, 5.5, true); }
    K.generator(-10, s * 70, 0); K.crateStack(16, s * 69, 4); K.gasCylinders(-36, s * 72.5); K.cabinet(-84, 0, s * 73.6, s > 0 ? Math.PI : 0); K.cabinet(-82.6, 0, s * 73.6, s > 0 ? Math.PI : 0);
  }
  function gantry(x, zt, hy) {   // bridge crane: twin girders across the hall, trolley + hoist at zt, hook down to hy
    for (const e of [-1.5, 1.5]) box('steel', 1, 2.2, 129.2, x + e, 35.8, 0);
    for (const s of [-1, 1]) { box('yel', 5, 1.3, 1.8, x, 35.3, s * 64.6); beacon(x + 2.6, 34.4, s * 63.4, .2); }
    box('yel', 4.4, 1.4, 3.6, x, 37.6, zt); box('steel', 2, 2.2, 2.6, x, 34, zt);
    for (const e of [-.4, .4]) strut('steelL', [x + e, 32.9, zt], [x + e, hy + .8, zt], .03, 4);
    box('yel', 1, 1.2, .6, x, hy + .3, zt); torus('steelL', .35, .08, Math.PI * 1.4, x, hy - .5, zt, 0, 0, 0);
    box('arena_red', .25, .25, .25, x - 2.3, 37.6, zt); box('arena_red', .2, .2, .2, x, 32.8, zt + 1.35);
  }
  function interior() {
    // floors: front platform (west), side floors along the pits, closed rear slab
    box('arena_conc', PX0 - BX0 + .5, 1.2, 2 * BZ - 1, (BX0 - .5 + PX0) / 2, -.6, 0);
    for (const s of [-1, 1]) box('arena_conc', 50 - PX0, 1.2, BZ - .5 - PZ, (PX0 + 50) / 2, -.6, s * (PZ + BZ - .5) / 2);
    box('arena_concD', BX1 + .5 - 50, 1.2, 2 * BZ, (50 + BX1 + .5) / 2, -.6, 0);
    pits(); gateRow(); farWall(); gallery(-1); gallery(1);
    // west wall pilasters, roof trusses, crane runways + gantries
    for (let z = -66; z <= 66; z += 12) if (Math.abs(z) > 12) box('arena_concD', 1.2, BH, 1.4, BX0 + 1.1, BH / 2, z);
    for (let x = -85; x <= 35; x += 15) {
      strut('steel', [x, BH - .4, -74.4], [x, BH - .4, 74.4], .15, 6); strut('steel', [x, 37.4, -73.5], [x, 37.4, 73.5], .15, 6);
      for (let z = -72; z < 72; z += 6) { strut('steelL', [x, 37.4, z], [x, BH - .4, z + 6], .07, 4); strut('steelL', [x, 37.4, z], [x, BH - .4, z], .06, 4); }
    }
    for (const s of [-1, 1]) { box('steel', 134, 1.4, 1, -31, 33.7, s * 64.6); box('steelL', 134, .25, .3, -31, 34.55, s * 64.6); }
    gantry(-62, -20, 18); gantry(-32, 25, 24); gantry(12, -4, 14);
    // platform: hanging lamps, props, pools
    for (let z = -54; z <= 54; z += 12) {
      strut('steel', [-86, BH - .2, z], [-86, 12, z], .02, 3); cyl('steel', .6, .5, -86, 11.8, z, 0, 0, 0, 10, .15); cyl('glow', .55, .04, -86, 11.53, z, 0, 0, 0, 10);
      pool(-86, z, 6, true);
    }
    K.generator(-95, 38, Math.PI / 2); K.crateStack(-96, -36, 4); K.gasCylinders(-97, 26); K.crateStack(-80, 66, 3);
    for (const z of [-62, -58, 58]) K.cabinet(-98.6, 0, z, Math.PI / 2);
    for (let i = 0; i < 5; i++) box(['contG', 'wall', 'contB'][i % 3], 1.2, 1, 1.2, -78 - R() * 6, .5, (R() < .5 ? -1 : 1) * (8 + R() * 42));
    box('haz', .4, .02, 18, BX0 + 1.4, .011, 0);
    // the 2 real lights: over the gates and down the beams (night only)
    K.addSpot(0xdfe8ff, 4000, 60, .6, .7, K.fpos(-86, 32, 0), K.fpos(-76, 0, 0));
    K.addSpot(0xcfe0ff, 5000, 80, .5, .8, K.fpos(-20, 36, 0), K.fpos(-6, 0, 0));
  }

  withFrame(d.x, 0, d.z, 0, () => {
    pier(); shell();
    setZone(d.id + '_in'); interior(); setZone(d.id);
    // ♣ card mural above the door
    const card = new THREE.Mesh(new THREE.PlaneGeometry(12, 18), cards.cardMaterial('J', 'C'));
    card.position.copy(K.fpos(BX0 - .62, 28, 0)); card.rotation.y = -Math.PI / 2; scene.add(card);
  });

  ctx.updates.push((dt) => { fogA.offset.x += dt * .004; fogA.offset.y += dt * .0015; fogB.offset.x -= dt * .003; fogB.offset.y += dt * .002; });
  ctx.dayNight.push((isDay) => { K.mats.arena_win.emissiveIntensity = isDay ? .25 : 1.6; K.mats.arena_sky.emissiveIntensity = isDay ? 0 : .45; });
  ctx.pois.push({ id: d.id, cam: [d.x - 270, 95, d.z + 210], tgt: [d.x, 8, d.z], spawn: [d.x - 84, .1, d.z], yaw: -Math.PI / 2 });
}
