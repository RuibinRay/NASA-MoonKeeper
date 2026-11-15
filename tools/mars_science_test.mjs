// Checks the sums behind the Mars Science Center (js/mars/science.js) against values worked out by hand.
//   node tools/mars_science_test.mjs
import * as S from '../js/mars/science.js';
import { MARS } from '../js/mars/sim.js';   // the outpost's own numbers: the Science Center must show the same ones
let fails = 0;
const near = (name, got, want, tol) => { const ok = Math.abs(got - want) <= tol; if (!ok) fails++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(62)} ${got.toFixed(3)}  (expect ${want} ± ${tol})`); };
const yes = (name, ok, extra = '') => { if (!ok) fails++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(62)} ${extra}`); };

console.log('— gravity');
near('5 m fall on Earth (s)', S.fallTime(5, S.GRAV.earth), 1.01, 0.01);
near('5 m fall on Mars (s)', S.fallTime(5, S.GRAV.mars), Math.sqrt(10 / MARS.GRAVITY), 1e-9);
yes('Mars gravity is the outpost value, close to 3.7 m/s²', S.GRAV.mars === MARS.GRAVITY && Math.abs(MARS.GRAVITY - 3.72) < 0.02, String(S.GRAV.mars));
near('5 m fall on the Moon (s)', S.fallTime(5, S.GRAV.moon), 2.48, 0.01);
near('a 0.5 m Earth jump, on Mars (m)', S.jumpHeight(S.GRAV.mars), 1.32, 0.02);

console.log('— air pressure');
near('at the reference level (Pa)', S.pressureAt(0), MARS.P_MEAN, 1e-9);
near('at the outpost (Pa)', S.pressureAt(MARS.ELEV / 1000), MARS.P_MEAN * Math.exp(-MARS.ELEV / 1000 / MARS.SCALE_H), 1e-9);
yes('thicker air at the outpost, far thinner on the mountain top', S.pressureAt(MARS.ELEV / 1000) > MARS.P_MEAN * 1.3 && S.pressureAt(21.2) < MARS.P_MEAN * 0.2);
near('water boils at the triple point (°C)', S.boilC(S.TRIPLE), 0.01, 0.001);
near('water boils at the Armstrong limit (°C)', S.boilC(S.PRESSURES.armstrong), 37, 1.5);
near('water boils at Earth sea level (°C)', S.boilC(S.PRESSURES.earth), 100, 6);

console.log('— sunlight');
near('sunlight above the air at Mars (W/m²)', S.SUN_MARS, 586.2, 0.5);
const clear = S.solarKw(0.45, 50, 900), storm = S.solarKw(10, 50, 900), night = S.solarKw(0.45, 0, 900);
near('clear day, Sun 50° up: on the ground (W/m²)', clear.ground, 390, 8);
near('clear day: 900 m² field (kW)', clear.kw, 97, 3);
yes('a planet-wide storm cuts the power to under a tenth', storm.kw < clear.kw * 0.1 && storm.kw > 0, `${storm.kw.toFixed(1)} kW`);
yes('the direct beam dies long before the daylight does', storm.beam < 0.001 && storm.glow > 0.03, `beam ${(storm.beam * 100).toFixed(4)} %, daylight ${(storm.glow * 100).toFixed(1)} %`);
yes('no Sun, no power', night.kw === 0);
near('half the panels under dust halves the power', S.solarKw(0.45, 50, 900, 0.5).kw / clear.kw, 0.5, 1e-9);

console.log('— oxygen');
near('least energy chemistry allows (kWh per kg)', S.O2_FLOOR, 4.91, 0.01);
near('MOXIE at its best (kWh per kg)', S.MOXIE_KWH_KG, 25, 0.01);
const o = S.oxygenNeed(4, 10);
near('crew of 4 (kg a day)', o.kgDay, 3.36, 0.001); near('at 10 kWh per kg (kW, all day)', o.kw, 1.4, 0.001); near('MOXIEs running flat out', o.moxies, 11.67, 0.01);
yes('the game plant is above the floor and below MOXIE', 10 > S.O2_FLOOR && 10 < S.MOXIE_KWH_KG);

console.log('— water');
const e = S.iceEnergy(-60, true), m = S.iceEnergy(-60, false);
near('ice at -60 °C to vapour (kJ per kg)', e.kJ, 2954, 0.01); near('the same, in kWh', e.kwh, 0.82, 0.005); near('melting only (kJ per kg)', m.kJ, 454, 0.01);
const wn = S.waterNeed(4, 0.9, -60, true);
near('crew of 4 uses (L a day)', wn.use, 4 * MARS.H2O_PP, 1e-9); near('new water with 90 % recycled (L a day)', wn.fresh, 0.4 * MARS.H2O_PP, 1e-9);

yes('six topics, each with a name', S.topics().length === 6 && S.topics().every((t) => t.id && t.title), S.topics().map((t) => t.id).join(', '));
yes('each topic can also be shown alone', S.topics().every((t) => typeof S.DEMOS[t.id] === 'function') && Object.keys(S.KINDS).join() === 'obs,demo,prop,game');
console.log(fails ? `\n${fails} FAILED` : '\nall passed'); process.exit(fails ? 1 : 0);
