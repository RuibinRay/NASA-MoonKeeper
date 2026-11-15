// MOONKEEPER 2 — survival simulation. Pure logic (no DOM) so it can be tested in Node.
// Core rule: every machine eats power, every helper eats something, every fix costs time. No choice is free.
import { K, SYS, MODES, BASE_LOAD, ROOMS, MOUNTS } from './config.js';
import { newLife, lifeFlows, stepLife, harvestRoom } from './life.js';
import { tt, lower, upper } from './i18n.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export function mulberry32(a) {
  return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function createSim(modeKey = 'pilot', seed = (Date.now() >>> 0)) {
  const m = MODES[modeKey];
  const S = {
    v: 2, mode: modeKey, m, seed, rng: mulberry32(seed),
    t: 8, t0: 8, hours: m.days * 24,                 // the mission clock starts at 08:00 on Day 1
    H0: Math.PI / 2 - (2 * Math.PI * m.sunsetDay) / K.LUNAR_DAY,
    battery: m.batteryCap * 0.75, batteryCap: m.batteryCap, mods: 0,
    o2: m.o2, o2Cap: 8, water: m.water, waterCap: 60,
    cans: m.cans, meals: m.meals, raw: 0, feed: m.feed, hens: 6, eggs: 0, fish: true, fishAcc: 0,
    mat: m.mat,
    ...newLife(m),                                    // farm racks, plant food, research, the Water Plant (js/life.js)
    dose: 0, health: 100, air: 1, dust: 0.08, solarHealth: 1, gearStress: 0,
    P: K.AIR_KPA, rooms: {}, mounts: MOUNTS.map((_, i) => (i < 8 ? 1 : 0)),   // 0 empty, 1 working, 2 broken
    lv: { o2gen: 1, isru: 0, recycler: 2, farm: 1, heat: 1, comms: 1 },
    f: { commsDown: false, isruDown: false, heater: false, scrubber: false, leakWater: 0, mold: false, pump: null, led: null },
    extraKw: {}, safeMode: 0, storm: null, zone: 'top', suitOn: true, here: null,
    helpers: [{ id: 'bolt1', kind: 'bot', name: tt('BOLT-1'), role: 'idle', img: 'c_bot' }, { id: 'bolt2', kind: 'bot', name: tt('BOLT-2'), role: 'idle', img: 'c_bot' }],
    perks: {}, rescued: [],
    car: { charge: 1, charging: false }, ship: { charge: 0.4, charging: false },
    bench: [null, null], fab: null,
    flow: {}, pending: [], marks: {}, hurt: { air: 0, water: 0, food: 0, rad: 0, co2: 0 },
    hist: [], lastHist: -99, log: [],
    stats: { jobs: 0, events: 0, harvests: 0, evaHours: 0, brownHours: 0, stormDose: 0, panelsBuilt: 0, roomsBuilt: 0, km: 0 },
    over: null,
  };
  for (const r of ROOMS) S.rooms[r.id] = { p: K.AIR_KPA, hole: 0, door: 1, built: 1, frozen: false, cold: 0 };
  computeFlows(S);
  return S;
}

// The meteor shower: breaks panels, wrecks rooms, knocks the dish over.
export function applyDisaster(S) {
  const m = S.m; let k = 0;
  S.mounts = MOUNTS.map((_, i) => (i < 8 ? (k++ < m.ok ? 1 : 2) : 0));
  // shuffle which of the first 8 mounts survived
  for (let i = 7; i > 0; i--) { const j = (S.rng() * (i + 1)) | 0; [S.mounts[i], S.mounts[j]] = [S.mounts[j], S.mounts[i]]; }
  for (const id of m.wreck) Object.assign(S.rooms[id], { p: 0, hole: 1, door: 0, built: 0.3, frozen: true });
  for (const r of S.racks) if (m.wreck.includes(r.room)) Object.assign(r, { g: 0, ripe: 0, hp: 0.1 });
  S.f.commsDown = true; S.f.isruDown = true; S.lv.isru = 0; S.dust = 0.3; S.battery = Math.min(S.battery, S.batteryCap * 0.5);
  note(S, tt('A meteor shower hit every station on the Moon. You are the only one left at Tranquility Deep.'), 'bad');
}

export const roomOk = (S, id) => { const r = S.rooms[id]; return r.built >= 1 && !r.frozen && r.p > 55; };
// Can the machines in a room run? Machines need no air. Thin air from an empty tank must not stop the Oxygen Maker,
// or nothing could ever refill the station. Only a hole that has let the room's own air out stops them.
export const machineOk = (S, id) => { const r = S.rooms[id]; return r.built >= 1 && !r.frozen && (r.p > 55 || r.hole === 0); };
export const humans = (S) => S.helpers.filter((h) => h.kind === 'human');
// Is there anything for a helper with this job to do? Farm duty needs a farm or the Animal Bay; a cook needs the Kitchen.
export const hasWork = (S, role) => (role === 'idle' ? false : role === 'farm' ? roomOk(S, 'potato') || roomOk(S, 'tomato') || roomOk(S, 'animal') : role === 'cook' ? roomOk(S, 'kitchen') : true);
export const working = (S, role) => S.helpers.filter((h) => h.role === role && (h.kind === 'bot' || S.P > 55)).length;
// How much faster jobs go with builders and an engineer around.
export const buildSpeed = (S) => 1 + 0.35 * working(S, 'build') + (S.perks.engineer ? 0.25 : 0);
export const jobHours = (S, h) => h / buildSpeed(S);

// Where is the Sun? Real geometry for latitude 8.3°N: H = hour angle (0 = noon, 90° = sunset).
export function sun(S, t = S.t) {
  const TWO = Math.PI * 2, H = S.H0 + (TWO * ((t - S.t0) / 24)) / K.LUNAR_DAY, lat = (K.LAT * Math.PI) / 180, dec = (1.5 * Math.PI) / 180;
  const e = -Math.cos(dec) * Math.sin(H), u = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H), n = Math.cos(lat) * Math.sin(dec) - Math.sin(lat) * Math.cos(dec) * Math.cos(H);
  const elev = (Math.asin(clamp(u, -1, 1)) * 180) / Math.PI, up = elev > 0, factor = clamp(elev / 5, 0, 1);
  const Hn = ((H % TWO) + TWO) % TWO, hPerRad = (K.LUNAR_DAY * 24) / TWO;
  const toSunset = (((Math.PI / 2 - Hn) + TWO) % TWO) * hPerRad, toSunrise = (((1.5 * Math.PI - Hn) + TWO) % TWO) * hPerRad;
  const nightHours = up ? 0 : (((Hn - Math.PI / 2) + TWO) % TWO) * hPerRad;
  const tempC = up ? -120 + (K.SURF_DAY_C + 120) * Math.pow(Math.sin((elev * Math.PI) / 180), 0.25) : K.SURF_NIGHT_C + (-K.SURF_NIGHT_C - 120) * Math.exp(-nightHours / 60);
  return { H, e, u, n, elev, up, factor, toSunset, toSunrise, nightHours, tempC };
}

export function computeFlows(S) {
  const s = sun(S), m = S.m, lv = S.lv, f = S.f, safe = S.safeMode > 0;
  const nOk = S.mounts.filter((x) => x === 1).length;
  const solar = safe ? 0 : nOk * K.PANEL_KW * s.factor * (1 - 0.75 * S.dust) * S.solarHealth;
  const farms = (roomOk(S, 'potato') ? 1 : 0) + (roomOk(S, 'tomato') ? 1 : 0);
  const bots = S.helpers.filter((h) => h.kind === 'bot' && hasWork(S, h.role)).length;   // a robot with nothing to do stands still and draws nothing
  const use = {
    base: BASE_LOAD,
    o2gen: machineOk(S, 'oxygen') ? SYS.o2gen.kw[lv.o2gen] : 0,
    isru: f.isruDown || safe ? 0 : SYS.isru.kw[lv.isru],
    recycler: machineOk(S, 'water') ? SYS.recycler.kw[lv.recycler] : 0,
    farm: 0, wx: 0,
    heat: SYS.heat.kw[lv.heat],
    comms: f.commsDown || safe ? 0 : SYS.comms.kw[lv.comms],
    chargers: S.flow && S.flow.frost > 0 ? 0 : (S.car.charging ? 4 : 0) + (S.ship.charging ? 7 : 0),
    tools: S.bench.filter(Boolean).filter((b) => b.left > 0).length * 1.5 + (S.fab ? 4 : 0),
    bots: bots * 1,
    pump: S.fish && roomOk(S, 'animal') ? 0.5 : 0,
  };
  const people = 1 + humans(S).length, drain = m.drain, okW = machineOk(S, 'water') ? 1 : 0, okB = roomOk(S, 'bathroom') ? 1 : 0.8;
  const L0 = lifeFlows(S, 1, SYS.recycler.rate[lv.recycler] * okW, people); use.farm = L0.farmKw; use.wx = L0.wxKw;   // what the farms and the Water Plant ask for
  let extra = 0; for (const k in S.extraKw) extra += S.extraKw[k];
  const reactor = m.reactor || K.REACTOR_KW, demand = Object.values(use).reduce((a, b) => a + b, 0) + extra, supply = solar + reactor, net = supply - demand;
  const eff = S.battery <= 0.01 && net < 0 ? supply / demand : 1;   // brownout: every machine runs weak
  const o2Elec = use.o2gen > 0 && S.water > 0 ? SYS.o2gen.out[lv.o2gen] * eff : 0;
  const rate = SYS.recycler.rate[lv.recycler] * eff * okW * okB;
  const life = lifeFlows(S, eff, rate, people);                       // what they actually get once power is shared out
  const o2Farm = life.farmO2, o2Isru = use.isru > 0 ? SYS.isru.out[lv.isru] * eff : 0;
  const o2Use = K.O2_PER_DAY * drain * people + S.hens * 0.008;
  const o2Leak = S.flow?.o2Leak || 0;
  const o2Net = o2Elec + o2Isru + o2Farm - o2Use - o2Leak;
  // Plants breathe out nearly all the water they drink; the recycler (or the condensers) catches it from the air.
  const wCrew = K.WATER_PER_DAY * drain * people + S.hens * 0.05 + (S.fish ? 0.3 : 0), wFarm = life.farmWater, wUsed = wCrew + wFarm;
  const farmBack = S.tech.cond ? Math.max(rate, 0.97) : rate;
  const wNet = -(wCrew * (1 - rate)) - wFarm * (1 - farmBack) - K.H2O_PER_KG_O2 * o2Elec - f.leakWater * 24;
  const grow = SYS.farm.grow[lv.farm] * eff;
  const co2Out = K.CO2_PER_DAY * drain * people, h2Made = o2Elec * 0.125;      // electrolysis: every kg of oxygen leaves 0.125 kg of hydrogen
  const foodUse = K.MEALS_PER_DAY * drain * people;
  const heatNeed = Math.min(3, (!s.up ? 2 : s.elev > 55 ? 1 : 0) + (f.heater ? 1 : 0));
  const short = heatNeed - lv.heat * eff, frost = !s.up && short > 0.25 ? short : 0;   // night-time cold the heaters do not cover, in heater levels (a quarter of a level is forgiven)
  const commsOn = !f.commsDown && !safe && lv.comms > 0 && eff > 0.5;
  const cap = S.batteryCap * (roomOk(S, 'storage') ? 1 : 0.6) + S.mods * 120;
  const foodTotal = S.meals + S.cans + S.raw * 0.5;
  S.flow = {
    sun: s, nOk, solar, reactor, use, extra, demand, supply, net, eff, people, cap,
    o2Elec, o2Isru, o2Farm, o2Use, o2Leak, o2Net, rate, wUsed, wCrew, wFarm, farmBack, wNet, grow, foodUse, heatNeed, frost, commsOn, farms, life, co2Out, h2Made,
    battHours: net < 0 ? S.battery / -net : Infinity,
    o2Days: o2Net < 0 ? S.o2 / -o2Net : Infinity,
    waterDays: wNet < 0 ? S.water / -wNet : Infinity,
    foodDays: foodTotal / foodUse, foodTotal,
    doseRate: S.flow?.doseRate || 0,
    leaks: ROOMS.filter((r) => S.rooms[r.id].hole > 0 && S.rooms[r.id].door).map((r) => r.id),
  };
  return S.flow;
}

export function doseRate(S) {
  let r = S.zone === 'top' ? K.DOSE_SURFACE_PER_H : K.DOSE_DEEP_PER_H;
  const st = S.storm;
  if (st && S.t >= st.start && S.t < st.end) {
    const x = (S.t - st.start) / (st.end - st.start), shape = x < 0.15 ? x / 0.15 : 1 - ((x - 0.15) / 0.85) * 0.85;
    st.now = st.peak * shape; if (S.zone === 'top') r += st.now;
  }
  return r;
}
const mark = (S, k) => { if (S.marks[k] === undefined) S.marks[k] = S.t; };
// Which rooms a surprise event may hole right now. STORY rules, so that one mission is not a string of lost rooms:
// a limit for each mission, a day and a half between two holes, never the same room twice, and never the Water Room
// or the Oxygen Room while there is no material for a patch (those two hold machines nobody can live without).
export const HOLE_GAP_H = 36;
export function holeTargets(S) {
  if ((S.stats.holes || 0) >= (S.m.holes ?? Infinity)) return [];
  if (S.lastHole !== undefined && S.t - S.lastHole < HOLE_GAP_H) return [];
  const done = S.holed || [];
  return ROOMS.filter((d) => S.rooms[d.id].built >= 1 && S.rooms[d.id].hole === 0 && !done.includes(d.id) && !(S.mat < 1 && (d.id === 'water' || d.id === 'oxygen')));
}
export function holeRoom(S, id) { S.rooms[id].hole = 1; S.stats.holes = (S.stats.holes || 0) + 1; S.lastHole = S.t; (S.holed = S.holed || []).push(id); }
export function note(S, text, kind = 'info') { S.log.push({ t: S.t, text, kind }); if (S.log.length > 120) S.log.shift(); }

export function step(S, dt) {
  if (S.over) return;
  const F = computeFlows(S), d = dt / 24, bs = buildSpeed(S);
  // ---- power, chargers, workshop machines
  S.battery += F.net * dt; if (S.battery > F.cap) S.battery = F.cap;
  if (S.battery <= 0) { S.battery = 0; if (F.net < 0) { mark(S, 'battZero'); S.stats.brownHours += dt; } }
  if (S.safeMode > 0) S.safeMode = Math.max(0, S.safeMode - dt);
  // ---- cold the heaters do not cover reaches the batteries and the Water Plant: the rover and hopper lose charge, their chargers stop, the plant's seal wears
  if (F.frost > 0) {
    for (const [k, v] of [['car', S.car], ['ship', S.ship]]) { v.charging = false; const was = v.charge; v.charge = Math.max(0, v.charge - K.FROST_DRAIN * F.frost * dt); if (was > 0 && v.charge <= 0) S.pending.push('flat:' + k); }
    S.wx.seal = Math.max(0.5, S.wx.seal - K.FROST_SEAL * F.frost * dt); S.stats.frostHours = (S.stats.frostHours || 0) + dt;
    if (!S.frostOn) { S.frostOn = true; S.pending.push('frost'); }
  } else S.frostOn = false;
  if (S.chargeOff) S.car.charging = S.ship.charging = false;   // switched off on the Power Board
  for (const [v, rate] of [[S.car, 0.3], [S.ship, 0.2]]) if (v.charging) { v.charge = Math.min(1, v.charge + rate * dt * F.eff); if (v.charge >= 1) v.charging = false; }
  S.bench.forEach((b, i) => { if (b && b.left > 0) { b.left -= dt * F.eff * bs; if (b.left <= 0) { b.left = 0; S.pending.push('bench' + i); } } });
  if (S.fab) { S.fab.left -= dt * F.eff * bs; if (S.fab.left <= 0) { S.pending.push('fab:' + S.fab.what); S.fab = null; } }
  // ---- dust
  if (F.sun.up) S.dust = Math.min(1, S.dust + 0.0016 * dt);
  S.dust = Math.max(0.02, S.dust - 0.03 * working(S, 'clean') * dt * F.eff);
  // ---- air pressure: every room is a sealed bubble joined to the hall by a bulkhead door
  let made = 0;
  for (const def of ROOMS) {
    const r = S.rooms[def.id];
    if (r.hole > 0) r.p -= r.p * (1 - Math.exp(-r.hole * 5 * dt));                      // air escapes to space
    if (r.door) { const x = (S.P - r.p) * (1 - Math.exp(-9 * dt)) * 0.5; r.p += x; S.P -= x * 0.22; }   // open door: room and hall even out
    if (r.p < 20 && (r.hole > 0 || !r.door)) { r.cold += dt; if (r.cold > 0.4 && !r.frozen) { r.frozen = true; r.built = Math.min(r.built, 0.35); S.pending.push('froze:' + def.id); } } else r.cold = 0;
    r.p = clamp(r.p, 0, K.AIR_KPA);
  }
  if (S.o2 > 0 && S.P < K.AIR_KPA) { made = Math.min(K.AIR_KPA - S.P, 55 * dt); S.P += made; S.o2 = Math.max(0, S.o2 - made * K.O2_PER_KPA); }   // tanks top the hall back up
  S.P = clamp(S.P, 0, K.AIR_KPA);
  S.flow.o2Leak = S.flow.o2Leak * 0.9 + ((made * K.O2_PER_KPA) / Math.max(dt, 1e-6)) * 24 * 0.1;
  // ---- oxygen, water
  S.o2 = clamp(S.o2 + (F.o2Elec + F.o2Isru + F.o2Farm - F.o2Use) * d, 0, S.o2Cap);
  S.water = clamp(S.water + F.wNet * d, 0, S.waterCap);
  // ---- eating: cooked meals first, then tins, then raw food (worth half)
  let need = F.foodUse * d, hungry = false;
  const eat = (k, worth) => { const take = Math.min(S[k] * worth, need); S[k] -= take / worth; need -= take; };
  eat('meals', 1); if (need > 1e-9) eat('cans', 1); if (need > 1e-9) eat('raw', 0.5); if (need > 1e-6) hungry = true;
  // ---- farms, plant food, the moon-soil experiment, the Water Plant (js/life.js)
  const farmers = working(S, 'farm');
  stepLife(S, dt, F, farmers);
  // ---- animals: hens eat dry feed (people cannot eat it) and lay eggs; fish feed the plants
  if (roomOk(S, 'animal')) {
    if (S.feed > 0) { S.feed = Math.max(0, S.feed - S.hens * 0.11 * d); S.eggs = Math.min(10, S.eggs + S.hens * 0.75 * d); if (S.feed <= 0) S.pending.push('nofeed'); }
    if (farmers && S.eggs >= 1) { S.raw += Math.floor(S.eggs); S.eggs -= Math.floor(S.eggs); }
    if (S.fish) { S.fishAcc += 1.2 * d; if (S.fishAcc >= 1) { S.raw += 1; S.fishAcc -= 1; } }
  } else if (S.rooms.animal.frozen && S.fish) { S.fish = false; S.pending.push('fishlost'); }
  // ---- cooks turn raw food into meals
  const cooks = working(S, 'cook');
  if (cooks && roomOk(S, 'kitchen') && S.raw >= 0.5) { const n = Math.min(S.raw, cooks * 4 * dt * F.eff); S.raw -= n; S.meals += n; }
  // ---- topside gear temperature stress
  const deficit = F.heatNeed - S.lv.heat * F.eff;
  S.gearStress = clamp(S.gearStress + (deficit > 0.01 ? 0.03 * deficit : -0.08) * dt, 0, 1);
  if (S.gearStress >= 1) { S.gearStress = 0.5; S.pending.push('gearBreak'); }
  if (deficit <= 0.01 && S.gearStress <= 0) S.gearCard = false;   // the machines are warm (or cool) enough again: the next spell of damage gets a fresh card
  // ---- radiation
  const r = doseRate(S); S.dose += r * dt; S.flow.doseRate = r;
  if (S.zone === 'top') { S.stats.evaHours += dt; if (S.storm && S.t >= S.storm.start && S.t < S.storm.end) S.stats.stormDose += r * dt; }
  if (S.storm && S.t >= S.storm.end) S.pending.push('stormEnd');
  // ---- stale air (CO2)
  if (S.f.scrubber && !S.extraKw.backup) S.air = Math.max(0, S.air - (dt / 14) * (1 - Math.min(0.5, F.life.co2Fix / Math.max(0.1, F.co2Out)))); else   // plants soak up part of the CO2
    S.air = Math.min(1, S.air + dt / 4);
  // ---- health
  let dh = 0;
  if (S.o2 <= 0) { dh -= 7 * dt; S.hurt.air += dt; mark(S, 'o2Zero'); }
  if (S.water <= 0) { dh -= 2.2 * dt; S.hurt.water += dt; mark(S, 'waterZero'); }
  if (hungry) { dh -= 1.4 * dt; S.hurt.food += dt; mark(S, 'foodZero'); }
  if (S.air < 0.35) { dh -= 3 * dt; S.hurt.co2 += dt; mark(S, 'co2High'); }
  if (S.dose >= K.DOSE_LIMIT) { dh -= 6 * dt; S.hurt.rad += dt; mark(S, 'doseLimit'); }
  // no suit in thin air: the air pressure where you stand is what your body feels
  if (!S.suitOn && S.zone === 'deep') { const pr = S.here && S.rooms[S.here] ? S.rooms[S.here].p : S.P; if (pr < 45) { dh -= 40 * (1 - pr / 45) * dt; S.hurt.air += dt; } }
  if (dh === 0) dh = 1.2 * dt;
  S.health = clamp(S.health + dh, 0, 100);
  S.t += dt;
  const sample = () => S.hist.push([S.t, S.battery / F.cap, S.o2 / S.o2Cap, S.water / S.waterCap, Math.min(1, F.foodTotal / 30), S.dose / K.DOSE_LIMIT, S.health / 100, S.P / K.AIR_KPA]);
  if (S.t - S.lastHist >= 1) { S.lastHist = S.t; sample(); if (S.hist.length > 900) S.hist.splice(0, 2, S.hist[0]); }
  if (S.health <= 0) { const h = S.hurt; S.over = { win: false, cause: Object.keys(h).sort((a, b) => h[b] - h[a])[0] }; }
  else if (S.t - S.t0 >= S.hours) S.over = { win: true };
  if (S.over) sample();
}

// ---------- player actions (each one costs something) ----------
// Pick every ripe rack in one farm room. Returns { racks, raw, meals, herbs, sci, names }.
export function harvest(S, room, score = 0.8) {
  const out = harvestRoom(S, room, score); if (out.racks) note(S, tt`Picked ${lower(out.names.join(tt(' and ')))}.`, 'good'); return out;
}
export function collectEggs(S) { const n = Math.floor(S.eggs); S.eggs -= n; S.raw += n; return n; }
// Herbs make a cooked batch a fifth bigger (food people want to eat goes further).
export function cookBatch(S) { const n = Math.min(12, Math.floor(S.raw)), herb = S.herbs >= 1 && n > 0; if (herb) S.herbs -= 1; const made = Math.round(n * (herb ? 1.2 : 1)); S.raw -= n; S.meals += made; return made; }
export function spend(S, n) { if (S.mat < n) return false; if (S.mat !== Infinity) S.mat -= n; return true; }
export function runDustShield(S) { if (S.battery < 35) return false; S.battery -= 35; S.dust = Math.max(0.03, S.dust * 0.2); note(S, tt('Ran the dust shield (−35 kWh).')); return true; }
export function startStorm(S, real, leadHours) {
  const sev = real.sev, peak = [0, 0.4, 4, 13][sev] * S.m.stormMul, dur = [0, 4, 8, 12][sev];
  S.storm = { start: S.t + leadHours, end: S.t + leadHours + dur, peak, sev, real, now: 0 };
  note(S, tt`Solar storm alert: ${real.cls} flare (a real event from ${real.t.slice(0, 10)}).`, 'bad'); return S.storm;
}
export function addHelper(S, site) {
  S.helpers.push({ id: site.who, kind: 'human', name: site.whoName, role: 'idle', img: 'c_' + site.who, job: site.job });
  S.perks[site.job] = true; S.rescued.push(site.id); note(S, tt`Rescued ${site.whoName} from ${site.name}.`, 'good');
}
export function score(S) {
  const days = (S.t - S.t0) / 24, okPanels = S.mounts.filter((x) => x === 1).length, roomsOk = ROOMS.filter((r) => roomOk(S, r.id)).length;
  const pts = Math.round(days * 150 + S.health * 6 + Math.max(0, K.DOSE_LIMIT - S.dose) * 2 + okPanels * 60 + roomsOk * 80 + S.rescued.length * 500 + (S.over?.win ? 1000 : 0));
  const rank = S.mode === 'unlimited' ? (days > 30 ? tt('Moon Town Mayor') : days > 12 ? tt('Master Builder') : tt('Settler')) : !S.over?.win ? tt('Rookie in Training') : pts > 6500 ? tt('Legend of Tranquility') : pts > 5200 ? tt('Master Moonkeeper') : pts > 4000 ? tt('Moonkeeper') : tt('Survivor');
  return { pts, rank, days, okPanels, roomsOk };
}

// ---------- save / load ----------
export function serialize(S) { const o = { ...S }; delete o.rng; delete o.m; delete o.flow; o.pending = []; if (o.mat === Infinity) o.mat = 'inf'; return o; }
export function deserialize(o) {
  const S = createSim(o.mode, o.seed); const keep = { rng: mulberry32((o.seed ^ Math.floor(o.t * 977)) >>> 0), m: S.m };
  Object.assign(S, o, keep); if (S.mat === 'inf') S.mat = Infinity; S.hours = S.m.days * 24; S.flow = {}; S.pending = []; computeFlows(S); return S;
}
