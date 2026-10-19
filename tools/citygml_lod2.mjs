// PLATEAU CityGML (bldg, LOD2 boundary surfaces or LOD1 solids) → one GLB of real building massing in local metres.
// Coordinates: lat/lon/height (EPSG:6697) → east/up/south metres around a reference point (x east, y up, z south);
// every building's base is put at y = 0 (the scene is flat). Triangles are grouped into facade classes so the scene's
// own materials (windows with interior mapping, shopfront strips, roof coatings) apply:
//   roof0-3 (coating / grey / tar / rust sheet) · glass (towers ≥ 60 m) · office (offices/commercial) · tile (housing,
//   small mixed; house = their long faces) · shop (ground-floor band 0–4 m of offices/commercial/mixed housing) · inst (rooftop installations)
//   para (parapets on flat roofs) · unit (rooftop AC units) · pent (stair / lift penthouses)
// UVs are in metres: walls u = along the wall, v = height above the base; roofs u = x, v = z.
// It also writes <out>_ground.js for city/index.js: real open space (parks, plazas, empty lots) as lawn rectangles with
// trees, found by a morphological opening of the space between the footprints; everything else stays asphalt.
// Usage: node tools/citygml_lod2.mjs <out.glb> <lat0> <lon0> <refX,refZ> <x0,z0,x1,z1> -- <gml> [<gml> ...]
//   (lat0, lon0) lands on map point ref; the rect (map metres) is the real zone. Buildings must lie inside it, on land
//   and clear of the hand-built districts of city/map.js.
import fs from 'node:fs';
import * as THREE from 'three';
import { Document, NodeIO } from '@gltf-transform/core';

const argv = process.argv.slice(2), dd = argv.indexOf('--');
const [out, lat0s, lon0s, refS, rectS] = argv.slice(0, dd), files = argv.slice(dd + 1);
const [RX, RZ] = refS.split(',').map(Number), rect = rectS.split(',').map(Number);
const { DISTRICTS, onLand } = await import('data:text/javascript,' + encodeURIComponent(fs.readFileSync(new URL('../city/map.js', import.meta.url), 'utf8')));
const inDist = (x0, z0, x1, z1, pad) => DISTRICTS.some((d) => x1 > d.x - d.w / 2 - pad && x0 < d.x + d.w / 2 + pad && z1 > d.z - d.d / 2 - pad && z0 < d.z + d.d / 2 + pad);
const lat0 = +lat0s * Math.PI / 180, lon0 = +lon0s * Math.PI / 180;
const A = 6378137, F = 1 / 298.257222101, E2 = F * (2 - F);
const ecef = (lat, lon, h) => { const s = Math.sin(lat), N = A / Math.sqrt(1 - E2 * s * s); return [(N + h) * Math.cos(lat) * Math.cos(lon), (N + h) * Math.cos(lat) * Math.sin(lon), (N * (1 - E2) + h) * s]; };
const O = ecef(lat0, lon0, 0), sl = Math.sin(lat0), cl = Math.cos(lat0), so = Math.sin(lon0), co = Math.cos(lon0);
const local = (latd, lond, h) => {   // → [x east, y up, z south]
  const [X, Y, Z] = ecef(latd * Math.PI / 180, lond * Math.PI / 180, h), dx = X - O[0], dy = Y - O[1], dz = Z - O[2];
  const e = -so * dx + co * dy, n = -sl * co * dx - sl * so * dy + cl * dz, u = cl * co * dx + cl * so * dy + sl * dz;
  return [e, u, -n];
};
let seed = 1; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const OFFICE = new Set(['401', '402', '403', '404', '421', '422', '431', '441']), MIXED = new Set(['413', '414']);
const groups = new Map(); const G = (k) => { if (!groups.has(k)) groups.set(k, { p: [], uv: [] }); return groups.get(k); };
const rings = (block) => {   // polygons → [exterior, ...interiors] as arrays of [x,y,z]
  const polys = [];
  for (const pm of block.matchAll(/<gml:Polygon[\s\S]*?<\/gml:Polygon>/g)) {
    const rs = [];
    for (const m of pm[0].matchAll(/<gml:posList[^>]*>([^<]*)<\/gml:posList>/g)) {
      const v = m[1].trim().split(/\s+/).map(Number), r = [];
      for (let i = 0; i + 2 < v.length; i += 3) r.push(local(v[i], v[i + 1], v[i + 2]));
      if (r.length > 3 && r[0].every((c, k) => Math.abs(c - r[r.length - 1][k]) < 1e-6)) r.pop();
      if (r.length >= 3) rs.push(r);
    }
    if (rs.length) polys.push(rs);
  }
  return polys;
};
const newellRaw = (r) => { let x = 0, y = 0, z = 0; for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length]; x += (a[1] - b[1]) * (a[2] + b[2]); y += (a[2] - b[2]) * (a[0] + b[0]); z += (a[0] - b[0]) * (a[1] + b[1]); } return [x, y, z]; };
const newell = (r) => { const [x, y, z] = newellRaw(r), l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };
const inRing = (r, x, z) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if ((a[2] > z) !== (b[2] > z) && x < (b[0] - a[0]) * (z - a[2]) / (b[2] - a[2]) + a[0]) c = !c; } return c; };
// keep the part of a polygon ring above (keep=1) or below (keep=−1) the plane y = Y (Sutherland–Hodgman)
const clipY = (r, Y, keep) => { const o = [], inside = (p) => keep > 0 ? p[1] >= Y : p[1] <= Y;
  for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length], ia = inside(a), ib = inside(b);
    if (ia) o.push(a); if (ia !== ib) { const t = (Y - a[1]) / (b[1] - a[1]); o.push([a[0] + (b[0] - a[0]) * t, Y, a[2] + (b[2] - a[2]) * t]); } }
  return o; };
function emit(cls, poly, base) {   // triangulate one polygon (with holes) into a class, base-relative, metre UVs
  const n = newell(poly[0]), wall = Math.abs(n[1]) < .5, tx = -n[2], tz = n[0], tl = Math.hypot(tx, tz) || 1;
  const ax = Math.abs(n[0]) > Math.abs(n[1]) ? (Math.abs(n[0]) > Math.abs(n[2]) ? 0 : 2) : (Math.abs(n[1]) > Math.abs(n[2]) ? 1 : 2);
  const to2 = (p) => ax === 0 ? new THREE.Vector2(p[1], p[2]) : ax === 1 ? new THREE.Vector2(p[0], p[2]) : new THREE.Vector2(p[0], p[1]);
  const pts = poly.flat(), c2 = poly[0].map(to2), h2 = poly.slice(1).map((r) => r.map(to2));
  let tris; try { tris = THREE.ShapeUtils.triangulateShape(c2, h2); } catch (e) { return; }
  const g = G(cls);
  for (const t of tris) {
    let [i0, i1, i2] = t; const a = pts[i0], b = pts[i1], c = pts[i2];
    const cr = [(b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])];
    const order = cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] < 0 ? [a, c, b] : [a, b, c];   // keep the surface normal outward
    for (const p of order) { g.p.push(p[0], p[1] - base, p[2]); g.uv.push(wall ? (p[0] * tx + p[2] * tz) / tl : p[0], wall ? p[1] - base : p[2]); }
  }
}
const face = (cls, r, base, want) => { const n = newellRaw(r); emit(cls, [n[0] * want[0] + n[1] * want[1] + n[2] * want[2] < 0 ? [...r].reverse() : r], base); };
function boxAt(cls, x, y, z, w, h, d, ry, base) {   // a closed box (no bottom) standing on y, turned by ry
  const c = Math.cos(ry), s = Math.sin(ry), P = (u, v, t) => [x + u * c + t * s, y + v, z - u * s + t * c], W = w / 2, D = d / 2;
  const q = [P(-W, 0, -D), P(W, 0, -D), P(W, 0, D), P(-W, 0, D)], up = q.map((p) => [p[0], p[1] + h, p[2]]);
  face(cls, up, base, [0, 1, 0]);
  for (let i = 0; i < 4; i++) { const a = q[i], b = q[(i + 1) % 4], m = [(a[0] + b[0]) / 2 - x, 0, (a[2] + b[2]) / 2 - z]; face(cls, [a, b, up[(i + 1) % 4], up[i]], base, m); }
}
// flat roofs get a parapet (outer face, inner face .25 m in, coping) and some rooftop plant
function roofKit(poly, base, height, kind, inner) {
  const r = poly[0], N = newell(r); if (N[1] < .97 || height < 6) return;   // pitched roofs and sheds: none
  const y = r.reduce((s, p) => s + p[1], 0) / r.length, ph = height > 30 ? 1.2 : .9, T = .25;
  for (let i = 0; i < r.length; i++) {
    const a = r[i], b = r[(i + 1) % r.length], dx = b[0] - a[0], dz = b[2] - a[2], L = Math.hypot(dx, dz); if (L < .3) continue;
    if (inner(a, b, y)) continue;   // shared with another roof part, or at the foot of a taller block
    const ox = -dz / L, oz = dx / L;   // d × up: outward for an upward-facing ring
    const ai = [a[0] - ox * T, y, a[2] - oz * T], bi = [b[0] - ox * T, y, b[2] - oz * T], A0 = [a[0], y, a[2]], B0 = [b[0], y, b[2]];
    const up = (p) => [p[0], p[1] + ph, p[2]];
    face('para', [A0, B0, up(B0), up(A0)], base, [ox, 0, oz]);
    face('para', [bi, ai, up(ai), up(bi)], base, [-ox, 0, -oz]);
    face('para', [up(A0), up(B0), up(bi), up(ai)], base, [0, 1, 0]);
  }
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity; for (const p of r) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[2]); z1 = Math.max(z1, p[2]); }
  const area = Math.abs(newellRaw(r)[1]) / 2; if (area < 90) return;
  let ry = 0; { let best = 0; for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length], L = Math.hypot(b[0] - a[0], b[2] - a[2]); if (L > best) { best = L; ry = -Math.atan2(b[2] - a[2], b[0] - a[0]); } } }   // align plant with the longest edge
  const clear = (x, z, m) => [[0, 0], [m, 0], [-m, 0], [0, m], [0, -m], [m, m], [-m, -m], [m, -m], [-m, m]].every(([u, v]) => inRing(r, x + u, z + v));
  const spot = (m) => { for (let k = 0; k < 30; k++) { const x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0); if (clear(x, z, m)) return [x, z]; } return null; };
  if (height > 14 && kind !== 'tile') { const s = spot(3.5); if (s) boxAt('pent', s[0], y, s[1], 4 + rnd() * 2, 3 + rnd() * .6, 3 + rnd() * 2, ry, base); }   // stair / lift house
  const n = Math.min(6, Math.floor(area / 140) + (rnd() < .5 ? 1 : 0));
  for (let k = 0; k < n; k++) {
    const s = spot(2.2); if (!s) continue;
    if (rnd() < .25 && kind !== 'glass') boxAt('unit', s[0], y, s[1], 2.2, 2.2 + rnd() * .8, 2.2, ry, base);   // FRP water tank
    else { const m = 1 + Math.floor(rnd() * 3); for (let j = 0; j < m; j++) boxAt('unit', s[0] + (j - (m - 1) / 2) * 1.1 * Math.cos(ry), y, s[1] - (j - (m - 1) / 2) * 1.1 * Math.sin(ry), .95, .9, .45, ry, base); }   // AC condensers in a row
  }
}

// footprint raster for the ground (2 m cells over the zone): 1 = building, 2 = not ours (district, water, outside)
const CS = 2, GW = Math.ceil((rect[2] - rect[0]) / CS), GH = Math.ceil((rect[3] - rect[1]) / CS), grid = new Uint8Array(GW * GH);
for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) { const x = rect[0] + (i + .5) * CS, z = rect[1] + (j + .5) * CS; if (!onLand(x, z) || inDist(x, z, x, z, 2)) grid[j * GW + i] = 2; }
const stamp = (r, v = 1) => {   // mark a footprint ring (local coords) as v
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity; for (const p of r) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[2]); z1 = Math.max(z1, p[2]); }
  for (let j = Math.max(0, Math.floor((z0 + RZ - rect[1]) / CS)); j <= Math.min(GH - 1, Math.floor((z1 + RZ - rect[1]) / CS)); j++)
    for (let i = Math.max(0, Math.floor((x0 + RX - rect[0]) / CS)); i <= Math.min(GW - 1, Math.floor((x1 + RX - rect[0]) / CS)); i++)
      if (!grid[j * GW + i] && inRing(r, rect[0] + (i + .5) * CS - RX, rect[1] + (j + .5) * CS - RZ)) grid[j * GW + i] = v;
};

let nb = 0, kept = 0;
for (const f of files) {
  const txt = fs.readFileSync(f, 'utf8');
  for (const bm of txt.matchAll(/<bldg:Building gml:id="[^"]*">([\s\S]*?)<\/bldg:Building>/g)) {
    nb++; const b = bm[1];
    const usage = (b.match(/<bldg:usage[^>]*>(\d+)</) || [])[1] || '', H = +((b.match(/<bldg:measuredHeight[^>]*>([\d.]+)</) || [])[1] || 0);
    const surf = (tag) => [...b.matchAll(new RegExp(`<bldg:${tag}[\\s>][\\s\\S]*?<\\/bldg:${tag}>`, 'g'))].flatMap((m) => rings(m[0]));
    let roofs = surf('RoofSurface'), walls = surf('WallSurface'), grounds = surf('GroundSurface'); const inst = surf('BuildingInstallation');
    if (!roofs.length) {   // no LOD2: classify the LOD1 solid by normal
      const solid = (b.match(/<bldg:lod1Solid>[\s\S]*?<\/bldg:lod1Solid>/) || [''])[0]; roofs = []; walls = []; grounds = [];
      for (const p of rings(solid)) { const ny = newell(p[0])[1]; (ny > .5 ? roofs : ny < -.5 ? grounds : walls).push(p); }
    }
    const all = [...roofs, ...walls, ...grounds].flat(2); if (!all.length) continue;
    let base = Infinity, top = -Infinity, x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const p of all) { base = Math.min(base, p[1]); top = Math.max(top, p[1]); x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[2]); z1 = Math.max(z1, p[2]); }
    const W0 = x0 + RX, W1 = x1 + RX, Z0 = z0 + RZ, Z1 = z1 + RZ;   // map-space bounds
    const cx = (W0 + W1) / 2, cz = (Z0 + Z1) / 2; if (cx < rect[0] || cx > rect[2] || cz < rect[1] || cz > rect[3]) continue;
    // the whole building inside the zone (3 m into the kerb of the edge road at most), clear of the hand-built districts,
    // on land; a building that is not leaves its footprint as an empty lot (coin parking on a cleared site)
    if (W0 < rect[0] - 3 || W1 > rect[2] + 3 || Z0 < rect[1] - 3 || Z1 > rect[3] + 3 || inDist(W0, Z0, W1, Z1, 4) || ![[W0, Z0], [W1, Z0], [W0, Z1], [W1, Z1]].every(([x, z]) => onLand(x, z))) {
      for (const p of roofs.length ? roofs : grounds) stamp(p[0], 3); continue;
    }
    kept++;
    const height = Math.max(H, top - base), kind = height >= 60 ? 'glass' : OFFICE.has(usage) || height >= 18 ? 'office' : 'tile';
    const cls = kind + (kept * 7919 % (kind === 'glass' ? 2 : 3));   // facade variant per building (glass0-1, office0-2, tile0-2)
    const roof = 'roof' + (kind === 'tile' ? [1, 2, 3, 3, 2][kept % 5] : [0, 1, 1, 2, 0][kept % 5]);   // coating / grey / tar / rust sheet
    const band = height > 7 && (OFFICE.has(usage) || MIXED.has(usage)) ? 4 : 0;   // shopfront band on the street floor
    // roof edges that are not the building's outline: shared by two roof parts, or the bottom edge of a wall rising above
    const ek = (a, b) => { const k1 = Math.round(a[0] * 5) + ',' + Math.round(a[2] * 5), k2 = Math.round(b[0] * 5) + ',' + Math.round(b[2] * 5); return k1 < k2 ? k1 + '|' + k2 : k2 + '|' + k1; };
    const edges = new Map(), add = (a, b, y, up) => { const k = ek(a, b); if (!edges.has(k)) edges.set(k, []); edges.get(k).push([y, up]); };
    for (const p of roofs) { const r = p[0]; for (let i = 0; i < r.length; i++) add(r[i], r[(i + 1) % r.length], (r[i][1] + r[(i + 1) % r.length][1]) / 2, 0); }
    for (const p of walls) { const r = p[0], my = Math.max(...r.map((q) => q[1]));
      for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length]; if (Math.abs(a[1] - b[1]) < .3 && my > a[1] + .5) add(a, b, a[1], 1); } }
    const inner = (a, b, y) => { const e = edges.get(ek(a, b)) || []; return e.filter(([ey, up]) => Math.abs(ey - y) < .4 && !up).length > 1 || e.some(([ey, up]) => up && Math.abs(ey - y) < .4); };
    for (const p of roofs) { emit(roof, p, base); roofKit(p, base, height, kind, inner); stamp(p[0]); }
    for (const p of grounds) stamp(p[0]);
    for (const p of walls) {
      let wc = cls;   // housing: balcony fronts on the long faces, the tiled side-wall look on short ones
      if (kind === 'tile') { const n = newell(p[0]), tl = Math.hypot(n[0], n[2]) || 1, us = p[0].map((q) => (q[0] * -n[2] + q[2] * n[0]) / tl); if (Math.max(...us) - Math.min(...us) >= 7) wc = 'house' + cls.slice(-1); }
      if (!band) { emit(wc, p, base); continue; }
      const up = clipY(p[0], base + band, 1), low = clipY(p[0], base + band, -1);   // holes are rare on walls: split the exterior only
      if (up.length >= 3) emit(wc, [up], base); if (low.length >= 3) emit('shop', [low], base);
    }
    for (const p of inst) emit('inst', p, base);
  }
}
const doc = new Document(), buf = doc.createBuffer(), scene = doc.createScene('bldg'), summary = {};
for (const [cls, { p, uv }] of groups) {
  const prim = doc.createPrimitive().setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(p)).setBuffer(buf))
    .setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(new Float32Array(uv)).setBuffer(buf)).setMaterial(doc.createMaterial(cls));
  scene.addChild(doc.createNode(cls).setMesh(doc.createMesh(cls).addPrimitive(prim))); summary[cls] = p.length / 9;
}
await new NodeIO().write(out, doc);

// ground: chamfer distance to the nearest obstacle; open cores (≥ R from everything) grown back by R − 4 m are lawns
const dist = (src, edge) => { const d = new Float32Array(GW * GH); for (let k = 0; k < d.length; k++) d[k] = src(k) ? 0 : 1e9;   // edge: distance value beyond the zone
  const at = (i, j) => i < 0 || j < 0 || i >= GW || j >= GH ? edge : d[j * GW + i];
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) { const k = j * GW + i; d[k] = Math.min(d[k], at(i - 1, j) + 1, at(i, j - 1) + 1, at(i - 1, j - 1) + 1.414, at(i + 1, j - 1) + 1.414); }
  for (let j = GH - 1; j >= 0; j--) for (let i = GW - 1; i >= 0; i--) { const k = j * GW + i; d[k] = Math.min(d[k], at(i + 1, j) + 1, at(i, j + 1) + 1, at(i + 1, j + 1) + 1.414, at(i - 1, j + 1) + 1.414); }
  return d; };
const R = 22 / CS, dObs = dist((k) => grid[k] > 0, 0), dCore = dist((k) => dObs[k] >= R, 1e9);   // the zone edge is a street
const lawn = new Uint8Array(GW * GH); for (let k = 0; k < lawn.length; k++) lawn[k] = !grid[k] && dCore[k] <= R - 4 / CS ? 1 : 0;
if (process.env.GROUND_DEBUG) {   // RGB raster for checking: buildings grey, lots blue, outside red, lawn green, asphalt black
  const px = Buffer.alloc(GW * GH * 3); for (let k = 0; k < GW * GH; k++) { const c = grid[k] === 1 ? [150, 150, 150] : grid[k] === 3 ? [90, 90, 160] : grid[k] === 2 ? [120, 30, 30] : lawn[k] ? [60, 160, 60] : [20, 20, 24]; px.set(c, k * 3); }
  fs.writeFileSync(process.env.GROUND_DEBUG, Buffer.concat([Buffer.from(`P6 ${GW} ${GH} 255\n`), px]));
}
const merge = (on) => { const rects = [], used = new Uint8Array(GW * GH);   // greedy merge of cells into rectangles
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
    if (!on(j * GW + i) || used[j * GW + i]) continue;
    let w = 1; while (i + w < GW && on(j * GW + i + w) && !used[j * GW + i + w]) w++;
    let h = 1; grow: while (j + h < GH) { for (let u = 0; u < w; u++) if (!on((j + h) * GW + i + u) || used[(j + h) * GW + i + u]) break grow; h++; }
    for (let v = 0; v < h; v++) for (let u = 0; u < w; u++) used[(j + v) * GW + i + u] = 1;
    rects.push([rect[0] + i * CS, rect[1] + j * CS, rect[0] + (i + w) * CS, rect[1] + (j + h) * CS]);
  }
  return rects; };
const rects = merge((k) => lawn[k]), lots = merge((k) => grid[k] === 3);
let trees = [];   // jittered 8 m grid on lawn cells at least 4 m from any wall
for (let z = rect[1]; z < rect[3]; z += 8) for (let x = rect[0]; x < rect[2]; x += 8) {
  const tx = x + rnd() * 8, tz = z + rnd() * 8, i = Math.floor((tx - rect[0]) / CS), j = Math.floor((tz - rect[1]) / CS);
  if (i < GW && j < GH && lawn[j * GW + i] && dObs[j * GW + i] >= 4 / CS && rnd() < .6) trees.push([tx, tz, .8 + rnd() * .55]);
}
while (trees.length > 420) trees.splice(Math.floor(rnd() * trees.length), 1);
const r1 = (v) => Math.round(v * 10) / 10;
fs.writeFileSync(out.replace(/\.glb$/, '_ground.js'), `// generated by tools/citygml_lod2.mjs from PLATEAU footprints: open-space lawns and cleared lots [x0,z0,x1,z1], trees [x,z,scale], map metres\nexport default ${JSON.stringify({ lawns: rects, lots, trees: trees.map((t) => t.map(r1)) })};\n`);
console.log(JSON.stringify({ buildings: nb, kept, tris: summary, lawns: rects.length, lots: lots.length, lawnArea: rects.reduce((s, r) => s + (r[2] - r[0]) * (r[3] - r[1]), 0), trees: trees.length }));
