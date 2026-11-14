import type { CoverMode, Crop, DestinationId, Environment, GreenhouseMode, H2Mode, ItemId, ResourceKey, SiteId, SkillKey, SystemKey, TraitId } from './types';
import { EVENTS_2 } from './events2';

// ---------- Declarative event DSL ----------

export type Cond =
  | { kind: 'item'; item: ItemId }
  | { kind: 'trait'; trait: TraitId }
  | { kind: 'research'; id: string }
  | { kind: 'batteryFrac'; min: number }
  | { kind: 'flag'; key: string; value: string | number | boolean }
  | { kind: 'notFlag'; key: string; value: string | number | boolean }
  | { kind: 'flagIn'; key: string; values: (string | number | boolean)[] }
  | { kind: 'returnReady' }
  | { kind: 'notReturnReady' }
  | { kind: 'envBelow'; key: keyof Environment; max: number }
  | { kind: 'assignedTrait'; trait: TraitId }
  | { kind: 'subjectIsPlayer' }
  | { kind: 'notSubjectIsPlayer' }
  | { kind: 'site'; sites: SiteId[] }
  | { kind: 'cropIs'; crop: Crop }
  | { kind: 'cropNot'; crop: Crop }
  | { kind: 'any'; of: Cond[] };

export type CrewTarget = 'all' | 'assigned' | 'subject' | 'unassigned';

export type Effect =
  | { kind: 'res'; key: ResourceKey; delta: number }
  | { kind: 'scienceFactor'; factor: number }
  | { kind: 'sys'; key: SystemKey; delta: number }
  | { kind: 'sysSet'; key: SystemKey; value: number }
  | { kind: 'env'; key: keyof Environment; value: number }
  | { kind: 'gh'; mode: GreenhouseMode }
  | { kind: 'flag'; key: string; value: string | number | boolean }
  | { kind: 'crew'; target: CrewTarget; stat: 'health' | 'stress' | 'fatigue' | 'radiation'; delta: number }
  | { kind: 'shelter'; target: CrewTarget; value: boolean }
  | { kind: 'rest'; target: CrewTarget }
  | { kind: 'use'; item: ItemId; qty?: number }
  | { kind: 'evacuate'; target: 'subject' }
  | { kind: 'harvestNow'; fraction: number }
  | { kind: 'wait'; hours: number }
  | { kind: 'abort' }
  | { kind: 'setCrop'; crop: Crop; growth: number }
  | { kind: 'harvest'; fraction: number; regrow: number }
  | { kind: 'h2'; mode: H2Mode }
  | { kind: 'cover'; mode: CoverMode }
  | { kind: 'note'; key: string; tone?: 'info' | 'good' | 'warn' | 'bad' }
  | { kind: 'if'; cond: Cond; then: Effect[]; else?: Effect[] };

export type Check = {
  base: number;
  skill: SkillKey;
  traits?: TraitId[];
  items?: { item: ItemId; bonus: number }[];
  flags?: { key: string; value: string | number | boolean; bonus: number }[];
  /** close-range support from Earth: only where comm delay is seconds (Moon) */
  earth?: boolean;
  hazard?: number;
};

export type EventOption = {
  id: string;
  requires?: Cond[];
  crew?: { count: number; skill: SkillKey; traits?: TraitId[]; outside?: boolean; mustHave?: TraitId };
  hours?: number;
  cost?: Effect[];
  check?: Check;
  success: Effect[];
  failure?: Effect[];
  weight: number;
  /** research cards relevant to this option */
  research?: string[];
};

export type EventKind = 'main' | 'small' | 'emergency' | 'transit';

export type EventDef = {
  id: string;
  destination: DestinationId | 'both';
  phase: 'outbound' | 'surface' | 'returnPrep' | 'returnFlight';
  kind: EventKind;
  illustration: string;
  speaker: SkillKey;
  research: string[];
  /** how many crew members the event is about (they are away and cannot be assigned) */
  subjects?: number;
  onOpen?: Effect[];
  options: EventOption[];
};

// ---------- Content (first vertical slice) ----------

const OUT_01: EventDef = {
  id: 'OUT-01',
  destination: 'both',
  phase: 'outbound',
  kind: 'transit',
  illustration: 'ship',
  speaker: 'technical',
  research: ['R-ECLSS'],
  options: [
    {
      id: 'full',
      cost: [{ kind: 'crew', target: 'all', stat: 'fatigue', delta: 18 }, { kind: 'crew', target: 'all', stat: 'stress', delta: 4 }],
      success: [{ kind: 'flag', key: 'preflight', value: 'full' }],
      weight: 2,
    },
    {
      id: 'specialist',
      crew: { count: 1, skill: 'technical', traits: ['mechanic', 'pilot'] },
      cost: [{ kind: 'crew', target: 'assigned', stat: 'fatigue', delta: 12 }],
      check: { base: 0.55, skill: 'technical', traits: ['mechanic', 'pilot'], earth: true },
      success: [{ kind: 'flag', key: 'preflight', value: 'found' }],
      failure: [{ kind: 'flag', key: 'preflight', value: 'none' }],
      weight: 2,
    },
    {
      id: 'trim',
      requires: [{ kind: 'trait', trait: 'pilot' }],
      success: [{ kind: 'flag', key: 'preflight', value: 'none' }, { kind: 'flag', key: 'landingTrim', value: true }],
      weight: 2,
    },
    {
      id: 'rest',
      cost: [{ kind: 'crew', target: 'all', stat: 'stress', delta: -10 }, { kind: 'crew', target: 'all', stat: 'fatigue', delta: -10 }],
      success: [{ kind: 'flag', key: 'preflight', value: 'none' }],
      weight: 2,
    },
  ],
};

const MOON_01: EventDef = {
  id: 'MOON-01',
  destination: 'moon',
  phase: 'surface',
  kind: 'main',
  illustration: 'solar',
  speaker: 'technical',
  research: ['R-BATTERY', 'R-MOON-ENV'],
  onOpen: [{ kind: 'sysSet', key: 'solar', value: 70 }],
  options: [
    {
      id: 'prioritize',
      success: [{ kind: 'gh', mode: 'off' }, { kind: 'flag', key: 'moonStartup', value: 'prioritized' }],
      weight: 2,
      research: ['R-BATTERY'],
    },
    {
      id: 'allOn',
      requires: [{ kind: 'batteryFrac', min: 0.5 }],
      success: [{ kind: 'flag', key: 'moonStartup', value: 'allOn' }],
      weight: 2,
      research: ['R-BATTERY'],
    },
    {
      id: 'calibrate',
      crew: { count: 1, skill: 'technical', traits: ['eva', 'mechanic'], outside: true },
      hours: 3,
      cost: [{ kind: 'crew', target: 'assigned', stat: 'fatigue', delta: 12 }],
      check: { base: 0.5, skill: 'technical', traits: ['eva', 'mechanic'], items: [{ item: 'cleaner', bonus: 0.15 }], earth: true },
      success: [{ kind: 'sysSet', key: 'solar', value: 100 }],
      failure: [{ kind: 'sysSet', key: 'solar', value: 85 }, { kind: 'crew', target: 'assigned', stat: 'stress', delta: 8 }],
      weight: 3,
    },
  ],
};

const MOON_S1: EventDef = {
  id: 'MOON-S1',
  destination: 'moon',
  phase: 'surface',
  kind: 'small',
  illustration: 'earth',
  speaker: 'teamwork',
  research: ['R-COMMS'],
  options: [
    {
      id: 'call',
      cost: [{ kind: 'res', key: 'batteryKWh', delta: -2 }],
      success: [{ kind: 'crew', target: 'all', stat: 'stress', delta: -14 }],
      weight: 1,
      research: ['R-COMMS'],
    },
    {
      id: 'science',
      requires: [{ kind: 'any', of: [{ kind: 'item', item: 'spectro' }, { kind: 'trait', trait: 'geologist' }] }],
      crew: { count: 1, skill: 'science', traits: ['geologist'], outside: true },
      hours: 3,
      cost: [{ kind: 'crew', target: 'assigned', stat: 'fatigue', delta: 10 }],
      check: { base: 0.6, skill: 'science', traits: ['geologist'], items: [{ item: 'spectro', bonus: 0.15 }] },
      success: [{ kind: 'res', key: 'science', delta: 14 }],
      failure: [{ kind: 'res', key: 'science', delta: 4 }],
      weight: 1,
    },
    {
      id: 'rest',
      success: [{ kind: 'crew', target: 'all', stat: 'fatigue', delta: -15 }],
      weight: 1,
    },
  ],
};

const MOON_02: EventDef = {
  id: 'MOON-02',
  destination: 'moon',
  phase: 'surface',
  kind: 'main',
  illustration: 'seal',
  speaker: 'technical',
  research: ['R-MOON-ENV', 'R-ECLSS'],
  onOpen: [
    {
      kind: 'if',
      cond: { kind: 'flagIn', key: 'preflight', values: ['full', 'found'] },
      then: [{ kind: 'env', key: 'leakKgH', value: 0.12 }, { kind: 'env', key: 'leakGrowth', value: 0.015 }],
      else: [{ kind: 'env', key: 'leakKgH', value: 0.22 }, { kind: 'env', key: 'leakGrowth', value: 0.03 }],
    },
    { kind: 'sysSet', key: 'seal', value: 70 },
  ],
  options: [
    {
      id: 'patch',
      requires: [{ kind: 'item', item: 'sealant' }],
      crew: { count: 1, skill: 'technical', traits: ['mechanic'] },
      hours: 1,
      cost: [{ kind: 'use', item: 'sealant' }],
      check: { base: 0.8, skill: 'technical', traits: ['mechanic'] },
      success: [{ kind: 'env', key: 'leakKgH', value: 0 }, { kind: 'env', key: 'leakGrowth', value: 0 }, { kind: 'sysSet', key: 'seal', value: 90 }],
      failure: [{ kind: 'env', key: 'leakKgH', value: 0.06 }, { kind: 'env', key: 'leakGrowth', value: 0 }],
      weight: 3,
    },
    {
      id: 'replace',
      requires: [{ kind: 'item', item: 'parts' }],
      crew: { count: 2, skill: 'technical', traits: ['mechanic'] },
      hours: 3,
      cost: [{ kind: 'use', item: 'parts' }, { kind: 'crew', target: 'assigned', stat: 'fatigue', delta: 10 }],
      check: { base: 0.85, skill: 'technical', traits: ['mechanic'] },
      success: [{ kind: 'env', key: 'leakKgH', value: 0 }, { kind: 'env', key: 'leakGrowth', value: 0 }, { kind: 'sysSet', key: 'seal', value: 100 }],
      failure: [{ kind: 'env', key: 'leakKgH', value: 0.04 }, { kind: 'env', key: 'leakGrowth', value: 0 }],
      weight: 3,
    },
    {
      id: 'clean',
      crew: { count: 2, skill: 'technical', traits: ['mechanic', 'eva'] },
      hours: 5,
      cost: [{ kind: 'crew', target: 'assigned', stat: 'fatigue', delta: 18 }],
      check: { base: 0.45, skill: 'technical', traits: ['mechanic', 'eva'], earth: true, items: [{ item: 'cleaner', bonus: 0.1 }] },
      success: [{ kind: 'env', key: 'leakKgH', value: 0 }, { kind: 'env', key: 'leakGrowth', value: 0 }, { kind: 'sysSet', key: 'seal', value: 85 }],
      failure: [{ kind: 'env', key: 'leakKgH', value: 0.1 }, { kind: 'env', key: 'leakGrowth', value: 0.01 }],
      weight: 3,
    },
    {
      id: 'isolate',
      cost: [{ kind: 'crew', target: 'all', stat: 'stress', delta: 8 }],
      success: [
        { kind: 'env', key: 'leakKgH', value: 0 },
        { kind: 'env', key: 'leakGrowth', value: 0 },
        { kind: 'res', key: 'o2Kg', delta: -1.5 },
        { kind: 'flag', key: 'airlockClosed', value: true },
      ],
      weight: 3,
    },
  ],
};

const MOON_S2: EventDef = {
  id: 'MOON-S2',
  destination: 'moon',
  phase: 'surface',
  kind: 'small',
  illustration: 'suit',
  speaker: 'teamwork',
  research: ['R-MOON-ENV'],
  options: [
    {
      id: 'cleanSuits',
      crew: { count: 2, skill: 'teamwork' },
      hours: 2,
      cost: [{ kind: 'crew', target: 'assigned', stat: 'fatigue', delta: 8 }],
      success: [{ kind: 'flag', key: 'suitsClean', value: true }],
      weight: 1,
    },
    {
      id: 'comfort',
      requires: [{ kind: 'item', item: 'comfort' }],
      cost: [{ kind: 'use', item: 'comfort' }],
      success: [{ kind: 'crew', target: 'all', stat: 'stress', delta: -18 }],
      weight: 1,
    },
    {
      id: 'skip',
      success: [{ kind: 'crew', target: 'all', stat: 'fatigue', delta: -8 }],
      weight: 1,
    },
  ],
};

const MOON_03: EventDef = {
  id: 'MOON-03',
  destination: 'moon',
  phase: 'surface',
  kind: 'main',
  illustration: 'flare',
  speaker: 'science',
  research: ['R-SPE', 'R-MOON-ENV'],
  options: [
    {
      id: 'forecast',
      requires: [{ kind: 'trait', trait: 'spaceWeather' }],
      success: [
        { kind: 'sys', key: 'shelter', delta: 15 },
        { kind: 'res', key: 'science', delta: 10 },
        { kind: 'shelter', target: 'all', value: true },
        { kind: 'env', key: 'speHours', value: 6 },
      ],
      weight: 3,
    },
    {
      id: 'waterWall',
      requires: [{ kind: 'any', of: [{ kind: 'research', id: 'R-SPE' }, { kind: 'trait', trait: 'spaceWeather' }] }],
      crew: { count: 2, skill: 'teamwork' },
      hours: 1,
      cost: [{ kind: 'crew', target: 'assigned', stat: 'fatigue', delta: 10 }],
      success: [{ kind: 'sys', key: 'shelter', delta: 30 }, { kind: 'shelter', target: 'all', value: true }, { kind: 'env', key: 'speHours', value: 6 }],
      weight: 3,
      research: ['R-SPE'],
    },
    {
      id: 'finishSamples',
      requires: [{ kind: 'notFlag', key: 'airlockClosed', value: true }],
      crew: { count: 2, skill: 'science', traits: ['eva', 'geologist'], outside: true },
      hours: 2,
      cost: [{ kind: 'shelter', target: 'unassigned', value: true }, { kind: 'env', key: 'speHours', value: 6 }],
      check: {
        base: 0.5,
        skill: 'science',
        traits: ['eva', 'geologist'],
        items: [{ item: 'spectro', bonus: 0.1 }],
        flags: [{ key: 'suitsClean', value: true, bonus: 0.15 }],
        hazard: 0.1,
      },
      success: [{ kind: 'res', key: 'science', delta: 26 }, { kind: 'shelter', target: 'assigned', value: true }],
      failure: [
        { kind: 'res', key: 'science', delta: 8 },
        { kind: 'crew', target: 'assigned', stat: 'radiation', delta: 14 },
        { kind: 'crew', target: 'assigned', stat: 'health', delta: -14 },
        { kind: 'shelter', target: 'assigned', value: true },
      ],
      weight: 3,
    },
    {
      id: 'shelterNow',
      cost: [{ kind: 'res', key: 'science', delta: -4 }],
      success: [{ kind: 'shelter', target: 'all', value: true }, { kind: 'env', key: 'speHours', value: 6 }],
      weight: 3,
    },
  ],
};

const MARS_01: EventDef = {
  id: 'MARS-01',
  destination: 'mars',
  phase: 'surface',
  kind: 'main',
  illustration: 'water',
  speaker: 'technical',
  research: ['R-WATER', 'R-ECLSS'],
  onOpen: [
    {
      kind: 'if',
      cond: { kind: 'flagIn', key: 'preflight', values: ['full', 'found'] },
      then: [{ kind: 'env', key: 'recyclerWear', value: 1.0 }],
      else: [{ kind: 'env', key: 'recyclerWear', value: 1.8 }],
    },
    { kind: 'sys', key: 'waterRecycler', delta: -10 },
  ],
  options: [
    {
      id: 'swapFilter',
      requires: [{ kind: 'item', item: 'filter' }],
      crew: { count: 1, skill: 'technical' },
      hours: 1,
      cost: [{ kind: 'use', item: 'filter' }],
      success: [{ kind: 'env', key: 'recyclerWear', value: 0 }, { kind: 'sysSet', key: 'waterRecycler', value: 100 }],
      weight: 3,
    },
    {
      id: 'maintain',
      crew: { count: 1, skill: 'technical', traits: ['mechanic'] },
      hours: 4,
      cost: [{ kind: 'crew', target: 'assigned', stat: 'fatigue', delta: 14 }],
      check: { base: 0.55, skill: 'technical', traits: ['mechanic'] },
      success: [{ kind: 'env', key: 'recyclerWear', value: 0 }, { kind: 'sys', key: 'waterRecycler', delta: 20 }],
      failure: [{ kind: 'env', key: 'recyclerWear', value: 0.7 }],
      weight: 3,
    },
    {
      id: 'ration',
      cost: [{ kind: 'crew', target: 'all', stat: 'stress', delta: 8 }],
      success: [{ kind: 'flag', key: 'waterRation', value: true }, { kind: 'env', key: 'recyclerWear', value: 0.9 }, { kind: 'gh', mode: 'eco' }],
      weight: 3,
      research: ['R-WATER'],
    },
  ],
};

const MARS_S1: EventDef = {
  id: 'MARS-S1',
  destination: 'mars',
  phase: 'surface',
  kind: 'small',
  illustration: 'earth',
  speaker: 'science',
  research: ['R-COMMS'],
  options: [
    {
      id: 'analyze',
      requires: [{ kind: 'any', of: [{ kind: 'item', item: 'spectro' }, { kind: 'trait', trait: 'geologist' }] }],
      crew: { count: 1, skill: 'science', traits: ['geologist'] },
      hours: 3,
      cost: [{ kind: 'crew', target: 'assigned', stat: 'fatigue', delta: 10 }],
      check: { base: 0.6, skill: 'science', traits: ['geologist'], items: [{ item: 'spectro', bonus: 0.15 }] },
      success: [{ kind: 'res', key: 'science', delta: 16 }],
      failure: [{ kind: 'res', key: 'science', delta: 5 }],
      weight: 1,
    },
    {
      id: 'basic',
      crew: { count: 1, skill: 'science' },
      hours: 2,
      cost: [{ kind: 'crew', target: 'assigned', stat: 'fatigue', delta: 8 }],
      check: { base: 0.5, skill: 'science' },
      success: [{ kind: 'res', key: 'science', delta: 8 }],
      failure: [{ kind: 'res', key: 'science', delta: 2 }],
      weight: 1,
    },
    {
      id: 'rest',
      success: [{ kind: 'crew', target: 'all', stat: 'fatigue', delta: -12 }, { kind: 'crew', target: 'all', stat: 'stress', delta: -5 }],
      weight: 1,
    },
  ],
};

const MARS_02: EventDef = {
  id: 'MARS-02',
  destination: 'mars',
  phase: 'surface',
  kind: 'main',
  illustration: 'dust',
  speaker: 'technical',
  research: ['R-DUST', 'R-SEASON', 'R-BATTERY', 'R-LED'],
  onOpen: [
    {
      kind: 'if',
      cond: { kind: 'site', sites: ['summer'] },
      then: [
        { kind: 'env', key: 'dust', value: 0.6 },
        { kind: 'env', key: 'dustSettle', value: 0.6 },
        { kind: 'env', key: 'dustHours', value: 60 },
      ],
      else: [
        { kind: 'env', key: 'dust', value: 0.4 },
        { kind: 'env', key: 'dustSettle', value: 0.4 },
        { kind: 'env', key: 'dustHours', value: 24 },
      ],
    },
  ],
  options: [
    {
      id: 'eco',
      success: [{ kind: 'gh', mode: 'eco' }],
      weight: 3,
    },
    {
      id: 'fullPower',
      requires: [{ kind: 'batteryFrac', min: 0.55 }],
      success: [{ kind: 'flag', key: 'stormPolicy', value: 'full' }],
      weight: 3,
      research: ['R-BATTERY'],
    },
    {
      id: 'clean',
      requires: [{ kind: 'envBelow', key: 'dust', max: 0.55 }],
      crew: { count: 2, skill: 'technical', traits: ['eva'], outside: true },
      hours: 3,
      cost: [{ kind: 'crew', target: 'assigned', stat: 'fatigue', delta: 14 }],
      check: { base: 0.6, skill: 'technical', traits: ['eva'], items: [{ item: 'cleaner', bonus: 0.2 }] },
      success: [
        { kind: 'sys', key: 'solar', delta: 30 },
        { kind: 'if', cond: { kind: 'item', item: 'cleaner' }, then: [{ kind: 'env', key: 'dustSettle', value: 0.2 }] },
      ],
      failure: [{ kind: 'sys', key: 'solar', delta: 8 }, { kind: 'crew', target: 'assigned', stat: 'stress', delta: 6 }],
      weight: 3,
      research: ['R-DUST'],
    },
    {
      id: 'hunker',
      success: [
        { kind: 'gh', mode: 'off' },
        { kind: 'env', key: 'dustSettle', value: 0.15 },
        { kind: 'flag', key: 'hunker', value: true },
        { kind: 'crew', target: 'all', stat: 'stress', delta: 5 },
      ],
      weight: 3,
      research: ['R-DUST'],
    },
    {
      id: 'loadShift',
      requires: [{ kind: 'research', id: 'R-BATTERY' }],
      success: [{ kind: 'flag', key: 'loadShift', value: true }],
      weight: 3,
      research: ['R-BATTERY'],
    },
  ],
};

const MARS_S2: EventDef = {
  id: 'MARS-S2',
  destination: 'mars',
  phase: 'surface',
  kind: 'small',
  illustration: 'crew',
  speaker: 'teamwork',
  research: ['R-COMMS'],
  options: [
    {
      id: 'mediate',
      crew: { count: 1, skill: 'teamwork', traits: ['mediator', 'steady'] },
      check: { base: 0.55, skill: 'teamwork', traits: ['mediator', 'steady'] },
      success: [{ kind: 'crew', target: 'all', stat: 'stress', delta: -15 }],
      failure: [{ kind: 'crew', target: 'all', stat: 'stress', delta: 5 }],
      weight: 1,
    },
    {
      id: 'comfort',
      requires: [{ kind: 'item', item: 'comfort' }],
      cost: [{ kind: 'use', item: 'comfort' }],
      success: [{ kind: 'crew', target: 'all', stat: 'stress', delta: -18 }],
      weight: 1,
    },
    {
      id: 'shifts',
      success: [{ kind: 'crew', target: 'all', stat: 'stress', delta: -6 }, { kind: 'crew', target: 'all', stat: 'fatigue', delta: 5 }],
      weight: 1,
    },
  ],
};

const MARS_03: EventDef = {
  id: 'MARS-03',
  destination: 'mars',
  phase: 'surface',
  kind: 'main',
  illustration: 'plant',
  speaker: 'science',
  research: ['R-CROPS', 'R-LED', 'R-WATER'],
  onOpen: [{ kind: 'env', key: 'wilt', value: 1.6 }],
  options: [
    {
      id: 'diagnose',
      crew: { count: 1, skill: 'science', traits: ['botanist'] },
      hours: 3,
      cost: [{ kind: 'crew', target: 'assigned', stat: 'fatigue', delta: 10 }],
      check: { base: 0.5, skill: 'science', traits: ['botanist'] },
      success: [{ kind: 'env', key: 'wilt', value: 0 }, { kind: 'sys', key: 'greenhouseHealth', delta: 15 }],
      failure: [{ kind: 'env', key: 'wilt', value: 0.6 }],
      weight: 3,
      research: ['R-CROPS'],
    },
    {
      id: 'replant',
      requires: [{ kind: 'item', item: 'seeds' }],
      crew: { count: 1, skill: 'science', traits: ['botanist'] },
      hours: 2,
      cost: [{ kind: 'use', item: 'seeds' }],
      success: [{ kind: 'env', key: 'wilt', value: 0 }, { kind: 'sysSet', key: 'greenhouseHealth', value: 100 }, { kind: 'sys', key: 'greenhouseGrowth', delta: 15 }],
      weight: 3,
    },
    {
      id: 'leds',
      requires: [{ kind: 'batteryFrac', min: 0.4 }],
      cost: [{ kind: 'res', key: 'batteryKWh', delta: -10 }],
      success: [{ kind: 'env', key: 'wilt', value: 0.35 }, { kind: 'sys', key: 'greenhouseHealth', delta: 6 }, { kind: 'gh', mode: 'full' }],
      weight: 3,
      research: ['R-LED'],
    },
    {
      id: 'salvage',
      success: [{ kind: 'harvestNow', fraction: 0.6 }, { kind: 'env', key: 'wilt', value: 0 }],
      weight: 3,
    },
    {
      id: 'redirect',
      success: [{ kind: 'gh', mode: 'off' }, { kind: 'env', key: 'wilt', value: 0 }, { kind: 'res', key: 'waterL', delta: 12 }, { kind: 'sys', key: 'greenhouseHealth', delta: -20 }],
      weight: 3,
      research: ['R-WATER'],
    },
  ],
};

const RETURN_01: EventDef = {
  id: 'RETURN-01',
  destination: 'both',
  phase: 'returnPrep',
  kind: 'main',
  illustration: 'ascent',
  speaker: 'teamwork',
  research: ['R-ECLSS', 'R-BATTERY'],
  options: [
    {
      id: 'safety',
      requires: [{ kind: 'returnReady' }],
      success: [{ kind: 'scienceFactor', factor: 0.6 }, { kind: 'flag', key: 'margin', value: 'high' }],
      weight: 3,
    },
    {
      id: 'balanced',
      requires: [{ kind: 'returnReady' }],
      success: [{ kind: 'scienceFactor', factor: 0.85 }, { kind: 'flag', key: 'margin', value: 'medium' }],
      weight: 3,
    },
    {
      id: 'allSamples',
      requires: [{ kind: 'returnReady' }],
      success: [{ kind: 'res', key: 'science', delta: 10 }, { kind: 'flag', key: 'margin', value: 'low' }],
      weight: 3,
    },
    {
      id: 'wait',
      requires: [{ kind: 'notFlag', key: 'waited', value: true }, { kind: 'envBelow', key: 'leakKgH', max: 0.001 }],
      success: [{ kind: 'flag', key: 'waited', value: true }, { kind: 'wait', hours: 24 }],
      weight: 2,
    },
    {
      id: 'ration',
      requires: [{ kind: 'notReturnReady' }],
      success: [
        { kind: 'flag', key: 'margin', value: 'none' },
        { kind: 'crew', target: 'all', stat: 'stress', delta: 15 },
        { kind: 'crew', target: 'all', stat: 'health', delta: -12 },
      ],
      weight: 3,
    },
  ],
};

const RETURN_02: EventDef = {
  id: 'RETURN-02',
  destination: 'both',
  phase: 'returnFlight',
  kind: 'main',
  illustration: 'circuit',
  speaker: 'technical',
  research: ['R-BATTERY'],
  options: [
    {
      id: 'spare',
      requires: [{ kind: 'item', item: 'parts' }],
      crew: { count: 1, skill: 'technical' },
      cost: [{ kind: 'use', item: 'parts' }],
      success: [{ kind: 'flag', key: 'arrival', value: 'smooth' }],
      weight: 3,
    },
    {
      id: 'repair',
      crew: { count: 1, skill: 'technical', traits: ['mechanic', 'pilot'] },
      check: {
        base: 0.5,
        skill: 'technical',
        traits: ['mechanic', 'pilot'],
        earth: true,
        flags: [{ key: 'margin', value: 'low', bonus: -0.1 }, { key: 'margin', value: 'none', bonus: -0.15 }],
      },
      success: [{ kind: 'flag', key: 'arrival', value: 'smooth' }],
      failure: [
        { kind: 'flag', key: 'arrival', value: 'rough' },
        { kind: 'crew', target: 'all', stat: 'health', delta: -14 },
        { kind: 'crew', target: 'all', stat: 'stress', delta: 10 },
      ],
      weight: 3,
    },
    {
      id: 'reroute',
      requires: [{ kind: 'flagIn', key: 'margin', values: ['high', 'medium'] }],
      success: [{ kind: 'flag', key: 'arrival', value: 'smooth' }, { kind: 'crew', target: 'all', stat: 'stress', delta: 4 }],
      weight: 3,
    },
    {
      id: 'powerDown',
      success: [
        { kind: 'flag', key: 'arrival', value: 'rough' },
        { kind: 'crew', target: 'all', stat: 'stress', delta: 15 },
        { kind: 'crew', target: 'all', stat: 'health', delta: -10 },
        { kind: 'if', cond: { kind: 'flag', key: 'margin', value: 'none' }, then: [{ kind: 'crew', target: 'all', stat: 'health', delta: -12 }] },
      ],
      weight: 3,
    },
  ],
};

// ---------- Emergencies (raised by the simulation after visible warnings) ----------

const EMG_O2: EventDef = {
  id: 'EMG-O2',
  destination: 'both',
  phase: 'surface',
  kind: 'emergency',
  illustration: 'o2',
  speaker: 'technical',
  research: ['R-ECLSS'],
  options: [
    {
      id: 'candle',
      requires: [{ kind: 'item', item: 'o2candle' }],
      cost: [{ kind: 'use', item: 'o2candle' }],
      success: [{ kind: 'res', key: 'o2Kg', delta: 6 }],
      weight: 3,
    },
    {
      id: 'repairLS',
      crew: { count: 1, skill: 'technical', traits: ['mechanic'] },
      hours: 2,
      cost: [{ kind: 'crew', target: 'assigned', stat: 'fatigue', delta: 12 }],
      check: { base: 0.6, skill: 'technical', traits: ['mechanic'], earth: true, items: [{ item: 'parts', bonus: 0.2 }] },
      success: [{ kind: 'sys', key: 'lifeSupport', delta: 25 }, { kind: 'env', key: 'leakKgH', value: 0 }, { kind: 'env', key: 'leakGrowth', value: 0 }],
      failure: [{ kind: 'sys', key: 'lifeSupport', delta: 8 }],
      weight: 3,
    },
    {
      id: 'cutLoads',
      success: [{ kind: 'gh', mode: 'off' }, { kind: 'flag', key: 'lsPriority', value: true }],
      weight: 3,
    },
    {
      id: 'abort',
      success: [{ kind: 'abort' }],
      weight: 4,
    },
  ],
};

const EMG_MED: EventDef = {
  id: 'EMG-MED',
  destination: 'both',
  phase: 'surface',
  kind: 'emergency',
  illustration: 'med',
  speaker: 'science',
  research: [],
  options: [
    {
      id: 'medkit',
      requires: [{ kind: 'item', item: 'medkit' }],
      cost: [{ kind: 'use', item: 'medkit' }],
      success: [{ kind: 'crew', target: 'subject', stat: 'health', delta: 35 }],
      weight: 3,
    },
    {
      id: 'medic',
      requires: [{ kind: 'trait', trait: 'medic' }],
      crew: { count: 1, skill: 'science', traits: ['medic'], mustHave: 'medic' },
      hours: 2,
      success: [{ kind: 'crew', target: 'subject', stat: 'health', delta: 22 }],
      weight: 3,
    },
    {
      id: 'rest',
      success: [{ kind: 'rest', target: 'subject' }, { kind: 'crew', target: 'subject', stat: 'health', delta: 8 }, { kind: 'crew', target: 'all', stat: 'stress', delta: 4 }],
      weight: 3,
    },
    {
      id: 'evacuate',
      requires: [{ kind: 'notSubjectIsPlayer' }],
      success: [{ kind: 'evacuate', target: 'subject' }],
      weight: 4,
    },
    {
      id: 'abort',
      requires: [{ kind: 'subjectIsPlayer' }],
      success: [{ kind: 'abort' }],
      weight: 4,
    },
  ],
};

export const EVENTS: EventDef[] = [
  OUT_01, MOON_01, MOON_S1, MOON_02, MOON_S2, MOON_03, MARS_01, MARS_S1, MARS_02, MARS_S2, MARS_03, RETURN_01, RETURN_02, EMG_O2, EMG_MED,
  ...EVENTS_2,
];

export const EVENT_BY_ID: Record<string, EventDef> = Object.fromEntries(EVENTS.map((e) => [e.id, e]));

/** Which events reference an item (used by the cargo screen: "used in Moon / Mars events"). */
export function itemUsage(itemId: ItemId): Record<DestinationId, string[]> {
  const out: Record<DestinationId, string[]> = { moon: [], mars: [] };
  const refs = (conds: Cond[] | undefined): boolean =>
    !!conds?.some((c) => (c.kind === 'item' && c.item === itemId) || (c.kind === 'any' && refs(c.of)));
  for (const ev of EVENTS) {
    const uses = ev.options.some(
      (o) => refs(o.requires) || o.check?.items?.some((i) => i.item === itemId) || JSON.stringify(o.success).includes(`"item":"${itemId}"`),
    );
    if (!uses) continue;
    if (ev.id === 'EMG-O2' || ev.id === 'EMG-MED' || ev.id === 'HARVEST') {
      out.moon.push(ev.id);
      out.mars.push(ev.id);
      continue;
    }
    if (ev.destination === 'both' || ev.destination === 'moon') out.moon.push(ev.id);
    if (ev.destination === 'both' || ev.destination === 'mars') out.mars.push(ev.id);
  }
  return out;
}
