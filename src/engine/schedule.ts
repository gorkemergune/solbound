import { Rng, deriveSeed } from './rng';
import { MINUTES_PER_DAY, type PoolEntry, type ScenarioDefinition } from './scenarios';
import type { ScheduledEvent } from './types';

type Part = 'am' | 'pm' | 'eve';
type Slot = { day: number; part: Part };

const HOURS: Record<Part, [number, number]> = { am: [7, 10], pm: [13, 16], eve: [19, 20] };
/** the same routine event never comes back within this many days */
const REPEAT_GAP_DAYS = 4;

/**
 * Builds a run's surface schedule from its seed. Mandatory story beats land somewhere in their day
 * window; pool events (some of which may repeat) are spread over the whole month in a weighted,
 * seeded order. Same seed → same schedule; a new seed gives a different combination and order.
 * Days without a card are filled by crew chatter, routines and the big-event countdowns.
 */
export function buildSchedule(seed: number, s: ScenarioDefinition): ScheduledEvent[] {
  const rng = new Rng(deriveSeed(seed, 'schedule', s.id, s.site));
  const days = s.missionDays;
  const slots: Slot[] = [];
  for (let d = 1; d <= days; d++) slots.push({ day: d, part: 'am' }, { day: d, part: 'pm' });
  for (const d of rng.shuffle(range(2, days - 1)).slice(0, Math.round(days / 5))) slots.push({ day: d, part: 'eve' });

  const taken = new Map<string, { eventId: string; instanceId: string }>();
  const key = (sl: Slot) => `${sl.day}-${sl.part}`;
  const placedDays = new Map<string, number[]>();

  const place = (entry: PoolEntry, instanceId: string, preferred: Part[]) => {
    const near = placedDays.get(entry.eventId) ?? [];
    for (const d of rng.shuffle(range(entry.days[0], Math.min(days, entry.days[1])))) {
      if (near.some((x) => Math.abs(x - d) < REPEAT_GAP_DAYS)) continue;
      for (const part of preferred) {
        const sl = slots.find((x) => x.day === d && x.part === part);
        if (sl && !taken.has(key(sl))) {
          taken.set(key(sl), { eventId: entry.eventId, instanceId });
          placedDays.set(entry.eventId, [...near, d]);
          return true;
        }
      }
    }
    return false;
  };

  for (const m of s.mandatory) place(m, m.eventId, m.eventId === 'CROP' ? ['pm', 'eve'] : ['am', 'pm', 'eve']);

  // weighted random order (Efraimidis–Spirakis keys), every allowed repeat is its own instance
  const instances = s.pool
    .flatMap((p) => Array.from({ length: p.max ?? 1 }, (_, k) => ({ p, k, key: Math.pow(rng.next(), 1 / (p.weight * (k === 0 ? 1 : 0.7))) })))
    .sort((a, b) => b.key - a.key);
  // first copies first, so every event type gets a chance before repeats
  instances.sort((a, b) => a.k - b.k);
  for (const { p, k } of instances) place(p, k === 0 ? p.eventId : `${p.eventId}#${k + 1}`, ['am', 'pm', 'eve']);

  const out: ScheduledEvent[] = [];
  for (const sl of slots) {
    const hit = taken.get(key(sl));
    if (!hit) continue;
    const [h0, h1] = HOURS[sl.part];
    const hour = rng.int(h0, h1);
    const min = rng.next() < 0.5 ? 0 : 30;
    out.push({ eventId: hit.eventId, instanceId: hit.instanceId, atMinute: (sl.day - 1) * MINUTES_PER_DAY + hour * 60 + min });
  }
  return out.sort((a, b) => a.atMinute - b.atMinute);
}

function range(a: number, b: number) {
  const r: number[] = [];
  for (let i = a; i <= b; i++) r.push(i);
  return r;
}
