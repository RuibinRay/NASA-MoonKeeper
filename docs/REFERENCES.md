# MOONKEEPER: every dataset, reference and link

Everything the game is built on, on one page. The game itself shows no links or citations, so that the screen stays clean for young players; this page credits them instead. The reasoning behind each number (which game rule comes from which fact, and what was simplified) is in the two science notes linked below.

_Not an official NASA product. NASA data and imagery are used under the [NASA media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/); no endorsement is implied._

## Start here

| | |
|---|---|
| Play the game | [ruibinray.github.io/NASA-MoonKeeper](https://ruibinray.github.io/NASA-MoonKeeper/) |
| Source code | [github.com/RuibinRay/NASA-MoonKeeper](https://github.com/RuibinRay/NASA-MoonKeeper) |
| Moon science notes: which game rule comes from which fact | [docs/SCIENCE_AND_SOURCES.md](https://github.com/RuibinRay/NASA-MoonKeeper/blob/main/docs/SCIENCE_AND_SOURCES.md) |
| Mars science notes: what is real, and where each number comes from | [docs/MARS_SCIENCE.md](https://github.com/RuibinRay/NASA-MoonKeeper/blob/main/docs/MARS_SCIENCE.md) |
| The raw data files | [data/raw/](https://github.com/RuibinRay/NASA-MoonKeeper/tree/main/data/raw) |
| For teachers | [teachers.html](https://ruibinray.github.io/NASA-MoonKeeper/teachers.html) · [docs/TEACHERS.md](https://github.com/RuibinRay/NASA-MoonKeeper/blob/main/docs/TEACHERS.md) |
| The Mars Science Center (six hands-on demos, each with its sources) | [science.html](https://ruibinray.github.io/NASA-MoonKeeper/science.html) |
| How SI (AI) tools were used | [README: Use of SI](https://github.com/RuibinRay/NASA-MoonKeeper/blob/main/README.md#use-of-si-super-intelligence) · [si-use.json](https://github.com/RuibinRay/NASA-MoonKeeper/blob/main/si-use.json) |

## 1. Real data the game loads

These are downloaded once, kept in `data/raw/`, and turned into the files the game reads by the scripts named here.

| What the game does with it | Dataset | Publisher | File(s) | Built by |
|---|---|---|---|---|
| Every solar storm in the game is a real flare or particle storm (2011–2026) | [DONKI — Space Weather Database Of Notifications, Knowledge, Information](https://ccmc.gsfc.nasa.gov/tools/DONKI/) | NASA CCMC | [donki_flr_2011_2026.json](https://github.com/RuibinRay/NASA-MoonKeeper/blob/main/data/raw/donki_flr_2011_2026.json)<br>[donki_sep_2011_2026.json](https://github.com/RuibinRay/NASA-MoonKeeper/blob/main/data/raw/donki_sep_2011_2026.json)<br>[donki_cmeanalysis_2011_2026.json](https://github.com/RuibinRay/NASA-MoonKeeper/blob/main/data/raw/donki_cmeanalysis_2011_2026.json)<br>[donki_gst_2011_2026.json](https://github.com/RuibinRay/NASA-MoonKeeper/blob/main/data/raw/donki_gst_2011_2026.json) | `tools/fetch_donki.mjs`, `tools/build_data.mjs` → `js/nasa-events.js` |
| Every moonquake and meteoroid strike is a real event felt by Apollo seismometers (1969–1977) | [Apollo Passive Seismic Experiment Expanded Event Catalog](https://pds.nasa.gov/ds-view/pds/viewBundle.jsp?identifier=urn%3Anasa%3Apds%3Aapollo_seismic_event_catalog&version=1.0) | NASA PDS | [pds_apollo_levent.1008weber.csv](https://github.com/RuibinRay/NASA-MoonKeeper/blob/main/data/raw/pds_apollo_levent.1008weber.csv)<br>[pds_apollo_nakamura_1979_sm_locations.csv](https://github.com/RuibinRay/NASA-MoonKeeper/blob/main/data/raw/pds_apollo_nakamura_1979_sm_locations.csv) | `tools/build_data.mjs` → `js/nasa-events.js` |
| Each impact is compared with a real meteorite that people saw fall on Earth | [Meteorite Landings](https://data.nasa.gov/dataset/meteorite-landings) | data.nasa.gov | [datanasa_meteorite_landings.csv](https://github.com/RuibinRay/NASA-MoonKeeper/blob/main/data/raw/datanasa_meteorite_landings.csv) | `tools/build_data.mjs` → `js/nasa-events.js` |
| Why moon-soil farming is slow and hard on plants (farm rules) | [OSD-476: Plants grown in Apollo lunar regolith](https://osdr.nasa.gov/bio/repo/data/studies/OSD-476) | NASA OSDR | — | game rules in `js/sim.js` |
| The real ground of Mars around the outpost and on the Map | [MOLA Mission Experiment Gridded Data Records (MEGDR)](https://pds-geosciences.wustl.edu/missions/mgs/megdr.html) | NASA PDS Geosciences Node | — | `tools/build_mars.mjs` → `js/mars/mola.js` |
| Earth hanging in the lunar sky | [Blue Marble (SVS 2915)](https://svs.gsfc.nasa.gov/2915) | NASA SVS | [bluemarble-2048.png](https://github.com/RuibinRay/NASA-MoonKeeper/blob/main/data/raw/bluemarble-2048.png) | `assets/tex/earth.jpg` |
| The Moon seen from orbit and on the Moon map | [CGI Moon Kit (LRO colour map)](https://svs.gsfc.nasa.gov/4720) | NASA SVS | [nasa_svs_moon_lroc_color_2k.jpg](https://github.com/RuibinRay/NASA-MoonKeeper/blob/main/data/raw/nasa_svs_moon_lroc_color_2k.jpg)<br>[lroc_color_poles_1k.jpg](https://github.com/RuibinRay/NASA-MoonKeeper/blob/main/data/raw/lroc_color_poles_1k.jpg) | `assets/tex/moon.jpg` |

Also kept in `data/raw/` for reference: [datanasa_lunar.json](https://github.com/RuibinRay/NASA-MoonKeeper/blob/main/data/raw/datanasa_lunar.json), [pkg_apollo-passive-seismic-experiment-expand.json](https://github.com/RuibinRay/NASA-MoonKeeper/blob/main/data/raw/pkg_apollo-passive-seismic-experiment-expand.json), [pkg_apollo-15-and-17-heat-flow-experiment-co.json](https://github.com/RuibinRay/NASA-MoonKeeper/blob/main/data/raw/pkg_apollo-15-and-17-heat-flow-experiment-co.json), [pds_apollo_nakamura_1983_m_arrivals.csv](https://github.com/RuibinRay/NASA-MoonKeeper/blob/main/data/raw/pds_apollo_nakamura_1983_m_arrivals.csv) (data.nasa.gov listings and the Apollo deep-moonquake arrival times).

## 2. The Moon: science sources

Grouped as in [docs/SCIENCE_AND_SOURCES.md](https://github.com/RuibinRay/NASA-MoonKeeper/blob/main/docs/SCIENCE_AND_SOURCES.md), which says what each one is used for.

### Which game rule comes from which fact

- [Lunar Pits Atlas — Mare Tranquillitatis Pit](https://lroc.im-ldi.com/atlases/pits/3)
- [NASA's LRO Finds Lunar Pits Harbor Comfortable Temperatures](https://www.nasa.gov/solar-system/nasas-lro-finds-lunar-pits-harbor-comfortable-temperatures/)
- [New Evidence Adds to Findings Hinting at Network of Caves on Moon](https://science.nasa.gov/solar-system/moon/new-evidence-adds-to-findings-hinting-at-network-of-caves-on-moon/)
- [Kaguya radar: intact lava tube at Marius Hills](https://www.isas.jaxa.jp/en/topics/001159.html)
- [Theoretical study suggests huge lava tubes could exist on Moon](https://www.purdue.edu/newsroom/archive/releases/2015/Q1/theoretical-study-suggests-huge-lava-tubes-could-exist-on-moon.html)
- [Atlas of Lunar Sinuous Rilles](https://www.lpi.usra.edu/lunar/rilles/)
- [Apollo Lunar Surface Journal — Thermal Environment](https://www.nasa.gov/wp-content/uploads/static/history/alsj/WOTM/WOTM-ThermalEnvrnmnt.html)
- [Weather on the Moon](https://science.nasa.gov/moon/weather-on-the-moon/)
- [Moon Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html)
- [Moonlight](https://science.nasa.gov/moon/moonlight/)
- [Earth as seen from the Moon](https://svs.gsfc.nasa.gov/4955/)
- [Earthshine as an illumination source at the Moon](https://ntrs.nasa.gov/citations/20190001705)
- [Moon Facts](https://science.nasa.gov/moon/facts/)
- [Why Moon and Mars (2025 white paper)](https://www.nasa.gov/wp-content/uploads/2025/12/acr25-wp-why-moon-and-mars-v2.pdf)
- [First measurements of the radiation dose on the lunar surface (Chang'E-4 LND)](https://doi.org/10.1126/sciadv.aaz1334)
- [Radiation Protection Technical Brief (OCHMO-TB-020)](https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf)
- [How NASA Will Protect Astronauts From Space Radiation at the Moon](https://science.nasa.gov/science-research/heliophysics/how-nasa-will-protect-astronauts-from-space-radiation-at-the-moon/)
- [Lunar Safe Haven (regolith radiation shelter study)](https://ntrs.nasa.gov/api/citations/20210022066/downloads/Grande_Lunar%20Safe%20Haven_ASCEND%202021_Full_v2b.docx.pdf)
- [How NASA Prepares Spacecraft for the Harsh Radiation of Space](https://science.nasa.gov/science-research/heliophysics/how-nasa-prepares-spacecraft-for-the-harsh-radiation-of-space/)
- [Moon to Mars Space Weather Analysis Office](https://science.gsfc.nasa.gov/m2m-swao)
- [Data from NASA rover's voyage to Mars aids planning (MSL-RAD)](https://www.jpl.nasa.gov/news/data-from-nasa-rovers-voyage-to-mars-aids-planning/)
- [ECLSS life-support mass balance (NTRS 20090034853)](https://ntrs.nasa.gov/api/citations/20090034853/downloads/20090034853.pdf)
- [NASA Achieves Water Recovery Milestone on International Space Station](https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/)
- [Environmental Control and Life Support Systems (ECLSS)](https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/)
- [Systems analysis of oxygen from regolith](https://ntrs.nasa.gov/api/citations/20205002032/downloads/ASCEND-Systems%20Analysis%20of%20O2%20from%20Regolith%20-%20Sibille.pdf)
- [NASA Successfully Extracts Oxygen from Lunar Soil Simulant](https://www.nasa.gov/centers-and-facilities/johnson/nasa-successfully-extracts-oxygen-from-lunar-soil-simulant/)
- [Kilopower: nuclear fission system for space exploration power](https://www.nasa.gov/news-release/demonstration-proves-nuclear-fission-system-can-provide-space-exploration-power/)
- [Fission Surface Power Project](https://www.nasa.gov/centers-and-facilities/glenn/nasas-fission-surface-power-project-energizes-lunar-exploration/)
- [NASA's Dust Shield Successfully Repels Lunar Regolith on Moon](https://www.nasa.gov/image-article/nasas-dust-shield-successfully-repels-lunar-regolith-on-moon/)
- [Moon Dust](https://science.nasa.gov/moon/moon-dust/)
- [Surveyor observations of lunar horizon-glow](https://ntrs.nasa.gov/citations/19740054216)
- [About Lunar Impact Monitoring](https://www.nasa.gov/meteoroid-environment-office/about-lunar-impact-monitoring/)
- [Bright Explosion on the Moon](https://science.nasa.gov/science-research/planetary-science/16may_lunarimpact/)
- [Moonquakes](https://science.nasa.gov/moon/moonquakes/)
- [Veggie fact sheet](https://www.nasa.gov/wp-content/uploads/2019/04/veggie_fact_sheet_508.pdf)
- [Growing Plants in Space](https://www.nasa.gov/exploration-research-and-technology/growing-plants-in-space/)
- [Astronauts Harvest Radish Crop on International Space Station](https://www.nasa.gov/missions/station/astronauts-harvest-radish-crop-on-international-space-station/)
- [Scientists Grow Plants in Lunar Soil](https://www.nasa.gov/humans-in-space/scientists-grow-plants-in-lunar-soil/)
- [Crop production for space life support (R. Wheeler)](https://ntrs.nasa.gov/citations/20205008786)
- [Saffire Ignites New Discoveries in Space](https://www.nasa.gov/humans-in-space/saffire-ignites-new-discoveries-in-space/)
- [25 Years Ago: Fire Aboard Space Station Mir](https://www.nasa.gov/history/25-years-ago-fire-aboard-space-station-mir/)
- [Houston, We've Had a Problem (Apollo 13)](https://www.nasa.gov/history/houston-weve-had-a-problem/)
- [RASSOR regolith excavator](https://technology.nasa.gov/patent/KSC-TOPS-7)
- [ICON lunar construction technology (Project Olympus)](https://www.nasa.gov/centers-and-facilities/marshall/nasa-icon-advance-lunar-construction-technology-for-moon-missions/)
- [Apollo 11 Mission Overview](https://www.nasa.gov/history/apollo-11-mission-overview/)

### How the main mechanics map to real limits of living in space

- [Power hibernation for lunar missions](https://ntrs.nasa.gov/citations/20220017550)
- [reconstruction of the impact site](https://arxiv.org/abs/1103.1687)
- [Gazetteer of Planetary Nomenclature](https://planetarynames.wr.usgs.gov/)

### Farming, water and the closed loop

- [Plants grown in Apollo lunar regolith present stress-associated transcriptomes (Paul, Elardo & Ferl 2022)](https://www.nature.com/articles/s42003-022-03334-8)
- [Phosphate-solubilising bacteria improve lunar regolith simulant for plant growth (Xia et al. 2023)](https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=PMCID:PMC10636133&resultType=core&format=json)
- [Chickpeas in lunar regolith simulant with vermicompost and mycorrhizal fungi (Atkin & Oliveira Santos)](https://www.biorxiv.org/content/10.1101/2024.01.18.576311v1.full)
- [Life Support Baseline Values and Assumptions Document, NASA/TP-2015-218570 Rev 2 (crop tables 4-89 to 4-91, crew table 3-31)](https://ntrs.nasa.gov/api/citations/20210024855/downloads/BVAD_2.15.22-final.pdf)
- [Growing Plants in Space](https://www.nasa.gov/content/growing-plants-in-space)
- [NASA Teams Persevere Through Plant Challenges in Space (Veg-05)](https://www.nasa.gov/missions/station/nasa-teams-persevere-through-plant-challenges-in-space)
- [Astroculture potato experiment, STS-73](https://ntrs.nasa.gov/citations/19990018877)
- [NASA's Second Pepper Harvest Sets Record on Space Station](https://www.nasa.gov/missions/station/nasas-second-pepper-harvest-sets-record-on-space-station/)
- [Detection of water in the LCROSS ejecta plume (Colaprete et al. 2010)](https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=EXT_ID:20966242&resultType=core&format=json)
- [Direct evidence of surface exposed water ice in the lunar polar regions (Li et al. 2018)](https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=PMCID:PMC6130389&resultType=core&format=json)
- [Hermite Crater](https://science.nasa.gov/image-detail/hermite)
- [Water on the surface of the Moon as seen by the Moon Mineralogy Mapper (Li & Milliken 2017)](https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=PMCID:PMC5597310&resultType=core&format=json)
- [Thermal Mining of Ices on Cold Solar System Bodies (Sowers 2019)](https://www.nasa.gov/general/thermal-mining-of-ices-on-cold-solar-system-bodies/)
- [Microwave extraction of water from lunar regolith simulant (Ethridge & Kaukler)](https://ntrs.nasa.gov/citations/20070018802)
- [Revised release on the pressure along the melting and sublimation curves of ordinary water substance](https://www.iow.de/files/staff/rfeistel/download/meltsub.pdf)
- [Global regolith thermophysical properties of the Moon from the Diviner Lunar Radiometer Experiment (Hayne et al. 2017)](https://arxiv.org/pdf/1711.00977)
- [NASA's Lunar Drill Technology Passes Tests on the Moon (PRIME-1)](https://www.nasa.gov/missions/artemis/clps/nasas-lunar-drill-technology-passes-tests-on-the-moon/)
- [VIPER](https://science.nasa.gov/mission/viper/)
- [Oxygen extraction from lunar soils and pyroclastic glass (Allen et al. 1994)](https://ntrs.nasa.gov/citations/19940030892)
- [Lunar ilmenite resources (Cameron 1992)](https://fti.neep.wisc.edu/fti.neep.wisc.edu/pdf/wcsar9201-3.pdf)
- [ROxygen: lunar oxygen production field demonstration, Mauna Kea 2008](https://ntrs.nasa.gov/citations/20110011479)
- [Technical targets for proton exchange membrane electrolysis](https://www.energy.gov/eere/fuelcells/technical-targets-proton-exchange-membrane-electrolysis)
- [Carbon dioxide technical brief (OCHMO-TB-004)](https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-004-carbon-dioxide.pdf)
- [orbiter reflectance and temperature, 2017](https://ntrs.nasa.gov/citations/20170003782)

## 3. Mars: science sources

Grouped as in [docs/MARS_SCIENCE.md](https://github.com/RuibinRay/NASA-MoonKeeper/blob/main/docs/MARS_SCIENCE.md), where each row also says whether the fact is Observed, Demonstrated, Proposed or a game value.

### The outpost site

- [Nearby studied sites (Golombek et al. 2021, LPSC abstract 2420)](https://www.hou.usra.edu/meetings/lpsc2021/pdf/2420.pdf)
- [Why low ground helps landing](https://www.jpl.nasa.gov/news/nasas-treasure-map-for-water-ice-on-mars)
- [NASA exploration-zone limits (Bussey and Hoffman 2016, NTRS 20160002370)](https://ntrs.nasa.gov/api/citations/20160002370/downloads/20160002370.pdf)
- [Ice under Arcadia Planitia (Bramson et al. 2015)](https://doi.org/10.1002/2015GL064844)
- [Ice at this latitude (Piqueux et al. 2019)](https://doi.org/10.1029/2019GL083947)
- [Fresh craters that dug up ice (Dundas et al. 2021)](https://doi.org/10.1029/2020JE006617)
- [Fresh craters that dug up ice (Dundas et al. 2023)](https://doi.org/10.1029/2022GL100747)
- [Ice maps](https://www.jpl.nasa.gov/news/nasa-is-locating-ice-on-mars-with-this-new-map)
- [Region names (USGS Gazetteer)](https://planetarynames.wr.usgs.gov/Feature/348)

### The planet

- [Surface gravity (NASA Mars Fact Sheet)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html)
- [Sky colour](https://www.jpl.nasa.gov/images/pia16768-mount-sharp-panorama-in-white-balanced-colors)
- [Sunsets](https://science.nasa.gov/solar-system/planets/mars/what-does-a-sunrise-sunset-look-like-on-mars/)
- [Dust devils](https://www.jpl.nasa.gov/news/nasas-perseverance-studies-the-wild-winds-of-jezero-crater)
- [Radio blackout](https://www.nasa.gov/wp-content/uploads/2024/01/mars-communications-disruption-and-delay.pdf)

### Dust and sunlight

- [Clear-sky dust (tau)](https://www.jpl.nasa.gov/edu/resources/teachable-moment/mars-rover-mission-comes-to-an-end-but-science-legacy-live-on/)
- [Clear-sky dust (tau)](https://science.nasa.gov/blogs/insight/2022/12/12/nasa-insights-power-level-as-of-dec-12-2022/)
- [2018 planet-wide storm](https://www.jpl.nasa.gov/news/opportunity-hunkers-down-during-dust-storm/)
- [2007 storm](https://www.jpl.nasa.gov/news/nasa-mars-rovers-braving-severe-dust-storms)
- [How fast a storm arrives](https://www.nasa.gov/wp-content/uploads/2024/01/mars-surface-power-generation-challenges-and-considerations.pdf)
- [Dust settling on panels](https://www.jpl.nasa.gov/news/nasas-insight-still-hunting-marsquakes-as-power-levels-diminish/)
- [Sunlight reaching the ground through dust (Appelbaum and Landis, "Solar radiation on Mars: Update 1991", NASA TM-105216, Table III)](https://ntrs.nasa.gov/citations/19910023732)
- [Sunlight reaching the ground through dust (first version: Appelbaum and Flood 1989, NASA TM-102299)](https://ntrs.nasa.gov/citations/19890018252)

### Power, air, water, food

- [Fission test](https://ntrs.nasa.gov/citations/20205009350)
- [Fission Surface Power goal](https://www.nasa.gov/exploration-systems-development-mission-directorate/fission-surface-power/)
- [Oxygen from Mars's air](https://www.nasa.gov/missions/mars-2020-perseverance/perseverance-rover/nasas-oxygen-generating-experiment-moxie-completes-mars-mission/)
- [How MOXIE works (Hoffman et al. 2022)](https://pmc.ncbi.nlm.nih.gov/articles/PMC9432831/)
- [A full-size oxygen plant](https://science.nasa.gov/blog/a-day-full-of-moxie/)
- [What one person needs a day (Jones 2012, NTRS 20160005782, Table 1)](https://ntrs.nasa.gov/api/citations/20160005782/downloads/20160005782.pdf)
- [Radiation on the surface](https://www.jpl.nasa.gov/news/nasa-curiosity-first-mars-age-measurement-and-human-exploration-help)
- [Radiation on the trip](https://www.jpl.nasa.gov/news/data-from-nasa-rovers-voyage-to-mars-aids-planning)
- [Soil as a shield (Simonsen et al. 1991)](https://ntrs.nasa.gov/citations/19910048753)

### Travel

- [Launch windows](https://science.nasa.gov/planetary-science/programs/mars-exploration/mission-timeline/)
- [Least-energy transfer](https://pwg.gsfc.nasa.gov/stargaze/Smars1.htm)

### Named places

- [Jezero Crater](https://planetarynames.wr.usgs.gov/Feature/14300)
- [Gale Crater](https://www.jpl.nasa.gov/images/pia14290-gale-crater-future-home-of-mars-rover-curiosity/)
- [InSight, Elysium Planitia](https://pmc.ncbi.nlm.nih.gov/articles/PMC7583488)
- [Viking 2, Utopia Planitia](https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1975-083C)
- [Phoenix](https://science.nasa.gov/mission/mars-phoenix/)
- [Phoenix](https://doi.org/10.1029/2009JE003417)
- [Olympus Mons](https://planetarynames.wr.usgs.gov/Feature/4453)
- [Olympus Mons](https://pgda.gsfc.nasa.gov/products/62)
- [Valles Marineris](https://planetarynames.wr.usgs.gov/Feature/6288)

### Scenery

- [Marsquake from a meteorite](https://www.jpl.nasa.gov/news/nasas-insight-lander-detects-stunning-meteoroid-impact-on-mars)
- [Phobos's orbit](https://science.nasa.gov/mars/moons/facts/)
- [Phobos in the sky](https://science.nasa.gov/photojournal/two-moons-and-the-pleiades-from-mars)
- [Phobos in the sky](https://science.nasa.gov/image-article/apod-2017-july-21-phobos-moon-over-mars/)
- [Dust-devil tracks](https://science.nasa.gov/photojournal/pj-dust-devil-tracks-27)
- [Clouds](https://www.jpl.nasa.gov/news/nasas-curiosity-rover-captures-shining-clouds-on-mars/)
- [Terraced craters and ice (Bramson et al. 2015)](https://arxiv.org/abs/1509.03210)
- [Heat shield, backshell, parachute](https://science.nasa.gov/photojournal/opportunitys-heat-shield-scene/)
- [Heat shield, backshell, parachute](https://www.jpl.nasa.gov/news/nasas-mars-helicopter-spots-gear-that-helped-perseverance-rover-land/)
- [Earth seen from Mars](https://science.nasa.gov/photojournal/you-are-here-earth-as-seen-from-mars/)
- [Earth seen from Mars](https://science.nasa.gov/photojournal/bright-evening-star-seen-from-mars-is-earth/)

## 4. The Mars Science Center: sources shown under each demo

### Gravity

- [NASA Mars Fact Sheet: surface gravity 3.73 m/s²](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html) — Observed
- [NASA Moon Fact Sheet: surface gravity 1.62 m/s²](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html) — Observed

### Air pressure

- [NASA Mars Fact Sheet: surface pressure 6.36 mb at the mean radius (4.0 to 8.7 mb with the seasons), scale height](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html) — Observed
- [NASA Earth Fact Sheet: 1,014 mb at the surface](https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html) — Observed
- [Heights from the MOLA laser altimeter (NASA Planetary Data System)](https://pds-geosciences.wustl.edu/missions/mgs/megdr.html) — Observed

### Solar power and dust

- [NASA Mars Fact Sheet: sunlight 586.2 W/m² at Mars, 1,361 at Earth](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html) — Observed
- [Appelbaum and Flood, "Solar radiation on Mars" (NASA, 1989): how dust dims the beam and brightens the sky](https://ntrs.nasa.gov/citations/19890018252) — Observed
- [NASA Opportunity rover: the 2018 dust storm ended its mission](https://science.nasa.gov/mission/mer-opportunity/) — Observed
- [The sky-glow numbers are read from the table in the 1991 update of that paper. They are a NASA calculation, not a measurement on the ground.](https://ntrs.nasa.gov/citations/19910023732) — Proposed

### Oxygen from the air

- [NASA: MOXIE made 122 g of oxygen in 16 runs, up to 12 g an hour at 98 % purity](https://www.nasa.gov/missions/mars-2020-perseverance/perseverance-rover/nasas-oxygen-generating-experiment-moxie-completes-mars-mission/) — Demonstrated
- [NASA Perseverance instruments: MOXIE, 300 watts](https://science.nasa.gov/mission/mars-2020-perseverance/science-instruments/) — Demonstrated
- [NASA Mars Fact Sheet: the air is 95 % carbon dioxide](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html) — Observed

### Water from ice

- [NASA: a map of buried ice on Mars, with Arcadia Planitia as a leading place to land](https://www.nasa.gov/solar-system/nasas-treasure-map-for-water-ice-on-mars/) — Observed
- [NASA Phoenix lander: ice under the soil, and perchlorate salts](https://science.nasa.gov/mission/phoenix/) — Observed

### Flying between worlds

- [NASA Basics of Space Flight, chapter 4: trajectories and transfer orbits](https://science.nasa.gov/learn/basics-of-space-flight/chapter4-1/) — Observed
- [NASA planetary fact sheets: sizes, masses, years of Earth, the Moon and Mars](https://nssdc.gsfc.nasa.gov/planetary/factsheet/) — Observed
- [NASA: the Hohmann transfer to Mars, about 8.5 months](https://pwg.gsfc.nasa.gov/stargaze/Smars1.htm) — Proposed

## 5. More NASA data that matches the game

From [docs/GAME_OVERVIEW.md](https://github.com/RuibinRay/NASA-MoonKeeper/blob/main/docs/GAME_OVERVIEW.md): data the game's numbers agree with, and datasets a teacher or player can explore next.

- [Apollo Passive Seismic Experiment event catalog](https://pds-geosciences.wustl.edu/missions/apollo/seismic_event_catalog.htm)
- [Earth from the Moon](https://svs.gsfc.nasa.gov/4944/)
- [Chang'E-4 measurement](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC7518862/fullTextXML)
- [NASA radiation brief](https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-020-radiation-protection.pdf)
- [NASA dust shield](https://www.nasa.gov/missions/artemis/clps/electrodynamic-dust-shield-heading-to-moon-on-firefly-lander/)
- [NASA life-support baseline document](https://ntrs.nasa.gov/citations/20210024855)
- [NASA lunar environment document](https://ntrs.nasa.gov/citations/20250006445)
- [LRO Diviner radiometer archive](https://pds-geosciences.wustl.edu/missions/lro/diviner.htm)
- [LROC Pits Atlas](https://lroc.im-ldi.com/atlases/pits/list)
- [LOLA topography](https://pds-geosciences.wustl.edu/missions/lro/lola.htm)
- [Moon Trek](https://trek.nasa.gov/moon/)
- [Moon Phase and Libration](https://svs.gsfc.nasa.gov/5587/)
- [Dial-A-Moon](https://svs.gsfc.nasa.gov/gallery/moonphase/)
- [LRO CRaTER archive](https://pds-ppi.igpp.ucla.edu/archive1/LROCRA_2XXX/AAREADME.HTM)
- [Lunar impact flash locations](https://ntrs.nasa.gov/citations/20150021386)
- [CNEOS Fireballs](https://cneos.jpl.nasa.gov/fireballs/)
- [Apollo seismic data](https://pds-geosciences.wustl.edu/missions/apollo/apollo_pse.htm)
- [LCROSS](https://pds-geosciences.wustl.edu/missions/lcross/default.htm)
- [Moon Mineralogy Mapper](https://pds-imaging.jpl.nasa.gov/volumes/m3.html)
- [LEND](https://pds-geosciences.wustl.edu/missions/lro/lend.htm)
- [LRO peers into permanent shadows](https://svs.gsfc.nasa.gov/4043)
- [South Pole illumination](https://svs.gsfc.nasa.gov/5228/)
- [Lunar Sample Compendium](https://curator.jsc.nasa.gov/lunar/lsc/)
- [Lunar Sourcebook](https://www.lpi.usra.edu/publications/books/lunar_sourcebook/)
- [Apollo 15 heat-flow experiment](https://pds-geosciences.wustl.edu/missions/apollo/a15hfe.htm)
- [Veggie lettuce study OSD-267](https://osdr.nasa.gov/bio/repo/data/studies/OSD-267)
- [Chile pepper study OSD-772](https://osdr.nasa.gov/bio/repo/data/studies/OSD-772)
- [Blue Marble](https://science.nasa.gov/earth/earth-observatory/collections/blue-marble)

## 6. Other references

- [Machado, Oliveira and Fernandes 2009](https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html) (used to check that the game's colours can be told apart in every kind of colour vision)
