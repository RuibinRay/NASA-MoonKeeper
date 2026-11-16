// Checks the yellow guide line's routes on the Moon: node tools/guide_test.mjs
// In the station every stretch of the line must stay where a player can walk: the hall, a room, or a room's doorway.
// On the surface the line must go round buildings and round the pit.
import { ROOMS, HALL, AIRLOCK, PIT, roomRect, roomSpot } from '../js/config.js';
import { routeAround, surfaceRoute, stationRoute } from '../js/route.js';

let pass = 0, fail = 0;
const ok = (c, name, extra = '') => { if (c) pass++; else { fail++; console.log('  FAIL', name, extra); } };

// ---- the station, as the game lays it out ----
const inRoom = (x, z) => ROOMS.some((r) => { const q = roomRect(r); return x >= q.x0 && x <= q.x1 && z >= q.z0 && z <= q.z1; });
const inPass = (x, z) => ROOMS.some((r) => Math.abs(x - r.door) <= 2.05 && Math.sign(z) === r.side && Math.abs(z) >= HALL.z1 - 0.05 && Math.abs(z) <= 6.45);
const inHall = (x, z) => x >= AIRLOCK.x0 - 2 && x <= HALL.x1 && Math.abs(z) <= HALL.z1 + 0.05;
const walkable = (x, z) => x < AIRLOCK.x0 || inHall(x, z) || inRoom(x, z) || inPass(x, z);
const indoors = (x, z) => x > AIRLOCK.x0 - 0.2 && x < HALL.x1 + 1 && Math.abs(z) < 25;   // the same box the game uses
const env = { rooms: ROOMS, rect: roomRect, hallZ: HALL.z1, airlockX: AIRLOCK.x0, indoors };
const route = (a, b) => stationRoute(a[0], a[1], b[0], b[1], env);
const clear = (pts) => { for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1], n = Math.max(2, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.25)); for (let k = 0; k <= n; k++) { const x = ax + ((bx - ax) * k) / n, z = az + ((bz - az) * k) / n; if (!walkable(x, z)) return [x.toFixed(1), z.toFixed(1)].join(','); } } return null; };

// Places to stand: in each room (at its console, in a far corner), in its doorway (in the middle, off to one side), and in the hall.
const places = [];
for (const r of ROOMS) { const q = roomRect(r), [cx, cz] = roomSpot(r);
  places.push({ n: r.id + ' console', p: [cx, cz], room: r }, { n: r.id + ' corner', p: [q.x0 + 1.5, r.side * 22], room: r }, { n: r.id + ' doorway', p: [r.door, r.side * 4.5], pass: r }, { n: r.id + ' doorway edge', p: [r.door + 1.6, r.side * 3.2], pass: r }, { n: 'hall by ' + r.id, p: [r.door, 0] }, { n: 'hall beside ' + r.id + ' door', p: [r.door + 1.4, -r.side * 1.9] }, { n: 'hall at ' + r.id + ' door', p: [r.door - 0.8, r.side * 1.2] }); }
places.push({ n: 'hall, airlock end', p: [HALL.x0 + 2, 1.5] }, { n: 'hall, far end', p: [HALL.x1 - 2, -1.5] }, { n: 'cave', p: [AIRLOCK.x0 - 20, 0.5] });

let pairs = 0, bad = 0, firstBad = '';
for (const a of places) for (const b of places) { if (a === b) continue; pairs++; const pts = route(a.p, b.p), hitAt = clear(pts);
  if (hitAt || pts[0][0] !== a.p[0] || pts[pts.length - 1][0] !== b.p[0] || pts[pts.length - 1][1] !== b.p[1]) { bad++; if (!firstBad) firstBad = `${a.n} → ${b.n} leaves the floor at ${hitAt}: ${JSON.stringify(pts)}`; } }
ok(bad === 0, `in the station, every line between ${places.length} places stays on the floor`, `${bad} of ${pairs} do not. First: ${firstBad}`);

{ const pot = ROOMS.find((r) => r.id === 'potato'), ws = ROOMS.find((r) => r.id === 'workshop');
  const out = route([pot.door - 1.4, pot.side * 4.4], [ws.door - 6, ws.side * 19]);
  ok(out[1][0] === pot.door && out[1][1] === 0, 'from a doorway the line first goes to the hall at that door (it used to cut through the wall)', JSON.stringify(out));
  const into = route([pot.door, pot.side * 3.5], roomSpot(pot));
  ok(into.every((p) => Math.sign(p[1]) === pot.side), 'from a room\'s doorway into that room the line never goes back to the hall', JSON.stringify(into));
  const outOf = route(roomSpot(pot), [pot.door, pot.side * 3.5]);
  ok(outOf.every((p) => Math.sign(p[1]) === pot.side) && outOf.length <= 3, 'and the same from the room to its doorway', JSON.stringify(outOf));
  const step = route([pot.door + 0.4, pot.side * 0.6], roomSpot(pot)); ok(step.every((p, i) => !i || Math.abs(p[1]) >= Math.abs(step[i - 1][1]) - 1e-9), 'standing in the hall at a door, the line goes straight in: it never folds back to the middle of the hall first', JSON.stringify(step));
  const same = route([pot.x0 + 2, pot.side * 20], roomSpot(pot)); ok(same.length === 2, 'inside one room the line is straight');
  const hall = route([HALL.x0 + 5, 0], [HALL.x1 - 5, 1]); ok(hall.length === 2, 'along the hall the line is straight');
  const across = route(roomSpot(ws), roomSpot(pot)); ok(across.length === 6 && across[2][1] === 0 && across[3][1] === 0, 'room to room: out by one door, along the hall, in by the other', JSON.stringify(across));
  const cave = route([AIRLOCK.x0 - 30, 0], roomSpot(ws)); ok(cave.some((p) => Math.abs(p[0] - (AIRLOCK.x0 - 1.6)) < 0.01) && !clear(cave), 'from the cave the line goes in through the airlock'); }

// ---- the surface ----
const minDist = (pts, c) => { let m = Infinity; for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1], dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((c.x - ax) * dx + (c.z - az) * dz) / (dx * dx + dz * dz || 1e-9))); m = Math.min(m, Math.hypot(ax + dx * t - c.x, az + dz * t - c.z)); } return m; };
{ const cols = [{ x: -58, z: -28, r: 4 }, { x: -55, z: -28, r: 4 }, { x: -60, z: -22.8, r: 1.3 }, { x: -58, z: -22.8, r: 1.3 }, { x: 20, z: 0, r: 6 }, { x: 0, z: 0, r: 0 }], pit = { x: PIT.x, z: PIT.z, r: PIT.r + 6.5 };
  const free = surfaceRoute(cols, pit, -100, -80, -90, -60); ok(free.length === 2, 'over open ground the line is straight');
  const west = surfaceRoute(cols, pit, -72, -26, -8, -58), d = Math.min(...cols.filter((c) => c.r).map((c) => minDist(west, c) - c.r));
  ok(west.length > 2 && d > 1.1 - 0.5, 'a building in the way: the line bends round it and keeps clear of every wall', `${west.length} points, closest ${d.toFixed(2)} m`);
  ok(west[0][0] === -72 && west[west.length - 1][0] === -8 && west[west.length - 1][1] === -58, 'it still starts at the player and ends at the target');
  const rover = surfaceRoute(cols, pit, -72, -26, -8, -58, 2.4), dr = Math.min(...cols.filter((c) => c.r).map((c) => minDist(rover, c) - c.r));
  ok(dr > 2.4 - 0.5 && dr > d, 'the rover is given more room than a walker', `${dr.toFixed(2)} m against ${d.toFixed(2)} m`);
  const inside = surfaceRoute(cols, pit, -10, -20, 20, 0); ok(inside[inside.length - 1][0] === 20 && inside[inside.length - 1][1] === 0 && inside.length === 2, 'a target that stands inside its own building can still be reached: the line ends at it');
  const hidden = surfaceRoute(cols, pit, -10, 0, 10, 0); ok(hidden.length === 2, 'something with no size (switched off) is not walked round');
  const round = surfaceRoute(cols, pit, PIT.x - 70, PIT.z, PIT.x + 70, PIT.z), dp = minDist(round, PIT);
  ok(round.length > 2 && dp > PIT.r + 6.5 + 1.1 - 0.6, 'the line goes round the pit, never across it', `closest to the middle ${dp.toFixed(1)} m, the pit is ${PIT.r} m`);
  const gate = surfaceRoute(cols, pit, 30, 20, 0, 60); ok(gate[gate.length - 1][0] === 0 && gate[gate.length - 1][1] === 60, 'the Pit Elevator, right at the rim, is still reached');
  const far = surfaceRoute(cols, pit, -72, -26, 482, -364); ok(far[far.length - 1][0] === 482 && far[far.length - 1][1] === -364, 'a far station: the line ends there, with only the first 200 m planned round obstacles');
  const t0 = Date.now(); for (let i = 0; i < 200; i++) surfaceRoute(cols, pit, -72 + (i % 7), -26, -8, -58); const ms = (Date.now() - t0) / 200; ok(ms < 8, 'finding the way is quick', `${ms.toFixed(2)} ms each`);
  ok(routeAround(cols.filter((c) => c.r), -72, -26, -8, -58).length > 2, 'the same finder serves Mars'); }

console.log(fail ? `${pass} guide checks passed, ${fail} FAILED` : `All ${pass} guide checks passed.`);
process.exit(fail ? 1 : 0);
