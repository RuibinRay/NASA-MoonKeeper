// MOONKEEPER 2 — game constants.
// REAL numbers are documented with their sources in docs/SCIENCE_AND_SOURCES.md (kept out of the game on purpose).
// GAME numbers are simplified machine sizes chosen so that choices matter in one play session.

export const K = {
  // ---- REAL numbers -------------------------------------------------------------
  LAT: 8.335, LON: 33.222,        // Mare Tranquillitatis Pit location (deg N, deg E)
  LUNAR_DAY: 29.53,               // one full lunar day-night cycle, in Earth days
  GRAVITY: 1.62,                  // m/s², about 1/6 of Earth
  O2_PER_DAY: 0.84,               // kg of oxygen one person breathes per day
  WATER_PER_DAY: 3.8,             // litres per person per day (about one gallon)
  H2O_PER_KG_O2: 1.125,           // litres of water split to make 1 kg of oxygen (2 H2O -> 2 H2 + O2)
  MEALS_PER_DAY: 3,
  DOSE_SURFACE_PER_H: 0.057,      // mSv per hour standing on the lunar surface
  DOSE_DEEP_PER_H: 0.0003,        // mSv per hour under tens of metres of rock
  DOSE_LIMIT: 250,                // mSv: agency limit for a solar particle event
  PIT_TEMP_C: 17,                 // °C, steady temperature in shaded lunar pits
  SURF_DAY_C: 127, SURF_NIGHT_C: -173,
  LIGHT_DELAY_S: 1.28,            // seconds for radio to cross Earth-Moon distance, one way
  EARTH_MOON_KM: 384400,
  EARTH_ANGULAR_DEG: 1.9,
  AIR_KPA: 101,                   // normal air pressure at sea level on Earth (kilopascals)
  // ---- GAME numbers -------------------------------------------------------------
  REACTOR_KW: 5,                  // one small fission reactor that works day and night
  PANEL_KW: 3.2,                  // each working solar panel in full sunlight
  EARTH_DRAW_SCALE: 2.5,
  O2_PER_KPA: 0.012,              // kg of tank air needed to raise station pressure by 1 kPa
};

export const BASE_LOAD = 2; // kW for lights, fans and computers that can never be switched off

// Machines the player budgets power between. Index = level (0 = off).
export const SYS = {
  o2gen:    { name: 'Oxygen Maker', ico: 'o2', room: 'oxygen', kw: [0, 2, 4, 6], out: [0, 0.7, 1.4, 2.1],
              blurb: 'Splits water into oxygen with electricity (electrolysis). Costs power AND water. It lives in the Oxygen Room.' },
  recycler: { name: 'Water Recycler', ico: 'water', room: 'water', kw: [0, 1, 2, 3.5], rate: [0, 0.75, 0.9, 0.98],
              blurb: 'Cleans used water (even sweat and pee!) so you can drink it again.' },
  farm:     { name: 'Farm Grow Lights', ico: 'plant', kw: [0, 3, 6, 9], grow: [0, 0.5, 1, 1.5], water: [0, 3, 6, 9], o2: [0, 0.08, 0.16, 0.24],
              blurb: 'Underground there is no sunlight, so potatoes and tomatoes need electric light. Plants give food and a little oxygen, and drink water.' },
  isru:     { name: 'Moon-Dust Oxygen Plant', ico: 'fire', kw: [0, 9], out: [0, 2.2], outside: true,
              blurb: 'Melts moon soil to free the oxygen locked inside it. Needs no water, but it is very power-hungry. It stands topside.' },
  heat:     { name: 'Topside Heaters & Coolers', ico: 'temp', kw: [0, 1.5, 3, 5],
              blurb: 'Keeps machines on the surface from freezing at night or cooking at noon.' },
  comms:    { name: 'Earth Link', ico: 'dish', kw: [0, 2, 4],
              blurb: 'Radio dish to Mission Control. Level 1: early storm warnings. Level 2: longer warnings.' },
};

// hourLen = real seconds per game hour. gap = game days between surprise events.
export const MODES = {
  cadet:     { key: 'cadet', name: 'Cadet', ages: 'Ages 7–10', tag: '4 days · a gentle mission', days: 4, sunsetDay: 1.7, hourLen: 9, drain: 0.85, reactor: 6,
               ok: 4, broken: 4, batteryCap: 420, o2: 3.4, water: 28, cans: 16, meals: 4, feed: 5, mat: 16, gap: [0.42, 0.62], stormMul: 0.65, mgEase: 1.35, wreck: ['tomato', 'bathroom'] },
  pilot:     { key: 'pilot', name: 'Pilot', ages: 'Ages 11–14', tag: '7 days · one long night', days: 7, sunsetDay: 2.6, hourLen: 8, drain: 1, reactor: 5,
               ok: 3, broken: 5, batteryCap: 380, o2: 3.0, water: 24, cans: 14, meals: 2, feed: 4, mat: 11, gap: [0.4, 0.6], stormMul: 1, mgEase: 1, wreck: ['tomato', 'bathroom', 'storage'] },
  commander: { key: 'commander', name: 'Commander', ages: 'Ages 15–18', tag: '10 days · scarce materials', days: 10, sunsetDay: 3.4, hourLen: 7, drain: 1.08, reactor: 5,
               ok: 2, broken: 6, batteryCap: 360, o2: 2.7, water: 22, cans: 12, meals: 0, feed: 3, mat: 8, gap: [0.36, 0.55], stormMul: 1.25, mgEase: 0.85, wreck: ['tomato', 'bathroom', 'storage', 'quarters'] },
  unlimited: { key: 'unlimited', name: 'Unlimited', ages: 'Any age', tag: 'No end · endless materials · build a Moon town', days: Infinity, sunsetDay: 9, hourLen: 8, drain: 1, reactor: 8,
               ok: 3, broken: 5, batteryCap: 380, o2: 3.0, water: 24, cans: 14, meals: 2, feed: 4, mat: Infinity, gap: [0.5, 0.8], stormMul: 1, mgEase: 1, wreck: ['tomato', 'bathroom'] },
};

// ---------- the map ----------
// Topside: x = east, z = south (metres). The Deep (lava tube station) has its own x/z, x runs along the tunnel.
export const PIT = { x: 0, z: 118, r: 50 };
export const SPAWN = { x: 52, z: 22 };
export const TUBE = { halfLen: 125, halfWidth: 40, height: 44, y: -300, skyX: -104, skyR: 15 };
export const HALL = { x0: -60, x1: 76, z0: -2.6, z1: 2.6, h: 4.6 };
// The airlock is the station's front door: outside it is the open cave (no air, a steady 17°C).
export const AIRLOCK = { x0: -70, x1: -60, z0: -5, z1: 5, h: 5 };
export const CAVE_C = 17, INDOOR_C = 21;
export const ROOM_H = 6.2;
export const ROOMS = [
  { id: 'workshop', name: 'Workshop',       side: -1, x0: -56, x1: -32, door: -44, mat: 4, hours: 4, what: 'the Fix-It bench and the robot-arm builder' },
  { id: 'control',  name: 'Control Center', side: -1, x0: -28, x1: -6,  door: -17, mat: 4, hours: 4, what: 'the big map, door controls and crew jobs' },
  { id: 'kitchen',  name: 'Kitchen',        side: -1, x0: -2,  x1: 16,  door: 7,   mat: 3, hours: 3, what: 'cooking' },
  { id: 'oxygen',   name: 'Oxygen Room',    side: -1, x0: 20,  x1: 38,  door: 29,  mat: 5, hours: 4, what: 'the Oxygen Maker' },
  { id: 'potato',   name: 'Potato Farm',    side: -1, x0: 42,  x1: 72,  door: 57,  mat: 4, hours: 4, what: 'potatoes' },
  { id: 'storage',  name: 'Battery Store',  side: 1,  x0: -56, x1: -38, door: -47, mat: 4, hours: 3, what: 'the battery bank' },
  { id: 'quarters', name: 'Bunk Room',      side: 1,  x0: -34, x1: -14, door: -24, mat: 3, hours: 3, what: 'beds for sleeping' },
  { id: 'bathroom', name: 'Bathroom',       side: 1,  x0: -10, x1: 2,   door: -4,  mat: 3, hours: 3, what: 'the toilet and shower that feed the recycler' },
  { id: 'water',    name: 'Water Room',     side: 1,  x0: 6,   x1: 22,  door: 14,  mat: 4, hours: 4, what: 'the Water Recycler' },
  { id: 'animal',   name: 'Animal Bay',     side: 1,  x0: 26,  x1: 44,  door: 35,  mat: 4, hours: 4, what: 'the hens and the fish tank' },
  { id: 'tomato',   name: 'Tomato Farm',    side: 1,  x0: 48,  x1: 72,  door: 60,  mat: 4, hours: 4, what: 'tomatoes' },
];
export const roomRect = (r) => ({ x0: r.x0, x1: r.x1, z0: r.side < 0 ? -24 : 6.4, z1: r.side < 0 ? -6.4 : 24 });
export const roomSpot = (r) => [r.door, r.side * 9.5];           // where the room's console stands
export const doorSpot = (r) => [r.door + 2.6, r.side * 3.6];     // the door switch in the tunnel
export const BENCH = [-50, -19], FAB = [-37, -19], FAB_OUT = [-37, -11];

// 24 solar mounts: 4 rows of 6
export const MOUNTS = []; for (let row = 0; row < 4; row++) for (let i = 0; i < 6; i++) MOUNTS.push([-40 + i * 16, -58 - row * 14]);
export const CAR_PAD = [-24, 40], SHIP_PAD = [-48, 46];

// The surface base: [x, z, radius] for domes, [x, z] for buildings. Laid out west and east of the road from the Solar Field to the Pit Elevator.
export const BASE = { hub: [-34, -8, 11], green: [26, -10, 8], tower: [-34, -31], batt: [-58, -28], garage: [-40, 15], lab: [28, 14], water: [46, -12], mine: [86, -30], comm: [-78, -18] };
export const STATIONS = [
  { id: 'gate',  zone: 'top',  name: 'Pit Elevator',        ico: 'lift',   pos: [0, 60],    r: 7 },
  { id: 'depot', zone: 'top',  name: 'Cargo Depot',         ico: 'box',    pos: [16, 52],   r: 6 },
  { id: 'solar', zone: 'top',  name: 'Solar Field',         ico: 'sun',    pos: [0, -42],   r: 7 },
  { id: 'dish',  zone: 'top',  name: 'Earth Link Dish',     ico: 'dish',   pos: [-58, -4],  r: 8 },
  { id: 'yard',  zone: 'top',  name: 'Heater Hub',          ico: 'temp',   pos: [-78, -48], r: 8 },
  { id: 'isru',  zone: 'top',  name: 'Moon-Dust Oxygen Plant', ico: 'fire', pos: [56, -30],  r: 8 },
  { id: 'park',  zone: 'top',  name: 'Rover Garage Pads',   ico: 'bolt',   pos: [-36, 34],  r: 6 },
  { id: 'pad',   zone: 'top',  name: 'Landing Pad',         ico: 'rocket', pos: [72, 34],   r: 9 },
  { id: 'hab',   zone: 'top',  name: 'Habitat Dome',        ico: 'room',   pos: [-20.5, -6],  r: 5, info: 'The big glass dome is the heart of the surface base: a garden, a meeting place and a window on Earth. Tube corridors join it to every other building, so nobody has to put a suit on to visit a neighbour.', hit: 'The meteor shower punched holes in the glass. With no air inside, nobody can live up here now — which is why the food, the beds and the Control Center are all safe underground.' },
  { id: 'tower', zone: 'top',  name: 'Command Tower',       ico: 'room',   pos: [-26.5, -31], r: 5, info: 'From the round deck at the top you can see the whole base, the landing pad and every rover. It talks to ships that are coming in to land.', hit: 'Its windows are dark. All its jobs have moved to the Control Center underground.' },
  { id: 'batt',  zone: 'top',  name: 'Battery Bank',        ico: 'bolt',   pos: [-58, -35],   r: 5, info: 'Solar panels only work in sunshine, and a lunar night lasts two weeks. Big batteries save up daytime power for the dark.', hit: 'These cells were cracked by flying rock. The battery racks that still work are in the Battery Store underground.' },
  { id: 'green', zone: 'top',  name: 'Greenhouse Dome',     ico: 'room',   pos: [26, -21.5],  r: 5, info: 'Plants make food and fresh oxygen, and they recycle water. Real astronauts have grown lettuce, radishes and chilli peppers in space.', hit: 'The glass is holed and the plants froze in minutes. Your potatoes and tomatoes now grow underground, under lamps.' },
  { id: 'lab',   zone: 'top',  name: 'Research Lab',        ico: 'room',   pos: [19, 14],     r: 5, info: 'Scientists here study moon rock, test new building materials and look for ice. Everything we learn makes the next base better.', hit: 'The lab is sealed and dark until the rescue ship brings a repair crew.' },
  { id: 'wplant', zone: 'top', name: 'Water Plant',         ico: 'room',   pos: [46, -18],    r: 4.5, info: 'Water is the most useful thing on the Moon: you can drink it, grow food with it, and split it into oxygen to breathe and hydrogen for rocket fuel. There is ice in the cold, dark craters near the Moon\'s poles.', hit: 'The pipes are cracked. The water you have left is in the tanks underground, so recycle every drop.' },
  { id: 'mine',  zone: 'top',  name: 'Moon-Dust Mine',      ico: 'room',   pos: [78, -23],    r: 6, info: 'Diggers scoop up moon soil and a conveyor carries it to the Oxygen Plant next door. Nearly half the weight of moon soil is oxygen, locked inside the rock.', hit: 'The digger still works. Repair the Oxygen Plant and it will feed it again.' },
  { id: 'lift',  zone: 'deep', name: 'Elevator to Surface', ico: 'lift',   pos: [TUBE.skyX, 0], r: 6 },
  { id: 'suit',  zone: 'deep', name: 'Suit Lockers',        ico: 'room',   pos: [-65.2, -1.6], r: 3.3 },
  { id: 'bench', zone: 'deep', name: 'Fix-It Bench',        ico: 'wrench', pos: BENCH,      r: 4.5 },
  { id: 'fab',   zone: 'deep', name: 'Robot-Arm Builder',   ico: 'arm',    pos: FAB,        r: 4.5 },
  ...ROOMS.filter((r) => r.id !== 'workshop').map((r) => ({ id: r.id, zone: 'deep', name: r.name, ico: 'room', pos: roomSpot(r), r: 4.2, room: true })),
];
// Other countries' stations, hit by the same meteor shower. Each has crates to salvage and one stranded astronaut.
export const SITES = [
  { id: 'aurora',  name: 'Aurora Station', pos: [-520, -300], color: 0x2ad0c0, who: 'ingrid', whoName: 'Ingrid Solberg', job: 'pilot',    perk: 'Vehicles use 30% less charge.',  loot: ['mat', 'mat', 'mat', 'cans', 'water'] },
  { id: 'sakura',  name: 'Sakura Outpost', pos: [480, -380],  color: 0xb070ff, who: 'kenji',  whoName: 'Kenji Mori',     job: 'engineer', perk: 'All building and fixing is 25% faster.', loot: ['mat', 'mat', 'mat', 'mat', 'cans'] },
  { id: 'chandra', name: 'Chandra Base',   pos: [430, 420],   color: 0x58e08a, who: 'anika',  whoName: 'Dr. Anika Rao',  job: 'botanist', perk: 'Crops grow 25% faster.',         loot: ['mat', 'mat', 'mat', 'cans', 'cans', 'water'] },
];
export const ITEMS = {
  panel:   { name: 'solar panel', heavy: true },
  panelB:  { name: 'broken solar panel', heavy: true },
  battery: { name: 'battery module', heavy: true },
  mat:     { name: 'materials crate', gives: 'mat', n: 4 },
  cans:    { name: 'food crate', gives: 'cans', n: 8 },
  water:   { name: 'water tank', gives: 'water', n: 12 },
};
export const ROLES = {
  idle:  { name: 'Rest', tip: 'Does nothing. Costs nothing extra.' },
  farm:  { name: 'Farm duty', tip: 'Picks ripe potatoes and tomatoes, feeds the hens and collects eggs.' },
  cook:  { name: 'Cook', tip: 'Turns raw food into proper meals in the Kitchen.' },
  clean: { name: 'Panel cleaner', tip: 'Keeps dust off the solar panels.' },
  build: { name: 'Builder', tip: 'Makes every fix, build and repair faster.' },
};

// Words explained on the spot. Any of these words inside game text gets a dotted underline + pop-up.
export const GLOSSARY = {
  'regolith': 'Regolith is moon soil: grey, dusty, broken-up rock made by billions of years of meteoroid hits.',
  'lava tube': 'A lava tube is a natural tunnel. Long ago, lava flowed like an underground river; when it drained away it left a hollow cave.',
  'radiation': 'Space radiation is a rain of tiny, super-fast particles from the Sun and deep space. You cannot see or feel it, but too much can harm your body.',
  'mSv': 'mSv (millisievert) measures how much radiation a body has soaked up. On Earth a person gets about 2 mSv in a whole year.',
  'solar flare': 'A solar flare is a giant flash of energy on the Sun. Its light reaches us in about 8 minutes.',
  'electrolysis': 'Electrolysis uses electricity to split water (H₂O) into hydrogen and oxygen gas.',
  'lunar day': 'One lunar day (sunrise to sunrise) lasts about 29.5 Earth days: roughly 2 weeks of sunshine, then 2 weeks of night.',
  'kW': 'kW (kilowatt) is power: how fast energy is being used. A kettle uses about 2 kW.',
  'kWh': 'kWh (kilowatt-hour) is stored energy. 1 kWh runs a 1 kW machine for one hour.',
  'kPa': 'kPa (kilopascal) measures air pressure: how hard the air pushes. On Earth at the beach it is about 101 kPa. In space it is zero.',
  'air pressure': 'Air pressure is the push of air all around you. Your body needs it. In space there is none, so a station must be a sealed bubble of air.',
  'meteoroid': 'A meteoroid is a small space rock. The Moon has no air to burn them up, so even tiny ones hit the ground faster than a bullet.',
  'bulkhead': 'A bulkhead is a strong airtight door. Shut it, and a leak on one side cannot empty the air on the other side.',
  'earthshine': 'Earthshine is sunlight bounced off Earth onto the Moon. A full Earth lights the lunar night far brighter than a full Moon lights ours.',
  'moonquake': 'A moonquake is an earthquake on the Moon. Old Apollo instruments recorded thousands of them.',
};

export const fmt = {
  n: (x, d = 1) => (Math.abs(x) >= 100 ? x.toFixed(0) : x.toFixed(d)),
  temp: (c) => `${Math.round(c)}°C`,
  day: (t) => `Day ${Math.floor(t / 24) + 1}`,
  clock: (t) => { const h = Math.floor(t % 24), m = Math.floor((t % 1) * 60); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; },
  days: (d) => (d === Infinity || d > 99 ? '99+ days' : d >= 10 ? `${d.toFixed(0)} days` : d >= 1 ? `${d.toFixed(1)} days` : `${Math.max(0, d * 24).toFixed(0)} h`),
  hrs: (h) => (h < 1 ? `${Math.round(h * 60)} min` : `${h % 1 ? h.toFixed(1) : h} h`),
  date: (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }),
  mat: (x) => (x === Infinity ? '∞' : String(Math.floor(x))),
};
