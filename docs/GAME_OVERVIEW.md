# MOONKEEPER — what the game is, what it teaches, and the data behind it

14 November 2026 · see also [the science notes](SCIENCE_AND_SOURCES.md) and [the roadmap](ROADMAP.md)

## In short

MOONKEEPER is a free 3D browser game for ages 7 to 18 in which you keep a Moon base alive until a rescue ship arrives. [Play it here](https://ruibinray.github.io/NASA-MoonKeeper/) in any modern browser: no download, no login. The code and science notes are on [GitHub](https://github.com/RuibinRay/NASA-MoonKeeper).

A meteor shower has hit every station on the Moon. You are the only one left at Tranquility Deep, a station at the bottom of a real lunar pit, with a small robot called REGO. Power, air, water and food all run out unless you act, and every fix costs something else.

|  |  |
| --- | --- |
| Players | Ages 7 to 18. Three mission modes (Cadet, Pilot, Commander) and an endless building mode |
| Length | One mission is 4, 7 or 10 game days: about 15 to 30 minutes of play, plus reading |
| Teaches | Lunar day and night, vacuum and air pressure, power budgets, recycling water and oxygen, growing food, radiation, and staying calm when something breaks |
| Real data | NASA space-weather events, Apollo moonquakes and meteoroid impacts, meteorite falls, plants grown in Apollo soil |
| Built with | Plain JavaScript and Three.js. No build step, no server, the mission saves in the browser |

Not an official NASA product. The game shows no logos or citations, so the screen stays clean for young players; every source is listed in this document and in the repository.

## The goal

A child who finishes one mission should be able to explain, in their own words, why living on the Moon is hard and how people would solve it. The game never lectures first: the player meets each idea as a problem, and the explanation arrives when they need it.

| After playing, a child should know | How the game makes it stick |
| --- | --- |
| A day on the Moon lasts two weeks, and so does the night | The Sun really sets partway through the mission. Solar panels stop and the battery is all you have |
| Space has no air, so air must be held in by walls | Every room is a sealed bubble. A hole empties it, and locking its door saves the others |
| Nothing is free: every machine uses power | One Power Board for the whole base. Turning one thing up means turning another down |
| Water and oxygen are recycled, not thrown away | The life-support loop shows each litre and each breath going round |
| Food has to be grown, and plants need five things at once | Six racks, ten crops. Growth follows whatever the plant has least of |
| The Moon's ice is only in craters the Sun never reaches | You drive to one, dig the icy soil yourself and haul it home |
| Radiation is real and rock is the best shield | Solar storms are real dated events. The safe place is underground |
| A spacesuit is a one-person spaceship | You take it off indoors and cannot step outside without it |
| When something breaks, panic does not help. Thinking does | Every emergency stops the clock, explains what happened and offers choices, each with a cost |

**The one rule behind every design decision:** no choice is free. A child who learns to ask "what does this cost?" has learned the main lesson of living anywhere with limited resources, including Earth.

## The setting and the story

The game is set at a real place: a pit in the Moon's Sea of Tranquility, at 8.3355°N, 33.222°E. Scientists think the pit is a hole in the roof of a lava tube, a tunnel left behind when ancient lava drained away. Pictures from orbit show overhangs, and nobody has been inside yet. The game assumes the tunnel is there.

**Where you are**

- **The surface.** Grey dust, black sky, Earth hanging in almost the same spot overhead. Here stand the solar field, the radio dish, the landing pad, the rover and hopper, and a small base of domes and modules joined by tube corridors.
- **The pit elevator.** A lift that drops 105 m from the rim to the cave floor.
- **The cave.** The open lava tube: no air, but a steady 17°C, and shielded from radiation by the rock overhead. A path of blue lights leads to the station.
- **Tranquility Deep.** The station building inside the cave: an airlock with suit lockers, one long hall, and eleven rooms behind bulkhead doors. Workshop, Control Center, Kitchen, Oxygen Room and Potato Farm on one side; Battery Store, Bunk Room, Bathroom, Water Room, Animal Bay and Tomato Farm on the other.
- **Further out.** Three other countries' stations, each with a survivor and supplies, and the Polar Ice Mine, a crater whose floor never sees the Sun.

**What happens**

1. You arrive as the rookie. Two experienced astronauts, Commander Vasquez and engineer Tobi Okoro, train you by letting you do one whole repair yourself.
2. Mission Control warns of a meteor shower. You get underground in time. They do not.
3. Every station on the Moon is hit. Panels are broken, rooms are holed and frozen, the dish is knocked over. You are alone with REGO, a small tracked robot who follows you, lights your work and tells you what matters most.
4. Rescue is days away. You keep the power on and the air in until it lands, or in Unlimited mode you stay and build a Moon town.

The opening is told as comic pages. The characters are cartoons; the station, cave and surface pictures are realistic.

## How to play

Walk up to something and press E. The bar at the bottom of the screen always says what E will do, so a child who can read one line can play.

| Key | What it does |
| --- | --- |
| W A S D or arrow keys | Walk, drive the rover, fly the hopper, drive the digger |
| Mouse (drag, or click to lock) | Look around |
| Shift | Run |
| Space | Hop. In the hopper: go up. In the digger: dig |
| C | Hopper down |
| **E** | Do the thing shown at the bottom of the screen |
| Q | Second action: take cargo out of a vehicle, tip the digger's bucket |
| Tab | Power Board: share out the electricity |
| M | Map of the surface or the station |
| H | Ask REGO what matters most right now |
| L | Life-support loop: where every litre and every breath goes |
| T, or click the clock | Day and night: the temperature outside through a whole Moon day |
| N | Space Guide: how to play, real or made up, station tour, space words |
| V · P | First or third person · pause |

On a phone or tablet there is an on-screen stick and buttons. The speed button runs time at 1, 2 or 4 times.

**The first ten minutes**

1. A comic tells the story so far.
2. Training: walk, hop, drive the rover to the Solar Field, pull a cracked panel off its mount, load it, ride the elevator down, drag it through the airlock to the Fix-It Bench.
3. Take your suit off at the Suit Lockers. Learn the Control Center screen and the Power Board. Pick a rack in the farm.
4. Put your suit back on, carry the fixed panel up and install it. That is the whole repair loop, done once by hand.
5. The meteor shower hits. The mission clock starts.

Training can be skipped from the title screen.

**The four modes**

| Mode | For | Length | What changes |
| --- | --- | --- | --- |
| Cadet | Ages 7–10 | 4 days | More supplies, gentler events, a stronger reactor |
| Pilot | Ages 11–14 | 7 days | One long lunar night to get through |
| Commander | Ages 15–18 | 10 days | Scarce materials, more rooms wrecked, harsher storms |
| Unlimited | Any age | No end | Endless materials and ice: build as much as you like |

**What a good mission looks like**

1. **Power first.** Fix broken solar panels while the Sun is up. After sunset there is none for two weeks.
2. **Stop the leaks.** Patch holed rooms, or lock their doors, then rebuild them.
3. **Fill the battery before night**, and turn down what you can live without.
4. **Grow and cook.** Tins run out. Choose crops that fit the light and water you can spare.
5. **Fetch what you lack.** Other stations have materials and people. The Polar Ice Mine has water.
6. **Give jobs away.** Robots cost electricity, rescued astronauts cost food.

A settings screen offers a guide mode: REGO highlights the choice it would make and draws a path on the floor. It also sets the graphics detail (Auto, High, Medium or Low), switches sound, music, REGO's voice and the questions separately, and can show a frame-rate counter.

## Features

Everything is done by hand in the world, not from a menu: you walk there, carry the part, and wait while the work is done.

| Area | What the player does |
| --- | --- |
| Power | 24 solar mounts that track the Sun, a small reactor, a battery. Pull a broken panel, drag it to the rover, take it down to the Fix-It Bench, wait, carry it back, install it. Build new panels and battery modules on a robot-arm line |
| Air | Each of the 11 rooms holds its own air behind a bulkhead door. Patch a hole, or lock the door and lose that room to the cold, then rebuild it in a short scene that plays by itself |
| Station lights and machines | A status light over every door shows a leak, a frozen room or a wreck from the hall. In a power cut the floor lights turn amber, most ceiling lights go out, and the fans and pumps wind down. Every room has something that follows the station: a hoist that works with the repair bench, steam over the cooking pot, an air-quality gauge in the Bunk Room, used water flowing to the recycler, bubbles in the oxygen tubes and the fish tank |
| Sound | The station hums with its power and goes quiet in a power cut. Outside there is silence, and only your breathing in the helmet. Vehicles are felt through the seat. Quiet music turns uneasy during an emergency and settles when it passes. While the Earth Link is up, Mission Control speaks on the radio about once a minute: warnings, the rescue ship's distance, and calm advice. With the dish knocked over there is only static |
| Spacesuit | Suit Lockers in the airlock. Off indoors: jobs go a quarter faster, and you can cook and sleep. On before stepping into the cave |
| Farming | Six hydroponic racks under LED lamps. Ten crops with different speed, harvest, light, water, warmth and plant-food needs. A thermostat per farm. Pump, lamp and mold failures |
| Animals | Hens that eat dry feed people cannot, and lay eggs. A fish tank whose water feeds the plants |
| Kitchen | Cook raw food into hot meals. Herbs make a batch go further |
| Water | A recycler, a waste digester that makes plant food, and a Water Plant on the surface that extracts ice from polar soil with a dashboard, sliders and a live graph |
| Polar Ice Mine | A dark crater with a drivable digger. Dig frosty patches, tip two scoops into the filler, haul the sealed canister home |
| Vehicles | A six-wheel rover and a hopper, both of which need charging on their pads. The rover's wheels steer and ride the ground; it leaves tracks. The hopper's legs take its weight on landing, its jets follow the throttle and blow dust when it is low, and a ring on the ground and a small readout guide the landing |
| Crew | Two helper robots that cost electricity. Three astronauts to rescue from other stations, who cost food and each bring a skill |
| Control Center | One screen that shows every room, every error, every door, and who is doing which job |
| Life-support loop | A moving diagram of oxygen, CO₂, water and plant food, with made-against-used bars and trend graphs |
| Research | Points from first harvests, new ways of heating ice and the moon-soil experiment buy five upgrades |
| Experiment | The same seeds grown three ways: hydroponics, treated moon soil, raw moon soil |
| Events | Solar storms, moonquakes, meteoroid strikes, air leaks, dust, fire, stale air, mold, pump and lamp failures, a drifting dish, a distress call |
| Questions | After each kind of emergency, one short question about why it happened, with three answers. A right answer earns a research point; a wrong one costs nothing and the card explains. The end screen says how many were answered right |
| REGO | Follows you, lights your work, points at the job, gives advice on H, and tells a real space fact when all is calm. It can read its hints, its lines and the emergency cards aloud, using the voice built into the device: on by itself in Cadet missions, a switch in Settings otherwise |
| Clock and map | A mission clock with sunset, rescue and storm marks, and a line that shows the temperature outside falling after sunset while the cave stays at 17°C. A map of the surface and of the station |
| Day and night page | A graph of one whole Moon day with "now", sunset, sunrise and rescue marked, three thermometers (outside, cave, station), and a short explanation of why the Moon is so hot and so cold |
| Guide | How to play, a "Real or made up?" table, why live in a lava tube, a station tour in pictures, space words |

Failing teaches too: the end screen says what ran out first, the science behind it, and what to try next time.

## The science inside

### Day and night on the Moon

**One Moon day is 29.5 Earth days: two weeks of light, then two weeks of dark.** Times are in Earth days. The numbers are the ones the game uses.

| | Daylight: about 14.75 days | Night: about 14.75 days |
| --- | --- | --- |
| On the surface | about 127°C in full Sun | about −173°C in darkness |
| In the pit and cave | about 17°C all the time: rock overhead evens out the swing | about 17°C all the time |
| Power | Solar panels make electricity | No Sun: battery and reactor only |
| Your job | Fix panels and fill the battery | Switch off what you can spare |

The whole game is paced by this cycle: daylight is the time to prepare, and the two-week night is the test.

- **Why a Moon day is so long.** The Moon turns once on its axis in the same time it takes to circle Earth. From one sunrise to the next is 29.53 Earth days, so any spot gets about two weeks of sunlight and then two weeks of dark.
- **Why the temperature swings so far.** There is no air to carry heat around or hold it in. Ground in full Sun reaches about 127°C. Ground in darkness falls to about −173°C. That is a swing of 300 degrees.
- **Why the base is underground.** Rock is a good blanket. An orbiter measured the shaded floor of a pit in the Sea of Tranquility at about 17°C, and it stays near that all the time. The game puts the living rooms, farms and control room under that roof, where the same rock also blocks radiation and small meteoroids.
- **What it does to power.** Solar panels follow the Sun in the game: full output by day, less near sunset, and nothing at night. After sunset the station lives on its battery and a small reactor, so the player must decide which machines to switch off.
- **Earth in the sky.** The Moon always keeps the same face toward Earth. From the base, Earth stays in almost the same spot, wobbles a little, and slowly changes shape like the Moon does from Earth.

### Other ideas the player meets

| Idea | Where the player sees it |
| --- | --- |
| Gravity is one-sixth of Earth's | Jumps go six times higher. The hopper needs little thrust. |
| There is no air outside | A spacesuit and an airlock are needed to go out. A hole in a wall lets the air out, and the room must be patched or locked. |
| Radiation from solar storms | A warning comes before the storm. Metres of rock overhead keep the dose low; staying outside adds to it. |
| A closed loop | Plants make oxygen and food and drink water. The recycler catches the water they breathe out. People make the carbon dioxide the plants need. The Life-Support Loop screen draws these flows. |
| The scarcest thing sets the limit | A crop's health follows whichever need is worst met: light, water, nutrients, air or warmth. This is Liebig's law of the minimum. |
| Ice can turn straight to vapour | Below 611 pascals of pressure, heated ice skips the liquid stage. The Water Plant uses this to pull water out of icy soil, then freezes the vapour on a cold trap. |
| Every machine has a power cost | The Power Board shows each machine in kilowatts. Turning one on means less for the others. |
| Radio takes time | A message to Earth takes 1.3 seconds each way. |
| Meteoroids reach the ground | With no atmosphere to burn them up, even small ones hit the surface. That is how the story starts. |

The numbers behind each row are in the section "Real data the game uses", with links to where they come from.

## When something goes wrong

Every emergency in the game follows the same four beats, so the player practises one habit: stop, understand, choose, act.

1. **Stop.** The mission clock pauses and a card appears. Nothing gets worse while you read.
2. **Understand.** One short paragraph says what happened and why it matters.
3. **Choose.** Two or three options, each showing its cost in power, materials, time or risk. REGO says which it would pick and why, but the choice is yours.
4. **Act.** Most fixes are done by hand: walk there, do the job, watch the gauge recover.

A "Did you know?" line on each card ties the event to something that really happened. There is always a way through, and never a free one.

| Event in the game | What the player has to weigh | The real thing behind it |
| --- | --- | --- |
| Solar storm | Shelter underground and lose work time, or stay out and take a dose. Switch machines to safe mode, or gamble that they survive | Every storm is a real dated flare from NASA's space-weather record. A huge storm in August 1972 fell between two Moon missions |
| Air leak | Run and patch the hole, or lock that room's door and let it freeze | Real stations are built in sealed sections: lose one room, save the rest |
| Meteoroid strike | Which broken thing to repair first | Meteoroids hit the Moon at 20 to 72 km a second, with no air to burn them up |
| Moonquake | Seal the cracked water pipe now, or shut the valve and lose that tank's water | Apollo seismometers recorded shallow moonquakes that shook for many minutes |
| Dust on the panels | Brush by hand (time and radiation) or run the dust shield (battery) | Moon dust is sharp and clings by static electricity |
| Kitchen fire | Fight it, or seal the room and starve it of air | Fire needs fuel, heat and oxygen. A fire broke out on the Mir station in 1997 |
| Air cleaner fails | Build a new filter, or run the power-hungry backup | Apollo 13's crew built a filter from a hose, bags, a card and tape |
| Mold on the crops | Fans on full (power), cut out the sick plants (lose the crop), or do nothing | Space Station flowers went mouldy in 2015 and were saved with fans |
| Farm pump or lamps fail | Fix now and spend a material, or let the crop suffer | Plants grown without soil dry out in hours if the pump stops |
| Dish drifts off Earth | Re-aim it, or lose storm warnings | A signal takes 1.3 seconds to cross to Earth |
| Heater circuit fails at night | More heater power, or risk cracked machines | The surface falls to about −173°C at night |
| Voices on the radio | Spend charge and hours to rescue a survivor who then needs food and air | Crews from many countries share the real Space Station |

Losing is treated the same way. The end screen names what ran out first, explains the science, and suggests what to try next time.

## Real data the game uses

The game loads four real datasets, so no two missions meet the same storms or quakes, and every one that appears carries its real date.

| Dataset the game loads | What it does in the game | Size in the game |
| --- | --- | --- |
| [DONKI space-weather database](https://ccmc.gsfc.nasa.gov/tools/DONKI/) (NASA CCMC) | Every solar storm is a real flare or particle storm, shown with its date, flare class and sunspot group | 181 storms chosen from 3,401 flares, 493 particle events and 782 fast eruptions since 2011 |
| [Apollo Passive Seismic Experiment event catalog](https://pds-geosciences.wustl.edu/missions/apollo/seismic_event_catalog.htm) (NASA PDS) | Moonquakes and meteoroid strikes use real events recorded by Apollo seismometers from 1969 to 1977 | All 28 shallow moonquakes; the 213 strongest of 1,743 impacts, out of 13,057 catalogued events |
| [Meteorite Landings](https://data.nasa.gov/dataset/meteorite-landings) (data.nasa.gov) | Each impact is compared with a real meteorite that people saw fall on Earth | 904 witnessed falls |
| [OSD-476: plants grown in Apollo lunar soil](https://osdr.nasa.gov/bio/repo/data/studies/OSD-476) (NASA OSDR) | The moon-soil experiment and the rule that moon soil stresses plants | One study: soil from Apollo 11, 12 and 17 |

**Every real number the game teaches, and where it comes from**

| What the game says | Real figure | Source |
| --- | --- | --- |
| A lunar day and night together last 29.5 Earth days | 29.53 days | [Moon Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html) |
| The surface swings from 127°C to −173°C | 127°C in full Sun, −173°C in darkness | [Moon Facts](https://science.nasa.gov/moon/facts/) |
| The cave stays at 17°C | About 17°C (63°F) in the permanently shaded part of the Mare Tranquillitatis pit, from orbital measurements and a model | [NASA, lunar pits](https://www.nasa.gov/solar-system/nasas-lro-finds-lunar-pits-harbor-comfortable-temperatures/) |
| The pit is about 100 m wide and 105 m deep | Opening 88 by 100 m, depth 105 m, with overhangs | [LROC Pits Atlas](https://lroc.im-ldi.com/atlases/pits/3) |
| Gravity is one-sixth of Earth's | 1.62 m/s² | [Moon Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html) |
| A radio message takes 1.3 seconds to reach Earth | 384,400 km at the speed of light | [Moon Facts](https://science.nasa.gov/moon/facts/) |
| Earth stays in one spot in the sky | It stays in almost the same spot, wobbling a little | [Earth from the Moon](https://svs.gsfc.nasa.gov/4944/) |
| Radiation on the surface | 1,369 microsieverts a day, about twice the Space Station | [Chang'E-4 measurement](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC7518862/fullTextXML) (not NASA) |
| The dose limit in a storm is 250 mSv | Shelters are designed to keep one big storm under 250 mSv; the career limit is 600 mSv | [NASA radiation brief](https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-020-radiation-protection.pdf) |
| A huge storm just missed the Apollo crews | August 1972, between Apollo 16 and 17 | [NASA, radiation at the Moon](https://science.nasa.gov/science-research/heliophysics/how-nasa-will-protect-astronauts-from-space-radiation-at-the-moon/) |
| Moonquakes can be strong and long | Up to magnitude 5.5, lasting over 10 minutes | [Moonquakes](https://science.nasa.gov/moon/moonquakes/) |
| Meteoroids hit at 20 to 72 km a second | 20 to over 72 km/s | [Lunar impact monitoring](https://www.nasa.gov/meteoroid-environment-office/about-lunar-impact-monitoring/) |
| Moon dust is sharp and clings | Sharp, abrasive and electrostatically charged | [NASA dust shield](https://www.nasa.gov/missions/artemis/clps/electrodynamic-dust-shield-heading-to-moon-on-firefly-lander/) |
| A person breathes 0.84 kg of oxygen a day | 0.84 kg in, 1.00 kg of CO₂ out | [NASA life-support mass balance](https://ntrs.nasa.gov/api/citations/20090034853/downloads/20090034853.pdf) |
| Up to 98% of water is recycled | 98% reached on the Space Station in 2023 | [NASA water recovery](https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/) |
| Crops take from 25 to 132 days | Radish 25, lettuce 28, wheat 75–90, tomato 85, soybean 97, potato 132 days | [NASA life-support baseline document](https://ntrs.nasa.gov/citations/20210024855) |
| Plants sprouted in real Moon soil but grew small | 2022, soil from three Apollo missions | [NASA, plants in lunar soil](https://www.nasa.gov/humans-in-space/scientists-grow-plants-in-lunar-soil/) |
| Icy crater soil is 5.6% water | 5.6% ± 2.9% at one impact site; planners assume less elsewhere | [NASA lunar environment document](https://ntrs.nasa.gov/citations/20250006445) |
| Dark crater floors are near −230°C | About −250°C measured in Hermite crater | [Hermite crater](https://science.nasa.gov/image-detail/hermite) |
| Ice turns straight to vapour below 611 pascals | Triple point of water: 611.657 Pa | [IAPWS release](https://www.iow.de/files/staff/rfeistel/download/meltsub.pdf) |
| Water from rock needs about 1,000°C | 900 to 1,100°C, shown on Apollo soil | [NASA, oxygen from lunar soil](https://ntrs.nasa.gov/citations/19940030892) |

The file [SCIENCE_AND_SOURCES.md](SCIENCE_AND_SOURCES.md) lists all 69 sources, including those behind the power, fire, dust-shield and farming rules.

## More NASA datasets that match the game

These are real, public datasets on the game's own subjects. None is loaded yet; each row says what it would add. Every link was opened and checked on 14 November 2026.

| Subject in the game | Dataset | What it holds | What it could add |
| --- | --- | --- | --- |
| Day, night and temperature | [LRO Diviner radiometer archive](https://pds-geosciences.wustl.edu/missions/lro/diviner.htm) | Surface temperatures across the whole Moon since 2009, with global and polar maps | Real temperature curves for the base and for the ice mine through a lunar day |
| The pit and the cave | [LROC Pits Atlas](https://lroc.im-ldi.com/atlases/pits/list) | 278 lunar pits with position, width and depth | A choice of real pits to build in, each with its real size |
| The ground you drive on | [LOLA topography](https://pds-geosciences.wustl.edu/missions/lro/lola.htm) and [Moon Trek](https://trek.nasa.gov/moon/) | Elevation of the whole Moon; a map you can browse | Real terrain around the pit instead of made-up craters |
| Sun, Earth and Moon phases | [Moon Phase and Libration](https://svs.gsfc.nasa.gov/5587/) and [Dial-A-Moon](https://svs.gsfc.nasa.gov/gallery/moonphase/) | The Moon's phase, distance and tilt for every hour of the year | Start a mission on today's real date, with the real sunset time |
| Earth in the sky | [Earth from the Moon](https://svs.gsfc.nasa.gov/4944/) | How Earth looks and moves as seen from the Moon | Earth's slow wobble and phases drawn from data |
| Radiation | [LRO CRaTER archive](https://pds-ppi.igpp.ucla.edu/archive1/LROCRA_2XXX/AAREADME.HTM) | Cosmic-ray and storm-particle readings in lunar orbit | Real dose curves during each storm |
| Meteoroid strikes | [Lunar impact flash locations](https://ntrs.nasa.gov/citations/20150021386) | More than 330 flashes seen from Earth, 2005 to 2014 | Modern impacts with real places on the Moon |
| Fireballs | [CNEOS Fireballs](https://cneos.jpl.nasa.gov/fireballs/) | Date, place, speed and energy of bright meteors over Earth | "The same day on Earth" comparisons |
| Moonquakes | [Apollo seismic data](https://pds-geosciences.wustl.edu/missions/apollo/apollo_pse.htm) | The actual wave recordings | A seismometer screen that draws the real shaking |
| Ice at the poles | [LCROSS](https://pds-geosciences.wustl.edu/missions/lcross/default.htm), [Moon Mineralogy Mapper](https://pds-imaging.jpl.nasa.gov/volumes/m3.html), [LEND](https://pds-geosciences.wustl.edu/missions/lro/lend.htm) | The impact that found water; maps of water-bearing minerals; hydrogen readings | Richer and poorer ice patches, and a scanner to find them |
| Craters that never see the Sun | [LRO peers into permanent shadows](https://svs.gsfc.nasa.gov/4043) and [South Pole illumination](https://svs.gsfc.nasa.gov/5228/) | Where the permanently dark ground is, and how sunlight moves around the pole | A true polar site for the ice mine |
| Moon soil and rock | [Lunar Sample Compendium](https://curator.jsc.nasa.gov/lunar/lsc/) and the [Lunar Sourcebook](https://www.lpi.usra.edu/publications/books/lunar_sourcebook/) | What each Apollo sample is made of | Real soil recipes for the oxygen plant and water-from-rock |
| Heat below the surface | [Apollo 15 heat-flow experiment](https://pds-geosciences.wustl.edu/missions/apollo/a15hfe.htm) | Temperatures down to 138 cm, 1971 to 1974 | Why a metre of soil already steadies the temperature |
| Farming in space | [Veggie lettuce study OSD-267](https://osdr.nasa.gov/bio/repo/data/studies/OSD-267) and [chile pepper study OSD-772](https://osdr.nasa.gov/bio/repo/data/studies/OSD-772) | Results from crops grown on the Space Station | Real harvest numbers beside the game's |
| The pictures | [Blue Marble](https://science.nasa.gov/earth/earth-observatory/collections/blue-marble) and the [CGI Moon Kit](https://svs.gsfc.nasa.gov/4720) | Earth in true colour; a colour and height map of the Moon | Already the source of the Earth in the sky; the Moon kit could texture the ground |

No dataset of radish or wheat results from the Advanced Plant Habitat turned up in NASA's open science repository, so those two crops rest on NASA news pages only.

## Real or story

The game is honest about what is known. Its "Real or made up?" page shows a table like this one, and the science notes mark every claim by how strong its evidence is.

| Kind of claim | Examples in the game |
| --- | --- |
| **Measured on or from the Moon** | Two weeks of light and two of night. Surface from about 127°C to −173°C. Shaded pits near 17°C. Gravity one-sixth of Earth's. Radiation on the surface. Moonquakes and impacts. Ice in polar craters, about 5.6% of the soil where a probe struck. Crater floors colder than −230°C |
| **Done in space** | Lettuce, radishes, wheat, tomatoes and potatoes grown in orbit. 98% of water recycled on the Space Station. Oxygen made by splitting water. Mold on space-grown flowers |
| **Shown in a laboratory on Earth** | Plants sprouting in real Apollo soil, small and stressed. Microwaves driving ice out of frozen soil. Hydrogen pulling oxygen out of the mineral ilmenite at about 1,000°C. Crop growing times and needs from NASA's crop chambers |
| **An idea nobody has built on the Moon** | A station inside a lava tube. An ice-extraction plant. Mining a dark crater. A small reactor for the night |
| **Our story** | A meteor shower wrecking every station at once. The other countries' stations a short drive away. The Polar Ice Mine a short trip from a base near the equator: real dark craters are about 2,500 km away. Hens on the Moon. Herbs as a crop |
| **Sized for play** | One game hour passes in 7 to 9 seconds. One game day of growing stands for about 100 real days. Machine power sizes. Earth drawn 2.5 times larger so its phase shows. Suiting up in 15 minutes |

Two things the game never allows, because they would teach something false: crops growing on the open surface, and plants replacing the oxygen machines. Six racks give under a quarter of what one person breathes.

## How it was tested

The game was played from the title screen to the rescue by a script that presses the same keys a player does, on 14 November 2026. The script played a full Cadet mission, including the whole training, and reached the rescue on day 4 with no errors. It found six problems. All six were fixed, re-checked on a fresh load, and **published to the public site the same day.**

### What was played and what happened

| Part of the game | Result |
| --- | --- |
| Home screen, How to Play, Station tour, Real or made up?, Settings | All open. No broken pictures. |
| Full training, including putting the suit back on | Passed |
| Disaster comic and mission start | Passed |
| Pull a broken panel, fix it at the bench, install it | Passed |
| Patch a leaking room and rebuild a wrecked one | Passed |
| Replant a farm rack and run the moon-soil experiment | Passed; the experiment earned 3 research |
| Buy research (better lights, better condensers) | Passed; the farm's power fell from 6.2 to 4.7 kW |
| Cooking and sleeping blocked while in a spacesuit | Passed |
| Rescue an astronaut and bring them down the elevator | Passed; they joined the crew and took a job |
| Salvage a crate and unload it at the depot | Passed |
| Water Plant batch from icy soil | Made 16.1 L where the recipe screen predicted 16.3 L |
| Save, close and reload in the middle of a batch | Everything came back |
| Fly the hopper to the ice mine, dig, fly canisters home | Passed |
| Save and reload while sitting in the digger | Passed; the scoop in the bucket was kept |
| Water from rock | Runs; exposed two of the problems below |
| Solar storm, kitchen fire and other emergencies | Passed |
| Win screen | Shown, with rank, points and a summary of what the player did |

### Problems found and fixed

| Problem | Fix |
| --- | --- |
| Supply crates and stranded astronauts did not appear in a new mission, only after reloading a save. A code comment had swallowed the line that places them. | They appear at mission start. |
| With the rover parked beside the pit elevator, the E key drove the rover instead of riding the elevator, although the training says to press E. | E rides the elevator. Q drives or loads the rover. |
| Sleep ended early for any small yellow reminder, such as ripe crops. | Sleep now ends only for emergencies and story events. |
| A water-from-rock run that made no water still earned research. | No water, no research. |
| The recipe screen said a run looked good when the station had no power for it. | It warns when the battery and spare power cannot cover the run. |
| The game said Earth never moves in the sky. | It now says Earth stays in almost the same spot. Guide mode also no longer marks Cook or Sleep while the suit is on. |

### Found in a follow-up check of the hardest mode

| Problem | Fix |
| --- | --- |
| The Moon's ground was drawn black. A code comment had swallowed the line that colours it, since the ice-mine update. | The ground is grey again. |
| The rover never used any charge. The same mistake had swallowed the line that drains its battery. | Driving uses charge again: about 2.6 km on a full battery. |
| Commander could only be won with perfect routes, and even then with empty tanks. The night needed about twice the power the station could store, and repairs take longer than the simple check assumed. | Sunset in Commander now comes on day 4.5 instead of day 3.4. The night is still the longest of any mode, at five and a half days. |

### Found while testing saves

| Problem | Fix |
| --- | --- |
| The game saves by itself every 20 seconds. If that fell in the middle of a job and the player then closed the game, the part being fitted was lost: a solar panel, a battery module, or the materials for a rebuild. | The game no longer saves in the middle of a job, an elevator ride or an emergency. It keeps the last good save instead. |
| At the ice mine the cold could drain the rover until it was too flat to drive home, with no warning. | REGO warns when the charge is only just enough to get back. |

### Automatic checks

- **71 calculation checks** pass. They cover water and oxygen balance, crop growth, the Water Plant physics, the mine, research, and saving. One was added in this pass.
- **A balance run of all four modes** with two simple computer players that fix things for free, and a planned player that pays game time for every walk, drive and elevator ride. The planned player wins Cadet, Pilot and Commander with each of its three repair plans. Doing nothing loses Commander.
- **A scan for code hidden inside comments**, the mistake behind three of the bugs on this page, finds none.
- **A syntax check** of every code file passes.

### Not yet verified

- **Commander by hand.** The planned computer player wins it, and with the Water Plant and the ice mine in use it ends with 17 L of water to spare. Oxygen is the thin margin: about one kilogram left. It does not face surprise events, so a person should still play it through.
- **Phones.** Held sideways, the game is usable but crowded. Held upright, the warning list covers the resource bars. Touch controls were seen on screen but not played.
- **Speed on a real computer.** In the test window a frame took about 40 thousandths of a second, which is about 25 frames a second. The test window slows pages down, so the real figure is unknown.
- **Real children.** No child has played it yet. Reading level and where players get stuck are untested.
- **Pilot and Unlimited by hand.** They were checked only by the computer players.

## How it can be improved

The list is in order of how much each item would help the goal: children learning real Moon science by doing things.

### First: find out whether it teaches

1. **Play-test with children aged 7 to 18.** This is the largest unknown. Watch where they get stuck, which words they do not know, and whether they can explain day and night on the Moon afterwards. Everything below should be re-ordered by what those sessions show.
2. **Ask a question after each emergency.** A one-line "What did you do, and why did it work?" with three answers would show whether the calm-thinking lesson landed, and gives teachers something to discuss.
3. **A teacher's page.** One sheet with the learning goals, a 40-minute lesson plan, and the questions above.

### Second: make it work for more players

4. **Phone layout.** Held upright, the warning list covers the resource bars. Either ask the player to turn the phone sideways or stack the panels. Then play a whole mission with the touch controls.
5. **Speed.** The surface draws about 260,000 triangles in about 200 separate draw calls. Merging repeated objects such as panels, crates and rocks would help older laptops and phones. Measure on a real computer first.
6. **Hard mode.** Play Commander through by hand. The computer check says a good player wins with about one kilogram of oxygen left, which may still be too tight once surprise events are added.
7. **Reading help.** A read-aloud voice for REGO's lines, larger text, a colour-blind check of the warning colours, and other languages.

### Third: use more of the real data

| Dataset | What it would add |
| --- | --- |
| LOLA elevation maps of the pit region | The real shape of the ground around the base, in place of hand-made hills |
| Diviner temperatures through a whole lunar day | The game now has a thermometer on the clock, drawn from a simple model between the measured extremes. The measured curve, hour by hour, would replace the model |
| LEND and M3 polar ice maps | Ice patches of different richness, and a scanner to find the good ones before digging |
| DONKI solar-event records | "Replay a real storm": choose a date and face the storm that happened |
| CRaTER radiation measurements | A dose meter that matches what an orbiter measured, in the open and under shielding |
| Apollo seismic records | Moonquakes as a new emergency |

### Fourth: finish what is on the roadmap

8. **Hopper animation.** Landing legs that flex, engine dust, and a gentler landing guide. This is step 4 of the animation plan.
9. **Sound.** Music, footsteps inside the station, and the muffled silence outside.
10. **A more honest ice picture.** The mine's picture shows clear chunks of ice. Real crater ice is frost mixed into the soil.
11. **A true-scale map.** The game draws the ice mine and the other stations a short trip away. A map page that shows the real distances, about 2,500 km to the poles, would make the compression clear.
12. **Two players.** One on the surface and one in the control room, talking by radio.
