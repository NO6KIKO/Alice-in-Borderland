// Day / night switch: Preetham sky + shadowed sun by day, the original moonlit look by night.
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export function createDayNight({ scene, renderer, hemi, moon, bloom, spots, nightBackdrop, onChange = [] }) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const nightEnv = pmrem.fromScene(new RoomEnvironment(), .04).texture;

  const sky = new Sky(); sky.scale.setScalar(8000); sky.visible = false; scene.add(sky);
  const u = sky.material.uniforms;
  u.turbidity.value = 6; u.rayleigh.value = 1.4; u.mieCoefficient.value = .004; u.mieDirectionalG.value = .82;
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

  const night = { bg: scene.background.clone(), fogC: scene.fog.color.clone(), fogD: .0016, hemiS: hemi.color.clone(), hemiG: hemi.groundColor.clone(), hemiI: hemi.intensity, moonI: moon.intensity, exp: renderer.toneMappingExposure, bloom: bloom.strength };
  let isDay = false;
  function set(day) {
    isDay = day;
    sky.visible = day; if (nightBackdrop) nightBackdrop.visible = !day;
    scene.background = day ? null : night.bg;
    scene.environment = day ? dayEnv : nightEnv; scene.environmentIntensity = day ? 1.3 : .22;
    scene.fog.color.set(day ? 0xa9bccf : night.fogC); scene.fog.density = day ? .00016 : night.fogD;
    hemi.color.set(day ? 0xc4d8f0 : night.hemiS); hemi.groundColor.set(day ? 0x6b6252 : night.hemiG); hemi.intensity = day ? 2.2 : night.hemiI;
    moon.intensity = day ? 0 : night.moonI;
    sun.intensity = day ? 4 : 0; sun.visible = day;
    renderer.toneMappingExposure = day ? .95 : night.exp;
    bloom.strength = day ? .18 : night.bloom; bloom.threshold = day ? 1.6 : 1.0;
    for (const s of spots) s.visible = !day;
    for (const f of onChange) f(day);
  }
  // enclosed halls: by day, fade sky light out while the camera is inside one of these boxes
  const interiors = []; let inside = 0;
  function base() { return isDay ? { h: 2.2, s: 4, e: 1.3 } : { h: night.hemiI, s: 0, e: .22 }; }
  function update(focus, cam) {
    const target = cam && interiors.some((b) => cam.x > b[0] && cam.x < b[1] && cam.y < b[2] && cam.z > b[3] && cam.z < b[4]) ? 1 : 0;
    inside += (target - inside) * .08;
    if (isDay) { const b0 = base(), k = 1 - inside * .85; hemi.intensity = b0.h * k; sun.intensity = b0.s * (1 - inside); scene.environmentIntensity = b0.e * (1 - inside * .8); }
    sun.target.position.set(Math.round(focus.x / 8) * 8, 0, Math.round(focus.z / 8) * 8);
    sun.position.copy(sun.target.position).addScaledVector(sunDir, 700);
  }
  return { set, update, interiors, get isDay() { return isDay; }, sun };
}
