// Walk-in corner convenience store (generic chain look: three-colour stripe fascia, no real logo).
// Local frame: store footprint x 0..W, z 0..D; glass faces on −x and −z (the street corner), door at the corner.
// Shelving, fridges, counter, bento case, magazine rack, ATM, coffee machine are Tripo props (city/props.js).
import * as THREE from 'three';
import * as K from '../kit.js';
import { prop } from './props.js';

const { box, plane, put, M4, withFrame, canvasTex, noise, def, std, bas } = K;
const W = 15, D = 11, H = 3.6, CEIL = 2.8;
let defined = false;
function mats() {
  if (defined) return; defined = true;
  def('kb_floor', std({ map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#d9d8d2'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 2; for (let i = 0; i <= w; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); } noise(g, w, h, 10); for (let i = 0; i < 20; i++) { g.fillStyle = 'rgba(80,70,60,.12)'; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 8 + Math.random() * 30, 4 + Math.random() * 10, Math.random() * 3, 0, 7); g.fill(); } }, { repeat: true }), roughness: .35 }), 2.4);
  def('kb_wall', std({ color: 0xeeeeea, roughness: .8 }));
  def('kb_ceil', std({ color: 0xe8e8e4, roughness: .9 }));
  def('kb_light', bas({ color: new THREE.Color(1.6, 1.62, 1.6) }));
  def('kb_glass', std({ color: 0x9fb4bc, roughness: .05, metalness: .1, transparent: true, opacity: .22, envMapIntensity: 1.2 }));
  def('kb_frame', std({ color: 0x8c9094, roughness: .4, metalness: .8 }));
  const stripe = canvasTex(512, 64, (g, w, h) => {   // white fascia with orange / green / red bands
    g.fillStyle = '#f4f4f0'; g.fillRect(0, 0, w, h);
    [['#f08a24', 14], ['#1f8a4c', 30], ['#d8242a', 46]].forEach(([c, y]) => { g.fillStyle = c; g.fillRect(0, y, w, 10); });
    g.fillStyle = '#d8242a'; g.font = 'bold 30px Arial'; g.fillText('24H', 12, 12 + 24 - 26); noise(g, w, h, 12);
  }, { repeat: true });
  const fm = std({ map: stripe, emissiveMap: stripe, emissive: 0xffffff, emissiveIntensity: .1, roughness: .5 }); fm.userData.nightGlow = 6; def('kb_fascia', fm, 4);
  const poster = (hue, txt) => canvasTex(128, 180, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, `hsl(${hue},70%,55%)`); gr.addColorStop(1, `hsl(${hue + 40},70%,35%)`); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = 'bold 26px "Yu Gothic",sans-serif'; g.fillText(txt, 10, 60); g.font = '15px sans-serif'; g.fillText('¥ 198', 12, 150); });
  ['新発売', 'おにぎり', 'セール', 'ホット'].forEach((t, i) => def('kb_post' + i, std({ map: poster(i * 80, t), roughness: .6 }), 1));
}
const planeU = (k, w, h, x, y, z, ry = 0) => put(k, new THREE.PlaneGeometry(w, h), M4(x, y, z, 0, ry, 0));

export function konbini(ctx, x, y, z, ry = 0) {
  mats();
  withFrame(x, y, z, ry, () => {
    box('kb_floor', W, .1, D, W / 2, .05, D / 2);
    box('kb_wall', W, H, .25, W / 2, H / 2, D - .12); box('kb_wall', .25, H, D, W - .12, H / 2, D / 2);   // back walls
    box('kb_ceil', W, .1, D, W / 2, CEIL + .05, D / 2); box('roof', W + .4, .4, D + .4, W / 2, H + .2, D / 2);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) box('kb_light', 2.4, .04, .3, 2 + i * 3.6, CEIL - .01, 2 + j * 3.3);   // ceiling light strips
    // glass street faces (−z long side, −x short side) with mullions; 2.2 m door gap at the corner
    const glassRun = (len, a, axis) => {
      for (let s = 0; s < len; s += 2.5) {
        const w = Math.min(2.5, len - s), c = a + s + w / 2;
        if (axis === 'x') { box('kb_glass', w - .08, CEIL, .03, c, CEIL / 2, .06); box('kb_frame', .08, CEIL, .1, a + s, CEIL / 2, .06); }
        else { box('kb_glass', .03, CEIL, w - .08, .06, CEIL / 2, c); box('kb_frame', .1, CEIL, .08, .06, CEIL / 2, a + s); }
      }
    };
    glassRun(W - 2.6, 2.6, 'x'); glassRun(D - 2.6, 2.6, 'z');
    box('kb_frame', 2.6, .12, .12, 1.3, 2.2, .06); box('kb_frame', .12, .12, 2.6, .06, 2.2, 1.3);   // door head
    box('kb_glass', 1.1, 2.1, .03, .2, 1.1, -.3); box('kb_frame', .05, 2.15, .1, .75, 1.1, -.3);   // sliding leaf parked open
    // fascia band + canopy lip over both street faces
    box('kb_fascia', W + .3, .75, .15, W / 2, CEIL + .45, -.08); box('kb_fascia', .15, .75, D + .3, -.08, CEIL + .45, D / 2);
    box('kb_frame', W + .5, .08, .9, W / 2, CEIL + .05, -.4);
    // posters stuck inside the glass
    for (let i = 0; i < 4; i++) planeU('kb_post' + i, .55, .78, 4 + i * 2.6, 1.6, .12, Math.PI);   // facing the street
    // interior props (front of each prop = local +z after the turn noted)
    for (let i = 0; i < 4; i++) prop('drink_fridge', 3 + i * 2.8, 0, D - .6, Math.PI);                 // fridge wall at the back
    prop('bento_case', W - .55, 0, 5.2, Math.PI / 2); prop('bento_case', W - .55, 0, 7.6, Math.PI / 2);
    for (const zz of [4, 6.4]) for (const xx of [4.5, 7.5, 10.5]) { prop('konbini_shelf', xx, 0, zz - .25, 0); prop('konbini_shelf', xx, 0, zz + .25, Math.PI); }
    prop('magazine_rack', 6, 0, .55, 0); prop('magazine_rack', 10, 0, .55, 0);
    prop('konbini_counter', 1.1, 0, 6.5, -Math.PI / 2); prop('konbini_counter', 1.1, 0, 8.6, -Math.PI / 2);
    prop('coffee_machine', 1.1, 0, 4.4, -Math.PI / 2); prop('atm', 3.6, 0, 2, 0);
    // outside: bins, vending pair, a dropped basket of shopping, a parked bike
    prop('trash_bin', 3.4, 0, -1.4, Math.PI / 2); prop('recycle_bin', 4.4, 0, -1.4, 0);
    prop('vending', -1.3, 0, 4.5, -Math.PI); prop('vending', -1.3, 0, 5.7, -Math.PI);
    prop('bicycle', 8, 0, -1.6, .15); prop('shopping_cart', 2.4, 0, -2.6, 1.1);
  });
  // one warm-white interior light (night) so the store reads as the brightest point on the corner
  const L = new THREE.PointLight(0xf2f6ff, 0, 18, 1.6);
  withFrame(x, y, z, ry, () => L.position.copy(K.fpos(W / 2, CEIL - .3, D / 2)));
  ctx.scene.add(L); ctx.dayNight.push((day) => { L.intensity = day ? 0 : 60; K.mats.kb_light.color.setScalar(day ? 1.1 : 1.6); });
}
