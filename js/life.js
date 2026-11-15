// MOONKEEPER — closed-loop life support: crops and plant health, plant food, the Water Plant (ice extraction and
// water-from-rock), the moon-soil experiment and farm research.
// Pure logic (no DOM), so Node can test it: node tools/life_test.mjs
// REAL numbers are sourced in docs/SCIENCE_AND_SOURCES.md. GAME numbers are scaled so one mission teaches the trade-offs.

import { MINE } from './config.js';
import { tt } from './i18n.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const alive = (S, id) => { const r = S.rooms[id]; return r.built >= 1 && !r.frozen && r.p > 55; };

// ---------- crops ----------
export const GROW_SCALE = 100;           // GAME: one game day of growing stands for about 100 real days
export const LIGHT = [0, 0.5, 1, 1.5];   // lamp output at each "Farm Grow Lights" level
export const RACK_KW = 1;                // GAME: kW for one planted rack at lamp output 1
export const FARM_ROOMS = ['potato', 'tomato'];
export const CO2_PER_O2 = 1.375;         // REAL: kg of CO2 a plant takes in for each kg of O2 it gives out (44/32)

// real  = days from planting to harvest in NASA's crop-chamber tables (REAL); days = the same in game days (real / GROW_SCALE)
// food  = what one rack gives per harvest (GAME sizes, in the same order as NASA's edible yield per square metre per day:
//         potato and wheat highest, then peas and tomatoes, then salad crops, soybeans lowest by weight but rich in protein)
// to    = where the harvest goes: 'raw' (must be cooked), 'meals' (salad: eat it now), 'herbs', 'sci'
// light = how much lamp it wants (1 = potato; REAL ranking: wheat wants about four times a potato's light, lettuce about 60%)
// water = litres a day it drinks at full growth (REAL ranking: wheat is by far the thirstiest); nearly all of it is breathed back out
// nutri = kg of plant food a day; o2 = kg of oxygen a day at full growth; t = comfortable temperature range in °C (GAME)
// space = has it really been grown in space?
export const CROPS = {
  potato:  { name: tt('Potatoes'), one: 'potato', real: 132, days: 1.32, food: 3.55, to: 'raw', light: 1.0, water: 1.0, nutri: 0.045, o2: 0.030, t: [14, 24], col: '#b98a4a', space: tt('Yes: small potatoes grew on a Space Shuttle flight in 1995.'),
             tip: tt('The best meal-maker. Slow, but each rack fills many plates. Likes it cool.') },
  wheat:   { name: tt('Wheat'), one: 'wheat', real: 80, days: 0.8, food: 2.05, to: 'raw', light: 1.5, water: 2.9, nutri: 0.05, o2: 0.036, t: [16, 26], col: '#d9b84a', space: tt('Yes: dwarf wheat grew on the Space Station in 2018.'),
             tip: tt('Bread and porridge, and the most oxygen of any crop. But it wants full lamp power and drinks almost three times what a potato does.') },
  peas:    { name: tt('Peas'), one: 'pea', real: 75, days: 0.75, food: 1.22, to: 'raw', light: 0.85, water: 0.6, nutri: 0.012, o2: 0.022, t: [10, 22], fix: true, col: '#5fae4f', space: tt('On the list of crops planned for future bases.'),
             tip: tt('Happy in a cool room and modest light. Bacteria on its roots pull nitrogen from the air, so it is almost free to feed.') },
  tomato:  { name: tt('Tomatoes'), one: 'tomato', real: 85, days: 0.85, food: 1.38, to: 'raw', light: 1.0, water: 0.7, nutri: 0.05, o2: 0.026, t: [18, 28], col: '#e5362b', space: tt('Yes: dwarf tomatoes grew on the Space Station in 2022 and 2023.'),
             tip: tt('Tasty and full of vitamins, but hungry for plant food and the first to catch mold in damp air. Likes it warm.') },
  soybean: { name: tt('Soybeans'), one: 'soybean', real: 97, days: 0.97, food: 1.09, to: 'raw', light: 1.0, water: 1.2, nutri: 0.015, o2: 0.026, t: [20, 30], fix: true, col: '#8fb04a', space: tt('On the list of crops planned for future bases.'),
             tip: tt('Small harvests, but packed with protein, and like peas it makes its own nitrogen. Likes it warm.') },
  lettuce: { name: tt('Lettuce'), one: 'lettuce', real: 28, days: 0.28, food: 0.21, to: 'meals', light: 0.6, water: 0.5, nutri: 0.03, o2: 0.020, t: [12, 24], col: '#7fd45a', space: tt('Yes: astronauts have grown and eaten lettuce on the Space Station since 2015.'),
             tip: tt('Salad in a hurry: ready to eat, no cooking, little light. Small plates, though.') },
  spinach: { name: tt('Spinach'), one: 'spinach', real: 30, days: 0.3, food: 0.22, to: 'meals', light: 0.6, water: 0.45, nutri: 0.03, o2: 0.020, t: [8, 22], col: '#3f9b46', space: tt('On the list of crops planned for future bases.'),
             tip: tt('Salad that shrugs off a cold room. Good for a farm you can barely heat or light.') },
  radish:  { name: tt('Radishes'), one: 'radish', real: 25, days: 0.25, food: 0.16, to: 'meals', light: 0.9, water: 0.45, nutri: 0.02, o2: 0.016, t: [10, 24], col: '#e0527a', space: tt('Yes: radishes were harvested on the Space Station after 27 days in 2020.'),
             tip: tt('The fastest crop of all. A crunchy snack, not a dinner.') },
  herbs:   { name: tt('Herbs'), one: 'herb', real: 30, days: 0.3, food: 1, to: 'herbs', light: 0.6, water: 0.45, nutri: 0.02, o2: 0.014, t: [16, 28], col: '#4fbf8a', space: tt('Not yet. This one is our idea.'),
             tip: tt('Basil and mint will not fill you up, but each bunch makes the next cooked batch a fifth bigger. Food that people want to eat matters.') },
  arabidopsis: { name: tt('Thale cress'), one: tt('thale cress'), real: 42, days: 0.42, food: 1, to: 'sci', light: 0.35, water: 0.2, nutri: 0.01, o2: 0.004, t: [16, 26], col: '#9fd0a0', space: tt('Yes, many times. It is also the plant that was grown in real Moon soil.'),
             tip: tt('Arabidopsis, the lab mouse of plant science. Not food: every harvest is one point of research.') },
};
export const SALAD = ['lettuce', 'spinach', 'radish'];

export const newRacks = () => [
  ...['potato', 'potato', 'lettuce'].map((kind) => ({ room: 'potato', kind, g: 0.45, hp: 1, ripe: 0 })).map((r, i) => (i ? r : { ...r, g: 1, ripe: 1 })),
  ...['tomato', 'tomato', 'peas'].map((kind) => ({ room: 'tomato', kind, g: 0.25, hp: 1, ripe: 0 })),
];
export const newLife = (m) => ({
  racks: newRacks(), farmT: { potato: 20, tomato: 24 }, nutri: m.nutri ?? 1.2, herbs: 0, sci: 0, tech: {}, tried: {},
  mine: newMine(), exp: null, wx: { ice: 0, cond: 1, seal: 1, batch: null, made: 0, runs: 0, last: null, tried: {} },
});

// ---------- the air, light and warmth a farm room offers ----------
export function farmEnv(S, room, eff = 1, rate = 0, people = 1) {
  const ok = alive(S, room), L = LIGHT[S.lv.farm] * eff * (S.f.led === room ? 0.5 : 1);
  const planted = S.racks.filter((r) => r.room === room && r.kind).length, set = S.farmT[room];
  const dry = rate > 0 || !!S.tech.cond;                                    // something is taking the damp out of the air
  return {
    ok, L, planted, set, temp: S.rooms[room].frozen ? -60 : Math.round((set - (1 - eff) * 8) * 10) / 10,
    ppm: Math.round(clamp(500 + 220 * people + (1 - S.air) * 3500 - 20 * planted, 380, 6000)),
    co2: clamp(0.84 + 0.06 * people + (1 - S.air) * 0.3, 0.84, 1),
    rh: dry ? 62 : Math.min(98, 62 + 6 * planted), dry,
    water: S.water > 0 ? (S.f.pump === room ? 0.25 : 1) : 0,
    nutri: S.nutri > 0 ? (S.f.pump === room ? 0.25 : 1) : 0.4,
  };
}
const tempF = (T, [lo, hi]) => (T >= lo && T <= hi ? 1 : Math.max(0.2, 1 - (T < lo ? lo - T : T - hi) / 8));
// The rule of the scarcest thing (Liebig's law): a plant grows only as fast as whatever it has least of.
export function rackState(S, r, env) {
  const c = CROPS[r.kind]; if (!c) return null;
  const lightF = c.light > 0 ? env.L / c.light : 0;
  const f = { light: Math.min(1, lightF), water: env.water, food: env.nutri, warmth: env.ok ? tempF(env.temp, c.t) : 0, air: env.rh <= 75 ? 1 : Math.max(0.6, 1 - (env.rh - 75) / 50) };
  let lim = 'light', low = f.light; for (const k in f) if (f[k] < low) { low = f[k]; lim = k; }
  const rest = Math.min(f.water, f.food, f.warmth, f.air);
  const bonus = (S.fish && alive(S, 'animal') ? 1.15 : 1) * (S.perks.botanist ? 1.25 : 1) * (S.tech.nft ? 1.1 : 1) * (r.soil ? 0.7 : 1);
  const act = env.ok ? Math.min(1.5, lightF) * rest * env.co2 * r.hp : 0;        // how hard the plant is working (0 to 1.5)
  return { c, f, lim: low < 0.98 ? lim : null, low, act, grow: act * bonus, lightF };
}

// Everything the farms and the Water Plant add to the station's flows. Called from computeFlows.
export function lifeFlows(S, eff, rate, people) {
  let farmKw = 0, farmWater = 0, farmO2 = 0, nutriUse = 0, racksOn = 0;
  const env = {};
  for (const room of FARM_ROOMS) {
    const e = (env[room] = farmEnv(S, room, eff, rate, people)); if (!e.ok) continue;
    farmKw += Math.abs(e.set - 20) * 0.05;
    for (const r of S.racks) {
      if (r.room !== room || !r.kind) continue; const st = rackState(S, r, e); racksOn++;
      farmKw += LIGHT[S.lv.farm] * RACK_KW * (S.tech.led ? 0.75 : 1);
      const a = st.act * (r.ripe ? 0.3 : 1);
      farmWater += st.c.water * a; farmO2 += st.c.o2 * a; nutriUse += st.c.nutri * a * (S.tech.nft ? 0.6 : 1);
    }
  }
  const nutriGain = people * 0.05 * (alive(S, 'bathroom') ? 1 : 0.3) * (rate > 0 ? 1 : 0) + (alive(S, 'animal') ? S.hens * 0.004 + (S.fish ? 0.03 : 0) : 0);
  const b = S.wx.batch, wxKw = b && !(S.flow && S.flow.frost > 0) ? batchKw(b) : 0;   // frozen: the batch waits and draws nothing
  return { env, farmKw, farmWater, farmO2, co2Fix: farmO2 * CO2_PER_O2, nutriUse, nutriGain, racksOn, wxKw };
}

// One time step for everything alive. F = S.flow (already computed), dt in hours.
export function stepLife(S, dt, F, farmers) {
  const d = dt / 24, L = F.life;
  // ---- plant food
  const before = S.nutri; if (S.nutri !== Infinity) S.nutri = clamp(S.nutri + (L.nutriGain - L.nutriUse) * d, 0, 9);
  if (before > 0 && S.nutri <= 0) S.pending.push('nonutri');
  // ---- racks
  for (const room of FARM_ROOMS) {
    const e = L.env[room], frozen = S.rooms[room].frozen;
    for (const r of S.racks) {
      if (r.room !== room || !r.kind) continue;
      if (frozen) { r.g = 0; r.ripe = 0; r.hp = 0.1; continue; }
      const st = rackState(S, r, e), moldy = S.f.mold && room === 'tomato';
      if (!e.ok || st.low < 0.45) r.hp = Math.max(0.15, r.hp - 0.012 * dt * (e.ok ? 1 + (0.45 - st.low) / 0.45 : 0.8));
      else if (moldy) r.hp = Math.max(0.1, r.hp - 0.02 * dt);
      else r.hp = Math.min(1, r.hp + 0.012 * dt);
      if (e.ok && !r.ripe) { r.g += (st.grow * dt) / (st.c.days * 24); if (r.g >= 1) { r.g = 1; r.ripe = 1; if (!farmers) S.pending.push('ripe:' + room); } }
    }
    if (e.ok && farmers && S.racks.some((r) => r.room === room && r.ripe)) harvestRoom(S, room, 0.7, true);
    // damp air with nothing drying it: mold finds the tomato farm
    if (e.ok && !e.dry && room === 'tomato' && e.planted && !S.f.mold && S.rng() < 0.012 * dt) { S.f.mold = true; S.pending.push('damp'); }
  }
  // ---- the moon-soil experiment: three pots of thale cress
  const x = S.exp;
  if (x && !x.done) { const e = L.env[x.room]; if (e.ok && e.L > 0 && S.water > 0) { x.g = Math.min(1, x.g + (Math.min(1, e.L / 0.35) * dt) / (CROPS.arabidopsis.days * 24)); if (x.g >= 1) { x.done = true; S.sci += 3; S.pending.push('expdone'); } } }
  // ---- the Water Plant
  if (S.wx.batch && !(F.frost > 0)) stepBatch(S, dt, F.eff, F.sun.factor);   // too cold topside: the batch waits where it is
}

// Pick everything ripe in one farm room. Staples go to the raw-food store, salad is ready to eat, herbs go to the kitchen.
export function harvestRoom(S, room, score = 0.8, auto = false) {
  const out = { racks: 0, raw: 0, meals: 0, herbs: 0, sci: 0, names: [] };
  for (const r of S.racks) {
    if (r.room !== room || !r.ripe) continue; const c = CROPS[r.kind], q = c.food * (0.6 + 0.4 * score) * (0.5 + 0.5 * r.hp) * (auto ? 0.85 : 1);
    if (c.to === 'raw') { S.raw += q; out.raw += q; } else if (c.to === 'meals') { S.meals += q; out.meals += q; } else if (c.to === 'herbs') { S.herbs += 1; out.herbs += 1; } else { S.sci += 1; out.sci += 1; }
    if (!S.tried[r.kind]) { S.tried[r.kind] = true; if (c.to !== 'sci') { S.sci += 1; out.sci += 1; } }      // first harvest of a new crop is a field trial
    out.racks++; if (!out.names.includes(c.name)) out.names.push(c.name);
    S.feed += 0.14; r.ripe = 0; r.g = 0;                                                                    // leaves and peels become hen feed; the rack is replanted
  }
  if (out.racks) S.stats.harvests++;
  return out;
}
export const ripeIn = (S, room) => S.racks.filter((r) => r.room === room && r.ripe).length;
export function plant(S, i, kind) { const r = S.racks[i]; if (!r || (kind && !CROPS[kind])) return false; r.kind = kind || null; r.g = 0; r.ripe = 0; r.hp = Math.max(r.hp, 0.8); return true; }

// ---------- the Polar Ice Mine ----------
// You dig the icy soil yourself: two scoops of the digger's bucket fill one canister for the Water Plant.
export function newMine() { return { patches: MINE.patches.map(([dx, dz, n]) => ({ x: MINE.x + dx, z: MINE.z + dz, left: n })), hopper: 0, dug: 0, cans: 0, seen: false }; }
// Which icy patch is under this point? (-1 = dry soil, or a patch that is dug out)
export const patchAt = (S, x, z, r = 3.6) => S.mine.patches.findIndex((p) => p.left > 0 && Math.hypot(p.x - x, p.z - z) < r);
export function scoop(S, i) { const p = S.mine.patches[i]; if (!p || p.left <= 0) return false; if (S.mode !== 'unlimited') p.left -= 1; S.mine.dug++; return true; }   // Unlimited mode: the patches never run out
// Tip n scoops into the filler. Returns how many canisters it sealed, and the research earned by the first one.
export function dump(S, n) { const m = S.mine; m.hopper += n; let cans = 0; while (m.hopper >= MINE.perCan) { m.hopper -= MINE.perCan; cans++; } m.cans += cans; let sci = 0; if (cans && !m.seen) { m.seen = true; sci = 2; S.sci += 2; } return { cans, sci }; }
export const iceLeft = (S) => S.mine.patches.reduce((a, p) => a + p.left, 0);

// ---------- research ----------
export const TECH = {
  led:  { name: tt('Tuned LED recipe'), sci: 2, mat: 2, text: tt('Leaves mostly use red and blue light. LEDs tuned to those colours waste nothing on green: the farm lamps need 25% less power.') },
  cond: { name: tt('Humidity condensers'), sci: 2, mat: 2, text: tt('Plants breathe out almost all the water they drink. Cold plates catch it: 97% of farm water comes straight back, and damp-air mold stops.') },
  nft:  { name: tt('Nutrient-film channels'), sci: 3, mat: 3, text: tt('Roots sit in a thin film of flowing water instead of a full tank. 40% less plant food, and crops grow 10% faster.') },
  trap: { name: tt('Second cold trap'), sci: 2, mat: 3, text: tt('A second freezing plate in the Water Plant catches vapour the first one misses: 12% more water from every batch.') },
  soil: { name: tt('Treated moon-soil beds'), sci: 4, mat: 4, needs: 'exp', text: tt('Washed, composted moon soil in one extra bed per farm. Plants there grow at 70% speed, but the beds need no pumps.') },
};
export const canResearch = (S, id) => { const t = TECH[id]; return !!t && !S.tech[id] && S.sci >= t.sci && S.mat >= t.mat && (t.needs !== 'exp' || (S.exp && S.exp.done)); };
export function research(S, id) {
  if (!canResearch(S, id)) return false; const t = TECH[id]; S.sci -= t.sci; if (S.mat !== Infinity) S.mat -= t.mat; S.tech[id] = true;
  if (id === 'soil') for (const room of FARM_ROOMS) S.racks.push({ room, kind: null, g: 0, hp: 1, ripe: 0, soil: true });
  return true;
}

// ---------- the moon-soil experiment ----------
// REAL (2022): thale cress was planted in soil from Apollo 11, 12 and 17, a little under a gram per plant. Nearly every seed
// sprouted, but the plants grew slower and smaller than in the control, with stunted roots, and some turned reddish-black:
// their genes showed stress from salt, metals and reactive oxygen. The oldest, most sun-battered soil (Apollo 11) did worst.
// REAL (2023-2026, on imitation moon soil only): bacteria and compost with helpful fungi made simulant more plant-friendly.
// GAME: the three sizes below are a simplified picture of those results.
export const EXP_POTS = [
  { id: 'hydro', name: tt('Water and plant food (hydroponics)'), size: 1, sprout: 100, leaf: '#58c26a', note: tt('Roots get exactly what they need. This is how the station farms.') },
  { id: 'treated', name: tt('Moon soil, washed and composted'), size: 0.7, sprout: 100, leaf: '#7fae4f', note: tt('Washing takes out salts; compost and helpful microbes add the food that moon soil lacks. Slower, but healthy. (So far this has only been tried on imitation moon soil.)') },
  { id: 'raw', name: tt('Moon soil, untreated'), size: 0.38, sprout: 100, leaf: '#8a4a52', note: tt('Nearly every seed sprouts! But the plants stay small, their roots are stunted and some leaves turn reddish-black: signs of stress from salt and metals in the soil.') },
];
export function startExperiment(S, room) { if (S.exp && !S.exp.done) return false; S.exp = { room, g: 0, done: false, t: S.t }; return true; }

// ---------- the Water Plant ----------
// Ice extraction (REAL physics, GAME sizes): icy soil from the Moon's dark polar craters is sealed in a chamber, the air is
// pumped out, and gentle heat turns the ice straight into vapour (sublimation). A freezing plate, the cold trap, catches the
// vapour as frost; the frost is melted, filtered and piped to the tank.
export const WX = {
  CAN_KG: 120,          // GAME: kg of icy soil in one canister
  ICE_FRAC: 0.056,      // REAL: water found in the soil of a dark polar crater, by weight (5.6%)
  C_REG: 0.5,           // REAL (approx.): kJ to warm 1 kg of very cold moon soil by 1 °C (0.28 at -173 °C, 0.77 at room temperature)
  L_SUB: 2834,          // REAL: kJ to turn 1 kg of ice into vapour
  T_STORE: -150,        // GAME: °C of the cold store (real dark craters are colder still)
  TRIPLE_PA: 611,       // REAL: below this pressure ice cannot melt, it can only turn to vapour
  TRAP_KGH: 3.5,        // GAME: kg of vapour an hour the cold trap can freeze
  METHODS: {
    elec:  { name: tt('Heater rods'), eta: 0.6, text: tt('Electric rods warm the soil from the outside in. Simple and steady; a lot of heat goes into the metal.') },
    mw:    { name: tt('Microwaves'), eta: 0.85, text: tt('Microwaves warm the soil all the way through at once, so less power is wasted — but the vapour comes off fast.') },
    solar: { name: tt('Sun mirror'), eta: 1, kw: 6, text: tt('A mirror dish focuses sunlight on the chamber. Free heat, but only while the Sun is up.') },
  },
  // Water from rock (experimental): FeTiO3 + H2 -> Fe + TiO2 + H2O, at about 1,000 °C (REAL: done on Apollo soil in the lab;
  // ilmenite is about a tenth of the dark soil here, and only the oxygen bound to its iron comes out).
  ILM_KG: 150, ILM_FRAC: 0.10, ILM_O: 0.105, ILM_T: 1000, ILM_ETA: 0.75, C_HOT: 0.9,
};
const P_PTS = [[0.1, -75], [1, -61], [10, -42], [100, -20], [611, 0]];
// The temperature at which ice turns to vapour at a given chamber pressure (REAL, read off the ice vapour-pressure curve).
export function subTemp(pa) { const x = Math.log10(clamp(pa, 0.1, 611)); for (let i = 1; i < P_PTS.length; i++) { const a = Math.log10(P_PTS[i - 1][0]), b = Math.log10(P_PTS[i][0]); if (x <= b) return P_PTS[i - 1][1] + ((x - a) / (b - a)) * (P_PTS[i][1] - P_PTS[i - 1][1]); } return 0; }
const pumpKw = (pa) => clamp(0.2 + 0.25 * Math.log10(WX.TRIPLE_PA / clamp(pa, 0.1, 611)), 0.2, 1.2);
export const batchKw = (b) => (b.mode === 'ilm' ? b.kw + 0.5 : (b.method === 'solar' ? 0 : b.kw) + pumpKw(b.pa) + 0.5);
export const trapEta = (S, pa) => (0.86 + (S.tech.trap ? 0.12 : 0)) * (0.6 + 0.4 * S.wx.cond) * S.wx.seal * (pa > WX.TRIPLE_PA ? 0.35 : 1);

export function makeBatch(S, o) {
  if (o.mode === 'ilm') { const M = WX.ILM_KG; return { mode: 'ilm', method: 'elec', kw: clamp(o.kw, 4, 10), hours: clamp(o.hours, 2, 12), pa: 100, n: 0, M, max: M * WX.ILM_FRAC * WX.ILM_O * (18 / 16), ice: 0, T: 20, got: 0, sub: 0, lost: 0, left: o.hours, total: o.hours, kwh: 0, done: 0, log: [] }; }
  const n = clamp(Math.round(o.n), 1, 4), M = n * WX.CAN_KG, ice = M * WX.ICE_FRAC;
  return { mode: 'ice', method: WX.METHODS[o.method] ? o.method : 'elec', kw: clamp(o.kw, 1, 8), hours: clamp(o.hours, 1, 16), pa: clamp(o.pa, 0.5, 900), n, M, max: ice, ice, T: WX.T_STORE, got: 0, sub: 0, lost: 0, left: o.hours, total: o.hours, kwh: 0, log: [] };
}
// Advance one batch by dt hours. eff = how well the station's power is holding (1 = fine), sunF = sunlight (0 to 1).
export function tickBatch(S, b, dt, eff = 1, sunF = 1) {
  const h = Math.min(dt, b.left), sec = h * 3600; if (h <= 0) return;
  if (b.mode === 'ilm') {
    const heat = b.kw * WX.ILM_ETA * eff, loss = 0.3 + 0.002 * (b.T - 20), net = Math.max(0, heat - loss);
    if (b.T < WX.ILM_T) b.T = Math.min(WX.ILM_T + 30, b.T + (net * sec) / (b.M * WX.C_HOT));
    else { const made = Math.min(b.max * 0.8 - b.got, b.max * 0.35 * h * eff); b.got += Math.max(0, made); b.sub = b.got; }   // the reaction runs while it stays hot
    b.kwh += batchKw(b) * h * eff;
  } else {
    const m = WX.METHODS[b.method], heat = b.method === 'solar' ? m.kw * sunF : b.kw * m.eta * eff, loss = 0.1 + 0.002 * (b.T - WX.T_STORE), net = Math.max(0, heat - loss);
    const melt = b.pa > WX.TRIPLE_PA, Ts = melt ? 0 : subTemp(b.pa); let e = net * sec;                                // kJ of heat that reaches the soil
    if (b.T < Ts) { const need = (Ts - b.T) * b.M * WX.C_REG, use = Math.min(e, need); b.T += use / (b.M * WX.C_REG); e -= use; }
    if (e > 0 && b.ice > 0) { const dm = Math.min(b.ice, e / WX.L_SUB); e -= dm * WX.L_SUB; b.ice -= dm; b.sub += dm;
      const cap = WX.TRAP_KGH * h, caught = (Math.min(dm, cap) + Math.max(0, dm - cap) * 0.3) * trapEta(S, b.pa); b.got += caught; b.lost += dm - caught; b.rate = dm / h; } else b.rate = 0;
    if (e > 0) b.T = Math.min(200, b.T + e / (b.M * WX.C_REG));                                                         // no ice left: now you are only baking dry rock
    b.kwh += batchKw(b) * h * (b.method === 'solar' ? 1 : eff);
  }
  b.left -= h; if (b.log.length < 200) b.log.push([b.total - b.left, b.T, b.got]);
}
// What would this recipe give? Runs the same physics ahead of time (the dashboard shows it before you press Start).
export function planBatch(S, o, sunF = 1) {
  const b = makeBatch(S, o); while (b.left > 1e-6) tickBatch(S, b, 0.1, 1, sunF);
  const warn = [];
  if (b.mode === 'ice') { if (b.pa > WX.TRIPLE_PA) warn.push(tt('Pressure is above 611 Pa: the ice will melt into mud instead of turning to vapour.')); if (b.ice > b.max * 0.03) warn.push(tt`Not enough heat or time: ${Math.round((b.ice / b.max) * 100)}% of the ice never leaves the soil.`); if (b.lost > b.sub * 0.25) warn.push(tt('Vapour is coming off faster than the cold trap can freeze it. Less power, or better seals.')); if (b.T > 60) warn.push(tt('The soil ends up hot and dry: you kept heating after the ice was gone.')); if (b.method === 'solar' && sunF < 0.2) warn.push(tt('The Sun is down: the mirror gives no heat.')); }
  else if (b.T < WX.ILM_T) warn.push(tt('It never reaches 1,000 °C, so the reaction never starts. More power or more time.'));
  return { water: b.got, eff: b.got / b.max, kwh: b.kwh, peakKw: batchKw(b), T: b.T, left: b.ice, warn, log: b.log, max: b.max };
}
export function startBatch(S, o) {
  const w = S.wx; if (w.batch) return 'busy';
  if (o.mode === 'ilm') { if (!alive(S, 'oxygen')) return 'noh2'; }
  else { const n = clamp(Math.round(o.n), 1, 4); if (w.ice < n) return 'noice'; w.ice -= n; }
  w.batch = makeBatch(S, o); return 'ok';
}
function stepBatch(S, dt, eff, sunF) {
  const w = S.wx, b = w.batch; tickBatch(S, b, dt, eff, sunF);
  w.cond = Math.max(0.3, w.cond - 0.004 * dt * (0.5 + b.kw / 4));                                                       // machines wear with use
  if (b.left <= 1e-6) {
    const room = S.waterCap - S.water, kept = Math.min(room, b.got); S.water += kept; w.made += kept; w.runs++;
    const key = b.mode === 'ilm' ? 'ilm' : b.method; let sci = 0; if (!w.tried[key] && b.got > 0.05) { w.tried[key] = true; sci = key === 'ilm' ? 2 : 1; S.sci += sci; }
    w.last = { mode: b.mode, method: b.method, water: b.got, kept, spilled: b.got - kept, eff: b.got / b.max, kwh: b.kwh, hours: b.total, sci, log: b.log };
    w.batch = null; S.pending.push('wxdone');
  }
}
