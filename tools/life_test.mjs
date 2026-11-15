// Checks the farming, water-extraction and closed-loop calculations. Usage: node tools/life_test.mjs
// Every check prints PASS or FAIL; the script exits with code 1 if anything fails.
import { createSim, step, computeFlows, harvest, cookBatch, serialize, deserialize } from '../js/sim.js';
import { CROPS, LIGHT, WX, TECH, FARM_ROOMS, subTemp, planBatch, startBatch, makeBatch, tickBatch, batchKw, trapEta, rackState, farmEnv, plant, research, canResearch, startExperiment, harvestRoom } from '../js/life.js';
import { K, MINE, MODES } from '../js/config.js';
import { patchAt, scoop, dump, iceLeft } from '../js/life.js';

let fails = 0;
const ok = (name, cond, info = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${info ? '  — ' + info : ''}`); if (!cond) fails++; };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const sim = (mode = 'pilot') => { const S = createSim(mode, 7); S.zone = 'deep'; return S; };
const run = (S, hours, each) => { for (let t = 0; t < hours - 1e-9; t += 0.05) { each?.(S); step(S, 0.05); } };

console.log('--- ice physics');
ok('ice turns to vapour at 0 °C at the triple point (611 Pa)', near(subTemp(611), 0, 0.01));
ok('lower pressure, lower sublimation temperature', subTemp(1) < subTemp(10) && subTemp(10) < subTemp(100) && subTemp(100) < subTemp(611), `${subTemp(1).toFixed(0)} < ${subTemp(10).toFixed(0)} < ${subTemp(100).toFixed(0)} < 0`);
{
  const S = sim(), good = planBatch(S, { mode: 'ice', method: 'elec', n: 2, kw: 4, hours: 9, pa: 10 });
  const ice = 2 * WX.CAN_KG * WX.ICE_FRAC;
  ok('water out never exceeds the ice that went in', good.water <= ice + 1e-9, `${good.water.toFixed(2)} L from ${ice.toFixed(2)} kg of ice`);
  ok('a sensible recipe recovers most of the ice', good.eff > 0.7 && good.eff <= trapEta(S, 10) + 1e-9, `${Math.round(good.eff * 100)}% (cold trap limit ${Math.round(trapEta(S, 10) * 100)}%)`);
  // energy balance: heat delivered must cover warming the soil and turning the ice to vapour
  const b = makeBatch(S, { mode: 'ice', method: 'elec', n: 2, kw: 4, hours: 9, pa: 10 }); let heatIn = 0; while (b.left > 1e-6) { const T0 = b.T; tickBatch(S, b, 0.1); heatIn += 4 * WX.METHODS.elec.eta * 0.1 * 3600; }
  const needed = (b.T - WX.T_STORE) * b.M * WX.C_REG + b.sub * WX.L_SUB;
  ok('energy balance: heat in covers warming plus sublimation', heatIn >= needed - 1 && needed > heatIn * 0.6, `in ${(heatIn / 3600).toFixed(1)} kWh, stored in soil and vapour ${(needed / 3600).toFixed(1)} kWh, rest lost through the walls`);
  ok('mass balance: sublimated = caught + lost', near(b.sub, b.got + b.lost, 1e-6) && near(b.sub + b.ice, b.max, 1e-6));
  const mud = planBatch(S, { mode: 'ice', method: 'elec', n: 2, kw: 4, hours: 9, pa: 800 });
  ok('above 611 Pa the ice melts into the soil: far less water', mud.water < good.water * 0.5 && mud.warn.length > 0, `${mud.water.toFixed(1)} L vs ${good.water.toFixed(1)} L`);
  const short = planBatch(S, { mode: 'ice', method: 'elec', n: 2, kw: 2, hours: 2, pa: 10 });
  ok('too little heat or time leaves ice in the soil', short.left > 1 && short.warn.some((w) => w.includes('never leaves')), `${short.left.toFixed(1)} kg left`);
  const fast = planBatch(S, { mode: 'ice', method: 'mw', n: 2, kw: 8, hours: 9, pa: 10 });
  ok('too much power overwhelms the cold trap', fast.eff < good.eff - 0.05, `${Math.round(fast.eff * 100)}% vs ${Math.round(good.eff * 100)}%`);
  const mwGentle = planBatch(S, { mode: 'ice', method: 'mw', n: 2, kw: 3, hours: 9, pa: 10 });
  ok('microwaves need less electricity than heater rods for the same water', mwGentle.kwh < good.kwh && mwGentle.eff > 0.7, `${mwGentle.kwh.toFixed(0)} kWh vs ${good.kwh.toFixed(0)} kWh`);
  ok('the Sun mirror gives nothing at night', planBatch(S, { mode: 'ice', method: 'solar', n: 1, kw: 1, hours: 8, pa: 10 }, 0).water < 0.01);
  const solar = planBatch(S, { mode: 'ice', method: 'solar', n: 1, kw: 1, hours: 8, pa: 10 }, 1);
  ok('the Sun mirror works in daylight and draws only pump and chiller power', solar.water > 3 && solar.peakKw < 2, `${solar.water.toFixed(1)} L at ${solar.peakKw.toFixed(1)} kW`);
  S.wx.seal = 0.6; ok('a damaged seal loses vapour', planBatch(S, { mode: 'ice', method: 'elec', n: 2, kw: 4, hours: 9, pa: 10 }).water < good.water * 0.7); S.wx.seal = 1;
  const ilm = planBatch(S, { mode: 'ilm', kw: 8, hours: 10 }), maxIlm = WX.ILM_KG * WX.ILM_FRAC * WX.ILM_O * (18 / 16);
  ok('water from rock: chemistry caps the yield', ilm.water > 0.5 && ilm.water <= maxIlm * 0.8 + 1e-9, `${ilm.water.toFixed(2)} L of at most ${maxIlm.toFixed(2)} L`);
  ok('water from rock costs far more energy per litre than ice', ilm.kwh / ilm.water > 8 * (good.kwh / good.water), `${(ilm.kwh / ilm.water).toFixed(0)} vs ${(good.kwh / good.water).toFixed(1)} kWh per litre`);
  ok('water from rock does nothing below 1,000 °C', planBatch(S, { mode: 'ilm', kw: 4, hours: 3 }).water === 0);
  ok('a run that makes no water earns no research', (() => { const T = sim(); const sci0 = T.sci; startBatch(T, { mode: 'ilm', kw: 4, hours: 3 }); run(T, 3.5); return !T.wx.batch && T.wx.last && T.wx.last.water === 0 && T.sci === sci0 && !T.wx.tried.ilm; })());
}
console.log('--- water plant in the running simulation');
{
  const S = sim(); S.wx.ice = 3; S.battery = 300; const w0 = S.water;
  ok('cannot start without canisters', (() => { const T = sim(); return startBatch(T, { mode: 'ice', method: 'elec', n: 1, kw: 4, hours: 4, pa: 10 }); })() === 'noice');
  ok('starts and takes the canisters', startBatch(S, { mode: 'ice', method: 'elec', n: 3, kw: 4, hours: 13, pa: 10 }) === 'ok' && S.wx.ice === 0);
  computeFlows(S); ok('the batch draws power', near(S.flow.use.wx, batchKw(S.wx.batch), 1e-9) && S.flow.use.wx > 4, `${S.flow.use.wx.toFixed(1)} kW`);
  S.lv.farm = 0; S.lv.o2gen = 0; const used0 = S.water; run(S, 13.2);
  ok('finishes, stores the water, reports the result', !S.wx.batch && S.wx.last && S.wx.last.water > 10 && S.pending.includes('wxdone'), `${S.wx.last?.water.toFixed(1)} L, ${Math.round((S.wx.last?.eff || 0) * 100)}%`);
  ok('first run with a new heating method earns research', S.sci >= 1 && S.wx.tried.elec);
  ok('equipment wears', S.wx.cond < 1);
}
console.log('--- crops');
{
  for (const id in CROPS) {
    const S = sim(); S.nutri = 5; S.racks.forEach((r, i) => plant(S, i, i === 0 ? id : null)); S.racks[0].room = 'potato'; S.farmT.potato = (CROPS[id].t[0] + CROPS[id].t[1]) / 2;
    S.lv.farm = CROPS[id].light > 1 ? 3 : CROPS[id].light > 0.5 ? 2 : 1; let h = 0; while (!S.racks[0].ripe && h < 200) { step(S, 0.05); h += 0.05; }
    const lightF = Math.min(1.5, LIGHT[S.lv.farm] / CROPS[id].light), expect = (CROPS[id].days * 24) / (lightF * 0.9 * 1.15);
    ok(`${CROPS[id].name.padEnd(11)} grows on schedule (${CROPS[id].days} game days = ${CROPS[id].real} real days at standard light)`, near(h, expect, expect * 0.12), `ripe in ${(h / 24).toFixed(2)} days at lamp level ${S.lv.farm}, expected ${(expect / 24).toFixed(2)}`);
  }
  const S = sim(); computeFlows(S);
  const o2 = S.flow.o2Farm, need = K.O2_PER_DAY;
  ok('six racks supplement the air but cannot replace the Oxygen Maker', o2 > 0.02 && o2 < need * 0.5, `${o2.toFixed(3)} of ${need} kg a day at lamp level ${S.lv.farm}`);
  S.lv.farm = 3; computeFlows(S); ok('even at full light plants give under half of one person\'s oxygen', S.flow.o2Farm < need * 0.5, `${S.flow.o2Farm.toFixed(3)} kg a day`);
  ok('plants take in 1.375 kg of CO2 for every kg of oxygen', near(S.flow.life.co2Fix, S.flow.o2Farm * 1.375, 1e-9));
  ok('farm power: one lamp per planted rack', near(S.flow.use.farm, 6 * LIGHT[3] + Math.abs(S.farmT.tomato - 20) * 0.05, 1e-9), `${S.flow.use.farm.toFixed(2)} kW`);
  plant(S, 0, null); plant(S, 1, null); computeFlows(S); ok('empty racks cost no power', near(S.flow.use.farm, 4 * LIGHT[3] + 0.2, 1e-9));
  // Liebig: the scarcest thing sets the pace
  const T = sim(); T.lv.farm = 1; computeFlows(T); const st = rackState(T, T.racks[0], T.flow.life.env.potato);
  ok('dim lamps: growth is limited by light', st.lim === 'light' && near(st.f.light, 0.5, 1e-9));
  T.lv.farm = 3; T.farmT.potato = 34; computeFlows(T); ok('too hot for potatoes: limited by warmth', rackState(T, T.racks[0], T.flow.life.env.potato).lim === 'warmth');
  T.farmT.potato = 20; T.nutri = 0; computeFlows(T); ok('no plant food: limited by food', rackState(T, T.racks[0], T.flow.life.env.potato).lim === 'food');
  T.nutri = 1; T.f.pump = 'potato'; computeFlows(T); ok('broken pump: limited by water', rackState(T, T.racks[0], T.flow.life.env.potato).lim === 'water'); T.f.pump = null;
  const D = sim(); D.lv.farm = 0; run(D, 30); ok('lamps off: plants sicken', D.racks[0].hp < 0.7, `health ${D.racks[0].hp.toFixed(2)}`);
  const Z = sim(); Z.rooms.potato.frozen = true; run(Z, 1); ok('a frozen farm kills its crop', Z.racks.filter((r) => r.room === 'potato').every((r) => r.hp <= 0.1 && r.g === 0));
  // harvest routing
  const H = sim(); H.racks.forEach((r, i) => { plant(H, i, ['potato', 'lettuce', 'herbs', 'arabidopsis', 'wheat', 'peas'][i]); r.ripe = 1; r.g = 1; }); const raw0 = H.raw, meals0 = H.meals;
  const a = harvest(H, 'potato', 1), b2 = harvest(H, 'tomato', 1);
  ok('staples go to raw food, salad to meals, herbs to the kitchen, thale cress to research', near(H.raw - raw0, 3.55 + 2.05 + 1.22, 1e-9) && near(H.meals - meals0, 0.21, 1e-9) && H.herbs === 1 && a.sci + b2.sci === 6, `raw +${(H.raw - raw0).toFixed(1)}, meals +${(H.meals - meals0).toFixed(2)}, herbs ${H.herbs}, research ${H.sci}`);
  ok('racks replant themselves after picking', H.racks.every((r) => !r.ripe && r.g === 0 && r.kind));
  H.raw = 10; const made = cookBatch(H); ok('herbs make a cooked batch a fifth bigger', made === 12 && H.herbs === 0, `${made} meals from 10 raw`);
}
console.log('--- closed loop');
{
  const S = sim(); S.lv.farm = 2; S.lv.recycler = 2; computeFlows(S); const F = S.flow;
  ok('plants drink, and the recycler returns their share', F.wFarm > 2 && near(F.farmBack, F.rate, 1e-9), `${F.wFarm.toFixed(1)} L a day, ${Math.round(F.farmBack * 100)}% back`);
  S.tech.cond = true; computeFlows(S); ok('condensers return 97% of plant water', near(S.flow.farmBack, 0.97, 1e-9) && S.flow.wNet > F.wNet);
  const N = sim('commander'); N.lv.farm = 3; const n0 = N.nutri; run(N, 24); ok('plant food runs down when the farms work hard', N.nutri < n0, `${n0} -> ${N.nutri.toFixed(2)} kg in a day`);
  const P = sim(); P.helpers.push({ id: 'x', kind: 'human', name: 'X', role: 'idle' }); P.helpers.push({ id: 'y', kind: 'human', name: 'Y', role: 'idle' }); computeFlows(P); const one = sim(); computeFlows(one);
  ok('more people breathe out more CO2, and waste gives more plant food', P.flow.co2Out > one.flow.co2Out * 2.9 && P.flow.life.nutriGain > one.flow.life.nutriGain && P.flow.life.env.potato.co2 > one.flow.life.env.potato.co2);
  const E = sim(); E.lv.o2gen = 2; computeFlows(E); ok('electrolysis: 1.125 L of water and 0.125 kg of hydrogen per kg of oxygen', near(E.flow.h2Made, E.flow.o2Elec * 0.125, 1e-9) && near(K.H2O_PER_KG_O2, 1.125, 1e-9));
  const M = sim(); M.lv.recycler = 0; M.rng = () => 0; run(M, 2); ok('no drying of the air: mold starts in the tomato farm', M.f.mold === true && M.pending.includes('damp'));
}
console.log('--- experiment and research');
{
  const S = sim(); S.lv.farm = 1; ok('experiment starts', startExperiment(S, 'potato')); run(S, 13);
  ok('finishes in about half a game day and earns 3 research', S.exp.done && S.sci >= 3, `research ${S.sci}`);
  ok('soil beds need the experiment and enough research', !canResearch(sim(), 'soil') && (S.sci = 9, S.mat = 20, canResearch(S, 'soil')));
  const n = S.racks.length; research(S, 'soil'); ok('soil beds add one slower rack per farm', S.racks.length === n + 2 && S.racks.slice(-2).every((r) => r.soil));
  research(S, 'led'); const kw = (() => { computeFlows(S); return S.flow.use.farm; })(); ok('tuned LEDs cut lamp power by a quarter', near(kw, 6 * LIGHT[1] * 0.75 + 0.2, 1e-9), `${kw.toFixed(2)} kW`);
  ok('every technology has a cost and a description', Object.values(TECH).every((t) => t.sci > 0 && t.mat > 0 && t.text.length > 40));
}
console.log('--- polar ice mine');
{
  const S = sim(), p0 = S.mine.patches[0], total = iceLeft(S);
  ok('six icy patches inside the crater, all within the digger\'s cable', S.mine.patches.length === 6 && S.mine.patches.every((p) => Math.hypot(p.x - MINE.x, p.z - MINE.z) < MINE.tether - 4));
  ok('the bucket finds a patch only when it is over one', patchAt(S, p0.x + 1, p0.z - 1) === 0 && patchAt(S, MINE.x, MINE.z) === -1);
  ok('a scoop takes one from the patch', scoop(S, 0) && S.mine.patches[0].left === p0.left && iceLeft(S) === total - 1 && S.mine.dug === 1);
  const a = dump(S, 1), b = dump(S, 2), c = dump(S, 1);
  ok('two scoops fill one canister; a half-full hopper keeps its scoop', a.cans === 0 && b.cans === 1 && c.cans === 1 && S.mine.hopper === 0 && S.mine.cans === 2, `${S.mine.cans} canisters from 4 scoops`);
  ok('the first canister you dig earns 2 research, later ones none', b.sci === 2 && c.sci === 0 && S.sci === 2);
  for (let i = 0; i < 40; i++) scoop(S, 0); ok('a patch runs out', S.mine.patches[0].left === 0 && patchAt(S, p0.x, p0.z) === -1 && !scoop(S, 0));
  const U = sim('unlimited'), u0 = iceLeft(U); for (let i = 0; i < 30; i++) scoop(U, 1); ok('in Unlimited mode the ice never runs out', iceLeft(U) === u0 && U.mine.dug === 30);
  ok('the mine holds far more water than the base starts with', total * 0.5 * 120 * 0.056 > 100, `${total} scoops = ${Math.floor(total / 2)} canisters = about ${Math.round((total / 2) * 120 * 0.056)} L of ice`);
  ok('every mode starts with at least one canister at the base, to learn the Water Plant', Object.values(MODES).every((m) => m.ice >= 1));
  const T = deserialize(JSON.parse(JSON.stringify(serialize(S)))); ok('save and load keep the mine', T.mine.patches[0].left === 0 && T.mine.cans === 2 && T.mine.seen === true && T.mine.patches.every((p) => Number.isFinite(p.left)));
}
console.log('--- saving');
{
  const S = sim(); S.wx.ice = 2; plant(S, 0, 'wheat'); S.tech.led = true; startBatch(S, { mode: 'ice', method: 'mw', n: 1, kw: 3, hours: 4, pa: 10 }); run(S, 1);
  const T = deserialize(JSON.parse(JSON.stringify(serialize(S))));
  ok('save and load keep racks, research and a running batch', T.racks[0].kind === 'wheat' && T.tech.led && T.wx.batch && near(T.wx.batch.left, S.wx.batch.left, 1e-9) && T.wx.ice === 1);
  const old = serialize(sim()); delete old.racks; delete old.wx; delete old.tech; delete old.mine; old.crops = { potato: { g: 0.5, ripe: 1, hp: 1 } };
  const U = deserialize(JSON.parse(JSON.stringify(old))); let threw = false; try { run(U, 2); } catch (e) { threw = true; console.log(e); }
  ok('a save from before this update still loads and runs', !threw && U.racks.length === 6 && U.wx && U.tech && U.mine && U.mine.patches.length === 6);
}
console.log(fails ? `\n${fails} check(s) FAILED` : '\nAll checks passed.');
process.exit(fails ? 1 : 0);
