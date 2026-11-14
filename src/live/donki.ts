// NASA DONKI adapter (browser side). Downloads the last 30 days of space-weather records, normalises
// them into the engine's SpaceWeatherSnapshot shape, and never throws: a failed endpoint is listed in
// `failed`. Only type imports from the engine, so this file also runs in Node (scripts/donki-snapshot.ts).
import type { SpaceWeatherSnapshot, SwRecord } from '../engine/spaceweather';

export const DONKI_BASE = 'https://api.nasa.gov/DONKI';
export const ENDPOINTS = ['CME', 'FLR', 'SEP', 'GST', 'IPS'] as const;
export type Endpoint = (typeof ENDPOINTS)[number];
export const WINDOW_DAYS = 30;

type Json = Record<string, unknown>;
const str = (v: unknown) => (typeof v === 'string' ? v : undefined);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const arr = (v: unknown): Json[] => (Array.isArray(v) ? (v.filter((x) => x && typeof x === 'object') as Json[]) : []);
/** DONKI writes times like 2026-10-26T09:48Z; keep them as UTC ISO strings. */
const iso = (v: unknown) => {
  const s = str(v);
  return s && !Number.isNaN(Date.parse(s)) ? s : undefined;
};

export function isoDay(ms: number) {
  return new Date(ms).toISOString().slice(0, 10);
}

/** [start, end] dates of the data window ending today (UTC). */
export function windowFor(nowMs: number): { start: string; end: string } {
  return { start: isoDay(nowMs - WINDOW_DAYS * 86_400_000), end: isoDay(nowMs) };
}

function cme(c: Json): SwRecord | null {
  const id = str(c.activityID);
  const time = iso(c.startTime);
  if (!id || !time) return null;
  const analyses = arr(c.cmeAnalyses);
  const best = analyses.find((a) => a.isMostAccurate === true) ?? analyses.at(-1);
  // model runs: prefer the most accurate analysis' runs, newest last
  const runs = [...arr(best?.enlilList), ...analyses.filter((a) => a !== best).flatMap((a) => arr(a.enlilList))];
  let arrivalMars: string | undefined;
  let glancingMars: boolean | undefined;
  let arrivalEarth: string | undefined;
  let glancingEarth: boolean | undefined;
  for (const r of runs) {
    if (!arrivalEarth && iso(r.estimatedShockArrivalTime)) {
      arrivalEarth = iso(r.estimatedShockArrivalTime);
      glancingEarth = r.isEarthGB === true;
    }
    const mars = arr(r.impactList).filter((i) => i.location === 'Mars' && iso(i.arrivalTime));
    if (!arrivalMars && mars.length) {
      const first = mars.sort((a, b) => Date.parse(String(a.arrivalTime)) - Date.parse(String(b.arrivalTime)))[0];
      arrivalMars = iso(first.arrivalTime);
      glancingMars = first.isGlancingBlow === true;
    }
  }
  return {
    id,
    kind: 'cme',
    time,
    link: str(c.link) ?? '',
    speed: num(best?.speed),
    cls: str(best?.type),
    ...(arrivalMars ? { arrivalMars, glancingMars } : {}),
    ...(arrivalEarth ? { arrivalEarth, glancingEarth } : {}),
  };
}

function flr(f: Json): SwRecord | null {
  const id = str(f.flrID);
  const time = iso(f.peakTime) ?? iso(f.beginTime);
  return id && time ? { id, kind: 'flr', time, link: str(f.link) ?? '', cls: str(f.classType) } : null;
}

function sep(s: Json): SwRecord | null {
  const id = str(s.sepID);
  const time = iso(s.eventTime);
  return id && time ? { id, kind: 'sep', time, link: str(s.link) ?? '' } : null;
}

function gst(g: Json): SwRecord | null {
  const id = str(g.gstID);
  const time = iso(g.startTime);
  if (!id || !time) return null;
  const kp = Math.max(0, ...arr(g.allKpIndex).map((k) => num(k.kpIndex) ?? 0));
  return { id, kind: 'gst', time, link: str(g.link) ?? '', cls: kp ? `Kp ${kp}` : undefined };
}

function ips(p: Json): SwRecord | null {
  const id = str(p.activityID);
  const time = iso(p.eventTime);
  return id && time ? { id, kind: 'ips', time, link: str(p.link) ?? '', location: str(p.location) } : null;
}

const PARSE: Record<Endpoint, (x: Json) => SwRecord | null> = { CME: cme, FLR: flr, SEP: sep, GST: gst, IPS: ips };

/** Raw DONKI JSON per endpoint → sorted, de-duplicated records. */
export function normalize(raw: Partial<Record<Endpoint, unknown>>): SwRecord[] {
  const out: SwRecord[] = [];
  const seen = new Set<string>();
  for (const ep of ENDPOINTS) {
    for (const x of arr(raw[ep])) {
      const r = PARSE[ep](x);
      if (r && !seen.has(r.id)) {
        seen.add(r.id);
        out.push(r);
      }
    }
  }
  return out.sort((a, b) => Date.parse(a.time) - Date.parse(b.time) || a.id.localeCompare(b.id));
}

/** Download a fresh snapshot. Each endpoint fails independently (FLR currently answers 404). */
export async function fetchSnapshot(key: string, nowMs: number, fetchImpl: typeof fetch = fetch, timeoutMs = 15000): Promise<SpaceWeatherSnapshot> {
  const { start, end } = windowFor(nowMs);
  const raw: Partial<Record<Endpoint, unknown>> = {};
  const failed: string[] = [];
  await Promise.all(
    ENDPOINTS.map(async (ep) => {
      const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = ctl ? setTimeout(() => ctl.abort(), timeoutMs) : null;
      try {
        const res = await fetchImpl(`${DONKI_BASE}/${ep}?startDate=${start}&endDate=${end}&api_key=${encodeURIComponent(key)}`, ctl ? { signal: ctl.signal } : undefined);
        if (!res.ok) throw new Error(String(res.status));
        raw[ep] = await res.json();
      } catch {
        failed.push(ep);
      } finally {
        if (timer) clearTimeout(timer);
      }
    }),
  );
  if (failed.length === ENDPOINTS.length) throw new Error('DONKI unreachable');
  return { source: 'live', fetchedAt: new Date(nowMs).toISOString(), rangeStart: start, rangeEnd: end, records: normalize(raw), failed: failed.sort() };
}
