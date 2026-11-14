import { incompatibleItems, payload, validateQuantity } from './cargo';
import { fallbackName, generateCandidates, generatePlayer, playerName, sanitizeName } from './characters';
import { RESEARCH_BY_ID } from './research';
import { availableCrewFor, characterById, echoesFor, eventOf, log, optionState, returnStatus, scaledCost, scenarioOf, successChance, applyEffects, type Ctx } from './rules';
import { MISSION_DAYS, SITES, SURFACE_START_MINUTE, scenarioFor } from './scenarios';
import { landingsFor, pickLanding, referenceLanding } from './landing';
import { buildSchedule } from './schedule';
import { PREP_EVENT, bigQueue, bigStatus, buildBigEvents, prepStatusKey } from './bigevents';
import { bulletinPlan, firstSep, type SpaceWeatherSnapshot } from './spaceweather';
import { DEPART_HOUR, advanceTime, makeHooks, maybeOfferReinforcement, nextDeparture, openEvent, rollFor, checkEmergencies, snapshot, tickHour } from './sim';
import type { Character, CoverMode, CrewState, DestinationId, GreenhouseMode, ItemId, Locale, MissionState, Mode, Phase, Routine, RunState, SiteId, Speed } from './types';
import { PREP_PHASES } from './types';

export const SCHEMA_VERSION = 7;
export const CONTENT_VERSION = '0.8.0-landing';
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
  | { type: 'study'; researchId: string }
  | { type: 'prep'; bigId: string; actionId: string; crewIds: string[] }
  | { type: 'setSpaceWeather'; snapshot: SpaceWeatherSnapshot | null }
  | { type: 'localizeNames'; locale: Locale }
  /** start the return now (before day 30); the return checklist decides how comfortable it is */
  | { type: 'returnHome' };

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
    candidates: generateCandidates(s, locale),
    crewIds: [],
    destination: null,
    site: null,
    landing: null,
    cargo: {},
    mission: null,
    manualPause: false,
    // 2×: a day passes in 30 s, so a month takes about a quarter of an hour plus decisions
    speed: 2,
    launched: false,
    spaceWeather: null,
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

/**
 * Pre-launch endurance estimate: a quiet run of the same physics (no events, greenhouse eaten as it
 * ripens) until the first return reserve would no longer be met, checked each local noon. The goal is
 * 85% of it, leaving room for whatever happens up there. Pure and deterministic.
 */
export function estimateStay(run: RunState): MissionState['goal'] {
  const r: RunState = { ...structuredClone({ ...run, spaceWeather: null }), launched: true, phase: 'landing' };
  if (!r.landing) {
    const l = r.site ? referenceLanding(r.destination!, r.site) : pickLanding(r.seed, r.destination!);
    r.landing = l.id;
    r.site = l.base;
  }
  r.mission = baseMission(r, true);
  r.mission.minute = SURFACE_START_MINUTE;
  const hooks = makeHooks(r);
  const end = MISSION_DAYS * 1440;
  let estimate = MISSION_DAYS;
  let limiting: MissionState['goal']['limiting'] = null;
  while (r.mission.minute < end) {
    tickHour(r, hooks);
    if (r.mission.minute % 1440 === 12 * 60) {
      const short = returnStatus(r, r.mission).lines.find((l) => !l.ok && l.key !== 'crew');
      if (short) {
        estimate = Math.max(0, Math.floor((r.mission.minute - SURFACE_START_MINUTE) / 1440));
        limiting = short.key as MissionState['goal']['limiting'];
        break;
      }
    }
  }
  const target = Math.max(8, Math.min(MISSION_DAYS, Math.floor(estimate * GOAL_SHARE)));
  return { estimate, target, limiting };
}

/** Before launch the site is unknown: the estimate over every possible landing site (min, max, per site). */
export function estimateRange(run: RunState): { min: number; max: number; bySite: Record<string, number> } {
  const bySite: Record<string, number> = {};
  for (const l of landingsFor(run.destination!)) bySite[l.id] = estimateStay({ ...run, landing: l.id, site: l.base }).estimate;
  const v = Object.values(bySite);
  return { min: Math.min(...v), max: Math.max(...v), bySite };
}

/** The goal is this share of the estimate (room for events). */
export const GOAL_SHARE = 0.85;

function createMission(run: RunState): MissionState {
  const m = baseMission(run, false);
  m.goal = estimateStay(run);
  return m;
}

function baseMission(run: RunState, quiet: boolean): MissionState {
  const s = scenarioFor(run.destination!, run.site, run.landing);
  const items: MissionState['items'] = {};
  for (const [k, v] of Object.entries(run.cargo)) if (v) items[k as ItemId] = v;
  const resources = { ...s.start.resources };
  const systems = { ...s.start.systems };
  // Cargo is applied once, at launch. Battery modules add capacity (they store, not produce, energy).
  const batteries = items.battery ?? 0;
  resources.batteryCapKWh += 30 * batteries;
  resources.batteryKWh += 25 * batteries;
  resources.foodCrewDays += 10 * (items.food ?? 0);
  if ((items.shield ?? 0) > 0) systems.shelter = Math.min(100, systems.shelter + 30);
  const crew = ['player', ...run.crewIds].map((id) => newCrewState(run, id));
  const sw = run.spaceWeather;
  const big = quiet ? [] : buildBigEvents(run.seed, s, flyingCrew(run), sw);
  const queue = quiet ? [] : [...buildSchedule(run.seed, s), ...bigQueue(big)].sort((a, b) => a.atMinute - b.atMinute);
  // Moon: a real solar energetic particle event in the window replaces the random particle-event timing
  const sep = sw && s.id === 'moon' ? firstSep(sw) : null;
  if (sep !== null) for (const q of queue) if (q.eventId === 'MOON-03') q.atMinute = sep;
  queue.sort((a, b) => a.atMinute - b.atMinute);
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
    queue,
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
    big,
    goal: { estimate: MISSION_DAYS, target: MISSION_DAYS, limiting: null },
    bulletins: sw && !quiet ? bulletinPlan(sw, s.id) : [],
    history: [],
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
  // the NASA snapshot is immutable once attached: share it instead of deep-copying it 10 times a second
  const { spaceWeather, ...rest } = input;
  const run: RunState = { ...structuredClone(rest), spaceWeather };
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
      fresh.spaceWeather = run.spaceWeather;
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
      // the landing site is a surprise now: it is picked at launch (setSite remains for tests and tools)
      if (run.site && !SITES[cmd.destination].includes(run.site)) run.site = null;
      run.landing = null;
      return {};
    case 'setSite':
      if (!prep) return { error: 'err.launched' };
      if (!run.destination || !SITES[run.destination].includes(cmd.site)) return { error: 'err.phase' };
      run.site = cmd.site;
      run.landing = null;
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
      // the lander sets down at a random site (seeded); an explicit base type maps to its reference site
      if (!run.landing) {
        const l = run.site ? referenceLanding(run.destination!, run.site) : pickLanding(run.seed, run.destination!);
        run.landing = l.id;
        run.site = l.base;
      }
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
      snapshot(run, 0);
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
    case 'prep':
      return startPrep(run, cmd.bigId, cmd.actionId, cmd.crewIds);
    case 'returnHome': {
      const m = run.mission;
      if (!m || run.phase !== 'surface' || m.activeEvent || m.ended) return { error: 'err.phase' };
      if (m.flags.departAt) return { error: 'err.alreadyResolved' };
      // depart in the next midday window so the battery check never depends on the hour you pressed the button
      const at = nextDeparture(m.minute);
      m.flags.departAt = at;
      m.queue.push({ eventId: 'DEPART', atMinute: at, instanceId: 'DEPART' });
      m.queue.sort((a, b) => a.atMinute - b.atMinute);
      log(m, run, 'journal.returnEarly', 'info', { day: Math.floor((m.minute - SURFACE_START_MINUTE) / 1440) + 1, hh: String(DEPART_HOUR).padStart(2, '0') });
      return {};
    }
    case 'localizeNames': {
      // language switched during preparation: generated (not typed) names follow the language
      if (!prep) return {};
      if (!run.player.customName) run.player.name = playerName(run.seed, cmd.locale);
      const fresh = generateCandidates(run.seed, cmd.locale);
      for (const c of run.candidates) if (!c.customName) c.name = fresh.find((f) => f.id === c.id)?.name ?? c.name;
      return {};
    }
    case 'setSpaceWeather':
      if (!prep) return { error: 'err.launched' };
      run.spaceWeather = cmd.snapshot;
      return {};
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

  applyEffects(ctx, scaledCost(option.cost ?? []), hooks);

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

/**
 * Start a preparation task for an announced big event. Same rules as a decision option (requirements,
 * crew, cost, success roll bound to the seed), but it runs while the clock keeps going.
 */
export function startPrep(run: RunState, bigId: string, actionId: string, crewIds: string[]): { error?: string } {
  const m = run.mission;
  if (!m || run.phase !== 'surface') return { error: 'err.phase' };
  if (m.activeEvent) return { error: 'err.noEvent' };
  const big = m.big.find((b) => b.id === bigId);
  if (!big || bigStatus(big, m.minute) !== 'countdown') return { error: 'err.prepClosed' };
  const ev = eventOf(PREP_EVENT[big.kind]);
  const option = ev.options.find((o) => o.id === actionId);
  if (!option) return { error: 'err.unknownOption' };
  const statusKey = prepStatusKey(bigId, actionId);
  if (m.flags[statusKey]) return { error: 'err.alreadyResolved' };
  const state = optionState(run, option, null);
  if (!state.available) return { error: 'err.optionLocked' };
  const unique = [...new Set(crewIds)];
  if (option.crew) {
    if (unique.length !== option.crew.count) return { error: 'err.crewCount' };
    const free = availableCrewFor(run, option).map((c) => c.id);
    if (!unique.every((id) => free.includes(id))) return { error: 'err.crewUnavailable' };
  } else if (unique.length) return { error: 'err.crewCount' };

  const instanceId = `${ev.id}@${bigId}`;
  const hooks = makeHooks(run);
  const ctx: Ctx = { run, m, scenario: scenarioOf(run), event: null, assigned: unique };
  let probability: number | null = null;
  let roll: number | null = null;
  let success = true;
  if (option.check) {
    probability = successChance(run, option.check, unique).p;
    roll = rollFor(run, instanceId, actionId);
    success = roll < probability;
  }
  m.decisions.push({ instanceId: `${instanceId}:${actionId}`, eventId: ev.id, optionId: actionId, crewIds: unique, minute: m.minute, phase: run.phase, probability, roll, success, weight: option.weight });
  for (const e of echoesFor(run, ev, option, unique)) m.echoes.push(e);
  log(m, run, 'journal.prepStarted', 'info', { action: `ev.${ev.id}.${actionId}.label`, names: unique.map((id) => characterById(run, id).name).join(' & ') });
  applyEffects(ctx, scaledCost(option.cost ?? []), hooks);
  if (option.hours) {
    m.flags[statusKey] = 'doing';
    const taskId = `${instanceId}:${actionId}`;
    m.tasks.push({ id: taskId, eventInstanceId: instanceId, eventId: ev.id, optionId: actionId, crewIds: unique, startedAt: m.minute, endsAt: m.minute + option.hours * 60, success });
    for (const id of unique) m.crew.find((x) => x.id === id)!.taskId = taskId;
  } else {
    applyEffects(ctx, success ? option.success : (option.failure ?? option.success), hooks);
    m.flags[statusKey] = success ? 'done' : 'failed';
    log(m, run, `ev.${ev.id}.${actionId}.${success ? 'ok' : 'fail'}`, success ? 'good' : 'warn', { names: '' });
  }
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
      maybeOfferReinforcement(run);
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
