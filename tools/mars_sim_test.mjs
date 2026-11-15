// Checks the Mars outpost simulation's rules as a whole: node tools/mars_sim_test.mjs
// tools/mars_test.mjs checks the data, the science numbers and each building. This file checks what has to hold however
// the game is played: nothing goes out of its limits or turns into NaN, the answer does not depend on the size of the
// time step, a whole Mars year runs, the seasons and the clock behave, a brownout shares power fairly, and a saved game
// carries on exactly where it stopped. Only js/mars/sim.js is tested; no drawing, no page.
import { MARS, LOADS, PLANT, createMars, marsSun, marsFlows, marsStep, airTemp, lightMinutes, sitePressure, marsClock, marsSerialize, marsDeserialize, skyFactor, directFactor } from '../js/mars/sim.js';

let pass = 0, fail = 0;
const ok = (cond, name, got) => { if (cond) pass++; else { fail++; console.log('  FAIL', name, got === undefined ? '' : '→ ' + got); } };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const SOL = MARS.SOL_H, hourOfSol = (h) => h * (SOL / 24);   // Mars clock hour → Earth hours since midnight of sol 1
const run = (S, hours, dt, each) => { for (let t = 0; t < hours - 1e-9; t += dt) { const F = marsStep(S, Math.min(dt, hours - t)); if (each) each(S, F); } return S; };
const fresh = (change) => { const S = createMars(1); if (change) change(S); S.flow = marsFlows(S); return S; };
// a small fixed random sequence, so the test is the same every time
let seed = 12345; const rnd = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; };

// ---------- 1. limits that hold however the base is run ----------
// 60 random outposts: random crew, dust, switches and starting stores, ten sols each, checked after every step.
{ const bad = new Map(); const note = (k, v) => { if (!bad.has(k)) bad.set(k, v); };
  for (let n = 0; n < 60; n++) {
    const S = fresh((q) => { q.crew = 1 + Math.floor(rnd() * 8); q.tau = q.tauWant = [0.3, 0.45, 1.5, 4, 10.8][n % 5]; for (const k in LOADS) q.on[k] = rnd() > 0.25;
      q.battery = rnd() * q.batteryCap; q.o2 = rnd() * q.o2Cap; q.water = rnd() * q.waterCap; q.food = rnd() * 40; q.panelDust = rnd() * 0.6; q.zone = rnd() > 0.5 ? 'top' : 'in'; q.car.charging = rnd() > 0.5; q.car.charge = rnd(); });
    run(S, 10 * SOL, 0.25, (s, F) => {
      for (const k of ['battery', 'o2', 'water', 'food', 'health', 'panelDust', 'co2', 'habTemp', 'tau', 'dose', 't']) if (!Number.isFinite(s[k])) note('every number stays a real number', `${k} = ${s[k]}`);
      for (const k of ['supply', 'demand', 'net', 'eff', 'solar', 'o2Net', 'wNet', 'foodNet', 'tempC']) if (!Number.isFinite(F[k])) note('every flow stays a real number', `${k} = ${F[k]}`);
      if (s.battery < 0 || s.battery > s.batteryCap + 1e-9) note('the battery stays between empty and full', s.battery);
      if (s.o2 < 0 || s.o2 > s.o2Cap + 1e-9) note('oxygen stays between empty and the tank size', s.o2);
      if (s.water < 0 || s.water > s.waterCap + 1e-9) note('water stays between empty and the tank size', s.water);
      if (s.food < 0) note('food never goes below zero', s.food);
      if (s.health < 1 || s.health > 100) note('health stays between 1 and 100 (this preview has no ending)', s.health);
      if (s.panelDust < 0 || s.panelDust > 0.6 + 1e-9) note('dust on the panels stays between 0 and 60%', s.panelDust);
      if (s.co2 < 0.05 - 1e-9 || s.co2 > 8 + 1e-9) note('stale air stays inside its range', s.co2);
      if (F.eff < 0 || F.eff > 1) note('machines never run above full power or below none', F.eff);
      if (s.habTemp > 21 + 1e-6 || s.habTemp < MARS.T_MIN - 1) note('the rooms are never warmer than the heat pump or colder than the night outside', s.habTemp);
      if (s.car.charge < 0 || s.car.charge > 1) note('the rover battery stays between 0 and 100%', s.car.charge); }); }
  for (const name of ['every number stays a real number', 'every flow stays a real number', 'the battery stays between empty and full', 'oxygen stays between empty and the tank size', 'water stays between empty and the tank size', 'food never goes below zero', 'health stays between 1 and 100 (this preview has no ending)', 'dust on the panels stays between 0 and 60%', 'stale air stays inside its range', 'machines never run above full power or below none', 'the rooms are never warmer than the heat pump or colder than the night outside', 'the rover battery stays between 0 and 100%'])
    ok(!bad.has(name), name + ' (60 random outposts, 10 sols each)', bad.get(name)); }

// ---------- 2. the answer does not depend on the size of the time step ----------
// The game steps by one frame (about 0.001 h at ×1, a few hundredths at ×4), and "Rest until morning" runs up to about
// 14 h in 40 slices: 0.35 h each. Both must end where tiny steps end. Each step uses the sunlight at its start, so long
// steps lose a little solar power by day (morning light is undercounted, and the afternoon surplus is lost once the battery is full):
// about 7 kWh in two sols at 0.35 h, under 2% of the battery. The limits below allow for that and nothing more.
{ const keys = [['battery', 10], ['o2', 0.05], ['water', 0.2], ['food', 0.02], ['habTemp', 0.2], ['co2', 0.02], ['panelDust', 1e-4], ['health', 0.6]];
  for (const [label, change] of [['a clear sky', null], ['a regional dust storm', (q) => { q.tau = q.tauWant = 4; }], ['the heat pump off', (q) => { q.on.thermal = false; }]]) {
    const ref = run(fresh(change), 2 * SOL, 0.002), worst = [];
    for (const dt of [0.05, 0.35]) { const s = run(fresh(change), 2 * SOL, dt); for (const [k, tol] of keys) if (Math.abs(s[k] - ref[k]) > tol) worst.push(`${k} differs by ${(s[k] - ref[k]).toFixed(3)} at ${dt} h`); }
    ok(!worst.length, `two sols under ${label}: frame-sized steps and rest-sized steps end where tiny steps end`, worst.join(', ')); }
  // a night's rest: no sunlight to miss, so 40 slices must match tiny steps almost exactly
  const night = () => fresh((q) => { q.t = hourOfSol(20); }), dawn = marsSun(night()).rise, rest = (24 - 20 + dawn - 0.25) * (SOL / 24), slices = Math.max(4, Math.min(40, Math.ceil(rest / 0.25)));   // from 20:00 to just before sunrise, sliced as js/mars/game.js does
  const a = run(night(), rest, 0.002), b = run(night(), rest, rest / slices);
  const off = ['battery', 'o2', 'water', 'food', 'habTemp', 'co2', 'health'].filter((k) => Math.abs(a[k] - b[k]) > (k === 'battery' ? 0.5 : 0.05));   // the heating load changes as the night cools: a fraction of a kWh
  ok(!off.length, `"Rest until morning" in ${slices} slices ends where tiny steps end`, off.map((k) => `${k} ${(b[k] - a[k]).toFixed(3)}`).join(', ')); }

// ---------- 3. one whole Mars year ----------
{ const S = createMars(1), startLs = marsSun(S).ls; let brown = 0, lowSol = Infinity, minBatt = Infinity, nan = false;
  run(S, MARS.YEAR_SOLS * SOL, 0.5, (s, F) => { if (F.eff < 1) brown += 0.5; minBatt = Math.min(minBatt, s.battery); if (!Number.isFinite(s.battery + s.o2 + s.water + s.food + s.health)) nan = true; });
  ok(!nan, 'a whole Mars year (669 sols) runs without a single broken number');
  ok(near(marsSun(S).ls, startLs, 1) || near(Math.abs(marsSun(S).ls - startLs), 360, 1), 'after one Mars year the season is back where it started', `Ls ${startLs.toFixed(1)} → ${marsSun(S).ls.toFixed(1)}`);
  ok(S.stats.sols === Math.floor(S.t / SOL) && S.stats.sols >= 668, 'the sol counter has counted the whole year', S.stats.sols);
  ok(S.panelDust === 0.6, 'with nobody cleaning, the panels reach the 60% dust limit within a year', S.panelDust);
  console.log(`  note: a year with nobody cleaning the panels: ${brown.toFixed(0)} hours of brownout, lowest battery ${minBatt.toFixed(0)} kWh, health ${S.health.toFixed(0)}, food ${S.food.toFixed(0)} kg`); }

// ---------- 4. seasons and the Sun ----------
{ const at = (ls, h = 12) => marsSun(fresh((q) => { q.ls0 = ls; }), hourOfSol(h));
  ok(near(at(0).dayH, SOL / 2, 0.15) && near(at(180).dayH, SOL / 2, 0.15), 'at both equinoxes day and night are equal', `${at(0).dayH.toFixed(2)} h, ${at(180).dayH.toFixed(2)} h`);
  ok(near(at(90).dec, MARS.TILT, 0.01) && near(at(270).dec, -MARS.TILT, 0.01), 'at the solstices the Sun stands 25.19° north and south of the equator');
  ok(at(90).dayH > at(45).dayH && at(45).dayH > at(0).dayH, 'in northern spring the days grow longer towards the summer solstice');
  ok(at(270).dayH < at(0).dayH && at(270).dayH < at(180).dayH, 'the northern winter solstice has the shortest day');
  { let best = 0, bestLs = 0, worst = 1e9, worstLs = 0; for (let ls = 0; ls < 360; ls += 1) { const t = at(ls).top; if (t > best) { best = t; bestLs = ls; } if (t < worst) { worst = t; worstLs = ls; } }
    ok(near(bestLs, MARS.LS_PERI, 1) && near(worstLs, (MARS.LS_PERI + 180) % 360, 1), 'the Sun is strongest at the closest point of the orbit (Ls 251) and weakest opposite it', `strongest Ls ${bestLs}, weakest Ls ${worstLs}`);
    ok(near(best / worst, Math.pow((1 + MARS.ECC) / (1 - MARS.ECC), 2), 0.01), 'and the ratio is what the stretched orbit gives: about 1.45', (best / worst).toFixed(3)); }
  { const s = marsSun(createMars(1), 0); ok(near(s.elev, MARS.LAT + s.dec - 90, 0.01) && s.elev < -20, 'at midnight the Sun is as far below the north horizon as latitude and season put it', s.elev.toFixed(1)); }
  { const S = createMars(1); let last = -1, ok1 = true; for (let h = 0; h < 24; h += 0.5) { const sn = marsSun(S, hourOfSol(h)); if (sn.hour < last) ok1 = false; last = sn.hour; } ok(ok1, 'the Mars clock only goes forward during a sol'); }
  ok(groundLightAt(0.45, 12) > groundLightAt(0.45, 9) && groundLightAt(0.45, 9) > 0 && groundLightAt(0.45, 2) === 0, 'more light on the ground at noon than in the morning, and none at night'); }
function groundLightAt(tau, h) { const S = fresh((q) => { q.tau = tau; }); S.t = hourOfSol(h); return marsFlows(S).G; }
ok(skyFactor(0.45, 0) === 0 && directFactor(0.45, -0.2) === 0, 'no light comes from a Sun below the horizon');

// ---------- 5. the clock and Earth ----------
{ const S = createMars(1); ok(marsClock(S).sol === 1 && marsClock(S).text === '08:30', 'a new game starts on sol 1 at 08:30', `${marsClock(S).sol} ${marsClock(S).text}`);
  S.t = SOL + 1e-6; ok(marsClock(S).sol === 2 && marsClock(S).text === '00:00', 'one sol of 24 h 39 min later it is sol 2, midnight', `${marsClock(S).sol} ${marsClock(S).text}`);
  S.t = SOL - 0.001; ok(marsClock(S).sol === 1 && marsClock(S).text === '23:59', 'and just before that it is still sol 1, 23:59', `${marsClock(S).sol} ${marsClock(S).text}`); }
{ const S = createMars(1), syn = 779.94 * 24; let worst = 0; for (let d = 0; d < 780; d += 13) worst = Math.max(worst, Math.abs(lightMinutes(S, d * 24) - lightMinutes(S, d * 24 + syn))); ok(worst < 0.01, 'the radio delay repeats every 780 days, as Earth and Mars line up again', worst.toFixed(4)); }
ok(near(sitePressure(), MARS.P_MEAN * Math.exp(-MARS.ELEV / 1000 / MARS.SCALE_H), 1e-9) && sitePressure() > 850 && sitePressure() < 950, 'the air at the outpost is about 9 hectopascals: 1% of Earth\'s', sitePressure().toFixed(0));

// ---------- 6. power, brownouts and the crew ----------
{ const S = fresh((q) => { q.battery = 120; }), F = S.flow, b0 = S.battery; marsStep(S, 0.1); ok(near(S.battery - b0, F.net * 0.1, 1e-9), 'the battery changes by exactly the spare power times the time', `${(S.battery - b0).toFixed(4)} vs ${(F.net * 0.1).toFixed(4)}`); }
{ const S = fresh((q) => { q.battery = 0; q.tau = q.tauWant = 10.8; q.t = hourOfSol(2); }), F = S.flow;
  ok(F.net < 0 && F.eff < 1, 'an empty battery at night in a big storm is a brownout', F.eff.toFixed(2));
  ok(near(F.eff, F.supply / F.demand, 1e-9), 'in a brownout every machine gets the same share of the power there is');
  ok(near(F.o2Make, PLANT.O2_KG_H * F.eff, 1e-9) && near(F.wWell, (PLANT.WATER_L_SOL / SOL) * F.eff, 1e-9), 'and the oxygen plant and the ice well slow down by that share'); }
{ const S = fresh((q) => { for (const k in LOADS) q.on[k] = false; q.battery = 0; q.t = hourOfSol(2); }), F = S.flow;
  ok(F.demand === 0 && F.eff === 1 && near(F.net, F.supply, 1e-9), 'with every building switched off nothing is used, even with an empty battery', `demand ${F.demand}, eff ${F.eff}`); }
{ const one = fresh((q) => { q.crew = 1; }).flow, four = fresh((q) => { q.crew = 4; }).flow, none = fresh((q) => { q.crew = 0; }).flow;
  ok(near(four.o2Use, 4 * one.o2Use, 1e-12) && near(four.wUse, 4 * one.wUse, 1e-12) && near(four.foodUse, 4 * one.foodUse, 1e-12), 'four people use four times what one person uses');
  ok(none.o2Use === 0 && none.wUse === 0 && none.foodUse === 0, 'an empty base uses no oxygen, water or food'); }
{ const S = fresh((q) => { q.on.storage = false; q.on.greenhouse = false; }); ok(near(-S.flow.foodNet - S.flow.foodUse, 0.2, 1e-12), 'with Storage off, 0.2 kg of food spoils every hour'); }
{ const S = fresh((q) => { q.tau = 0.45; q.tauWant = 4; }); run(S, 24, 0.25); ok(S.tau > 3.9 && S.tau <= 4, 'the sky darkens towards the storm it is heading for within a day', S.tau.toFixed(2)); }
{ const S = createMars(1); let last = S.panelDust, up = true; run(S, 5 * SOL, 0.5, (s) => { if (s.panelDust < last - 1e-12) up = false; last = s.panelDust; }); ok(up, 'dust on the panels only builds up while nobody cleans them'); }
{ const S = fresh((q) => { for (const k in LOADS) q.on[k] = false; q.o2 = 0; q.water = 0; q.food = 0; }); run(S, 30 * SOL, 1); ok(S.health === 1, 'with everything off for 30 sols the crew is at 1 health and no lower: this preview has no ending', S.health); }

// ---------- 7. saving and loading ----------
// an unusual game, so that any field a load forgets would show: a storm coming, dirty panels, three people, two buildings off, the player outside
{ const S = run(fresh((q) => { q.seed = 7; q.tau = 2.5; q.tauWant = 5; q.panelDust = 0.22; q.crew = 3; q.on.greenhouse = false; q.on.lab = false; q.zone = 'top'; q.car.charging = true; q.car.charge = 0.3; q.habTemp = 15; q.co2 = 1.2; }), 40, 0.25), o = JSON.parse(JSON.stringify(marsSerialize(S)));
  ok(!('rng' in o) && !('flow' in o), 'a save holds no functions and no flows, only the state');
  const B = marsDeserialize(o); run(S, 50, 0.25); run(B, 50, 0.25);
  const diff = ['t', 'battery', 'o2', 'water', 'food', 'health', 'panelDust', 'co2', 'habTemp', 'tau', 'tauWant', 'dose', 'crew'].filter((k) => Math.abs(S[k] - B[k]) > 1e-9)
    .concat(Object.keys(LOADS).filter((k) => S.on[k] !== B.on[k]).map((k) => 'on.' + k), S.zone !== B.zone ? ['zone'] : [], Math.abs(S.car.charge - B.car.charge) > 1e-9 ? ['car.charge'] : []);
  ok(!diff.length, 'a loaded game carries on exactly as if it had never stopped', diff.join(', '));
  ok(B.seed === 7 && typeof B.rng === 'function', 'and keeps its seed'); }

console.log(`${pass} checks passed${fail ? ', ' + fail + ' FAILED' : ''}`);
process.exitCode = fail ? 1 : 0;
