// Fifth content wave: harvest variety and the Moon reinforcement crew.
import type { EventDef } from './events';

// ---------- harvest variants (picked in turn, never the same twice in a row) ----------

const HARVEST_MOLD: EventDef = {
  id: 'HARVEST-MOLD',
  destination: 'both',
  phase: 'surface',
  kind: 'small',
  illustration: 'plant',
  speaker: 'science',
  research: ['R-MOLD', 'R-CROPS'],
  options: [
    { id: 'trim', crew: { count: 1, skill: 'science', traits: ['botanist'] }, hours: 3, success: [{ kind: 'harvest', fraction: 0.6, regrow: 0 }, { kind: 'sys', key: 'greenhouseHealth', delta: 12 }], weight: 2 },
    {
      id: 'dry',
      requires: [{ kind: 'batteryFrac', min: 0.3 }],
      cost: [{ kind: 'res', key: 'batteryKWh', delta: -10 }],
      success: [{ kind: 'harvest', fraction: 0.9, regrow: 0 }, { kind: 'sys', key: 'greenhouseHealth', delta: 5 }],
      weight: 2,
      research: ['R-MOLD'],
    },
    {
      id: 'eatAll',
      success: [{ kind: 'harvest', fraction: 1, regrow: 0 }, { kind: 'crew', target: 'all', stat: 'health', delta: -6 }, { kind: 'sys', key: 'greenhouseHealth', delta: -15 }],
      weight: 2,
    },
    {
      id: 'sanitize',
      requires: [{ kind: 'item', item: 'medkit' }],
      cost: [{ kind: 'use', item: 'medkit' }],
      success: [{ kind: 'harvest', fraction: 1, regrow: 0 }, { kind: 'sys', key: 'greenhouseHealth', delta: 15 }],
      weight: 2,
    },
  ],
};

const HARVEST_FEAST: EventDef = {
  id: 'HARVEST-FEAST',
  destination: 'both',
  phase: 'surface',
  kind: 'small',
  illustration: 'plant',
  speaker: 'teamwork',
  research: ['R-CROPS'],
  options: [
    { id: 'feast', success: [{ kind: 'harvest', fraction: 0.6, regrow: 0 }, { kind: 'crew', target: 'all', stat: 'stress', delta: -22 }, { kind: 'crew', target: 'all', stat: 'health', delta: 5 }], weight: 2 },
    { id: 'store', success: [{ kind: 'harvest', fraction: 1.1, regrow: 0 }, { kind: 'crew', target: 'all', stat: 'stress', delta: 10 }], weight: 2 },
    {
      id: 'broadcast',
      cost: [{ kind: 'res', key: 'batteryKWh', delta: -3 }],
      success: [{ kind: 'harvest', fraction: 0.9, regrow: 0 }, { kind: 'res', key: 'science', delta: 6 }, { kind: 'crew', target: 'all', stat: 'stress', delta: -6 }],
      weight: 2,
    },
  ],
};

const HARVEST_SEEDS: EventDef = {
  id: 'HARVEST-SEEDS',
  destination: 'both',
  phase: 'surface',
  kind: 'small',
  illustration: 'plant',
  speaker: 'science',
  research: ['R-CROPS'],
  options: [
    { id: 'saveSeed', success: [{ kind: 'harvest', fraction: 0.7, regrow: 30 }], weight: 2 },
    { id: 'eatAll', success: [{ kind: 'harvest', fraction: 1, regrow: 0 }], weight: 2 },
    {
      id: 'experiment',
      crew: { count: 1, skill: 'science', traits: ['botanist', 'nutrition'] },
      hours: 5,
      check: { base: 0.65, skill: 'science', traits: ['botanist', 'nutrition'] },
      success: [{ kind: 'harvest', fraction: 0.8, regrow: 15 }, { kind: 'res', key: 'science', delta: 12 }],
      failure: [{ kind: 'harvest', fraction: 0.6, regrow: 0 }, { kind: 'res', key: 'science', delta: 4 }],
      weight: 2,
    },
  ],
};

/** Harvest card for the n-th harvest decision: the classic card first, then a seeded rotation of variants. */
export const HARVEST_VARIANTS = ['HARVEST', 'HARVEST-MOLD', 'HARVEST-FEAST', 'HARVEST-SEEDS'] as const;

// ---------- Moon reinforcement: offered after two live calls with Earth ----------

const REINF_OFFER: EventDef = {
  id: 'REINF-OFFER',
  destination: 'moon',
  phase: 'surface',
  kind: 'main',
  illustration: 'earth',
  speaker: 'teamwork',
  research: ['R-REINF'],
  options: [
    {
      id: 'accept',
      success: [{ kind: 'flag', key: 'reinf', value: 'accepted' }, { kind: 'scheduleBig', big: 'crew', days: 4, notBeforeDay: 20 }],
      weight: 3,
      research: ['R-REINF'],
    },
    {
      id: 'cargo',
      success: [{ kind: 'flag', key: 'reinf', value: 'cargo' }, { kind: 'scheduleBig', big: 'resupply', days: 4 }],
      weight: 3,
    },
    { id: 'decline', success: [{ kind: 'flag', key: 'reinf', value: 'declined' }, { kind: 'crew', target: 'all', stat: 'stress', delta: -4 }], weight: 3 },
  ],
};

const PREP_CREW: EventDef = {
  id: 'PREP-crew',
  destination: 'moon',
  phase: 'surface',
  kind: 'prep',
  illustration: 'lander',
  speaker: 'technical',
  research: ['R-REINF'],
  options: [
    {
      id: 'site',
      crew: { count: 2, skill: 'technical', traits: ['rover', 'eva'], outside: true },
      hours: 9,
      cost: [{ kind: 'crew', target: 'assigned', stat: 'fatigue', delta: 12 }],
      success: [{ kind: 'flag', key: 'prep.crew.site', value: true }],
      weight: 1,
    },
    {
      id: 'power',
      requires: [{ kind: 'batteryFrac', min: 0.4 }],
      cost: [{ kind: 'res', key: 'batteryKWh', delta: -8 }],
      crew: { count: 1, skill: 'technical', traits: ['power', 'mechanic'] },
      hours: 5,
      success: [{ kind: 'flag', key: 'prep.crew.power', value: true }],
      weight: 1,
    },
    {
      id: 'stock',
      requires: [{ kind: 'batteryFrac', min: 0.6 }],
      cost: [{ kind: 'res', key: 'batteryKWh', delta: -8 }, { kind: 'res', key: 'waterL', delta: -4.5 }],
      success: [{ kind: 'res', key: 'o2Kg', delta: 4 }],
      weight: 1,
    },
  ],
};

/** The lander arrives: two more people, an inflatable module beside the habitat, more mouths to feed. */
const REINF: EventDef = {
  id: 'REINF',
  destination: 'moon',
  phase: 'surface',
  kind: 'main',
  illustration: 'lander',
  speaker: 'teamwork',
  research: ['R-REINF'],
  onOpen: [
    { kind: 'arrive', count: 2 },
    { kind: 'res', key: 'foodCrewDays', delta: 20 },
    { kind: 'res', key: 'o2Kg', delta: 10 },
    { kind: 'res', key: 'waterL', delta: 80 },
    { kind: 'if', cond: { kind: 'flag', key: 'prep.crew.site', value: true }, then: [{ kind: 'flag', key: 'module', value: 'ready' }], else: [{ kind: 'flag', key: 'module', value: 'packed' }] },
    { kind: 'if', cond: { kind: 'flag', key: 'prep.crew.power', value: true }, then: [{ kind: 'flag', key: 'modulePower', value: true }] },
  ],
  options: [
    {
      id: 'welcome',
      requires: [{ kind: 'flag', key: 'module', value: 'ready' }],
      success: [{ kind: 'crew', target: 'all', stat: 'stress', delta: -10 }, { kind: 'res', key: 'science', delta: 6 }],
      weight: 3,
    },
    {
      id: 'assemble',
      requires: [{ kind: 'flag', key: 'module', value: 'packed' }],
      crew: { count: 3, skill: 'technical', traits: ['eva', 'mechanic'], outside: true },
      hours: 12,
      cost: [{ kind: 'crew', target: 'assigned', stat: 'fatigue', delta: 16 }],
      check: { base: 0.75, skill: 'technical', traits: ['eva', 'mechanic'] },
      success: [{ kind: 'flag', key: 'module', value: 'ready' }],
      failure: [{ kind: 'flag', key: 'module', value: 'ready' }, { kind: 'sys', key: 'seal', delta: -15 }, { kind: 'crew', target: 'assigned', stat: 'stress', delta: 8 }],
      weight: 3,
    },
    {
      id: 'cramped',
      success: [{ kind: 'flag', key: 'module', value: 'cramped' }, { kind: 'crew', target: 'all', stat: 'stress', delta: 6 }],
      weight: 3,
    },
    {
      id: 'shifts',
      success: [{ kind: 'flag', key: 'module', value: 'shifts' }, { kind: 'crew', target: 'all', stat: 'fatigue', delta: 6 }],
      weight: 3,
    },
  ],
};

// ---------- pacing: day 2 and the last days used to be quiet (V3 test) ----------

const SETUP: EventDef = {
  id: 'SETUP',
  destination: 'both',
  phase: 'surface',
  kind: 'main',
  illustration: 'crew',
  speaker: 'teamwork',
  research: ['R-ECLSS'],
  options: [
    { id: 'systems', cost: [{ kind: 'crew', target: 'all', stat: 'fatigue', delta: 8 }], success: [{ kind: 'sys', key: 'lifeSupport', delta: 6 }, { kind: 'sys', key: 'waterRecycler', delta: 8 }, { kind: 'sys', key: 'solar', delta: 6 }], weight: 3 },
    { id: 'greenhouse', success: [{ kind: 'sys', key: 'greenhouseGrowth', delta: 15 }, { kind: 'sys', key: 'greenhouseHealth', delta: 5 }], weight: 3 },
    { id: 'science', cost: [{ kind: 'crew', target: 'all', stat: 'fatigue', delta: 6 }], success: [{ kind: 'res', key: 'science', delta: 12 }], weight: 3 },
    { id: 'rest', success: [{ kind: 'crew', target: 'all', stat: 'stress', delta: -10 }, { kind: 'crew', target: 'all', stat: 'fatigue', delta: -10 }], weight: 3 },
  ],
};

const FINAL_EVA: EventDef = {
  id: 'FINAL-EVA',
  destination: 'both',
  phase: 'surface',
  kind: 'main',
  illustration: 'suit',
  speaker: 'science',
  research: ['R-MOON-ENV', 'R-MARS-ENV'],
  options: [
    {
      id: 'grand',
      crew: { count: 2, skill: 'science', traits: ['geologist', 'eva', 'rover'], outside: true },
      hours: 6,
      cost: [{ kind: 'crew', target: 'assigned', stat: 'fatigue', delta: 14 }],
      check: { base: 0.75, skill: 'science', traits: ['geologist', 'eva', 'rover'] },
      success: [{ kind: 'res', key: 'science', delta: 28 }],
      failure: [{ kind: 'res', key: 'science', delta: 8 }, { kind: 'crew', target: 'assigned', stat: 'health', delta: -10 }],
      weight: 3,
    },
    { id: 'short', crew: { count: 1, skill: 'science', outside: true }, hours: 3, success: [{ kind: 'res', key: 'science', delta: 10 }], weight: 3 },
    { id: 'skip', success: [{ kind: 'crew', target: 'all', stat: 'stress', delta: -8 }, { kind: 'crew', target: 'all', stat: 'fatigue', delta: -8 }], weight: 3 },
  ],
};

const PACK: EventDef = {
  id: 'PACK',
  destination: 'both',
  phase: 'surface',
  kind: 'main',
  illustration: 'ascent',
  speaker: 'teamwork',
  research: ['R-ECLSS'],
  options: [
    { id: 'samples', success: [{ kind: 'res', key: 'science', delta: 12 }, { kind: 'flag', key: 'heavyPack', value: true }], weight: 3 },
    { id: 'reserves', success: [{ kind: 'res', key: 'waterL', delta: 6 }, { kind: 'res', key: 'o2Kg', delta: 2 }, { kind: 'res', key: 'science', delta: -4 }], weight: 3 },
    {
      id: 'legacy',
      cost: [{ kind: 'crew', target: 'all', stat: 'fatigue', delta: 8 }],
      success: [{ kind: 'crew', target: 'all', stat: 'stress', delta: -10 }, { kind: 'res', key: 'science', delta: 4 }, { kind: 'flag', key: 'legacy', value: true }],
      weight: 3,
    },
  ],
};

// ---------- stress at the limit: someone breaks down (stress ≥ 98) ----------

const CREW_CRISIS: EventDef = {
  id: 'CREW-CRISIS',
  destination: 'both',
  phase: 'surface',
  kind: 'emergency',
  illustration: 'crew',
  speaker: 'teamwork',
  research: [],
  options: [
    {
      id: 'talk',
      crew: { count: 1, skill: 'teamwork', traits: ['mediator', 'medic', 'steady'] },
      hours: 2,
      check: { base: 0.7, skill: 'teamwork', traits: ['mediator', 'medic', 'steady'] },
      success: [{ kind: 'crew', target: 'subject', stat: 'stress', delta: -40 }],
      failure: [{ kind: 'crew', target: 'subject', stat: 'stress', delta: -15 }, { kind: 'crew', target: 'all', stat: 'stress', delta: 4 }],
      weight: 3,
    },
    { id: 'dayOff', success: [{ kind: 'rest', target: 'subject' }, { kind: 'crew', target: 'subject', stat: 'stress', delta: -30 }, { kind: 'res', key: 'science', delta: -6 }], weight: 3 },
    {
      id: 'comfort',
      requires: [{ kind: 'item', item: 'comfort' }],
      cost: [{ kind: 'use', item: 'comfort' }],
      success: [{ kind: 'crew', target: 'all', stat: 'stress', delta: -25 }],
      weight: 3,
    },
    {
      id: 'push',
      success: [{ kind: 'crew', target: 'subject', stat: 'health', delta: -15 }, { kind: 'crew', target: 'all', stat: 'stress', delta: 8 }],
      weight: 3,
    },
  ],
};

export const EVENTS_4: EventDef[] = [
  CREW_CRISIS,HARVEST_MOLD, HARVEST_FEAST, HARVEST_SEEDS, REINF_OFFER, PREP_CREW, REINF, SETUP, FINAL_EVA, PACK];
