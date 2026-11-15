# MOONKEEPER — roadmap

What is built, what comes next, and which real data each plan stands on.
Sources for every number are in [SCIENCE_AND_SOURCES.md](SCIENCE_AND_SOURCES.md). The game itself shows no citations.

Legend for evidence: **MOON** measured on or from the Moon · **FLOWN** done in space · **LAB** shown on Earth · **CONCEPT** nobody has built it on the Moon · **STORY** ours.

## 1. Done in the Farming & Water update

| Area | What the player gets | Where it lives |
|---|---|---|
| Crops | Ten crops (potato, wheat, peas, tomato, soybean, lettuce, spinach, radish, herbs, thale cress), each with its own cycle, harvest, light, water, plant-food and temperature needs. Six racks, replanted by hand. | `js/life.js` `CROPS`, farm screen |
| Plant health | Liebig's law: growth follows the scarcest of light, water, plant food, warmth and air. The farm screen names the limit for every rack. | `rackState` |
| Farm equipment | Per-room thermostat, shared lamp level, pump failure, lamp failure, damp-air mold. | `js/events.js`, `stepLife` |
| Plant food | A stock that crops use and waste returns. A digester in the Water Room turns hen feed into more. Peas and soybeans need almost none. | `lifeFlows` |
| Water Plant | Ice extraction with three heaters, and power, time and pressure sliders. A dashboard with a live graph and a prediction before you press Start. Canisters are carried to the hopper. | `tickBatch`, Water Plant screen |
| Water from rock | Experimental hydrogen reduction of ilmenite, kept separate from ice and about fifteen times costlier per litre. | `tickBatch` (`mode: 'ilm'`) |
| Closed loop | Crew CO₂ helps the plants, plants give some oxygen, their water is recovered, electrolysis leaves hydrogen. A loop diagram with moving flows, made-and-used bars and trend graphs (key **L**). | `computeFlows`, loop screen |
| Experiment | Thale cress three ways: hydroponics, treated moon soil, raw moon soil. | `EXP_POTS` |
| Research | Points from first harvests, new heating methods and the experiment buy five upgrades. | `TECH` |
| Tests | 60 checks of mass balance, energy balance, crop timing, routing, saving. | `tools/life_test.mjs` |
| Animation, step 3 | Rover suspension, steering, body lean, squat and dive, antenna, tyre tracks. All of it is visual only: it never changes where the rover goes. | `placeVehicles` in `js/main.js`, `_vehicles` in `js/world.js` |
| Animation, step 2 | Walk-in before every job, aimed arms and head, six hand tools, REGO working beside you, crew tools by role. | `G.job` in `js/main.js`, `js/actors.js` |
| Animation, step 1 | Eased astronaut poses, idle look-around and breathing, landing squash, hip roll; dust from boots, landings, rover wheels and dragged panels that flies in arcs; growing, swaying, fruiting plants; Water Plant glow, vapour, frost, tracking mirror, digger. | `js/actors.js`, `js/world.js` |

## 2. Animation quality, step by step

Each step is small enough to ship and check on its own.

| Step | What changes | Why it matters | Status |
|---|---|---|---|
| 1 | Pose easing, idle life, landing squash, ballistic dust, plant growth, Water Plant machinery | Nothing snaps; the world reacts to you | **Done** |
| 2 | Hands that reach: you walk up to the job; arms and head aim at the work point (up for a ceiling patch, down for a rack); a tool appears in hand (wrench, welder, picker and basket, spoon and pan, brush); REGO comes round beside the work, points at it and lights it; crew use the tool for their role | Jobs read as work, not hammering the air | **Done** |
| 3 | Rover: each wheel rides the ground on its own suspension; front and rear pairs steer; the body bounces on slow, soft springs (one-sixth gravity), leans in turns, squats under power and dives under braking; the antenna whips; tyre prints stay in the dust; tread blocks show the wheels turning | Driving is most of the surface time | **Done** |
| 4 | Hopper: gimballed thruster plumes with no flame trail (vacuum), landing-leg compression, dust blown outward on landing in straight rays | A real difference between flying on the Moon and on Earth | Next |
| 5 | Build scenes: parts fly in and bolt on in order, with a camera path per job instead of one orbit | The 5–15 second scenes are the game's showpieces | Planned |
| 6 | Doors and airlock: a pressure-cycle animation with a gauge, suit lockers that open, the suit lifting off its stand | The airlock is the rule the game teaches hardest | Planned |
| 7 | Crew and hens: walk between stations with purpose, carry crates, sit to eat; hens peck and flap | The station feels lived in | Planned |
| 8 | Screen motion: panels slide and fade, bars count up, alerts pulse once and settle | Calm, readable interface | Planned |

Rules for every step: no visible light beams or billowing dust (there is no air); no motion that changes what the simulation does; test with `G.frame` on a hidden tab and at 30 fps.

## 3. Game plans tied to real NASA data

| Real data | Evidence | Used today | Plan |
|---|---|---|---|
| DONKI space-weather events | MOON / orbit | Every solar storm is a real dated flare | Storm forecast screen with the real warning times; let the player compare two real storms |
| Apollo seismic catalogue | MOON | Moonquakes and impacts by date and strength | A seismometer in the Control Center that draws the real waveforms' length; quake damage scaled to magnitude |
| Meteorite Landings | Earth | Size comparison on impact cards | "What hit us?" identification mini-task |
| OSD-476 (plants in Apollo soil) | LAB, real Moon soil | The moon-soil experiment | Load the study's sample groups so the three Apollo sites give three different results (Apollo 11 worst, Apollo 17 best) |
| BVAD crop tables | LAB | Crop cycles and rankings | A crop-planning screen that shows the real per-square-metre numbers beside the game numbers |
| LRO Diviner temperatures | MOON / orbit | 17°C pit, surface swing, crater cold | A second site: a polar outpost you reach by hopper, with real crater temperatures |
| LCROSS and polar ice maps | MOON | 5.6% ice in canister soil | **Polar ice run:** drive or fly to the polar mine, dig icy soil with the digger, and haul it back (today the canisters are simply waiting by the cold store) |
| ISS water recovery, ECLSS | FLOWN | 98% recycling, electrolysis ratios | A brine-processor upgrade (93% to 98%), matching the real 2023 step |
| Ilmenite reduction, ROxygen | LAB | Water from rock | Hydrogen tank as a tracked resource, so electrolysis and rock reduction visibly trade hydrogen |

## 4. Farming and water: still to do

- **Polar ice run.** Excavation as something you do, not a canister you find. Needs a new site and digger controls.
- **Per-rack disease.** Today only damp-air mold in one farm. Add root rot (too much water), tip burn (too much light on lettuce), and spread between neighbouring racks.
- **Nutrient recipe.** One "plant food" number today. Split into nitrogen, phosphorus and potassium only if it stays readable for a ten-year-old.
- **CO₂ control.** Let the player bleed scrubbed CO₂ into the farms on purpose.
- **Waste processor as a machine** with its own power level, instead of an action in the Water Room.
- **Treated-soil beds:** show the washing and composting as a build scene.
- **Crew jobs:** a "Water Plant operator" role; farmers that replant what you last chose (they already do) and report shortages.
- **Difficulty tuning.** Commander still fails around day 8–9 with a simple strategy in the headless test. Decide whether the Water Plant should close that gap.
- **Art:** the experiment picture shows a surface view through the porthole; the station is underground. Regenerate if it bothers anyone.

## 5. Known gaps in checking

- No full mission has been played by hand since the suit, surface-base and farming updates.
- The new screens were checked at desktop width; touch controls and narrow phones were not.
- Balance with the new crops was checked only by the two scripted strategies in `tools/sim_test.mjs`.
- Peas, soybeans and spinach are listed as candidate crops because we could not open a primary source for their spaceflights. Herbs are our own addition.
