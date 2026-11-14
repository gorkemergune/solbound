import { decisionRoll } from './rng';
import { activeCrew, applyEffects, characterById, dayOf, eventOf, harvest, hasTrait, log, scenarioOf, type Ctx, type EffectHooks } from './rules';
import { CROPS, SURFACE_START_MINUTE, surfaceEndMinute } from './scenarios';
import { maybeChat } from './chatter';
import { HARVEST_VARIANTS } from './events4';
import { Rng, deriveSeed } from './rng';
import type { DaySnapshot, GreenhouseMode, MissionState, PowerReport, RunState } from './types';

const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));

/** Per person per hour outside (gameplay values, not suit specifications): suit O₂, sublimator cooling water, recharge. */
export const EVA_O2_KG_H = 0.06;
export const EVA_WATER_L_H = 0.3;
export const EVA_KWH_H = 0.25;
/** Reinforcement module (gameplay): extra O2 generation and the power it needs. */
export const MODULE_O2_KG_H = 0.06;
export const MODULE_LS_KW = 0.5;
export const MODULE_SOLAR_KW = 1.2;

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
  const solarNow = s.solarKW(hour, day);
  const solarGen = solarNow * (env.darkHours > 0 ? env.darkFactor : 1) * (1 - env.dust) * (sys.solar / 100);
  const baseGen = s.baseKW * (1 - env.fissionLoss);
  // the reinforcement module unfolds its own small array (gameplay)
  const moduleGen = m.flags.module === 'ready' && solarNow > 0.5 ? MODULE_SOLAR_KW * (env.darkHours > 0 ? env.darkFactor : 1) : 0;
  const gen = solarGen + baseGen + moduleGen;
  const night = solarGen < 1;
  // Lunar night at the equator: heaters run on fission power; insulation, waste heat and a quiet base help.
  const lunarNight = s.baseKW > 0 && solarNow <= 0;
  const nightRelief = lunarNight
    ? (m.flags['prep.night.insulate'] ? 0.8 : 0) + (m.flags.wasteHeat ? 0.6 : 0) + (m.flags.nightMode === 'hibernate' ? 0.5 : 0)
    : 0;
  let waterLoad = s.loads.water;
  if (m.flags.loadShift) waterLoad = night ? 0 : s.loads.water * 1.7;
  const loads: Record<LoadKey, number> = {
    lifeSupport: s.loads.lifeSupport,
    thermal:
      Math.max(0.8, s.loads.thermal(hour, day) - nightRelief) +
      (env.heatHours > 0 ? 1.0 : 0) +
      (coverHeatLoss ? 0.5 : 0) +
      // reinforcement module: heated volume (less with the prepared power run)
      (m.flags.module === 'ready' ? (m.flags.modulePower ? 0.3 : 0.6) + MODULE_LS_KW : 0),
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
  // power engineer on board: better charge management (gameplay rule)
  const eff = hasTrait(run, m, 'power') ? Math.min(0.96, s.battery.chargeEfficiency + 0.05) : s.battery.chargeEfficiency;
  r.batteryKWh = Math.min(r.batteryCapKWh, r.batteryKWh + Math.min(surplus, s.battery.maxRateKW) * eff);
  const unmet = demand - used;
  m.unmet.powerKWh += unmet;
  m.lastPower = { generationKW: gen, baseKW: baseGen, demandKW: demand, servedFraction: served, unmetKWh: unmet };
  if (unmet > 0.05 && !m.flags[`shed@${day}`]) {
    m.flags[`shed@${day}`] = true;
    log(m, run, served.lifeSupport < 1 ? 'journal.shedLifeSupport' : 'journal.shed', served.lifeSupport < 1 ? 'bad' : 'warn');
  }
  if (env.darkHours > 0) {
    env.darkHours -= 1;
    if (env.darkHours <= 0) {
      log(m, run, 'journal.shadowOver', 'good');
      env.darkFactor = 0;
      if (m.flags.shadowEssentials) {
        m.flags.shadowEssentials = false;
        m.greenhouseMode = (m.flags.ghBefore as GreenhouseMode | undefined) ?? 'full';
        log(m, run, 'journal.ghRestored', 'info');
      }
    }
  }
  if (env.heatHours > 0) {
    env.heatHours -= 1;
    if (env.heatHours <= 0) log(m, run, 'journal.heatOver', 'good');
  }

  // ---- suits: people working outside use suit O₂, cooling water and battery recharge (gameplay values) ----
  const outside = crew.filter((c) => {
    if (!c.taskId) return false;
    const t = m.tasks.find((x) => x.id === c.taskId);
    return !!t && !!eventOf(t.eventId).options.find((o) => o.id === t.optionId)?.crew?.outside;
  }).length;
  const eva = { people: outside, o2: outside * EVA_O2_KG_H, water: outside * EVA_WATER_L_H, kwh: outside * EVA_KWH_H };
  r.batteryKWh = Math.max(0, r.batteryKWh - eva.kwh);

  // ---- oxygen ----
  // the reinforcement module brings its own oxygen generator (it runs on the module's power share)
  const o2Prod = (s.o2ProductionKgH + (m.flags.module === 'ready' ? MODULE_O2_KG_H * served.thermal : 0)) * served.lifeSupport * (sys.lifeSupport / 100);
  const moxieProd = loads.moxie > 0 ? s.moxieKgH * served.moxie : 0;
  // electrolysis makes less when MOXIE covers part of the demand (it would only fill the tanks otherwise)
  const electroO2 = Math.max(0, o2Prod - moxieProd * 0.8);
  const o2Use = s.o2PerCrewKgH * n;
  const leak = env.leakKgH;
  if (env.leakKgH > 0) env.leakKgH = Math.min(1, env.leakKgH + env.leakGrowth);
  r.o2Kg += electroO2 + moxieProd - o2Use - leak - eva.o2;

  // ---- water ----
  // Quartermaster on board: 10% lower food and water use (gameplay rule).
  const qm = crew.some((c) => characterById(run, c.id).traitId === 'quartermaster') ? 0.9 : 1;
  // Nutritionist: meals planned to the gram, 8% less food used (gameplay rule)
  const nut = hasTrait(run, m, 'nutrition') ? 0.92 : 1;
  const crewWater = s.waterPerCrewLH * n * (m.flags.waterRation ? 0.7 : 1) * qm;
  // an ISRU chemist tunes the processor: +2 points of water recovery (gameplay rule)
  const recovery = Math.min(0.98, s.recyclerRecovery + (hasTrait(run, m, 'chemist') ? 0.02 : 0));
  const recovered = crewWater * recovery * (sys.waterRecycler / 100) * served.water;
  const ghWater = s.greenhouseWaterLH[m.greenhouseMode] * served.greenhouse * (m.flags.nutrientLoop ? 0.6 : 1);
  // Sabatier (R-LOOP): electrolysis hydrogen + exhaled CO2 -> water + methane. ~0.56 kg water back per kg O2 made (derived).
  const sabatierWater = m.h2Mode === 'sabatier' ? electroO2 * SABATIER_WATER_PER_KG_O2 * served.sabatier : 0;
  if (m.h2Mode === 'sabatier') sys.lifeSupport = clamp(sys.lifeSupport - 0.12);
  r.waterL += recovered + sabatierWater - crewWater - electroO2 * WATER_PER_KG_O2 - ghWater - eva.water;
  sys.waterRecycler = clamp(sys.waterRecycler - env.recyclerWear);

  // ---- food & greenhouse ----
  r.foodCrewDays -= (n / 24) * qm * nut;
  m.lastFlows = {
    o2Prod: electroO2,
    moxieProd,
    o2Use,
    leak,
    waterRecovered: recovered,
    crewWater,
    electrolysisWater: electroO2 * WATER_PER_KG_O2,
    greenhouseWater: ghWater,
    foodUse: (n / 24) * qm * nut,
    batteryDelta: r.batteryKWh - battery0,
    sabatierWater,
    eva,
  };
  sys.greenhouseHealth = clamp(sys.greenhouseHealth - (env.wilt + (coverHeatLoss ? 0.4 : 0)) * (hasTrait(run, m, 'botanist') ? 0.7 : 1));
  const modeFactor = m.greenhouseMode === 'full' ? 1 : m.greenhouseMode === 'eco' ? 0.4 : 0;
  const lightFactor = mars && coverClosed && sunUp ? 0.15 : 1;
  if (sys.greenhouseGrowth < 100) {
    sys.greenhouseGrowth = Math.min(
      100,
      sys.greenhouseGrowth +
        CROPS[m.crop].growthPerH * modeFactor * served.greenhouse * lightFactor * (sys.greenhouseHealth / 100) * (m.flags.nutrientLoop ? 1.2 : 1) * (hasTrait(run, m, 'botanist') ? 1.15 : 1),
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
        m.greenhouseMode = (m.flags.ghBefore as GreenhouseMode | undefined) ?? 'full';
        log(m, run, 'journal.ghRestored', 'info');
      }
    }
  }

  // ---- solar particle event ----
  // space-weather analyst: the all-clear comes 2 h sooner once per particle event (gameplay rule)
  if (env.speHours > 2 && !m.flags.speCutDone && hasTrait(run, m, 'spaceWeather')) {
    env.speHours -= 2;
    m.flags.speCutDone = true;
  }
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
      delete m.flags.speCutDone;
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
  // six people in a four-person habitat
  if (m.flags.module === 'cramped' || m.flags.module === 'packed') for (const c of crew) c.stress = clamp(c.stress + 0.25);
  if (m.flags.module === 'shifts') for (const c of crew) c.fatigue = clamp(c.fatigue + 0.2);
  // team cohesion: a crew with high teamwork gains stress more slowly (each 10 points above 50 → 5% less);
  // a mediator on board takes another 15% off for everyone (gameplay rules)
  const avgTeam = crew.reduce((a, c) => a + characterById(run, c.id).skills.teamwork, 0) / Math.max(1, n);
  const cohesion = Math.min(1.25, Math.max(0.75, 1 - (avgTeam - 50) / 200)) * (hasTrait(run, m, 'mediator') ? 0.85 : 1);
  for (const c of crew) {
    const ch = characterById(run, c.id);
    const resist = cohesion * (ch.traitId === 'steady' ? 0.6 : 1) * (1 - (Math.min(ch.profile.experienceYears, 16) / 16) * 0.25);
    if (!isNight) c.stress = clamp(c.stress + 0.2 * resist);
    if (c.taskId) {
      c.fatigue = clamp(c.fatigue + 2.5 * (ch.traitId === 'steady' ? 0.85 : 1));
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
  if (run.phase === 'surface') {
    closeBigEvents(run);
    deliverBulletins(run);
    if (hourOfDay(m.minute) === 0) snapshot(run, dayOf(m.minute) - 1);
  }

  completeTasks(run, hooks, false);
  handleLosses(run, hooks);
  if (run.phase === 'surface' && !m.ended) maybeChat(run);
}

/** Record one row of the month's history (for the debrief chart and the recap video). */
export function snapshot(run: RunState, day: number) {
  const m = run.mission!;
  if (m.history.some((h) => h.day === day)) return;
  const act = activeCrew(m);
  const avg = (k: 'health' | 'stress') => (act.length ? act.reduce((a, c) => a + c[k], 0) / act.length : 0);
  const row: DaySnapshot = {
    day,
    food: m.resources.foodCrewDays,
    o2: m.resources.o2Kg,
    water: m.resources.waterL,
    battery: m.resources.batteryKWh,
    batteryCap: m.resources.batteryCapKWh,
    health: avg('health'),
    stress: avg('stress'),
    science: m.resources.science,
    crew: act.length,
  };
  m.history.push(row);
}

/** Real NASA DONKI records reach the base as bulletins on their real day (mapped onto the mission). */
export function deliverBulletins(run: RunState) {
  const m = run.mission!;
  const sw = run.spaceWeather;
  if (!sw || !m.bulletins.length) return;
  while (m.bulletins.length && m.bulletins[0].at <= m.minute) {
    const b = m.bulletins.shift()!;
    const r = sw.records[b.rec];
    if (!r) continue;
    const arrives = r.kind === 'cme' && (run.destination === 'mars' ? r.arrivalMars : r.arrivalEarth);
    log(m, run, arrives ? 'journal.sw.cmeArr' : `journal.sw.${r.kind}`, 'sw', {
      rec: b.rec,
      date: r.time.slice(0, 16).replace('T', ' '),
      speed: r.speed ?? '',
      cls: r.cls ?? '',
      location: r.location ?? '',
      arrival: (run.destination === 'mars' ? r.arrivalMars : r.arrivalEarth)?.slice(0, 16).replace('T', ' ') ?? '',
    });
  }
}

/** When a big event is over: clear its preparation flags and undo its temporary modes. */
export function closeBigEvents(run: RunState) {
  const m = run.mission!;
  for (const b of m.big) {
    if (b.closed || m.minute < b.endAt) continue;
    if (!m.resolved.some((id) => id === `${b.hitEventId}@${b.id}`)) continue; // never hit (e.g. still waiting in the queue)
    b.closed = true;
    for (const k of Object.keys(m.flags)) if (k.startsWith(`prep.${b.kind}.`)) delete m.flags[k];
    if (b.kind === 'night') {
      m.env.fissionLoss = 0;
      if (m.flags.nightMode === 'hibernate' || m.flags.nightMode === 'eco') {
        m.greenhouseMode = (m.flags.ghBefore as GreenhouseMode | undefined) ?? 'full';
        log(m, run, 'journal.ghRestored', 'info');
      }
      delete m.flags.nightMode;
      delete m.flags.wasteHeat;
      log(m, run, 'journal.dawn', 'good');
    }
    if (b.kind === 'meteor') log(m, run, 'journal.meteorOver', 'good');
  }
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
    if (ev.kind === 'prep') m.flags[`prep@${t.eventInstanceId.split('@')[1]}:${t.optionId}`] = t.success ? 'done' : 'failed';
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
  if (eventId === 'CME') {
    // strength of this real CME (glancing blow or direct hit, from the model run)
    const big = m.big.find((b) => `${b.hitEventId}@${b.id}` === instanceId);
    const r = big?.swIndex !== undefined ? run.spaceWeather?.records[big.swIndex] : undefined;
    m.flags.cmeGlancing = !!(r && (run.destination === 'mars' ? r.glancingMars : r.glancingEarth));
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
  // Return power: warn in the last stretch before the goal if the battery is below the return need at midday
  if (hourOfDay(m.minute) === 13 && day >= m.goal.target - 4 && m.resources.batteryKWh < s.returnNeeds.batteryKWh && !m.flags[`battWarn@${day}`]) {
    m.flags[`battWarn@${day}`] = true;
    log(m, run, 'journal.batteryReturnWarn', 'warn', { have: Math.round(m.resources.batteryKWh), need: s.returnNeeds.batteryKWh });
  }
  // Water: warn, then offer a decision, before the tanks run dry.
  const f = m.lastFlows;
  const waterRate = f ? f.waterRecovered + f.sabatierWater - f.crewWater - f.electrolysisWater - f.greenhouseWater - (f.eva?.water ?? 0) : 0;
  const waterLeft = waterRate < -1e-6 ? m.resources.waterL / -waterRate : Infinity;
  if (waterLeft < 72 && !m.flags[`waterWarn@${day}`]) {
    m.flags[`waterWarn@${day}`] = true;
    log(m, run, 'journal.waterWarning', 'warn', { hours: Math.max(0, Math.floor(waterLeft)) });
  }
  if (waterLeft < 36 && !m.flags.waterRation && !m.flags[`emgWater@${day}`]) {
    m.flags[`emgWater@${day}`] = true;
    openEvent(run, 'EMG-WATER', `EMG-WATER@${day}`, hooks);
    return;
  }
  const lastMed = typeof m.flags.lastMed === 'number' ? (m.flags.lastMed as number) : -1e9;
  if (m.minute - lastMed >= 12 * 60) {
    const sick = activeCrew(m).filter((c) => c.health < 35 && !c.warned).sort((a, b) => a.health - b.health);
    if (sick.length) {
      // the worst case gets the card; the others are warned in the journal (fewer interruptions)
      for (const c of sick) c.warned = true;
      for (const c of sick.slice(1)) log(m, run, 'journal.alsoSick', 'warn', { name: characterById(run, c.id).name });
      m.flags.lastMed = m.minute;
      openEvent(run, 'EMG-MED', `EMG-MED@${sick[0].id}@${Math.floor(m.minute)}`, hooks, sick[0].id);
      return;
    }
  }
  // Ripe greenhouse: the crew decides what to do with the harvest (a different kind of harvest card each time).
  // (not while a harvest task from the previous card is still running: that would harvest twice)
  if (m.systems.greenhouseGrowth >= 100 && !m.tasks.some((t) => t.eventId.startsWith('HARVEST'))) {
    const id = harvestVariant(run);
    if (openEvent(run, id, `${id}@${Math.floor(m.minute)}`, hooks)) m.flags.lastHarvest = id;
  }
}

/** First harvest: the classic card; afterwards a seeded rotation, never the same card twice in a row. */
export function harvestVariant(run: RunState): string {
  const m = run.mission!;
  if (!m.flags.lastHarvest) return 'HARVEST';
  const order = new Rng(deriveSeed(run.seed, 'harvest-order')).shuffle([...HARVEST_VARIANTS]);
  const n = m.harvests;
  for (let k = 0; k < order.length; k++) {
    const id = order[(n + k) % order.length];
    if (id !== m.flags.lastHarvest) return id;
  }
  return 'HARVEST';
}

/** Moon: after two live calls Earth offers a reinforcement crew (once, while there is time for it to matter). */
export function maybeOfferReinforcement(run: RunState) {
  const m = run.mission!;
  // the crew lands on day 20 at the earliest; the offer is open until day 24 so they still have time to matter
  if (run.destination !== 'moon' || m.flags.reinfOffered || (m.flags.earthCalls as number) < 2 || m.minute > 24 * 1440) return;
  m.flags.reinfOffered = true;
  m.queue.push({ eventId: 'REINF-OFFER', atMinute: m.minute + 90, instanceId: 'REINF-OFFER' });
  m.queue.sort((a, b) => a.atMinute - b.atMinute);
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
      // forecasts no longer stop the clock: they become a journal line and a banner with a link to the plan
      if (next.eventId.startsWith('FC-')) {
        const id = next.instanceId ?? next.eventId;
        if (!m.resolved.includes(id)) {
          m.resolved.push(id);
          log(m, run, `ev.${next.eventId}.title`, 'forecast', { instance: id });
        }
        continue;
      }
      if (openEvent(run, next.eventId, next.instanceId ?? next.eventId, hooks)) return;
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
  const days = Math.min(scenarioOf(run).missionDays, Math.max(0, Math.round(((m.minute - SURFACE_START_MINUTE) / 1440) * 10) / 10));
  m.flags.surfaceEndMinute = m.minute;
  snapshot(run, Math.ceil(days));
  log(m, run, 'journal.surfaceDone', 'good', { days: Math.floor(days) });
  openEvent(run, 'RETURN-01', 'RETURN-01', hooks);
}

/** Roll for a committed decision. Bound to the event instance + option, never to UI order. */
export function rollFor(run: RunState, instanceId: string, optionId: string) {
  return decisionRoll(run.seed, instanceId, optionId);
}
