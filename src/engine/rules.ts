import type { Check, Cond, CrewTarget, Effect, EventDef, EventOption } from './events';
import { EVENT_BY_ID } from './events';
import { Rng, deriveSeed } from './rng';
import type { ScenarioDefinition } from './scenarios';
import { CROPS, scenarioFor } from './scenarios';
import type { ActiveEvent, Character, CrewState, Echo, JournalEntry, MissionState, RunState, SkillKey } from './types';

// ---------- lookup helpers ----------

export function scenarioOf(run: RunState): ScenarioDefinition {
  if (!run.destination) throw new Error('no destination');
  return scenarioFor(run.destination, run.site);
}

export function allCharacters(run: RunState): Character[] {
  return [run.player, ...run.candidates];
}

export function characterById(run: RunState, id: string): Character {
  const c = id === 'player' ? run.player : run.candidates.find((x) => x.id === id);
  if (!c) throw new Error(`unknown character ${id}`);
  return c;
}

export function activeCrew(m: MissionState): CrewState[] {
  return m.crew.filter((c) => c.status === 'active');
}

export function log(m: MissionState, run: RunState, key: string, tone: JournalEntry['tone'] = 'info', params?: JournalEntry['params']) {
  m.journalSeq += 1;
  m.journal.push({ id: m.journalSeq, minute: m.minute, phase: run.phase, key, tone, params });
}

export function dayOf(minute: number): number {
  return Math.floor(minute / 1440) + 1;
}

// ---------- return readiness ----------

export type ReturnLine = { key: 'food' | 'o2' | 'water' | 'battery' | 'crew'; have: number; need: number; ok: boolean };

export function returnStatus(run: RunState, m: MissionState): { lines: ReturnLine[]; ready: boolean } {
  const s = scenarioOf(run);
  const n = activeCrew(m).length;
  const r = m.resources;
  const lines: ReturnLine[] = [
    { key: 'crew', have: n, need: 1, ok: n >= 1 && activeCrew(m).some((c) => c.id === 'player') },
    { key: 'food', have: r.foodCrewDays, need: n * s.returnNeeds.foodPerCrew, ok: r.foodCrewDays >= n * s.returnNeeds.foodPerCrew },
    { key: 'o2', have: r.o2Kg, need: n * s.returnNeeds.o2PerCrew, ok: r.o2Kg >= n * s.returnNeeds.o2PerCrew },
    { key: 'water', have: r.waterL, need: n * s.returnNeeds.waterPerCrew, ok: r.waterL >= n * s.returnNeeds.waterPerCrew },
    {
      key: 'battery',
      have: r.batteryKWh,
      need: s.returnNeeds.batteryKWh,
      ok: r.batteryKWh >= s.returnNeeds.batteryKWh - 1e-9,
    },
  ];
  return { lines, ready: lines.every((l) => l.ok) };
}

// ---------- conditions ----------

export type Ctx = {
  run: RunState;
  m: MissionState;
  scenario: ScenarioDefinition;
  event: ActiveEvent | null;
  assigned: string[];
};

export function hasTrait(run: RunState, m: MissionState, trait: string, ids?: string[]): string | null {
  const pool = ids ?? activeCrew(m).map((c) => c.id);
  for (const id of pool) {
    const crew = m.crew.find((c) => c.id === id);
    if (crew?.status === 'active' && characterById(run, id).traitId === trait) return id;
  }
  return null;
}

export function evalCond(ctx: Ctx, cond: Cond): boolean {
  const { run, m } = ctx;
  switch (cond.kind) {
    case 'item':
      return (m.items[cond.item] ?? 0) > 0;
    case 'trait':
      return hasTrait(run, m, cond.trait) !== null;
    case 'assignedTrait':
      return hasTrait(run, m, cond.trait, ctx.assigned) !== null;
    case 'research':
      return m.research.includes(cond.id);
    case 'batteryFrac':
      return m.resources.batteryKWh / m.resources.batteryCapKWh >= cond.min;
    case 'flag':
      return m.flags[cond.key] === cond.value;
    case 'notFlag':
      return m.flags[cond.key] !== cond.value;
    case 'flagIn':
      return cond.values.includes(m.flags[cond.key] as never);
    case 'returnReady':
      return returnStatus(run, m).ready;
    case 'notReturnReady':
      return !returnStatus(run, m).ready;
    case 'envBelow':
      return (m.env[cond.key] as number) <= cond.max;
    case 'subjectIsPlayer':
      return ctx.event?.subjectCrewId === 'player';
    case 'notSubjectIsPlayer':
      return ctx.event?.subjectCrewId !== 'player';
    case 'site':
      return !!run.site && cond.sites.includes(run.site);
    case 'cropIs':
      return m.crop === cond.crop;
    case 'cropNot':
      return m.crop !== cond.crop;
    case 'sysMin':
      return m.systems[cond.key] >= cond.min;
    case 'envMin':
      return (m.env[cond.key] as number) >= cond.min;
    case 'batteryCapMin':
      return m.resources.batteryCapKWh >= cond.min;
    case 'dest':
      return run.destination === cond.dest;
    case 'any':
      return cond.of.some((c) => evalCond(ctx, c));
  }
}

// ---------- option availability ----------

export type LockReason = { key: string; params?: Record<string, string | number>; alts?: LockReason[] };

export function availableCrewFor(run: RunState, option: EventOption): CrewState[] {
  const m = run.mission!;
  const away = m.activeEvent?.subjects ?? [];
  return activeCrew(m).filter(
    (c) =>
      !c.taskId &&
      !away.includes(c.id) &&
      !(option.crew?.outside && (c.sheltered || m.env.speHours > 0)) &&
      (!option.crew?.mustHave || characterById(run, c.id).traitId === option.crew.mustHave),
  );
}

export function optionState(run: RunState, option: EventOption, event: ActiveEvent | null) {
  const m = run.mission!;
  const ctx: Ctx = { run, m, scenario: scenarioOf(run), event, assigned: [] };
  const reasons: LockReason[] = [];
  for (const cond of option.requires ?? []) {
    if (!evalCond(ctx, cond)) reasons.push(lockReason(cond));
  }
  if (option.crew) {
    const free = availableCrewFor(run, option).length;
    if (free < option.crew.count) {
      reasons.push({ key: option.crew.outside && m.env.speHours > 0 ? 'lock.radiationOutside' : 'lock.crewBusy', params: { n: option.crew.count } });
    }
  }
  return { available: reasons.length === 0, reasons };
}

function lockReason(cond: Cond): LockReason {
  switch (cond.kind) {
    case 'item':
      return { key: 'lock.item', params: { item: cond.item } };
    case 'trait':
    case 'assignedTrait':
      return { key: 'lock.trait', params: { trait: cond.trait } };
    case 'research':
      return { key: 'lock.research', params: { research: cond.id } };
    case 'batteryFrac':
      return { key: 'lock.battery', params: { pct: Math.round(cond.min * 100) } };
    case 'returnReady':
      return { key: 'lock.returnReady' };
    case 'notReturnReady':
      return { key: 'lock.notNeeded' };
    case 'envBelow':
      return { key: cond.key === 'leakKgH' ? 'lock.leak' : 'lock.stormTooStrong' };
    case 'subjectIsPlayer':
    case 'notSubjectIsPlayer':
      return { key: 'lock.subject' };
    case 'any':
      return { key: 'lock.any', alts: cond.of.map((c) => lockReason(c)) };
    case 'flag':
    case 'notFlag':
    case 'flagIn':
      return { key: `lock.flag.${cond.key}` };
    case 'site':
      return { key: 'lock.site' };
    case 'cropIs':
      return { key: 'lock.cropIs', params: { crop: cond.crop } };
    case 'cropNot':
      return { key: 'lock.cropNot', params: { crop: cond.crop } };
    case 'sysMin':
      return { key: 'lock.sysMin', params: { sys: cond.key, min: cond.min } };
    case 'envMin':
      return { key: 'lock.envMin' };
    case 'batteryCapMin':
      return { key: 'lock.batteryCap', params: { min: cond.min } };
    case 'dest':
      return { key: 'lock.site' };
  }
}

// ---------- crew suggestion & probability ----------

function fitScore(run: RunState, c: CrewState, skill: SkillKey, traits?: string[]): number {
  const ch = characterById(run, c.id);
  return ch.skills[skill] + (traits?.includes(ch.traitId) ? 20 : 0) - c.fatigue * 0.3 - c.stress * 0.1;
}

export function suggestCrew(run: RunState, option: EventOption): string[] {
  if (!option.crew) return [];
  return availableCrewFor(run, option)
    .slice()
    .sort((a, b) => fitScore(run, b, option.crew!.skill, option.crew!.traits) - fitScore(run, a, option.crew!.skill, option.crew!.traits) || a.id.localeCompare(b.id))
    .slice(0, option.crew.count)
    .map((c) => c.id);
}

export type Factor = { key: string; value: number; params?: Record<string, string | number> };

export const P_MIN = 0.05;
export const P_MAX = 0.95;
/** v0.6 difficulty: every check's base chance is 15% lower than the written value (gameplay tuning). */
export const DIFFICULTY = 0.85;
/** v0.6: tasks tire people more (fatigue costs ×1.4, gameplay tuning). */
export const FATIGUE_COST = 1.4;

/** Costs as applied: fatigue costs scaled by FATIGUE_COST. */
export function scaledCost(effects: Effect[]): Effect[] {
  return effects.map((e) => (e.kind === 'crew' && e.stat === 'fatigue' && e.delta > 0 ? { ...e, delta: Math.round(e.delta * FATIGUE_COST) } : e));
}

/**
 * Gameplay formula (not a NASA probability):
 * p = clamp(base + skillFit + traitBonus + equipment + earth - fatigue - stress - hazard, 5%, 95%)
 */
export function successChance(run: RunState, check: Check, crewIds: string[]): { p: number; factors: Factor[] } {
  const m = run.mission!;
  const s = scenarioOf(run);
  const factors: Factor[] = [{ key: 'base', value: check.base * DIFFICULTY }];
  const crew = crewIds.map((id) => m.crew.find((c) => c.id === id)!).filter(Boolean);
  const chars = crew.map((c) => characterById(run, c.id));
  if (chars.length) {
    const skills = chars.map((c) => c.skills[check.skill]).sort((a, b) => b - a);
    let fit = ((skills[0] - 50) / 100) * 0.8;
    for (const extra of skills.slice(1)) fit += ((extra - 50) / 100) * 0.15 + 0.05;
    factors.push({ key: 'skill', value: fit, params: { skill: check.skill } });
    if (chars.length > 1) {
      const tw = chars.reduce((a, c) => a + c.skills.teamwork, 0) / chars.length;
      factors.push({ key: 'teamwork', value: ((tw - 50) / 100) * 0.25 });
    }
    const traitHolder = chars.find((c) => check.traits?.includes(c.traitId));
    if (traitHolder) factors.push({ key: 'trait', value: 0.15, params: { trait: traitHolder.traitId, name: traitHolder.name } });
    const fatigue = crew.reduce((a, c) => a + c.fatigue, 0) / crew.length;
    const stress = crew.reduce((a, c) => a + c.stress, 0) / crew.length;
    if (fatigue > 0) factors.push({ key: 'fatigue', value: -(fatigue / 100) * 0.25 });
    if (stress > 0) factors.push({ key: 'stress', value: -(stress / 100) * 0.15 });
  }
  for (const it of check.items ?? []) {
    if ((m.items[it.item] ?? 0) > 0) factors.push({ key: 'item', value: it.bonus, params: { item: it.item } });
  }
  for (const f of check.flags ?? []) {
    if (m.flags[f.key] === f.value) factors.push({ key: `flag.${f.key}.${String(f.value)}`, value: f.bonus });
  }
  if (check.earth && s.commDelay === 'seconds') {
    factors.push({ key: 'earth', value: 0.08 });
    if (hasTrait(run, m, 'comms')) factors.push({ key: 'earthComms', value: 0.06 });
  }
  // Mars: Earth answers 4–21 minutes late, but a communications officer makes the support usable
  else if (check.earth && hasTrait(run, m, 'comms')) factors.push({ key: 'earthComms', value: 0.05 });
  if (check.hazard) factors.push({ key: 'hazard', value: -check.hazard });
  const raw = factors.reduce((a, f) => a + f.value, 0);
  return { p: Math.min(P_MAX, Math.max(P_MIN, raw)), factors };
}

// ---------- echoes (preparation paying off) ----------

export function echoesFor(run: RunState, event: EventDef, option: EventOption, crewIds: string[]): Echo[] {
  const m = run.mission!;
  const ctx: Ctx = { run, m, scenario: scenarioOf(run), event: m.activeEvent, assigned: crewIds };
  const out: Echo[] = [];
  const visit = (cond: Cond) => {
    if (cond.kind === 'any') {
      const first = cond.of.find((c) => evalCond(ctx, c));
      if (first) visit(first);
      return;
    }
    if (cond.kind === 'item') out.push({ eventId: event.id, optionId: option.id, source: { kind: 'item', itemId: cond.item } });
    if (cond.kind === 'trait') {
      const crewId = hasTrait(run, m, cond.trait, crewIds.length ? crewIds : undefined) ?? hasTrait(run, m, cond.trait)!;
      out.push({ eventId: event.id, optionId: option.id, source: { kind: 'trait', traitId: cond.trait, crewId } });
    }
    if (cond.kind === 'research') out.push({ eventId: event.id, optionId: option.id, source: { kind: 'research', researchId: cond.id } });
  };
  for (const c of option.requires ?? []) visit(c);
  if (option.check) {
    for (const it of option.check.items ?? []) {
      if ((m.items[it.item] ?? 0) > 0 && !out.some((e) => e.source.kind === 'item' && e.source.itemId === it.item)) {
        out.push({ eventId: event.id, optionId: option.id, source: { kind: 'item', itemId: it.item } });
      }
    }
    const holder = crewIds.find((id) => option.check!.traits?.includes(characterById(run, id).traitId));
    if (holder && !out.some((e) => e.source.kind === 'trait')) {
      out.push({ eventId: event.id, optionId: option.id, source: { kind: 'trait', traitId: characterById(run, holder).traitId, crewId: holder } });
    }
  }
  return out;
}

// ---------- effects ----------

const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));

function targets(ctx: Ctx, target: CrewTarget): CrewState[] {
  const act = activeCrew(ctx.m);
  switch (target) {
    case 'all':
      return act;
    case 'assigned':
      return act.filter((c) => ctx.assigned.includes(c.id));
    case 'unassigned':
      return act.filter((c) => !ctx.assigned.includes(c.id));
    case 'subject':
      return act.filter((c) => c.id === ctx.event?.subjectCrewId || (ctx.event?.subjects ?? []).includes(c.id));
  }
}

export type EffectHooks = { wait: (hours: number) => void; abort: () => void };

export function applyEffects(ctx: Ctx, effects: Effect[], hooks: EffectHooks) {
  const { m, run } = ctx;
  for (const e of effects) {
    switch (e.kind) {
      case 'res':
        m.resources[e.key] = Math.max(0, m.resources[e.key] + e.delta);
        if (e.key === 'batteryKWh') m.resources.batteryKWh = Math.min(m.resources.batteryCapKWh, m.resources.batteryKWh);
        break;
      case 'scienceFactor':
        m.resources.science = Math.round(m.resources.science * e.factor * 10) / 10;
        break;
      case 'sys':
        m.systems[e.key] = clamp(m.systems[e.key] + e.delta);
        break;
      case 'sysSet':
        m.systems[e.key] = clamp(e.value);
        break;
      case 'env':
        m.env[e.key] = e.value;
        break;
      case 'gh':
        // remember what it was, so temporary modes (storm, shadow, night) can restore it instead of forcing "full"
        if (m.greenhouseMode !== e.mode) m.flags.ghBefore = m.greenhouseMode;
        m.greenhouseMode = e.mode;
        break;
      case 'flag':
        m.flags[e.key] = e.value;
        break;
      case 'crew':
        for (const c of targets(ctx, e.target)) {
          const resist = e.stat === 'stress' && e.delta > 0 ? stressResistance(run, c.id) : 1;
          c[e.stat] = clamp(c[e.stat] + e.delta * resist);
        }
        break;
      case 'shelter':
        for (const c of targets(ctx, e.target)) c.sheltered = e.value;
        break;
      case 'rest':
        for (const c of targets(ctx, e.target)) c.routine = 'rest';
        break;
      case 'inc':
        m.flags[e.key] = (typeof m.flags[e.key] === 'number' ? (m.flags[e.key] as number) : 0) + e.by;
        break;
      case 'scheduleBig': {
        // announced right now (the offer card is the announcement); the hit opens `days` later
        const id = e.big === 'crew' ? 'crew' : `resupply${m.big.filter((b) => b.kind === 'resupply').length + 1}`;
        // e.g. the reinforcement crew never lands before day 20 (10:00), and never sooner than `days` from now
        const earliest = e.notBeforeDay ? (e.notBeforeDay - 1) * 1440 + 10 * 60 : 0;
        const startAt = Math.max(m.minute + e.days * 1440, earliest);
        const hitEventId = e.big === 'crew' ? 'REINF' : 'RESUPPLY';
        m.big.push({ id, kind: e.big, announceAt: m.minute, startAt, endAt: startAt + 60, hitEventId, closed: false });
        m.queue.push({ eventId: hitEventId, atMinute: startAt, instanceId: `${hitEventId}@${id}` });
        m.queue.sort((a, b) => a.atMinute - b.atMinute);
        break;
      }
      case 'arrive': {
        // the reinforcement crew are candidates who stayed on Earth, picked from the seed
        const left = run.candidates.filter((c) => !m.crew.some((x) => x.id === c.id));
        const pick = new Rng(deriveSeed(run.seed, 'reinforce')).shuffle(left.map((c) => c.id)).slice(0, e.count);
        for (const id of pick) {
          const sk = characterById(run, id).skills;
          m.crew.push({ id, health: 100, stress: 20, fatigue: 30, radiation: 0, status: 'active', routine: sk.science > sk.technical ? 'science' : 'maintenance', taskId: null, sheltered: false, warned: false });
        }
        log(m, run, 'journal.arrived', 'good', { names: pick.map((id) => characterById(run, id).name).join(' & ') });
        break;
      }
      case 'addItem':
        m.items[e.item] = (m.items[e.item] ?? 0) + e.qty;
        log(m, run, 'journal.itemAdded', 'good', { item: e.item, qty: e.qty });
        break;
      case 'use': {
        const have = m.items[e.item] ?? 0;
        m.items[e.item] = Math.max(0, have - (e.qty ?? 1));
        log(m, run, 'journal.itemUsed', 'echo', { item: e.item });
        break;
      }
      case 'evacuate':
        for (const c of targets(ctx, 'subject')) {
          c.status = 'evacuated';
          c.taskId = null;
          log(m, run, 'journal.evacuated', 'warn', { name: characterById(run, c.id).name });
        }
        break;
      case 'harvestNow': {
        const food = CROPS[m.crop].yield * e.fraction * (m.systems.greenhouseGrowth / 100) * (m.systems.greenhouseHealth / 100) * nutritionBonus(run, m);
        m.resources.foodCrewDays += food;
        m.systems.greenhouseGrowth = 0;
        m.harvests += 1;
        log(m, run, 'journal.harvestEarly', 'info', { food: round1(food) });
        break;
      }
      case 'wait':
        hooks.wait(e.hours);
        break;
      case 'abort':
        hooks.abort();
        break;
      case 'note':
        log(m, run, e.key, e.tone ?? 'info');
        break;
      case 'if':
        applyEffects(ctx, evalCond(ctx, e.cond) ? e.then : (e.else ?? []), hooks);
        break;
      case 'setCrop':
        m.crop = e.crop;
        m.systems.greenhouseGrowth = e.growth;
        log(m, run, 'journal.planted', 'info', { crop: e.crop });
        break;
      case 'harvest':
        harvest(ctx, e.fraction, e.regrow);
        break;
      case 'h2':
        m.h2Mode = e.mode;
        break;
      case 'cover':
        m.ghCover = e.mode;
        break;
    }
  }
}

/** Harvest the greenhouse. Yield depends on crop and plant health; soy adds protein (health). */
export function harvest(ctx: Ctx, fraction: number, regrow: number) {
  const { m, run } = ctx;
  const food =
    CROPS[m.crop].yield * (m.systems.greenhouseHealth / 100) * fraction * (m.systems.greenhouseGrowth >= 100 ? 1 : m.systems.greenhouseGrowth / 100) * nutritionBonus(run, m);
  m.resources.foodCrewDays += food;
  m.systems.greenhouseGrowth = regrow;
  m.harvests += 1;
  log(m, run, 'journal.harvest', 'good', { food: round1(food), crop: m.crop });
  if (m.crop === 'soy') {
    for (const c of activeCrew(m)) {
      c.health = Math.min(100, c.health + 8);
      c.stress = Math.max(0, c.stress - 4);
    }
    log(m, run, 'journal.protein', 'good');
  }
}

/** A nutritionist gets 10% more food out of every harvest (careful processing, less waste; gameplay rule). */
export function nutritionBonus(run: RunState, m: MissionState): number {
  return hasTrait(run, m, 'nutrition') ? 1.1 : 1;
}

/** Experience and the "steady" trait damp stress gains (explained in the identity screen). */
export function stressResistance(run: RunState, id: string): number {
  const ch = characterById(run, id);
  const exp = Math.min(ch.profile.experienceYears, 16) / 16; // 0..1
  return (ch.traitId === 'steady' ? 0.6 : 1) * (1 - exp * 0.25);
}

export const round1 = (v: number) => Math.round(v * 10) / 10;

export function eventOf(id: string): EventDef {
  const ev = EVENT_BY_ID[id];
  if (!ev) throw new Error(`unknown event ${id}`);
  return ev;
}
