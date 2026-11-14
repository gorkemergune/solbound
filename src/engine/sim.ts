import { decisionRoll } from './rng';
import { activeCrew, applyEffects, characterById, dayOf, eventOf, harvest, log, scenarioOf, type Ctx, type EffectHooks } from './rules';
import { CROPS, surfaceEndMinute } from './scenarios';
import { maybeChat } from './chatter';
import { Rng, deriveSeed } from './rng';
import type { MissionState, PowerReport, RunState } from './types';

const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));

/** Electrolysis: 2 H2O -> 2 H2 + O2, so about 1.125 kg of water per kg of O2 (derived from molar masses). */
export const WATER_PER_KG_O2 = 36.03 / 32.0;
/** Sabatier: CO2 + 4 H2 -> CH4 + 2 H2O. The H2 from making 1 kg O2 (0.126 kg) yields ~0.56 kg water (derived). */
export const SABATIER_WATER_PER_KG_O2 = (4.032 / 32.0) * (36.03 / 8.064);

type LoadKey = keyof PowerReport['servedFraction'];

export function hourOfDay(minute: number) {
  return Math.floor(minute / 60) % 24;
}

/** One fixed simulation step = one mission hour. Pure function of state + scenario. */
export function tickHour(run: RunState, hooks: EffectHooks) {
  const m = run.mission!;
  const s = scenarioOf(run);
  const hour = hourOfDay(m.minute);
  const crew = activeCrew(m);
  const n = crew.length;
  const r = m.resources;
  const sys = m.systems;
  const env = m.env;

  const battery0 = r.batteryKWh;
  const day = dayOf(m.minute);
  const mars = run.destination === 'mars';
  // ---- greenhouse cover (Mars, CR-09): closed at night keeps heat in; must be opened for daylight ----
  const sunUp = s.solarKW(hour, day) > 0.5;
  const maintainer = crew.some((c) => c.routine === 'maintenance' && !c.taskId && !c.sheltered);
  let coverClosed = m.ghCover === 'closed';
  if (m.ghCover === 'auto') {
    coverClosed = maintainer ? !sunUp : false;
    if (mars && !maintainer && !sunUp && !m.flags[`coverForgot@${day}`]) {
      m.flags[`coverForgot@${day}`] = true;
      log(m, run, 'journal.coverForgot', 'warn');
    }
  }
  const coverHeatLoss = mars && !sunUp && !coverClosed;

  // ---- power ----
  const gen = env.darkHours > 0 ? 0 : s.solarKW(hour, day) * (1 - env.dust) * (sys.solar / 100);
  const night = gen < 1;
  let waterLoad = s.loads.water;
  if (m.flags.loadShift) waterLoad = night ? 0 : s.loads.water * 1.7;
  const loads: Record<LoadKey, number> = {
    lifeSupport: s.loads.lifeSupport,
    thermal: s.loads.thermal(hour, day) + (env.heatHours > 0 ? 1.0 : 0) + (coverHeatLoss ? 0.5 : 0),
    water: waterLoad,
    sabatier: m.h2Mode === 'sabatier' ? s.loads.sabatier : 0,
    moxie: (m.items.moxie ?? 0) > 0 ? s.loads.moxie : 0,
    greenhouse: s.loads.greenhouse[m.greenhouseMode],
  };
  const order: LoadKey[] = ['lifeSupport', 'thermal', 'water', 'sabatier', 'moxie', 'greenhouse'];
  const demand = order.reduce((a, k) => a + loads[k], 0);
  const fromBatteryMax = Math.min(r.batteryKWh, s.battery.maxRateKW);
  let remaining = gen + fromBatteryMax;
  const served = {} as Record<LoadKey, number>;
  let used = 0;
  for (const k of order) {
    const give = Math.min(loads[k], Math.max(0, remaining));
    served[k] = loads[k] > 0 ? give / loads[k] : 1;
    remaining -= give;
    used += give;
  }
  const fromBattery = Math.max(0, used - gen);
  r.batteryKWh = Math.max(0, r.batteryKWh - fromBattery);
  const surplus = Math.max(0, gen - used);
  r.batteryKWh = Math.min(r.batteryCapKWh, r.batteryKWh + Math.min(surplus, s.battery.maxRateKW) * s.battery.chargeEfficiency);
  const unmet = demand - used;
  m.unmet.powerKWh += unmet;
  m.lastPower = { generationKW: gen, demandKW: demand, servedFraction: served, unmetKWh: unmet };
  if (unmet > 0.05 && !m.flags[`shed@${day}`]) {
    m.flags[`shed@${day}`] = true;
    log(m, run, served.lifeSupport < 1 ? 'journal.shedLifeSupport' : 'journal.shed', served.lifeSupport < 1 ? 'bad' : 'warn');
  }
  if (env.darkHours > 0) {
    env.darkHours -= 1;
    if (env.darkHours <= 0) {
      log(m, run, 'journal.shadowOver', 'good');
      if (m.flags.shadowEssentials) {
        m.flags.shadowEssentials = false;
        m.greenhouseMode = 'full';
        log(m, run, 'journal.ghRestored', 'info');
      }
    }
  }
  if (env.heatHours > 0) {
    env.heatHours -= 1;
    if (env.heatHours <= 0) log(m, run, 'journal.heatOver', 'good');
  }

  // ---- oxygen ----
  const o2Prod = s.o2ProductionKgH * served.lifeSupport * (sys.lifeSupport / 100);
  const moxieProd = loads.moxie > 0 ? s.moxieKgH * served.moxie : 0;
  const o2Use = s.o2PerCrewKgH * n;
  const leak = env.leakKgH;
  if (env.leakKgH > 0) env.leakKgH = Math.min(1, env.leakKgH + env.leakGrowth);
  r.o2Kg += o2Prod + moxieProd - o2Use - leak;

  // ---- water ----
  // Quartermaster on board: 10% lower food and water use (gameplay rule).
  const qm = crew.some((c) => characterById(run, c.id).traitId === 'quartermaster') ? 0.9 : 1;
  const crewWater = s.waterPerCrewLH * n * (m.flags.waterRation ? 0.7 : 1) * qm;
  const recovered = crewWater * s.recyclerRecovery * (sys.waterRecycler / 100) * served.water;
  const ghWater = s.greenhouseWaterLH[m.greenhouseMode] * served.greenhouse * (m.flags.nutrientLoop ? 0.6 : 1);
  // Sabatier (R-LOOP): electrolysis hydrogen + exhaled CO2 -> water + methane. ~0.56 kg water back per kg O2 made (derived).
  const sabatierWater = m.h2Mode === 'sabatier' ? o2Prod * SABATIER_WATER_PER_KG_O2 * served.sabatier : 0;
  if (m.h2Mode === 'sabatier') sys.lifeSupport = clamp(sys.lifeSupport - 0.12);
  r.waterL += recovered + sabatierWater - crewWater - o2Prod * WATER_PER_KG_O2 - ghWater;
  sys.waterRecycler = clamp(sys.waterRecycler - env.recyclerWear);

  // ---- food & greenhouse ----
  r.foodCrewDays -= (n / 24) * qm;
  m.lastFlows = {
    o2Prod,
    moxieProd,
    o2Use,
    leak,
    waterRecovered: recovered,
    crewWater,
    electrolysisWater: o2Prod * WATER_PER_KG_O2,
    greenhouseWater: ghWater,
    foodUse: (n / 24) * qm,
    batteryDelta: r.batteryKWh - battery0,
    sabatierWater,
  };
  sys.greenhouseHealth = clamp(sys.greenhouseHealth - env.wilt - (coverHeatLoss ? 0.4 : 0));
  const modeFactor = m.greenhouseMode === 'full' ? 1 : m.greenhouseMode === 'eco' ? 0.4 : 0;
  const lightFactor = mars && coverClosed && sunUp ? 0.15 : 1;
  if (sys.greenhouseGrowth < 100) {
    sys.greenhouseGrowth = Math.min(
      100,
      sys.greenhouseGrowth + CROPS[m.crop].growthPerH * modeFactor * served.greenhouse * lightFactor * (sys.greenhouseHealth / 100) * (m.flags.nutrientLoop ? 1.2 : 1),
    );
  }
  // Ripe crops wait for the crew's decision (HARVEST event); outside surface ops they are simply eaten.
  if (sys.greenhouseGrowth >= 100 && run.phase !== 'surface') {
    harvest({ run, m, scenario: s, event: null, assigned: [] }, 1, 0);
  }

  // ---- dust storm ----
  if (env.dustHours > 0) {
    sys.solar = clamp(sys.solar - env.dustSettle);
    env.dustHours -= 1;
    if (env.dustHours <= 0) {
      env.dust = 0.15;
      env.dustSettle = 0;
      log(m, run, 'journal.stormThins', 'good');
      if (m.flags.hunker) {
        m.flags.hunker = false;
        m.greenhouseMode = 'full';
        log(m, run, 'journal.ghRestored', 'info');
      }
    }
  }

  // ---- solar particle event ----
  if (env.speHours > 0) {
    for (const c of crew) {
      if (c.sheltered) {
        c.radiation = clamp(c.radiation + 3 * (1 - sys.shelter / 100));
      } else {
        c.radiation = clamp(c.radiation + 6);
        c.health = clamp(c.health - 4);
      }
    }
    env.speHours -= 1;
    if (env.speHours <= 0) {
      for (const c of crew) c.sheltered = false;
      log(m, run, 'journal.speOver', 'good');
    }
  }

  // ---- unmet needs (no negative stocks: shortage is recorded) ----
  let deficit = false;
  if (r.o2Kg < 0) {
    r.o2Kg = 0;
    m.unmet.o2Hours += 1;
    deficit = true;
    for (const c of crew) c.health = clamp(c.health - 7);
    if (!m.flags[`o2def@${dayOf(m.minute)}`]) {
      m.flags[`o2def@${dayOf(m.minute)}`] = true;
      log(m, run, 'journal.o2Deficit', 'bad');
    }
  }
  if (r.waterL < 0) {
    r.waterL = 0;
    m.unmet.waterHours += 1;
    deficit = true;
    for (const c of crew) c.health = clamp(c.health - 1.2);
  }
  if (r.foodCrewDays < 0) {
    r.foodCrewDays = 0;
    m.unmet.foodHours += 1;
    deficit = true;
    for (const c of crew) c.health = clamp(c.health - 0.4);
  }

  // ---- crew routines ----
  const isNight = hour >= 22 || hour < 6;
  for (const c of crew) {
    const ch = characterById(run, c.id);
    const resist = (ch.traitId === 'steady' ? 0.6 : 1) * (1 - (Math.min(ch.profile.experienceYears, 16) / 16) * 0.25);
    if (!isNight) c.stress = clamp(c.stress + 0.2 * resist);
    if (c.taskId) {
      c.fatigue = clamp(c.fatigue + 2.5);
    } else if (c.sheltered) {
      c.fatigue = clamp(c.fatigue - 1);
      c.stress = clamp(c.stress + 0.4 * resist);
    } else if (isNight) {
      c.fatigue = clamp(c.fatigue - 3);
      c.stress = clamp(c.stress - 0.3);
    } else if (c.routine === 'rest') {
      c.fatigue = clamp(c.fatigue - 3);
      c.stress = clamp(c.stress - 0.8);
      c.health = clamp(c.health + 0.3);
    } else if (c.routine === 'maintenance') {
      c.fatigue = clamp(c.fatigue + 0.6);
      const keys = (['lifeSupport', 'waterRecycler', 'solar', 'seal'] as const).filter((k) => sys[k] < 100);
      if (keys.length) {
        const k = keys.reduce((a, b) => (sys[b] < sys[a] ? b : a));
        sys[k] = clamp(sys[k] + 0.35 * (ch.skills.technical / 60) * (ch.traitId === 'mechanic' ? 1.3 : 1));
      }
    } else if (c.routine === 'science') {
      c.fatigue = clamp(c.fatigue + 0.6);
      r.science += 0.25 * (ch.skills.science / 60) * ((m.items.spectro ?? 0) > 0 ? 1.4 : 1) * (ch.traitId === 'geologist' ? 1.25 : 1);
    }
    if (!deficit && c.fatigue < 70) c.health = clamp(c.health + 0.08);
    if (c.fatigue > 85) {
      c.health = clamp(c.health - 0.3);
      c.stress = clamp(c.stress + 0.3);
    }
    if (c.warned && c.health > 55) c.warned = false;
  }

  m.minute = (Math.floor(m.minute / 60) + 1) * 60;

  completeTasks(run, hooks, false);
  handleLosses(run, hooks);
  if (run.phase === 'surface' && !m.ended) maybeChat(run);
}

/** Finish tasks whose end time has been reached (or all of them when `force`). Outcome was rolled at commit. */
export function completeTasks(run: RunState, hooks: EffectHooks, force: boolean) {
  const m = run.mission!;
  const done = m.tasks.filter((t) => force || t.endsAt <= m.minute);
  if (!done.length) return;
  m.tasks = m.tasks.filter((t) => !done.includes(t));
  for (const t of done) {
    const ev = eventOf(t.eventId);
    const opt = ev.options.find((o) => o.id === t.optionId)!;
    for (const id of t.crewIds) {
      const c = m.crew.find((x) => x.id === id);
      if (c) c.taskId = null;
    }
    const ctx: Ctx = { run, m, scenario: scenarioOf(run), event: null, assigned: t.crewIds };
    applyEffects(ctx, t.success ? opt.success : (opt.failure ?? opt.success), hooks);
    log(m, run, `ev.${t.eventId}.${t.optionId}.${t.success ? 'ok' : 'fail'}`, t.success ? 'good' : 'warn', {
      names: t.crewIds.map((id) => characterById(run, id).name).join(' & '),
    });
  }
}

/**
 * Health reaching zero follows an explained rule chain (deficits / exposure / injuries).
 * Standard mode records a loss; explorer mode records an emergency evacuation.
 */
export function handleLosses(run: RunState, hooks: EffectHooks) {
  const m = run.mission!;
  for (const c of activeCrew(m)) {
    if (c.health > 0) continue;
    c.status = run.mode === 'explorer' ? 'evacuated' : 'deceased';
    c.taskId = null;
    const name = characterById(run, c.id).name;
    log(m, run, run.mode === 'explorer' ? 'journal.lossExplorer' : 'journal.loss', 'loss', { name, cause: lastCause(m) });
  }
  const player = m.crew.find((c) => c.id === 'player')!;
  if (player.status !== 'active' && !m.ended) {
    if (run.mode === 'explorer') hooks.abort();
    else {
      m.ended = { reason: 'playerLost', minute: m.minute };
      run.phase = 'debrief';
    }
  }
}

function lastCause(m: MissionState): string {
  if (m.unmet.o2Hours > 0) return 'o2';
  if (m.env.speHours > 0) return 'radiation';
  if (m.unmet.waterHours > 0) return 'water';
  if (m.unmet.foodHours > 0) return 'food';
  return 'injury';
}

// ---------- event opening & emergencies ----------

export function openEvent(run: RunState, eventId: string, instanceId: string, hooks: EffectHooks, subjectCrewId?: string) {
  const m = run.mission!;
  if (m.resolved.includes(instanceId) || m.activeEvent) return false;
  const ev = eventOf(eventId);
  let subjects: string[] | undefined;
  if (ev.subjects) {
    // crew members the event is about: free, active companions (never the player), chosen from the seed
    const pool = activeCrew(m).filter((c) => c.id !== 'player' && !c.taskId);
    if (pool.length < ev.subjects) return false;
    subjects = new Rng(deriveSeed(run.seed, 'subjects', instanceId)).shuffle(pool.map((c) => c.id)).slice(0, ev.subjects);
  }
  m.activeEvent = { instanceId, eventId, openedAt: m.minute, subjectCrewId, subjects };
  if (ev.onOpen) applyEffects({ run, m, scenario: scenarioOf(run), event: m.activeEvent, assigned: [] }, ev.onOpen, hooks);
  log(m, run, `ev.${eventId}.title`, ev.kind === 'emergency' ? 'bad' : 'info', {
    name: subjectCrewId ? characterById(run, subjectCrewId).name : '',
    names: subjects ? subjects.map((id) => characterById(run, id).name).join(' & ') : '',
  });
  return true;
}

/** Emergencies are raised only after visible warnings, and offer an intervention. */
export function checkEmergencies(run: RunState, hooks: EffectHooks) {
  const m = run.mission!;
  if (m.activeEvent || m.ended || run.phase !== 'surface') return;
  const s = scenarioOf(run);
  const n = activeCrew(m).length;
  const netLoss = n * s.o2PerCrewKgH + m.env.leakKgH - s.o2ProductionKgH * (m.lastPower?.servedFraction.lifeSupport ?? 1) * (m.systems.lifeSupport / 100);
  const hoursLeft = netLoss > 0 ? m.resources.o2Kg / netLoss : Infinity;
  const day = dayOf(m.minute);
  if (hoursLeft < 30 && !m.flags[`o2warn@${day}`]) {
    m.flags[`o2warn@${day}`] = true;
    log(m, run, 'journal.o2Warning', 'warn', { hours: Math.max(0, Math.floor(hoursLeft)) });
  }
  if (hoursLeft < 12 && !m.flags[`emgO2@${day}`]) {
    m.flags[`emgO2@${day}`] = true;
    openEvent(run, 'EMG-O2', `EMG-O2@${day}`, hooks);
    return;
  }
  for (const c of activeCrew(m)) {
    if (c.health < 35 && !c.warned) {
      c.warned = true;
      openEvent(run, 'EMG-MED', `EMG-MED@${c.id}@${Math.floor(m.minute)}`, hooks, c.id);
      return;
    }
  }
  // Ripe greenhouse: the crew decides what to do with the harvest.
  if (m.systems.greenhouseGrowth >= 100) openEvent(run, 'HARVEST', `HARVEST@${Math.floor(m.minute)}`, hooks);
}

export function makeHooks(run: RunState): EffectHooks {
  const hooks: EffectHooks = {
    wait: (hours) => {
      // Return-prep "delay departure": plain simulation, interrupted (with a journal note) if it turns dangerous.
      const m = run.mission!;
      for (let i = 0; i < hours && !m.ended; i++) {
        tickHour(run, hooks);
        if (m.unmet.o2Hours > 0 || activeCrew(m).some((c) => c.health < 40)) {
          log(m, run, 'journal.waitInterrupted', 'warn', { hours: i + 1 });
          break;
        }
      }
    },
    abort: () => {
      const m = run.mission!;
      if (m.ended) return;
      m.ended = { reason: 'aborted', minute: m.minute };
      for (const t of m.tasks) for (const id of t.crewIds) {
        const c = m.crew.find((x) => x.id === id);
        if (c) c.taskId = null;
      }
      m.tasks = [];
      m.activeEvent = null;
      log(m, run, 'journal.aborted', 'warn');
      run.phase = 'debrief';
    },
  };
  return hooks;
}

/**
 * Advance the surface clock. Resources move in fixed one-hour steps; the clock stops exactly at
 * the next scheduled event, so a large delta can never skip an event.
 */
export function advanceTime(run: RunState, deltaMinutes: number) {
  const m = run.mission;
  if (!m || run.phase !== 'surface' || m.activeEvent || m.ended || run.manualPause || deltaMinutes <= 0) return;
  const s = scenarioOf(run);
  const end = surfaceEndMinute(s);
  const hooks = makeHooks(run);
  const target = m.minute + deltaMinutes;
  let guard = 0;
  while (m.minute < target && guard++ < 10000) {
    const next = m.queue[0];
    if (next && next.atMinute <= m.minute + 1e-9) {
      m.queue.shift();
      if (openEvent(run, next.eventId, next.eventId, hooks)) return;
      continue;
    }
    const nextHour = (Math.floor(m.minute / 60) + 1) * 60;
    const stop = Math.min(target, nextHour, next?.atMinute ?? Infinity, end);
    if (stop >= nextHour - 1e-9) {
      tickHour(run, hooks);
      if (m.ended) return;
      checkEmergencies(run, hooks);
      if (m.activeEvent) return;
    } else {
      m.minute = stop;
    }
    if (m.minute >= end - 1e-9) {
      endSurface(run);
      return;
    }
  }
}

export function endSurface(run: RunState) {
  const m = run.mission!;
  const hooks = makeHooks(run);
  completeTasks(run, hooks, true);
  for (const c of m.crew) c.sheltered = false;
  m.env.speHours = 0;
  run.phase = 'returnPrep';
  log(m, run, 'journal.surfaceDone', 'good', { days: scenarioOf(run).demoDays });
  openEvent(run, 'RETURN-01', 'RETURN-01', hooks);
}

/** Roll for a committed decision. Bound to the event instance + option, never to UI order. */
export function rollFor(run: RunState, instanceId: string, optionId: string) {
  return decisionRoll(run.seed, instanceId, optionId);
}
