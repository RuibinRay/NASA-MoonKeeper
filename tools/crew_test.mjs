// Checks three small rules: a robot with nothing to do draws no power, the chargers can be switched off,
// and people who follow you in a line keep off buildings.
//   node tools/crew_test.mjs
import { createSim, applyDisaster, computeFlows, step, hasWork } from '../js/sim.js';
import { Follower } from '../js/follow.js';

let bad = 0, n = 0;
const ok = (name, cond, got) => { n++; if (!cond) { bad++; console.log('FAIL', name, got === undefined ? '' : `(got ${typeof got === 'object' ? JSON.stringify(got) : got})`); } };
const fresh = () => { const S = createSim('pilot', 5); applyDisaster(S); computeFlows(S); return S; };
const fix = (S, id) => Object.assign(S.rooms[id], { hole: 0, built: 1, frozen: false, door: 1, p: 101 });
const wreck = (S, id) => Object.assign(S.rooms[id], { hole: 1, built: 0.3, frozen: true, door: 0, p: 0 });

// --- is there work?
{ const S = fresh(); for (const id of ['potato', 'tomato', 'animal', 'kitchen']) fix(S, id);
  ok('resting is never work', !hasWork(S, 'idle'));
  ok('Farm duty has work when a farm is working', hasWork(S, 'farm'));
  ok('a Cook has work when the Kitchen is working', hasWork(S, 'cook'));
  ok('a Panel cleaner and a Builder always have work', hasWork(S, 'clean') && hasWork(S, 'build'));
  wreck(S, 'potato'); wreck(S, 'tomato'); ok('with both farms out, Farm duty still has the Animal Bay', hasWork(S, 'farm'));
  wreck(S, 'animal'); ok('with the farms and the Animal Bay out, Farm duty has no work', !hasWork(S, 'farm'));
  wreck(S, 'kitchen'); ok('with the Kitchen out, a Cook has no work', !hasWork(S, 'cook')); }

// --- a robot's power
{ const S = fresh(); for (const id of ['potato', 'tomato', 'animal', 'kitchen']) fix(S, id);
  ok('resting robots draw nothing', computeFlows(S).use.bots === 0, S.flow.use.bots);
  S.helpers[0].role = 'farm'; S.helpers[1].role = 'cook';
  ok('two working robots draw 2 kW', computeFlows(S).use.bots === 2, S.flow.use.bots);
  wreck(S, 'potato'); wreck(S, 'tomato'); wreck(S, 'animal');
  ok('a robot on Farm duty with nothing to farm draws nothing', computeFlows(S).use.bots === 1, S.flow.use.bots);
  wreck(S, 'kitchen'); ok('nor does a Cook with no Kitchen', computeFlows(S).use.bots === 0, S.flow.use.bots);
  fix(S, 'kitchen'); ok('rebuild the Kitchen and the Cook draws power again', computeFlows(S).use.bots === 1, S.flow.use.bots); }

// --- the chargers' switch
{ const S = fresh(); S.car.charge = 0.5; S.car.charging = true; S.ship.charge = 0.5; S.ship.charging = true; S.battery = 150;
  ok('both chargers on: 11 kW', computeFlows(S).use.chargers === 11, S.flow.use.chargers);
  for (let i = 0; i < 20; i++) { S.car.charging = S.ship.charging = true; step(S, 0.05); }
  ok('switched on, an hour on the pad adds charge', S.car.charge > 0.7 && S.ship.charge > 0.65, [S.car.charge, S.ship.charge]);
  S.chargeOff = true; const c = S.car.charge, h = S.ship.charge;
  for (let i = 0; i < 20; i++) { S.car.charging = S.ship.charging = true; step(S, 0.05); }
  ok('switched off, an hour on the pad adds nothing', S.car.charge === c && S.ship.charge === h, [S.car.charge, S.ship.charge]);
  ok('switched off, the chargers draw nothing', computeFlows(S).use.chargers === 0, S.flow.use.chargers);
  S.chargeOff = false; for (let i = 0; i < 20; i++) { S.car.charging = S.ship.charging = true; step(S, 0.05); }
  ok('switched back on, charging carries on', S.car.charge > c, S.car.charge); }

// --- two people following in a line past a building
{ const B = { x: 0, z: 20, r: 6 }, free = (x, z) => Math.hypot(x - B.x, z - B.z) >= B.r + 0.45;
  const fol = [{ x: 0, z: -3, f: new Follower() }, { x: 0, z: -6, f: new Follower() }]; let inside = 0, jumps = 0, apart = 99, you;
  for (let t = 0; t < 14; t += 1 / 30) {
    const a = Math.min(Math.PI, Math.max(0, t - 2) * 0.42);                                   // two seconds straight at the building, then round its west side, close to the wall
    you = t < 2 ? { x: 0, z: -1 + t * 6.9, face: 0 } : { x: -Math.sin(a) * 7.2, z: 20 - Math.cos(a) * 7.2, face: 0 };
    fol.forEach((p, i) => { const lead = i ? fol[i - 1] : you, r = p.f.update(1 / 30, p, { x: lead.x, z: lead.z, face: you.face }, free); if (r.jumped) jumps++; if (!free(p.x, p.z)) inside++; });
    apart = Math.min(apart, Math.hypot(fol[0].x - fol[1].x, fol[0].z - fol[1].z));
  }
  ok('neither follower ever stands inside the building', inside === 0, inside);
  ok('they walk: nobody jumps', jumps === 0, jumps);
  ok('the first ends near you', Math.hypot(fol[0].x - you.x, fol[0].z - you.z) < 4, Math.hypot(fol[0].x - you.x, fol[0].z - you.z).toFixed(1));
  ok('the second ends near the first', Math.hypot(fol[1].x - fol[0].x, fol[1].z - fol[0].z) < 4, Math.hypot(fol[1].x - fol[0].x, fol[1].z - fol[0].z).toFixed(1));
  ok('they do not stand on top of each other', apart > 0.6, apart.toFixed(2)); }

console.log(bad ? `${bad} of ${n} crew checks FAILED` : `All ${n} crew checks passed.`);
process.exit(bad ? 1 : 0);
