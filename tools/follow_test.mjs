// Checks how REGO follows you: it must never stand in a wall, never run at one, and still get through a door.
//   node tools/follow_test.mjs
import { Follower, SPOTS, clearLine, goodSpots } from '../js/follow.js';

let bad = 0, n = 0;
const ok = (name, cond, got) => { n++; if (!cond) { bad++; console.log('FAIL', name, got === undefined ? '' : `(got ${typeof got === 'object' ? JSON.stringify(got) : got})`); } };

// A small station: a hall 4.2 m wide running east-west, and a room to the north joined to it by one door 3 m wide.
const HALL = { x0: -30, x1: 30, z0: -2.1, z1: 2.1 }, ROOM = { x0: -8, x1: 8, z0: 4, z1: 14 }, DOOR = { x0: -1.5, x1: 1.5, z0: 2.1, z1: 4 };
const inside = (r, x, z) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
const station = (x, z) => inside(HALL, x, z) || inside(ROOM, x, z) || inside(DOOR, x, z);
const open = () => true;
const EAST = Math.PI / 2, WEST = -Math.PI / 2, NORTH = 0;

// Runs REGO for a while. walk(t) gives where you are and which way you face at time t.
function run(free, me, walk, seconds, dt = 1 / 30) {
  const F = new Follower(), r = { path: 0, inWall: 0, jumps: 0, far: 0, me };
  for (let t = 0; t < seconds; t += dt) {
    const you = walk(t), res = F.update(dt, me, you, free), d = Math.hypot(res.dx, res.dz);
    if (res.jumped) r.jumps++; else r.path += d;
    if (!free(me.x, me.z)) r.inWall++;
    r.far = Math.max(r.far, Math.hypot(me.x - you.x, me.z - you.z)); r.you = you;
  }
  r.end = Math.hypot(me.x - r.you.x, me.z - r.you.z);
  return r;
}

// --- lines and spots
ok('a line inside the hall is clear', clearLine(station, -5, 0, 5, 0));
ok('a line through the wall is not', !clearLine(station, 0, 0, 5, 8));
ok('a line through the door is clear', clearLine(station, 0, 0, 0, 8));
ok('in the open, the first choice is behind your right shoulder', goodSpots(open, SPOTS, 0, 0, NORTH)[0].i === 0);
{ const s = goodSpots(open, SPOTS, 0, 0, NORTH)[0]; ok('facing north, that spot is to the east and south of you', s.x > 1.8 && s.z < -1.2, s); }
{ const s = goodSpots(open, SPOTS, 0, 0, EAST)[0]; ok('facing east, that spot is to the south and west of you', s.z < -1.8 && s.x < -1.2, s); }
{ const s = goodSpots(station, SPOTS, 0, -1.6, EAST); ok('by the south wall facing east, the right-shoulder spot is refused', s.length > 0 && s[0].i !== 0, s[0]); ok('every spot offered is inside the station', s.every((q) => station(q.x, q.z))); }
{ const s = goodSpots(station, SPOTS, 7.5, 5, NORTH); ok('in a corner of the room there is still somewhere to stand', s.length > 0, s.length); }
ok('no spot is offered on the far side of a wall', goodSpots(station, SPOTS, 5, 1.8, WEST).every((q) => q.z <= 2.1));

// --- the fault this replaces: standing by a wall
for (const [name, x, z, face] of [['south wall, facing east', 0, -1.6, EAST], ['north wall, facing west', 0, 1.6, WEST], ['north wall, facing east', 0, 1.9, EAST], ['a corner of the room', 7.2, 13.2, NORTH]]) {
  const r = run(station, { x, z }, () => ({ x, z, face }), 10);
  ok(`standing by the ${name}: REGO settles (moves under 4 m in 10 s)`, r.path < 4, r.path.toFixed(1));
  ok(`standing by the ${name}: REGO never enters the wall`, r.inWall === 0, r.inWall);
  ok(`standing by the ${name}: REGO does not jump about`, r.jumps === 0, r.jumps);
  ok(`standing by the ${name}: REGO ends 0.5 to 2.5 m from you`, r.end > 0.5 && r.end < 2.5, r.end.toFixed(2));
}

// --- walking along a wall
{ const r = run(station, { x: -20, z: -1.6 }, (t) => ({ x: -20 + 5 * t, z: -1.6, face: EAST }), 8);
  ok('walking 40 m along the wall: REGO travels about as far as you do', r.path > 36 && r.path < 48, r.path.toFixed(1));
  ok('walking along the wall: REGO never enters it', r.inWall === 0, r.inWall);
  ok('walking along the wall: REGO keeps up without jumping', r.jumps === 0 && r.far < 5, { jumps: r.jumps, far: r.far.toFixed(1) }); }

// --- through a door: along the hall, turn north through the door, on into the room
{ const walk = (t) => (t < 2 ? { x: -10 + 5 * t, z: 0, face: EAST } : t < 4 ? { x: 0, z: 5 * (t - 2), face: NORTH } : { x: Math.min(6, 5 * (t - 4)), z: 10, face: EAST });
  const r = run(station, { x: -11, z: -1.5 }, walk, 9);
  ok('through a door: REGO never enters a wall', r.inWall === 0, r.inWall);
  ok('through a door: REGO arrives in the room beside you', inside(ROOM, r.me.x, r.me.z) && r.end < 2.8, { me: r.me, end: r.end.toFixed(2) });
  ok('through a door: REGO walks there, it does not jump', r.jumps === 0, r.jumps); }

// --- standing still in the open: REGO does not fuss
{ const r = run(open, { x: 1.5, z: -2 }, () => ({ x: 0, z: 0, face: NORTH }), 5); ok('already near you and out of your way: REGO stays where it is', r.path < 1.2, r.path.toFixed(2)); }
{ const r = run(open, { x: 0, z: 2 }, () => ({ x: 0, z: 0, face: NORTH }), 5); ok('standing in front of you: REGO moves out of your way', r.path > 1.5 && r.me.z < 0.8, { path: r.path.toFixed(1), me: r.me }); }

// --- turning round on the spot
{ const r = run(open, { x: 2, z: -1 }, (t) => ({ x: 0, z: 0, face: t * 1.2 }), 10);
  ok('turning on the spot in the open: REGO circles behind you without jumping', r.jumps === 0 && r.far < 3.5, { jumps: r.jumps, far: r.far.toFixed(1) }); }
{ const r = run(station, { x: 1, z: -1 }, (t) => ({ x: 0, z: 0, face: t * 1.2 }), 10);
  ok('turning on the spot in the hall: REGO never enters a wall', r.inWall === 0, r.inWall);
  ok('turning on the spot in the hall: REGO does not jump, and moves no further than a circle round you', r.jumps === 0 && r.path < 2 * Math.PI * 2.6 * 2, { jumps: r.jumps, path: r.path.toFixed(1) }); }

// --- left far behind, or shut out
{ const r = run(open, { x: 0, z: 0 }, () => ({ x: 60, z: 0, face: EAST }), 0.2); ok('left more than 32 m behind: REGO appears beside you', r.jumps === 1 && r.end < 2.6, { jumps: r.jumps, end: r.end.toFixed(1) }); }
{ const r = run(station, { x: -20, z: 0 }, () => ({ x: 0, z: 10, face: NORTH }), 8);   // you are in the room past the door, REGO is in the hall and never saw you go
  ok('out of sight with no path to follow, door ahead: REGO finds its way in along the wall', r.jumps === 0 && inside(ROOM, r.me.x, r.me.z), { jumps: r.jumps, me: r.me });
  ok('and it was never inside a wall on the way', r.inWall === 0, r.inWall); }
{ const r = run(station, { x: 20, z: 0 }, () => ({ x: 6, z: 12, face: NORTH }), 8);    // you are deep in the room, REGO ends up against the hall wall
  ok('wedged against a wall out of sight: REGO appears beside you, once', r.jumps === 1 && inside(ROOM, r.me.x, r.me.z) && r.end < 2.6, { jumps: r.jumps, me: r.me });
  ok('and it was never inside the wall', r.inWall === 0, r.inWall); }

// --- found inside a wall
{ const r = run(station, { x: 3, z: 3 }, () => ({ x: 0, z: 0, face: EAST }), 1);
  ok('found inside a wall: REGO steps out at once, beside you', r.jumps === 1 && r.inWall === 0 && r.end < 2.6, { jumps: r.jumps, inWall: r.inWall, end: r.end.toFixed(2) }); }

// --- beside a job
{ const F = new Follower(), me = { x: 0, z: 0 }; let inWall = 0;
  for (let i = 0; i < 150; i++) { F.update(1 / 30, me, { x: 0, z: 0.4, face: NORTH }, station, { x: 0, z: 1.9 }); if (!station(me.x, me.z)) inWall++; }
  ok('at a job on the hall wall: REGO stands beside the work, not in the wall', inWall === 0 && Math.hypot(me.x, me.z - 1.9) < 2.2, { me, inWall }); }

console.log(bad ? `${bad} of ${n} follow checks FAILED` : `All ${n} follow checks passed.`);
process.exit(bad ? 1 : 0);
