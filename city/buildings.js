// Modular abandoned-Tokyo buildings (after the three reference sheets):
//   A  corner office  — 6–10F concrete bands + ribbon windows, curved glass corner, sign frames, fire stair, busy roof
//   B  podium tower   — planted concrete podium, teal curtain-wall shaft with broken panes, vines, plant room + mast
//   C  narrow flats   — tiled 4–7F, balcony + AC + window per floor, drainpipes, rear stair, tank on legs, shop + awning
// The massing (one textured body) goes into the city zone and is always drawn / collidable; everything else goes
// into a det_* zone that main.js only draws near the camera and the player never collides with.
import * as THREE from 'three';
import * as K from '../kit.js';
import { foliage } from './index.js';

const { box, cyl, plane, put, strut, M4, withFrame, setZone, canvasTex, noise, def, std } = K;
const TILE = 14.4;   // facade textures: 4 modules × 4 floors of 3.6 m

/* ───────────── textures ───────────── */
function brokenPane(g, x, y, w, h, r) {   // jagged hole with a few hanging shards
  g.fillStyle = 'rgb(14,16,18)'; g.beginPath();
  const cx = x + w * (.3 + r() * .4), cy = y + h * (.3 + r() * .4), n = 9 + Math.floor(r() * 5);
  for (let i = 0; i < n; i++) { const a = i / n * 6.283, d = (.25 + r() * .3) * Math.min(w, h) * (i % 2 ? .5 : 1); const px = Math.max(x, Math.min(x + w, cx + Math.cos(a) * d * 1.3)), py = Math.max(y, Math.min(y + h, cy + Math.sin(a) * d)); i ? g.lineTo(px, py) : g.moveTo(px, py); }
  g.closePath(); g.fill();
  g.strokeStyle = 'rgba(200,220,225,.35)'; g.lineWidth = 1; g.stroke();
}
function grime(g, W, H, r, n = 30) {
  for (let i = 0; i < n; i++) { const x = r() * W, y = r() * H, gr = g.createLinearGradient(0, y, 0, y + 30 + r() * 80); gr.addColorStop(0, `rgba(${40 + r() * 20},${42 + r() * 20},${32},${.18 + r() * .2})`); gr.addColorStop(1, 'rgba(40,40,30,0)'); g.fillStyle = gr; g.fillRect(x, y, 2 + r() * 6, 110); }
}
function glassGrad(g, x, y, w, h, r, base) {
  const gr = g.createLinearGradient(x, y, x + w * .6, y + h); const [R, G, B] = base;
  gr.addColorStop(0, `rgb(${R + 40},${G + 45},${B + 45})`); gr.addColorStop(.5, `rgb(${R},${G},${B})`); gr.addColorStop(1, `rgb(${R - 15},${G - 10},${B - 8})`);
  g.fillStyle = gr; g.fillRect(x, y, w, h);
  g.fillStyle = `rgba(255,255,255,${.04 + r() * .08})`; g.beginPath(); g.moveTo(x, y + h * .2); g.lineTo(x + w * .5, y); g.lineTo(x + w * .7, y); g.lineTo(x, y + h * .5); g.fill();
}
// each facade returns [day, glow]; S = 512 px per 14.4 m → module 128 px
function texOffice(seed, wall) {
  const r = K.rng(seed), S = 512, M = 128, lit = [];
  const day = canvasTex(S, S, (g) => {
    g.fillStyle = wall; g.fillRect(0, 0, S, S); noise(g, S, S, 22);
    for (let f = 0; f < 4; f++) for (let m = 0; m < 4; m++) {
      const x = m * M, y = f * M, wy = y + 16, wh = M * .62;
      g.fillStyle = 'rgb(58,60,62)'; g.fillRect(x + 4, wy - 3, M - 8, wh + 6);   // frame
      for (let p = 0; p < 3; p++) {
        const px = x + 8 + p * (M - 16) / 3, pw = (M - 16) / 3 - 4;
        glassGrad(g, px, wy, pw, wh, r, [70, 96, 104]);
        if (r() < .14) brokenPane(g, px, wy, pw, wh, r); else if (r() < .3) lit.push([px, wy, pw, wh]);
      }
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x, y + M - 6, M, 6);   // band shadow line
    }
    grime(g, S, S, r, 46);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${60 + r() * 30},${90 + r() * 40},${40},${.25 + r() * .3})`; g.fillRect(r() * S, Math.floor(r() * 4) * M + M * .82, 4 + r() * 18, 3 + r() * 8); }   // moss on sills
  }, { repeat: true });
  return [day, glowFrom(lit, S)];
}
function texCurtain(seed) {
  const r = K.rng(seed), S = 512, cw = S / 12, rh = S / 8, lit = [];
  const day = canvasTex(S, S, (g) => {
    g.fillStyle = '#1e2c2e'; g.fillRect(0, 0, S, S);
    for (let j = 0; j < 8; j++) for (let i = 0; i < 12; i++) {
      const x = i * cw + 2, y = j * rh + 2, w = cw - 4, h = rh - 4, t = r();
      glassGrad(g, x, y, w, h, r, [38 + t * 14, 70 + t * 18, 72 + t * 16]);
      if (r() < .05) brokenPane(g, x, y, w, h, r); else if (j % 2 === 0 && r() < .12) lit.push([x, y, w, h * 2]);
    }
    g.fillStyle = 'rgba(160,170,165,.55)'; for (let j = 0; j <= 8; j += 2) g.fillRect(0, j * rh - 2, S, 4);   // floor spandrels
    grime(g, S, S, r, 26);
  }, { repeat: true });
  return [day, glowFrom(lit, S)];
}
function texTiles(seed, col) {
  const r = K.rng(seed), S = 512, lit = [];
  const day = canvasTex(S, S, (g) => {
    g.fillStyle = col; g.fillRect(0, 0, S, S); noise(g, S, S, 18);
    g.strokeStyle = 'rgba(90,88,80,.35)'; g.lineWidth = 1;
    for (let i = 0; i <= S; i += 6) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, S); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(S, i); g.stroke(); }
    for (let f = 0; f < 4; f++) for (let m = 0; m < 4; m++) if ((m + f) % 2 === 0) {   // small side windows
      const x = m * 128 + 44, y = f * 128 + 34;
      g.fillStyle = '#4b5052'; g.fillRect(x - 3, y - 3, 46, 62); glassGrad(g, x, y, 40, 56, r, [78, 92, 98]);
      if (r() < .1) brokenPane(g, x, y, 40, 56, r); else if (r() < .3) lit.push([x, y, 40, 56]);
    }
    grime(g, S, S, r, 60);
  }, { repeat: true });
  return [day, glowFrom(lit, S)];
}
function texPodium(seed) {
  const r = K.rng(seed), S = 512, lit = [];
  const day = canvasTex(S, S, (g) => {
    g.fillStyle = '#8c8d88'; g.fillRect(0, 0, S, S); noise(g, S, S, 26);
    for (let f = 0; f < 3; f++) for (let m = 0; m < 6; m++) {
      const x = m * S / 6 + 10, y = f * S / 3 + 22, w = S / 6 - 20, h = S / 3 - 50;
      g.fillStyle = '#3c4042'; g.fillRect(x - 3, y - 3, w + 6, h + 6); glassGrad(g, x, y, w, h, r, [52, 66, 70]);
      if (r() < .15) brokenPane(g, x, y, w, h, r); else if (r() < .3) lit.push([x, y, w, h]);
      g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x, y + h * .5, w, 2);
    }
    grime(g, S, S, r, 50);
  }, { repeat: true });
  return [day, glowFrom(lit, S)];
}
function glowFrom(rects, S) {
  return canvasTex(S, S, (g) => { g.fillStyle = '#000'; g.fillRect(0, 0, S, S); for (const [x, y, w, h] of rects) { g.fillStyle = Math.random() < .7 ? 'rgb(255,200,130)' : 'rgb(190,225,255)'; g.fillRect(x, y, w, h); } }, { repeat: true });
}
const SIGN_TEXT = ['居酒屋', 'カラオケ', 'ラーメン', '質', '薬', 'BAR', '歯科', '不動産', '麻雀', 'HOTEL'];
function texSign(i) {
  const r = K.rng(900 + i), vert = i % 3 !== 2, W = vert ? 128 : 512, H = vert ? 512 : 160;
  const bg = ['#c9c2ae', '#8a2e2a', '#e2ddd0', '#2f4a6a', '#d7c26a', '#3a3a3a'][i % 6], fg = ['#2a2a2a', '#f0e6d0', '#a82a22', '#f2f2f2', '#2a2a2a', '#e8c040'][i % 6];
  return canvasTex(W, H, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, W, H); g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, H - 8);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    const t = SIGN_TEXT[i % SIGN_TEXT.length];
    if (vert) { g.font = 'bold 84px "Yu Gothic","Meiryo",sans-serif'; [...t].forEach((c, k, a) => g.fillText(c, W / 2, H / 2 + (k - (a.length - 1) / 2) * 96)); }
    else { g.font = 'bold 96px "Yu Gothic","Meiryo",sans-serif'; g.fillText(t, W / 2, H / 2); }
    noise(g, W, H, 50); grime(g, W, H, r, 30);
    for (let k = 0; k < 30; k++) { g.fillStyle = `rgba(110,60,30,${r() * .4})`; g.fillRect(r() * W, r() * H, 3 + r() * 20, 2 + r() * 14); }   // rust blooms
  });
}
const texShutter = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#8b8e8f'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 8) { g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, y, w, 2); g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, y + 6, w, 2); } noise(g, w, h, 30); for (let i = 0; i < 8; i++) { g.fillStyle = 'rgba(110,60,30,.35)'; g.fillRect(Math.random() * w, Math.random() * h, 4 + Math.random() * 16, 30); } }, { repeat: true });
const texRail = canvasTex(64, 64, (g, w, h) => {   // balusters + rails, alpha cut-out
  g.clearRect(0, 0, w, h); g.fillStyle = '#9aa0a4';
  g.fillRect(0, 0, w, 6); g.fillRect(0, h - 5, w, 5); g.fillRect(0, h * .5, w, 3);
  for (let x = 2; x < w; x += 10) g.fillRect(x, 0, 3, h);
}, { repeat: true });
const texAwning = (c) => canvasTex(128, 64, (g, w, h) => { g.fillStyle = c; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 12) { g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x, 0, 4, h); } noise(g, w, h, 40); for (let i = 0; i < 10; i++) { g.fillStyle = 'rgba(70,40,20,.4)'; g.fillRect(Math.random() * w, Math.random() * h, 6, 3 + Math.random() * 20); } }, { repeat: true });
const texShop = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#1a1c1e'; g.fillRect(0, 0, w, h); for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(120,140,150,.35)'; g.fillRect(i * 64 + 4, 6, 56, h - 12); } g.strokeStyle = '#555'; g.lineWidth = 4; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke(); } brokenPane(g, 70, 20, 50, 80, Math.random); });
const texSlide = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#d6d4cc'; g.fillRect(0, 0, w, h); g.fillStyle = '#3f4446'; g.fillRect(8, 8, w - 16, h - 16); glassGrad(g, 12, 12, w / 2 - 14, h - 24, Math.random, [80, 96, 102]); glassGrad(g, w / 2 + 2, 12, w / 2 - 14, h - 24, Math.random, [80, 96, 102]); g.fillStyle = 'rgba(230,226,215,.85)'; g.fillRect(w / 2 + 6, 14, w / 2 - 22, h - 28); });

// hanging-vine curtain: dense at the top, breaking into ragged trailing strands (single image, not tiled)
const texDrape = canvasTex(256, 1024, (g, w, h) => {
  g.clearRect(0, 0, w, h); const r = K.rng(77);
  const strands = Array.from({ length: 22 }, () => ({ x: r() * w, len: h * (.25 + r() * .75), sway: (r() - .5) * 30 }));
  const leaf = (x, y, L) => { const k = r(); g.fillStyle = `rgb(${40 + k * 50 | 0},${80 + k * 70 | 0},${25 + k * 25 | 0})`; g.save(); g.translate(x, y); g.rotate(r() * 6.28); g.beginPath(); g.ellipse(0, 0, L, L * .5, 0, 0, 6.28); g.fill(); g.restore(); };
  for (let i = 0; i < 900; i++) { const y = Math.pow(r(), 2.2) * h * .3, x = r() * w; leaf(x, y, 7 + r() * 7); }   // dense mat along the top
  for (const s of strands) for (let y = 0; y < s.len; y += 5) { const t = y / h; leaf(s.x + Math.sin(t * 9) * s.sway * t + (r() - .5) * 14 * (1 - t), y, 5 + r() * 6 * (1 - t * .6)); }
});

let defined = false;
function defineMats() {
  if (defined) return; defined = true;
  const facade = (key, [day, glow], { glow: ng = 1, tile = TILE, ...o } = {}) => { const m = std({ map: day, emissiveMap: glow, emissive: 0xffffff, emissiveIntensity: 0, roughness: .85, ...o }); m.userData.nightGlow = ng; def(key, m, tile); };
  facade('bOff0', texOffice(11, '#a4a39c')); facade('bOff1', texOffice(12, '#b9b1a0')); facade('bOff2', texOffice(13, '#77797a'));
  facade('bCur0', texCurtain(21), { roughness: .3, metalness: .5, glow: .8 }); facade('bCur1', texCurtain(22), { roughness: .3, metalness: .5, glow: .8, color: 0xc8d8d0 });
  facade('bTile0', texTiles(31, '#d9d6cc')); facade('bTile1', texTiles(32, '#c7bba3')); facade('bTile2', texTiles(33, '#b4b8b6'));
  facade('bPod', texPodium(41), { tile: 12 });
  def('bGlass', std({ map: texCurtain(23)[0], color: 0xbfd2cc, roughness: .2, metalness: .55 }), TILE);
  def('bBand', std({ map: K.texConcrete, color: 0xb2b0a8, roughness: .9 }), 4);
  def('bBandD', std({ map: K.texConcrete, color: 0x86857f, roughness: .9 }), 4);
  def('bRust', std({ color: 0x6e4a35, roughness: .75, metalness: .55 }));
  def('bRail', std({ map: texRail, color: 0xb0b6ba, roughness: .6, metalness: .6, alphaTest: .5, side: THREE.DoubleSide }), 1);
  def('bShutter', std({ map: texShutter, roughness: .7, metalness: .5 }), 2.6);
  def('bShop', std({ map: texShop, emissiveMap: texShop, emissive: 0xffd8a0, emissiveIntensity: 0, roughness: .3 }), 1);
  def('bSlide', std({ map: texSlide, roughness: .5 }), 1);
  def('bAwnB', std({ map: texAwning('#2f5c9a'), roughness: .7, side: THREE.DoubleSide }), 2);
  def('bAwnR', std({ map: texAwning('#8c3328'), roughness: .7, side: THREE.DoubleSide }), 2);
  def('bTank', std({ map: K.texConcrete, color: 0xc4c2bc, roughness: .6, metalness: .4 }), 3);
  def('bVend', std({ color: 0x2a5fb0, emissive: 0x9fd0ff, emissiveIntensity: .25, roughness: .4 }));
  for (let i = 0; i < 10; i++) def('bSign' + i, std({ map: texSign(i), emissiveMap: texSign(i), emissive: 0xffffff, emissiveIntensity: 0, roughness: .8 }), 1);
  K.mats.bShop.userData.nightGlow = .9; K.mats.bVend.userData.nightGlow = 1.2;
  for (let i = 0; i < 10; i++) K.mats['bSign' + i].userData.nightGlow = .35;
  def('bDrape', std({ map: texDrape, color: 0xd8ecc0, roughness: .95, alphaTest: .45, side: THREE.DoubleSide }), 1);
  K.mats.bRail.userData.noCollide = true; K.mats.bDrape.userData.noCollide = true;
}

/* ───────────── small modules (local frame) ───────────── */
const planeU = (k, w, h, x, y, z, ry = 0) => {   // plane with 0..1 UVs (single image, not tiled)
  put(k, new THREE.PlaneGeometry(w, h), M4(x, y, z, 0, ry, 0));
};
function rail(x1, z1, x2, z2, y, h = 1.1) {   // see-through baluster railing: 1 plane + a top tube
  const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz); if (L < .2) return;
  plane('bRail', L, h, (x1 + x2) / 2, y + h / 2, (z1 + z2) / 2, K.ang(dx, dz));
}
function railRect(w, d, y, h) { rail(-w / 2, d / 2, w / 2, d / 2, y, h); rail(w / 2, d / 2, w / 2, -d / 2, y, h); rail(w / 2, -d / 2, -w / 2, -d / 2, y, h); rail(-w / 2, -d / 2, -w / 2, d / 2, y, h); }
function ac(x, y, z, ry = 0) { withFrame(x, y, z, ry, () => { box('steelL', .82, .58, .3, 0, .29, 0); plane('grille', .5, .46, -.1, .29, .151); }); }
function tank(x, y, z, r) {
  const R = 1 + r() * .4, L = 2.2;
  for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) strut('bRust', [x + a * R * .7, y, z + b * R * .7], [x + a * R * .7, y + L, z + b * R * .7], .07, 4);
  strut('bRust', [x - R * .7, y + L * .5, z - R * .7], [x + R * .7, y + L * .5, z + R * .7], .04, 4);
  box('bRust', R * 1.6, .12, R * 1.6, x, y + L, z);
  cyl('bTank', R, R * 1.4, x, y + L + R * .7, z, 0, 0, 0, 12); cyl('bTank', .1, R * .5, x, y + L + R * 1.4 + .25, z, 0, 0, 0, 8, R * .9);
}
// switch-back fire stair hugging a wall: local +z is away from the wall, +x along it
function slopeRail(L, x, y, z, th) { const g = new THREE.PlaneGeometry(L, 1), uv = g.attributes.uv; for (let i = 0; i < 4; i++) uv.setX(i, uv.getX(i) * L); put('bRail', g, M4(x, y, z, 0, 0, th)); }
function fireStair(x, z, ry, nf, FH, y0 = 0) {
  withFrame(x, 0, z, ry, () => {
    const W = 1, L = 2.6, th = Math.atan2(FH / 2, L), sl = Math.hypot(L, FH / 2), top = y0 + nf * FH;
    for (let f = 0; f < nf; f++) {
      const y = y0 + f * FH;
      box('bRust', sl, .08, W - .1, 0, y + FH / 4, W * .5, 0, th);            // flight up (+x), against the wall
      box('bRust', sl, .08, W - .1, 0, y + FH * .75, W * 1.5, 0, -th);        // flight back (−x), outer
      box('bRust', 1, .1, 2 * W, L / 2 + .5, y + FH / 2, W);                   // half landing
      box('bRust', 1, .1, 2 * W, -L / 2 - .5, y + FH, W);                      // floor landing
      slopeRail(sl, 0, y + FH * .75 + .55, 2 * W, -th);
      rail(L / 2 + 1, 0, L / 2 + 1, 2 * W, y + FH / 2, 1); rail(-L / 2 - 1, 0, -L / 2 - 1, 2 * W, y + FH, 1);
    }
    for (const a of [-L / 2 - 1, L / 2 + 1]) box('bRust', .1, top + 1, .1, a, (top + 1) / 2, 2 * W);
  });
}
function signFrame(x, y, z, ry, r, big = false) {   // rusty bracket frame holding a faded sign board
  const i = Math.floor(r() * 10), vert = i % 3 !== 2, w = big ? 7 : vert ? 1.3 : 4, h = big ? 3 : vert ? 4.5 + r() * 2.5 : 1.3;
  withFrame(x, y, z, ry, () => {
    box('bRust', w + .2, .1, .1, 0, h / 2 + .05, .5); box('bRust', w + .2, .1, .1, 0, -h / 2 - .05, .5);
    box('bRust', .1, h + .2, .1, -w / 2 - .05, 0, .5); box('bRust', .1, h + .2, .1, w / 2 + .05, 0, .5);
    for (const s of [-1, 1]) { box('bRust', .08, .08, .6, s * w * .35, h * .35, .25); box('bRust', .08, .08, .6, s * w * .35, -h * .35, .25); }
    planeU('bSign' + i, w, h, 0, 0, .56); planeU('bSign' + i, w, h, 0, 0, .44, Math.PI);
  });
}
function ivyDrape(x, y, z, ry, w, h, up = false) {   // up: climbing from the ground (strands point up)
  withFrame(x, 0, z, ry, () => { const g = new THREE.PlaneGeometry(w, h); if (up) g.rotateZ(Math.PI); put('bDrape', g, M4(0, y, 0)); });
}
function storefront(w, z, r, awn = r() < .5 ? 'bAwnB' : 'bAwnR') {   // ground floor of a facade at local z, width w
  const sw = Math.min(w * .5, 4 + r() * 3);
  plane('bShutter', sw, 2.6, -w * .2, 1.3, z + .02);
  planeU('bShop', Math.min(w * .35, 4), 2.6, w * .25, 1.3, z + .02);
  box(awn, sw + 1, .06, 1.5, -w * .2, 3.1, z + .7, 0, 0, -.32);
  box('bRust', sw + 1, .08, .08, -w * .2, 2.85, z + 1.4);
}

/* ───────────── building types (local frame: +z = street front) ───────────── */
function typeC(w, d, nf, r) {   // narrow apartment
  const FH = 3, H = 3.6 + (nf - 1) * FH, mk = 'bTile' + Math.floor(r() * 3);
  body(mk, w, H, d);
  det(() => {
    storefront(w, d / 2, r, r() < .7 ? 'bAwnB' : 'bAwnR');
    if (r() < .6) { box('bVend', .9, 1.8, .7, w / 2 - .7, .9, d / 2 + .5); }
    for (let f = 1; f < nf; f++) {
      const y = 3.6 + (f - 1) * FH, bw = w * .8;
      box('bBand', bw + .3, .16, 1.15, 0, y, d / 2 + .57); box('bBandD', bw + .3, .3, .1, 0, y - .1, d / 2 + 1.12);
      rail(-bw / 2, d / 2 + 1.12, bw / 2, d / 2 + 1.12, y, 1.05); rail(-bw / 2, d / 2, -bw / 2, d / 2 + 1.12, y, 1.05); rail(bw / 2, d / 2, bw / 2, d / 2 + 1.12, y, 1.05);
      planeU('bSlide', bw * .75, 2.1, 0, y + 1.15, d / 2 + .02);
      ac(bw / 2 - .7, y + .08, d / 2 + .6, Math.PI);
      if (r() < .35) foliage(-bw / 2 + .5, y + .6, d / 2 + .7, .5, .45, 6, 'crown1', .5);
    }
    cyl('pipeD', .07, H, w / 2 - .25, H / 2, d / 2 + .12, 0, 0, 0, 6); cyl('pipeD', .07, H, -w / 2 + .25, H / 2, -d / 2 - .12, 0, 0, 0, 6);
    box('steelL', .5, .7, .2, -w / 2 + .5, 1.6, d / 2 + .1);   // meters
    fireStair(0, -d / 2, Math.PI, nf - 1, FH, 3.6 - FH);
    railRect(w - .2, d - .2, H, 1); tank(-w * .2, H, -d * .15, r); ac(w * .25, H, d * .2); ac(w * .25, H, d * .2 - 1);
    strut('steelL', [w * .3, H, -d * .3], [w * .3, H + 4, -d * .3], .04, 4); strut('steelL', [w * .3 - .8, H + 3.5, -d * .3], [w * .3 + .8, H + 3.5, -d * .3], .03, 4);
    if (r() < .6) foliage(w * .2, H + 1.2, d * .3, 1.2, 1, 10, 'crown0', .8);
    vines(w, d, H, r, 1 + Math.floor(r() * 3));
  });
  return H;
}
function typeA(w, d, nf, r) {   // corner office with curved glass corner (front-right)
  const FH = 3.6, H = nf * FH, mk = 'bOff' + Math.floor(r() * 3), c = Math.min(w, d) * (.28 + r() * .1);
  body(mk, w - c, H, d, -c / 2, 0); body(mk, c, H, d - c, w / 2 - c / 2, -c / 2);
  // curved glass corner (quarter cylinder) — part of the massing
  const g = new THREE.CylinderGeometry(c, c, H, 10, 1, true, 0, Math.PI / 2), uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * c * 1.57 / TILE, uv.getY(i) * H / TILE);
  put('bGlass', g, M4(w / 2 - c, H / 2 + .12, d / 2 - c));
  put('roof', new THREE.CylinderGeometry(c + .05, c + .05, .3, 10, 1, false, 0, Math.PI / 2), M4(w / 2 - c, H + .27, d / 2 - c));
  det(() => {
    for (let f = 1; f <= nf; f++) {   // floor bands wrapping the corner
      const y = f * FH - .2;
      box('bBand', w - c + .3, .5, .3, -c / 2, y, d / 2 + .1); box('bBand', .3, .5, d - c + .3, w / 2 + .1, y, -c / 2);
      box('bBand', w + .3, .5, .3, 0, y, -d / 2 - .1); box('bBand', .3, .5, d + .3, -w / 2 - .1, y, 0);
      const cg = new THREE.CylinderGeometry(c + .25, c + .25, .5, 5, 1, true, 0, Math.PI / 2); put('bBand', cg, M4(w / 2 - c, y, d / 2 - c));
    }
    storefront(w - c, d / 2, r); box('bBandD', w + .6, .4, 1.6, 0, 3.2, d / 2 + .7);
    plane('bShutter', d * .4, 3, w / 2 + .02, 1.5, -d * .25, Math.PI / 2);
    for (let i = 0; i < 1 + Math.floor(r() * 3); i++) signFrame(-w / 2 + 1.5 + r() * (w - c - 3), 6 + r() * (H - 12), d / 2 + .1, 0, r);
    if (r() < .7) signFrame(w / 2 + .1, 6 + r() * Math.max(1, H - 14), -d * .1, Math.PI / 2, r);
    fireStair(-w / 2, -d * .1, -Math.PI / 2, nf - 1, FH);
    if (r() < .5) for (let f = 2; f < nf; f += 2) { box('bBand', 3, .9, 1, -w / 2 + 2.5, f * FH + .3, d / 2 + .6); foliage(-w / 2 + 2.5, f * FH + 1.2, d / 2 + .6, 1.1, .6, 8, 'crown2', .6); }   // planter balconies
    // roof: parapet + rail, AC cluster, tank, trees, rooftop sign
    railRect(w, d, H + .12, 1.2);
    for (let i = 0; i < 3 + r() * 4; i++) ac(-w / 2 + 2 + (i % 3) * 1.2, H + .12, -d / 2 + 2 + Math.floor(i / 3) * 1.2);
    if (r() < .6) tank(w * .2, H + .12, -d * .25, r);
    for (let i = 0; i < 1 + r() * 3; i++) foliage(-w * .2 + r() * w * .4, H + 1.6, r() * d * .3, 1.3 + r() * .6, 1.2, 12, 'crown' + (i % 3), .9);
    box('roofG', w * .5, .2, d * .35, -w * .1, H + .2, d * .15);
    if (r() < .35) withFrame(0, H, -d * .3, 0, () => { for (const s of [-1, 1]) strut('bRust', [s * 3, 0, 0], [s * 3, 4, 0], .1, 5); signFrame(0, 5.6, -.5, 0, r, true); });
    vines(w, d, H, r, 2 + Math.floor(r() * 4));
  });
  return H;
}
function typeB(w, d, nf, r) {   // glass tower on a planted podium
  const pf = 2 + Math.floor(r() * 2), PH = pf * 4.2, tw = w * (.55 + r() * .12), td = d * (.55 + r() * .12), TH = nf * 3.6, ck = 'bCur' + Math.floor(r() * 2);
  body('bPod', w, PH, d); body(ck, tw, TH, td, 0, 0, PH);
  det(() => {
    for (let x = -w / 2; x <= w / 2 + .01; x += 3) { box('bBandD', .4, PH, .6, x, PH / 2, d / 2 + .3); box('bBandD', .4, PH, .6, x, PH / 2, -d / 2 - .3); }   // podium fins
    box('bBand', w + 1, .6, d + 1, 0, PH + .3, 0);
    box('roofG', w - 1, .3, d - 1, 0, PH + .7, 0);
    railRect(w + .6, d + .6, PH + .6, 1.1);
    for (let i = 0; i < 10 + r() * 8; i++) {   // terrace trees around the shaft
      const a = r() * 6.283, x = Math.cos(a) * (tw / 2 + 2 + r() * (w - tw) / 2 * .7), z = Math.sin(a) * (td / 2 + 2 + r() * (d - td) / 2 * .7);
      if (Math.abs(x) > w / 2 - 1 || Math.abs(z) > d / 2 - 1) continue;
      foliage(x, PH + 2.4, z, 1.6 + r(), 1.4, 14, 'crown' + (i % 3), 1); strut('trunk', [x, PH + .8, z], [x, PH + 2, z], .14, 5);
    }
    box('bBandD', 8, .4, 3, 0, 4, d / 2 + 1.5); planeU('bShop', 6, 3.4, 0, 1.8, d / 2 + .02);   // entrance canopy
    for (let i = 0; i < 3 + r() * 5; i++) {   // vines hanging from the crown down the shaft
      const side = Math.floor(r() * 4), along = (r() - .5) * ((side % 2 ? td : tw) - 3), vh = TH * (.25 + r() * .5), y = PH + TH - vh / 2;
      if (side === 0) ivyDrape(along, y, td / 2 + .15, 0, 1.2 + r() * 1.5, vh);
      else if (side === 1) ivyDrape(tw / 2 + .15, y, along, Math.PI / 2, 1.2 + r() * 1.5, vh);
      else if (side === 2) ivyDrape(along, y, -td / 2 - .15, Math.PI, 1.2 + r() * 1.5, vh);
      else ivyDrape(-tw / 2 - .15, y, along, -Math.PI / 2, 1.2 + r() * 1.5, vh);
    }
    const top = PH + TH;
    box('bBand', tw + .4, 1.2, td + .4, 0, top + .6, 0); box('bBandD', tw * .5, 5, td * .45, 0, top + 2.5, 0);
    for (let i = 0; i < 4; i++) ac(-tw * .3 + i * 1.3, top + .12, td * .32);
    for (let i = 0; i < 2 + r() * 3; i++) foliage((r() - .5) * tw * .7, top + 1.6, (r() - .5) * td * .7, 1.2, 1, 10, 'crown1', .8);
    const mh = 8 + r() * 10, mb = top + 5;   // lattice mast
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) strut('bRust', [a * .9, mb, b * .9], [a * .2, mb + mh, b * .2], .06, 4);
    for (let k = 0; k < 5; k++) { const t = k / 5, s = .9 - .7 * t, y = mb + mh * t; strut('bRust', [-s, y, -s], [s, y + mh / 10, s], .03, 3); strut('bRust', [s, y, -s], [-s, y + mh / 10, s], .03, 3); }
    K.beacon(0, mb + mh + .3, 0, .3);
  });
  return PH + TH;
}
function vines(w, d, H, r, n) {   // ivy curtains: climbing from the street or draping from the roof
  for (let i = 0; i < n; i++) {
    const side = Math.floor(r() * 4), L = side % 2 ? d : w, iw = 1.5 + r() * Math.min(6, L * .4), ih = H * (.2 + r() * .7), along = (r() - .5) * (L - iw);
    const up = r() < .4, y = up ? ih / 2 + .1 : H - ih / 2 + .1;
    if (side === 0) ivyDrape(along, y, d / 2 + .2, 0, iw, ih, up);
    else if (side === 1) ivyDrape(w / 2 + .2, y, along, Math.PI / 2, iw, ih, up);
    else if (side === 2) ivyDrape(along, y, -d / 2 - .2, Math.PI, iw, ih, up);
    else ivyDrape(-w / 2 - .2, y, along, -Math.PI / 2, iw, ih, up);
  }
}

/* ───────────── zone plumbing ───────────── */
let baseZone = 'city', detZone = 'det';
function body(k, w, h, d, x = 0, z = 0, y0 = 0) { const o = K.zone; setZone(baseZone); box(k, w, h, d, x, y0 + h / 2 + .12, z); box('roof', w + .1, .3, d + .1, x, y0 + h + .27, z); setZone(o); }   // + roof cap
function det(fn) { const o = K.zone; setZone(detZone); withFrame(0, .12, 0, 0, fn); setZone(o); }

// public: one building on a lot (world centre x,z, footprint w×d, target height h). Faces a random street side.
// x,z are in the current frame (works inside a district's withFrame). opts.rot fixes the facing: the plain back
// wall (local −z) then faces rot + π, e.g. rot = π/2 puts a clean wall on −x for a mural.
export function cityBuilding(x, z, w, d, h, r, opts = {}) {
  defineMats();
  const wp = K.fpos(x, 0, z);
  baseZone = K.zone; detZone = `det_${Math.floor((wp.x + 2000) / 165)}_${Math.floor((wp.z + 2000) / 165)}`;
  const rot = opts.rot ?? Math.floor(r() * 4) * Math.PI / 2, sw = Math.round(rot / (Math.PI / 2)) % 2 ? d : w, sd = Math.round(rot / (Math.PI / 2)) % 2 ? w : d;
  let H;
  withFrame(x, 0, z, rot, () => {
    if (h > 40 && sw >= 24 && sd >= 24) H = typeB(sw, sd, Math.max(10, Math.round((h - 10) / 3.6)), r);
    else if (Math.min(sw, sd) < 15 || h < 16) H = typeC(Math.min(sw, 11), Math.min(sd, 15), Math.max(3, Math.min(7, Math.round(h / 3.2))), r);
    else H = typeA(sw, sd, Math.max(4, Math.min(11, Math.round(h / 3.6))), r);
  });
  return H;
}
