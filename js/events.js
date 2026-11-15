// MOONKEEPER 2 — surprise events. Every solar storm, moonquake and meteoroid strike uses the date of a real recorded event.
import { STORMS, QUAKES, IMPACTS, METEORITES } from './nasa-events.js';
import { QUIZ } from './quiz.js';
import { K, SITES, ROOMS, MOUNTS, FAB_OUT, fmt } from './config.js';
import { computeFlows, startStorm, runDustShield, note, roomOk } from './sim.js';
import { playMini } from './minigames.js';

export function installEvents(G) {
  const ui = G.ui, P = G.player, rng = () => G.S.rng(), pick = (a) => a[(rng() * a.length) | 0];
  G.done = G.done || {}; G.lastEvent = null;
  const mass = (g) => (g >= 1000 ? `${(g / 1000).toFixed(g >= 10000 ? 0 : 1)} kg` : `${g} g`), rn = (id) => ROOMS.find((r) => r.id === id).name;
  const breakPanels = (n) => { const s = G.S, ok = s.mounts.map((m, i) => (m === 1 ? i : -1)).filter((i) => i >= 0); let k = 0; while (k < n && ok.length) { const i = ok.splice((rng() * ok.length) | 0, 1)[0]; s.mounts[i] = 2; k++; if (P.zone === 'top') G.world.impactAt(MOUNTS[i][0] + 3, MOUNTS[i][1] + 2); } return k; };
  const breach = (id) => { const r = G.S.rooms[id]; r.hole = 1; note(G.S, `The ${rn(id)} was holed and is losing air.`, 'bad'); };
  const breachable = () => ROOMS.filter((d) => G.S.rooms[d.id].built >= 1 && G.S.rooms[d.id].hole === 0);
  const stormReal = (r) => `<b>${fmt.date(r.t)}</b>: the Sun really fired a <b>${r.cls}</b>-class solar flare${r.ar ? ' from sunspot group ' + r.ar : ''}. ${r.sep ? `Spacecraft near Earth and the Moon then measured a storm of fast particles${/100 MeV/.test(r.sep.inst) ? ' — the most powerful kind' : ''}. ` : 'That time, no strong particle storm reached the Moon. '}${r.cme ? `A cloud of hot gas left the Sun at ${r.cme.v.toLocaleString()} km every second. ` : ''}${r.kp >= 7 ? 'Days later it lit up the northern lights on Earth.' : ''}`;
  // After a hole appears: lock the door, or run and patch it?
  const breachCard = async (id, title, art, real, how) => {
    const s = G.S, remote = roomOk(s, 'control'), lp = G.leakPlan(id), drain = lp.drain, canPatch = lp.patch, rd = ROOMS.find((d) => d.id === id), crops = id === 'potato' || id === 'tomato' ? ' The plants in there will die.' : id === 'animal' ? ' The hens will hide in their safety pod and stop laying.' : '';
    const i = await ui.card({ art, title, real, body: `${how} <b>Air is rushing out of the ${rn(id)}!</b> The tanks are pouring air in to keep the pressure up, so your oxygen is draining fast.<br><br>Every room is a bubble of air behind a bulkhead door. What do you do?`,
      learn: 'In space there is no air outside, so the air inside pushes out through any hole. Real stations are built in sealed sections for exactly this reason: lose one room, save the rest.', advice: canPatch ? 1 : 0, adviceText: canPatch ? (lp.vital ? `Patch it. ${rd.what[0].toUpperCase() + rd.what.slice(1)} is in that room, and locking the door would freeze it. The walk and the patch will cost about ${drain.toFixed(1)} kg of oxygen; you have ${s.o2.toFixed(1)} kg.` : `You have air to spare: the walk and the patch will cost about ${drain.toFixed(1)} kg of oxygen. Run and patch it — but if oxygen drops below 1 kg, lock the door.`) : s.mat < 1 ? 'Lock it. You have no material for a patch.' : `Lock it. About ${drain.toFixed(1)} kg of oxygen would drain before you could patch it, and you have ${s.o2.toFixed(1)} kg.`,
      choices: [{ label: remote ? 'Lock that door from here' : 'Run and lock that door by hand', sub: remote ? 'The Control Center can shut any bulkhead.' : 'The Control Center is broken, so use the switch beside the door.', costs: [`The ${rn(id)} loses its air and freezes: you lose ${rd.what} until it is rebuilt (${rd.mat + 1} materials).${crops}`], gains: ['The rest of the station keeps its air'] },
        { label: 'Run there and patch the hole', sub: 'Press E under the hole. You can still lock the door on the way if it gets too close.', costs: ['1 material', `About ${drain.toFixed(1)} kg of oxygen drains on the way (you have ${s.o2.toFixed(1)} kg)`], gains: ['Nothing in the room is lost'], disabled: s.mat < 1 }] });
    if (i === 0 && remote) G.toggleDoor(id); G.pointTo(i === 0 && !remote ? { zone: 'deep', x: ROOMS.find((d) => d.id === id).door + 2.6, z: ROOMS.find((d) => d.id === id).side * 3.6, name: `the ${rn(id)} door switch`, id } : { zone: 'deep', x: G.world.rooms[id].holePos.x, z: G.world.rooms[id].holePos.z, name: `the hole in the ${rn(id)}`, id });
  };

  const E = {
    async storm() {
      const s = G.S, roll = rng(), want = roll < 0.2 * s.m.stormMul ? 3 : roll < 0.62 ? 2 : 1; let pool = STORMS.filter((x) => x.sev === want); if (!G.done.bigStorm && (s.t - s.t0) / 24 > 2) pool = STORMS.filter((x) => x.sev >= 2);
      const r = pick(pool), lead = s.flow.commsOn ? (s.lv.comms === 2 ? 8 : 4) : 0.3; if (r.sev >= 2) G.done.bigStorm = true;
      const st = startStorm(s, r, lead), dur = st.end - st.start, pFry = [0, 0.12, 0.45, 0.7][r.sev], solarNow = computeFlows(s).solar;
      const warn = s.flow.commsOn ? `Mission Control spotted it early. You have <b>${fmt.hrs(lead)}</b> before the particles arrive.` : 'The Earth Link is down, so there was <b>no warning</b>. The particles are almost here!';
      const i = await ui.card({ art: 'ev2_solar', title: r.sev === 3 ? 'Extreme Solar Storm!' : r.sev === 2 ? 'Solar Storm' : 'Solar Flare', real: stormReal(r),
        body: `${warn} For about ${fmt.hrs(dur)} the surface will be showered with radiation${r.sev === 1 ? ' — a mild shower this time' : ''}. Under the lava tube's rock roof you are safe. The machines topside are not.<br><br>What do you do with the topside electronics?`,
        learn: 'In August 1972 a huge solar storm struck between two Moon missions. It was a near miss: an astronaut caught outside could have become very sick.', advice: r.sev === 1 ? 1 : 0, adviceText: r.sev === 1 ? 'This one is mild. Keep running — but stay below.' : 'Go to safe mode. A few dark hours are cheaper than broken machines.',
        choices: [{ label: 'Safe mode: switch topside electronics off', sub: 'Switched-off chips cannot be scrambled.', costs: [`No solar power or radio for about ${fmt.hrs(lead + dur)}`, solarNow > 1 ? 'The battery carries the station' : 'It is night anyway'], gains: ['Machines protected'] },
          { label: 'Keep everything running', sub: 'Gamble that the machines survive.', costs: [`${Math.round(pFry * 100)}% risk: the dish is knocked out`, `${Math.round(pFry * 100)}% risk: a solar panel burns out`], gains: ['Keep the power coming'] }] });
      st.safe = i === 0; if (i === 0) s.safeMode = lead + dur + 0.3; st.pFry = pFry; note(s, i === 0 ? 'Chose safe mode for the storm.' : 'Kept topside machines running through the storm.'); if (P.zone === 'top') G.pointTo('gate');
    },
    async meteor() {
      const s = G.S, r = pick(IMPACTS), m = pick(METEORITES), roll = rng(), opts = breachable(); G.shake = 1.6; G.audio?.play('boom');
      const real = `<b>${fmt.date(r.t)}</b>: instruments left on the Moon by astronauts felt a real meteoroid slam into the ground${r.dur ? `; the Moon rang for ${r.dur} minutes` : ''}. For scale, the <b>${m.n}</b> meteorite that people watched fall to Earth in ${m.y} weighed ${mass(m.g)}.`;
      if (roll < 0.3 && opts.length) { const id = pick(opts).id; breach(id); return breachCard(id, 'Meteoroid Strike — the roof is holed!', 'ev2_breach', real, 'A pebble-sized space rock fell straight down the pit and punched through the station roof.'); }
      if (roll < 0.5 && !s.f.commsDown) { s.f.commsDown = true; if (P.zone === 'top') G.world.impactAt(-55, -18); note(s, 'A meteoroid knocked the dish off target.', 'bad'); const i = await ui.card({ art: 'ev2_meteor', title: 'Meteoroid Strike!', real, body: 'A space rock hit near the dish. You felt it through your boots — there is no air here to carry sound. The shock knocked the dish off target. <b>The Earth Link is down.</b>', learn: 'Meteoroids hit the Moon at 20 to 72 km every second. On Earth, air burns most of them up. The Moon has no air.', advice: 0, adviceText: '(no answer — the link is down)', choices: [{ label: 'Go and aim the dish again', costs: ['1 h topside'] }, { label: 'Later', costs: ['No storm warnings'] }] }); if (i === 0) G.pointTo('dish'); return; }
      const n = breakPanels(1 + (rng() < 0.4 ? 1 : 0)); s.dust = Math.min(1, s.dust + 0.15);
      if (!n) { note(s, 'A meteoroid hit the Solar Field. No working panel was left to break.'); await ui.card({ art: 'ev2_meteor', title: 'Meteoroid Strike!', real, body: 'A space rock hit the Solar Field. You felt it through your boots — there is no air here to carry sound. <b>No working panel was left there to break</b>, so nothing more was lost. Dust has settled on everything.', learn: 'Meteoroids hit the Moon at 20 to 72 km every second. On Earth, air burns most of them up. The Moon has no air.', choices: [{ label: 'Understood' }] }); return; }
      note(s, `A meteoroid smashed ${n} solar panel${n > 1 ? 's' : ''}.`, 'bad');
      const i = await ui.card({ art: 'ev2_meteor', title: 'Meteoroid Strike!', real, body: `A space rock hit the Solar Field. You felt it through your boots — there is no air here to carry sound. <b>${n} solar panel${n > 1 ? 's are' : ' is'} smashed.</b>`, learn: 'Meteoroids hit the Moon at 20 to 72 km every second. On Earth, air burns most of them up. The Moon has no air.', advice: s.flow.sun.up ? 0 : 1, adviceText: s.flow.sun.up ? 'Fix it while the Sun is up. Every panel counts.' : 'It is night, so the panels can wait. Save your strength.',
        choices: [{ label: 'Go and fetch the broken panel', sub: 'Pull it off, take it to the Fix-It Bench, bring it back.', costs: ['1 material', 'a few hours', 'radiation topside'] }, { label: 'Leave it for now', costs: [s.flow.sun.up ? `−${(K.PANEL_KW * n).toFixed(1)} kW of solar power` : 'Nothing tonight: panels make no power until sunrise'] }] });
      if (i === 0) G.pointTo('solar');
    },
    async breach() { const opts = breachable(); if (!opts.length) return E.dust(); const id = pick(opts).id; G.done.breach = true; breach(id); G.shake = 1; await breachCard(id, 'Air Leak!', 'ev2_breach', null, `The cover of the tunnel into the ${rn(id)} has cracked — the meteor shower weakened it.`); },
    async dust() {
      const s = G.S, low = s.flow.sun.toSunset < 30 || !s.flow.sun.up; s.dust = Math.min(0.92, s.dust + 0.42); const loss = Math.round(s.dust * 75);
      const i = await ui.card({ art: 'ev2_dust', title: low ? 'Sunset Dust' : 'Dusty Panels', body: `${low ? 'As the Sun sinks, static electricity lifts fine dust off the ground. Old robot landers photographed it glowing on the horizon.' : 'There are no dust storms on the Moon — no air, no wind. But landings and impacts throw dust for kilometres, and static electricity makes it cling.'} A grey film now covers the solar panels: <b>−${loss}% power</b>.`,
        learn: 'Moon dust is sharp like broken glass and sticks by static electricity. The first Moon walkers found it on everything.', advice: s.battery > 100 ? 0 : 1, adviceText: s.battery > 100 ? 'You have battery to spare. Zap it and stay inside.' : 'Battery is low. Brush it by hand, or give a robot the job.',
        choices: [{ label: 'Zap it with the dust shield', sub: 'Done in seconds, from indoors.', costs: ['−35 kWh battery'], disabled: s.battery < 35 }, { label: 'Brush it by hand', sub: 'At the Solar Field console.', costs: ['1.5 h topside', 'radiation'] }, { label: 'Give a helper the job', sub: 'Set a robot or crew member to "Panel cleaner" in the Control Center.', costs: ['1 kW for a robot, or food for a person'] }, { label: 'Leave it', costs: [`−${loss}% solar power`] }] });
      if (i === 0) { runDustShield(s); ui.toast('Dust shield fired (−35 kWh).', 'good'); } else if (i === 1) G.pointTo('solar'); else if (i === 2) G.pointTo('control');
    },
    async quake() {
      const s = G.S, r = pick(QUAKES), roll = rng(), opts = breachable(); G.shake = 2.4; G.audio?.play('boom');
      const real = `<b>${fmt.date(r.t)}</b>: a real moonquake of magnitude ${r.mag} was recorded by instruments that astronauts left on the Moon. Only 28 shallow ones were caught in eight years.`, learn = 'Shallow moonquakes can reach magnitude 5.5 and last over 10 minutes. The Moon is dry and stiff, so it rings like a bell.';
      if (roll < 0.35 && opts.length) { const id = pick(opts).id; breach(id); return breachCard(id, 'Moonquake — a seam has split!', 'ev2_quake', real, 'The ground shook for minutes and a wall seam split open.'); }
      if (roll < 0.6 && !s.f.commsDown) { s.f.commsDown = true; note(s, 'A moonquake shook the dish off target.', 'bad'); const i = await ui.card({ art: 'ev2_quake', title: 'Moonquake!', real, body: 'The ground shook for minutes. Inside, dust rained from the roof but the station held. Topside, <b>the dish was shaken off target</b>. The Earth Link is down.', learn, choices: [{ label: 'Go and aim the dish again', costs: ['1 h topside'] }, { label: 'Later', costs: ['No storm warnings'] }] }); if (i === 0) G.pointTo('dish'); return; }
      s.f.leakWater = 0.14; note(s, 'A moonquake cracked a water pipe.', 'bad');
      const i = await ui.card({ art: 'ev2_quake', title: 'Moonquake!', real, body: 'The ground shook for minutes. A pipe joint in the Water Room cracked and <b>water is spraying out</b>: about 3.4 litres lost every day until it is sealed.', learn, advice: s.mat >= 1 ? 0 : 1, adviceText: s.mat >= 1 ? 'Seal it. Water is hard to replace up there.' : 'No materials? Closing the valve may be wiser.',
        choices: [{ label: 'Go and seal the pipe', sub: 'In the Water Room.', costs: ['1 material', '1 h'], disabled: s.mat < 1 }, { label: 'Shut the valve to that tank', sub: 'Stops the leak at once, but the water in that pipe is lost.', costs: ['Lose 25% of your water now'], gains: ['No material needed'] }] });
      if (i === 0) G.pointTo('water'); else { s.water *= 0.75; s.f.leakWater = 0; note(s, 'Shut the valve: lost 25% of the water.'); }
    },
    async fire() {
      const s = G.S; G.done.fire = true; note(s, 'Fire in the Kitchen.', 'bad');
      const i = await ui.card({ art: 'ev2_fire', title: 'Fire in the Kitchen!', body: 'A wire behind the cooker overheated and the Kitchen is burning. Fire eats oxygen and fills the air with smoke. You must act now.', learn: 'In 1997 a fire broke out on the Mir space station and the crew fought it for several minutes. Fire needs three things: fuel, heat and oxygen. Take one away and it dies.', advice: 0, adviceText: 'Fight it. Venting throws away air you cannot spare.',
        choices: [{ label: 'Fight it with the extinguisher', sub: 'Aim at the base of the flames.', costs: ['Fire eats some oxygen', 'If you fail: big oxygen loss and a wrecked Kitchen'] }, { label: 'Seal the Kitchen and let its air out into space', sub: 'No oxygen, no fire. It works every time.', costs: ['The Kitchen loses its air and freezes', 'It must be rebuilt'] }] });
      if (i === 0) { const r = await playMini(G, 'fire'); if (r.win) { s.o2 = Math.max(0, s.o2 - 0.25); ui.toast('Fire out! It burned 0.25 kg of oxygen.', 'good'); note(s, 'Put the fire out by hand.', 'good'); } else { s.o2 *= 0.65; s.rooms.kitchen.built = 0.5; ui.toast('The fire spread before you beat it: a third of the oxygen is gone and the Kitchen is wrecked.', 'bad'); note(s, 'The fire got out of control.', 'bad'); G.pointTo('kitchen'); } }
      else { Object.assign(s.rooms.kitchen, { door: 0, p: 0, frozen: true, built: 0.35 }); ui.toast('Kitchen vented to space. The fire is out — and the Kitchen is frozen. Rebuild it when you can.'); note(s, 'Vented the Kitchen to kill the fire.'); }
    },
    async co2() {
      const s = G.S; G.done.co2 = true; s.f.scrubber = true; note(s, 'The air cleaner failed.', 'bad');
      const i = await ui.card({ art: 'ev2_co2', title: 'Air Cleaner Failure', body: 'The machine that removes CO₂ (the gas you breathe out) has stopped. In about half a day the air will make you dizzy, then sick. Oxygen alone is not enough: stale air has to be cleaned too.', learn: 'On the Apollo 13 mission in 1970, the crew built a new air filter from a hose, plastic bags, a card and duct tape — a square filter in a round hole.', advice: s.mat > 0 ? 0 : 1, adviceText: s.mat > 0 ? 'Build the filter. We will read you the steps.' : 'No materials? Run the backup for now.',
        choices: [{ label: 'Build a new filter', sub: 'In the Oxygen Room. Mission Control reads you the steps.', costs: ['1 material', '1 h'], disabled: s.mat < 1 }, { label: 'Switch on the backup air cleaner', sub: 'Works at once, but it is power-hungry.', costs: ['+3 kW until you fix the main one'] }] });
      if (i === 0) G.pointTo('oxygen'); else { s.extraKw.backup = 3; note(s, 'Running the backup air cleaner (+3 kW).'); }
    },
    async mold() {
      const s = G.S; G.done.mold = true; s.f.mold = true; note(s, 'Mold on the tomatoes.', 'bad');
      const i = await ui.card({ art: 'ev2_crops', title: 'Mold on the Tomatoes', body: 'Fuzzy grey spots are spreading across the tomato leaves. The air in that farm is too damp. If it spreads, the plants will slowly die.', learn: 'This really happened on the Space Station in 2015. Flowers got mouldy from too much water and too little moving air. An astronaut saved them with fans and careful care.', advice: s.flow.net > 2 ? 0 : 1, adviceText: s.flow.net > 2 ? 'You have power to spare. Use the fans.' : 'Power is tight. Cut the sick plants.',
        choices: [{ label: 'Fans on full for two days', costs: ['+2 kW for 48 h'], gains: ['Keep every plant'] }, { label: 'Cut out the sick plants', costs: ['Lose the ripe tomato trays'], gains: ['No extra power'] }, { label: 'Do nothing', costs: ['The tomatoes keep getting sicker'] }] });
      if (i === 0) { s.f.mold = false; s.extraKw.fans = 2; s.fansUntil = s.t + 48; } else if (i === 1) { s.f.mold = false; for (const r of s.racks) if (r.room === 'tomato') { r.ripe = 0; r.g = 0; r.hp = Math.max(0.5, r.hp); } }
    },
    async pump() {
      const s = G.S, room = roomOk(s, 'potato') ? 'potato' : 'tomato'; G.done.pump = true; s.f.pump = room; note(s, `The farm pump failed in the ${rn(room)}.`, 'bad');
      const i = await ui.card({ art: 'rm_' + room, title: 'The Farm Pump Has Stopped', body: `The pump that carries water and plant food to the racks in the ${rn(room)} has seized. The roots are starting to dry.`, learn: 'Hydroponic plants have no soil to hold water. It is clean, fast and light to launch — but if the pump stops, roots dry out in hours. Growing without soil never forgives a broken machine.',
        choices: [{ label: 'Go and fix it', costs: ['1 material', '1 h'], disabled: s.mat < 1 }, { label: 'Not now', costs: ['The plants in that farm wilt'] }] });
      if (i === 0) G.pointTo(room);
    },
    async led() {
      const s = G.S, room = roomOk(s, 'tomato') ? 'tomato' : 'potato'; G.done.led = true; s.f.led = room; note(s, `Lamps failed in the ${rn(room)}.`, 'bad');
      const i = await ui.card({ art: 'rm_' + room, title: 'Half the Lamps Went Dark', body: `A power surge burned out half the grow lamps in the ${rn(room)}. Underground, lamps are the only sunshine the plants will ever see.`, learn: 'A leaf is a tiny solar panel. Half the light means about half the growth — and for light-hungry crops like wheat, even less.',
        choices: [{ label: 'Go and replace them', costs: ['1 material', '1 h'], disabled: s.mat < 1 }, { label: 'Not now', costs: ['Crops there grow at half speed'] }] });
      if (i === 0) G.pointTo(room);
    },
    async seal() {
      const s = G.S; G.done.seal = true; s.wx.seal = 0.6; note(s, 'A door seal is leaking at the Water Plant.', 'bad');
      const i = await ui.card({ art: 'rm_surface', title: 'A Seal Is Leaking at the Water Plant', body: 'Moon dust has worn the door seal of the extraction chamber. Now some of the water vapour escapes into space before the cold trap can catch it.', learn: 'Moon dust is not like beach sand. With no wind or water to round it off, every grain is sharp, like crushed glass. It scratches visors, jams joints and chews through seals.',
        choices: [{ label: 'Go and service it', costs: ['1 material', '1 h'], disabled: s.mat < 1 }, { label: 'Not now', costs: ['Every batch gives 40% less water'] }] });
      if (i === 0) G.pointTo('wplant');
    },
    async drift() { const s = G.S; G.done.drift = true; s.f.commsDown = true; note(s, 'The dish drifted off Earth.', 'bad');
      const i = await ui.card({ art: 'ev2_comms', title: 'Signal Lost', body: 'The dish motor slipped and the beam slid off Earth. Earth has not moved — it hardly ever does in our sky — but the dish must point at it almost perfectly.', learn: 'Your signal takes 1.3 seconds to reach Earth and the reply takes 1.3 more. On Mars the wait is 4 to 24 minutes each way.', choices: [{ label: 'Go and aim the dish again', costs: ['1 h topside'] }, { label: 'Leave it for now', costs: ['No storm warnings'], gains: ['Saves 2 kW'] }] }); if (i === 0) G.pointTo('dish'); },
    async freeze() { const s = G.S; G.done.freeze = true; s.f.heater = true; note(s, 'A heater circuit failed in the cold.', 'bad');
      const i = await ui.card({ art: 'ev2_freeze', title: 'Heater Circuit Failure', body: `It is <b>${fmt.temp(s.flow.sun.tempC)}</b> topside. One heater circuit just died, so the machines up there now need one more heater level to stay alive.`, learn: 'With no air to hold heat, the lunar surface drops to about −173°C at night. Machines left unheated can crack.', advice: s.mat > 1 ? 0 : 1, adviceText: s.mat > 1 ? 'Fix the circuit. Extra heat all night is expensive.' : 'Save your materials. Turn the heaters up.',
        choices: [{ label: 'Fix it at the Heater Hub', costs: ['1 material', '1.5 h topside in the dark', 'Heaters at max (+2 kW) until it is fixed'], disabled: s.mat < 1 }, { label: 'Run the heaters at max instead', costs: ['+2 kW for as long as it is broken'] }] }); s.lv.heat = 3; if (i === 0) { G.pointTo('yard'); ui.toast('REGO has turned the Topside Heaters to max until the circuit is fixed.'); } },
    async distress() { const s = G.S; G.done.distress = true; note(s, 'Picked up distress beacons from three other stations.');
      const i = await ui.card({ art: 'ev2_rescue', good: true, title: 'Voices on the Radio', body: `REGO has picked up three weak beacons. Stations from other countries were hit by the same meteor shower — and <b>someone is still alive at each one</b>.<br><br><b>Aurora Station</b> (teal light, far to the north-west) · <b>Sakura Outpost</b> (purple light, north-east) · <b>Chandra Base</b> (green light, south-east).<br><br>Each has crates of materials, food and water. Each has an astronaut who can join your crew — a person works without electricity, but needs food, water and air.`,
        learn: 'On the real Space Station, crews from many countries live and work together. In space, everyone looks after everyone.', choices: SITES.map((q) => ({ label: `Point the guide beam at ${q.name}`, sub: `${q.whoName}, ${q.job}. ${q.perk}`, costs: [`about ${Math.round(Math.hypot(q.pos[0], q.pos[1]))} m away`] })).concat([{ label: 'Not yet — the station comes first', gains: ['You can go any time: open the Map (M)'] }]) });
      if (i < 3) G.pointTo(SITES[i].id); },
    async gearBreak() { const s = G.S, cold = !s.flow.sun.up; let what; if (!s.f.commsDown && rng() < 0.5) { s.f.commsDown = true; what = 'The dish motor'; } else if (breakPanels(1)) what = 'A solar panel'; else if (!s.f.heater) { s.f.heater = true; what = 'A heater circuit'; } else if (!s.f.commsDown) { s.f.commsDown = true; what = 'The dish motor'; }
      if (!what) return;   // nothing is left topside for the cold to break: no new card, the standing alert says it all
      note(s, `${what} broke from ${cold ? 'cold' : 'heat'}.`, 'bad');
      if (s.gearCard) { G.audio?.play('alarm'); ui.toast(`${what} has broken from the ${cold ? 'cold' : 'heat'}. The Topside Heaters & Coolers are still set too low.`, 'bad'); return; }
      s.gearCard = true;
      await ui.card({ art: 'ev2_freeze', title: cold ? 'Frozen Solid' : 'Cooked', body: `Topside is <b>${fmt.temp(s.flow.sun.tempC)}</b> and the ${cold ? 'heaters' : 'coolers'} were set too low for too long. <b>${what} has broken.</b> Keep the Topside Heaters &amp; Coolers at the level the machines need, or more will follow.${cold ? ' While it is this cold up there, the rover and hopper lose charge, their chargers stop and the Water Plant stands frozen.' : ''}`, learn: 'The Moon has no air to spread heat around, so the surface swings from 127°C in sunlight to −173°C at night.', choices: [{ label: 'Understood' }] }); },
  };

  // After an emergency is settled: one short question about why it happened, asked once per kind in a mission.
  // A right answer earns a research point. A wrong one costs nothing: the card explains, and the game goes on.
  G.askQuestion = async (type) => {
    const q = QUIZ[type], s = G.S; if (!q || G.quiz === false || G.done['q_' + type] || s.over) return null; G.done['q_' + type] = true;
    const order = [0, 1, 2].sort(() => Math.random() - 0.5), i = await ui.card({ good: true, title: 'Quick question', body: q.q, choices: order.map((k) => ({ label: q.a[k] })) }), right = order[i] === 0;
    s.stats.asked = (s.stats.asked || 0) + 1; if (right) { s.stats.right = (s.stats.right || 0) + 1; s.sci += 1; note(s, 'Answered a question correctly: +1 research.', 'good'); }
    await ui.card({ good: true, title: right ? 'That is right!' : 'Not quite', body: (right ? '' : `The answer is: <b>${q.a[0]}</b>.<br><br>`) + q.why, choices: [{ label: 'Carry on', gains: right ? ['+1 research'] : [] }] });
    return right;
  };
  G.scheduleNext = () => { const s = G.S, g = s.m.gap; G.nextEventAt = s.t + (g[0] + rng() * (g[1] - g[0])) * 24; };
  G.fireEvent = async (forced) => {
    const s = G.S, up = s.flow.sun.up; let type = forced;
    if (!type) {
      if (!G.done.distress) type = 'distress';
      else if (!G.done.breach && s.stats.events >= 2) type = 'breach';
      else { const c = []; if (!s.storm) c.push(['storm', G.done.bigStorm ? 2 : 3.2]); c.push(['meteor', 2.4], ['quake', 1.8], ['breach', 1.2]); if (up || s.flow.sun.nightHours < 20) c.push(['dust', 1.8]); if (!G.done.fire && roomOk(s, 'kitchen')) c.push(['fire', 1]); if (!G.done.co2 && !s.f.scrubber && roomOk(s, 'oxygen')) c.push(['co2', 1.1]); if (roomOk(s, 'tomato') && !G.done.mold) c.push(['mold', 1.1]); if (!G.done.pump && (roomOk(s, 'potato') || roomOk(s, 'tomato'))) c.push(['pump', 1]); if (!G.done.led && (roomOk(s, 'potato') || roomOk(s, 'tomato'))) c.push(['led', 0.8]); if (!G.done.seal && s.wx.runs > 0) c.push(['seal', 1.2]); if (s.flow.commsOn && !G.done.drift) c.push(['drift', 0.8]); if (!up && !G.done.freeze) c.push(['freeze', 1.6]);
        const list = c.filter((x) => x[0] !== G.lastEvent); let tot = list.reduce((a, b) => a + b[1], 0), r = rng() * tot; for (const [k, w] of list) { r -= w; if (r <= 0) { type = k; break; } } type = type || 'meteor'; }
    }
    G.lastEvent = type; s.stats.events++; G.sleepLeft = 0; await E[type](); await G.askQuestion(type); G.scheduleNext(); G.save?.(true);   // the emergency is settled: save its outcome
  };
  // things the simulation asks the game to handle
  G.processPending = async () => {
    const s = G.S; if (!s.pending.length) return; const p = s.pending.splice(0);
    for (const ev of p) {
      if (ev.startsWith('bench')) ui.toast('A solar panel is fixed! Pick it up at the Fix-It Bench.', 'good');
      else if (ev.startsWith('fab:')) { const what = ev.slice(4); G.spawnItem(what, 'deep', FAB_OUT[0] + (Math.random() - 0.5), FAB_OUT[1] + (Math.random() - 0.5)); ui.toast(`The robot arm finished a ${what === 'panel' ? 'new solar panel' : 'battery module'}! It is on the yellow tray in the Workshop.`, 'good'); note(s, `Built a ${what === 'panel' ? 'solar panel' : 'battery module'}.`, 'good'); }
      else if (ev.startsWith('froze:')) { const id = ev.slice(6); ui.bubble(`The <b>${rn(id)}</b> has lost all its air and frozen solid. Everything in it is broken. Patch the hole, then rebuild the room at its console.`, 'sad', 12); note(s, `The ${rn(id)} froze.`, 'bad'); }
      else if (ev === 'nofeed') ui.bubble('The hens are out of dry feed, so they have stopped laying. <b>Pick potatoes or tomatoes</b>: the leaves and peels become new feed.', 'worried', 12);
      else if (ev === 'fishlost') { ui.toast('The fish tank froze. The fish are gone.', 'bad'); note(s, 'Lost the fish.', 'bad'); }
      else if (ev.startsWith('ripe:') && !s.helpers.some((h) => h.role === 'farm')) { const id = ev.slice(5); if (!G._ripeT || s.t - G._ripeT > 3) { G._ripeT = s.t; ui.bubble(`A rack is ripe in the <b>${rn(id)}</b>! Pick it — or put a helper on Farm duty.`, 'joy', 8); } }
      else if (ev === 'wxdone') { const r = s.wx.last; ui.toast(`Water Plant: batch finished. ${r.kept.toFixed(1)} L of clean water in the tank (${Math.round(r.eff * 100)}% recovered, ${r.kwh.toFixed(0)} kWh).${r.spilled > 0.1 ? ' The tank was full, so ' + r.spilled.toFixed(1) + ' L was lost!' : ''}${r.sci ? ' +' + r.sci + ' research.' : ''}`, 'good'); note(s, `Water Plant made ${r.kept.toFixed(1)} L.`, 'good'); }
      else if (ev === 'expdone') { ui.bubble('The <b>moon-soil experiment</b> is finished! All three pots sprouted, but they do not look the same at all. Go and see: it earned 3 research.', 'joy', 12); note(s, 'Finished the moon-soil experiment.', 'good'); }
      else if (ev === 'damp') { ui.bubble('The farm air is too damp: nothing is drying it, so <b>mold</b> has started in the Tomato Farm. Plants breathe out almost all the water they drink. Turn the Water Recycler on to catch it.', 'worried', 12); note(s, 'Mold from damp air.', 'bad'); }
      else if (ev === 'frost') { ui.bubble(`It is <b>${fmt.temp(s.flow.sun.tempC)}</b> topside and the heaters are set too low. The <b>rover and hopper are losing charge</b>, their chargers have stopped, and the <b>Water Plant is frozen</b>. Turn the Topside Heaters up to level ${s.flow.heatNeed} on the Power Board (Tab).`, 'worried', 14); note(s, 'Topside machines began to freeze: the heaters were set too low.', 'bad'); }
      else if (ev.startsWith('flat:')) { const nm = ev.slice(5) === 'car' ? 'rover' : 'hopper'; ui.bubble(`The cold has emptied the <b>${nm}'s battery</b>. It cannot be charged until the Topside Heaters are at level ${s.flow.heatNeed}.`, 'worried', 12); note(s, `The cold emptied the ${nm}'s battery.`, 'bad'); }
      else if (ev === 'nonutri') ui.bubble('The <b>plant food</b> tank is empty. Crops will crawl until you make more: run the waste digester in the Water Room.', 'worried', 10);
    }
    if (p.includes('stormEnd') && s.storm) {
      const st = s.storm; s.storm = null; let msg = `Storm over. You soaked up <b>${s.stats.stormDose.toFixed(1)} mSv</b> from storms so far. `;
      if (st.sev >= 2) { s.solarHealth = Math.max(0.6, s.solarHealth - 0.012 * st.sev); msg += `Its particles wore the solar cells down ${(1.2 * st.sev).toFixed(0)}% for good — real spacecraft suffer this too. `; }
      if (!st.safe) { const hit = []; if (rng() < st.pFry && !s.f.commsDown) { s.f.commsDown = true; hit.push('the dish'); } if (rng() < st.pFry && breakPanels(1)) hit.push('a solar panel'); msg += hit.length ? `The gamble failed: radiation knocked out ${hit.join(' and ')}.` : 'The gamble paid off: every machine survived.'; if (hit.length) note(s, `The storm knocked out ${hit.join(' and ')}.`, 'bad'); } else msg += 'Safe mode kept every machine alive.';
      note(s, 'Solar storm ended.'); ui.bubble(msg, st.safe ? 'happy' : 'think', 14); ui.banner(null);
    }
    if (p.includes('gearBreak')) await E.gearBreak();
  };
}
