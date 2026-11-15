// Headless balance check for MOONKEEPER 2: runs rough player strategies through the sim (no random events).
import { createSim, applyDisaster, step, computeFlows, harvest, collectEggs, cookBatch, spend, roomOk } from '../js/sim.js';
import { ROOMS } from '../js/config.js';
const run = (mode, strat, maxDays = 14) => {
  const S = createSim(mode, 42); applyDisaster(S); S.zone = 'deep'; let last = S.t, lastFix = S.t, minB = 1e9;
  const ctx = { nextPanelAt: S.t + 5, nextRoomAt: S.t + 14 };
  while (!S.over && (S.t - S.t0) / 24 < maxDays) { computeFlows(S); strat(S, ctx); step(S, 0.1); minB = Math.min(minB, S.battery); }
  const F = S.flow;
  return `${S.over ? (S.over.win ? 'WIN ' : 'FAIL') : 'ALIVE'} day ${((S.t - S.t0) / 24).toFixed(1).padStart(4)} cause ${(S.over?.cause || '-').padEnd(5)} hp ${S.health.toFixed(0).padStart(3)} batt ${S.battery.toFixed(0).padStart(3)} minB ${minB.toFixed(0).padStart(3)} o2 ${S.o2.toFixed(1)} w ${S.water.toFixed(0).padStart(2)} food ${F.foodTotal.toFixed(0).padStart(2)} mat ${S.mat} panels ${F.nOk} rooms ${ROOMS.filter((r) => roomOk(S, r.id)).length}/11 P ${S.P.toFixed(0)} marks ${JSON.stringify(Object.fromEntries(Object.entries(S.marks).map(([k, v]) => [k, +((v - S.t0) / 24).toFixed(1)])))}`;
};
const lazy = () => {};
const sensible = (S, c) => {
  const F = S.flow, up = F.sun.up;
  // fix one broken panel every ~5 game hours, rebuild one room every ~14 h, while materials last
  if (S.t >= c.nextPanelAt) { const i = S.mounts.indexOf(2); if (i >= 0 && spend(S, 1)) S.mounts[i] = 1; c.nextPanelAt = S.t + 5; }
  if (S.t >= c.nextRoomAt) { const d = ROOMS.find((r) => S.rooms[r.id].built < 1); if (d && spend(S, d.mat + 1)) Object.assign(S.rooms[d.id], { hole: 0, built: 1, frozen: false, door: 1 }); c.nextRoomAt = S.t + 14; }
  if (S.t > 30 && S.f.commsDown) S.f.commsDown = false;
  S.lv.heat = F.heatNeed; S.lv.recycler = up ? 3 : 2; S.lv.comms = S.battery > 60 ? 1 : 0;
  S.lv.o2gen = S.o2 < 2 ? 2 : S.o2 < 6 ? 1 : 0; S.lv.farm = up ? (F.net > 6 ? 3 : 2) : S.battery > 150 ? 1 : F.foodDays < 1.5 ? 1 : 0;
  for (const id of ['potato', 'tomato']) if (S.crops[id].ripe >= 1) harvest(S, id, 0.8);
  if (S.eggs >= 3) collectEggs(S); if (S.raw >= 6 && roomOk(S, 'kitchen')) cookBatch(S);
  if (S.dust > 0.4) S.dust = 0.05;
  S.helpers[0].role = S.battery > 80 ? 'farm' : 'idle';
};
for (const mode of ['cadet', 'pilot', 'commander', 'unlimited']) { console.log(mode.padEnd(10), 'lazy    ', run(mode, lazy)); console.log(mode.padEnd(10), 'sensible', run(mode, sensible)); }
