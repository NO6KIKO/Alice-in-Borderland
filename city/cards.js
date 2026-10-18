// Worn playing-card textures drawn on canvas (murals, airship banners, signage).
// Court cards use the paintings in cards/<rank><suit>.webp when present; everything else is generated.
import * as THREE from 'three';

const SUITS = { S: ['♠', '#16181c'], H: ['♥', '#b3202f'], D: ['♦', '#b3202f'], C: ['♣', '#16181c'] };
const cache = new Map();

function grime(g, w, h) {
  for (let i = 0; i < 260; i++) {
    g.fillStyle = `rgba(${90 + Math.random() * 60},${60 + Math.random() * 30},${30},${Math.random() * .12})`;
    g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 2 + Math.random() * 30, 2 + Math.random() * 18, Math.random() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 30, 1 + Math.random() * 3); }
}

// rank: 'A','2'..'10','J','Q','K'; suit: 'S','H','D','C'
export function cardTexture(rank, suit) {
  const key = rank + suit;
  if (cache.has(key)) return cache.get(key);
  const w = 512, h = 768, c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'), [sym, col] = SUITS[suit];
  g.fillStyle = '#ece4d3'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#2a2622'; g.lineWidth = 10; g.strokeRect(14, 14, w - 28, h - 28);
  g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle';
  const corner = (x, y, rot) => { g.save(); g.translate(x, y); g.rotate(rot); g.font = 'bold 84px Georgia,serif'; g.fillText(rank, 0, 0); g.font = '70px serif'; g.fillText(sym, 0, 78); g.restore(); };
  corner(70, 80, 0); corner(w - 70, h - 80, Math.PI);
  if ('JQK'.includes(rank)) {
    // court card: framed panel with a big suit + crown silhouette
    g.strokeStyle = col; g.lineWidth = 6; g.strokeRect(120, 150, w - 240, h - 300);
    g.fillStyle = col; g.globalAlpha = .9;
    g.beginPath(); const cx = w / 2, cy = 300; g.moveTo(cx - 90, cy + 40); g.lineTo(cx - 90, cy - 30); g.lineTo(cx - 45, cy + 5); g.lineTo(cx, cy - 55); g.lineTo(cx + 45, cy + 5); g.lineTo(cx + 90, cy - 30); g.lineTo(cx + 90, cy + 40); g.closePath(); g.fill();
    g.font = '230px serif'; g.fillText(sym, w / 2, 480); g.globalAlpha = 1;
    g.font = 'bold 120px Georgia,serif'; g.fillStyle = '#c9a440'; g.fillText(rank, w / 2, 600);
  } else {
    g.font = (rank === 'A' ? 330 : 200) + 'px serif'; g.fillText(sym, w / 2, h / 2);
  }
  grime(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  cache.set(key, t); return t;
}

// painted card art: generated stand-in until the image loads, then the material's maps are swapped
// cards/<rank><suit>.webp (e.g. cards/JS.webp) — any court card with a file there uses the painting
const PAINTED = Object.fromEntries(['J', 'Q', 'K'].flatMap((r) => ['S', 'H', 'D', 'C'].map((s) => [r + s, `./cards/${r}${s}.webp`])));
const matCache = new Map();
// self-lit-ish card material: readable by day, softly glowing at night (night factor set by setCardGlow)
export function cardMaterial(rank, suit) {
  const key = rank + suit; if (matCache.has(key)) return matCache.get(key);
  const t = cardTexture(rank, suit);
  const m = new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: .05, roughness: .7, side: THREE.DoubleSide, alphaTest: .5 });
  if (PAINTED[key]) {   // try .webp, .png, .jpg; no file → keep generated art
    const exts = ['webp', 'png', 'jpg'], base = PAINTED[key].replace(/\.webp$/, '');
    const tryLoad = (i) => i < exts.length && new THREE.TextureLoader().load(`${base}.${exts[i]}`, (p) => { p.colorSpace = THREE.SRGBColorSpace; p.anisotropy = 8; m.map = m.emissiveMap = p; m.needsUpdate = true; }, undefined, () => tryLoad(i + 1));
    tryLoad(0);
  }
  matCache.set(key, m); return m;
}
export const queenOfHearts = () => cardMaterial('Q', 'H').map;
export function setCardGlow(v) { for (const m of matCache.values()) m.emissiveIntensity = v; }
