// Third content wave: forecast cards, big-event cards and preparation tasks (30-day mission).
import type { EventDef, EventOption } from './events';
import type { BigKind } from './types';

const forecast = (id: string, illustration: string, research: string[]): EventDef => ({
  id,
  destination: 'both',
  phase: 'surface',
  kind: 'forecast',
  illustration,
  speaker: 'science',
  research,
  options: [
    { id: 'plan', success: [], weight: 1 },
    { id: 'noted', success: [], weight: 1 },
    // a crew briefing now: calmer people, but a working hour lost for everyone
    { id: 'briefing', success: [{ kind: 'crew', target: 'all', stat: 'stress', delta: -8 }, { kind: 'crew', target: 'all', stat: 'fatigue', delta: 4 }], weight: 1 },
  ],
});

const flag = (kind: BigKind, action: string) => ({ kind: 'flag' as const, key: `prep.${kind}.${action}`, value: true });

/** Shared prep: make oxygen in advance while power is plentiful (electrolysis: ~1.125 L water per kg O₂). */
const stock = (kind: BigKind): EventOption => ({
  id: 'stock',
  requires: [{ kind: 'batteryFrac', min: 0.6 }],
  cost: [{ kind: 'res', key: 'batteryKWh', delta: -8 }, { kind: 'res', key: 'waterL', delta: -4.5 }],
  success: [{ kind: 'res', key: 'o2Kg', delta: 4 }, flag(kind, 'stock')],
  weight: 1,
  research: ['R-ECLSS'],
});

/** Shared prep: harvest what is ready rather than risk it. */
const harvestEarly = (kind: BigKind): EventOption => ({
  id: 'harvest',
  requires: [{ kind: 'sysMin', key: 'greenhouseGrowth', min: 50 }],
  crew: { count: 1, skill: 'science', traits: ['botanist', 'nutrition'] },
  hours: 3,
  success: [{ kind: 'harvestNow', fraction: 1 }, flag(kind, 'harvest')],
  weight: 1,
  research: ['R-CROPS'],
});

const PREP_STORM: EventDef = {
  id: 'PREP-storm',
  destination: 'mars',
  phase: 'surface',
  kind: 'prep',
  illustration: 'dust',
  speaker: 'technical',
  research: ['R-DUST', 'R-STORMWATCH'],
  options: [
    {
      id: 'clean',
      crew: { count: 2, skill: 'technical', traits: ['eva', 'power'], outside: true },
      hours: 5,
      cost: [{ kind: 'crew', target: 'assigned', stat: 'fatigue', delta: 10 }],
      check: { base: 0.7, skill: 'technical', traits: ['eva', 'power'], items: [{ item: 'cleaner', bonus: 0.15 }] },
      success: [{ kind: 'sysSet', key: 'solar', value: 100 }, flag('storm', 'clean')],
      failure: [{ kind: 'sys', key: 'solar', delta: 10 }],
      weight: 1,
      research: ['R-DUST'],
    },
    {
      id: 'stow',
      crew: { count: 2, skill: 'teamwork' },
      hours: 3,
      cost: [{ kind: 'crew', target: 'assigned', stat: 'fatigue', delta: 6 }],
      success: [flag('storm', 'stow')],
      weight: 1,
    },
    stock('storm'),
    harvestEarly('storm'),
  ],
};

const PREP_NIGHT: EventDef = {
  id: 'PREP-night',
  destination: 'moon',
  phase: 'surface',
  kind: 'prep',
  illustration: 'night',
  speaker: 'technical',
  research: ['R-MOON-NIGHT', 'R-FISSION'],
  options: [
    {
      id: 'insulate',
      crew: { count: 2, skill: 'teamwork' },
      hours: 6,
      cost: [{ kind: 'crew', target: 'assigned', stat: 'fatigue', delta: 10 }],
      success: [flag('night', 'insulate')],
      weight: 1,
      research: ['R-MOON-NIGHT'],
    },
    {
      id: 'radiator',
      crew: { count: 1, skill: 'technical', traits: ['power', 'mechanic', 'eva'], outside: true },
      hours: 5,
      cost: [{ kind: 'crew', target: 'assigned', stat: 'fatigue', delta: 12 }],
      check: { base: 0.65, skill: 'technical', traits: ['power', 'mechanic', 'eva'], items: [{ item: 'cleaner', bonus: 0.15 }], earth: true },
      success: [flag('night', 'radiator')],
      failure: [{ kind: 'crew', target: 'assigned', stat: 'stress', delta: 6 }],
      weight: 1,
      research: ['R-FISSION'],
    },
    stock('night'),
    harvestEarly('night'),
  ],
};

const PREP_METEOR: EventDef = {
  id: 'PREP-meteor',
  destination: 'moon',
  phase: 'surface',
  kind: 'prep',
  illustration: 'impact',
  speaker: 'technical',
  research: ['R-METEOR', 'R-MICRO'],
  options: [
    {
      id: 'berm',
      crew: { count: 2, skill: 'technical', traits: ['eva', 'rover'], outside: true },
      hours: 8,
      cost: [{ kind: 'crew', target: 'assigned', stat: 'fatigue', delta: 14 }],
      check: { base: 0.75, skill: 'technical', traits: ['rover', 'eva'] },
      success: [flag('meteor', 'berm')],
      failure: [{ kind: 'crew', target: 'assigned', stat: 'stress', delta: 6 }],
      weight: 1,
      research: ['R-METEOR'],
    },
    {
      id: 'spares',
      crew: { count: 1, skill: 'technical' },
      hours: 2,
      success: [flag('meteor', 'spares')],
      weight: 1,
    },
    stock('meteor'),
  ],
};

const PREP_DARK: EventDef = {
  id: 'PREP-dark',
  destination: 'moon',
  phase: 'surface',
  kind: 'prep',
  illustration: 'shadow',
  speaker: 'technical',
  research: ['R-MOON-POLE', 'R-BATTERY'],
  options: [
    {
      id: 'mast',
      crew: { count: 2, skill: 'technical', traits: ['eva', 'power'], outside: true },
      hours: 6,
      cost: [{ kind: 'crew', target: 'assigned', stat: 'fatigue', delta: 12 }],
      check: { base: 0.6, skill: 'technical', traits: ['power', 'eva'], earth: true },
      success: [flag('dark', 'mast')],
      failure: [{ kind: 'crew', target: 'assigned', stat: 'stress', delta: 6 }],
      weight: 1,
      research: ['R-MOON-POLE'],
    },
    stock('dark'),
    harvestEarly('dark'),
  ],
};

const PREP_RESUPPLY: EventDef = {
  id: 'PREP-resupply',
  destination: 'both',
  phase: 'surface',
  kind: 'prep',
  illustration: 'lander',
  speaker: 'teamwork',
  research: ['R-RESUPPLY'],
  options: [
    {
      id: 'zone',
      crew: { count: 2, skill: 'teamwork', outside: true },
      hours: 5,
      cost: [{ kind: 'crew', target: 'assigned', stat: 'fatigue', delta: 8 }],
      success: [flag('resupply', 'zone')],
      weight: 1,
    },
    {
      id: 'beacon',
      crew: { count: 1, skill: 'technical', traits: ['comms', 'pilot'] },
      hours: 3,
      check: { base: 0.6, skill: 'technical', traits: ['comms', 'pilot'], earth: true },
      success: [flag('resupply', 'beacon')],
      weight: 1,
    },
  ],
};

// ---------- what happens when they hit ----------

const NIGHT: EventDef = {
  id: 'NIGHT',
  destination: 'moon',
  phase: 'surface',
  kind: 'main',
  illustration: 'night',
  speaker: 'technical',
  research: ['R-MOON-NIGHT', 'R-FISSION', 'R-BATTERY'],
  onOpen: [
    {
      kind: 'if',
      cond: { kind: 'flag', key: 'prep.night.radiator', value: true },
      then: [{ kind: 'note', key: 'journal.radiatorOk', tone: 'good' }],
      else: [{ kind: 'env', key: 'fissionLoss', value: 0.2 }, { kind: 'note', key: 'journal.radiatorDusty', tone: 'warn' }],
    },
  ],
  options: [
    {
      id: 'hibernate',
      cost: [{ kind: 'crew', target: 'all', stat: 'stress', delta: 6 }],
      success: [{ kind: 'gh', mode: 'off' }, { kind: 'flag', key: 'nightMode', value: 'hibernate' }],
      weight: 3,
    },
    {
      id: 'eco',
      requires: [{ kind: 'any', of: [{ kind: 'batteryCapMin', min: 60 }, { kind: 'flag', key: 'prep.night.insulate', value: true }] }],
      success: [{ kind: 'gh', mode: 'eco' }, { kind: 'flag', key: 'nightMode', value: 'eco' }],
      weight: 3,
      research: ['R-LED'],
    },
    {
      id: 'wasteHeat',
      requires: [{ kind: 'any', of: [{ kind: 'research', id: 'R-FISSION' }, { kind: 'trait', trait: 'power' }, { kind: 'trait', trait: 'mechanic' }] }],
      crew: { count: 1, skill: 'technical', traits: ['power', 'mechanic'] },
      hours: 5,
      cost: [{ kind: 'crew', target: 'assigned', stat: 'fatigue', delta: 10 }],
      check: { base: 0.6, skill: 'technical', traits: ['power', 'mechanic'], earth: true },
      success: [{ kind: 'flag', key: 'wasteHeat', value: true }],
      failure: [{ kind: 'crew', target: 'assigned', stat: 'stress', delta: 8 }],
      weight: 3,
      research: ['R-FISSION'],
    },
    { id: 'asIs', success: [{ kind: 'flag', key: 'nightMode', value: 'normal' }], weight: 3 },
  ],
};

const METEOR: EventDef = {
  id: 'METEOR',
  destination: 'moon',
  phase: 'surface',
  kind: 'main',
  illustration: 'impact',
  speaker: 'science',
  research: ['R-METEOR', 'R-MICRO'],
  onOpen: [
    {
      kind: 'if',
      cond: { kind: 'flag', key: 'prep.meteor.berm', value: true },
      then: [{ kind: 'note', key: 'journal.meteorBerm', tone: 'good' }],
      else: [{ kind: 'env', key: 'heatHours', value: 30 }, { kind: 'sys', key: 'solar', delta: -10 }, { kind: 'note', key: 'journal.meteorHit', tone: 'bad' }],
    },
  ],
  options: [
    {
      id: 'repair',
      requires: [{ kind: 'envMin', key: 'heatHours', min: 1 }, { kind: 'any', of: [{ kind: 'item', item: 'sealant' }, { kind: 'flag', key: 'prep.meteor.spares', value: true }] }],
      crew: { count: 1, skill: 'technical', traits: ['eva', 'mechanic'], outside: true },
      hours: 3,
      check: { base: 0.6, skill: 'technical', traits: ['eva', 'mechanic'], flags: [{ key: 'prep.meteor.spares', value: true, bonus: 0.25 }], hazard: 0.05 },
      success: [{ kind: 'env', key: 'heatHours', value: 0 }],
      failure: [{ kind: 'env', key: 'heatHours', value: 14 }, { kind: 'crew', target: 'assigned', stat: 'health', delta: -8 }],
      weight: 3,
    },
    {
      id: 'observe',
      crew: { count: 1, skill: 'science', traits: ['geologist', 'spaceWeather'] },
      hours: 3,
      success: [{ kind: 'res', key: 'science', delta: 12 }],
      weight: 3,
      research: ['R-METEOR'],
    },
    {
      id: 'eva',
      crew: { count: 2, skill: 'science', traits: ['eva', 'geologist'], outside: true },
      hours: 5,
      check: { base: 0.6, skill: 'science', traits: ['eva', 'geologist'], flags: [{ key: 'prep.meteor.berm', value: true, bonus: 0.15 }], hazard: 0.15 },
      success: [{ kind: 'res', key: 'science', delta: 20 }],
      failure: [{ kind: 'res', key: 'science', delta: 6 }, { kind: 'crew', target: 'assigned', stat: 'health', delta: -16 }, { kind: 'crew', target: 'assigned', stat: 'stress', delta: 10 }],
      weight: 3,
    },
    { id: 'inside', success: [{ kind: 'crew', target: 'all', stat: 'stress', delta: 4 }], weight: 3 },
  ],
};

const DARK: EventDef = {
  id: 'DARK',
  destination: 'moon',
  phase: 'surface',
  kind: 'main',
  illustration: 'shadow',
  speaker: 'technical',
  research: ['R-MOON-POLE', 'R-BATTERY'],
  onOpen: [
    { kind: 'env', key: 'darkHours', value: 40 },
    {
      kind: 'if',
      cond: { kind: 'flag', key: 'prep.dark.mast', value: true },
      then: [{ kind: 'env', key: 'darkFactor', value: 0.65 }],
      else: [{ kind: 'env', key: 'darkFactor', value: 0.35 }],
    },
  ],
  options: [
    { id: 'essentials', success: [{ kind: 'gh', mode: 'off' }, { kind: 'flag', key: 'shadowEssentials', value: true }], weight: 3, research: ['R-BATTERY'] },
    { id: 'eco', success: [{ kind: 'gh', mode: 'eco' }, { kind: 'flag', key: 'shadowEssentials', value: true }], weight: 3 },
    { id: 'normal', success: [], weight: 3 },
  ],
};

/** Cargo lander: 24 crew-days of food plus one spare part kit and one destination-specific spare. */
const DELIVERY = [
  { kind: 'res' as const, key: 'foodCrewDays' as const, delta: 24 },
  { kind: 'addItem' as const, item: 'parts' as const, qty: 1 },
  { kind: 'if' as const, cond: { kind: 'dest' as const, dest: 'mars' as const }, then: [{ kind: 'addItem' as const, item: 'filter' as const, qty: 1 }], else: [{ kind: 'addItem' as const, item: 'sealant' as const, qty: 1 }] },
];

const RESUPPLY: EventDef = {
  id: 'RESUPPLY',
  destination: 'both',
  phase: 'surface',
  kind: 'main',
  illustration: 'lander',
  speaker: 'teamwork',
  research: ['R-RESUPPLY'],
  options: [
    {
      id: 'near',
      requires: [{ kind: 'any', of: [{ kind: 'flag', key: 'prep.resupply.zone', value: true }, { kind: 'flag', key: 'prep.resupply.beacon', value: true }] }],
      crew: { count: 1, skill: 'teamwork' },
      hours: 2,
      success: DELIVERY,
      weight: 3,
    },
    {
      id: 'retrieve',
      crew: { count: 2, skill: 'technical', traits: ['rover', 'pilot', 'eva'], outside: true },
      hours: 6,
      cost: [{ kind: 'crew', target: 'assigned', stat: 'fatigue', delta: 14 }],
      check: { base: 0.6, skill: 'technical', traits: ['rover', 'pilot'] },
      success: DELIVERY,
      failure: [{ kind: 'res', key: 'foodCrewDays', delta: 12 }, { kind: 'crew', target: 'assigned', stat: 'health', delta: -8 }],
      weight: 3,
    },
    {
      id: 'later',
      success: [{ kind: 'res', key: 'foodCrewDays', delta: 14 }, { kind: 'crew', target: 'all', stat: 'stress', delta: 4 }],
      weight: 3,
    },
  ],
};

/** Raised by the simulation when water would run out within about a day and a half. */
const EMG_WATER: EventDef = {
  id: 'EMG-WATER',
  destination: 'both',
  phase: 'surface',
  kind: 'emergency',
  illustration: 'water',
  speaker: 'technical',
  research: ['R-WATER', 'R-LOOP'],
  options: [
    { id: 'ration', cost: [{ kind: 'crew', target: 'all', stat: 'stress', delta: 8 }], success: [{ kind: 'flag', key: 'waterRation', value: true }, { kind: 'gh', mode: 'eco' }], weight: 3, research: ['R-WATER'] },
    { id: 'ghOff', success: [{ kind: 'gh', mode: 'off' }, { kind: 'flag', key: 'waterRation', value: true }, { kind: 'crew', target: 'all', stat: 'stress', delta: 10 }], weight: 3 },
    {
      id: 'repair',
      crew: { count: 1, skill: 'technical', traits: ['mechanic', 'chemist'] },
      hours: 3,
      check: { base: 0.6, skill: 'technical', traits: ['mechanic', 'chemist'], items: [{ item: 'filter', bonus: 0.2 }], earth: true },
      success: [{ kind: 'sys', key: 'waterRecycler', delta: 25 }, { kind: 'env', key: 'recyclerWear', value: 0 }],
      failure: [{ kind: 'sys', key: 'waterRecycler', delta: 5 }],
      weight: 3,
    },
    { id: 'abort', success: [{ kind: 'abort' }], weight: 4 },
    {
      id: 'reserve',
      requires: [{ kind: 'notFlag', key: 'contingencyUsed', value: true }],
      success: [{ kind: 'res', key: 'waterL', delta: 40 }, { kind: 'flag', key: 'contingencyUsed', value: true }],
      weight: 3,
    },
  ],
};

// ---------- real CME arrivals (NASA DONKI + WSA-ENLIL model) ----------

const PREP_CME: EventDef = {
  id: 'PREP-cme',
  destination: 'both',
  phase: 'surface',
  kind: 'prep',
  illustration: 'flare',
  speaker: 'science',
  research: ['R-DONKI', 'R-SPE'],
  options: [
    {
      id: 'wall',
      crew: { count: 2, skill: 'teamwork' },
      hours: 3,
      cost: [{ kind: 'crew', target: 'assigned', stat: 'fatigue', delta: 8 }],
      success: [flag('cme', 'wall')],
      weight: 1,
      research: ['R-SPE'],
    },
    {
      id: 'plan',
      success: [flag('cme', 'plan'), { kind: 'res', key: 'science', delta: -2 }],
      weight: 1,
    },
    stock('cme'),
  ],
};

const CME: EventDef = {
  id: 'CME',
  destination: 'both',
  phase: 'surface',
  kind: 'main',
  illustration: 'flare',
  speaker: 'science',
  research: ['R-DONKI', 'R-SPE'],
  onOpen: [
    {
      kind: 'if',
      cond: { kind: 'flag', key: 'cmeGlancing', value: true },
      then: [{ kind: 'env', key: 'speHours', value: 4 }],
      else: [{ kind: 'env', key: 'speHours', value: 8 }],
    },
    { kind: 'if', cond: { kind: 'flag', key: 'prep.cme.wall', value: true }, then: [{ kind: 'sys', key: 'shelter', delta: 25 }] },
  ],
  options: [
    {
      id: 'shelter',
      cost: [{ kind: 'res', key: 'science', delta: -3 }],
      success: [{ kind: 'shelter', target: 'all', value: true }],
      weight: 3,
      research: ['R-SPE'],
    },
    {
      id: 'planned',
      requires: [{ kind: 'flag', key: 'prep.cme.plan', value: true }],
      success: [{ kind: 'shelter', target: 'all', value: true }, { kind: 'crew', target: 'all', stat: 'stress', delta: -4 }],
      weight: 3,
    },
    {
      id: 'measure',
      crew: { count: 1, skill: 'science', traits: ['spaceWeather', 'comms'] },
      hours: 3,
      cost: [{ kind: 'shelter', target: 'unassigned', value: true }],
      check: { base: 0.7, skill: 'science', traits: ['spaceWeather', 'comms'] },
      success: [{ kind: 'res', key: 'science', delta: 14 }, { kind: 'shelter', target: 'assigned', value: true }],
      failure: [{ kind: 'res', key: 'science', delta: 4 }, { kind: 'crew', target: 'assigned', stat: 'radiation', delta: 8 }, { kind: 'shelter', target: 'assigned', value: true }],
      weight: 3,
    },
    {
      id: 'carryOn',
      success: [{ kind: 'crew', target: 'all', stat: 'stress', delta: 2 }],
      weight: 3,
    },
  ],
};

export const EVENTS_3: EventDef[] = [
  forecast('FC-CME', 'flare', ['R-DONKI', 'R-SPE']),
  PREP_CME,
  CME,
  EMG_WATER,
  forecast('FC-STORM', 'dust', ['R-STORMWATCH', 'R-DUST']),
  forecast('FC-NIGHT', 'night', ['R-MOON-NIGHT', 'R-FISSION']),
  forecast('FC-METEOR', 'impact', ['R-METEOR']),
  forecast('FC-DARK', 'shadow', ['R-MOON-POLE']),
  forecast('FC-RESUPPLY', 'lander', ['R-RESUPPLY']),
  PREP_STORM,
  PREP_NIGHT,
  PREP_METEOR,
  PREP_DARK,
  PREP_RESUPPLY,
  NIGHT,
  METEOR,
  DARK,
  RESUPPLY,
];
