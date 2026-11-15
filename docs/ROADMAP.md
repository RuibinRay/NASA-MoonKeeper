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
| 5 | Build scenes: parts fly in and bolt on in order, with a camera path per job instead of one orbit | The 5–15 second scenes are the game's showpieces | Camera **done** (two clear angles per job that frame the worker and the work; looks up at overhead work). Parts **done**: room furniture and machines drop into place one after another during a rebuild, and a new solar panel is lowered onto its mount |
| 6 | Doors and airlock: a pressure-cycle animation with a gauge, suit lockers that open, the suit lifting off its stand | The airlock is the rule the game teaches hardest | **Done**: inner and outer doors that are never open together, a pressure gauge on the wall, a locker door that swings open, the suit lifting off its stand |
| 7 | Crew and hens: walk between stations with purpose, carry crates, sit to eat; hens peck and flap | The station feels lived in | **Done**: crew walk through the doors to work spots for their job, sometimes carrying a crate, and sit at the kitchen table at mealtimes; hens wander, peck, and flap into slow Moon hops |
| 8 | Screen motion: panels slide and fade, bars count up, alerts pulse once and settle | Calm, readable interface | **Done**: windows ease in, the HUD arrives in three parts, gauge numbers count to a new value, a new alert slides in and pulses once, the goal flashes when it changes. Window closing is still instant |

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
| 5 | **Movement.** Hopper landing legs, engine and landing guide; low-gravity gait; smoother changes between walking, driving and flying. | Done: the hopper, the gait and the hops in and out of vehicles (see below) |
| 6 | **Sound and light.** Room ambience, muffled sound outside, music that follows danger, radio chatter, lighting that reacts to emergencies. | Done: sound, music and the radio (see below); reactive lighting was done in step 3 |
| 7 | **Learning.** A question after each emergency, a voice for REGO using the browser's own speech, a picture of ice as frost in the soil, real terrain on the map. | Questions, REGO's voice, the Day and night page, the ice picture and the true-scale map done (see below). Real ground shape from elevation data is not done |

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

### Step 5, second part: walking in one-sixth gravity

On the Moon a person does not walk as on Earth: each step is a small flight, so astronauts loped. The walk now shows that. It is for the eye only: the player moves at the same speed and along the same path as before.

| | Before | Indoors, no suit | In the suit | Running in the suit |
| --- | --- | --- | --- | --- |
| Length of one stride | about 2.8 m | 3.7 m | 4.9 m | 5.1 m |
| Rise of the body per stride | 0.07 m | 0.14 m | 0.21 m | 0.28 m |
| Leg swing | 0.62 rad | 0.68 rad | 0.80 rad | 0.90 rad |
| Forward lean | 0.12 | 0.16 | 0.21 | 0.31 |

- **The stride floats.** The legs linger at full stretch and the body hangs at the top of each stride.
- **In the suit** the arms are held a little out and forward and swing less, as a stiff suit makes them.
- **Turning** leans the body into the turn; the trunk twists slightly against the legs.
- **Footsteps and dust land with the feet.** They used to come every 4.2 m whatever the legs were doing.
- **Vehicles.** The astronaut hops up into the rover, digger or hopper in 0.4 seconds, and hops down to the ground on getting out. Before, the figure simply vanished and reappeared.

### Step 7, third part: an honest picture of the ice

The Polar Ice Mine's picture used to show clear lumps of ice and a splash, as if the digger had struck a frozen pond. Nothing measured on the Moon looks like that. Where a probe struck a dark crater, the soil held about 5.6% water by weight: frost between the grains.

- **The new picture** shows dry, dark soil that is a little paler in the icy patches. The digger has cut a trench, the spoil is frozen clods, and dust falls straight down from the bucket (there is no air to carry it).
- **The mine's note in the game** now says: "You will not see lumps of ice: it is frost between the grains, so icy soil only looks a little paler."
- **What is measured and what is a guess.** Orbiters found the coldest south-polar crater floors slightly brighter, which fits a thin frost. How pale that looks to the eye is the artist's guess, and `docs/SCIENCE_AND_SOURCES.md` says so.
- **How it was made.** One picture from the recipe `rm_icemine` in `tools/art_jobs_v4.json`. The picture has three floodlight masts in view where the recipe asks for four.

### Step 7, fourth part: the real Moon, to scale

The game draws the Polar Ice Mine about 620 m from the pit. On the real Moon the ice is near the poles. The Map now has a fourth page, **The real Moon**, that shows the true distance.

| | In the game | On the real Moon |
| --- | --- | --- |
| Base to the ice | about 620 m (Pit Elevator to the mine) | about 2,500 km to the nearest pole; about 3,000 km to the crater where a probe found water |
| How many times as far | 1 | about 4,000 |
| Driving time | a short trip | about 190 hours at 13 km/h: 8 days and nights without a stop |

- **The picture.** The side of the Moon that faces Earth, with the base as an orange dot, both poles, blue bands where ice has been found, the probe's crater, and dashed lines for the two trips with their lengths.
- **The words.** Where you are, where the ice is, how long the drive would be, and why the game draws the mine close by. It says plainly that the short trip is our story, and that most real plans for a Moon base choose a place near the south pole.
- **Ways in.** Map (M), then "The real Moon". The ice mine's panel has a button, "See the real distance to the ice". "Real or made up?" in the Space Guide has a new row.
- **Where the numbers come from.** `js/moonmap.js` holds the real positions and works out every distance; nothing on the page is typed in by hand. `node tools/moonmap_test.mjs` runs 42 checks on the distances, the drawing and the numbers shown.
- **What is simplified.** The seas are round patches at their real positions and widths, not their true ragged shapes. The Ocean of Storms is drawn at half its length.
- **Not done.** The ground in the game is still hand-made hills. Shaping it from measured elevation maps of the pit region is a separate piece of work.

### A page for teachers

The overview listed "a teacher's page" as the third most useful thing after play-testing with children. It now exists: `docs/TEACHERS.md` to read, and `teachers.html` on the live site to print.

- **What is on it.** Five things pupils should be able to do afterwards; what to prepare; a 40-minute lesson in five steps; prompts to ask while pupils play; an exit question with what a good answer contains; all 14 questions the game asks, with the right answers; questions for talking afterwards in three age bands; a short table of what is real and what is story; what to do when something goes wrong; the keys.
- **It cannot drift from the game.** `node tools/build_teachers.mjs` writes both files. It takes the missions and their lengths from `js/config.js` and the questions from `js/quiz.js`, and stops if a question has no emergency name. `node tools/build_teachers.mjs --check` fails when the files on disk are out of date.
- **Printed size.** About two sheets, printed on both sides: the lesson on the first, the questions and reference on the second. This is an estimate from the page's layout; it has not been printed.
- **Way in from the game.** The small print on the title screen ends with a link, "For teachers". It sits on the line that was already there, so the title screen is the same height as before on a computer and on a phone.
- **Not done.** Nobody has taught with it. The timings are estimates.

### REGO no longer runs at the wall

Reported by the player: "REGO always runs to the wall".

**The cause.** REGO aimed at one fixed point, 1.9 m to your right and 1.3 m behind you, and ran straight at it. In the hall, which is 4.2 m wide, that point is inside the wall whenever you stand in the southern half and face east (or the mirror of that). The game then put REGO back on top of you, and it ran at the wall again, several times a second.

| Standing or walking for 10 seconds | Before | After |
| --- | --- | --- |
| Standing by the hall wall: how far REGO ran | 92 m | 1.1 m |
| Walking 50 m along the wall: how far REGO ran | 112 m | 48 m |
| Times REGO was inside a wall or a building | not counted (it was put back each time) | 0 |

**What REGO does now** (`js/follow.js`, pure logic):

- **Chooses a place it can reach.** Ten places are tried in order, starting behind your right shoulder, then the left, then closer in. A place is refused if it is in a wall or a wall lies between you and it.
- **Follows your path when a wall is in the way.** If you go through a door, REGO walks the way you walked, which is always clear, in place of cutting through the wall.
- **Slides, never enters.** A step that would end in a wall slides along it or is not taken. On the surface this now includes buildings and machines, which REGO used to walk through.
- **Does not fuss.** Once near you, in sight and not in front of you, it stays where it is until you move away or turn to face it.
- **Beside a job** it picks a free place next to the work in the same way.
- **Last resort.** If it is ever found inside a wall, is wedged out of sight, or is more than 32 m behind, it appears beside you once.

`node tools/follow_test.mjs` runs 44 checks on a small test station: by a wall, in a corner, along a wall, through a door, turning on the spot, left behind, found inside a wall, beside a job.

**Checked in the game:** the hall wall standing and walking, in and out of the Control Center through its door, a job on the hall wall, six passes close to surface buildings, standing against a building, and open ground walking, running and zig-zagging: no wall entered, no jump. **Not checked:** the elevator ride and getting in and out of vehicles were not run in the test browser (its fade animation stalls there); the rescued astronauts who follow you on the surface use their own, older code and were not changed.

### Fixes from the rescue-run report (Pilot mission, played to rescue)

A full Pilot mission was played on the live build and written up as 18 points. This is what was done with each.

| # | Point | Now |
| --- | --- | --- |
| 1 | No alert when oxygen, water or food runs out | Fixed, by bringing in the unmerged `fix/testing-pass` branch |
| 2 | "A meteoroid smashed 0 solar panel" | Fixed: with no working panel left, the card and the log say so |
| 3 | "A heater circuit broke from cold" about 13 times | Fixed: nothing breaks twice; when nothing is left to break there is no card and no log line |
| 4 | The log never records sealing the water pipe | Fixed (and fixing the heater circuit is logged too) |
| 5 | A parked vehicle hides a broken solar mount | Fixed: E goes to whichever you stand closer to, Q to the other |
| 6 | Launch button below the fold at 846 x 726 | Fixed by the merged branch: the button's top is at 634 px |
| 7 | "Day 8 of 7" | Fixed: "Rescue day" |
| 8 | The long night is easy with the Topside Heaters off | Changed afterwards: unheated cold now drains the rover and hopper, stops their chargers and freezes the Water Plant (see "The cold matters at night") |
| 9 | Solar panels do not matter after Day 3 on Pilot | Measured, then fixed in REGO's advice, not in the sunset (see "Do panels matter on Pilot?") |
| 10 | A leak empties the oxygen tank before you can reach it | The leak itself is unchanged. The card shows what the walk and the patch will cost in oxygen, and REGO recommends locking the door when there is not enough |
| 11 | "Fix it at the Heater Hub" was free if you never went | Choosing it now also turns the heaters to max (+2 kW) until the circuit is fixed |
| 12 | The end screen read as if you had failed the astronauts you did not rescue | Reworded: they are safe in their shelters and the rescue ship collects them next |
| 13 | REGO ignores the time of day | Panel advice needs more than 6 h of daylight; the oxygen plant is advised only by day with 12 h left; a brownout at night no longer says "fix panels"; the meteor card at night recommends leaving the panel |
| 14 | Nothing points you to crew jobs | REGO names a resting helper and the Farm duty and Cook jobs when food is under 3 days |
| 15 | "Hardly any air was lost" right after the tank emptied | Now "A fast, tight patch: almost no more air escaped while you worked" |
| 16 | "Leave it: −3.2 kW of solar power" at night | At night it reads "Nothing tonight: panels make no power until sunrise" |
| 17 | "Frozen Solid" repeats as a full card | One card for one spell of cold, then short notes, plus a standing alert "Topside machines are freezing" with the heater level they need |
| 18 | The hopper's 7 kW charger runs on Day 1 and cannot be switched off | **Not changed.** It stops by itself after about an hour |

**Left for a decision (8 and 9; 8 has since been done, below).** Both are about how the mission is balanced, and a change moves how hard every mode is. With the heaters off, the cold breaks the dish, the panels and a heater circuit, and none of those matters before a rescue that comes at night. Two ways to make the cold matter: let it reach things used at night (the rover and hopper batteries, the Water Plant), or let it cut the power coming from the reactor. For the panels: a later sunset on Pilot, or battery room worth filling. Each needs the mission checks re-run and a person to play it.

**The unmerged branch.** The report listed fixes that existed only on a local branch, `fix/testing-pass`. It was merged here; four places clashed with newer work and both sides were kept: the hop in and out of vehicles with the "too close to the pit" guard, and the "new alert" highlight with the emergencies-first order.

**Checked in the game:** each row marked fixed above was tried by hand in a Pilot mission, by day and by night. `sim_test` still says every mission can be won by a planned player and Commander cannot be won by doing nothing. **Not checked:** a whole mission played start to finish with the fixes in.

### The cold matters at night

Point 8 of the rescue-run report: with the Topside Heaters off, the night ran almost on the reactor alone, and what the cold broke (the dish, panels, a heater circuit) did not matter before rescue. The mission was won with no panel working.

**The rule.** At night, when the heaters deliver less than the machines need, the shortfall (in heater levels) is the *frost*. While there is frost:

| What | Effect | Ends when |
| --- | --- | --- |
| Rover and hopper | Each loses 1.5% of a full charge per hour for each heater level short: 3% an hour with the heaters off, so a full battery is flat in about 33 hours | The heaters are back at the needed level |
| Charging pads | Do not charge, and draw no power | The same |
| Water Plant | A running batch waits where it is and draws nothing; a new batch cannot be started; the seal wears 1% an hour per level short, down to a half | The same; the worn seal is put right by servicing (1 material, 1 hour) |

- **Forgiven:** a shortfall of a quarter of a level or less, so a brief dip in power does not strand the rover. By day there is no frost.
- **What the player is told.** REGO speaks once when the frost begins and again if a battery goes flat. A standing alert, ranked above the yellow reminders, names the heater level needed and what is affected. The Charging Pads panel says "too cold to charge". The Water Plant screen shows FROZEN and will not start a batch. The Power Board's line for the heaters says what they protect. "Real or made up?" has a row.
- **Unchanged:** the cold still breaks the dish, a panel and a heater circuit as before. Nobody is hurt directly; a flat rover still crawls.
- **What it does to the missions.** `sim_test` still says every mission can be won by a planned player and Commander cannot be won by doing nothing. One planned Pilot run now loses a rover trip: its night has 61 hours of brownout, the heaters run weak in a brownout, and the rover is too drained to drive. It still wins.
- **Checks.** `node tools/frost_test.mjs` runs 31 checks: heaters right (nothing happens), heaters off, one level short, batteries flat, chargers, the heaters coming back, a batch waiting and carrying on, no frost by day.

**Tried in the game** (Pilot, at night, heaters off): REGO's warning and the alert; after 10.9 hours the rover and hopper were at 67% and the seal at 0.78; the pads panel and the Water Plant screen said so and a batch would not start; with the rover at zero REGO said so; with the heaters back at level 2 the alert went and the rover charged from 0 to 47% in 1.6 hours. **Not tried:** a whole mission played through with the rule in; whether children notice the warning in time.

**Still open from the report:** point 18 (the hopper's charger on Day 1). Point 9 is dealt with in the next section.

### Do panels matter on Pilot? A later sunset was tried and not kept

Point 9 of the rescue-run report: on Pilot the Sun sets on Day 3 and rescue comes before sunrise, so panels stop mattering, yet REGO keeps pushing them. A later sunset was suggested. It was measured with the planned player before anything was changed.

**1. What panel repairs buy today.** Three planned Pilot runs, one with no panel repairs at all:

| Plan | Panels working at the end | Hours of power cut in the night | Oxygen at rescue |
| --- | --- | --- | --- |
| Bathroom only, no panel repairs | 3 | 58 | 0.8 kg |
| Bathroom, then four panels | 7 | 61 | 1.4 kg |
| Bathroom, then the Battery Store | 3 | 30 | 0.9 kg |

Fixing four panels buys 0.6 kg of oxygen and no fewer power cuts. Rebuilding the Battery Store halves the power cuts. The report was right.

**2. A later sunset.** The same runs with the Sun setting later:

| Sunset moved by | Night before rescue | Power cut with no panel repairs | Power cut with four panels fixed |
| --- | --- | --- | --- |
| as now | 106 h | 58 h | 61 h |
| half a day | 94 h | 46 h | 47 h |
| one day | 82 h | 34 h | 36 h |
| a day and a half | 70 h | 22 h | 18 h |
| two days | 58 h | 10 h | 0 h |

Up to a day later, panels still make no difference. Beyond that a small difference appears, but only because the whole night has become short: a careful player's power cuts fall from 61 hours to 18 or to none, and Pilot stops being "one long night". **The sunset was left where it is.**

**3. Why panels do so little, and what does help.** With the Battery Store wrecked, the battery holds 228 kWh, and three panels fill it before sunset. Extra panels have nowhere to put their power. With the store rebuilt (380 kWh), panels working from the first hour cut the power cuts from 25 hours to 2 in a separate test. So the lever is room for power, and panels count once there is room.

**4. What was changed.** Advice, not balance:

- **REGO.** By day, when the battery is at least 90% full and more power is coming in than going out, and the Battery Store is wrecked, REGO says to rebuild it before fixing more panels, and names how many kWh it adds. It keeps back the materials for the Bathroom, so on Commander (8 materials) it does not say this at the start; there, the store-first plan ends with only 0.5 kg of oxygen.
- **Power Board.** "Battery full — extra power is wasted" now ends with how to make room: rebuild the Battery Store, add a battery module, or that the store is at its largest.
- **Checks.** The planned player has a fifth plan, `store` (Bathroom, Battery Store, then panels), which `sim_test` now runs in every mode: it wins in all three, with 32 hours of power cuts on Pilot against 61 for the plain plan. Three yardstick plans (`nopanels`, `storeonly`, `storefirst`) can be run by name for comparisons like the ones above.

**Not done:** nothing here was played by a person. The first objectives of a mission still lead to the Solar Field; REGO's new line appears once the battery is full with power to spare.

### A whole Pilot mission, played from start to rescue

Played by a script through the game's own controls (E and Q, the panels, the Power Board, the Control Center), paying walking time for every trip and choosing REGO's recommended answer on every emergency card. Job games were switched off in Settings. Build: main at pull request 48. Seed 1920914870.

**Result: rescued** on Day 8, 08:01. Survivor rank, 3,823 points, 12 emergencies, 6 of 6 questions right, 20 jobs, 3.5 mSv. Health 100 throughout. No power cut, no frost, no script errors. At rescue: battery 23 of 380 kWh, oxygen 1.1 kg, water 0.7 L, food 12.6 meals, 2 panels and 7 of 11 rooms working.

| When | What happened |
| --- | --- |
| Day 1 | Heaters to what the day needs. Suit on. Bathroom patched and rebuilt, then the Battery Store (REGO suggested it by itself once the battery was 92% full). Robots put on Farm duty and Cook: food rose from 14.5 to 26 meals by Day 3. |
| Day 2 | Two broken panels pulled, carried down, fixed on the bench. Dusty panels: dust shield. Air leak in the Potato Farm while topside with no materials: locked, lost. |
| Day 3 | Both panels installed: five working, battery full at 380 kWh by 17:00. A meteoroid holed the Water Room: locked, lost, recycling at zero. A moonquake split a seam in the Animal Bay: locked, lost. Sunset. |
| Day 3 to 5 | Rover to Sakura Outpost by night with the heaters at the level the night needs (no frost; rover at 74% on arrival). Four material crates loaded, driven home, delivered: 16 materials. |
| Day 5 | Water Room patched and rebuilt; a cracked pipe sealed. Robots rested, Earth Link off, recycler at 1: battery good for 64 hours against 61 to rescue. Solar storm sat out underground in safe mode. |
| Day 6 to 7 | A second meteoroid holed the Water Room; REGO said lock, and it froze. Water fell to 4.4 L with 36 hours to go. Patched and rebuilt again, a second cracked pipe sealed. |
| Day 8 | Rescue. |

**What it confirmed from this week's changes:** REGO was never inside a wall or a machine at any of the twelve points checked, including beside the rover and after elevator rides and getting in and out of the rover; REGO's Battery Store advice appeared in normal play; the night-cold rule cost nothing to a player who keeps the heaters at the needed level; the pipe repair is logged; at night the meteor card recommended leaving the panel; the clock and the end screen read correctly.

**What it found, now fixed:**

- **Locking a room you cannot live without.** REGO's rule for leaks counted only oxygen, so it said "lock" for the Water Room, which froze it and ended water recycling. Now the Water Room and Oxygen Room are patched on a thinner margin of oxygen (0.3 kg left, against 1 kg for other rooms), and every leak card's "lock" choice says what is lost and what the rebuild costs.
- **Silence while water ran out.** At Day 3, 17:00 the water was good for 2.7 days and rescue was 4.6 days away; REGO talked about the dish. Now REGO and a yellow alert speak as soon as oxygen, water or food will not last until rescue.
- **Wrong water advice.** "Turn the Water Recycler up" was said with the recycler's room sealed, and a leaking pipe was never mentioned. REGO now names the dead recycler or the pipe first, and says when the repair needs more materials than you have.
- **The elevator in a storm.** Its prompt now warns while a storm is on.
- **"The battery is full"** at 92%: now "nearly full".

**Seen and not changed:**

- **Many holed rooms.** Five rooms were holed in one Pilot mission. With no spare materials each one is lost, and materials are spent by Day 2 on the Bathroom, the Battery Store and two panels. (Changed afterwards: see "Fewer holed rooms".)
- **Heaters in the last nights.** Once the rover trip was over, nothing the player still used needed the heaters; keeping them on was a choice, not a need.
- **Robots on Farm duty with both farms sealed** keep drawing power; nothing says so.

**Honest limits of this run:**

- Two earlier attempts were thrown away because of the test tooling, not the game: the hidden test browser throttles timers and never fires animation frames, and a timed-out step kept running behind the next. In the final run, a steering loop that tried to park closer to the depot than the cargo yard allows cost about eight game hours on Day 4.
- Not covered: rescuing an astronaut, the Polar Ice Mine, the Water Plant, the hopper, the robot-arm builder, the job games, sound, and anything a child would do differently from a script.

### Fewer holed rooms

Three kinds of emergency can hole a room: an air leak, a meteoroid through the roof, and a moonquake that splits a seam. Nothing limited them, so a mission could lose room after room; the played Pilot mission lost five, the Water Room twice.

**The rules now** (`holeTargets` in `js/sim.js`):

- **A limit for each mission:** one room on Cadet, two on Pilot, three on Commander. Unlimited has no limit on the number.
- **A day and a half** of game time between two holed rooms.
- **Never the same room twice** in a mission.
- **Never the Water Room or the Oxygen Room while you have no material for a patch.** Those two hold machines nobody can live without, and without a patch the only answer is to lock the door and lose them.

When a hole is not allowed, the emergency still happens but does something else: a meteoroid hits the dish or a panel, a moonquake knocks the dish or cracks a pipe, and the plain air leak drops out of the draw.

**Measured:** 60 simulated missions of each kind, before and after, with a player who patches and rebuilds every holed room. The number of emergencies in a mission is unchanged (about 7, 14 and 21).

| Mission | Rooms holed before: average (most) | After: average (most) |
| --- | --- | --- |
| Cadet | 2.0 (4) | 1.0 (1) |
| Pilot | 3.4 (5) | 1.9 (2) |
| Commander | 5.2 (7) | 3.0 (3) |

- **Checks.** `node tools/holes_test.mjs` runs 21 checks on the rules, including a mission saved before this change.
- **Tried in the game** (Pilot): a leak; a second one straight after became a dust event; after the gap a second leak hit a different room; past the limit, a leak became dust, a meteoroid smashed panels and a moonquake cracked a pipe.
- **Not done:** nobody has played a mission with these limits. They are story numbers chosen from the measurements above, not from watching children play.
