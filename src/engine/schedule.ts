import { Rng, deriveSeed } from './rng';
import { MINUTES_PER_DAY, type PoolEntry, type ScenarioDefinition } from './scenarios';
import type { ScheduledEvent } from './types';

type Slot = { day: number; part: 'am' | 'pm' | 'eve' };

const HOURS: Record<Slot['part'], [number, number]> = { am: [7, 10], pm: [13, 16], eve: [19, 20] };

/**
 * Builds a run's surface schedule from its seed: mandatory story beats land somewhere in their day
 * window, the rest of the slots are filled from a weighted pool. Same seed → same schedule; a new
 * seed gives a different combination and order of events.
 */
export function buildSchedule(seed: number, s: ScenarioDefinition): ScheduledEvent[] {
  const rng = new Rng(deriveSeed(seed, 'schedule', s.id, s.site));
  const slots: Slot[] = [];
  for (let d = 1; d <= s.demoDays; d++) {
    slots.push({ day: d, part: 'am' }, { day: d, part: 'pm' });
  }
  // a few busier days with an evening event
  for (const d of rng.shuffle([2, 3, 4, 5, 6]).slice(0, 3)) slots.push({ day: d, part: 'eve' });

  const taken = new Map<string, string>(); // slot key -> event id
  const key = (sl: Slot) => `${sl.day}-${sl.part}`;
  const used = new Set<string>();

  const place = (entry: PoolEntry, preferred: Slot['part'][]) => {
    const days = rng.shuffle(range(entry.days[0], entry.days[1]));
    for (const d of days) {
      for (const part of preferred) {
        const sl = slots.find((x) => x.day === d && x.part === part);
        if (sl && !taken.has(key(sl))) {
          taken.set(key(sl), entry.eventId);
          used.add(entry.eventId);
          return true;
        }
      }
    }
    return false;
  };

  for (const m of s.mandatory) place(m, m.eventId === 'CROP' ? ['pm', 'eve'] : ['am', 'pm', 'eve']);

  // fill one slot per day first (morning), then afternoons, then evenings, so no day is left empty
  const partOrder = { am: 0, pm: 1, eve: 2 } as const;
  for (const sl of slots.slice().sort((a, b) => partOrder[a.part] - partOrder[b.part] || a.day - b.day)) {
    if (taken.has(key(sl))) continue;
    const cands = s.pool.filter((p) => !used.has(p.eventId) && sl.day >= p.days[0] && sl.day <= p.days[1]);
    if (!cands.length) continue;
    const total = cands.reduce((a, c) => a + c.weight, 0);
    let r = rng.next() * total;
    const pick = cands.find((c) => (r -= c.weight) < 0) ?? cands[cands.length - 1];
    taken.set(key(sl), pick.eventId);
    used.add(pick.eventId);
  }

  const out: ScheduledEvent[] = [];
  for (const sl of slots) {
    const id = taken.get(key(sl));
    if (!id) continue;
    const [h0, h1] = HOURS[sl.part];
    const hour = rng.int(h0, h1);
    const min = rng.next() < 0.5 ? 0 : 30;
    out.push({ eventId: id, atMinute: (sl.day - 1) * MINUTES_PER_DAY + hour * 60 + min });
  }
  return out.sort((a, b) => a.atMinute - b.atMinute);
}

function range(a: number, b: number) {
  const r: number[] = [];
  for (let i = a; i <= b; i++) r.push(i);
  return r;
}
