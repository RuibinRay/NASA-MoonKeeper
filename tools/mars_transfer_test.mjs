// Checks js/mars/transfer.js against the textbook answers for flights between Earth, the Moon and Mars.
//   node tools/mars_transfer_test.mjs
import * as T from '../js/mars/transfer.js';
let fails = 0;
const near = (name, got, want, tol) => { const ok = Math.abs(got - want) <= tol; if (!ok) fails++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(58)} ${got.toFixed(3)}  (expect ${want} ± ${tol})`); };
const yes = (name, ok, extra = '') => { if (!ok) fails++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(58)} ${extra}`); };
const E = T.BODY.earth, Mn = T.BODY.moon, Ma = T.BODY.mars, deg = 180 / Math.PI;

console.log('— the cheapest path between Earth and Mars');
near('flight time (days)', T.HOHMANN_DAYS, 258.9, 1);
near('speed to spare leaving Earth (km/s)', T.HOHMANN.dv1, 2.94, 0.03);
near('speed to spare reaching Mars (km/s)', T.HOHMANN.dv2, 2.65, 0.03);
near('burn out of a 300 km Earth orbit (km/s)', T.burnFromOrbit(T.HOHMANN.dv1, E.mu, E.R + 300), 3.6, 0.05);
near('burn into a 300 km Mars orbit (km/s)', T.burnFromOrbit(T.HOHMANN.dv2, Ma.mu, Ma.R + 300), 2.09, 0.05);
near('days between launch windows', T.SYNODIC_D, 779.94, 1e-9);
near('Mars ahead of Earth at launch (degrees)', 360 - T.windowLead('out') * deg, 44.3, 0.5);
near('Earth behind Mars at the launch home (degrees)', 360 - T.windowLead('back') * deg, 75.1, 0.7);
near('stay on Mars between the two cheap paths (days)', T.STAY_DAYS, 454, 6);

console.log('— the Moon');
near('days from the Moon to Earth', T.MOON_DAYS, 4.98, 0.05);
near('low Moon orbit speed (km/s)', T.circSpeed(Mn.mu, Mn.R + 100), 1.633, 0.005);
const m2e = T.legs('moon', 'earth'), e2m = T.legs('earth', 'moon');
near('burn out of Moon orbit toward Earth (km/s)', m2e[1].dv, 0.82, 0.03);
near('burn out of Earth orbit toward the Moon (km/s)', e2m[0].dv, 3.11, 0.04);

console.log('— windows');
const w = T.windows(0, 4, 'out').map((x) => x.departH);
const wins = T.windows(0, 4, 'out');
yes('windows come in order, one synodic period apart', w.every((t, i) => !i || Math.abs((t - w[i - 1]) / 24 - T.SYNODIC_D) < 1e-6), w.map((t) => (t / 24).toFixed(0)).join(', ') + ' days');
yes('each window gives leaving time, arrival, days and burn', wins.every((x) => Math.abs(x.arriveH - x.departH - x.days * 24) < 1e-6 && x.dv > 4 && x.dv < 5 && x.days > 255 && x.days < 262), `${wins[0].days.toFixed(1)} days, ${wins[0].dv.toFixed(2)} km/s`);
yes('the next window is never in the past', [0, 500, 5000, 20000, 123456].every((t) => T.nextWindow(t) >= t - 1e-6 && T.nextWindow(t) - t <= T.SYNODIC_D * 24 + 1e-6));
near('planets line up as planned at the window (degrees)', T.earthLead(w[0]) * deg, T.windowLead('out') * deg, 0.01);

console.log('— Lambert: a known ellipse, checked against Kepler');
{ const mu = T.BODY.sun.mu, a = 1.3 * T.AU, e = 0.25, p = a * (1 - e * e), period = 2 * Math.PI * Math.sqrt((a * a * a) / mu), k = Math.sqrt(mu / p);
  const pos = (nu) => { const r = p / (1 + e * Math.cos(nu)); return [r * Math.cos(nu), r * Math.sin(nu)]; };
  const tOf = (nu) => { const Ea = 2 * Math.atan2(Math.sqrt(1 - e) * Math.sin(nu / 2), Math.sqrt(1 + e) * Math.cos(nu / 2)), t = (Ea - e * Math.sin(Ea)) * Math.sqrt((a * a * a) / mu); return t < 0 ? t + period : t; };
  for (const [n1, n2, label] of [[20, 150, 'short way (130°)'], [20, 250, 'long way (230°)']]) {
    const nu1 = n1 / deg, nu2 = n2 / deg, L = T.lambert(pos(nu1), pos(nu2), tOf(nu2) - tOf(nu1), mu);
    near(`${label}: speed at the start, x (km/s)`, L.v1[0], -k * Math.sin(nu1), 1e-4); near(`${label}: speed at the start, y (km/s)`, L.v1[1], k * (e + Math.cos(nu1)), 1e-4);
    near(`${label}: speed at the end, x (km/s)`, L.v2[0], -k * Math.sin(nu2), 1e-4); near(`${label}: speed at the end, y (km/s)`, L.v2[1], k * (e + Math.cos(nu2)), 1e-4);
  } }

console.log('— leaving on other days');
const hCost = T.legs('earth', 'mars').reduce((s, l) => s + l.dv, 0), atW = T.bestTransfer(w[0], 'out'), early = T.bestTransfer(w[0] - 200 * 24, 'out'), late = T.bestTransfer(w[0] + 200 * 24, 'out');
near('cheapest flight found on the window day (km/s)', atW.dv, hCost, 0.15);
yes('200 days early costs much more', early && early.dv > hCost + 1.5, early ? early.dv.toFixed(2) + ' km/s, ' + early.days + ' days' : 'no path');
yes('200 days late costs much more', late && late.dv > hCost + 1.5, late ? late.dv.toFixed(2) + ' km/s, ' + late.days + ' days' : 'no path');
const map = T.costMap(0, { stepDays: 30, stepFlight: 40 });
yes('the cost map has a cheap valley near the Hohmann cost', map.min < hCost + 0.3 && map.max > hCost + 3, `min ${map.min.toFixed(2)} max ${map.max.toFixed(2)}`);

console.log('— whole plans');
const out = T.plan({ from: 'moon', to: 'mars', tH: 1000 }), back = T.plan({ from: 'mars', to: 'moon', tH: 1000 }), sup = T.plan({ from: 'earth', to: 'mars', tH: 1000, payloadKg: 20000 });
near('Moon to Mars, total burn (km/s)', out.dv, 3.97, 0.1);
near('Mars to Moon, total burn (km/s)', back.dv, 9.4, 0.2);
near('low Earth orbit to Mars, total burn (km/s)', sup.dv, 4.4, 0.1);
yes('coming home costs far more propellant than going', back.propKg > out.propKg * 3, `${(out.propKg / 1000).toFixed(0)} t out, ${(back.propKg / 1000).toFixed(0)} t back`);
near('propellant agrees with the rocket equation (mass ratio)', out.ratio, T.massRatio(out.dv, out.isp), 1e-9);
yes('the legs add up to the total', Math.abs(out.legs.reduce((s, l) => s + l.propKg, 0) - out.propKg) < 1e-6 && Math.abs(out.arriveH - out.departH - out.days * 24) < 1e-9);
yes('a plan never leaves before now', [0, 1000, 9000, 18000, 18700, 40000].every((t) => T.plan({ from: 'moon', to: 'mars', tH: t }).departH >= t - 1e-6));
yes('leaving the Moon, you pass Earth on the window day', Math.abs(out.departH + T.MOON_DAYS * 24 - out.windowH) < 1e-6);
near('wait on Mars for the cheap way home (days)', out.stayDays, T.STAY_DAYS, 1);
const small = T.plan({ from: 'mars', to: 'moon', tH: 0, tankKg: 50000 });
yes('a tank that is too small is refused, with a reason', !small.ok && small.why.length > 10, small.why);
const now = T.plan({ from: 'earth', to: 'mars', tH: w[0] + 300 * 24, when: 'now' });
yes('leaving at a bad time is possible but dear', now.legs && now.dv > sup.dv + 1, now.legs ? `${now.dv.toFixed(2)} km/s in ${now.days.toFixed(0)} days` : now.why);
yes('every leg has a fact class, and a source unless it is a game value', [out, back, sup].every((p) => p.legs.every((l) => ['obs', 'demo', 'prop', 'game'].includes(l.cls) && (l.cls === 'game' ? l.src === '' : /^https:\/\//.test(l.src)) && l.name && l.note && l.dv >= 0)));
near('one burn by the rocket equation: 1 km/s at 360 s, 10 t left (kg)', T.propellant(1, 360, 10000), 10000 * (Math.exp(1000 / (360 * 9.80665)) - 1), 1e-6);
yes('Mars orbit comes from sim.js', T.BODY.mars.a === 1.5237 && Math.abs(T.BODY.mars.year - 686.98) < 0.05, `${T.BODY.mars.a} AU, ${T.BODY.mars.year.toFixed(2)} days`);
const radio = Array.from({ length: 800 }, (_, i) => T.lightMinutes(i * 24));
near('radio time at the closest (minutes)', Math.min(...radio), 4.35, 0.1);
near('radio time at the farthest (minutes)', Math.max(...radio), 21.0, 0.1);

try { const S = await import('../js/mars/sim.js'); const worst = Math.max(...[0, 500, 5000, 20000, 60000].map((t) => Math.abs(S.lightMinutes({ t }, t) - T.lightMinutes(t))));
  near('agrees with sim.js on the radio delay (minutes apart)', worst, 0, 1e-6); } catch (e) { fails++; console.log('FAIL sim.js comparison:', e.message.split('\n')[0]); }

console.log(fails ? `\n${fails} FAILED` : '\nall passed'); process.exit(fails ? 1 : 0);
