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
| 5 | Build scenes: parts fly in and bolt on in order, with a camera path per job instead of one orbit | The 5–15 second scenes are the game's showpieces | Camera **done** (two clear angles per job that frame the worker and the work; looks up at overhead work). Parts flying in: planned |
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
| 2 | **Remaining verification.** Commander with the Water Plant and the ice mine in the planned player. Saving and loading during a job, in a vehicle and in an emergency. | Done (see below). A full touch play-through is still to do |
| 3 | **Station interiors.** Moving machinery in each of the 11 rooms, emergency and power-out lighting, one consistent material pass, new textures. | Lighting and machinery done in all 11 rooms (see below). Material pass and new textures to do |
| 4 | **Minigames.** Rover maintenance and mining procedures, tool sounds, on top of the 16 hands-on games already there. | To do |
| 5 | **Movement.** Hopper landing legs, engine and landing guide; low-gravity gait; smoother changes between walking, driving and flying. | Hopper done (see below). Gait and transitions to do |
| 6 | **Sound and light.** Room ambience, muffled sound outside, music that follows danger, radio chatter, lighting that reacts to emergencies. | Done: sound, music and the radio (see below); reactive lighting was done in step 3 |
| 7 | **Learning.** A question after each emergency, a voice for REGO using the browser's own speech, a picture of ice as frost in the soil, real terrain on the map. | Questions, REGO's voice and the Day and night page done (see below). Ice picture and map to do |

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

### Step 2: what was checked and what it found

**Commander with the Water Plant and the Polar Ice Mine.** The planned player gained a fourth plan, `water`: the canister at the base goes into the Water Plant at once, and after the panels are fixed it drives to the mine, digs two canisters and runs a second batch.

| Commander, plan `water` | Result | Water left | Oxygen left | Water Plant made |
| --- | --- | --- | --- | --- |
| Perfect routes | Win | 18 L | 1.9 kg | 17 L |
| Good player (travel x1.5) | Win | 17 L | 1.2 kg | 17 L |
| Slow player (travel x2) | Win | 8 L | 0.2 kg | 7 L (no time for the mine) |

Without the Water Plant the same player ends with no water at all. So water is solved by the plant and the mine. Oxygen stays the thin margin, because the night runs on the reactor alone.

**The cold limits a mine trip.** A parked vehicle loses 3% of its charge per game hour in the crater. For a good Commander player that allows two canisters per rover trip, not the four the rover can carry: four would leave it too flat to drive home. REGO now warns when the charge is only just enough to get back.

**Saving at awkward moments.**

| Saved while | After a reload | State |
| --- | --- | --- |
| Flying the hopper 34 m up | The hopper is on the ground below, the player beside it, and it flies | Fine |
| Installing a solar panel | The panel was gone: used up by the job, but the mount still empty | **Fixed**: the game no longer saves in the middle of a job or an elevator ride. After a reload the player still holds the panel |
| An emergency card open | The emergency vanished without a choice | **Fixed**: no save while the card is open; the outcome is saved once it is settled |
| A Water Plant batch running (tested earlier) | The batch carries on | Fine |
| Sitting in the digger with a scoop in the bucket (tested earlier) | The scoop is kept | Fine |

### Step 3, first part: lights and machines that follow the station's state

Nothing here adds a light for the graphics card to work through: everything is glowing material and moving parts.

| What you see | When |
| --- | --- |
| A status light over every door in the hall | Cyan: fine. Red and flashing: a leak. Pale blue, pulsing slowly: frozen. Amber: wrecked |
| Floor guide lights along the hall and in every room | Steady cyan. In a power cut they turn amber and pulse |
| Hall ceiling lights | In a power cut only every third stays on. A leak anywhere makes them pulse red |
| Room lights | In a power cut they sag to a third and flicker now and then |
| A fan at every room's wall vent; the farms' big fans turn | Full speed with power, slower in a power cut, winding down to a stop when the room is wrecked or frozen |
| Bubbles rising in the Oxygen Room's two tubes | Only while the Oxygen Maker is splitting water; faster at higher settings |
| A flywheel on the Water Room's recycler pump | Speed follows the recycler setting |
| Rows of small lights on the Control Center's computers | Blink while the room has power |
| A light running along the Battery Store's cable tray | Runs one way while charging, the other way while draining, dark when the battery is empty |
| The hologram Moon in the Control Center | Turns slowly |

Cost at the same view in the Control Center: 366 draw calls, was 352.

Still to do in step 3: one consistent material pass, and new textures.

### Step 3, second part: the other five rooms

| Room | What moves | It follows |
| --- | --- | --- |
| Workshop | The overhead hoist travels along its rail and its hook swings | Runs while the Fix-It Bench is repairing a panel; stops where it is when the work or the power stops |
| Kitchen | Steam rises from the pot into the hood; a light on the water dispenser | Steam only while a meal is cooking. The light is green, amber below 6 L of water, flashing red below 2 L |
| Bunk Room | Five bars of air quality on the wall; a night light on each ladder | The bars follow how fresh the air is and flash while the air cleaner is broken. The night lights breathe and the room dims while you sleep |
| Bathroom | Rings slide along the used-water pipe toward the recycler | Their speed is the share of water the recycler is saving. This water is not thrown away |
| Animal Bay | Bubbles rise in the fish tank | Only while the fish are alive and the pump has power |

### Step 5, first part: the hopper

| What | How it behaves |
| --- | --- |
| Landing legs | In the air the legs hang 35 cm lower. As the feet touch they take the weight, the body dips on them and settles slowly, as things do in one-sixth gravity |
| Engines | The four jets grow longer and brighter with the throttle. They light as soon as you press Space, before the hopper leaves the ground, and go out when it is parked |
| Dust | Below 7 m the jets blow dust flat and outward (there is no air to make it billow). Each foot kicks up a puff on touchdown |
| Banking | The hopper leans into a turn |
| Gentle landing | Coming down, the hopper slows by itself in the last metres. From 19 m it now touches down at 0.8 m/s; before, it arrived at about 4 m/s |
| Landing ring | A ring on the ground straight below the hopper, larger the higher you are. Green: clear. Amber: bumpy ground. Red: over the pit |
| Flight readout | Height, climb or descent rate, speed, and the same landing advice in words |

The legs, dust and ring are for the eye only. The one change to how the hopper flies is the slower final descent.

### Step 6: sound

All of it is made in the browser; there are no audio files. It was checked by measuring the sound the game puts out, not by ear: nobody has listened to it yet.

| What | How it behaves | Measured output |
| --- | --- | --- |
| The station's air and machines | A soft rush of air and a low hum indoors. Both sink and slow in a power cut, and come back with the power | 23 at full power. Before a small volume change it read 29 at full power and 15 in a power cut; the power cut was not measured again afterwards |
| Silence outside | On the surface nothing reaches you through space. Standing still, you hear only your own breathing | 1 |
| The helmet | With the helmet on, world sounds pass through a filter that keeps only what is below about 620 Hz, as a suit would. Interface sounds, alarms and the radio are inside the helmet and stay clear | Filter at 620 Hz with the helmet on, 16,000 Hz off |
| Breathing | A quiet hiss in the helmet, faster when you run | |
| Footsteps | A shoe on the deck indoors; a dull thump through the boot in the suit | |
| Rover, digger and hopper | Felt through the seat: the rover's motor rises with speed, the hopper rumbles with its throttle, the digger growls while it digs. A thud when the hopper's feet come down | Hopper: 26 climbing, 10 hovering, 3 landed |
| Music | Four slow voices drift through calm chords. One emergency is enough to pull them into close, uneasy chords and bring in a low pulse. When the danger passes, a short rising phrase plays and the calm chords return | Chord change confirmed for a leak and its repair |
| Settings | Sound and Music are separate switches; both are remembered | |

Output figures are average level times 1,000, read from the game's own audio output in the test browser.

Radio chatter was added afterwards: see the next section.

### Step 7, first part: a question after each emergency

After an emergency is settled, one card asks why it happened. There are 14 questions, one for each kind of emergency, in `js/quiz.js`.

| Rule | Why |
| --- | --- |
| Asked once per kind of emergency in a mission | A second solar storm does not repeat the same question |
| Three answers, shuffled: one right, two that people often believe | For example "the night wind chills them" for why machines freeze at night. There is no wind on the Moon, and the explanation says so |
| A right answer earns one research point | A small reason to think it through |
| A wrong answer costs nothing | The card shows the right answer and explains it, and the game goes on. Getting it wrong is how the fact is learned |
| The clock is stopped while the card is up | The same rule as the emergency itself: stop, then think |
| Questions can be switched off in Settings | For players who only want to play |

Every fact in the questions is one the game already uses, with its source in `docs/SCIENCE_AND_SOURCES.md`. The end screen shows how many were asked and how many answered right: as a badge on every ending, and as a line in "How you did it" when the mission is won. Nothing is shown if no question was asked.

### Step 7, second part: REGO reads aloud

REGO speaks with the voice built into the player's own device (the browser's speech feature). Nothing is downloaded and nothing is sent anywhere.

| What | How it behaves |
| --- | --- |
| What is read | REGO's hints, REGO's own lines in conversations, and the title and text of emergency and question cards |
| What is not | Other characters' lines (one voice for everyone would confuse), buttons, and the answers to a question |
| Units and symbols | Spelled out: "−128°C" is read as "minus 128 degrees Celsius", "166 kWh" as "166 kilowatt hours", a key as its name |
| A new line | Replaces the one being spoken; another character speaking, or choosing an answer, stops REGO |
| When it is on | In Cadet missions (ages 7 to 10) it is on until the player chooses otherwise. In the other modes it is off until switched on. The choice is remembered |
| Sound off | REGO is silent too |
| No voice on the device | The switch is not shown |

Checked by intercepting what the game hands to the speech feature, not by ear. The voice itself depends on the device: on the test computer it was "Microsoft Zira". Nobody has listened to it yet.

### Step 6, second part: Mission Control on the radio

During quiet play, about once a minute, Mission Control says one short line. It appears as a note with a dish icon and a two-tone radio call. The lines are in `js/radio.js` and checked by `node tools/radio_test.mjs` (14 checks).

| When | What you hear |
| --- | --- |
| The dish is not pointing at Earth, or the Earth Link is off | Static, and a reminder why. No Mission Control until the link is back. This gives the Earth Link a reason beyond storm warnings |
| The link comes back | "We have you again, Tranquility Deep. It is good to hear you." |
| Oxygen, water or a falling battery is low | A warning naming it, at most once every 20 game hours each |
| A solar storm is overhead | "Stay under the rock until we call the all-clear." |
| Sunset is less than 14 hours away; night has begun | One line each, once per mission |
| An astronaut was brought home | A word of thanks, once per rescue |
| The rescue ship | How far out it is, every 40 game hours, and once when it is less than a day away |
| Nothing is happening | One of five calm lines: the radio delay, the rock roof, resting, the rule that no choice is free |

It never speaks over a window, a job, an elevator ride, an emergency or sleep. What has been said is kept with the mission, so a reload does not repeat it. REGO does not read these lines: they are Mission Control's.
