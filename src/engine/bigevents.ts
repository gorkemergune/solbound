// Predictable "big" events: they are known in advance (orbital mechanics, orbiter weather maps,
// meteoroid stream calendars, a tracked cargo lander), so the crew sees a countdown and can prepare.
// Unpredictable hazards (solar particle events, quakes, micrometeoroid hits) stay surprises.
import { Rng, deriveSeed } from './rng';
import { MINUTES_PER_DAY, SURFACE_START_MINUTE, equatorSunrise, equatorSunset, type ScenarioDefinition } from './scenarios';
import type { BigEventState, BigKind, Character, ScheduledEvent } from './types';
import { cmeBigEvents, type SpaceWeatherSnapshot } from './spaceweather';

/** Days of warning per kind (gameplay values; the sourcing for "can be known" is on the research cards). */
export const NOTICE_DAYS: Record<BigKind, number> = { storm: 3, night: 5, meteor: 5, dark: 4, resupply: 5, cme: 0, crew: 0 };
/** Event card shown when the countdown starts. */
export const FORECAST_EVENT: Record<BigKind, string> = { storm: 'FC-STORM', night: 'FC-NIGHT', meteor: 'FC-METEOR', dark: 'FC-DARK', resupply: 'FC-RESUPPLY', cme: 'FC-CME', crew: 'REINF-OFFER' };
/** Pseudo-event holding the preparation tasks of a kind. */
export const PREP_EVENT: Record<BigKind, string> = { storm: 'PREP-storm', night: 'PREP-night', meteor: 'PREP-meteor', dark: 'PREP-dark', resupply: 'PREP-resupply', cme: 'PREP-cme', crew: 'PREP-crew' };

const at = (day: number, hour: number) => (day - 1) * MINUTES_PER_DAY + hour * 60;

/**
 * Seeded placement of the month's big events. A communications officer on the crew gets every
 * warning one day earlier (better use of orbiter data and Earth support).
 */
export function buildBigEvents(seed: number, s: ScenarioDefinition, crew: Character[], sw: SpaceWeatherSnapshot | null = null): BigEventState[] {
  const rng = new Rng(deriveSeed(seed, 'big', s.id, s.site));
  const lead = crew.some((c) => c.traitId === 'comms') ? MINUTES_PER_DAY : 0;
  const out: BigEventState[] = [];
  const starts: number[] = [];
  const add = (id: string, kind: BigKind, startAt: number, hours: number, hitEventId: string) => {
    out.push({
      id,
      kind,
      announceAt: Math.max(SURFACE_START_MINUTE + 150, startAt - NOTICE_DAYS[kind] * MINUTES_PER_DAY - lead),
      startAt,
      endAt: startAt + hours * 60,
      hitEventId,
      closed: false,
    });
    starts.push(startAt);
  };
  /** a day in [a, b] at least 3 days away from every big event already placed */
  const freeDay = (a: number, b: number) => {
    let d = rng.int(a, b);
    for (let i = 0; i < 30 && starts.some((x) => Math.abs(x / MINUTES_PER_DAY + 1 - d) < 3); i++) d = rng.int(a, b);
    return d;
  };

  if (s.id === 'moon') {
    if (s.site === 'equator') {
      const set = equatorSunset();
      add('night', 'night', set, Math.round((equatorSunrise() - set) / 60), 'NIGHT');
    } else {
      add('dark', 'dark', at(freeDay(15, 23), rng.int(4, 15)), 40, 'DARK');
    }
    add('resupply', 'resupply', at(freeDay(11, 18), rng.int(9, 14)), 1, 'RESUPPLY');
    add('meteor', 'meteor', at(freeDay(8, 26), rng.int(18, 21)), 24, 'METEOR');
  } else {
    if (s.site === 'summer') {
      add('storm1', 'storm', at(freeDay(5, 10), rng.int(8, 14)), 60, 'MARS-02');
      add('resupply', 'resupply', at(freeDay(12, 16), rng.int(9, 14)), 1, 'RESUPPLY');
      add('storm2', 'storm', at(freeDay(19, 25), rng.int(8, 14)), 60, 'MARS-02');
    } else {
      add('storm1', 'storm', at(freeDay(7, 22), rng.int(8, 14)), 24, 'MARS-02');
      add('resupply', 'resupply', at(freeDay(11, 17), rng.int(9, 14)), 1, 'RESUPPLY');
    }
  }
  // Real CMEs from NASA DONKI whose model arrival falls inside the month (countdown = real lead time)
  if (sw) out.push(...cmeBigEvents(sw, s.id, starts));
  return out.sort((a, b) => a.startAt - b.startAt);
}

/** Queue entries for forecasts and hits. */
export function bigQueue(big: BigEventState[]): ScheduledEvent[] {
  return big.flatMap((b) => [
    { eventId: FORECAST_EVENT[b.kind], atMinute: b.announceAt, instanceId: `${FORECAST_EVENT[b.kind]}@${b.id}` },
    { eventId: b.hitEventId, atMinute: b.startAt, instanceId: `${b.hitEventId}@${b.id}` },
  ]);
}

export type BigStatus = 'hidden' | 'countdown' | 'active' | 'over';

export function bigStatus(b: BigEventState, minute: number): BigStatus {
  if (minute < b.announceAt) return 'hidden';
  if (minute < b.startAt) return 'countdown';
  if (minute < b.endAt && !b.closed) return 'active';
  return 'over';
}

/** Prep flags live under `prep.<kind>.<action>`; task status under `prep@<bigId>:<action>`. */
export const prepFlag = (kind: BigKind, action: string) => `prep.${kind}.${action}`;
export const prepStatusKey = (bigId: string, action: string) => `prep@${bigId}:${action}`;
