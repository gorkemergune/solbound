import { activeCrew, characterById } from './rules';
import { SCENARIOS } from './scenarios';
import type { DecisionRecord, Echo, RunState } from './types';

export type Rating = 'success' | 'partial' | 'aborted' | 'lost';

export type Outcome = {
  rating: Rating;
  home: string[];
  evacuated: string[];
  lost: string[];
  science: number;
  keyDecisions: DecisionRecord[];
  echoes: Echo[];
  lessons: string[];
  /** why the rating is not a full success (i18n keys) */
  reasons: string[];
  demoDays: number;
  targetDays: number;
};

/** Debrief summary derived only from recorded state (no new randomness). */
export function computeOutcome(run: RunState): Outcome {
  const m = run.mission!;
  const s = SCENARIOS[run.destination!];
  const home = m.ended?.reason === 'complete' || m.ended?.reason === 'aborted' ? activeCrew(m).map((c) => c.id) : [];
  const evacuated = m.crew.filter((c) => c.status === 'evacuated').map((c) => c.id);
  const lost = m.crew.filter((c) => c.status === 'deceased').map((c) => c.id);

  let rating: Rating;
  if (m.ended?.reason === 'playerLost' || (lost.length > 0 && home.length === 0)) rating = 'lost';
  else if (lost.length) rating = 'partial';
  else if (m.ended?.reason === 'aborted') rating = 'aborted';
  else if (evacuated.length || m.flags.arrival === 'rough' || m.flags.margin === 'none') rating = 'partial';
  else rating = 'success';

  const reasons: string[] = [];
  if (lost.length) reasons.push('reason.lost');
  if (evacuated.length) reasons.push('reason.evacuated');
  if (m.ended?.reason === 'aborted') reasons.push('reason.aborted');
  if (m.flags.margin === 'none') reasons.push('reason.ration');
  if (m.flags.arrival === 'rough') reasons.push('reason.rough');

  const main = m.decisions.filter((d) => d.weight >= 3);
  const keyDecisions = (main.length >= 3 ? main : m.decisions)
    .slice()
    .sort((a, b) => b.weight - a.weight || a.minute - b.minute)
    .slice(0, 3)
    .sort((a, b) => a.minute - b.minute);

  const lessons: string[] = [];
  if (m.unmet.powerKWh > 0.5) lessons.push('lesson.power');
  if (m.unmet.o2Hours > 0 || m.decisions.some((d) => d.eventId === 'MOON-02' || d.eventId === 'EMG-O2')) lessons.push('lesson.o2');
  if (m.flags.waterRation || m.decisions.some((d) => d.eventId === 'MARS-01')) lessons.push('lesson.water');
  if (m.decisions.some((d) => d.eventId === 'MOON-03')) lessons.push('lesson.radiation');
  if (m.decisions.some((d) => d.eventId === 'MARS-02')) lessons.push('lesson.dust');
  if (m.harvests > 0 || m.decisions.some((d) => d.eventId === 'MARS-03')) lessons.push('lesson.food');
  lessons.unshift(m.echoes.length ? 'lesson.prep' : 'lesson.prepNone');

  return {
    rating,
    home,
    evacuated,
    lost,
    science: Math.round(m.resources.science),
    keyDecisions,
    echoes: m.echoes,
    lessons: lessons.slice(0, 4),
    reasons,
    demoDays: s.demoDays,
    targetDays: s.campaignTargetDays,
  };
}

export function crewName(run: RunState, id: string) {
  return characterById(run, id).name;
}
