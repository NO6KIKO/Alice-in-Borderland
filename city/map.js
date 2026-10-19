/* World plan (metres, +x east, +z south). The night compound sits at the origin, in the port at the
   south-east corner of the city; the bay wraps the east and south coasts, as in the overview map (P2).
   The city is compressed (~2.9 × 1.7 km) so every district stays reachable on foot or by fast travel. */

export const WATER_Y = -2.2;

// land outline (clockwise). Everything outside is bay.
export const COAST = [
  [-1650, -1150], [230, -1150], [270, -760], [330, -420], [330, 330], [-120, 330], [-330, 360], [-520, 420], [-1650, 420],
];

// district footprints: filler buildings and street trees stay out of these rectangles
// { id, name, suit, x, z, w, d } — w along x, d along z, centred on (x, z)
export const DISTRICTS = [
  { id: 'compound', name: '夜间场地 · 码头试炼场', suit: '♠', x: 0, z: 10, w: 150, d: 150 },
  { id: 'port', name: '集装箱码头', suit: '♠', x: 210, z: 175, w: 240, d: 300 },
  { id: 'arena', name: '黑色仓库 · 深坑大厅', suit: '♣', x: 500, z: -150, w: 300, d: 230, water: true },
  { id: 'prison', name: '监狱', suit: '♣', x: -270, z: 215, w: 190, d: 160 },
  { id: 'tokyotower', name: '东京塔 · 增上寺 · 芝公园', suit: '♠', x: -510, z: 30, w: 280, d: 300 },
  { id: 'palace', name: '皇居 · 护城河', suit: '', x: -760, z: -300, w: 400, d: 330 },
  { id: 'diamond', name: '方块 K · 审判之塔', suit: '♦', x: -330, z: -400, w: 110, d: 110 },
  { id: 'bulb', name: '方块 4 · 电灯泡（地下雨水调节池）', suit: '♦', x: -407, z: -436, w: 40, d: 88 },
  { id: 'clubs', name: '梅花大厦', suit: '♣', x: -600, z: -780, w: 140, d: 140 },
  { id: 'hearts', name: '红心 Q · 屋顶庭园', suit: '♥', x: -1160, z: -300, w: 130, d: 110 },
  { id: 'shibuya', name: '涩谷十字路口', suit: '♦', x: -980, z: 190, w: 260, d: 230 },
  { id: 'fire', name: '燃烧街区', suit: '♠', x: -1380, z: -930, w: 300, d: 260 },
];

// street grid
export const BLOCK = 110, ROAD_W = 16;
export const GRID_X0 = -1650, GRID_Z0 = -1150;

export function inDistrict(x, z, pad = 0) {
  for (const d of DISTRICTS) if (Math.abs(x - d.x) < d.w / 2 + pad && Math.abs(z - d.z) < d.d / 2 + pad) return d;
  return null;
}
export function onLand(x, z) {   // point-in-polygon on COAST
  let inside = false;
  for (let i = 0, j = COAST.length - 1; i < COAST.length; j = i++) {
    const [xi, zi] = COAST[i], [xj, zj] = COAST[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
// existing elevated expressways (built in main.js) — keep filler out from under them
export const EXPRESS = [
  { x1: -320, z1: -88, x2: 320, z2: -88, w: 34 },
  { x1: -100, z1: -88, x2: -100, z2: 260, w: 34 },
  { x1: -100, z1: -700, x2: -100, z2: -88, w: 34 },   // city/index.js: north spur
  { x1: -500, z1: -700, x2: 300, z2: -700, w: 34 },   // → Rainbow Bridge
];
export const BRIDGE = { x1: 300, x2: 1120, z: -700, y: 27, towers: [500, 920] };
export const ISLAND = { x0: 1120, x1: 1480, z0: -900, z1: -480 };
export function underExpress(x, z, pad = 0) {
  for (const e of EXPRESS) {
    const dx = e.x2 - e.x1, dz = e.z2 - e.z1, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L;
    const t = (x - e.x1) * ux + (z - e.z1) * uz, n = Math.abs(-(x - e.x1) * uz + (z - e.z1) * ux);
    if (t > -pad && t < L + pad && n < e.w / 2 + pad) return true;
  }
  return false;
}
