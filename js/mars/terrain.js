// MOONKEEPER — Mars: the shape of the ground around the outpost, and where everything stands. Pure logic.
//
// What is real and what is made for play. NASA's best whole-planet elevation map (MOLA) has one value every 463 m,
// so it can give the region and the skyline but not the ground under your boots. The playable area (1.6 km across)
// therefore takes its overall tilt from MOLA and its detail from what orbiters and landers have seen on plains like
// this one: gentle rolls, small craters, wind ripples, an old lava-flow edge, and cracked "polygon" ground, which
// forms where ice lies just under the soil.
import { SITE } from './mola.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const hash = (x, y) => { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const vnoise = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), u = x - xi, v = y - yi, a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v);
  return (hash(xi, yi) * (1 - a) + hash(xi + 1, yi) * a) * (1 - b) + (hash(xi, yi + 1) * (1 - a) + hash(xi + 1, yi + 1) * a) * b; };
export const fbm = (x, y, oct = 4) => { let s = 0, amp = 0.5, f = 1; for (let i = 0; i < oct; i++) { s += amp * (vnoise(x * f + i * 17.3, y * f - i * 9.1) * 2 - 1); amp *= 0.5; f *= 2.03; } return s; };

export const PLAY_R = 790;        // metres from the middle of the map to its edge (the same as the Moon's map)
// x runs east, z runs south (north is -z), like the Moon map.

// ---- the outpost: where each building stands (centre, and the circles you cannot walk through) ----
export const BUILDINGS = [
  { id: 'cmd',         x: 0,    z: 0,    r: 7.5,  door: [7, 6.5] },
  { id: 'airlock',     x: 0,    z: 16,   r: 3.4,  door: [0, 21.5] },
  { id: 'living',      x: -24,  z: -3,   r: 6,    door: [-24, 5.5], long: [9, 0] },
  { id: 'medical',     x: -24,  z: -21,  r: 4.6,  door: [-17.5, -21] },
  { id: 'lifesupport', x: 22,   z: -5,   r: 5,    door: [22, 3], long: [6, 0] },
  { id: 'greenhouse',  x: 26,   z: -36,  r: 5.2,  door: [18.5, -36], long: [0, 13] },
  { id: 'lab',         x: -2,   z: -27,  r: 5.4,  door: [5.6, -27] },
  { id: 'thermal',     x: 46,   z: -3,   r: 5,    door: [46, 5] },
  { id: 'water',       x: 52,   z: 30,   r: 5.5,  door: [44.5, 30] },
  { id: 'isru',        x: 78,   z: -12,  r: 6.5,  door: [78, -2.5] },
  { id: 'storage',     x: -50,  z: 24,   r: 6.5,  door: [-41, 24] },
  { id: 'garage',      x: -34,  z: 52,   r: 0,    door: [-34, 44] },
  { id: 'comms',       x: -60,  z: -34,  r: 3.2,  door: [-60, -28] },
  { id: 'power',       x: 10,   z: 62,   r: 4.2,  door: [10, 56] },
];
export const B = Object.fromEntries(BUILDINGS.map((b) => [b.id, b]));
export const SOLAR = { x0: -32, x1: 52, z0: 76, z1: 132, rows: 5, cols: 7 };          // the solar field
export const REACTOR = { x: 168, z: 74 };                                               // behind a bank of soil, well away from the crew
export const PAD = { x: -160, z: 118, r: 20 };                                          // where the lander stands
export const ROVER_PAD = { x: -34, z: 62 };
export const DRILL = { x: 66, z: 40 };                                                  // the ice well's rig
export const ICE_CRATER = { x: 270, z: 150, r: 15, depth: 3.6 };                        // a young crater that dug down to the ice
export const OLD_CRATER = { x: -340, z: -270, r: 95, depth: 9 };                        // an old, softened crater
export const TERRACE_CRATER = { x: -430, z: 330, r: 62, depth: 10, terrace: true };          // a crater with a step in its wall: a sign of layers (soil over ice)
export const SHIELD = { x: -405, z: -30 };                                             // where the lander's heat shield, backshell and parachute came down
export const SEIS = { x: -255, z: -75 };                                               // the seismometer, well away from footsteps and machines
export const SPAWN = { x: -6, z: 30 };

// small craters, the same every time
const CRATERS = [ICE_CRATER, OLD_CRATER, TERRACE_CRATER];
for (let i = 0; CRATERS.length < 30 && i < 400; i++) { const a = hash(i, 91) * 6.283, d = 150 + hash(i, 17) * 600, x = Math.cos(a) * d, z = Math.sin(a) * d, r = 3 + Math.pow(hash(i, 5), 2.2) * 22;
  if (CRATERS.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + r + 14)) continue; if (Math.hypot(x - PAD.x, z - PAD.z) < 60 || (x > -60 && x < 80 && z > 40 && z < 150) || Math.hypot(x - REACTOR.x, z - REACTOR.z) < 40 || Math.hypot(x - SHIELD.x, z - SHIELD.z) < 30 + r || Math.hypot(x - SEIS.x, z - SEIS.z) < 22 + r) continue;
  CRATERS.push({ x, z, r, depth: r * (0.16 + hash(i, 3) * 0.08) }); }
export { CRATERS };
// Craters far out on the plain, beyond where you can walk: they only shape the distance. The same every time.
export const FAR_CRATERS = []; for (let i = 0; FAR_CRATERS.length < 16 && i < 200; i++) { const a = hash(i, 301) * 6.283, d = 1050 + hash(i, 302) * 3600, r = 70 + Math.pow(hash(i, 303), 2) * 330, x = Math.cos(a) * d, z = Math.sin(a) * d;
  if (d - r * 2.4 < 860 || FAR_CRATERS.some((c) => Math.hypot(c.x - x, c.z - z) < (c.r + r) * 2)) continue; FAR_CRATERS.push({ x, z, r, depth: r * (0.09 + hash(i, 304) * 0.05) }); }

// places levelled for building: [x, z, radius of the flat part, width of the ramp round it]
const FLATS = [[8, 4, 96, 46], [10, 104, 62, 30], [PAD.x, PAD.z, 30, 26], [REACTOR.x, REACTOR.z, 16, 18], [DRILL.x, DRILL.z, 10, 14]];
const tilt = (x, z) => SITE.slopeE * x + SITE.slopeN * -z;                               // the real slope of the plain here, from MOLA
const FLAT_Y = FLATS.map(([x, z]) => tilt(x, z));
// the edge of an old lava flow: the ground to the south-east stands about 7 m higher
const flowEdge = (x, z) => x * 0.42 + z * 0.9 - 455 - 46 * fbm(x / 210, z / 210, 3);
export const duneMask = (x, z) => sstep(210, 330, x) * sstep(-120, -230, z) * (0.55 + 0.45 * sstep(-0.2, 0.3, fbm(x / 160, z / 160, 2)));

// The ground's height (m) at any point, straight from the recipe. Slow: the game looks it up in a grid made from this.
export function rawHeight(x, z) {
  let h = tilt(x, z) + 5.5 * fbm(x / 260, z / 260, 4) + 1.5 * fbm(x / 64 + 40, z / 64, 3) + 0.3 * fbm(x / 13, z / 13 + 7, 2);
  h += 7 * sstep(-9, 9, flowEdge(x, z));
  const dm = duneMask(x, z); if (dm > 0.001) { const w = (x * 0.94 + z * 0.34) / 17 + 1.6 * fbm(x / 55, z / 55, 2), r = 1 - Math.abs(Math.sin(w)); h += dm * (1.5 * r * r + 0.5 * fbm(x / 30, z / 30, 2)); }   // sharp-crested ripples, across the wind
  for (const c of CRATERS) { const d = Math.hypot(x - c.x, z - c.z); if (d > c.r * 2.4) continue; const q = d / c.r, soft = c === OLD_CRATER ? 0.55 : 1;
    const bowl = c.terrace ? (q < 0.42 ? 1 - 0.22 * (q / 0.42) ** 2 : q < 0.52 ? 0.78 - 0.38 * ((q - 0.42) / 0.1) : q < 0.72 ? 0.4 - 0.04 * ((q - 0.52) / 0.2) : 0.36 * (1 - ((q - 0.72) / 0.28) ** 2)) : 1 - q * q;   // a terraced crater has a bench half-way up its wall
    h += q < 1 ? -c.depth * bowl * (0.8 + 0.2 * soft) + c.depth * 0.22 * soft * q * q : c.depth * 0.22 * soft * Math.exp(-(q - 1) * 3.2); }
  const far = Math.hypot(x, z); if (far > 860) for (const c of FAR_CRATERS) { const d = Math.hypot(x - c.x, z - c.z); if (d > c.r * 2.4) continue; const q = d / c.r; h += (q < 1 ? -c.depth * (1 - q * q) + c.depth * 0.3 * q * q : c.depth * 0.3 * Math.exp(-(q - 1) * 3)) * sstep(860, 1000, far); }                                              // a bowl, a raised rim, and a blanket of thrown-out soil
  let w = 0, y = 0; FLATS.forEach(([fx, fz, r, ramp], i) => { const k = 1 - sstep(r, r + ramp, Math.hypot(x - fx, z - fz)); if (k > w) { w = k; y = FLAT_Y[i]; } });
  return h * (1 - w) + y * w;
}

// ---- the grid the game uses: one height every 5 m across the playable area ----
export const GRID = { n: 321, size: 1600 };
let grid = null;
export function buildGrid() { if (grid) return grid; const { n, size } = GRID; grid = new Float32Array(n * n); for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) grid[j * n + i] = rawHeight((i / (n - 1) - 0.5) * size, (j / (n - 1) - 0.5) * size); return grid; }
export function heightAt(x, z) {
  const { n, size } = GRID, g = grid || buildGrid(), fx = (x / size + 0.5) * (n - 1), fz = (z / size + 0.5) * (n - 1);
  if (fx < 0 || fz < 0 || fx >= n - 1 || fz >= n - 1) return rawHeight(x, z);
  const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, k = j * n + i;
  return (g[k] * (1 - u) + g[k + 1] * u) * (1 - v) + (g[k + n] * (1 - u) + g[k + n + 1] * u) * v;
}
export const slopeAt = (x, z) => Math.hypot(heightAt(x + 2, z) - heightAt(x - 2, z), heightAt(x, z + 2) - heightAt(x, z - 2)) / 4;

// Rocks: where, how big, which of three shapes. The same field every time. Mostly fist- to football-sized, with a few boulders.
export function rockField(count = 4200) {
  const out = []; for (let i = 0; out.length < count && i < count * 3; i++) { const a = hash(i, 201) * 6.283, d = Math.sqrt(hash(i, 202)) * 760, x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (FLATS.some(([fx, fz, r]) => Math.hypot(x - fx, z - fz) < r + 6) || duneMask(x, z) > 0.5 || Math.hypot(x - SEIS.x, z - SEIS.z) < 7 || Math.hypot(x - SHIELD.x, z - SHIELD.z) < 5 || Math.hypot(x - SHIELD.x - 13, z - SHIELD.z + 9) < 5) continue;
    const near = CRATERS.some((c) => { const q = Math.hypot(x - c.x, z - c.z) / c.r; return q > 0.9 && q < 1.9; });                 // craters throw out blocks
    const hs = hash(i, 203), s = 0.1 + Math.pow(hs, near ? 3 : 6) * (near ? 1.5 : 0.9) + (hs > 0.985 ? ((hs - 0.985) / 0.015) * 1.2 : 0); out.push({ x, z, s, kind: i % 3, rot: hash(i, 204) * 6.283, tip: hash(i, 205) * 0.5 }); }
  return out;
}
// Circles the player and rover cannot pass through.
export function colliders() {
  const c = [];
  for (const b of BUILDINGS) { if (b.r) c.push({ x: b.x, z: b.z, r: b.r }); if (b.long) for (const s of [-1, 1]) c.push({ x: b.x + b.long[0] * s, z: b.z + b.long[1] * s, r: b.r * 0.9 }); }
  for (const s of [-1, 1]) c.push({ x: B.garage.x + s * 8.2, z: B.garage.z, r: 1.2 }, { x: B.garage.x + s * 8.2, z: B.garage.z - 4, r: 1.2 }, { x: B.garage.x + s * 8.2, z: B.garage.z + 4, r: 1.2 });   // the garage's side walls: drive straight through
  c.push({ x: DRILL.x, z: DRILL.z, r: 2.6 }, { x: REACTOR.x, z: REACTOR.z, r: 3 }, { x: PAD.x, z: PAD.z, r: 6.5 });
  c.push({ x: SHIELD.x, z: SHIELD.z, r: 2.6 }, { x: SHIELD.x + 13, z: SHIELD.z - 9, r: 2.2 }, { x: SEIS.x, z: SEIS.z, r: 1.1 }, { x: SEIS.x + 4.5, z: SEIS.z + 2, r: 0.9 });   // the heat shield, the backshell, the seismometer and its box
  for (let r = 0; r < SOLAR.rows; r++) for (let k = 0; k < SOLAR.cols; k++) { const [x, z] = panelAt(r, k); c.push({ x: x - 3, z, r: 1.5 }, { x: x + 3, z, r: 1.5 }); }
  for (const t of TUNNELS) { const n = Math.ceil(Math.hypot(t[2] - t[0], t[3] - t[1]) / 2.4); for (let i = 1; i < n; i++) c.push({ x: t[0] + ((t[2] - t[0]) * i) / n, z: t[1] + ((t[3] - t[1]) * i) / n, r: 1.5 }); }
  for (const rk of rockField()) if (rk.s > 1.05) c.push({ x: rk.x, z: rk.z, r: rk.s * 0.8 });
  return c;
}
export const panelAt = (row, col) => [SOLAR.x0 + 6 + ((SOLAR.x1 - SOLAR.x0 - 12) * col) / (SOLAR.cols - 1), SOLAR.z0 + 5 + ((SOLAR.z1 - SOLAR.z0 - 10) * row) / (SOLAR.rows - 1)];
// pressurised tunnels between the modules people live and work in: [x0, z0, x1, z1]
export const TUNNELS = [[0, 7, 0, 13], [-7, -1, -15.5, -2.5], [-24, -8.5, -24, -17], [7, -1.5, 14, -4], [22, -9.5, 24.5, -23.5], [-1, -7.5, -2, -21.5]];

// ---- inside the Command Habitat: one round room you can walk into ----
// Its floor is drawn far under the ground (y), so that nothing of the world outside shows while you are in it.
// door: the hatch on its south side. out: where you stand after leaving through the airlock.
export const ROOM = { x: B.cmd.x, z: B.cmd.z, y: -60, r: 7.2, door: [B.cmd.x, B.cmd.z + 6.3], out: [B.airlock.x, B.airlock.z + 8.6], table: 1.7 };
const ring = (deg, rad) => [ROOM.x + Math.cos((deg * Math.PI) / 180) * rad, ROOM.z + Math.sin((deg * Math.PI) / 180) * rad];   // 0° is east, 90° south, 270° north
export const ROOM_CONSOLES = [210, 240, 270, 300, 330].map((deg) => ({ deg, at: ring(deg, 6.2) }));
export const ROOM_SPOTS = { mateo: ring(240, 4.95), noor: [ROOM.x + 2.6, ROOM.z + 0.7], lena: [ROOM.x - 3.3, ROOM.z + 3.5], ladder: ring(180, 6.5), lockers: [ring(38, 6.45), ring(56, 6.45)], plant: ring(140, 6.3) };
// Circles you cannot walk through indoors: the table, the consoles, the ladder, the lockers, the plant.
export function roomColliders() {
  const c = [{ x: ROOM.x, z: ROOM.z, r: ROOM.table }];
  for (const k of ROOM_CONSOLES) c.push({ x: k.at[0], z: k.at[1], r: 1 });
  for (const p of [ROOM_SPOTS.ladder, ...ROOM_SPOTS.lockers, ROOM_SPOTS.plant]) c.push({ x: p[0], z: p[1], r: 0.7 });
  return c;
}
// Keeps a point inside the round room, a little back from its wall.
export function keepInRoom(p, pad = 0.55) { const dx = p.x - ROOM.x, dz = p.z - ROOM.z, d = Math.hypot(dx, dz), m = ROOM.r - pad; if (d > m) { p.x = ROOM.x + (dx / d) * m; p.z = ROOM.z + (dz / d) * m; } return p; }

// The way to walk (or drive) from (px,pz) to (tx,tz) without going through a building, a tunnel or a boulder.
// Returns corner points [[x,z], …], starting at the start and ending at the target. pad = how much room to leave (m).
// Only the first 200 m are planned round obstacles: the guide line on the ground is never drawn further than that.
export function routeAround(cols, px, pz, tx, tz, pad = 1.1) {
  const hit = (ax, az, bx, bz, extra = 0) => { const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1e-9; for (const c of cols) { if (!c.r) continue; const t = Math.max(0, Math.min(1, ((c.x - ax) * dx + (c.z - az) * dz) / l2)), R = c.r + pad + extra; if ((ax + dx * t - c.x) ** 2 + (az + dz * t - c.z) ** 2 < R * R) return true; } return false; };
  const D = Math.hypot(tx - px, tz - pz), far = D > 200, ex = far ? px + ((tx - px) * 200) / D : tx, ez = far ? pz + ((tz - pz) * 200) / D : tz, straight = [[px, pz], [tx, tz]];
  if (D < 0.5 || !hit(px, pz, ex, ez)) return straight;
  // a grid of 2 m squares round the two ends; a square is shut if a building stands on it
  const cell = 2, x0 = Math.min(px, ex) - 40, z0 = Math.min(pz, ez) - 40, W = Math.ceil((Math.abs(ex - px) + 80) / cell), H = Math.ceil((Math.abs(ez - pz) + 80) / cell), shut = new Uint8Array(W * H);
  for (const c of cols) { if (!c.r) continue; const R = c.r + pad, i0 = Math.max(0, Math.floor((c.x - R - x0) / cell)), i1 = Math.min(W - 1, Math.floor((c.x + R - x0) / cell)), j0 = Math.max(0, Math.floor((c.z - R - z0) / cell)), j1 = Math.min(H - 1, Math.floor((c.z + R - z0) / cell));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const cx = x0 + (i + 0.5) * cell, cz = z0 + (j + 0.5) * cell; if ((cx - c.x) ** 2 + (cz - c.z) ** 2 < R * R) shut[j * W + i] = 1; } }
  const at = (x, z) => Math.min(H - 1, Math.max(0, Math.floor((z - z0) / cell))) * W + Math.min(W - 1, Math.max(0, Math.floor((x - x0) / cell)));
  const open = (k) => { for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const i = (k % W) + di, j = Math.floor(k / W) + dj; if (i >= 0 && j >= 0 && i < W && j < H) shut[j * W + i] = 0; } };
  const a = at(px, pz), b = at(ex, ez); open(a); open(b);   // you may always step out of where you stand, and reach a door that is close to a wall
  // shortest way over the open squares (A*), no cutting across the corner of a shut square
  const g = new Float32Array(W * H).fill(Infinity), from = new Int32Array(W * H).fill(-1), heap = [], bi = b % W, bj = Math.floor(b / W), est = (k) => Math.hypot((k % W) - bi, Math.floor(k / W) - bj);
  const push = (k, f) => { heap.push([f, k]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  g[a] = 0; push(a, est(a)); let found = false;
  while (heap.length) { const [f, k] = pop(); if (k === b) { found = true; break; } if (f > g[k] + est(k) + 1e-6) continue; const i = k % W, j = Math.floor(k / W);
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { if (!di && !dj) continue; const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue; const n = nj * W + ni; if (shut[n] || (di && dj && (shut[j * W + ni] || shut[nj * W + i]))) continue;
      const c = g[k] + (di && dj ? 1.4142 : 1); if (c < g[n]) { g[n] = c; from[n] = k; push(n, c + est(n)); } } }
  if (!found) return straight;
  const pts = []; for (let k = b; k !== -1; k = from[k]) pts.push([x0 + ((k % W) + 0.5) * cell, z0 + (Math.floor(k / W) + 0.5) * cell]); pts.reverse(); pts[0] = [px, pz]; pts[pts.length - 1] = [ex, ez];
  // pull the string tight: keep only the corners you cannot see past
  const out = [pts[0]]; let i = 0; while (i < pts.length - 1) { let j = pts.length - 1; while (j > i + 1 && hit(pts[i][0], pts[i][1], pts[j][0], pts[j][1], -0.35)) j--; out.push(pts[j]); i = j; }
  if (far) out.push([tx, tz]); return out;
}

// Pale dust settles in the lee of a crater's rim. How strongly (0…1) at a point, for the prevailing wind (towards the south-east).
export const WIND = [0.82, 0.57];
export function streak(x, z) { let s = 0; for (const c of CRATERS) { if (c.r < 5 || c.r > 40) continue; const dx = x - c.x, dz = z - c.z, along = dx * WIND[0] + dz * WIND[1], across = Math.abs(-dx * WIND[1] + dz * WIND[0]), len = c.r * 6; if (along < c.r * 0.9 || along > len) continue; const k = (along - c.r * 0.9) / (len - c.r * 0.9), wide = c.r * (1 - 0.75 * k); if (across < wide) s = Math.max(s, (1 - k) * (1 - (across / wide) ** 2)); } return s; }
