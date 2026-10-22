// Trailer camera rig, loaded by trailer/rec.html next to the game. Each shot names a time of day, a lens and a camera
// path (keys of position / look-at, Catmull-Rom through them, eased in time); optional handheld shake and per-shot
// setup / per-frame hooks drive the game (the ♦4 flood, the light bulb, the hunt). trailer/rec.mjs calls
// __rec.begin(id), then __rec.frame() once per output frame and writes the JPEG it returns.
import * as THREE from 'three';
import { SHOTS } from './shotlist.js';

const W = window, FPS = 30;
const until = async (f, ms = 250) => { while (!f()) await new Promise((r) => setTimeout(r, ms)); };
const _p = new THREE.Vector3(), _l = new THREE.Vector3(), _a = new THREE.Vector3();

// smooth noise for handheld: sum of sines at incommensurate rates
const wob = (t, s) => Math.sin(t * 1.31 + s) * .5 + Math.sin(t * 2.17 + s * 2.3) * .3 + Math.sin(t * 4.7 + s * .7) * .2;
const ease = { lin: (k) => k, io: (k) => k * k * (3 - 2 * k), o: (k) => 1 - (1 - k) ** 3, i: (k) => k * k * k, io2: (k) => k < .5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2 };

function path(keys, k, out) {   // Catmull-Rom through keys at parameter k ∈ [0,1]
  if (keys.length === 1) return out.set(...keys[0]);
  const n = keys.length - 1, f = Math.min(n - 1e-9, Math.max(0, k * n)), i = Math.floor(f), u = f - i;
  const P = (j) => keys[Math.max(0, Math.min(n, j))];
  const a = P(i - 1), b = P(i), c = P(i + 1), d = P(i + 2);
  for (let x = 0; x < 3; x++) {
    const p0 = a[x], p1 = b[x], p2 = c[x], p3 = d[x];
    out.setComponent(x, .5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u));
  }
  return out;
}

let cur = null, t0 = 0, frameN = 0, grabC = null;
let focusD = 60;   // DOF focus distance: main.js rewrites the uniform every frame, so it is pinned to this instead
let pinned = false;
function pinFocus() { if (pinned || !W.__dof) return; pinned = true; Object.defineProperty(W.__dof.uniforms.focus, 'value', { get: () => focusD, set() {} }); }
const api = () => ({ THREE, scene: W.__scene, camera: W.__camera, day: W.__day, grade: W.__grade, dof: W.__dof, bloom: W.__bloom, bulb: W.__bulb, player: W.__player });

W.__camHook = (dt, t) => {
  if (!cur) return;
  const s = cur, lt = (W.__clock.ms - t0) / 1000, k = (s.ease ? ease[s.ease] : ease.io)(Math.min(1, Math.max(0, lt / s.dur)));
  const cam = W.__camera;
  if (s.cam) { const c = s.cam(lt, k, t); _p.set(...c.p); _l.set(...c.l); } else { path(s.p, k, _p); path(s.l, k, _l); }
  if (s.shake) {   // handheld: position drift + look jitter, in metres at the subject
    const a = s.shake;
    _p.x += wob(lt, 1) * a * .35; _p.y += wob(lt, 2) * a * .25; _p.z += wob(lt, 3) * a * .35;
    _l.x += wob(lt * 1.3, 4) * a; _l.y += wob(lt * 1.3, 5) * a * .7; _l.z += wob(lt * 1.3, 6) * a;
  }
  if (s.kick) for (const [kt, amp] of s.kick) { const d = lt - kt; if (d > 0 && d < .6) { const e = Math.exp(-d * 9) * amp; _l.x += Math.sin(d * 70) * e; _l.y += Math.cos(d * 53) * e; } }   // impact shake
  cam.position.copy(_p); cam.up.set(0, 1, 0); cam.lookAt(_l);
  const roll = typeof s.roll === 'function' ? s.roll(lt, k) : (s.roll || 0);
  if (roll) cam.rotateZ(roll);
  const fov = typeof s.fov === 'function' ? s.fov(lt, k) : (s.fov || 36);
  if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
  cam.updateMatrixWorld();
  focusD = s.focusD ?? null;
  W.__controls.target.copy(s.focus ? _a.set(...(typeof s.focus === 'function' ? s.focus(lt, k) : s.focus)) : _l);   // DOF focus + the sun-shadow centre follow this
  s.update?.(api(), lt, k, dt);
  if (focusD === null) focusD = cam.position.distanceTo(W.__controls.target);
};

W.__rec = {
  shots: SHOTS.map((s) => s.id),
  async ready() {
    await until(() => !document.getElementById('load') && W.__walkers?.length && W.__bulb);
    return { w: W.__renderer.domElement.width, h: W.__renderer.domElement.height, gl: (() => { const gl = W.__renderer.getContext(), d = gl.getExtension('WEBGL_debug_renderer_info'); return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : '?'; })() };
  },
  step(n = 1) { for (let i = 0; i < n; i++) W.__clock.step(1000 / FPS); },
  info(id) { const s = SHOTS.find((x) => x.id === id); return s && { id: s.id, frames: Math.round(s.dur * FPS), dur: s.dur }; },
  async begin(id, { warm = 2500 } = {}) {
    const s = SHOTS.find((x) => x.id === id); if (!s) throw new Error('no shot ' + id);
    cur = null;
    pinFocus();
    if (!s.player && W.__player.active) W.__player.exit();
    const tod = s.tod || 'day';
    if ((W.__day.isDusk ? 'dusk' : W.__day.isDay ? 'day' : 'night') !== tod) W.__day.set(tod === 'day' ? true : tod === 'night' ? false : 'dusk');
    W.__dof.enabled = s.dof !== false; W.__dof.uniforms.aperture.value = s.aperture ?? .00012; W.__dof.uniforms.maxblur.value = s.maxblur ?? .006;
    W.__grade.setBars(false);
    if (s.exposure) W.__renderer.toneMappingExposure = s.exposure; else W.__renderer.toneMappingExposure = 1.05;
    await s.setup?.(api());
    // park the camera at the first frame and let streaming (props, trees, LODs, textures) settle in real time
    t0 = W.__clock.ms; cur = { ...s, update: null };
    for (let i = 0; i < 4; i++) { W.__clock.step(1000 / FPS); t0 = W.__clock.ms; }
    await new Promise((r) => setTimeout(r, warm));
    for (let i = 0; i < 6; i++) { W.__clock.step(1000 / FPS); t0 = W.__clock.ms; await new Promise((r) => setTimeout(r, 30)); }
    await s.prep?.(api());   // after warm-up, right before frame 0 (reset game state the warm-up advanced)
    cur = s; t0 = W.__clock.ms - 1000 / FPS; frameN = 0;
    return Math.round(s.dur * FPS);
  },
  // advance one frame and return it as a JPEG data URL (drawn down to w × h)
  frame(w = 1920, h = 816, q = .93) {
    W.__clock.step(1000 / FPS); frameN++;
    const src = W.__renderer.domElement;
    if (!grabC) grabC = document.createElement('canvas');
    if (grabC.width !== w || grabC.height !== h) { grabC.width = w; grabC.height = h; }
    const g = grabC.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(src, 0, 0, w, h);
    return grabC.toDataURL('image/jpeg', q);
  },
  // planning: stills of a shot at fractions ks of its duration (game hooks run, but time does not pass in between)
  async peek(id, ks = [0, .5, 1], w = 960, h = 408) {
    const n = await this.begin(id, { warm: 1500 }), s = cur, out = [];
    for (const k of ks) {
      t0 = W.__clock.ms + 1000 / FPS - k * s.dur * 1000; out.push(this.frame(w, h, .85));
      await new Promise((r) => setTimeout(r, 400));
    }
    return out;
  },
  // a single still at an arbitrary camera (planning)
  async still(p, l, { tod = 'day', fov = 36, w = 1280, h = 544, warm = 2500 } = {}) {
    cur = null;
    if ((W.__day.isDusk ? 'dusk' : W.__day.isDay ? 'day' : 'night') !== tod) W.__day.set(tod === 'day' ? true : tod === 'night' ? false : 'dusk');
    W.__dof.enabled = false;
    cur = { p: [p], l: [l], fov, dur: 1 }; t0 = W.__clock.ms;
    for (let i = 0; i < 3; i++) W.__clock.step(1000 / FPS);
    await new Promise((r) => setTimeout(r, warm));
    for (let i = 0; i < 3; i++) { W.__clock.step(1000 / FPS); await new Promise((r) => setTimeout(r, 20)); }
    return this.frame(w, h, .85);
  },
};
