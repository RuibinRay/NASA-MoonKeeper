// MOONKEEPER — Mars: the planet's environment and the outpost's resource balance. Pure logic: no drawing, no page.
// `node tools/mars_test.mjs` checks it. Where each number comes from, and whether it is a measurement, a tested
// technology, a proposal or a game simplification, is in docs/MARS_SCIENCE.md.
import { SITE } from './mola.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), RAD = Math.PI / 180;

export const MARS = {
  GRAVITY: 3.73,            // m/s² at the surface (NASA Mars Fact Sheet)
  SOL_H: 24.6597,           // one solar day ("sol") in Earth hours: 24 h 39 min 35 s
  YEAR_SOLS: 668.6,         // one Mars year in sols (687 Earth days)
  TILT: 25.19,              // degrees: the tilt of the axis, which gives Mars seasons
  ECC: 0.0934, A_AU: 1.5237, LS_PERI: 251,   // the orbit: how stretched, how big, and the season (Ls) of closest approach to the Sun
  SUN_1AU: 1361,            // W/m² of sunlight at Earth's distance
  P_MEAN: 636,              // Pa: the surface pressure at the mean radius (6.36 mb, NASA Mars Fact Sheet)
  SCALE_H: 11.1,            // km: every 11.1 km down, the air gets e times thicker
  CO2: 0.951,               // share of the air that is carbon dioxide
  T_MIN: -89, T_MAX: -31,   // °C: the range over one day measured at the Viking 1 site (NASA Mars Fact Sheet), used here as a clear day
  RAD_OUT: 0.67,            // mSv per Earth day on the surface (Curiosity's RAD instrument)
  RAD_IN: 0.3,              // mSv per Earth day indoors, under a regolith cover (game estimate)
  O2_PP: 0.84, H2O_PP: 3.52, FOOD_PP: 0.62,   // each person, each Earth day: kg of oxygen, litres of water, kg of dry food
  LAT: SITE.lat, LON: SITE.lon, ELEV: SITE.elev,
};
// The air at the outpost: it stands about 4 km below the planet's reference level, so the air is thicker than average.
export const sitePressure = () => MARS.P_MEAN * Math.exp(-MARS.ELEV / 1000 / MARS.SCALE_H);

// What each building of the outpost uses (kW) when it is running.
export const LOADS = { cmd: 2.5, living: 2.5, lifesupport: 5, water: 3, greenhouse: 5, lab: 1.5, medical: 0.8, garage: 0.5, comms: 0.6, isru: 4, thermal: 4, storage: 0.3 };
export const PLANT = {
  ARRAY_M2: 900, CELL_EFF: 0.27,          // the solar field and how much of the light its cells turn into electricity
  DUST_PER_SOL: 0.002,                    // share of output lost each sol as dust settles on the glass
  REACTOR_KW: 10,                         // one Kilopower-class fission unit (a concept tested on Earth in 2018, not yet flown)
  O2_KG_H: 0.25, O2_KWH_KG: 10,           // the oxygen plant at full power
  WATER_L_SOL: 40, RECYCLE: 0.9,          // the ice well's yield, and how much used water is cleaned and used again
  GREEN_KG_SOL: 0.3,                      // fresh food from the greenhouse
};

const NONE = {}, STOPS = { isru: 1, water: 1, greenhouse: 1, thermal: 1, comms: 1 };   // which broken machines stand still (a broken scrubber bed still lets Life Support clean water)
export function createMars(seed = 1) {
  // The random numbers keep their place in S.rs, a plain number, so a saved game carries on the same sequence when it is loaded.
  const rng = () => { S.rs = (S.rs + 0x6d2b79f5) >>> 0; const a = S.rs; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const S = {
    rs: seed >>> 0,
    planet: 'mars', mode: 'mars', seed, rng, m: { key: 'mars', hourLen: 12, days: Infinity }, hours: Infinity, over: null,
    t0: 0, t: 8.5 * (MARS.SOL_H / 24),   // Earth hours since midnight of sol 1; play starts at 08:30 local solar time
    ls0: 45,                              // season at landing: northern spring, the clear part of the year
    tau: 0.45, tauWant: 0.45, wind: 4, windDir: 4.1,
    crew: 4, suitOn: true, health: 100, zone: 'top', here: null, dose: 0, perks: {}, pending: [],
    battery: 300, batteryCap: 500, o2: 46, o2Cap: 60, water: 620, waterCap: 800, food: 600, mat: 12, panelDust: 0.03, habTemp: 21, co2: 0.1, seen: {},
    on: Object.fromEntries(Object.keys(LOADS).map((k) => [k, true])),
    car: { charge: 1, charging: false }, ship: { charge: 0, charging: false },
    stats: { km: 0, jobs: 0, evaHours: 0, sols: 0 }, log: [], flow: null,
  };
  S.flow = marsFlows(S);
  return S;
}

// Where is the Sun, and what season is it? Real geometry for the outpost's latitude.
export function marsSun(S, t = S.t) {
  const sols = t / MARS.SOL_H, sol = Math.floor(sols) + 1, frac = sols - Math.floor(sols), ls = (S.ls0 + (360 / MARS.YEAR_SOLS) * sols) % 360;
  const H = 2 * Math.PI * (frac - 0.5), lat = MARS.LAT * RAD, dec = Math.asin(Math.sin(MARS.TILT * RAD) * Math.sin(ls * RAD));
  const e = -Math.cos(dec) * Math.sin(H), u = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H), n = Math.cos(lat) * Math.sin(dec) - Math.sin(lat) * Math.cos(dec) * Math.cos(H);
  const elev = Math.asin(clamp(u, -1, 1)) / RAD, up = elev > -0.3;
  const rAU = (MARS.A_AU * (1 - MARS.ECC * MARS.ECC)) / (1 + MARS.ECC * Math.cos((ls - MARS.LS_PERI) * RAD)), top = MARS.SUN_1AU / (rAU * rAU);   // sunlight above the air, W/m²
  const cosH0 = clamp(-Math.tan(lat) * Math.tan(dec), -1, 1), dayH = (2 * Math.acos(cosH0) / (2 * Math.PI)) * MARS.SOL_H;                           // hours of daylight this sol
  const hour = frac * 24, rise = 12 - (dayH / MARS.SOL_H) * 12, set = 12 + (dayH / MARS.SOL_H) * 12;                                                 // in Mars clock hours (24 to a sol)
  return { sol, frac, hour, ls, H, dec: dec / RAD, e, u, n, elev, up, rAU, top, dayH, rise, set, factor: clamp(elev / 6, 0, 1) };
}
// Sunlight reaching level ground through the dust, as a share of the sunlight above the air. tau is the dust's
// optical depth: about 0.5 on a clear day, 4 to 6 in a regional storm, 10.8 at the peak of the 2018 planet-wide storm.
// The numbers are NASA's: the "normalized net flux function" of Appelbaum and Landis, "Solar radiation on Mars: Update
// 1991" (NASA TM-105216), Table III, for ground that reflects a tenth of the light. It is a calculation (J. Pollack's,
// from the dust the Viking landers measured), not a measurement on the ground. Dust dims the Sun's direct beam fast,
// but much of that light still arrives as a glow from the whole sky, most of all when the Sun is low.
const AF_TAU = [0, 0.1, 0.5, 1, 2, 3, 4, 5, 6], AF_MU = [1, 0.866, 0.5, 0.1736];   // dust levels; cosine of the Sun's distance from overhead (0, 30, 60 and 80 degrees)
const AF = [[0.9, 0.9, 0.9, 0.9], [0.883, 0.879, 0.855, 0.757], [0.813, 0.793, 0.701, 0.462], [0.728, 0.694, 0.557, 0.324], [0.578, 0.532, 0.377, 0.217], [0.457, 0.411, 0.273, 0.162], [0.363, 0.321, 0.208, 0.127], [0.289, 0.253, 0.162, 0.101], [0.229, 0.2, 0.128, 0.081]];
const afRow = (r, mu) => { const m = clamp(mu, AF_MU[3], 1); let k = 0; while (k < 2 && m < AF_MU[k + 1]) k++; const u = (AF_MU[k] - m) / (AF_MU[k] - AF_MU[k + 1]); return AF[r][k] * (1 - u) + AF[r][k + 1] * u; };
// Between the table's rows and columns the value is read off a straight line; past its last row (dust 6) each further
// step of dust dims the light by the same share as the step before; with the Sun lower than 80 degrees from overhead the 80-degree column is used.
export function skyFactor(tau, mu) {
  if (mu <= 0) return 0; const t = Math.max(0, tau), last = AF_TAU.length - 1;
  if (t >= AF_TAU[last]) { const a = afRow(last - 1, mu), b = afRow(last, mu); return (b * Math.pow(b / a, t - AF_TAU[last])) / 0.9; }
  let r = 0; while (t > AF_TAU[r + 1]) r++; const u = (t - AF_TAU[r]) / (AF_TAU[r + 1] - AF_TAU[r]);
  return (afRow(r, mu) * (1 - u) + afRow(r + 1, mu) * u) / 0.9;   // the table counts the light the ground keeps (nine tenths): divide to get the light that arrives
}
export const directFactor = (tau, mu) => (mu <= 0 ? 0 : Math.exp(-tau / Math.max(mu, 0.04)));   // the share that still comes straight from the Sun's disc (what casts sharp shadows)
export const groundLight = (S, sn = marsSun(S)) => sn.top * Math.max(0, sn.u) * skyFactor(S.tau, sn.u);

// Air temperature (°C) 1.5 m above the ground: coldest just before dawn, warmest in the early afternoon.
// Dust in the air makes days cooler and nights milder.
export function airTemp(S, sn = marsSun(S)) {
  const h = (sn.hour - 5.5 + 24) % 24, k = h < 8.5 ? 0.5 - 0.5 * Math.cos((h / 8.5) * Math.PI) : 0.5 + 0.5 * Math.cos(((h - 8.5) / 15.5) * Math.PI), shape = Math.pow(k, 1.25), damp = clamp(1 - 0.11 * S.tau, 0.35, 1), mid = (MARS.T_MIN + MARS.T_MAX) / 2;
  return mid + (MARS.T_MIN + (MARS.T_MAX - MARS.T_MIN) * shape - mid) * damp;
}
// One-way radio time to Earth (minutes): from 3 to 22, as the two planets go round the Sun.
export function lightMinutes(S, t = S.t) { const th = 2.0 + (2 * Math.PI * (t / 24)) / 779.94, d = Math.sqrt(1 + 1.5237 * 1.5237 - 2 * 1.5237 * Math.cos(th)); return (d * 149597870.7) / 299792.458 / 60; }

// Earth seen from Mars is never far from the Sun: at most about 47° away. Degrees between them in the sky, + when Earth
// is a morning star (it rises before the Sun), − when it is an evening star. Uses the same line-up of the planets as the radio time.
export function earthElongation(S, t = S.t) { const th = 2.0 + (2 * Math.PI * (t / 24)) / 779.94, ex = Math.cos(th) - MARS.A_AU, ey = Math.sin(th); return (Math.atan2(ey, -ex) * 180) / Math.PI; }

// Everything that flows right now: power in and out, oxygen, water, food. Rates are per Earth hour unless named.
export function marsFlows(S) {
  const sn = marsSun(S), G = groundLight(S, sn), perSol = MARS.SOL_H / 24;
  const bad = S.fault || NONE, runs = (k) => S.on[k] && !bad[k];   // a machine works if it is switched on and not broken
  const solar = ((G * PLANT.ARRAY_M2 * PLANT.CELL_EFF * (1 - S.panelDust)) / 1000) * (bad.solar ? 0.7 : 1), reactor = PLANT.REACTOR_KW, cap = S.batteryCap * (bad.battery ? 0.6 : 1);   // a jammed row of tables, a dead battery module
  const solarClear = (sn.top * Math.max(0, sn.u) * skyFactor(0.45, sn.u) * PLANT.ARRAY_M2 * PLANT.CELL_EFF) / 1000;   // what clean panels would make under a clear sky right now
  const use = {}; let demand = 0; for (const k in LOADS) { use[k] = S.on[k] && !(bad[k] && STOPS[k]) ? LOADS[k] : 0; demand += use[k]; }   // a machine that has stopped draws nothing
  const heatExtra = runs('thermal') ? clamp((-40 - airTemp(S, sn)) / 50, 0, 1) * 2 : 0; use.thermal += heatExtra; demand += heatExtra;   // colder outside, more heating
  const chargers = S.car.charging && S.on.garage ? 3 : 0; demand += chargers;
  const supply = solar + reactor, net = supply - demand, eff = S.battery > 0.01 || net >= 0 ? 1 : clamp(supply / Math.max(demand, 0.1), 0, 1);
  const o2Make = runs('isru') ? PLANT.O2_KG_H * eff : 0, o2Use = (MARS.O2_PP * S.crew) / 24, o2Net = o2Make - o2Use;
  const wUse = (MARS.H2O_PP * S.crew) / 24, wBack = S.on.lifesupport ? wUse * PLANT.RECYCLE * eff : 0, wWell = runs('water') ? (PLANT.WATER_L_SOL / MARS.SOL_H) * eff : 0, wNet = wWell + wBack - wUse;
  const foodUse = (MARS.FOOD_PP * S.crew) / 24, warm = clamp((S.habTemp - 2) / 10, 0, 1), foodGrow = runs('greenhouse') ? (PLANT.GREEN_KG_SOL / MARS.SOL_H) * eff * warm : 0, spoil = S.on.storage ? 0 : 0.2, foodNet = foodGrow - foodUse - spoil;   // plants stop growing in the cold; unchilled food spoils
  const days = (amt, rate) => (rate < 0 ? amt / -rate / 24 : Infinity);
  return { sun: sn, G, solar, solarClear, reactor, supply, demand, net, eff, use, chargers, cap, link: runs('comms'), battHours: net < 0 ? S.battery / -net : Infinity,
    o2Make, o2Use, o2Net, o2Days: days(S.o2, o2Net), wUse, wBack, wWell, wNet, waterDays: days(S.water, wNet), foodUse, foodGrow, foodNet, foodDays: days(S.food, foodNet),
    tempC: airTemp(S, sn), pressure: sitePressure(), tau: S.tau, direct: directFactor(S.tau, Math.max(sn.u, 0)), doseRate: MARS.RAD_OUT / 24, lightMin: lightMinutes(S), frost: 0, leaks: [], perSol };
}

// Move the outpost forward by dt Earth hours.
export function marsStep(S, dt) {
  const F = (S.flow = marsFlows(S));
  S.battery = clamp(S.battery + F.net * dt, 0, F.cap);
  S.o2 = clamp(S.o2 + F.o2Net * dt, 0, S.o2Cap); S.water = clamp(S.water + F.wNet * dt, 0, S.waterCap); S.food = Math.max(0, S.food + F.foodNet * dt);
  S.panelDust = clamp(S.panelDust + (PLANT.DUST_PER_SOL * (1 + S.tau) * dt) / MARS.SOL_H, 0, 0.6);   // dustier air, faster build-up
  S.tau += (S.tauWant - S.tau) * Math.min(1, dt / 6); S.windDir += dt * 0.02; S.wind = 3 + 2.5 * Math.sin(S.t * 0.21) + 1.5 * Math.sin(S.t * 0.057) + S.tau * 1.5;
  S.dose += ((S.zone === 'top' ? MARS.RAD_OUT : MARS.RAD_IN) / 24) * dt; if (S.zone === 'top') S.stats.evaHours += dt;
  // the rooms: warmed by the heat pump, or cooling slowly towards the cold outside; the air goes stale without the scrubbers
  const bad = S.fault || NONE, heated = S.on.thermal && !bad.thermal && F.eff > 0.5; S.habTemp += ((heated ? 21 : F.tempC) - S.habTemp) * (1 - Math.exp(-dt * (heated ? 0.8 : 0.02)));
  S.co2 = clamp(S.co2 + (S.on.lifesupport && !bad.lifesupport && F.eff > 0.5 ? -0.6 : 0.02 * S.crew) * dt, 0.05, 8);
  const hurt = (S.o2 <= 0 ? 12 : 0) + (S.co2 > 3 ? 3 : 0) + (S.habTemp < 5 ? 2 : 0) + (S.water <= 0 ? 3 : 0) + (S.food <= 0 ? 1 : 0);
  S.health = clamp(S.health + (hurt ? -hurt : S.on.medical ? 2 : 0.5) * dt, S.hard ? 0 : 1, 100);   // free exploring has no ending: health stops at 1. A survival mission (S.hard) can be lost
  if (F.eff < 1) S.stats.brownHours = (S.stats.brownHours || 0) + dt;
  if (S.car.charging && S.on.garage) { S.car.charge = Math.min(1, S.car.charge + 0.3 * dt * F.eff); if (S.car.charge >= 1) S.car.charging = false; }
  S.t += dt; S.stats.sols = Math.floor(S.t / MARS.SOL_H);
  return F;
}
export const marsClock = (S) => { const sn = marsSun(S), h = Math.floor(sn.hour), m = Math.floor((sn.hour - h) * 60); return { sol: sn.sol, text: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` }; };

// What can be saved and brought back. The random-number function is rebuilt, and picks up where the saved game left off (S.rs).
export const marsSerialize = (S) => { const o = { ...S }; delete o.rng; delete o.flow; return o; };
export function marsDeserialize(o) { const S = createMars(o.seed || 1); Object.assign(S, o); S.flow = marsFlows(S); return S; }
