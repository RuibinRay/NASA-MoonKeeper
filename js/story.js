// MOONKEEPER 2 — story: comic pages, the hands-on training, the meteor shower, and the endings.
import { K, MOUNTS, PIT, ROOMS, SITES, fmt } from './config.js';
import { roomOk, score } from './sim.js';

const cap = (t) => t, by = (who, text, at) => ({ who, text, at });

export async function comicIntro(G) {
  await G.ui.comic([{ title: 'Chapter 1 · Welcome to the Moon', btn: 'Start training ▸', panels: [
    { img: 'cm01', wide: true, cap: cap('<b>The year is 2049.</b> Tranquility Deep is a Moon base built beside a giant pit in the Sea of Tranquility. Today, its newest crew member arrives. That is <b>you</b>.') },
    { img: 'cm02', cap: cap('Two astronauts and one very excited robot are waiting.'), say: [by('Commander Vasquez', 'Welcome to the Moon, rookie!', 0), by('REGO', 'Beep-boop! A new friend!', 3)] },
    { img: 'cm03', cap: cap('The base hides inside a lava tube: a tunnel left by flowing lava billions of years ago. Inside, it looks like a space station.'), say: [by('Engineer Okoro', 'Potatoes, tomatoes — and hens! Down here it is always 17°C.', 1)] },
    { img: 'cm04', cap: cap('But a Moon base only stays alive if somebody keeps it running.'), say: [by('Commander Vasquez', 'Rule one: keep the power on and the air in. Training starts now!', 0)] },
  ] }]);
}

export async function tutorial(G) {
  const ui = G.ui, say = (l) => ui.say(l), S = G.S, P = G.player, world = G.world, near = (x, z, r) => Math.hypot(P.pos.x - x, P.pos.z - z) < r;
  const BM = 2, [mx, mz] = MOUNTS[BM]; S.mounts[BM] = 2;                               // one cracked panel to practise on
  const V = G.addNpc('vasquez', 0xd8322a, 47, 26), O = G.addNpc('okoro', 0x2a62d8, mx + 5, mz + 6);
  await say([
    { who: 'vasquez', text: 'First, your legs. <b>W A S D</b> to walk. Drag the mouse to look around. <b>Space</b> to hop — gravity here is one-sixth of Earth\'s, so you fly!' },
    { who: 'rego', mood: 'joy', text: 'I am REGO! My name comes from regolith, which is moon soil. I follow you everywhere. Press <b>H</b> any time and I will tell you what matters most.' },
    { who: 'vasquez', text: 'See the rover on its charging pad? Walk to it and press <b>E</b> to get in. The bar at the bottom of the screen always tells you what E will do.' },
  ]);
  await G.waitFor(() => P.in === 'car', 'Walk to the <b>rover</b> and press <b>E</b> to get in', 'car');
  await G.waitFor(() => near(mx, mz + 10, 22), 'Drive to the <b>Solar Field</b>: <b>W</b> to go, <b>A</b> and <b>D</b> to steer', 'solar');
  await G.waitFor(() => !P.in, 'Press <b>E</b> to get out of the rover', 'solar');
  await say([
    { who: 'okoro', text: 'There you are! I am Tobi, the engineer. Solar panels make our electricity. But a lunar day lasts about 29.5 Earth days: two weeks of sunshine, then two weeks of night.' },
    { who: 'okoro', text: 'One of these panels is cracked. On the Moon nobody comes to fix things for you. Walk up to the broken one and press <b>E</b> to pull it off its mount.' },
  ]);
  await G.waitFor(() => P.carry && P.carry.type === 'panelB', 'Walk to the <b>cracked panel</b> and press <b>E</b>', { zone: 'top', x: mx, z: mz, name: 'the cracked panel', r: 2 });
  await say([{ who: 'okoro', text: 'Good! It is big, so you drag it. Pull it to the rover and press <b>E</b> to load it on the back.' }]);
  await G.waitFor(() => G.car.cargo.length > 0, 'Drag the panel to the <b>rover</b> and press <b>E</b> to load it', 'car');
  G.moveNpc(O, -46, -12, 'deep'); G.moveNpc(V, -17, -14, 'deep');
  await G.waitFor(() => !P.in && Math.hypot(G.car.x, G.car.z - 60) < 22 && near(0, 60, 26), 'Drive the rover to the <b>Pit Elevator</b> and get out', 'gate');
  await G.waitFor(() => P.zone === 'deep' && P.carry, 'Press <b>Q</b> at the rover to take the panel out, drag it to the <b>elevator</b> and press <b>E</b>', 'gate');
  await say([
    { who: 'okoro', text: 'Welcome to the cave! This is a lava tube: a tunnel that flowing lava left behind. The rock above us blocks radiation and meteoroids, and it is always 17°C in here. But there is no air, so your suit stays on.' },
    { who: 'okoro', text: 'That building ahead is our station. Follow the blue lights to the orange airlock door. Inside, the Workshop is the first door on the left. Put the panel on the <b>Fix-It Bench</b>: the robot arm does the fixing, but it takes time and uses one of our materials.' },
  ]);
  await G.waitFor(() => S.bench.some(Boolean), 'Drag the panel through the airlock to the <b>Fix-It Bench</b> in the Workshop and press <b>E</b>', 'bench');
  await say([
    { who: 'okoro', text: 'On a real day that takes two hours. Time never stops here — every job costs some.' },
    { who: 'okoro', text: 'Now, you are indoors and the air in here is good. Go back to the <b>Suit Lockers</b> in the airlock and take that heavy suit off. Jobs are quicker without big gloves — and nobody cooks dinner in a helmet!' },
  ]);
  await G.waitFor(() => !S.suitOn, 'Take your suit off at the <b>Suit Lockers</b> in the airlock (press <b>E</b>)', 'suit');
  await say([{ who: 'vasquez', text: 'Much better. While the arm works on your panel, come and find me in the Control Center. It is the second door on the left.' }]);
  await G.goTo('control', 'Walk to the <b>Control Center</b> (next room along the hall)');
  G.paintCC();
  await say([
    { who: 'vasquez', text: 'This big screen is the most important thing in the station. It shows every room. Green means fine. <b>Red means air is escaping.</b>' },
    { who: 'vasquez', text: 'Outside there is no air at all. So if a room gets a hole, the air inside rushes out — and the tanks empty trying to fill it back up.' },
    { who: 'vasquez', text: 'That is why every room has a bulkhead door. <b>Lock the door and the leak cannot empty the rest of the station.</b> But the room behind it freezes. No choice is free.' },
    { who: 'vasquez', text: 'One more thing lives here: the Power Board. Every machine needs electricity and there is never enough for all of them. Try it: set the Oxygen Maker to level 2 and watch what it costs.' },
  ]);
  await ui.powerBoard({ goal: { text: 'Set the <b>Oxygen Maker</b> to level <b>2</b>. Watch the water and battery numbers change.', done: (s) => s.lv.o2gen === 2, ok: 'See? More oxygen — but more water and more power gone. Close the board when you are ready.' } });
  S.lv.o2gen = 1;
  G.moveNpc(O, 50, -11, 'deep');
  await say([{ who: 'vasquez', text: 'You can open that board anywhere with <b>Tab</b>, and the map with <b>M</b>. Now go and find Tobi in the Potato Farm, at the far end of the hall. Tins of food do not last forever.' }]);
  await G.goTo('potato', 'Walk down the hall to the <b>Potato Farm</b>');
  await say([
    { who: 'okoro', text: 'Potatoes on this side, tomatoes across the hall, hens and fish next door. The hens eat dry feed made of grass and seeds — you cannot eat that, but they turn it into eggs!' },
    { who: 'okoro', text: 'When we pick crops, the leaves and peels become more hen feed. Nothing is wasted. Go on, pick a tray. Watch — REGO and you do it together.' },
  ]);
  await G.J.pick('potato');
  await say([
    { who: 'okoro', text: 'Raw food is worth half a meal. Cook it in the Kitchen and it is worth a whole one. Later you can give robots and crew those jobs — robots cost electricity, people cost food.' },
    { who: 'okoro', text: 'Your panel should be fixed by now. Take it from the Fix-It Bench, carry it back up, and put it on the empty mount. Then you have done the whole loop!' },
  ]);
  await G.waitFor(() => P.carry && P.carry.type === 'panel', 'Take the fixed panel from the <b>Fix-It Bench</b> (press <b>E</b>)', 'bench');
  if (!S.suitOn) { await say([{ who: 'okoro', text: 'Wait! Before you step outside, put your suit back on at the lockers. Past the airlock door there is no air at all. This is the rule that keeps you alive: <b>suit on before you go out.</b>' }]);
    await G.waitFor(() => S.suitOn, 'Put your suit back on at the <b>Suit Lockers</b> (press <b>E</b>)', 'suit'); }
  await G.waitFor(() => S.mounts[BM] === 1, 'Carry the panel out through the cave, up the elevator, to the <b>empty mount</b> in the Solar Field, and press <b>E</b>', { zone: 'top', x: mx, z: mz, name: 'the empty mount', r: 0.5 });
  await say([
    { who: 'flight', text: 'Tranquility Deep, this is Mission Control on Earth. Nice work, rookie! Notice the pause before I answer? Your voice takes 1.3 seconds to reach us, and mine takes 1.3 more to reach you.' },
    { who: 'flight', text: 'Stand by… all stations, stand by. We are seeing something on the long-range radar.' },
    { who: 'vasquez', text: 'Rookie, get back underground. Right now. Take the elevator down!' },
  ]);
  await G.waitFor(() => P.zone === 'deep', '<b>Get underground!</b> Ride the elevator down', 'gate');
  await ui.fade(true); G.clearNpcs(); await ui.fade(false);
}

// The meteor shower seen from the surface: rocks hit the solar field while the camera circles. Used by both tellings of the story.
async function showerScene(G) {
  const ui = G.ui, S = G.S, world = G.world;
  // --- the scene on the surface
  await ui.fade(true); ui.showHud(false); const zone0 = G.player.zone; world.setZone('top'); let t = 0, next = 0.6; const cam = world.camera, old = S.mounts.slice();
  await new Promise((res) => { G.cineTick = (dt) => { t += dt; const a = 0.4 + t * 0.06; cam.position.set(Math.sin(a) * 58, world.heightAt(0, -30) + 13 + t * 0.5, -40 + Math.cos(a) * 58); cam.lookAt(0, 3, -66); G.shake = Math.max(G.shake, 0);
    if (t > next && t < 9.5) { next = t + 0.28 + Math.random() * 0.4; const far = Math.random() < 0.45, x = far ? (Math.random() - 0.5) * 220 : MOUNTS[(Math.random() * 8) | 0][0] + 3, z = far ? -60 + (Math.random() - 0.5) * 200 : MOUNTS[(Math.random() * 8) | 0][1]; world.impactAt(x, z); G.audio?.play('boom'); if (!far) { const i = S.mounts.findIndex((m, k) => m === 1 && k < 8 && Math.random() < 0.5); if (i >= 0) S.mounts[i] = 2; } cam.position.x += (Math.random() - 0.5) * 2; cam.position.y += (Math.random() - 0.5) * 1.5; }
    if (t > 11) res(); }; setTimeout(() => ui.fade(false), 80); });
  await ui.fade(true); G.cineTick = null; S.mounts = old; world.setZone(zone0); await ui.fade(false);
}
// Unlimited mode: no comic, and nobody is lost. The Commander and the Engineer get underground in time and stay as your crew.
async function disasterFree(G, skipped) {
  const ui = G.ui;
  if (skipped) return ui.say([{ who: 'rego', text: 'Quick lesson, since we skipped training: a meteor shower hit the base, but everyone got underground in time. <b>Commander Vasquez and Engineer Okoro are here with us</b> — give them jobs at the Control Center. Press <b>E</b> to do things: the bar at the bottom says what. <b>Tab</b> is the Power Board, <b>M</b> is the map, <b>H</b> asks me.' }]);
  await ui.say([{ who: 'vasquez', text: 'Meteor shower incoming! Everybody underground, now. Tobi has already shut the fuel valves topside.' }, { who: 'rego', text: 'So many… and so fast!', mood: 'alert' }]);
  await showerScene(G);
  await ui.say([
    { who: 'vasquez', text: 'Head count… everyone is here. <b>Nobody is hurt.</b>' },
    { who: 'okoro', text: 'The base took a beating, though: panels smashed, rooms holed, the dish knocked over. Good thing we have all the materials we could want.' },
    { who: 'flight', text: 'Glad you are all safe, Tranquility Deep. No rescue needed. Rebuild — and make it a place where many people can live.' },
    { who: 'vasquez', text: 'You know the ropes now, rookie, so you are in charge of the rebuild. <b>Give Tobi and me jobs at the Control Center</b> and tell us what to do first.' },
  ]);
}
// The meteor shower: comic → a scene on the surface → comic. `skipped` = the player skipped training.
export async function disaster(G, skipped) {
  const ui = G.ui, S = G.S, world = G.world, days = S.m.days, lim = S.hours !== Infinity;
  if (S.mode === 'unlimited') return disasterFree(G, skipped);
  const quick = { who: 'rego', text: 'Quick lesson, since we skipped training: a meteor shower wrecked the base and I am all you have. Press <b>E</b> to do things — the bar at the bottom says what. Pull a broken solar panel off its mount, take it down to the <b>Fix-It Bench</b>, then put it back. <b>Tab</b> is the Power Board, <b>M</b> is the map, <b>H</b> asks me.' };
  if (skipped) return ui.say([quick]);
  await ui.comic([{ title: 'Chapter 2 · The Warning', btn: 'Watch ▸', panels: [
    { img: 'cm05', cap: cap('Every Moon station from every country calls at once.'), say: [by('Aurora Station', 'Meteor shower incoming!', 0), by('Sakura Outpost', 'It is huge. Take cover!', 1), by('Chandra Base', 'Everybody underground!', 2)] },
    { img: 'cm06', cap: cap('On the Moon there is no air to burn space rocks up. Every one of them reaches the ground.'), say: [by('REGO', 'So many… and so fast!', 1)] },
    { img: 'cm07', cap: cap('The Commander and the Engineer run for the elevator. Someone has to shut the fuel valves topside before the rocks arrive.'), say: [by('Commander Vasquez', 'Stay here with REGO. That is an order!', 0)] },
  ] }]);
  await showerScene(G);
  await ui.comic([{ title: 'Chapter 3 · Alone', btn: lim ? 'Begin the mission ▸' : 'Start building ▸', panels: [
    { img: 'cm08', wide: true, cap: cap('The meteor shower lasts four minutes. It hits every station on the Moon.') },
    { img: 'cm09', cap: cap('Then, silence. Up top, nothing moves. The Commander and the Engineer do not come back.'), say: [by('REGO', 'I… I cannot find their signals.', 2)] },
    { img: 'cm10', cap: cap('Down below, the big screen fills with red. Panels smashed. Rooms holed and frozen. The dish knocked over.') },
    { img: 'cm11', cap: cap(lim ? `A rescue ship needs time to get ready, then three days to fly. It will arrive in <b>${days} days</b>.` : 'No rescue ship can come for a long time. You will have to build a new home.'), say: [by('Mission Control', lim ? 'You are the only one left there. Keep the power on and the air in. We are coming.' : 'You are the only one left there. Rebuild. Make it a place where people can live.', 0)] },
    { img: 'cm12', wide: true, cap: cap('Some astronauts at the other stations may still be alive. And you are not alone.'), say: [by('REGO', 'I am right here. Let us get the lights back on.', 1)] },
  ] }]);
}

const D = (S, t) => `Day ${Math.floor(t / 24) + 1}`;
export function ending(G) {
  const S = G.S, m = S.marks, F = S.flow, sc = score(S);
  if (S.over.win) {
    const why = [`You kept Tranquility Deep alive for <b>${S.m.days} days</b>, through ${S.stats.events} emergencies.`, `${sc.okPanels} solar panels are working and ${sc.roomsOk} of 11 rooms have air. You did ${S.stats.jobs} repair and building jobs with your own hands.`];
    why.push(S.rescued.length ? `You rescued <b>${S.rescued.length}</b> astronaut${S.rescued.length > 1 ? 's' : ''} from the other stations. They ate your food — and did their share of the work.` : 'You did not reach the other stations this time. Three astronauts are still waiting for the rescue ship.');
    why.push(S.dose < 40 ? `You took only ${S.dose.toFixed(1)} mSv of radiation — you used the rock roof well.` : `You took ${S.dose.toFixed(0)} mSv of radiation. Less time topside during storms would lower it.`);
    if (S.stats.brownHours > 2) why.push(`The station spent ${S.stats.brownHours.toFixed(0)} hours in brownout with an empty battery. More panels and battery modules before sunset would prevent that.`);
    { const asked = S.stats.asked || 0, right = S.stats.right || 0; if (asked) why.push(`After the emergencies you answered <b>${right} of ${asked}</b> question${asked > 1 ? 's' : ''} right${right === asked && asked > 1 ? ': every one.' : '.'}`); }
    return { win: true, img: 'win2', title: 'RESCUED — YOU ARE A MOONKEEPER', sub: 'The rescue ship is down. As you walk to the landing pad, REGO rolls beside you with both arms in the air. Commander Vasquez and Engineer Okoro would be proud.', why,
      science: 'Everything you juggled is real. Future Moon crews must keep the air in, trade power between air, water, food and heat, hide from solar storms, and survive two-week nights. Lava tubes like this one are among the places scientists are studying for shelter.' };
  }
  const c = S.over.cause, why = []; let science, tip, title;
  const brown = m.battZero !== undefined ? `On ${D(S, m.battZero)} the battery hit 0%. In a brownout every machine slows down, so everything else got worse.` : null;
  const leaks = ROOMS.filter((r) => S.rooms[r.id].hole > 0 && S.rooms[r.id].door).map((r) => r.name);
  if (c === 'air') { title = 'THE AIR RAN OUT';
    if (leaks.length) why.push(`The <b>${leaks.join(' and ')}</b> had a hole and its door was open. Air poured out into space, and the tanks emptied trying to keep up.`);
    if (!roomOk(S, 'oxygen')) why.push('The Oxygen Room was broken or had no air, so the Oxygen Maker could not run.');
    if (brown && m.battZero <= (m.o2Zero ?? 1e9)) why.push(brown);
    if (m.waterZero !== undefined && m.waterZero <= (m.o2Zero ?? 1e9)) why.push(`On ${D(S, m.waterZero)} the water ran dry. The Oxygen Maker makes air by splitting water, so no water meant no new oxygen.`);
    why.push(`On ${D(S, m.o2Zero ?? S.t)} the oxygen tank reached zero${F.people > 1 ? `, with ${F.people} people breathing from it` : ''}.`, 'With no new oxygen, the air left in the station lasted only a few hours.');
    science = 'One person needs 0.84 kg of oxygen every single day. And in space, air only stays where walls hold it in: any hole lets it rush out, because outside there is nothing pushing back.';
    tip = 'When a room leaks, decide fast: patch it, or lock its door. Keep the Oxygen Room working above everything else.';
  } else if (c === 'water') { title = 'THE WATER RAN OUT';
    if (!roomOk(S, 'water')) why.push('The Water Room was broken, so no water was being recycled at all.'); else if (S.lv.recycler < 2) why.push('The Water Recycler was set low, so most used water was thrown away.');
    if (!roomOk(S, 'bathroom')) why.push('The Bathroom was still broken, so the recycler got back less water.');
    if (S.lv.o2gen >= 2) why.push('The Oxygen Maker was running high. Every kilogram of oxygen costs 1.125 litres of water.'); if (S.f.leakWater) why.push('A leaking water pipe was never sealed.'); if (brown) why.push(brown);
    why.push(`On ${D(S, m.waterZero ?? S.t)} the water tank reached zero. A person can only last a few days without water.`);
    science = 'Each person needs about 3.8 litres of water a day. The Space Station recycles 98% of it. Without recycling, a Moon base would need a water delivery every few days.';
    tip = 'Rebuild the Water Room and Bathroom early, keep the recycler high, and look for water tanks at the other stations.';
  } else if (c === 'food') { title = 'THE PANTRY IS EMPTY';
    if (F.farms === 0) why.push('Both farm rooms were broken, so nothing was growing.'); else if (S.lv.farm === 0) why.push('The farm lights were off. Underground there is no sunlight, so plants cannot grow without electric light.');
    if (S.stats.harvests < 2) why.push(`Crops were only picked ${S.stats.harvests} time${S.stats.harvests === 1 ? '' : 's'}. When three trays are waiting, the farm stops growing new ones.`);
    if (S.feed <= 0) why.push('The hens ran out of feed and stopped laying eggs.'); if (F.people > 1) why.push(`You were feeding ${F.people} people. Rescued crew need food too.`); if (brown) why.push(brown);
    why.push(`On ${D(S, m.foodZero ?? S.t)} the last food was eaten. Without food you slowly became too weak to work.`);
    science = 'Plants need light, water and time: real space lettuce took 33 days to grow. Tins are a head start, not a plan. A real Moon base would need about 50 square metres of crops per person.';
    tip = 'Rebuild the Tomato Farm, keep the lights on while the Sun is up, pick crops as soon as they are ripe, cook them, and fetch food crates from the other stations.';
  } else if (c === 'rad') { title = 'TOO MUCH RADIATION';
    why.push(`You spent ${S.stats.evaHours.toFixed(0)} hours on the surface.`); if (S.stats.stormDose > 20) why.push(`<b>${S.stats.stormDose.toFixed(0)} mSv</b> came from being outside during solar storms. Under the rock roof that would have been almost zero.`);
    why.push(`On ${D(S, m.doseLimit ?? S.t)} your dose passed ${K.DOSE_LIMIT} mSv, the safety limit for a solar storm. Doctors would pull you off duty — and here, there is no one to take over.`);
    science = 'On Earth, air and a magnetic field shield us. The Moon has neither. A big solar storm can deliver in hours what you would get in years on Earth. The answer: warnings, shelters, and rock overhead.';
    tip = 'Keep the Earth Link working so storms cannot surprise you. When a storm is coming, take the elevator down at once.';
  } else { title = 'THE AIR TURNED BAD';
    why.push('The air cleaner broke and was not repaired, and the backup was off.', `By ${D(S, m.co2High ?? S.t)} the CO₂ you breathe out had built up so much that you could no longer think clearly.`, 'There was still oxygen in the tank — but stale air has to be cleaned, not just topped up.');
    science = 'Every person breathes out about 1 kg of CO₂ a day. The Apollo 13 crew nearly ran out of working air filters and had to build one from a hose, bags, a card and duct tape.';
    tip = 'When the air cleaner fails, fix it in the Oxygen Room or switch on the backup straight away.';
  }
  const lim = S.hours !== Infinity;
  return { win: false, img: 'lose2', title, sub: `Tranquility Deep went dark on ${D(S, S.t)}${lim ? ` of ${S.m.days}. The rescue ship was ${fmt.days((S.hours - (S.t - S.t0)) / 24)} away` : ` after ${sc.days.toFixed(1)} days`}. Every Moonkeeper fails a few times — real engineers call it testing. Here is what the data says.`, why, science, tip };
}
