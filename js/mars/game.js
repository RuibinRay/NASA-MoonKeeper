// MOONKEEPER — Mars: the game on the surface. Starting and saving, what you can press, the building panels,
// the HUD, the alerts, REGO's advice and the maps. It runs on the same engine as the Moon: the same player,
// rover, camera and windows. main.js hands the frame to marsFrame() whenever G.planet is 'mars'.
import * as THREE from '../../lib/three.module.min.js';
import { tt } from '../i18n.js';
import { IC } from '../icons.js';
import { Astronaut } from '../actors.js';
import { WHO } from '../ui.js';
import { MARS, LOADS, PLANT, createMars, marsFlows, marsStep, marsClock, marsSerialize, marsDeserialize } from './sim.js';
import * as T from './terrain.js';
import { makeMarsMap } from './map.js';
import { makeMission } from './mission.js';
import { makeTraining } from './training.js';

const $ = (s) => document.querySelector(s), clamp = (x, a, b) => Math.max(a, Math.min(b, x)), SAVE = 'mk2-mars-save', SAVE_SURV = 'mk2-mars-survive-save';
const el = (tag, cls, html) => { const d = document.createElement(tag); d.className = cls; if (html) d.innerHTML = html; return d; };
// What kind of fact is this? Every panel says so.
const CLS = { obs: ['real', tt('Observed on Mars')], demo: ['demo', tt('Demonstrated')], prop: ['prop', tt('Proposed by NASA studies')], game: ['game', tt('Made for the game')] };
const pill = (k) => `<span class="pill ${CLS[k][0]}">${CLS[k][1]}</span>`;
const hrs = (h) => (h === Infinity ? tt('no limit') : h >= 48 ? tt`${(h / MARS.SOL_H).toFixed(1)} sols` : h >= 1 ? `${h.toFixed(1)} h` : `${Math.round(h * 60)} min`);
const sols = (d) => (d === Infinity || d > 400 ? tt('400+ sols') : d >= 10 ? tt`${d.toFixed(0)} sols` : tt`${d.toFixed(1)} sols`);
const kw = (x) => `${x.toFixed(1)} kW`;

// ---- the 14 buildings: what each one is for ----
const INFO = {
  cmd: { name: tt('Command Habitat'), does: tt('The crew plan each sol here and watch every system of the outpost.'), needs: tt('Power'), gives: tt('The overview of the whole outpost'), cls: 'prop',
    note: tt('NASA studies of a first Mars base put the crew in a few pressurised modules joined by tunnels. Nobody has built one on Mars yet.') },
  living: { name: tt('Living Quarters'), does: tt('Bunks, a galley and a table. The soil heaped over it soaks up radiation.'), needs: tt('Power, warm air'), gives: tt('Rest for the crew'), cls: 'prop',
    note: tt('Curiosity measured 0.67 millisieverts a day on the surface: about what you get on Earth in three months. Models show the first 15 to 20 cm of soil over a roof take away the most.') },
  lifesupport: { name: tt('Life Support Module'), does: tt('Scrubs the carbon dioxide the crew breathe out and cleans used water so it can be drunk again.'), needs: tt('Power'), gives: tt('Clean air, recycled water'), cls: 'demo',
    note: tt('Demonstrated on the International Space Station, where most of the water is recycled. On Mars it has not been done yet.') },
  water: { name: tt('Water Processing Plant'), does: tt('Melts ice from the well beside it, filters the water and fills the tanks.'), needs: tt('Power, buried ice'), gives: tt('Water'), cls: 'prop',
    note: tt('Radar and fresh craters show sheets of water ice under the soil of Arcadia Planitia, in places only centimetres down. Melting it with a heated drill is a NASA proposal; it has not been tried on Mars.') },
  power: { name: tt('Power Station'), does: tt('Batteries and switches. The solar field and the small reactor both feed it.'), needs: tt('Sunlight, the reactor'), gives: tt('Electricity for everything'), cls: 'prop',
    note: tt('Dust is the enemy of solar power on Mars: it dims the sky and settles on the glass. InSight fell from 5,000 to 500 watt-hours a sol in three and a half years. That is why studies pair panels with a small fission unit.') },
  greenhouse: { name: tt('Greenhouse'), does: tt('Grows fresh food under pink lamps, in a tunnel kept warm and full of air.'), needs: tt('Power, water, warmth'), gives: tt('Fresh food'), cls: 'prop',
    note: tt('Mars gets 43% of the sunlight Earth does, and the air is far too thin and cold for plants. Crops have been grown in space, but a Mars greenhouse is still a design.') },
  lab: { name: tt('Research Laboratory'), does: tt('Reads the weather mast and stores rock and ice samples in sealed boxes.'), needs: tt('Power'), gives: tt('Weather readings'), cls: 'obs',
    note: tt('Every lander since Viking has carried a weather station. They show air pressure rising and falling through the year as carbon dioxide freezes onto the poles and returns.') },
  medical: { name: tt('Medical Bay'), does: tt('Keeps count of each crew member\'s radiation dose and helps the crew recover.'), needs: tt('Power'), gives: tt('Faster recovery'), cls: 'prop',
    note: tt('Help from Earth is up to 22 minutes away by radio and many months away by ship, so a Mars crew must treat itself.') },
  garage: { name: tt('Rover Garage'), does: tt('Shelter and a charging pad for the rover. Drive straight through.'), needs: tt('Power'), gives: tt('A charged rover'), cls: 'prop',
    note: tt('On Mars a rover weighs 38% of what it does on Earth. Dust gets into every joint, so rovers need shelter and care.') },
  airlock: { name: tt('Airlock'), does: tt('Two doors and a small room between them, so the air inside never rushes out.'), needs: tt('Power'), gives: tt('The way in and out'), cls: 'prop',
    note: tt('The air outside is 95% carbon dioxide at under 1% of Earth\'s pressure. Suits hang on the outside wall so that dust stays out of the rooms.') },
  comms: { name: tt('Communications Tower'), does: tt('The dish follows the Earth across the sky and talks to orbiters overhead.'), needs: tt('Power'), gives: tt('The link to Earth'), cls: 'obs',
    note: tt('Radio takes 3 to 22 minutes to cross from Mars to Earth, depending on where the two planets are. Nobody can steer a Mars crew live: they must decide for themselves.') },
  storage: { name: tt('Storage Depot'), does: tt('Cargo boxes of food, parts and tanks, kept cold and dry.'), needs: tt('A little power'), gives: tt('Stores that do not spoil'), cls: 'game',
    note: tt('Everything that cannot be made on Mars must be shipped from Earth, and a ship can only leave about every 26 months.') },
  isru: { name: tt('ISRU Facility'), does: tt('Makes oxygen from the Martian air: it pulls in carbon dioxide and splits it with electricity.'), needs: tt('Power, Mars air'), gives: tt('Oxygen'), cls: 'demo',
    note: tt('Demonstrated on Mars at small scale: the MOXIE box on the Perseverance rover made 122 g of oxygen in 16 runs, up to 12 g an hour. A plant this size is still a proposal. ISRU means using what is already there.') },
  thermal: { name: tt('Thermal Control Facility'), does: tt('A heat pump warms the rooms. Its tall radiators shed waste heat to the sky.'), needs: tt('Power'), gives: tt('Warm rooms'), cls: 'prop',
    note: tt('A day at the Viking 1 site ran from −89°C before dawn to −31°C in the afternoon. The thin air carries heat away slowly, so machines can overheat even in that cold.') },
};
const SHORT = { cmd: tt('Command'), living: tt('Living'), lifesupport: tt('Life Support'), water: tt('Water'), power: tt('Power'), greenhouse: tt('Greenhouse'), lab: tt('Lab'), medical: tt('Medical'), garage: tt('Garage'), airlock: tt('Airlock'), comms: tt('Comms'), storage: tt('Storage'), isru: tt('ISRU'), thermal: tt('Thermal') };
const TOUR = ['cmd', 'power', 'lifesupport', 'isru', 'water', 'greenhouse', 'thermal', 'living', 'medical', 'lab', 'garage', 'storage', 'comms', 'airlock'];
// ---- the crew: three people who live and work here with you ----
const CREW = [
  { id: 'mateo', name: tt('Mateo Rivas · habitat engineer'), short: tt('Mateo'), color: 0x1fb5a8, home: 'room' },
  { id: 'noor', name: tt('Dr. Noor Haddad · life support and medicine'), short: tt('Noor'), color: 0x9a5cff, home: 'room' },
  { id: 'lena', name: tt('Dr. Lena Park · geologist'), short: tt('Lena'), color: 0x3fbf5a, home: 'out' },
];
for (const c of CREW) WHO[c.id] = { name: c.name, img: 'mars/c_' + c.id };   // their faces in the talk box: assets/img/mars/c_<id>.jpg
const LENA_WALK = [[60.5, 44.5], [71.5, 44], [70.5, 35.5], [61, 36]];        // round the ice well, where she takes her samples
const turn = (a, b, k) => { const d = Math.atan2(Math.sin(b - a), Math.cos(b - a)); return a + d * Math.min(1, k); };
// ---- places to find ----
const POI = [
  { id: 'solar', name: tt('Solar Field'), x: 10, z: 104, r: 34, cls: 'prop', text: tt('<b>The Solar Field.</b> 35 tables of panels that turn to follow the Sun from east to west. Watch them go brown as dust settles.') },
  { id: 'reactor', name: tt('Fission Unit'), x: T.REACTOR.x - 18, z: T.REACTOR.z, r: 16, cls: 'prop', text: tt('<b>The fission unit.</b> It makes 10 kW day and night, dust or no dust. It stands far from the crew, behind a bank of soil. NASA tested a small one on Earth in 2018; none has flown.') },
  { id: 'lander', name: tt('Lander'), x: T.PAD.x + 12, z: T.PAD.z + 6, r: 24, cls: 'game', text: tt('<b>The lander.</b> It stands on a pad of baked soil well away from the base, so its engines cannot throw rocks at the buildings.') },
  { id: 'drill', name: tt('Ice Well'), x: T.DRILL.x - 5, z: T.DRILL.z + 4, r: 10, cls: 'prop', text: tt('<b>The ice well.</b> A heated drill melts buried ice and pumps the water up. The ice sheet under Arcadia Planitia is tens of metres thick.') },
  { id: 'ice', name: tt('Young Ice Crater'), x: T.ICE_CRATER.x, z: T.ICE_CRATER.z, r: 26, cls: 'obs', text: tt('<b>A young crater with ice in it!</b> A meteorite dug through the soil to the ice below. Orbiters have photographed fresh craters like this at this latitude: the white fades in months as the ice turns straight to vapour.') },
  { id: 'flow', name: tt('Lava Flow Edge'), x: 200, z: 412, r: 55, cls: 'game', text: tt('<b>The edge of an old lava flow.</b> The ground steps up about 7 m here. Lava from the great volcanoes far to the south-east once ran across these plains.') },
  { id: 'dunes', name: tt('Ripple Field'), x: 430, z: -380, r: 120, cls: 'game', text: tt('<b>Wind ripples.</b> Dark sand piled into ridges across the wind. On Mars the air is thin, so only strong winds move sand, and ripples creep a few centimetres a year.') },
  { id: 'terrace', name: tt('Terraced Crater'), x: T.TERRACE_CRATER.x + T.TERRACE_CRATER.r * 0.6, z: T.TERRACE_CRATER.z, r: 46, cls: 'game', text: tt('<b>A crater with a step in its wall.</b> A step like this forms when a meteorite punches through layers of different strength: here, soil lying on ice. Scientists study terraced craters like this, together with radar from orbit, to work out how thick the buried ice is.') },
  { id: 'shield', name: tt('Heat Shield and Parachute'), x: T.SHIELD.x + 6, z: T.SHIELD.z - 4, r: 24, cls: 'game', text: tt('<b>The lander\'s heat shield, backshell and parachute.</b> A lander throws these away on the way down, once they have done their work of slowing it down through the thin air. They lie where they fell, and the wind is slowly burying the parachute in dust.') },
  { id: 'seis', name: tt('Seismometer'), x: T.SEIS.x + 2, z: T.SEIS.z + 1, r: 13, cls: 'demo', text: tt('<b>The seismometer.</b> Under the dome, it listens for marsquakes. It stands far from the base so that footsteps and machines do not drown out the ground\'s own tremors. NASA\'s InSight lander did this on Mars: in December 2021 it felt a magnitude 4 quake from a meteorite strike.') },
  { id: 'old', name: tt('Old Crater'), x: T.OLD_CRATER.x, z: T.OLD_CRATER.z, r: 100, cls: 'game', text: tt('<b>An old crater.</b> Its rim has been worn soft over hundreds of millions of years by wind, dust and frost. Compare it with the sharp young one.') },
];

export function installMars(G, deps) {
  const P = G.player, cam = G.cam, world = G.world, ui = G.ui; let S = null, hudT = 0, saveT = 0, nagT = 0, passing = false; const labels = {}, v3 = new THREE.Vector3();
  const near = (x, z, r) => Math.hypot(P.pos.x - x, P.pos.z - z) < r;
  let inRoom = false, camOut = 9; const crew = [];
  const where = (id) => (id === 'car' ? { id, x: G.car.x, z: G.car.z, name: tt('My Rover') } : T.B[id] ? { id, x: T.B[id].door[0], z: T.B[id].door[1], name: INFO[id].name } : POI.find((p) => p.id === id));

  // ---------- time ----------
  const saveKey = () => (S && S.mode === 'survive' ? SAVE_SURV : SAVE);
  const pass = async (hours, title, rest = false) => { passing = true; const n = Math.max(4, Math.min(40, Math.ceil(hours / 0.25))); for (let i = 0; i < n; i++) { if (MIS.step(hours / n) && (rest || S.over)) { if (!S.over) ui.toast(tt('You are woken: something needs you.'), 'bad'); break; } ui.job(title, (i + 1) / n, '', hrs((hours * (n - i - 1)) / n)); if (i % 4 === 3) await new Promise((r) => setTimeout(r, 40)); } ui.job(null); passing = false; S.stats.jobs++; };
  const MIS = makeMission({ G, ui, INFO, hrs, kw, state: () => S, pass: (h, t) => pass(h, t) });
  // Training over (or skipped): a survival mission then starts from a fresh outpost; exploring simply carries on.
  const afterTraining = async (mode, skipped) => {
    if (inRoom) await goOutside();
    if (mode === 'survive') { await ui.fade(true); const seed = S.seed; S = G.S = createMars(seed); MIS.begin(); P.in = null; G.xfer = null; Object.assign(G.car, { x: T.ROVER_PAD.x, z: T.ROVER_PAD.z, yaw: Math.PI, v: 0 }); G.car.dyn = null;
      P.vel.set(0, 0, 0); P.pos.set(T.SPAWN.x, world.heightAt(T.SPAWN.x, T.SPAWN.z), T.SPAWN.z); G.regoPos.set(T.SPAWN.x + 2, P.pos.y, T.SPAWN.z + 1.5); cam.yaw = 0.35; S.flow = marsFlows(S); await ui.fade(false);
      if (!skipped) ui.toast(tt('Training complete. Now the real thing.'), 'good'); MIS.intro(); G.save(); return; }
    S.fault = {}; S.cargo = 0; S.tauWant = S.tau = 0.45; S.flow = marsFlows(S); G.save();
    ui.bubble(skipped ? tt('Training skipped. Press <b>H</b> whenever you want my advice, and <b>M</b> for the map.') : tt('<b>Training complete!</b> You can walk, drive, read a building, switch it off and mend it. The outpost is yours to explore: press <b>H</b> for a tour, and <b>M</b> for the map.'), 'joy', 14);
    if (!skipped) ui.toast(tt('Ready for more? Choose <b>Survive on Mars</b> on the mission page.'), 'good');
  };
  const TRAIN = makeTraining({ G, ui, state: () => S, done: afterTraining });
  const toMorning = () => { const sn = S.flow.sun; return (((sn.rise + 0.6 - sn.hour + 24) % 24) * MARS.SOL_H) / 24; };

  // ---------- alerts and advice ----------
  G.alerts = () => {
    const F = S.flow, a = [], pct = S.battery / F.cap; MIS.alerts(a);
    if (F.eff < 1) a.push({ key: 'power', text: tt('POWER IS OUT'), sub: tt('The battery is empty and the machines are slowing'), go: 'power' });
    else if (F.net < 0 && pct < 0.25) a.push({ text: tt('Battery low'), sub: tt`${Math.round(pct * 100)}% · ${hrs(F.battHours)} left`, kind: 'warn', go: 'power' });
    if (F.o2Net < 0 && F.o2Days * 24 / MARS.SOL_H < 3) a.push({ key: 'o2', text: tt('Oxygen running out'), sub: sols((F.o2Days * 24) / MARS.SOL_H), go: 'isru' });
    if (F.wNet < 0 && (F.waterDays * 24) / MARS.SOL_H < 5) a.push({ key: 'water', text: tt('Water running out'), sub: sols((F.waterDays * 24) / MARS.SOL_H), go: 'water' });
    if (S.co2 > 1.5) a.push({ key: 'co2', text: tt('Stale air indoors'), sub: tt`${S.co2.toFixed(1)}% carbon dioxide`, go: 'lifesupport' });
    if (S.habTemp < 12) a.push({ key: 'cold', text: tt('The rooms are getting cold'), sub: `${Math.round(S.habTemp)}°C`, go: 'thermal' });
    if (S.tau > 2) a.push({ text: tt('Dust storm'), sub: F.sun.up ? tt`dust ${S.tau.toFixed(1)} · solar power ${Math.round((F.solar / Math.max(F.solarClear, 0.1)) * 100)}% of a clear day` : tt`dust ${S.tau.toFixed(1)} · night: no solar power until sunrise`, kind: 'warn', go: 'power' });   // at night the panels make nothing anyway: don't blame the dust
    if (S.panelDust > 0.15) a.push({ text: tt('Solar panels are dusty'), sub: tt`${Math.round(S.panelDust * 100)}% of their power lost`, kind: 'warn', go: 'power' });
    { const off = Object.keys(LOADS).filter((id) => !S.on[id]);
      if (off.length === 1) a.push({ text: tt`${INFO[off[0]].name} is switched off`, sub: tt('Switch it on at its door'), kind: 'warn', go: off[0] });
      else if (off.length > 1) a.push({ text: tt`${off.length} buildings are switched off`, sub: off.map((id) => INFO[id].name).join(', '), kind: 'warn', go: 'power' }); }
    if (S.car.charge < 0.2) a.push({ text: tt('Rover battery low'), sub: `${Math.round(S.car.charge * 100)}%`, kind: 'warn', go: 'garage' });
    return a;
  };
  G.pointTo = (id, text) => { const w = where(id); if (!w) return; G.goal = { ...w, zone: 'top', text: text || null }; };
  G.advise = () => {
    if (TRAIN.say()) return;
    const al = G.alerts(), hot = al.find((a) => a.key && !a.key.startsWith('fault-')) || al.find((a) => !a.key || !a.key.startsWith('fault-')); nagT = 0; if (MIS.advise(!!(hot && hot.key))) return;
    if (hot) { const why = { power: tt('<b>The power is out.</b> Go to the Power Station: brush the dust off the panels, or switch off something that is not keeping the crew alive.'), o2: tt('<b>We are using oxygen faster than we make it.</b> Check the ISRU Facility is on and has power.'), water: tt('<b>The water is going down.</b> Check the Water Plant and the Life Support Module: one melts new ice, the other cleans used water.'), co2: tt('<b>The air indoors is going stale.</b> The Life Support Module scrubs out carbon dioxide. Switch it back on.'), cold: S.on.thermal && !(S.fault && S.fault.thermal) && S.flow.eff > 0.5 ? tt`<b>The rooms are still cold</b> (${Math.round(S.habTemp)}°C), but the heat pump is running again. They will be warm within a few hours.` : tt('<b>The rooms are cooling.</b> The Thermal Control Facility needs to be on, and it needs power.') }[hot.key];
      ui.bubble(why || `<b>${hot.text}.</b> ${hot.sub || ''}`, 'worried', 12); G.pointTo(hot.go); return; }
    if (S.seen.cmd && !S.seen.room && !inRoom) { ui.bubble(tt('Your crew is indoors. Walk to the <b>Airlock</b> and press <b>Q</b> to go inside the <b>Command Habitat</b> and meet them.'), 'happy', 12); G.pointTo('airlock'); return; }
    const b = TOUR.find((id) => !S.seen[id]); if (b) { ui.bubble(tt`Everything is running. Let us look at the <b>${INFO[b].name}</b>: ${INFO[b].does} Follow the yellow line on the ground and press <b>E</b> at its door.`, 'happy', 12); G.pointTo(b); return; }
    const p = POI.find((q) => !S.seen[q.id]); if (p) { ui.bubble(tt`You know the whole base now. Take the rover and find the <b>${p.name}</b>. It is ${Math.round(Math.hypot(p.x - P.pos.x, p.z - P.pos.z))} m away. Watch the rover's battery.`, 'happy', 12); G.pointTo(p.id); return; }
    ui.bubble(tt('You have seen every building and every place on this map. Try the dust control at the Power Station to see what a storm does to the base. Then try <b>Survive on Mars</b> from the mission page.'), 'joy', 14);
  };
  const seen = (id, text, mood = 'happy') => { if (S.seen[id]) return false; S.seen[id] = 1; G.audio.play('ok'); if (text) ui.bubble(text, mood, 14); return true; };

  // ---------- the rover ----------
  const enterCar = () => { G.xfer = { kind: 'in', u: 0, from: P.pos.clone() }; P.in = 'car'; P.vel.set(0, 0, 0); G.audio.play('ok'); G.camT = 0; if (!G._tipMcar) { G._tipMcar = 1; ui.toast(tt('Rover: W S to drive, A D to steer, E to get out. Park on the round pad by the garage to recharge.')); } };
  const exitCar = () => { const o = G.car; G.xfer = { kind: 'out', u: 0, from: P.pos.clone().set(o.x, world.heightAt(o.x, o.z) + 1.1, o.z) }; P.in = null; o.v = 0; P.pos.set(o.x + Math.cos(o.yaw) * 3.2, 0, o.z - Math.sin(o.yaw) * 3.2); P.pos.y = world.heightAt(P.pos.x, P.pos.z); G.regoPos.set(P.pos.x + 1, P.pos.y, P.pos.z + 1); G.audio.play('blip'); };

  // ---------- the crew ----------
  function makeCrew() {
    if (crew.length) return;
    for (const c of CREW) { const a = new Astronaut(c.color), spot = T.ROOM_SPOTS[c.id], n = { ...c, a, inside: c.home === 'room', x: spot[0], z: spot[1], yaw: 0, leg: 0, wait: 3, sp: 0, col: { x: 0, z: 0, r: 0 }, colIn: { x: 0, z: 0, r: 0 } };
      if (!n.inside) { n.x = LENA_WALK[0][0]; n.z = LENA_WALK[0][1]; } a.group.visible = false; world.scene.add(a.group); world.mars.colliders.push(n.col); world.mars.roomColliders.push(n.colIn); crew.push(n); }
  }
  function updateCrew(dt) {
    const storm = S.tau > 2.5, dark = !S.flow.sun.up;
    for (const n of crew) {
      const d = Math.hypot(P.pos.x - n.x, P.pos.z - n.z), here = n.inside === inRoom, close = here && d < 4.2 && !P.in;
      // Lena works outside by day and comes in for storms and for the night. She changes place while you are not near.
      if (n.home === 'out') { const want = storm || dark; if (want !== n.inside && (!here || d > 45)) { n.inside = want; const s = want ? T.ROOM_SPOTS.lena : LENA_WALK[n.leg % LENA_WALK.length]; n.x = s[0]; n.z = s[1]; n.wait = 3; } }
      let pose = 'walk', opt = null; n.sp = 0;
      if (close) { n.yaw = turn(n.yaw, Math.atan2(P.pos.x - n.x, P.pos.z - n.z), dt * 6); if (d < 3 && !ui.busy) pose = 'wave'; }
      else if (n.inside) { const out = n.id === 'mateo' ? 1.6 : 0, fx = T.ROOM.x + (n.x - T.ROOM.x) * out, fz = T.ROOM.z + (n.z - T.ROOM.z) * out; n.yaw = turn(n.yaw, Math.atan2(fx - n.x, fz - n.z), dt * 3); if (n.id === 'mateo') { pose = 'work'; opt = { aim: -0.2 }; } }   // Mateo at his console, the others turned to the table
      else if (n.wait > 0) { n.wait -= dt; pose = 'work'; opt = { tool: 'pick', aim: -0.9 }; }                                                                                         // taking a sample
      else { const [tx, tz] = LENA_WALK[n.leg % LENA_WALK.length], dx = tx - n.x, dz = tz - n.z, l = Math.hypot(dx, dz); if (l < 0.3) { n.leg++; n.wait = 5 + (n.leg % 3) * 2; } else { n.sp = 1.9; n.x += (dx / l) * n.sp * dt; n.z += (dz / l) * n.sp * dt; n.yaw = turn(n.yaw, Math.atan2(dx, dz), dt * 5); } }
      n.col.x = n.colIn.x = n.x; n.col.z = n.colIn.z = n.z; n.col.r = n.inside ? 0 : 0.5; n.colIn.r = n.inside ? 0.5 : 0;
      const g = n.a.group; g.visible = here; if (!here) continue;
      g.position.set(n.x, n.inside ? T.ROOM.y : T.heightAt(n.x, n.z), n.z); g.rotation.y = n.yaw; n.a.setSuit(!n.inside); n.a.update(dt, n.sp, false, pose, opt);
    }
  }
  // What each of them says is worked out from the outpost's numbers at that moment.
  async function talk(n) {
    const F = (S.flow = marsFlows(S)), perSol = MARS.SOL_H, pct = Math.round((S.battery / F.cap) * 100), says = (text) => ui.say([{ who: n.id, text }]), bye = (label) => ({ label, norec: true, run: () => {} }); G.audio.play('radio');
    if (n.id === 'mateo') {
      await says(F.eff < 1 ? tt`Commander, the batteries are flat. We make ${kw(F.supply)} and the base wants ${kw(F.demand)}, so every machine is running slow. Something has to go off.`
        : S.tau > 2 ? tt`This dust is eating our power. The solar field gives ${kw(F.solar)}; under a clear sky it would give ${kw(F.solarClear)} right now. The fission unit's ${kw(F.reactor)} is carrying us. The battery is at ${pct}%.`
        : S.panelDust > 0.15 ? tt`Dust has taken ${Math.round(S.panelDust * 100)}% of our solar power. An hour with two brushes and the panels are as good as new.`
        : tt`Power is healthy, Commander: ${kw(F.supply)} made, ${kw(F.demand)} used, battery at ${pct}%. Dust on the panels: ${Math.round(S.panelDust * 100)}%.`);
      const spare = Object.keys(LOADS).filter((k) => S.on[k] && !['cmd', 'lifesupport', 'thermal', 'isru', 'water', 'comms', 'living', 'medical'].includes(k)).sort((a, b) => LOADS[b] - LOADS[a]).slice(0, 3);
      return ui.panel(n.name, { stats: [[tt('Power made'), kw(F.supply)], [tt('Power used'), kw(F.demand)], [tt('Battery'), F.net < 0 ? tt`${pct}% · ${hrs(F.battHours)} left` : `${pct}%`], [tt('Dust on the panels'), tt`${Math.round(S.panelDust * 100)}% of their power lost`]], actions: [
        { label: tt('Let us brush the solar panels together'), sub: tt('Two people: one hour outside instead of two.'), disabled: S.panelDust < 0.04, norec: S.panelDust < 0.1, run: async () => { await pass(1, tt('Brushing the solar panels with Mateo…')); S.panelDust = 0.02; S.flow = marsFlows(S); await says(tt`Clean glass. The field is making ${kw(S.flow.solar)} now.`); } },
        { label: tt('What can we switch off to save power?'), norec: F.net >= 0, run: () => says(spare.length ? tt`Never life support, the heat pump or the oxygen plant. Start with these: ${spare.map((k) => `${INFO[k].name} (${kw(LOADS[k])})`).join(', ')}. Each one has its switch at its door.` : tt('Everything we can spare is already off. What is left keeps us alive.')) },
        { label: tt('Point me to the Power Station'), norec: true, run: () => { G.pointTo('power'); ui.toast(tt('The guide beam points to the Power Station.')); } }, bye(tt('Carry on, Mateo'))],
        note: tt('Mateo keeps the power, the heat and the walls working. Engineers on a real Mars crew would have to fix everything themselves: the nearest spare part is months away.') });
    }
    if (n.id === 'noor') {
      const o2h = F.o2Net < 0 ? S.o2 / -F.o2Net : Infinity, stop = S.o2 / Math.max(F.o2Use, 1e-6);
      await says(S.co2 > 1.5 ? tt`The air in here is going stale: ${S.co2.toFixed(1)}% carbon dioxide. The scrubbers in the Life Support Module must come back on.`
        : F.o2Net < 0 ? tt`Commander, we are breathing oxygen faster than we make it. At this rate the tanks last ${hrs(o2h)}.`
        : tt`The air is good. There are ${S.o2.toFixed(1)} kg of oxygen in the tanks, going up by ${(F.o2Net * perSol).toFixed(1)} kg a sol. The crew is at ${Math.round(S.health)}% health.`);
      return ui.panel(n.name, { stats: [[tt('Oxygen in the tanks'), `${S.o2.toFixed(1)} / ${S.o2Cap} kg`], [tt('Carbon dioxide indoors'), `${S.co2.toFixed(2)}%`], [tt('Water'), tt`${S.water.toFixed(0)} L · ${F.wNet >= 0 ? '+' : ''}${(F.wNet * perSol).toFixed(1)} L a sol`], [tt('Crew health'), `${Math.round(S.health)}%`], [tt('Your radiation dose so far'), `${S.dose.toFixed(2)} mSv`]], actions: [
        { label: tt('How long would the oxygen last if the plant stopped?'), run: () => says(tt`${hrs(stop)} for the ${S.crew} of us. Each person breathes ${MARS.O2_PP} kg a day, and there are ${S.o2.toFixed(1)} kg in the tanks. That is the number I watch.`) },
        { label: tt('Is it safer in here than outside?'), run: () => says(tt`Yes. Outside, the Curiosity rover measured ${MARS.RAD_OUT} millisieverts a day. In here, under a roof with soil on it, the game counts about ${MARS.RAD_IN}. If the Sun throws a storm of particles at us, this is where we all come.`) },
        { label: tt('Point me to the Life Support Module'), norec: true, run: () => { G.pointTo('lifesupport'); ui.toast(tt('The guide beam points to the Life Support Module.')); } }, bye(tt('Thank you, Noor'))],
        note: tt('Noor is the crew\'s doctor and looks after the air and the water. On Mars a radio question takes up to 22 minutes to reach Earth, so the crew must be able to treat itself.') });
    }
    const far = Math.round(Math.hypot(T.ICE_CRATER.x - P.pos.x, T.ICE_CRATER.z - P.pos.z));
    await says(n.inside ? (S.tau > 2.5 ? tt`No fieldwork in this. With the dust at ${S.tau.toFixed(1)} I could not see my own boots. I am sorting samples until it clears.` : tt('Too dark to work outside. I am labelling today\'s samples.'))
      : tt`Look at the ground, Commander: the cracks make shapes like paving stones. Ice just under the soil shrinks and swells with the seasons and cracks it. It is ${Math.round(F.tempC)}°C out here, by the way.`);
    return ui.panel(n.name, { stats: [[tt('Air temperature'), `${Math.round(F.tempC)}°C`], [tt('Air pressure'), tt`${(F.pressure / 100).toFixed(1)} mb (Earth: 1013)`], [tt('Dust in the sky'), S.tau.toFixed(2)], [tt('Places found'), `${POI.filter((p) => S.seen[p.id]).length} / ${POI.length}`]], actions: [
      { label: tt('Where is the young ice crater?'), norec: !!S.seen.ice, run: async () => { G.pointTo('ice'); await says(tt`About ${far} m from here. A meteorite dug down to the ice for us. Take the rover, and watch its battery.`); } },
      { label: tt('What is the drill doing?'), run: () => says(tt`Its hot tip melts the buried ice and a pump lifts the water: about ${PLANT.WATER_L_SOL} litres a sol while the Water Plant has power. A heated drill like this is a NASA idea. Nobody has tried it on Mars yet.`) },
      { label: tt('Why did we land here?'), norec: true, run: () => bigMap('why') }, bye(tt('Good luck, Lena'))],
      note: tt('Lena reads the rocks. Ground cracked into polygons is one of the signs that told scientists there was ice under these plains: the Phoenix lander set down on ground like it in 2008 and dug up ice.') });
  }

  // ---------- going indoors and out again ----------
  async function goInside() {
    if (inRoom || P.in) return; await ui.fade(true); G.audio.play('hiss'); camOut = cam.dist; inRoom = true; world.mars.setInside(true); if (G.goal && (G.goal.id === 'cmd' || G.goal.id === 'airlock')) G.goal = null;   // you have arrived
    P.pos.set(T.ROOM.door[0], T.ROOM.y, T.ROOM.door[1] - 1.2); P.vel.set(0, 0, 0); P.face = Math.PI; cam.yaw = 0.5; cam.pitch = 0.24; cam.dist = 6.5; G.regoPos.set(P.pos.x + 1.3, T.ROOM.y, P.pos.z - 0.4); G.astro.setSuit(false);
    $('#suit').className = 'glass'; $('#suit').textContent = tt('INDOORS'); for (const id in labels) labels[id].el.classList.add('hidden'); hudT = 1; await ui.fade(false);
    seen('room', tt('<b>Inside the Command Habitat.</b> The outpost makes the air in here, so your suit is off. Talk to your crew with <b>E</b>, look at the table in the middle, and leave by the hatch with the green lamp.'), 'joy');
  }
  async function goOutside() {
    if (!inRoom) return; await ui.fade(true); G.audio.play('hiss'); inRoom = false; world.mars.setInside(false);
    P.pos.set(T.ROOM.out[0], 0, T.ROOM.out[1]); P.pos.y = world.heightAt(P.pos.x, P.pos.z); P.vel.set(0, 0, 0); P.face = 0; cam.yaw = 2.3; cam.pitch = 0.16; cam.dist = camOut; G.regoPos.set(P.pos.x + 1.6, P.pos.y, P.pos.z + 1); G.astro.setSuit(true);
    $('#suit').className = 'glass on'; $('#suit').textContent = tt('SUIT ON'); hudT = 1; await ui.fade(false);
  }

  // ---------- what E and Q do here ----------
  G.context = () => {
    const c = {}; if (P.in === 'car') { c.e = { label: tt('Get out of the rover'), run: exitCar }; return c; }
    if (inRoom) { const n = crew.find((q) => q.inside && near(q.x, q.z, 2.5)), k = T.ROOM_CONSOLES.find((q) => near(q.at[0], q.at[1], 2.3));
      if (n) c.e = { label: tt`Talk to ${n.short}`, run: () => talk(n) };
      else if (near(T.ROOM.door[0], T.ROOM.door[1], 2.2)) c.e = { label: tt('Go outside through the airlock'), run: goOutside };
      else if (near(T.ROOM.x, T.ROOM.z, 3.3)) c.e = { label: tt('Look at the outpost table'), run: () => panel('cmd') };
      else if (k) c.e = { label: tt('Open the map of Mars'), run: () => bigMap() };
      return c; }
    { const n = crew.find((q) => !q.inside && near(q.x, q.z, 3.2)); if (n) { c.e = { label: tt`Talk to ${n.short}`, run: () => talk(n) }; return c; } }
    let best = null, bd = 6.5; for (const b of T.BUILDINGS) { const d = Math.hypot(P.pos.x - b.door[0], P.pos.z - b.door[1]); if (d < bd) { bd = d; best = b.id; } }
    const drive = near(G.car.x, G.car.z, 5) ? { label: tt('Drive the rover'), run: enterCar } : null;
    if (best) { c.e = { label: INFO[best].name, run: () => panel(best) }; if (drive) c.q = drive; else if (best === 'airlock' || best === 'cmd') c.q = { label: tt('Go inside'), run: goInside }; }
    else if (drive) c.e = drive;
    else { const p = POI.find((q) => S.seen[q.id] && near(q.x, q.z, Math.min(q.r, 14))); if (p) c.e = { label: p.name, run: () => (p.id === 'solar' ? panel('power') : place(p)) }; }
    return c;
  };
  G.promptText = () => { const c = G.context(); if (!c.e && !c.q) return null; return (c.e ? `<kbd>E</kbd>${c.e.label}` : '') + (c.q ? `<span class="sep"></span><kbd>Q</kbd>${c.q.label}` : ''); };
  G.doAction = async (k) => { if (ui.busy || passing || G.acting) return; const c = G.context()[k]; if (!c) return; G.acting = true; try { await c.run(); } finally { G.acting = false; } };

  // ---------- panels ----------
  const place = (p) => MIS.place(p) || ui.window({ title: p.name, img: `mars/mr_${p.id}`, html: `<p>${p.text}</p><div class="stat"><span>${tt('What kind of fact is this?')}</span><b>${pill(p.cls)}</b></div>` });
  // The two machines that keep the crew alive from minute to minute ask before they go off, and say how long the crew would have.
  async function sureOff(id) {
    if (id !== 'lifesupport' && id !== 'thermal') return true; const F = (S.flow = marsFlows(S)), out = Math.min(F.tempC, 4);
    const h = id === 'lifesupport' ? Math.max(0.5, (3 - S.co2) / (0.02 * S.crew)) : Math.max(0.5, -Math.log(Math.max(0.01, (5 - out) / Math.max(0.01, S.habTemp - out))) / 0.02);   // the same rates as js/mars/sim.js
    const i = await ui.card({ title: id === 'lifesupport' ? tt('Switch the Life Support Module off?') : tt('Switch the heat pump off?'),
      body: id === 'lifesupport' ? tt`The air scrubbers stop, and used water is no longer cleaned. Carbon dioxide builds up indoors: in about <b>${hrs(h)}</b> the air makes the crew ill.` : tt`The rooms start cooling towards the ${Math.round(F.tempC)}°C outside. In about <b>${hrs(h)}</b> they are below 5°C, and the crew start to suffer.`,
      choices: [{ label: tt('Keep it running') }, { label: tt('Switch it off anyway'), sub: tt`Saves ${kw(LOADS[id])}.` }] });
    return i === 1;
  }
  const toggle = (id) => ({ label: S.on[id] ? tt`Switch the ${INFO[id].name} off` : tt`Switch the ${INFO[id].name} on`, sub: S.on[id] ? tt`Saves ${kw(LOADS[id])}. Everything it does stops.` : tt`Uses ${kw(LOADS[id])}.`, norec: MIS.on() ? (S.on[id] ? !MIS.switches().off.includes(id) : MIS.switches().on !== id) : S.on[id], run: async () => { if (S.on[id] && !(await sureOff(id))) return; S.on[id] = !S.on[id]; S.flow = marsFlows(S); G.audio.play(S.on[id] ? 'ok' : 'blip'); ui.toast(S.on[id] ? tt`${INFO[id].name}: on.` : tt`${INFO[id].name}: off.`, S.on[id] ? 'good' : ''); if (!S.on[id] && TRAIN.active() && TRAIN.steps[TRAIN.step] === 'switch') panel(id); } });   // training asks for off, then on: the panel comes back for the second press
  async function panel(id) {
    const closeRec = TRAIN.active() && ((id === 'power' && TRAIN.steps[TRAIN.step] === 'power') || (id === 'cmd' && (TRAIN.steps[TRAIN.step] === 'open' || TRAIN.steps[TRAIN.step] === 'power')));   // training: opening it was the step, so REGO points at Close to carry on
    TRAIN.note('panel', id);
    const I = INFO[id], F = (S.flow = marsFlows(S)), sn = F.sun, first = seen(id), perSol = MARS.SOL_H, st = [[tt('What it does'), I.does], [tt('It needs'), I.needs], [tt('It gives'), I.gives]], act = [];
    if (LOADS[id]) st.push([tt('Power'), S.on[id] ? (F.eff < 1 ? tt`${kw(F.use[id])} wanted · only ${Math.round(F.eff * 100)}% arriving` : kw(F.use[id])) : tt('switched off')]);
    if (id === 'cmd') { st.push([tt('Crew'), tt`${S.crew} people, you included`], [tt('Power now'), tt`${kw(F.supply)} made · ${kw(F.demand)} used`], [tt('Oxygen'), tt`${S.o2.toFixed(1)} kg · ${F.o2Net >= 0 ? '+' : ''}${(F.o2Net * perSol).toFixed(1)} kg a sol`], [tt('Water'), tt`${S.water.toFixed(0)} L · ${F.wNet >= 0 ? '+' : ''}${(F.wNet * perSol).toFixed(1)} L a sol`], [tt('Food'), tt`${S.food.toFixed(0)} kg · ${F.foodNet >= 0 ? '+' : ''}${(F.foodNet * perSol).toFixed(1)} kg a sol`], [tt('Rooms'), tt`${Math.round(S.habTemp)}°C · ${S.co2.toFixed(2)}% CO₂`], [tt('Places found'), `${POI.filter((p) => S.seen[p.id]).length} / ${POI.length}`]);
      act.push({ label: tt('Ask REGO what to do next'), run: () => G.advise() }, { label: tt('Open the map'), run: () => bigMap() }); }
    else if (id === 'power') { st.push([tt('Solar field'), tt`${kw(F.solar)} · sunlight on the ground ${Math.round(F.G)} W/m²`], [tt('Fission unit'), kw(F.reactor)], [tt('Being used'), kw(F.demand)], [tt('Battery'), (F.cap < S.batteryCap ? tt`${Math.round(S.battery)} of ${Math.round(F.cap)} kWh (a module has failed: ${S.batteryCap} when whole)` : tt`${Math.round(S.battery)} of ${S.batteryCap} kWh`) + (F.net < 0 ? ' · ' + hrs(F.battHours) + tt(' left') : '')], [tt('Dust on the panels'), tt`${Math.round(S.panelDust * 100)}% of their power lost`], [tt('Dust in the sky'), tt`${S.tau.toFixed(2)} (${S.tau < 1 ? tt('clear') : S.tau < 2.5 ? tt('dusty') : tt('storm')})`]);
      act.push({ label: tt('Brush the dust off the solar panels'), sub: tt('Takes 2 hours outside.'), disabled: S.panelDust < 0.04, norec: S.panelDust < 0.1, run: async () => { await pass(2, tt('Brushing the solar panels…')); S.panelDust = 0.02; ui.toast(tt('The panels are clean again.'), 'good'); } });
      if (MIS.on()) { const sw = MIS.switches(), offNow = Object.keys(LOADS).filter((k) => k !== 'cmd' && !S.on[k] && !sw.off.includes(k));
        for (const k of [...sw.off, ...offNow]) { const t = toggle(k); act.push({ ...t, run: async () => { await t.run(); panel('power'); } }); } }   // the panel comes back after each switch, so several can be pressed in a row
      if (!MIS.on()) for (const [v, name, sub] of [[0.45, tt('Science demo: make the sky clear'), tt('A normal clear day.')], [1.5, tt('Science demo: make the sky dusty'), tt('Dust season: a hazy sky.')], [4, tt('Science demo: make the sky a regional storm'), tt('Like the storms that cover part of the planet most years.')]]) act.push({ label: name, sub: sub + ' ' + tt('The dust thickens or clears over a few hours.'), norec: true, disabled: Math.abs(S.tauWant - v) < 0.01, run: () => { S.tauWant = v; ui.bubble(v > 2 ? tt('<b>Demo storm on its way.</b> Watch the sky, the shadows and the solar power over the next hours. Real storms cannot be switched on or off: this control is here so you can see what dust does.') : tt('The sky will change over the next few hours.'), v > 2 ? 'worried' : 'happy', 12); } }); }
    else if (id === 'living') { st.push([tt('Rooms'), `${Math.round(S.habTemp)}°C`], [tt('Crew health'), `${Math.round(S.health)}%`]); act.push({ label: tt('Rest until morning'), sub: tt`Time runs on to sunrise (${hrs(toMorning())}). The outpost keeps working.`, disabled: !S.on.living || sn.up && sn.hour < sn.set - 2, norec: true, run: async () => { await ui.fade(true); await pass(toMorning(), tt('Resting…'), true); await ui.fade(false); ui.bubble(tt('Good morning! The Sun is coming up over the plain.'), 'joy', 8); } }); }
    else if (id === 'lifesupport') st.push([tt('Carbon dioxide indoors'), `${S.co2.toFixed(2)}%`], [tt('Water cleaned and reused'), tt`${(F.wBack * perSol).toFixed(1)} L a sol (${Math.round(PLANT.RECYCLE * 100)}%)`], [tt('The crew breathe'), tt`${(F.o2Use * perSol).toFixed(1)} kg of oxygen a sol`]);
    else if (id === 'water') st.push([tt('In the tanks'), tt`${S.water.toFixed(0)} of ${S.waterCap} L`], [tt('From the ice well'), tt`${(F.wWell * perSol).toFixed(1)} L a sol`], [tt('The crew use'), tt`${(F.wUse * perSol).toFixed(1)} L a sol`]);
    else if (id === 'greenhouse') st.push([tt('Fresh food grown'), tt`${(F.foodGrow * perSol).toFixed(2)} kg a sol`], [tt('The crew eat'), tt`${(F.foodUse * perSol).toFixed(2)} kg a sol`], [tt('Warmth'), S.habTemp > 12 ? tt('good') : tt('too cold: the plants stop growing')]);
    else if (id === 'lab') { if (S.on.lab) st.push([tt('Air temperature'), `${Math.round(F.tempC)}°C`], [tt('Air pressure'), tt`${(F.pressure / 100).toFixed(1)} mb (Earth: 1013)`], [tt('Wind'), `${S.wind.toFixed(1)} m/s`], [tt('Dust in the sky'), S.tau.toFixed(2)], [tt('Sun'), sn.up ? tt`${Math.round(sn.elev)}° up` : tt('below the horizon')], [tt('Season'), (sn.ls < 90 ? tt`Ls ${Math.round(sn.ls)}° (northern spring)` : sn.ls < 180 ? tt`Ls ${Math.round(sn.ls)}° (northern summer)` : sn.ls < 270 ? tt`Ls ${Math.round(sn.ls)}° (northern autumn)` : tt`Ls ${Math.round(sn.ls)}° (northern winter)`)]); else st.push([tt('Weather mast'), tt('no readings: the lab is off')]); }
    else if (id === 'medical') st.push([tt('Crew health'), `${Math.round(S.health)}%`], [tt('Radiation dose so far'), `${S.dose.toFixed(2)} mSv`], [tt('Dose rate outdoors'), tt`${MARS.RAD_OUT} mSv a day`], [tt('Time spent outside'), hrs(S.stats.evaHours)]);
    else if (id === 'garage') { st.push([tt('Rover battery'), `${Math.round(S.car.charge * 100)}%${S.car.charging ? ' · ' + tt('charging') : ''}`], [tt('Driven so far'), `${S.stats.km.toFixed(2)} km`]); act.push({ label: tt('Show me the rover'), run: () => G.pointTo('car') }); }
    else if (id === 'airlock') st.push([tt('Outside'), tt`${(F.pressure / 100).toFixed(1)} mb · ${Math.round(F.tempC)}°C · 95% carbon dioxide`], [tt('Inside'), tt`about 700 mb · ${Math.round(S.habTemp)}°C`], [tt('Rooms you can walk into'), tt('the Command Habitat: your crew is in there')]);
    else if (id === 'comms') st.push([tt('Radio time to Earth'), S.on.comms ? tt`${F.lightMin.toFixed(1)} minutes each way` : tt('no link: the tower is off')], [tt('A question and its answer'), S.on.comms ? tt`at least ${(F.lightMin * 2).toFixed(0)} minutes` : '—']);
    else if (id === 'storage') st.push([tt('Oxygen'), `${S.o2.toFixed(1)} / ${S.o2Cap} kg`], [tt('Water'), `${S.water.toFixed(0)} / ${S.waterCap} L`], [tt('Food'), `${S.food.toFixed(0)} kg`], [tt('Spare parts'), String(S.mat)], [tt('If switched off'), tt('the food warms up and slowly spoils')]);
    else if (id === 'isru') st.push([tt('Oxygen made'), tt`${(F.o2Make * 1000).toFixed(0)} g an hour · ${(F.o2Make * perSol).toFixed(1)} kg a sol`], [tt('The crew breathe'), tt`${(F.o2Use * perSol).toFixed(1)} kg a sol`], [tt('In the tanks'), `${S.o2.toFixed(1)} / ${S.o2Cap} kg`], [tt('MOXIE on Perseverance made'), tt('up to 12 g an hour')]);
    else if (id === 'thermal') st.push([tt('Outside'), `${Math.round(F.tempC)}°C`], [tt('Rooms'), `${Math.round(S.habTemp)}°C`], [tt('Today'), tt`${MARS.T_MIN}°C before dawn to ${MARS.T_MAX}°C in the afternoon`]);
    if (LOADS[id]) act.push(id === 'cmd' ? { label: tt('The Command Habitat cannot be switched off'), sub: tt('Its computers run every other building.'), disabled: true } : toggle(id));
    if ((id === 'airlock' || id === 'cmd') && !inRoom) act.unshift({ label: tt('Go inside the Command Habitat'), sub: tt('Through the airlock. Indoors your suit comes off.'), norec: !!S.seen.room, run: goInside });
    if (SCI[id]) act.push({ label: tt('Try it in the Mars Science Center'), sub: tt('Move the sliders and see the sum behind this building.'), norec: true, run: () => openScience(SCI[id]) });
    MIS.panel(id, st, act); st.push([tt('What kind of fact is this?'), pill(I.cls)]);
    await ui.panel(I.name, { stats: st, actions: act, note: I.note, img: `mars/mr_${id}`, closeRec });
    if (first && id !== 'cmd' && !MIS.on()) { const left = TOUR.filter((b) => !S.seen[b]).length; ui.toast(left === 1 ? tt`${INFO[id].name} visited. 1 building still to see.` : left ? tt`${INFO[id].name} visited. ${left} buildings still to see.` : tt('You have visited all 14 buildings!'), 'good'); }
  }

  // ---------- maps: the corner map and the Map window live in js/mars/map.js ----------
  const MAP = makeMarsMap({ G, ui, pill, INFO, SHORT, POI, TOUR, state: () => S, crew: () => crew, inRoom: () => inRoom }), bigMap = (start) => MAP.open(start);
  // ---------- the Mars Science Center: six things to try by hand (js/mars/science.js, fetched the first time it is opened) ----------
  const SCI = { power: 'solar', isru: 'oxygen', water: 'water', airlock: 'pressure', lab: 'gravity', cmd: 'rocket' };   // which demonstration belongs to which building
  async function openScience(topic) {
    const m = await import('./science.js'); let sc = null;
    await ui.window({ title: tt('Mars Science Center'), wide: true, html: '', onMount: (w) => { sc = m.mountScienceCenter(w.querySelector('.win-b'), { topic, tH: S.t }); } });
    if (sc) sc.destroy();   // the window has closed: stop its drawing
  }
  const facts = () => ui.window({ title: tt('Mars facts'), wide: true, onMount: (w) => { w.querySelector('#sci-open').onclick = () => { ui.close(); openScience('gravity'); }; }, html: [[tt('Gravity'), tt`${MARS.GRAVITY} m/s²: 38% of Earth's. You weigh more than twice what you did on the Moon.`, 'obs'], [tt('A day (a sol)'), tt('24 hours 39 minutes 35 seconds'), 'obs'], [tt('A year'), tt('687 Earth days, or 668.6 sols'), 'obs'], [tt('Air'), tt('95% carbon dioxide, at 6.36 mb on average: under 1% of Earth\'s pressure'), 'obs'], [tt('Temperature'), tt('about −59°C on average'), 'obs'], [tt('Sunlight'), tt('586 W/m² above the air: 43% of what Earth gets'), 'obs'], [tt('Sky'), tt('butterscotch by day, blue around the setting Sun: the fine dust sends blue light forward'), 'obs'], [tt('Dust storms'), tt('In June 2018 one covered the whole planet and ended the Opportunity rover\'s mission'), 'obs'], [tt('Radiation'), tt('0.67 mSv a day on the surface, measured by Curiosity'), 'obs'], [tt('Radio time to Earth'), tt('3 to 22 minutes each way'), 'obs'], [tt('Oxygen from the air'), tt('MOXIE made 122 g on the Perseverance rover'), 'demo'], [tt('Fission power'), tt('a 10 kW unit is a NASA design; a small one was tested on Earth in 2018'), 'prop'], [tt('This outpost'), tt('its buildings, crew and stores'), 'game']].map(([a, b, k]) => `<div class="stat"><span>${a}</span><b>${b} ${pill(k)}</b></div>`).join('') + `<p style="margin:12px 0 4px"><button class="mini-b" id="sci-open">${tt('Open the Mars Science Center: six things to try by hand')}</button></p><div class="learn">${tt('Sources for every number: docs/MARS_SCIENCE.md in the project.')}</div>` });

  // ---------- HUD ----------
  const gauge = (id, v, bar, sub, state) => { $(`#g-${id}-v`).textContent = v; $(`#g-${id}-b`).style.width = clamp(bar * 100, 0, 100) + '%'; const s = $(`#g-${id}-s`); if (s.dataset.h !== sub) { s.dataset.h = sub; s.innerHTML = sub; } const g = $('#g-' + id); g.classList.toggle('warn', state === 1); g.classList.toggle('crit', state === 2); };
  function hud(dt) {
    // names over the buildings and the places you have found
    const w = innerWidth, h = innerHeight, c3 = world.camera, tid = G.goal && G.goal.id, shown = [];
    for (const id in labels) { const q = labels[id], dist = Math.hypot(q.x - P.pos.x, q.z - P.pos.z), goal = tid === id; v3.set(q.x, world.heightAt(q.x, q.z) + q.up, q.z).project(c3);
      const show = !inRoom && (!q.poi || S.seen[id]) && v3.z < 1 && Math.abs(v3.x) < 1.1 && (goal || dist < (q.poi ? 120 : 48)); if (!show) { q.el.classList.add('hidden'); continue; }
      shown.push({ l: q.el, name: q.name, dist, goal, bad: !goal && ((!!LOADS[id] && !S.on[id]) || MIS.broken(id)), x: ((v3.x + 1) / 2) * w, y: ((1 - v3.y) / 2) * h }); }
    ui.placeLabels(shown);   // the same rule as on the Moon: never over the HUD, never on top of a nearer label, the goal always shown
    hudT += dt; if (hudT < 0.2) return; hudT = 0;
    const F = S.flow, sn = F.sun, bp = S.battery / F.cap, ck = marsClock(S), perSol = MARS.SOL_H, toSol = (d) => (d * 24) / MARS.SOL_H;
    gauge('power', Math.round(bp * 100) + '%', bp, F.net >= 0 ? tt`+${F.net.toFixed(1)} kW · Sun ${F.solar.toFixed(0)} kW` : tt`${F.net.toFixed(1)} kW · ${hrs(Math.min(F.battHours, 999))} left`, F.eff < 1 ? 2 : F.net < 0 && bp < 0.12 ? 2 : F.net < 0 && bp < 0.3 ? 1 : 0);
    gauge('air', S.tau.toFixed(2), S.tau / 5, S.tau < 1 ? tt('clear sky') : S.tau < 2.5 ? tt('dusty sky') : tt('dust storm'), S.tau > 2.5 ? 2 : S.tau > 1 ? 1 : 0);
    gauge('o2', S.o2.toFixed(1) + ' kg', S.o2 / S.o2Cap, tt`${F.o2Net >= 0 ? '+' : ''}${(F.o2Net * perSol).toFixed(1)} a sol${F.o2Net < 0 ? ' · ' + sols(toSol(F.o2Days)) : ''}`, S.o2 < 2 ? 2 : F.o2Net < 0 && toSol(F.o2Days) < 3 ? 1 : 0);
    gauge('water', S.water.toFixed(0) + ' L', S.water / S.waterCap, tt`${F.wNet >= 0 ? '+' : ''}${(F.wNet * perSol).toFixed(1)} L a sol`, S.water < 20 ? 2 : F.wNet < 0 && toSol(F.waterDays) < 5 ? 1 : 0);
    gauge('food', S.food.toFixed(0) + ' kg', Math.min(1, S.food / 600), sols(toSol(F.foodDays)), S.food < 5 ? 2 : toSol(F.foodDays) < 20 ? 1 : 0);
    gauge('rad', S.dose.toFixed(2) + ' mSv', S.dose / 50, tt`${MARS.RAD_OUT} mSv a day outdoors`, 0);
    gauge('mat', String(S.mat), Math.min(1, S.mat / 20), tt('spare parts'), 0);
    $('#c-day').textContent = tt`Sol ${ck.sol}`; $('#c-time').textContent = ck.text; $('#c-zone').textContent = inRoom ? tt`INDOORS ${Math.round(S.habTemp)}°C` : tt`ARCADIA ${Math.round(F.tempC)}°C`;
    const eh = (mh) => (mh * MARS.SOL_H) / 24; $('#c-sun').innerHTML = sn.up && sn.hour < sn.set ? IC.sun + tt` sunset in ${hrs(eh(sn.set - sn.hour))}` : IC.moon + tt` sunrise in ${hrs(eh((sn.rise - sn.hour + 24) % 24))}`;
    $('#c-rescue').innerHTML = IC.dish + ' ' + (S.on.comms ? tt`Earth: ${F.lightMin.toFixed(1)} min by radio` : tt('no link to Earth'));
    const key = Math.round(sn.rise * 10) + ':' + Math.round(sn.set * 10); if (hud.k !== key) { hud.k = key; const a = (sn.rise / 24) * 100, b = (sn.set / 24) * 100; $('#tl-fill').style.background = `linear-gradient(90deg,#1b1420 0%,#1b1420 ${a - 2}%,#7fa8d8 ${a}%,#e2b98a ${a + 4}%,#e8c79a ${b - 4}%,#7fa8d8 ${b}%,#1b1420 ${b + 2}%,#1b1420 100%)`; $('#th-svg').innerHTML = ''; $('#tl-storm').style.display = 'none'; $('#th-now').style.display = 'none'; $('#clock').title = tt('One sol, midnight to midnight. A sol is 24 hours 39 minutes long.'); }
    $('#tl-now').style.left = sn.frac * 100 + '%';
    $('#hp').style.width = S.health + '%'; $('#hp').style.background = S.health > 60 ? 'var(--green)' : S.health > 30 ? 'var(--amber)' : 'var(--red)';
    $('#carry').innerHTML = P.in === 'car' ? `${IC.car} ${tt('Rover')} ${Math.round(S.car.charge * 100)}%` : `${IC.crew} ${S.crew}`;
    const al = G.alerts().sort((x, y) => (x.key ? 0 : 1) - (y.key ? 0 : 1)), ak = al.map((x) => x.text + x.sub).join('|');
    if (ak !== hud.al) { hud.al = ak; const box = $('#alerts'); box.innerHTML = ''; al.slice(0, 5).forEach((x) => { const d = el('div', 'alert ' + (x.kind || ''), `${x.text}<small>${x.sub || ''}</small>`); d.onclick = () => x.go && G.pointTo(x.go); box.appendChild(d); }); }
    ui.banner(S.tau > 2.5 ? (S.flow.sun.up ? tt('DUST STORM · the solar field is making very little power') : tt('DUST STORM · after sunrise the solar field will make very little power')) : null, true); MIS.hud();
    MAP.mini(ui.mm, 340, 340);
  }
  function goal() {
    const g = G.goal; $('#goal-x').classList.toggle('hidden', !g); world.guideForce = !!g; if (!g) { world.setTarget(null); ui.objective(null); return; }
    if (g.id === 'car') { g.x = G.car.x; g.z = G.car.z; } const d = Math.hypot(g.x - P.pos.x, g.z - P.pos.z);
    if (d < (P.in ? 12 : 6) && !inRoom) { G.goal = null; return; } world.setTarget(inRoom ? { ...g, x: T.ROOM.door[0], z: T.ROOM.door[1] } : g);   // indoors the yellow line leads to the hatch: everything it points at is outside
    ui.objective(`<i class="dot"></i><b>${g.name}</b> ${d.toFixed(0)} m${g.text ? ' · ' + g.text : ''}`);
  }

  // ---------- one frame ----------
  function frame(dt) {
    G.inside = inRoom; G.inCrater = false; S.suitOn = !inRoom; S.zone = inRoom ? 'in' : 'top';   // indoors the sim counts the lower radiation dose
    deps.updatePlayer(dt); MAP.tick(); if (inRoom) T.keepInRoom(P.pos); deps.placeVehicles(dt); deps.updateRego(dt); if (inRoom) { T.keepInRoom(G.regoPos, 1); G.rego.group.position.copy(G.regoPos); } updateCrew(dt); deps.updateCamera(dt);
    const run = G.simOn && !ui.busy && !G.paused && !passing; if (run) MIS.step((dt / S.m.hourLen) * G.speedMul); else if (!passing) S.flow = marsFlows(S);
    // the rover: it charges on its pad, and warns you before you drive too far to get back
    { const c = G.car, home = Math.hypot(c.x - T.ROVER_PAD.x, c.z - T.ROVER_PAD.z); S.car.charging = S.on.garage && home < 4.6 && Math.abs(c.v) < 0.6 && S.car.charge < 1;
      if (P.in === 'car' && home > 60 && S.car.charge > 0 && S.car.charge < (home / 2600) * 1.3 + 0.05) G.warn('mrange', tt`<b>Turn back now!</b> The rover has ${Math.round(S.car.charge * 100)}% left, and the garage is ${Math.round(home)} m away.`, 'alert', 30000);
      if (P.in === 'car' && S.car.charge <= 0) G.warn('mflat', tt('<b>The rover\'s battery is flat.</b> It can still crawl. Head for the round pad by the garage.'), 'worried', 40000); }
    // places found
    if (run && !inRoom) for (const p of POI) if (!S.seen[p.id] && near(p.x, p.z, p.r)) { seen(p.id, p.text, p.id === 'ice' ? 'joy' : 'happy'); ui.toast(tt`Found: ${p.name}. It is on your map now.`, 'good'); }
    if (run) { nagT += dt; if (nagT > 70 && $('#rego').classList.contains('hidden') && !G.goal && G.alerts().some((a) => a.key)) G.advise(); saveT += dt; if (saveT > 20) { saveT = 0; G.save(); } }
    if (run && !inRoom) { const mw = world.mars; if (mw.earthUp && !S.seen.earth) seen('earth', mw.earthMorning ? tt('Look low in the east, where the Sun will rise. That bright blue-white star is <b>Earth</b>. From Mars it never strays far from the Sun, so you only see it before dawn or after dusk. Everyone you know is on that dot.') : tt('Look low in the west, where the Sun went down. That bright blue-white star is <b>Earth</b>. From Mars it never strays far from the Sun, so you only see it before dawn or after dusk. Everyone you know is on that dot.'), 'joy');
      else if (mw.phobosUp && !S.seen.phobos) seen('phobos', tt('See the small light low in the south? That is <b>Phobos</b>, the bigger of Mars\'s two moons. It goes round faster than Mars turns, so it rises in the <b>west</b> and sets in the east, twice a sol.')); }
    goal(); TRAIN.tick();
    world.update(dt, S, P.pos, { player: P.pos, carOn: P.in === 'car' });
    G._danger = clamp(G.alerts().filter((a) => a.key).length * 0.45, 0, 1); G.audio.update(dt, { indoors: inRoom, suit: !inRoom, power: S.flow.eff, vehicle: P.in, speed: P.in === 'car' ? G.car.v : Math.hypot(P.vel.x, P.vel.z), thrust: 0, digging: false, danger: G._danger });
    world.render(); hud(dt); ui.prompt(!ui.busy && !passing ? G.promptText() : null);
  }

  // ---------- saving: Mars has its own save, apart from the Moon's ----------
  G.save = () => { try { if (!S || passing || TRAIN.active()) return false; localStorage.setItem(saveKey(), JSON.stringify({ v: 1, S: marsSerialize(S), car: { x: G.car.x, z: G.car.z, yaw: G.car.yaw }, p: inRoom ? { x: T.ROOM.out[0], z: T.ROOM.out[1], in: null } : { x: P.pos.x, z: P.pos.z, in: P.in } })); return true; } catch (e) { return false; } };
  G.clearSave = () => { try { localStorage.removeItem(saveKey()); } catch (e) {} };

  async function start({ load = false, mode = 'explore', train = false } = {}) {
    let o = null; if (load) { try { o = JSON.parse(localStorage.getItem(mode === 'survive' ? SAVE_SURV : SAVE)); } catch (e) { o = null; } }
    await world.setPlanet('mars'); makeCrew(); inRoom = false; world.mars.setInside(false); G.astro.setSuit(true);
    S = G.S = o ? marsDeserialize(o.S) : createMars((Math.random() * 2 ** 31) >>> 0); if (!o && mode === 'survive' && !train) MIS.begin(); if (!o && train) TRAIN.begin(mode); G.planet = 'mars'; G.grav = MARS.GRAVITY; document.body.classList.add('mars'); G.applyVoice?.();
    G.edgeText = tt('That is the edge of this map. The plain goes on for hundreds of kilometres: look at the Region tab of the Map.');
    const car = o ? o.car : { x: T.ROVER_PAD.x, z: T.ROVER_PAD.z, yaw: Math.PI }; Object.assign(G.car, car, { v: 0, cargo: [] }); G.car.dyn = null;
    const p = o ? o.p : T.SPAWN; P.zone = 'top'; P.in = null; P.carry = null; P.vel.set(0, 0, 0); P.pos.set(p.x, world.heightAt(p.x, p.z), p.z); P.face = Math.PI; cam.yaw = 0.35; cam.pitch = 0.16; cam.dist = 9; G.regoPos.set(p.x + 2, P.pos.y, p.z + 1.5); if (o && o.p.in === 'car') { P.in = 'car'; P.pos.set(G.car.x, world.heightAt(G.car.x, G.car.z), G.car.z); }
    // the HUD's gauges, renamed for Mars
    for (const [id, name, tip] of [['air', tt('Dust'), tt('How much dust hangs in the air (its "optical depth"). About 0.5 on a clear day, 4 in a regional storm, 10.8 at the peak of the 2018 planet-wide storm. More dust means less solar power.')], ['power', tt('Power'), tt('Energy stored in the batteries. The solar field works by day; the small fission unit works day and night.')], ['o2', tt('Oxygen'), tt('Oxygen in the tanks. The ISRU Facility makes it from the carbon dioxide in the Martian air.')], ['water', tt('Water'), tt('Water in the tanks. The ice well melts new water; the Life Support Module cleans used water.')], ['food', tt('Food'), tt('Food in the store, in kilograms. The greenhouse adds a little fresh food each sol.')], ['rad', tt('Radiation'), tt('The dose you have taken so far. Mars has no magnetic field and little air, so more radiation reaches the ground than on Earth.')], ['mat', tt('Parts'), tt('Spare parts for repairs.')]]) { const g = $('#g-' + id); if (g) { g.querySelector('.g-top span').textContent = name; g.dataset.tip = tip; } }
    for (const b of T.BUILDINGS) labels[b.id] = { x: b.x, z: b.z, up: b.id === 'comms' ? 21 : b.id === 'cmd' ? 13 : 8, name: INFO[b.id].name };
    for (const q of POI) labels[q.id] = { x: q.x, z: q.z, up: 6, name: q.name, poi: true };
    for (const id in labels) { labels[id].el = el('div', 'label hidden'); $('#labels').appendChild(labels[id].el); }
    $('#b-power').onclick = () => !ui.busy && panel('power'); $('#b-map').onclick = () => !ui.busy && bigMap(); $('#b-ask').onclick = () => !ui.busy && G.advise(); $('#b-data').onclick = () => !ui.busy && facts(); $('#clock').onclick = () => !ui.busy && panel('lab'); $('#goal-x').onclick = () => { G.goal = null; };
    $('#suit').className = 'glass on'; $('#suit').textContent = tt('SUIT ON'); $('#title').classList.add('hidden'); $('#mission').classList.add('hidden');
    S.flow = marsFlows(S); world.update(0.016, S, P.pos, {}); ui.showHud(true); G.state = 'play'; G.simOn = true; G.save();
    if (o) ui.bubble(tt('Welcome back to Mars! Everything is as you left it.'), 'joy', 8);
    else if (TRAIN.active()) { await ui.say([{ who: 'rego', mood: 'joy', text: tt('<b>Arcadia Planitia, Mars.</b> Four people live at this outpost, so far from Earth that a radio call takes many minutes to arrive. You are the newest.') }, { who: 'rego', text: tt('Mateo, Noor and Lena keep it running. Today I show you how it works.') }]); TRAIN.intro(); }
    else if (MIS.on()) MIS.intro();
    else { ui.bubble(tt('<b>Welcome to Mars!</b> This is Arcadia Planitia: a cold, flat plain with ice under the soil. The sky is butterscotch because fine dust hangs in the thin air. Follow the <b>yellow line</b> on the ground to the <b>Command Habitat</b> and press <b>E</b> at its door. Press <b>H</b> whenever you want my advice, and <b>M</b> for the map.'), 'joy', 20); G.pointTo('cmd'); }
  }
  const key = (k) => { if (k === 'Tab') panel('power'); else if (k === 'm') bigMap(); else if (k === 'h') G.advise(); else if (k === 'n') facts(); else if (k === 'v') deps.toggleView(); else if (k === 'p') deps.togglePause(); };
  return { start, frame, key, hasSave: () => { try { return !!localStorage.getItem(SAVE); } catch (e) { return false; } }, panel, bigMap, map: MAP, mission: MIS, training: TRAIN };
}
export const marsHasSave = () => { try { return !!localStorage.getItem(SAVE); } catch (e) { return false; } };
