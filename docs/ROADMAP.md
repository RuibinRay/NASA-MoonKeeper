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
- **Robots on Farm duty with both farms sealed** keep drawing power; nothing says so. (Fixed afterwards: see "Three small leftovers".)

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

### Three small leftovers

- **A robot with nothing to do.** Farm duty needs a working farm or the Animal Bay; a Cook needs the Kitchen. Without them the robot stands still and draws no power, where it used to draw its 1 kW regardless. The Control Center says "Nothing to do" and why, under the helper's name. When nothing more pressing is on, REGO suggests another job.
- **The chargers' switch.** The Power Board's line for the chargers has a button, "Switch off" or "Switch on". Off, the rover and hopper do not charge and the chargers draw nothing; the Charging Pads panel says so. This was the last open point (18) of the rescue-run report: the hopper starts a mission at about 45% on its pad and draws 7 kW until it is full.
- **Rescued astronauts and buildings.** People who follow you home used the old follow code and walked straight through buildings. They now use REGO's: the first follows you, each of the others follows the one in front, and they go round buildings and stay back from the pit.

`node tools/crew_test.mjs` runs 22 checks on the three rules. **Tried in the game:** the hopper at 46% stopped charging when switched off and rose to 85% after it was switched on again; a robot on Farm duty with the farms and the Animal Bay sealed drew nothing and the Control Center said so; two rescued astronauts followed round two surface buildings, never inside one, with no jumps, each about 2.6 m behind the one in front. **Not tried:** a real rescue trip from an outpost to the elevator.

### Reading help: bigger words, and colours for colour-blind players

**Text size.** Settings has a new row, Text size: Normal, Large (1.18 times) or Larger (1.36 times). It scales the words a player reads: every window (cards, panels, the Power Board, the Map, Settings itself), REGO's bubble, the hint at the bottom, the objective, the alerts, the notes and the dialogue. Windows are made narrower by the same factor first, so they still fit the screen. The choice is remembered. The gauges along the top and the buttons along the bottom keep their size, and the job games size their own lettering.

**Colours.** `node tools/colour_test.mjs` takes the colours from the game's own files, passes each through a simulation of the three kinds of dichromacy ([Machado, Oliveira and Fernandes 2009](https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html), full severity), and measures how far apart each pair that must be told apart ends up (the CIE 1976 colour difference). The bar is 20, in normal sight and in all three simulations. That bar is this project's own, not a standard.

| Pair | Smallest difference before | After |
| --- | --- | --- |
| A cost and a gain on a choice | 5 (fails) | 27 |
| Rooms on the station map: a leak and a broken room | 2 (fails) | 62 |
| Rooms: a leak and low air | 3 (fails) | 29 |
| Rooms: broken and low air | 2 (fails) | 30 |
| Rooms: OK and a leak | 16 (fails) | 30 |
| Rooms: OK and sealed | 14 (fails) | 42 |
| An emergency alert and a yellow reminder | 26 | unchanged |
| A good note and a bad note; an open and a locked door | 22 | unchanged |

All 18 pairs now pass by colour alone. The five room colours were found by a search over greens, reds, blues, yellows and a neutral, keeping each dark enough for white lettering.

**Marks that do not rest on colour**, added as well:

- an emergency alert carries a white "!" in a red disc, a reminder a small amber square;
- a gauge that is low has "!" in front of its number, a critical one "!!";
- a cost is a square-cornered chip with a dashed edge, a gain a pill with a tick;
- on the station map a locked door has a white bar across it, and on the surface map a broken solar panel has a white stroke.

**Tried in the game:** the three sizes in Settings, remembered after a reload; Settings, the Power Board, the Control Center, the Map and an emergency card at the largest size at 1280 x 800, 812 x 375 and 375 x 812, each inside the screen with no sideways scrolling; the marks on alerts, gauges, chips and the locked door; the new map colours and legend.

**Not done:** nobody with colour-blindness has looked at the game, and no young reader has tried the larger text. The check covers the play screen and the maps, not the job games, the farm screens or the 3D world's warning lights. Other languages are not started.

### Languages: the whole game in 16 languages

**What the player gets.** A globe on the title screen and a Language row at the top of Settings, with English, Español, Français, Deutsch, Português, Italiano, Русский, Türkçe, العربية (Arabic), हिन्दी (Hindi), বাংলা (Bengali), 中文 (Chinese, simplified), 日本語 (Japanese), 한국어 (Korean), Bahasa Indonesia and Tiếng Việt. Every text in the game is translated: the title page, the mission briefing, the comic and the training, REGO's hints and spoken lines, every panel and window, every emergency card and its choices, the questions, the job games, the alerts, the end screen and the 3D signs. A browser set to one of these languages starts in it. Arabic text reads right to left inside its boxes. REGO speaks the chosen language when the device has a voice for it, and stays quiet rather than reading it with an English voice when it has not. Changing language restarts the game; a mission in progress is saved first.

**Made with AI, said on the home screen.** Under the small print the title screen now says, in every language: "Made with AI: the code, the pictures and the translations were created with AI tools, directed by a human designer."

**The station's textures get their mark too.** Every SI picture already showed an "SI-generated" mark, except the four SI textures tiled across the station's walls, floors, ceilings and doors, which cannot carry a mark of their own. Now, while you are inside the station, a small label in the bottom-left corner of the screen says "Station walls and floors: SI-generated" (in every language). It hides with the HUD and on Mars, stays clear of REGO's bubble and the buttons, and on a phone held upright sits above the buttons and the action prompt.

**How it is built.** The game is still written in English. Every text a player sees is marked in the code (`` tt`...` `` or `tt('...')`) and looked up in `lang/<code>.json`, which maps the English to the translation; numbers and names go into `{0}`, `{1}` places so each language can put them where its grammar wants. The language file is loaded before anything else, so names set up once (rooms, machines, crops) are translated too. A text with no translation shows in English, so new text never breaks a language.

**How the texts were found.** `tools/i18n.mjs` reads the game's source with a small lexer and marked 2333 texts. Rules keep code apart from words: comparisons, lookups, style names, file names, fonts, colours and settings such as a time zone are left alone. Places where English grammar was built in code were rewritten so each language gets whole sentences: plural endings ("1 panel / 2 panels" became two sentences), sentences glued from pieces in the job games, lists joined with "and", "a"/"an", and words such as "open" or "never" picked by a condition. Case changes keep German nouns capitalised.

**How it was checked.**

- `node tools/i18n.mjs check` fails if a text a player can see is not marked, or if a translation changes the markup, a key name inside `<kbd>`, or the `{0}` places. It passes for every language.
- A test language, `?lang=qps`, puts every marked text in ⟦brackets⟧. With it the title, the mission briefing in all four modes, the comic and the start of the training, the play screen, every window, every station panel, every emergency card, the questions, the alerts, the job games' windows and both endings were opened and searched for plain English. The misses it found were fixed; one of them, a time-zone setting marked as text, would have stopped event cards in every language.
- Every game test passes in English, and the English screens are unchanged.

**Fitting the words.** Longer words were checked on screen in German, French, Russian, Arabic, Hindi, Chinese and Japanese. Three things changed: the Power Board's level buttons widen for a long "OFF" ("À L'ARRÊT"), a breaker lever squeezes its label to fit, and on a narrow screen a long gauge name shortens with "…" beside its icon so the number always shows whole. Three labels the style sheet wrote ("DID YOU KNOW?", "REGO · HINT", "SELECTED") now come from the language file, and the check fails if a style sheet writes words again.

**Not done.** The translations were written by an AI model, one language at a time, from the English with a shared brief (names, key letters, units, informal "you", words for 7-year-olds). A machine checked their form, not their meaning: nobody who speaks these languages has read them. Numbers the game works out (3.2 kg) keep the English decimal point; numbers written in the text follow the translator (German writes 29,5), and in languages that use a decimal comma thousands are spaced (384 400). The pop-up explanations find a word only in the form the glossary gives, so in languages that change a word's ending (Arabic, Portuguese, Russian) some mentions have no pop-up. A few sentences still join a piece added by the code at the end (a sunspot group number, the end screen's summary), which reads stiffly in Japanese word order. The job games' canvas pictures were checked in the code, not on screen. REGO's voice in each language depends on the device having a voice for it, and nobody has listened. The teacher's page and the documents are in English only. The mission log keeps the language it was written in after a switch.

## 7. The Mars expansion (brief of 15 November 2026)

The Moon game stays as it is. Mars is a second world on the same engine, chosen on the mission page.
Every Mars number, its class and its source are in [MARS_SCIENCE.md](MARS_SCIENCE.md). Classes: **Observed** on Mars · **Demonstrated** (and where) · **Proposed** by NASA studies · **Game** (made for play).

| Milestone | What it is | State |
|---|---|---|
| 1. Research and map | The site, the real elevation data, the Mars ground, sky, dust and light; walking and driving | **Built** (this section) |
| 2. Mars station | The 14 buildings, each with a job in the outpost's balance | **First version built**: outsides, panels, switches and effects. Rooms you can walk into, building scenes and repairs are not built |
| 3. Survival on Mars | A mission that can be won and lost: storms that arrive by themselves, breakdowns, EVA limits | **First mission built** ("Survive on Mars", below). No surprise event cards, crew jobs or hands-on repairs yet |
| 4. Training and story | Mars lessons, REGO's Mars lines, the radio delay in conversations | **Training built** ("Mars training", below). The crew can be talked to. No story yet |
| 5. Moon ↔ Mars in Unlimited | Rocket flights between the worlds under real launch windows (about every 26 months, about 7 months each way) | Not built |
| 6. Cinematics | Landing, storm and sunset scenes | Not built |
| 7. Full check | Playtests on all devices, translation of the Mars texts | Not built |

### Milestone 1: what was built and how it was checked

**The site.** 39.5°N, 191.2°E: a flat bay of Arcadia Planitia among the Erebus Montes, 3,992 m below Mars's reference level. It was chosen from the data: low ground (thick air for landing), under 40°N (sunlight), over buried ice (water), flat. A published landing-site study shortlists places beside it for the same reasons.

**What is real.** `tools/build_mars.mjs` downloads NASA's MOLA elevation files and packs four things into `js/mars/mola.js`: the whole planet at one value per degree, a 192 km region at 1.2 km a cell, the outline of the horizon as seen from the outpost (720 bearings, with the planet's curve taken off), and the tilt of the plain. The Map shows the first two; the hills on the skyline are the third; the ground's overall slope is the fourth.

**What is made for play.** MOLA has one height every 463 m, so the 1.6 km you can walk is built by recipe on top of the real tilt: gentle rolls, 30 small craters, a young crater that reached the ice, an old soft one, a lava-flow edge, a field of wind ripples, 4,200 rocks, and cracked "polygon" ground (the pattern Phoenix photographed over shallow ice). The Map's "Why here?" page and every building panel say which kind of fact each thing is.

**The sky and the light.** The Sun's path is worked out for the latitude and the season (Ls), with a sol of 24 h 39 min 35 s. Dust is one number (optical depth, tau): it dims the direct beam fast and the whole-sky glow slowly, browns the sky, shortens the view and settles on the solar panels. Sunsets are blue around the Sun. Dust devils cross the plain on clear afternoons.

**The outpost.** Solar field plus one 10 kW fission unit, batteries, and twelve buildings that use power. Switching a building off has a consequence within hours: no heat pump, the rooms freeze; no life support, the air goes stale and water is not recycled; no ISRU, oxygen falls; and so on for all of them. A "science demo" control at the Power Station lets the player make the sky dusty or stormy to see what happens. It is labelled as a demo: real storms cannot be switched on.

**Honest limits of this step.** Nobody can be lost (health never reaches zero). There are no rooms to walk into, no crew to see, no repairs, no events, no training and no story. The dust-to-sunlight formula is a simple estimate that has not been checked against published tables. The Mars texts are marked for translation but are not yet in the 15 translated languages, so they show in English.

**Checked.** `node tools/mars_test.mjs`: 117 checks (the data lands Olympus Mons, Hellas and Valles Marineris where they are; noon Sun height, day length and yearly sunlight match the fact sheet; every building's switch has its effect; every door can be reached; the same world every time). It found one real fault while it was being written: a tunnel blocked the laboratory's door. In the browser: walking, running, jumping (1.5 m high in Mars gravity against 3.6 m on the Moon), the rover, all 14 panels, the five map pages, saving and loading, and a Moon mission started afterwards to confirm nothing there changed.

### The yellow guide line on Mars

On the Moon a yellow line on the ground shows the way whenever REGO gives a hint. Mars only had the orange beam. Now every hint, piece of advice, alert you click and place you pick on the map draws the same yellow line on Mars.

On the Moon's surface the line is straight. That would not do at the Mars base, where pressurised tunnels join the modules into a wall, so the line is planned round them: a grid of 2 m squares, the shortest way over the open ones, then pulled tight so it only bends where it must. It leaves more room when you are in the rover. `routeAround` in `js/mars/terrain.js` is pure logic; `node tools/mars_test.mjs` checks every pair of doors (182 routes): none passes through a building, tunnel or boulder, and none is more than 4.5 times the straight distance. A route takes about 0.2 ms and is only planned again when you or the target have moved.

### Mars in every language

The 324 texts of Mars step one (the planet cards, the briefing, all 14 buildings, the gauges, REGO's Mars hints, the map) are translated into the same 15 languages, so every language is complete again (2,660 texts each). Three Mars lines that were built from pieces became whole sentences: the sky demo (clear, dusty, a regional storm), the season (one phrase per season) and "1 building still to see". Checked on screen: Mars in German has no English left; the Arabic mission briefing now keeps "24 L" in its own order (a value in a right-to-left box takes the direction of its own first letter). The translation tool now spaces only numbers that the English writes with a thousands comma, so German decimals such as 0,057 stay as written; three German lines it had broken are repaired. The background "SI-generated" marks are skipped by screen readers, like the picture marks.

Later Mars parts followed: the crew and Command Habitat, the Map and scenery, and now "Survive on Mars" (135 texts), the Science Center (203 texts, on its own page too) and the Mars training (29 texts). Every language is complete again (3,133 texts each). Two Survive on Mars lines that glued an ending on ("before the storm arrives", "in the storm") became two whole sentences each. The Science Center's pictures write their labels on a canvas, and in 12 languages some ran off the edge or onto each other; now a label that is too long shrinks a little (down to 10 px, then squeezes), the air-pressure chart's name column is as wide as its longest name, and the legends are spaced by their real width. English looks the same. Checked on screen: the Science Center in Russian and Arabic has no English left except the titles of the sources; a canvas check finds no label off the edge or overlapping in any of the 16 languages; the Mars training was played through all 11 steps in German and started in Japanese.
### A better Map (the Map screen, first of two map steps)

The Map was white blobs on brown. It is now its own file, `js/mars/map.js`, and does these things:

- **The outpost page** is one map you can zoom (scroll, or the + and − buttons) and drag, from 40 m across to the whole 1.6 km. Buildings are coloured by what they are part of (crew, air, water, food, power, heat, science, radio, rover), turn dark with a red cross when switched off and get an amber edge when short of power. Pipes and cables are drawn in the same colours, so you can see what feeds what.
- **Point and click.** Pointing at anything says what it is, how far, and how it is doing. Clicking a building, the rover or a place sets the yellow guide line to it; clicking bare ground marks a spot and guides you there.
- **The ground** is coloured by height, shaded from the north-west, with a thin line every 2 m and a stronger one every 10 m. The lava-flow edge, the craters and the ripple field can all be read off it.
- **Places** you have not found yet show as a question mark where they are, so there is always somewhere to go; they get their name when you find them.
- **Also on it:** the yellow line (the same route the line on the ground takes), the way you have come, the crew who are outdoors, the rover pointing the way it faces, the part of the ground you are looking at, where the Sun is, the wind, a scale and north.
- **The corner map** uses the same drawing and looks further ahead when you are in the rover.
- **The region and planet pages** now answer the pointer: move it and read the real latitude, longitude and height from NASA's MOLA data (Olympus Mons reads +19,040 m, Hellas −6,280 m). The region has lines of latitude and longitude, rings at 25, 50 and 75 km, the hill that stands highest on the outpost's skyline, and EM-16, a landing site a published study looked at (Proposed).

**Checked.** `node tools/mars_test.mjs`: 143 checks (18 new on the Map: the readings match the data, zooming keeps the point under the pointer, the view cannot be lost off the edge). In the browser: all four pages, pointing, clicking a building, a question mark and bare ground, zoom, drag, and the corner map; no errors. The new texts are not translated yet.

### Better ground and scenery (second of two map steps)

**The ground.** Dark, winding dust-devil tracks now cross the plain, pale dust lies in the lee of the young craters, and the blotches in the soil are calmer. Rocks are dark basalt with pale dust lying on their tops.

**The sky.** The Sun has its own small disc (about two-thirds the size it looks from Earth). Thin, streaky ice clouds drift high up: faint by day, bright around sunrise and sunset, gone in a dust storm. Before dawn a blue-white star stands near where the Sun will rise: that is Earth, placed from the same line-up of the planets the radio delay uses. At night Phobos crosses low in the south, from west to east. REGO points each of them out the first time.

**Three more places to find** (11 in all): a terraced crater with a real bench in its wall, the lander's heat shield, backshell and parachute lying where they fell, and a seismometer under its dome, far from the base so footsteps do not shake it. Out beyond the map, 16 larger craters give the far plain some shape.

**What kind of fact each is** is in MARS_SCIENCE.md, section 9. Several of these come from general knowledge of Mars and were not checked against a source in this pass; that list says which.

**Checked.** `node tools/mars_test.mjs`: 161 checks (18 new). In the browser: each new place seen and found, the clouds by day and at dawn, Earth before sunrise, Phobos at night, no errors. Frame time could not be measured reliably in a background tab; the number of triangles drawn is unchanged (about 590,000 at the base).

### Survive on Mars (milestone 3, first mission)

Mars can now be won and lost. The mission page offers two ways to play Mars: **Explore** (as before: no ending) and **Survive on Mars**.

**The mission.** Hold the outpost for 7 sols until the supply lander arrives. The tanks start low (12 kg of oxygen, 60 L of water, 36 kg of food, a battery about a third full), the panels are dusty, and there are 5 spare parts in the depot and 4 more still packed in the lander.

**The storm.** A regional dust storm arrives in the second sol and stays about three sols, with the dust at 4.8 to 5.6 (the 2007 storm at Opportunity was above 5.5; the 2018 one reached 10.8). The solar field then makes about a third of its power. REGO warns of it from the start.

**Things break.** Seven to thirteen breakdowns, one every half to one sol: the oxygen plant's filter, the heat pump, the air scrubber, the ice well's pump, a battery module, a row of solar tables, the dish, the greenhouse lamps. Each stops what that machine does. The first is always one that matters to life. A repair is done at the building's door, uses spare parts and takes time (half as long again in the storm). The breakdowns are made up for the game and the ending says so.

**Choices.** When power is short REGO says what to switch off first (laboratory, greenhouse, radio, garage, living quarters, medical bay) and never names life support, heat, oxygen or water. Brushing the panels before and after the storm, and fetching the parts from the lander, both cost time.

**Winning and losing.** The crew's health falls with no oxygen, stale air, cold rooms, no water or no food; at zero the mission is lost and the end screen names the cause, what led to it and what to do next time. Reaching the end of sol 7 wins. The end screen gives a grade from the crew's worst moment, the hours without full power and how much was mended.

**Saves.** The survival mission has its own save, apart from Mars exploring and from the Moon.

**Proved by playing it out** (`node tools/mars_survive_test.mjs`, 52 checks, 24 seeds, in steps of six minutes):
- a player who does nothing loses every time, between sol 2.9 and 3.8;
- a player who switches things off but mends nothing loses every time;
- a careful player (fetches the parts, brushes the panels, mends what breaks, switches off what can wait in the storm) wins every time, with the crew at full health and no brownout;
- mending everything but never switching anything off still wins, but with about 23 hours of brownout, rooms down to 4°C and a clearly lower grade. Load-shedding costs comfort and grade in this first mission; it does not yet decide life and death.

**Not in this mission.** No surprise event cards, no crew jobs, no training, no story, and the supply lander is not shown landing. Repairs are a wait with a progress bar, not a hands-on job. The new texts are in English only.

### Mars training (milestone 4, first part)

The survival mission dropped a new player in with only REGO's hints. Mars now has a training, offered on the mission page for both ways of playing ("Skip the training" is ticked for you once you have finished it).

**Eleven steps, each finished by doing the thing:** walk to the Command Habitat along the yellow line; press E at its door; press Tab to see the power; switch the Research Laboratory off and on again; make the sky a regional storm at the Power Station and watch the solar power fall (REGO quotes the real before and after figures); make it clear again; a practice alarm, then mend the heat pump; get into the rover; drive to the lander; unpack the spare parts; drive back and park on the charging pad.

**How it behaves.** It runs in the real outpost, with the real panels and the real rover. The bar at the top says "Training 3 of 11" and what to do; the yellow line leads to each place; H repeats the current step; a "Skip training" button ends it. Nothing can go wrong: it keeps to daytime, the sky changes at once, the practice breakdown needs no spare part, and nothing is saved until it is over. Afterwards exploring simply carries on, and a survival mission starts from a fresh outpost.

**Also fixed here.** A repair made outside the survival mission (the practice one) stopped with an error after mending; it now finishes properly.

**Checked.** `node tools/mars_training_test.mjs`: 40 checks, walking a stand-in player through every step: each step finishes when the thing is done and not before, in order. In the browser: all eleven steps played through to the end, the skip button, the hand-over to a fresh survival mission, and the mission page's tick box. Not done: a child has not tried it, and it has not been played on a phone. The texts are in English only.

### Small leftovers, cleared

**Time skips.** A long wait (a repair, a rest) is now taken in steps of six minutes. Before, one long step used the sunlight at its start for the whole wait, so a daytime wait could count the battery too low.

**Random numbers after loading.** A loaded Mars game now carries on the same random sequence instead of starting it again; the place in the sequence is saved with the game.

**A year of exploring.** A year-long run showed two things. Left alone, the panels reach their dust limit and the food runs out, so while you explore (not in the survival mission) the crew now brush the panels when they are a quarter covered, and a supply lander brings food before the store is empty. The run also showed something the first Mars step had missed: **in winter the outpost cannot carry its full load**. At 39.5°N the winter days are short and the Sun is low, and even with clean panels the base browned out about 1,500 hours a year. While you explore, the crew now switch off what can wait when the battery is nearly empty and switch it back on when the Sun has refilled it (about 150 nights a year); REGO says so the first time. In the survival mission nothing is done for you. A winter mission would be a natural next one.

**The Map on a phone.** Two fingers now zoom the Map (pinch), keeping the spot between the fingers where it is; one finger still drags and a tap still picks. Checked with touch events; not yet on a real phone.

**Training on a phone.** At phone size the "Skip training" button sat on top of the touch buttons; it now sits beside the stick. The E button and the lightning button were checked to carry the first three steps.

**Checks that were broken.** `tools/build_docs.mjs` did not run at all (a stray backtick in its text); it runs again and has a real `--check`. `tools/mini_test.mjs` flagged the harvest game as too tight on time on Pilot and Commander (70% and 84% of the clock for a perfect player); the game now gives 24 seconds instead of 17 (49% and 62%).

**Housekeeping.** The stale remote branch `feat/mars-map` is deleted; its one extra commit was a test file main already has, byte for byte.

**Checked.** `node tools/mars_survive_test.mjs`: 70 checks (18 new: the year of exploring, the crew's upkeep rules, the random sequence after loading). All other checks pass.

**The science that was not verified.** Each open point was checked against a page that was opened and read (15 Nov 2026); MARS_SCIENCE.md has the sources.
- **Sunlight under dust** was the important one. The game's own formula was compared with NASA's published table (Appelbaum and Landis 1991): close with the Sun high, 8 to 21% too bright with the Sun 60° from overhead, and far too dark with a low Sun in a storm. The formula is gone; the game now reads the table itself. A clear noon is unchanged (99 kW); a storm at dust 5 gives 33 kW at noon. The survival mission plays out the same (doing nothing loses, careful play wins), and `tools/mars_test.mjs` now checks seven values straight from the table (172 checks).
- **Confirmed as they were:** Phobos rises in the west and sets in the east twice a sol; dust devils leave dark tracks in Arcadia Planitia; thin ice clouds, bright at twilight; terraced craters are used with radar to measure the buried ice; landers' heat shields, backshells and parachutes have been photographed where they fell; Earth is a bright star near the Sun; the Sun looks about two-thirds its size from Earth.
- **Still the game's own working:** how often Phobos rises (11.1 hours) and how long it takes to cross the sky (about 4 hours), both worked out from its orbit. NASA pages give no figure for the first and say about 5½ hours for the second.

### Moon playtest list, cleared

The improvements list from the newest Pilot playtest (15 Nov 2026), and its two bugs that could not be repeated.

**The night, a day ahead.** In the last 24 hours before sunset the game works out whether the reactor and the battery will carry the base through the dark. If not, the first alert reads "Tonight the power will run short", with the reactor's power, the power the base needs, and what to do: fix or build panels while the battery still has room, rebuild the Battery Store or add a module once it will be full. REGO says it too (at most once every six game hours) and the yellow line leads to the job.

**Smaller things.** The Topside Heaters start at the level the machines need, not one above it. The flying lesson teaches braking ("press S to slow down before you land") and is REGO's glowing pick. A line under the health bar shows the charge the rover or hopper needs to get home (amber when only just enough, red when not). "Voices on the Radio" and the crew jobs in the Control Center now have a glowing pick. World labels no longer draw over the gauges, the alerts or each other; the place the guide points at always shows. Names on the Control Center's station map stay inside their boxes. The room consoles and the Solar Field console read as consoles from behind (they were plain dark boxes). Sparks, dust and vapour are soft round dots, not squares. Hens keep apart and stay out of the coop. First-person view only says "look up to find Earth" on the surface. The game pauses when the window loses focus (Moon only).

**Gauges.** From 720 to 900 px wide the seven gauges are always two rows; narrower, as many columns as fit. A narrow gauge writes its name a little smaller and lets its small line take two lines, so nothing is cut in mid-word. Checked at 610, 680, 736, 800, 900, 960, 1000 and 1280 px.

**The two bugs.** *Standing stuck in the station:* the moon-soil bed and the experiment bench were solid while hidden, so both farms had unseen obstacles; they are now solid only while shown. The two times reported (4.5 s and 13 s) are also exactly the shortest and longest job scenes, when the player cannot move by design, so this may not be all of it. *The panel left outside the airlock:* holding E fired the action many times a second (pick up, put down, pick up), and E also turns dialogue pages, so one press too many after the last line put the panel down. A held key now acts once, and E is ignored for a third of a second after a dialogue closes. Which of the two the tester met is not known.

**Left alone.** The gap between surprise events: main already holds a new emergency back while two jobs are open, and that has not been played yet. The harvest game's timing still needs a real child.

### REGO and the screens say the same thing

From the walkthrough of 15 Nov 2026 (W1 to W7): in several places REGO's spoken advice and the screen it sent you to disagreed.

**The Moon's Power Board.** REGO's hint (H) used its own list of things to turn down, and the Power Board used another, so REGO could say "turn down the Earth Link and the farm lights" while the board said "nothing can be turned down". Both now come from the board's one rule (`ui.powerHint`): REGO names the switch that glows. In a brownout at night with nothing else to shed, the board now turns the Topside Heaters down (weak machines freeze topside anyway, and the power is better spent on air and water); before, it stopped at "nothing can be turned down". The day before a night that will run short, the board shows the night warning, where it used to say "Nothing needs changing right now". When the rescue ship lands before the next sunrise, the words count to the rescue and no longer talk about "the next night". REGO only suggests giving a resting robot a job when the Control Center would glow one for it.

**Mars switches.** A switch now glows only when REGO would have you press it: "switch off" for the buildings it names, "switch on" when power is back (it used to glow "on" always and "off" never). The Power Station panel (Tab, from anywhere) carries those switches and one for every building that is off, and comes back after each press. REGO's words say so.

**Mars, the night ahead.** While the Sun is up (the last six hours of a clear day, all day in a storm) the game works out whether the battery will last the night on the fission unit alone. If not, an alert reads "Tonight the battery will not last" and REGO names what to switch off before dark. The rule is `nightPlan` in `js/mars/survive.js`, with `shedPlan` moved beside it.

**Checked.** `node tools/mars_survive_test.mjs`: 85 checks (10 new: the night ahead and the list for it). All other checks pass. In the browser: the walkthrough's cases on both worlds.

### The yellow line no longer goes through walls

From the walkthrough of 15 Nov 2026 (W8 to W10).

**On the Moon's surface** the line was one straight stroke from you to the place, so from the west side of the base it ran through a building, and a player following it walked into a wall. It now goes round buildings and round the pit, with the route finder Mars already had. That finder moved from `js/mars/terrain.js` to `js/route.js`, which both worlds use. The rover is given more room than a walker; the hopper in the air still gets a straight line. Finding a way takes about 1 ms.

**In the station** the line already left a room by its door, but not when you stood in the doorway itself: from there it cut straight across the wall beside the door. Going into a room from its doorway, it first folded back to the middle of the hall. Both are gone: a doorway now counts as part of its door, and from the hall right at a door the line goes straight in.

**When a job you chose on a card is done**, its line and REGO's reminder used to stay until you pressed H. They now go at once, and REGO says what matters next.

**Checked.** `node tools/guide_test.mjs`: 20 checks. In the station, every line between 80 places (each room's console and far corner, each doorway, the hall beside each door, the cave: 6,320 lines) stays on the floor. On the surface: round a building, more room for the rover, a target inside its own building, round the pit, the elevator at the pit's rim, a far station. In the browser, a walker steered only by the game's route reached every room and every surface place tried, including the two spots where the walkthrough got stuck.

### REGO's picks, cards and events (walkthrough W11 to W16)

**The air-leak card.** REGO's pick between "lock the door" and "run and patch" was already made on oxygen: it only sends you to patch when the walk, the patch and refilling the room leave more than 1 kg in the tank (0.3 kg for the Water Room and the Oxygen Room, which keep you alive). That rule is unchanged. What was missing was the reason: locking the Animal Bay looked like a careless pick when the room froze and the fish died. The glowing choice now carries REGO's reason ("Oxygen comes first. Patching would cost about 2.8 kg of your 3.3 kg, and that is too close."), and the "lock" choice names everything that will be lost: the fish in the Animal Bay, cooking in the Kitchen.

**Picks that were missing.** "The Farm Pump Has Stopped" and "Half the Lamps Went Dark" now have a glowing pick with its reason (fix it, or "Not now" when there is no material). In a farm's own panel the job REGO would do glows: the pump first, then the lamps, then a ripe rack.

**No new emergency while the power is out.** A blackout is emergency enough: storms, meteoroids and breakdowns now wait until the power is back, as they already waited once oxygen or water was gone. The "Frozen Solid" card no longer says the heaters "were set too low" when the level was right and the power was out; it says the power is out.

**The question waits for the job.** After a card on which you chose a job ("Go and fix it", "Run there and patch the hole"), the quick question used to come at once, between choosing and doing. It now comes when the job is done.

**Sleep.** Woken by something going wrong, the toast now reads "Something has gone wrong. You wake up early." where it said "You wake up rested". "Sleep for 8 hours" no longer glows for ten hours after you got up, or while the battery is running down.

**Two lines that did not fit.** A rover or hopper whose battery dies while you are down in the station is now a short toast; the "walk home: follow the line to the elevator" warning is only for someone on the surface. On Mars, cold rooms with the heat pump running again read "The rooms are still cold, but the heat pump is running again", where REGO said the pump "needs to be on".

### Screen and controls (walkthrough W27 to W37)

**World labels keep clear of the whole HUD, on both worlds.** The Moon's rule (never over the HUD, never on a nearer label, the goal always shown) is now one function, `ui.placeLabels`, and Mars uses it too: on Mars a label used to sit on the health bar. The HUD it keeps clear of now includes the objective strip and its buttons, the bottom bar, REGO's bubble and the E prompt.

**Carrying.** The health bar is never squeezed under 30 px: the name of what you carry drops to a line of its own when the two do not fit. Carrying something into a room, **E is now the room and Q puts the thing down**, the same as at the Suit Lockers and the elevator (it was the other way round in rooms, and a panel was easily put down by mistake). The elevator's reach now covers the spot you arrive on, so E there rides and does not drop what you carry.

**Smaller things.** The objective strip steps aside while a job is being done. The home page no longer shows both scroll bars (its picture overhangs the window by 14 px so it can drift with the mouse; that overhang counted as something to scroll to). Nothing shows through the sticky Launch bar on the mission page. On Mars, buildings you switched off are one alert ("3 buildings are switched off"), not one each. A crop that needs two days or more says so in days. The Moon's mission log says "Rescue day" where the clock does. Both end screens have a second button ("Now try Mars", "Back to the start") and a link to the science notes. A paused game dims and loses its colour, so it cannot be mistaken for a frozen one.

**Not done, because they need to be looked at:** the camera going into the cave rock while dragging a panel, and REGO standing in front of the astronaut in a job scene. The camera was reworked after the walkthrough (smooth zoom, a camera lock), so the first may already be different. The Mars clock ending on "24:00" is on purpose: the lander comes at the very end of the last sol.
