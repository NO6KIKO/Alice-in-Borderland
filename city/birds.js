// Crows over the empty city: a few loose flocks circling high above landmarks by day (hidden at night).
// One InstancedMesh; wings flap in the vertex shader from a per-bird phase, so the CPU only moves 60 matrices.
import * as THREE from 'three';

const FLOCKS = [[-980, 190, 95], [-510, 30, 160], [-760, -300, 120], [-330, -400, 175], [-1380, -930, 140], [180, 120, 80]];   // x, z, altitude

export function birds({ scene, updates, dayNight }) {
  // body + two swept wings (wing vertices carry |x| > .12 → flapped in the shader)
  const g = new THREE.BufferGeometry(), P = [];
  const tri = (a, b, c) => P.push(...a, ...b, ...c);
  tri([0, 0, .42], [-.08, 0, -.3], [.08, 0, -.3]); tri([0, .05, .3], [-.06, 0, -.25], [.06, 0, -.25]);   // body
  tri([-.06, 0, .12], [-.06, 0, -.12], [-.55, .02, -.05]); tri([-.55, .02, -.05], [-.06, 0, -.12], [-.48, .02, -.22]);   // left wing
  tri([.06, 0, .12], [.55, .02, -.05], [.06, 0, -.12]); tri([.55, .02, -.05], [.48, .02, -.22], [.06, 0, -.12]);         // right wing
  tri([-.07, 0, -.28], [.07, 0, -.28], [0, 0, -.48]);   // tail
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.computeVertexNormals();
  const n = FLOCKS.length * 10, phase = new Float32Array(n);
  for (let i = 0; i < n; i++) phase[i] = Math.random() * 6.283;
  g.setAttribute('phase', new THREE.InstancedBufferAttribute(phase, 1));
  const mat = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: .8, side: THREE.DoubleSide });
  const time = { value: 0 };
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = time;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float phase;\nuniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float ax = abs(transformed.x);
        if (ax > .12) { float f = sin(uTime * 7.5 + phase) * .9 * smoothstep(.12, .55, ax); float s = sin(f), c = cos(f);
          transformed.y += (ax - .06) * s; transformed.x = sign(transformed.x) * (.06 + (ax - .06) * c); }`);
  };
  const im = new THREE.InstancedMesh(g, mat, n); im.frustumCulled = false; im.castShadow = false; scene.add(im);
  const birds = [];
  FLOCKS.forEach(([x, z, h], f) => { for (let k = 0; k < 10; k++) birds.push({ x: x + (Math.random() - .5) * 60, z: z + (Math.random() - .5) * 60, h: h + (Math.random() - .5) * 25, r: 30 + Math.random() * 55, w: (.12 + Math.random() * .1) * (f % 2 ? 1 : -1), a: Math.random() * 6.283, s: 1.6 + Math.random() * .5 }); });
  let on = true;
  dayNight.push((day) => { on = day; im.visible = day; });
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3();
  updates.push((dt, t) => {
    if (!on) return;
    time.value = t;
    birds.forEach((b, i) => {
      b.a += b.w * dt;
      p.set(b.x + Math.cos(b.a) * b.r, b.h + Math.sin(t * .3 + i) * 4, b.z + Math.sin(b.a) * b.r);
      const yaw = Math.atan2(-Math.sin(b.a) * Math.sign(b.w), Math.cos(b.a) * Math.sign(b.w));   // along the circle's tangent
      e.set(0, yaw, -Math.sign(b.w) * .25); q.setFromEuler(e); sc.setScalar(b.s);
      im.setMatrixAt(i, m.compose(p, q, sc));
    });
    im.instanceMatrix.needsUpdate = true;
  });
}
