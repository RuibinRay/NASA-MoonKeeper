// MOONKEEPER — Mars Science Center: six things you can try with your own hands, each with the sum behind it.
//   import { mountScienceCenter } from './mars/science.js';
//   const sc = mountScienceCenter(element, { topic: 'gravity', tH: S.t });   ...   sc.destroy();
// It draws into the element it is given and needs nothing else from the page (its styles come with it), so it works
// inside a game window and on a page of its own (science.html). Every number shown is worked out here from the
// values in sim.js and transfer.js; nothing is typed in as an answer.
// `node tools/mars_science_test.mjs` checks the sums.
import { tt } from '../i18n.js';
import * as SIM from './sim.js';
import * as T from './transfer.js';

const M = SIM.MARS || {}, PL = SIM.PLANT || {}, LOADS = SIM.LOADS || {};
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), RAD = Math.PI / 180;
const C = { text: '#e9f2f9', mute: '#9bb0c3', rust: '#e8703a', sand: '#d9a066', cyan: '#49e6ff', green: '#58e08a', amber: '#ffb347', red: '#ff5252', line: 'rgba(255,190,150,.22)', dark: '#0b1118' };
// The game's four fact classes (the same keys as CLS in game.js): [pill style, words]
export const KINDS = { obs: ['real', tt('Measured')], demo: ['demo', tt('Demonstrated')], prop: ['prop', tt('Proposed by NASA studies')], game: ['game', tt('Made for the game')] };
const pill = (k) => `<span class="pill ${KINDS[k][0]}">${KINDS[k][1]}</span>`;

// ---------------------------------------------------------------- the sums (also used by the test)
export const GRAV = { earth: 9.81, moon: 1.62, mars: M.GRAVITY || 3.73 };                      // m/s²
export const fallTime = (h, g) => Math.sqrt((2 * h) / g);                                        // seconds to fall h metres from rest
export const jumpHeight = (g, earthJump = 0.5) => (earthJump * GRAV.earth) / g;                  // the same push from your legs, another world
export const P_MEAN = M.P_MEAN || 636, SCALE_H = M.SCALE_H || 11.1, TRIPLE = 611.657;            // Pa, km, Pa
export const pressureAt = (km) => P_MEAN * Math.exp(-km / SCALE_H);                              // Pa at a height above Mars's reference level
// The temperature (°C) at which water boils under a pressure in Pa (Clausius–Clapeyron from water's triple point).
export const boilC = (p) => 1 / (1 / 273.16 - (Math.log(p / TRIPLE) * 8.314) / 45050) - 273.15;
export const PRESSURES = { earth: 101325, everest: 33700, suit: 29600, armstrong: 6300 };       // Pa
export const SUN_MARS = (M.SUN_1AU || 1361) / Math.pow(M.A_AU || 1.5237, 2);                     // W/m² above the air, at Mars's average distance
const sky = SIM.skyFactor || ((tau, mu) => (mu <= 0 ? 0 : Math.exp((-0.21 * tau) / Math.pow(Math.max(mu, 0.04), 0.7))));
const direct = SIM.directFactor || ((tau, mu) => (mu <= 0 ? 0 : Math.exp(-tau / Math.max(mu, 0.04))));
// Electricity from a solar field (kW): dust in the air (tau), the Sun's height (degrees), the field's size and the dust lying on it.
export function solarKw(tau, sunDeg, areaM2, onPanels = 0, eff = PL.CELL_EFF || 0.27) {
  const mu = Math.sin(sunDeg * RAD), ground = SUN_MARS * Math.max(0, mu) * sky(tau, mu);
  return { ground, kw: (ground * areaM2 * eff * (1 - onPanels)) / 1000, beam: direct(tau, mu), glow: sky(tau, mu) };
}
export const O2_PP = M.O2_PP || 0.84, H2O_PP = M.H2O_PP || 3.52;                                  // each person, each day: kg of oxygen, litres of water
export const O2_FLOOR = (2 * 283.0) / 0.031998 / 3600;                                           // kWh per kg: the least energy chemistry allows for 2 CO2 -> 2 CO + O2 (283.0 kJ per mole of CO2)
export const MOXIE = { watts: 300, bestGh: 12, totalG: 122, runs: 16 };                          // NASA's oxygen maker on the Perseverance rover
export const MOXIE_KWH_KG = MOXIE.watts / MOXIE.bestGh;                                          // at its best: watts ÷ grams an hour = kWh per kg
export const oxygenNeed = (crew, kwhPerKg) => { const kgDay = O2_PP * crew; return { kgDay, kwhDay: kgDay * kwhPerKg, kw: (kgDay * kwhPerKg) / 24, moxies: (kgDay * 1000) / 24 / MOXIE.bestGh }; };
// Energy to turn 1 kg of ice at iceC into clean water (kJ): warm it, melt it, and (to leave the salts behind) turn it to vapour.
export const iceEnergy = (iceC, vapour) => { const warm = 2.0 * Math.max(0, -iceC), melt = 334, boil = vapour ? 2500 : 0; return { warm, melt, boil, kJ: warm + melt + boil, kwh: (warm + melt + boil) / 3600 }; };
export const waterNeed = (crew, recycled, iceC, vapour) => { const fresh = H2O_PP * crew * (1 - recycled), e = iceEnergy(iceC, vapour); return { use: H2O_PP * crew, fresh, kwhDay: fresh * e.kwh, e }; };

// ---------------------------------------------------------------- small page helpers
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const num = (x, d = 1) => (Math.abs(x) >= 100 || d === 0 ? Math.round(x).toLocaleString('en-US') : x.toFixed(d));
function canvas(host, w, h) {
  const c = el('canvas', 'msc-cv'), dpr = Math.min(2, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1);
  c.width = w * dpr; c.height = h * dpr; c.style.aspectRatio = `${w} / ${h}`; host.appendChild(c);
  const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.font = '13px Inter, system-ui, sans-serif'; g.textBaseline = 'middle';
  return { c, g, w, h };
}
function slider(host, label, min, max, step, value, fmt, on) {
  const row = el('label', 'msc-sl'), name = el('span', 'msc-sl-n', label), out = el('b', 'msc-sl-v'), inp = el('input');
  Object.assign(inp, { type: 'range', min, max, step, value }); const show = () => { out.textContent = fmt(+inp.value); };
  inp.oninput = () => { show(); on(+inp.value); }; show(); row.append(name, inp, out); host.appendChild(row);
  return { get value() { return +inp.value; }, set(v) { inp.value = v; show(); on(+inp.value); } };
}
function choices(host, label, list, value, on) {      // list: [[id, text]]
  const row = el('div', 'msc-ch'); if (label) row.appendChild(el('span', 'msc-sl-n', label)); let cur = value;
  const btns = list.map(([id, text]) => { const b = el('button', id === value ? 'on' : '', text); b.type = 'button'; b.onclick = () => { cur = id; btns.forEach((x, i) => x.classList.toggle('on', list[i][0] === id)); on(id); }; row.appendChild(b); return b; });
  host.appendChild(row); return { get value() { return cur; } };
}
const facts = (host) => { const box = el('div', 'msc-facts'); host.appendChild(box); return (rows) => { box.innerHTML = rows.map(([k, v, tone]) => `<div class="msc-fact${tone ? ' ' + tone : ''}"><span>${k}</span><b>${v}</b></div>`).join(''); }; };
const text = (g, s, x, y, col = C.text, align = 'left', font) => { g.fillStyle = col; g.textAlign = align; if (font) g.font = font; g.fillText(s, x, y); if (font) g.font = '13px Inter, system-ui, sans-serif'; };
const bar = (g, x, y, w, h, col) => { g.fillStyle = col; g.beginPath(); g.roundRect ? g.roundRect(x, y, Math.max(0, w), h, 4) : g.rect(x, y, Math.max(0, w), h); g.fill(); };

// ---------------------------------------------------------------- the six demonstrations
// Each: build(box, opts) puts its controls and picture into box and gives back draw(seconds), called every frame.
const TOPICS = [
  { id: 'gravity', title: tt('Gravity'),
    simple: tt('Drop the same ball on three worlds. Mars pulls about a third as hard as Earth, and more than twice as hard as the Moon. You could jump over a table, but a fall from a roof still hurts.'),
    deeper: tt`With no air in the way, a dropped thing falls for a time that depends only on the height and on the pull of the world, g. Mars is about half as wide as Earth and has a tenth of its mass, which gives ${GRAV.mars} m/s² at the ground. The thin air of Mars hardly slows a ball, so the same sum works there.`,
    formula: 't = √(2h ÷ g)        v = g × t',   // letters only: the same in every language
    sources: [[tt`NASA Mars Fact Sheet: surface gravity ${GRAV.mars} m/s²`, 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html', 'obs'], [tt('NASA Moon Fact Sheet: surface gravity 1.62 m/s²'), 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html', 'obs']],
    build(box) {
      const { g, w, h } = canvas(box, 560, 300), worlds = [['earth', tt('Earth'), '#6fb7ff'], ['moon', tt('Moon'), '#cfd6dc'], ['mars', tt('Mars'), C.rust]];
      let H = 5, t0 = null, now = 0; const set = facts(box);
      const s = slider(box, tt('Drop from'), 1, 20, 1, H, (v) => tt`${v} m`, (v) => { H = v; t0 = null; show(); });
      const b = el('button', 'msc-go', tt('Drop')); b.type = 'button'; b.onclick = () => { t0 = now; }; box.appendChild(b);
      const show = () => set(worlds.map(([k, name]) => [name, tt`${fallTime(H, GRAV[k]).toFixed(2)} s, lands at ${(GRAV[k] * fallTime(H, GRAV[k])).toFixed(1)} m/s`]).concat([[tt('A jump that lifts you 0.5 m on Earth'), tt`${jumpHeight(GRAV.mars).toFixed(1)} m on Mars, ${jumpHeight(GRAV.moon).toFixed(1)} m on the Moon`]]));
      show(); void s;
      return (sec) => { now = sec; if (t0 === null) t0 = sec; const t = sec - t0, top = 46, floor = h - 34, px = (floor - top) / H;
        g.clearRect(0, 0, w, h);
        worlds.forEach(([k, name, col], i) => { const x = w * (0.2 + 0.3 * i), tf = fallTime(H, GRAV[k]), tt2 = Math.min(t, tf), y = top + 0.5 * GRAV[k] * tt2 * tt2 * px;
          g.strokeStyle = C.line; g.setLineDash([4, 5]); g.beginPath(); g.moveTo(x, top); g.lineTo(x, floor); g.stroke(); g.setLineDash([]);
          bar(g, x - 60, floor, 120, 6, col); g.fillStyle = col; g.beginPath(); g.arc(x, Math.min(y, floor) - 9, 9, 0, 7); g.fill();
          text(g, name, x, 20, C.text, 'center', '600 15px Chakra Petch, Inter, sans-serif'); text(g, tt`${tt2.toFixed(2)} s`, x, floor + 20, t >= tf ? C.green : C.mute, 'center'); });
        text(g, tt`${H} m`, 14, top, C.mute); text(g, '0 m', 14, floor - 4, C.mute); };
    } },

  { id: 'pressure', title: tt('Air pressure'),
    simple: tt('The air of Mars is so thin that it presses on you less than a hundredth as hard as the air on Earth. Without a suit or sealed walls, the water in your body would start to boil. That is why every room of the outpost is a sealed bubble.'),
    deeper: tt('Air gets thinner as you climb: on Mars it thins by a factor of e (about 2.7) for every 11 km. Low ground has the thickest air, which is one reason to build there: more air to slow a lander, and more carbon dioxide to make oxygen from. Below 612 pascals liquid water cannot exist at all: ice turns straight into vapour. Below about 6,300 pascals (the "Armstrong limit") water boils at body heat.'),
    formula: tt`p = p₀ × e^(−height ÷ H)        p₀ = ${P_MEAN} Pa,  H = ${SCALE_H} km`,
    sources: [[tt('NASA Mars Fact Sheet: surface pressure 6.36 mb at the mean radius (4.0 to 8.7 mb with the seasons), scale height'), 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html', 'obs'], [tt('NASA Earth Fact Sheet: 1,014 mb at the surface'), 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html', 'obs'], [tt('Heights from the MOLA laser altimeter (NASA Planetary Data System)'), 'https://pds-geosciences.wustl.edu/missions/mgs/megdr.html', 'obs'], [tt('NASA\'s spacewalk suit holds 29.6 kPa (4.3 psi) of pure oxygen; the Armstrong limit is 6.3 kPa'), '', 'demo']],
    build(box) {
      const { g, w, h } = canvas(box, 560, 260); let km = (M.ELEV ?? -3992) / 1000; const set = facts(box);
      const s = slider(box, tt('Height on Mars'), -8.2, 21.2, 0.1, km, (v) => tt`${v.toFixed(1)} km`, (v) => { km = v; show(); });
      choices(box, tt('Go to'), [['base', tt('The outpost')], ['low', tt('Lowest ground (Hellas)')], ['high', tt('Top of Olympus Mons')]], 'base', (id) => s.set({ base: (M.ELEV ?? -3992) / 1000, low: -8.2, high: 21.2 }[id]));
      const show = () => { const p = pressureAt(km); set([[tt('Pressure here'), tt`${num(p, 0)} Pa`], [tt('Compared with Earth at sea level'), tt`${((p / PRESSURES.earth) * 100).toFixed(2)} %`],
        [tt('Water'), p < TRIPLE ? tt('Cannot stay liquid: ice turns straight into vapour') : tt`Boils at ${boilC(p).toFixed(0)} °C`, p < TRIPLE ? 'warn' : '']]); };
      show();
      return () => { const rows = [[tt('Earth, sea level'), PRESSURES.earth, '#6fb7ff'], [tt('Top of Mount Everest'), PRESSURES.everest, '#8fc3ee'], [tt('Inside a NASA spacesuit'), PRESSURES.suit, C.green], [tt('Water boils at body heat'), PRESSURES.armstrong, C.amber], [tt('Mars, where you are'), pressureAt(km), C.rust]];
        g.clearRect(0, 0, w, h); const x0 = 190, x1 = w - 86, lg = (p) => x0 + ((Math.log10(p) - 1.5) / (5.2 - 1.5)) * (x1 - x0);
        rows.forEach(([name, p, col], i) => { const y = 30 + i * 44; text(g, name, x0 - 10, y, C.text, 'right'); bar(g, x0, y - 10, lg(p) - x0, 20, col); text(g, tt`${num(p, 0)} Pa`, lg(p) + 8, y, C.mute); });
        g.strokeStyle = C.line; g.beginPath(); g.moveTo(x0, 12); g.lineTo(x0, h - 26); g.stroke(); text(g, tt('Each step to the right is ten times more'), x0, h - 12, C.mute); };
    } },

  { id: 'solar', title: tt('Solar power and dust'),
    simple: tt('Mars is farther from the Sun than Earth, so its sunlight is less than half as strong. Dust in the air dims it more, and dust on the panels more again. Move the sliders and watch what a dust storm does to the outpost.'),
    deeper: tt('Scientists measure dust in the air with one number, the optical depth τ ("tau"). On a clear day τ is about 0.5. In the planet-wide storm of 2018 it went above 10, and the Opportunity rover, which ran on sunlight alone, never woke up. Dust blocks the direct beam of the Sun very fast, but it also scatters light, so the whole sky glows and panels keep making some power. That is why the game dims the Sun\'s disc much more than it dims the daylight.'),
    formula: tt('power = sunlight × sin(Sun height) × sky(τ) × area × 0.27 × (1 − dust on panels)'),
    sources: [[tt('NASA Mars Fact Sheet: sunlight 586.2 W/m² at Mars, 1,361 at Earth'), 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html', 'obs'], [tt('Appelbaum and Flood, "Solar radiation on Mars" (NASA, 1989): how dust dims the beam and brightens the sky'), 'https://ntrs.nasa.gov/citations/19890018252', 'obs'], [tt('NASA Opportunity rover: the 2018 dust storm ended its mission'), 'https://science.nasa.gov/mission/mer-opportunity/', 'obs'], [tt('The sky-glow numbers are read from the table in the 1991 update of that paper. They are a NASA calculation, not a measurement on the ground.'), 'https://ntrs.nasa.gov/citations/19910023732', 'prop']],
    build(box) {
      const { g, w, h } = canvas(box, 560, 280), need = Object.values(LOADS).reduce((a, b) => a + b, 0) || 30, reactor = PL.REACTOR_KW || 10; const set = facts(box);
      let tau = 0.45, sun = 50, area = PL.ARRAY_M2 || 900, dust = 0.03;
      const sT = slider(box, tt('Dust in the air (τ)'), 0.2, 10, 0.05, tau, (v) => v.toFixed(2), (v) => { tau = v; show(); });
      choices(box, '', [['clear', tt('Clear day')], ['storm', tt('Regional storm')], ['global', tt('Planet-wide storm')]], 'clear', (id) => sT.set({ clear: 0.45, storm: 3, global: 10 }[id]));
      slider(box, tt('Height of the Sun'), 0, 75, 1, sun, (v) => `${v}°`, (v) => { sun = v; show(); });
      slider(box, tt('Size of the solar field'), 100, 2000, 50, area, (v) => tt`${num(v, 0)} m²`, (v) => { area = v; show(); });
      slider(box, tt('Dust lying on the panels'), 0, 60, 1, dust * 100, (v) => `${v} %`, (v) => { dust = v / 100; show(); });
      const show = () => { const r = solarKw(tau, sun, area, dust); set([[tt('Sunlight reaching the ground'), tt`${num(r.ground, 0)} W/m²`], [tt('Direct beam that gets through'), tt`${(r.beam * 100).toFixed(r.beam < 0.1 ? 1 : 0)} %`], [tt('Daylight that gets through, glow included'), tt`${(r.glow * 100).toFixed(0)} %`],
        [tt('Solar power'), tt`${num(r.kw)} kW`, r.kw + reactor < need ? 'warn' : 'good'], [tt('The outpost uses, with everything on'), tt`${num(need)} kW (the reactor gives ${num(reactor, 0)})`]]); };
      show();
      return () => { const r = solarKw(tau, sun, area, dust), k = clamp(tau / 6, 0, 1), sy = h - 70 - (sun / 75) * (h - 120);
        const sk = g.createLinearGradient(0, 0, 0, h - 60); sk.addColorStop(0, `rgb(${Math.round(70 + 90 * k)},${Math.round(84 + 30 * k)},${Math.round(110 - 30 * k)})`); sk.addColorStop(1, `rgb(${Math.round(214 - 40 * k)},${Math.round(160 - 40 * k)},${Math.round(112 - 40 * k)})`);
        g.fillStyle = sk; g.fillRect(0, 0, w, h - 60); const halo = g.createRadialGradient(120, sy, 2, 120, sy, 70 + 80 * k); halo.addColorStop(0, `rgba(235,240,255,${0.25 + 0.75 * Math.sqrt(r.beam)})`); halo.addColorStop(1, 'rgba(235,240,255,0)');
        g.fillStyle = halo; g.fillRect(0, 0, w, h - 60); g.fillStyle = `rgba(255,255,255,${0.15 + 0.85 * Math.sqrt(r.beam)})`; g.beginPath(); g.arc(120, sy, 9, 0, 7); g.fill();
        g.fillStyle = '#7a4a34'; g.fillRect(0, h - 60, w, 60); for (let i = 0; i < 6; i++) { const x = 250 + i * 46; g.fillStyle = `rgb(${Math.round(30 + 150 * dust)},${Math.round(58 + 70 * dust)},${Math.round(120 - 30 * dust)})`; g.beginPath(); g.moveTo(x, h - 62); g.lineTo(x + 36, h - 62); g.lineTo(x + 44, h - 84); g.lineTo(x + 8, h - 84); g.fill(); }
        const bx = 250, bw = w - bx - 20, top = Math.max(need * 1.3, r.kw + reactor, 1), X = (v) => bx + (v / top) * bw;
        text(g, tt('Power made'), bx, h - 44, C.text); bar(g, bx, h - 34, X(reactor) - bx, 12, C.amber); bar(g, X(reactor), h - 34, X(reactor + r.kw) - X(reactor), 12, C.cyan);
        g.strokeStyle = C.red; g.lineWidth = 2; g.beginPath(); g.moveTo(X(need), h - 40); g.lineTo(X(need), h - 18); g.stroke(); g.lineWidth = 1;
        text(g, tt('reactor'), bx, h - 9, C.amber); text(g, tt('solar'), bx + 62, h - 9, C.cyan); text(g, tt('red line: needed'), w - 20, h - 9, C.red, 'right'); };
    } },

  { id: 'oxygen', title: tt('Oxygen from the air'),
    simple: tt('The air of Mars is 95 parts in 100 carbon dioxide: one carbon atom holding two oxygen atoms. Pull one oxygen atom off and you have something to breathe. A machine on the Perseverance rover did exactly that, sixteen times.'),
    deeper: tt('NASA\'s MOXIE heated Mars air to about 800 °C and used electricity to pull oxygen atoms through a ceramic sheet. In all it made 122 grams, and at its best 12 grams an hour, using about 300 watts. Chemistry sets a floor of 4.9 kWh for each kilogram of oxygen; real machines need several times more. A machine big enough for a crew has not been built. The outpost\'s plant in the game is a scaled-up plan.'),
    formula: tt('2 CO₂ + energy → 2 CO + O₂        at least 4.9 kWh for each kg of O₂'),
    sources: [[tt('NASA: MOXIE made 122 g of oxygen in 16 runs, up to 12 g an hour at 98 % purity'), 'https://www.nasa.gov/missions/mars-2020-perseverance/perseverance-rover/nasas-oxygen-generating-experiment-moxie-completes-mars-mission/', 'demo'], [tt('NASA Perseverance instruments: MOXIE, 300 watts'), 'https://science.nasa.gov/mission/mars-2020-perseverance/science-instruments/', 'demo'], [tt('NASA Mars Fact Sheet: the air is 95 % carbon dioxide'), 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html', 'obs'], [tt('A person breathes about 0.84 kg of oxygen a day (NASA life-support figures); the plant\'s 10 kWh per kg is a game value'), '', 'game']],
    build(box) {
      const { g, w, h } = canvas(box, 560, 230), gameKwh = PL.O2_KWH_KG || 10; let crew = M.CREW || 4, kwh = gameKwh; const set = facts(box), dots = Array.from({ length: 8 }, (_, i) => i / 8);
      slider(box, tt('Crew'), 1, 8, 1, crew, (v) => tt`${v} people`, (v) => { crew = v; show(); });
      choices(box, tt('Energy for each kg'), [['floor', tt`Chemistry's floor: ${O2_FLOOR.toFixed(1)} kWh`], ['game', tt`The outpost's plant: ${gameKwh} kWh`], ['moxie', tt`MOXIE at its best: ${MOXIE_KWH_KG.toFixed(0)} kWh`]], 'game', (id) => { kwh = { floor: O2_FLOOR, game: gameKwh, moxie: MOXIE_KWH_KG }[id]; show(); });
      const show = () => { const n = oxygenNeed(crew, kwh); set([[tt('The crew breathes'), tt`${n.kgDay.toFixed(2)} kg a day (${num((n.kgDay * 1000) / 24, 0)} g an hour)`], [tt('Electricity to make it'), tt`${num(n.kwhDay)} kWh a day: ${n.kw.toFixed(1)} kW all day and night`], [tt('MOXIE machines running flat out'), tt`${Math.ceil(n.moxies)}`]]); };
      show();
      const mol = (x, y, kind) => { const o = (dx) => { g.fillStyle = '#ff6b5e'; g.beginPath(); g.arc(x + dx, y, 6, 0, 7); g.fill(); }, c = () => { g.fillStyle = '#8a949e'; g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); };
        if (kind === 'co2') { o(-11); o(11); c(); } else if (kind === 'co') { o(10); c(); } else { o(-6); o(6); } };
      return (sec) => { g.clearRect(0, 0, w, h); const cx = w / 2, cy = 118;
        g.strokeStyle = C.line; g.lineWidth = 16; g.lineCap = 'round'; g.beginPath(); g.moveTo(30, cy); g.lineTo(cx - 60, cy); g.moveTo(cx + 60, cy); g.lineTo(w - 30, cy); g.moveTo(cx, cy - 40); g.lineTo(cx, 28); g.stroke(); g.lineWidth = 1;
        bar(g, cx - 60, cy - 40, 120, 80, '#3a2018'); g.strokeStyle = C.rust; g.strokeRect(cx - 60, cy - 40, 120, 80); text(g, '800 °C', cx, cy - 8, C.amber, 'center', '600 16px Chakra Petch, Inter, sans-serif'); text(g, tt('electricity in'), cx, cy + 14, C.mute, 'center');
        dots.forEach((d, i) => { const p = (d + sec * 0.12) % 1; if (p < 0.45) mol(34 + (p / 0.45) * (cx - 100), cy, 'co2'); else { mol(cx + 66 + ((p - 0.45) / 0.55) * (w - cx - 100), cy, 'co'); if (i % 2) mol(cx, cy - 46 - ((p - 0.45) / 0.55) * 60, 'o2'); } });   // two carbon dioxide in: two carbon monoxide and one oxygen out
        text(g, tt('Mars air: carbon dioxide'), 30, cy + 34, C.mute); text(g, tt('carbon monoxide, let go'), w - 30, cy + 34, C.mute, 'right'); text(g, tt('oxygen, kept'), cx + 16, 30, C.green); };
    } },

  { id: 'water', title: tt('Water from ice'),
    simple: tt('There is ice just under the soil where the outpost stands. Getting a drink from it takes three steps: warm the ice, melt it, and clean it. The cleaning matters: Mars soil holds salts that are bad for people.'),
    deeper: tt('Orbiters have found ice within a metre or so of the surface across Arcadia Planitia, which is why the outpost is here. The Phoenix lander dug into ice like this in 2008 and found salts called perchlorates in the soil. One sure way to leave the salts behind is to turn the water into vapour and catch it again, but that costs about seven times the energy of melting alone. Recycling used water saves far more than any drill: every litre cleaned is a litre you do not have to dig.'),
    formula: tt('energy = warm (2.0 kJ per kg per °C) + melt (334 kJ per kg) + vapour (2,500 kJ per kg)'),
    sources: [[tt('NASA: a map of buried ice on Mars, with Arcadia Planitia as a leading place to land'), 'https://www.nasa.gov/solar-system/nasas-treasure-map-for-water-ice-on-mars/', 'obs'], [tt('NASA Phoenix lander: ice under the soil, and perchlorate salts'), 'https://science.nasa.gov/mission/phoenix/', 'obs'], [tt('Heat needed to warm, melt and boil water: school physics tables'), '', 'obs'], [tt('How much each person uses and how much is recycled are game values close to the Space Station\'s'), '', 'game']],
    build(box) {
      const { g, w, h } = canvas(box, 560, 200); let iceC = -60, crew = M.CREW || 4, rec = PL.RECYCLE ?? 0.9, vap = true; const set = facts(box);
      slider(box, tt('How cold the ice is'), -110, -10, 5, iceC, (v) => `${v} °C`, (v) => { iceC = v; show(); });
      slider(box, tt('Crew'), 1, 8, 1, crew, (v) => tt`${v} people`, (v) => { crew = v; show(); });
      slider(box, tt('Used water cleaned and used again'), 0, 98, 1, rec * 100, (v) => `${v} %`, (v) => { rec = v / 100; show(); });
      choices(box, tt('Cleaning'), [['vap', tt('Turn it to vapour and catch it')], ['melt', tt('Melt and filter only')]], 'vap', (id) => { vap = id === 'vap'; show(); });
      const show = () => { const n = waterNeed(crew, rec, iceC, vap); set([[tt('Energy for one litre'), tt`${num(n.e.kJ, 0)} kJ (${n.e.kwh.toFixed(2)} kWh)`], [tt('The crew uses'), tt`${num(n.use)} L a day`], [tt('New water to dig each day'), tt`${num(n.fresh)} L`, n.fresh > (PL.WATER_L_SOL || 40) ? 'warn' : 'good'], [tt('Electricity for the digging'), tt`${num(n.kwhDay)} kWh a day`], [tt('The outpost\'s ice well gives'), tt`${num(PL.WATER_L_SOL || 40, 0)} L each sol`]]); };
      show();
      return () => { const e = iceEnergy(iceC, vap), full = iceEnergy(-110, true).kJ, x0 = 30, bw = w - 60, parts = [[tt('warm the ice'), e.warm, '#8fc3ee'], [tt('melt it'), e.melt, C.cyan], [tt('turn it to vapour'), e.boil, C.rust]];
        g.clearRect(0, 0, w, h); text(g, tt('Energy to make one litre of clean water'), x0, 24, C.text, 'left', '600 15px Chakra Petch, Inter, sans-serif'); let x = x0;
        parts.forEach(([name, kJ, col], i) => { const wd = (kJ / full) * bw; bar(g, x, 50, wd, 46, col); if (kJ > 0) { text(g, name, x0 + i * 180, 124, col); text(g, tt`${num(kJ, 0)} kJ`, x0 + i * 180, 144, C.mute); } x += wd; });
        g.strokeStyle = C.line; g.strokeRect(x0, 50, bw, 46); text(g, tt`${num(e.kJ, 0)} kJ in all`, x0, 178, C.text); };
    } },

  { id: 'rocket', title: tt('Flying between worlds'),
    simple: tt('You cannot fly to Mars whenever you like. Earth and Mars both circle the Sun, and the cheap path only opens when they line up: once every 26 months. Then the trip takes about 9 months, with the engines off almost all the way.'),
    deeper: tt('A rocket trip is counted in "delta-v": the total change of speed the engines must give. The cheapest path is half an ellipse round the Sun that touches the orbit you leave and the orbit you want. From the Moon the first steps are cheap, because the Moon is small and has no air. Landing on Mars is cheap too, because its air does most of the braking. Coming back is the dear part: climbing off Mars costs more than twice as much as everything on the way out. The propellant sum is hard on big numbers: each extra kilometre a second multiplies the propellant you need.'),
    formula: tt('Δv = exhaust speed × ln(mass at start ÷ mass at end)        exhaust speed = Isp × 9.81 m/s²'),
    sources: [[tt('NASA Basics of Space Flight, chapter 4: trajectories and transfer orbits'), 'https://science.nasa.gov/learn/basics-of-space-flight/chapter4-1/', 'obs'], [tt('NASA planetary fact sheets: sizes, masses, years of Earth, the Moon and Mars'), 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/', 'obs'], [tt('NASA: the Hohmann transfer to Mars, about 8.5 months'), 'https://pwg.gsfc.nasa.gov/stargaze/Smars1.htm', 'prop'], [tt('The wait on Mars for the way home is this model\'s own sum'), '', 'game'], [tt('Circles for orbits, instant burns, one vehicle with no refuelling, and 0.8 km/s to land on Mars are simplifications'), '', 'game']],
    build(box, opts) {
      const { g, w, h } = canvas(box, 560, 300), tH = opts.tH || 0; let route = 'moon>mars', engine = 'methalox', payload = 10, P = null, map = null; const set = facts(box), table = el('div', 'msc-legs');
      choices(box, tt('Trip'), [['moon>mars', tt('Moon to Mars')], ['mars>moon', tt('Mars to Moon')], ['earth>mars', tt('Earth orbit to Mars')], ['mars>earth', tt('Mars to Earth orbit')]], route, (id) => { route = id; map = null; show(); });
      choices(box, tt('Engine'), Object.entries(T.ENGINES).map(([k, e]) => [k, e.name]), engine, (id) => { engine = id; show(); });
      slider(box, tt('Cargo and crew'), 1, 50, 1, payload, (v) => tt`${v} t`, (v) => { payload = v; show(); }); box.appendChild(table);
      const show = () => { const [from, to] = route.split('>'); P = T.plan({ from, to, tH, payloadKg: payload * 1000, engine });
        set([[tt('Next cheap moment to leave'), tt`in ${num(P.waitDays, 0)} days`], [tt('The trip takes'), tt`${num(P.days, 0)} days`], [tt('Total change of speed'), tt`${P.dv.toFixed(2)} km/s`], [tt('Propellant'), tt`${num(P.propKg / 1000, 0)} t to move ${num((P.payloadKg + P.dryKg) / 1000, 0)} t`, P.ratio > 8 ? 'warn' : ''],
          to === 'mars' ? [tt('Then wait on Mars for the way home'), tt`${num(P.stayDays, 0)} days`] : [tt('Radio delay to Earth on arrival'), tt`${P.lightMinAtArrival.toFixed(1)} minutes each way`]]);
        table.innerHTML = `<div class="msc-leg msc-leg-h"><span>${tt('Step')}</span><span>km/s</span><span>${tt('Propellant')}</span><span></span></div>` + P.legs.map((l) => `<div class="msc-leg" title="${l.note.replace(/"/g, '&quot;')}"><span>${l.name}</span><span>${l.how === 'engine' ? l.dv.toFixed(2) : l.how === 'air' ? tt('the air') : '—'}</span><span>${l.propKg ? num(l.propKg / 1000, l.propKg < 10000 ? 1 : 0) + ' t' : '—'}</span>${pill(l.cls)}</div>`).join('') + `<p class="msc-note">${T.ENGINES[engine].note}</p>`; };
      show();
      return (sec) => { const [from, to] = route.split('>'), out = to === 'mars', cx = 150, cy = 150, RE = 62, RM = RE * T.BODY.mars.a, far = from === 'mars' || to === 'mars';
        g.clearRect(0, 0, w, h); g.strokeStyle = C.line; [RE, RM].forEach((r) => { g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke(); }); g.fillStyle = '#ffd76a'; g.beginPath(); g.arc(cx, cy, 7, 0, 7); g.fill();
        const tWin = P.windowH ?? tH, cruise = T.HOHMANN_DAYS * 24, f = (sec * 0.12) % 1.25, tt2 = tWin + Math.min(1, f) * cruise, a0 = T.planetAngles(tWin), a = T.planetAngles(tt2), pt = (r, an) => [cx + r * Math.cos(an), cy - r * Math.sin(an)];
        const dot = (r, an, col, name) => { const [x, y] = pt(r, an); g.fillStyle = col; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); text(g, name, x + 8, y - 8, col); };
        if (far) { const start = out ? a0.earth : a0.mars, r1 = out ? RE : RM, r2 = out ? RM : RE, A = (r1 + r2) / 2, e = Math.abs(r2 - r1) / (r1 + r2), rr = (nu) => (A * (1 - e * e)) / (1 + e * Math.cos(nu));   // the half-ellipse: nu from 0 to π going out, π to 2π coming back
          g.strokeStyle = C.rust; g.setLineDash([5, 4]); g.beginPath(); for (let i = 0; i <= 40; i++) { const nu = (out ? 0 : Math.PI) + (Math.PI * i) / 40, [x, y] = pt(rr(nu), start + nu - (out ? 0 : Math.PI)); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); g.setLineDash([]);
          const Mm = Math.PI * Math.min(1, f) + (out ? 0 : Math.PI); let Ea = Mm; for (let i = 0; i < 6; i++) Ea -= (Ea - e * Math.sin(Ea) - Mm) / (1 - e * Math.cos(Ea)); const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(Ea / 2), Math.sqrt(1 - e) * Math.cos(Ea / 2)), [sx, sy] = pt(rr(nu), start + nu - (out ? 0 : Math.PI));
          g.fillStyle = '#fff'; g.beginPath(); g.arc(sx, sy, 3.5, 0, 7); g.fill(); text(g, tt`day ${num(Math.min(1, f) * T.HOHMANN_DAYS, 0)}`, cx, h - 14, C.mute, 'center'); }
        dot(RE, far ? a.earth : a0.earth, '#6fb7ff', tt('Earth')); dot(RM, far ? a.mars : a0.mars, C.rust, tt('Mars'));
        // what leaving on other days would cost
        if (far) { if (!map) map = T.costMap(tH, { from, to }); const mx = 318, my = 34, mw = w - mx - 16, mh = 170, cw = mw / map.cols.length, ch = mh / map.rows.length;
          text(g, tt('What it costs to leave on another day'), mx, 16, C.text); map.cells.forEach((row, j) => row.forEach((v, i) => { if (v == null) return; const k = clamp((v - map.min) / 8, 0, 1); g.fillStyle = `rgb(${Math.round(24 + 210 * k)},${Math.round(150 - 90 * k)},${Math.round(120 - 80 * k)})`; g.fillRect(mx + i * cw, my + mh - (j + 1) * ch, cw + 0.5, ch + 0.5); }));
          g.strokeStyle = C.line; g.strokeRect(mx, my, mw, mh); const span = map.cols[map.cols.length - 1]; for (const win of T.windows(tH, 2, out ? 'out' : 'back')) { const d = (win.departH - tH) / 24; if (d > span) continue; const x = mx + (d / span) * mw; g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(x, my); g.lineTo(x, my + mh + 6); g.stroke(); text(g, tt('cheap'), x, my + mh + 16, C.text, 'center'); }
          text(g, tt`days from now, 0 to ${span}`, mx, my + mh + 34, C.mute); g.save(); g.translate(mx - 8, my + mh); g.rotate(-Math.PI / 2); text(g, tt`flight: ${map.rows[0]} to ${map.rows[map.rows.length - 1]} days`, 0, 0, C.mute); g.restore();
          bar(g, mx, h - 34, 14, 10, 'rgb(24,150,120)'); text(g, tt('cheap'), mx + 20, h - 29, C.mute); bar(g, mx + 78, h - 34, 14, 10, 'rgb(234,60,40)'); text(g, tt('8 km/s more, or worse'), mx + 98, h - 29, C.mute); }
        else text(g, tt('The Moon goes round Earth: you can leave in any month.'), 318, 60, C.mute); };
    } },
];
export const topics = () => TOPICS.map(({ id, title }) => ({ id, title }));

// ---------------------------------------------------------------- the frame around them
const CSS = `
.msc{--msc:#e8703a;--msc-line:rgba(255,190,150,.22);display:grid;grid-template-columns:190px 1fr;gap:16px;color:var(--text,#e9f2f9);font:calc(15px*var(--tz,1))/1.5 var(--body,'Inter',system-ui,sans-serif);text-align:left}
.msc.msc-one{display:block}.msc *{box-sizing:border-box}.msc button{font:inherit;color:inherit;cursor:pointer}
.msc-nav{display:flex;flex-direction:column;gap:6px}.msc-nav button{text-align:left;padding:10px 12px;border-radius:10px;background:rgba(40,22,16,.7);border:1px solid var(--msc-line)}
.msc-nav button.on{background:var(--msc);color:#1a0b05;font-weight:700;border-color:var(--msc)}
.msc-main{min-width:0}.msc-main h2{font:700 calc(22px*var(--tz,1))/1.2 var(--head,'Chakra Petch',sans-serif);margin:0 0 6px;color:#ffd9c2}
.msc-main p{margin:0 0 10px;max-width:68ch}.msc-cv{display:block;width:100%;max-width:640px;background:#0b1118;border:1px solid var(--msc-line);border-radius:12px;margin:8px 0}
.msc-sl{display:grid;grid-template-columns:minmax(120px,210px) 1fr 92px;gap:10px;align-items:center;margin:6px 0;max-width:640px}.msc-sl input{width:100%;accent-color:var(--msc)}.msc-sl-n{color:var(--mute,#9bb0c3)}.msc-sl-v{text-align:right;font-variant-numeric:tabular-nums}
.msc-ch{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:8px 0;max-width:640px}.msc-ch button,.msc-go,.msc-more{padding:6px 12px;border-radius:16px;background:rgba(40,22,16,.7);border:1px solid var(--msc-line)}
.msc-ch button.on{background:var(--msc);border-color:var(--msc);color:#1a0b05;font-weight:700}.msc-go{background:var(--msc);border-color:var(--msc);color:#1a0b05;font-weight:700;margin:4px 0 8px}
.msc-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:6px;max-width:640px;margin:8px 0}.msc-fact{padding:7px 10px;border-radius:9px;background:rgba(12,18,26,.8);border:1px solid var(--msc-line);display:flex;flex-direction:column}
.msc-fact span{font-size:.82em;color:var(--mute,#9bb0c3)}.msc-fact b{font-variant-numeric:tabular-nums}.msc-fact.warn b{color:var(--amber,#ffb347)}.msc-fact.good b{color:var(--green,#58e08a)}
.msc-legs{max-width:640px;margin:8px 0}.msc-leg{display:grid;grid-template-columns:1fr 62px 76px 130px;gap:8px;padding:5px 2px;border-bottom:1px solid var(--msc-line);align-items:center;font-size:.92em}.msc-leg-h{color:var(--mute,#9bb0c3);font-size:.8em}
.msc-leg span:nth-child(2),.msc-leg span:nth-child(3){text-align:right;font-variant-numeric:tabular-nums}.msc .pill{display:inline-block;font-size:.76em;padding:0 7px;border-radius:10px;border:1px solid currentColor;white-space:nowrap;justify-self:start;font-family:var(--head,inherit);letter-spacing:.04em;background:none;margin:0}
.msc .pill.real{color:#58e08a}.msc .pill.demo{color:#7fd4ff}.msc .pill.prop{color:#d7a6ff}.msc .pill.game{color:#ffb347}.msc-note{color:var(--mute,#9bb0c3);font-size:.9em;margin-top:8px}
.msc-deep{max-width:640px;margin-top:10px;padding:10px 12px;border-radius:10px;border:1px solid var(--msc-line);background:rgba(40,22,16,.45)}.msc-deep pre{margin:8px 0;padding:8px 10px;background:#0b1118;border-radius:8px;white-space:pre-wrap;font:600 .95em/1.5 ui-monospace,Consolas,monospace;color:#ffd9c2}
.msc-src{list-style:none;padding:0;margin:8px 0 0;font-size:.9em}.msc-src li{margin:5px 0;display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}.msc-src a{color:#ffc9a8}
@media (max-width:760px){.msc{grid-template-columns:1fr}.msc-nav{flex-direction:row;flex-wrap:wrap}.msc-sl{grid-template-columns:1fr 1fr 76px}.msc-leg{grid-template-columns:1fr 50px 62px}.msc-leg .pill{display:none}}
`;
export const SCIENCE_CSS = CSS;   // the styles, for a page that would rather keep them in its own stylesheet
const needCss = () => { if (!document.getElementById('msc-style')) { const st = el('style'); st.id = 'msc-style'; st.textContent = CSS; document.head.appendChild(st); } };
// One demonstration on its own: DEMOS.solar(element, { tH }) draws into the element and gives back stop().
export const DEMOS = Object.fromEntries(TOPICS.map((tp) => [tp.id, (host, opts = {}) => {
  needCss(); host.classList.add('msc', 'msc-one'); const draw = tp.build(host, opts), t0 = performance.now(); let raf = 0;
  const frame = (ms) => { draw((ms - t0) / 1000); raf = requestAnimationFrame(frame); }; draw(0); raf = requestAnimationFrame(frame);
  return () => { cancelAnimationFrame(raf); host.innerHTML = ''; host.classList.remove('msc', 'msc-one'); };
}]));
export function mountScienceCenter(root, opts = {}) {
  needCss();
  root.classList.add('msc'); root.innerHTML = '';
  const nav = el('div', 'msc-nav'), main = el('div', 'msc-main'); root.append(nav, main);
  const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion:reduce)').matches;
  let draw = null, raf = 0, deep = false, cur = null; const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const frame = (ms) => { if (draw) draw(still ? 99 : (ms - t0) / 1000); raf = requestAnimationFrame(frame); };
  const btns = TOPICS.map((tp) => { const b = el('button', '', tp.title); b.type = 'button'; b.onclick = () => show(tp.id); nav.appendChild(b); return b; });
  function show(id) {
    const tp = TOPICS.find((x) => x.id === id) || TOPICS[0]; cur = tp.id; btns.forEach((b, i) => b.classList.toggle('on', TOPICS[i] === tp));
    main.innerHTML = ''; main.append(el('h2', '', tp.title), el('p', '', tp.simple));
    const box = el('div', 'msc-demo'); main.appendChild(box); draw = tp.build(box, opts); draw(still ? 99 : 0);
    const more = el('button', 'msc-more', deep ? tt('Hide the details') : tt('Go deeper: the sum and the sources')); more.type = 'button';
    const d = el('div', 'msc-deep'); d.hidden = !deep;
    d.append(el('p', '', tp.deeper), el('pre', '', tp.formula));
    const ul = el('ul', 'msc-src'); tp.sources.forEach(([label, url, kind]) => { const li = el('li'); li.innerHTML = pill(kind) + (url ? `<a href="${url}" target="_blank" rel="noopener">${label}</a>` : `<span>${label}</span>`); ul.appendChild(li); }); d.appendChild(ul);
    more.onclick = () => { deep = !deep; d.hidden = !deep; more.textContent = deep ? tt('Hide the details') : tt('Go deeper: the sum and the sources'); };
    main.append(more, d);
  }
  show(opts.topic || 'gravity'); raf = requestAnimationFrame(frame);
  return { show, get topic() { return cur; }, step: (sec) => draw && draw(sec), destroy() { cancelAnimationFrame(raf); draw = null; root.innerHTML = ''; root.classList.remove('msc'); } };
}
