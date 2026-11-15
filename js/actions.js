// MOONKEEPER 2 — what the player can do: context actions (E / Q), build scenes, room and station panels, alerts, and REGO's advice.
import { K, SYS, STATIONS, SITES, ROOMS, ITEMS, MOUNTS, BENCH, FAB_OUT, doorSpot, roomSpot, fmt } from './config.js';
import { computeFlows, roomOk, spend, harvest, collectEggs, cookBatch, runDustShield, note, jobHours, humans } from './sim.js';
import { drawStation, roomState } from './ui.js';
import { playMini } from './minigames.js';
import { installLife } from './lifeui.js';
import { ripeIn, dump, iceLeft } from './life.js';
import { MINE } from './config.js';

const FACTS = [
  'Look up! Earth stays in almost the same spot in our sky. The Moon always keeps the same face toward Earth, so from here Earth just hangs there, wobbling a little, and slowly changes shape.',
  'That hop was real physics. Gravity here is one-sixth of Earth\'s, so the same push sends you six times higher.',
  'Moon soil is called regolith. Nearly half of its weight is oxygen, locked inside the rock.',
  'Down here the temperature stays near 17°C. Up top it swings from 127°C to −173°C. That is why we live in a lava tube.',
  'There are no dust storms on the Moon — no air, no wind. But moon dust is sharp and sticks to everything with static electricity.',
  'On the Space Station, 98% of water is recycled. Yes, even pee. Today\'s drink is tomorrow\'s drink!',
  'Air pressure is why we need walls. Outside there is no air at all, so the air inside pushes out through any hole.',
  'A message to Earth takes 1.3 seconds. On Mars it would take 4 to 24 minutes. Imagine waiting that long for an answer!',
  'Hens can eat dried grass, seeds and plant scraps. People cannot — our tummies are built differently.',
  'Why is there no glowing beam under the skylight? You can only see a light beam when air or dust scatters it. The cave has no air, so sunlight just makes a bright patch on the floor.',
  'The rover bounces in slow motion. Its springs push back just as hard as on Earth, but gravity pulls it down six times more gently — so every bump becomes a long, floating wallow.',
  'The coldest places ever measured in the Solar System are not on Pluto. They are on our own Moon, in crater floors near the poles that sunlight has not touched for billions of years.',
  'Your tyre tracks will still be here in a million years. With no wind and no rain, nothing on the Moon rubs them out.',
  'Watch the dust your boots kick up. On Earth it would hang in the air as a cloud. Here there is no air, so every grain flies in a clean arc and drops straight back down.',
  'A plant grows only as fast as whatever it has least of: light, water, plant food, warmth or fresh air. Fixing anything else changes nothing.',
  'In 2022 scientists grew plants in real Moon soil for the first time. Nearly every seed sprouted — but the plants stayed small and stressed. Moon soil is not garden soil.',
  'A spacesuit is a tiny spaceship shaped like a person: it holds air, keeps you warm and blocks the Sun. Indoors you do not need it — astronauts on the Space Station work in T-shirts.',
  'Fish and plants help each other: fish poo feeds the plants, and the plants clean the water. It is called aquaponics.',
];

export function installActions(G) {
  const ui = G.ui, P = G.player, world = G.world, S = () => G.S;
  const near = (x, z, r) => Math.hypot(P.pos.x - x, P.pos.z - z) < r, rn = (id) => ROOMS.find((r) => r.id === id).name, pct = (x) => Math.round(x * 100) + '%';
  G.factI = (Math.random() * FACTS.length) | 0;
  installLife(G);   // farm, Water Plant, life-support loop, research and experiment screens
  G.paintCC = () => { drawStation(world.ccCanvas.getContext('2d'), G.S, 1024, 512, { big: true, player: P.zone === 'deep' ? { x: P.pos.x, z: P.pos.z } : null }); world.ccTex.needsUpdate = true; };
  const noMat = (n) => { if (spend(G.S, n)) return false; ui.toast(`You need ${n} material${n > 1 ? 's' : ''}. Other stations have crates of them — take the rover or the hopper.`, 'bad'); return true; };
  const doneGoal = (id) => { if (G.goal && !G.goal.cb && G.goal.id === id) G.goal = null; };

  // ---------- doors ----------
  G.toggleDoor = (id) => { const r = G.S.rooms[id]; r.door = r.door ? 0 : 1; G.audio.play('click');
    if (!r.door) { ui.toast(r.hole > 0 ? `${rn(id)} door locked. The leak cannot empty the station now — but that room will lose its air and freeze.` : `${rn(id)} door locked.`, r.hole > 0 ? 'good' : ''); note(G.S, `Locked the ${rn(id)} door.`); }
    else ui.toast(r.hole > 0 ? `${rn(id)} door open — air is rushing out through the hole!` : r.p < 60 ? `${rn(id)} door open. Fresh air is flowing in from the tanks.` : `${rn(id)} door open.`, r.hole > 0 ? 'bad' : ''); };

  // ---------- spacesuit: off indoors (quicker work, cooking, sleep), on before you step out into the cave ----------
  G.toggleSuit = async () => { const s = G.S, on = s.suitOn;
    if (on && s.P < 45) { ui.toast('The air in here is too thin to breathe. Keep your suit on!', 'bad'); return; }
    await G.job({ title: on ? 'Taking off your spacesuit' : 'Putting on your spacesuit', hours: 0.25, steps: on ? ['Unlocking the helmet…', 'Unplugging the air hose…', 'Hanging the suit in its locker…'] : ['Stepping into the suit…', 'Locking the gloves and helmet…', 'Checking for leaks…'], site: { x: -65.2, z: -3.9 }, sparks: false, onStep: (k) => { if (k > 0.55) G.suitShow = !on; } });
    s.suitOn = !on; G.suitShow = undefined; ui.toast(on ? 'Suit off. Indoor jobs are quicker without big gloves, and now you can cook and sleep.' : 'Suit on and sealed. You can go out into the cave now.', 'good'); };
  const suitAct = () => ({ label: G.S.suitOn ? 'Take off your spacesuit (15 min)' : 'Put on your spacesuit (15 min)', run: G.toggleSuit });
  const needNoSuit = (what) => { if (!G.S.suitOn) return false; ui.toast(`You cannot ${what} in a spacesuit! Take it off at the Suit Lockers in the airlock.`, 'bad'); G.pointTo('suit'); return true; };

  // ---------- the Polar Ice Mine: tip the digger's bucket into the filler; every two scoops seal one canister ----------
  G.dumpDig = () => { const d = G.dig, s = G.S, n = d.load; if (!n) return; d.load = 0; const r = dump(s, n); G.audio.play('ok');
    for (let i = 0; i < r.cans; i++) { const k = G.items.filter((q) => q.type === 'ice' && q.where === 'ground' && Math.hypot(q.x - MINE.x - MINE.out[0], q.z - MINE.z - MINE.out[1]) < 7).length; G.spawnItem('ice', 'top', MINE.x + MINE.out[0] + (k % 4) * 1.15, MINE.z + MINE.out[1] - 0.6 + Math.floor(k / 4) * 1.15); }
    ui.toast(r.cans ? `${r.cans} canister${r.cans > 1 ? 's' : ''} of icy soil sealed and set on the rack.${r.sci ? ' +2 research for digging your first one!' : ''} Load ${r.cans > 1 ? 'them' : 'it'} on the rover or hopper for the Water Plant.` : `Tipped in. One more scoop will seal a canister.`, 'good');
    if (r.cans) note(s, `Dug ${r.cans} canister${r.cans > 1 ? 's' : ''} of icy soil at the Polar Ice Mine.`, 'good'); };

  // ---------- vehicles ----------
  G.enterVehicle = (v) => { P.in = v; G.lastRide = v; P.vel.set(0, 0, 0); G.audio.play('ok'); G.camT = 0; if (G.state === 'play' && !G['_tip' + v]) { G['_tip' + v] = 1; ui.toast(v === 'dig' ? 'Digger: W S to drive, A D to turn. Hold SPACE with the bucket over a pale blue patch to dig. Q tips the bucket into the filler. E to get out.' : v === 'car' ? 'Rover: W S to drive, A D to steer, E to get out. Park on the round pad to recharge.' : 'Hopper: Space to lift off, W to fly forward, A D to turn, C to come down, E to get out. It only charges on its own pad.'); } };
  G.exitVehicle = () => { const v = P.in, o = G[v]; if (v === 'ship' && o.alt > 0.7) { ui.toast('Land first: hold C to come down.', 'bad'); return; } P.in = null; if (v === 'car' || v === 'dig') { o.v = 0; o.dig = 0; } else { o.vx = o.vz = 0; } P.pos.set(o.x + Math.cos(o.yaw) * 3.2, 0, o.z - Math.sin(o.yaw) * 3.2); P.pos.y = world.heightAt(P.pos.x, P.pos.z); G.regoPos.set(P.pos.x + 1, P.pos.y, P.pos.z + 1); G.audio.play('blip'); };

  // ---------- jobs: scenes that play by themselves while the clock runs ----------
  const J = {
    async removePanel(i) { const [x, z] = MOUNTS[i]; await G.job({ title: 'Pulling the broken panel off', hours: 0.5, steps: ['Loosening the bolts…', 'Unplugging the cable…', 'Lifting it off the mount…'], site: { x, z, y: 2, r: 2.3 } }); G.S.mounts[i] = 0; G.take(G.spawnItem('panelB', 'top', P.pos.x, P.pos.z, 'hand')); ui.toast('Got it. Drag it to the rover and press E to load it — or carry it to the elevator.'); },
    async installPanel(i) { const [x, z] = MOUNTS[i]; G.removeItem(P.carry); await G.job({ title: 'Installing the solar panel', hours: 1, steps: ['Lifting the panel onto the mount…', 'Tightening the bolts…', 'Plugging in the cable…', 'Switching it on…'], site: { x, z, y: 2, r: 2.3 }, onStep: (k) => { if (k > 0.5) G.S.mounts[i] = 1; } }); G.S.mounts[i] = 1; G.S.stats.panelsBuilt++; note(G.S, 'Installed a solar panel.', 'good'); ui.toast(`Panel working! +${K.PANEL_KW} kW in sunshine. ${G.S.mounts.filter((m) => m === 1).length} panels are making power.`, 'good'); G.rego.setMood('joy'); G.rego.wave = 2; },
    benchPut() { const s = G.S, i = s.bench.findIndex((b) => !b); if (i < 0) { ui.toast('Both bench slots are full. Wait for one to finish.', 'bad'); return; } if (noMat(1)) return; G.removeItem(P.carry); s.bench[i] = { left: G.simOn ? 2 : 0, total: 2 }; ui.toast(`The robot arm is fixing it. It takes about ${fmt.hrs(jobHours(s, 2))}. Fetch the next one while you wait!`); },
    benchTake(i) { G.S.bench[i] = null; G.take(G.spawnItem('panel', 'deep', P.pos.x, P.pos.z, 'hand')); ui.toast('Fixed panel in hand. Carry it up and install it on an empty mount.'); },
    deliver() { const it = P.carry, d = ITEMS[it.type], s = G.S; if (d.gives === 'mat') { if (s.mat !== Infinity) s.mat += d.n; } else if (d.gives === 'cans') s.cans += d.n; else s.water = Math.min(s.waterCap, s.water + d.n); G.removeItem(it); ui.toast(`Delivered: +${d.n} ${d.gives === 'mat' ? 'materials' : d.gives === 'cans' ? 'tinned meals' : 'L of water'}.`, 'good'); note(s, `Delivered a ${d.name}.`, 'good'); },
    async battery() { G.removeItem(P.carry); await G.job({ title: 'Plugging in the battery module', hours: 1, steps: ['Sliding it into the rack…', 'Connecting the cables…', 'Testing…'], site: { x: -52, z: 14 } }); G.S.mods++; ui.toast('Battery module added: +120 kWh of storage.', 'good'); },
    async patch(id) { if (noMat(1)) return; const hp = world.rooms[id].holePos; await G.job({ title: `Patching the hole in the ${rn(id)}`, hours: 1, steps: ['Finding the hole…', 'Pressing the patch on…', 'Welding the edges…', 'Listening for hissing…'], site: { x: hp.x, z: hp.z, y: 3.2 } }); const r = G.S.rooms[id]; r.hole = 0; note(G.S, `Patched the hole in the ${rn(id)}.`, 'good'); ui.toast(r.door ? 'Hole patched. The air is staying in.' : r.built < 1 ? 'Hole patched. Now rebuild the room at its console.' : 'Hole patched. Unlock the door to let air back in.', 'good'); doneGoal(id); },
    async rebuild(id) { const d = ROOMS.find((q) => q.id === id), r = G.S.rooms[id]; if (noMat(d.mat)) return; r.cold = 0; r.door = 1;   // open the bulkhead: air flows back in from the tanks while we work
      await G.job({ title: `Rebuilding the ${d.name}`, hours: d.hours, steps: ['Clearing the wreckage…', 'Fixing the wall panels…', 'Bolting the machines back…', 'Wiring the lights…', 'Testing every switch…'], site: { x: (d.x0 + d.x1) / 2, z: d.side * 15 }, onStep: (k) => { r.built = Math.min(0.99, 0.3 + 0.7 * k); r.frozen = k < 0.8; r.cold = 0; } });
      r.built = 1; r.frozen = false; r.door = 1; r.cold = 0; for (const q of G.S.racks) if (q.room === id) Object.assign(q, { g: 0, ripe: 0, hp: 0.6 }); G.S.stats.roomsBuilt++; note(G.S, `Rebuilt the ${d.name}.`, 'good'); ui.toast(`${d.name} rebuilt! Air is flowing back in.`, 'good'); G.rego.setMood('joy'); G.rego.wave = 2; doneGoal(id); },
    async fix(title, hours, mat, site, steps, done) { if (mat && noMat(mat)) return; await G.job({ title, hours, steps, site }); done(); },
    async cook() { const s = G.S; if (s.raw < 1) return; if (needNoSuit('cook')) return; await G.job({ title: 'Cooking', hours: 1, steps: ['Washing and chopping…', 'Boiling the potatoes…', 'Frying eggs and tomatoes…', 'Serving up…'], site: { x: 5, z: -22 }, tag: 'cook', sparks: false }); const n = cookBatch(s); ui.toast(`Cooked ${n} hot meals.`, 'good'); note(s, `Cooked ${n} meals.`, 'good'); },
    async pick(id) { const d = ROOMS.find((q) => q.id === id); if (!ripeIn(G.S, id)) { ui.toast('Nothing is ripe in this farm yet.'); return; }
      await G.job({ title: `Picking the ripe racks`, hours: 1, steps: ['Checking which are ripe…', 'Picking…', 'Saving leaves and peels for the hens…', 'Setting new seeds…'], site: { x: (d.x0 + d.x1) / 2, z: d.side * 15 }, pose: 'work', sparks: false });
      const h = harvest(G.S, id, 0.9), got = []; if (h.raw) got.push(`${h.raw.toFixed(1)} raw food (cook it in the Kitchen)`); if (h.meals) got.push(`${h.meals.toFixed(1)} ready-to-eat salad`); if (h.herbs) got.push(`${h.herbs} bunch${h.herbs > 1 ? 'es' : ''} of herbs`); if (h.sci) got.push(`${h.sci} research`);
      ui.toast(`Picked ${h.names.join(' and ').toLowerCase()}: ${got.join(', ')}. The scraps became hen feed, and the racks are replanted.`, 'good'); doneGoal(id); },
  };
  G.J = J;

  // ---------- what is close to me? ----------
  const nearStation = () => { let best = null, bd = 1e9; for (const s of STATIONS) { if (s.zone !== P.zone) continue; const d = Math.hypot(s.pos[0] - P.pos.x, s.pos[1] - P.pos.z); if (d < s.r && d < bd) { best = s; bd = d; } } if (!best && P.zone === 'top') for (const s of SITES) if (near(s.pos[0] + 2, s.pos[1] + 16, 9)) best = { id: s.id, site: s, name: s.name }; return best; };
  const nearMount = () => { let bi = -1, bd = 5; MOUNTS.forEach(([x, z], i) => { const d = Math.hypot(x - P.pos.x, z - P.pos.z); if (d < bd) { bd = d; bi = i; } }); return bi; };
  const nearItem = () => { let best = null, bd = 1e9; for (const it of G.items) { if (it.where !== 'ground' || it.zone !== P.zone) continue; const d = Math.hypot(it.x - P.pos.x, it.z - P.pos.z); if (d < (ITEMS[it.type].heavy ? 4.2 : 2.8) && d < bd) { best = it; bd = d; } } return best; };
  const nearDoor = () => P.zone === 'deep' ? ROOMS.find((d) => { const [x, z] = doorSpot(d); return near(x, z, 2.4); }) : null;
  const nearHole = () => P.zone === 'deep' ? ROOMS.find((d) => G.S.rooms[d.id].hole > 0 && near(world.rooms[d.id].holePos.x, world.rooms[d.id].holePos.z, 4.5)) : null;

  // The one thing E does right now (and sometimes a second thing on Q).
  G.context = () => {
    const s = G.S, c = {}, top = P.zone === 'top';
    if (P.in) { c.e = { label: P.in === 'car' ? 'Get out of the rover' : P.in === 'dig' ? 'Get out of the digger' : 'Get out of the hopper', run: G.exitVehicle };
      if (P.in === 'dig') { if (G.dig.load > 0 && near(MINE.x, MINE.z, 10)) c.q = { label: `Tip ${G.dig.load} scoop${G.dig.load > 1 ? 's' : ''} into the canister filler`, run: G.dumpDig }; else c.q = { label: G.dig.load >= MINE.bucket ? 'Bucket full: drive to the orange filler' : 'Hold SPACE over a pale blue patch to dig', run: () => {} }; }
      return c; }
    const it = P.carry, st = nearStation(), veh = top ? (near(G.car.x, G.car.z, 5.4) ? 'car' : near(G.ship.x, G.ship.z, 6) && G.ship.alt < 0.7 ? 'ship' : null) : null, m = top ? nearMount() : -1, lift = st && (st.id === 'gate' || st.id === 'lift');
    if (it) {
      const nm = ITEMS[it.type].name, vn = veh === 'car' ? 'rover' : 'hopper';
      if (it.type === 'panel' && m >= 0 && s.mounts[m] === 0) c.e = { label: 'Install the solar panel on this mount (1 h)', run: () => J.installPanel(m) };
      else if (it.type === 'panelB' && st && st.id === 'bench') c.e = { label: 'Put the broken panel on the Fix-It Bench (1 material, 2 h)', run: J.benchPut };
      else if (ITEMS[it.type].gives && st && st.id === 'depot') c.e = { label: `Deliver the ${nm} to the depot`, run: J.deliver };
      else if (it.type === 'battery' && st && st.id === 'storage') c.e = { label: 'Plug the battery module into the rack (1 h)', run: J.battery };
      else if (it.type === 'ice' && st && st.id === 'wplant') c.e = { label: 'Load the icy soil into the Water Plant hopper', run: () => { G.removeItem(it); s.wx.ice++; G.audio.play('ok'); ui.toast(`Canister loaded: ${s.wx.ice} in the hopper. Press E here to set up a batch.`, 'good'); } };
      else if (lift) {   // at the elevator, E always rides (that is what every objective says); a rover parked here moves to Q
        c.e = { label: st.id === 'gate' ? `Ride the elevator down (the ${it.type.startsWith('panel') ? 'panel' : 'load'} comes too)` : 'Ride the elevator up', run: () => G.ride(st.id === 'gate' ? 'deep' : 'top') };
        if (veh && G[veh].cargo.length < G[veh].max) c.q = { label: `Load the ${nm} onto the ${vn}`, run: () => G.load(veh) };
      }
      else if (veh) c.e = G[veh].cargo.length < G[veh].max ? { label: `Load the ${nm} onto the ${vn}`, run: () => G.load(veh) } : { label: `The ${vn} is full — put the ${nm} down`, run: () => G.drop() };
      else c.e = { label: `Put down the ${nm}`, run: () => G.drop() };
      if (st && st.id === 'suit' && c.e.label.startsWith('Put down')) { c.q = c.e; c.e = suitAct(); }
      if (lift && c.e.run !== undefined && !c.e.label.startsWith('Ride')) c.q = { label: 'Ride the elevator', run: () => G.ride(st.id === 'gate' ? 'deep' : 'top') };
      else if (lift && veh && G[veh].cargo.length < G[veh].max) c.q = { label: `Load the ${nm} onto the ${vn}`, run: () => G.load(veh) };
      return c;
    }
    const li = nearItem(), door = nearDoor(), hole = nearHole(), done = st && st.id === 'bench' ? s.bench.findIndex((b) => b && b.left <= 0) : -1;
    if (hole) c.e = { label: `Patch the hole in the ${hole.name} (1 material, 1 h)`, run: () => J.patch(hole.id) };
    else if (li) c.e = { label: `Pick up the ${ITEMS[li.type].name}`, run: () => G.take(li) };
    else if (top && near(G.dig.x, G.dig.z, 5.5)) c.e = { label: 'Drive the digger', run: () => G.enterVehicle('dig') };
    else if (veh && !lift) c.e = { label: veh === 'car' ? 'Drive the rover' : 'Fly the hopper', run: () => G.enterVehicle(veh) };
    else if (m >= 0 && s.mounts[m] === 2) c.e = { label: 'Pull the broken panel off its mount (30 min)', run: () => J.removePanel(m) };
    else if (done >= 0) c.e = { label: 'Take the fixed panel', run: () => J.benchTake(done) };
    else if (door) c.e = { label: s.rooms[door.id].door ? `Lock the ${door.name} door` : `Unlock the ${door.name} door`, run: () => G.toggleDoor(door.id) };
    else if (st && st.id === 'suit') c.e = suitAct();
    else if (lift) c.e = { label: st.id === 'gate' ? 'Ride the elevator down into the cave' : 'Ride the elevator up to the surface', run: () => G.ride(st.id === 'gate' ? 'deep' : 'top') };
    else if (st && G.state === 'play') c.e = { label: st.info ? `Look at the ${st.name}` : st.name, run: () => G.openStation(st) };
    if (veh && lift) c.q = { label: veh === 'car' ? 'Drive the rover' : 'Fly the hopper', run: () => G.enterVehicle(veh) };
    if (veh && G[veh].cargo.length) { const last = G[veh].cargo[G[veh].cargo.length - 1]; c.q = { label: `Take the ${ITEMS[last.type].name} out (${G[veh].cargo.length} on board)`, run: () => G.take(last) }; }
    return c;
  };
  G.promptText = () => { const c = G.context(); if (!c.e && !c.q) return null; return (c.e ? `<kbd>E</kbd>${c.e.label}` : '') + (c.q ? `<span class="sep"></span><kbd>Q</kbd>${c.q.label}` : ''); };
  G.doAction = async (k) => { if (ui.busy || G.riding || G.jobTick || G.sleepLeft > 0 || G.acting) return; const c = G.context()[k]; if (!c) return; G.acting = true; try { await c.run(); } finally { G.acting = false; } };

  // ---------- station and room panels ----------
  G.openStation = async (st) => {
    const s = G.S, F = computeFlows(s), f = s.f, id = st.id;
    if (st.site) return sitePanel(st.site);
    if (st.room) return roomPanel(id);
    if (id === 'wplant') return G.waterPlant();
    if (id === 'icemine') return ui.panel('Polar Ice Mine', { stats: [['Floor temperature', `${MINE.coldC}°C, always`], ['Icy patches left', `${s.mine.patches.filter((p) => p.left > 0).length} of ${s.mine.patches.length}${s.mode === 'unlimited' ? ' (endless)' : ` · ${iceLeft(s)} scoops`}`], ['Filler hopper', `${s.mine.hopper} of ${MINE.perCan} scoops`], ['Canisters dug so far', s.mine.cans], ['Digger bucket', `${G.dig.load} of ${MINE.bucket} scoops`]], actions: [{ label: 'Show me the digger', run: async () => G.pointTo({ zone: 'top', x: G.dig.x, z: G.dig.z, name: 'the digger', r: 4 }) }],
      note: 'Sunlight never reaches this crater floor, so ice that drifted in billions of years ago is still here, mixed into the soil: about 5.6% by weight. Dig it, seal it in canisters, and haul it home. (Our story: real dark craters are at the Moon\'s poles, about 2,500 km from this base. The game draws this one a short trip away.)', img: 'rm_icemine' });
    if (st.info) return ui.panel(st.name, { stats: [], actions: [], note: world.baseHit ? `${st.info}<br><br><b>After the meteor shower:</b> ${st.hit}` : st.info, img: 'rm_surface' });
    if (id === 'bench') return ui.panel('Fix-It Bench', { stats: s.bench.map((b, i) => [`Slot ${i + 1}`, !b ? 'empty' : b.left > 0 ? `fixing… ${fmt.hrs(jobHours(s, b.left))} left` : 'FIXED — pick it up']), note: 'Carry a broken solar panel here and press E. The robot arm fixes it while you do something else. Each repair uses 1 material and electricity.' });
    if (id === 'fab') return ui.panel('Robot-Arm Builder', { stats: [['Materials', fmt.mat(s.mat)], ['Now building', s.fab ? `${s.fab.what === 'panel' ? 'solar panel' : 'battery module'} — ${fmt.hrs(jobHours(s, s.fab.left))} left` : 'nothing']],
      actions: [
        { label: 'Build a new solar panel', sub: 'The machine line makes it. You carry it up and install it yourself.', costs: ['4 materials', `${fmt.hrs(jobHours(s, 3))}`, '4 kW while building'], gains: [`+${K.PANEL_KW} kW of sunshine power`], disabled: !!s.fab || s.mat < 4, run: async () => { spend(s, 4); s.fab = { what: 'panel', left: 3, total: 3 }; ui.toast('Building a solar panel. It will appear on the yellow tray.'); } },
        { label: 'Build a battery module', sub: 'Stores more power for the long night. Carry it to the Battery Store.', costs: ['6 materials', `${fmt.hrs(jobHours(s, 4))}`, '4 kW while building'], gains: ['+120 kWh storage'], disabled: !!s.fab || s.mat < 6 || s.mods >= 6, run: async () => { spend(s, 6); s.fab = { what: 'battery', left: 4, total: 4 }; ui.toast('Building a battery module. It will appear on the yellow tray.'); } },
      ], note: s.mat === Infinity ? 'Unlimited mode: build as much as you like!' : 'Materials are limited. Other stations have crates of them.' });
    if (id === 'solar') return ui.panel('Solar Field', { stats: [['Working panels', `${F.nOk} of 24 mounts`], ['Making right now', `${F.solar.toFixed(1)} kW`], ['Broken panels', s.mounts.filter((x) => x === 2).length], ['Dust on the panels', pct(s.dust)]],
      actions: [
        { label: 'Brush the dust off by hand', costs: ['1.5 h topside', '+radiation'], disabled: s.dust < 0.1, run: () => J.fix('Brushing the solar panels', 1.5, 0, { x: 0, z: -58, y: 2 }, ['Brushing panel after panel…', 'Shaking out the brush…', 'Last row…'], () => { s.dust = 0.03; ui.toast('Panels clean and shiny.', 'good'); }) },
        { label: 'Zap the dust with the dust shield', sub: 'Electric fields flick it off in seconds.', costs: ['−35 kWh battery'], disabled: s.dust < 0.1 || s.battery < 35, run: async () => { runDustShield(s); ui.toast('Dust shield fired: panels 80% cleaner.', 'good'); } },
      ], note: 'Walk up to a broken panel and press E to pull it off. Carry a good panel to an empty mount and press E to install it. Robots or crew set to "Panel cleaner" keep the dust away for you.' });
    if (id === 'dish') return ui.panel('Earth Link Dish', { img: 'ev2_comms', stats: [['Link', f.commsDown ? 'Not pointing at Earth' : s.lv.comms ? 'Talking to Earth' : 'Switched off'], ['Radio delay', '1.3 s each way']],
      actions: [
        { label: 'Aim the dish at Earth again', sub: 'Earth stays in almost the same spot in our sky — but the dish must point at it almost perfectly.', costs: ['1 h topside'], disabled: !f.commsDown, run: async () => { const r = await playMini(G, 'align'); G.simAdvance(jobHours(s, 1)); if (r.win) { f.commsDown = false; ui.toast('Link restored. Mission Control can warn you about solar storms again.', 'good'); note(s, 'Re-aimed the dish.', 'good'); doneGoal('dish'); } else ui.toast('Not locked on yet. Press E to try again.', 'bad'); } },
        { label: 'Call Mission Control', disabled: !F.commsOn, run: () => ui.say([{ who: 'you', text: 'Tranquility Deep to Mission Control. Still here. Still breathing.' }, { who: 'flight', text: s.hours === Infinity ? 'We hear you. There is no rescue ship this time — you are building a new home. Make us proud.' : `We hear you, Tranquility Deep. Your ship is ${fmt.days((s.hours - (s.t - s.t0)) / 24)} away. Did you notice the pause before I answered? That was your voice crossing 384,400 km, and mine coming back.` }]) },
      ] });
    if (id === 'isru') return ui.panel('Moon-Dust Oxygen Plant', { stats: [['Status', f.isruDown ? 'Broken by the meteor shower' : s.lv.isru ? 'Running: +2.2 kg of oxygen a day' : 'Off'], ['Power when on', '9 kW'], ['Water used', 'None']],
      actions: [
        { label: 'Repair the plant', costs: ['3 materials', '3 h topside'], disabled: !f.isruDown, run: () => J.fix('Repairing the oxygen plant', 3, 3, { x: 60, z: -34, y: 1 }, ['Replacing the cracked pipes…', 'Fitting a new controller…', 'Relining the furnace…', 'Test burn…'], () => { f.isruDown = false; ui.toast('Oxygen plant repaired. Switch it on from the Power Board when you have power to spare.', 'good'); note(s, 'Repaired the oxygen plant.', 'good'); doneGoal('isru'); }) },
        { label: s.lv.isru ? 'Switch it OFF' : 'Switch it ON', costs: s.lv.isru ? [] : ['9 kW'], disabled: f.isruDown, run: async () => { s.lv.isru = s.lv.isru ? 0 : 1; ui.toast(`Moon-dust plant ${s.lv.isru ? 'ON' : 'OFF'}.`); } },
      ], note: 'It melts moon soil to free the oxygen locked inside. It uses no water at all, which saves your tanks — but it eats a lot of power.' });
    if (id === 'yard') return ui.panel('Heater Hub', { stats: [['Topside temperature', fmt.temp(F.sun.tempC)], ['Heaters', f.heater ? 'One circuit has failed' : `Level ${s.lv.heat} (machines need ${F.heatNeed})`]],
      actions: [{ label: 'Fix the heater circuit', costs: ['1 material', '1.5 h topside'], disabled: !f.heater, run: () => J.fix('Fixing the heater circuit', 1.5, 1, { x: -86, z: -52, y: 1 }, ['Finding the burnt wire…', 'Splicing in a new one…', 'Warming up…'], () => { f.heater = false; ui.toast('Heater circuit fixed.', 'good'); doneGoal('yard'); }) }, { label: 'Open the Power Board', run: () => ui.powerBoard() }] });
    if (id === 'depot') { const crates = (v) => G[v].cargo.filter((it) => ITEMS[it.type].gives), all = [...(near(G.car.x, G.car.z, 22) ? crates('car') : []), ...(near(G.ship.x, G.ship.z, 26) ? crates('ship') : [])];
      return ui.panel('Cargo Depot', { stats: [['Materials', fmt.mat(s.mat)], ['Tinned meals', Math.floor(s.cans)], ['Water', s.water.toFixed(0) + ' L']], actions: [{ label: `Unload ${all.length} crate${all.length === 1 ? '' : 's'} from the parked rover / hopper`, costs: ['30 min'], disabled: !all.length, run: async () => { await G.job({ title: 'Unloading crates', hours: 0.5, steps: ['Lifting crates off…', 'Stacking them in the depot…'], site: { x: 20, z: 48 }, pose: 'carry' }); for (const it of all) { P.carry = it; J.deliver(); } } }], note: 'Bring crates here from the other stations. Park the rover or hopper close by and unload everything in one go.' }); }
    if (id === 'park') return ui.panel('Charging Pads', { stats: [['Rover', `${pct(s.car.charge)}${s.car.charging ? ' — charging (4 kW)' : ''}`], ['Hopper', `${pct(s.ship.charge)}${s.ship.charging ? ' — charging (7 kW)' : ''}`]], note: 'Park the rover on the small pad and the hopper on the big pad. They charge by themselves, using the station\'s power. The rover goes about 2.5 km on a full charge. The hopper is faster but drinks more.' });
    if (id === 'pad') return ui.panel('Landing Pad', { stats: [[s.hours === Infinity ? 'Rescue ship' : 'Rescue ship lands in', s.hours === Infinity ? 'not coming — this is home now' : fmt.days((s.hours - (s.t - s.t0)) / 24)], ['Trip from Earth', 'about 3 days']], note: 'The first Moon crews took about three days to get here. They landed in lunar morning, when the low Sun makes long shadows that show every bump.' });
  };
  const sitePanel = (site) => { const s = G.S, waiting = !!G.siteNpc[site.id], crates = G.items.filter((it) => it.where === 'ground' && it.zone === 'top' && Math.hypot(it.x - site.pos[0], it.z - site.pos[1]) < 40).length;
    return ui.panel(site.name, { img: waiting ? 'ev2_rescue' : null, stats: [['Astronaut', s.rescued.includes(site.id) ? `${site.whoName} — safe at your station` : waiting ? `${site.whoName} is stranded here!` : `${site.whoName} is following you`], ['Crates lying around', crates]],
      actions: [{ label: `Rescue ${site.whoName}`, sub: `${/^[aeiou]/i.test(site.job) ? 'An' : 'A'} ${site.job}. ${site.perk} They will work without electricity — but they need food, water and air like you.`, costs: ['+3 meals a day', '+0.84 kg oxygen a day'], gains: ['A new crew member'], disabled: !waiting, run: async () => { await ui.say([{ who: site.who, text: `You came! Our dome cracked in the meteor shower and my radio died. I thought nobody was left. I am ${site.whoName}, ${site.job}.` }, { who: 'rego', mood: 'joy', text: (G.player.in === 'ship' || G.lastRide === 'ship' ? 'Climb aboard the hopper!' : 'Hop in the rover!') + ' There is room at Tranquility Deep. Take the elevator down and you will be safe.' }]); G.follow(site); note(s, `Found ${site.whoName} at ${site.name}.`, 'good'); } }],
      note: 'Pick up crates with E, load them onto your rover or hopper, and deliver them to the Cargo Depot back home.' }); };
  const roomPanel = (id) => {
    const s = G.S, F = computeFlows(s), f = s.f, d = ROOMS.find((q) => q.id === id), r = s.rooms[id], ok = roomOk(s, id), st = roomState(s, id), A = [], stats = [['Air pressure', `${r.p.toFixed(0)} kPa`], ['Door', r.door ? 'open' : 'LOCKED'], ['State', st === 'ok' ? 'working' : st === 'leak' ? 'LEAKING — air is escaping!' : st === 'sealed' ? 'sealed off, no air, frozen' : st === 'wreck' ? 'broken — needs rebuilding' : 'air too thin']];
    if (r.hole > 0) A.push({ label: 'Patch the hole', sub: 'Walk to the hole in the ceiling and press E.', costs: ['1 material', '1 h'], run: async () => G.pointTo({ zone: 'deep', x: world.rooms[id].holePos.x, z: world.rooms[id].holePos.z, name: 'the hole', id }) });
    if (r.built < 1) A.push({ label: `Rebuild the ${d.name}`, sub: `Brings back ${d.what}. You and REGO do the work; watch it come together.`, costs: [`${d.mat} materials`, fmt.hrs(jobHours(s, d.hours))], disabled: r.hole > 0 || s.mat < d.mat, run: () => J.rebuild(id) });
    A.push({ label: r.door ? 'Lock the door' : 'Unlock the door', sub: r.door ? 'Stops a leak here from emptying the whole station.' : 'Lets air back in.', run: async () => G.toggleDoor(id) });
    let note2 = `This room holds ${d.what}.`;
    if (id === 'control') { if (ok) return ui.control(); note2 = 'The Control Center is broken. Rebuild it to get the big map and remote door locks back.'; }
    if (id === 'kitchen' && ok) { stats.push(['Hot meals', Math.floor(s.meals)], ['Tins', Math.floor(s.cans)], ['Raw food', Math.floor(s.raw)], ['Herbs', `${s.herbs} bunch${s.herbs === 1 ? '' : 'es'} (each makes a cooked batch a fifth bigger)`]); A.unshift({ label: `Cook ${Math.min(12, Math.floor(s.raw))} raw food into hot meals`, costs: ['1 h'], gains: ['Raw food is worth twice as much cooked'], disabled: s.raw < 1, norec: s.suitOn, run: J.cook }); note2 = 'Raw potatoes, tomatoes and eggs are worth half a meal each. Cooked, they are a whole meal. A crew member set to "Cook" does this for you.'; }
    if (id === 'oxygen' && ok) { stats.push(['Oxygen tank', `${s.o2.toFixed(1)} of ${s.o2Cap} kg`], ['Being made', `${(F.o2Elec + F.o2Isru + F.o2Farm).toFixed(2)} kg a day`], ['Being used', `${F.o2Use.toFixed(2)} kg a day by ${F.people} ${F.people === 1 ? 'person' : 'people'}`]);
      if (f.scrubber) A.unshift({ label: 'Build a new air filter', sub: 'Follow the steps Mission Control reads out.', costs: ['1 material', '1 h'], run: async () => { if (noMat(1)) return; const res = await playMini(G, 'sequence'); G.simAdvance(jobHours(s, 1)); if (res.win) { f.scrubber = false; delete s.extraKw.backup; ui.toast('Air filter working. The stale air is clearing.', 'good'); doneGoal('oxygen'); } else { if (s.mat !== Infinity) s.mat += 1; ui.toast('Not right yet. Press E to try again.', 'bad'); } } }, { label: 'Switch on the backup air cleaner', costs: ['+3 kW until fixed'], disabled: !!s.extraKw.backup, run: async () => { s.extraKw.backup = 3; ui.toast('Backup air cleaner on (+3 kW).'); } });
      A.push({ label: 'Open the Power Board', run: () => ui.powerBoard() }); note2 = 'One person breathes 0.84 kg of oxygen every day. The Oxygen Maker splits water with electricity to make it.'; }
    if ((id === 'potato' || id === 'tomato') && ok) return G.farmPanel(id);
    if (id === 'animal' && ok) { stats.push(['Hens', s.hens], ['Eggs waiting', Math.floor(s.eggs)], ['Dry feed', `${s.feed.toFixed(1)} kg (${s.feed > 0 ? fmt.days(s.feed / (s.hens * 0.11)) : 'EMPTY'})`], ['Fish tank', s.fish ? 'healthy — plants grow 15% faster' : 'empty']);
      A.unshift({ label: `Collect ${Math.floor(s.eggs)} egg${Math.floor(s.eggs) === 1 ? '' : 's'}`, gains: ['Raw food'], disabled: s.eggs < 1, run: async () => { const n = collectEggs(s); ui.toast(`Collected ${n} eggs. Cook them in the Kitchen!`, 'good'); } });
      note2 = 'Hens eat dry feed made of grass, seeds and plant scraps, packed before the disaster. People cannot eat it. Every time you pick crops, the leaves and peels become more feed. No feed, no eggs. The fish water feeds the plants.'; }
    if (id === 'storage' && ok) { stats.push(['Battery', `${Math.round(s.battery)} of ${Math.round(F.cap)} kWh`], ['Extra modules', `${s.mods} of 6`]); A.push({ label: 'Open the Power Board', run: () => ui.powerBoard() }); note2 = 'Build battery modules at the Robot-Arm Builder and carry them here. Each adds 120 kWh for the long lunar night.'; }
    if (id === 'quarters' && ok) { A.unshift({ label: 'Sleep for 8 hours', sub: 'Time races ahead. Machines keep running as you left them. You wake up if something goes wrong.', costs: ['8 h pass'], gains: ['Health'], norec: s.suitOn, run: async () => { if (needNoSuit('sleep')) return; G.sleepLeft = 8; } }); note2 = 'Rest matters. Tired people make mistakes — and in space, small mistakes get big fast.'; }
    if (id === 'bathroom') note2 = ok ? 'Shower water and toilet water go straight to the recycler. Nothing is wasted.' : 'While the Bathroom is broken, the recycler gets back less water.';
    if (id === 'water' && ok) { stats.push(['Water tank', `${s.water.toFixed(0)} of ${s.waterCap} L`], ['Recycling', pct(F.rate)], ['Change', `${F.wNet.toFixed(1)} L a day`], ['Plant food', s.nutri === Infinity ? 'endless' : `${s.nutri.toFixed(2)} kg`]);
      A.unshift({ label: 'Run the waste digester', sub: 'Bacteria turn plant scraps and waste into plant food for the farms. It eats hen feed, so the hens get less.', costs: ['1.5 kg of hen feed', '2 h'], gains: ['+0.5 kg of plant food'], disabled: s.feed < 1.5, run: () => J.fix('Running the waste digester', 2, 0, { x: 14, z: 15 }, ['Loading the scraps…', 'Bacteria break them down…', 'Filtering out the plant food…'], () => { s.feed -= 1.5; s.nutri = Math.min(9, s.nutri + 0.5); note(s, 'Made plant food in the digester.', 'good'); ui.toast('The digester made 0.5 kg of plant food.', 'good'); }) });
      A.push({ label: 'See the life-support loop', sub: 'Where every litre and every breath goes.', run: () => G.loopScreen() }); if (f.leakWater) A.unshift({ label: 'Seal the leaking pipe', costs: ['1 material', '1 h'], run: () => J.fix('Sealing the water pipe', 1, 1, { x: 15, z: 14 }, ['Shutting the valve…', 'Clamping the joint…', 'Turning the water back on…'], () => { f.leakWater = 0; ui.toast('Pipe sealed. No more drips.', 'good'); doneGoal('water'); }) }); A.push({ label: 'Open the Power Board', run: () => ui.powerBoard() }); note2 = 'Each person needs about 3.8 litres of water a day. A good recycler gives 98% of it back.'; }
    return ui.panel(d.name, { stats, actions: A, note: note2, img: `rm_${id}` });
  };

  // ---------- alerts: shown on the HUD and in the Control Center ("where is the error?") ----------
  G.alerts = () => {
    const s = G.S, f = s.f, a = [], st = s.storm;
    if (st && s.t < st.start) a.push({ text: `Solar storm arrives in ${fmt.hrs(st.start - s.t)}`, sub: 'Be underground before it hits', go: 'gate' }); else if (st) a.push({ text: `SOLAR STORM — ${fmt.hrs(Math.max(0, st.end - s.t))} left`, sub: P.zone === 'top' ? 'You are exposed! Take the elevator down' : 'You are safe under the rock roof', go: 'gate' });
    const fl = s.flow || {}, draining = fl.net < 0;   // power first: an empty battery weakens every machine at once
    if (s.battery <= 0.01 && draining) a.push({ text: 'POWER OUT — every machine is running weak', sub: 'Turn machines down on the Power Board (Tab) or fix solar panels' });
    else if (draining && fl.battHours < 12) a.push({ text: `Battery empty in ${fmt.hrs(Math.max(0.1, Math.round(fl.battHours * 10) / 10))}`, sub: 'Using more power than you make: open the Power Board (Tab)', kind: 'warn' });
    for (const d of ROOMS) { const stt = roomState(s, d.id); if (stt === 'leak') a.push({ text: `AIR LEAK: ${d.name}`, sub: 'Patch the hole, or lock its door', go: d.id }); else if (stt === 'sealed') a.push({ text: `${d.name}: sealed, no air`, sub: 'Patch the hole to save it', go: d.id, kind: 'warn' }); else if (stt === 'wreck') a.push({ text: `${d.name}: broken`, sub: `Rebuild it (${d.mat} materials)`, go: d.id, kind: 'warn' }); }
    if (s.safeMode > 0) a.push({ text: `Topside safe mode: ${fmt.hrs(s.safeMode)}`, sub: 'No solar or radio', kind: 'warn' });
    if (f.scrubber && !s.extraKw.backup) a.push({ text: 'Air cleaner broken', sub: `Air quality ${Math.round(s.air * 100)}% · Oxygen Room`, go: 'oxygen' });
    if (f.leakWater) a.push({ text: 'Water pipe leaking', sub: 'Water Room', go: 'water' });
    const nb = s.mounts.filter((x) => x === 2).length; if (nb) a.push({ text: `${nb} solar panel${nb > 1 ? 's' : ''} broken`, sub: 'Solar Field → Fix-It Bench', go: 'solar', kind: 'warn' });
    if (f.commsDown) a.push({ text: 'Dish lost Earth', sub: 'No storm warnings', go: 'dish', kind: 'warn' });
    if (f.isruDown && s.t - s.t0 > 30) a.push({ text: 'Moon-dust oxygen plant broken', sub: '3 materials to repair', go: 'isru', kind: 'warn' });
    if (f.heater) a.push({ text: 'Heater circuit failed', sub: 'Heater Hub', go: 'yard' });
    if (f.mold) a.push({ text: 'Mold on the tomatoes', sub: 'Tomato Farm', go: 'tomato' });
    if (s.dust > 0.4 && s.flow.sun.up) a.push({ text: `Dusty panels (−${Math.round(s.dust * 75)}% power)`, sub: 'Solar Field', go: 'solar', kind: 'warn' });
    if (s.feed <= 0 && roomOk(s, 'animal')) a.push({ text: 'Hen feed is empty', sub: 'Pick crops to make more', go: 'potato', kind: 'warn' });
    for (const id of ['potato', 'tomato']) if (ripeIn(s, id) >= 2) a.push({ text: `${ripeIn(s, id)} racks ripe in the ${rn(id)}`, sub: 'A ripe rack stops growing until you pick it', go: id, kind: 'warn' });
    if (s.nutri <= 0) a.push({ text: 'Plant food has run out', sub: 'Water Room: run the waste digester', go: 'water' });
    if (f.pump) a.push({ text: `Farm pump broken in the ${rn(f.pump)}`, sub: 'Roots are drying out', go: f.pump });
    if (f.led) a.push({ text: `Half the lamps are dark in the ${rn(f.led)}`, sub: 'Crops there grow at half speed', go: f.led, kind: 'warn' });
    if (s.wx.seal < 0.9 || s.wx.cond < 0.5) a.push({ text: 'Water Plant needs servicing', sub: s.wx.seal < 0.9 ? 'A leaking seal wastes vapour' : 'Worn out', go: 'wplant', kind: 'warn' });
    s.bench.forEach((b) => { if (b && b.left <= 0) a.push({ text: 'A panel is fixed', sub: 'Fix-It Bench', go: 'bench', kind: 'warn' }); });
    return a;
  };
  G.badPlaces = () => { const o = {}; for (const a of G.alerts()) if (a.go) o[a.go] = true; return o; };

  // ---------- REGO's advice ----------
  G.advise = (short) => {
    const s = G.S, F = computeFlows(s), f = s.f, st = s.storm, top = P.zone === 'top'; let t = null, go = null, mood = 'happy';
    const leak = F.leaks[0], wreck = ROOMS.find((d) => s.rooms[d.id].built < 1), sealedHole = ROOMS.find((d) => s.rooms[d.id].hole > 0 && !s.rooms[d.id].door), nb = s.mounts.filter((x) => x === 2).length, empty = s.mounts.filter((x) => x === 0).length;
    const thin = !s.suitOn && (s.here && s.rooms[s.here] ? s.rooms[s.here].p : s.P) < 60;
    if (thin) { t = '<b>The air here is too thin and you have no suit on!</b> Leave this room, or run to the Suit Lockers in the airlock.'; go = 'suit'; mood = 'alert'; }
    else if (st && s.t >= st.start && top) { t = '<b>Radiation storm!</b> Take the elevator down NOW. Metres of rock overhead will shield you.'; go = 'gate'; mood = 'alert'; }
    else if (leak) { t = `<b>Air is escaping from the ${rn(leak)}!</b> Run there and patch the hole — or lock its door to save the rest of the station. Locking it will freeze that room.`; go = leak; mood = 'alert'; }
    else if (st && s.t < st.start && top) { t = `Storm in ${fmt.hrs(st.start - s.t)}. Finish up and get underground.`; go = 'gate'; mood = 'worried'; }
    else if (F.eff < 1) { t = '<b>Brownout!</b> The battery is empty. Turn something down on the Power Board, and get more solar panels working.'; mood = 'alert'; }
    else if (s.o2 < 0.8 || F.o2Days < 0.6) { t = !roomOk(s, 'oxygen') ? '<b>Oxygen is low</b> and the Oxygen Room is not working. Fix that room first!' : s.water > 3 && s.lv.o2gen < 3 ? '<b>Oxygen is low!</b> Turn the Oxygen Maker up on the Power Board. It costs power and water.' : '<b>Oxygen is low!</b> Repair and switch on the Moon-Dust Oxygen Plant topside: it needs no water.'; go = !roomOk(s, 'oxygen') ? 'oxygen' : null; mood = 'alert'; }
    else if (f.scrubber && !s.extraKw.backup) { t = 'The air cleaner is broken and the air is going stale. Fix it in the Oxygen Room.'; go = 'oxygen'; mood = 'worried'; }
    else if (s.water < 3 || F.waterDays < 1) { const cans = G.items.some((q) => q.type === 'ice'); t = '<b>Water is low.</b> Turn the Water Recycler up. The Oxygen Maker drinks water too. ' + (s.wx.batch ? 'The Water Plant is already working on a batch.' : s.wx.ice > 0 ? 'There is icy soil in the Water Plant hopper: run a batch.' : cans ? 'Carry the canisters of icy soil to the Water Plant and extract the ice.' : 'Dig more ice at the <b>Polar Ice Mine</b>: follow the pale blue light to the south-west.'); go = s.wx.batch ? null : s.wx.ice > 0 || cans ? 'wplant' : 'icemine'; mood = 'worried'; }
    else if (F.foodDays < 1) { t = s.raw >= 2 && roomOk(s, 'kitchen') ? 'Food is low — but you have raw food. Cook it in the Kitchen!' : ripeIn(s, 'potato') || ripeIn(s, 'tomato') ? 'Food is low. There are ripe crops to pick!' : s.eggs >= 1 ? 'Food is low. Collect the eggs in the Animal Bay!' : 'Food is low. Turn the Farm lights up, and look for food crates at the other stations.'; go = s.raw >= 2 ? 'kitchen' : ripeIn(s, 'potato') ? 'potato' : ripeIn(s, 'tomato') ? 'tomato' : s.eggs >= 1 ? 'animal' : null; mood = 'worried'; }
    else if (s.lv.heat < F.heatNeed) { t = `Topside is ${fmt.temp(F.sun.tempC)}. Our machines up there need heater level ${F.heatNeed} or they will break.`; mood = 'worried'; }
    else if (s.bench.some((b) => b && b.left <= 0)) { t = 'A panel is fixed and waiting on the Fix-It Bench. Carry it up and install it on an empty mount.'; go = 'bench'; }
    else if (P.carry && P.carry.type === 'panelB') { t = 'Bring that broken panel to the Fix-It Bench in the Workshop, down in the station.'; go = 'bench'; }
    else if (P.carry && P.carry.type === 'panel') { t = 'Carry that panel to an empty mount in the Solar Field and press E.'; go = 'solar'; }
    else if (nb && F.sun.up && s.mat >= 1) { t = `<b>${nb} solar panel${nb > 1 ? 's are' : ' is'} broken.</b> Pull one off its mount (E), load it on the rover, take it down to the Fix-It Bench, then bring it back. More panels means more power.`; go = 'solar'; }
    else if (sealedHole && s.mat >= 1) { t = `The ${sealedHole.name} is sealed off with a hole in it. Go in, patch the hole, then rebuild the room.`; go = sealedHole.id; }
    else if (wreck && s.mat >= wreck.mat && s.rooms[wreck.id].hole === 0) { t = `The ${wreck.name} is still broken. Rebuild it at its console to get ${wreck.what} back.`; go = wreck.id; }
    else if (f.commsDown) { t = 'The dish is not pointing at Earth. Without it, solar storms arrive with no warning.'; go = 'dish'; }
    else if (s.mat < 3 && s.mat !== Infinity && s.rescued.length + G.followers.length < 3) { const site = SITES.find((q) => !s.rescued.includes(q.id) && !G.followers.some((fl) => fl.site.id === q.id)); t = `We are nearly out of materials. <b>${site.name}</b> has crates — and an astronaut who needs rescuing. Follow the ${['teal', 'purple', 'green'][SITES.indexOf(site)]} light. Take the rover or the hopper.`; go = site.id; mood = 'think'; }
    else if (f.pump) { t = `The water pump in the ${rn(f.pump)} has stopped. Hydroponic roots have no soil to hold water: fix it before they dry out.`; go = f.pump; mood = 'worried'; }
    else if (s.nutri <= 0) { t = '<b>The plant food has run out</b>, so crops are crawling. Run the waste digester in the Water Room, or plant peas and soybeans: they make their own nitrogen.'; go = 'water'; mood = 'worried'; }
    else if (ripeIn(s, 'potato') || ripeIn(s, 'tomato')) { const id = ripeIn(s, 'potato') ? 'potato' : 'tomato'; t = `Ripe crops in the ${rn(id)}! Pick them: a ripe rack stops growing. Staples need cooking; salad is ready to eat.`; go = id; }
    else if (s.wx.ice > 0 && !s.wx.batch && top) { t = `There ${s.wx.ice === 1 ? 'is a canister' : 'are ' + s.wx.ice + ' canisters'} of icy soil in the Water Plant hopper. Set up a batch: gentle heat in a vacuum turns the ice straight to vapour.`; go = 'wplant'; mood = 'think'; }
    else if (F.waterDays < 4 && !s.wx.batch && s.wx.ice === 0 && !G.items.some((q) => q.type === 'ice') && iceLeft(s) > 0) { t = 'Water is getting short and there is no icy soil left here. The <b>Polar Ice Mine</b> has plenty: follow the pale blue light to the south-west, dig with the digger, and bring canisters back to the Water Plant.'; go = 'icemine'; mood = 'think'; }
    else if (F.waterDays < 3 && !s.wx.batch && G.items.some((q) => q.type === 'ice' && q.where === 'ground')) { t = 'Water is getting short. There are canisters of icy polar soil by the Water Plant topside: carry them to the hopper and extract the ice.'; go = 'wplant'; mood = 'think'; }
    else if (s.raw >= 4 && roomOk(s, 'kitchen')) { t = 'You have raw food waiting. Cook it in the Kitchen — cooked food fills you up twice as much.'; go = 'kitchen'; }
    else if (s.eggs >= 3) { t = 'The hens have laid eggs. Collect them in the Animal Bay.'; go = 'animal'; }
    else if (F.sun.up && F.sun.toSunset < 30 && s.battery < F.cap * 0.8) { t = `Sunset in ${fmt.days(F.sun.toSunset / 24)}. After that there is no solar power for two weeks. Fill the battery while you can!`; mood = 'think'; }
    else if (!s.fab && empty > 0 && (s.mat >= 6 || s.mat === Infinity) && !nb) { t = `There are ${empty} empty mounts in the Solar Field. Build a new panel at the Robot-Arm Builder, carry it up and install it.`; go = 'fab'; mood = 'think'; }
    else if (s.helpers.every((h) => h.role === 'idle') && (F.net > 2 || humans(s).length)) { t = 'Your helpers are all resting. Give them jobs in the Control Center — robots cost electricity, people cost food.'; go = 'control'; mood = 'think'; }
    else if (f.isruDown && s.mat >= 5) { t = 'When you can spare 3 materials, repair the Moon-Dust Oxygen Plant topside. It makes oxygen without using water.'; go = 'isru'; }
    if (!t) t = `All systems look steady. Did you know? ${FACTS[G.factI++ % FACTS.length]}`;
    if (short) return t; ui.bubble(t, mood, 13); if (go) { G.pointTo(go); if (G.goal) G.goal.sticky = true; }   // sticky: stays until "Stop guiding" is clicked
  };
}
