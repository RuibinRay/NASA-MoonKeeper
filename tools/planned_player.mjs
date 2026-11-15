// A planned player for the balance check: follows a sensible repair plan and pays game time for every trip and job.
// The two simple strategies in sim_test.mjs fix things for free. This one walks, drives and rides the elevator,
// so it shows whether a mode can be won by someone who actually has to get around.
//
//   node tools/planned_player.mjs [mode] [travel factor] [plan] [trace]
//
// travel factor: 1 = perfect routes, 1.5 = a good player, 2 = a slow one, 3 = lost half the time.
// Not modelled: surprise events, the oxygen-from-soil plant, rescued astronauts, cooking by hand.
import { createSim, applyDisaster, step, computeFlows, harvest, collectEggs, spend, roomOk, jobHours, runDustShield } from '../js/sim.js';
import { ROOMS, SITES, MINE } from '../js/config.js';
import { planBatch, startBatch } from '../js/life.js';

const GATE = [0, 60];                 // top of the pit elevator
export const PLANS = ['basics', 'salvage', 'early', 'water', 'store'];

export function runPlanned(mode, f = 1.5, planName = 'basics', trace = false) {
  const S = createSim(mode, 42); applyDisaster(S); S.zone = 'deep';
  const hl = S.m.hourLen, c = { tray: 0, where: 'deep', log: [], o2On: false, cans: S.m.ice || 0 };   // cans: canisters of icy soil waiting on the surface
  // a task: real seconds of walking and driving, game hours of work, where it happens, when it can start, what it changes
  const T = (name, secs, hours, zone, pre, done) => ({ name, secs, hours, zone, pre, done });
  const broken = () => S.mounts.filter((x) => x === 2).length;
  const room = (id) => { const d = ROOMS.find((r) => r.id === id);                       // patch the hole (1 material, 1 h), then rebuild
    return T('rebuild ' + id, 10, 1 + d.hours, 'deep', () => c.where === 'deep' && S.mat >= d.mat + 1 && S.rooms[id].built < 1,
      () => { spend(S, d.mat + 1); Object.assign(S.rooms[id], { hole: 0, built: 1, frozen: false, door: 1, cold: 0 }); for (const q of S.racks) if (q.room === id) Object.assign(q, { g: 0, ripe: 0, hp: 0.6 }); }); };
  const up = () => T('ride up', 11, 0.2, 'top', () => c.where === 'deep', () => { c.where = 'top'; });
  const down = () => T('ride down', 11, 0.2, 'deep', () => c.where === 'top', () => { c.where = 'deep'; });
  // pull two broken panels, drive them to the elevator, drag each to the Fix-It Bench (1 material and 2 h on the bench each)
  const panelsDown = () => T('two panels down to the bench', 12 + 61, 1 + 0.6, 'top', () => c.where === 'top' && broken() >= 2 && S.mat >= 2 && !S.bench[0] && !S.bench[1],
    () => { for (let i = 0; i < 2; i++) { S.mounts[S.mounts.indexOf(2)] = 0; spend(S, 1); S.bench[i] = { left: 2, total: 2 }; } c.where = 'deep'; });
  const panelsUp = () => T('two fixed panels up and installed', 61 + 12, 2 + 0.6, 'deep', () => c.where === 'deep' && S.bench.some(Boolean) && S.bench.every((b) => !b || b.left <= 0),
    () => { for (let i = 0; i < 2; i++) if (S.bench[i]) { S.bench[i] = null; S.mounts[S.mounts.indexOf(0)] = 1; } c.where = 'top'; });
  const wait = (h, name) => T(name, 0, h, null, () => true, () => {});
  // drive the rover to another station, load up to four crates, bring them back to the depot
  const salvage = (id, want) => { const s = SITES.find((q) => q.id === id), dist = Math.hypot(s.pos[0] - GATE[0], s.pos[1] - GATE[1]), need = (2 * dist) / 2600;
    return T('rover trip to ' + id, (2 * dist) / 13 + 8 * want.length, 0, 'top', () => c.where === 'top' && S.car.charge >= need + 0.03,
      () => { S.car.charge -= need; S.car.charging = true; for (const w of want) { if (w === 'mat') S.mat += 4; else if (w === 'cans') S.cans += 8; else if (w === 'water') S.water = Math.min(S.waterCap, S.water + 12); else if (w === 'ice') c.cans++; } }); };
  // carry n canisters to the Water Plant and start the shortest recipe that gets most of the ice out
  const batch = (n) => T(`water batch from ${n} canister${n > 1 ? 's' : ''}`, 14 + 6 * n, 0, 'top', () => c.where === 'top' && c.cans >= n && !S.wx.batch,
    () => { let hours = 18; for (let h = 3; h <= 18; h++) { const p = planBatch(S, { mode: 'ice', method: 'elec', n, kw: 4, hours: h, pa: 10 }, S.flow.sun.factor); if (p.eff >= 0.84) { hours = h; break; } }
      c.cans -= n; S.wx.ice += n; c.log.push(`      recipe: ${n} canister${n > 1 ? 's' : ''}, 4 kW for ${hours} h -> ${startBatch(S, { mode: 'ice', method: 'elec', n, kw: 4, hours, pa: 10 })}`); });
  // drive to the Polar Ice Mine, dig k canisters (two scoops each) and bring them home; the cold drains the parked rover
  const mine = (k) => { const dist = Math.hypot(MINE.x - GATE[0], MINE.z - GATE[1]), digSecs = k * (MINE.perCan * (MINE.digSec + 6) + 8), need = (2 * dist) / 2600 + MINE.drain * ((digSecs * f) / hl);
    return T(`ice mine trip for ${k} canisters`, (2 * dist) / 13 + digSecs + 8 * k, 0, 'top', () => c.where === 'top' && S.car.charge >= need + 0.03,
      () => { S.car.charge = Math.max(0, S.car.charge - need); S.car.charging = true; c.cans += k; }); };
  const fabBattery = () => T('start a battery module', 6, 0, 'deep', () => c.where === 'deep' && !S.fab && S.mat >= 6, () => { spend(S, 6); S.fab = { what: 'battery', left: 4, total: 4 }; });
  const plug = () => T('plug in the battery module', 15, 1, 'deep', () => c.where === 'deep' && c.tray > 0 && roomOk(S, 'storage'), () => { c.tray--; S.mods++; });
  const later = (t) => (t.name.startsWith('two fixed') ? S.bench.some((b) => b && b.left > 0) : t.name.startsWith('plug') ? !!S.fab && roomOk(S, 'storage') : t.name.startsWith('rover') || t.name.startsWith('ice mine') ? S.car.charging : t.name.startsWith('water batch') ? !!S.wx.batch : false);

  const plans = {
    // a yardstick, not a real plan (so it is not in PLANS): the Bathroom and no panel repairs at all. Compared with basics it shows what fixing panels buys.
    nopanels: [room('bathroom')],
    // the Battery Store before the panels, so the panels have somewhere to put their power
    store: [room('bathroom'), room('storage'), up(), panelsDown(), wait(2, 'wait for the bench'), panelsUp(), panelsDown(), wait(2, 'wait for the bench'), panelsUp(), down()],
    // the Battery Store and no panel repairs: with store, it shows what the panels add once there is room for their power
    storeonly: [room('bathroom'), room('storage')],
    // what happens to someone who does the Battery Store first of all, as REGO suggests when the battery is full by day
    storefirst: [room('storage'), room('bathroom'), up(), panelsDown(), wait(2, 'wait for the bench'), panelsUp(), panelsDown(), wait(2, 'wait for the bench'), panelsUp(), down()],
    // only what the base starts with: the Bathroom (so water is recycled properly), then four panels
    basics: [room('bathroom'), up(), panelsDown(), wait(2, 'wait for the bench'), panelsUp(), panelsDown(), wait(2, 'wait for the bench'), panelsUp(), down()],
    // the same, then fetch materials for the Battery Store and a module, then a second trip for water and food
    salvage: [room('bathroom'), up(), panelsDown(), wait(2, 'wait for the bench'), panelsUp(), panelsDown(), wait(2, 'wait for the bench'), panelsUp(), salvage('sakura', ['mat', 'mat', 'mat', 'mat']), down(), room('storage'), fabBattery(), wait(4, 'wait for the builder'), plug(), up(), salvage('chandra', ['water', 'cans', 'cans', 'mat']), down()],
    // basics, with water: the canister at the base goes into the Water Plant at once, then two more from the ice mine (a good player cannot bring back four: the cold drains the parked rover)
    water: [room('bathroom'), up(), batch(Math.min(1, c.cans)), panelsDown(), wait(2, 'wait for the bench'), panelsUp(), panelsDown(), wait(2, 'wait for the bench'), panelsUp(), mine(2), batch(2), down()],
    // four panels, then materials, then the last two panels with the Battery Store and modules on the side
    early: [room('bathroom'), up(), panelsDown(), wait(2, 'wait for the bench'), panelsUp(), panelsDown(), wait(2, 'wait for the bench'), panelsUp(), salvage('sakura', ['mat', 'mat', 'mat', 'mat']), panelsDown(), room('storage'), fabBattery(), panelsUp(), down(), plug(), fabBattery(), wait(4, 'wait for the builder'), plug()],
  };
  // the Power Board, set the way a careful player would
  const settings = () => { const F = S.flow, sunUp = F.sun.up, n = F.nOk, daysLeft = Math.max(0, (S.hours - (S.t - S.t0)) / 24), brown = !sunUp && S.battery <= 5;
    S.lv.comms = 0; S.lv.heat = F.heatNeed;
    const foodOk = F.foodTotal > F.foodUse * daysLeft + 3;
    if (sunUp) {                                                           // daylight: more panels, more machines; fill the oxygen tanks
      S.lv.recycler = n >= 4 ? 3 : 2;
      S.lv.o2gen = S.o2 >= 7.6 ? 0 : n >= 6 && S.water > 8 ? 3 : n >= 4 && S.water > 8 ? 2 : 1;
      S.lv.farm = foodOk ? 1 : n >= 6 ? 3 : n >= 4 ? 2 : 1;
    } else if (!brown) {                                                   // night, on the battery
      S.lv.recycler = 2; if (S.o2 < 4) c.o2On = true; else if (S.o2 > 6) c.o2On = false; S.lv.o2gen = c.o2On && S.water > 2 ? 1 : 0;
      S.lv.farm = foodOk ? 0 : S.battery > 150 ? 1 : 0;
    } else {                                                               // battery empty: keep only air, water and the heaters
      S.lv.recycler = 1; S.lv.o2gen = S.water > 1 && S.o2 < 7.6 ? 1 : 0; S.lv.farm = 0;
    }
    S.helpers[0].role = S.lv.farm > 0 && !brown ? 'farm' : 'idle'; S.helpers[1].role = !brown && S.raw >= 2 && roomOk(S, 'kitchen') ? 'cook' : 'idle';
    for (const id of ['potato', 'tomato']) if (S.racks.some((r) => r.room === id && r.ripe)) harvest(S, id, 0.8);
    if (S.eggs >= 3) collectEggs(S);
    if (sunUp && S.dust > 0.28 && S.battery > 80 && n >= 4) runDustShield(S);
    if (S.car.charging && (brown || (!sunUp && S.battery < 100))) S.car.charging = false;
  };

  const q = plans[planName].slice(); let cur = null, left = 0, nextLog = S.t, minO2 = 99, minW = 99;
  while (!S.over && (S.t - S.t0) / 24 < 14) {
    computeFlows(S);
    for (const p of S.pending.splice(0)) if (p === 'fab:battery') c.tray++;
    if (!cur) { while (q.length && !q[0].pre() && !later(q[0])) { c.log.push(`${(S.t - S.t0).toFixed(0).padStart(3)} h  skipped: ${q[0].name}`); q.shift(); }
      if (q.length && q[0].pre()) { cur = q.shift(); left = (cur.secs * f) / hl + (cur.hours ? jobHours(S, cur.hours) : 0); if (cur.zone) S.zone = cur.zone; c.log.push(`${(S.t - S.t0).toFixed(0).padStart(3)} h  ${cur.name} (${left.toFixed(1)} h)`); } }
    settings();
    if (trace && S.t >= nextLog) { const F = S.flow; nextLog += 12; console.log(`day ${((S.t - S.t0) / 24).toFixed(1).padStart(4)} ${F.sun.up ? 'light' : 'dark '} supply ${F.supply.toFixed(1).padStart(4)} demand ${F.demand.toFixed(1).padStart(4)} battery ${S.battery.toFixed(0).padStart(3)}/${F.cap.toFixed(0)} oxygen ${S.o2.toFixed(1)} water ${S.water.toFixed(1).padStart(4)} food ${F.foodTotal.toFixed(0).padStart(2)} materials ${String(S.mat).padStart(2)} panels ${F.nOk} | ${cur ? cur.name : 'idle'}`); }
    step(S, 0.1); if (cur) { left -= 0.1; if (left <= 0) { cur.done(); cur = null; } }
    minO2 = Math.min(minO2, S.o2); minW = Math.min(minW, S.water);
  }
  const F = S.flow, win = !!S.over?.win;
  return { S, win, log: c.log, minO2, minW, made: S.wx.made, text: `${S.over ? (win ? 'WIN ' : 'FAIL') : 'ALIVE'} day ${((S.t - S.t0) / 24).toFixed(1).padStart(4)} cause ${(S.over?.cause || '-').padEnd(5)} hp ${S.health.toFixed(0).padStart(3)} o2 ${S.o2.toFixed(1)} w ${S.water.toFixed(0).padStart(2)} food ${F.foodTotal.toFixed(0).padStart(2)} mat ${S.mat} panels ${F.nOk} rooms ${ROOMS.filter((r) => roomOk(S, r.id)).length}/11 brownout ${S.stats.brownHours.toFixed(0)} h${S.wx.made > 0 ? ` · Water Plant made ${S.wx.made.toFixed(0)} L` : ''}` };
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/planned_player.mjs')) {
  const [, , mode = 'commander', f = '1.5', plan = 'basics', trace] = process.argv;
  const r = runPlanned(mode, +f, plan, !!trace); if (trace) console.log(r.log.join('\n'));
  console.log(mode, '· plan', plan, '· travel x' + f, '·', r.text);
}
