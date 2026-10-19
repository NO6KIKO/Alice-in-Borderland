// Tree geometry, generated once per species variant at load.
// Skeleton: a trunk curve (quadratic lean plus a seeded wobble), scaffold limbs fanning out of the fork and side
// branches, thinned by the pipe rule (r^2.3 is conserved at each split). Wood is meshed as tubes with bark UVs, baked
// ground darkening / moss in the vertex colour and a few root spurs where the trunk meets the ground.
// Foliage: twig cards scattered over ellipsoid lobes at the branch tips. The lobes are blended into one smooth
// distance field; its gradient gives the card normals (so a crown shades like one soft mass) and its depth gives each
// vertex an "openness" (1 on the outside, 0 deep inside) that the shader uses for darkening and light through leaves.
// Every variant comes in a near and a cheaper mid version; buildBlob() is the shared far crown.
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import * as K from '../kit.js';
import { TILE, tileUV } from './treetex.js';

// H height (m), W crown width / H, r0 trunk radius at the ground, fork height range, growth form, leaf tiles,
// card count and size (m), ys lobe squash, moss amount on the bark
export const SPECIES = {
  keyaki: { H: 12, W: .95, r0: .3, fork: [2.6, 3.2], form: 'vase', tiles: ['keyaki', 'keyakiB'], cards: 190, card: 2, ys: .82, moss: .25, bark: 'keyaki' },
  icho: { H: 11, W: .42, r0: .26, fork: [1.8, 2.4], form: 'column', tiles: ['icho'], cards: 165, card: 1.6, ys: 1, moss: .15, bark: 'icho' },
  sakura: { H: 7.5, W: 1.5, r0: .28, fork: [1.6, 2.2], form: 'spread', tiles: ['sakura'], cards: 175, card: 1.9, ys: .62, moss: .55, bark: 'sakura' },
  kusunoki: { H: 13, W: 1.2, r0: .45, fork: [2.8, 3.6], form: 'dome', tiles: ['kusunoki'], cards: 215, card: 2.2, ys: .8, moss: .35, bark: 'kusunoki' },
  zoki: { H: 10.5, W: .85, r0: .28, fork: [2, 3], form: 'round', tiles: ['oak', 'maple'], cards: 180, card: 1.9, ys: .9, moss: .4, bark: 'zoki' },
  sapling: { H: 4, W: .7, r0: .07, fork: [.8, 1.4], form: 'sapling', tiles: ['sapling'], cards: 24, card: 1.5, ys: .8, moss: 0, bark: 'sapling' },
};

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }, cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const lerp = (a, b, t) => a + (b - a) * t, sat = (x) => Math.max(0, Math.min(1, x)), smooth = (a, b, x) => { const t = sat((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const UP = [0, 1, 0], PIPE = 1 / 2.3;
const polar = (elev, az) => [Math.sin(elev) * Math.cos(az), Math.cos(elev), Math.sin(elev) * Math.sin(az)];
// 1D value noise (seeded lattice, smooth interpolation) for trunk wobble
const vnoise1 = (r) => { const L = Array.from({ length: 16 }, () => r() * 2 - 1); return (x) => { const i = Math.floor(x), f = x - i, a = L[((i % 16) + 16) % 16], b = L[(((i + 1) % 16) + 16) % 16]; return lerp(a, b, f * f * (3 - 2 * f)); }; };

/* ── skeleton ── */
// a limb from `start`: it leaves along `from` (its parent), turns toward `dir`, and curls up (bend > 0) or down
function grow(start, from, dir, L, n, bend) {
  const pts = [start]; let p = start;
  for (let i = 1; i <= n; i++) { const t = i / n; let d = norm(add(mul(from, Math.max(0, 1 - t * 2.4)), mul(dir, Math.min(1, t * 2.4)))); d = norm(add(d, [0, bend * t, 0])); p = add(p, mul(d, L / n)); pts.push(p); }
  return pts;
}
// arc-length sampler over a polyline: point and unit direction at fraction s of its length
function along(pts) {
  const acc = [0]; for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + len(sub(pts[i], pts[i - 1])));
  const total = acc[acc.length - 1] || 1;
  const seg = (s) => { const x = s * total; let k = 1; while (k < acc.length - 1 && acc[k] < x) k++; return [k, (x - acc[k - 1]) / ((acc[k] - acc[k - 1]) || 1)]; };
  return { pos: (s) => { const [k, f] = seg(s); return add(pts[k - 1], mul(sub(pts[k], pts[k - 1]), f)); }, dir: (s) => { const [k] = seg(s); return norm(sub(pts[k], pts[k - 1])); } };
}
function skeleton(sp, r) {
  const H = sp.H, W = sp.W * H, fork = lerp(sp.fork[0], sp.fork[1], r()), bury = sp.r0 * 1.1, B = [], lobes = [];
  const la = r() * 6.283, lean = (r() - .5) * .1, wob = vnoise1(r), wobA = r() * 6.283;
  // trunk: quadratic curve from the buried base to `top`, leaning, with a wobble that vanishes at both ends
  const trunk = (top, n) => {
    const lx = Math.cos(la) * lean * top, lz = Math.sin(la) * lean * top, pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, u = 1 - t, y = -bury + (top + bury) * t, w = wob(t * 3.3) * .045 * top * Math.sin(Math.PI * t);
      pts.push([2 * u * t * lx * .15 + t * t * lx + Math.cos(wobA) * w, y, 2 * u * t * lz * .15 + t * t * lz + Math.sin(wobA) * w]);
    }
    return pts;
  };
  const rFork = sp.r0 * .74, trunkR = (pts, top) => pts.map((p) => rFork + (sp.r0 - rFork) * Math.pow(1 - sat((p[1] + bury) / (top + bury)), 1.6));
  const lobe = (c, rad) => lobes.push({ c, r: Math.max(.45, rad) });
  const limb = (from, start, dir, L, rad, lvl, bend, n = 5) => { const pts = grow(start, from, dir, L, n, bend); B.push({ pts, rad: pts.map((_, i) => rad * lerp(1, .3, i / n)), lvl }); return pts; };
  const scaffold = (n, e0, e1, Lf, bend, subs, lobeK, top) => {   // n limbs fanning out of the fork
    const t = trunk(fork, 7); B.push({ pts: t, rad: trunkR(t, fork), lvl: 0 });
    const tt = t[t.length - 1], rl = rFork * Math.pow(n, -PIPE);
    for (let i = 0; i < n; i++) {
      const az = (i + r() * .6) / n * 6.283, e = lerp(e0, e1, r()) * Math.PI / 180, L = Lf * (.85 + r() * .3);
      const pts = limb(UP, tt, polar(e, az), L, rl, 1, bend), path = along(pts);
      for (let k = 0; k < subs; k++) {   // side branches off the outer half, splaying sideways
        const s = .45 + .4 * (k + r() * .5) / subs, sd = k % 2 ? 1 : -1, d0 = path.dir(s);
        const side = norm(add(d0, mul(norm([Math.cos(az + sd * 1.2), .3, Math.sin(az + sd * 1.2)]), .9))), sl = L * (.38 + r() * .14);
        const sb = limb(d0, path.pos(s), side, sl, rl * lerp(1, .3, s) * Math.pow(1 / (subs + 1), PIPE), 2, bend * .5, 3);
        lobe(sb[sb.length - 1], sl * lobeK);
      }
      lobe(pts[pts.length - 1], L * lobeK * 1.1);
      if (L > 2.5) lobe(path.pos(.6), L * lobeK * .8);
    }
    if (top) lobe([0, H - top, 0], top);
  };
  if (sp.form === 'vase') scaffold(5 + Math.floor(r() * 3), 25, 40, (H - fork) * .55, .25, 3, .6, 0);
  else if (sp.form === 'dome') scaffold(4 + Math.floor(r() * 3), 35, 55, W * .38, .1, 3, .62, W * .3);
  else if (sp.form === 'round') scaffold(4 + Math.floor(r() * 3), 30, 50, W * .38, .15, 3, .64, W * .28);
  else if (sp.form === 'spread') scaffold(3 + Math.floor(r() * 3), 55, 75, W * .42, -.35, 3, .5, 0);
  else if (sp.form === 'column') {   // ginkgo: the leader runs to the top, short laterals stack up it
    const top = H * .95, t = trunk(top, 12), tr = t.map((p) => sp.r0 * lerp(1, .22, sat((p[1] + bury) / (top + bury))));
    B.push({ pts: t, rad: tr, lvl: 0 });
    const path = along(t); let k = 0;
    for (let y = fork; y < H * .9; y += .8 + r() * .3, k++) {
      const f = (y - fork) / (H * .9 - fork), az = k * 2.4 + r() * .4, L = W * .55 * (1 - .55 * f) * (.8 + r() * .4), e = (55 + r() * 15) * Math.PI / 180;
      const pts = limb(UP, path.pos((y + bury) / (top + bury)), polar(e, az), L, sp.r0 * .3 * (1 - .5 * f), 1, .2, 3);
      lobe(pts[pts.length - 1], .55 * L + .6);
    }
    lobe([0, H * .93, 0], W * .24);
  } else {   // sapling: one to three thin stems from the ground, a tuft on each
    const n = 1 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const az = r() * 6.283, L = sp.H * (.7 + r() * .3), pts = limb(UP, [Math.cos(az) * .15 * i, -.2, Math.sin(az) * .15 * i], polar(.12 + r() * .25, az), L, sp.r0 * (1 - i * .25), 1, .05, 5);
      lobe(pts[pts.length - 1], .75 + r() * .3); lobe(along(pts).pos(.75), .5);
    }
  }
  return { B, lobes, fork, bury };
}

/* ── geometry builder ── */
class GB {
  constructor(crown) { this.p = []; this.n = []; this.uv = []; this.c = []; this.k = crown ? [] : null; this.i = []; }
  v(p, n, u, v, c, k) { this.p.push(p[0], p[1], p[2]); this.n.push(n[0], n[1], n[2]); this.uv.push(u, v); this.c.push(c[0], c[1], c[2]); if (this.k) this.k.push(k[0], k[1]); return this.p.length / 3 - 1; }
  geo() {
    const g = new THREE.BufferGeometry(), nv = this.p.length / 3;
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    if (this.k) g.setAttribute('aCrown', new THREE.Float32BufferAttribute(this.k, 2));
    g.setIndex(nv > 65535 ? new THREE.Uint32BufferAttribute(this.i, 1) : new THREE.Uint16BufferAttribute(this.i, 1));
    g.computeBoundingSphere(); return g;
  }
}
// a tube along a polyline (frames carried along by rotating the previous one), bark tiles of 0.7 m around × 1.4 m
// up; vertex colour = ground darkening × moss tint; `spurs` swell the base into roots
function tube(G, pts, rads, sides, { spurs = null, moss = 0 }) {
  const m = pts.length, T = pts.map((_, i) => norm(sub(pts[Math.min(m - 1, i + 1)], pts[Math.max(0, i - 1)])));
  const N = [norm(cross(T[0], Math.abs(T[0][1]) < .9 ? UP : [1, 0, 0]))];
  for (let i = 1; i < m; i++) { const ax = cross(T[i - 1], T[i]), s = len(ax); let n = N[i - 1]; if (s > 1e-5) { const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(...norm(ax)), Math.asin(Math.min(1, s))), v = new THREE.Vector3(...n).applyQuaternion(q); n = [v.x, v.y, v.z]; } N.push(norm(sub(n, mul(T[i], dot(n, T[i]))))); }
  const meanR = rads.reduce((s, x) => s + x, 0) / m, wraps = Math.max(1, Math.ceil(6.283 * meanR / .7)), base = G.p.length / 3;
  let arc = 0;
  for (let i = 0; i < m; i++) {
    if (i) arc += len(sub(pts[i], pts[i - 1]));
    const Bn = cross(T[i], N[i]), y = pts[i][1];
    for (let k = 0; k <= sides; k++) {
      const th = k / sides * 6.283, d = add(mul(N[i], Math.cos(th)), mul(Bn, Math.sin(th)));
      let rad = rads[i];
      if (spurs) {   // root spurs: bumps around the circumference that die out a little above the ground
        let bump = 0; for (const s of spurs) { let da = Math.abs(th - s.az) % 6.283; da = Math.min(da, 6.283 - da); bump += s.amp * Math.exp(-((da / s.w) ** 2)); }
        rad *= 1 + Math.exp(-((Math.max(0, y + .05) / spurs.h) ** 2)) * (.15 + bump);
      }
      const ao = .5 + .5 * smooth(-.4, 1.6, y), mo = moss * smooth(-.4, .5, d[1]) * (1 - smooth(1, 5, y));   // dark at grade; moss on upward faces near the ground
      G.v(add(pts[i], mul(d, rad)), d, k / sides * wraps, arc / 1.4, [ao * lerp(1, .7, mo), ao * lerp(1, 1.02, mo), ao * lerp(1, .55, mo)]);
    }
  }
  for (let i = 0; i < m - 1; i++) for (let k = 0; k < sides; k++) { const a = base + i * (sides + 1) + k, b = a + sides + 1; G.i.push(a, a + 1, b, a + 1, b + 1, b); }
}
// the lobes as one smooth field: per-lobe ellipsoid distance, blended with a soft minimum (blend radius kb)
function crownField(lobes, ys, kb = .9) {
  const f = (p) => { let s = 0; for (const l of lobes) { const q = sub(p, l.c); q[1] /= ys; const d = (len(q) - l.r) * Math.min(1, ys); s += Math.exp(-d / kb); } return -kb * Math.log(s || 1e-9); };
  const grad = (p) => { const e = .05; return norm([f(add(p, [e, 0, 0])) - f(sub(p, [e, 0, 0])), f(add(p, [0, e, 0])) - f(sub(p, [0, e, 0])), f(add(p, [0, 0, e])) - f(sub(p, [0, 0, e]))]); };
  return { f, grad };
}
// approximate surface area of a lobe (ellipsoid r, r·ys, r) — cards are shared out by it
const lobeArea = (l, ys) => { const a = l.r, b = l.r * ys, p = 1.6075; return 4 * Math.PI * Math.pow((Math.pow(a * b, p) * 2 + Math.pow(a * a, p)) / 3, 1 / p); };
// twig cards on the lobes: mostly near the surface, the spray pointing outward, blades tipped toward the sky
function crown(G, sp, lobes, info, count, sizeMul, outer, tiles, r) {
  const field = crownField(lobes, sp.ys), areas = lobes.map((l) => lobeArea(l, sp.ys)), tot = areas.reduce((s, a) => s + a, 0);
  lobes.forEach((lb, li) => {
    const n = Math.max(2, Math.round(count * areas[li] / tot));
    for (let j = 0; j < n; j++) {
      let d = norm([r() * 2 - 1, r() * 2 - 1, r() * 2 - 1]); if (d[1] < -.35 && r() < .65) d[1] = -d[1] * .5; d = norm(d);
      const depth = outer ? .78 + .22 * r() : .4 + .6 * Math.sqrt(r()), p = add(lb.c, [d[0] * lb.r * depth, d[1] * lb.r * depth * sp.ys, d[2] * lb.r * depth]);
      const size = sp.card * sizeMul * (.8 + .4 * r()) * Math.min(1, .55 + lb.r * .22);
      let s = norm(add(d, [(r() - .5) * .7, (r() - .5) * .5, (r() - .5) * .7])); if (sp.form === 'spread' && d[1] < .25) s = norm(add(s, [0, -.5, 0]));   // cherry tips hang
      let nn = norm(cross(s, norm([r() - .5, r() - .5, r() - .5]))); nn = norm(add(nn, [0, nn[1] < 0 ? -.55 : .55, 0])); nn = norm(sub(nn, mul(s, dot(nn, s))));
      const ua = norm(cross(nn, s)), b0 = sub(p, mul(s, size * .3)), [u0, v0, u1, v1] = tileUV(TILE[tiles[Math.floor(r() * tiles.length)]]);
      const keep = r() * .3, sway = .4 + .6 * r(), base = G.p.length / 3;   // how much of the card's own facing survives; flutter weight
      for (const [u, v] of [[-.5, 0], [.5, 0], [.5, 1], [-.5, 1]]) {
        const q = add(b0, add(mul(ua, u * size), mul(s, v * size))), g = field.grad(q), cn = dot(nn, g) < 0 ? mul(nn, -1) : nn;
        const nrm = norm(add(mul(g, 1 - keep), mul(cn, keep)));
        const open = smooth(-1.6, .1, field.f(q)) * (.75 + .25 * smooth(info.y0, info.y1, q[1])) * lerp(.8, 1, smooth(-.6, .2, g[1]));
        const occ = .32 + .68 * smooth(0, 1, open);
        G.v(q, nrm, lerp(u0, u1, u + .5), lerp(v0, v1, v), [occ, occ, occ * .96], [open, sway]);
      }
      G.i.push(base, base + 2, base + 1, base, base + 3, base + 2);
    }
  });
}

// one species variant: { near: {wood, leaf}, mid: {wood, leaf}, crown: {c, rx, ry, rz}, fork, r0 }
export function buildVariant(name, vi, lite) {
  const sp = SPECIES[name], r = K.rng(9000 + Object.keys(SPECIES).indexOf(name) * 131 + vi * 17), sk = skeleton(sp, r);
  const tiles = name === 'zoki' ? [vi ? 'maple' : 'oak'] : sp.tiles;
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const l of sk.lobes) { x0 = Math.min(x0, l.c[0] - l.r); x1 = Math.max(x1, l.c[0] + l.r); z0 = Math.min(z0, l.c[2] - l.r); z1 = Math.max(z1, l.c[2] + l.r); y0 = Math.min(y0, l.c[1] - l.r * sp.ys); y1 = Math.max(y1, l.c[1] + l.r * sp.ys); }
  const info = { y0, y1 }, moss = sp.moss * (.6 + r() * .8), seedL = Math.floor(r() * 1e9);
  const spurs = name === 'sapling' ? null : Object.assign(Array.from({ length: 3 + Math.floor(r() * 4) }, () => ({ az: r() * 6.283, amp: .5 + .7 * r(), w: .28 + .2 * r() })), { h: .45 + 1.1 * sp.r0 });
  const sides = (lvl, mid) => mid ? [lite ? 5 : 6, lite ? 3 : 4, 0][lvl] : lite ? [7, 4, 3][lvl] : [9, 6, 4][lvl];
  const out = { crown: { c: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], rx: (x1 - x0) / 2, rz: (z1 - z0) / 2, ry: (y1 - y0) / 2 }, fork: sk.fork, r0: sp.r0 };
  for (const tier of ['near', 'mid']) {
    const mid = tier === 'mid', W = new GB(false), L = new GB(true);
    for (const b of sk.B) { const n = sides(b.lvl, mid); if (n) tube(W, b.pts, b.rad, n, { spurs: b.lvl === 0 ? spurs : null, moss }); }
    crown(L, sp, sk.lobes, info, mid ? Math.round(sp.cards * .4) : sp.cards, mid ? 1.6 : 1, mid, tiles, K.rng(seedL + (mid ? 1 : 0)));
    out[tier] = { wood: W.geo(), leaf: L.geo() };
  }
  return out;
}
// the far crown: one shared lumpy ellipsoid (radius ~1), welded for smooth shading, shaded darker toward its base
export function buildBlob(lite) {
  let g = new THREE.IcosahedronGeometry(1, lite ? 0 : 1); g.deleteAttribute('normal'); g.deleteAttribute('uv'); g = mergeVertices(g);
  const p = g.attributes.position, lump = [];
  let ymin = Infinity, ymax = -Infinity;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), n = Math.sin(x * 4.3 + z * 3.1 + 1.7) * Math.cos(y * 3.7 - x * 2.2), k = 1 + .18 * n + .06 * Math.sin(x * 9 + y * 7 + z * 11);
    p.setXYZ(i, x * k, y * k, z * k); lump.push(n); ymin = Math.min(ymin, y * k); ymax = Math.max(ymax, y * k);
  }
  const col = [];
  for (let i = 0; i < p.count; i++) { const t = (p.getY(i) - ymin) / (ymax - ymin), a = (.38 + .55 * t * t) * (.85 + .15 * lump[i]); col.push(a, a, a * .95); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
}
