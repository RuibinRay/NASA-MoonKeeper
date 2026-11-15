// Writes docs/SCIENCE_AND_SOURCES.md from tools/sources.mjs and the data module.
// The game itself shows no source links (to keep the screen clean for young players); this file is the full reference.
// Usage: node tools/build_docs.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SRC } from './sources.mjs';
import { NASA_STATS, STORMS, QUAKES, IMPACTS, METEORITES } from '../js/nasa-events.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = Object.values(SRC).filter((s) => s.kind === 'data');
const facts = Object.values(SRC).filter((s) => s.kind === 'fact');
const row = (s) => `| ${s.use} | [${s.title}](${s.url}) | ${s.org} |`;
const life = facts.filter((s) => s.status), old = facts.filter((s) => !s.status);
const rowS = (s) => `| ${s.use} | **${s.status}** | [${s.title}](${s.url}) | ${s.org} |`;

const md = `# MOONKEEPER — science notes and data sources

MOONKEEPER is a game, but most of what happens in it is real space science built on open NASA data.
To keep the screen clean for young players, **the game shows no logos, links or citations**. Everything is credited here instead.

_Not an official NASA product. NASA data and imagery are used under the [NASA media guidelines](${SRC.media.url}); no endorsement is implied._

## 1. Real datasets loaded by the game

| What the game does with it | Dataset | Publisher |
|---|---|---|
${data.map(row).join('\n')}
| Earth hanging in the lunar sky | [Blue Marble (SVS 2915)](https://svs.gsfc.nasa.gov/2915) | NASA SVS |

Numbers at the time the data module was built (${NASA_STATS.built}):

- **Solar storms:** ${STORMS.length} real events in the game, chosen from ${NASA_STATS.flaresTotal.toLocaleString()} flares, ${NASA_STATS.sepTotal} particle events, ${NASA_STATS.cmeFast} fast CMEs and ${NASA_STATS.gstTotal} geomagnetic storms in DONKI (${NASA_STATS.donkiRange}). Every storm card shows the real date, flare class and sunspot group.
- **Moonquakes:** all ${QUAKES.length} shallow moonquakes in the Apollo catalog.
- **Meteoroid strikes:** the ${IMPACTS.length} strongest of ${NASA_STATS.apolloImpacts.toLocaleString()} impacts recorded by Apollo seismometers between 1969 and 1977 (${NASA_STATS.apolloEvents.toLocaleString()} catalogued seismic events in total).
- **Meteorites:** ${METEORITES.length} witnessed falls (from ${NASA_STATS.meteoritesTotal.toLocaleString()} records) used as size comparisons.

Rebuild the data: \`node tools/fetch_donki.mjs\` then \`node tools/build_data.mjs\`. Raw downloads live in \`data/raw/\`.

## 2. Which game rule comes from which fact

| Used for | Source | Publisher |
|---|---|---|
${old.map(row).join('\n')}

## 3. How the main mechanics map to real limits of living in space

| In the game | The real limit it teaches |
|---|---|
| **Air pressure and bulkhead doors.** A holed room loses its air; lock its door and the rest of the station is saved, but that room freezes. | Space is a vacuum, so air escapes through any hole. Real stations are built as sealed sections that can be closed off. (Game simplification: the tanks hold one "air" supply; real cabin air is nitrogen plus oxygen.) |
| **Power budget.** Solar panels, a small reactor, a battery, and more machines than power. | Lunar day and night each last about two Earth weeks, so solar power disappears for 14 days at a time. |
| **Oxygen from water or from moon soil.** | Electrolysis costs 1.125 L of water per kg of oxygen (chemistry). Lunar regolith is about 45% oxygen by mass, but freeing it takes a lot of energy. |
| **Water recycling up to 98%.** | The level reached on the International Space Station in 2023. |
| **Radiation dose topside, storms, shelter underground.** | 1,369 µSv per day measured on the lunar surface; solar particle events can deliver far more in hours; rock overhead is the best shield. |
| **Spacesuit on outside, off indoors.** The cave and the surface have no air, so you suit up in the airlock before leaving; indoors you work, cook and sleep without it. | A spacesuit is a one-person spacecraft: it holds air pressure, controls temperature and blocks sunlight. Inside a sealed, heated habitat (like the International Space Station, kept near 22°C) crews wear ordinary clothes. (Game simplification: suiting up takes 15 game minutes; real suit-up and airlock cycles take hours.) |
| **Surface base and underground station.** Domes, labs, garage, water plant and mine on the surface; food, beds and the Control Center under the rock. | Rock overhead is the best shield against radiation and meteoroids, so the places where people spend most hours go underground. Water ice exists in permanently shadowed craters near the lunar poles, and can be split into oxygen and hydrogen. Peppers, lettuce and radishes have been grown on the ISS. |
| **Lava tube station at 17°C.** | LRO Diviner measured about 17°C in shaded pit areas, against 127°C / −173°C on the open surface. |
| **Radio delay.** Mission Control answers after 1.3 s; aiming the dish uses a 2.6 s echo. | Light-speed over 384,400 km. |
| **Crops, hens, fish.** | Crops have been grown on the ISS (lettuce 33 days, radishes 27 days); plants sprouted in real Apollo soil but grew slowly (OSD-476). Quail eggs have hatched and fish have lived on space stations. Hens on the Moon are our imagination. Section 3b has the detail. |
| **Low-gravity hops, Earth fixed in the sky, Earth's phases.** | Gravity 1.62 m/s²; the Moon is tidally locked; Earth's phase follows the real Sun direction for the base's coordinates (8.3355°N, 33.222°E). |

## 3b. Farming, water and the closed loop

Every claim below carries the **status of its evidence**, because "a lab has done it" and "it works on the Moon" are very different things.
**MOON** = measured on or from the Moon · **FLOWN** = done in space · **LAB** = shown in a laboratory on Earth · **CONCEPT** = a design nobody has built on the Moon.

| What the game teaches | Status | Source | Publisher |
|---|---|---|---|
${life.map(rowS).join('\n')}

**How the game uses these numbers** (calculations live in \`js/life.js\` and are checked by \`node tools/life_test.mjs\`, 70 checks):

| In the game | Real number behind it | Game simplification |
|---|---|---|
| **Ten crops** with different speed, harvest, light, water and plant-food needs. | Cycle lengths and the ranking of yield, water and light come from NASA's crop-chamber tables (BVAD). Wheat really needs about four times a potato's light and three times its water. | One game day of growing stands for about 100 real days. Harvest sizes are scaled for play. Temperature ranges are ours. Herbs are our own addition; spinach, peas and soybeans are candidate crops, not yet proven in space by a source we could open. |
| **Plant health = the scarcest of light, water, plant food, warmth and air** (Liebig's law). | The law of the minimum is standard plant science. Crops like 1,000–2,000 ppm of CO₂. | Five factors, each from 0 to 1. More people in the station means more CO₂ for the plants. |
| **Plants supplement the air, they do not replace the machines.** Six racks give less than a quarter of one person's oxygen. | About 20–25 m² of crops per person for oxygen, about 50 m² for food. | Rack oxygen is sized so a full farm at full light stays under half of one person's need. Plants take in 1.375 kg of CO₂ per kg of oxygen (44/32, chemistry). |
| **Water loop.** Plants breathe out nearly all the water they drink; the recycler or condensers catch it. | 98% water recovery on the Space Station. Secondary sources put transpiration at 97–99.5% of uptake; we found no NASA page for that figure. | Farm water comes back at the recycler's rate, or 97% with condensers. |
| **Crew breathing.** 0.84 kg of oxygen in, 1.00 kg of CO₂ out per person per day. | NASA's ECLSS mass balance. The newer BVAD figures are 0.895 and 1.085 kg. | We kept the older pair because the rest of the game is balanced on it. |
| **Electrolysis.** 1.125 L of water and 0.125 kg of hydrogen per kg of oxygen. | Chemistry (2 H₂O → 2 H₂ + O₂). Really about 7 kWh per kg of oxygen. | The Oxygen Maker's power draw is a game size, about ten times the real figure, so that the choice hurts. |
| **Ice extraction.** Seal icy soil in a chamber, pump out the air, warm it, the ice turns straight to vapour, a cold trap freezes the vapour, melt and filter. | 5.6% water in polar crater soil (LCROSS). Triple point 611.657 Pa. Sublimation takes 2.83 MJ per kg of ice. Ice vapour-pressure curve: −61°C at 1 Pa, −42°C at 10 Pa, −20°C at 100 Pa. | Thermal mining is a **concept**; microwave extraction is **lab-proven**; neither has run on the Moon. Canister size (120 kg), cold-trap capacity, heater efficiencies and wear are game numbers. Above 611 Pa the game gives 35% recovery because the meltwater soaks into the soil. |
| **Polar Ice Mine.** A crater whose floor never sees the Sun; you dig icy soil with a digger, two scoops fill a canister, and you haul canisters back to the Water Plant. | There is no ice at the base's latitude (8°N). Surface ice is confined to within 20° of the poles, in craters that are permanently shadowed; one measured −249°C. Soil there held 5.6% water where a probe struck it. | **Distance is story:** the real poles are about 2,500 km from this base, and the game draws the mine a few hundred metres away, as it does the other stations. Nobody has dug lunar ice yet (a NASA drill ran on the Moon in 2025 but did not reach ice). The floor temperature (−230°C), scoop and canister sizes, and the battery drain in the cold (3% of a charge per hour parked) are game numbers. The pale blue beam over the mine is a map marker, not a real light. |
| **Water from rock (experimental).** Hydrogen plus ilmenite at about 1,000°C gives water. | FeTiO₃ + H₂ → Fe + TiO₂ + H₂O at 900–1,100°C, shown on real Apollo soil in the lab; ilmenite is 8–10% of local soil and 10.5% of it is removable oxygen. | 150 kg batches, up to 80% conversion: about 1.3 L for roughly 80 kWh. That is some fifteen times the energy per litre of ice extraction, which is the lesson. |
| **Moon-soil experiment.** Three pots: water and plant food, treated moon soil, raw moon soil. | The 2022 Apollo-soil study (real Moon soil) and later work on imitation soil. | Final plant sizes of 100%, 70% and 38% are a simplified picture of the result. Treatment has only been tried on imitation soil. |
| **Nothing grows on the open surface.** | No air, no liquid water, a 300-degree day-night swing, and radiation. | The game never offers it. |

## 4. What we simplified (and say so in the game's "Real or made up?" page)

- A meteor shower wrecking every station at once is the story, not a forecast.
- A real lava-tube cave would be near 17°C but airless, exactly as in the game; the indoor 21°C is the station's own heating.
- One game hour passes in 7–9 real seconds; building a panel takes 3 game hours.
- Machine power sizes, crop speed (about one tray a day) and the three storm strength levels are tuned for play.
- Earth is drawn 2.5× larger than real so its phase is visible.

## 5. Corrections made while researching

- **Lava tube size.** No one has measured the inside of a lunar lava tube. Radar hints at one about 50 km long (Marius Hills); models allow tubes a kilometre or more wide; under the Mare Tranquillitatis pit only tens of metres are confirmed. The game says exactly that.
- **Underground temperature.** The steady 17°C comes from LRO Diviner measurements of shaded pits, not from Chang'e samples. (Chang'e 5 returned samples in 2020, Chang'e 6 in 2024.) Plain soil a metre down is about −20°C (Apollo heat-flow probes).
- **Light in the cave.** A visible shaft of light needs air or dust to scatter it. The lava tube is in vacuum, so the game and its pictures show only a hard bright patch on the floor under the skylight, and none at all during the two-week night. No sunlight reaches the station, so its farms grow under LED lamps and its modules have small portholes, not glass walls.
- **Earth in the sky.** From the base (8.3°N, 33.2°E) Earth hangs high overhead, not on the horizon; the surface-base picture is cropped so that it shows no sky.
- **Ice at our latitude.** There is none. The first design had canisters of icy soil simply waiting at the base; now you fetch them from a dark crater, and the notes say plainly that the distance is compressed.
- **Dust storms.** The Moon has none. Dust events in the game are static-cling dust, impact spray and the real sunset "horizon glow".

## 6. Art

All character art, comic panels and event pictures were generated with the Higgsfield API (\`tools/gen_art.mjs\`; prompts in \`tools/art_jobs.json\` and \`tools/art_jobs_v2.json\`). The station interior pictures, the cave and surface-base pictures, and the wall, floor, ceiling and door textures come from \`tools/art_jobs_v3.json\` (\`tools/web_art.mjs\` shrinks them for the web; it needs ffmpeg). REGO and BOLT are original robot designs. The API key is read from the \`HF_KEY\` environment variable and is never stored in the project.
`;
fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs', 'SCIENCE_AND_SOURCES.md'), md);
console.log('wrote docs/SCIENCE_AND_SOURCES.md', md.length, 'chars,', data.length, 'datasets,', facts.length, 'fact sources');
