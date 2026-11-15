// MOONKEEPER — Mars: the survival mission. Pure logic: no drawing, no page, no words for the player.
// "Hold the outpost for seven sols until the supply lander arrives." A dust storm is on its way, the stores are low,
// and machines break. Everything here runs on the outpost model in sim.js; `node tools/mars_survive_test.mjs` proves
// that doing nothing loses the mission and that a careful player wins it.
import { MARS, LOADS, marsStep } from './sim.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const MISSION = {
  sols: 7,                                   // the supply lander arrives at the end of sol 7
  o2: 12, water: 60, food: 36, battery: 180, // what is in the tanks, the store and the batteries at the start
  parts: 5, cargoParts: 4,                   // spare parts in the depot, and more still packed in the lander
  panelDust: 0.15,                            // the panels have not been brushed for a while
};
// What can break. parts = spare parts a repair uses up; hours = how long it takes in clear weather.
// The words the player reads for each are in js/mars/game.js.
export const FAULTS = {
  isru: { parts: 1, hours: 1.5 },        // the oxygen plant's intake filter clogs with dust: no oxygen is made
  thermal: { parts: 0, hours: 0.5 },     // the heat pump trips: no heating until it is reset
  lifesupport: { parts: 1, hours: 1 },   // the scrubber bed is spent: carbon dioxide builds up indoors
  water: { parts: 1, hours: 2 },         // the ice well's pump freezes: no new water
  battery: { parts: 2, hours: 2 },       // a battery module fails: 40% of the storage is gone
  solar: { parts: 0, hours: 1 },         // a row of solar tables jams: 30% less solar power
  comms: { parts: 0, hours: 0.5 },       // the wind knocks the dish off its aim: no link to Earth
  greenhouse: { parts: 1, hours: 1 },    // a grow-lamp driver burns out: nothing grows
};
const ORDER = ['isru', 'thermal', 'solar', 'lifesupport', 'water', 'battery', 'comms', 'greenhouse'];

// Turn a fresh outpost (createMars) into the start of the survival mission. Everything random comes from S.rng, so a seed repeats.
export function startSurvival(S) {
  const sol = MARS.SOL_H, r = S.rng;
  Object.assign(S, { mode: 'survive', hard: true, o2: MISSION.o2, water: MISSION.water, food: MISSION.food, battery: MISSION.battery, mat: MISSION.parts, panelDust: MISSION.panelDust, cargo: MISSION.cargoParts });
  S.m = { ...S.m, key: 'survive', days: MISSION.sols }; S.deadline = MISSION.sols * sol; S.fault = {}; S.faultAt = {}; S.over = null;
  // the storm: the dust thickens over a few hours, stays for two and a half to three sols, then thins
  const t0 = (1.5 + 0.35 * r()) * sol, hold = (2.5 + 0.5 * r()) * sol; S.storm = { t0, t1: t0 + hold, tau: 4.8 + 0.8 * r() };
  // the breakdowns: the first after about half a sol, then one every half to one sol; no machine breaks twice running
  S.plan = []; let t = (0.5 + 0.25 * r()) * sol, k = [0, 1, 3][Math.floor(r() * 3)], battery = false;
  while (t < S.deadline - 0.35 * sol) { let id = ORDER[k % ORDER.length]; if (id === 'battery' && battery) id = ORDER[++k % ORDER.length]; if (id === 'battery') battery = true; S.plan.push({ t, id }); k += 1 + Math.floor(r() * 3); t += (0.5 + 0.45 * r()) * sol; }
  S.stats.repairs = 0; S.stats.faults = 0; S.stats.brownHours = 0; S.stats.minBattery = S.battery; S.log = [];
  return S;
}
// Where the storm stands: 'before' (with hours to go), 'on', or 'after'.
export function stormPhase(S, t = S.t) { const st = S.storm; if (!st) return { phase: 'none' }; return t < st.t0 ? { phase: 'before', inH: st.t0 - t } : t < st.t1 ? { phase: 'on', leftH: st.t1 - t } : { phase: 'after' }; }
// Why the crew are in danger right now, worst first. Empty when all is well.
export function dangers(S) { const d = []; if (S.o2 <= 0) d.push('air'); if (S.co2 > 3) d.push('co2'); if (S.habTemp < 5) d.push('cold'); if (S.water <= 0) d.push('water'); if (S.food <= 0) d.push('food'); return d; }
// Move the mission forward by dt Earth hours. Returns what happened: [{ type: 'fault', id }, { type: 'storm', phase }, { type: 'over', win, cause }].
export function surviveStep(S, dt) {
  const out = []; if (S.over) return out; const before = stormPhase(S).phase;
  S.tauWant = stormPhase(S).phase === 'on' ? S.storm.tau : 0.5; marsStep(S, dt); S.stats.minBattery = Math.min(S.stats.minBattery, S.battery); S.stats.minRoom = Math.min(S.stats.minRoom ?? 99, S.habTemp); S.stats.minHealth = Math.min(S.stats.minHealth ?? 100, S.health);
  const after = stormPhase(S).phase; if (after !== before) out.push({ type: 'storm', phase: after });
  while (S.plan.length && S.plan[0].t <= S.t) { const { id } = S.plan.shift(); if (S.fault[id]) continue; S.fault[id] = true; S.faultAt[id] = S.t; S.stats.faults++; out.push({ type: 'fault', id }); }
  if (S.health <= 0) { S.over = { win: false, cause: dangers(S)[0] || 'health', t: S.t }; out.push({ type: 'over', ...S.over }); }
  else if (S.t >= S.deadline) { S.over = { win: true, t: S.t }; out.push({ type: 'over', ...S.over }); }
  return out;
}
// How long a repair takes now: half as long again in the storm, when you cannot see your own gloves.
export const repairHours = (S, id) => FAULTS[id].hours * (S.tau > 2 ? 1.5 : 1);
export const canRepair = (S, id) => !!S.fault[id] && S.mat >= FAULTS[id].parts;
// Finish a repair (the time it took has already passed). Returns false if there were not enough parts.
export function repair(S, id) { if (!canRepair(S, id)) return false; S.mat -= FAULTS[id].parts; delete S.fault[id]; if (S.faultAt) delete S.faultAt[id]; S.stats.repairs = (S.stats.repairs || 0) + 1; return true; }
// Unpack the spare parts still in the lander. Once.
export function unpackCargo(S) { const n = S.cargo || 0; S.mat += n; S.cargo = 0; return n; }
// What to switch off first when power is short: the things the crew can do without for a few sols. Never life support, heat, oxygen or water.
export const SHED = ['lab', 'greenhouse', 'comms', 'garage', 'living', 'medical'].filter((k) => LOADS[k]);
// How the mission went, as one number from 0 to 100, for the end screen: half for the crew's worst moment,
// a third for hours without full power, the rest for how much of what broke was mended.
export function grade(S) {
  const b = clamp(S.stats.minHealth ?? S.health, 0, 100) * 0.5 + clamp(100 - (S.stats.brownHours || 0) * 4, 0, 100) * 0.35 + clamp((S.stats.repairs / Math.max(1, S.stats.faults)) * 100, 0, 100) * 0.15;
  return Math.round(S.over && !S.over.win ? b * 0.4 : b);
}

// Free exploring only (no ending): what the crew and the supply line do by themselves so the outpost keeps going
// however long you stay. Returns what happened: 'brush' (the panels were cleaned), 'food' (a supply lander came),
// 'shed' (the battery was nearly empty, so the crew switched off what could wait) and 'unshed' (they switched it back on).
// The last two matter in winter: at 39.5°N the days are short and the Sun is low, and the solar field cannot carry everything.
export function exploreUpkeep(S) {
  const out = []; if (S.hard) return out;
  if (S.panelDust > 0.25 && S.flow && S.flow.sun.up && S.tau < 2) { S.panelDust = 0.03; out.push('brush'); }
  if (S.food < 60) { S.food += 600; out.push('food'); }
  const F = S.flow, cap = F ? F.cap : S.batteryCap;
  if (F && F.net < 0 && S.battery < 0.12 * cap) { const off = SHED.filter((k) => S.on[k]); if (off.length) { for (const k of off) S.on[k] = false; S.autoShed = [...(S.autoShed || []), ...off]; out.push('shed'); } }
  else if (S.autoShed && S.autoShed.length && S.battery > 0.6 * cap && F && F.net > 0) { for (const k of S.autoShed) S.on[k] = true; S.autoShed = []; out.push('unshed'); }
  return out;
}
