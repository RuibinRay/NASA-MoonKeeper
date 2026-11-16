// MOONKEEPER — the way round obstacles, for the yellow guide line on the Moon's surface and on Mars.
// No three.js and no game state: only circles to keep clear of.

// The way to walk (or drive) from (px,pz) to (tx,tz) without going through a building, a tunnel or a boulder.
// Returns corner points [[x,z], …], starting at the start and ending at the target. pad = how much room to leave (m).
// Only the first 200 m are planned round obstacles: the guide line on the ground is never drawn further than that.
// margin = how far beyond the two ends the search may go to find a way round (m).
export function routeAround(cols, px, pz, tx, tz, pad = 1.1, margin = 40) {
  const hit = (ax, az, bx, bz, extra = 0) => { const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1e-9; for (const c of cols) { if (!c.r) continue; const t = Math.max(0, Math.min(1, ((c.x - ax) * dx + (c.z - az) * dz) / l2)), R = c.r + pad + extra; if ((ax + dx * t - c.x) ** 2 + (az + dz * t - c.z) ** 2 < R * R) return true; } return false; };
  const D = Math.hypot(tx - px, tz - pz), far = D > 200, ex = far ? px + ((tx - px) * 200) / D : tx, ez = far ? pz + ((tz - pz) * 200) / D : tz, straight = [[px, pz], [tx, tz]];
  if (D < 0.5 || !hit(px, pz, ex, ez)) return straight;
  // a grid of 2 m squares round the two ends; a square is shut if a building stands on it
  const cell = 2, x0 = Math.min(px, ex) - margin, z0 = Math.min(pz, ez) - margin, W = Math.ceil((Math.abs(ex - px) + 2 * margin) / cell), H = Math.ceil((Math.abs(ez - pz) + 2 * margin) / cell), shut = new Uint8Array(W * H);
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

// The Moon's surface: round the buildings and round the pit. A building the target itself stands in is left out, so the
// line can end at it. cols = [{ x, z, r }], pit = { x, z, r } (r = how close you can get to its middle).
export function surfaceRoute(cols, pit, px, pz, tx, tz, pad = 1.1) {
  const all = (pit ? cols.concat([pit]) : cols).filter((q) => q.r && Math.hypot(q.x - tx, q.z - tz) > q.r + pad + 0.3);
  return routeAround(all, px, pz, tx, tz, pad, pit ? pit.r + pad + 12 : 40);   // room enough to get round the pit
}

// Inside the Moon station: a hall with rooms on both sides, each joined to the hall by a short passage at its door.
// The line leaves and enters a room through its door. env = { rooms: [{ door, side }], rect(room) → { x0, x1, z0, z1 },
// hallZ (half the hall's width), airlockX (where the airlock begins), indoors(x, z) }.
export function stationRoute(px, pz, tx, tz, env) {
  const pts = [[px, pz]], roomAt = (x, z) => env.rooms.find((r) => { const q = env.rect(r); return x > q.x0 - 0.4 && x < q.x1 + 0.4 && z > q.z0 - 0.4 && z < q.z1 + 0.4; });
  // the passage between the hall and a room belongs to that room's door: a line from it must not cut across the wall beside it
  const passAt = (x, z) => (Math.abs(z) > env.hallZ && env.indoors(x, z) ? env.rooms.find((r) => Math.abs(x - r.door) < 2.6 && Math.sign(z) === r.side) : null);
  const ra = roomAt(px, pz), rb = roomAt(tx, tz), pa = ra ? null : passAt(px, pz), pb = rb ? null : passAt(tx, tz), caveA = !env.indoors(px, pz), caveB = !env.indoors(tx, tz), gate = [env.airlockX - 1.6, 0];
  const A = ra || pa, Z = rb || pb;   // the room each end belongs to: its floor or its doorway
  if (A && A === Z) { if (!!ra !== !!rb) pts.push([A.door, A.side * 5.6]); }   // between a room and its own doorway: straight through the door, never back to the hall first
  else if (!(caveA && caveB)) {
    // an end that stands in the hall right at the other end's door needs no stop in the middle of the hall: straight in, or straight out
    const atDoor = (r, x, inHall) => inHall && Math.abs(x - r.door) < 1.8, hallA = !A && !caveA, hallB = !Z && !caveB;
    if (ra) { pts.push([ra.door, ra.side * 5.6]); if (!atDoor(ra, tx, hallB)) pts.push([ra.door, 0]); } else if (pa) { if (!atDoor(pa, tx, hallB)) pts.push([pa.door, 0]); } else if (caveA) pts.push(gate, [env.airlockX + 1.5, 0]);
    if (rb) { if (!atDoor(rb, px, hallA)) pts.push([rb.door, 0]); pts.push([rb.door, rb.side * 5.6]); } else if (pb) { if (!atDoor(pb, px, hallA)) pts.push([pb.door, 0]); } else if (caveB) pts.push([env.airlockX + 1.5, 0], gate);
  }
  pts.push([tx, tz]); return pts.filter((p, i) => !i || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > 0.3);
}
