import { activeCrew, characterById } from './rules';
import { rankFor, type RankResult } from './rank';
import { scenarioFor } from './scenarios';
import type { DecisionRecord, Echo, RunState } from './types';

export type Rating = 'excellent' | 'success' | 'partial' | 'aborted' | 'lost';

export type Outcome = {
  rating: Rating;
  home: string[];
  evacuated: string[];
  lost: string[];
  science: number;
  /** end-of-mission rank from science points (capped if crew were lost) */
  rank: RankResult;
  keyDecisions: DecisionRecord[];
  echoes: Echo[];
  lessons: string[];
  /** why the rating is not a full success (i18n keys) */
  reasons: string[];
  missionDays: number;
  goal: { estimate: number; target: number; limiting: string | null };
  /** days actually spent on the surface */
  daysOnSurface: number;
  harvests: number;
  /** big events that hit, and how many of their preparation tasks were completed */
  bigEvents: { id: string; kind: string; preps: number }[];
  decisions: number;
  chats: number;
};

/** Debrief summary derived only from recorded state (no new randomness). */
export function computeOutcome(run: RunState): Outcome {
  const m = run.mission!;
  const s = scenarioFor(run.destination!, run.site, run.landing);
  const home = m.ended?.reason === 'complete' || m.ended?.reason === 'aborted' ? activeCrew(m).map((c) => c.id) : [];
  const evacuated = m.crew.filter((c) => c.status === 'evacuated').map((c) => c.id);
  const lost = m.crew.filter((c) => c.status === 'deceased').map((c) => c.id);

  const endMinute = typeof m.flags.surfaceEndMinute === 'number' ? (m.flags.surfaceEndMinute as number) : (m.ended?.minute ?? m.minute);
  const daysOnSurface = Math.min(s.missionDays, Math.max(0, (endMinute - 360) / 1440));
  let rating: Rating;
  if (m.ended?.reason === 'playerLost' || (lost.length > 0 && home.length === 0)) rating = 'lost';
  else if (lost.length) rating = 'partial';
  else if (m.ended?.reason === 'aborted') rating = 'aborted';
  else if (evacuated.length || m.flags.arrival === 'rough' || m.flags.margin === 'none') rating = 'partial';
  // the goal set before launch (85% of the estimated endurance) must be reached for a full success
  else if (daysOnSurface + 1e-9 < m.goal.target) rating = 'partial';
  // staying at least as long as the pre-launch estimate (or to the end) is the top tier
  else if (daysOnSurface + 1e-9 >= Math.min(m.goal.estimate, s.missionDays - 1)) rating = 'excellent';
  else rating = 'success';

  const reasons: string[] = [];
  if (lost.length) reasons.push('reason.lost');
  if (evacuated.length) reasons.push('reason.evacuated');
  if (m.ended?.reason === 'aborted') reasons.push('reason.aborted');
  if (m.flags.margin === 'none') reasons.push('reason.ration');
  if (m.flags.arrival === 'rough') reasons.push('reason.rough');
  if (m.ended?.reason === 'complete' && daysOnSurface + 1e-9 < m.goal.target) reasons.push('reason.early');

  if (rating === 'success') reasons.push('reason.excellent');

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
  if (m.decisions.some((d) => d.eventId.startsWith('PREP-'))) lessons.push('lesson.countdown');
  if (m.decisions.some((d) => d.eventId === 'NIGHT')) lessons.push('lesson.night');
  if (m.harvests > 0 || m.decisions.some((d) => d.eventId === 'MARS-03')) lessons.push('lesson.food');
  lessons.unshift(m.echoes.length ? 'lesson.prep' : 'lesson.prepNone');

  return {
    rating,
    home,
    evacuated,
    lost,
    science: Math.round(m.resources.science),
    rank: rankFor(Math.round(m.resources.science), lost.length > 0),
    keyDecisions,
    echoes: m.echoes,
    lessons: lessons.slice(0, 5),
    reasons,
    missionDays: s.missionDays,
    daysOnSurface: Math.round(daysOnSurface * 10) / 10,
    goal: m.goal,
    harvests: m.harvests,
    bigEvents: m.big
      .filter((b) => m.resolved.includes(`${b.hitEventId}@${b.id}`))
      .map((b) => ({ id: b.id, kind: b.kind, preps: m.decisions.filter((d) => d.instanceId.startsWith(`PREP-${b.kind}@${b.id}:`) && d.success).length })),
    decisions: m.decisions.filter((d) => !d.eventId.startsWith('FC-')).length,
    chats: m.journal.filter((j) => j.tone === 'chat').length,
  };
}

export function crewName(run: RunState, id: string) {
  return characterById(run, id).name;
}
