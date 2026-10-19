// Find where our subway stair can join the real Shibuya underground: a B1 floor point where a corridor runs at least
// RUN metres back from the stair foot, and the stair (CLEAR metres the other way, 4 m wide) passes through ground
// with no underground structure above B1. Tests the 4 axis directions; prints the model rotation that aligns the
// corridor with our stair (our stair rises toward +x and the player walks out toward −x).
// Usage: node tools/ubld_site.mjs models/real/shibuya_ubld.glb
import { NodeIO } from '@gltf-transform/core';
const doc = await new NodeIO().read(process.argv[2]);
const C = 1, X0 = -180, Z0 = -205, NX = 412, NZ = 334, RUN = 12, CLEAR = 15;
const above = new Uint8Array(NX * NZ), b1 = new Uint8Array(NX * NZ);
const mark = (arr, x, z) => { const i = Math.floor((x - X0) / C), j = Math.floor((z - Z0) / C); if (i >= 0 && j >= 0 && i < NX && j < NZ) arr[j * NX + i] = 1; };
for (const node of doc.getRoot().listNodes()) {
  const m = node.getMesh(); if (!m) continue; const name = node.getName(), a = m.listPrimitives()[0].getAttribute('POSITION').getArray();
  for (let t = 0; t < a.length; t += 9) {
    const area = Math.abs((a[t + 3] - a[t]) * (a[t + 8] - a[t + 2]) - (a[t + 6] - a[t]) * (a[t + 5] - a[t + 2])) / 2, n = Math.min(400, 4 + Math.ceil(area * 2));
    for (let s = 0; s < n; s++) { let u = Math.random(), v = Math.random(); if (u + v > 1) { u = 1 - u; v = 1 - v; } const w = 1 - u - v;
      const x = w * a[t] + u * a[t + 3] + v * a[t + 6], y = w * a[t + 1] + u * a[t + 4] + v * a[t + 7], z = w * a[t + 2] + u * a[t + 5] + v * a[t + 8];
      if (name === 'FloorSurface' && y > -8.2 && y < -7.1) mark(b1, x, z);
      else if (y > -6.9 && y < -.3) mark(above, x, z); }
  }
}
const at = (arr, x, z) => { const i = Math.floor((x - X0) / C), j = Math.floor((z - Z0) / C); return i >= 0 && j >= 0 && i < NX && j < NZ ? arr[j * NX + i] : 0; };
const DIRS = [[1, 0, 0], [0, 1, Math.PI / 2], [-1, 0, Math.PI], [0, -1, -Math.PI / 2]];   // stair direction d in model space, ry that maps d → +x
const out = [];
for (let z = Z0 + 2; z < Z0 + NZ * C - 2; z += 1) for (let x = X0 + 2; x < X0 + NX * C - 2; x += 1) {
  if (!at(b1, x, z)) continue;
  for (const [dx, dz, ry] of DIRS) {
    const px = -dz, pz = dx; let ok = true;
    for (let s = 1; s <= CLEAR && ok; s++) for (const o of [-2, -1, 0, 1, 2]) { const qx = x + dx * s + px * o, qz = z + dz * s + pz * o; if (at(above, qx, qz) || at(b1, qx, qz)) { ok = false; break; } }
    if (!ok) continue;
    let run = 0; for (let s = 0; s <= 40; s++) { if (at(b1, x - dx * s, z - dz * s) && at(b1, x - dx * s + px, z - dz * s + pz) && at(b1, x - dx * s - px, z - dz * s - pz)) run = s; else break; }
    if (run >= RUN) out.push({ x, z, ry, run, d: Math.hypot(x, z) });
  }
}
out.sort((a, b) => a.d - b.d);
console.log(`${out.length} sites; nearest to the scramble (model metres, x east, z south; ry = model rotation; run = corridor length behind the foot):`);
for (const o of out.slice(0, 12)) console.log(`foot (${o.x}, ${o.z})  ry ${(o.ry * 180 / Math.PI).toFixed(0)}°  corridor ${o.run} m  ${o.d.toFixed(0)} m from the scramble`);
