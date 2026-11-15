// MOONKEEPER — Mars: planning a rocket flight between the Moon, Earth orbit and Mars. Pure logic: no drawing, no page.
// `node tools/mars_transfer_test.mjs` checks it against the textbook answers.
//
// What the model is. Earth and Mars go round the Sun on circles in the same flat plane. A burn changes speed in an
// instant. Near a planet only that planet pulls; between planets only the Sun does ("patched conics"). One vehicle
// does every burn, with no stages dropped and no refuelling on the way. Under each of those the real numbers move by
// a few per cent to a few tens of per cent; the shape of the answer (when you can leave, how long it takes, why coming
// home costs more than going) stays true.
//
// Where the numbers come from:
//   sizes, masses, years, gravity   NASA planetary fact sheets  https://nssdc.gsfc.nasa.gov/planetary/factsheet/
//   how transfers work              NASA, Basics of Space Flight, chapter 4  https://science.nasa.gov/learn/basics-of-space-flight/chapter4-1/
//   stay times and mission shape    NASA Mars Design Reference Architecture 5.0 (NASA/SP-2009-566)
//                                   https://www.nasa.gov/wp-content/uploads/2015/09/373665main_nasa-sp-2009-566.pdf
// Each leg of a plan carries cls, the game's fact class ('obs' | 'demo' | 'prop' | 'game'), and src, a link that was
// opened and read. A burn worked out from fact-sheet numbers on a textbook orbit is 'prop'; one that includes a game
// allowance is 'game'. Mars's own numbers and the game clock come from sim.js.
import { tt } from '../i18n.js';
import { MARS } from './sim.js';

const TAU = 2 * Math.PI, DAY = 86400;
export const AU = 149597870.7;      // km
export const G0 = 9.80665;          // m/s²: turns an engine's "specific impulse" in seconds into its exhaust speed
// mu: the body's pull (km³/s²). R: radius (km). a: distance from the Sun (AU). year: days for one trip round the Sun.
export const BODY = {
  sun: { mu: 1.32712440018e11 },
  earth: { mu: 398600.4418, R: 6378.137, a: 1, year: 365.256 },
  moon: { mu: 4902.8, R: 1737.4, dist: 384400 },
  mars: { mu: 42828.37, R: 3389.5, a: MARS.A_AU, year: (MARS.YEAR_SOLS * MARS.SOL_H) / 24 },
};
// Heights of the parking orbits (km above the ground) and where Mars's air starts to matter.
export const ORBIT = { earth: 300, moon: 100, mars: 300, marsEntry: 125 };
// Game allowances, added to the pure-physics answer (km/s).
export const ALLOW = {
  moonLift: 0.24,     // climbing or landing on the Moon: fighting gravity while the engine burns
  marsLift: 0.7,      // climbing off Mars: gravity and a little air drag
  marsLand: 0.8,      // the last engine burn of a Mars landing, after the air has done most of the braking
  earthLift: 9.4,     // from the ground on Earth to low orbit, all losses included
};
export const SYNODIC_D = 779.94;    // days between two line-ups of Earth and Mars (NASA Mars Fact Sheet); sim.js times the radio delay with the same number
export const THETA0 = 2.0;          // how far Earth is ahead of Mars round the Sun (radians) at game time 0, as in sim.js lightMinutes()
export const SRC = { facts: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/', path: 'https://pwg.gsfc.nasa.gov/stargaze/Smars1.htm', basics: 'https://science.nasa.gov/learn/basics-of-space-flight/chapter4-1/' };

export const ENGINES = {
  methalox: { isp: 360, cls: 'game', name: tt('Methane and oxygen'),
    note: tt('Both can be made on Mars from its air and its ice. Nobody has made rocket fuel on another world yet.') },
  hydrolox: { isp: 450, cls: 'game', name: tt('Hydrogen and oxygen'),
    note: tt('The most push for each kilogram. Engines like this have flown since the 1960s. Making it from Moon ice is still a plan.') },
};

// ---------------------------------------------------------------- where the planets are
const rE = BODY.earth.a * AU, rM = BODY.mars.a * AU, MU = BODY.sun.mu;
const nE = TAU / (BODY.earth.year * DAY), nM = nE - TAU / (SYNODIC_D * DAY);   // radians a second; Mars is set by the line-up period, so windows and radio delay keep step
const angE = (tH) => THETA0 + nE * tH * 3600, angM = (tH) => nM * tH * 3600;
const at = (r, a) => [r * Math.cos(a), r * Math.sin(a)];
const vel = (r, a) => { const v = Math.sqrt(MU / r); return [-v * Math.sin(a), v * Math.cos(a)]; };
const wrap = (a) => ((a % TAU) + TAU) % TAU;
export const planetAngles = (tH) => ({ earth: angE(tH), mars: angM(tH) });   // where each planet is on its circle (radians), for drawing
// How far Earth is ahead of Mars (radians, 0 to 2π) at a game time in Earth hours. 0 means Mars is at its closest.
export const earthLead = (tH) => wrap(angE(tH) - angM(tH));
export const earthMarsKm = (tH) => { const th = earthLead(tH); return Math.sqrt(rE * rE + rM * rM - 2 * rE * rM * Math.cos(th)); };
export const lightMinutes = (tH) => earthMarsKm(tH) / 299792.458 / 60;

// ---------------------------------------------------------------- orbit sums
export const circSpeed = (mu, r) => Math.sqrt(mu / r);
// The burn that takes you from a round orbit of radius r to leaving the planet with speed vInf to spare (or the other way).
export const burnFromOrbit = (vInf, mu, r) => Math.sqrt(vInf * vInf + (2 * mu) / r) - Math.sqrt(mu / r);
// The cheapest path between two round orbits: half an ellipse that touches both (a "Hohmann transfer").
export function hohmann(r1, r2, mu) {
  const a = (r1 + r2) / 2, v1 = Math.sqrt(mu * (2 / r1 - 1 / a)), v2 = Math.sqrt(mu * (2 / r2 - 1 / a));
  return { dv1: Math.abs(v1 - Math.sqrt(mu / r1)), dv2: Math.abs(Math.sqrt(mu / r2) - v2), seconds: Math.PI * Math.sqrt((a * a * a) / mu), a };
}
export const HOHMANN = hohmann(rE, rM, MU);                    // Earth's orbit to Mars's orbit: about 259 days
export const HOHMANN_DAYS = HOHMANN.seconds / DAY;
// The Moon and back: an ellipse from the Moon's distance down to low Earth orbit.
const rLEO = BODY.earth.R + ORBIT.earth, rLLO = BODY.moon.R + ORBIT.moon, rLMO = BODY.mars.R + ORBIT.mars;
const MOON_PATH = hohmann(rLEO, BODY.moon.dist, BODY.earth.mu);
export const MOON_DAYS = MOON_PATH.seconds / DAY;              // about 5 days
const moonVInf = MOON_PATH.dv2;                                // speed to spare when leaving (or reaching) the Moon
const moonPathPerigee = Math.sqrt(BODY.earth.mu * (2 / rLEO - 1 / MOON_PATH.a));   // speed at the low point above Earth

// "Given where I am, where I must be, and how long I have: what path joins them?" (Lambert's problem.)
// r1, r2: [x, y] in km from the Sun. Travel is the same way round as the planets, less than one lap.
const stC = (z) => (z > 1e-6 ? (1 - Math.cos(Math.sqrt(z))) / z : z < -1e-6 ? (Math.cosh(Math.sqrt(-z)) - 1) / -z : 0.5 - z / 24);
const stS = (z) => { if (z > 1e-6) { const s = Math.sqrt(z); return (s - Math.sin(s)) / (s * s * s); } if (z < -1e-6) { const s = Math.sqrt(-z); return (Math.sinh(s) - s) / (s * s * s); } return 1 / 6 - z / 120; };
export function lambert(r1, r2, seconds, mu = MU) {
  const R1 = Math.hypot(r1[0], r1[1]), R2 = Math.hypot(r2[0], r2[1]);
  const dnu = wrap(Math.atan2(r1[0] * r2[1] - r1[1] * r2[0], r1[0] * r2[0] + r1[1] * r2[1]));
  const A = Math.sin(dnu) * Math.sqrt((R1 * R2) / (1 - Math.cos(dnu)));
  if (!(Math.abs(A) > 1e-3) || !(seconds > 0)) return null;     // straight across the Sun (or no time at all): the sum breaks down
  const y = (z) => R1 + R2 + (A * (z * stS(z) - 1)) / Math.sqrt(stC(z));
  const time = (z) => { const yy = y(z); return yy <= 0 ? -1 : (Math.pow(yy / stC(z), 1.5) * stS(z) + A * Math.sqrt(yy)) / Math.sqrt(mu); };
  let lo = -60, hi = TAU * TAU - 1e-3;
  while (time(lo) < 0 && lo < hi) lo += 0.5;                    // below this the path would dive through the Sun
  if (time(lo) > seconds || time(hi) < seconds) return null;
  for (let i = 0; i < 70; i++) { const mid = (lo + hi) / 2; if (time(mid) < seconds) lo = mid; else hi = mid; }
  const yy = y((lo + hi) / 2), f = 1 - yy / R1, g = A * Math.sqrt(yy / mu), gd = 1 - yy / R2;
  return { v1: [(r2[0] - f * r1[0]) / g, (r2[1] - f * r1[1]) / g], v2: [(gd * r2[0] - r1[0]) / g, (gd * r2[1] - r1[1]) / g], dnu };
}

// A flight between Earth's orbit and Mars's orbit that leaves at tH (game hours) and takes `days`.
// dir 'out' is toward Mars, 'back' is toward Earth. Gives the speed to spare at each end (km/s), or null if no path fits.
export function transfer(tH, days, dir = 'out') {
  const t2 = tH + days * 24, out = dir === 'out';
  const a1 = out ? angE(tH) : angM(tH), a2 = out ? angM(t2) : angE(t2), r1 = out ? rE : rM, r2 = out ? rM : rE;
  const L = lambert(at(r1, a1), at(r2, a2), days * DAY); if (!L) return null;
  const p1 = vel(r1, a1), p2 = vel(r2, a2);
  return { days, vInfDep: Math.hypot(L.v1[0] - p1[0], L.v1[1] - p1[1]), vInfArr: Math.hypot(L.v2[0] - p2[0], L.v2[1] - p2[1]), sweep: L.dnu };
}

// ---------------------------------------------------------------- when can you leave?
// For the cheapest path, the planet you are aiming at must be at the far end of the half-ellipse when you get there.
const WINDOW = { out: wrap(nM * HOHMANN.seconds - Math.PI), back: wrap(Math.PI - nE * HOHMANN.seconds) };   // the earthLead that fits
export const windowLead = (dir = 'out') => WINDOW[dir];
// The next good moment to leave, at or after tH (game hours).
export function nextWindow(tH, dir = 'out') {
  const wait = wrap(WINDOW[dir] - earthLead(tH)) / (nE - nM);   // seconds until the planets line up right
  return tH + wait / 3600;
}
// The next n good moments, for a trip between two places: [{ departH, arriveH, days, dv }] (hours on the game clock, km/s of engine burn).
export function windows(tH, n = 3, dir = 'out', from = dir === 'out' ? 'earth' : 'mars', to = dir === 'out' ? 'mars' : 'earth') {
  const list = legs(from, to), dv = list.reduce((s, l) => s + l.dv, 0), days = list.reduce((s, l) => s + l.days, 0), out = []; let t = nextWindow(tH, dir);
  for (let i = 0; i < n; i++) { out.push({ departH: t, arriveH: t + days * 24, days, dv }); t += SYNODIC_D * 24; }
  return out;
}
// After landing on Mars by the cheapest path, how long before the cheapest path home opens (days).
export const STAY_DAYS = (nextWindow(nextWindow(0, 'out') + HOHMANN_DAYS * 24, 'back') - (nextWindow(0, 'out') + HOHMANN_DAYS * 24)) / 24;

// ---------------------------------------------------------------- the legs of a journey
const PLACES = { moon: tt('the Moon'), earth: tt('low Earth orbit'), mars: tt('Mars') };
export const placeName = (id) => PLACES[id] || id;
const LEG_CLS = { moonLift: 'game', moonLeave: 'prop', moonReach: 'prop', moonLand: 'game', swingBy: 'prop', earthLeave: 'prop', earthBrake: 'prop', cruise: 'prop', marsEntry: 'prop', marsBrake: 'prop', marsLand: 'game', marsLift: 'game', marsLeave: 'prop' };
const leg = (id, name, dv, days, how, note) => ({ id, name, dv, days, how, cls: LEG_CLS[id], src: LEG_CLS[id] === 'game' ? '' : id === 'cruise' ? SRC.path : SRC.facts, note });

// Every leg from one place to another. `from` and `to` are 'moon', 'earth' (low Earth orbit) or 'mars'.
// x is the flight between the planets, from transfer() or the cheapest path. opts.aero false: brake into Mars orbit by engine.
export function legs(from, to, x = { days: HOHMANN_DAYS, vInfDep: HOHMANN.dv1, vInfArr: HOHMANN.dv2 }, opts = {}) {
  const L = [], E = BODY.earth, Mn = BODY.moon, Ma = BODY.mars, aero = opts.aero !== false;
  if (from === to || !PLACES[from] || !PLACES[to]) return L;
  const moonUp = () => L.push(
    leg('moonLift', tt('Lift off from the Moon'), circSpeed(Mn.mu, rLLO) + ALLOW.moonLift, 0.1, 'engine',
      tt('No air, weak gravity: a small rocket is enough. The Apollo crews did this six times.')),
    leg('moonLeave', tt('Leave Moon orbit and fall toward Earth'), burnFromOrbit(moonVInf, Mn.mu, rLLO), MOON_DAYS, 'engine',
      tt('A short burn, then five days of falling. Earth does the pulling.')));
  const moonDown = () => L.push(
    leg('moonReach', tt('Coast out to the Moon and slip into its orbit'), burnFromOrbit(moonVInf, Mn.mu, rLLO), MOON_DAYS, 'engine',
      tt('Five days of climbing away from Earth, then a burn so the Moon can hold you.')),
    leg('moonLand', tt('Land on the Moon'), circSpeed(Mn.mu, rLLO) + ALLOW.moonLift, 0.1, 'engine',
      tt('There is no air to slow you down. The engine has to do all of it.')));
  const marsDown = () => {
    if (aero) L.push(leg('marsEntry', tt('Dive into the air of Mars'), 0, 0.01, 'air',
      tt`You hit the air at ${Math.sqrt(x.vInfArr ** 2 + (2 * Ma.mu) / (Ma.R + ORBIT.marsEntry)).toFixed(1)} km a second. A heat shield turns that speed into heat. Every Mars rover has landed this way; a ship big enough for people has not.`));
    else L.push(leg('marsBrake', tt('Brake into Mars orbit with the engine'), burnFromOrbit(x.vInfArr, Ma.mu, rLMO), 0.1, 'engine',
      tt('The slow, sure way: burn until Mars can hold you. It costs a lot of fuel.')));
    L.push(leg('marsLand', tt('Land on Mars'), ALLOW.marsLand, 0.01, 'engine',
      tt('The air of Mars is thick enough to burn you and too thin to stop you. The engine finishes the job.')));
  };
  if (to === 'mars') {
    if (from === 'moon') { moonUp();
      L.push(leg('swingBy', tt('Burn at the lowest point above Earth'), Math.sqrt(x.vInfDep ** 2 + (2 * E.mu) / rLEO) - moonPathPerigee, 0, 'engine',
        tt('You are already falling fast past Earth. A burn here counts for more than the same burn anywhere else.'))); }
    else L.push(leg('earthLeave', tt('Leave Earth orbit for Mars'), burnFromOrbit(x.vInfDep, E.mu, rLEO), 0, 'engine',
      tt('One long burn. Every Mars rover and orbiter began like this.')));
    L.push(leg('cruise', tt('Coast to Mars'), 0, x.days, 'coast', tt('Engines off. The Sun bends your path until Mars comes to meet you.')));
    marsDown();
  } else if (from === 'mars') {
    L.push(leg('marsLift', tt('Lift off from Mars'), circSpeed(Ma.mu, rLMO) + ALLOW.marsLift, 0.1, 'engine',
        tt('Mars pulls more than twice as hard as the Moon. Nothing has ever taken off from Mars.')),
      leg('marsLeave', tt('Leave Mars orbit for Earth'), burnFromOrbit(x.vInfDep, Ma.mu, rLMO), 0, 'engine',
        tt('The burn that starts the long fall back toward the Sun.')),
      leg('cruise', tt('Coast to Earth'), 0, x.days, 'coast', tt('Engines off. You fall inward and catch Earth up.')));
    if (to === 'moon') { L.push(leg('swingBy', tt('Slow down at the lowest point above Earth'), Math.sqrt(x.vInfArr ** 2 + (2 * E.mu) / rLEO) - moonPathPerigee, 0, 'engine',
        tt('Just enough of a burn for Earth to catch you on a long loop out to the Moon.'))); moonDown(); }
    else L.push(leg('earthBrake', tt('Brake into low Earth orbit'), burnFromOrbit(x.vInfArr, E.mu, rLEO), 0.1, 'engine',
      tt('Burn until Earth can hold you in a low orbit.')));
  } else if (from === 'moon') { moonUp(); L.push(leg('earthBrake', tt('Brake into low Earth orbit'), moonPathPerigee - circSpeed(E.mu, rLEO), 0.1, 'engine', tt('Burn until Earth can hold you in a low orbit.'))); }
  else { L.push(leg('earthLeave', tt('Leave Earth orbit for the Moon'), moonPathPerigee - circSpeed(E.mu, rLEO), 0, 'engine', tt('The burn the Apollo crews called "translunar injection".'))); moonDown(); }
  return L;
}

// Propellant (kg) for one burn of dv km/s that must leave endKg at the end. (The "rocket equation".)
export const propellant = (dv, isp, endKg) => endKg * (Math.exp((dv * 1000) / (isp * G0)) - 1);
// How much propellant a list of legs needs. One vehicle does every burn, so the early burns must also push the
// propellant for the later ones: the sum runs backwards from the landing. (The "rocket equation".)
export function propellantPlan(list, endKg, isp) {
  const ve = (isp * G0) / 1000; let m = endKg; const need = new Array(list.length).fill(0);
  for (let i = list.length - 1; i >= 0; i--) if (list[i].how === 'engine' && list[i].dv > 0) { const before = m * Math.exp(list[i].dv / ve); need[i] = before - m; m = before; }
  return { startKg: m, propKg: m - endKg, need };
}
export const massRatio = (dv, isp) => Math.exp((dv * 1000) / (isp * G0));

// The cheapest flight that leaves at tH: tries every flight time from 100 to 450 days.
export function bestTransfer(tH, dir = 'out', from = 'earth', to = 'mars', opts = {}) {
  let best = null;
  for (let d = 100; d <= 450; d += 5) { const x = transfer(tH, d, dir); if (!x) continue; const dv = legs(from, to, x, opts).reduce((s, l) => s + l.dv, 0); if (!best || dv < best.dv) best = { ...x, dv }; }
  return best;
}

// A whole mission plan.
//   from, to      'moon' | 'earth' | 'mars'
//   tH            game time now (Earth hours)
//   when          'window' (wait for the next cheap moment, the default) or 'now'
//   payloadKg     cargo and crew;  dryKg: the empty vehicle, heat shield included;  engine: a key of ENGINES
//   tankKg        how much propellant the vehicle can hold (optional)
export function plan({ from, to, tH = 0, when = 'window', payloadKg = 10000, dryKg = 30000, engine = 'methalox', tankKg = Infinity, aero = true } = {}) {
  const far = from === 'mars' || to === 'mars', dir = to === 'mars' ? 'out' : 'back', eng = ENGINES[engine] || ENGINES.methalox, opts = { aero };
  let departH = tH, x = null, windowH = null;
  if (far) {
    windowH = nextWindow(tH, dir);
    if (when === 'window') { departH = windowH; x = { days: HOHMANN_DAYS, vInfDep: dir === 'out' ? HOHMANN.dv1 : HOHMANN.dv2, vInfArr: dir === 'out' ? HOHMANN.dv2 : HOHMANN.dv1 }; }
    else { x = bestTransfer(tH, dir, from, to, opts); if (!x) return { ok: false, why: tt('No path joins the two planets from here today.') }; }
  }
  const list = legs(from, to, x || undefined, opts); if (!list.length) return { ok: false, why: tt('Choose two different places.') };
  if (from === 'moon' && far && when === 'window') {              // leave the Moon five days early, to be passing Earth on the day
    if (windowH - MOON_DAYS * 24 < tH) windowH += SYNODIC_D * 24;   // too late for this one: take the next
    departH = windowH - MOON_DAYS * 24;
  }
  const dv = list.reduce((s, l) => s + l.dv, 0), days = list.reduce((s, l) => s + l.days, 0), P = propellantPlan(list, payloadKg + dryKg, eng.isp);
  list.forEach((l, i) => { l.propKg = P.need[i]; });
  const arriveH = departH + days * 24, fits = P.propKg <= tankKg;
  return { ok: fits, why: fits ? '' : tt`The tanks hold ${Math.round(tankKg / 1000)} t. This flight needs ${Math.round(P.propKg / 1000)} t.`,
    from, to, legs: list, dv, days, engine, isp: eng.isp, payloadKg, dryKg, propKg: P.propKg, startKg: P.startKg, ratio: P.startKg / (payloadKg + dryKg),
    departH, arriveH, waitDays: Math.max(0, (departH - tH) / 24), windowH, waitForWindowDays: far ? (windowH - tH) / 24 : 0,
    stayDays: to === 'mars' ? (nextWindow(arriveH, 'back') - arriveH) / 24 : 0,   // on Mars: the wait until the cheap path home opens
    lightMinAtArrival: far ? lightMinutes(arriveH) : 384400 / 299792.458 / 60 };
}

// For the Science Center: the cost (km/s of engine burn) of leaving on each day, for each flight time.
// Gives rows of flight times and columns of leaving days; a cell is null where no path fits.
export function costMap(t0H, { from = 'earth', to = 'mars', spanDays = 900, stepDays = 15, minDays = 110, maxDays = 430, stepFlight = 16, aero = true } = {}) {
  const dir = to === 'mars' ? 'out' : 'back', cols = [], rows = [], cells = [];
  for (let d = 0; d <= spanDays; d += stepDays) cols.push(d);
  for (let f = minDays; f <= maxDays; f += stepFlight) rows.push(f);
  let min = Infinity, max = 0;
  for (const f of rows) { const row = []; for (const d of cols) { const x = transfer(t0H + d * 24, f, dir), v = x ? legs(from, to, x, { aero }).reduce((s, l) => s + l.dv, 0) : null; row.push(v); if (v != null) { min = Math.min(min, v); max = Math.max(max, v); } } cells.push(row); }
  return { cols, rows, cells, min, max };
}

// The assumptions, in words, for the screen that shows a plan.
export const ASSUMPTIONS = [
  tt('Earth and Mars go round the Sun on circles in one flat plane. Their real paths are slightly stretched and tilted.'),
  tt('Every burn happens in an instant. Real burns take minutes and cost a little more.'),
  tt('One vehicle does every burn. Nothing is thrown away and nothing is refuelled on the way.'),
  tt('The Moon can be left on any day. In truth the right moment comes round about once a month.'),
  tt('Landing on Mars uses the air first and the engine last. The 0.8 km/s for the engine is a game value.'),
];
