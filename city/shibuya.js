// Shibuya scramble crossing (P7): an abandoned five-arm intersection with bold zebra stripes (diagonals too),
// wet puddled asphalt and weeds in the cracks; the round glass corner tower with the Queen-of-Hearts banner,
// billboard / giant-screen mid-rises, the red-diamond mural, a rail viaduct behind, a podium deck with stairs,
// a subway entrance, signals, guard rails, barricades and moss-covered taxis, cars, vans, trucks and buses.
import * as THREE from 'three';
import * as K from '../kit.js';
import { prop } from './props.js';
import { konbini } from './konbini.js';
import { signStack, buildingMats } from './buildings.js';
const { box, cyl, sph, put, M4, withFrame, def, std, canvasTex, noise, strut } = K;

const RD = .06, PV = .18, DECK = 7.2;           // asphalt top, pavement top, podium deck top
const C = [-10, 30];                             // crossing centre (local) = grid node (-990, 220)
const U = (() => { const l = Math.hypot(120, 110); return [-120 / l, -110 / l]; })();   // 5th arm heads NW to grid line z=110
const N = [-U[1], U[0]];                         // its NE-side normal
const SUB = [-47, 49.5], HOLE = [SUB[0] - 7.4, SUB[1] - 1.6, SUB[0] + 3.4, SUB[1] + 1.6];   // subway stair opening (local x0,z0,x1,z1)
const DW = 9;                                    // diagonal arm half-width (straight arms: x −22..2, z 18..42)
const along = (s, o = 0) => [C[0] + U[0] * s + N[0] * o, C[1] + U[1] * s + N[1] * o];
const atX = (o, X) => along((X - C[0] - N[0] * o) / U[0], o);
const atZ = (o, Z) => along((Z - C[1] - N[1] * o) / U[1], o);
const ARY = K.ang(U[0], U[1]);                   // yaw that points local +x up the diagonal arm

const PAVE = [                                   // corner blocks (everything else is asphalt)
  [[2, -115], [130, -115], [130, 18], [2, 18]],
  [[2, 42], [130, 42], [130, 115], [2, 115]],
  [[-130, 42], [-22, 42], [-22, 115], [-130, 115]],
  [atX(DW, -22), [-22, -115], [-130, -115], atX(DW, -130)],   // tower wedge
  [atZ(-DW, 18), [-130, 18], atX(-DW, -130)],                   // podium wedge
];
const POD = [atZ(-DW - 5, 13), [-128, 13], atX(-DW - 5, -128)];
const TOWER = [-45, -50, 15];                    // x, z, radius
function pip(pts, x, z) { let ins = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, zi] = pts[i], [xj, zj] = pts[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) ins = !ins; } return ins; }
const groundY = (x, z) => pip(POD, x, z) ? DECK : PAVE.some((p) => pip(p, x, z)) ? PV : RD;
const SOLID = [];
const free = (x, z, m = 1) => Math.abs(x) < 129 && Math.abs(z) < 114 && !SOLID.some(([a, b, c, e]) => x > a - m && x < c + m && z > b - m && z < e + m) && Math.hypot(x - TOWER[0], z - TOWER[1]) > TOWER[2] + m;

let X, R, M;                                     // ctx, rng, standalone materials

/* ───────────── materials ───────────── */
function materials() {
  const r = K.rng(4242), OFF = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]];
  const PUD = Array.from({ length: 26 }, () => [r() * 1024, r() * 1024, 40 + r() * 120, .3 + r() * .5, r() * 3]);
  const puddles = (g, a, b) => { for (const [x, y, rad, e, an] of PUD) for (const [ox, oy] of OFF) { const px = x + ox * 1024, py = y + oy * 1024; if (px < -rad || px > 1024 + rad || py < -rad || py > 1024 + rad) continue; g.save(); g.translate(px, py); g.rotate(an); g.scale(1, e); const gr = g.createRadialGradient(0, 0, rad * .5, 0, 0, rad); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rad, 0, 7); g.fill(); g.restore(); } };
  // wet asphalt: colour map + a matching puddle roughness map (same UVs)
  const aT = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#2c2f33'; g.fillRect(0, 0, w, h); noise(g, w, h, 30);
    for (let i = 0; i < 16; i++) { g.save(); g.translate(r() * w, r() * h); g.rotate(r() * 3); g.fillStyle = r() < .5 ? 'rgba(70,72,76,.3)' : 'rgba(10,12,14,.3)'; g.fillRect(-60, -30, 60 + r() * 160, 30 + r() * 80); g.restore(); }
    for (let i = 0; i < 90; i++) {
      let x = r() * w, y = r() * h; const pts = [[x, y]];
      for (let k = 0; k < 7; k++) { x += (r() - .5) * 110; y += (r() - .5) * 110; pts.push([x, y]); }
      g.strokeStyle = `rgba(6,7,8,${.4 + r() * .4})`; g.lineWidth = 1 + r() * 2.5; g.beginPath(); pts.forEach(([a, b], k) => k ? g.lineTo(a, b) : g.moveTo(a, b)); g.stroke();
      if (r() < .45) for (const [a, b] of pts) for (let k = 0; k < 6; k++) { g.fillStyle = `rgba(${60 + r() * 40},${90 + r() * 60},${30 + r() * 20},.75)`; g.fillRect(a + (r() - .5) * 14, b + (r() - .5) * 14, 2 + r() * 5, 2 + r() * 4); }
    }
    puddles(g, 'rgba(6,8,12,.55)', 'rgba(6,8,12,0)');
  }, { repeat: true });
  const rT = canvasTex(1024, 1024, (g, w, h) => { g.fillStyle = 'rgb(190,190,190)'; g.fillRect(0, 0, w, h); noise(g, w, h, 50); puddles(g, 'rgb(12,12,12)', 'rgba(12,12,12,0)'); }, { srgb: false, repeat: true });
  def('shib_road', std({ map: aT, roughnessMap: rT, roughness: 1, metalness: .05, envMapIntensity: .45, color: 0xa8acb0 }), 32);
  const zT = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#ecebe4'; g.fillRect(0, 0, w, h); noise(g, w, h, 22);
    for (let i = 0; i < 34; i++) { g.fillStyle = `rgba(60,62,64,${.15 + r() * .3})`; g.beginPath(); g.ellipse(r() * w, r() * h, 3 + r() * 26, 2 + r() * 12, r() * 3, 0, 7); g.fill(); }
    for (let i = 0; i < 12; i++) { g.strokeStyle = 'rgba(20,20,20,.5)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(r() * w, r() * h); g.lineTo(r() * w, r() * h); g.stroke(); }
  }, { repeat: true });
  def('shib_zebra', std({ map: zT, roughness: .32, metalness: .05 }), 3);
  const pT = canvasTex(512, 512, (g, w, h) => {
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const v = 128 + (r() - .5) * 34; g.fillStyle = `rgb(${v},${v},${v - 6})`; g.fillRect(i * 64, j * 64, 64, 64); if (r() < .06) { g.fillStyle = 'rgba(30,26,20,.55)'; g.fillRect(i * 64, j * 64, 64, 64); } }
    noise(g, w, h, 24);
    g.fillStyle = '#3a3d36'; for (let i = 0; i <= 8; i++) { g.fillRect(i * 64 - 2, 0, 4, h); g.fillRect(0, i * 64 - 2, w, 4); }
    for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(${60 + r() * 40},${100 + r() * 50},${30 + r() * 20},.85)`; const a = Math.floor(r() * 9) * 64, b = r() * h; r() < .5 ? g.fillRect(a - 3, b, 6, 4 + r() * 16) : g.fillRect(b, a - 3, 4 + r() * 16, 6); }
    for (let i = 0; i < 20; i++) { g.strokeStyle = 'rgba(0,0,0,.35)'; g.beginPath(); const x = r() * w, y = r() * h; g.moveTo(x, y); g.lineTo(x + (r() - .5) * 60, y + (r() - .5) * 60); g.stroke(); }
  }, { repeat: true });
  def('shib_pave', std({ map: pT, color: 0xbdbdb6, roughness: .7 }), 4);
  const wT = canvasTex(128, 128, (g) => {
    g.clearRect(0, 0, 128, 128);
    for (let i = 0; i < 28; i++) { const x = 34 + r() * 60, tx = x + (r() - .5) * 70, ty = 8 + r() * 70; g.strokeStyle = r() < .2 ? '#9a9a48' : `rgb(${50 + r() * 40},${100 + r() * 60},${30 + r() * 25})`; g.lineWidth = 2 + r() * 3; g.beginPath(); g.moveTo(x, 128); g.quadraticCurveTo(x + (tx - x) * .2, (128 + ty) / 2, tx, ty); g.stroke(); }
  });
  const weed = std({ map: wT, alphaTest: .45, side: THREE.DoubleSide, roughness: 1 }); weed.userData.noCollide = true; def('shib_weed', weed, 1);
  const mT = canvasTex(256, 256, (g) => {
    g.clearRect(0, 0, 256, 256);
    for (let i = 0; i < 90; i++) { const a = r() * 7, d = Math.sqrt(r()) * 95, x = 128 + Math.cos(a) * d, y = 128 + Math.sin(a) * d; g.fillStyle = `rgba(${55 + r() * 40},${85 + r() * 55},${28 + r() * 20},.9)`; g.beginPath(); g.ellipse(x, y, 6 + r() * 22, 5 + r() * 16, r() * 3, 0, 7); g.fill(); }
  });
  const moss = std({ map: mT, alphaTest: .4, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1 }); moss.userData.noCollide = true; def('shib_mossP', moss, 1);
  const pud = std({ color: 0x0b0e12, roughness: .12, metalness: .1, envMapIntensity: .35, transparent: true, opacity: .7, polygonOffset: true, polygonOffsetFactor: -2 }); pud.userData.noCollide = true; def('shib_pud', pud, 1);
  const vine = std({ map: K.mats.ivy.map, color: 0x86a866, roughness: 1 }); vine.userData.noCollide = true; def('shib_vine', vine, 1);
  // storefronts (2 × 2 bays of 4 m; shown 4 m tall) — day map + lit-window glow map
  const SH = Array.from({ length: 4 }, () => [r() < .35, Math.floor(r() * 360)]);
  const shopDraw = (glow) => (g, w, h) => {
    g.fillStyle = glow ? '#000' : '#2a2c2e'; g.fillRect(0, 0, w, h);
    SH.forEach(([shut, hue], k) => {
      const x = (k % 2) * 256, y = Math.floor(k / 2) * 256;
      g.fillStyle = glow ? `hsl(${hue},80%,55%)` : `hsl(${hue},55%,40%)`; g.fillRect(x + 8, y + 12, 240, 44);
      g.fillStyle = glow ? 'rgba(255,255,255,.9)' : '#eee'; for (let i = 0; i < 6; i++) g.fillRect(x + 30 + i * 34, y + 22, 22, 24);
      if (shut) { if (!glow) { g.fillStyle = '#74777a'; g.fillRect(x + 10, y + 66, 236, 186); g.fillStyle = 'rgba(0,0,0,.3)'; for (let i = 0; i < 186; i += 7) g.fillRect(x + 10, y + 66 + i, 236, 2); g.fillStyle = 'rgba(60,40,25,.3)'; g.fillRect(x + 10, y + 200, 236, 52); } }
      else {
        const gr = g.createLinearGradient(0, y + 66, 0, y + 252); gr.addColorStop(0, glow ? '#ffd9a0' : '#c99a5c'); gr.addColorStop(1, glow ? '#a86a30' : '#4a3424'); g.fillStyle = gr; g.fillRect(x + 10, y + 66, 236, 186);
        g.fillStyle = glow ? 'rgba(0,0,0,.6)' : 'rgba(20,14,10,.75)'; for (let i = 0; i < 3; i++) g.fillRect(x + 20, y + 110 + i * 44, 216, 6);
        for (let i = 0; i < 9; i++) g.fillRect(x + 22 + r() * 200, y + 120 + r() * 100, 10 + r() * 20, 14 + r() * 20);
        g.fillStyle = glow ? '#000' : '#1a1c1e'; g.fillRect(x + 126, y + 66, 5, 186);
      }
    });
  };
  M.shop = std({ map: canvasTex(512, 512, shopDraw(false), { repeat: true }), emissiveMap: canvasTex(512, 512, shopDraw(true), { repeat: true }), emissive: 0xffdcb0, emissiveIntensity: .2, roughness: .35, metalness: .2 });
  def('shib_shop', M.shop, 8);
  // tower glass: one 6 m × 3.5 m floor tile with warm-lit offices
  const TW = Array.from({ length: 8 }, () => [r() < .68, r()]);
  const twDraw = (glow) => (g, w, h) => {
    g.fillStyle = glow ? '#000' : '#1d2730'; g.fillRect(0, 0, w, h);
    TW.forEach(([lit, v], i) => {
      const x = i * 64;
      if (lit) { const gr = g.createLinearGradient(0, 30, 0, 220); gr.addColorStop(0, glow ? `rgba(255,214,150,${.6 + v * .4})` : '#e7b273'); gr.addColorStop(1, glow ? 'rgba(170,100,40,.5)' : '#7a5030'); g.fillStyle = gr; g.fillRect(x + 4, 30, 56, 192); g.fillStyle = glow ? 'rgba(0,0,0,.7)' : 'rgba(30,20,12,.8)'; g.fillRect(x + 10 + v * 20, 150, 18, 72); }
      else if (!glow) { g.fillStyle = 'rgba(120,150,170,.18)'; g.fillRect(x + 4, 30, 56, 192); }
      g.fillStyle = glow ? 'rgba(255,250,235,.9)' : '#f2efe4'; if (lit) g.fillRect(x + 6, 34, 52, 4);
    });
    if (!glow) { g.fillStyle = '#9aa3ab'; for (let i = 0; i <= 8; i++) g.fillRect(i * 64 - 2, 0, 4, h); g.fillStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < 5; i++) { g.save(); g.translate(r() * w, 0); g.rotate(.4); g.fillRect(0, -40, 18, 400); g.restore(); } g.fillStyle = '#4c545c'; g.fillRect(0, 0, w, 24); g.fillRect(0, 226, w, 30); }
  };
  M.twin = std({ map: canvasTex(512, 256, twDraw(false), { repeat: true }), emissiveMap: canvasTex(512, 256, twDraw(true), { repeat: true }), emissive: 0xffd8a8, emissiveIntensity: .45, roughness: .12, metalness: .55 });
  def('shib_twin', M.twin, 1);
  def('shib_band', std({ map: K.texWall, color: 0xc4c9ce, roughness: .4, metalness: .6 }), 2.4);
  // vertical shop signs: 5 columns of 1.2 m × 6 m (box UV picks the column)
  const sT = canvasTex(640, 512, (g) => {
    ['#c8202a', '#f0c020', '#1f5fb0', '#f2f2ee', '#1e8a4a'].forEach((c, i) => {
      const x = i * 128; g.fillStyle = c; g.fillRect(x, 0, 128, 512); g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 8; g.strokeRect(x + 4, 4, 120, 504);
      g.fillStyle = i === 1 || i === 3 ? '#16181c' : '#fff';
      for (let k = 0; k < 5; k++) { const y = 30 + k * 94; for (let s = 0; s < 5; s++) { const a = r(); g.fillRect(x + 30 + r() * 50, y + r() * 60, a < .5 ? 40 + r() * 20 : 8, a < .5 ? 8 : 30 + r() * 30); } }
    });
    noise(g, 640, 512, 16);
  }, { repeat: true });
  M.sign = std({ map: sT, emissiveMap: sT, emissive: 0xffffff, emissiveIntensity: .25, roughness: .5 }); def('shib_sign', M.sign, 6);
  const vT = canvasTex(256, 128, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#000'); gr.addColorStop(.55, '#1a1b1d'); gr.addColorStop(1, '#6a6d70'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let x = w - 6; x > 20; x -= 10 + x * .06) { g.fillStyle = `rgba(200,200,200,${x / w * .5})`; g.fillRect(x, 0, 3, h); }
  });
  const voidM = std({ map: vT, roughness: 1 }); voidM.userData.noCollide = true; def('shib_void', voidM, 1);
  const bT = canvasTex(128, 64, (g, w, h) => { g.fillStyle = '#f2f0ea'; g.fillRect(0, 0, w, h); g.fillStyle = '#e8541a'; for (let i = -h; i < w + h; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 16, 0); g.lineTo(i + 16 - h, h); g.lineTo(i - h, h); g.fill(); } noise(g, w, h, 20); });
  def('shib_barr', std({ map: bT, roughness: .6 }), 1.5);
  const tT = canvasTex(256, 256, (g, w, h) => {   // off-white station wall tiles, dark grout, water stains
    g.fillStyle = '#d9d6cc'; g.fillRect(0, 0, w, h); noise(g, w, h, 14);
    g.fillStyle = 'rgba(60,58,52,.55)'; for (let i = 0; i <= w; i += 32) { g.fillRect(i, 0, 2, h); g.fillRect(0, i, w, 2); }
    for (let i = 0; i < 18; i++) { const x = R() * w, gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(90,80,60,.25)'); gr.addColorStop(1, 'rgba(90,80,60,0)'); g.fillStyle = gr; g.fillRect(x, 0, 3 + R() * 8, h * R()); }
  }, { repeat: true });
  def('shib_tile', std({ map: tT, normalMap: K.normalFrom(tT, 2), roughness: .35 }), 2);
  def('shib_glass', std({ color: 0x18222b, roughness: .12, metalness: .7 }));
  def('shib_taxi', std({ color: 0xd9a514, roughness: .5, metalness: .3 }));
  def('shib_bus', std({ color: 0x2f7a46, roughness: .5, metalness: .3 }));
  def('shib_busW', std({ color: 0xd8dbd6, roughness: .5, metalness: .25 }));
  def('shib_carS', std({ color: 0x8d949a, roughness: .45, metalness: .5 }));
  def('shib_carW', std({ color: 0xd4d6d4, roughness: .5, metalness: .3 }));
  def('shib_carR', std({ color: 0x7a2a26, roughness: .5, metalness: .35 }));
  def('shib_carK', std({ color: 0x1e2a3a, roughness: .4, metalness: .5 }));
  def('shib_pole', std({ color: 0x8a9096, roughness: .5, metalness: .6 }));
  def('shib_rail', std({ color: 0xd0d4d6, roughness: .5, metalness: .4 }));
  def('shib_train', std({ map: K.texWall, color: 0xc4c8cc, roughness: .35, metalness: .7 }), 2.4);
  def('shib_soil', std({ color: 0x3a2e22, roughness: 1 }));
  def('shib_grn', K.bas({ color: new THREE.Color(.2, 2.2, 1) }));
  // standalone screens / murals
  const scr = (map, I = .6) => std({ map, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: I, roughness: .3, metalness: .1, side: THREE.DoubleSide });
  M.static = scr(canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#7f8590'; g.fillRect(0, 0, w, h); noise(g, w, h, 300); for (let i = 0; i < 12; i++) { g.fillStyle = `rgba(${r() < .5 ? 255 : 0},${r() < .5 ? 255 : 0},255,${r() * .25})`; g.fillRect(0, r() * h, w, 2 + r() * 8); } }, { repeat: true }));
  M.broken = scr(canvasTex(512, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#eef3ff'); gr.addColorStop(1, '#7fa2f0'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#050607'; for (let i = 0; i < 46; i++) { const x = r() * w, y = r() * h, s = 8 + r() * 46; g.beginPath(); for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283, d = s * (.5 + r() * .7); g.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d * .8); } g.fill(); }
    for (let i = 0; i < 14; i++) { g.fillStyle = ['rgba(255,0,80,.5)', 'rgba(0,255,220,.5)', 'rgba(255,255,255,.7)'][i % 3]; g.fillRect(r() * w, r() * h, 20 + r() * 160, 2 + r() * 6); }
    g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1.5; const cx = w * .7, cy = h * .35; for (let i = 0; i < 12; i++) { g.beginPath(); g.moveTo(cx, cy); let x = cx, y = cy; for (let k = 0; k < 4; k++) { x += Math.cos(i * .52) * 40 + (r() - .5) * 30; y += Math.sin(i * .52) * 30 + (r() - .5) * 30; g.lineTo(x, y); } g.stroke(); }
  }));
  M.ad = scr(canvasTex(512, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#e0207a'); gr.addColorStop(.6, '#ff9a30'); gr.addColorStop(1, '#30d0e0'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(380, 128, 90, 0, 7); g.fill();
    g.fillStyle = '#b3202f'; g.font = '150px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('♦', 380, 132);
    g.fillStyle = '#fff'; for (let k = 0; k < 4; k++) for (let i = 0; i < 6; i++) g.fillRect(30 + i * 38, 40 + k * 46, 28, 28);
    g.fillStyle = 'rgba(0,0,0,.85)'; g.fillRect(0, 200, 200, 56); g.fillRect(430, 0, 82, 70);
    g.strokeStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(120, 210); g.lineTo(120 + (r() - .5) * 300, 210 + (r() - .5) * 200); g.stroke(); }
  }));
  M.mural = std({ map: canvasTex(512, 768, (g, w, h) => {
    g.fillStyle = '#e4dccb'; g.fillRect(0, 0, w, h); noise(g, w, h, 30);
    g.strokeStyle = '#2a2622'; g.lineWidth = 6; for (let x = 0; x <= w; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y <= h; y += 128) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.fillStyle = '#b3202f'; g.beginPath(); g.moveTo(w / 2, 150); g.lineTo(w - 120, h / 2); g.lineTo(w / 2, h - 150); g.lineTo(120, h / 2); g.closePath(); g.fill();
    g.font = 'bold 90px Georgia,serif'; g.textAlign = 'center'; g.fillText('A', 70, 105); g.font = '70px serif'; g.fillText('♦', 70, 170);
    g.save(); g.translate(w - 70, h - 105); g.rotate(Math.PI); g.font = 'bold 90px Georgia,serif'; g.fillText('A', 0, 0); g.restore();
    for (let i = 0; i < 40; i++) { const x = r() * w, gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(50,35,20,.3)'); gr.addColorStop(1, 'rgba(50,35,20,0)'); g.fillStyle = gr; g.fillRect(x, r() * 200, 2 + r() * 8, h * r()); }
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${0},0,0,${r() * .5})`; g.fillRect(r() * w, r() * h, 2 + r() * 10, 2 + r() * 10); }
    for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(${50 + r() * 30},${85 + r() * 50},${30},${.5 + r() * .4})`; g.beginPath(); g.ellipse(r() * w, h - r() * r() * 260, 4 + r() * 18, 4 + r() * 22, 0, 0, 7); g.fill(); }
  }), roughness: .85, emissive: 0xffffff, emissiveIntensity: 0 });
  M.mural.emissiveMap = M.mural.map;
  M.subSign = std({ map: canvasTex(256, 64, (g, w, h) => { g.fillStyle = '#123a7a'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = 'bold 30px sans-serif'; g.textBaseline = 'middle'; g.fillText('⇩ 地下鉄  SUBWAY', 14, 34); noise(g, w, h, 30); }), emissive: 0xffffff, emissiveIntensity: .3, roughness: .5 });
  M.subSign.emissiveMap = M.subSign.map;
}

/* ───────────── helpers ───────────── */
function prism(k, pts, y0, h, holes = []) {   // extruded footprint polygon (local x,z), UVs in material tiles
  const sh = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
  for (const [a, b, c, e] of holes) sh.holes.push(new THREE.Path([new THREE.Vector2(a, -b), new THREE.Vector2(a, -e), new THREE.Vector2(c, -e), new THREE.Vector2(c, -b)]));
  const g = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false });
  g.rotateX(-Math.PI / 2); g.translate(0, y0, 0);
  const t = K.mats[k].userData.tile, uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / t, uv.getY(i) / t);
  g.setIndex(Array.from({ length: g.attributes.position.count }, (_, i) => i));   // batches merge indexed geometry
  put(k, g, M4(0, 0, 0));
}
function flat(k, g, x, y, z, ry = 0) { g.rotateX(-Math.PI / 2); put(k, g, M4(x, y, z, 0, ry, 0)); }
function pic(mat, w, h, x, y, z, ry) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.copy(K.fpos(x, y, z)); m.rotation.y = ry; X.scene.add(m); return m; }
const hang = (x, y, z, len) => { box('shib_vine', .14, len, .14, x, y - len / 2, z); if (len > 1.6) box('shib_vine', .34, .5, .3, x + .05, y - len * .55, z); };
function tuft(x, z, s = 1, y = groundY(x, z)) {
  const w = (.6 + R() * .7) * s, h = (.35 + R() * .6) * s, a = R() * 3;
  for (const o of [0, Math.PI / 2]) put('shib_weed', new THREE.PlaneGeometry(w, h), M4(x, y + h / 2 - .02, z, 0, a + o, 0));
}
// framed billboard screen on a wall (x,z on the wall face, facing ry); type card|static|broken|ad
function screen(x, y, z, ry, w, h, type, card) {
  if (type === 'card') h = w * 1.5;
  withFrame(x, 0, z, ry, () => {
    box('steelL', w + .6, h + .6, .35, 0, y, .18);
    box('steel', w + .9, .3, .55, 0, y + h / 2 + .32, .27); box('steel', w + .9, .3, .55, 0, y - h / 2 - .32, .27);
    box('steel', .3, h + .9, .55, -w / 2 - .32, y, .27); box('steel', .3, h + .9, .55, w / 2 + .32, y, .27);
    pic(type === 'card' ? X.cards.cardMaterial(...card) : M[type], w, h, 0, y, .4, ry);
    for (let i = 0; i < w / 2; i++) if (R() < .45) hang(-w / 2 + R() * w, y - h / 2 - .45, .55, .6 + R() * 3.5);
  });
}
function roofBoard(x, y, z, ry, w, h, type, card) {   // billboard on a lattice stand
  withFrame(x, 0, z, ry, () => {
    for (const s of [-.4, 0, .4]) { box('steel', .3, 3.4, .3, s * w, y + 1.7, -.4); box('steel', .3, 3.4, .3, s * w, y + 1.7, -2.4); strut('steel', [s * w, y, -2.4], [s * w, y + 3.3, -.4], .08); }
    box('grate', w + 1, .1, 2.6, 0, y + 3.3, -1.4);
  });
  screen(x, y + 3.6 + (type === 'card' ? w * .75 : h / 2), z, ry, w, h, type, card);
}
function sign(x, y, z, ry, col) { const g = K.boxGeo('shib_sign', .5, 6, 1.2), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) + col * .2); put('shib_sign', g, M4(x, y, z, 0, ry, 0)); }
// mid-rise block: facade, roof clutter, storefront band + canopy, vertical signs on street faces, ivy, vines
const FAC_MAP = { fac0: 'bOff0', fac1: 'bCur0', fac2: 'bOff1', fac3: 'bOff2', fac4: 'bCur1', fac5: 'bOff0' };   // modern office / curtain-wall facades
function bld(x0, z0, x1, z1, h, fk, o = {}) {
  buildingMats(); fk = FAC_MAP[fk] || fk;
  const y0 = o.y0 ?? PV, w = x1 - x0, dd = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  h = Math.round(h / 3.5) * 3.5; const top = y0 + h;
  SOLID.push([x0 - .3, z0 - .3, x1 + .3, z1 + .3]);
  box(fk, w, h, dd, cx, y0 + h / 2, cz);
  box('roof', w + .5, .6, dd + .5, cx, top + .3, cz);
  box('shib_shop', w + .3, 4, dd + .3, cx, y0 + 2, cz);
  box('concD', w + 2.6, .3, dd + 2.6, cx, y0 + 4.3, cz);
  for (let i = 0; i < 2 + R() * 3; i++) K.acUnit(cx + (R() - .5) * (w - 5), top + .6, cz + (R() - .5) * (dd - 5), R() * 3);
  if (R() < .6) { const tx = cx + (R() - .5) * (w - 8), tz = cz + (R() - .5) * (dd - 8); cyl('pipeR', 1.6, 2.6, tx, top + 3.3, tz, 0, 0, 0, 12); for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) box('steel', .15, 2, .15, tx + a, top + 1.6, tz + b); }
  if (R() < .5) for (let i = 0; i < 3; i++) X.tree(cx + (R() - .5) * (w - 6), cz + (R() - .5) * (dd - 6), .6 + R() * .4, top + .6);
  // vertical signs on street faces: 's' +z, 'n' −z, 'e' +x, 'w' −x
  for (const f of o.st || '') for (const t of [.2, .8]) {
    if (R() < .25) continue;
    const col = Math.floor(R() * 5), sy = y0 + 8.5 + (R() < .4 ? 7 : 0);
    if (f === 's') sign(x0 + w * t, sy, z1 + .75, 0, col); if (f === 'n') sign(x0 + w * t, sy, z0 - .75, 0, col);
    if (f === 'e') sign(x1 + .75, sy, z0 + dd * t, Math.PI / 2, col); if (f === 'w') sign(x0 - .75, sy, z0 + dd * t, Math.PI / 2, col);
  }
  // floor ledges + vertical tenant-sign stacks on the street faces
  const nf = Math.floor((h - 4.5) / 3.5);
  for (const f of o.st || '') {
    for (let k = 1; k <= nf; k++) {
      const y = y0 + 4.5 + k * 3.5 - .25;
      if (f === 's') box('concD', w + .3, .22, .45, cx, y, z1 + .22); if (f === 'n') box('concD', w + .3, .22, .45, cx, y, z0 - .22);
      if (f === 'e') box('concD', .45, .22, dd + .3, x1 + .22, y, cz); if (f === 'w') box('concD', .45, .22, dd + .3, x0 - .22, y, cz);
    }
    if (R() < .7 && nf > 2) {
      const t = .35 + R() * .3, fl = Math.min(nf - 1, 3 + Math.floor(R() * 4));
      if (f === 's') signStack(x0 + w * t, y0 + 4.6, z1, 0, fl, R); if (f === 'n') signStack(x0 + w * t, y0 + 4.6, z0, Math.PI, fl, R);
      if (f === 'e') signStack(x1, y0 + 4.6, z0 + dd * t, Math.PI / 2, fl, R); if (f === 'w') signStack(x0, y0 + 4.6, z0 + dd * t, -Math.PI / 2, fl, R);
    }
  }
  // ivy curtains and hanging vines
  for (let i = 0; i < 1 + R() * 4; i++) {
    const side = Math.floor(R() * 4), len = side % 2 ? dd : w, iw = 2 + R() * Math.min(9, len * .4), ih = h * (.2 + R() * .7), a = (R() - .5) * (len - iw);
    if (R() < .5) { const yb = top - ih / 2; if (side === 0) box('ivy', iw, ih, .4, cx + a, yb, z1 + .25); else if (side === 1) box('ivy', .4, ih, iw, x1 + .25, yb, cz + a); else if (side === 2) box('ivy', iw, ih, .4, cx + a, yb, z0 - .25); else box('ivy', .4, ih, iw, x0 - .25, yb, cz + a); }
    else { const yb = y0 + ih / 2; if (side === 0) box('ivy', iw, ih, .4, cx + a, yb, z1 + .25); else if (side === 1) box('ivy', .4, ih, iw, x1 + .25, yb, cz + a); else if (side === 2) box('ivy', iw, ih, .4, cx + a, yb, z0 - .25); else box('ivy', .4, ih, iw, x0 - .25, yb, cz + a); }
  }
  const nv = Math.round((w + dd) / 2.2);
  for (let i = 0; i < nv; i++) {
    const side = Math.floor(R() * 4), t = R(), len = 1 + R() * R() * h * .45;
    if (side === 0) hang(x0 + w * t, top + .3, z1 + .35, len); else if (side === 1) hang(x1 + .35, top + .3, z0 + dd * t, len);
    else if (side === 2) hang(x0 + w * t, top + .3, z0 - .35, len); else hang(x0 - .35, top + .3, z0 + dd * t, len);
  }
  return top;
}

/* ───────────── ground: asphalt, pavements, markings ───────────── */
function ground() {
  { const [a, b, c, e] = HOLE;   // asphalt sheet in four pieces around the stair opening
    box('shib_road', a + 130, .1, 230, (a - 130) / 2, .01, 0); box('shib_road', 130 - c, .1, 230, (c + 130) / 2, .01, 0);
    box('shib_road', c - a, .1, b + 115, (a + c) / 2, .01, (b - 115) / 2); box('shib_road', c - a, .1, 115 - e, (a + c) / 2, .01, (e + 115) / 2); }
  PAVE.forEach((p, i) => prism('shib_pave', p, 0, PV, i === 2 ? [HOLE] : []));
  // lane markings on each arm (centre double line + dashed lanes)
  const marks = (ax, az, bx, bz, lane) => {
    const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz);
    withFrame((ax + bx) / 2, 0, (az + bz) / 2, K.ang(dx, dz), () => {
      for (const s of [-1, 1]) { box('lineW', L, .02, .15, 0, .07, s * .2); for (let t = -L / 2 + 2; t < L / 2 - 3; t += 8) if (R() > .1) box('lineW', 3, .02, .15, t + 1.5, .07, s * lane); }
      box('lineW', .45, .02, lane * 2 - 1, -L / 2 - .4, .07, 0);   // stop line
    });
  };
  marks(-10, -6, -10, -115, 6); marks(-10, 54, -10, 115, 6); marks(14, 30, 130, 30, 6); marks(-48, 30, -130, 30, 6);
  marks(...along(46), ...along(162), 4.5);
  // zebra crossings: centre, walk direction, length, band width, height
  const zebra = (cx, cz, wx, wz, len, band, y) => {
    const l = Math.hypot(wx, wz), n = Math.floor(len / 1.4);
    withFrame(cx, 0, cz, K.ang(wx / l, wz / l), () => {
      for (let i = 0; i < n; i++) {
        const t = -len / 2 + (i + .5) * len / n;
        if (R() < .12) { const a = band * (.2 + R() * .5); box('shib_zebra', .8, .02, a, t, y, -band / 2 + a / 2); box('shib_zebra', .8, .02, band - a - .6, t, y, band / 2 - (band - a - .6) / 2); }
        else box('shib_zebra', .8, .02, band, t, y, 0);
      }
    });
  };
  zebra(-10, 0, 1, 0, 24, 6, .075); zebra(-10, 48, 1, 0, 24, 6, .075); zebra(8, 30, 0, 1, 24, 6, .075); zebra(-42, 30, 0, 1, 24, 6, .075);
  zebra(...along(40), N[0], N[1], 20, 6, .075);
  zebra(-10, 30, -1, 1, 31, 5, .072); zebra(-13.5, 27, -31, -30, 40, 5, .078);
  // crack lines sprouting grass, puddle mirrors, moss patches
  for (let i = 0; i < 70; i++) {
    let x = (R() - .5) * 250, z = (R() - .5) * 220; if (groundY(x, z) !== RD) continue;
    for (let k = 0; k < 3 + R() * 5; k++) { const a = R() * 6.28, l = 1 + R() * 2.5, nx = x + Math.cos(a) * l, nz = z + Math.sin(a) * l; box('grass', l, .03, .16, (x + nx) / 2, RD + .015, (z + nz) / 2, K.ang(nx - x, nz - z)); if (R() < .5) tuft(nx, nz, .7, RD); x = nx; z = nz; }
  }
  for (let i = 0; i < 46; i++) {
    const x = (R() - .5) * 250, z = (R() - .5) * 220; if (groundY(x, z) !== RD || !free(x, z)) continue;
    const g = new THREE.CircleGeometry(1, 14); g.scale(1.5 + R() * 4, 1 + R() * 2.5, 1); flat('shib_pud', g, x, .089, z, R() * 3);
  }
  for (let i = 0; i < 90; i++) {
    const x = (R() - .5) * 250, z = (R() - .5) * 220; if (!free(x, z)) continue;
    const s = 1.5 + R() * 4; flat('shib_mossP', new THREE.PlaneGeometry(s, s * (.6 + R() * .6)), x, groundY(x, z) + .03, z, R() * 3);
  }
}

/* ───────────── street furniture ───────────── */
function guard(x1, z1, x2, z2) {   // white pipe guard rail in ~18 m panels, some missing or knocked flat
  const L = Math.hypot(x2 - x1, z2 - z1), n = Math.max(1, Math.round(L / 18));
  for (let i = 0; i < n; i++) {
    if (R() < .12) continue;
    const a = i / n, b = (i + 1) / n - 2 / L;
    const ax = x1 + (x2 - x1) * a, az = z1 + (z2 - z1) * a, bx = x1 + (x2 - x1) * b, bz = z1 + (z2 - z1) * b, l = Math.hypot(bx - ax, bz - az);
    withFrame((ax + bx) / 2, 0, (az + bz) / 2, K.ang(bx - ax, bz - az), () => {
      if (R() < .12) { box('shib_rail', l, .09, .09, 0, PV + .05, .4, .1); box('shib_rail', l * .8, .07, .07, .5, PV + .04, .9, -.05); return; }
      const np = Math.ceil(l / 2);
      for (let p = 0; p <= np; p++) box('shib_rail', .07, .85, .07, -l / 2 + p * l / np, PV + .42, 0);
      box('shib_rail', l, .09, .09, 0, PV + .82, 0); box('shib_rail', l, .07, .07, 0, PV + .45, 0);
      for (let k = 0; k < l / 3; k++) tuft(-l / 2 + R() * l, (R() - .5) * .8, .8, PV);
      if (R() < .4) box('ivy', 1 + R() * 3, .7, .3, (R() - .5) * l * .6, PV + .45, 0);
    });
  }
}
function head(x, y) {
  box('shib_pole', 1.35, .45, .3, x, y, 0);
  const lit = R() < .8 ? 2 : 0;
  for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { cyl(i === lit ? (lit ? 'redS' : 'shib_grn') : 'steel', .14, .06, x - .42 + i * .42, y, s * .17, Math.PI / 2, 0, 0, 10); box('shib_pole', .34, .04, .14, x - .42 + i * .42, y + .19, s * .22); }
}
function pedHead(z) {
  box('shib_pole', .34, .9, .45, 0, PV + 2.9, z);
  for (const s of [-1, 1]) { box('redS', .02, .3, .3, s * .18, PV + 3.12, z); box('steel', .02, .3, .3, s * .18, PV + 2.7, z); }
}
function signal(x, z, dx, dz, arm) {   // mast-arm signal over the road + pedestrian head on the pole
  withFrame(x, 0, z, K.ang(dx, dz), () => {
    cyl('shib_pole', .13, 7, 0, PV + 3.5, 0, 0, 0, 0, 10);
    box('shib_pole', arm, .16, .16, arm / 2, PV + 6.6, 0);
    strut('shib_pole', [0, PV + 5.4, 0], [arm * .4, PV + 6.55, 0], .05);
    head(arm - .6, PV + 6.2); if (arm > 6) head(arm * .45, PV + 6.2);
    pedHead(.3);
    box('shib_pole', .3, .5, .2, 0, PV + 1.2, .2);   // push-button box
    for (let i = 0; i < 4; i++) if (R() < .7) hang(R() * arm, PV + 6.5, 0, .8 + R() * 3);
    if (R() < .6) box('ivy', .35, 2 + R() * 3, .35, 0, PV + 1.5, 0);
  });
}
function pedPole(x, z, dx, dz) { withFrame(x, 0, z, K.ang(dx, dz), () => { cyl('shib_pole', .1, 3.6, 0, PV + 1.8, 0, 0, 0, 0, 10); pedHead(.28); }); }
function barr(x, z, ry, fallen) {
  withFrame(x, groundY(x, z), z, ry, () => {
    if (fallen) { box('shib_barr', 1.5, .06, .7, 0, .04, 0, 0, .06); box('cone', .6, .25, .25, .55, .13, .5); return; }
    box('shib_barr', 1.5, .6, .07, 0, .62, 0); box('shib_barr', 1.5, .12, .07, 0, .2, 0);
    for (const s of [-1, 1]) { box('cone', .1, .9, .1, s * .62, .45, 0); box('cone', .28, .2, .6, s * .62, .1, 0); }
  });
}
function cone(x, z) { const y = groundY(x, z); box('cone', .4, .05, .4, x, y + .025, z); cyl('cone', .16, .65, x, y + .37, z, 0, 0, 0, 10, .03); }
function vend(x, z, ry) {   // Tripo vending machine (front = local +z)
  withFrame(x, PV, z, ry, () => {
    prop('vending', 0, 0, 0, -Math.PI / 2);
  });
}
// abandoned vehicles (local +x = forward)
function car(kind, x, z, ry) {
  withFrame(x, RD, z, ry, () => {
    const col = ['shib_carS', 'shib_carW', 'shib_carR', 'shib_carK'][Math.floor(R() * 4)];
    const wheels = (xs, r, half) => { for (const sx of xs) for (const s of [-1, 1]) cyl('tire', r, .24, sx, r, s * half, Math.PI / 2, 0, 0, 10); };
    if (kind === 'bus') {
      prop('city_bus', 0, 0, 0);
      box('roofG', 8.5, .2, 2.1, -.4, 3.15, 0); for (let i = 0; i < 6; i++) sph('roofG', .5 + R() * .5, (R() - .5) * 8, 3.25, (R() - .5) * 1.6, 1, .5, 1);
      for (let i = 0; i < 10; i++) tuft((R() - .5) * 9, (R() - .5) * 2, 1, 3.4);
      for (let i = 0; i < 6; i++) hang((R() - .5) * 10, 3.2, (R() < .5 ? -1 : 1) * 1.3, .4 + R() * 1.6);
    } else if (kind === 'truck') {
      prop('box_truck', 0, 0, 0);
      box('roofG', 3.6, .15, 1.9, -1, 3.08, 0);
      for (let i = 0; i < 5; i++) tuft(-1 + (R() - .5) * 3.5, (R() - .5) * 1.6, 1, 3.1);
    } else if (kind === 'van') {
      prop(R() < .5 ? 'kcar' : 'kei_truck', 0, 0, 0);
      if (R() < .6) box('roofG', 1.8, .1, 1.2, -.3, 1.82, 0);
    } else {
      prop(kind === 'taxi' ? 'jp_taxi' : 'jp_sedan', 0, 0, 0);
      if (R() < .4) box('roofG', 1.1 + R() * .5, .06, 1.1, -.4, kind === 'taxi' ? 1.78 : 1.47, 0);
    }
    for (let i = 0; i < 4; i++) tuft((R() - .5) * 5, (R() < .5 ? -1 : 1) * (1 + R() * .5), 1, 0);
  });
}

/* ───────────── hero structures ───────────── */
function tower() {   // round glass corner tower: banded floors, mullions, crown, sign pillar, Queen-of-Hearts banner
  const [cx, cz, Rr] = TOWER, F = 16, H = F * 3.5;
  const g = new THREE.CylinderGeometry(Rr, Rr, H, 16, 1), uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2 * Math.PI * Rr / 6, uv.getY(i) * F);
  put('shib_twin', g, M4(cx, PV + H / 2, cz));
  for (let i = 1; i <= F; i++) cyl('shib_band', Rr + .35, .8, cx, PV + i * 3.5 - .4, cz, 0, 0, 0, 16);
  for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; box('shib_band', .3, H, .35, cx + (Rr + .1) * Math.sin(a), PV + H / 2, cz + (Rr + .1) * Math.cos(a), a); }
  cyl('concD', Rr + 2, .35, cx, PV + 4.4, cz, 0, 0, 0, 16);
  cyl('shib_band', Rr + .6, 3, cx, PV + H + 1.5, cz, 0, 0, 0, 16); cyl('roof', Rr + .3, .4, cx, PV + H + 3.1, cz, 0, 0, 0, 16);
  box('fac3', 22, 42, 22, -55, PV + 21, -58); box('roof', 22.5, .6, 22.5, -55, PV + 42.3, -58);   // annex behind
  SOLID.push([-66.3, -69.3, -43.7, -46.7]);
  const dx = C[0] - cx, dz = C[1] - cz, l = Math.hypot(dx, dz), ux = dx / l, uz = dz / l, ry = Math.atan2(ux, uz);
  withFrame(cx + ux * (Rr + .2), 0, cz + uz * (Rr + .2), ry, () => {   // sign pillar rising above the roof
    box('shib_band', 3.2, 18, 1.4, 0, PV + H + 3, 0);
    for (let i = 0; i < 4; i++) box(i % 2 ? 'glow' : 'redS', 2.2, 2.6, .1, 0, PV + H - 3 + i * 3.4, .74);
    box('shib_glass', 6, 3.2, 1, 0, PV + 1.8, 0); box('glowY', 4.5, 2.6, .05, 0, PV + 1.6, .52);   // lit entrance
  });
  pic(X.cards.cardMaterial('Q', 'H'), 13, 19.5, cx + ux * (Rr + .9), PV + 34, cz + uz * (Rr + .9), ry);
  for (const s of [-1, 1]) strut('steel', [cx + ux * (Rr + .4) + uz * s * 5, PV + 44.3, cz + uz * (Rr + .4) - ux * s * 5], [cx + ux * (Rr + .9) + uz * s * 5, PV + 43.6, cz + uz * (Rr + .9) - ux * s * 5], .05);
  for (let i = 0; i < 9; i++) {   // ivy climbing the drum, vines from the bands
    const a = ry + 1 + R() * 4.3, ih = 8 + R() * 30;
    box('ivy', 1.6 + R() * 2, ih, .35, cx + (Rr + .5) * Math.sin(a), PV + ih / 2, cz + (Rr + .5) * Math.cos(a), a);
  }
  for (let i = 0; i < 40; i++) { const a = R() * 6.28, f = 1 + Math.floor(R() * F); hang(cx + (Rr + .5) * Math.sin(a), PV + f * 3.5 - .8, cz + (Rr + .5) * Math.cos(a), .6 + R() * 2.6); }
  return [ux, uz];
}
function podium() {   // two-storey shopping podium filling the west wedge; walkable deck reached by stairs
  prism('concD', POD, PV - .1, DECK - .2 - PV + .1); prism('shib_pave', POD, DECK - .2, .2);
  const [A, B, Cc] = POD;
  box('shib_shop', A[0] - B[0] + .4, 4, .3, (A[0] + B[0]) / 2, PV + 2, A[1] + .15);
  box('concD', -67 - B[0], .3, 2.4, (B[0] - 67) / 2, PV + 4.3, A[1] + 1.2);   // canopy stops short of the stairs
  const hx = Cc[0] - A[0], hz = Cc[1] - A[1], hl = Math.hypot(hx, hz);
  withFrame((A[0] + Cc[0]) / 2, 0, (A[1] + Cc[1]) / 2, K.ang(hx, hz), () => { box('shib_shop', hl, 4, .3, 0, PV + 2, .15); box('concD', hl - 2, .3, 2.4, 0, PV + 4.3, 1.2); for (let i = 0; i < hl / 2; i++) if (R() < .5) hang(-hl / 2 + R() * hl, DECK, .2, .8 + R() * 4); });
  for (let i = 0; i < (A[0] - B[0]) / 2; i++) if (R() < .5) hang(B[0] + R() * (A[0] - B[0]), DECK, A[1] + .2, .8 + R() * 4);
  // stairs up from the pavement + landing onto the deck
  K.stairs(-52, 15.6, -1, 0, PV, DECK, 2.4);
  box('concD', 3.8, .3, 4.4, -64.3, DECK - .15, 15); box('concD', .5, DECK - .3, .5, -65.9, (DECK - .3) / 2, 16.9);
  K.openingLocal(-66.2, -62.4, 11.5, 17.6, DECK);
  K.railSeg(-66.2, 17.2, -62.8, 17.2, DECK); K.railSeg(-66.2, 17.2, -66.2, 13.2, DECK);
  K.railSeg(A[0], A[1] - .1, -128, A[1] - .1, DECK); K.railSeg(A[0], A[1] - .1, Cc[0], Cc[1], DECK); K.railSeg(-127.9, A[1], -127.9, Cc[1], DECK);
  for (const [x, z] of [[-66, 5], [-75, -4], [-82, 6], [-120, -45], [-118, -30]]) { X.tree(x, z, .8, DECK); for (let k = 0; k < 6; k++) tuft(x + (R() - .5) * 4, z + (R() - .5) * 4, 1, DECK); }
  for (const [x, z] of [[-70, 9], [-86, 0]]) { box('concD', 3, .6, 1.2, x, DECK + .3, z); box('ivy', 3, .3, 1.2, x, DECK + .7, z); }
}
function subway(x, z) {   // walkable stair head → underground concourse (y −6)
  const L = HOLE[2] - HOLE[0], cx = (HOLE[0] + HOLE[2]) / 2 - x, FL = -6;
  withFrame(x, 0, z, 0, () => {
    for (const s of [-1, 1]) box('wall', L + .2, 1.1, .25, cx, PV + .55, s * 1.75);                    // parapets
    box('wall', .25, 1.1, 3.75, HOLE[0] - x - .1, PV + .55, 0);
    for (const [a, b] of [[HOLE[0] - x, -1.6], [HOLE[0] - x, 1.6], [3.3, -1.6], [3.3, 1.6]]) box('steelL', .15, 2.9, .15, a, PV + 1.45, b);
    box('steelL', L + .8, .25, 4.2, cx, PV + 3, 0); box('roofG', L - 1, .15, 3, cx - .5, PV + 3.2, 0);
    pic(M.subSign, 2.8, .7, 3.72, PV + 2.55, 0, Math.PI / 2);
    for (let i = 0; i < 6; i++) hang(HOLE[0] - x + R() * L, PV + 2.9, (R() < .5 ? -1 : 1) * 2.1, .5 + R() * 1.6);
    // the stair: shaft walls down to the concourse, 31 steps rising toward the street (+x)
    for (const s of [-1, 1]) box('shib_tile', L, -FL + .3, .3, cx, (FL + PV) / 2, s * 1.75);
    for (const s of [-1, 1]) box('shib_tile', 1.95, -FL - .2, .3, HOLE[0] - x - .97, (FL - .2) / 2, s * 1.75);   // shaft continues under the pavement to the hall
    K.stairs(3.3 - 9.3, 0, 1, 0, FL, PV, 3, .3);
    box('shib_tile', 3.4, .2, 3.3, 3.3 - 9.3 - 1.6, FL - .1, 0);                                         // bottom landing
  });
  SOLID.push([HOLE[0] + x * 0 - .5, HOLE[1] - .5, HOLE[2] + .5, HOLE[3] + .5]);
  underground(x - 9.3 - 10, z, FL);
}
// concourse: 20 × 16 m hall west of the stair foot, tiled, gates + fare machines, emergency lighting
function underground(x, z, FL) {
  const W = 20, D = 16, H = 3.6;
  K.setZone('shibuya_sub');
  withFrame(x, 0, z, 0, () => {
    box('shib_tile', W + 1, .3, D + 1, 0, FL - .15, 0);                                   // floor
    box('concD', W + 1, .3, D + 1, 0, FL + H + .15, 0);                                    // ceiling slab
    box('shib_tile', .3, H, D, -W / 2, FL + H / 2, 0);                                      // west wall
    for (const s of [-1, 1]) box('shib_tile', W, H, .3, 0, FL + H / 2, s * D / 2);          // north / south walls
    box('shib_tile', .3, H, D / 2 - 1.75, W / 2, FL + H / 2, D / 4 + .88); box('shib_tile', .3, H, D / 2 - 1.75, W / 2, FL + H / 2, -D / 4 - .88);   // east wall with the stair opening
    for (let i = -1; i <= 1; i++) for (const s of [-1, 1]) box('concD', .8, H, .8, i * 6, FL + H / 2, s * 4);          // columns
    for (let i = 0; i < 6; i++) box('glowC', 2.4, .05, .3, -7.5 + i * 3, FL + H - .05, 0);   // light strips
    for (let k = 0; k < 4; k++) prop('station_gate', -4, FL, -6 + k * 4, Math.PI / 2);   // ticket gate line
    for (let k = 0; k < 4; k++) prop('ticket_machine', -W / 2 + .5, FL, -5 + k * 1.4, Math.PI / 2);
    box('steel', 3.2, 1, .1, 5, FL + 2.6, -D / 2 + .2); box('glowY', 3, .8, .02, 5, FL + 2.6, -D / 2 + .26);  // departure board
    for (let i = 0; i < 6; i++) prop(['trash_bags', 'shopping_bag', 'umbrella_clear', 'handbag', 'school_bag', 'smartphone'][i], (R() - .5) * 14, FL, (R() - .5) * 10, R() * 6);
  });
  K.setZone('shibuya');
  const P = K.fpos(x, FL + 3, z), L = new THREE.PointLight(0xcfe0ff, 25, 26, 1.6); L.position.copy(P); X.scene.add(L);
  for (let i = 0; i < 4; i++) pic(X.cards.cardMaterial(['J', 'Q', 'K', 'J'][i], ['C', 'S', 'H', 'D'][i]), 1, 1.5, x - 6 + i * 4, FL + 1.8, z + D / 2 - .2, Math.PI);   // posters
  // cut the city land slab over the stair opening and the bay water plane over the whole hall (world rects)
  const a = K.fpos(HOLE[0], 0, HOLE[1]), b = K.fpos(HOLE[2], 0, HOLE[3]);
  cutLand(Math.min(a.x, b.x), Math.min(a.z, b.z), Math.max(a.x, b.x), Math.max(a.z, b.z));
  const c0 = K.fpos(x - W / 2 - 1, 0, z - D / 2 - 1), c1 = K.fpos(HOLE[2], 0, z + D / 2 + 1);
  waterHole(Math.min(c0.x, c1.x), Math.min(c0.z, c1.z), Math.max(c0.x, c1.x), Math.max(c0.z, c1.z));
}
function cutLand(x0, z0, x1, z1) {
  const land = X.scene.children.find((o) => o.isMesh && o.geometry && o.geometry.type === 'ShapeGeometry' && Math.abs(o.position.y + .08) < 1e-3);
  if (!land) return;
  const holes = land.userData.holes || (land.userData.holes = []); holes.push([x0, z0, x1, z1]);
  const sh = new THREE.Shape(X.map.COAST.map(([x, z]) => new THREE.Vector2(x, -z)));
  for (const [a, b, c, e] of holes) sh.holes.push(new THREE.Path([new THREE.Vector2(a, -b), new THREE.Vector2(c, -b), new THREE.Vector2(c, -e), new THREE.Vector2(a, -e)]));
  const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2);
  const uv = g.attributes.uv, pos = g.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / 8, pos.getZ(i) / 8);
  land.geometry.dispose(); land.geometry = g;
}
function waterHole(x0, z0, x1, z1) {   // discard the bay water plane inside a world rect (chains other patches)
  const water = X.scene.children.find((o) => o.isMesh && o.geometry?.parameters?.width === 9000); if (!water) return;
  const m = water.material, prev = m.onBeforeCompile.bind(m), prevKey = m.customProgramCacheKey.bind(m);
  const test = `if (vSubW.x > ${x0.toFixed(1)} && vSubW.x < ${x1.toFixed(1)} && vSubW.y > ${z0.toFixed(1)} && vSubW.y < ${z1.toFixed(1)}) discard;`;
  m.onBeforeCompile = (sh, r) => {
    prev(sh, r);
    if (!sh.vertexShader.includes('vSubW')) {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vSubW;').replace('#include <project_vertex>', '#include <project_vertex>\nvSubW = (modelMatrix * vec4(transformed, 1.0)).xz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vSubW;');
    }
    sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'void main() {\n' + test);
  };
  m.customProgramCacheKey = () => prevKey() + '|subHole'; m.needsUpdate = true;
}
function viaduct() {   // elevated rail line behind the crossing with a stalled train
  const z = -104;
  box('concD', 262, 1.4, 10, 0, 8.1, z); box('roof', 260, .3, 8, 0, 8.95, z);
  for (const s of [-1, 1]) { box('conc', 262, 1.1, .3, 0, 9.35, z + s * 4.85); box('conc', 262, .5, .6, 0, 7.15, z + s * 4.6); }
  for (const tz of [z - 2.2, z + 2.2]) { for (const s of [-1, 1]) box('steelL', 260, .15, .08, 0, 9.18, tz + s * .75); for (let x = -129; x < 130; x += 2.2) box('concD', .25, .1, 2.4, x, 9.12, tz); box('steel', 260, .03, .03, 0, 14.3, tz); }
  for (let x = -117; x < 130; x += 26) { box('steel', .3, 6, .3, x, 12, z - 4.6); box('steel', .15, .15, 7, x, 14.6, z - 1.2); }
  for (const x of [-118, -92, -66, -40, 16, 42, 68, 94, 120]) { box('concD', 2.4, 7.4, 2.4, x, 3.7, z); box('concD', 3, 1, 9.5, x, 6.9, z); if (R() < .7) box('ivy', 2.6, 3 + R() * 4, 2.6, x, 2, z); SOLID.push([x - 1.5, z - 1.5, x + 1.5, z + 1.5]); }
  for (const s of [-1, 1]) box('concD', 3, 9, 11, s * 128.5, 4.5, z);
  for (let x = -129; x < 130; x += 1.6) for (const s of [-1, 1]) if (R() < .45) hang(x + R(), 9.6, z + s * 5.1, .6 + R() * R() * 6);
  for (const cx of [-30, -10]) {   // two stalled commuter cars
    const tz = z + 2.2;
    box('shib_train', 19.5, 2.6, 2.9, cx, 10.8, tz); box('shib_bus', 19.6, .3, 2.92, cx, 10.0, tz); box('shib_glass', 17, .9, 2.94, cx, 11.05, tz);
    box('steelL', 19.5, .3, 2.6, cx, 12.2, tz); for (const s of [-1, 1]) box('steel', 2.6, .5, 2.2, cx + s * 7, 9.4, tz);
    box('roofG', 12 + R() * 5, .2, 2.2, cx + (R() - .5) * 3, 12.42, tz); for (let i = 0; i < 6; i++) tuft(cx + (R() - .5) * 16, tz + (R() - .5) * 2, 1, 12.5);
    for (let i = 0; i < 8; i++) hang(cx + (R() - .5) * 19, 12.3, tz + 1.5, .5 + R() * 1.8);
  }
}

/* ───────────── build ───────────── */
export function build(ctx, d) {
  X = ctx; R = K.rng(7109); M = {}; SOLID.length = 0;
  materials();
  K.withFrame(d.x, 0, d.z, 0, () => {
    // buildings first (they register SOLID footprints used by the scatter passes)
    const [ux, uz] = tower();
    podium();
    bld(-126, -24, -92, 10, 38, 'fac0', { y0: DECK, st: 'e' });                 // W2 on the podium
    bld(-72, -97, -30, -76, 28, 'fac2', { st: 'e' });                           // N2 behind the tower
    bld(10, -40, 48, 10, 49, 'fac0', { st: 's' });                              // NE1 (diamond mural)
    bld(54, -45, 95, 10, 24, 'fac4', { st: 's' });                              // NE2
    bld(100, -30, 128, 10, 45, 'fac1', { st: 'sw' });                           // NE3
    bld(10, -95, 60, -48, 63, 'fac5', { st: 'w' });                             // NE4
    bld(66, -95, 128, -52, 35, 'fac3', {});                                     // NE5
    bld(10, 62, 50, 112, 31.5, 'fac2', { st: 'nw' });                           // SE1 (set back for the store)
    bld(26, 50, 50, 62, 14, 'fac0', { st: 'n' });                               // SE1b
    konbini(ctx, 10.4, PV, 50.4, 0);                                             // corner convenience store
    bld(56, 50, 100, 88, 21, 'fac0', { st: 'n' });                              // SE2
    bld(106, 50, 128, 112, 42, 'fac1', { st: 'nw' });                           // SE3
    bld(56, 94, 100, 112, 10.5, 'fac3', {});                                    // SE4
    bld(-75, 58, -32, 112, 28, 'fac4', { st: 'ne' });                           // SW1
    bld(-128, 50, -82, 112, 38.5, 'fac2', { st: 'ne' });                        // SW2
    // murals, screens, card billboards
    pic(X.cards.cardMaterial('J', 'D'), 20, 30, 9.85, PV + 31.5, -15, -Math.PI / 2);   // red-diamond mural
    screen(10, PV + 10.8, -15, -Math.PI / 2, 18, 9, 'static');
    screen(29, PV + 27, 10, 0, 8, 0, 'card', ['J', 'H']);
    screen(-92, DECK + 21, -7, Math.PI / 2, 28, 15, 'broken');
    screen(-92, DECK + 8, -7, Math.PI / 2, 12, 5, 'ad');
    screen(-30, PV + 17, -86.5, Math.PI / 2, 9, 0, 'card', ['J', 'C']);
    screen(74.5, PV + 14, 10, 0, 16, 8, 'ad');
    roofBoard(74.5, PV + 24.6, -10, .35, 14, 7, 'broken');
    screen(10, PV + 52, -71.5, -Math.PI / 2, 9, 0, 'card', ['K', 'S']);
    screen(30, PV + 15, 50, Math.PI, 16, 9, 'broken');
    screen(10, PV + 18, 72, -Math.PI / 2, 8, 0, 'card', ['K', 'D']);
    roofBoard(78, PV + 21.6, 66, Math.PI, 16, 8, 'ad');
    screen(-32, PV + 13, 76, Math.PI / 2, 12, 7, 'static');
    screen(-53.5, PV + 15, 58, Math.PI, 14, 8, 'ad');
    screen(-105, PV + 26, 50, Math.PI, 8, 0, 'card', ['Q', 'S']);
    screen(114, PV + 30, 50, Math.PI, 10, 6, 'static');
    viaduct();
    subway(-47, 49.5);
    ground();

    // signals, pedestrian lights, guard rails
    signal(3.8, -6, -1, 0, 9); signal(-23.8, 54, 1, 0, 9); signal(14, 16.2, 0, 1, 9); signal(-48, 43.8, 0, -1, 9);
    { const [x, z] = along(48, 10.5); signal(x, z, -N[0], -N[1], 8); }
    pedPole(3.6, 4, -1, 0); pedPole(-23.2, 3, 1, 0); pedPole(3.6, 52, -1, 0); pedPole(12.5, 43.8, 0, -1); pedPole(-40, 16.6, 0, 1);
    guard(2.6, -96, 2.6, -8); guard(14, 17.4, 125, 17.4); guard(2.6, 54, 2.6, 112); guard(14, 42.6, 125, 42.6);
    guard(-22.6, 56, -22.6, 112); guard(-125, 42.6, -48, 42.6); guard(-22.6, -96, -22.6, -8); guard(-125, 17.4, -66, 17.4);
    guard(...along(50, DW + .6), ...along(160, DW + .6)); guard(...along(50, -DW - .6), ...along(150, -DW - .6));
    // street lamps (fake pools) + two real warm spots on the crossing corners
    for (const [x, z, dir] of [[3.5, -30, -Math.PI / 2], [3.5, -70, -Math.PI / 2], [40, 16.5, 0], [90, 16.5, 0], [3.5, 80, -Math.PI / 2], [40, 43.5, Math.PI], [90, 43.5, Math.PI],
      [-23.5, 85, Math.PI / 2], [-85, 43.5, Math.PI], [-23.5, -40, Math.PI / 2], [-23.5, -80, Math.PI / 2], [-95, 16.5, 0]]) K.lamp(x, z, 8, { dir, spot: false, warm: true, y0: PV });
    // abandoned vehicles
    const H = Math.PI / 2, DIAG = ARY;
    for (const [k, x, z, ry] of [
      ['bus', -5.5, 84, H + .04], ['taxi', -2, 60, H - .3], ['taxi', -5.8, 64.5, H + .15], ['taxi', -1.4, 70, H + .5], ['sedan', -17, 72, -H + .1], ['van', -15, 98, -H],
      ['sedan', -1, 22, .8], ['truck', -17, 36, .25], ['taxi', -8, 40, 2.6],
      ['bus', -78, 24, .02], ['van', -102, 36, Math.PI + .1], ['sedan', -58, 35, Math.PI - .2], ['truck', -118, 23, 0],
      ['sedan', -15, -28, -H + .2], ['van', -5, -52, H], ['taxi', -17, -78, -H - .1], ['truck', -4.5, -17, H + .1], ['sedan', -6, -92, H + .3],
      ['taxi', 28, 36, Math.PI + .1], ['taxi', 35, 33.5, Math.PI - .2], ['sedan', 58, 23.5, .05], ['van', 88, 36, Math.PI], ['bus', 112, 24, 0],
      ['sedan', ...along(62, -4.5), DIAG], ['van', ...along(92, 4), DIAG + Math.PI], ['taxi', ...along(122, -3), DIAG + .2], ['sedan', ...along(140, 4), DIAG + Math.PI - .5],
    ]) car(k, x, z, ry);
    // barricades, cones
    for (const [x, z, ry, f] of [[-20, 56.5, 0, 0], [-18.2, 56.8, .1, 0], [-16, 57.5, .5, 1], [-13.5, 56.4, -.1, 0], [-11.2, 57, 1.4, 1], [-34, 45, .3, 0], [-36, 44.4, 0, 0],
      [-14, -8, 0, 0], [-12, -8.4, .2, 1], [-19, -9, -.3, 0], [5.5, 14, .8, 0], [7.5, 13.2, .4, 1], [-20, 33, 1.2, 0], [-15, 39, .3, 1], [-28, 24, 2, 0],
      [20, 26, 1.6, 0], [21, 29, 1.4, 1], [-60, 20.5, 0, 0], [-62, 21, .3, 1], [50, 40, 0, 0], [-8, 108, 0, 0], [-10, 108.5, .2, 0], [-12.5, 107, .7, 1]]) barr(x, z, ry, f);
    for (const [x, z] of [[-3, 52.5], [-1, 53.5], [1, 51.8], [-24, 20], [-26, 21.5], [12, 30], [12.5, 33], [-46, 28], [-6, -5], [0, -3]]) cone(x, z);
    vend(8.6, -9, -H); vend(8.6, -10.2, -H); vend(-40, 56.6, Math.PI); vend(-41.2, 56.6, Math.PI); vend(-28.6, -48, H);
    // trees through the pavement and the broken asphalt
    for (const [x, z, s] of [[-30, 80, 1.1], [-60, 46, .9], [-100, 46.5, 1], [6, -60, 1], [6, 66, 1.1], [30, 46, .9], [70, 14, 1], [110, 46.5, 1], [-27, -62, 1.2], [-27, -22, .9],
      [-110, 15.5, .9], [-40, -112, 1], [-120, -112, 1.1], [6, 100, 1], [118, 14, .9], [-27, 104, 1]]) { X.tree(x, z, s, groundY(x, z)); cyl('shib_soil', 1, .05, x, groundY(x, z) + .02, z, 0, 0, 0, 10); for (let k = 0; k < 5; k++) tuft(x + (R() - .5) * 2.4, z + (R() - .5) * 2.4); }
    for (const [x, z, s] of [[-40, 6, 1.2], [60, 30.5, 1], [-10, 104, .9], [-14, -60, 1.1], [...along(110, 1), 1], [-90, 30, .9]]) {
      X.tree(x, z, s, RD); cyl('shib_soil', 1.6, .06, x, RD + .02, z, 0, 0, 0, 10);
      for (let k = 0; k < 5; k++) { const a = R() * 6.28; box('shib_road', .8 + R(), .12, .6 + R() * .6, x + Math.cos(a) * 1.9, RD + .05, z + Math.sin(a) * 1.9, a, (R() - .5) * .4, (R() - .5) * .4); }
      for (let k = 0; k < 10; k++) tuft(x + (R() - .5) * 4, z + (R() - .5) * 4, 1.1, RD);
    }
    // weeds everywhere (half along the curbs), debris
    const CURBS = [[2, -115, 2, 18], [2, 18, 130, 18], [2, 42, 2, 115], [2, 42, 130, 42], [-22, 42, -22, 115], [-130, 42, -22, 42], [-22, -115, -22, 7], [-130, 18, -36, 18], [...along(25, DW), ...along(170, DW)], [...along(28, -DW), ...along(150, -DW)]];
    for (let i = 0; i < 520; i++) {
      let x, z;
      if (i % 2) { const [a, b, c, e] = CURBS[Math.floor(R() * CURBS.length)], t = R(); x = a + (c - a) * t + (R() - .5) * 1.2; z = b + (e - b) * t + (R() - .5) * 1.2; }
      else { x = (R() - .5) * 256; z = (R() - .5) * 226; }
      if (free(x, z, .5)) tuft(x, z, .8 + R() * .6);
    }
    for (let i = 0; i < 110; i++) {
      const x = (R() - .5) * 250, z = (R() - .5) * 220; if (!free(x, z, 1)) continue;
      const y = groundY(x, z), k = R();
      if (k < .45) box('concD', .2 + R() * .7, .12 + R() * .3, .2 + R() * .6, x, y + .1, z, R() * 3, (R() - .5) * .5, (R() - .5) * .5);
      else if (k < .7) box('paintW', .25 + R() * .3, .01, .3 + R() * .2, x, y + .01, z, R() * 3);
      else if (k < .8) cyl('tire', .33, .24, x, y + .12, z, 0, 0, 0, 10);
      else if (k < .9) cyl(R() < .5 ? 'barrel' : 'pipeR', .3, .9, x, y + .3, z, Math.PI / 2, R() * 3, 0, 10);
      else box('steelL', .05, .05, 1.5 + R() * 2, x, y + .03, z, R() * 3);
    }
  });
  // two real warm street lights on opposite corners (world coords: kit lamp spot positions are not framed)
  K.lamp(d.x + 4.2, d.z + 15.8, 9, { dir: -Math.PI / 4, warm: true, intensity: 900, y0: PV });
  K.lamp(d.x - 24.5, d.z + 62, 9, { dir: Math.PI * .75, warm: true, intensity: 900, y0: PV });

  // screens flicker; static noise scrolls
  let base = .6, acc = 0;
  ctx.updates.push((dt) => {
    acc += dt; if (acc > .07) { acc = 0; M.static.map.offset.set(Math.random(), Math.random()); }
    M.broken.emissiveIntensity = base * (Math.random() < .04 ? .25 : 1);
    M.ad.emissiveIntensity = base * (Math.random() < .015 ? 0 : 1);
  });
  ctx.dayNight.push((day) => {
    // Shibuya is the live game venue: the only part of the city with power at night (screens, neon, shops)
    base = day ? .35 : 1.1; M.static.emissiveIntensity = base;
    M.shop.emissiveIntensity = day ? .15 : .9; M.twin.emissiveIntensity = day ? .3 : 1.1; M.sign.emissiveIntensity = day ? .2 : 1.2;
    M.mural.emissiveIntensity = day ? 0 : .25; M.subSign.emissiveIntensity = day ? .2 : 1.4;
  });
  ctx.pois.push({ id: d.id, cam: [d.x + 25, 50, d.z + 112], tgt: [d.x - 18, 10, d.z], spawn: [d.x - 27, PV + .1, d.z + 47], yaw: Math.atan2(-17, 37) });
}
