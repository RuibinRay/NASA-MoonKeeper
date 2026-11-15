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
| Polar Ice Mine | A permanently dark crater to the south-west with six icy patches, a drivable digger on a power cable, a canister filler, floodlights and a shelter. Two scoops fill one canister; the first one earns research. Vehicles lose charge in the cold. | `MINE` in `js/config.js`, `scoop` and `dump` in `js/life.js`, `_mine` in `js/world.js` |
| Tests | 71 checks of mass balance, energy balance, crop timing, routing, saving. | `tools/life_test.mjs` |
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
| LRO Diviner temperatures | MOON / orbit | 17°C pit, surface swing, crater cold; the day-and-night thermometer in the clock (a simple model between the measured extremes) | Draw the thermometer from the measured curve hour by hour. A second site: a polar outpost you reach by hopper, with real crater temperatures |
| LCROSS and polar ice maps | MOON | 5.6% ice in canister soil; the Polar Ice Mine you dig at | Vary the ice richness from patch to patch, as the orbital maps do, and give the player a prospecting scanner to find the rich ones |
| ISS water recovery, ECLSS | FLOWN | 98% recycling, electrolysis ratios | A brine-processor upgrade (93% to 98%), matching the real 2023 step |
| Ilmenite reduction, ROxygen | LAB | Water from rock | Hydrogen tank as a tracked resource, so electrolysis and rock reduction visibly trade hydrogen |

## 4. Farming and water: still to do

- **Per-rack disease.** Today only damp-air mold in one farm. Add root rot (too much water), tip burn (too much light on lettuce), and spread between neighbouring racks.
- **Nutrient recipe.** One "plant food" number today. Split into nitrogen, phosphorus and potassium only if it stays readable for a ten-year-old.
- **CO₂ control.** Let the player bleed scrubbed CO₂ into the farms on purpose.
- **Waste processor as a machine** with its own power level, instead of an action in the Water Room.
- **Treated-soil beds:** show the washing and composting as a build scene.
- **Crew jobs:** a "Water Plant operator" role; farmers that replant what you last chose (they already do) and report shortages.
- **Difficulty tuning.** Commander still fails around day 8–9 with a simple strategy in the headless test. Decide whether the Water Plant should close that gap.
- **Art:** the experiment picture shows a surface view through the porthole; the station is underground. Regenerate if it bothers anyone.

## 5. Known gaps in checking

- A full Cadet mission was played by script on 14 November 2026, from the training to the rescue. The results and the six fixes are in [GAME_OVERVIEW.md](GAME_OVERVIEW.md).
- **Phones.** Held sideways the game is usable but crowded. Held upright, the warning list covers the resource bars. Touch controls have not been played through.
- Pilot and Unlimited were checked only by the two scripted strategies in `tools/sim_test.mjs`.
- **Commander has not been won by a person.** A planned computer player (`tools/planned_player.mjs`) that pays game time for every trip wins it with three different repair plans, after sunset was moved from day 3.4 to day 4.5. It ends with about one kilogram of oxygen left and faces no surprise events, so the margin is thin.
- Doing nothing wins Cadet and Pilot in the balance check, because the check has no surprise events. Whether that holds in real play has not been looked at.
- Frame rate has not been measured on a real computer. The surface draws about 260,000 triangles in about 200 draw calls.
- No child has played the game yet.
- Peas, soybeans and spinach are listed as candidate crops because we could not open a primary source for their spaceflights. Herbs are our own addition.

## 6. Improvement plan (brief of 14 November 2026)

The brief asks for a more cinematic, more hands-on and better-taught game without rebuilding it. Work goes in this order. Each step is merged only when it works in the game.

| Step | What | State |
| --- | --- | --- |
| 1 | **Speed and a graphics setting.** Fewer lights for the shaders to work through, lighter shadows on lower settings, the zone you are not in left out of the scene, a Graphics setting with Auto, and a frame-rate counter. | Done (see below) |
| 2 | **Remaining verification.** Commander with the Water Plant and the ice mine in the planned player. Saving and loading during a job, in a vehicle and in an emergency. A full touch play-through. | Next |
| 3 | **Station interiors.** Moving machinery in each of the 11 rooms, emergency and power-out lighting, one consistent material pass, new textures. | To do |
| 4 | **Minigames.** Rover maintenance and mining procedures, tool sounds, on top of the 16 hands-on games already there. | To do |
| 5 | **Movement.** Hopper landing legs, engine and landing guide; low-gravity gait; smoother changes between walking, driving and flying. | To do |
| 6 | **Sound and light.** Room ambience, muffled sound outside, music that follows danger, radio chatter, lighting that reacts to emergencies. | To do |
| 7 | **Learning.** A question after each emergency, a voice for REGO using the browser's own speech, a picture of ice as frost in the soil, real terrain on the map. | To do |

### Step 1: what changed and what was measured

Frame times could not be measured reliably in the test browser, so these are counts, which are exact.

| On the surface | Before | After |
| --- | --- | --- |
| Lights every lit pixel is shaded with, by day | 16 lamps and 8 spotlights, most of them switched off or hundreds of metres away | 2 lamps and 2 spotlights |
| The same, at night | 16 lamps and 8 spotlights | 12, 8 or 5 lamps (High, Medium, Low) and 2 spotlights |
| Parts walked every frame | Both zones, about 2,700 | Only the zone you are in |
| Shadow map | 2048 px, soft, redrawn every frame | High: the same. Medium: 1024 px, redrawn every other frame, 63 small parts cast none. Low: off |

Surface lamps now share a small pool of real lights that follow the nearest lamps, so the number of lights never changes while you travel. By day the Sun drowns the lamps out, so they are off.

The **Graphics** setting has Auto, High, Medium and Low. Auto counts real frames during steady play and lowers the detail one step after two slow readings in a row. If lowering does not help, something else is capping the rate, so it puts the detail back and stops.

Not done in this step: the ground is still about 218,000 triangles, the station interior still shades 11 lamps per pixel, and repeated objects are not yet instanced. No frame rate has been confirmed on a real computer: turn on **Show frame rate** in Settings to read it.
