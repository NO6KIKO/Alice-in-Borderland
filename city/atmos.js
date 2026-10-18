// Atmosphere from the show's stills: dust motes drifting in the air around the camera, and soft volumetric sun
// shafts slanting through the black warehouse's sawtooth skylights by day.
import * as THREE from 'three';

export function atmosphere({ scene, camera, updates, dayNight }) {
  /* dust: a 30 m box of motes that follows the camera (wrapped), barely visible except against light */
  const N = 700, R = 15, pos = new Float32Array(N * 3), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) { pos.set([(Math.random() - .5) * 2 * R, (Math.random() - .5) * 2 * R * .6, (Math.random() - .5) * 2 * R], i * 3); seed[i] = Math.random() * 100; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dot = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })();
  const dm = new THREE.PointsMaterial({ map: dot, size: .045, color: 0xfff2dc, transparent: true, opacity: .5, depthWrite: false, blending: THREE.AdditiveBlending });
  const dust = new THREE.Points(g, dm); dust.frustumCulled = false; scene.add(dust);
  const base = new THREE.Vector3();
  updates.push((dt, t) => {
    base.copy(camera.position);
    for (let i = 0; i < N; i++) {
      let x = pos[i * 3] + Math.sin(t * .2 + seed[i]) * dt * .15, y = pos[i * 3 + 1] + Math.cos(t * .13 + seed[i]) * dt * .08 - dt * .01, z = pos[i * 3 + 2] + Math.cos(t * .17 + seed[i] * 2) * dt * .15;
      const ox = base.x - dust.position.x, oy = base.y - dust.position.y, oz = base.z - dust.position.z;   // keep the cloud centred on the camera
      if (x - ox > R) x -= 2 * R; else if (x - ox < -R) x += 2 * R;
      if (y - oy > R * .6) y -= 1.2 * R; else if (y - oy < -R * .6) y += 1.2 * R;
      if (z - oz > R) z -= 2 * R; else if (z - oz < -R) z += 2 * R;
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    }
    g.attributes.position.needsUpdate = true;
  });
  dayNight.push((day) => { dm.opacity = day ? .45 : .25; dm.color.set(day ? 0xfff2dc : 0xbcd2ff); });

  /* warehouse sun shafts (day only): slanted additive slabs under the skylight rows */
  const shaftTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 256; const x = c.getContext('2d'); const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(255,240,215,.9)'); gr.addColorStop(1, 'rgba(255,240,215,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 256); const g2 = x.createLinearGradient(0, 0, 64, 0); g2.addColorStop(0, 'rgba(0,0,0,1)'); g2.addColorStop(.25, 'rgba(0,0,0,0)'); g2.addColorStop(.75, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,1)'); x.globalCompositeOperation = 'destination-out'; x.fillStyle = g2; x.fillRect(0, 0, 64, 256); return new THREE.CanvasTexture(c); })();
  const sm = new THREE.MeshBasicMaterial({ map: shaftTex, transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const shafts = new THREE.Group(); scene.add(shafts);
  for (let i = 0; i < 9; i++) for (let j = 0; j < 3; j++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 46), sm);
    m.position.set(430 + i * 20 + 10, 18, -190 + j * 45); m.rotation.set(0, Math.PI / 2 * .3, .62);   // leaning away from the sun
    shafts.add(m);
  }
  dayNight.push((day) => { shafts.visible = day; });
}
