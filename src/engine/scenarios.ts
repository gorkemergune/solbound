import type { DestinationId, Environment, GreenhouseMode, Resources, SiteId, Systems } from './types';

export const MINUTES_PER_DAY = 1440;
/** Surface clock starts on day 1 at 06:00. */
export const SURFACE_START_MINUTE = 6 * 60;
export const DEMO_DAYS = 7;
export const CAMPAIGN_TARGET_DAYS = 30;

/** An event that may be drawn into a run's schedule. */
export type PoolEntry = {
  eventId: string;
  /** inclusive surface-day window */
  days: [number, number];
  weight: number;
  sites?: SiteId[];
};

/**
 * Everything numeric here is a GAMEPLAY PARAMETER chosen for a readable 7-day demo, not a NASA value.
 * The qualitative relationships (Mars dust dims sunlight, Mars nights need a battery, the lunar
 * south pole has long low sunlight, lunar noon is very hot, southern summer brings Mars' big storms)
 * are sourced on the research cards.
 */
export type ScenarioDefinition = {
  id: DestinationId;
  site: SiteId;
  demoDays: number;
  campaignTargetDays: number;
  commDelay: 'seconds' | 'minutes';
  start: { resources: Resources; systems: Systems; env: Environment; greenhouseMode: GreenhouseMode };
  /** kW from a clean, healthy array at a given hour of a given surface day (before dust / panel condition). */
  solarKW: (hourOfDay: number, day: number) => number;
  loads: {
    lifeSupport: number;
    thermal: (hourOfDay: number, day: number) => number;
    water: number;
    greenhouse: Record<GreenhouseMode, number>;
    moxie: number;
    sabatier: number;
  };
  battery: { maxRateKW: number; chargeEfficiency: number };
  o2ProductionKgH: number;
  o2PerCrewKgH: number;
  waterPerCrewLH: number;
  recyclerRecovery: number;
  greenhouseWaterLH: Record<GreenhouseMode, number>;
  moxieKgH: number;
  returnNeeds: { foodPerCrew: number; o2PerCrew: number; waterPerCrew: number; batteryKWh: number };
  /** events every run has, each placed somewhere in its day window */
  mandatory: PoolEntry[];
  /** events drawn at random (weighted) to fill the remaining slots */
  pool: PoolEntry[];
};

/** Crops: hours to harvest at full light and the harvest in crew-days of food (gameplay). */
export const CROPS = {
  greens: { growthPerH: 1.3, yield: 6 },
  potato: { growthPerH: 0.95, yield: 16 },
  soy: { growthPerH: 1.05, yield: 9 },
} as const;

const baseEnv: Environment = {
  dust: 0,
  dustSettle: 0,
  dustHours: 0,
  leakKgH: 0,
  leakGrowth: 0,
  recyclerWear: 0,
  speHours: 0,
  wilt: 0,
  darkHours: 0,
  heatHours: 0,
};

const common = {
  demoDays: DEMO_DAYS,
  campaignTargetDays: CAMPAIGN_TARGET_DAYS,
  battery: { maxRateKW: 8, chargeEfficiency: 0.9 },
  o2ProductionKgH: 0.16,
  o2PerCrewKgH: 0.035,
  waterPerCrewLH: 0.17,
  recyclerRecovery: 0.85,
};

const MOON_COMMON_POOL: PoolEntry[] = [
  { eventId: 'MOON-S1', days: [1, 4], weight: 3 },
  { eventId: 'MOON-S2', days: [2, 7], weight: 3 },
  { eventId: 'WQ', days: [2, 6], weight: 3 },
  { eventId: 'SAB', days: [2, 5], weight: 3 },
  { eventId: 'QUAKE', days: [2, 7], weight: 3 },
  { eventId: 'MICRO', days: [2, 7], weight: 3 },
  { eventId: 'HAYFEVER', days: [2, 7], weight: 3 },
  { eventId: 'MOON-SAR', days: [3, 6], weight: 2 },
  { eventId: 'ISRU', days: [2, 6], weight: 2 },
  { eventId: 'ICE', days: [2, 6], weight: 4, sites: ['polar'] },
  { eventId: 'SHADOW', days: [2, 6], weight: 4, sites: ['polar'] },
  { eventId: 'HEAT', days: [4, 7], weight: 5, sites: ['equator'] },
];

const MARS_COMMON_POOL: PoolEntry[] = [
  { eventId: 'MARS-S1', days: [1, 4], weight: 3 },
  { eventId: 'MARS-S2', days: [2, 7], weight: 3 },
  { eventId: 'WQ', days: [2, 7], weight: 3 },
  { eventId: 'SAB', days: [2, 5], weight: 3 },
  { eventId: 'WIND', days: [1, 4], weight: 3 },
  { eventId: 'GEAR', days: [3, 7], weight: 3 },
  { eventId: 'BRINE', days: [2, 7], weight: 3 },
  { eventId: 'MARS-SAR', days: [3, 6], weight: 2 },
  { eventId: 'DEVIL', days: [2, 7], weight: 3, sites: ['spring'] },
];

function moon(site: 'polar' | 'equator'): ScenarioDefinition {
  const polar = site === 'polar';
  return {
    ...common,
    id: 'moon',
    site,
    commDelay: 'seconds',
    start: {
      resources: { batteryKWh: 26, batteryCapKWh: 40, o2Kg: 20, waterL: 130, foodCrewDays: 26, science: 0 },
      systems: { lifeSupport: 100, waterRecycler: 100, solar: 100, seal: 100, greenhouseHealth: 90, greenhouseGrowth: 40, shelter: 45 },
      env: { ...baseEnv },
      greenhouseMode: 'full',
    },
    // Polar ridge: the Sun skims the horizon, steady output. Equator: landing at lunar dawn, the Sun
    // climbs toward noon over the demo (a lunar day lasts about two Earth weeks, R-MOON-NIGHT).
    solarKW: polar ? () => 5.6 : (_h, day) => Math.min(7.4, 4.6 + 0.45 * day),
    loads: {
      lifeSupport: 1.6,
      thermal: polar ? () => 1.5 : (_h, day) => 1.0 + 0.28 * day,
      water: 0.5,
      greenhouse: { full: 1.3, eco: 0.5, off: 0 },
      moxie: 0,
      sabatier: 0.35,
    },
    greenhouseWaterLH: { full: 0.07, eco: 0.04, off: 0 },
    moxieKgH: 0,
    returnNeeds: { foodPerCrew: 3, o2PerCrew: 2.5, waterPerCrew: 10, batteryKWh: 14 },
    mandatory: [
      { eventId: 'MOON-01', days: [1, 1], weight: 1 },
      { eventId: 'CROP', days: [1, 1], weight: 1 },
      { eventId: 'MOON-02', days: [2, 4], weight: 1 },
      { eventId: 'MOON-03', days: [4, 6], weight: 1 },
    ],
    pool: MOON_COMMON_POOL.filter((p) => !p.sites || p.sites.includes(site)),
  };
}

/** Simple daylight curve: sunrise 05:00, sunset 19:00 (demo simplification of a 24.6 h sol). */
function marsCurve(peak: number) {
  return (hour: number) => {
    const mid = hour + 0.5;
    if (mid <= 5 || mid >= 19) return 0;
    return peak * Math.sin((Math.PI * (mid - 5)) / 14);
  };
}

function mars(site: 'spring' | 'summer'): ScenarioDefinition {
  const summer = site === 'summer';
  return {
    ...common,
    id: 'mars',
    site,
    commDelay: 'minutes',
    start: {
      resources: { batteryKWh: 45, batteryCapKWh: 60, o2Kg: 22, waterL: 150, foodCrewDays: 36, science: 0 },
      systems: { lifeSupport: 100, waterRecycler: 100, solar: 100, seal: 100, greenhouseHealth: 90, greenhouseGrowth: 40, shelter: 55 },
      env: { ...baseEnv },
      greenhouseMode: 'full',
    },
    // Southern summer: Mars is nearer the Sun (more light, warmer) but big storms are more likely (R-SEASON).
    solarKW: marsCurve(summer ? 16 : 13.5),
    loads: {
      lifeSupport: 1.6,
      thermal: (h) => (h < 5 || h >= 19 ? (summer ? 1.3 : 1.7) : summer ? 0.9 : 1.1),
      water: 0.5,
      greenhouse: { full: 1.3, eco: 0.5, off: 0 },
      moxie: 0.3,
      sabatier: 0.35,
    },
    greenhouseWaterLH: { full: 0.08, eco: 0.04, off: 0 },
    // Gameplay: a scaled-up, MOXIE-inspired unit. The real MOXIE demo made grams per hour.
    moxieKgH: 0.04,
    returnNeeds: { foodPerCrew: 6, o2PerCrew: 4, waterPerCrew: 20, batteryKWh: 20 },
    mandatory: [
      { eventId: 'MARS-01', days: [1, 2], weight: 1 },
      { eventId: 'CROP', days: [1, 1], weight: 1 },
      { eventId: 'MARS-02', days: [2, 4], weight: 1 },
      { eventId: 'MARS-03', days: [5, 6], weight: 1 },
    ],
    pool: MARS_COMMON_POOL.filter((p) => !p.sites || p.sites.includes(site)),
  };
}

export const SITES: Record<DestinationId, SiteId[]> = { moon: ['polar', 'equator'], mars: ['spring', 'summer'] };

export function scenarioFor(dest: DestinationId, site: SiteId | null): ScenarioDefinition {
  if (dest === 'moon') return moon(site === 'equator' ? 'equator' : 'polar');
  return mars(site === 'summer' ? 'summer' : 'spring');
}

/** Default (first) site per destination, used for previews before a site is picked. */
export const SCENARIOS: Record<DestinationId, ScenarioDefinition> = { moon: moon('polar'), mars: mars('spring') };

export function surfaceEndMinute(s: ScenarioDefinition): number {
  return s.demoDays * MINUTES_PER_DAY;
}
