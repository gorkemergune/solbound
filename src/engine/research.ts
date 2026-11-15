import type { DestinationId } from './types';

/**
 * Research cards. `kind` separates what a source says (sourced), what follows from it or from
 * basic physics/chemistry (derived), and what Solbound chose for play (gameplay).
 * Claims are paraphrased in the i18n files under `research.<id>.*`.
 * Sources were opened and read on 2026-11-14 unless `verification` says otherwise.
 */
export type ResearchSource = { title: string; url: string };

export type ResearchCard = {
  id: string;
  appliesTo: DestinationId[];
  kind: 'sourced' | 'derived' | 'gameplay';
  sources: ResearchSource[];
  accessedAt: string;
  /** option ids this card unlocks (EVENT:option) */
  unlocks: string[];
  /** extra, labelled game rules this card explains */
  gameRules: string[];
};

export const RESEARCH: ResearchCard[] = [
  {
    id: 'R-ECLSS',
    appliesTo: ['moon', 'mars'],
    kind: 'sourced',
    sources: [
      { title: 'NASA — Environmental Control and Life Support Systems (ECLSS)', url: 'https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/' },
    ],
    accessedAt: '2026-11-14',
    unlocks: [],
    gameRules: ['o2Production', 'electrolysisWater'],
  },
  {
    id: 'R-WATER',
    appliesTo: ['moon', 'mars'],
    kind: 'sourced',
    sources: [
      { title: 'NASA — NASA Achieves Water Recovery Milestone on International Space Station', url: 'https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/' },
    ],
    accessedAt: '2026-11-14',
    unlocks: [],
    gameRules: ['recycler85'],
  },
  {
    id: 'R-DUST',
    appliesTo: ['mars'],
    kind: 'sourced',
    sources: [{ title: 'NASA — The Fact and Fiction of Martian Dust Storms', url: 'https://www.nasa.gov/solar-system/the-fact-and-fiction-of-martian-dust-storms/' }],
    accessedAt: '2026-11-14',
    unlocks: [],
    gameRules: ['dustLight', 'dustSettle'],
  },
  {
    id: 'R-BATTERY',
    appliesTo: ['moon', 'mars'],
    kind: 'derived',
    sources: [],
    accessedAt: '2026-11-14',
    unlocks: ['MARS-02:loadShift'],
    gameRules: ['batteryLoss', 'priority'],
  },
  {
    id: 'R-MOON-ENV',
    appliesTo: ['moon'],
    kind: 'sourced',
    sources: [{ title: 'NASA Science — Moon Facts', url: 'https://science.nasa.gov/moon/facts/' }],
    accessedAt: '2026-11-14',
    unlocks: [],
    gameRules: ['moonPolar', 'moonThermal'],
  },
  {
    id: 'R-SPE',
    appliesTo: ['moon', 'mars'],
    kind: 'sourced',
    sources: [
      { title: 'NASA OCHMO — Radiation Protection Technical Brief (NASA-STD-3001)', url: 'https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-020-radiation-protection.pdf' },
      { title: 'NASA Science — Moon Facts', url: 'https://science.nasa.gov/moon/facts/' },
    ],
    accessedAt: '2026-11-14',
    unlocks: ['MOON-03:waterWall'],
    gameRules: ['radIndex'],
  },
  {
    id: 'R-COMMS',
    appliesTo: ['moon', 'mars'],
    kind: 'sourced',
    sources: [{ title: 'NASA Human Research Program — Hazard: Distance From Earth', url: 'https://www.nasa.gov/hrp/hazard-distance-from-earth/' }],
    accessedAt: '2026-11-14',
    unlocks: [],
    gameRules: ['earthBonus'],
  },
  {
    id: 'R-CROPS',
    appliesTo: ['moon', 'mars'],
    kind: 'sourced',
    sources: [{ title: 'NASA — NASA Plant Researchers Explore Question of Deep-Space Food Crops', url: 'https://www.nasa.gov/science-research/nasa-plant-researchers-explore-question-of-deep-space-food-crops/' }],
    accessedAt: '2026-11-14',
    unlocks: ['CROP:nutrients'],
    gameRules: ['growthCompressed', 'cropGrowth'],
  },
  {
    id: 'R-MOXIE',
    appliesTo: ['mars'],
    kind: 'sourced',
    sources: [{ title: 'NASA Science — Mars 2020 Perseverance: Science Instruments (MOXIE)', url: 'https://science.nasa.gov/mission/mars-2020-perseverance/science-instruments/' }],
    accessedAt: '2026-11-14',
    unlocks: [],
    gameRules: ['moxieScaled'],
  },
  { id: 'R-LOOP', appliesTo: ['moon', 'mars'], kind: 'sourced', sources: [{ title: 'NASA — Environmental Control and Life Support Systems (ECLSS)', url: 'https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/' }], accessedAt: '2026-11-14', unlocks: ['SAB:sabatier'], gameRules: ['electrolysisWater', 'sabatierWater'] },
  { id: 'R-WQ', appliesTo: ['moon', 'mars'], kind: 'sourced', sources: [{ title: 'NASA — Environmental Control and Life Support Systems (ECLSS)', url: 'https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/' }], accessedAt: '2026-11-14', unlocks: [], gameRules: [] },
  { id: 'R-WIND', appliesTo: ['mars'], kind: 'sourced', sources: [{ title: 'NASA — The Fact and Fiction of Martian Dust Storms', url: 'https://www.nasa.gov/solar-system/the-fact-and-fiction-of-martian-dust-storms/' }], accessedAt: '2026-11-14', unlocks: ['WIND:reasoned'], gameRules: [] },
  { id: 'R-SEASON', appliesTo: ['mars'], kind: 'sourced', sources: [{ title: 'NASA — The Fact and Fiction of Martian Dust Storms', url: 'https://www.nasa.gov/solar-system/the-fact-and-fiction-of-martian-dust-storms/' }, { title: 'NASA Science — Mars Facts', url: 'https://science.nasa.gov/mars/facts/' }], accessedAt: '2026-11-14', unlocks: [], gameRules: ['stormSeason'] },
  { id: 'R-LED', appliesTo: ['mars'], kind: 'sourced', sources: [{ title: 'NASA — NASA Plant Researchers Explore Question of Deep-Space Food Crops', url: 'https://www.nasa.gov/science-research/nasa-plant-researchers-explore-question-of-deep-space-food-crops/' }], accessedAt: '2026-11-14', unlocks: [], gameRules: [] },
  { id: 'R-PERCHLORATE', appliesTo: ['mars'], kind: 'sourced', sources: [{ title: 'NASA — NASA Plant Researchers Explore Question of Deep-Space Food Crops', url: 'https://www.nasa.gov/science-research/nasa-plant-researchers-explore-question-of-deep-space-food-crops/' }], accessedAt: '2026-11-14', unlocks: [], gameRules: [] },
  { id: 'R-MASS', appliesTo: ['moon', 'mars'], kind: 'sourced', sources: [{ title: 'NASA — NASA Plant Researchers Explore Question of Deep-Space Food Crops', url: 'https://www.nasa.gov/science-research/nasa-plant-researchers-explore-question-of-deep-space-food-crops/' }], accessedAt: '2026-11-14', unlocks: [], gameRules: ['massBudget'] },
  { id: 'R-MARS-ENV', appliesTo: ['mars'], kind: 'sourced', sources: [{ title: 'NASA Science — Mars Facts', url: 'https://science.nasa.gov/mars/facts/' }], accessedAt: '2026-11-14', unlocks: [], gameRules: [] },
  { id: 'R-MOON-DUST', appliesTo: ['moon'], kind: 'sourced', sources: [{ title: 'NASA Science — Moon Dust', url: 'https://science.nasa.gov/moon/moon-dust/' }], accessedAt: '2026-11-14', unlocks: ['HAYFEVER:protocol'], gameRules: [] },
  { id: 'R-MOON-POLE', appliesTo: ['moon'], kind: 'sourced', sources: [{ title: 'NASA Science — Shackleton Crater’s Illuminated Rim & Shadowed Interior', url: 'https://science.nasa.gov/resource/shackleton-craters-illuminated-rim-shadowed-interior/' }], accessedAt: '2026-11-14', unlocks: [], gameRules: ['moonPolar', 'shadow12'] },
  { id: 'R-MOONQUAKE', appliesTo: ['moon'], kind: 'sourced', sources: [{ title: 'NASA — Shrinking Moon Causing Moonquakes and Faults Near Lunar South Pole', url: 'https://www.nasa.gov/solar-system/moon/shrinking-moon-causing-moonquakes-and-faults-near-lunar-south-pole/' }], accessedAt: '2026-11-14', unlocks: [], gameRules: [] },
  { id: 'R-MICRO', appliesTo: ['moon'], kind: 'sourced', sources: [{ title: 'NASA Meteoroid Environment Office — About Lunar Impact Monitoring', url: 'https://www.nasa.gov/meteoroid-environment-office/about-lunar-impact-monitoring/' }], accessedAt: '2026-11-14', unlocks: [], gameRules: [] },
  { id: 'R-MOON-NIGHT', appliesTo: ['moon'], kind: 'sourced', sources: [{ title: 'NASA Glenn — NASA’s Fission Surface Power Project Energizes Lunar Exploration', url: 'https://www.nasa.gov/centers-and-facilities/glenn/nasas-fission-surface-power-project-energizes-lunar-exploration/' }], accessedAt: '2026-11-14', unlocks: [], gameRules: ['lunarCycle', 'nightLoads'] },
  // ---- 30-day mission: countdown events and time ----
  { id: 'R-FISSION', appliesTo: ['moon'], kind: 'gameplay', sources: [{ title: 'NASA Glenn — NASA’s Fission Surface Power Project Energizes Lunar Exploration', url: 'https://www.nasa.gov/centers-and-facilities/glenn/nasas-fission-surface-power-project-energizes-lunar-exploration/' }], accessedAt: '2026-11-14', unlocks: ['NIGHT:wasteHeat'], gameRules: ['fission4', 'radiatorDust'] },
  { id: 'R-STORMWATCH', appliesTo: ['mars'], kind: 'sourced', sources: [{ title: 'NASA — “Storm Chasers” on Mars Searching for Dusty Secrets', url: 'https://www.nasa.gov/missions/storm-chasers-on-mars-searching-for-dusty-secrets/' }], accessedAt: '2026-11-14', unlocks: [], gameRules: ['stormNotice'] },
  {
    id: 'R-METEOR',
    appliesTo: ['moon'],
    kind: 'sourced',
    sources: [
      { title: 'NASA Meteoroid Environment Office — About Lunar Impact Monitoring', url: 'https://www.nasa.gov/meteoroid-environment-office/about-lunar-impact-monitoring/' },
      { title: 'NASA NTRS — Lunar Impact Detections During the 2010 Geminid Meteor Shower', url: 'https://ntrs.nasa.gov/citations/20110015807' },
    ],
    accessedAt: '2026-11-14',
    unlocks: [],
    gameRules: ['meteorNotice'],
  },
  { id: 'R-RESUPPLY', appliesTo: ['moon', 'mars'], kind: 'gameplay', sources: [], accessedAt: '2026-11-14', unlocks: [], gameRules: ['resupplyContents'] },
  { id: 'R-MOLD', appliesTo: ['moon', 'mars'], kind: 'sourced', sources: [{ title: 'NASA — Growing Plants in Space', url: 'https://www.nasa.gov/exploration-research-and-technology/growing-plants-in-space/' }], accessedAt: '2026-11-15', unlocks: [], gameRules: [] },
  { id: 'R-REINF', appliesTo: ['moon'], kind: 'gameplay', sources: [], accessedAt: '2026-11-14', unlocks: [], gameRules: ['evaCost', 'difficulty'] },
  {
    id: 'R-DONKI',
    appliesTo: ['moon', 'mars'],
    kind: 'sourced',
    sources: [
      { title: 'NASA CCMC — DONKI (Space Weather Database Of Notifications, Knowledge, Information)', url: 'https://ccmc.gsfc.nasa.gov/tools/DONKI/' },
      { title: 'NASA Open APIs — api.nasa.gov (DONKI endpoints)', url: 'https://api.nasa.gov/' },
    ],
    accessedAt: '2026-11-14',
    unlocks: [],
    gameRules: ['donkiMap'],
  },
  {
    id: 'R-TIME',
    appliesTo: ['moon', 'mars'],
    kind: 'sourced',
    sources: [
      { title: 'NASA GISS — Mars24 Sunclock: Technical Notes on Mars Solar Time', url: 'https://www.giss.nasa.gov/tools/mars24/help/notes.html' },
      { title: 'NASA — Lunar Time', url: 'https://www.nasa.gov/communicating-with-missions/lunar-time/' },
      { title: 'NASA/JPL — Mars Global Surveyor: Questions About the Flight Plan (one-way light time)', url: 'https://mars.nasa.gov/mgs/faqs/faq_mplan.html' },
      { title: 'NASA/JPL SSD — Approximate Positions of the Planets', url: 'https://ssd.jpl.nasa.gov/planets/approx_pos.html' },
      { title: 'NASA/JPL — Horizons System (used to check the formula)', url: 'https://ssd.jpl.nasa.gov/horizons/' },
    ],
    accessedAt: '2026-11-14',
    unlocks: [],
    gameRules: ['marsClock', 'lightTime'],
  },
  { id: 'R-MOON-O2', appliesTo: ['moon'], kind: 'sourced', sources: [{ title: 'NASA NTRS — Moon to Mars ISRU Status Update (Sanders, 2024)', url: 'https://ntrs.nasa.gov/api/citations/20240013906/downloads/M2M%20ISRU%20Status_SandersV2.pdf' }], accessedAt: '2026-11-14', unlocks: [], gameRules: ['isruYield'] },
];

export const RESEARCH_BY_ID: Record<string, ResearchCard> = Object.fromEntries(RESEARCH.map((r) => [r.id, r]));
