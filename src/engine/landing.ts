// Random landing (v0.8): after choosing Moon or Mars the lander sets down at one of eight sites. Each site
// keeps the physics of its base type (polar / equator for the Moon, spring / summer arrival for Mars) and
// changes it with gameplay modifiers inspired by the place: sun angle, cold, water ice, dust, shelter.
// Names are real regions; the numbers are game values, not measurements.
import { Rng, deriveSeed } from './rng';
import type { DestinationId, SiteId } from './types';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'veryHard';

export type LandingSite = {
  id: string;
  dest: DestinationId;
  base: SiteId;
  difficulty: Difficulty;
  /** sunlight on the array (sun angle, terrain shadow, latitude) */
  solarMul: number;
  /** extra heating / cooling load in kW */
  thermalAdd: number;
  /** greenhouse growth (temperature and light around the base) */
  ghMul: number;
  /** water at the start: pre-landed tanks plus local ice already harvested */
  waterDelta: number;
  /** natural cover (a lava-tube skylight, a crater wall) */
  shelterAdd: number;
  /** how hard dust storms hit (Mars) */
  dustMul: number;
  /** event weights at this site (e.g. more ice expeditions near cold traps) */
  pool?: Record<string, number>;
  /** the neutral site used when a test or tool asks for a base type explicitly */
  reference?: boolean;
};

export const LANDING_SITES: LandingSite[] = [
  // ---- Moon: south-pole ridges (Artemis candidate regions) ----
  { id: 'shackleton', dest: 'moon', base: 'polar', difficulty: 'medium', solarMul: 1, thermalAdd: 0, ghMul: 1, waterDelta: 0, shelterAdd: 0, dustMul: 1, reference: true },
  { id: 'mons-mouton', dest: 'moon', base: 'polar', difficulty: 'easy', solarMul: 1.08, thermalAdd: 0, ghMul: 1.05, waterDelta: 10, shelterAdd: 0, dustMul: 1 },
  { id: 'malapert', dest: 'moon', base: 'polar', difficulty: 'veryHard', solarMul: 0.92, thermalAdd: 0.15, ghMul: 1, waterDelta: -20, shelterAdd: 0, dustMul: 1, pool: { QUAKE: 1.6 } },
  { id: 'nobile', dest: 'moon', base: 'polar', difficulty: 'hard', solarMul: 0.9, thermalAdd: 0.1, ghMul: 0.95, waterDelta: 20, shelterAdd: 0, dustMul: 1, pool: { ICE: 1.5 } },
  { id: 'haworth', dest: 'moon', base: 'polar', difficulty: 'hard', solarMul: 0.9, thermalAdd: 0.15, ghMul: 0.9, waterDelta: 0, shelterAdd: 0, dustMul: 1, pool: { ICE: 2, SHADOW: 2 } },
  // ---- Moon: near-side equator (lunar night inside the month) ----
  { id: 'tranquillitatis', dest: 'moon', base: 'equator', difficulty: 'easy', solarMul: 1, thermalAdd: 0, ghMul: 1, waterDelta: 0, shelterAdd: 0, dustMul: 1, reference: true },
  { id: 'marius-hills', dest: 'moon', base: 'equator', difficulty: 'easy', solarMul: 0.95, thermalAdd: -0.2, ghMul: 1, waterDelta: -10, shelterAdd: 35, dustMul: 1 },
  { id: 'procellarum', dest: 'moon', base: 'equator', difficulty: 'easy', solarMul: 0.94, thermalAdd: 0.12, ghMul: 0.9, waterDelta: -20, shelterAdd: 0, dustMul: 1, pool: { MICRO: 1.6, HEAT: 1.4 } },
  // ---- Mars: northern spring arrivals ----
  { id: 'jezero', dest: 'mars', base: 'spring', difficulty: 'easy', solarMul: 1, thermalAdd: 0, ghMul: 1, waterDelta: 0, shelterAdd: 0, dustMul: 1, reference: true },
  { id: 'elysium', dest: 'mars', base: 'spring', difficulty: 'easy', solarMul: 1.12, thermalAdd: -0.1, ghMul: 1.05, waterDelta: 0, shelterAdd: 0, dustMul: 0.9 },
  { id: 'arcadia', dest: 'mars', base: 'spring', difficulty: 'easy', solarMul: 0.9, thermalAdd: 0.3, ghMul: 0.95, waterDelta: 70, shelterAdd: 0, dustMul: 1, pool: { BRINE: 1.6 } },
  { id: 'utopia', dest: 'mars', base: 'spring', difficulty: 'easy', solarMul: 0.92, thermalAdd: 0.15, ghMul: 0.9, waterDelta: 30, shelterAdd: 0, dustMul: 1.05 },
  // ---- Mars: southern summer arrivals (storm season) ----
  { id: 'gale', dest: 'mars', base: 'summer', difficulty: 'medium', solarMul: 1, thermalAdd: 0, ghMul: 1, waterDelta: 0, shelterAdd: 0, dustMul: 1, reference: true },
  { id: 'meridiani', dest: 'mars', base: 'summer', difficulty: 'medium', solarMul: 1.08, thermalAdd: -0.1, ghMul: 1.05, waterDelta: 10, shelterAdd: 0, dustMul: 0.85 },
  { id: 'valles', dest: 'mars', base: 'summer', difficulty: 'hard', solarMul: 0.9, thermalAdd: 0.1, ghMul: 1, waterDelta: -20, shelterAdd: 25, dustMul: 1.15, pool: { WIND: 1.6 } },
  { id: 'hellas', dest: 'mars', base: 'summer', difficulty: 'veryHard', solarMul: 0.88, thermalAdd: 0.2, ghMul: 0.95, waterDelta: -30, shelterAdd: 0, dustMul: 1.3, pool: { WIND: 1.5 } },
];

export const LANDING_BY_ID: Record<string, LandingSite> = Object.fromEntries(LANDING_SITES.map((l) => [l.id, l]));

export function landingsFor(dest: DestinationId): LandingSite[] {
  return LANDING_SITES.filter((l) => l.dest === dest);
}

export function referenceLanding(dest: DestinationId, base: SiteId): LandingSite {
  return LANDING_SITES.find((l) => l.dest === dest && l.base === base && l.reference) ?? landingsFor(dest)[0];
}

/** The seeded random landing site for a run. */
export function pickLanding(seed: number, dest: DestinationId): LandingSite {
  return new Rng(deriveSeed(seed, 'landing', dest)).pick(landingsFor(dest));
}
