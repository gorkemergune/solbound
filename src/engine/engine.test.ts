import { describe, expect, it } from 'vitest';
import { applyCommand, createRun, launchBlockers, payloadOf } from './commands';
import { LAUNCH_CAPACITY_KG, PERSONAL_KIT_KG, payload, validateQuantity } from './cargo';
import { buildSchedule } from './schedule';
import { CHATS } from './chatter';
import { EVENTS } from './events';
import { generateCandidates } from './characters';
import { computeOutcome } from './outcome';
import { eventOf, optionState, returnStatus, successChance, suggestCrew } from './rules';
import { deserialize, serialize } from './save';
import { SCENARIOS, SURFACE_START_MINUTE, scenarioFor } from './scenarios';
import { WATER_PER_KG_O2, tickHour, makeHooks } from './sim';
import { launchAnyway, must, play, prepared, type Policy } from './testkit';
import type { RunState } from './types';

const carefulMoon: Policy = { 'OUT-01': ['full'], 'MOON-01': ['calibrate'], 'MOON-02': ['patch', 'replace'], 'MOON-03': ['waterWall', 'shelterNow'], 'RETURN-01': ['balanced'], 'RETURN-02': ['spare'] };
const carefulMars: Policy = { 'OUT-01': ['full'], 'MARS-01': ['swapFilter'], 'MARS-02': ['eco'], 'MARS-03': ['replant'], 'RETURN-01': ['balanced'], 'RETURN-02': ['spare'] };

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
    expect(a.candidates).toEqual(b.candidates);
    expect(a.player.skills).toEqual(b.player.skills);
    expect(createRun(124, 'en').candidates).not.toEqual(a.candidates);
  });

  it('generates 12 candidates with unique ids and every trait at least once', () => {
    const c = generateCandidates(9);
    expect(c).toHaveLength(12);
    expect(new Set(c.map((x) => x.id)).size).toBe(12);
    expect(new Set(c.map((x) => x.traitId)).size).toBe(10);
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
    expect(r.mission!.systems.solar).toBe(70);
    const success = r.mission!.decisions.at(-1)!.success;
    r = must(r, { type: 'advance', minutes: 180 });
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
    const expected = w0 + crewUse * s.recyclerRecovery * f.water - crewUse - prod * WATER_PER_KG_O2 - s.greenhouseWaterLH.full * f.greenhouse;
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
    const shared = new Set(['CROP', 'WQ', 'SAB']);
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
  it('is deterministic per seed, varies across seeds, keeps 2–3 events a day for the 7-day demo', () => {
    const a = buildSchedule(7, SCENARIOS.mars);
    expect(buildSchedule(7, SCENARIOS.mars)).toEqual(a);
    const sigs = new Set([1, 2, 3, 4, 5, 6].map((seed) => buildSchedule(seed, SCENARIOS.mars).map((e) => e.eventId).join(',')));
    expect(sigs.size).toBeGreaterThan(3);
    expect(a.length).toBeGreaterThanOrEqual(12);
    for (const id of ['MARS-01', 'MARS-02', 'MARS-03', 'CROP']) expect(a.map((e) => e.eventId)).toContain(id);
    const days = new Set(a.map((e) => Math.floor(e.atMinute / 1440)));
    expect(days.size).toBe(7);
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
  it('careful Moon and Mars plans bring everyone home', () => {
    for (const seed of [1, 42, 777]) {
      const moon = play(prepared({ dest: 'moon', seed, cargo: { parts: 2, sealant: 1, food: 2, shield: 1, medkit: 1, comfort: 1 } }), carefulMoon);
      expect(computeOutcome(moon).rating).toBe('success');
      const mars = play(prepared({ dest: 'mars', seed, cargo: { filter: 1, battery: 1, food: 2, parts: 1, cleaner: 1, seeds: 1 } }), carefulMars);
      expect(computeOutcome(mars).rating).toBe('success');
      expect(mars.mission!.echoes.length).toBeGreaterThanOrEqual(2); // preparation changed options
    }
  });

  it('an empty cargo bay leads to a harder, partial return on Mars', () => {
    const r = play(prepared({ dest: 'mars', seed: 42 }), { 'OUT-01': ['rest'], 'MARS-01': ['ration'], 'MARS-02': ['eco'], 'MARS-03': ['salvage'], 'RETURN-01': ['balanced', 'wait', 'ration'] });
    const before = r.mission!.decisions.find((d) => d.eventId === 'RETURN-01' && d.optionId === 'ration');
    expect(before).toBeDefined();
    expect(computeOutcome(r).rating).toBe('partial');
  });

  it('ignoring an oxygen shortage follows a warned, explained chain to loss (standard) or evacuation (explorer)', () => {
    for (const mode of ['standard', 'explorer'] as const) {
      let r = toSurface(prepared({ dest: 'moon', mode }));
      r = structuredClone(r);
      r.mission!.resources.o2Kg = 4;
      r.mission!.env.leakKgH = 0.6;
      let guard = 0;
      while (r.phase === 'surface' && guard++ < 200) {
        const ev = r.mission!.activeEvent;
        if (ev) {
          const def = eventOf(ev.eventId);
          const pref = ['cutLoads', 'rest', 'prioritize', 'call', 'skip', 'isolate', 'shelterNow', 'ignore', 'greens', 'vent', 'reprocess'];
          const avail = def.options.filter((o) => optionState(r, o, ev).available);
          const opt = avail.find((o) => pref.includes(o.id)) ?? avail.find((o) => !o.crew) ?? avail[0];
          r = must(r, { type: 'resolve', instanceId: ev.instanceId, optionId: opt.id, crewIds: suggestCrew(r, opt) });
          if (r.mission && r.mission.env.leakKgH < 0.6 && !r.mission.ended) r.mission.env.leakKgH = 0.6; // keep the leak in this fixture
        } else r = must(r, { type: 'advance', minutes: 60 });
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
