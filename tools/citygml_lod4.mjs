// PLATEAU LOD4 building (BIM converted to CityGML: Port City Takeshiba, 東京都23区 LOD4 2023) → one GLB for
// city/takeshiba.js, in local metres around the footprint centre (y up from the ground-floor street level), turned so
// its walls run along x and z (the real building stands ~40° off north; the game's streets are a grid). Exterior surfaces are classed by their BIM names, interiors are kept for the street-level floors only:
//   glass (curtain-wall panes above the podium, opaque) · glassLow (street-level panes; a share of them is knocked out
//   so the lobby can be entered) · frame (mullions, transoms, sashes) · panel (precast / ECP / walls / parapets)
//   · alu (aluminium panels, louvres, fins, copings) · soffit (eaves, canopies, outer ceilings) · roof (roofs, terraces)
//   · floor / ceil / iwall / inst / column (rooms of the kept floors and their installations)
// Above the podium (HI m) the exterior goes to <class>Hi meshes, welded and simplified (mullion depth, trim): the tower
// keeps its silhouette and pane rhythm at a fraction of the triangles.
// Usage: node tools/citygml_lod4.mjs <in.gml> <out.glb> [keepRoomsBelow=12] [knockOut=.35]
import fs from 'node:fs';
import * as THREE from 'three';
import { Document, NodeIO } from '@gltf-transform/core';
import { weldPrimitive, simplifyPrimitive } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';

const [inp, out, keepS = '12', koS = '.35'] = process.argv.slice(2), KEEP = +keepS, KO = +koS, HI = 24;
const EXT = new Set(['glass', 'frame', 'panel', 'alu', 'soffit', 'roof']);
const txt = fs.readFileSync(inp, 'utf8');
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// footprint centre and street level from the building's ground surfaces
const outer = txt.replace(/<bldg:interiorRoom>[\s\S]*?<\/bldg:interiorRoom>/g, '');
const allPos = (s) => [...s.matchAll(/<gml:posList[^>]*>([^<]*)<\/gml:posList>/g)].flatMap((m) => m[1].trim().split(/\s+/).map(Number));
const gp = allPos((outer.match(/<bldg:GroundSurface[\s\S]*?<\/bldg:GroundSurface>/g) || []).join(''));
let la0 = Infinity, la1 = -Infinity, lo0 = Infinity, lo1 = -Infinity, H0 = Infinity;
for (let i = 0; i < gp.length; i += 3) { la0 = Math.min(la0, gp[i]); la1 = Math.max(la1, gp[i]); lo0 = Math.min(lo0, gp[i + 1]); lo1 = Math.max(lo1, gp[i + 1]); H0 = Math.min(H0, gp[i + 2]); }
const lat0 = (la0 + la1) / 2 * Math.PI / 180, lon0 = (lo0 + lo1) / 2 * Math.PI / 180;
const A = 6378137, F = 1 / 298.257222101, E2 = F * (2 - F);
const ecef = (lat, lon, h) => { const s = Math.sin(lat), N = A / Math.sqrt(1 - E2 * s * s); return [(N + h) * Math.cos(lat) * Math.cos(lon), (N + h) * Math.cos(lat) * Math.sin(lon), (N * (1 - E2) + h) * s]; };
const O = ecef(lat0, lon0, 0), sl = Math.sin(lat0), cl = Math.cos(lat0), so = Math.sin(lon0), co = Math.cos(lon0);
const local = (latd, lond, h) => {
  const [X, Y, Z] = ecef(latd * Math.PI / 180, lond * Math.PI / 180, h), dx = X - O[0], dy = Y - O[1], dz = Z - O[2];
  return [-so * dx + co * dy, cl * co * dx + cl * so * dy + sl * dz - H0, -(-sl * co * dx - sl * so * dy + cl * dz)];
};
const rings = (block) => {
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
const groups = new Map(); const G = (k) => { if (!groups.has(k)) groups.set(k, []); return groups.get(k); };
function emit(cls, poly) {
  const nr = newellRaw(poly[0]), l = Math.hypot(...nr) || 1, n = nr.map((v) => v / l);
  const ax = Math.abs(n[0]) > Math.abs(n[1]) ? (Math.abs(n[0]) > Math.abs(n[2]) ? 0 : 2) : (Math.abs(n[1]) > Math.abs(n[2]) ? 1 : 2);
  const to2 = (p) => ax === 0 ? new THREE.Vector2(p[1], p[2]) : ax === 1 ? new THREE.Vector2(p[0], p[2]) : new THREE.Vector2(p[0], p[1]);
  const pts = poly.flat(); let tris; try { tris = THREE.ShapeUtils.triangulateShape(poly[0].map(to2), poly.slice(1).map((r) => r.map(to2))); } catch (e) { return; }
  for (const [i0, i1, i2] of tris) {
    const a = pts[i0], b = pts[i1], c = pts[i2], hi = EXT.has(cls) && Math.min(a[1], b[1], c[1]) > HI, g = G(hi ? cls + 'Hi' : cls);
    // up the tower, glazing boxes (panes, mullions, transoms) only show their outward faces behind opaque glass
    if (hi && (cls === 'glass' || cls === 'frame')) { const ox = (a[0] + b[0] + c[0]) / 3, oz = (a[2] + b[2] + c[2]) / 3, ol = Math.hypot(ox, oz) || 1; if ((n[0] * ox + n[2] * oz) / ol < .35) continue; }
    const cr = [(b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])];
    for (const p of cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] < 0 ? [a, c, b] : [a, b, c]) g.push(p[0], p[1], p[2]);
  }
}
// a pane: upright, and wider and taller than a mullion
const pane = (r) => { const n = newellRaw(r), l = Math.hypot(...n) || 1; if (Math.abs(n[1] / l) > .3) return false;
  const tx = -n[2], tz = n[0], tl = Math.hypot(tx, tz) || 1, us = r.map((q) => (q[0] * tx + q[2] * tz) / tl), ys = r.map((q) => q[1]);
  return Math.max(...us) - Math.min(...us) > .5 && Math.max(...ys) - Math.min(...ys) > .5; };
const GLAZED = /^(CW|PCカーテンウォール|SSW|DS|CS|39階テラスサッシ|建具)/, ALU = /^(アルミ|外周ルーバー|F1|笠木|庇金物|目隠しルーバー|K1)/, SOFFIT = /^(軒天|天井|大庇|小庇|下端)/;
const nameOf = (b) => ((b.match(/^\s*<gml:name>([^<]*)</) || [])[1] || '').trim();
let knocked = 0;
function exterior(type, b) {
  const name = nameOf(b), polys = rings(b);
  for (const p of polys) {
    let cls;
    if (type === 'RoofSurface' || type === 'OuterFloorSurface') cls = 'roof';
    else if (type === 'OuterCeilingSurface' || SOFFIT.test(name)) cls = 'soffit';
    else if (GLAZED.test(name)) {
      if (!pane(p[0])) cls = 'frame';
      else if (Math.max(...p[0].map((q) => q[1])) < 8) { if (rnd() < KO) { knocked++; continue; } cls = 'glassLow'; }   // street-level storefront glass
      else cls = 'glass';
    } else if (ALU.test(name)) cls = 'alu';
    else cls = 'panel';
    emit(cls, p);
  }
}
const blocks = (s, tag) => [...s.matchAll(new RegExp(`<bldg:${tag}[\\s>][\\s\\S]*?<\\/bldg:${tag}>`, 'g'))].map((m) => m[0].replace(new RegExp(`^<bldg:${tag}[^>]*>`), ''));
for (const t of ['WallSurface', 'RoofSurface', 'OuterFloorSurface', 'OuterCeilingSurface']) for (const b of blocks(outer, t)) exterior(t, b);
for (const b of blocks(outer, 'BuildingInstallation')) exterior('Installation', b);
for (const b of blocks(outer, 'IntBuildingInstallation')) exterior('Installation', b);   // curtain-wall PC units listed as interior installations

// rooms on the kept floors
const SHAFT = /^(EV|PS|DS|PS\/DS|ダンパー)/;
let kept = 0;
for (const m of txt.matchAll(/<bldg:Room gml:id="[^"]*">([\s\S]*?)<\/bldg:Room>/g)) {
  const r = m[1], name = nameOf(r), pos = allPos(r); let h = Infinity; for (let i = 2; i < pos.length; i += 3) h = Math.min(h, pos[i]);
  if (h - H0 > KEEP || SHAFT.test(name)) continue;
  kept++;
  for (const b of blocks(r, 'InteriorWallSurface')) for (const p of rings(b)) emit('iwall', p);
  for (const b of blocks(r, 'FloorSurface')) for (const p of rings(b)) emit('floor', p);
  for (const b of blocks(r, 'CeilingSurface')) for (const p of rings(b)) emit('ceil', p);
  for (const b of blocks(r, 'IntBuildingInstallation')) { const n = nameOf(b), cls = /^(C\d|PC)/.test(n) ? 'column' : /^W/.test(n) ? 'iwall' : /^F/.test(n) ? 'floor' : 'inst'; for (const p of rings(b)) emit(cls, p); }
}

// square the building to the game's street grid: the dominant wall direction (length-weighted, mod 90°) becomes +x
let best = 0, PHI = 0; { const bins = new Float64Array(90);
  for (const b of blocks(outer, 'GroundSurface')) for (const [r] of rings(b)) for (let i = 0; i < r.length; i++) { const a = r[i], c = r[(i + 1) % r.length], L = Math.hypot(c[0] - a[0], c[2] - a[2]); bins[Math.floor(((Math.atan2(c[2] - a[2], c[0] - a[0]) * 180 / Math.PI) % 90 + 90) % 90)] += L; }
  for (let k = 0; k < 90; k++) { const w = bins[k] + .5 * (bins[(k + 1) % 90] + bins[(k + 89) % 90]); if (w > best) { best = w; PHI = (k + .5) * Math.PI / 180; } }
  if (PHI > Math.PI / 4) PHI -= Math.PI / 2; }
{ const c = Math.cos(PHI), s = Math.sin(PHI); for (const p of groups.values()) for (let i = 0; i < p.length; i += 3) { const x = p[i], z = p[i + 2]; p[i] = x * c + z * s; p[i + 2] = -x * s + z * c; } }
// open floor spots for set dressing on the street level: on a floor triangle, ≥ 2.2 m from anything standing at
// body height (walls, columns, fittings, glass, facade), ≥ 5 m apart → <out>_spots.js [x, z, clearance] (model coords)
const spots = []; {
  const segs = [], CELL = 4, grid = new Map(), key = (i, j) => i + ',' + j;
  for (const cls of ['iwall', 'column', 'inst', 'glassLow', 'frame', 'panel', 'alu']) { const p = groups.get(cls) || [];
    for (let i = 0; i < p.length; i += 9) { const ys = [p[i + 1], p[i + 4], p[i + 7]]; if (Math.max(...ys) < .3 || Math.min(...ys) > 2.2) continue;
      for (const [a, b] of [[0, 3], [3, 6], [6, 0]]) { const sg = [p[i + a], p[i + a + 2], p[i + b], p[i + b + 2]]; segs.push(sg);
        for (let gi = Math.floor(Math.min(sg[0], sg[2]) / CELL); gi <= Math.floor(Math.max(sg[0], sg[2]) / CELL); gi++) for (let gj = Math.floor(Math.min(sg[1], sg[3]) / CELL); gj <= Math.floor(Math.max(sg[1], sg[3]) / CELL); gj++) { const k = key(gi, gj); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(sg); } } } }
  const clearance = (x, z) => { let d = 9; for (let gi = Math.floor((x - 9) / CELL); gi <= Math.floor((x + 9) / CELL); gi++) for (let gj = Math.floor((z - 9) / CELL); gj <= Math.floor((z + 9) / CELL); gj++) for (const [ax, az, bx, bz] of grid.get(key(gi, gj)) || []) {
    const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz, t = L ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L)) : 0; d = Math.min(d, Math.hypot(x - ax - t * dx, z - az - t * dz)); } return d; };
  const fl = (groups.get('floor') || []), onFloor = (x, z) => { for (let i = 0; i < fl.length; i += 9) { if (fl[i + 1] > 1) continue;
    const [ax, az, bx, bz, cx, cz] = [fl[i], fl[i + 2], fl[i + 3], fl[i + 5], fl[i + 6], fl[i + 8]], d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz), u = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / d, v = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / d;
    if (u >= 0 && v >= 0 && u + v <= 1) return true; } return false; };
  const cand = []; for (let x = -90; x < 90; x += 2.5) for (let z = -90; z < 90; z += 2.5) { const jx = x + rnd() * 1.5, jz = z + rnd() * 1.5; if (!onFloor(jx, jz)) continue; const c = clearance(jx, jz); if (c >= 2.2) cand.push([jx, jz, c]); }
  cand.sort((a, b) => b[2] - a[2]);
  for (const c of cand) if (spots.length < 48 && spots.every((q) => Math.hypot(q[0] - c[0], q[1] - c[1]) >= 5)) spots.push(c.map((v) => +v.toFixed(2)));
}
fs.writeFileSync(out.replace(/\.glb$/, '_spots.js'), `// generated by tools/citygml_lod4.mjs: open street-level floor spots [x, z, clearance m] in model coordinates
export default ${JSON.stringify(spots)};
`);
const doc = new Document(), buf = doc.createBuffer(), scene = doc.createScene('lod4'), summary = {};
await MeshoptSimplifier.ready;
for (const [cls, p] of groups) {
  const prim = doc.createPrimitive().setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(p)).setBuffer(buf)).setMaterial(doc.createMaterial(cls));
  if (cls.endsWith('Hi')) { weldPrimitive(prim, { tolerance: .002 }); simplifyPrimitive(prim, { simplifier: MeshoptSimplifier, ratio: .25, error: .0015 }); }
  scene.addChild(doc.createNode(cls).setMesh(doc.createMesh(cls).addPrimitive(prim)));
  const ix = prim.getIndices(); summary[cls] = (ix ? ix.getCount() : prim.getAttribute('POSITION').getCount()) / 3;
}
await new NodeIO().write(out, doc);
let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, y1 = -Infinity;
for (const p of groups.values()) for (let i = 0; i < p.length; i += 3) { x0 = Math.min(x0, p[i]); x1 = Math.max(x1, p[i]); y1 = Math.max(y1, p[i + 1]); z0 = Math.min(z0, p[i + 2]); z1 = Math.max(z1, p[i + 2]); }
console.log(JSON.stringify({ spots: spots.length, centre: [(la0 + la1) / 2, (lo0 + lo1) / 2], streetLevel: H0, squaredBy: +(PHI * 180 / Math.PI).toFixed(1), roomsKept: kept, knocked, tris: summary, total: Object.values(summary).reduce((a, b) => a + b, 0), bounds: [x0, z0, x1, z1].map((v) => +v.toFixed(1)), top: +y1.toFixed(1) }));
