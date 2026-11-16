// Checks the Mars survival mission: node tools/mars_survive_test.mjs
// The two things that matter most: a player who does nothing loses, and a player who plays with care wins.
// Both are played out here, hour by hour, for many seeds.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MARS, LOADS, PLANT, createMars, marsStep } from '../js/mars/sim.js';
import { MISSION, FAULTS, SHED, startSurvival, surviveStep, stormPhase, repairHours, canRepair, repair, unpackCargo, dangers, grade, exploreUpkeep, TANK_LEFT, canRest, shedPlan, nightPlan, brokenAvg, promptness, PROMPT } from '../js/mars/survive.js';
import { marsSerialize, marsDeserialize, marsFlows } from '../js/mars/sim.js';

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

// ---- 8. free exploring looks after itself, however long you stay ----
{ const noon = (S) => { S.t = 12 * (SOL / 24); S.flow = marsFlows(S); return S; };
  const A = noon(createMars(2)); A.panelDust = 0.3; ok(exploreUpkeep(A).join() === 'brush' && A.panelDust === 0.03, 'very dusty panels are brushed by the crew, by day');
  const B = createMars(2); B.t = 1 * (SOL / 24); B.flow = marsFlows(B); B.panelDust = 0.3; ok(exploreUpkeep(B).length === 0 && B.panelDust === 0.3, 'not at night');
  const C = noon(createMars(2)); C.panelDust = 0.3; C.tau = 4; ok(exploreUpkeep(C).length === 0, 'and not in a storm, when it would be wasted');
  const D = noon(createMars(2)); D.panelDust = 0.2; ok(exploreUpkeep(D).length === 0, 'a little dust is left for the player to deal with');
  const E = noon(createMars(2)); E.food = 59; ok(exploreUpkeep(E).join() === 'food' && E.food === 659, 'a supply lander brings food before the store runs out');
  const H = noon(fresh(2)); H.panelDust = 0.5; H.food = 5; ok(exploreUpkeep(H).length === 0 && H.panelDust === 0.5 && H.food === 5, 'none of this happens in the survival mission: there you are on your own');
  const W = noon(createMars(2)); W.battery = 40; W.t = 22 * (SOL / 24); W.flow = marsFlows(W); ok(exploreUpkeep(W).join() === 'shed' && SHED.every((k) => !W.on[k]) && W.on.lifesupport && W.on.thermal && W.on.isru && W.on.water, 'with the battery nearly empty at night the crew switch off what can wait, and nothing that keeps people alive');
  ok(exploreUpkeep(W).length === 0, 'once'); W.battery = 400; W.t = 36.7 * (SOL / 24); W.flow = marsFlows(W); ok(W.flow.net > 0 && exploreUpkeep(W).join() === 'unshed' && SHED.every((k) => W.on[k]), 'and switch it all back on when the Sun has filled the battery');
  const P2 = noon(createMars(2)); P2.on.lab = false; P2.battery = 40; P2.t = 22 * (SOL / 24); P2.flow = marsFlows(P2); exploreUpkeep(P2); P2.battery = 400; P2.t = 36.7 * (SOL / 24); P2.flow = marsFlows(P2); exploreUpkeep(P2); ok(P2.on.lab === false && P2.on.greenhouse === true, 'a building you switched off yourself stays off');
  const Y = createMars(6); let brown = 0, minFood = 1e9, maxDust = 0, brushes = 0, drops = 0, sheds = 0, minHealth = 100, minRoom = 99; for (let i = 0; i < 668 * SOL * 10; i++) { const F = marsStep(Y, 0.1); if (F.eff < 1) brown += 0.1; for (const e of exploreUpkeep(Y)) { if (e === 'brush') brushes++; else if (e === 'food') drops++; else if (e === 'shed') sheds++; } minFood = Math.min(minFood, Y.food); maxDust = Math.max(maxDust, Y.panelDust); minHealth = Math.min(minHealth, Y.health); minRoom = Math.min(minRoom, Y.habTemp); }
  ok(brown < 40 && minHealth > 90 && minRoom > 12, 'a whole Mars year of exploring, winter included: the power holds, the rooms stay warm and the crew stay well', `${brown.toFixed(1)} h of brownout, rooms down to ${minRoom.toFixed(0)}°C, health down to ${minHealth.toFixed(0)}`);
  ok(sheds > 20, 'because the crew shed load on the long winter nights', sheds);
  ok(minFood > 0 && drops >= 1 && drops <= 4, 'the food never runs out', `lowest ${minFood.toFixed(0)} kg, ${drops} supply landers`);
  ok(maxDust <= 0.26 && brushes >= 1, 'and the panels never get dirtier than a quarter', `${(maxDust * 100).toFixed(0)}%, brushed ${brushes} times`);
  console.log(`  a year of exploring: ${brown.toFixed(1)} h brownout, load shed on ${sheds} nights, panels brushed ${brushes} times, ${drops} food deliveries`); }

// ---- 9. a loaded game carries on the same random sequence ----
{ const A = createMars(41); const first = [A.rng(), A.rng(), A.rng()]; const B = marsDeserialize(JSON.parse(JSON.stringify(marsSerialize(A)))); const nextA = [A.rng(), A.rng()], nextB = [B.rng(), B.rng()];
  ok(nextA[0] === nextB[0] && nextA[1] === nextB[1], 'after loading, the next random numbers are the ones the saved game would have had');
  ok(!first.includes(nextB[0]), 'not the sequence from the start again'); const C = createMars(41); ok(C.rng() === first[0], 'and the same seed still gives the same start');
  const M = fresh(41), M2 = startSurvival(createMars(41)); ok(JSON.stringify(M.plan) === JSON.stringify(M2.plan), 'so a seed still repeats a mission exactly'); }

// ---- 10. a switched-off building does not break; a tank machine may rest only while its tank holds enough ----
{ let hit = 0, later = 0, total = 0;
  for (const seed of SEEDS) { const S = fresh(seed), first = S.plan.find((p) => p.id !== 'battery' && p.id !== 'solar'); if (!first) continue; total++;
    S.on[first.id] = false; spend(S, first.t - S.t + 0.5); if (S.fault[first.id]) hit++;
    if (S.plan.some((p) => p.id === first.id && p.t > first.t)) later++; }
  ok(total > 10 && hit === 0, 'a breakdown never hits a building that is switched off', `${hit} of ${total}`);
  ok(later > 0, 'it comes later instead, if the building is running by then', `${later} of ${total} moved later`); }
{ const S = fresh(7), F = marsFlows(S);
  ok(TANK_LEFT.isru(S, F) > 0 && canRest(S, F, 'isru') === TANK_LEFT.isru(S, F) > 1.5 * SOL, 'the oxygen plant may rest exactly while the tank lasts over a sol and a half', `${TANK_LEFT.isru(S, F).toFixed(0)} h`);
  S.o2 = 1; ok(!canRest(S, marsFlows(S), 'isru'), 'and not with 1 kg left in the tank');
  S.water = 500; ok(canRest(S, marsFlows(S), 'water'), 'a full water tank lets the ice well rest'); }

// ---- the night ahead, and what to switch off for it ----
{ const at = (S, hour, batt) => { S.t = hour * (SOL / 24); S.battery = batt; S.flow = marsFlows(S); return S; };
  const A = at(fresh(3), 16, 120), np = nightPlan(A, A.flow);
  ok(np && np.need > np.have && np.gap > 5 && np.nightH > 8 && np.toSet > 0 && np.toSet < 6, 'late afternoon with a low battery: the night will not be covered', np && `${np.have.toFixed(0)} kWh held, ${np.need.toFixed(0)} needed`);
  ok(nightPlan(at(fresh(3), 16, 500), A.flow) === null || nightPlan(at(fresh(3), 16, 500), marsFlows(at(fresh(3), 16, 500))) === null, 'with a full battery it is');
  ok(nightPlan(at(fresh(3), 10, 120), marsFlows(at(fresh(3), 10, 120))) === null, 'in the morning it is too early to say (outside a storm)');
  const M = fresh(3); M.tau = 5; at(M, 10, 120); ok(nightPlan(M, M.flow, 24) !== null, 'but in a storm, when the panels make little, it is said all day long');
  const N = at(fresh(3), 23, 120); ok(nightPlan(N, N.flow, 24) === null, 'and at night it is too late: then the battery warning speaks');
  const p = shedPlan(A, A.flow, np.cut);
  ok(p.list.length >= 1 && p.list.length <= 4 && p.list.every((k) => SHED.includes(k) || k === 'isru' || k === 'water') && !p.list.includes('lifesupport') && !p.list.includes('thermal'), 'the list for the night: at most four, and never life support or heat', p.list.join(' '));
  ok(p.saved >= np.cut - 1e-9 || !p.more, 'it saves what the night is short by, or it is all there is');
  for (const k of p.list) A.on[k] = false; A.flow = marsFlows(A); const after = nightPlan(A, A.flow);
  ok(after === null || after.need < np.need, 'with those off, the night needs less', after ? `still ${after.need.toFixed(0)} kWh` : 'covered');
  const D = at(fresh(3), 16, 120); D.deadline = D.t + 3; ok(nightPlan(D, D.flow) === null || nightPlan(D, D.flow).nightH <= 3, 'a mission that ends tonight only counts the hours that are left');
  const Z = at(fresh(3), 12, 200), z = shedPlan(Z, { ...Z.flow, net: -3 }); ok(z.list.length >= 1 && z.saved >= 3, 'short by 3 kW: the first thing on the list covers it', z.list.join(' ')); }

// ---- the repairs share of the score is for mending promptly ----
{ const mk = () => { const S = fresh(5); S.plan = []; S.mat = 9; S.stats.faults = 0; S.stats.repairs = 0; S.stats.brokenHours = 0; return S; };
  const brk = (S, id) => { S.fault[id] = true; S.faultAt[id] = S.t; S.stats.faults++; };
  const A = mk(); ok(promptness(A) === 1 && brokenAvg(A) === 0, 'nothing broke: full marks for repairs');
  brk(A, 'comms'); A.t += 1; ok(repair(A, 'comms') && Math.abs(brokenAvg(A) - 1) < 1e-9 && promptness(A) === 1, 'mended after one hour: full marks', brokenAvg(A));
  const B = mk(); brk(B, 'comms'); B.t += PROMPT.none; repair(B, 'comms'); ok(promptness(B) < 1e-9, `mended after ${PROMPT.none} hours: no marks for repairs`, promptness(B));
  const C = mk(); brk(C, 'comms'); C.t += (PROMPT.full + PROMPT.none) / 2; repair(C, 'comms'); ok(Math.abs(promptness(C) - 0.5) < 1e-9, 'half way between: half marks', promptness(C));
  const D = mk(); brk(D, 'comms'); D.t += 20; ok(brokenAvg(D) === 20 && promptness(D) === 0, 'something left broken counts for as long as it has stood broken', brokenAvg(D));
  const E = mk(); brk(E, 'comms'); E.t += 1; repair(E, 'comms'); brk(E, 'greenhouse'); E.t += 9; repair(E, 'greenhouse'); ok(Math.abs(brokenAvg(E) - 5) < 1e-9 && promptness(E) > 0.7 && promptness(E) < 0.8, 'two breakdowns, one mended fast and one slowly: the average counts', brokenAvg(E));
  const fast = mk(), slow = mk(); for (const S of [fast, slow]) { S.stats.minHealth = 100; S.over = { win: true }; } brk(fast, 'comms'); fast.t += 1; repair(fast, 'comms'); brk(slow, 'comms'); slow.t += 14; repair(slow, 'comms');
  ok(grade(fast) === 100 && grade(slow) === 85, 'the same mission mended at once scores 100, mended half a sol late 85', `${grade(fast)} and ${grade(slow)}`);
  const P = mk(); P.faultAt = undefined; P.fault.thermal = true; P.stats.faults = 1; ok(repair(P, 'thermal') && promptness(P) === 1, 'a practice repair with no clock on it still works'); }

console.log(`${pass} checks passed${fail ? ', ' + fail + ' FAILED' : ''}`);
process.exitCode = fail ? 1 : 0;
