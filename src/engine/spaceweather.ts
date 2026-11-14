// Real space weather from NASA DONKI, mapped onto the 30-day mission. Pure: the engine never fetches.
// The browser adapter (src/live/donki.ts) builds a snapshot; it is stored in the run at launch, so a
// mission keeps the same data (and the same rules) for its whole life, and tests can use fixtures.
import type { BigEventState, DestinationId } from './types';

export type SwKind = 'cme' | 'flr' | 'sep' | 'gst' | 'ips';

/** One normalised DONKI record. Times are ISO strings in UTC as published by DONKI. */
export type SwRecord = {
  id: string;
  kind: SwKind;
  /** when it was observed / started */
  time: string;
  link: string;
  /** CME speed in km/s */
  speed?: number;
  /** flare class (e.g. M1.2), CME type (S, C, O, R, ER), or Kp for storms */
  cls?: string;
  /** WSA-ENLIL model arrival at Mars / Earth (CMEs only) */
  arrivalMars?: string;
  arrivalEarth?: string;
  glancingMars?: boolean;
  glancingEarth?: boolean;
  /** where an interplanetary shock or particle event was measured */
  location?: string;
};

export type SpaceWeatherSnapshot = {
  source: 'live' | 'cache' | 'bundled';
  /** when the data was downloaded */
  fetchedAt: string;
  /** first real day of the window = mission day 1 (YYYY-MM-DD) */
  rangeStart: string;
  rangeEnd: string;
  records: SwRecord[];
  /** endpoints that failed (e.g. FLR) */
  failed: string[];
};

const DAY_MS = 86_400_000;

/** Mission minute that corresponds to a real time (1 real day = 1 mission day; gameplay mapping). */
export function swMinute(snap: SpaceWeatherSnapshot, iso: string): number {
  return Math.round((Date.parse(iso) - Date.parse(`${snap.rangeStart}T00:00Z`)) / 60_000);
}

/** Real date shown for a mission minute. */
export function realTimeAt(snap: SpaceWeatherSnapshot, minute: number): number {
  return Date.parse(`${snap.rangeStart}T00:00Z`) + minute * 60_000;
}

export function arrivalFor(r: SwRecord, dest: DestinationId): { at: string; glancing: boolean } | null {
  // The Moon sits next to Earth, so the Earth forecast is used for it (labelled in the card).
  if (dest === 'mars') return r.arrivalMars ? { at: r.arrivalMars, glancing: !!r.glancingMars } : null;
  return r.arrivalEarth ? { at: r.arrivalEarth, glancing: !!r.glancingEarth } : null;
}

/** Records worth a bulletin: CMEs heading our way or fast ones, M/X flares, storms, shocks, particle events. */
export function isBulletin(r: SwRecord, dest: DestinationId): boolean {
  if (r.kind === 'cme') return !!arrivalFor(r, dest) || (r.speed ?? 0) >= 700;
  if (r.kind === 'flr') return /^[MX]/.test(r.cls ?? '');
  if (r.kind === 'ips') return dest === 'mars' ? r.location === 'Mars' : r.location === 'Earth';
  return true;
}

const SURFACE_START = 360;
const END = 30 * 1440;

/**
 * Real CME arrivals become countdown events: the countdown starts when the CME was observed and ends
 * at the model arrival time. At most three, at least two days apart, strongest (fastest) first.
 */
export function cmeBigEvents(snap: SpaceWeatherSnapshot, dest: DestinationId, taken: number[]): BigEventState[] {
  const cands = snap.records
    .map((r, i) => ({ r, i, a: r.kind === 'cme' ? arrivalFor(r, dest) : null }))
    .filter((x) => x.a)
    .map((x) => ({ ...x, start: swMinute(snap, x.a!.at), seen: swMinute(snap, x.r.time) }))
    .filter((x) => x.start > SURFACE_START + 600 && x.start < END - 1440 && x.start > x.seen)
    .sort((a, b) => (b.r.speed ?? 0) - (a.r.speed ?? 0) || a.start - b.start);
  const out: BigEventState[] = [];
  const starts = [...taken];
  for (const c of cands) {
    if (out.length >= 3) break;
    if (starts.some((s) => Math.abs(s - c.start) < 2 * 1440)) continue;
    const hours = c.a!.glancing ? 10 : 18;
    out.push({
      id: `cme${out.length + 1}`,
      kind: 'cme',
      announceAt: Math.max(SURFACE_START + 150, Math.min(c.seen, c.start - 360)),
      startAt: c.start,
      endAt: c.start + hours * 60,
      hitEventId: 'CME',
      closed: false,
      swIndex: c.i,
    });
    starts.push(c.start);
  }
  return out;
}

/** Journal bulletins: [mission minute, record index], only inside the surface month. */
export function bulletinPlan(snap: SpaceWeatherSnapshot, dest: DestinationId): { at: number; rec: number }[] {
  return snap.records
    .map((r, i) => ({ at: swMinute(snap, r.time), rec: i, r }))
    .filter((x) => isBulletin(x.r, dest) && x.at >= SURFACE_START && x.at < END)
    .sort((a, b) => a.at - b.at || a.rec - b.rec)
    .map(({ at, rec }) => ({ at: Math.max(at, SURFACE_START + 60), rec }));
}

/** First real solar energetic particle event in the window (Moon: it replaces the random particle event). */
export function firstSep(snap: SpaceWeatherSnapshot): number | null {
  const s = snap.records.filter((r) => r.kind === 'sep').map((r) => swMinute(snap, r.time)).filter((m) => m > SURFACE_START + 1440 && m < END - 1440);
  return s.length ? Math.min(...s) : null;
}

export function countByKind(snap: SpaceWeatherSnapshot): Record<SwKind, number> {
  const c: Record<SwKind, number> = { cme: 0, flr: 0, sep: 0, gst: 0, ips: 0 };
  for (const r of snap.records) c[r.kind]++;
  return c;
}

/** Days between the snapshot window start and a given day (for "data from N days ago"). */
export function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(b) - Date.parse(a)) / DAY_MS);
}
