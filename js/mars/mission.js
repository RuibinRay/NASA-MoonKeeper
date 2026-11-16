// MOONKEEPER — Mars: the survival mission as the player meets it. What REGO says when something breaks, the repair
// buttons, the storm warnings, the advice, and the screen at the end. The rules themselves are in survive.js.
import { tt } from '../i18n.js';
import { IC } from '../icons.js';
import { MARS, LOADS, marsStep } from './sim.js';
import { MISSION, FAULTS, SHED, TANK_LEFT, canRest, startSurvival, surviveStep, stormPhase, repairHours, canRepair, repair, unpackCargo, grade, exploreUpkeep, shedPlan, nightPlan } from './survive.js';
import { playMini } from '../minigames.js';

const $ = (s) => document.querySelector(s);
// A broken battery module or a jammed row of solar tables is mended at the Power Station; everything else at its own building.
const STEP = 0.1;
const AT = (id) => (id === 'battery' || id === 'solar' ? 'power' : id);
const PRIORITY = ['thermal', 'isru', 'lifesupport', 'battery', 'solar', 'water', 'greenhouse', 'comms'];
// What the player reads for each thing that can break.
export const FAULT_TEXT = {
  isru: { name: tt('Oxygen plant: intake filter clogged'), alert: tt('<b>The oxygen plant has stopped.</b> Dust has clogged its intake filter, so no oxygen is being made.'), fix: tt('Change the filter at the <b>ISRU Facility</b>.'), done: tt('New filter in. The oxygen plant is breathing Mars air again.') },
  thermal: { name: tt('Heat pump: tripped'), alert: tt('<b>The heat pump has tripped.</b> The rooms are losing their warmth to a night that reaches −89°C.'), fix: tt('Reset it at the <b>Thermal Control Facility</b>. It needs no parts.'), done: tt('Heat pump reset. The rooms are warming up.') },
  lifesupport: { name: tt('Air scrubber: bed used up'), alert: tt('<b>The air scrubber has stopped taking out carbon dioxide.</b> Its bed is used up, and the air indoors is slowly going stale.'), fix: tt('Swap the bed at the <b>Life Support Module</b>.'), done: tt('New scrubber bed in. The air indoors is clearing.') },
  water: { name: tt('Ice well: pump frozen'), alert: tt('<b>The ice well\'s pump has frozen.</b> No new water is coming up.'), fix: tt('Thaw and refit it at the <b>Water Processing Plant</b>.'), done: tt('Pump running. Meltwater is coming up again.') },
  battery: { name: tt('Battery: one module failed'), alert: tt('<b>A battery module has failed.</b> The outpost can now store only 60% of the energy it could.'), fix: tt('Replace the module at the <b>Power Station</b>. It takes two spare parts.'), done: tt('New module in. The battery is whole again.') },
  solar: { name: tt('Solar field: a row jammed'), alert: tt('<b>A row of solar tables has jammed.</b> Dust in the bearings: those tables no longer turn to the Sun, and solar power is down by 30%.'), fix: tt('Free the row at the <b>Power Station</b>. It needs no parts.'), done: tt('The row turns again. All the solar tables are following the Sun.') },
  comms: { name: tt('Dish: knocked off its aim'), alert: tt('<b>The wind has knocked the dish off its aim.</b> There is no link to Earth.'), fix: tt('Point it again at the <b>Communications Tower</b>. It needs no parts.'), done: tt('The dish is back on Earth. The link is up.') },
  greenhouse: { name: tt('Greenhouse: grow lamps out'), alert: tt('<b>The greenhouse lamps have gone out.</b> A driver has burned out, and nothing grows in the dark.'), fix: tt('Change the driver at the <b>Greenhouse</b>.'), done: tt('The lamps are on. The plants have their light back.') },
};
// The hands-on job for each repair: the same games as on the Moon, told for Mars, with the building's picture behind them.
const BOLTS_WHY = tt('Repairs on Mars are done in thick gloves, so the tools are big and the bolts stay attached. Spare parts are months away: every repair has to hold the first time.');
const BOLTS_MATTER = tt('A loose bolt shakes free in the wind and the cold; an over-tight one strips its thread. Either way the part fails again.');
const MINI = {
  isru: ['bolts', { title: tt('Open the filter housing'), winText: tt('New filter in!'), why: BOLTS_WHY, matter: BOLTS_MATTER }],
  thermal: ['gauge', { title: tt('Reset the heat pump'), unit: 'kW', max: 4, how: tt('Drag the wheel to bring the heat pump back up. Hold the needle in the GREEN band until the ring closes.'), winText: tt('Heat pump running!') }],
  lifesupport: ['bolts', { title: tt('Open the scrubber housing'), winText: tt('New bed in!'), why: BOLTS_WHY, matter: BOLTS_MATTER }],
  water: ['bolts', { title: tt('Refit the ice well pump'), winText: tt('Pump refitted!'), why: BOLTS_WHY, matter: BOLTS_MATTER }],
  battery: ['wires', { title: tt('Connect the new battery module'), winText: tt('Connected!') }],
  solar: ['wipe', { title: tt('Brush the dust out of the bearings'), how: tt('Hold and drag the brush across the row. Keep going until the joints are clean.'), winText: tt('Turning again!'), why: tt('Mars dust is as fine as flour and sticks to everything. It blocks the sunlight on the glass and grinds in every moving joint.'), did: tt('You brushed the dust out of the bearings.'), matter: tt('A solar table that cannot turn to follow the Sun loses much of its power. Clean joints keep it moving.') }],
  comms: ['gauge', { title: tt('Aim the dish at Earth'), unit: '%', max: 100, how: tt('Drag the wheel to turn the dish. Hold the needle in the GREEN band: that is the strongest signal from Earth.'), winText: tt('Link up!') }],
  greenhouse: ['wires', { title: tt('Wire in the new lamp driver'), winText: tt('Lamps on!') }],
};
const CAUSE = {
  air: { title: tt('THE OXYGEN RAN OUT'), why: tt('The oxygen tank reached zero. The crew breathe 3.4 kg of oxygen a sol, and the tank only holds what the oxygen plant has made.'), tip: tt('Keep the ISRU Facility running and mended. In a power shortage it is one of the last things to switch off.') },
  co2: { title: tt('THE AIR WENT STALE'), why: tt('Carbon dioxide built up indoors past 3%. Each person breathes out a kilogram of it a day, and only the scrubber in the Life Support Module takes it out.'), tip: tt('Mend the air scrubber as soon as it stops, and never switch the Life Support Module off.') },
  cold: { title: tt('THE OUTPOST FROZE'), why: tt('The rooms fell below 5°C and stayed there. With no heat, a habitat cools towards a night that reaches −89°C.'), tip: tt('The heat pump needs two things: to be mended when it trips, and more than half its power. In the storm, switch off what the crew can do without so the battery lasts the night.') },
  water: { title: tt('THE WATER RAN OUT'), why: tt('The water tank reached zero. The ice well brings up new water and the Life Support Module cleans used water; both had stopped.'), tip: tt('Keep the Water Processing Plant and the Life Support Module running.') },
  food: { title: tt('THE FOOD RAN OUT'), why: tt('The food store reached zero. With the Storage Depot switched off, the food warmed up and spoiled.'), tip: tt('The Storage Depot uses very little power. Leave it on.') },
  health: { title: tt('THE CREW COULD NOT GO ON'), why: tt('The crew\'s health reached zero.'), tip: tt('Press H often: REGO tells you what is most urgent.') },
};

export function makeMission(env) {
  const { G, ui, INFO, hrs, kw } = env, S = () => env.state(), on = () => !!S() && S().mode === 'survive', sol = MARS.SOL_H;
  const log = (text, kind) => { const s = S(); (s.log || (s.log = [])).push({ t: s.t, text, kind }); if (s.log.length > 60) s.log.shift(); };
  const faulty = () => !!S() && !!S().fault && Object.keys(S().fault).length > 0;
  const broken = (id) => faulty() && Object.keys(S().fault).some((f) => AT(f) === id);
  const clock = (t) => { const s = t / sol, h = (s % 1) * 24; return tt`Sol ${Math.floor(s) + 1}, ${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`; };

  function begin() { const s = startSurvival(S()); log(tt('The mission begins: hold the outpost until the supply lander arrives.')); return s; }
  const intro = () => { const s = S(), ph = stormPhase(s); ui.bubble(tt`<b>Hold the outpost for ${MISSION.sols} sols.</b> The supply lander is on its way, the tanks are low, and a <b>dust storm arrives in ${hrs(ph.inH)}</b>. Machines will break: mend them at their doors. <b>First, take the rover to the lander</b> and unpack the spare parts still in its hold. Press <b>H</b> whenever you want to know what matters most.`, 'worried', 24); G.pointTo('lander'); };

  // Move time forward by h hours. Returns true if something happened that should wake a resting player.
  // Time moves in steps of six minutes at most. One long step would use the sunlight at its start for the whole wait:
  // a two-hour job begun at dawn would count as dark, and one begun at noon as full Sun.
  function step(hours) {
    let woke = false; for (let left = hours; left > 1e-9 && !(S().over); left -= STEP) woke = stepOnce(Math.min(STEP, left)) || woke; return woke;
  }
  function stepOnce(h) {
    const s = S(); if (!on()) { marsStep(s, h); if (!s.train) for (const e of exploreUpkeep(s)) upkeep(e); return false; } let woke = false;
    for (const e of surviveStep(s, h)) { woke = true;
      if (e.type === 'fault') { const f = FAULT_TEXT[e.id], unpackFirst = s.cargo > 0 && G.goal && G.goal.id === 'lander' && !canRepair(s, e.id);   // still on the way to the lander and short of parts: unpack first, the guide stays on the lander
        G.audio.play('alarm'); ui.bubble(`${f.alert} ${f.fix}` + (unpackFirst ? ' ' + tt('Unpack the lander first: this repair needs the parts in its hold.') : ''), 'alert', 16); if (!unpackFirst) G.pointTo(AT(e.id)); log(f.name, 'bad'); }
      else if (e.type === 'storm' && e.phase === 'on') { G.audio.play('alarm'); ui.bubble(tt`<b>The dust storm is here.</b> The Sun's direct light is going, and the solar field will make about a third of its power for the next ${hrs(s.storm.t1 - s.t)}. Switch off what the crew can do without, so the battery lasts each night. Press <b>H</b> and I will say what to switch off first.`, 'alert', 20); log(tt('The dust storm arrived.'), 'bad'); }
      else if (e.type === 'storm') { ui.bubble(tt('<b>The storm is thinning.</b> The sky will clear over the next hours. The solar tables are coated in dust: brush them at the Power Station, then switch everything back on.'), 'joy', 16); log(tt('The dust storm ended.')); }
      else if (e.type === 'over') end(); }
    return woke;
  }

  // Free exploring has no ending, so the outpost must not run itself into the ground while you look round: the crew brush
  // the panels when they get very dusty, and a supply lander brings food before the store runs out.
  let shedSaid = false;
  const upkeep = (e) => { if (e === 'brush') ui.toast(tt('The crew brushed the dust off the solar panels.'), 'good'); else if (e === 'food') ui.toast(tt('A supply lander has brought food for another year.'), 'good');
    else if (e === 'shed' && shedSaid) ui.toast(tt('Battery low: the crew have switched off what can wait until the Sun is up.'));
    else if (e === 'shed') { shedSaid = true; ui.bubble(tt('<b>The battery is nearly empty.</b> The crew have switched off what can wait: the laboratory, the greenhouse lamps, the radio, the garage, the living quarters and the medical bay. Life support, heat, oxygen and water stay on. They will switch everything back on when the Sun has filled the battery.'), 'worried', 16); }
    else if (e === 'unshed') ui.toast(tt('Power is back. The crew have switched everything on again.'), 'good'); };

  // ---------- alerts and advice ----------
  function alerts(a) {
    if (!on() && !faulty()) return; const s = S(), ph = on() ? stormPhase(s) : { phase: 'none' };
    for (const id of PRIORITY) if (s.fault[id]) a.push({ key: 'fault-' + id, text: FAULT_TEXT[id].name, sub: canRepair(s, id) ? tt('Mend it at its door') : tt('No spare parts for this'), go: AT(id) });
    if (ph.phase === 'before') a.push({ text: tt('Dust storm coming'), sub: tt`arrives in ${hrs(ph.inH)}`, kind: 'warn', go: 'power' });
    if (on() && s.flow && !isShort(s, s.flow, ph)) { const np = nightPlan(s, s.flow, ph.phase === 'on' ? 24 : 6); if (np) a.push({ text: tt('Tonight the battery will not last'), sub: tt`After sunset: ${kw(s.flow.reactor)} made, ${kw(s.flow.demand)} used`, kind: 'warn', go: 'power' }); }
  }
  // Short of power only while the battery is actually going down: charging in daylight, even in the storm, is not short.
  const isShort = (s, F, ph) => F.eff < 1 || (F.net < 0 && (F.battHours < 9 || (ph.phase === 'on' && s.battery < 0.8 * F.cap)));
  // The switches REGO would have you press right now: buildings to switch off (power is short, or tonight will be), or one
  // to switch back on. The building panels and the Power Station panel glow these same switches, so the words and the
  // buttons never disagree.
  function switches() {
    if (!on()) return { off: [], on: null }; const s = S(), F = s.flow, ph = stormPhase(s);
    const low = ['isru', 'water'].find((k) => !s.on[k] && !canRest(s, F, k)); if (low) return { off: [], on: low };
    if (isShort(s, F, ph)) return { off: shedPlan(s, F).list, on: null };
    const np = nightPlan(s, F, ph.phase === 'on' ? 24 : 6); if (np) return { off: shedPlan(s, F, np.cut).list, on: null };
    const back = ['isru', 'water', ...SHED].find((k) => !s.on[k]); return { off: [], on: back && ph.phase !== 'on' && s.battery > 0.7 * F.cap && F.net > 0 ? back : null };
  }
  const WHERE = () => tt('Press Tab: their switches are on the Power Station panel, and at each building\'s door too.');
  // urgent = something else is already urgent (oxygen, water, cold, stale air): then the game's usual advice speaks
  function advise(urgent) {
    if (!on()) return false; const s = S(), F = s.flow, ph = stormPhase(s), say = (html, go, mood = 'worried') => { ui.bubble(html, mood, 14); if (go) G.pointTo(go); return true; };
    // A tank machine resting while its tank runs low: switch it back on before anything else.
    const low = ['isru', 'water'].find((k) => !s.on[k] && !canRest(s, F, k));
    if (low) return say(low === 'isru' ? tt`<b>Switch the ISRU Facility back on.</b> The oxygen in the tanks lasts only ${hrs(TANK_LEFT.isru(s, F))} without it.` : tt`<b>Switch the Water Processing Plant back on.</b> The water lasts only ${hrs(TANK_LEFT.water(s, F))} without it.`, low, 'alert');
    // Breakdowns: the ones in running buildings first. A broken building that is switched off can wait until the power is back.
    const running = (k) => s.on[k] !== false, f = PRIORITY.find((k) => s.fault[k] && running(k)), fOff = PRIORITY.find((k) => s.fault[k] && !running(k));
    if (f && canRepair(s, f)) return say(`${FAULT_TEXT[f].alert} ${FAULT_TEXT[f].fix}`, AT(f), 'alert');
    if ((f || fOff) && s.cargo > 0 && !canRepair(s, f || fOff)) return say(tt`<b>We have no spare parts left</b> for this repair. There are ${s.cargo} more still packed in the <b>lander</b>. Take the rover.`, 'lander', 'alert');
    if (urgent && !(F.eff < 1)) return false;
    const short = isShort(s, F, ph);
    if (short) { const p = shedPlan(s, F);
      if (!p.list.length) return say(tt('<b>Power is short</b>, and everything that can wait is already off. Keep the Life Support Module and the heat pump running, and brush the solar panels as soon as the Sun is up.'), 'power');
      const names = p.list.map((k) => tt`<b>${INFO[k].name}</b> (${kw(F.use[k] || LOADS[k])})`).join(', '), notes = [];
      if (p.list.includes('isru')) notes.push(tt`The oxygen in the tanks lasts ${hrs(TANK_LEFT.isru(s, F))}, so the ISRU Facility can rest until the battery recovers.`);
      if (p.list.includes('water')) notes.push(tt`The water lasts ${hrs(TANK_LEFT.water(s, F))}, so the Water Processing Plant can rest until the battery recovers.`);
      return say([F.net < 0 ? tt`<b>Power is short:</b> the outpost uses ${kw(-F.net)} more than it makes.` : tt('<b>Power is short.</b>'), tt`Switch off ${names}.`, WHERE(), ...notes, p.saved < -F.net - 0.05 ? (p.more ? tt('When those are off, press H and I will name the next ones.') : tt('That still leaves the battery running down, only slower: it is the most we can spare.')) : '', tt('Keep the Life Support Module and the heat pump on: below half power, the heat and the air scrubbers stop.')].filter(Boolean).join(' '), p.list[0]); }
    // The night ahead, said while there is still daylight to act in (all day long in a storm, the last six hours otherwise).
    { const np = nightPlan(s, F, ph.phase === 'on' ? 24 : 6);
      if (np) { const p = shedPlan(s, F, np.cut), lead = tt`<b>Tonight the battery will not last.</b> After sunset, in ${hrs(np.toSet)}, only the fission unit makes power: ${kw(F.reactor)}, and the outpost uses ${kw(F.demand)}. The battery will hold about ${Math.round(np.have)} kWh and the night needs about ${Math.round(np.need)} kWh.`;
        if (!p.list.length) return say(lead + ' ' + tt('Everything that can wait is already off. Keep the Life Support Module and the heat pump running.'), 'power');
        return say([lead, tt`Switch off ${p.list.map((k) => tt`<b>${INFO[k].name}</b> (${kw(F.use[k] || LOADS[k])})`).join(', ')} before dark.`, WHERE()].join(' '), p.list[0]); } }
    if (s.cargo > 0) return say(tt`Before the storm: there are <b>${s.cargo} spare parts</b> still packed in the <b>lander</b>. Take the rover and unpack them. You will need them when things break.`, 'lander', 'happy');
    if (s.panelDust > 0.08 && ph.phase !== 'on' && F.sun.up) return say((ph.phase === 'before' ? tt`The solar panels are losing <b>${Math.round(s.panelDust * 100)}%</b> of their power to dust. Brush them at the <b>Power Station</b> before the storm arrives.` : tt`The solar panels are losing <b>${Math.round(s.panelDust * 100)}%</b> of their power to dust. Brush them at the <b>Power Station</b>.`), 'power', 'happy');
    if (fOff && canRepair(s, fOff)) return say(tt`The <b>${INFO[AT(fOff)].name}</b> is switched off, and it is broken too: ${FAULT_TEXT[fOff].name}. Mend it at its door before you switch it back on.`, AT(fOff));
    const back = ['isru', 'water', ...SHED].find((k) => !s.on[k]); if (back && ph.phase !== 'on' && s.battery > 0.7 * F.cap && F.net > 0) return say(tt`Power is back. Switch the <b>${INFO[back].name}</b> on again at its door.`, back, 'happy');
    if (f) return say(tt`<b>${FAULT_TEXT[f].name}.</b> We have no spare parts left to mend it. Keep everything else running until the supply lander arrives.`, null);
    if (ph.phase === 'on' && F.sun.up) return say(tt`Nothing needs switching off yet: the battery should last tonight. I will say so before dark if that changes. The supply lander arrives in ${hrs(s.deadline - s.t)}.`, null, 'happy');
    return say(ph.phase === 'before' ? tt`All is in order. The storm arrives in ${hrs(ph.inH)}: go in with a full battery.` : tt`All is in order. The supply lander arrives in ${hrs(s.deadline - s.t)}. Keep an eye on the battery at night.`, null, 'happy');
  }

  // ---------- at the buildings ----------
  function panel(id, st, act) {
    if (!on() && !faulty()) return; const s = S();
    for (const f of PRIORITY.filter((k) => s.fault[k] && AT(k) === id).reverse()) { const need = FAULTS[f].parts, h = repairHours(s, f), T = FAULT_TEXT[f];
      st.unshift([tt('BROKEN'), `<span class="down">${T.name}</span>`]);
      act.unshift({ label: tt`Mend it: ${T.name}`, sub: (need ? (need > 1 ? tt`Uses ${need} spare parts (you have ${s.mat}).` : tt`Uses 1 spare part (you have ${s.mat}).`) : tt('Needs no parts.')) + ' ' + (s.tau > 2 ? tt`Takes ${hrs(h)} in the storm.` : tt`Takes ${hrs(h)}.`), disabled: !canRepair(s, f),
        run: async () => { let hh = h;
          if (G.minis !== false && MINI[f]) { const [kind, o] = MINI[f], r = await playMini(G, kind, { ...o, bg: 'mars/mr_' + AT(f), loseText: tt('Done the slow way') });   // the job by hand first; how it went changes how long the repair takes
            if (!r.win || r.score < 0.55) { hh *= 1.3; ui.toast(tt('That was fiddly, so the repair takes 30% longer.')); } else if (r.stars === 3) { hh *= 0.85; ui.toast(tt('Clean work! The repair goes 15% faster.'), 'good'); } }
          await env.pass(hh, tt('Mending…')); if (s.over) return; if (repair(s, f)) { G.audio.play('ok'); ui.toast(T.done, 'good'); log(T.done); setTimeout(() => { if (!s.over) G.advise(); }, 1500); } } }); }   // REGO's hint moves on to what matters next
    if (id === 'cmd' && on()) { const ph = stormPhase(s), bad = PRIORITY.filter((k) => s.fault[k]); st.push([tt('Supply lander'), tt`arrives in ${hrs(s.deadline - s.t)}`], [tt('Dust storm'), ph.phase === 'before' ? tt`arrives in ${hrs(ph.inH)}` : ph.phase === 'on' ? tt`here for about ${hrs(ph.leftH)} more` : tt('over')], [tt('Broken now'), bad.length ? bad.map((k) => FAULT_TEXT[k].name).join(' · ') : tt('nothing')], [tt('Spare parts'), s.cargo ? tt`${s.mat} here · ${s.cargo} still in the lander` : String(s.mat)]); }
  }
  // The lander: in the survival mission its hold still has spare parts in it.
  const place = (p) => { const s = S(); if (p.id !== 'lander' || !s.cargo) return null;
    return ui.panel(p.name, { img: `mars/mr_${p.id}`, stats: [[tt('In the hold'), tt`${s.cargo} spare parts`], [tt('In the depot'), tt`${s.mat} spare parts`]], note: p.text, actions: [{ label: tt`Unpack the ${s.cargo} spare parts`, sub: tt('They go straight into the outpost\'s store of spare parts.'), run: () => { const n = unpackCargo(s); G.audio.play('ok'); ui.toast(tt`${n} spare parts unpacked. You now have ${s.mat}.`, 'good'); log(tt('Spare parts unpacked from the lander.')); if (G.goal && G.goal.id === 'lander') G.goal = null; setTimeout(() => G.advise(), 1200); } }] }); };   // what next: often a repair that was waiting for these parts

  // ---------- the HUD ----------
  function hud() {
    if (!on()) return; const s = S(), ph = stormPhase(s);
    $('#c-day').textContent = tt`Sol ${Math.min(MISSION.sols, Math.floor(s.t / sol) + 1)} of ${MISSION.sols}`; if (s.t >= s.deadline) $('#c-time').textContent = '24:00';   // the lander comes at the very end of the last sol, not at midnight of a sol 8
    $('#c-rescue').innerHTML = IC.rocket + tt` supply lander in ${hrs(Math.max(0, s.deadline - s.t))}`;
    if (ph.phase === 'before' && ph.inH < 14 && s.tau <= 2.5) ui.banner(tt`Dust storm arrives in ${hrs(ph.inH)} · charge the battery, brush the panels`, true);
  }

  // ---------- the end ----------
  function end() {
    const s = S(), o = s.over; if (G.state === 'over') return; G.state = 'over'; G.simOn = false; ui.banner(null); ui.objective(null); G.goal = null; G.audio.play(o.win ? 'win' : 'bad'); G.clearSave(); document.exitPointerLock?.();
    const g = grade(s), rank = !o.win ? tt('Mission lost') : g >= 90 ? tt('Mars Keeper') : g >= 75 ? tt('Outpost Engineer') : g >= 55 ? tt('Storm Survivor') : tt('Just Made It'), c = CAUSE[o.cause] || CAUSE.health, st = s.stats, why = [];
    if (o.win) { why.push(tt`You kept four people alive for <b>${MISSION.sols} sols</b>, through a dust storm that reached <b>${s.storm.tau.toFixed(1)}</b> on the dust scale.`);
      why.push(st.repairs === st.faults ? tt`${st.faults} things broke, and you mended every one.` : tt`${st.faults} things broke, and you mended ${st.repairs} of them.`);
      why.push(st.brownHours < 0.5 ? tt('The power never failed: you switched off what could wait, and the battery lasted every night.') : tt`The outpost spent <b>${st.brownHours.toFixed(0)} hours</b> without full power, and the rooms fell to ${Math.round(st.minRoom)}°C. Switching off more of what the crew could do without would have kept the battery up.`); }
    else { why.push(tt`${clock(o.t)}: ${c.why}`); const left = PRIORITY.filter((k) => s.fault[k]); if (left.length) why.push(tt`Still broken at the end: ${left.map((k) => FAULT_TEXT[k].name).join(' · ')}.`);
      if (st.brownHours > 2) why.push(tt`The outpost spent ${st.brownHours.toFixed(0)} hours without full power. In a brownout every machine slows, and the heat pump stops when it gets less than half its power.`); }
    setTimeout(async () => { await ui.fade(true); ui.showHud(false); const e = $('#end'); e.classList.remove('hidden');
      e.innerHTML = `<div class="end-bg" style="background-image:url(assets/img/mars/${o.win ? 'mr_lander' : 'mr_storm'}.jpg)"></div><div class="end-inner">
        <div class="eyebrow">${tt`Survive on Mars · ${(s.t / sol).toFixed(1)} sols · seed ${s.seed}`}</div><h1 class="${o.win ? 'won' : 'lost'}">${o.win ? tt('THE SUPPLY LANDER IS DOWN') : c.title}</h1>
        <p class="body">${o.win ? tt('It comes down on the pad in a cloud of dust, with food, parts and four more people. The outpost you kept alive is still warm, still breathing, and still yours.') : tt('The outpost could not be held this time. Mars does not forgive a machine left broken or a battery left to run down.')}</p>
        <div class="badges"><span class="badge">${rank}</span><span class="badge">${tt`${g} of 100`}</span><span class="badge">${tt`crew health ${Math.round(s.health)}%`}</span><span class="badge">${tt`${st.repairs} of ${st.faults} repairs`}</span><span class="badge">${tt`${(st.brownHours || 0).toFixed(0)} h without full power`}</span><span class="badge">${tt`${s.dose.toFixed(1)} mSv radiation`}</span><span class="badge">${tt`${st.km.toFixed(1)} km driven`}</span></div>
        <h3>${o.win ? tt('How you did it') : tt('Here is what happened — and why')}</h3><ol class="chain">${why.map((x) => `<li>${x}</li>`).join('')}</ol>
        <div class="learn">${tt('<b>The real science:</b> dust storms are the great danger to solar power on Mars. In 2007 a storm blocked 99% of the direct sunlight at the Opportunity rover and cut its power from about 700 to 128 watt-hours a day. In 2018 a storm that covered the whole planet ended its mission. A crew will have to do what you did: store energy, switch off what can wait, and keep the machines mended. The breakdowns in this mission are made up for the game.')}</div>${o.win ? '' : `<div class="note">${tt`<b>Next time:</b> ${c.tip}`}</div>`}
        <h3>${tt('Mission log')}</h3><div class="logbox">${(s.log || []).map((l) => `<div><b>${clock(l.t)}</b> — ${l.text}</div>`).join('') || tt('Nothing logged.')}</div>
        <div class="row" style="margin-top:16px"><button class="primary" id="again">${o.win ? tt('Play again') : tt('Try again')}</button><span class="fine" style="margin:0">${tt('Science notes and data sources: docs/MARS_SCIENCE.md in this project.')}</span></div></div>`;
      $('#again').onclick = () => { const u = new URL(location.href); u.searchParams.set('go', 'mars-survive'); location.href = u.href; }; await ui.fade(false); }, o.win ? 1600 : 900);
  }
  return { on, begin, intro, step, alerts, advise, panel, place, hud, broken, end, switches };
}
