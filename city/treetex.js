// Tree textures, painted here at load: a twig atlas (4×2 tiles, one leafy twig per tile, its stem at the tile's v0
// edge and its tip toward v1) whose mipmaps are rescaled so each tile passes the alpha test over the same share of
// texels at every level; and a tileable bark colour + normal pair per species.
import * as THREE from 'three';
import * as K from '../kit.js';

export const COLS = 4, ROWS = 2;
export const TILE = { keyaki: 0, icho: 1, sakura: 2, kusunoki: 3, oak: 4, maple: 5, sapling: 6, keyakiB: 7 };
const GUT = .03;   // gutter per tile edge (fraction of a tile), so mip levels never bleed into the neighbour
export function tileUV(t) { const c = t % COLS, r = Math.floor(t / COLS); return [(c + GUT) / COLS, (r + GUT) / ROWS, (c + 1 - GUT) / COLS, (r + 1 - GUT) / ROWS]; }

// leaf palettes [r, g, b] (light, dark) and the twig colour per tile; `mean` fills the gaps so mips never darken
const PAL = {
  keyaki: { a: [118, 150, 62], b: [58, 92, 34], twig: [92, 74, 56], kind: 'serrate', L: [19, 28], step: 7 },
  keyakiB: { a: [128, 156, 66], b: [62, 98, 38], twig: [92, 74, 56], kind: 'serrate', L: [18, 26], step: 7 },
  icho: { a: [150, 168, 70], b: [92, 124, 44], twig: [104, 90, 70], kind: 'fan', L: [19, 25], step: 8 },
  sakura: { a: [104, 132, 56], b: [52, 82, 32], twig: [78, 52, 48], kind: 'ovate', L: [24, 33], step: 9 },
  kusunoki: { a: [130, 150, 66], b: [56, 86, 36], twig: [96, 80, 58], kind: 'ellipse', L: [21, 29], step: 8 },
  oak: { a: [104, 128, 56], b: [50, 76, 32], twig: [86, 72, 56], kind: 'lobed', L: [23, 31], step: 9 },
  maple: { a: [120, 150, 58], b: [64, 96, 34], twig: [96, 64, 52], kind: 'palm', L: [20, 26], step: 9 },
  sapling: { a: [128, 160, 70], b: [70, 108, 42], twig: [96, 104, 64], kind: 'pinnate', L: [44, 60], step: 20 },
};
export function leafMean(name) { const p = PAL[name] || PAL.keyaki; return p.a.map((v, i) => (v * .45 + p.b[i] * .55) / 255); }

// one leaf of `kind`, petiole at the origin, blade along +x, length L (px)
function leafPath(g, kind, L, r) {
  g.beginPath();
  if (kind === 'fan') {   // ginkgo: a fan on a long stalk, notched in the middle
    const s = L * .35, R = L * .65; g.moveTo(0, -.6); g.lineTo(s, -.6); g.arc(s, 0, R, -1.05, -.08); g.lineTo(s + R * .55, 0); g.arc(s, 0, R, .08, 1.05); g.lineTo(s, .6); g.lineTo(0, .6);
  } else if (kind === 'palm') {   // maple: five pointed lobes
    const c = L * .45; g.moveTo(0, 0);
    for (let k = 0; k <= 10; k++) { const a = -1.5 + k * .3, rr = k % 2 ? L * .3 : L * (k === 4 || k === 6 ? .6 : k === 5 ? .62 : .5); g.lineTo(c + Math.cos(a) * rr, Math.sin(a) * rr); }
    g.closePath();
  } else if (kind === 'lobed') {   // oak: wavy lobed oblong
    const n = 5; g.moveTo(0, 0);
    for (let k = 0; k <= n; k++) { const x = L * (.12 + .85 * k / n), w = L * (.2 + .1 * Math.sin(k * 1.9)) * Math.sin(Math.PI * (k + .5) / (n + 1)); g.quadraticCurveTo(x - L * .08, -w * 1.3, x, -w * .7); }
    g.lineTo(L, 0);
    for (let k = n; k >= 0; k--) { const x = L * (.12 + .85 * k / n), w = L * (.2 + .1 * Math.cos(k * 1.7)) * Math.sin(Math.PI * (k + .5) / (n + 1)); g.quadraticCurveTo(x + L * .08, w * 1.3, x, w * .7); }
    g.closePath();
  } else {   // ovate / elliptic / serrated: two curved edges, a tooth now and then for keyaki
    const w = L * (kind === 'ellipse' ? .26 : kind === 'ovate' ? .3 : .24), teeth = kind === 'serrate' ? 6 : 0;
    g.moveTo(0, 0);
    if (teeth) { for (let k = 1; k <= teeth; k++) { const t = k / (teeth + 1), x = L * t, y = -w * Math.sin(Math.PI * Math.pow(t, .8)); g.lineTo(x - L * .04, y * .86); g.lineTo(x, y); } g.lineTo(L, 0); for (let k = teeth; k >= 1; k--) { const t = k / (teeth + 1), x = L * t, y = w * Math.sin(Math.PI * Math.pow(t, .8)); g.lineTo(x, y); g.lineTo(x - L * .04, y * .86); } }
    else { g.bezierCurveTo(L * .25, -w * 1.25, L * .75, -w * .9, L, 0); g.bezierCurveTo(L * .75, w * .9, L * .25, w * 1.25, 0, 0); }
    g.closePath();
  }
}
// paint one spray into the tile at (ox, oy, T): base at the top centre (→ v0), growing down; mode 'col' paints colour on
// an opaque mean-colour ground, 'cov' paints white coverage on black — same seed, so the two line up exactly
function spray(g, ox, oy, T, name, mode, seed) {
  const p = PAL[name], r = K.rng(seed), sc = T / 256, col = (rgb, k) => `rgb(${rgb.map((v) => Math.max(0, Math.min(255, v * k)) | 0).join(',')})`;
  const pad = T * GUT, bx = ox + T / 2, by = oy + pad + 1, len = T * (1 - 2 * GUT) - 2;
  const twigs = [], leaves = [];
  // main twig with a gentle S, then 5–7 side twigs fanning out left and right (the spray fills an oval in the tile)
  const main = []; const bend = (r() - .5) * .25;
  for (let i = 0; i <= 12; i++) { const t = i / 12; main.push([bx + Math.sin(t * 3.1) * bend * T * .25, by + t * len * .92]); }
  twigs.push({ pts: main, w: 3.2 * sc });
  const ns = p.kind === 'pinnate' ? 3 : 5 + Math.floor(r() * 3);
  for (let k = 0; k < ns; k++) {
    const t = .1 + .7 * (k + r() * .5) / ns, i = Math.floor(t * 12), [sx, sy] = main[i], side = k % 2 ? 1 : -1;
    const a = Math.PI / 2 + side * (.75 + r() * .45), L = len * (.4 + r() * .18) * (1 - t * .35), pts = [];
    for (let j = 0; j <= 6; j++) { const u = j / 6; pts.push([sx + Math.cos(a - side * u * .35) * L * u, sy + Math.sin(a - side * u * .35) * L * u * .85]); }
    twigs.push({ pts, w: 2 * sc });
  }
  for (const tw of twigs) {   // leaves along every twig, alternating, angled toward the tip, plus a terminal leaf
    const pts = tw.pts; let acc = 0, side = r() < .5 ? 1 : -1;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], seg = Math.hypot(x1 - x0, y1 - y0), dir = Math.atan2(y1 - y0, x1 - x0);
      acc += seg;
      while (acc > p.step * sc) {
        acc -= p.step * sc; side = -side;
        const L = (p.L[0] + r() * (p.L[1] - p.L[0])) * sc;
        if (p.kind === 'pinnate') {   // compound leaf: a rachis with paired leaflets
          leaves.push({ x: x1, y: y1, a: dir + side * (.5 + r() * .3), L, pin: true, light: r() });
        } else leaves.push({ x: x1, y: y1, a: dir + side * (.55 + r() * .5), L, light: r(), back: r() < .35 });
      }
    }
    const [ex, ey] = pts[pts.length - 1], [px, py] = pts[pts.length - 2];
    if (p.kind !== 'pinnate') leaves.push({ x: ex, y: ey, a: Math.atan2(ey - py, ex - px), L: p.L[1] * sc, light: r() });
  }
  const twigCol = mode === 'cov' ? '#fff' : col(p.twig, 1);
  const drawTwigs = () => { g.strokeStyle = twigCol; g.lineCap = 'round'; for (const tw of twigs) { g.lineWidth = tw.w; g.beginPath(); g.moveTo(...tw.pts[0]); for (const q of tw.pts) g.lineTo(...q); g.stroke(); } };
  const drawLeaf = (lf) => {
    g.save(); g.translate(lf.x, lf.y); g.rotate(lf.a);
    if (lf.pin) {   // rachis + 5 pairs of leaflets + a tip leaflet
      g.strokeStyle = mode === 'cov' ? '#fff' : col(p.twig, 1.1); g.lineWidth = 1.4 * sc; g.beginPath(); g.moveTo(0, 0); g.lineTo(lf.L, 0); g.stroke();
      for (let k = 0; k < 6; k++) for (const sd of k < 5 ? [-1, 1] : [0]) {
        g.save(); g.translate(lf.L * (.25 + k * .15), 0); g.rotate(sd * 1.05); leafPath(g, 'ovate', lf.L * .3, r);
        g.fillStyle = mode === 'cov' ? '#fff' : col(lf.light > .5 ? p.a : p.b, .85 + .3 * r()); g.fill(); g.restore();
      }
    } else {
      leafPath(g, p.kind, lf.L, r);
      if (mode === 'cov') { g.fillStyle = '#fff'; g.fill(); }
      else {
        const k = (lf.back ? .72 : 1) * (.82 + lf.light * .36), gr = g.createLinearGradient(0, -lf.L * .3, 0, lf.L * .3);   // one half lighter than the other, like a crease down the middle
        gr.addColorStop(0, col(p.a, k * 1.08)); gr.addColorStop(.5, col(p.a, k * .95)); gr.addColorStop(.51, col(p.b, k * 1.05)); gr.addColorStop(1, col(p.b, k * .9));
        g.fillStyle = gr; g.fill();
        g.strokeStyle = col(p.b, k * .7); g.lineWidth = .8 * sc; g.beginPath(); g.moveTo(0, 0); g.lineTo(lf.L * .92, 0); g.stroke();   // midrib
      }
    }
    g.restore();
  };
  for (const lf of leaves) if (lf.back) drawLeaf(lf);   // leaves behind the twig first
  drawTwigs();
  for (const lf of leaves) if (!lf.back) drawLeaf(lf);
}

let atlas = null;
// the atlas as an sRGB DataTexture with our own mip chain; lite: 512×256
export function leafAtlas(lite) {
  if (atlas) return atlas;
  const T = lite ? 128 : 256, W = COLS * T, H = ROWS * T;
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c.getContext('2d', { willReadFrequently: true }); };
  const gc = mk(), ga = mk();
  ga.fillStyle = '#000'; ga.fillRect(0, 0, W, H);
  for (const [name, t] of Object.entries(TILE)) {
    const ox = (t % COLS) * T, oy = Math.floor(t / COLS) * T, m = leafMean(name);
    gc.fillStyle = `rgb(${m.map((v) => v * 255 | 0).join(',')})`; gc.fillRect(ox, oy, T, T);
    gc.save(); gc.beginPath(); gc.rect(ox, oy, T, T); gc.clip(); spray(gc, ox, oy, T, name, 'col', 1000 + t * 77); gc.restore();
    ga.save(); ga.beginPath(); ga.rect(ox, oy, T, T); ga.clip(); spray(ga, ox, oy, T, name, 'cov', 1000 + t * 77); ga.restore();
  }
  const c = gc.getImageData(0, 0, W, H).data, a = ga.getImageData(0, 0, W, H).data, l0 = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) { l0[i * 4] = c[i * 4]; l0[i * 4 + 1] = c[i * 4 + 1]; l0[i * 4 + 2] = c[i * 4 + 2]; l0[i * 4 + 3] = a[i * 4]; }
  // mip chain: box-filtered, then each tile's alpha is scaled so the share of texels that pass the 0.5 test stays what
  // it was at full size (coverage-preserving mips)
  const tileCov = (d, w, h, t) => { const ts = w / COLS, x0 = (t % COLS) * ts, y0 = Math.floor(t / COLS) * ts; let n = 0; for (let y = y0; y < y0 + ts; y++) for (let x = x0; x < x0 + ts; x++) if (d[(y * w + x) * 4 + 3] >= 128) n++; return n / (ts * ts); };
  const cov0 = Object.values(TILE).map((t) => tileCov(l0, W, H, t));
  const mips = [{ data: l0, width: W, height: H }];
  for (let pw = W, ph = H, prev = l0; pw > 1 || ph > 1;) {
    const w = Math.max(1, pw >> 1), h = Math.max(1, ph >> 1), d = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const xa = Math.min(x * 2, pw - 1), xb = Math.min(x * 2 + 1, pw - 1), ya = Math.min(y * 2, ph - 1), yb = Math.min(y * 2 + 1, ph - 1);
      for (let k = 0; k < 4; k++) d[(y * w + x) * 4 + k] = (prev[(ya * pw + xa) * 4 + k] + prev[(ya * pw + xb) * 4 + k] + prev[(yb * pw + xa) * 4 + k] + prev[(yb * pw + xb) * 4 + k] + 2) >> 2;
    }
    const ts = w / COLS;
    if (ts >= 2) for (const t of Object.values(TILE)) {
      const x0 = (t % COLS) * ts, y0 = Math.floor(t / COLS) * ts, src = [];
      for (let y = y0; y < y0 + ts; y++) for (let x = x0; x < x0 + ts; x++) src.push((y * w + x) * 4 + 3);
      const want = cov0[t]; let lo = 1, hi = 12;
      for (let it = 0; it < 14; it++) { const m = (lo + hi) / 2; let n = 0; for (const i of src) if (d[i] * m >= 128) n++; if (n / src.length > want) hi = m; else lo = m; }
      for (const i of src) d[i] = Math.min(255, d[i] * (lo + hi) / 2);
    }
    mips.push({ data: d, width: w, height: h });
    prev = d; pw = w; ph = h;
  }
  atlas = new THREE.DataTexture(l0, W, H, THREE.RGBAFormat);
  atlas.mipmaps = mips; atlas.generateMipmaps = false;
  atlas.minFilter = THREE.LinearMipmapLinearFilter; atlas.magFilter = THREE.LinearFilter;
  atlas.colorSpace = THREE.SRGBColorSpace; atlas.anisotropy = lite ? 2 : 4; atlas.needsUpdate = true;
  return atlas;
}

// bark: 0.8 m around × 1.6 m up per tile; height-ish brightness feeds K.normalFrom
const BARK = {
  keyaki: (g, w, h, r) => { g.fillStyle = '#6f6b64'; g.fillRect(0, 0, w, h); K.noise(g, w, h, 22); for (let i = 0; i < 22; i++) { g.fillStyle = `rgba(${132 + r() * 30},${96 + r() * 20},${70},${.18 + r() * .2})`; g.beginPath(); g.ellipse(r() * w, r() * h, 4 + r() * 10, 6 + r() * 18, r(), 0, 7); g.fill(); } },   // smooth grey, orange flakes
  icho: (g, w, h, r) => { g.fillStyle = '#7a6d5e'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 5 + r() * 6) { g.fillStyle = `rgba(40,32,26,${.4 + r() * .3})`; g.fillRect(x, 0, 1.5 + r() * 2, h); } K.noise(g, w, h, 26); },   // corky furrows
  sakura: (g, w, h, r) => { g.fillStyle = '#5a4446'; g.fillRect(0, 0, w, h); K.noise(g, w, h, 14); for (let y = 0; y < h; y += 7 + r() * 10) { g.fillStyle = `rgba(150,120,110,${.35 + r() * .25})`; g.fillRect(0, y, w, 1.5 + r() * 2); } },   // lenticel bands
  kusunoki: (g, w, h, r) => { g.fillStyle = '#6d5a48'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 8 + r() * 6) for (let x = r() * 8; x < w; x += 8 + r() * 8) { g.fillStyle = `rgba(36,28,22,${.35 + r() * .35})`; g.fillRect(x, y, 1.2 + r(), 6 + r() * 6); if (r() < .6) g.fillRect(x, y, 6 + r() * 6, 1.1); } K.noise(g, w, h, 20); },   // rectangular checks
  zoki: (g, w, h, r) => { g.fillStyle = '#6f6c66'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 4 + r() * 8) { g.strokeStyle = `rgba(34,32,30,${.35 + r() * .3})`; g.lineWidth = 1 + r() * 2; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y < h; y += 16) g.lineTo(x + (r() - .5) * 5, y); g.stroke(); } K.noise(g, w, h, 22); },   // grey furrows
  sapling: (g, w, h) => { g.fillStyle = '#7d7a62'; g.fillRect(0, 0, w, h); K.noise(g, w, h, 14); },
};
// far crowns: a tileable brightness pattern of small leaf clumps (linear data, mean ~.6), sampled triplanar in world space
let farTex = null;
export function farLeafTex(lite) {
  if (farTex) return farTex;
  const r = K.rng(777);
  farTex = K.canvasTex(lite ? 64 : 128, lite ? 64 : 128, (g, w, h) => {
    g.fillStyle = '#7a7a7a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < w * 5; i++) {
      const x = r() * w, y = r() * h, L = w * (.02 + r() * .03), v = 70 + r() * 185 | 0;
      for (const [ox, oy] of [[0, 0], [-w, 0], [w, 0], [0, -h], [0, h]]) { g.fillStyle = `rgb(${v},${v},${v})`; g.beginPath(); g.ellipse(x + ox, y + oy, L, L * .55, r() * 3.14, 0, 6.283); g.fill(); }
    }
  }, { srgb: false, repeat: true });
  return farTex;
}
const barkCache = {};
export function barkTex(name, lite) {
  if (barkCache[name]) return barkCache[name];
  const r = K.rng(4242 + name.length * 31), draw = BARK[name] || BARK.zoki;
  const map = K.canvasTex(lite ? 64 : 128, lite ? 128 : 256, (g, w, h) => draw(g, w, h, r), { repeat: true });
  return (barkCache[name] = { map, normal: lite ? null : K.normalFrom(map, 2.5) });
}
