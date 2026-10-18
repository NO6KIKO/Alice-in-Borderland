// Day / night switch: Preetham sky + shadowed sun by day, the original moonlit look by night.
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export function createDayNight({ scene, renderer, hemi, moon, bloom, spots, nightBackdrop, onChange = [] }) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const nightEnv = pmrem.fromScene(new RoomEnvironment(), .04).texture;

  const sky = new Sky(); sky.scale.setScalar(450000); sky.visible = false; scene.add(sky);
  // the Preetham sky is far brighter than our scene exposure wants — scale it so it reads blue, not white
  sky.material.fragmentShader = sky.material.fragmentShader.replace('#include <tonemapping_fragment>', 'gl_FragColor.rgb *= 0.38;\n#include <tonemapping_fragment>');
  const u = sky.material.uniforms;
  u.turbidity.value = 3.2; u.rayleigh.value = 2.4; u.mieCoefficient.value = .003; u.mieDirectionalG.value = .8;   // clear, slightly hazy Tokyo blue
  const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(52), THREE.MathUtils.degToRad(215));
  u.sunPosition.value.copy(sunDir);
  // bake the sky into an environment map so water / glass / metal reflect it
  const envScene = new THREE.Scene(); const sky2 = new Sky(); sky2.scale.setScalar(1000); sky2.material.uniforms.sunPosition.value.copy(sunDir);
  for (const k of ['turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG']) sky2.material.uniforms[k].value = u[k].value;
  envScene.add(sky2);
  const dayEnv = pmrem.fromScene(envScene).texture;

  const sun = new THREE.DirectionalLight(0xfff1dc, 0);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
  const sc = sun.shadow.camera; sc.left = sc.bottom = -220; sc.right = sc.top = 220; sc.near = 10; sc.far = 1400;
  sun.shadow.bias = -.0004; sun.shadow.normalBias = .6;
  scene.add(sun, sun.target);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // cloud deck: fbm-noise alpha texture on a huge plane high above the city, drifting slowly
  const cloudTex = (() => {
    const N = 512, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), img = g.createImageData(N, N);
    const R = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
    const vn = (x, y, p) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, w = (i) => ((i % p) + p) % p, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      const a = R(w(xi), w(yi)), b = R(w(xi + 1), w(yi)), c2 = R(w(xi), w(yi + 1)), d = R(w(xi + 1), w(yi + 1)); return a + (b - a) * u + (c2 - a) * v + (a - b - c2 + d) * u * v; };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let f = 0, amp = .5, fr = 4; for (let o = 0; o < 5; o++) { f += vn(x / N * fr, y / N * fr, fr) * amp; amp *= .5; fr *= 2; }
      const a = Math.max(0, Math.min(1, (f - .52) * 3.2)), i = (y * N + x) * 4, shade = 205 + 50 * Math.min(1, (f - .5) * 4);
      img.data[i] = img.data[i + 1] = shade; img.data[i + 2] = shade + 6; img.data[i + 3] = a * 255;
    }
    g.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const cg = new THREE.PlaneGeometry(16000, 16000, 40, 40), cp = cg.attributes.position, ca = new Float32Array(cp.count * 4);
  for (let i = 0; i < cp.count; i++) { const r = Math.hypot(cp.getX(i), cp.getY(i)) / 8000, a = 1 - Math.min(1, Math.max(0, (r - .25) / .55)); ca.set([1, 1, 1, a * a], i * 4); }   // fade before the edge
  cg.setAttribute('color', new THREE.BufferAttribute(ca, 4));
  const clouds = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ map: cloudTex, transparent: true, depthWrite: false, fog: false, opacity: .85, vertexColors: true }));
  clouds.rotation.x = Math.PI / 2; clouds.position.y = 1100; clouds.renderOrder = -1; scene.add(clouds);
  const night = { bg: scene.background.clone(), fogC: scene.fog.color.clone(), fogD: .0016, hemiS: hemi.color.clone(), hemiG: hemi.groundColor.clone(), hemiI: hemi.intensity, moonI: moon.intensity, exp: renderer.toneMappingExposure, bloom: bloom.strength };
  let isDay = false;
  night.bloom = .35; night.moonI = moon.intensity * 1.5; moon.color.set(0x8fb0e0);   // softer bloom, clearer moonlight
  function set(day) {
    isDay = day;
    sky.visible = day; if (nightBackdrop) nightBackdrop.visible = !day;
    scene.background = day ? null : night.bg;
    scene.environment = day ? dayEnv : nightEnv; scene.environmentIntensity = day ? .55 : .22;
    scene.fog.color.set(day ? 0x9fb6cc : night.fogC); scene.fog.density = day ? .00011 : night.fogD;
    hemi.color.set(day ? 0xc4d8f0 : night.hemiS); hemi.groundColor.set(day ? 0x6b6252 : night.hemiG); hemi.intensity = day ? 1.25 : night.hemiI;
    moon.intensity = day ? 0 : night.moonI;
    sun.intensity = day ? 5.2 : 0; sun.visible = day;
    renderer.toneMappingExposure = day ? .74 : night.exp;
    bloom.strength = day ? .18 : night.bloom; bloom.threshold = day ? 1.6 : 1.0;
    for (const s of spots) s.visible = !day;
    clouds.material.color.set(day ? 0xffffff : 0x1a2230); clouds.material.opacity = day ? .85 : .7;
    for (const f of onChange) f(day);
  }
  // enclosed halls: by day, fade sky light out while the camera is inside one of these boxes
  const interiors = []; let inside = 0;
  function base() { return isDay ? { h: 1.25, s: 5.2, e: .55 } : { h: night.hemiI, s: 0, e: .22 }; }
  function update(focus, cam) {
    cloudTex.offset.x += .000012; cloudTex.offset.y += .000006;
    const target = cam && interiors.some((b) => cam.x > b[0] && cam.x < b[1] && cam.y < b[2] && cam.y > (b[5] ?? -1e9) && cam.z > b[3] && cam.z < b[4]) ? 1 : 0;
    inside += (target - inside) * .08;
    if (isDay) { const b0 = base(), k = 1 - inside * .85; hemi.intensity = b0.h * k; sun.intensity = b0.s * (1 - inside); scene.environmentIntensity = b0.e * (1 - inside * .8); }
    sun.target.position.set(Math.round(focus.x / 8) * 8, 0, Math.round(focus.z / 8) * 8);
    sun.position.copy(sun.target.position).addScaledVector(sunDir, 700);
  }
  return { set, update, interiors, get isDay() { return isDay; }, sun };
}
