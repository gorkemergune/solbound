// Real NASA sources behind each landing site's info box (the fact text lives in i18n: `site.fact.<id>`).
// Every number in the fact text was checked against the linked page on 15 Nov 2026. The site's gameplay
// modifiers (landing.ts) are game assumptions and are shown separately.

export type SiteSource = { title: string; url: string };

const ARTEMIS_2024: SiteSource = {
  title: 'NASA — NASA Provides Update on Artemis III Moon Landing Regions (2024)',
  url: 'https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/',
};
const MONS_MOUTON: SiteSource = {
  title: 'NASA SVS — Mons Mouton, a Newly Named Lunar Mountain',
  url: 'https://svs.gsfc.nasa.gov/5074/',
};

export const SITE_SOURCES: Record<string, SiteSource[]> = {
  shackleton: [
    { title: 'NASA Science — Shackleton Crater’s Illuminated Rim & Shadowed Interior', url: 'https://science.nasa.gov/resource/shackleton-craters-illuminated-rim-shadowed-interior/' },
    { title: 'NASA — The Lunar South Pole Region', url: 'https://www.nasa.gov/reference/moonbase-environment/' },
  ],
  'mons-mouton': [MONS_MOUTON, { title: 'NASA Science — VIPER', url: 'https://science.nasa.gov/mission/viper/' }, ARTEMIS_2024],
  malapert: [{ title: 'NASA Science — Malapert Massif', url: 'https://science.nasa.gov/resource/malapert-massif/' }, ARTEMIS_2024],
  nobile: [MONS_MOUTON, ARTEMIS_2024],
  haworth: [
    ARTEMIS_2024,
    { title: 'NASA — NASA Identifies Candidate Regions for Landing Next Americans on Moon (2022)', url: 'https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-landing-next-americans-on-moon/' },
  ],
  tranquillitatis: [{ title: 'NASA NSSDCA — Apollo 11 Lunar Module', url: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-059C' }],
  'marius-hills': [
    { title: 'NASA Science — APOD: Marius Hills, Holes in the Moon (2017)', url: 'https://science.nasa.gov/image-article/apod-2017-october-25-marius-hills-holes-in-the-moon/' },
    { title: 'NASA Science — Marius Hills Pit: Lava Tube Skylight?', url: 'https://science.nasa.gov/photojournal/marius-hills-pit-lava-tube-skylight/' },
  ],
  procellarum: [
    { title: 'NASA — LRO Looks at Apollo 12, Surveyor 3 Landing Sites', url: 'https://www.nasa.gov/missions/lunar-reconnaissance-orbiter-looks-at-apollo-12-surveyor-3-landing-sites/' },
    { title: 'NASA Science — Surveyor 3', url: 'https://science.nasa.gov/mission/surveyor-3/' },
  ],
  jezero: [
    { title: 'NASA — Jezero Crater, Landing Site for the Mars Perseverance Rover', url: 'https://www.nasa.gov/image-article/jezero-crater-landing-site-mars-perseverance-rover/' },
    { title: 'NASA Science — Mars 2020: Perseverance Rover', url: 'https://science.nasa.gov/mission/mars-2020-perseverance/' },
  ],
  elysium: [
    { title: 'NASA — NASA Retires InSight Mars Lander Mission After Years of Science', url: 'https://www.nasa.gov/missions/insight/nasa-retires-insight-mars-lander-mission-after-years-of-science/' },
    { title: 'NASA Science — InSight Lander', url: 'https://science.nasa.gov/mission/insight/' },
  ],
  arcadia: [{ title: 'NASA JPL — NASA’s Treasure Map for Water Ice on Mars', url: 'https://www.jpl.nasa.gov/news/nasas-treasure-map-for-water-ice-on-mars/' }],
  utopia: [{ title: 'NASA JPL — Mars Ice Deposit Holds as Much Water as Lake Superior', url: 'https://www.jpl.nasa.gov/news/mars-ice-deposit-holds-as-much-water-as-lake-superior/' }],
  gale: [{ title: 'NASA ARES — Mars Science Laboratory (Curiosity)', url: 'https://ares.jsc.nasa.gov/missions/msl/' }],
  meridiani: [
    { title: 'NASA JPL — Mineral in Mars “Berries” Adds to Water Story', url: 'https://www.jpl.nasa.gov/news/mineral-in-mars-berries-adds-to-water-story/' },
    { title: 'NASA Science — APOD: A Landing at Meridiani Planum (2004)', url: 'https://science.nasa.gov/image-article/apod-2004-january-26-a-landing-at-meridiani-planum/' },
  ],
  valles: [{ title: 'NASA — Valles Marineris: The Grand Canyon of Mars', url: 'https://www.nasa.gov/image-article/valles-marineris-grand-canyon-of-mars/' }],
  hellas: [{ title: 'NASA Science — Floor of Hellas Basin', url: 'https://science.nasa.gov/photojournal/floor-of-hellas-basin/' }],
};
