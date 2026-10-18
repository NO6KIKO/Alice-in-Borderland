// "The hunt" at the Shibuya scramble: a masked gunman in black at the centre of the crossing sweeps the street
// with automatic fire (muzzle flash, tracers, sparks, ejected casings, smoke — no gore), car hazard lights blink,
// windscreens are cracked, and Tripo-generated participants (models/people/web/*.glb, rigged + animated) hide
// behind cars, run across the crossing, shelter in the store / subway entrance, help each other, and watch from above.
// Everything here is inert unless the camera is within ~400 m.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { placementsNear, prop } from './props.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import * as K from '../kit.js';

const C = new THREE.Vector3(-990, .06, 220);      // crossing centre (world)
export const huntState = { centre: C, firing: false };   // read by the audio each frame
const PV = .18;                                   // pavement top

// actors: id, clip, position (world x,z, y), facing target or yaw, and an optional run path (world points, loops)
function cast(cars) {
  const away = (p) => Math.atan2(p.x - C.x, p.z - C.z);           // yaw that faces away from the gunman
  const toward = (p) => Math.atan2(C.x - p.x, C.z - p.z);
  const A = [];
  // foreground / mid: crouched behind the nearest stranded cars, on the side away from the gunman
  const hide = ['salaryman', 'office_lady', 'worker', 'mom', 'tourist', 'young_suit', 'streetwear'];   // every actor is a different person
  const clips = ['frightened', 'scared_01', 'scared_01', 'frightened', 'frightened', 'look_around'];   // clips every hider rig has
  cars.sort((a, b) => a.p.distanceTo(C) - b.p.distanceTo(C)).slice(0, 7).forEach((c, i) => {
    const d = new THREE.Vector3().subVectors(c.p, C).setY(0).normalize();
    const p = c.p.clone().addScaledVector(d, 2.6).add(new THREE.Vector3(-d.z, 0, d.x).multiplyScalar((i % 2 ? 1 : -1) * .8));
    A.push({ id: hide[i % hide.length], clip: clips[i % clips.length], x: p.x, z: p.z, y: c.p.y, yaw: i % 3 === 2 ? toward(p) : away(p) + (Math.random() - .5) * .6, crouch: true });
  });
  // runners crossing the scramble (loops), a couple fleeing together, a delivery rider sprinting
  const run = (id, clip, pts, v, off = 0) => A.push({ id, clip, path: pts.map(([x, z]) => new THREE.Vector3(x, .06, z)), v, s: off });
  run('schoolgirl', 'run', [[-1022, 236], [-962, 200]], 5.2, 0);
  run('schoolboy', 'flee_01', [[-1018, 196], [-966, 248]], 4.6, .4);
  run('couple_m', 'flee_02', [[-1005, 250], [-978, 190]], 3.4, .2);
  run('couple_f', 'flee_02', [[-1006.2, 250.6], [-979.2, 190.6]], 3.4, .2);
  run('delivery', 'run', [[-960, 232], [-1024, 210]], 5.6, .7);
  run('teen_girl', 'flee_02', [[-1010, 206], [-972, 240]], 4.2, .55);
  // sheltering: store doorway (behind glass), subway entrance, billboard pillars
  A.push({ id: 'clerk', clip: 'frightened', x: -966.5, z: 243.2, y: PV, target: C });
  A.push({ id: 'student', clip: 'scared_01', x: -968.2, z: 245.8, y: PV, target: C });
  A.push({ id: 'elder', clip: 'afraid', x: -1027.5, z: 242.5, y: PV, target: C });
  A.push({ id: 'tracksuit', clip: 'look_around', x: -1025.8, z: 241.2, y: PV, target: C });
  A.push({ id: 'nurse', clip: 'frightened', x: -969, z: 202, y: PV, target: C });
  A.push({ id: 'grandma', clip: 'afraid', x: -967.6, z: 203.4, y: PV, target: C });   // the nurse shelters an old woman
  // far: watchers on the podium deck and the store roof
  A.push({ id: 'punk', clip: 'look_around', x: -1040, z: 204, y: 7.2, target: C });
  A.push({ id: 'courier', clip: 'scared_01', x: -962, z: 246, y: 4.18, target: C });   // on the konbini roof (top at PV + 4)
  A.push({ id: 'cook', clip: 'frightened', x: -1016, z: 196, y: PV, target: C });   // ramen cook ducking out of a side street
  // more participants up high: on the stalled rail viaduct, on a roof edge
  A.push({ id: 'player_m', clip: 'look_around', x: -985, z: 87.5, y: 9.45, target: C });
  A.push({ id: 'player_f', clip: 'afraid', x: -958, z: 249, y: 4.18, target: C, crouch: true });
  // the gunman
  A.push({ id: 'gunman', clip: 'fire', x: C.x - 1.5, z: C.z + 1, y: .06, yaw: Math.atan2(.9, .6), gunman: true });
  return A;
}

export function hunt(ctx) {
  const { scene, camera, updates } = ctx;
  const root = new THREE.Group(); root.name = 'hunt'; scene.add(root);
  const loader = new GLTFLoader(), lib = new Map(), mixers = [], walkers = [];
  let gun = null, muzzle = new THREE.Object3D(), active = false;

  /* ── effects ── */
  const flashTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,250,220,1)'); gr.addColorStop(.25, 'rgba(255,190,90,.8)'); gr.addColorStop(1, 'rgba(255,120,30,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, color: new THREE.Color(3, 2.4, 1.6), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  flash.scale.setScalar(.9); root.add(flash);
  const flashLight = new THREE.PointLight(0xffb060, 0, 22, 2); root.add(flashLight);
  // tracers
  const TR = 24, trPos = new Float32Array(TR * 6), trGeo = new THREE.BufferGeometry(); trGeo.setAttribute('position', new THREE.BufferAttribute(trPos, 3));
  const tracers = new THREE.LineSegments(trGeo, new THREE.LineBasicMaterial({ color: new THREE.Color(3, 2.2, 1), transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false }));
  tracers.frustumCulled = false; root.add(tracers); const trLife = new Float32Array(TR); let trI = 0;
  // sparks
  const SP = 400, spPos = new Float32Array(SP * 3), spVel = new Float32Array(SP * 3), spLife = new Float32Array(SP), spGeo = new THREE.BufferGeometry();
  spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3));
  const sparks = new THREE.Points(spGeo, new THREE.PointsMaterial({ color: new THREE.Color(4, 2.6, 1), size: .09, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  sparks.frustumCulled = false; root.add(sparks); let spI = 0;
  // casings: brass, tumble out to the right, bounce, then lie on the asphalt
  const CS = 260, casings = new THREE.InstancedMesh(new THREE.CylinderGeometry(.006, .006, .045, 6), new THREE.MeshStandardMaterial({ color: 0xc9a043, metalness: .9, roughness: .3 }), CS);
  casings.frustumCulled = false; casings.count = 0; root.add(casings);
  const cs = Array.from({ length: CS }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: 0, rest: true, live: false })); let csI = 0;
  // smoke
  const smokeTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(200,200,200,.5)'); gr.addColorStop(1, 'rgba(200,200,200,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const SM = 40, smokes = Array.from({ length: SM }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, color: 0x9a9a98, transparent: true, opacity: 0, depthWrite: false })); s.visible = false; root.add(s); return { s, life: 0, v: new THREE.Vector3() }; }); let smI = 0;
  const puff = (p, size, life) => { const o = smokes[smI++ % SM]; o.s.position.copy(p); o.s.scale.setScalar(size); o.life = life; o.max = life; o.v.set((Math.random() - .5) * .4, .5 + Math.random() * .4, (Math.random() - .5) * .4); o.s.visible = true; };

  /* ── cars: hazard blinkers + cracked windscreens ── */
  const cars = placementsNear(['jp_sedan', 'jp_taxi', 'kcar', 'kei_truck', 'city_bus'], C.x, C.z, 75);
  const blink = new THREE.InstancedMesh(new THREE.BoxGeometry(.12, .08, .2), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 1.6, .2) }), cars.length * 4);
  blink.frustumCulled = false; root.add(blink);
  const _m = new THREE.Matrix4(), _o = new THREE.Vector3();
  cars.forEach((c, i) => {
    const L = c.name === 'city_bus' ? 5.2 : 2.15, Wd = c.name === 'city_bus' ? 1.2 : .8, y = c.name === 'city_bus' ? 1 : .75;
    [[L, Wd], [L, -Wd], [-L, Wd], [-L, -Wd]].forEach(([a, b], k) => { _o.set(a, y, b).applyMatrix4(c.m); blink.setMatrixAt(i * 4 + k, _m.makeTranslation(_o.x, _o.y, _o.z)); });
  });
  const crackTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.clearRect(0, 0, 256, 256); g.strokeStyle = 'rgba(235,245,250,.85)'; for (let k = 0; k < 3; k++) { const cx = 60 + Math.random() * 136, cy = 60 + Math.random() * 136; for (let i = 0; i < 14; i++) { g.lineWidth = 1 + Math.random(); g.beginPath(); g.moveTo(cx, cy); let x = cx, y = cy; const a = Math.random() * 6.28; for (let s = 0; s < 6; s++) { x += Math.cos(a + (Math.random() - .5) * .6) * 14; y += Math.sin(a + (Math.random() - .5) * .6) * 14; g.lineTo(x, y); } g.stroke(); } for (let r = 6; r < 40; r += 9) { g.beginPath(); g.arc(cx, cy, r + Math.random() * 4, 0, 6.28); g.stroke(); } } return new THREE.CanvasTexture(c); })();
  const crackMat = new THREE.MeshBasicMaterial({ map: crackTex, transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4 });
  cars.filter((c) => c.name !== 'city_bus').forEach((c, i) => {
    if (i % 2) return;
    const q = new THREE.Mesh(new THREE.PlaneGeometry(1.25, .7), crackMat);
    const wm = c.m.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(.95, 1.22, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, -0.95, 'YXZ')), new THREE.Vector3(1, 1, 1)));
    q.applyMatrix4(wm); root.add(q);
  });

  /* ── after-rain wet crossing: a low-res mirror under the asphalt, shown through the puddle mask at night ── */
  const wet = new Reflector(new THREE.PlaneGeometry(260, 230), { textureWidth: 512, textureHeight: 512, color: 0x8a96a6, clipBias: .003, multisample: 0 });
  { const f = wet.onBeforeRender; wet.onBeforeRender = function (rd, sc, cam, ...a) { if (sc.overrideMaterial) return; f.call(this, rd, sc, cam, ...a); }; }   // not inside AO / DOF override passes
  wet.rotation.x = -Math.PI / 2; wet.position.set(-980, .035, 190); wet.visible = false; scene.add(wet);
  let night = false, puddleMask = null, floodLive = null;   // floodLive: null so the first frame counts as a flip
  // the venue's cold white floodlight from high above the scramble (night only) — the people read as silhouettes against it
  const flood = new THREE.SpotLight(0xdfe9ff, 0, 140, .6, .9, 1.2); flood.position.set(C.x + 18, 48, C.z - 12); flood.target.position.copy(C);
  flood.castShadow = true; flood.shadow.mapSize.set(1024, 1024); flood.shadow.bias = -.0005; scene.add(flood, flood.target);
  ctx.dayNight.push((day) => { flood.intensity = day ? 0 : 260; flood.visible = !day; if (!day) flood.shadow.needsUpdate = true; });   // hidden by day → no shadow pass   // soft key light, not a stadium
  ctx.dayNight.push((day, dusk) => {
    const wetLook = !day || dusk; night = wetLook; const m = K.mats.shib_road; if (!m) return;   // wet after rain: dusk + night
    wet.material.uniforms.color.value.set(dusk ? 0x4c535c : 0x8a96a6);   // the bright dusk sky mirrored at full strength read as white spots
    if (!puddleMask && m.roughnessMap?.image) {   // high-contrast copy of the puddle map: dry asphalt opaque, puddles see-through
      const src = m.roughnessMap.image, c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
      const g = c.getContext('2d'); g.filter = 'brightness(1.45) contrast(2.2)'; g.drawImage(src, 0, 0);
      puddleMask = new THREE.CanvasTexture(c); puddleMask.wrapS = puddleMask.wrapT = THREE.RepeatWrapping; puddleMask.repeat.copy(m.roughnessMap.repeat);
    }
    m.alphaMap = wetLook ? puddleMask : null; m.transparent = wetLook;
    // by day the rain has dried: matte asphalt (glossy puddles under a bright sky read as white blotches)
    if (!m.userData.wetRough) m.userData.wetRough = m.roughnessMap; m.roughnessMap = wetLook ? m.userData.wetRough : null; m.roughness = wetLook ? 1 : .9; m.needsUpdate = true;
    const pud = K.mats.shib_pud; if (pud) { pud.opacity = wetLook ? .7 : .28; pud.roughness = wetLook ? .12 : .7; }
  });

  /* ── what people dropped when they ran: umbrellas, bags, phones, shopping, toppled bikes ── */
  const drop = [['umbrella_open', 6], ['umbrella_clear', 5], ['handbag', 4], ['school_bag', 3], ['smartphone', 6], ['shopping_bag', 4], ['bicycle_fallen', 3]];
  for (const [name, n] of drop) for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.283, r = 4 + Math.pow(Math.random(), .7) * 34;
    prop(name, C.x + Math.cos(a) * r, .07, C.z + Math.sin(a) * r, Math.random() * 6.283);
  }

  /* ── people ── */
  const actors = cast(cars);
  const ids = [...new Set(actors.map((a) => a.id))];
  let pending = ids.length;
  ids.forEach((id) => loader.load(`./models/people/web/${id}.glb`, (g) => { lib.set(id, g); if (--pending === 0) spawn(); }, undefined, () => { if (--pending === 0) spawn(); }));
  loader.load('./models/props/lod/rifle.glb', (g) => { gun = g.scene; if (gunHand) attachGun(); });
  let gunHand = null, holder = null, gunman = null, baseYaw = 0;
  function attachGun() {
    const r = gun.clone(); const bb = new THREE.Box3().setFromObject(r), sz = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3());
    const rot = sz.z > sz.x; const inner = new THREE.Group(); r.position.sub(c); inner.add(r); if (rot) inner.rotation.y = Math.PI / 2;
    const k = .95 / Math.max(sz.x, sz.z); inner.scale.setScalar(k);
    holder = new THREE.Group(); holder.add(inner);
    // in the hand: barrel forward along the forearm; offsets tuned for the Tripo biped rig
    holder.position.set(0, .02, .18); holder.rotation.set(0, -Math.PI / 2, 0);
    const hs = new THREE.Vector3(); gunHand.getWorldScale(hs); holder.scale.divideScalar(hs.x || 1);
    gunHand.add(holder); muzzle.position.set(.48, 0, 0); holder.add(muzzle);
  }
  function spawn() {
    for (const a of actors) {
      const g = lib.get(a.id); if (!g) continue;
      const o = cloneSkinned(g.scene); o.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.geometry.computeBoundingSphere(); c.boundingSphere = c.geometry.boundingSphere.clone(); c.boundingSphere.radius *= 1.4; } });   // cull on the bind-pose sphere (skeleton not posed at first cull)
      const body = new THREE.Group(); o.rotation.y = -Math.PI / 2; body.add(o);   // Tripo characters face +X → +Z
      const h = new THREE.Group(); h.add(body); root.add(h);
      const pick = (re) => g.animations.find((c) => re.test(c.name));   // role-aware fallback: never a run cycle under a crouch
      const mx = new THREE.AnimationMixer(o), clip = g.animations.find((c) => c.name === a.clip) || (a.path ? pick(/^(run|flee)/) : pick(/frightened|scared|afraid/)) || g.animations[0];
      const act = mx.clipAction(clip); act.play(); act.time = Math.random() * clip.duration; act.timeScale = .9 + Math.random() * .2; mixers.push(mx);
      if (a.crouch) {   // crouched behind a car: knees bent, hips ~45 cm lower
        const bones = {}; o.traverse((x) => { if (x.isBone) bones[x.name] = x; });
        crouchers.push({ h, bones, k: .8 + Math.random() * .2 }); body.position.y = -.42;
      }
      if (a.path) { walkers.push({ h, a, L: a.path[0].distanceTo(a.path[1]), s: a.s * a.path[0].distanceTo(a.path[1]) }); continue; }
      h.position.set(a.x, a.y, a.z);
      h.rotation.y = a.target ? Math.atan2(a.target.x - a.x, a.target.z - a.z) : a.yaw;
      if (a.gunman) { gunman = h; baseYaw = h.rotation.y; o.traverse((b) => { if (b.isBone && /R_Hand/i.test(b.name)) gunHand = b; }); if (gun && gunHand) attachGun(); }
    }
  }

  /* ── procedural crouch (Tripo has no crouch preset): bend the rig about the body's lateral axis after the clip ── */
  const crouchers = [], _ax = new THREE.Vector3(), _pq = new THREE.Quaternion(), _rq = new THREE.Quaternion();
  function bend(b, axis, ang) {   // rotate bone b by ang about a WORLD axis, keeping its parent
    if (!b) return; b.parent.updateWorldMatrix(true, false); b.parent.getWorldQuaternion(_pq);
    _rq.setFromAxisAngle(axis, ang); b.quaternion.premultiply(_pq.clone().invert().multiply(_rq).multiply(_pq)); b.updateMatrixWorld(true);
  }
  function crouchPose(c) {
    const B = c.bones, lat = _ax.set(1, 0, 0).applyQuaternion(c.h.getWorldQuaternion(new THREE.Quaternion())).normalize();
    for (const s of ['L', 'R']) { bend(B[s + '_Thigh'], lat, -c.k * 1.75); bend(B[s + '_Calf'], lat, c.k * 2.1); bend(B[s + '_Foot'], lat, -c.k * .45); }
    bend(B.Spine01, lat, -c.k * .45); bend(B.Spine02, lat, -c.k * .2);
  }

  /* ── update ── */
  let fireT = 0, burst = 0, sweep = 0;
  const _w = new THREE.Vector3(), _d = new THREE.Vector3(), _tq = new THREE.Quaternion(), _ts = new THREE.Vector3(1, 1, 1), _te = new THREE.Euler();
  updates.push((dt, t) => {
    huntState.firing = false;
    active = camera.position.distanceTo(C) < 420; root.visible = active; wet.visible = active && night && camera.position.distanceTo(C) < 300;
    if (active !== floodLive) { floodLive = active; flood.shadow.autoUpdate = active; flood.shadow.needsUpdate = true; }   // far away: freeze the flood's shadow map (static casters only)
    if (!active) return;
    for (const mx of mixers) mx.update(dt);
    for (const c of crouchers) crouchPose(c);
    for (const w of walkers) {
      w.s = (w.s + w.a.v * dt) % (2 * w.L); const back = w.s > w.L, d = back ? 2 * w.L - w.s : w.s;
      const [p0, p1] = w.a.path; w.h.position.lerpVectors(p0, p1, d / w.L);
      w.h.rotation.y = Math.atan2((p1.x - p0.x) * (back ? -1 : 1), (p1.z - p0.z) * (back ? -1 : 1));
    }
    // blinking hazards
    blink.material.color.setScalar(((t * 1.6) % 1) < .5 ? 1 : 0).multiply(new THREE.Color(4, 1.6, .2));
    // the sweep: bursts of 4–9 rounds every ~1.2 s, muzzle swinging across a 100° arc
    sweep = Math.sin(t * .35) * .9; fireT -= dt;
    if (gunman) gunman.rotation.y = baseYaw + sweep;   // he turns with the sweep
    if (holder) {   // keep the rifle level and pointing where he faces, whatever the clip does to the wrist
      holder.parent.updateWorldMatrix(true, false);
      const yaw = baseYaw + sweep, dir = _d.set(Math.sin(yaw), -.06, Math.cos(yaw)).normalize();
      _tq.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
      holder.quaternion.copy(holder.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(_tq));
    }
    let shot = false;
    if (fireT < 0) { if (burst <= 0) { burst = 4 + Math.floor(Math.random() * 6); fireT = .9 + Math.random() * .8; } else { burst--; fireT = .085; shot = true; } }
    muzzle.getWorldPosition(_w); if (!gunHand) _w.set(C.x - 1.5, 1.45, C.z + 1);
    huntState.firing = shot;
    flash.position.copy(_w); flashLight.position.copy(_w);
    flash.visible = shot; flash.material.rotation = Math.random() * 6; flashLight.intensity = shot ? 18 : Math.max(0, flashLight.intensity - dt * 400);
    if (shot) {
      const yaw = baseYaw + sweep, dir = _d.set(Math.sin(yaw), -.03 - Math.random() * .04, Math.cos(yaw)).normalize();
      const dist = 18 + Math.random() * 40, hit = _w.clone().addScaledVector(dir, dist); hit.y = Math.max(.08, hit.y);
      const i = trI++ % TR; trPos.set([_w.x, _w.y, _w.z, hit.x, hit.y, hit.z], i * 6); trLife[i] = .06;
      for (let k = 0; k < 10; k++) { const j = spI++ % SP; spPos.set([hit.x, hit.y + .05, hit.z], j * 3); spVel.set([(Math.random() - .5) * 6, 1 + Math.random() * 4, (Math.random() - .5) * 6], j * 3); spLife[j] = .3 + Math.random() * .4; }
      if (Math.random() < .35) puff(hit, 1.2, 1.6);
      if (Math.random() < .5) puff(_w, .6, .8);
      const c = cs[csI++ % CS]; c.p.copy(_w); c.v.set(Math.cos(yaw) * 2.2 + (Math.random() - .5), 2 + Math.random(), -Math.sin(yaw) * 2.2 + (Math.random() - .5)); c.w = 20 + Math.random() * 20; c.rest = false; c.live = true;
      casings.count = Math.min(CS, Math.max(casings.count, csI));
    }
    for (let i = 0; i < TR; i++) { trLife[i] -= dt; if (trLife[i] <= 0) trPos.fill(0, i * 6, i * 6 + 6); }
    trGeo.attributes.position.needsUpdate = true;
    for (let j = 0; j < SP; j++) { if (spLife[j] <= 0) continue; spLife[j] -= dt; spVel[j * 3 + 1] -= 12 * dt; for (let a = 0; a < 3; a++) spPos[j * 3 + a] += spVel[j * 3 + a] * dt; if (spLife[j] <= 0) spPos[j * 3 + 1] = -100; }
    spGeo.attributes.position.needsUpdate = true;
    for (let i = 0; i < casings.count; i++) {
      const c = cs[i];
      if (!c.rest) { c.v.y -= 9.8 * dt; c.p.addScaledVector(c.v, dt); c.r.x += c.w * dt; c.r.z += c.w * .7 * dt; if (c.p.y < .085) { c.p.y = .085; c.v.multiplyScalar(.35); c.v.y = Math.abs(c.v.y) * .4; if (c.v.length() < .3) { c.rest = true; c.r.x = Math.PI / 2; } } }
      casings.setMatrixAt(i, _m.compose(c.p, _tq.setFromEuler(c.r), _ts));
    }
    casings.instanceMatrix.needsUpdate = true;
    for (const o of smokes) { if (o.life <= 0) { o.s.visible = false; continue; } o.life -= dt; o.s.position.addScaledVector(o.v, dt); o.s.scale.multiplyScalar(1 + dt * .9); o.s.material.opacity = .45 * (o.life / o.max); }
  });
  ctx.pois.push({ id: 'hunt', cam: [-989, 3.0, 287], tgt: [-991.5, 1.8, 221], spawn: [-1010, PV + .1, 252], yaw: Math.atan2(-20, 32) });
  ctx.pois.push({ id: 'hunt_konbini', cam: [-959.0, 2.3, 249.0], tgt: [-991.5, 1.0, 221] });   // from the back aisle, over the shelves, out through the glass   // camera looks along (−sin yaw, −cos yaw): toward the crossing
}
