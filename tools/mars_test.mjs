// Checks the Mars map and the Mars outpost's rules: node tools/mars_test.mjs
// It reads the real NASA elevation data the game ships with, the Sun's path at the outpost, the dust and power model,
// and the layout of the base. Every expected value below is either a published number (docs/MARS_SCIENCE.md) or geometry.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE, GLOBAL, REGION, SKYLINE } from '../js/mars/mola.js';
import { MARS, LOADS, PLANT, createMars, marsSun, marsFlows, marsStep, skyFactor, directFactor, airTemp, lightMinutes, sitePressure, marsSerialize, marsDeserialize } from '../js/mars/sim.js';
import * as T from '../js/mars/terrain.js';

let pass = 0, fail = 0;
const ok = (cond, name, got) => { if (cond) pass++; else { fail++; console.log('  FAIL', name, got === undefined ? '' : '→ ' + got); } };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---------- 1. NASA elevation data (MOLA) ----------
const glob = (lat, lon) => GLOBAL.min + GLOBAL.step * GLOBAL.data[Math.floor(90 - lat) * GLOBAL.w + Math.floor(lon)];
ok(GLOBAL.data.length === 360 * 180, 'planet map is one value per degree');
ok(glob(18.65, 226.2) > 14000, 'Olympus Mons stands far above everything (USGS: 18.65°N, 226.2°E)', glob(18.65, 226.2));
ok(glob(-42, 70) < -5500, 'Hellas basin is the deepest low (about 42°S, 70°E)', glob(-42, 70));
ok(glob(-14, 301) < glob(-14, 285), 'Valles Marineris cuts below the plateau beside it');
{ let n = 0, s = 0; for (let lon = 0; lon < 360; lon += 3) { n += glob(60, lon); s += glob(-60, lon); } ok(n < s - 2000 * 120, 'the north is lower than the south', `${Math.round(n / 120)} vs ${Math.round(s / 120)}`); }
ok(near(glob(SITE.lat, SITE.lon), SITE.elev, 400), 'planet map agrees with the detailed tile at the outpost', glob(SITE.lat, SITE.lon));
ok(SITE.elev < -3800 && SITE.elev > -4200, 'outpost elevation is about -4.0 km', SITE.elev);
ok(SITE.elev < -3000, 'outpost meets the "below -3 km" landing preference (Golombek et al. 2021)');
ok(SITE.lat < 40 && SITE.lat > 35, 'outpost is under 40°N for sunlight, above 35°N for shallow ice');
ok(Math.hypot(SITE.slopeE, SITE.slopeN) < Math.tan((5 * Math.PI) / 180), 'the plain slopes less than 5°');
ok(REGION.data.length === REGION.n * REGION.n, 'region map is square');
{ const c = REGION.n / 2, mid = (REGION.data[(c - 1) * REGION.n + c - 1] + REGION.data[(c - 1) * REGION.n + c] + REGION.data[c * REGION.n + c - 1] + REGION.data[c * REGION.n + c]) / 4; ok(near(mid, SITE.elev, 40), 'region map is centred on the outpost', mid); }
ok(REGION.max - REGION.min > 500 && REGION.max - REGION.min < 3000, 'the region has real hills (Erebus Montes) but no giant relief', REGION.max - REGION.min);
{ let top = -1e9, flat = 0; for (let i = 0; i < SKYLINE.n; i++) { top = Math.max(top, SKYLINE.deg100[i]); if (SKYLINE.deg100[i] < 60) flat++; } ok(top > 150 && top < 600, 'the skyline has hills a few degrees high', top / 100); ok(flat > SKYLINE.n * 0.3, 'much of the horizon is flat plain', flat); }

// ---------- 2. the Sun, seasons and the air ----------
const S0 = createMars(1);
ok(MARS.GRAVITY === 3.73 && MARS.SOL_H === 24.6597 && MARS.TILT === 25.19, 'gravity, sol and tilt are the NASA fact-sheet values');
ok(near((686.98 * 24) / MARS.SOL_H, MARS.YEAR_SOLS, 0.2), 'a year is 668.6 sols');
{ const noon = marsSun(S0, 12 * (MARS.SOL_H / 24)); ok(near(noon.elev, 90 - MARS.LAT + (Math.asin(Math.sin((25.19 * Math.PI) / 180) * Math.sin((45 * Math.PI) / 180)) * 180) / Math.PI, 0.6), 'noon Sun height matches latitude and season', noon.elev); ok(Math.abs(noon.e) < 0.02 && noon.n < 0, 'at noon the Sun is due south'); }
{ const am = marsSun(S0, 7 * (MARS.SOL_H / 24)), pm = marsSun(S0, 17 * (MARS.SOL_H / 24)); ok(am.e > 0.5 && pm.e < -0.5, 'the Sun rises in the east and sets in the west'); }
{ const s = marsSun(S0); ok(s.dayH > MARS.SOL_H / 2 && s.dayH < 16, 'spring days are longer than nights', s.dayH); const w = { ...S0, ls0: 270 }; ok(marsSun(w).dayH < MARS.SOL_H / 2 - 1.5, 'winter days are short', marsSun(w).dayH); ok(marsSun(w, 12 * (MARS.SOL_H / 24)).elev < 30, 'the winter Sun stays low'); }
{ let lo = 1e9, hi = 0, sum = 0; for (let ls = 0; ls < 360; ls += 5) { const t = marsSun({ ...S0, ls0: ls }).top; lo = Math.min(lo, t); hi = Math.max(hi, t); sum += t; } ok(lo > 480 && lo < 510 && hi > 700 && hi < 730, 'sunlight above the air swings from about 490 to 715 W/m² over the year', `${lo.toFixed(0)}…${hi.toFixed(0)}`); ok(near(sum / 72, 586.2, 25), 'and averages near the fact sheet\'s 586 W/m²', sum / 72); }
ok(sitePressure() > MARS.P_MEAN && sitePressure() < 1100, 'air is thicker at the low outpost than at the mean radius', sitePressure());
{ let lo = 1e9, hi = -1e9, loH = 0, hiH = 0; for (let h = 0; h < 24; h += 0.25) { const t = airTemp(S0, marsSun(S0, h * (MARS.SOL_H / 24))); if (t < lo) { lo = t; loH = h; } if (t > hi) { hi = t; hiH = h; } } ok(lo >= MARS.T_MIN - 0.5 && hi <= MARS.T_MAX + 0.5, 'a clear day stays within the Viking 1 range', `${lo.toFixed(0)}…${hi.toFixed(0)}`); ok(loH > 4 && loH < 7, 'coldest just before dawn', loH); ok(hiH > 13 && hiH < 15.5, 'warmest in the early afternoon', hiH); }
{ const dusty = { ...S0, tau: 4 }, noon = 13.5 * (MARS.SOL_H / 24), night = 5 * (MARS.SOL_H / 24); ok(airTemp(dusty, marsSun(dusty, noon)) < airTemp(S0, marsSun(S0, noon)), 'dust makes the afternoon cooler'); ok(airTemp(dusty, marsSun(dusty, night)) > airTemp(S0, marsSun(S0, night)), 'and the night milder'); }
{ let lo = 1e9, hi = 0; for (let d = 0; d < 780; d += 4) { const m = lightMinutes(S0, d * 24); lo = Math.min(lo, m); hi = Math.max(hi, m); } ok(lo > 2.9 && lo < 5 && hi > 19 && hi < 22.5, 'radio time to Earth runs from about 4 to 21 minutes', `${lo.toFixed(1)}…${hi.toFixed(1)}`); }

// ---------- 3. dust and power ----------
ok(skyFactor(0.45, 0.8) > skyFactor(1.5, 0.8) && skyFactor(1.5, 0.8) > skyFactor(4, 0.8) && skyFactor(4, 0.8) > skyFactor(10.8, 0.8), 'more dust, less sunlight on the ground');
ok(skyFactor(0.45, 0.8) > 0.85, 'a clear sky passes most of the light');
ok(directFactor(5.5, 0.9) < 0.01, 'at tau 5.5 under 1% of the direct beam is left (2007 storm: 99% blocked)', directFactor(5.5, 0.9));
ok(skyFactor(5.5, 0.9) > directFactor(5.5, 0.9) * 10, 'but the dusty sky still glows: Opportunity kept about a fifth of its power');
ok(skyFactor(1, 0.2) < skyFactor(1, 0.9), 'a low Sun shines through more dust');
{ const noon = createMars(1); noon.t = 12 * (MARS.SOL_H / 24); const F = marsFlows(noon); ok(F.solar > F.demand * 2, 'clear noon: the solar field makes far more than the base uses', `${F.solar.toFixed(0)} vs ${F.demand.toFixed(0)}`); ok(F.reactor === 10, 'the fission unit gives 10 kW (the Kilopower design figure)'); ok(F.reactor < F.demand, 'the fission unit alone cannot carry the base'); ok(near(F.solar / F.solarClear, 1 - noon.panelDust, 0.01), 'dust on the glass takes its share'); }
{ const run = (tau, sols) => { const S = createMars(1); S.tau = S.tauWant = tau; let min = 1e9; for (let i = 0; i < sols * MARS.SOL_H * 4; i++) { marsStep(S, 0.25); min = Math.min(min, S.battery); } return { S, min }; };
  const clear = run(0.45, 3), storm = run(4, 3), big = run(10.8, 2);
  ok(clear.min > 100, 'three clear sols: the battery never runs low', clear.min); ok(clear.S.flow.eff === 1, 'and nothing browns out');
  ok(storm.min < clear.min - 100, 'a regional storm drains the battery much deeper', `${storm.min.toFixed(0)} vs ${clear.min.toFixed(0)}`);
  ok(big.min === 0, 'a 2018-sized storm empties the battery'); ok(marsFlows(big.S).eff < 1 || big.S.battery === 0, 'and the machines slow down');
  ok(clear.S.o2 > 46 && clear.S.water > 620, 'on clear sols oxygen and water slowly build up');
  ok(clear.S.food < 600 && clear.S.food > 590, 'the greenhouse only stretches the food: the crew still eat more than it grows', clear.S.food);
  ok(storm.S.panelDust > clear.S.panelDust, 'panels get dirty faster in dusty air'); ok(clear.S.health === 100 && clear.S.habTemp > 20 && clear.S.co2 < 0.2, 'a well-run base stays warm, fresh and healthy'); }
ok(near((MARS.O2_PP * 4 * MARS.SOL_H) / 24, 3.45, 0.05), 'four people breathe about 3.4 kg of oxygen a sol (0.84 kg a day each)');
ok(PLANT.O2_KG_H * PLANT.O2_KWH_KG <= LOADS.isru && PLANT.O2_KWH_KG >= 8 && PLANT.O2_KWH_KG <= 12.5, 'the oxygen plant\'s energy use is inside NASA\'s 8 to 12.5 kWh per kg');
ok(PLANT.O2_KG_H * 1000 > 12 * 10, 'and it is more than ten MOXIEs');

// ---------- 4. every building matters ----------
const after = (change, hours = 24) => { const S = createMars(1); change(S); for (let i = 0; i < hours * 4; i++) marsStep(S, 0.25); return S; };
const base = after(() => {});
ok(Object.keys(LOADS).every((k) => T.B[k]) , 'every power user is a building on the map');
ok(T.BUILDINGS.length === 14, 'the outpost has 14 buildings', T.BUILDINGS.length);
{ const g = fs.readFileSync(path.join(ROOT, 'js/mars/game.js'), 'utf8'); ok(T.BUILDINGS.every((b) => new RegExp(`\\b${b.id}: \\{ name: tt\\(`).test(g)), 'every building has a panel with what it does, needs and gives'); }
ok(after((S) => (S.on.thermal = false)).habTemp < 5, 'Thermal Control off: the rooms freeze within a day', after((S) => (S.on.thermal = false)).habTemp);
ok(after((S) => (S.on.lifesupport = false)).co2 > 1.5, 'Life Support off: the air goes stale');
ok(after((S) => (S.on.lifesupport = false)).water < base.water - 10, 'Life Support off: no water is recycled');
ok(after((S) => (S.on.isru = false)).o2 < base.o2 - 4, 'ISRU off: oxygen only goes down');
ok(after((S) => (S.on.water = false)).water < base.water - 20, 'Water Plant off: no new water from the ice');
ok(after((S) => (S.on.greenhouse = false)).food < base.food - 0.2, 'Greenhouse off: no fresh food');
ok(after((S) => (S.on.storage = false)).food < base.food - 4, 'Storage off: food spoils');
ok(after((S) => (S.on.thermal = false), 48).food < base.food, 'a frozen greenhouse stops growing');
{ const S = after((q) => { q.on.thermal = false; q.on.lifesupport = false; }, 72); ok(S.health < 60 && S.health >= 1, 'cold, stale rooms hurt the crew, but this preview has no ending', S.health); const R = createMars(1); R.health = 40; const M = createMars(1); M.health = 40; M.on.medical = false; for (let i = 0; i < 40; i++) { marsStep(R, 0.25); marsStep(M, 0.25); } ok(R.health > M.health + 5, 'the Medical Bay speeds recovery'); }
{ const S = createMars(1); S.car.charge = 0.2; S.car.charging = true; S.on.garage = false; marsStep(S, 1); ok(S.car.charge === 0.2, 'Garage off: the rover does not charge'); S.on.garage = true; marsStep(S, 1); ok(S.car.charge > 0.4, 'Garage on: it does'); }
{ const out = after((S) => (S.zone = 'top'), 24), ind = after((S) => (S.zone = 'in'), 24); ok(near(out.dose, MARS.RAD_OUT, 0.01), 'a day outdoors is 0.67 mSv (Curiosity)'); ok(ind.dose < out.dose, 'the soil roof cuts the dose indoors'); }
{ const S = after(() => {}, 30), o = JSON.parse(JSON.stringify(marsSerialize(S))), B2 = marsDeserialize(o); ok(B2.t === S.t && B2.battery === S.battery && B2.o2 === S.o2 && B2.on.isru === S.on.isru && B2.flow.sun.sol === S.flow.sun.sol, 'a saved Mars game comes back the same'); ok(typeof B2.rng === 'function', 'with its random numbers'); }

// ---------- 5. the ground and the layout ----------
T.buildGrid();
{ let lo = 1e9, hi = -1e9, jump = 0; for (let x = -780; x <= 780; x += 13) for (let z = -780; z <= 780; z += 13) { const h = T.heightAt(x, z); lo = Math.min(lo, h); hi = Math.max(hi, h); jump = Math.max(jump, Math.abs(T.heightAt(x + 1, z) - h)); } ok(lo > -25 && hi < 30, 'the walking map is gentle ground', `${lo.toFixed(1)}…${hi.toFixed(1)}`); ok(jump < 0.9, 'no cliffs to fall off', jump); }
ok(near(T.heightAt(1000, 0) - T.heightAt(-1000, 0), SITE.slopeE * 2000, 9), 'the ground keeps the real east-west tilt from MOLA', T.heightAt(1000, 0) - T.heightAt(-1000, 0));
for (const b of T.BUILDINGS) ok(T.slopeAt(b.x, b.z) < 0.02, `${b.id} stands on level ground`, T.slopeAt(b.x, b.z));
ok(T.slopeAt(T.PAD.x, T.PAD.z) < 0.01 && T.slopeAt(T.ROVER_PAD.x, T.ROVER_PAD.z) < 0.02, 'the landing pad and rover pad are level');
const cols = T.colliders(), clear = (x, z, pad) => cols.every((c) => Math.hypot(c.x - x, c.z - z) >= c.r + pad);
for (const b of T.BUILDINGS) ok(clear(b.door[0], b.door[1], 0.5), `you can stand at the ${b.id} door`);
ok(clear(T.SPAWN.x, T.SPAWN.z, 1) && clear(T.ROVER_PAD.x, T.ROVER_PAD.z, 2.2), 'the start point and the rover pad are clear');
ok(clear(T.B.garage.x, T.B.garage.z, 2.2) && clear(T.B.garage.x, T.B.garage.z - 7, 2.2) && clear(T.B.garage.x, T.B.garage.z + 7, 2.2), 'the rover can drive straight through the garage');
ok(Math.hypot(T.PAD.x - T.B.cmd.x, T.PAD.z - T.B.cmd.z) > 150, 'the lander stands well away from the habitat', Math.hypot(T.PAD.x, T.PAD.z));
ok(Math.hypot(T.REACTOR.x - T.B.living.x, T.REACTOR.z - T.B.living.z) > 150, 'the fission unit is far from where people sleep');
ok(T.TUNNELS.every(([a, b, c, d]) => T.BUILDINGS.some((q) => Math.hypot(q.x - a, q.z - b) < q.r + 9) && T.BUILDINGS.some((q) => Math.hypot(q.x - c, q.z - d) < q.r + 9)), 'every tunnel joins two buildings');
{ const ic = T.ICE_CRATER; ok(T.heightAt(ic.x + ic.r, ic.z) - T.heightAt(ic.x, ic.z) > 2.5, 'the young crater is a real bowl with a raised rim'); ok(Math.hypot(ic.x, ic.z) < T.PLAY_R - 50, 'and it can be reached'); }
{ let step = 0, n = 0; for (let k = -150; k <= 150; k += 30) { const x = 200 + k * 0.9, z = 412 - k * 0.42, nx = 0.42 / Math.hypot(0.42, 0.9), nz = 0.9 / Math.hypot(0.42, 0.9); step += T.heightAt(x + nx * 60, z + nz * 60) - T.heightAt(x - nx * 60, z - nz * 60); n++; } ok(step / n > 3.5 && step / n < 11, 'the lava-flow edge is a step of several metres', step / n); }
{ const rocks = T.rockField(); ok(rocks.length > 3000, 'thousands of rocks'); ok(rocks.every((r) => Math.hypot(r.x - 8, r.z - 4) > 96 + 5), 'none on the levelled base'); ok(rocks.filter((r) => r.s > 1.05).length < 150, 'boulders are rare on this plain', rocks.filter((r) => r.s > 1.05).length); const again = T.rockField(); ok(again[100].x === rocks[100].x && again[3000].s === rocks[3000].s, 'the same field every time'); }
ok(T.duneMask(430, -380) > 0.4 && T.duneMask(0, 0) === 0, 'the ripple field is in the north-east, not at the base');

console.log(`${pass} checks passed${fail ? ', ' + fail + ' FAILED' : ''}`);
process.exitCode = fail ? 1 : 0;
