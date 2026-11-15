# MOONKEEPER — science notes and data sources

MOONKEEPER is a game, but most of what happens in it is real space science built on open NASA data.
To keep the screen clean for young players, **the game shows no logos, links or citations**. Everything is credited here instead.

_Not an official NASA product. NASA data and imagery are used under the [NASA media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/); no endorsement is implied._

## 1. Real datasets loaded by the game

| What the game does with it | Dataset | Publisher |
|---|---|---|
| Every solar storm in the game is a real flare / particle storm from this archive (2011–2026). | [DONKI — Space Weather Database Of Notifications, Knowledge, Information](https://ccmc.gsfc.nasa.gov/tools/DONKI/) | NASA CCMC |
| Every moonquake and meteoroid strike in the game is a real event felt by Apollo seismometers (1969–1977). Listed on data.nasa.gov. | [Apollo Passive Seismic Experiment Expanded Event Catalog](https://pds.nasa.gov/ds-view/pds/viewBundle.jsp?identifier=urn%3Anasa%3Apds%3Aapollo_seismic_event_catalog&version=1.0) | NASA PDS |
| Used to compare each impact with a real meteorite that people saw fall on Earth. | [Meteorite Landings](https://data.nasa.gov/dataset/meteorite-landings) | data.nasa.gov |
| Why moon-soil farming is slow and stressful for plants (farm rules). Listed on data.nasa.gov. | [OSD-476: Plants grown in Apollo lunar regolith](https://osdr.nasa.gov/bio/repo/data/studies/OSD-476) | NASA OSDR |
| Earth hanging in the lunar sky | [Blue Marble (SVS 2915)](https://svs.gsfc.nasa.gov/2915) | NASA SVS |

Numbers at the time the data module was built (2026-11-14):

- **Solar storms:** 181 real events in the game, chosen from 3,401 flares, 493 particle events, 782 fast CMEs and 201 geomagnetic storms in DONKI (2011-01-01 to 2026-11-14). Every storm card shows the real date, flare class and sunspot group.
- **Moonquakes:** all 28 shallow moonquakes in the Apollo catalog.
- **Meteoroid strikes:** the 213 strongest of 1,743 impacts recorded by Apollo seismometers between 1969 and 1977 (13,057 catalogued seismic events in total).
- **Meteorites:** 904 witnessed falls (from 45,716 records) used as size comparisons.

Rebuild the data: `node tools/fetch_donki.mjs` then `node tools/build_data.mjs`. Raw downloads live in `data/raw/`.

## 2. Which game rule comes from which fact

| Used for | Source | Publisher |
|---|---|---|
| Base location 8.3355°N 33.222°E; pit about 100 m wide and 105 m deep. | [Lunar Pits Atlas — Mare Tranquillitatis Pit](https://lroc.im-ldi.com/atlases/pits/3) | LROC / NASA |
| Shaded pit areas stay near 17°C (63°F); surface swings from 127°C to −173°C. | [NASA's LRO Finds Lunar Pits Harbor Comfortable Temperatures](https://www.nasa.gov/solar-system/nasas-lro-finds-lunar-pits-harbor-comfortable-temperatures/) | NASA |
| Radar found a cave reaching more than 200 feet from the base of this very pit. | [New Evidence Adds to Findings Hinting at Network of Caves on Moon](https://science.nasa.gov/solar-system/moon/new-evidence-adds-to-findings-hinting-at-network-of-caves-on-moon/) | NASA |
| Radar hints at an intact lava tube about 50 km long. | [Kaguya radar: intact lava tube at Marius Hills](https://www.isas.jaxa.jp/en/topics/001159.html) | JAXA |
| Computer models: tubes a kilometre or more wide could stay standing in low lunar gravity. | [Theoretical study suggests huge lava tubes could exist on Moon](https://www.purdue.edu/newsroom/archive/releases/2015/Q1/theoretical-study-suggests-huge-lava-tubes-could-exist-on-moon.html) | Purdue / Icarus |
| Old lava channels on the Moon run from 2 km to 566 km long. | [Atlas of Lunar Sinuous Rilles](https://www.lpi.usra.edu/lunar/rilles/) | LPI |
| Apollo 15 & 17 probes: below about 80 cm the soil temperature stops changing between day and night. | [Apollo Lunar Surface Journal — Thermal Environment](https://www.nasa.gov/wp-content/uploads/static/history/alsj/WOTM/WOTM-ThermalEnvrnmnt.html) | NASA |
| No air, so no wind or dust storms; huge day/night temperature swings. | [Weather on the Moon](https://science.nasa.gov/moon/weather-on-the-moon/) | NASA |
| Gravity 1.62 m/s² (one-sixth of Earth), day-night cycle 29.53 days, sunlight 1361 W/m². | [Moon Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html) | NASA |
| Lunar day and night are each about two Earth weeks long. | [Moonlight](https://science.nasa.gov/moon/moonlight/) | NASA |
| Earth stays in one spot of the Moon's sky and shows phases opposite to the Moon's. | [Earth as seen from the Moon](https://svs.gsfc.nasa.gov/4955/) | NASA SVS |
| Earthshine is the main natural light during lunar night. | [Earthshine as an illumination source at the Moon](https://ntrs.nasa.gov/citations/20190001705) | NASA NTRS |
| Earth–Moon distance 384,400 km: radio takes about 1.3 seconds each way. | [Moon Facts](https://science.nasa.gov/moon/facts/) | NASA |
| Mars radio delay is 4 to 24 minutes one way; the Moon is about three days away. | [Why Moon and Mars (2025 white paper)](https://www.nasa.gov/wp-content/uploads/2025/12/acr25-wp-why-moon-and-mars-v2.pdf) | NASA |
| Dose on the lunar surface: 1,369 µSv per day (about 57 µSv per hour), 2.6× the Space Station. | [First measurements of the radiation dose on the lunar surface (Chang'E-4 LND)](https://doi.org/10.1126/sciadv.aaz1334) | Science Advances |
| NASA limits: 250 mSv from a solar particle event, 600 mSv in a whole career. | [Radiation Protection Technical Brief (OCHMO-TB-020)](https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf) | NASA OCHMO |
| The August 1972 solar storm was a near miss for Apollo crews; piling regolith over shelters blocks radiation. | [How NASA Will Protect Astronauts From Space Radiation at the Moon](https://science.nasa.gov/science-research/heliophysics/how-nasa-will-protect-astronauts-from-space-radiation-at-the-moon/) | NASA |
| About 3 m of piled regolith is the minimum for a storm shelter. | [Lunar Safe Haven (regolith radiation shelter study)](https://ntrs.nasa.gov/api/citations/20210022066/downloads/Grande_Lunar%20Safe%20Haven_ASCEND%202021_Full_v2b.docx.pdf) | NASA Langley |
| Radiation flips computer bits and slowly wears out solar panels. | [How NASA Prepares Spacecraft for the Harsh Radiation of Space](https://science.nasa.gov/science-research/heliophysics/how-nasa-prepares-spacecraft-for-the-harsh-radiation-of-space/) | NASA |
| The real NASA team that watches space weather for Moon missions. | [Moon to Mars Space Weather Analysis Office](https://science.gsfc.nasa.gov/m2m-swao) | NASA GSFC |
| For comparison: about 1.8 mSv per day flying to Mars, about 0.67 mSv per day on its surface. | [Data from NASA rover's voyage to Mars aids planning (MSL-RAD)](https://www.jpl.nasa.gov/news/data-from-nasa-rovers-voyage-to-mars-aids-planning/) | NASA JPL |
| One person per day: 0.84 kg oxygen in, 1.00 kg CO₂ out, 0.62 kg dry food. | [ECLSS life-support mass balance (NTRS 20090034853)](https://ntrs.nasa.gov/api/citations/20090034853/downloads/20090034853.pdf) | NASA MSFC |
| About a gallon (3.8 L) of water per person per day; the ISS now recycles 98% of it. | [NASA Achieves Water Recovery Milestone on International Space Station](https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/) | NASA |
| The ISS makes oxygen by splitting water with electricity. | [Environmental Control and Life Support Systems (ECLSS)](https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/) | NASA |
| Moon soil is about 45% oxygen by weight, locked inside minerals. | [Systems analysis of oxygen from regolith](https://ntrs.nasa.gov/api/citations/20205002032/downloads/ASCEND-Systems%20Analysis%20of%20O2%20from%20Regolith%20-%20Sibille.pdf) | NASA KSC |
| In 2023 NASA melted simulated moon soil with a laser and pulled oxygen out of it. | [NASA Successfully Extracts Oxygen from Lunar Soil Simulant](https://www.nasa.gov/centers-and-facilities/johnson/nasa-successfully-extracts-oxygen-from-lunar-soil-simulant/) | NASA JSC |
| Small fission reactors could give up to 10 kW for 10 years, day or night. | [Kilopower: nuclear fission system for space exploration power](https://www.nasa.gov/news-release/demonstration-proves-nuclear-fission-system-can-provide-space-exploration-power/) | NASA |
| NASA is designing a 40 kW reactor for the Moon because the night lasts about 14.5 Earth days. | [Fission Surface Power Project](https://www.nasa.gov/centers-and-facilities/glenn/nasas-fission-surface-power-project-energizes-lunar-exploration/) | NASA Glenn |
| The Electrodynamic Dust Shield flicked dust off surfaces on the Moon in 2025 using electric fields. | [NASA's Dust Shield Successfully Repels Lunar Regolith on Moon](https://www.nasa.gov/image-article/nasas-dust-shield-successfully-repels-lunar-regolith-on-moon/) | NASA |
| Moon dust is sticky, razor-sharp and electrically charged. | [Moon Dust](https://science.nasa.gov/moon/moon-dust/) | NASA |
| Surveyor landers saw a glow at sunset: dust lifted by static electricity. | [Surveyor observations of lunar horizon-glow](https://ntrs.nasa.gov/citations/19740054216) | NASA NTRS |
| Meteoroids hit the Moon at 20 to 72 km per second. | [About Lunar Impact Monitoring](https://www.nasa.gov/meteoroid-environment-office/about-lunar-impact-monitoring/) | NASA MSFC |
| A 40 kg rock hit the Moon on 17 March 2013 at 56,000 mph — like 5 tons of TNT. | [Bright Explosion on the Moon](https://science.nasa.gov/science-research/planetary-science/16may_lunarimpact/) | NASA |
| Four kinds of moonquake; shallow ones can reach magnitude 5.5 and shake for over 10 minutes. | [Moonquakes](https://science.nasa.gov/moon/moonquakes/) | NASA |
| Red romaine lettuce took 33 days to grow on the ISS in 2015 — the first space-grown crop NASA astronauts ate. | [Veggie fact sheet](https://www.nasa.gov/wp-content/uploads/2019/04/veggie_fact_sheet_508.pdf) | NASA |
| ISS zinnias got mouldy from too much water and too little airflow; astronaut Scott Kelly saved them. | [Growing Plants in Space](https://www.nasa.gov/exploration-research-and-technology/growing-plants-in-space/) | NASA |
| Radishes were harvested on the ISS after 27 days. | [Astronauts Harvest Radish Crop on International Space Station](https://www.nasa.gov/missions/station/astronauts-harvest-radish-crop-on-international-space-station/) | NASA |
| In 2022 plants sprouted in real Apollo moon soil — but grew slowly and showed stress. | [Scientists Grow Plants in Lunar Soil](https://www.nasa.gov/humans-in-space/scientists-grow-plants-in-lunar-soil/) | NASA |
| About 20–25 m² of crops can make one person's oxygen; about 50 m² their food. | [Crop production for space life support (R. Wheeler)](https://ntrs.nasa.gov/citations/20205008786) | NASA KSC |
| NASA lit real fires in empty cargo ships to learn how flames spread in space. | [Saffire Ignites New Discoveries in Space](https://www.nasa.gov/humans-in-space/saffire-ignites-new-discoveries-in-space/) | NASA |
| In 1997 an oxygen canister caught fire on Mir; the crew fought it for several minutes. | [25 Years Ago: Fire Aboard Space Station Mir](https://www.nasa.gov/history/25-years-ago-fire-aboard-space-station-mir/) | NASA History |
| Apollo 13 fitted a square air filter into a round hole using a hose, bags, a card and duct tape. | [Houston, We've Had a Problem (Apollo 13)](https://www.nasa.gov/history/houston-weve-had-a-problem/) | NASA |
| A real NASA digging robot with spinning bucket drums, made for low gravity. | [RASSOR regolith excavator](https://technology.nasa.gov/patent/KSC-TOPS-7) | NASA KSC |
| NASA is funding 3D printers that build with melted moon soil. | [ICON lunar construction technology (Project Olympus)](https://www.nasa.gov/centers-and-facilities/marshall/nasa-icon-advance-lunar-construction-technology-for-moon-missions/) | NASA |
| Apollo took about three days to reach the Moon and landed in lunar morning, when long shadows show the bumps. | [Apollo 11 Mission Overview](https://www.nasa.gov/history/apollo-11-mission-overview/) | NASA |
| NASA data is free to use for education; this game is not endorsed by NASA. | [NASA Images and Media Usage Guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/) | NASA |

## 3. How the main mechanics map to real limits of living in space

| In the game | The real limit it teaches |
|---|---|
| **Air pressure and bulkhead doors.** A holed room loses its air; lock its door and the rest of the station is saved, but that room freezes. | Space is a vacuum, so air escapes through any hole. Real stations are built as sealed sections that can be closed off. (Game simplification: the tanks hold one "air" supply; real cabin air is nitrogen plus oxygen.) |
| **Power budget.** Solar panels, a small reactor, a battery, and more machines than power. | Lunar day and night each last about two Earth weeks, so solar power disappears for 14 days at a time. |
| **Oxygen from water or from moon soil.** | Electrolysis costs 1.125 L of water per kg of oxygen (chemistry). Lunar regolith is about 45% oxygen by mass, but freeing it takes a lot of energy. |
| **Water recycling up to 98%.** | The level reached on the International Space Station in 2023. |
| **Radiation dose topside, storms, shelter underground.** | 1,369 µSv per day measured on the lunar surface; solar particle events can deliver far more in hours; rock overhead is the best shield. |
| **Lava tube station at 17°C.** | LRO Diviner measured about 17°C in shaded pit areas, against 127°C / −173°C on the open surface. |
| **Radio delay.** Mission Control answers after 1.3 s; aiming the dish uses a 2.6 s echo. | Light-speed over 384,400 km. |
| **Potatoes, tomatoes, hens, fish.** | Crops have been grown on the ISS (lettuce 33 days, radishes 27 days); plants sprouted in real Apollo soil but grew slowly (OSD-476). Quail eggs have hatched and fish have lived on space stations. Hens on the Moon are our imagination. |
| **Low-gravity hops, Earth fixed in the sky, Earth's phases.** | Gravity 1.62 m/s²; the Moon is tidally locked; Earth's phase follows the real Sun direction for the base's coordinates (8.3355°N, 33.222°E). |

## 4. What we simplified (and say so in the game's "Real or made up?" page)

- A meteor shower wrecking every station at once is the story, not a forecast.
- One game hour passes in 7–9 real seconds; building a panel takes 3 game hours.
- Machine power sizes, crop speed (about one tray a day) and the three storm strength levels are tuned for play.
- Earth is drawn 2.5× larger than real so its phase is visible.

## 5. Corrections made while researching

- **Lava tube size.** No one has measured the inside of a lunar lava tube. Radar hints at one about 50 km long (Marius Hills); models allow tubes a kilometre or more wide; under the Mare Tranquillitatis pit only tens of metres are confirmed. The game says exactly that.
- **Underground temperature.** The steady 17°C comes from LRO Diviner measurements of shaded pits, not from Chang'e samples. (Chang'e 5 returned samples in 2020, Chang'e 6 in 2024.) Plain soil a metre down is about −20°C (Apollo heat-flow probes).
- **Dust storms.** The Moon has none. Dust events in the game are static-cling dust, impact spray and the real sunset "horizon glow".

## 6. Art

All character art, comic panels and event pictures were generated with the Higgsfield API (`tools/gen_art.mjs`; prompts in `tools/art_jobs.json` and `tools/art_jobs_v2.json`). REGO and BOLT are original robot designs. The API key is read from the `HF_KEY` environment variable and is never stored in the project.
