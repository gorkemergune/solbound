// Helpers shared by engine tests and the balance report. Pure; no test framework imports.
import { applyCommand, createRun, type Command } from './commands';
import { eventOf, optionState, suggestCrew } from './rules';
import { PREP_EVENT, bigStatus, prepStatusKey } from './bigevents';
import type { DestinationId, ItemId, Mode, RunState, SiteId } from './types';

export function must(run: RunState, cmd: Command): RunState {
  const r = applyCommand(run, cmd);
  if (r.error) throw new Error(`${cmd.type}: ${r.error}`);
  return r.state;
}

export function prepared(opts: { seed?: number; dest: DestinationId; site?: SiteId; cargo?: Partial<Record<ItemId, number>>; crew?: string[]; mode?: Mode }): RunState {
  let run = createRun(opts.seed ?? 42, 'en', opts.mode ?? 'standard');
  run = must(run, { type: 'goTo', phase: 'destination' });
  run = must(run, { type: 'setDestination', destination: opts.dest });
  if (opts.site) run = must(run, { type: 'setSite', site: opts.site });
  run = must(run, { type: 'goTo', phase: 'crew' });
  for (const id of opts.crew ?? ['c01', 'c02', 'c03']) run = must(run, { type: 'toggleCrew', id });
  run = must(run, { type: 'goTo', phase: 'cargo' });
  // force-pack: bypasses the mass check so fixtures are independent of the seed's body masses
  for (const [k, v] of Object.entries(opts.cargo ?? {})) run = { ...run, cargo: { ...run.cargo, [k]: v } };
  return { ...run, phase: 'briefing' };
}

/** Policy: ordered preferences per event id; first available option wins. `PREP` lists prep tasks to start during countdowns. */
export type Policy = Record<string, string[]>;

/** Launch ignoring the mass budget (fixtures choose cargo explicitly). */
export function launchAnyway(run: RunState): RunState {
  const huge = { ...run, player: { ...run.player, profile: { ...run.player.profile, massKg: -1000 } } };
  const r = must(huge, { type: 'launch' });
  return { ...r, player: run.player };
}

export function play(run: RunState, policy: Policy, stepMinutes = 60): RunState {
  let r = launchAnyway(run);
  let guard = 0;
  while (r.phase !== 'debrief' && guard++ < 5000) {
    const m = r.mission!;
    if (m.activeEvent) {
      const ev = eventOf(m.activeEvent.eventId);
      const prefs = [...(policy[ev.id] ?? []), ...ev.options.map((o) => o.id)];
      const opt = prefs.map((id) => ev.options.find((o) => o.id === id)!).find((o) => o && optionState(r, o, m.activeEvent).available);
      if (!opt) throw new Error(`no available option for ${ev.id}`);
      r = must(r, { type: 'resolve', instanceId: m.activeEvent.instanceId, optionId: opt.id, crewIds: suggestCrew(r, opt) });
      continue;
    }
    if (r.phase === 'landing') {
      r = must(r, { type: 'beginSurface' });
      continue;
    }
    if (r.phase === 'surface') {
      r = startPreps(r, policy.PREP ?? []);
      r = must(r, { type: 'advance', minutes: stepMinutes });
      continue;
    }
    throw new Error(`stuck in ${r.phase}`);
  }
  return r;
}

/** Start every listed preparation task that is possible right now (used by policies). */
export function startPreps(run: RunState, actions: string[]): RunState {
  let r = run;
  const m = r.mission!;
  if (m.activeEvent || !actions.length) return r;
  for (const b of m.big) {
    if (bigStatus(b, m.minute) !== 'countdown') continue;
    const ev = eventOf(PREP_EVENT[b.kind]);
    for (const id of actions) {
      const o = ev.options.find((x) => x.id === id);
      if (!o || r.mission!.flags[prepStatusKey(b.id, id)]) continue;
      if (!optionState(r, o, null).available) continue;
      const res = applyCommand(r, { type: 'prep', bigId: b.id, actionId: id, crewIds: suggestCrew(r, o) });
      if (!res.error) r = res.state;
    }
  }
  return r;
}
