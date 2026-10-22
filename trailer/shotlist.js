// Trailer shot list. Fields (see trailer/shots.js):
//   id, dur (s), tod 'day' | 'dusk' | 'night', fov (deg or fn), p / l (camera / look-at keys) or cam(lt, k, t) → {p, l},
//   ease ('io' default, 'lin', 'o', 'i', 'io2'), shake (m of handheld), kick [[t, amp]] impacts, roll, focus / focusD,
//   aperture / maxblur (DOF; dof: false turns it off), exposure, player (keep the walk-mode player active),
//   setup(api) before warm-up, prep(api) right before frame 0, update(api, lt, k, dt) every frame.

// airship i of city/index.js airships(): position at game time t
const SHIPS = [[-900, -250, 330, 170], [-300, -420, 260, 190], [-620, -720, 300, 160], [-200, 120, 380, 210], [-1150, 80, 260, 150], [150, -500, 340, 230], [-1350, -600, 250, 180], [-800, 250, 280, 175], [60, -250, 300, 200], [-400, -900, 260, 185], [-1000, -650, 300, 165]];
export function ship(i, t) {
  const [cx, cz, R, y] = SHIPS[i], w = (i % 2 ? 1 : -1) * (.012 + i * .002), a = i * 1.7 + t * w;
  return [cx + Math.cos(a) * R, y + Math.sin(t * .3 + i) * 3, cz + Math.sin(a) * R];
}
const lerp3 = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);

// ♦4: keep the walk-mode player inside the tank (the round only runs while someone is in it), out of shot, first person
const bulbIn = ({ THREE, player, bulb }, { t = 150, lit = false, door = 0 } = {}) => {
  player.enter(); player.state.firstPerson = true;
  player.teleport(new THREE.Vector3(-415, -11.95, -455.5), Math.PI);
  return () => {
    const S = bulb.state; if (S.mode !== 'run') bulb.debug.start();
    S.t = t; S.jets = 1; S.breath = 99; S.door = S.doorGoal = door;
    S.sw = [false, false, false]; if (lit) S.sw[S.correct] = true;
  };
};
const keepBulb = ({ bulb }) => { bulb.state.breath = 99; };

let bulbPrep = null;

export const SHOTS = [
  /* ───── ACT I · silence ───── */
  { id: 'a1_aerial', dur: 8, tod: 'day', fov: 32, ease: 'lin',
    p: [[-700, 215, -430], [-625, 180, -290]], l: [[-495, 70, 30], [-500, 62, 30]], aperture: .00002 },
  { id: 'a2_tower_street', dur: 6, tod: 'day', fov: 34, ease: 'lin',
    p: [[-563, 3, 116], [-556, 3.2, 104]], l: [[-520, 80, 30], [-520, 90, 30]], shake: .15 },
  { id: 'a3_airship', dur: 6, tod: 'dusk', fov: 30, ease: 'lin',
    cam: (lt, k, t) => { const s = ship(3, t), c = ship(3, t - lt + 3); return { p: [c[0] + 30, c[1] - 75, c[2] + 55], l: [s[0], s[1] - 12, s[2]] }; } },
  { id: 'a4_palace', dur: 5, tod: 'day', fov: 36, ease: 'lin',
    p: [[-672, 32, -90], [-655, 31.5, -96]], l: [[-742, 5, -228], [-735, 5, -232]] },
  { id: 'a5_port', dur: 5, tod: 'day', fov: 36, ease: 'lin',
    p: [[110, 48, 270], [130, 40, 255]], l: [[268, 0, 228], [268, 0, 226]] },
  { id: 'a6_compound', dur: 5.5, tod: 'night', fov: 40, ease: 'o',
    p: [[-62, 14, 78], [-42, 42, 58]], l: [[0, 18, -28], [0, 23, -30]] },

  /* ───── ACT II · the games ───── */
  { id: 'b1_bulb_flood', dur: 5, tod: 'night', fov: 40, ease: 'lin', player: true,
    setup: (a) => { bulbPrep = bulbIn(a, { t: 160 }); }, prep: () => bulbPrep(), update: keepBulb,
    p: [[-414.5, -9.2, -455.2], [-411, -9.8, -451]], l: [[-404, -11, -441.5], [-404, -10.8, -440.5]], shake: .05 },
  { id: 'b2_bulb', dur: 3.5, tod: 'night', fov: 32, ease: 'lin', player: true,
    setup: (a) => { bulbPrep = bulbIn(a, { t: 200, door: 1 }); }, prep: () => bulbPrep(), focusD: 2.5,
    update: (a, lt) => { keepBulb(a); const S = a.bulb.state; S.sw[S.correct] = lt > 1.2; },
    p: [[-407.6, -9.3, -433.6], [-407.4, -9.2, -432.6]], l: [[-407, -9.5, -429.5], [-407, -9.55, -429.5]] },
  { id: 'b3_court', dur: 4.5, tod: 'night', fov: 38, ease: 'lin',
    p: [[-339, 127.5, -391], [-321, 127.5, -391]], l: [[-330, 124.8, -400], [-330, 124.8, -400]] },
  { id: 'b4_arena', dur: 5, tod: 'night', fov: 38, ease: 'lin',
    p: [[418, 4, -150], [452, 2.6, -150]], l: [[540, -3, -150], [540, -4, -150]] },
  { id: 'b5_clubs', dur: 4, tod: 'dusk', fov: 36, ease: 'lin',
    p: [[-626, 92, -747], [-612, 91.5, -752]], l: [[-600, 90, -780], [-600, 90, -781]] },
  { id: 'b6_hearts', dur: 4.5, tod: 'night', fov: 38, ease: 'o',
    p: [[-1142, 104, -266], [-1150, 90, -280]], l: [[-1162, 85, -298], [-1162, 85, -299]] },
  { id: 'b7_fire', dur: 4, tod: 'dusk', fov: 36, ease: 'lin',
    p: [[-1410, 2, -800], [-1404, 3.2, -830]], l: [[-1390, 20, -900], [-1388, 24, -902]], shake: .2 },
  { id: 'b8_hunt', dur: 4, tod: 'dusk', fov: 34, ease: 'lin', shake: .25,
    p: [[-989, 2.6, 284], [-989, 2.2, 270]], l: [[-991.5, 1.8, 221], [-991, 1.8, 221]] },
  { id: 'b9_konbini', dur: 3, tod: 'dusk', fov: 34, ease: 'lin', shake: .06,
    p: [[-959, 2.7, 249], [-959.3, 2.65, 248.6]], l: [[-991.5, 1, 221], [-991.5, 1.2, 221]] },
  { id: 'b10_prison', dur: 4, tod: 'night', fov: 38, ease: 'lin',
    p: [[-270, 2, 232], [-270, 3.5, 218]], l: [[-270, 7, 195], [-270, 8, 195]] },

  { id: 'm2_gunman_b', dur: 3, tod: 'dusk', fov: 24, ease: 'lin', shake: .1,
    p: [[-982, .7, 214], [-983, .8, 215]], l: [[-990, 1.7, 220], [-990, 1.7, 220]] },

  /* ───── finale ───── */
  { id: 'e1_tower', dur: 9, tod: 'dusk', fov: 34, ease: 'o',
    p: [[-575, 30, 125], [-625, 70, 200]], l: [[-520, 80, 30], [-525, 72, 30]], aperture: .00002 },
];
