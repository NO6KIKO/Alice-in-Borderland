// Third-person / first-person player: WASD move, Shift sprint, Space jump, V switch view, wheel = camera distance.
// Capsule-vs-BVH collision (same approach as the three-mesh-bvh characterMovement example), so stairs,
// ramps, catwalk decks and railings all work against the real scene geometry.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshBVH, StaticGeometryGenerator } from 'three-mesh-bvh';

// Player model: any Mixamo-rigged GLB. Clips are matched by name (case-insensitive) so a Mixamo export
// with "Idle" / "Walking" / "Running" / "Jump" works as well as Xbot's "idle" / "walk" / "run".
export const PLAYER_MODEL = {
  // Tripo-generated character, auto-rigged + retargeted presets (tools/tripo.py)
  url: './models/chars/alice.glb',
  facing: -Math.PI / 2,                        // Tripo exports face +X; the controller expects +Z
  clips: { idle: /^idle$/i, walk: /^walk(ing)?$/i, run: /^run(ning)?$/i, jump: /jump/i, look: /look_around/i },
  outfit: [],                                  // [materialNameRegex, MeshStandardMaterial params] to recolour
};

const RADIUS = .35, HEIGHT = 1.75, EYE = 1.62;
const WALK = 1.9, RUN = 5.2, JUMP_V = 5.6, GRAVITY = -22;

export function createPlayer({ scene, camera, renderer, controls, spawn = new THREE.Vector3(0, 1, 62), spawnYaw = 0 }) {
  const dom = renderer.domElement;
  const state = { active: false, firstPerson: false, yaw: spawnYaw, pitch: .22, dist: 4.2, onGround: false };
  const keys = {};
  const vel = new THREE.Vector3();
  const pos = spawn.clone();                  // feet position
  let collider = null, model = null, mixer = null, actions = {}, current = null;

  /* ── UI ── */
  const hud = document.createElement('div');
  hud.id = 'playhud';
  hud.innerHTML = `<div class="ph-cross"></div><div class="ph-keys"><b>WASD</b> 移动 <b>Shift</b> 奔跑 <b>Space</b> 跳 <b>V</b> 第一/第三人称 <b>滚轮</b> 镜头距离 <b>Esc</b> 退出</div>`;
  document.body.appendChild(hud);
  const style = document.createElement('style');
  style.textContent = `#playhud{position:fixed;inset:0;pointer-events:none;display:none}
  #playhud.on{display:block}
  #playhud .ph-keys{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);background:rgba(8,12,18,.72);border:1px solid #2a3442;border-radius:6px;padding:7px 14px;font-size:12.5px;white-space:nowrap}
  #playhud .ph-keys b{display:inline-block;min-width:18px;padding:1px 6px;margin:0 4px 0 10px;border:1px solid #56606e;border-radius:4px;font-weight:600;color:#ffd24a}
  #playhud .ph-cross{position:fixed;left:50%;top:50%;width:6px;height:6px;margin:-3px;border-radius:50%;background:rgba(255,255,255,.75);display:none}
  #playhud.fp .ph-cross{display:block}
  body.playing canvas{cursor:none}`;
  document.head.appendChild(style);

  /* ── model ── */
  new GLTFLoader().load(PLAYER_MODEL.url, (g) => {
    model = g.scene;
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.frustumCulled = false;
      const hit = PLAYER_MODEL.outfit.find(([re]) => re.test(o.material.name));
      if (hit) o.material = new THREE.MeshStandardMaterial(hit[1]);
    });
    const root = new THREE.Group(); model.rotation.y = PLAYER_MODEL.facing; root.add(model);
    model = root; model.visible = false; scene.add(model);
    mixer = new THREE.AnimationMixer(root.children[0]);
    for (const [k, re] of Object.entries(PLAYER_MODEL.clips)) {
      const clip = g.animations.find((c) => re.test(c.name));
      if (clip) actions[k] = mixer.clipAction(clip);
    }
    for (const k of ['jump', 'look']) if (actions[k]) { actions[k].setLoop(THREE.LoopOnce); actions[k].clampWhenFinished = true; }
    play('idle');
  });
  function play(name, fade = .2) {
    const a = actions[name] || actions.idle; if (!a || a === current) return;
    a.reset().fadeIn(fade).play(); if (current) current.fadeOut(fade); current = a;
  }

  /* ── collider from scene meshes ── */
  function setCollider(meshes) {
    const group = new THREE.Group();
    for (const m of meshes) { const g = m.geometry; if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]); const c = new THREE.Mesh(g); m.updateWorldMatrix(true, false); c.matrix.copy(m.matrixWorld); c.matrixAutoUpdate = false; group.add(c); }
    group.updateMatrixWorld(true);
    const gen = new StaticGeometryGenerator(group); gen.attributes = ['position'];
    const geo = gen.generate(); geo.boundsTree = new MeshBVH(geo);
    collider = new THREE.Mesh(geo);
    console.log('collider triangles', geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3);
  }

  /* ── input ── */
  addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (!state.active) return;
    if (e.code === 'KeyV') { state.firstPerson = !state.firstPerson; hud.classList.toggle('fp', state.firstPerson); }
    if (e.code === 'Space') { e.preventDefault(); if (state.onGround) { vel.y = JUMP_V; state.onGround = false; } }
  });
  addEventListener('keyup', (e) => { keys[e.code] = false; });
  const tryLock = () => { try { const r = dom.requestPointerLock?.(); r?.catch?.(() => {}); } catch { /* not supported here */ } };
  dom.addEventListener('click', () => { if (state.active && document.pointerLockElement !== dom) tryLock(); });
  addEventListener('mousemove', (e) => {
    if (!state.active) return;   // works with or without pointer lock
    state.yaw -= e.movementX * .0022; state.pitch = THREE.MathUtils.clamp(state.pitch + e.movementY * .0022, -1.2, 1.25);   // mouse up = look up
  });
  dom.addEventListener('wheel', (e) => { if (state.active) state.dist = THREE.MathUtils.clamp(state.dist + Math.sign(e.deltaY) * .5, 1.6, 9); }, { passive: true });
  addEventListener('keydown', (e) => { if (e.code === 'Escape' && state.active && document.pointerLockElement !== dom) exit(); });

  function enter() {
    state.active = true; controls.enabled = false; hud.classList.add('on');
    if (model) model.visible = !state.firstPerson;
    tryLock();
  }
  function exit() {
    state.active = false; controls.enabled = true; hud.classList.remove('on');
    if (document.pointerLockElement === dom) document.exitPointerLock();
    controls.target.copy(pos).add(new THREE.Vector3(0, 1, 0));
  }

  /* ── physics step ── */
  const seg = new THREE.Line3(), box = new THREE.Box3(), tv = new THREE.Vector3(), tv2 = new THREE.Vector3();
  function collide() {
    seg.start.set(pos.x, pos.y + HEIGHT - RADIUS, pos.z);
    seg.end.set(pos.x, pos.y + RADIUS, pos.z);
    box.makeEmpty(); box.expandByPoint(seg.start); box.expandByPoint(seg.end); box.min.addScalar(-RADIUS); box.max.addScalar(RADIUS);
    collider.geometry.boundsTree.shapecast({
      intersectsBounds: (b) => b.intersectsBox(box),
      intersectsTriangle: (tri) => {
        const d = tri.closestPointToSegment(seg, tv, tv2);
        if (d < RADIUS) { const dir = tv2.sub(tv).normalize(), depth = RADIUS - d; seg.start.addScaledVector(dir, depth); seg.end.addScaledVector(dir, depth); }
      },
    });
    const np = tv.set(seg.end.x, seg.end.y - RADIUS, seg.end.z), delta = tv2.subVectors(np, pos);
    return delta;
  }
  function step(dt, wish) {
    if (state.onGround) vel.y = GRAVITY * dt; else vel.y += GRAVITY * dt;   // grounded: small push keeps feet on slopes & stairs
    pos.addScaledVector(vel, dt);
    pos.addScaledVector(wish, dt);
    if (!collider) { if (pos.y < 0) { pos.y = 0; vel.y = 0; state.onGround = true; } return; }
    const delta = collide();
    state.onGround = delta.y > Math.abs(dt * vel.y * .25);
    const off = Math.max(0, delta.length() - 1e-5); delta.normalize().multiplyScalar(off); pos.add(delta);
    if (!state.onGround) { delta.normalize(); vel.addScaledVector(delta, -delta.dot(vel)); } else vel.set(0, 0, 0);
    if (pos.y < -20) { pos.copy(spawn); vel.set(0, 0, 0); }
  }

  /* ── camera ── */
  const ray = new THREE.Ray(), head = new THREE.Vector3(), camGoal = new THREE.Vector3();
  function updateCamera(dt) {
    head.set(pos.x, pos.y + (state.firstPerson ? EYE : 1.55), pos.z);
    const cp = Math.cos(state.pitch), dir = new THREE.Vector3(Math.sin(state.yaw) * cp, Math.sin(state.pitch), Math.cos(state.yaw) * cp); // look direction is −dir
    if (state.firstPerson) { camera.position.copy(head); camera.lookAt(tv.copy(head).sub(dir)); return; }
    const right = new THREE.Vector3(Math.cos(state.yaw), 0, -Math.sin(state.yaw));
    head.addScaledVector(right, .45);                            // over-the-shoulder offset
    let dist = state.dist;
    if (collider) {                                              // pull camera in front of walls
      ray.origin.copy(head); ray.direction.copy(dir);
      const hit = collider.geometry.boundsTree.raycastFirst(ray, THREE.DoubleSide);
      if (hit && hit.distance < dist + .3) dist = Math.max(.4, hit.distance - .3);
    }
    camGoal.copy(head).addScaledVector(dir, dist);
    camera.position.lerp(camGoal, 1 - Math.exp(-dt * 18));
    camera.lookAt(head);
  }

  /* ── per-frame ── */
  let faceYaw = spawnYaw + Math.PI, idleTime = 0;   // the model faces away from the camera (walking faces yaw + π)
  function update(dt) {
    if (!state.active) return;
    const f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), s = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    const run = keys.ShiftLeft || keys.ShiftRight;
    const fwd = new THREE.Vector3(-Math.sin(state.yaw), 0, -Math.cos(state.yaw)), right = new THREE.Vector3(Math.cos(state.yaw), 0, -Math.sin(state.yaw));
    const wish = fwd.multiplyScalar(f).add(right.multiplyScalar(s));
    const moving = wish.lengthSq() > 0;
    if (moving) wish.normalize().multiplyScalar(run ? RUN : WALK);
    const n = 5; for (let i = 0; i < n; i++) step(dt / n, wish);
    if (model) {
      model.visible = !state.firstPerson;
      model.position.copy(pos);
      if (moving) faceYaw = Math.atan2(wish.x, wish.z);
      let da = faceYaw - model.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da)); model.rotation.y += da * Math.min(1, dt * 12);
      idleTime = moving || !state.onGround ? 0 : idleTime + dt;
      const lookDone = current === actions.look && !current.isRunning();
      if (!state.onGround && actions.jump) play('jump', .1);
      else if (moving) play(run ? 'run' : 'walk');
      else if (idleTime > 9 && actions.look && current !== actions.look && !lookDone) play('look', .4);
      else if (current !== actions.look || lookDone) { if (lookDone) idleTime = 0; play('idle', .4); }
      if (current && current === actions.walk) current.timeScale = 1.15;
      mixer.update(dt);
    }
    updateCamera(dt);
  }

  function teleport(p, yaw = 0) { pos.copy(p); vel.set(0, 0, 0); state.yaw = yaw; state.pitch = .1; faceYaw = yaw + Math.PI; if (model) model.rotation.y = faceYaw; }
  return { enter, exit, update, setCollider, teleport, state, get pos() { return pos; }, get active() { return state.active; } };
}
