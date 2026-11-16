// Checks the Mars training: node tools/mars_training_test.mjs
// The training is walked through here step by step with a stand-in player: each step must finish when the thing is
// done and not before, in order, and the outpost must be left as it was found.
import { MARS, createMars, marsFlows } from '../js/mars/sim.js';
import { FAULTS } from '../js/mars/survive.js';
import * as T from '../js/mars/terrain.js';
import { makeTraining } from '../js/mars/training.js';

let pass = 0, fail = 0;
const ok = (cond, name, got) => { if (cond) pass++; else { fail++; console.log('  FAIL', name, got === undefined ? '' : '→ ' + got); } };
function setup(mode = 'explore') {
  const S = createMars(3), P = { pos: { x: T.SPAWN.x, z: T.SPAWN.z }, in: null }, said = [], sounds = [], finished = [], shown = [];
  const G = { player: P, car: { x: T.ROVER_PAD.x, z: T.ROVER_PAD.z, v: 0 }, audio: { play: (k) => sounds.push(k) }, goal: null, pointTo: (id) => { G.goal = { id }; } };
  const TR = makeTraining({ G, ui: { bubble: (h) => said.push(h), objective: (h) => shown.push(h) }, state: () => S, done: (m, skipped) => finished.push([m, skipped]) });
  TR.begin(mode); TR.intro(); return { S, P, G, TR, said, sounds, finished, shown, at: () => TR.steps[TR.step] };
}
const LANDER = [T.PAD.x + 12, T.PAD.z + 6];

// ---- 1. the whole training, in order ----
{ const q = setup(), { S, P, G, TR } = q;
  ok(TR.steps.join() === 'walk,open,power,switch,dust,clear,mend,drive,lander,unpack,park', 'eleven steps: walk, open, power, switch, dust, clear, mend, drive, lander, unpack, park', TR.steps.join());
  ok(TR.active() && S.train === true && q.at() === 'walk' && G.goal.id === 'cmd' && q.said.length === 1, 'it starts by pointing the yellow line at the Command Habitat and saying why');
  TR.tick(); ok(q.at() === 'walk', 'standing still does not finish the first step');
  P.pos.x = T.B.cmd.door[0]; P.pos.z = T.B.cmd.door[1]; TR.tick(); ok(q.at() === 'open', 'reaching the door finishes "walk"');
  TR.tick(); ok(q.at() === 'open', 'standing at the door is not enough: the panel must be opened'); TR.note('panel', 'cmd'); TR.tick(); ok(q.at() === 'power', 'opening the panel finishes "open"');
  TR.note('panel', 'lab'); TR.tick(); ok(q.at() === 'power', 'opening another building does not count as checking the power'); TR.note('panel', 'power'); TR.tick(); ok(q.at() === 'switch' && G.goal.id === 'lab', 'opening the Power Station finishes "power", and the line goes to the laboratory');
  TR.tick(); ok(q.at() === 'switch', 'the laboratory left on does not finish "switch"'); S.on.lab = false; TR.tick(); ok(q.at() === 'switch', 'switching it off is only half'); S.on.lab = true; TR.tick(); ok(q.at() === 'dust' && G.goal.id === 'power', 'off and on again finishes "switch"');
  const clearKw = marsFlows(S).solar; S.tauWant = 1.5; TR.tick(); ok(q.at() === 'dust' && S.tau === 1.5, 'a merely dusty sky is not the storm the step asks for, but the sky does change at once');
  S.tauWant = 4; TR.tick(); ok(q.at() === 'clear' && S.tau === 4, 'the regional storm finishes "dust"'); ok(S.flow.solar < clearKw * 0.6, 'and the solar field really makes far less', `${S.flow.solar.toFixed(0)} against ${clearKw.toFixed(0)} kW`);
  ok(/kW/.test(q.said[q.said.length - 1]) && q.said[q.said.length - 1].includes(clearKw.toFixed(0) + ' kW'), 'REGO quotes the real before and after power');
  S.tauWant = 0.45; TR.tick(); ok(q.at() === 'mend' && S.fault.thermal === true && q.sounds.includes('alarm') && G.goal.id === 'thermal', 'a clear sky finishes "clear"; then the practice alarm sounds and the heat pump is broken');
  TR.tick(); ok(q.at() === 'mend', 'the alarm alone does not finish "mend"'); delete S.fault.thermal; TR.tick(); ok(q.at() === 'drive' && G.goal.id === 'car', 'mending the heat pump finishes "mend"');
  P.in = 'car'; TR.tick(); ok(q.at() === 'lander' && S.cargo === 2 && G.goal.id === 'lander', 'getting in finishes "drive", and there are parts to fetch');
  P.pos.x = LANDER[0] + 10; P.pos.z = LANDER[1]; TR.tick(); ok(q.at() === 'unpack', 'reaching the lander finishes "lander"'); TR.tick(); ok(q.at() === 'unpack', 'the parts must really be unpacked'); S.cargo = 0; TR.tick(); ok(q.at() === 'park' && G.goal.id === 'pad' && G.goal.x === T.ROVER_PAD.x, 'unpacking finishes "unpack", and the line goes to the charging pad');
  G.car.x = T.ROVER_PAD.x + 30; TR.tick(); ok(q.at() === 'park', 'a rover away from the pad is not parked'); G.car.x = T.ROVER_PAD.x; G.car.v = 3; TR.tick(); ok(q.at() === 'park', 'nor is one still rolling');
  G.car.v = 0; TR.tick(); ok(!TR.active() && q.finished.length === 1 && q.finished[0][0] === 'explore' && q.finished[0][1] === false, 'parking on the pad ends the training, once');
  ok(S.train === false && G.goal === null, 'and leaves no training flag or guide behind'); TR.tick(); ok(q.finished.length === 1, 'nothing happens after it has ended');
  ok(q.said.length === 11, 'REGO spoke once for each step', q.said.length); }

// ---- 2. skipping, and what the game is told ----
{ const q = setup('survive'); q.TR.note('panel', 'cmd'); q.TR.skip(); ok(!q.TR.active() && q.finished[0][0] === 'survive' && q.finished[0][1] === true, 'skipping ends it at once and says so, so the mission can start');
  ok(q.S.train === false && !q.S.hard, 'training itself never turns the outpost into a mission that can be lost'); q.TR.skip(); ok(q.finished.length === 1, 'skipping twice does nothing more');
  ok(q.TR.say() === false, 'once over, H gives REGO\'s usual advice again'); const r = setup(); ok(r.TR.say() === true && r.said.length === 2 && r.said[0] === r.said[1], 'during training, H repeats the current step'); }

// ---- 3. it is safe and it teaches real things ----
{ const q = setup(), S = q.S; S.t = 22 * (MARS.SOL_H / 24); S.flow = marsFlows(S); q.TR.tick(); ok(Math.abs(marsFlows(S).sun.hour - 9.5) < 0.2, 'training keeps to daytime: at night it puts the clock back to mid-morning', marsFlows(S).sun.hour);
  ok(FAULTS.thermal.parts === 0, 'the practice breakdown needs no spare part, so it can always be mended');
  ok(['cmd', 'lab', 'power', 'thermal'].every((id) => T.B[id]), 'every building the training points at exists');
  const cols = T.colliders(), clear = (x, z, pad) => cols.every((c) => Math.hypot(c.x - x, c.z - z) >= c.r + pad);
  ok(clear(LANDER[0] + 10, LANDER[1], 2.2), 'a rover can stand where the lander step is finished'); ok(clear(T.ROVER_PAD.x, T.ROVER_PAD.z, 2.2), 'and on the charging pad');
  ok(Math.hypot(LANDER[0] - T.ROVER_PAD.x, LANDER[1] - T.ROVER_PAD.z) / 2600 < 0.2, 'the drive to the lander and back uses well under half the rover\'s battery', (2 * Math.hypot(LANDER[0] - T.ROVER_PAD.x, LANDER[1] - T.ROVER_PAD.z) / 2600).toFixed(2));
  ok(q.shown.length === 0 || q.shown.every((h) => h === null || /Training \d+ of 11/.test(h)), 'the bar at the top always says which step you are on'); }

// ---- the lander's distance is measured from where you stand, and winding the clock back is said out loud ----
{ const q = setup(), { S, P, G, TR } = q, toasts = []; const step = () => TR.tick();
  P.pos.x = T.B.cmd.door[0]; P.pos.z = T.B.cmd.door[1]; step(); TR.note('panel', 'cmd'); step(); TR.note('panel', 'power'); step();
  S.on.lab = false; step(); S.on.lab = true; step(); S.tauWant = 4; step(); S.tauWant = 0.45; step(); S.fault = {}; step();
  P.pos.x = T.ROVER_PAD.x; P.pos.z = T.ROVER_PAD.z; P.in = 'car'; step();
  ok(q.at() === 'lander', 'a short way through the steps to "lander"', q.at());
  const line = q.said[q.said.length - 1].replace(/<[^>]+>/g, ''), m = /stands (\d+) m/.exec(line), real = Math.hypot(LANDER[0] - P.pos.x, LANDER[1] - P.pos.z);
  ok(m && Math.abs(Number(m[1]) - real) <= 5, 'REGO gives the distance to the lander as it really is from where you stand', line.slice(0, 40) + ' · really ' + real.toFixed(0) + ' m');
  const q2 = setup(), said2 = []; const TR2 = makeTraining({ G: q2.G, ui: { bubble: () => {}, objective: () => {}, toast: (t) => said2.push(t) }, state: () => q2.S, done: () => {} }); TR2.begin('explore'); TR2.intro();
  q2.S.t = (16 / 24) * MARS.SOL_H; q2.S.flow = marsFlows(q2.S); TR2.tick();
  ok(Math.abs(q2.S.flow.sun.hour - 9.5) < 0.2 && said2.length === 1 && /morning/.test(said2[0]), 'late in the day the training clock goes back to the morning, and a toast says so', said2.join(' | '));
  TR2.tick(); TR2.tick(); ok(said2.length === 1, 'it says so once'); }

console.log(`${pass} checks passed${fail ? ', ' + fail + ' FAILED' : ''}`);
process.exitCode = fail ? 1 : 0;
