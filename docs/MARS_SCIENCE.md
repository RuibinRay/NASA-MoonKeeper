# Mars in MOONKEEPER: what is real, and where each number comes from

Every Mars number in the game is in this file, with a class and a source that was opened and read on 15 Nov 2026.

**Classes**

- **Observed** — measured at Mars or published in a reference table.
- **Demonstrated** — a technology that has actually been run (the row says where).
- **Proposed** — a NASA study, plan or design that has not been built or flown.
- **Game** — made for play. Chosen to be reasonable, but not a NASA figure.

## 1. The outpost site

| What | Value | Class | Source |
|---|---|---|---|
| Site | 39.5°N, 191.2°E: a flat bay of Arcadia Planitia among the knobs of the Erebus Montes | Game (our choice, inside a region that published studies shortlist) | Elevation read from MOLA, below |
| Elevation at the site | −3,992 m | Observed | MOLA MEGDR tile `megt44n180hb.img`, read by `tools/build_mars.mjs` |
| Tilt of the plain | 3.8 m down per km to the east, 5.4 m down per km to the north | Observed | Same MOLA tile, over the nearest 4 km |
| Highest skyline | 3.17° above level, 16 km to the north-north-west | Observed (computed from MOLA with the planet's curve taken off) | Same MOLA tile |
| Nearby studied sites | AP-1 (39.8°N, 202.1°E), AP-9 (40.02°N, 203.35°E), EM-16 in Erebus Montes (39.89°N, 192.03°E), each near −3.9 km | Proposed | Golombek et al. 2021, LPSC abstract 2420 — https://www.hou.usra.edu/meetings/lpsc2021/pdf/2420.pdf |
| Why low and mid-latitude | That study wanted elevation below −2 km (below −3 km preferred), latitude under 40° for solar power and warmth, slopes under 5° | Proposed | Same abstract |
| Why low ground helps landing | Low ground has more air above it to slow a spacecraft | Observed | https://www.jpl.nasa.gov/news/nasas-treasure-map-for-water-ice-on-mars |
| NASA exploration-zone limits | Latitude within ±50°, elevation no higher than +2 km, interesting places within about 100 km | Proposed | Bussey and Hoffman 2016, NTRS 20160002370 — https://ntrs.nasa.gov/api/citations/20160002370/downloads/20160002370.pdf |
| Ice under Arcadia Planitia | A widespread layer of water ice tens of metres thick, about 10,000 km³ | Observed | Bramson et al. 2015 — https://doi.org/10.1002/2015GL064844 |
| Shallow ice | Ice as little as 2.5 cm under the surface; a large part of Arcadia Planitia is the most tempting northern target | Observed | https://www.jpl.nasa.gov/news/nasas-treasure-map-for-water-ice-on-mars |
| Ice at this latitude | Water ice is widespread as far south as 35°N, sometimes a few centimetres down | Observed | Piqueux et al. 2019 — https://doi.org/10.1029/2019GL083947 |
| Fresh craters that dug up ice | Common between 40° and 50°N at depths under 1 m; lowest known near 39°N before 2021, then 35°N (a 150 m crater, 24 Dec 2021) | Observed | Dundas et al. 2021 — https://doi.org/10.1029/2020JE006617 ; Dundas et al. 2023 — https://doi.org/10.1029/2022GL100747 |
| Ice maps | NASA's SWIM maps (2023) show ice buried within the top metre from the equator to 60°N | Observed | https://www.jpl.nasa.gov/news/nasa-is-locating-ice-on-mars-with-this-new-map |
| Region names | Arcadia Planitia is centred at 49.02°N, 188.15°E; Erebus Montes at 35.66°N, 185.02°E | Observed | USGS Gazetteer — https://planetarynames.wr.usgs.gov/Feature/348 |
| The young ice crater on the map | A 30 m crater with ice in its floor, 310 m from the base | Game (this kind of crater is observed; this one is placed for play) | Dundas et al., above |

## 2. The map: what is NASA data and what is made for play

| Layer | Class | Notes |
|---|---|---|
| Planet overview (Map → Planet) | Observed | MOLA at one value per degree, coloured by height |
| Region map (Map → Region), 192 km across | Observed | MOLA at 128 pixels per degree, 463 m a pixel |
| Skyline round the horizon | Observed | The outline of the real hills, computed from MOLA for this exact spot |
| Overall tilt of the ground | Observed | MOLA |
| Ground detail inside the 1.6 km you can walk | Game | MOLA has one value every 463 m, so it cannot show rocks, ripples or small craters. These follow what orbiters and landers show on such plains: gentle rolls, small craters, wind ripples, a lava-flow edge, and cracked "polygon" ground of the kind Phoenix found over ice |

MOLA files: NASA Planetary Data System, Geosciences Node — https://pds-geosciences.wustl.edu/missions/mgs/megdr.html . Label read for the tile used: 5632 lines × 11520 samples, 16-bit big-endian, metres (planetary radius minus areoid radius), 0–44°N, 180–270°E, east-positive.

## 3. The planet

| What | Value | Class | Source |
|---|---|---|---|
| Surface gravity | 3.73 m/s² (0.38 of Earth's) | Observed | NASA Mars Fact Sheet — https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html |
| Surface pressure | 6.36 mb at the mean radius; 4.0 to 8.7 mb with season | Observed | Mars Fact Sheet |
| Pressure at the outpost | about 9.1 mb | Game (computed from 6.36 mb and an 11.1 km scale height for −3,992 m) | Mars Fact Sheet values |
| Air | CO2 95.1%, N2 2.59%, Ar 1.94%, O2 0.16% | Observed | Mars Fact Sheet |
| Temperature | Average −59°C; −89 to −31°C over a day at the Viking 1 site | Observed | Mars Fact Sheet |
| The outpost's daily temperature curve | Uses the Viking 1 range; dust makes days cooler and nights milder | Game | Shape is ours |
| Sunlight above the air | 586.2 W/m² on average (0.431 of Earth's) | Observed | Mars Fact Sheet |
| Day (sol) | 24.6597 hours | Observed | Mars Fact Sheet |
| Year | 686.98 Earth days = 668.6 sols | Observed (sols derived) | Mars Fact Sheet |
| Tilt of the axis | 25.19° | Observed | Mars Fact Sheet |
| Radius | 3,389.5 km | Observed | Mars Fact Sheet |
| Sky colour | Butterscotch by day | Observed | https://www.jpl.nasa.gov/images/pia16768-mount-sharp-panorama-in-white-balanced-colors |
| Sunsets | Blue near the Sun, because fine dust sends blue light forward | Observed | https://science.nasa.gov/solar-system/planets/mars/what-does-a-sunrise-sunset-look-like-on-mars/ |
| Dust devils | At least four pass Perseverance on a typical sol, most just after noon | Observed | https://www.jpl.nasa.gov/news/nasas-perseverance-studies-the-wild-winds-of-jezero-crater |
| Radio time to Earth | 3.0 to 22.3 minutes one way (54.6 to 401.4 million km) | Observed (minutes derived) | Mars Fact Sheet |
| Radio blackout | About every 26 months the Sun gets in the way for about 2–3 weeks | Proposed (planning paper) | https://www.nasa.gov/wp-content/uploads/2024/01/mars-communications-disruption-and-delay.pdf |

## 4. Dust and sunlight

| What | Value | Class | Source |
|---|---|---|---|
| Clear-sky dust (tau) | About 0.5 at Opportunity; 0.6–0.7 at InSight outside dust season | Observed | https://www.jpl.nasa.gov/edu/resources/teachable-moment/mars-rover-mission-comes-to-an-end-but-science-legacy-live-on/ ; https://science.nasa.gov/blogs/insight/2022/12/12/nasa-insights-power-level-as-of-dec-12-2022/ |
| 2018 planet-wide storm | tau 10.8 at Opportunity on 10 June 2018; 35 million km² covered | Observed | https://www.jpl.nasa.gov/news/opportunity-hunkers-down-during-dust-storm/ |
| 2007 storm | tau above 5.5; 99% of direct sunlight blocked; Opportunity fell from about 700 to 128 Wh a day | Observed | https://www.jpl.nasa.gov/news/nasa-mars-rovers-braving-severe-dust-storms |
| How fast a storm arrives | Clear to tau 4.9 in three sols | Observed | https://www.nasa.gov/wp-content/uploads/2024/01/mars-surface-power-generation-challenges-and-considerations.pdf |
| Dust settling on panels | InSight: about 5,000 Wh a sol at landing, about 500 Wh by May 2022 | Observed | https://www.jpl.nasa.gov/news/nasas-insight-still-hunting-marsquakes-as-power-levels-diminish/ |
| Sunlight reaching the ground through dust | Read from a published table: the share of the sunlight above the air that reaches level ground, for 8 dust levels and 4 Sun heights, with straight lines in between. Examples: 81% of the light is kept at dust 0.5 with the Sun overhead, 46% at dust 3, 29% at dust 5 | Proposed (a NASA calculation by J. Pollack from the dust the Viking landers measured; not a measurement on the ground) | Appelbaum and Landis, "Solar radiation on Mars: Update 1991", NASA TM-105216, Table III — https://ntrs.nasa.gov/citations/19910023732 ; first version: Appelbaum and Flood 1989, NASA TM-102299 — https://ntrs.nasa.gov/citations/19890018252 |
| How that table is used | Global light on level ground = light above the air × cosine of the Sun's distance from overhead × f ÷ (1 − 0.1) | Proposed | Equation 19 of the 1991 update |
| Past the table | Above dust 6 (the 2018 storm reached 10.8) each further step dims the light by the same share as the last step in the table | Game | — |
| What the old formula got wrong | Until this was checked the game used `exp(−0.21 × tau / mu^0.7)`. Against the table it was within 5% with the Sun high, 8 to 21% too bright with the Sun 60° from overhead, and far too dark with a low Sun in a storm | — | Replaced |
| Panel dust build-up | 0.2% of output lost per sol in clear air, faster in dusty air | Game (same order as InSight's decline) | InSight row above |
| The "science demo" dust control | Clear (tau 0.45), dusty (1.5), regional storm (4) | Game | Values sit inside the observed range above |
| Winter at the outpost | With clean panels and a clear sky the solar field and the one fission unit cannot carry the whole base through a winter night at 39.5°N | Game (a result of the game's own numbers: found by running a whole Mars year) | `tools/mars_survive_test.mjs` |

## 5. Power, air, water, food

| What | Value | Class | Source |
|---|---|---|---|
| Fission unit | Kilopower: up to 10 kW of electricity for at least 10 years; four units would run an outpost | Proposed | https://www.nasa.gov/news-release/demonstration-proves-nuclear-fission-system-can-provide-space-exploration-power/ |
| Fission test | KRUSTY ran Nov 2017 – Mar 2018 and ended with a 28-hour full-power test | Demonstrated (on Earth, Nevada) | Same release; https://ntrs.nasa.gov/citations/20205009350 |
| The game's reactor | One 10 kW unit behind a bank of soil | Game (based on the proposal above; nothing like it has flown) | — |
| Fission Surface Power goal | At least 40 kW for ten years, Moon first, then Mars | Proposed | https://www.nasa.gov/exploration-systems-development-mission-directorate/fission-surface-power/ |
| Smallest useful power | About 10 kW for even a short two-person stay | Proposed | https://www.nasa.gov/wp-content/uploads/2024/01/mars-surface-power-generation-challenges-and-considerations.pdf |
| Oxygen from Mars's air | MOXIE made 122 g in 16 runs, up to 12 g an hour, at 98% purity or better | Demonstrated (on Mars, Perseverance, 2021–2023) | https://www.nasa.gov/missions/mars-2020-perseverance/perseverance-rover/nasas-oxygen-generating-experiment-moxie-completes-mars-mission/ |
| How MOXIE works | Splits CO2 with electricity in a cell heated to 800°C | Demonstrated (on Mars) | Hoffman et al. 2022 — https://pmc.ncbi.nlm.nih.gov/articles/PMC9432831/ |
| A full-size oxygen plant | 2 to 3 kg an hour needs about 25 kW (8 to 12.5 kWh per kg) | Proposed | https://science.nasa.gov/blog/a-day-full-of-moxie/ |
| The game's ISRU Facility | 0.25 kg of oxygen an hour for 4 kW (about 10 kWh per kg with its pumps) | Game (scaled from the two rows above) | — |
| What one person needs a day | 0.84 kg oxygen, 0.62 kg dry food, 3.52 kg water to drink and in food; breathes out 1.00 kg CO2 | Observed | Jones 2012, NTRS 20160005782, Table 1 — https://ntrs.nasa.gov/api/citations/20160005782/downloads/20160005782.pdf |
| Radiation on the surface | 0.67 mSv a day (Curiosity, Aug 2012 – Jun 2013) | Observed | https://www.jpl.nasa.gov/news/nasa-curiosity-first-mars-age-measurement-and-human-exploration-help |
| Radiation on the trip | 1.8 mSv a day | Observed | https://www.jpl.nasa.gov/news/data-from-nasa-rovers-voyage-to-mars-aids-planning |
| Soil as a shield | The biggest cut in dose comes from the first 15–20 cm of soil | Proposed (computer model) | Simonsen et al. 1991 — https://ntrs.nasa.gov/citations/19910048753 |
| Dose indoors in the game | 0.3 mSv a day | Game | — |
| Ice well output, water recycling, greenhouse yield, building power use, battery size, solar field size | See `js/mars/sim.js` | Game | — |

## 6. Travel (for the later Moon ↔ Mars mode)

| What | Value | Class | Source |
|---|---|---|---|
| Launch windows | About once every 26 months | Observed | https://science.nasa.gov/planetary-science/programs/mars-exploration/mission-timeline/ |
| Earth–Mars line-up period | 779.94 days | Observed | Mars Fact Sheet |
| Cruise | About 200 days (Perseverance took seven months) | Demonstrated (Mars 2020) | Mission timeline, above |
| Least-energy transfer | 0.70873 years, about 8.5 months | Proposed (textbook orbit) | https://pwg.gsfc.nasa.gov/stargaze/Smars1.htm |

## 7. Named places (for the Mars Science Center, later)

| Place | Facts | Class | Source |
|---|---|---|---|
| Jezero Crater | 18.41°N, 77.69°E; 45 km wide; about 2,600 m below reference level | Observed | https://planetarynames.wr.usgs.gov/Feature/14300 |
| Gale Crater | 154 km wide, with a mountain about 5 km high in the middle | Observed | https://www.jpl.nasa.gov/images/pia14290-gale-crater-future-home-of-mars-rover-curiosity/ |
| InSight, Elysium Planitia | 4.502°N, 135.623°E, −2,613 m | Observed | https://pmc.ncbi.nlm.nih.gov/articles/PMC7583488 |
| Viking 2, Utopia Planitia | 47.67°N, 134.28°E | Observed | https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1975-083C |
| Phoenix | 68.22°N, 234.25°E; ice under about 4.6 cm of soil | Observed | https://science.nasa.gov/mission/mars-phoenix/ ; https://doi.org/10.1029/2009JE003417 |
| Olympus Mons | 18.65°N, 226.2°E; summit 21,300 m above the MOLA datum | Observed | https://planetarynames.wr.usgs.gov/Feature/4453 ; https://pgda.gsfc.nasa.gov/products/62 |
| Valles Marineris | 14.01°S, 301.41°E; about 3,870 km long | Observed | https://planetarynames.wr.usgs.gov/Feature/6288 |

## 8a. Scenery (added with the "better ground and scenery" step)

| What | In the game | Class | Note |
|---|---|---|---|
| Sun's size in the sky | About two-thirds of what it looks from Earth | Observed (derived from the orbit: 1 / 1.52) | Mars Fact Sheet |
| Earth in Mars's sky | A star never more than 41° from the Sun; a morning star at the start of the game | Game (geometry from the orbit sizes, with a made-up starting line-up; the real maximum is a little larger because Mars's orbit is not a circle) | `earthElongation` in `js/mars/sim.js` |
| Marsquake from a meteorite | InSight felt a magnitude 4 quake from the 24 Dec 2021 impact | Observed | https://www.jpl.nasa.gov/news/nasas-insight-lander-detects-stunning-meteoroid-impact-on-mars |
| The seismometer by the base | A dome on the ground, 270 m out | Game (the instrument is Demonstrated: InSight) | — |
| Terraced crater, heat shield and parachute, far craters, dust streaks | Placed for play | Game | — |
| Phobos's orbit | Once round Mars in 7 h 39 min (0.31891 days), about 6,000 km above the ground | Observed | Mars Fact Sheet; https://science.nasa.gov/mars/moons/facts/ |
| Phobos in the sky | Goes round faster than Mars turns, so it rises in the west and sets in the east, twice a sol | Observed | https://science.nasa.gov/photojournal/two-moons-and-the-pleiades-from-mars ; https://science.nasa.gov/image-article/apod-2017-july-21-phobos-moon-over-mars/ |
| Phobos's timing in the game | Rises every 11.1 hours and takes about 4.2 hours to cross; from 39.5°N it stays under 33° high, in the south | Game (worked out from the orbit above; NASA pages give no figure for the gap, and say "about 5½ hours" for the crossing) | Derived |
| Dust-devil tracks | Dark tracks where a whirlwind has lifted pale dust off darker ground, photographed in Arcadia Planitia | Observed | https://science.nasa.gov/photojournal/pj-dust-devil-tracks-27 |
| Clouds | Thin water-ice clouds by day. The bright clouds seen at twilight by Curiosity (2019, 2021) are higher and are probably frozen carbon dioxide; the game draws both the same way | Observed | https://www.jpl.nasa.gov/news/nasas-curiosity-rover-captures-shining-clouds-on-mars/ |
| Terraced craters and ice | Scientists measured the depth of terraces in craters, with radar, to find a layer of ice tens of metres thick under Arcadia Planitia | Observed | Bramson et al. 2015 — https://arxiv.org/abs/1509.03210 |
| Heat shield, backshell, parachute | Landers drop them, and they have been photographed where they fell: Opportunity visited its own heat shield (2004); the Ingenuity helicopter photographed Perseverance's backshell and parachute (19 April 2022) | Observed | https://science.nasa.gov/photojournal/opportunitys-heat-shield-scene/ ; https://www.jpl.nasa.gov/news/nasas-mars-helicopter-spots-gear-that-helped-perseverance-rover-land/ |
| Earth seen from Mars | A bright "star" near the Sun: Spirit photographed it an hour before sunrise (2004), Curiosity 80 minutes after sunset (2014) | Observed | https://science.nasa.gov/photojournal/you-are-here-earth-as-seen-from-mars/ ; https://science.nasa.gov/photojournal/bright-evening-star-seen-from-mars-is-earth/ |

## 8b. The survival mission

| What | In the game | Class | Note |
|---|---|---|---|
| The storm's dust | 4.8 to 5.6 | Game (inside the observed range: above 5.5 in 2007, 10.8 in 2018) | Section 4 |
| How fast it arrives | The dust thickens over about half a sol | Game (the 2018 storm went from clear to 4.9 in three sols) | Section 4 |
| Solar power in the storm | About a third of a clear day | Game (from the game's own dust formula) | Section 4 |
| The breakdowns | Clogged filter, tripped heat pump, spent scrubber bed, frozen pump, failed battery module, jammed solar tables, dish off aim, dead grow lamps | Game | Made up for play; the end screen says so |
| What the crew need | 0.84 kg of oxygen each a day (3.4 kg a sol for four) | Observed | Section 5 |

## 8. Not verified in this pass

- Some NASA pages say Olympus Mons is "over 40 km" from base to summit; MOLA gives 21.3 km above the datum. The game uses the MOLA value.
- No opened NASA page gave the percentage of sunlight lost in the **2018** storm; the 99% figure is from 2007.
- The exact touchdown points of Curiosity and Perseverance were not found on a page that opened, so the game does not show them.
- The dust-to-sunlight numbers were checked on 15 Nov 2026 and replaced by NASA's table (section 4). Only four Sun heights of that table (overhead, 30°, 60° and 80° from overhead) are used, with straight lines between them.
- Scenery checked on 15 Nov 2026 (section 8a). Still not found on a NASA page: a figure for how often Phobos rises (the game's 11.1 hours is worked out from its orbit) and for how long it takes to cross the sky (NASA pages say about 5½ hours; the geometry gives about 4¼ at the equator, which the game uses); and the latitude beyond which Phobos cannot be seen. The dust-devil tracks beside the outpost's own latitude: tracks in Amazonis Planitia, further south, are bright, not dark, because the dust there is thick; the Arcadia picture cited is at 57°N.
- Several journal pages were read as abstracts only (Piqueux 2019, Dundas 2021 and 2023, Mellon 2009, Bramson 2015, Morgan 2021).
