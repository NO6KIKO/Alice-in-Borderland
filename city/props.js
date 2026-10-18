// Instanced Tripo-generated props (models/props/lod/<name>.glb). Districts call prop() while building, in the
// current kit frame; after the build, loadProps() loads each model once, normalises it (longest horizontal axis
// → local +x = "forward", base on y = 0, scaled to the real-world size below) and draws every placement through
// one InstancedMesh per material. Only placements near the camera are drawn (refreshed a few times a second).
// Each placement also adds an invisible collision box, so the player bumps into cars instead of walking through.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as K from '../kit.js';

// size: [length along x, height, depth] in metres (the model is scaled uniformly to fit `fit` axis)
export const PROPS = {
  jp_taxi: { size: [4.4, 1.75, 1.7], fit: 'x', range: 260 },
  jp_sedan: { size: [4.5, 1.45, 1.7], fit: 'x', range: 260 },
  kcar: { size: [3.4, 1.75, 1.48], fit: 'x', range: 240 },
  kei_truck: { size: [3.4, 1.8, 1.48], fit: 'x', range: 240 },
  city_bus: { size: [10.5, 3.1, 2.5], fit: 'x', range: 320 },
  wreck_car: { size: [4.3, 1.3, 1.7], fit: 'x', range: 240 },
  vending: { size: [1.1, 1.83, .75], fit: 'y', range: 140 },
  bicycle: { size: [1.8, 1.05, .55], fit: 'x', range: 110 },
  scooter: { size: [1.7, 1.1, .65], fit: 'x', range: 120 },
  postbox: { size: [.45, 1.3, .45], fit: 'y', range: 110 },
  bench: { size: [1.8, .8, .6], fit: 'x', range: 120 },
  ramen_counter: { size: [4.2, 1.1, 1.4], fit: 'x', range: 70 },
  izakaya_table: { size: [1.6, .9, 1.6], fit: 'x', range: 70 },
  konbini_shelf: { size: [1.8, 1.45, .9], fit: 'x', range: 70 },
  drink_fridge: { size: [2.7, 2.0, .8], fit: 'x', range: 70 },
  office_desk: { size: [1.6, 1.25, 1.4], fit: 'x', range: 70 },
  shopping_cart: { size: [.95, 1.0, .58], fit: 'y', range: 100 },
  trash_bags: { size: [1.6, .9, 1.2], fit: 'x', range: 110 },
  deer: { size: [1.5, 1.4, .5], fit: 'x', range: 180 },
  traffic_signal: { size: [1.3, .45, .45], fit: 'x', range: 220 },
  box_truck: { size: [6.5, 3.0, 2.2], fit: 'x', range: 280 },
  motorcycle: { size: [2.1, 1.15, .8], fit: 'x', range: 160 },
  koban: { size: [4.5, 6, 4.5], fit: 'y', range: 300 },
  phone_booth: { size: [1, 2.3, 1], fit: 'y', range: 140 },
  bus_stop: { size: [.6, 2.5, .6], fit: 'y', range: 140 },
  street_light: { size: [3, 7, .4], fit: 'y', range: 260 },
  torii: { size: [3.2, 3, 1.2], fit: 'y', range: 200 },
  tiger: { size: [2.8, 1.1, .6], fit: 'x', range: 200 },
  panther: { size: [2.2, .8, .5], fit: 'x', range: 200 },
  potted_plants: { size: [1.5, 1, .8], fit: 'x', range: 100 },
  beer_crates: { size: [1, .9, .6], fit: 'x', range: 90 },
  aframe_sign: { size: [.55, .95, .5], fit: 'y', range: 90 },
  chochin: { size: [.35, .6, .35], fit: 'y', range: 110 },
  trash_bin: { size: [1.2, 1.1, .5], fit: 'x', range: 110 },
  recycle_bin: { size: [.6, .9, .6], fit: 'y', range: 100 },
  shutter_shop: { size: [4, 3.5, 1], fit: 'x', range: 160 },
  ac_outdoor: { size: [.8, .6, .3], fit: 'x', range: 90 },
  rifle: { size: [.95, .25, .08], fit: 'x', range: 120 },
  magazine_rack: { size: [2.2, 1.3, .5], fit: 'x', range: 70 },
  bento_case: { size: [2.2, 2.0, 1.0], fit: 'x', range: 70 },
  konbini_counter: { size: [2.2, 1.1, .8], fit: 'x', range: 70 },
  coffee_machine: { size: [.8, 1.6, .6], fit: 'y', range: 70 },
  atm: { size: [.8, 1.6, .7], fit: 'y', range: 70 },
  ticket_machine: { size: [.8, 1.8, .6], fit: 'y', range: 70 },
  karaoke_sofa: { size: [2.5, .9, 2], fit: 'x', range: 70 },
  station_gate: { size: [4, 1.1, 1.5], fit: 'x', range: 120 },
  tatami_room_set: { size: [1.4, .5, 1.4], fit: 'x', range: 70 },
  umbrella_open: { size: [1.0, .6, 1.0], fit: 'x', range: 80 },
  rubble_pile: { size: [4.5, 1.8, 3.5], fit: 'x', range: 260 },
  burnt_bus: { size: [10.5, 3.0, 2.5], fit: 'x', range: 320 },
  slab_rebar: { size: [6, 1.2, 4], fit: 'x', range: 260 },
  charred_tree: { size: [3, 7, 3], fit: 'y', range: 260 },
  hydrant: { size: [.4, .9, .4], fit: 'y', range: 90 },
  umbrella_clear: { size: [.9, .12, .12], fit: 'x', range: 70 },
  handbag: { size: [.38, .3, .14], fit: 'x', range: 60 },
  school_bag: { size: [.42, .3, .2], fit: 'x', range: 60 },
  smartphone: { size: [.15, .01, .075], fit: 'x', range: 40 },
  shopping_bag: { size: [.5, .3, .35], fit: 'x', range: 60 },
  bicycle_fallen: { size: [1.8, .55, .9], fit: 'x', range: 110 },
};

const placements = new Map();   // name → [{ m: Matrix4 (world), p: Vector3 }]
const _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _e = new THREE.Euler();

// x,y,z in the current kit frame; ry turns local +x (the model's forward) toward the desired heading
export function prop(name, x, y, z, ry = 0, scale = 1, tilt = 0) {
  if (!PROPS[name]) throw new Error('unknown prop ' + name);
  const m = K.frame.clone().multiply(new THREE.Matrix4().compose(_p.set(x, y, z), _q.setFromEuler(_e.set(tilt, ry, 0, 'YXZ')), _s.setScalar(scale)));
  if (!placements.has(name)) placements.set(name, []);
  placements.get(name).push({ m, p: new THREE.Vector3().setFromMatrixPosition(m) });
}
// world placements of the given prop names within r of (x, z) — used to stage people behind cars etc.
export function placementsNear(names, x, z, r) {
  const out = [];
  for (const n of names) for (const it of placements.get(n) || []) if (Math.hypot(it.p.x - x, it.p.z - z) < r) out.push({ name: n, ...it, yaw: Math.atan2(-it.m.elements[2], it.m.elements[0]) });
  return out;
}
export const propCount = () => [...placements.values()].reduce((a, l) => a + l.length, 0);

// invisible collision boxes for every placement (one merged mesh) — call before building the player collider
export function propColliders() {
  const geos = [];
  for (const [name, list] of placements) {
    const [L, H, D] = PROPS[name].size;
    if (PROPS[name].range < 100) continue;   // interior clutter: walk-through is fine, keeps the BVH small
    for (const { m } of list) { const g = new THREE.BoxGeometry(L * .92, H * .9, D * .9); g.translate(0, H * .45, 0); g.applyMatrix4(m); geos.push(g); }
  }
  if (!geos.length) return null;
  const mesh = new THREE.Mesh(mergeGeometries(geos), new THREE.MeshBasicMaterial());
  mesh.visible = false; mesh.name = 'propColliders';
  return mesh;
}

function normalise(gltf, spec) {
  const parts = []; gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]);
    parts.push({ g, mat: o.material });
  });
  const box = new THREE.Box3(); parts.forEach(({ g }) => { g.computeBoundingBox(); box.union(g.boundingBox); });
  const size = box.getSize(new THREE.Vector3());
  const rotate = size.z > size.x * 1.05;   // longest horizontal axis → x
  const c = box.getCenter(new THREE.Vector3());
  const ax = spec.fit === 'y' ? size.y : rotate ? size.z : size.x, target = spec.size[spec.fit === 'y' ? 1 : 0], k = target / ax;
  for (const { g } of parts) {
    g.translate(-c.x, -box.min.y, -c.z);
    if (rotate) g.rotateY(Math.PI / 2);
    g.scale(k, k, k);
  }
  return parts;
}

export function loadProps(scene, camera, updates) {
  const loader = new GLTFLoader(), sets = [];
  for (const [name, list] of placements) {
    loader.load(`./models/props/lod/${name}.glb`, (gltf) => {
      const parts = normalise(gltf, PROPS[name]);
      const meshes = parts.map(({ g, mat }) => {
        mat.side = THREE.FrontSide;
        const im = new THREE.InstancedMesh(g, mat, list.length); im.count = 0; im.frustumCulled = false;
        im.castShadow = true; im.receiveShadow = true; im.name = 'prop|' + name; scene.add(im); return im;
      });
      sets.push({ name, list, meshes, range: PROPS[name].range });
    }, undefined, () => console.warn('prop model missing', name));
  }
  let t = 0;
  const refresh = () => {
    const cp = camera.position;
    for (const s of sets) {
      let n = 0;
      for (const it of s.list) if (it.p.distanceTo(cp) < s.range) { for (const im of s.meshes) im.setMatrixAt(n, it.m); n++; }
      for (const im of s.meshes) { im.count = n; im.instanceMatrix.needsUpdate = true; }
    }
  };
  updates.push((dt) => { if ((t -= dt) < 0) { t = .3; refresh(); } });
}
