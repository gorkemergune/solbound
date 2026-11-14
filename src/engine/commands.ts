import { incompatibleItems, payload, validateQuantity } from './cargo';
import { fallbackName, generateCandidates, generatePlayer, sanitizeName } from './characters';
import { RESEARCH_BY_ID } from './research';
import { availableCrewFor, characterById, echoesFor, eventOf, log, optionState, scenarioOf, successChance, applyEffects, type Ctx } from './rules';
import { SITES, SURFACE_START_MINUTE, scenarioFor } from './scenarios';
import { buildSchedule } from './schedule';
import { advanceTime, makeHooks, openEvent, rollFor, checkEmergencies } from './sim';
import type { Character, CoverMode, CrewState, DestinationId, GreenhouseMode, ItemId, Locale, MissionState, Mode, Phase, Routine, RunState, SiteId, Speed } from './types';
import { PREP_PHASES } from './types';

export const SCHEMA_VERSION = 2;
export const CONTENT_VERSION = '0.3.0-demo7';
export const REQUIRED_COMPANIONS = 3;

export type Command =
  | { type: 'renamePlayer'; name: string; locale: Locale }
  | { type: 'renameCandidate'; id: string; name: string; locale: Locale }
  | { type: 'rerollProfile'; seed: number; locale: Locale }
  | { type: 'setMode'; mode: Mode }
  | { type: 'goTo'; phase: Phase }
  | { type: 'setDestination'; destination: DestinationId }
  | { type: 'setSite'; site: SiteId }
  | { type: 'toggleCrew'; id: string }
  | { type: 'setCargo'; itemId: string; qty: number }
  | { type: 'launch' }
  | { type: 'resolve'; instanceId: string; optionId: string; crewIds: string[] }
  | { type: 'beginSurface' }
  | { type: 'advance'; minutes: number }
  | { type: 'setPause'; paused: boolean }
  | { type: 'setSpeed'; speed: Speed }
  | { type: 'setGreenhouse'; mode: GreenhouseMode }
  | { type: 'setCover'; mode: CoverMode }
  | { type: 'setRoutine'; crewId: string; routine: Routine }
  | { type: 'study'; researchId: string };

export type CommandResult = { state: RunState; error?: string };

export function createRun(seed: number, locale: Locale, mode: Mode = 'standard'): RunState {
  const s = seed >>> 0;
  return {
    schemaVersion: SCHEMA_VERSION,
    contentVersion: CONTENT_VERSION,
    runId: `run-${s.toString(36)}`,
    seed: s,
    revision: 0,
    phase: 'identity',
    mode,
    player: generatePlayer(s, locale),
    candidates: generateCandidates(s),
    crewIds: [],
    destination: null,
    site: null,
    cargo: {},
    mission: null,
    manualPause: false,
    speed: 1,
    launched: false,
  };
}

/** The people who will fly: the player plus selected companions. */
export function flyingCrew(run: RunState): Character[] {
  return [run.player, ...run.crewIds.map((id) => run.candidates.find((c) => c.id === id)!).filter(Boolean)];
}

export function payloadOf(run: RunState) {
  return payload(flyingCrew(run), run.cargo);
}

/** Whether the player can move to a preparation phase. */
export function canEnter(run: RunState, phase: Phase): string | null {
  if (run.launched) return 'err.launched';
  const idx = PREP_PHASES.indexOf(phase);
  if (idx < 0) return 'err.phase';
  if (idx >= 2 && !run.destination) return 'err.needDestination';
  if (idx >= 3 && run.crewIds.length !== REQUIRED_COMPANIONS) return 'err.needCrew';
  if (idx >= 4 && payloadOf(run).freeKg < 0) return 'err.overCapacity';
  return null;
}

export function launchBlockers(run: RunState): string[] {
  const out: string[] = [];
  if (!run.destination) out.push('err.needDestination');
  if (run.crewIds.length !== REQUIRED_COMPANIONS) out.push('err.needCrew');
  if (payloadOf(run).freeKg < 0) out.push('err.overCapacity');
  if (incompatibleItems(run.cargo, run.destination).length) out.push('err.incompatible');
  return out;
}

function newCrewState(run: RunState, id: string): CrewState {
  const sk = characterById(run, id).skills;
  // Default routine follows the person's stronger skill; the player can change it on the base screen.
  const routine = sk.science > sk.technical ? 'science' : 'maintenance';
  return { id, health: 100, stress: 15, fatigue: 10, radiation: 0, status: 'active', routine, taskId: null, sheltered: false, warned: false };
}

function createMission(run: RunState): MissionState {
  const s = scenarioFor(run.destination!, run.site);
  const items: MissionState['items'] = {};
  for (const [k, v] of Object.entries(run.cargo)) if (v) items[k as ItemId] = v;
  const resources = { ...s.start.resources };
  const systems = { ...s.start.systems };
  // Cargo is applied once, at launch. Battery modules add capacity (they store, not produce, energy).
  const batteries = items.battery ?? 0;
  resources.batteryCapKWh += 25 * batteries;
  resources.batteryKWh += 20 * batteries;
  resources.foodCrewDays += 12 * (items.food ?? 0);
  if ((items.shield ?? 0) > 0) systems.shelter = Math.min(100, systems.shelter + 30);
  const crew = ['player', ...run.crewIds].map((id) => newCrewState(run, id));
  return {
    minute: 0,
    resources,
    systems,
    greenhouseMode: s.start.greenhouseMode,
    crop: 'greens',
    ghCover: 'auto',
    h2Mode: 'vent',
    env: { ...s.start.env },
    crew,
    items,
    queue: buildSchedule(run.seed, s),
    activeEvent: null,
    resolved: [],
    decisions: [],
    tasks: [],
    journal: [],
    journalSeq: 0,
    flags: {},
    research: [],
    echoes: [],
    harvests: 0,
    chatUsed: [],
    nextChatMinute: SURFACE_START_MINUTE + 60,
    lastPower: null,
    lastFlows: null,
    unmet: { o2Hours: 0, waterHours: 0, foodHours: 0, powerKWh: 0 },
    ended: null,
  };
}

/** The single entry point for every state change. Never mutates the input. */
export function applyCommand(input: RunState, cmd: Command): CommandResult {
  const run: RunState = structuredClone(input);
  const res = reduce(run, cmd);
  if (res.error) return { state: input, error: res.error };
  if (cmd.type !== 'advance') run.revision += 1;
  return { state: run };
}

function reduce(run: RunState, cmd: Command): { error?: string } {
  const prep = PREP_PHASES.includes(run.phase) && !run.launched;
  switch (cmd.type) {
    case 'renamePlayer': {
      if (!prep) return { error: 'err.launched' };
      const name = sanitizeName(cmd.name);
      run.player.name = name || fallbackName(run.seed, 'player', cmd.locale);
      run.player.customName = !!name;
      return {};
    }
    case 'renameCandidate': {
      if (!prep) return { error: 'err.launched' };
      const c = run.candidates.find((x) => x.id === cmd.id);
      if (!c) return { error: 'err.unknownCandidate' };
      const name = sanitizeName(cmd.name);
      c.name = name || fallbackName(run.seed, c.id, cmd.locale);
      c.customName = !!name;
      return {};
    }
    case 'rerollProfile': {
      if (!prep) return { error: 'err.launched' };
      const keepName = run.player.customName ? run.player.name : null;
      const fresh = createRun(cmd.seed, cmd.locale, run.mode);
      fresh.destination = run.destination;
      fresh.cargo = run.cargo;
      fresh.phase = run.phase;
      fresh.revision = run.revision;
      if (keepName) {
        fresh.player.name = keepName;
        fresh.player.customName = true;
      }
      Object.assign(run, fresh);
      return {};
    }
    case 'setMode':
      if (!prep) return { error: 'err.launched' };
      run.mode = cmd.mode;
      return {};
    case 'goTo': {
      const err = canEnter(run, cmd.phase);
      if (err) return { error: err };
      run.phase = cmd.phase;
      return {};
    }
    case 'setDestination':
      if (!prep) return { error: 'err.launched' };
      if (!SITES[cmd.destination]) return { error: 'err.phase' };
      run.destination = cmd.destination; // crew & cargo are kept; incompatible items block launch with a reason
      if (!run.site || !SITES[cmd.destination].includes(run.site)) run.site = SITES[cmd.destination][0];
      return {};
    case 'setSite':
      if (!prep) return { error: 'err.launched' };
      if (!run.destination || !SITES[run.destination].includes(cmd.site)) return { error: 'err.phase' };
      run.site = cmd.site;
      return {};
    case 'toggleCrew': {
      if (!prep) return { error: 'err.launched' };
      if (!run.candidates.some((c) => c.id === cmd.id)) return { error: 'err.unknownCandidate' };
      if (run.crewIds.includes(cmd.id)) run.crewIds = run.crewIds.filter((x) => x !== cmd.id);
      else {
        if (run.crewIds.length >= REQUIRED_COMPANIONS) return { error: 'err.crewFull' };
        run.crewIds.push(cmd.id);
      }
      return {};
    }
    case 'setCargo': {
      if (!prep) return { error: 'err.launched' };
      const e = validateQuantity(flyingCrew(run), run.cargo, cmd.itemId, cmd.qty);
      if (e) return { error: `err.cargo.${e}` };
      if (cmd.qty === 0) delete run.cargo[cmd.itemId as ItemId];
      else run.cargo[cmd.itemId as ItemId] = cmd.qty;
      return {};
    }
    case 'launch': {
      if (run.launched) return { error: 'err.launched' };
      const blockers = launchBlockers(run);
      if (blockers.length) return { error: blockers[0] };
      run.launched = true;
      run.phase = 'outbound';
      run.mission = createMission(run);
      log(run.mission, run, 'journal.launch', 'info', { dest: run.destination! });
      openEvent(run, 'OUT-01', 'OUT-01', makeHooks(run));
      return {};
    }
    case 'resolve':
      return resolveDecision(run, cmd.instanceId, cmd.optionId, cmd.crewIds);
    case 'beginSurface': {
      if (run.phase !== 'landing') return { error: 'err.phase' };
      run.phase = 'surface';
      run.mission!.minute = SURFACE_START_MINUTE;
      log(run.mission!, run, 'journal.surfaceStart', 'info');
      return {};
    }
    case 'advance':
      advanceTime(run, cmd.minutes);
      return {};
    case 'setPause':
      run.manualPause = cmd.paused;
      return {};
    case 'setSpeed':
      if (![1, 2, 4, 8, 16].includes(cmd.speed)) return { error: 'err.phase' };
      run.speed = cmd.speed;
      return {};
    case 'setGreenhouse': {
      const m = run.mission;
      if (!m || run.phase !== 'surface') return { error: 'err.phase' };
      if (m.greenhouseMode !== cmd.mode) {
        m.greenhouseMode = cmd.mode;
        log(m, run, `journal.gh.${cmd.mode}`, 'info');
      }
      return {};
    }
    case 'setCover': {
      const m = run.mission;
      if (!m || run.phase !== 'surface') return { error: 'err.phase' };
      m.ghCover = cmd.mode;
      return {};
    }
    case 'setRoutine': {
      const m = run.mission;
      const c = m?.crew.find((x) => x.id === cmd.crewId);
      if (!m || !c || c.status !== 'active') return { error: 'err.unknownCandidate' };
      c.routine = cmd.routine;
      return {};
    }
    case 'study': {
      const m = run.mission;
      if (!m) return { error: 'err.phase' };
      if (!RESEARCH_BY_ID[cmd.researchId]) return { error: 'err.unknownResearch' };
      if (!m.research.includes(cmd.researchId)) {
        m.research.push(cmd.researchId);
        m.resources.science += 1;
        log(m, run, 'journal.studied', 'info', { research: cmd.researchId });
      }
      return {};
    }
  }
}

/**
 * Validates eligibility and cost, applies the decision exactly once, records the cause.
 * Long tasks pay cost now and apply their effect when the task completes.
 */
export function resolveDecision(run: RunState, instanceId: string, optionId: string, crewIds: string[]): { error?: string } {
  const m = run.mission;
  if (!m || !m.activeEvent) return { error: 'err.noEvent' };
  if (m.activeEvent.instanceId !== instanceId || m.resolved.includes(instanceId)) return { error: 'err.alreadyResolved' };
  const ev = eventOf(m.activeEvent.eventId);
  const option = ev.options.find((o) => o.id === optionId);
  if (!option) return { error: 'err.unknownOption' };
  const state = optionState(run, option, m.activeEvent);
  if (!state.available) return { error: 'err.optionLocked' };

  // crew validation
  const unique = [...new Set(crewIds)];
  if (option.crew) {
    if (unique.length !== option.crew.count) return { error: 'err.crewCount' };
    const free = availableCrewFor(run, option).map((c) => c.id);
    if (!unique.every((id) => free.includes(id))) return { error: 'err.crewUnavailable' };
  } else if (unique.length) return { error: 'err.crewCount' };

  const event = m.activeEvent;
  const echoes = echoesFor(run, ev, option, unique);
  const ctx: Ctx = { run, m, scenario: scenarioOf(run), event, assigned: unique };
  const hooks = makeHooks(run);

  // roll at commit time only
  let probability: number | null = null;
  let roll: number | null = null;
  let success = true;
  if (option.check) {
    probability = successChance(run, option.check, unique).p;
    roll = rollFor(run, instanceId, optionId);
    success = roll < probability;
  }

  m.resolved.push(instanceId);
  m.activeEvent = null;
  m.decisions.push({ instanceId, eventId: ev.id, optionId, crewIds: unique, minute: m.minute, phase: run.phase, probability, roll, success, weight: option.weight });
  log(m, run, 'journal.decision', 'info', { event: ev.id, option: optionId, names: unique.map((id) => characterById(run, id).name).join(' & ') });
  for (const e of echoes) {
    m.echoes.push(e);
    log(m, run, `journal.echo.${e.source.kind}`, 'echo', {
      item: e.source.kind === 'item' ? e.source.itemId : '',
      trait: e.source.kind === 'trait' ? e.source.traitId : '',
      name: e.source.kind === 'trait' ? characterById(run, e.source.crewId).name : '',
      research: e.source.kind === 'research' ? e.source.researchId : '',
    });
  }

  applyEffects(ctx, option.cost ?? [], hooks);

  if (option.hours && run.phase === 'surface') {
    const taskId = `${instanceId}:${optionId}`;
    m.tasks.push({ id: taskId, eventInstanceId: instanceId, eventId: ev.id, optionId, crewIds: unique, startedAt: m.minute, endsAt: m.minute + option.hours * 60, success });
    for (const id of unique) {
      const c = m.crew.find((x) => x.id === id)!;
      c.taskId = taskId;
    }
  } else {
    applyEffects(ctx, success ? option.success : (option.failure ?? option.success), hooks);
    log(m, run, `ev.${ev.id}.${optionId}.${success ? 'ok' : 'fail'}`, success ? 'good' : 'warn', {
      names: unique.map((id) => characterById(run, id).name).join(' & '),
    });
  }

  afterDecision(run, hooks);
  return {};
}

function afterDecision(run: RunState, hooks: ReturnType<typeof makeHooks>) {
  const m = run.mission!;
  if (m.ended) {
    run.phase = 'debrief';
    return;
  }
  // losses from decision effects
  for (const c of m.crew) {
    if (c.status === 'active' && c.health <= 0) {
      c.status = run.mode === 'explorer' ? 'evacuated' : 'deceased';
      log(m, run, run.mode === 'explorer' ? 'journal.lossExplorer' : 'journal.loss', 'loss', { name: characterById(run, c.id).name, cause: 'injury' });
    }
  }
  if (m.crew.find((c) => c.id === 'player')!.status !== 'active') {
    if (run.mode === 'explorer') hooks.abort();
    else m.ended = { reason: 'playerLost', minute: m.minute };
    run.phase = 'debrief';
    return;
  }

  switch (run.phase) {
    case 'outbound': {
      const pre = m.flags.preflight;
      if (pre === 'none') {
        m.systems.lifeSupport = 88;
        log(m, run, 'journal.hiddenFault', 'warn');
      } else {
        log(m, run, 'journal.preflightGood', 'good');
      }
      if (m.flags.landingTrim) m.resources.batteryKWh = Math.min(m.resources.batteryCapKWh, m.resources.batteryKWh + m.resources.batteryCapKWh * 0.15);
      run.phase = 'landing';
      log(m, run, 'journal.landed', 'good', { dest: run.destination! });
      break;
    }
    case 'surface':
      checkEmergencies(run, hooks);
      break;
    case 'returnPrep': {
      if (m.flags.waited === true && !m.resolved.includes('RETURN-01#2') && m.decisions.at(-1)?.optionId === 'wait') {
        openEvent(run, 'RETURN-01', 'RETURN-01#2', hooks);
        break;
      }
      // Load the ascent vehicle: return needs are committed to the trip.
      run.phase = 'returnFlight';
      log(m, run, 'journal.ascent', 'good');
      openEvent(run, 'RETURN-02', 'RETURN-02', hooks);
      break;
    }
    case 'returnFlight':
      m.ended = { reason: 'complete', minute: m.minute };
      run.phase = 'debrief';
      log(m, run, 'journal.home', 'good');
      break;
  }
}
