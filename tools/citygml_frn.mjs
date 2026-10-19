// PLATEAU CityGML street furniture (frn:CityFurniture, LOD3 / LOD1) → one GLB in map metres for city/realbldg.js.
// Real Shibuya is a valley, the game is flat: a terrain estimate (road paint lies on the road, poles stand on the
// ground) is subtracted from every vertex, small objects are set down on their own foot, road paint is laid flat.
// Classes (one mesh each): paint (lines, crosswalks, road text) · tactile · manhole (one 0–1 UV quad per lid) ·
// guard (pedestrian fences ≤ 1.4 m) · wall (taller walls) · pole (concrete poles) · steel (lights, sign posts,
// delineators, subway entrance frames, bus stops) · signal (signal masts and heads) · box (ground transformer boxes)
// · signB / signR / signW (sign plates: guide + instruction blue, regulatory red, auxiliary / signboards white)
// Usage: node tools/citygml_frn.mjs <out.glb> <lat0> <lon0> <refX,refZ> <x0,z0,x1,z1> -- <frn.gml> [...] [++ <bldg.gml> ...]
//   (building files only feed the terrain estimate: every building's base is a ground sample)
import fs from 'node:fs';
import * as THREE from 'three';
import { Document, NodeIO } from '@gltf-transform/core';

const argv = process.argv.slice(2), dd = argv.indexOf('--');
const [out, lat0s, lon0s, refS, rectS] = argv.slice(0, dd), pp = argv.indexOf('++'), files = argv.slice(dd + 1, pp < 0 ? undefined : pp), bfiles = pp < 0 ? [] : argv.slice(pp + 1);
const [RX, RZ] = refS.split(',').map(Number), rect = rectS.split(',').map(Number);
const { DISTRICTS, onLand } = await import('data:text/javascript,' + encodeURIComponent(fs.readFileSync(new URL('../city/map.js', import.meta.url), 'utf8')));
const inDist = (x0, z0, x1, z1, pad) => DISTRICTS.some((d) => x1 > d.x - d.w / 2 - pad && x0 < d.x + d.w / 2 + pad && z1 > d.z - d.d / 2 - pad && z0 < d.z + d.d / 2 + pad);
const lat0 = +lat0s * Math.PI / 180, lon0 = +lon0s * Math.PI / 180;
const A = 6378137, F = 1 / 298.257222101, E2 = F * (2 - F);
const ecef = (lat, lon, h) => { const s = Math.sin(lat), N = A / Math.sqrt(1 - E2 * s * s); return [(N + h) * Math.cos(lat) * Math.cos(lon), (N + h) * Math.cos(lat) * Math.sin(lon), (N * (1 - E2) + h) * s]; };
const O = ecef(lat0, lon0, 0), sl = Math.sin(lat0), cl = Math.cos(lat0), so = Math.sin(lon0), co = Math.cos(lon0);
const toMap = (latd, lond, h) => {   // → map [x east, y up, z south]
  const [X, Y, Z] = ecef(latd * Math.PI / 180, lond * Math.PI / 180, h), dx = X - O[0], dy = Y - O[1], dz = Z - O[2];
  return [-so * dx + co * dy + RX, cl * co * dx + cl * so * dy + sl * dz, -(-sl * co * dx - sl * so * dy + cl * dz) + RZ];
};
const rings = (block) => {
  const polys = [];
  for (const pm of block.matchAll(/<gml:Polygon[\s\S]*?<\/gml:Polygon>/g)) {
    const rs = [];
    for (const m of pm[0].matchAll(/<gml:posList[^>]*>([^<]*)<\/gml:posList>/g)) {
      const v = m[1].trim().split(/\s+/).map(Number), r = [];
      for (let i = 0; i + 2 < v.length; i += 3) r.push(toMap(v[i], v[i + 1], v[i + 2]));
      if (r.length > 3 && r[0].every((c, k) => Math.abs(c - r[r.length - 1][k]) < 1e-6)) r.pop();
      if (r.length >= 3) rs.push(r);
    }
    if (rs.length) polys.push(rs);
  }
  return polys;
};
const newellRaw = (r) => { let x = 0, y = 0, z = 0; for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length]; x += (a[1] - b[1]) * (a[2] + b[2]); y += (a[2] - b[2]) * (a[0] + b[0]); z += (a[0] - b[0]) * (a[1] + b[1]); } return [x, y, z]; };
const newell = (r) => { const [x, y, z] = newellRaw(r), l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };

// ── read every feature
const feats = [];
for (const f of files) {
  const txt = fs.readFileSync(f, 'utf8');
  for (const m of txt.matchAll(/<frn:CityFurniture gml:id="[^"]*">([\s\S]*?)<\/frn:CityFurniture>/g)) {
    const b = m[1], fn = +((b.match(/<frn:function[^>]*>(\d+)</) || [])[1] || 0);
    const g = (b.match(/<frn:lod3Geometry>[\s\S]*?<\/frn:lod3Geometry>/) || b.match(/<frn:lod1Geometry>[\s\S]*?<\/frn:lod1Geometry>/) || [''])[0];
    const polys = rings(g); if (!polys.length) continue;
    const pts = polys.flat(2); let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); z0 = Math.min(z0, p[2]); z1 = Math.max(z1, p[2]); }
    if (x0 < rect[0] + 1 || x1 > rect[2] - 1 || z0 < rect[1] + 1 || z1 > rect[3] - 1 || inDist(x0, z0, x1, z1, 3)) continue;
    if (!onLand((x0 + x1) / 2, (z0 + z1) / 2)) continue;
    feats.push({ fn, polys, x0, x1, z0, z1, y0, y1 });
  }
}
const PAINT = new Set([1000, 1010, 1020, 1030, 1040, 1110, 1120, 1200]), GROUNDED = new Set([4200, 4800, 4900, 3110, 3130, 3140, 3150, 8010, 5610, 8150]);

// ── terrain estimate on an 8 m grid: road paint vertices + the feet of poles; empty cells take their neighbours' mean
const TS = 8, TW = Math.ceil((rect[2] - rect[0]) / TS) + 1, TH = Math.ceil((rect[3] - rect[1]) / TS) + 1;
const sum = new Float64Array(TW * TH), cnt = new Float64Array(TW * TH);
const sample = (x, z, y, w = 1) => { const i = Math.round((x - rect[0]) / TS), j = Math.round((z - rect[1]) / TS); if (i >= 0 && j >= 0 && i < TW && j < TH) { sum[j * TW + i] += y * w; cnt[j * TW + i] += w; } };
for (const f of feats) {
  if (PAINT.has(f.fn)) for (const p of f.polys.flat(2)) sample(p[0], p[2], p[1]);
  else if (f.fn === 4800 || f.fn === 4200) sample((f.x0 + f.x1) / 2, (f.z0 + f.z1) / 2, f.y0, 4);
}
for (const f of bfiles) for (const m of fs.readFileSync(f, 'utf8').matchAll(/<bldg:Building gml:id="[^"]*">([\s\S]*?)<\/bldg:Building>/g)) {   // building bases
  let y0 = Infinity, sx = 0, sz = 0, n = 0;
  const solid = (m[1].match(/<bldg:lod1Solid>[\s\S]*?<\/bldg:lod1Solid>/) || [''])[0];   // LOD0 footprints carry no height
  for (const pl of solid.matchAll(/<gml:posList[^>]*>([^<]*)<\/gml:posList>/g)) { const v = pl[1].trim().split(/\s+/).map(Number); for (let i = 0; i + 2 < v.length; i += 3) { const p = toMap(v[i], v[i + 1], v[i + 2]); y0 = Math.min(y0, p[1]); sx += p[0]; sz += p[2]; n++; } }
  if (n) sample(sx / n, sz / n, y0, 2);
}
let T = new Float64Array(TW * TH).fill(NaN); for (let k = 0; k < T.length; k++) if (cnt[k]) T[k] = sum[k] / cnt[k];
for (let it = 0, left = 1; left && it < 400; it++) {   // grow known cells outwards
  const N = T.slice(); left = 0;
  for (let j = 0; j < TH; j++) for (let i = 0; i < TW; i++) {
    if (!Number.isNaN(T[j * TW + i])) continue; let s = 0, n = 0;
    for (const [u, v] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const a = i + u, b = j + v; if (a >= 0 && b >= 0 && a < TW && b < TH && !Number.isNaN(T[b * TW + a])) { s += T[b * TW + a]; n++; } }
    if (n) N[j * TW + i] = s / n; else left++;
  }
  T = N;
}
const ground = (x, z) => {   // bilinear
  const fx = Math.min(TW - 1.001, Math.max(0, (x - rect[0]) / TS)), fz = Math.min(TH - 1.001, Math.max(0, (z - rect[1]) / TS)), i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j;
  const t = (a, b) => T[b * TW + a];
  return (t(i, j) * (1 - u) + t(i + 1, j) * u) * (1 - v) + (t(i, j + 1) * (1 - u) + t(i + 1, j + 1) * u) * v;
};

// ── emit
const groups = new Map(); const G = (k) => { if (!groups.has(k)) groups.set(k, { p: [], uv: [] }); return groups.get(k); };
let fenceH = 1;
function emit(cls, poly, yOf) {   // triangulate one polygon (map coords) with y mapped through yOf, metre UVs (guard: u per 2 m panel, v 0–1 over the fence)
  const n = newell(poly[0]), wall = Math.abs(n[1]) < .5, tx = -n[2], tz = n[0], tl = Math.hypot(tx, tz) || 1;
  const ax = Math.abs(n[0]) > Math.abs(n[1]) ? (Math.abs(n[0]) > Math.abs(n[2]) ? 0 : 2) : (Math.abs(n[1]) > Math.abs(n[2]) ? 1 : 2);
  const to2 = (p) => ax === 0 ? new THREE.Vector2(p[1], p[2]) : ax === 1 ? new THREE.Vector2(p[0], p[2]) : new THREE.Vector2(p[0], p[1]);
  const pts = poly.flat(); let tris; try { tris = THREE.ShapeUtils.triangulateShape(poly[0].map(to2), poly.slice(1).map((r) => r.map(to2))); } catch (e) { return; }
  const g = G(cls);
  for (const [i0, i1, i2] of tris) {
    const a = pts[i0], b = pts[i1], c = pts[i2];
    const cr = [(b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])];
    for (const p of cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] < 0 ? [a, c, b] : [a, b, c]) {
      const y = yOf(p), u = wall ? (p[0] * tx + p[2] * tz) / tl : p[0]; g.p.push(p[0], y, p[2]);
      if (cls === 'guard') g.uv.push(u / 2, y / fenceH); else g.uv.push(u, wall ? y : p[2]);
    }
  }
}
const upright = (f) => f.y1 - f.y0 > 3 && Math.max(f.x1 - f.x0, f.z1 - f.z0) < 1.5;   // 柱 also holds mast arms and stubs
const POLES = feats.filter((f) => f.fn === 4800 && upright(f)).map((f) => [(f.x0 + f.x1) / 2, (f.z0 + f.z1) / 2, f.y0]);
const SIGN = { 3110: 'signB', 3140: 'signB', 3130: 'signR', 3150: 'signW', 9001: 'signW', 9000: 'signW', 4300: 'signW', 8010: 'signW' };
const tally = {};
for (const f of feats) {
  tally[f.fn] = (tally[f.fn] || 0) + 1;
  const big = Math.max(f.x1 - f.x0, f.z1 - f.z0) > 3, foot = f.y0, onFoot = (p) => p[1] - foot, onGround = (p) => p[1] - ground(p[0], p[2]);
  // long fences / walls are vertical extrusions: each vertex drops to the bottom of its own column
  const col = new Map(), ck = (p) => Math.round(p[0] * 5) + ',' + Math.round(p[2] * 5);
  if (big) for (const p of f.polys.flat(2)) col.set(ck(p), Math.min(col.get(ck(p)) ?? Infinity, p[1]));
  const onColumn = (p) => { const b = col.get(ck(p)); return b !== undefined && p[1] - b > .05 || b === p[1] ? p[1] - b : onGround(p); };
  // sign plates, signal heads and mast arms hang on separate upright 柱 poles: measure from the nearest one's foot
  const hang = (r) => { const cx = (f.x0 + f.x1) / 2, cz = (f.z0 + f.z1) / 2; let best = null, bd = r * r;
    for (const q of POLES) { const d = (q[0] - cx) ** 2 + (q[1] - cz) ** 2; if (d < bd) { bd = d; best = q; } }
    return best ? (p) => p[1] - best[2] : onGround; };
  if (PAINT.has(f.fn) || f.fn === 8150) {   // flat on the asphalt
    for (const poly of f.polys) if (newell(poly[0])[1] > .7) emit(f.fn === 8150 ? 'tactile' : 'paint', poly, () => f.fn === 8150 ? .1 : .072);
    continue;
  }
  if (f.fn === 5610) {   // manhole lid: a 0–1 UV quad at the lid's centre, sized to its footprint
    const cx = (f.x0 + f.x1) / 2, cz = (f.z0 + f.z1) / 2, r = Math.max(.3, Math.min(.5, Math.max(f.x1 - f.x0, f.z1 - f.z0) / 2)), g = G('manhole');
    for (const [u, v] of [[0, 0], [1, 1], [1, 0], [0, 0], [0, 1], [1, 1]]) { g.p.push(cx + (u - .5) * 2 * r, .075, cz + (v - .5) * 2 * r); g.uv.push(u, v); }
    continue;
  }
  if (f.fn === 7300 || f.fn === 4203 || f.fn === 5200 && f.y1 - f.y0 > 3) continue;   // ditches (below grade), statues
  const yOf = f.fn === 4900 ? hang(12) : f.fn === 4800 && !upright(f) ? hang(8) : SIGN[f.fn] && f.fn !== 9001 && f.fn !== 8010 ? hang(3) : big ? onColumn : onFoot;
  const h = f.y1 - f.y0;
  for (const poly of f.polys) {
    let cls;
    if (f.fn === 2000) { cls = h <= 1.4 ? 'guard' : 'wall'; fenceH = Math.max(.5, h); }
    else if (f.fn === 4800) cls = 'pole';
    else if (f.fn === 4900) cls = 'signal';
    else if (f.fn === 5200) cls = 'box';
    else if (SIGN[f.fn]) cls = Math.abs(newell(poly[0])[1]) < .3 ? SIGN[f.fn] : 'steel';   // upright faces are the plate, edges steel
    else cls = 'steel';
    emit(cls, poly, yOf);
  }
}
const doc = new Document(), buf = doc.createBuffer(), scene = doc.createScene('frn'), summary = {};
for (const [cls, { p, uv }] of groups) {
  const prim = doc.createPrimitive().setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(p)).setBuffer(buf))
    .setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(new Float32Array(uv)).setBuffer(buf)).setMaterial(doc.createMaterial(cls));
  scene.addChild(doc.createNode(cls).setMesh(doc.createMesh(cls).addPrimitive(prim))); summary[cls] = p.length / 9;
}
await new NodeIO().write(out, doc);
let tmin = Infinity, tmax = -Infinity; for (const t of T) { tmin = Math.min(tmin, t); tmax = Math.max(tmax, t); }
console.log(JSON.stringify({ features: feats.length, byFunction: tally, tris: summary, terrain: [tmin.toFixed(1), tmax.toFixed(1)] }));
