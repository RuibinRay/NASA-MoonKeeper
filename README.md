# MOONKEEPER — Hold Tranquility Deep

A 3D Moon-base survival and building game for ages 7–18.

A meteor shower has hit every station on the Moon. You are the only one left at Tranquility Deep, a base inside a lunar lava tube.
With REGO the robot you must keep the **power on** and the **air in** until rescue arrives — or, in Unlimited mode, build a Moon town.
**No choice is free:** every machine eats power, every helper eats something, every fix costs time.

## Play

- **On this computer:** double-click `play.bat` (needs Node.js), or run `node tools/serve.mjs 8130` and open http://localhost:8130
- **Online:** upload the folder to any static web host (GitHub Pages, Netlify, itch.io…). No build step, no login, nothing to install. The mission saves itself in the browser.
- **Mars (preview):** on the mission page choose **Mars** to explore a second world: a Mars map built from NASA elevation data and a working outpost of 14 buildings. It is the first step of the Mars expansion; see [docs/ROADMAP.md](docs/ROADMAP.md) for what comes next and [docs/MARS_SCIENCE.md](docs/MARS_SCIENCE.md) for where every number comes from. Shortcut: `?go=mars` (`&load=1` continues the saved Mars game).
- Testing shortcut: add `?go=cadet`, `?go=pilot`, `?go=commander` or `?go=unlimited` to the address to skip the comic and training (`&seed=123` repeats a mission).

| Key | Does |
|---|---|
| W A S D / arrows | walk · drive the rover · fly the hopper |
| Mouse drag (or click to lock) | look around |
| Space / C | hop · hopper up / down |
| **E** | do the thing shown at the bottom of the screen |
| Space · Q (in the digger) | dig · tip the bucket into the filler |
| **Q** | second action (take cargo out of a vehicle) |
| Tab · M · H · N · L · T | Power Board · Map · ask REGO · Space Guide · Life-support loop · Day and night |
| In the hopper | Space up · C down (it slows itself near the ground) · a ring below shows where it will land |
| Settings (gear button) | Guide mode · job games · questions after emergencies · REGO reads aloud · sound · music · graphics detail (Auto, High, Medium, Low) · text size (Normal, Large, Larger) · language · frame-rate counter |
| V · P | first/third person · pause |

## What you do

1. **Fix the power.** Pull a broken solar panel off its mount, drag it to the rover, drive to the pit elevator, ride down into the cave, haul it through the airlock to the **Fix-It Bench**, wait while the robot arm repairs it, then carry it back up and install it.
2. **Mind your suit.** The surface and the cave have no air. Inside the station, take your suit off at the Suit Lockers in the airlock (indoor jobs go faster, and you can cook and sleep) — and put it back on before you step out.
3. **Keep the air in.** Every room is a bubble of air behind a bulkhead door. When one is holed, patch it — or lock its door to save the rest of the station (that room freezes and must be rebuilt).
4. **Rebuild.** Wrecked rooms (farm, bathroom, bunks, battery store…) are rebuilt in a short scene that plays by itself while the clock runs.
5. **Farm.** Six hydroponic racks under LED lamps. Choose what each one grows: potatoes, wheat, peas, tomatoes, soybeans, lettuce, spinach, radishes, herbs or thale cress. Every crop wants different light, water, warmth and plant food, and a plant grows only as fast as whatever it has least of.
6. **Make water.** A few canisters of icy soil wait at the base. For more, follow the pale blue light south-west to the **Polar Ice Mine**: a crater that never sees the Sun. Drive the digger, hold Space over a frosty patch, tip two scoops into the filler, and haul the sealed canister home. Carry canisters to the Water Plant on the surface, choose heater, power, time and chamber pressure, and watch the ice turn to vapour and freeze on the cold trap. Or try making water from rock, and see what it costs.
7. **Close the loop.** Press L for the life-support loop: your breath feeds the plants, their damp air is recycled, waste becomes plant food. Run the moon-soil experiment and spend research on upgrades.
8. **Eat.** Tins run out. Grow potatoes and tomatoes, keep the hens fed (they eat dry feed people cannot), collect eggs, and cook.
9. **Expand.** The robot-arm builder makes new solar panels and battery modules from materials; you carry and install them.
10. **Explore.** The surface base (Habitat Dome, Command Tower, Greenhouse Dome, Research Lab, Battery Bank, Water Plant, Moon-Dust Mine) was holed by the meteor shower; walk up to any building and press E to learn what it was for. Three other stations have crates of materials, food and water, and a stranded astronaut each. Each has its own shape, so you know it from far away: Aurora is a white barrel vault half sunk in the soil, Sakura a three-tier tower behind a red gate, Chandra a six-sided hall under a golden dome. Go by rover or hopper; both need charging on their pads. The Map (M) shows the ground in shaded relief, with how far each station is from you.
11. **Give jobs.** Robots cost electricity; rescued astronauts cost food. Assign them in the Control Center, which also shows where every error is.

Modes: **Cadet** (4 days), **Pilot** (7 days), **Commander** (10 days, scarce materials), **Unlimited** (no end, endless materials).

## Languages

The game speaks 16 languages: English, Español, Français, Deutsch, Português, Italiano, Русский, Türkçe, العربية (Arabic), हिन्दी (Hindi), বাংলা (Bengali), 中文 (Chinese, simplified), 日本語 (Japanese), 한국어 (Korean), Bahasa Indonesia and Tiếng Việt. Choose one with the globe on the title screen or in Settings; the game remembers it, and a browser set to one of them starts in it. Changing language restarts the game; a mission in progress is saved and can be continued.

**Writing new text:** every word a player sees goes through `tt`: `` tt`Battery ${n}% full` `` or `tt('Settings')` (import it from `./i18n.js`). `node tools/i18n.mjs check` fails if a text a player can see is not marked, and `node tools/i18n.mjs wrap` marks it for you. A text with no translation yet simply shows in English.

**Translating:** `node tools/i18n.mjs todo <code> <folder>` writes the missing texts as numbered lines; translate each line (keep `{0}` places, tags and key names) and put them in with `node tools/i18n.mjs merge <code> <folder>/todo.tsv <done files>`. Open the game with `?lang=qps` to see every marked text in ⟦brackets⟧: any plain English left on screen is a text that is not marked.

## Use of SI (Super Intelligence)

MOONKEEPER was made with SI tools, directed by a human designer who chose what to build, asked for every change and decided what went in. The same facts are in [si-use.json](si-use.json) for machines.

| What | SI tool | Where |
|---|---|---|
| Code, tests, tools and documents | Claude (Anthropic), through Claude Code | `js/`, `tools/`, `css/`, `index.html`, `teachers.html`, `docs/` |
| Pictures | Higgsfield image model, run by `tools/gen_art.mjs` | all 83 pictures in `assets/img/`; the interior textures `assets/tex/wall3`, `floor3`, `ceil3`, `door3` |
| Translations | Claude (Anthropic) | `lang/*.json`, checked by machine, not yet by native speakers |

**Watermark:** every picture from `assets/img/` shows a visible "SI-generated" mark wherever the game shows it (`js/simark.js`; the title, mission and end backgrounds in `css/style.css`; the job games draw theirs on the canvas). The home screen also says the game was made with SI tools. The interior textures are tiled across the 3D walls and floors and carry no mark of their own.

**Not SI:** the Earth and Moon textures are NASA images (Blue Marble, CGI Moon Kit); the storms, moonquakes and meteorites come from NASA datasets (`data/raw`, `js/nasa-events.js`); REGO's voice is the speech built into the player's device.

## Project layout

```
index.html            page shell and HUD
js/i18n.js            languages: looks every text up in lang/<code>.json; anything missing stays English
lang/*.json           one file per language: English text → translation (15 languages besides English)
teachers.html         the teacher's page, ready to print (written by `node tools/build_teachers.mjs`; do not edit by hand)
css/style.css         all styling
js/main.js            game loop, player, rover, hopper, carrying, build scenes, saving
js/actions.js         what E does everywhere, room panels, alerts, REGO's advice
js/events.js          surprise events (real-dated storms, moonquakes, impacts, air leaks…)
js/story.js           comic pages, training, meteor-shower scene, endings
js/sim.js             the survival simulation (pure logic; `node tools/sim_test.mjs` checks that every mission can be won)
js/radio.js           what Mission Control says on the radio, and when (pure logic; `node tools/radio_test.mjs`)
tools/frost_test.mjs  what unheated cold does at night: vehicle batteries, chargers, the Water Plant (31 checks on `js/sim.js`)
tools/holes_test.mjs  the limits on how often surprise events may hole a room (21 checks on `js/sim.js`)
tools/crew_test.mjs   robots with no work, the chargers' switch, and people following in a line (22 checks)
tools/colour_test.mjs the warning colours under simulated colour-blindness: 18 pairs that must be told apart (`--table` prints them)
tools/i18n.mjs        the translation tool: `check` (every text a player sees is marked, every translation keeps its markup), `wrap`, `todo`, `merge`
js/moonmap.js         the real Moon to scale: real positions, distances, and the drawing for the Map's "The real Moon" page (pure logic; `node tools/moonmap_test.mjs` runs 42 checks)
js/life.js            crops, plant health, plant food, Water Plant, experiment, research (pure logic; `node tools/life_test.mjs` runs 71 checks)
js/lifeui.js          farm, Water Plant, life-support loop, research and experiment screens
docs/GAME_OVERVIEW.md  what the game is, what it teaches, how to play, the data behind it, test results, what to improve
docs/ROADMAP.md       what is built, what comes next, and which real data each plan uses
docs/TEACHERS.md      the teacher's page: learning goals, a 40-minute lesson, the questions the game asks (written by `node tools/build_teachers.mjs`, which takes the missions and questions from the game; `--check` fails if it is out of date)
js/mars/sim.js        Mars: the Sun's path, seasons, dust, temperature, and the outpost's power, air, water and food (pure logic)
js/mars/terrain.js    Mars: the shape of the ground and where the 14 buildings stand (pure logic)
js/mars/mola.js       Mars: real elevation data from NASA's MOLA laser, packed for the game (written by `node tools/build_mars.mjs`; do not edit by hand)
js/mars/world.js      Mars: the 3D ground, sky, dust, real skyline and the outpost
js/mars/game.js       Mars: what E does, the building panels, HUD, alerts, REGO's advice, the maps, saving (its own save, apart from the Moon's)
tools/build_mars.mjs  downloads the MOLA files from NASA's Planetary Data System and builds `js/mars/mola.js` (`--check` fails if it is out of date)
tools/mars_test.mjs   125 checks on the Mars data, the Sun and dust model, every building's effect, the layout, and the yellow guide line's routes
docs/MARS_SCIENCE.md  every Mars number in the game, its class (observed, demonstrated, proposed, made for the game) and its source
js/world.js           3D world (surface base, other stations, the cave, the white-panelled station, vehicles)
js/actors.js          astronaut, REGO, BOLT robots
js/follow.js          how REGO keeps up with you without walking into walls (pure logic; `node tools/follow_test.mjs` runs 44 checks)
js/ui.js, icons.js    interface and hand-drawn icons
js/minigames.js       dish aiming, air-filter build, fire fighting
js/nasa-events.js     generated data module (see docs)
docs/SCIENCE_AND_SOURCES.md   every real number, dataset and source — kept out of the game on purpose
tools/                data download/build scripts, art generation, local server, checks (`comment_scan.mjs` finds code hidden inside a comment)
assets/img, assets/tex        what the game loads   ·   assets/art   full-size art originals (git-ignored)
```

## Science and credits

The game shows no logos or citations so the screen stays clean for young players.
All data sources, real numbers and simplifications are in [docs/SCIENCE_AND_SOURCES.md](docs/SCIENCE_AND_SOURCES.md).

**For teachers:** a 40-minute lesson plan, the learning goals and the questions the game asks are in [docs/TEACHERS.md](docs/TEACHERS.md), and ready to print at `teachers.html` on the live site.

Not an official NASA product.
