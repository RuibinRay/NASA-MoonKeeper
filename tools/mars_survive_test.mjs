// Checks the Mars survival mission: node tools/mars_survive_test.mjs
// The two things that matter most: a player who does nothing loses, and a player who plays with care wins.
// Both are played out here, hour by hour, for many seeds.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MARS, LOADS, PLANT, createMars, marsStep } from '../js/mars/sim.js';
import { MISSION, FAULTS, SHED, startSurvival, surviveStep, stormPhase, repairHours, canRepair, repair, unpackCargo, dangers, grade } from '../js/mars/survive.js';

let pass = 0, fail = 0;
const ok = (cond, name, got) => { if (cond) pass++; else { fail++; console.log('  FAIL', name, got === undefined ? '' : '→ ' + got); } };
const SOL = MARS.SOL_H, DT = 0.1, SEEDS = Array.from({ length: 24 }, (_, i) => 101 + i * 37);
const fresh = (seed) => startSurvival(createMars(seed));
const spend = (S, hours) => { for (let h = 0; h < hours - 1e-9 && !S.over; h += DT) surviveStep(S, Math.min(DT, hours - h)); };

// ---- three ways of playing ----
const idle = (S) => { while (!S.over) surviveStep(S, DT); return S; };
// A careful player: unpacks the lander's parts, brushes the panels before the storm and after it, mends what breaks
// (most urgent first), and switches off what the crew can do without while power is short.
const PRIORITY = ['thermal', 'isru', 'lifesupport', 'battery', 'solar', 'water', 'greenhouse', 'comms'];
function careful(S, { shed = true, mend = true } = {}) {
  spend(S, 1); unpackCargo(S); spend(S, 2); S.panelDust = 0.02;   // an hour's drive to the lander and back, then two hours brushing
  let brushedAfter = false;
  while (!S.over) {
    if (mend) { const id = PRIORITY.find((k) => canRepair(S, k)); if (id) { spend(S, repairHours(S, id)); if (!S.over) repair(S, id); continue; } }
    const ph = stormPhase(S).phase, short = ph === 'on' || (S.flow.net < 0 && S.battery < 0.45 * S.flow.cap), plenty = ph !== 'on' && S.battery > 0.7 * S.flow.cap;
    if (shed) { if (short) for (const k of SHED) S.on[k] = false; else if (plenty) for (const k of SHED) S.on[k] = true; }
    if (ph === 'after' && !brushedAfter && S.tau < 1.2 && S.flow.sun.up) { spend(S, 2); S.panelDust = 0.02; brushedAfter = true; continue; }
    surviveStep(S, DT);
  }
  return S;
}

// ---- 1. the mission as it starts ----
{ const S = fresh(1); ok(S.mode === 'survive' && S.hard && S.deadline === MISSION.sols * SOL, 'the mission lasts seven sols');
  ok(S.o2 === MISSION.o2 && S.water === MISSION.water && S.food === MISSION.food && S.mat === MISSION.parts && S.cargo === MISSION.cargoParts, 'it starts with low stores and a few spare parts');
  ok(S.o2 / ((MARS.O2_PP * S.crew) / 24) / SOL < 4, 'the oxygen in the tank would last under four sols on its own', S.o2 / ((MARS.O2_PP * S.crew) / 24) / SOL);
  ok(S.storm.t0 > 1.4 * SOL && S.storm.t0 < 1.9 * SOL && S.storm.t1 - S.storm.t0 >= 2.5 * SOL && S.storm.t1 < S.deadline, 'a storm comes in the second sol and is over before the lander arrives');
  ok(S.storm.tau >= 3.5 && S.storm.tau <= 5.6, 'the storm is a regional one (dust about 4 to 5, like 2007), not the 2018 planet-wide kind (10.8)', S.storm.tau);
  ok(S.plan.length >= 7 && S.plan.length <= 13 && S.plan.every((p, i) => !i || p.t > S.plan[i - 1].t) && S.plan.every((p) => FAULTS[p.id]), 'seven to thirteen breakdowns are planned, in order', S.plan.length);
  ok(S.plan[0].t > 0.45 * SOL, 'nothing breaks in the first hours, while you find your feet');
  ok(S.plan.filter((p) => p.id === 'battery').length <= 1, 'the battery fails at most once');
  const A = fresh(77), B = fresh(77), C = fresh(78); ok(JSON.stringify(A.plan) === JSON.stringify(B.plan) && A.storm.t0 === B.storm.t0, 'the same seed gives the same mission'); ok(JSON.stringify(A.plan) !== JSON.stringify(C.plan), 'another seed gives another'); }
ok(Object.keys(FAULTS).every((k) => k === 'battery' || k === 'solar' || LOADS[k]), 'everything that can break is a real part of the outpost');
ok(SHED.every((k) => !['lifesupport', 'thermal', 'isru', 'water', 'cmd'].includes(k)), 'the "switch off first" list never names what keeps the crew alive');
ok(Object.values(FAULTS).reduce((s, f) => s + f.parts, 0) <= MISSION.parts + MISSION.cargoParts, 'there are enough spare parts on Mars to mend one of everything');

// ---- 2. each breakdown does what it says, and a repair undoes it ----
{ const run = (id, hours = 12) => { const S = createMars(5); S.fault = { [id]: true }; for (let i = 0; i < hours * 10; i++) marsStep(S, 0.1); return S; }, base = run('none');
  ok(run('isru').o2 < base.o2 - 2.5, 'a clogged oxygen plant makes no oxygen'); ok(run('thermal').habTemp < 12, 'a tripped heat pump lets the rooms cool', run('thermal').habTemp);
  ok(run('lifesupport').co2 > 0.8 && run('lifesupport').water > base.water - 1, 'a spent scrubber lets carbon dioxide build up, but water is still recycled');
  ok(run('water').water < base.water - 15, 'a frozen pump brings up no new water'); ok(run('greenhouse').food < base.food - 0.1, 'a dead grow lamp grows nothing');
  const S = createMars(5); S.t = 12 * (SOL / 24); const f0 = marsStep(S, 0.01).solar; S.fault = { solar: true }; const f1 = marsStep(S, 0.01); ok(Math.abs(f1.solar / f0 - 0.7) < 0.01, 'a jammed row of tables costs 30% of the solar power');
  S.fault = { battery: true }; S.battery = 500; marsStep(S, 0.01); ok(S.battery <= 300.01 && S.flow.cap === 300, 'a failed battery module takes 40% of the storage');
  S.fault = { comms: true }; ok(marsStep(S, 0.01).link === false, 'a dish off its aim means no link');
  const R = fresh(3); R.fault.isru = true; R.mat = 0; ok(!canRepair(R, 'isru') && repair(R, 'isru') === false && R.fault.isru, 'no spare part, no repair'); R.mat = 2; ok(repair(R, 'isru') && !R.fault.isru && R.mat === 1 && R.stats.repairs === 1, 'a repair uses its part and mends the fault');
  ok(unpackCargo(R) === MISSION.cargoParts && R.mat === 1 + MISSION.cargoParts && unpackCargo(R) === 0, 'the lander\'s spare parts can be unpacked once');
  R.tau = 4; ok(repairHours(R, 'water') === 3, 'repairs take half as long again in the storm'); }

// ---- 3. doing nothing loses ----
{ const res = SEEDS.map((s) => idle(fresh(s))), lost = res.filter((S) => S.over && !S.over.win), when = lost.map((S) => S.over.t / SOL);
  ok(lost.length === SEEDS.length, 'a player who does nothing loses on every seed', `${lost.length} of ${SEEDS.length}`);
  ok(Math.min(...when) > 2.2, 'but never in the first two sols: there is time to learn', Math.min(...when).toFixed(2));
  ok(Math.max(...when) < 6.8, 'and always before the lander arrives', Math.max(...when).toFixed(2));
  ok(lost.every((S) => ['air', 'co2', 'cold', 'water', 'food'].includes(S.over.cause)), 'every loss has a cause the ending can explain', [...new Set(lost.map((S) => S.over.cause))].join(' '));
  console.log(`  idle: lost at sol ${Math.min(...when).toFixed(1)} to ${Math.max(...when).toFixed(1)}; causes ${[...new Set(lost.map((S) => S.over.cause))].join(', ')}`); }

// ---- 4. playing with care wins ----
{ const res = SEEDS.map((s) => careful(fresh(s))), won = res.filter((S) => S.over && S.over.win), hp = res.map((S) => S.health), brown = res.map((S) => S.stats.brownHours);
  ok(won.length === SEEDS.length, 'a careful player wins on every seed', `${won.length} of ${SEEDS.length}`);
  ok(Math.min(...hp) >= 70, 'with the crew in good health', Math.min(...hp).toFixed(0));
  ok(Math.max(...brown) < 4, 'and almost no time in brownout', Math.max(...brown).toFixed(1));
  ok(res.every((S) => S.mat >= 0 && S.stats.repairs >= S.stats.faults - 1), 'mending nearly everything that broke, without running out of parts');
  ok(res.every((S) => grade(S) >= 75), 'the end screen gives a careful win a high grade', Math.min(...res.map(grade)));
  console.log(`  careful: health ${Math.min(...hp).toFixed(0)} to ${Math.max(...hp).toFixed(0)}; brownout up to ${Math.max(...brown).toFixed(1)} h; lowest battery ${Math.min(...res.map((S) => S.stats.minBattery)).toFixed(0)} kWh`); }

// ---- 5. each half of playing well matters ----
{ const noShed = SEEDS.map((s) => careful(fresh(s), { shed: false })), noMend = SEEDS.map((s) => careful(fresh(s), { mend: false })), full = SEEDS.map((s) => careful(fresh(s)));
  const brownA = noShed.reduce((a, S) => a + S.stats.brownHours, 0) / SEEDS.length, brownB = full.reduce((a, S) => a + S.stats.brownHours, 0) / SEEDS.length;
  ok(brownA > brownB + 8, 'mending everything but never switching anything off means many hours of brownout in the storm', `${brownA.toFixed(1)} h against ${brownB.toFixed(1)} h`);
  const coldA = Math.max(...noShed.map((S) => S.stats.minRoom)), coldB = Math.min(...full.map((S) => S.stats.minRoom));
  ok(coldA < 12 && coldB > 15, 'the rooms get cold at night without load-shedding, and stay warm with it', `${coldA.toFixed(0)}°C against ${coldB.toFixed(0)}°C`);
  ok(Math.max(...noShed.map(grade)) <= Math.min(...full.map(grade)) - 12, 'and the end screen grades it clearly lower', `${Math.max(...noShed.map(grade))} against ${Math.min(...full.map(grade))}`);
  ok(noMend.filter((S) => !S.over.win).length === SEEDS.length, 'switching things off but mending nothing loses every time', noMend.filter((S) => !S.over.win).length);
  console.log(`  no load-shedding: ${noShed.filter((S) => !S.over.win).length} of ${SEEDS.length} lost, ${brownA.toFixed(0)} h brownout on average · no repairs: ${noMend.filter((S) => !S.over.win).length} of ${SEEDS.length} lost`); }

// ---- 6. the rules themselves ---- (the first run keeps the crew alive, so the whole mission plays out)
{ const S = fresh(9); S.hard = false; let storms = []; const seenF = [];
  while (!S.over) for (const e of surviveStep(S, DT)) { if (e.type === 'storm') storms.push(e.phase); if (e.type === 'fault') seenF.push(e.id); }
  ok(storms.join() === 'on,after', 'the storm is announced when it arrives and when it ends', storms.join());
  ok(seenF.length === S.stats.faults && seenF.length >= 5 && S.over.win, 'every breakdown is announced once', seenF.length);
  ok(surviveStep(S, 1).length === 0 && S.over, 'nothing more happens after the mission is over');
  const W = fresh(9); W.t = W.deadline - 0.05; W.plan = []; const ev = surviveStep(W, 0.1); ok(ev.some((e) => e.type === 'over' && e.win), 'reaching the end of sol 7 alive wins');
  const L = fresh(9); L.health = 0.5; L.o2 = 0; L.plan = []; L.fault.isru = true; const ev2 = surviveStep(L, 0.1); ok(ev2.some((e) => e.type === 'over' && !e.win && e.cause === 'air'), 'losing names its cause: no oxygen');
  ok(dangers({ o2: 5, co2: 4, habTemp: 2, water: 0, food: 3 }).join() === 'co2,cold,water', 'dangers are listed worst first');
  const P = fresh(9); ok(stormPhase(P).phase === 'before' && stormPhase(P, P.storm.t0 + 1).phase === 'on' && stormPhase(P, P.storm.t1 + 1).phase === 'after', 'the storm has a before, a during and an after');
  const E = createMars(4); E.health = 3; E.o2 = 0; E.on.isru = false; for (let i = 0; i < 50; i++) marsStep(E, 0.25); ok(E.health === 1 && !E.over, 'free exploring still cannot be lost'); }

// ---- 7. what the player is told matches the rules ----
{ const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8'), main = read('js/main.js'), mis = read('js/mars/mission.js');
  ok(main.includes(`tt('in ${MISSION.sols} sols')`) && main.includes(`tt('${MISSION.o2} kg in the tank')`) && main.includes(`'${MISSION.water} L'`) && main.includes(`'${MISSION.food} kg'`) && main.includes(`tt('${MISSION.parts} here · ${MISSION.cargoParts} in the lander')`), 'the mission page gives the real starting numbers');
  const third = MISSION.battery / 500; ok(third > 0.3 && third < 0.4, 'the battery really does start about a third full', third);
  ok(Object.keys(FAULTS).every((id) => new RegExp(`\\b${id}: \\{ name: tt\\(`).test(mis)), 'every breakdown has its name, its warning and its repair in words');
  ok(['air', 'co2', 'cold', 'water', 'food'].every((c) => new RegExp(`\\b${c}: \\{ title: tt\\(`).test(mis)), 'every way of losing has an ending that explains it');
  ok(Math.abs((MARS.O2_PP * 4 * MARS.SOL_H) / 24 - 3.45) < 0.05 && mis.includes('3.4 kg of oxygen a sol'), 'the ending quotes what the crew really breathe');
  ok(PLANT.O2_KG_H * MARS.SOL_H > (MARS.O2_PP * 4 * MARS.SOL_H) / 24, 'a working oxygen plant makes more than the crew breathe, so mending it is enough'); }

console.log(`${pass} checks passed${fail ? ', ' + fail + ' FAILED' : ''}`);
process.exitCode = fail ? 1 : 0;
