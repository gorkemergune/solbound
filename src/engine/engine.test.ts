import { describe, expect, it } from 'vitest';
import { GOAL_SHARE, applyCommand, createRun, estimateStay, launchBlockers, payloadOf } from './commands';
import { LAUNCH_CAPACITY_KG, PERSONAL_KIT_KG, payload, validateQuantity } from './cargo';
import { buildSchedule } from './schedule';
import { CHATS } from './chatter';
import { EVENTS, type Cond } from './events';
import { generateCandidates } from './characters';
import { computeOutcome } from './outcome';
import { RANKS, rankFor } from './rank';
import { applyEffects, availableCrewFor, characterById, eventOf, optionState, returnStatus, successChance, suggestCrew } from './rules';
import { deserialize, serialize } from './save';
import { SCENARIOS, SURFACE_START_MINUTE, scenarioFor } from './scenarios';
import { WATER_PER_KG_O2, tickHour, makeHooks, nextDeparture, openEvent, checkEmergencies } from './sim';
import { LANDING_SITES, landingsFor, pickLanding } from './landing';
import { launchAnyway, must, play, playLaunched, prepared, startPreps, type Policy } from './testkit';
import { buildBigEvents, bigStatus, prepStatusKey } from './bigevents';
import { NAMES, crewNames, nameVariety } from './characters';
import { SOL_TO_EARTH, clockDrift, earthMinutesElapsed, lunarSun } from './time';
import type { ActiveEvent, MissionState, RunState } from './types';

const PREPS = ['radiator', 'insulate', 'clean', 'stow', 'mast', 'berm', 'spares', 'zone', 'beacon'];
const carefulMoon: Policy = { PREP: PREPS, 'REINF-OFFER': ['decline'], 'OUT-01': ['full'], 'MOON-01': ['calibrate'], 'MOON-02': ['patch', 'replace'], 'MOON-03': ['waterWall', 'shelterNow'], 'RETURN-01': ['balanced'], 'RETURN-02': ['spare'] };
const carefulMars: Policy = { PREP: PREPS, 'OUT-01': ['full'], 'MARS-01': ['swapFilter'], 'MARS-02': ['eco'], 'MARS-03': ['replant'], 'RETURN-01': ['balanced'], 'RETURN-02': ['spare'] };

function toSurface(run: RunState): RunState {
  let r = launchAnyway(run);
  const ev = r.mission!.activeEvent!;
  r = must(r, { type: 'resolve', instanceId: ev.instanceId, optionId: 'rest', crewIds: [] });
  return must(r, { type: 'beginSurface' });
}

describe('characters', () => {
  it('is deterministic per seed and independent of names', () => {
    const a = createRun(123, 'en');
    const b = createRun(123, 'tr');
    const noName = (cs: typeof a.candidates) => cs.map(({ name: _n, ...rest }) => rest);
    expect(noName(a.candidates)).toEqual(noName(b.candidates));
    expect(a.player.skills).toEqual(b.player.skills);
    expect(createRun(124, 'en').candidates).not.toEqual(a.candidates);
  });

  it('generates 16 candidates with unique ids, unique names and every one of the 15 traits', () => {
    for (const seed of [9, 10, 11]) {
      const c = generateCandidates(seed);
      expect(c).toHaveLength(16);
      expect(new Set(c.map((x) => x.id)).size).toBe(16);
      expect(new Set(c.map((x) => x.name)).size).toBe(16);
      expect(new Set(c.map((x) => x.traitId)).size).toBe(15);
    }
  });

  it('names: match the gender of the portrait, follow the game language, no shared first or family names', () => {
    for (const locale of ['en', 'tr'] as const) {
      for (const seed of [3, 4, 5]) {
        const run = createRun(seed, locale);
        for (const c of [run.player, ...run.candidates]) {
          const [first, last] = c.name.split(' ');
          expect(NAMES[locale][c.gender]).toContain(first);
          expect(NAMES[locale].last).toContain(last);
        }
        const firsts = run.candidates.map((c) => c.name.split(' ')[0]);
        expect(new Set(firsts).size).toBe(16);
      }
      expect(nameVariety(locale)).toBeGreaterThan(1000);
    }
    expect(crewNames(3, ['a', 'b'], 'tr')).toHaveLength(2);
    expect(createRun(1, 'tr').player.name).not.toBe(createRun(2, 'tr').player.name);
  });

  it('switching language during preparation re-localises generated names only', () => {
    let run = createRun(21, 'en');
    run = must(run, { type: 'renameCandidate', id: 'c02', name: 'Custom Name', locale: 'en' });
    const before = run.candidates.map((c) => ({ g: c.gender, s: c.skills, seed: c.portraitSeed }));
    run = must(run, { type: 'localizeNames', locale: 'tr' });
    expect(NAMES.tr[run.player.gender]).toContain(run.player.name.split(' ')[0]);
    expect(run.candidates[1].name).toBe('Custom Name');
    expect(NAMES.tr[run.candidates[0].gender]).toContain(run.candidates[0].name.split(' ')[0]);
    expect(run.candidates.map((c) => ({ g: c.gender, s: c.skills, seed: c.portraitSeed }))).toEqual(before);
  });

  it('keeps a shared skill budget so no candidate tops every skill', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      for (const c of generateCandidates(seed)) {
        const total = c.skills.technical + c.skills.science + c.skills.teamwork;
        expect(total).toBeGreaterThan(120);
        expect(total).toBeLessThan(195);
      }
    }
  });

  it('renaming keeps id and skills; empty name gets a fallback; same names keep separate ids', () => {
    let run = createRun(5, 'en');
    const skills = run.candidates[0].skills;
    run = must(run, { type: 'renameCandidate', id: 'c01', name: '  Alex  ', locale: 'en' });
    run = must(run, { type: 'renameCandidate', id: 'c02', name: 'Alex', locale: 'en' });
    expect(run.candidates[0].name).toBe('Alex');
    expect(run.candidates[0].skills).toEqual(skills);
    expect(run.candidates[0].id).not.toBe(run.candidates[1].id);
    run = must(run, { type: 'renamePlayer', name: '   ', locale: 'tr' });
    expect(run.player.name.length).toBeGreaterThan(0);
    expect(run.player.customName).toBe(false);
  });
});

describe('preparation rules', () => {
  it('allows exactly three unique companions', () => {
    let run = must(must(createRun(1, 'en'), { type: 'goTo', phase: 'destination' }), { type: 'setDestination', destination: 'moon' });
    for (const id of ['c01', 'c02', 'c03']) run = must(run, { type: 'toggleCrew', id });
    expect(applyCommand(run, { type: 'toggleCrew', id: 'c04' }).error).toBe('err.crewFull');
    run = must(run, { type: 'toggleCrew', id: 'c02' });
    expect(run.crewIds).toEqual(['c01', 'c03']);
    expect(applyCommand(run, { type: 'goTo', phase: 'cargo' }).error).toBe('err.needCrew');
  });

  it('counts crew bodies, personal kits and cargo against the launch mass budget', () => {
    const run = prepared({ dest: 'mars' });
    const crew = [run.player, ...run.crewIds.map((id) => run.candidates.find((c) => c.id === id)!)];
    const p = payload(crew, {});
    expect(p.crewKg).toBe(crew.reduce((a, c) => a + c.profile.massKg, 0));
    expect(p.kitKg).toBe(4 * PERSONAL_KIT_KG);
    expect(p.capacityKg).toBe(LAUNCH_CAPACITY_KG);
    // fill exactly to capacity with a synthetic crew
    const fake = crew.map((c) => ({ ...c, profile: { ...c.profile, massKg: 85 } })); // 340 + 80 = 420 → 100 kg free
    expect(validateQuantity(fake, {}, 'food', 4)).toBeNull(); // 72 kg
    expect(validateQuantity(fake, { food: 4 }, 'parts', 1)).toBeNull(); // 96 kg
    expect(validateQuantity(fake, { food: 4, parts: 1 }, 'seeds', 1)).toBe('overCapacity'); // 101 kg
    expect(payload(fake, { food: 4, parts: 1, sealant: 0 }).freeKg).toBe(4);
    expect(validateQuantity(fake, {}, 'food', -1)).toBe('negative');
    expect(validateQuantity(fake, {}, 'food', 1.5)).toBe('notInteger');
    expect(validateQuantity(fake, {}, 'food', 5)).toBe('overMax');
    expect(validateQuantity(fake, {}, 'rocket', 1)).toBe('unknownItem');
    // removing is always allowed so an over-budget bay can be fixed
    expect(validateQuantity(fake, { shield: 1, battery: 2, food: 4 }, 'food', 3)).toBeNull();
  });

  it('heavier crew choices leave less cargo room and can block launch', () => {
    let run = prepared({ dest: 'moon' });
    run = { ...run, cargo: { shield: 1, battery: 2, food: 4, parts: 3 } }; // 45+64+72+72 = 253 kg
    expect(payloadOf(run).freeKg).toBeLessThan(0);
    expect(launchBlockers(run)).toContain('err.overCapacity');
  });

  it('blocks launch with a Mars-only item on the Moon and explains why', () => {
    const run = prepared({ dest: 'moon', cargo: { moxie: 1 } });
    expect(launchBlockers(run)).toContain('err.incompatible');
    expect(applyCommand(run, { type: 'launch' }).error).toBeDefined();
    const mars = must(run, { type: 'setDestination', destination: 'mars' });
    expect(launchBlockers(mars)).not.toContain('err.incompatible');
    expect(mars.crewIds).toEqual(run.crewIds); // switching destination keeps crew and cargo
  });

  it('launch freezes preparation and cannot start twice', () => {
    const run = launchAnyway(prepared({ dest: 'mars' }));
    expect(applyCommand(run, { type: 'launch' }).error).toBe('err.launched');
    expect(applyCommand(run, { type: 'setCargo', itemId: 'food', qty: 1 }).error).toBe('err.launched');
    expect(applyCommand(run, { type: 'toggleCrew', id: 'c05' }).error).toBe('err.launched');
  });
});

describe('decisions', () => {
  it('applies a decision exactly once', () => {
    const run = launchAnyway(prepared({ dest: 'moon' }));
    const ev = run.mission!.activeEvent!;
    const once = must(run, { type: 'resolve', instanceId: ev.instanceId, optionId: 'rest', crewIds: [] });
    expect(applyCommand(once, { type: 'resolve', instanceId: ev.instanceId, optionId: 'rest', crewIds: [] }).error).toBeDefined();
    expect(once.mission!.decisions.filter((d) => d.eventId === 'OUT-01')).toHaveLength(1);
  });

  it('rolls only at commit, bound to the decision identity (preview never changes the outcome)', () => {
    const run = launchAnyway(prepared({ dest: 'moon', seed: 3 }));
    const ev = run.mission!.activeEvent!;
    const opt = eventOf('OUT-01').options.find((o) => o.id === 'specialist')!;
    const crew = suggestCrew(run, opt);
    for (let i = 0; i < 5; i++) successChance(run, opt.check!, crew); // previews
    const a = must(run, { type: 'resolve', instanceId: ev.instanceId, optionId: 'specialist', crewIds: crew });
    const b = must(run, { type: 'resolve', instanceId: ev.instanceId, optionId: 'specialist', crewIds: crew });
    expect(a.mission!.decisions[0]).toEqual(b.mission!.decisions[0]);
  });

  it('rejects wrong crew counts and busy crew', () => {
    const run = toSurface(prepared({ dest: 'moon' }));
    let r = must(run, { type: 'advance', minutes: 100000 });
    const ev = r.mission!.activeEvent!;
    expect(ev.eventId).toBe(run.mission!.queue[0].eventId);
    expect(['MOON-01', 'CROP']).toContain(ev.eventId);
    if (ev.eventId !== 'MOON-01') return;
    expect(applyCommand(r, { type: 'resolve', instanceId: ev.instanceId, optionId: 'calibrate', crewIds: [] }).error).toBe('err.crewCount');
    r = must(r, { type: 'resolve', instanceId: ev.instanceId, optionId: 'calibrate', crewIds: ['c01'] });
    expect(r.mission!.crew.find((c) => c.id === 'c01')!.taskId).not.toBeNull();
  });

  it('long tasks pay cost now and apply the effect only on completion', () => {
    let r = toSurface(prepared({ dest: 'moon', seed: 42 }));
    r = must(r, { type: 'advance', minutes: 100000 });
    const ev = r.mission!.activeEvent!;
    expect(ev.eventId).toBe('MOON-01');
    r = must(r, { type: 'resolve', instanceId: ev.instanceId, optionId: 'calibrate', crewIds: ['player'] });
    expect(r.mission!.systems.solar).toBe(55); // v0.8: the dusty array opens at 55 %
    const success = r.mission!.decisions.at(-1)!.success;
    // the task now takes 5 h; resolve anything that opens meanwhile
    for (let i = 0; i < 40 && r.mission!.tasks.some((t) => t.eventId === 'MOON-01'); i++) {
      const open = r.mission!.activeEvent;
      if (open) {
        const o = eventOf(open.eventId).options.find((x) => optionState(r, x, open).available)!;
        r = must(r, { type: 'resolve', instanceId: open.instanceId, optionId: o.id, crewIds: suggestCrew(r, o) });
      } else r = must(r, { type: 'advance', minutes: 60 });
    }
    expect(r.mission!.systems.solar).toBeGreaterThanOrEqual(success ? 99 : 84);
  });

  it('locks options with visible reasons when items, traits or research are missing', () => {
    let r = toSurface(prepared({ dest: 'moon' }));
    r = must(r, { type: 'advance', minutes: 24 * 60 });
    while (r.mission!.activeEvent) {
      const ev = r.mission!.activeEvent;
      const def = eventOf(ev.eventId);
      if (def.id === 'MOON-02') {
        const patch = optionState(r, def.options.find((o) => o.id === 'patch')!, ev);
        expect(patch.available).toBe(false);
        expect(patch.reasons[0].key).toBe('lock.item');
        break;
      }
      const opt = def.options.find((o) => optionState(r, o, ev).available)!;
      r = must(r, { type: 'resolve', instanceId: ev.instanceId, optionId: opt.id, crewIds: suggestCrew(r, opt) });
      r = must(r, { type: 'advance', minutes: 24 * 60 });
    }
  });

  it('research unlocks an option (Mars load shifting)', () => {
    let r = toSurface(prepared({ dest: 'mars' }));
    r = must(r, { type: 'study', researchId: 'R-BATTERY' });
    const opt = eventOf('MARS-02').options.find((o) => o.id === 'loadShift')!;
    expect(optionState(r, opt, null).available).toBe(true);
  });
});

describe('time', () => {
  it('a huge time step stops at the next event instead of skipping it', () => {
    let r = toSurface(prepared({ dest: 'mars' }));
    const first = r.mission!.queue[0];
    r = must(r, { type: 'advance', minutes: 100000 });
    expect(r.mission!.activeEvent?.eventId).toBe(first.eventId);
    expect(r.mission!.minute).toBe(first.atMinute);
  });

  it('does not advance while paused or during a decision', () => {
    let r = toSurface(prepared({ dest: 'mars' }));
    r = must(r, { type: 'setPause', paused: true });
    expect(must(r, { type: 'advance', minutes: 60 }).mission!.minute).toBe(SURFACE_START_MINUTE);
    r = must(must(r, { type: 'setPause', paused: false }), { type: 'advance', minutes: 1000 });
    const at = r.mission!.minute;
    expect(must(r, { type: 'advance', minutes: 60 }).mission!.minute).toBe(at);
  });

  it('frame size does not change resource totals (fixed hourly step)', () => {
    const base = toSurface(prepared({ dest: 'moon' }));
    let coarse = base;
    let fine = base;
    coarse = must(coarse, { type: 'advance', minutes: 59.9 });
    for (let i = 0; i < 599; i++) fine = must(fine, { type: 'advance', minutes: 0.1 });
    expect(fine.mission!.resources).toEqual(coarse.mission!.resources);
    fine = must(fine, { type: 'advance', minutes: 0.2 });
    coarse = must(coarse, { type: 'advance', minutes: 0.2 });
    expect(fine.mission!.resources).toEqual(coarse.mission!.resources);
  });

  it('runs the same seed + commands to the same result', () => {
    const a = play(prepared({ dest: 'moon', seed: 11 }), carefulMoon, 37);
    const b = play(prepared({ dest: 'moon', seed: 11 }), carefulMoon, 37);
    expect(serialize(a)).toBe(serialize(b));
  });
});

describe('resource accounting', () => {
  it('electrolysis uses water and battery never exceeds capacity or goes negative', () => {
    const r = toSurface(prepared({ dest: 'mars' }));
    const run = structuredClone(r);
    const m = run.mission!;
    const w0 = m.resources.waterL;
    const ls0 = m.systems.lifeSupport;
    tickHour(run, makeHooks(run));
    const s = SCENARIOS.mars;
    const f = m.lastPower!.servedFraction;
    const prod = s.o2ProductionKgH * f.lifeSupport * (ls0 / 100);
    const crewUse = s.waterPerCrewLH * 4;
    const chemist = m.crew.some((c) => characterById(run, c.id).traitId === 'chemist');
    const recovery = Math.min(0.98, s.recyclerRecovery + (chemist ? 0.02 : 0));
    const expected = w0 + crewUse * recovery * f.water - crewUse - prod * WATER_PER_KG_O2 - s.greenhouseWaterLH.full * f.greenhouse;
    expect(m.resources.waterL).toBeCloseTo(expected, 6);
    for (let i = 0; i < 72; i++) tickHour(run, makeHooks(run));
    expect(m.resources.batteryKWh).toBeGreaterThanOrEqual(0);
    expect(m.resources.batteryKWh).toBeLessThanOrEqual(m.resources.batteryCapKWh);
  });

  it('records unmet demand instead of negative stock', () => {
    const r = toSurface(prepared({ dest: 'mars' }));
    const run = structuredClone(r);
    run.mission!.resources.batteryKWh = 0;
    run.mission!.minute = 0; // night
    tickHour(run, makeHooks(run));
    expect(run.mission!.lastPower!.unmetKWh).toBeGreaterThan(0);
    expect(run.mission!.resources.batteryKWh).toBe(0);
  });

  it('Moon and Mars differ in power profile, events and comm delay', () => {
    expect(SCENARIOS.moon.solarKW(0, 1)).toBeGreaterThan(0);
    expect(SCENARIOS.mars.solarKW(0, 1)).toBe(0);
    const shared = new Set(['CROP', 'WQ', 'SAB', 'SETUP', 'FINAL-EVA', 'PACK']);
    const moonIds = buildSchedule(1, SCENARIOS.moon).map((e) => e.eventId);
    const marsIds = buildSchedule(1, SCENARIOS.mars).map((e) => e.eventId);
    expect(moonIds.filter((id) => !shared.has(id)).some((id) => marsIds.includes(id))).toBe(false);
    expect(SCENARIOS.moon.commDelay).toBe('seconds');
    expect(SCENARIOS.mars.commDelay).toBe('minutes');
  });

  it('sites change the physics: equator heats up toward noon, southern summer has more sun', () => {
    const eq = scenarioFor('moon', 'equator');
    expect(eq.loads.thermal(12, 7)).toBeGreaterThan(eq.loads.thermal(12, 1));
    expect(scenarioFor('mars', 'summer').solarKW(12, 1)).toBeGreaterThan(scenarioFor('mars', 'spring').solarKW(12, 1));
  });
});

describe('schedule & variety', () => {
  it('is deterministic per seed, varies across seeds and spreads events over the 30 days', () => {
    const a = buildSchedule(7, SCENARIOS.mars);
    expect(buildSchedule(7, SCENARIOS.mars)).toEqual(a);
    const sigs = new Set([1, 2, 3, 4, 5, 6].map((seed) => buildSchedule(seed, SCENARIOS.mars).map((e) => e.eventId).join(',')));
    expect(sigs.size).toBeGreaterThan(3);
    expect(a.length).toBeGreaterThanOrEqual(18);
    for (const id of ['MARS-01', 'MARS-03', 'CROP']) expect(a.map((e) => e.eventId)).toContain(id);
    const days = new Set(a.map((e) => Math.floor(e.atMinute / 1440)));
    expect(days.size).toBeGreaterThanOrEqual(15);
    expect(Math.max(...a.map((e) => e.atMinute)) / 1440).toBeGreaterThan(22); // the last week is not empty
    // repeats get their own instance id (decision rolls are bound to it)
    const ids = a.map((e) => e.instanceId ?? e.eventId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('site-specific events only appear at their site', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const eq = buildSchedule(seed, scenarioFor('moon', 'equator')).map((e) => e.eventId);
      expect(eq).not.toContain('ICE');
      expect(eq).not.toContain('SHADOW');
      const pol = buildSchedule(seed, scenarioFor('moon', 'polar')).map((e) => e.eventId);
      expect(pol).not.toContain('HEAT');
    }
  });

  it('every event and chat line has text in both languages', async () => {
    const { en } = await import('../i18n/en');
    const { tr } = await import('../i18n/tr');
    const need: string[] = [];
    for (const ev of EVENTS) {
      need.push(`ev.${ev.id}.title`, `ev.${ev.id}.body`, `ev.${ev.id}.say`);
      for (const o of ev.options) {
        need.push(`ev.${ev.id}.${o.id}.label`, `ev.${ev.id}.${o.id}.desc`, `ev.${ev.id}.${o.id}.ok`);
        if (o.check) need.push(`ev.${ev.id}.${o.id}.fail`);
      }
    }
    for (const c of CHATS) need.push(`chat.${c.id}`);
    const missEn = need.filter((k) => !(k in en));
    const missTr = need.filter((k) => !(k in tr));
    expect(missEn).toEqual([]);
    expect(missTr).toEqual([]);
  });
});

describe('new systems', () => {
  it('Sabatier returns about half of the electrolysis water (derived stoichiometry)', () => {
    const r = structuredClone(toSurface(prepared({ dest: 'mars' })));
    r.mission!.h2Mode = 'sabatier';
    r.mission!.minute = 12 * 60; // midday: everything powered
    tickHour(r, makeHooks(r));
    const f = r.mission!.lastFlows!;
    expect(f.sabatierWater / f.electrolysisWater).toBeCloseTo(0.5, 1);
  });

  it('ripe crops open a harvest decision; potato eyes restart growth', () => {
    let r = structuredClone(toSurface(prepared({ dest: 'moon', cargo: { potato: 1 } })));
    r.mission!.queue = [];
    r.mission!.crop = 'potato';
    r.mission!.systems.greenhouseGrowth = 99.9;
    r = must(r, { type: 'advance', minutes: 120 });
    const ev = r.mission!.activeEvent!;
    expect(ev.eventId).toBe('HARVEST');
    const food0 = r.mission!.resources.foodCrewDays;
    r = must(r, { type: 'resolve', instanceId: ev.instanceId, optionId: 'eyes', crewIds: [] });
    expect(r.mission!.systems.greenhouseGrowth).toBe(35);
    expect(r.mission!.resources.foodCrewDays).toBeGreaterThan(food0 + 10);
  });

  it('a rescue event marks two companions as away; they cannot be assigned', () => {
    let r = structuredClone(toSurface(prepared({ dest: 'mars' })));
    r.mission!.queue = [{ eventId: 'MARS-SAR', atMinute: SURFACE_START_MINUTE + 60 }];
    r = must(r, { type: 'advance', minutes: 600 });
    const ev = r.mission!.activeEvent!;
    expect(ev.subjects).toHaveLength(2);
    expect(ev.subjects).not.toContain('player');
    const opt = eventOf('MARS-SAR').options.find((o) => o.id === 'rescue')!;
    expect(applyCommand(r, { type: 'resolve', instanceId: ev.instanceId, optionId: 'rescue', crewIds: ev.subjects! }).error).toBe('err.crewUnavailable');
    expect(suggestCrew(r, opt).some((id) => ev.subjects!.includes(id))).toBe(false);
  });

  it('crew chatter appears between decisions and never changes resources', () => {
    let r = structuredClone(toSurface(prepared({ dest: 'moon' })));
    r.mission!.queue = [];
    const before = structuredClone(r.mission!.resources);
    const clone = structuredClone(r);
    r = must(r, { type: 'advance', minutes: 14 * 60 });
    expect(r.mission!.journal.filter((j) => j.tone === 'chat').length).toBeGreaterThanOrEqual(3);
    // same run without chatter state differences: resources match a run where chats were already used up
    clone.mission!.nextChatMinute = 1e9;
    const quiet = must(clone, { type: 'advance', minutes: 14 * 60 });
    expect(quiet.mission!.resources).toEqual(r.mission!.resources);
    expect(before).not.toEqual(r.mission!.resources);
  });
});

describe('save', () => {
  it('round-trips mid-mission with open event, tasks and phase', () => {
    let r = toSurface(prepared({ dest: 'moon' }));
    r = must(r, { type: 'advance', minutes: 100000 });
    const loaded = deserialize(serialize(r));
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.run).toEqual(r);
      const ev = loaded.run.mission!.activeEvent!;
      const opt = eventOf(ev.eventId).options.find((o) => optionState(loaded.run, o, ev).available)!;
      const a = must(loaded.run, { type: 'resolve', instanceId: ev.instanceId, optionId: opt.id, crewIds: suggestCrew(loaded.run, opt) });
      const b = must(r, { type: 'resolve', instanceId: ev.instanceId, optionId: opt.id, crewIds: suggestCrew(r, opt) });
      expect(serialize(a)).toBe(serialize(b));
    }
  });

  it('rejects corrupt and old saves without throwing', () => {
    expect(deserialize('{nope').ok).toBe(false);
    expect(deserialize(JSON.stringify({ schemaVersion: 0 })).ok).toBe(false);
    expect(deserialize(null).ok).toBe(false);
    const bad = JSON.parse(serialize(launchAnyway(prepared({ dest: 'moon' }))));
    delete bad.mission.crew;
    expect(deserialize(JSON.stringify(bad)).ok).toBe(false);
  });
});

describe('policies (deterministic fixtures)', () => {
  it('careful Moon and Mars plans bring everyone home; a full success is reachable but not guaranteed (v0.6 difficulty)', () => {
    const ratings: Record<string, string[]> = { moon: [], mars: [] };
    for (const seed of [1, 42, 777]) {
      const moon = play(prepared({ dest: 'moon', seed, cargo: { parts: 2, sealant: 1, food: 2, shield: 1, medkit: 1, comfort: 1 } }), carefulMoon);
      const mars = play(prepared({ dest: 'mars', seed, cargo: { filter: 1, battery: 1, food: 2, parts: 1, cleaner: 1, seeds: 1 } }), carefulMars);
      for (const [k, r] of [['moon', moon], ['mars', mars]] as const) {
        const o = computeOutcome(r);
        expect(o.lost).toEqual([]);
        expect(o.home).toHaveLength(4);
        ratings[k].push(o.rating);
      }
      expect(mars.mission!.echoes.length).toBeGreaterThanOrEqual(2); // preparation changed options
    }
    const full = (x: string) => x === 'success' || x === 'excellent';
    expect(ratings.moon.some(full)).toBe(true);
    expect(ratings.mars.some(full)).toBe(true);
  });

  it('an empty cargo bay leads to a harder return on Mars (not a full success)', () => {
    for (const seed of [1, 42, 777]) {
      const r = play(prepared({ dest: 'mars', seed }), { 'OUT-01': ['rest'], 'MARS-01': ['ration'], 'MARS-02': ['eco'], 'MARS-03': ['salvage'], 'EMG-O2': ['cutLoads'], 'RETURN-01': ['balanced', 'wait', 'ration'] });
      expect(computeOutcome(r).rating).not.toBe('success');
    }
  });

  it('ignoring an oxygen shortage follows a warned, explained chain to loss (standard) or evacuation (explorer)', () => {
    for (const mode of ['standard', 'explorer'] as const) {
      let r = toSurface(prepared({ dest: 'moon', mode }));
      r = structuredClone(r);
      r.mission!.resources.o2Kg = 4;
      r.mission!.env.leakKgH = 0.6;
      r.mission!.flags.contingencyUsed = true; // this fixture ignores the problem: no reserve
      let guard = 0;
      while (r.phase === 'surface' && guard++ < 200) {
        const ev = r.mission!.activeEvent;
        if (ev) {
          const def = eventOf(ev.eventId);
          const pref = ['cutLoads', 'rest', 'prioritize', 'call', 'skip', 'isolate', 'shelterNow', 'ignore', 'greens', 'vent', 'reprocess', 'treatCause', 'medic'];
          const avail = def.options.filter((o) => optionState(r, o, ev).available);
          const opt = avail.find((o) => pref.includes(o.id)) ?? avail.find((o) => !o.crew) ?? avail[0];
          r = must(r, { type: 'resolve', instanceId: ev.instanceId, optionId: opt.id, crewIds: suggestCrew(r, opt) });
          if (r.mission && r.mission.env.leakKgH < 0.6 && !r.mission.ended) r.mission.env.leakKgH = 0.6; // keep the leak in this fixture
        } else {
          r = must(r, { type: 'advance', minutes: 60 });
          if (r.mission && r.mission.env.leakKgH < 0.6 && !r.mission.ended) r.mission.env.leakKgH = 0.6;
        }
      }
      const m = r.mission!;
      expect(m.journal.some((j) => j.key === 'journal.o2Warning')).toBe(true);
      expect(m.decisions.some((d) => d.eventId === 'EMG-O2')).toBe(true);
      const warnedAt = m.journal.find((j) => j.key === 'journal.o2Warning')!.minute;
      const lossAt = m.journal.find((j) => j.tone === 'loss')!.minute;
      expect(lossAt).toBeGreaterThan(warnedAt);
      const o = computeOutcome(r);
      if (mode === 'standard') expect(o.rating).toBe('lost');
      else {
        expect(o.rating).toBe('aborted');
        expect(m.crew.some((c) => c.status === 'deceased')).toBe(false);
      }
    }
  });

  it('return checklist reflects reserves', () => {
    const r = play(prepared({ dest: 'moon', seed: 42, cargo: { food: 2 } }), carefulMoon);
    expect(returnStatus(r, r.mission!).lines.find((l) => l.key === 'crew')!.ok).toBe(true);
  });
});

describe('30-day mission: countdowns, preparation, time', () => {
  const crewOf = (run: RunState) => [run.player, ...run.crewIds.map((id) => run.candidates.find((c) => c.id === id)!)];

  it('places the predictable big events per site, deterministically, with forecasts before hits', () => {
    for (const seed of [1, 2, 3]) {
      const eq = prepared({ seed, dest: 'moon', site: 'equator' });
      const a = buildBigEvents(seed, scenarioFor('moon', 'equator'), crewOf(eq));
      expect(buildBigEvents(seed, scenarioFor('moon', 'equator'), crewOf(eq))).toEqual(a);
      const night = a.find((b) => b.kind === 'night')!;
      expect(night.startAt / 1440).toBeGreaterThan(14);
      expect(night.startAt / 1440).toBeLessThan(15.5);
      expect((night.endAt - night.startAt) / 1440).toBeGreaterThan(14);
      expect(a.some((b) => b.kind === 'meteor') && a.some((b) => b.kind === 'resupply')).toBe(true);
      const pol = buildBigEvents(seed, scenarioFor('moon', 'polar'), crewOf(eq));
      expect(pol.some((b) => b.kind === 'dark')).toBe(true);
      expect(pol.some((b) => b.kind === 'night')).toBe(false);
      expect(buildBigEvents(seed, scenarioFor('mars', 'summer'), crewOf(eq)).filter((b) => b.kind === 'storm')).toHaveLength(2);
      expect(buildBigEvents(seed, scenarioFor('mars', 'spring'), crewOf(eq)).filter((b) => b.kind === 'storm')).toHaveLength(1);
      for (const b of [...a, ...pol]) expect(b.announceAt).toBeLessThan(b.startAt);
    }
  });

  it('a communications officer gets every warning one day earlier', () => {
    const run = prepared({ seed: 4, dest: 'mars', site: 'summer' });
    const crew = crewOf(run);
    const s = scenarioFor('mars', 'summer');
    const base = buildBigEvents(4, s, crew.map((c) => ({ ...c, traitId: 'mechanic' as const })));
    const comms = buildBigEvents(4, s, crew.map((c, i) => ({ ...c, traitId: i === 1 ? ('comms' as const) : ('mechanic' as const) })));
    for (let i = 0; i < base.length; i++) {
      expect(comms[i].startAt).toBe(base[i].startAt);
      expect(comms[i].announceAt).toBeLessThanOrEqual(base[i].announceAt - 1440 + 1e-9);
    }
  });

  it('preparation tasks: only during the countdown, once, with crew time, and they change the hit', () => {
    let r = toSurface(prepared({ seed: 3, dest: 'mars', site: 'summer' }));
    const storm = r.mission!.big.find((b) => b.kind === 'storm')!;
    expect(applyCommand(r, { type: 'prep', bigId: storm.id, actionId: 'stow', crewIds: ['player', 'c01'] }).error).toBe('err.prepClosed');
    // run to the forecast
    while (bigStatus(storm, r.mission!.minute) !== 'countdown') {
      const ev = r.mission!.activeEvent;
      if (ev) {
        const def = eventOf(ev.eventId);
        const o = def.options.find((x) => optionState(r, x, ev).available)!;
        r = must(r, { type: 'resolve', instanceId: ev.instanceId, optionId: o.id, crewIds: suggestCrew(r, o) });
      } else r = must(r, { type: 'advance', minutes: 60 });
    }
    // the forecast does not stop the clock; it is a journal line (and a banner in the UI)
    if (!r.mission!.activeEvent) r = must(r, { type: 'advance', minutes: 1 });
    expect(r.mission!.journal.some((j) => j.key === 'ev.FC-STORM.title' && j.tone === 'forecast')).toBe(true);
    while (r.mission!.activeEvent) {
      const ev = r.mission!.activeEvent;
      const o = eventOf(ev.eventId).options.find((x) => optionState(r, x, ev).available)!;
      r = must(r, { type: 'resolve', instanceId: ev.instanceId, optionId: o.id, crewIds: suggestCrew(r, o) });
    }
    expect(bigStatus(storm, r.mission!.minute)).toBe('countdown');
    const o = eventOf('PREP-storm').options.find((x) => x.id === 'stow')!;
    const crew = suggestCrew(r, o);
    r = must(r, { type: 'prep', bigId: storm.id, actionId: 'stow', crewIds: crew });
    expect(r.mission!.flags[prepStatusKey(storm.id, 'stow')]).toBe('doing');
    expect(r.mission!.crew.filter((c) => c.taskId).length).toBe(2);
    expect(applyCommand(r, { type: 'prep', bigId: storm.id, actionId: 'stow', crewIds: crew }).error).toBe('err.alreadyResolved');
    // the task takes 3 h; resolve whatever opens meanwhile
    for (let i = 0; i < 20 && r.mission!.tasks.some((t) => t.eventId === 'PREP-storm'); i++) {
      const open = (r.mission as MissionState).activeEvent as ActiveEvent | null;
      if (open) {
        const o = eventOf(open.eventId).options.find((x) => optionState(r, x, open).available)!;
        r = must(r, { type: 'resolve', instanceId: open.instanceId, optionId: o.id, crewIds: suggestCrew(r, o) });
      } else r = must(r, { type: 'advance', minutes: 60 });
    }
    expect(r.mission!.flags['prep.storm.stow']).toBe(true);
    expect(r.mission!.flags[prepStatusKey(storm.id, 'stow')]).toBe('done');
  });

  it('lunar night: no sunlight, fission keeps the base alive; a clean radiator keeps full power', () => {
    const eq = scenarioFor('moon', 'equator');
    expect(eq.solarKW(12, 20)).toBe(0);
    expect(eq.solarKW(12, 3)).toBeGreaterThan(3);
    expect(eq.baseKW).toBeGreaterThan(0);
    expect(scenarioFor('moon', 'polar').baseKW).toBe(0);
    const set = lunarSun(14 * 1440);
    expect(set.up).toBe(true);
    expect(lunarSun(20 * 1440).up).toBe(false);
    for (const radiator of [true, false]) {
      const run = play(prepared({ seed: 5, dest: 'moon', site: 'equator', cargo: { food: 2, parts: 1 } }), { PREP: radiator ? ['radiator', 'insulate'] : [], NIGHT: ['hibernate'], 'REINF-OFFER': ['decline'] });
      const night = run.mission!.decisions.find((d) => d.eventId === 'NIGHT');
      expect(night).toBeDefined();
      const prepped = run.mission!.decisions.some((d) => d.eventId === 'PREP-night' && d.optionId === 'radiator' && d.success);
      const hit = run.mission!.journal.find((j) => j.key === 'journal.radiatorOk' || j.key === 'journal.radiatorDusty')!;
      expect(hit.key).toBe(prepped ? 'journal.radiatorOk' : 'journal.radiatorDusty');
      expect(run.mission!.journal.some((j) => j.key === 'journal.dawn')).toBe(true);
    }
  });

  it('records one history row per day for the debrief chart and recap', () => {
    const run = play(prepared({ seed: 8, dest: 'moon', cargo: { food: 2, parts: 1, sealant: 1 } }), carefulMoon);
    const h = run.mission!.history;
    expect(h[0].day).toBe(0);
    expect(h.at(-1)!.day).toBe(30);
    expect(new Set(h.map((x) => x.day)).size).toBe(h.length);
  });

  it('time awareness: a Mars hour is 1.0275 Earth hours; Moon clocks gain 58.7 µs a day', () => {
    expect(SOL_TO_EARTH).toBeCloseTo(1.0275, 4);
    const mars = { ...prepared({ dest: 'mars' }) };
    const moon = { ...prepared({ dest: 'moon' }) };
    const tenDays = SURFACE_START_MINUTE + 10 * 1440;
    expect(earthMinutesElapsed(mars, tenDays) - 10 * 1440).toBeCloseTo(10 * 1440 * 0.0275, -1);
    expect(earthMinutesElapsed(moon, tenDays)).toBe(10 * 1440);
    expect(clockDrift(moon, tenDays)).toEqual({ unit: 'us', value: 587 });
  });

  it('the water emergency offers a decision before the tanks run dry', () => {
    const r = structuredClone(toSurface(prepared({ dest: 'mars', seed: 2 })));
    const m = r.mission!;
    m.queue = [];
    m.resources.waterL = 6;
    m.systems.waterRecycler = 30;
    const out = must(r, { type: 'advance', minutes: 180 });
    expect(out.mission!.activeEvent?.eventId).toBe('EMG-WATER');
  });

  it('prep helper used by the balance policies never errors', () => {
    const r = toSurface(prepared({ dest: 'moon', site: 'equator' }));
    expect(() => startPreps(r, PREPS)).not.toThrow();
  });
});

describe('v0.6: choices, harvest variety, reinforcement, difficulty', () => {
  const gated = (c: Cond): boolean => c.kind === 'item' || c.kind === 'trait' || c.kind === 'research' || (c.kind === 'any' && c.of.every(gated));

  it('every decision card offers at least 3 options that need no kit, role or research, and at most 6 in total', () => {
    for (const ev of EVENTS.filter((e) => e.kind !== 'prep' && e.kind !== 'forecast')) {
      const open = ev.options.filter((o) => !(o.requires ?? []).some(gated));
      expect({ id: ev.id, open: open.length >= 3 }).toEqual({ id: ev.id, open: true });
      expect(ev.options.length).toBeLessThanOrEqual(6);
    }
  });

  it('harvest cards rotate and never repeat back to back', () => {
    const run = play(prepared({ seed: 12, dest: 'moon', site: 'polar', cargo: { food: 2, parts: 1, sealant: 1 } }), carefulMoon);
    const h = run.mission!.decisions.filter((d) => d.eventId.startsWith('HARVEST')).map((d) => d.eventId);
    expect(h.length).toBeGreaterThanOrEqual(3);
    expect(new Set(h).size).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < h.length; i++) expect(h[i]).not.toBe(h[i - 1]);
  });

  it('Moon: two live calls bring a reinforcement offer; accepting adds two people and a module', () => {
    const policy: Policy = { ...carefulMoon, 'MOON-S1': ['call'], 'REINF-OFFER': ['accept'], PREP: [...PREPS, 'site', 'power'], REINF: ['welcome', 'assemble'] };
    let found = false;
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const run = play(prepared({ seed, dest: 'moon', site: 'polar', cargo: { food: 3, parts: 1, sealant: 1 } }), policy);
      const m = run.mission!;
      if (!m.decisions.some((d) => d.eventId === 'REINF-OFFER')) continue;
      found = true;
      expect(m.flags.earthCalls).toBeGreaterThanOrEqual(2);
      expect(m.crew).toHaveLength(6);
      expect(new Set(m.crew.map((c) => c.id)).size).toBe(6);
      expect(m.decisions.some((d) => d.eventId === 'REINF')).toBe(true);
      // never before day 20 (user request)
      const arrived = m.journal.find((j) => j.key === 'journal.arrived')!;
      expect(arrived.minute).toBeGreaterThanOrEqual(19 * 1440 + 600);
    }
    expect(found).toBe(true);
    const mars = play(prepared({ seed: 1, dest: 'mars', cargo: { food: 2, filter: 1 } }), { 'MARS-S1': ['reply'] });
    expect(mars.mission!.decisions.some((d) => d.eventId === 'REINF-OFFER')).toBe(false);
  });

  it('difficulty: base chances are 15% lower; outside work uses suit consumables', () => {
    const r = toSurface(prepared({ dest: 'moon' }));
    expect(successChance(r, { base: 0.6, skill: 'technical' }, []).factors[0].value).toBeCloseTo(0.51, 5);
    const idle = structuredClone(r);
    const busy = structuredClone(r);
    idle.mission!.queue = [];
    busy.mission!.queue = [];
    const c = busy.mission!.crew[1];
    c.taskId = 'MOON-01@x:calibrate';
    busy.mission!.tasks.push({ id: c.taskId, eventInstanceId: 'MOON-01@x', eventId: 'MOON-01', optionId: 'calibrate', crewIds: [c.id], startedAt: 0, endsAt: 1e9, success: true });
    tickHour(idle, makeHooks(idle));
    tickHour(busy, makeHooks(busy));
    expect(idle.mission!.resources.o2Kg - busy.mission!.resources.o2Kg).toBeCloseTo(0.06, 5);
    expect(busy.mission!.lastFlows!.eva.people).toBe(1);
  });
});

describe('v0.7: stay estimate, return home, V3 test fixes', () => {
  it('estimates the stay before launch: deterministic, more food helps, goal is 85%', () => {
    const a = estimateStay(prepared({ seed: 5, dest: 'moon', site: 'polar', cargo: {} }));
    expect(estimateStay(prepared({ seed: 5, dest: 'moon', site: 'polar', cargo: {} }))).toEqual(a);
    const b = estimateStay(prepared({ seed: 5, dest: 'moon', site: 'polar', cargo: { food: 2 } }));
    expect(b.estimate).toBeGreaterThan(a.estimate);
    expect(a.limiting).toBe('food');
    expect(b.target).toBe(Math.max(8, Math.min(30, Math.floor(b.estimate * GOAL_SHARE))));
    const run = launchAnyway(prepared({ seed: 5, dest: 'moon', site: 'polar', cargo: { food: 2 } }));
    expect(run.mission!.goal.target).toBeGreaterThan(0);
  });

  it('go home early: the return starts at once and an early return is only a partial success', () => {
    let r = toSurface(prepared({ dest: 'moon', seed: 3, cargo: { food: 2, parts: 1 } }));
    expect(applyCommand(r, { type: 'returnHome' }).error).toBeUndefined();
    r = must(r, { type: 'advance', minutes: 60 * 30 });
    while (r.mission!.activeEvent && r.phase === 'surface') {
      const ev = r.mission!.activeEvent;
      const o = eventOf(ev.eventId).options.find((x) => optionState(r, x, ev).available)!;
      r = must(r, { type: 'resolve', instanceId: ev.instanceId, optionId: o.id, crewIds: suggestCrew(r, o) });
    }
    if (r.phase !== 'surface') return; // an emergency ended it; nothing more to check
    r = must(r, { type: 'returnHome' });
    // v0.8: the ascent always leaves in the next 13:00 window, so the result no longer depends on the hour pressed
    expect(r.phase).toBe('surface');
    expect((r.mission!.flags.departAt as number) % 1440).toBe(13 * 60);
    expect(applyCommand(r, { type: 'returnHome' }).error).toBe('err.alreadyResolved');
    expect(r.mission!.journal.some((j) => j.key === 'journal.returnEarly')).toBe(true);
    for (let i = 0; i < 60 && r.phase === 'surface'; i++) {
      const ev = r.mission!.activeEvent;
      if (ev) {
        const o = eventOf(ev.eventId).options.find((x) => optionState(r, x, ev).available)!;
        r = must(r, { type: 'resolve', instanceId: ev.instanceId, optionId: o.id, crewIds: suggestCrew(r, o) });
      } else r = must(r, { type: 'advance', minutes: 60 });
    }
    if (r.phase !== 'returnPrep') return; // an emergency ended it first
    expect(r.mission!.minute % 1440).toBe(13 * 60);
    const done = playLaunched(r, { 'RETURN-01': ['safety', 'balanced', 'ration'], 'RETURN-02': ['reroute', 'repair'] });
    const o = computeOutcome(done);
    expect(o.daysOnSurface).toBeLessThan(o.goal.target);
    expect(o.rating).not.toBe('success');
  });

  it('a temporary greenhouse shutdown restores the previous mode, not "full" (V3: Mars spring trap)', () => {
    const r = structuredClone(toSurface(prepared({ dest: 'mars', site: 'spring', seed: 4 })));
    const m = r.mission!;
    m.queue = [];
    m.greenhouseMode = 'eco';
    const hooks = makeHooks(r);
    applyEffects({ run: r, m, scenario: scenarioFor('mars', 'spring'), event: null, assigned: [] }, [{ kind: 'gh', mode: 'off' }, { kind: 'flag', key: 'hunker', value: true }, { kind: 'env', key: 'dustHours', value: 2 }], hooks);
    for (let i = 0; i < 3; i++) tickHour(r, hooks);
    expect(m.greenhouseMode).toBe('eco');
  });

  it('the contingency reserve rescues once per mission, from any emergency', () => {
    const o2 = eventOf('EMG-O2').options.find((o) => o.id === 'reserve')!;
    const water = eventOf('EMG-WATER').options.find((o) => o.id === 'reserve')!;
    const r = structuredClone(toSurface(prepared({ dest: 'mars', seed: 2 })));
    expect(optionState(r, o2, null).available).toBe(true);
    r.mission!.flags.contingencyUsed = true;
    expect(optionState(r, water, null).available).toBe(false);
  });
});

describe('v0.8: random landing, departure window, V4 fixes', () => {
  it('each destination has eight landing sites with all four difficulties; the pick is seeded and sets the site', () => {
    for (const d of ['moon', 'mars'] as const) {
      const ls = landingsFor(d);
      expect(ls).toHaveLength(8);
      expect(new Set(ls.map((l) => l.difficulty))).toEqual(new Set(['easy', 'medium', 'hard', 'veryHard']));
    }
    expect(pickLanding(9, 'mars').id).toBe(pickLanding(9, 'mars').id);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) seen.add(pickLanding(seed, 'moon').id);
    expect(seen.size).toBeGreaterThanOrEqual(6);
    let r = createRun(11, 'en');
    r = must(r, { type: 'setDestination', destination: 'mars' });
    expect(r.site).toBeNull();
    const run = launchAnyway(r.candidates.length ? prepared({ dest: 'mars', seed: 11 }) : r);
    const l = LANDING_SITES.find((x) => x.id === run.landing)!;
    expect(l.dest).toBe('mars');
    expect(run.site).toBe(l.base);
  });

  it('the departure window is always 13:00, whatever hour the player presses', () => {
    for (const hour of [0, 6, 12.6, 13, 20]) {
      const at = nextDeparture(3 * 1440 + hour * 60);
      expect(at % 1440).toBe(13 * 60);
      expect(at - (3 * 1440 + hour * 60)).toBeGreaterThan(29);
    }
  });

  it('the patient cannot be assigned to treat themselves (V4 6.4)', () => {
    const r = structuredClone(toSurface(prepared({ dest: 'moon', seed: 2 })));
    const m = r.mission!;
    m.queue = [];
    const patient = m.crew[1].id;
    openEvent(r, 'EMG-MED', 'EMG-MED@t', makeHooks(r), patient);
    const opt = eventOf('EMG-MED').options.find((o) => o.id === 'treatCause')!;
    expect(availableCrewFor(r, opt).map((c) => c.id)).not.toContain(patient);
  });

  it('shelter ends with the storm, and stress at the limit opens a crisis card (eksikler 3)', () => {
    const r = structuredClone(toSurface(prepared({ dest: 'moon', seed: 6 })));
    const m = r.mission!;
    m.queue = [];
    m.crew[0].sheltered = true;
    m.env.speHours = 0;
    m.crew[2].stress = 100;
    const hooks = makeHooks(r);
    tickHour(r, hooks);
    expect(m.crew[0].sheltered).toBe(false);
    m.activeEvent = null;
    m.crew[2].stress = 100;
    m.crew[2].taskId = null;
    checkEmergencies(r, hooks);
    const opened = m.activeEvent as ActiveEvent | null;
    expect(opened?.eventId).toBe('CREW-CRISIS');
    expect(opened?.subjectCrewId).toBe(m.crew[2].id);
  });

  it('the Moon reinforcement crew is offered only when the goal reaches day 20 (V4 6.5)', () => {
    const r = toSurface(prepared({ dest: 'moon', seed: 8, cargo: { food: 2 } }));
    const low = structuredClone(r);
    low.mission!.goal.target = 12;
    const done = playLaunched(low, {});
    expect(done.mission!.decisions.some((d) => d.eventId === 'R-REINF')).toBe(false);
  });
});

describe('v0.9: end-of-mission rank', () => {
  it('ranks by science points, with the next rank and a cap when crew were lost', () => {
    expect(rankFor(0, false).id).toBe('cadet');
    expect(rankFor(99, false).id).toBe('cadet');
    expect(rankFor(100, false).id).toBe('technician');
    expect(rankFor(349, false)).toMatchObject({ id: 'researcher', next: { id: 'senior', min: 350 } });
    expect(rankFor(700, false)).toMatchObject({ id: 'legend', next: null, capped: false });
    expect(rankFor(800, true)).toMatchObject({ id: 'researcher', capped: true, next: null });
    expect(rankFor(150, true)).toMatchObject({ id: 'technician', capped: false });
    // thresholds rise strictly and the ladder has six steps
    expect(RANKS.map((r) => r.min)).toEqual([0, 100, 200, 350, 500, 700]);
  });
});

