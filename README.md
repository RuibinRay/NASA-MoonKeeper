# MOONKEEPER — Hold Tranquility Deep

A 3D Moon-base survival and building game for ages 7–18.

A meteor shower has hit every station on the Moon. You are the only one left at Tranquility Deep, a base inside a lunar lava tube.
With REGO the robot you must keep the **power on** and the **air in** until rescue arrives — or, in Unlimited mode, build a Moon town.
**No choice is free:** every machine eats power, every helper eats something, every fix costs time.

## Play

- **On this computer:** double-click `play.bat` (needs Node.js), or run `node tools/serve.mjs 8130` and open http://localhost:8130
- **Online:** upload the folder to any static web host (GitHub Pages, Netlify, itch.io…). No build step, no login, nothing to install. The mission saves itself in the browser.
- Testing shortcut: add `?go=cadet`, `?go=pilot`, `?go=commander` or `?go=unlimited` to the address to skip the comic and training (`&seed=123` repeats a mission).

| Key | Does |
|---|---|
| W A S D / arrows | walk · drive the rover · fly the hopper |
| Mouse drag (or click to lock) | look around |
| Space / C | hop · hopper up / down |
| **E** | do the thing shown at the bottom of the screen |
| **Q** | second action (take cargo out of a vehicle) |
| Tab · M · H · N | Power Board · Map · ask REGO · Space Guide |
| V · P | first/third person · pause |

## What you do

1. **Fix the power.** Pull a broken solar panel off its mount, drag it to the rover, drive to the pit elevator, carry it down to the **Fix-It Bench**, wait while the robot arm repairs it, then carry it back up and install it.
2. **Keep the air in.** Every room is a bubble of air behind a bulkhead door. When one is holed, patch it — or lock its door to save the rest of the station (that room freezes and must be rebuilt).
3. **Rebuild.** Wrecked rooms (farm, bathroom, bunks, battery store…) are rebuilt in a short scene that plays by itself while the clock runs.
4. **Eat.** Tins run out. Grow potatoes and tomatoes, keep the hens fed (they eat dry feed people cannot), collect eggs, and cook.
5. **Expand.** The robot-arm builder makes new solar panels and battery modules from materials; you carry and install them.
6. **Explore.** Three other stations (Aurora, Sakura, Chandra) have crates of materials, food and water, and a stranded astronaut each. Go by rover or hopper; both need charging on their pads.
7. **Give jobs.** Robots cost electricity; rescued astronauts cost food. Assign them in the Control Center, which also shows where every error is.

Modes: **Cadet** (4 days), **Pilot** (7 days), **Commander** (10 days, scarce materials), **Unlimited** (no end, endless materials).

## Project layout

```
index.html            page shell and HUD
css/style.css         all styling
js/main.js            game loop, player, rover, hopper, carrying, build scenes, saving
js/actions.js         what E does everywhere, room panels, alerts, REGO's advice
js/events.js          surprise events (real-dated storms, moonquakes, impacts, air leaks…)
js/story.js           comic pages, training, meteor-shower scene, endings
js/sim.js             the survival simulation (pure logic; `node tools/sim_test.mjs` checks balance)
js/world.js           3D world (surface, other stations, red-walled station, vehicles)
js/actors.js          astronaut, REGO, BOLT robots
js/ui.js, icons.js    interface and hand-drawn icons
js/minigames.js       dish aiming, air-filter build, fire fighting
js/nasa-events.js     generated data module (see docs)
docs/SCIENCE_AND_SOURCES.md   every real number, dataset and source — kept out of the game on purpose
tools/                data download/build scripts, art generation, local server
assets/img, assets/tex        what the game loads   ·   assets/art   full-size art originals (git-ignored)
```

## Science and credits

The game shows no logos or citations so the screen stays clean for young players.
All data sources, real numbers and simplifications are in [docs/SCIENCE_AND_SOURCES.md](docs/SCIENCE_AND_SOURCES.md).

Not an official NASA product.
