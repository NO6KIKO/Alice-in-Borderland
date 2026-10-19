// Convert PLATEAU underground-mall (地下街, uro:UndergroundBuilding LOD4.1) 3D Tiles 1.0 into one GLB in local metres.
// Each .b3dm glb uses CESIUM_RTC (ECEF centre) + Draco; we strip the extension, decode, bake every vertex
// ECEF → ENU around a reference point (three.js: x = east, y = up, z = −north), and group triangles by the
// CityGML surface type from the batch table, one mesh/material per type, so materials can be assigned in the scene.
// Usage: node tools/ubld_convert.mjs <dir with .b3dm> <out.glb> <lat0> <lon0> [groundEllipsoidH]
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO, Document } from '@gltf-transform/core';
import { KHRDracoMeshCompression } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';

const [dir, out, lat0s, lon0s, h0s] = process.argv.slice(2);
const lat0 = +lat0s * Math.PI / 180, lon0 = +lon0s * Math.PI / 180;
const io = new NodeIO().registerExtensions([KHRDracoMeshCompression]).registerDependencies({ 'draco3d.decoder': await draco3d.createDecoderModule() });

// WGS84 / GRS80 (same to < 0.1 mm here)
const A = 6378137, F = 1 / 298.257222101, E2 = F * (2 - F);
const ecef = (lat, lon, h) => { const s = Math.sin(lat), N = A / Math.sqrt(1 - E2 * s * s); return [(N + h) * Math.cos(lat) * Math.cos(lon), (N + h) * Math.cos(lat) * Math.sin(lon), (N * (1 - E2) + h) * s]; };
const O = ecef(lat0, lon0, 0), sl = Math.sin(lat0), cl = Math.cos(lat0), so = Math.sin(lon0), co = Math.cos(lon0);
const enu = (x, y, z) => { const dx = x - O[0], dy = y - O[1], dz = z - O[2];
  return [-so * dx + co * dy, -sl * co * dx - sl * so * dy + cl * dz, cl * co * dx + cl * so * dy + sl * dz]; };   // e, n, u

function readB3dm(file) {
  const b = fs.readFileSync(file), dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const total = dv.getUint32(8, true), ftj = dv.getUint32(12, true), ftb = dv.getUint32(16, true), btj = dv.getUint32(20, true), btb = dv.getUint32(24, true);
  let o = 28 + ftj + ftb; const bt = btj ? JSON.parse(b.subarray(o, o + btj).toString('utf8')) : {}; o += btj + btb;
  // patch the glb JSON chunk: drop CESIUM_RTC, keep its centre
  const g = Buffer.from(b.subarray(o, total)), gv = new DataView(g.buffer, g.byteOffset, g.byteLength);
  const jl = gv.getUint32(12, true), json = JSON.parse(g.subarray(20, 20 + jl).toString('utf8'));
  const rtc = json.extensions?.CESIUM_RTC?.center || [0, 0, 0];
  if (json.extensions) delete json.extensions.CESIUM_RTC;
  for (const k of ['extensionsUsed', 'extensionsRequired']) if (json[k]) json[k] = json[k].filter((e) => e !== 'CESIUM_RTC');
  let js = Buffer.from(JSON.stringify(json), 'utf8'); const pad = (4 - js.length % 4) % 4; js = Buffer.concat([js, Buffer.alloc(pad, 0x20)]);
  const rest = g.subarray(20 + jl), head = Buffer.alloc(20);
  head.writeUInt32LE(0x46546C67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(20 + js.length + rest.length, 8); head.writeUInt32LE(js.length, 12); head.writeUInt32LE(0x4E4F534A, 16);
  return { glb: Buffer.concat([head, js, rest]), rtc, types: bt.feature_type || [] };
}

const SKIP = new Set(['Room', 'ClosureSurface', 'RoofSurface', 'GroundSurface']);
const groups = new Map();   // feature type → { pos: [], nrm: [] }
let minU = Infinity, maxU = -Infinity, tris = 0;
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.b3dm'));
for (const f of files) {
  const { glb, rtc, types } = readB3dm(path.join(dir, f));
  const doc = await io.readBinary(new Uint8Array(glb));
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh(); if (!mesh) continue;
    const M = node.getWorldMatrix();
    for (const prim of mesh.listPrimitives()) {
      const P = prim.getAttribute('POSITION'), B = prim.getAttribute('_BATCHID'), I = prim.getIndices();
      const n = I ? I.getCount() : P.getCount(), p = [0, 0, 0], q = [];
      for (let t = 0; t < n; t += 3) {
        const tri = [], ids = [];
        for (let k = 0; k < 3; k++) {
          const vi = I ? I.getScalar(t + k) : t + k; P.getElement(vi, p);
          // node matrix, then glTF Y-up → 3D Tiles Z-up, then + RTC centre (ECEF)
          const x = M[0] * p[0] + M[4] * p[1] + M[8] * p[2] + M[12], y = M[1] * p[0] + M[5] * p[1] + M[9] * p[2] + M[13], z = M[2] * p[0] + M[6] * p[1] + M[10] * p[2] + M[14];
          const [e, nn, u] = enu(x + rtc[0], -z + rtc[1], y + rtc[2]);
          tri.push(e, u, -nn); ids.push(B ? B.getScalar(vi) : 0);
          minU = Math.min(minU, u); maxU = Math.max(maxU, u);
        }
        const type = (types[ids[0]] || 'unknown').replace(/^uro:|^bldg:/, '');
        if (SKIP.has(type)) continue;   // room volumes, virtual closures and the outer roof/ground shell are not drawn
        if (!groups.has(type)) groups.set(type, { pos: [] });
        groups.get(type).pos.push(...tri); tris++;
      }
    }
  }
}
// ground reference: the top of the structure (RoofSurface ≈ street level) unless given
const h0 = h0s !== undefined ? +h0s : maxU;
const outDoc = new Document(), buf = outDoc.createBuffer(), scene = outDoc.createScene('ubld');
const summary = {};
for (const [type, { pos }] of groups) {
  const a = new Float32Array(pos); for (let i = 1; i < a.length; i += 3) a[i] -= h0;
  const prim = outDoc.createPrimitive().setAttribute('POSITION', outDoc.createAccessor().setType('VEC3').setArray(a).setBuffer(buf))
    .setMaterial(outDoc.createMaterial(type));
  scene.addChild(outDoc.createNode(type).setMesh(outDoc.createMesh(type).addPrimitive(prim)));
  summary[type] = pos.length / 9;
}
await io.write(out, outDoc);
console.log(JSON.stringify({ files: files.length, tris, groundEllipsoidH: h0.toFixed(2), depthRange: [(minU - h0).toFixed(2), (maxU - h0).toFixed(2)], byType: summary }, null, 1));
