// Checks the limits on how often surprise events may hole a room.
//   node tools/holes_test.mjs
import { createSim, applyDisaster, holeTargets, holeRoom, HOLE_GAP_H } from '../js/sim.js';
import { MODES, ROOMS } from '../js/config.js';

let bad = 0, n = 0;
const ok = (name, cond, got) => { n++; if (!cond) { bad++; console.log('FAIL', name, got === undefined ? '' : `(got ${typeof got === 'object' ? JSON.stringify(got) : got})`); } };
const fresh = (mode) => { const S = createSim(mode, 11); applyDisaster(S); return S; };
const ids = (S) => holeTargets(S).map((d) => d.id);

// --- the limits in the mission table
ok('Cadet allows one holed room, Pilot two, Commander three', MODES.cadet.holes === 1 && MODES.pilot.holes === 2 && MODES.commander.holes === 3, [MODES.cadet.holes, MODES.pilot.holes, MODES.commander.holes]);
ok('Unlimited has no limit on the number', MODES.unlimited.holes === Infinity, MODES.unlimited.holes);

// --- at the start
{ const S = fresh('pilot'), t = ids(S);
  ok('at the start, a room can be holed', t.length > 0, t.length);
  ok('rooms already wrecked by the disaster are not offered', S.m.wreck.every((id) => !t.includes(id)), t);
  ok('every room offered is whole and working', t.every((id) => S.rooms[id].built >= 1 && S.rooms[id].hole === 0)); }

// --- the gap, and never the same room twice
{ const S = fresh('pilot'), first = ids(S)[0]; holeRoom(S, first);
  ok('holing a room is counted', S.stats.holes === 1 && S.rooms[first].hole === 1 && S.holed.includes(first), S.stats.holes);
  ok('straight after a hole, no room is offered', ids(S).length === 0, ids(S));
  S.t += HOLE_GAP_H - 1; ok('nor an hour before the gap is up', ids(S).length === 0, ids(S));
  S.t += 2; ok('after a day and a half, rooms are offered again', ids(S).length > 0, ids(S).length);
  Object.assign(S.rooms[first], { hole: 0, built: 1, frozen: false, door: 1 });
  ok('a room that was holed and rebuilt is not offered a second time', !ids(S).includes(first), ids(S)); }

// --- the limit for each mission
for (const [mode, lim] of [['cadet', 1], ['pilot', 2], ['commander', 3]]) {
  const S = fresh(mode); let made = 0;
  for (let i = 0; i < 12; i++) { const t = ids(S); if (t.length) { holeRoom(S, t[0]); made++; } S.t += HOLE_GAP_H + 1; }
  ok(`${mode}: at most ${lim} room${lim > 1 ? 's' : ''} holed, however long the mission runs`, made === lim, made);
}
{ const S = fresh('unlimited'); let made = 0; for (let i = 0; i < 30; i++) { const t = ids(S); if (t.length) { holeRoom(S, t[0]); made++; } S.t += HOLE_GAP_H + 1; }
  const whole = ROOMS.length - S.m.wreck.length;
  ok('unlimited: each whole room can be holed once, and then no more', made === whole, [made, whole]); }

// --- the Water Room and the Oxygen Room
{ const S = fresh('commander'); S.mat = 0;
  ok('with no material for a patch, the Water Room and Oxygen Room are not offered', !ids(S).includes('water') && !ids(S).includes('oxygen'), ids(S));
  ok('other rooms still are', ids(S).length > 0, ids(S).length);
  S.mat = 1; ok('with one material in hand, they are offered again', ids(S).includes('water') && ids(S).includes('oxygen'), ids(S));
  S.mat = Infinity; ok('endless materials count as having some', ids(S).includes('water'), ids(S)); }

// --- a room that is already holed, or not built, is never offered
{ const S = fresh('commander'); S.rooms.kitchen.hole = 1; S.rooms.quarters.built = 0.3;
  ok('a room with a hole in it is not offered', !ids(S).includes('kitchen'));
  ok('a broken room is not offered', !ids(S).includes('quarters')); }

// --- an old save without the new fields still works
{ const S = fresh('pilot'); delete S.stats.holes; delete S.lastHole; delete S.holed;
  ok('a mission saved before this change still offers rooms', ids(S).length > 0, ids(S).length); }

console.log(bad ? `${bad} of ${n} hole checks FAILED` : `All ${n} hole checks passed.`);
process.exit(bad ? 1 : 0);
