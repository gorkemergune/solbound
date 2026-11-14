import type { DestinationId, Environment, GreenhouseMode, Resources, SiteId, Systems } from './types';
import { LANDING_BY_ID } from './landing';

export const MINUTES_PER_DAY = 1440;
/** Surface clock starts on day 1 at 06:00. */
export const SURFACE_START_MINUTE = 6 * 60;
/** The full surface mission. */
export const MISSION_DAYS = 30;
/** Hours in one lunar day-night cycle (synodic month, about 29.5 Earth days; R-MOON-NIGHT). */
export const LUNAR_CYCLE_H = 29.53 * 24;
/** Equator landing just after local sunrise: fraction of the lunar cycle already passed at day 1 00:00. */
export const EQUATOR_PHASE0 = 0.02;

/** An event that may be drawn into a run's schedule. */
export type PoolEntry = {
  eventId: string;
  /** inclusive surface-day window */
  days: [number, number];
  weight: number;
  sites?: SiteId[];
  /** how many times it can appear in one run (default 1) */
  max?: number;
};

/**
 * Everything numeric here is a GAMEPLAY PARAMETER chosen for a readable 30-day mission, not a NASA value.
 * The qualitative relationships (Mars dust dims sunlight, Mars nights need a battery, the lunar
 * south pole has long low sunlight, lunar noon is very hot, southern summer brings Mars' big storms)
 * are sourced on the research cards.
 */
export type ScenarioDefinition = {
  id: DestinationId;
  site: SiteId;
  /** landing site profile (null = the plain base type) */
  landing: string | null;
  /** greenhouse growth multiplier at this landing site */
  ghMul: number;
  /** how strongly dust storms dim the array here */
  dustMul: number;
  missionDays: number;
  commDelay: 'seconds' | 'minutes';
  start: { resources: Resources; systems: Systems; env: Environment; greenhouseMode: GreenhouseMode };
  /** kW from a clean, healthy array at a given hour of a given surface day (before dust / panel condition). */
  solarKW: (hourOfDay: number, day: number) => number;
  /** constant generation independent of sunlight (gameplay fission unit at the lunar equator) */
  baseKW: number;
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
  /** compressed return trip in days (Moon: ascent and cruise; Mars: ascent to the orbiting transfer vehicle, which carries the long cruise supplies) */
  returnDays: number;
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
  darkFactor: 0,
  fissionLoss: 0,
};

const common = {
  missionDays: MISSION_DAYS,
  baseKW: 0,
  landing: null as string | null,
  ghMul: 1,
  dustMul: 1,
  battery: { maxRateKW: 8, chargeEfficiency: 0.9 },
  o2ProductionKgH: 0.16,
  o2PerCrewKgH: 0.035,
  waterPerCrewLH: 0.17,
  recyclerRecovery: 0.93,
};

// Day windows span the whole month; `max` lets routine events come back (with a new instance id).
const MOON_COMMON_POOL: PoolEntry[] = [
  { eventId: 'MOON-S1', days: [2, 28], weight: 3, max: 3 },
  { eventId: 'MOON-S2', days: [2, 28], weight: 3, max: 2 },
  { eventId: 'WQ', days: [3, 27], weight: 3, max: 2 },
  { eventId: 'SAB', days: [2, 8], weight: 4 },
  { eventId: 'QUAKE', days: [3, 28], weight: 3, max: 2 },
  { eventId: 'MICRO', days: [3, 28], weight: 3, max: 2 },
  { eventId: 'HAYFEVER', days: [3, 20], weight: 3 },
  { eventId: 'MOON-SAR', days: [5, 26], weight: 2 },
  { eventId: 'ISRU', days: [3, 27], weight: 3, max: 2 },
  { eventId: 'ICE', days: [3, 27], weight: 4, sites: ['polar'], max: 3 },
  { eventId: 'SHADOW', days: [3, 12], weight: 3, sites: ['polar'] },
  { eventId: 'HEAT', days: [6, 9], weight: 9, sites: ['equator'] },
];

const MARS_COMMON_POOL: PoolEntry[] = [
  { eventId: 'MARS-S1', days: [2, 28], weight: 3, max: 3 },
  { eventId: 'MARS-S2', days: [2, 28], weight: 3, max: 3 },
  { eventId: 'WQ', days: [3, 27], weight: 3, max: 2 },
  { eventId: 'SAB', days: [2, 8], weight: 4 },
  { eventId: 'WIND', days: [2, 26], weight: 3, max: 2 },
  { eventId: 'GEAR', days: [4, 28], weight: 3, max: 2 },
  { eventId: 'BRINE', days: [3, 27], weight: 3, max: 3 },
  { eventId: 'MARS-SAR', days: [5, 26], weight: 2 },
  { eventId: 'DEVIL', days: [2, 28], weight: 3, sites: ['spring'], max: 2 },
];

/** Equator: sun elevation (as sin) from the lunar cycle; negative = night. */
export function equatorSun(hourOfDay: number, day: number): number {
  const t = (day - 1) * 24 + hourOfDay + 0.5;
  return Math.sin(2 * Math.PI * (t / LUNAR_CYCLE_H + EQUATOR_PHASE0));
}

/** Surface minute of the equator sunset / next sunrise (derived from the cycle above). */
export function equatorSunset(): number {
  return Math.round((0.5 - EQUATOR_PHASE0) * LUNAR_CYCLE_H * 60);
}
export function equatorSunrise(): number {
  return Math.round((1 - EQUATOR_PHASE0) * LUNAR_CYCLE_H * 60);
}

function moon(site: 'polar' | 'equator'): ScenarioDefinition {
  const polar = site === 'polar';
  return {
    ...common,
    id: 'moon',
    site,
    commDelay: 'seconds',
    start: {
      // a pre-landed pantry and water tanks (gameplay) — 30 days for four people does not fit in one lander
      resources: { batteryKWh: 26, batteryCapKWh: 40, o2Kg: 20, waterL: polar ? 240 : 300, foodCrewDays: 64, science: 0 },
      systems: { lifeSupport: 100, waterRecycler: 100, solar: 100, seal: 100, greenhouseHealth: 90, greenhouseGrowth: 40, shelter: 45 },
      env: { ...baseEnv },
      greenhouseMode: 'full',
    },
    // Polar ridge: the Sun skims the horizon, steady output (known dark periods come as a countdown).
    // Equator: landing at lunar dawn; noon around day 8, sunset around day 15, then a ~14.5-day night
    // that ends just before departure (R-MOON-NIGHT). Tracking panels give most power once the Sun is up.
    solarKW: polar ? () => 5.6 : (h, day) => {
      const e = equatorSun(h, day);
      return e > 0 ? 7.6 * Math.min(1, 0.35 + e) : 0;
    },
    // Gameplay assumption inspired by NASA's Fission Surface Power project: a small pre-placed unit at the equator.
    baseKW: polar ? 0 : 5,
    loads: {
      lifeSupport: 1.6,
      // equator: heat rejection peaks at lunar noon; at night the base must heat itself
      thermal: polar ? () => 1.5 : (h, day) => {
        const e = equatorSun(h, day);
        return e > 0 ? 1.0 + 2.2 * e * e : 2.6;
      },
      water: 0.5,
      greenhouse: { full: 1.3, eco: 0.5, off: 0 },
      moxie: 0,
      sabatier: 0.35,
    },
    greenhouseWaterLH: { full: 0.07, eco: 0.04, off: 0 },
    moxieKgH: 0,
    returnNeeds: { foodPerCrew: 3, o2PerCrew: 2.5, waterPerCrew: 10, batteryKWh: 14 },
    returnDays: 3,
    mandatory: [
      { eventId: 'MOON-01', days: [1, 1], weight: 1 },
      { eventId: 'CROP', days: [1, 1], weight: 1 },
      { eventId: 'SETUP', days: [2, 2], weight: 1 },
      { eventId: 'FINAL-EVA', days: [26, 28], weight: 1 },
      { eventId: 'PACK', days: [29, 29], weight: 1 },
      { eventId: 'MOON-02', days: [3, 8], weight: 1 },
      // a solar particle event cannot be forecast days ahead, so it stays a surprise
      { eventId: 'MOON-03', days: [9, 26], weight: 1 },
    ],
    pool: MOON_COMMON_POOL.filter((p) => !p.sites || p.sites.includes(site)),
  };
}

/** Daylight curve over one sol: sunrise 05:00, sunset 19:00 local time (the clock runs in Mars hours). */
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
      resources: { batteryKWh: 45, batteryCapKWh: 60, o2Kg: 22, waterL: 340, foodCrewDays: 72, science: 0 },
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
      moxie: 0.1,
      sabatier: 0.35,
    },
    greenhouseWaterLH: { full: 0.08, eco: 0.04, off: 0 },
    // Gameplay: a scaled-up, MOXIE-inspired unit. The real MOXIE demo made grams per hour.
    moxieKgH: 0.05,
    returnNeeds: { foodPerCrew: 6, o2PerCrew: 4, waterPerCrew: 20, batteryKWh: 20 },
    returnDays: 6,
    mandatory: [
      { eventId: 'MARS-01', days: [1, 3], weight: 1 },
      { eventId: 'CROP', days: [1, 1], weight: 1 },
      { eventId: 'SETUP', days: [2, 2], weight: 1 },
      { eventId: 'FINAL-EVA', days: [26, 28], weight: 1 },
      { eventId: 'PACK', days: [29, 29], weight: 1 },
      { eventId: 'MARS-03', days: [8, 22], weight: 1 },
    ],
    pool: MARS_COMMON_POOL.filter((p) => !p.sites || p.sites.includes(site)),
  };
}

export const SITES: Record<DestinationId, SiteId[]> = { moon: ['polar', 'equator'], mars: ['spring', 'summer'] };

function baseScenario(dest: DestinationId, site: SiteId | null): ScenarioDefinition {
  if (dest === 'moon') return moon(site === 'equator' ? 'equator' : 'polar');
  return mars(site === 'summer' ? 'summer' : 'spring');
}

/** The scenario for a destination, base site type and (optionally) a landing-site profile. */
export function scenarioFor(dest: DestinationId, site: SiteId | null, landing: string | null = null): ScenarioDefinition {
  const l = landing ? LANDING_BY_ID[landing] : undefined;
  const base = baseScenario(dest, l?.base ?? site);
  if (!l) return base;
  const solar = base.solarKW;
  const thermal = base.loads.thermal;
  return {
    ...base,
    landing: l.id,
    ghMul: l.ghMul,
    dustMul: l.dustMul,
    solarKW: (h, d) => solar(h, d) * l.solarMul,
    loads: { ...base.loads, thermal: (h, d) => Math.max(0.3, thermal(h, d) + l.thermalAdd) },
    start: {
      ...base.start,
      resources: { ...base.start.resources, waterL: Math.max(80, base.start.resources.waterL + l.waterDelta) },
      systems: { ...base.start.systems, shelter: Math.min(100, base.start.systems.shelter + l.shelterAdd) },
    },
    pool: base.pool.map((p) => ({ ...p, weight: p.weight * (l.pool?.[p.eventId] ?? 1) })),
  };
}

/** Default (first) site per destination, used for previews before a site is picked. */
export const SCENARIOS: Record<DestinationId, ScenarioDefinition> = { moon: moon('polar'), mars: mars('spring') };

/** The surface month ends on the last day at 14:00, after the midday charge (not at the night-time battery low). */
export const END_HOUR = 14;
export function surfaceEndMinute(s: ScenarioDefinition): number {
  return (s.missionDays - 1) * MINUTES_PER_DAY + END_HOUR * 60;
}
