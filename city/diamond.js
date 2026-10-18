// King of Diamonds tower (P5): a ~140 m dark stone & glass skyscraper on a tree plaza. At the top sits the
// octagonal courtroom — black polished floor with light inlays, a stepped pit under a hanging press column,
// four player desks, the judge's raised bench, the scales display, glass water tanks, wood panelling with
// amber strips, dark alcoves, a control room behind glass, heavy red-lit doors, glass walls onto the skyline.
import * as THREE from 'three';
import * as K from '../kit.js';
const { box, cyl, sph, strut, torus, put, M4, withFrame, def, std, bas, canvasTex, noise } = K;

const H0 = 124, T = 20;                                   // courtroom floor level, tower-top half size (40 × 40 m)
const A = 15, OCT = Math.PI / 4, SIDE = 2 * A * Math.tan(Math.PI / 8), HC = 10;   // chamber apothem, side length, height
const P = 4.5;                                            // pit half size
const quad = (k, w, h, x, y, z, ry = 0, rx = 0) => put(k, new THREE.PlaneGeometry(w, h), M4(x, y, z, rx, ry, 0));   // 0..1 UVs
const dia = (g, cx, cy, w, h) => { g.beginPath(); g.moveTo(cx, cy - h / 2); g.lineTo(cx + w / 2, cy); g.lineTo(cx, cy + h / 2); g.lineTo(cx - w / 2, cy); g.closePath(); };

/* ───────────── materials ───────────── */
let made = false;
function materials() {
  if (made) return; made = true;
  const r = K.rng(4401);
  const facDay = canvasTex(256, 256, (g, W, H) => {
    g.fillStyle = '#16191d'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const x = i * 64, y = j * 64, gr = g.createLinearGradient(x, y, x + 64, y + 50);
      gr.addColorStop(0, '#34485a'); gr.addColorStop(1, '#0f161d'); g.fillStyle = gr; g.fillRect(x + 3, y + 3, 58, 47);
      g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(x + 3, y + 3, 20, 47);
      g.fillStyle = '#3a4048'; g.fillRect(x + 31, y + 3, 2, 47);
      g.fillStyle = '#101113'; g.fillRect(x, y + 51, 64, 13);
    }
    noise(g, W, H, 12);
    for (let i = 0; i < 14; i++) { const x = r() * W, gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(0,0,0,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x, 0, 2 + r() * 4, H * r()); }
  }, { repeat: true });
  const facGlow = canvasTex(256, 256, (g, W, H) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { if (r() > .3) continue; g.fillStyle = r() < .7 ? '#ffc98a' : '#bfe0ff'; g.fillRect(i * 64 + 4, j * 64 + 4, 56, 45); }
  }, { repeat: true });
  const fac = std({ map: facDay, emissiveMap: facGlow, emissive: 0xffffff, emissiveIntensity: 0, roughness: .22, metalness: .7 });
  def('diamond_fac', fac, 14);
  const stone = canvasTex(256, 256, (g, W, H) => {
    g.fillStyle = '#2b2c2f'; g.fillRect(0, 0, W, H); noise(g, W, H, 26);
    for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(${150 + r() * 80},${150 + r() * 80},${150 + r() * 80},${r() * .25})`; g.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r() * 2); }
    g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 2; g.strokeRect(0, 0, W, H);
  }, { repeat: true });
  def('diamond_stone', std({ map: stone, color: 0x8a8c90, roughness: .45, metalness: .25 }), 4);
  const floor = canvasTex(256, 256, (g, W, H) => {
    g.fillStyle = '#1e2024'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const x = i * 128, y = j * 128, gr = g.createLinearGradient(x, y, x + 128, y + 128);
      gr.addColorStop(0, '#16171a'); gr.addColorStop(.5, '#0a0b0d'); gr.addColorStop(1, '#131417'); g.fillStyle = gr; g.fillRect(x + 2, y + 2, 124, 124);
    }
    noise(g, W, H, 8);
  }, { repeat: true });
  def('diamond_floor', std({ map: floor, roughness: .1, metalness: .55 }), 2.6);
  const wall = canvasTex(256, 256, (g, W, H) => {
    g.fillStyle = '#1c1d21'; g.fillRect(0, 0, W, H); noise(g, W, H, 14);
    g.fillStyle = '#0c0d0f'; for (let x = 0; x < W; x += 64) g.fillRect(x, 0, 3, H); g.fillRect(0, 0, W, 3); g.fillRect(0, H / 2, W, 2);
    g.fillStyle = 'rgba(255,255,255,.05)'; for (let x = 3; x < W; x += 64) g.fillRect(x, 0, 2, H);
  }, { repeat: true });
  def('diamond_wall', std({ map: wall, roughness: .38, metalness: .5 }), 3);
  const wood = canvasTex(256, 256, (g, W, H) => {
    g.fillStyle = '#7a4a24'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(${40 + r() * 40},${20 + r() * 20},10,${.15 + r() * .3})`; g.lineWidth = 1 + r() * 2; g.beginPath(); const x = r() * W; g.moveTo(x, 0); g.bezierCurveTo(x + (r() - .5) * 20, H / 3, x + (r() - .5) * 20, H * .66, x + (r() - .5) * 10, H); g.stroke(); }
    g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(0, 0, 3, H); noise(g, W, H, 10);
  }, { repeat: true });
  def('diamond_wood', std({ map: wood, roughness: .42, metalness: .05 }), 1.4);
  def('diamond_amber', bas({ color: new THREE.Color(3.2, 1.7, .55) }));
  def('diamond_line', bas({ color: new THREE.Color(2.4, 2.25, 2.05) })); K.mats.diamond_line.userData.noCollide = true;
  def('diamond_glass', std({ color: 0x9fb6c6, transparent: true, opacity: .16, roughness: .04, metalness: .9, side: THREE.DoubleSide, depthWrite: false }));
  def('diamond_tank', std({ color: 0xd8f0ea, emissive: 0x0b1c1a, transparent: true, opacity: .28, roughness: .05, metalness: .6, depthWrite: false }));
  def('diamond_water', bas({ color: new THREE.Color(.55, 1.5, 1.35), transparent: true, opacity: .32, depthWrite: false })); K.mats.diamond_water.userData.noCollide = true;
  def('diamond_void', bas({ color: 0x040405 }));
  def('diamond_door', std({ color: 0x2a2c30, roughness: .32, metalness: .85 }));
  def('diamond_leather', std({ color: 0x0e0e10, roughness: .5, metalness: .1 }));
  def('diamond_redP', std({ color: 0x8c1c1c, roughness: .7 }));
  // desk screen: red diamond on a dark UI
  const scr = canvasTex(512, 288, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#1a2633'); gr.addColorStop(1, '#0b1118'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#5c6e80'; g.lineWidth = 3; g.strokeRect(6, 6, W - 12, H - 12);
    g.fillStyle = '#8a9aaa'; g.fillRect(20, 20, W - 40, 6);
    for (let k = 0; k < 6; k++) { g.fillStyle = '#6a7a8a'; g.fillRect(24, 50 + k * 34, 70 + r() * 50, 6); g.fillStyle = '#c03030'; g.fillRect(W - 150, 50 + k * 34, 30 + r() * 90, 6); }
    g.fillStyle = '#e8242c'; dia(g, W / 2, H / 2 + 8, 92, 140); g.fill(); g.strokeStyle = '#f2f2f2'; g.lineWidth = 3; dia(g, W / 2, H / 2 + 8, 108, 160); g.stroke();
  });
  def('diamond_screen', bas({ map: scr, color: new THREE.Color(1.5, 1.5, 1.5) }));
  // the wall display: scales of justice + red diamond, player rows either side
  const disp = canvasTex(1024, 410, (g, W, H) => {
    g.fillStyle = '#0d1014'; g.fillRect(0, 0, W, H); g.strokeStyle = '#3c4450'; g.lineWidth = 3; g.strokeRect(6, 6, W - 12, H - 12);
    g.fillStyle = '#c8ccd2'; g.font = 'bold 18px sans-serif'; g.textAlign = 'center'; g.fillText('♦   KING  OF  DIAMONDS   ·   JUDGEMENT   ♦', W / 2, 36);
    const cx = W / 2; g.strokeStyle = '#d8dce2'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(cx, 70); g.lineTo(cx, 352); g.moveTo(cx - 150, 110); g.lineTo(cx + 150, 110); g.moveTo(cx - 70, 352); g.lineTo(cx + 70, 352); g.stroke();
    for (const s of [-1, 1]) { const px = cx + s * 150; g.beginPath(); g.moveTo(px, 110); g.lineTo(px - 48, 232); g.moveTo(px, 110); g.lineTo(px + 48, 232); g.stroke(); g.beginPath(); g.ellipse(px, 232, 58, 14, 0, 0, Math.PI); g.stroke(); g.beginPath(); g.moveTo(px - 58, 232); g.lineTo(px + 58, 232); g.stroke(); }
    g.fillStyle = '#d8dce2'; g.beginPath(); g.arc(cx, 70, 9, 0, 7); g.fill();
    g.fillStyle = '#e0202a'; dia(g, cx, 212, 110, 160); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 3; dia(g, cx, 212, 126, 180); g.stroke();
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
      const x0 = s < 0 ? 50 : W - 330, y0 = 80 + k * 100;
      g.strokeStyle = '#9aa4b0'; g.lineWidth = 2; g.beginPath(); g.arc(x0 + 30, y0 + 30, 25, 0, 7); g.stroke();
      g.fillStyle = '#9aa4b0'; g.beginPath(); g.arc(x0 + 30, y0 + 22, 9, 0, 7); g.fill(); g.beginPath(); g.ellipse(x0 + 30, y0 + 46, 15, 9, 0, Math.PI, 0); g.fill();
      g.fillStyle = '#c8ccd2'; g.fillRect(x0 + 72, y0 + 12, 150, 8); g.fillStyle = '#5a6370'; g.fillRect(x0 + 72, y0 + 30, 200, 6);
      g.fillStyle = '#d42a2a'; g.fillRect(x0 + 72, y0 + 44, 60 + r() * 150, 8);
    }
  });
  def('diamond_disp', bas({ map: disp, color: new THREE.Color(1.35, 1.35, 1.35) }));
  const mon = canvasTex(512, 288, (g, W, H) => {
    g.fillStyle = '#0c1218'; g.fillRect(0, 0, W, H); g.strokeStyle = '#4a5a6a'; g.lineWidth = 2;
    for (let k = 0; k < 3; k++) { g.strokeRect(14 + k * 166, 16, 150, 110); g.beginPath(); g.moveTo(20 + k * 166, 110); for (let x = 0; x < 140; x += 10) g.lineTo(20 + k * 166 + x, 60 + r() * 50); g.stroke(); }
    g.fillStyle = '#e0242c'; dia(g, 90, 210, 60, 90); g.fill();
    for (let k = 0; k < 5; k++) { g.fillStyle = '#7a8a9a'; g.fillRect(160, 160 + k * 22, 120 + r() * 200, 7); }
  });
  def('diamond_mon', bas({ map: mon, color: new THREE.Color(1.3, 1.3, 1.3) }));
  const pit = canvasTex(256, 256, (g, W, H) => {
    g.fillStyle = '#050506'; g.fillRect(0, 0, W, H); g.strokeStyle = 'rgba(255,225,180,.85)'; g.lineWidth = 2; const c = W / 2;
    for (const rr of [30, 60, 90, 120]) { g.beginPath(); for (let i = 0; i <= 8; i++) { const a = (i + .5) * OCT; g.lineTo(c + Math.cos(a) * rr, c + Math.sin(a) * rr); } g.stroke(); }
    for (let i = 0; i < 8; i++) { const a = (i + .5) * OCT; g.beginPath(); g.moveTo(c + Math.cos(a) * 18, c + Math.sin(a) * 18); g.lineTo(c + Math.cos(a) * 128, c + Math.sin(a) * 128); g.stroke(); }
  });
  def('diamond_pit', bas({ map: pit, color: new THREE.Color(1.4, 1.4, 1.4) }));
}

/* ───────────── courtroom pieces (chamber-local, floor y = 0) ───────────── */
// frame on octagon side i: local x along the wall, local +z points into the room, wall face at z = 0
function side(i, fn, r = A) { const th = i * OCT; withFrame(r * Math.cos(th), 0, r * Math.sin(th), K.ang(-Math.sin(th), Math.cos(th)), fn); }
function octLine(r, w = .06) { const s = 2 * r * Math.tan(Math.PI / 8); for (let i = 0; i < 8; i++) side(i, () => box('diamond_line', s + w, .02, w, 0, .012, 0), r); }

function chair(x, z, ry = 0, y = 0, tall = 1) {
  withFrame(x, y, z, ry, () => {
    for (let i = 0; i < 5; i++) { const a = i * 1.2566; box('steel', .06, .05, .34, Math.sin(a) * .17, .05, Math.cos(a) * .17, a); }
    cyl('pipeG', .04, .42, 0, .28, 0, 0, 0, 0, 8);
    box('diamond_leather', .56, .12, .52, 0, .52, 0);
    const bh = .65 * tall; box('diamond_leather', .54, bh, .1, 0, .58 + bh / 2, -.28, 0, 0, -.1);
    for (const s of [-1, 1]) box('steel', .05, .05, .4, s * .3, .7, 0);
  });
}
function desk() {   // angled player console: seat on −z, front (red strips) faces the pit on +z
  box('diamond_stone', 2.6, .84, 1.1, 0, .42, 0);
  box('diamond_wall', 2.9, .1, 1.5, 0, .89, -.1);
  for (const s of [-1, 1]) { box('diamond_stone', .25, .9, 1.4, s * 1.42, .45, -.05, s * .35); box('redS', .05, .6, .03, s * .95, .45, .56); }
  box('steel', 1.7, 1.0, .06, 0, 1.13, .1, Math.PI, 0, -Math.PI / 2 + .4);
  quad('diamond_screen', 1.56, .88, 0, 1.167, .084, Math.PI, -Math.PI / 2 + .4);
  quad('diamond_screen', .5, .3, -1.0, .946, -.55, Math.PI, -Math.PI / 2);   // small keypad screen
  chair(0, -1.3, 0);
  K.pool(0, -.3, 2.2, true, 0);
}
function tank(x, z) {   // glass water cylinder with metal caps, piped to the ceiling
  box('diamond_stone', 1.8, 1.0, 1.8, x, .5, z);
  cyl('pipeG', .82, .5, x, 1.25, z, 0, 0, 0, 16); cyl('steel', .9, .08, x, 1.52, z, 0, 0, 0, 16);
  cyl('diamond_tank', .68, 3.4, x, 3.2, z, 0, 0, 0, 16);
  cyl('diamond_water', .6, 2.9, x, 3.0, z, 0, 0, 0, 16);
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + .4; box('steelL', .06, 3.4, .06, x + Math.cos(a) * .7, 3.2, z + Math.sin(a) * .7); }
  cyl('steel', .9, .08, x, 4.92, z, 0, 0, 0, 16); cyl('pipeG', .82, .5, x, 5.2, z, 0, 0, 0, 16); cyl('pipeG', .82, .7, x, 5.8, z, 0, 0, 0, 16, .22);
  cyl('pipeG', .13, HC - 6.1, x, (6.1 + HC) / 2, z, 0, 0, 0, 8);
  for (const y of [7, 8.6]) cyl('steel', .22, .18, x, y, z, 0, 0, 0, 8);
  box('glowC', .6, .02, .6, x, 1.56, z);
  K.pool(x, z, 1.8, false, 0);
}
function wood(w, y0 = .7) {   // wood band between amber strips
  box('diamond_wood', w, 1.6, .12, 0, y0 + .8, .06);
  box('diamond_amber', w, .05, .06, 0, y0 - .02, .1); box('diamond_amber', w, .05, .06, 0, y0 + 1.62, .1);
  box('diamond_stone', w, y0, .16, 0, y0 / 2, .08);
}
function alcoves(n) {
  for (let k = 0; k < n; k++) {
    const x = (k - (n - 1) / 2) * 2.5;
    box('diamond_void', 1.1, 1.9, .04, x, 4.0, .02); cyl('diamond_void', .55, .04, x, 4.95, .02, Math.PI / 2, 0, 0, 12);
    box('steel', 1.35, .1, .14, x, 3.02, .06); box('diamond_amber', .8, .04, .04, x, 3.1, .1);
  }
}
function solidWall() { box('diamond_wall', SIDE + .5, HC, .5, 0, HC / 2, -.25); box('diamond_amber', SIDE, .06, .06, 0, HC - .7, .05); }
function glassWall() {
  box('diamond_glass', SIDE + .2, HC, .06, 0, HC / 2, 0);
  for (let k = 0; k <= 5; k++) box('steel', .12, HC, .22, -SIDE / 2 + k * SIDE / 5, HC / 2, 0);
  box('steel', SIDE + .4, .25, .3, 0, .125, 0); box('steel', SIDE + .4, .4, .3, 0, HC - .2, 0); box('steel', SIDE, .08, .16, 0, 3, 0);
  box('diamond_line', SIDE - .4, .02, .06, 0, .012, 1.0);
}
function doorWall() {
  solidWall(); withFrame(-4.4, 0, 0, 0, () => wood(3, .7)); withFrame(4.4, 0, 0, 0, () => wood(3, .7));
  box('diamond_void', 3.2, 3.6, .04, 0, 1.8, .02);
  for (const s of [-1, 1]) {
    box('diamond_door', 1.22, 3.3, .14, s * .63, 1.65, .09);
    box('pipeG', .05, .8, .06, s * .14, 1.35, .19); box('redS', .1, .7, .02, s * .35, 2.25, .17);
    box('steel', .22, 3.7, .28, s * 1.42, 1.85, .14);
    box('redS', .08, 3.2, .04, s * 1.75, 1.7, .05); box('redS', .06, 6.5, .04, s * 2.5, 5.2, .05);
  }
  box('steel', 3.1, .35, .28, 0, 3.55, .14);
  box('steel', .34, .5, .06, 2.05, 1.45, .05); quad('diamond_screen', .26, .34, 2.05, 1.48, .085);
}
function controlRoom() {   // raised room behind glass on the west side
  box('diamond_wall', SIDE + .5, 1.5, .5, 0, .75, -.25); box('diamond_wall', SIDE + .5, HC - 4.6, .5, 0, (4.6 + HC) / 2, -.25);
  box('diamond_glass', SIDE, 3.1, .05, 0, 3.05, -.25);
  for (let k = 0; k <= 4; k++) box('steel', .1, 3.1, .14, -SIDE / 2 + k * SIDE / 4, 3.05, -.25);
  box('steel', SIDE + .4, .12, .4, 0, 1.5, -.1); box('diamond_amber', SIDE, .05, .05, 0, 1.4, .05);
  const D = T - .5 - A;   // room depth to the outer wall
  box('diamond_floor', SIDE, .2, D, 0, 1.4, -D / 2); box('diamond_wall', SIDE, .2, D, 0, 4.7, -D / 2);
  for (const s of [-1, 1]) box('diamond_wall', .3, HC, D, s * (SIDE / 2 + .15), HC / 2, -D / 2);
  box('diamond_amber', SIDE - 1, .04, .1, 0, 4.58, -D / 2);
  box('diamond_stone', SIDE - 1.6, .75, .8, 0, 1.875, -1.7);
  for (let k = 0; k < 5; k++) {
    const x = (k - 2) * 1.95;
    box('steel', 1.2, .72, .06, x, 2.7, -1.85); quad('diamond_mon', 1.1, .62, x, 2.7, -1.815);
    box('steel', .08, .4, .08, x, 2.2, -1.9);
    chair(x, -2.9, 0, 1.5);
  }
  for (let k = 0; k < 3; k++) { const x = (k - 1) * 3.4; box('steel', 2.6, 1.5, .08, x, 3.55, -D + .05); quad('diamond_mon', 2.4, 1.32, x, 3.55, -D + .1); }
}

function courtroom() {
  // floor (polished black) with the pit hole
  box('diamond_floor', 2 * T, .5, T - P, 0, -.25, -(T + P) / 2); box('diamond_floor', 2 * T, .5, T - P, 0, -.25, (T + P) / 2);
  box('diamond_floor', T - P, .5, 2 * P, -(T + P) / 2, -.25, 0); box('diamond_floor', T - P, .5, 2 * P, (T + P) / 2, -.25, 0);
  // stepped pit: six 0.2 m rings down to the lit floor
  for (let k = 1; k <= 6; k++) {
    const o = P - .35 * (k - 1), n = P - .35 * k, top = -.2 * k, h = 1.5 + top, y = top - h / 2;
    for (const s of [-1, 1]) { box('steel', 2 * o, h, o - n, 0, y, s * (o + n) / 2); box('steel', o - n, h, 2 * n, s * (o + n) / 2, y, 0); }
  }
  const n6 = P - 2.1; box('steel', 2 * n6, .3, 2 * n6, 0, -1.35, 0); quad('diamond_pit', 2 * n6, 2 * n6, 0, -1.19, 0, 0, -Math.PI / 2);
  for (const s of [-1, 1]) { box('diamond_line', 2 * P + .4, .02, .08, 0, .012, s * (P + .2)); box('diamond_line', .08, .02, 2 * P + .4, s * (P + .2), .012, 0); box('glowY', 2 * P - .7, .03, .05, 0, -.2, s * (P - .33)); }
  // hanging press column into the pit
  cyl('pipeG', .45, HC + 1.2, 0, (HC - 1.2) / 2, 0, 0, 0, 0, 16);
  for (const y of [1.6, 4, 6.5, 9]) cyl('steel', .68, .32, 0, y, 0, 0, 0, 0, 16);
  cyl('steelL', 1.0, .6, 0, 2.6, 0, 0, 0, 0, 8); cyl('steel', 1.25, .4, 0, -1.0, 0, 0, 0, 0, 8);
  // floor light inlays
  octLine(12.4); octLine(6.7);
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) box('diamond_line', dx ? 4.4 : .06, .02, dz ? 4.4 : .06, dx * 6.9, .012, dz * 6.9);
  // four player desks around the pit
  for (let j = 0; j < 4; j++) {
    const a = (j + .5) * Math.PI / 2, px = 7.6 * Math.cos(a), pz = 7.6 * Math.sin(a);
    withFrame(px, 0, pz, Math.atan2(-px, -pz), desk);
    torus('diamond_line', 2.3, .025, Math.PI * 2, px, .015, pz, Math.PI / 2, 0, 0, 40);
  }
  // judge's raised bench + tall chair (north)
  withFrame(0, 0, -12, 0, () => {
    box('diamond_stone', 8, .6, 5.8, 0, .3, 0);
    box('diamond_stone', 4, .4, .35, 0, .2, 3.075); box('diamond_stone', 4, .2, .35, 0, .1, 3.425);
    box('diamond_line', 4, .02, .05, 0, .41, 3.25); box('diamond_line', 4, .02, .05, 0, .21, 3.6); box('diamond_line', 8, .02, .05, 0, .61, 2.88);
    box('diamond_stone', 5.4, 1.25, 1.1, 0, 1.225, 1.2); box('steel', 5.6, .08, 1.3, 0, 1.89, 1.2);
    box('diamond_wood', 4.6, .9, .05, 0, 1.2, 1.77);
    for (const s of [-1, 1]) box('redS', .06, 1.0, .03, s * 2.5, 1.2, 1.77);
    box('steel', 1.2, .7, .06, 0, 2.25, 1.3, Math.PI, 0, -.25); quad('diamond_screen', 1.1, .62, 0, 2.25, 1.265, Math.PI, -.25);
    chair(0, -.4, 0, .6, 3.6);
    K.pool(0, .5, 3, true, .6);
  });
  // octagon walls
  for (let i = 0; i < 8; i++) side(i, () => {
    if (i === 0 || i === 1 || i === 7) glassWall();
    else if (i === 2) doorWall();
    else if (i === 4) controlRoom();
    else { solidWall(); wood(SIDE - .6); if (i !== 6) alcoves(4); }
  });
  // scales-of-justice display on the north wall
  box('steel', 10.9, 4.6, .15, 0, 6.6, -14.93); quad('diamond_disp', 10.5, 4.2, 0, 6.6, -14.84);
  box('diamond_amber', 10.6, .05, .06, 0, 4.2, -14.9);
  // four water tanks across the back arc
  for (const j of [4, 5, 6, 7]) { const a = (j + .5) * OCT; tank(13.2 * Math.cos(a), 13.2 * Math.sin(a)); }
  // ceiling: dark slab ring + skylight, beams carrying the press, cove lights
  const S = 6;
  box('diamond_wall', 2 * T, .6, T - S, 0, HC + .3, -(T + S) / 2); box('diamond_wall', 2 * T, .6, T - S, 0, HC + .3, (T + S) / 2);
  box('diamond_wall', T - S, .6, 2 * S, -(T + S) / 2, HC + .3, 0); box('diamond_wall', T - S, .6, 2 * S, (T + S) / 2, HC + .3, 0);
  box('diamond_glass', 2 * S, .05, 2 * S, 0, HC + .5, 0);
  for (let k = -2; k <= 2; k++) { box('steel', .14, .3, 2 * S, k * 2.4, HC + .4, 0); box('steel', 2 * S, .3, .14, 0, HC + .4, k * 2.4); }
  box('steel', 2 * S + 1, .9, .9, 0, HC - .15, 0); box('steel', .9, .9, 2 * S + 1, 0, HC - .15, 0);
  for (let i = 0; i < 8; i++) side(i, () => box('glowY', 1.2, .05, .3, 0, HC - .05, 2.2), A);
}

/* ───────────── tower shell ───────────── */
function crown() {   // tower-top shell around the chamber (local y = 0 at the courtroom floor)
  const HW = HC + 2;
  box('diamond_stone', 2 * T, HW, .5, 0, HW / 2, -(T - .25)); box('diamond_stone', 2 * T, HW, .5, 0, HW / 2, T - .25);
  box('diamond_stone', .5, HW, 2 * T - 1, -(T - .25), HW / 2, 0);
  box('diamond_stone', .5, 1.2, 2 * T - 1, T - .25, .6, 0); box('diamond_stone', .5, 1.4, 2 * T, T - .25, HC + 1.3, 0);
  for (const s of [-1, 1]) box('diamond_stone', .4, HC, T - .5 - A, SIDE / 2 + .2, HC / 2, s * (A + (T - .5 - A) / 2));   // close the N/S service strips
  // terraces outside the glass: planters and ivy
  for (const s of [-1, 1]) { box('concD', 1.2, .8, 6, T - 1.4, .4, s * 13); box('ivy', 1, .3, 5.6, T - 1.4, .9, s * 13); }
  // neon diamond + red strips on the south crown
  const y = 6, z = T + .08;
  strut('redS', [0, y + 3.6, z], [2.2, y, z], .12); strut('redS', [2.2, y, z], [0, y - 3.6, z], .12);
  strut('redS', [0, y - 3.6, z], [-2.2, y, z], .12); strut('redS', [-2.2, y, z], [0, y + 3.6, z], .12);
  box('redS', 1.6, 1.6, .06, 0, y, z, 0, Math.PI / 4);
  for (const s of [-1, 1]) { box('redS', .14, 9, .1, s * 7, 5.5, z); box('redS', .1, 9, .14, -(T + .08), 5.5, s * 7); }
  // roof: mechanical boxes, mast, beacons
  const yr = HC + .6;
  K.acUnit(-14, yr, 12); K.acUnit(-11, yr, 12); K.acUnit(12, yr, -14, Math.PI / 2);
  box('steelL', 5, 2.4, 3, -13, yr + 1.2, -12);
  cyl('steelL', .4, 16, -15, yr + 8, -15, 0, 0, 0, 8, .1);
  for (let k = 1; k < 4; k++) strut('steel', [-15 - .6, yr + k * 3.5, -15], [-15 + .6, yr + k * 3.5, -15], .04, 4);
  K.beacon(-15, yr + 16.3, -15, .4);
  for (const a of [-1, 1]) for (const b of [-1, 1]) K.beacon(a * (T - .1), HC + 3, b * (T - .1), .4);
}
function tower(cards, scene) {
  const B = 22;   // base shaft half size
  // lobby (0..6): glass box, stone columns, lift core
  box('diamond_floor', 2 * B - 2, .1, 2 * B - 2, 0, .09, 0);
  box('diamond_glass', 2 * B - 2, 6, .1, 0, 3, -(B - 1)); box('diamond_glass', .1, 6, 2 * B - 2, B - 1, 3, 0); box('diamond_glass', .1, 6, 2 * B - 2, -(B - 1), 3, 0);
  for (const s of [-1, 1]) box('diamond_glass', B - 3, 6, .1, s * (B + 1) / 2, 3, B - 1);
  for (let k = -3; k <= 3; k++) for (const s of [-1, 1]) { if (k || s < 0) box('diamond_stone', 1.2, 6, 1.2, k * 6.6, 3, s * (B - .6)); box('diamond_stone', 1.2, 6, 1.2, s * (B - .6), 3, k * 6.6); }
  box('diamond_stone', 14, 6, 10, 0, 3, -5);
  for (let k = -1; k <= 1; k++) { box('steelL', 1.5, 2.5, .06, k * 3.6, 1.39, .03); box('diamond_amber', 1.9, .05, .05, k * 3.6, 2.75, .05); box('redS', .3, .12, .04, k * 3.6, 3.1, .03); }
  box('diamond_stone', 5, 1.1, 1.2, 0, .7, 9); box('diamond_amber', 5, .04, .04, 0, 1.0, 9.62);
  for (let k = -2; k <= 2; k++) box('diamond_amber', .2, .04, 36, k * 7, 5.96, 0);
  // entrance canopy with a red diamond
  box('diamond_stone', 12, .5, 6, 0, 6.3, B + 3); for (const s of [-1, 1]) box('steel', .3, 6, .3, s * 5.6, 3, B + 5.6);
  box('diamond_redP', 1.4, 1.4, .1, 0, 6.3, B + 6.06, 0, Math.PI / 4);
  // base shaft (6..36) + upper shaft (36..H0)
  box('diamond_fac', 2 * B, 30, 2 * B, 0, 21, 0);
  box('diamond_stone', 2 * B + .6, .9, 2 * B + .6, 0, 36, 0);
  box('diamond_fac', 2 * T, H0 - .5 - 36, 2 * T, 0, (H0 - .5 + 36) / 2, 0);
  box('diamond_stone', 2 * T + .6, 1.2, 2 * T + .6, 0, H0 - .62, 0);
  for (const a of [-1, 1]) for (const b of [-1, 1]) {
    box('diamond_stone', 2.8, 36, 2.8, a * (B - .2), 18, b * (B - .2));
    box('diamond_stone', 2.6, H0 + 12.6 - 36, 2.6, a * (T - .1), (H0 + 12.6 + 36) / 2, b * (T - .1));
  }
  const hu = H0 - .5 - 36;
  for (const x of [-12, -6, 0, 6, 12]) {
    for (const s of [-1, 1]) {
      box('diamond_stone', .8, hu, .5, s * (T + .2), (H0 - .5 + 36) / 2, x, 0);   // E/W fins
      if (s < 0 || Math.abs(x) > 11) box('diamond_stone', .5, hu, .8, x, (H0 - .5 + 36) / 2, s * (T + .2));   // N/S fins (mural bay left clear)
      box('diamond_stone', .4, 30, .6, x * 1.1, 21, s * (B + .2)); box('diamond_stone', .6, 30, .4, s * (B + .2), 21, x * 1.1);
    }
  }
  for (let y = 50; y < H0 - 4; y += 14) box('diamond_stone', 2 * T + .4, .6, 2 * T + .4, 0, y, 0);
  // ledge greenery on the setback, ivy creeping up the base
  for (let k = 0; k < 10; k++) { const t = -18 + k * 4; ctx_.tree(t, -(B - 1), .55, 36.45); ctx_.tree(B - 1, t, .55, 36.45); }
  for (const [x, z, w, h, ax] of [[-14, B + .3, 6, 18, 0], [16, B + .3, 4, 26, 0], [B + .3, 8, 7, 14, 1], [-(B + .3), -10, 5, 22, 1], [3, -(B + .3), 8, 12, 0]])
    if (ax) box('ivy', .5, h, w, x, h / 2 + 6, z); else box('ivy', w, h, .5, x, h / 2 + 6, z);
  // King of Diamonds mural on the south face
  const m = new THREE.Mesh(new THREE.PlaneGeometry(22, 33), cards.cardMaterial('K', 'D'));
  m.position.copy(K.fpos(0, 80, T + .5)); scene.add(m);
}
let ctx_ = null;

/* ───────────── plaza ───────────── */
function plaza() {
  box('walk', 108, .12, 108, 0, .06, 0);
  box('diamond_stone', 16, .02, 16, 0, .13, 37, Math.PI / 4); box('diamond_redP', 6, .02, 6, 0, .145, 37, Math.PI / 4);
  const st = [-44, -29.3, -14.7, 0, 14.7, 29.3, 44];
  for (const x of st) for (const z of st) {
    if (Math.abs(x) < 28 && Math.abs(z) < 28) continue;
    if (Math.abs(x) < 6 && z > 0) continue;
    box('concD', 3.6, .7, 3.6, x, .47, z); box('grass', 3.2, .1, 3.2, x, .83, z);
    ctx_.tree(x, z, 1 + ((x * 7 + z * 3) % 3 + 3) % 3 * .15, .85);
    if (Math.abs(x) > 40 || Math.abs(z) > 40) continue;
    withFrame(x + (Math.abs(x) > Math.abs(z) ? 0 : 3.4), 0, z + (Math.abs(x) > Math.abs(z) ? 3.4 : 0), Math.abs(x) > Math.abs(z) ? Math.PI / 2 : 0, () => {
      box('diamond_wood', .6, .1, 2.4, 0, .58, 0); for (const s of [-1, 1]) box('steel', .5, .45, .1, 0, .34, s * 1.0);
    });
  }
  for (const [x, z] of [[-8, 30], [8, 30], [-8, 48], [8, 48], [-36, -36], [36, -36]]) K.lamp(x, z, 6, { spot: false, warm: true, y0: .12, dir: x < 0 ? Math.PI / 2 : -Math.PI / 2 });
  for (let k = 0; k < 14; k++) { const a = k * 2.4, rr = 48 + (k % 3) * 2; sph('leaf', 1 + (k % 3) * .4, Math.cos(a) * rr, .6, Math.sin(a) * rr, 1.2, .7, 1.2); }
}

/* ───────────── build ───────────── */
export function build(ctx, d) {
  ctx_ = ctx; materials();
  const { cards, scene } = ctx;
  withFrame(d.x, 0, d.z, 0, () => {
    plaza();
    tower(cards, scene);
    withFrame(0, H0, 0, 0, crown);
    K.setZone(d.id + '_in');
    withFrame(0, H0, 0, 0, courtroom);
    K.setZone(d.id);
    K.addSpot(0xffc890, 900, 30, .9, .6, K.fpos(0, H0 + 9.4, 0), K.fpos(0, H0, 0));
  });
  ctx.dayNight.push((day) => { K.mats.diamond_fac.emissiveIntensity = day ? 0 : .22; });
  ctx.pois.push({ id: d.id, cam: [d.x + 55, H0 + 40, d.z + 62], tgt: [d.x, H0 + 3, d.z], spawn: [d.x, H0 + .1, d.z + 10], yaw: 0 });
}
