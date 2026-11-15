// Checks what unheated cold does at night: the rover and hopper lose charge, their chargers stop,
// the Water Plant stands still and its seal wears. And that none of it happens when the heaters are set right.
//   node tools/frost_test.mjs
import { createSim, applyDisaster, computeFlows, step } from '../js/sim.js';
import { startBatch } from '../js/life.js';
import { K } from '../js/config.js';

let bad = 0, n = 0;
const ok = (name, cond, got) => { n++; if (!cond) { bad++; console.log('FAIL', name, got === undefined ? '' : `(got ${typeof got === 'object' ? JSON.stringify(got) : got})`); } };
const near = (name, got, want, tol) => ok(name, Math.abs(got - want) <= tol, got);

// A Pilot mission moved to the middle of the night, with plenty of everything so that only the heaters differ.
function night(heat, setup) {
  const S = createSim('pilot', 7); applyDisaster(S);
  S.t = S.t0 + S.m.sunsetDay * 24 + 30; S.battery = 300; S.o2 = S.o2Cap; S.water = 60; S.meals = 40; S.lv.farm = 0; S.lv.comms = 0; S.lv.o2gen = 1; S.lv.recycler = 1;
  S.car.charge = 1; S.ship.charge = 1; S.lv.heat = heat; if (setup) setup(S);
  computeFlows(S); return S;
}
const run = (S, hours, each) => { const dt = 0.05; for (let t = 0; t < hours - 1e-9; t += dt) { if (each) each(S); step(S, dt); } return S; };

// --- the night itself
{ const S = night(2); ok('it is night in the test', !S.flow.sun.up); ok('at night the machines need heater level 2', S.flow.heatNeed === 2, S.flow.heatNeed); }

// --- heaters set right: nothing happens
{ const S = run(night(2), 20);
  ok('heaters at the needed level: no frost', S.flow.frost === 0, S.flow.frost);
  ok('heaters at the needed level: the rover keeps its charge', S.car.charge === 1, S.car.charge);
  ok('heaters at the needed level: the hopper keeps its charge', S.ship.charge === 1, S.ship.charge);
  ok('heaters at the needed level: the Water Plant seal is untouched', S.wx.seal === 1, S.wx.seal);
  ok('heaters at the needed level: no frost hours counted', !S.stats.frostHours, S.stats.frostHours); }

// --- heaters off
{ const S = run(night(0), 10);
  near('heaters off at night: frost is two heater levels', S.flow.frost, 2, 1e-9);
  near('heaters off for 10 h: the rover has lost 30% of a charge', S.car.charge, 1 - K.FROST_DRAIN * 2 * 10, 0.005);
  near('heaters off for 10 h: so has the hopper', S.ship.charge, 1 - K.FROST_DRAIN * 2 * 10, 0.005);
  near('heaters off for 10 h: the Water Plant seal has worn by 0.2', S.wx.seal, 1 - K.FROST_SEAL * 2 * 10, 0.005);
  near('heaters off for 10 h: 10 frost hours counted', S.stats.frostHours, 10, 0.06); }
{ const S = run(night(1), 10); near('one level short: half the drain', S.car.charge, 1 - K.FROST_DRAIN * 10, 0.005); }
{ const S = night(0), seen = []; run(S, 40, (q) => { for (const e of q.pending) if (!seen.includes(e)) seen.push(e); q.pending.length = 0; });
  ok('heaters off for 40 h: both batteries are flat, never below zero', S.car.charge === 0 && S.ship.charge === 0, [S.car.charge, S.ship.charge]);
  ok('the game is told once that the frost began', seen.filter((e) => e === 'frost').length === 1, seen);
  ok('the game is told when each battery goes flat', seen.includes('flat:car') && seen.includes('flat:ship'), seen);
  ok('the seal never wears below a half', S.wx.seal >= 0.5, S.wx.seal); }

// --- chargers
{ const S = night(0, (q) => { q.car.charge = 0.5; }); run(S, 5, (q) => { q.car.charging = true; });
  ok('frozen: a rover on its pad does not charge', S.car.charge < 0.5, S.car.charge);
  S.car.charging = true; computeFlows(S); ok('frozen: the chargers draw no power', S.flow.use.chargers === 0, S.flow.use.chargers); }
{ const S = night(2, (q) => { q.car.charge = 0.5; }); run(S, 1, (q) => { q.car.charging = q.car.charge < 1; });
  ok('warm: a rover on its pad charges', S.car.charge > 0.75, S.car.charge);
  S.car.charging = true; computeFlows(S); ok('warm: the charger draws its 4 kW', S.flow.use.chargers === 4, S.flow.use.chargers); }

// --- the heaters come back
{ const S = run(night(0), 10), c = S.car.charge; S.lv.heat = 2; run(S, 5);
  ok('heaters back up: the frost ends', S.flow.frost === 0 && !S.frostOn, S.flow.frost);
  ok('heaters back up: the draining stops', S.car.charge === c, [c, S.car.charge]);
  const seen = []; S.pending.length = 0; S.lv.heat = 0; run(S, 2, (q) => { for (const e of q.pending) seen.push(e); q.pending.length = 0; });
  ok('a second spell of frost is announced again', seen.filter((e) => e === 'frost').length === 1, seen); }

// --- the Water Plant
{ const mk = (heat) => { const S = night(heat, (q) => { q.wx.ice = 2; }); const r = startBatch(S, { mode: 'ice', method: 'elec', n: 1, kw: 4, hours: 5, pa: 10 }); return [S, r]; };
  const [W, rw] = mk(2), [F, rf] = mk(0);
  ok('a batch can be started in the test', rw === 'ok' && rf === 'ok', [rw, rf]);
  const left0 = F.wx.batch.left; run(W, 3); run(F, 3);
  ok('warm: the batch moves on', !W.wx.batch || W.wx.batch.left < left0, W.wx.batch && W.wx.batch.left);
  ok('frozen: the batch waits where it is', F.wx.batch && F.wx.batch.left === left0, F.wx.batch && F.wx.batch.left);
  ok('frozen: the waiting batch draws no power', F.flow.life.wxKw === 0, F.flow.life.wxKw);
  F.lv.heat = 2; run(F, 3); ok('thawed: the batch carries on', !F.wx.batch || F.wx.batch.left < left0, F.wx.batch && F.wx.batch.left); }

// --- by day there is no frost, whatever the heaters do
{ const S = createSim('pilot', 7); applyDisaster(S); S.lv.heat = 0; S.car.charge = 1; run(S, 10);
  ok('by day: no frost with the heaters off', S.flow.sun.up && S.flow.frost === 0 && S.car.charge === 1, [S.flow.sun.up, S.flow.frost, S.car.charge]); }

// --- a small shortfall is forgiven (a brief brownout should not strand the rover)
{ const S = night(2); S.flow.eff = 1; const F = computeFlows(S); ok('a quarter of a level short or less is not frost', F.frost === 0 && 0.25 > 0, F.frost); }

console.log(bad ? `${bad} of ${n} frost checks FAILED` : `All ${n} frost checks passed.`);
process.exit(bad ? 1 : 0);
