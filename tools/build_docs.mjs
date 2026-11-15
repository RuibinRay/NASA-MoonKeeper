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
${facts.map(row).join('\n')}

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
| **Potatoes, tomatoes, hens, fish.** | Crops have been grown on the ISS (lettuce 33 days, radishes 27 days); plants sprouted in real Apollo soil but grew slowly (OSD-476). Quail eggs have hatched and fish have lived on space stations. Hens on the Moon are our imagination. |
| **Low-gravity hops, Earth fixed in the sky, Earth's phases.** | Gravity 1.62 m/s²; the Moon is tidally locked; Earth's phase follows the real Sun direction for the base's coordinates (8.3355°N, 33.222°E). |

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
- **Dust storms.** The Moon has none. Dust events in the game are static-cling dust, impact spray and the real sunset "horizon glow".

## 6. Art

All character art, comic panels and event pictures were generated with the Higgsfield API (\`tools/gen_art.mjs\`; prompts in \`tools/art_jobs.json\` and \`tools/art_jobs_v2.json\`). The station interior pictures, the cave and surface-base pictures, and the wall, floor, ceiling and door textures come from \`tools/art_jobs_v3.json\` (\`tools/web_art.mjs\` shrinks them for the web; it needs ffmpeg). REGO and BOLT are original robot designs. The API key is read from the \`HF_KEY\` environment variable and is never stored in the project.
`;
fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs', 'SCIENCE_AND_SOURCES.md'), md);
console.log('wrote docs/SCIENCE_AND_SOURCES.md', md.length, 'chars,', data.length, 'datasets,', facts.length, 'fact sources');
