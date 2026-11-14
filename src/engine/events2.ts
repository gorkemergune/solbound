// Second content wave: systems from docs/RESEARCH_INFERENCE.md (F-01…F-16) and new Moon research.
// Numbers are gameplay values; the related research cards say what is sourced.
import type { EventDef } from './events';

const CROP: EventDef = {
  id: 'CROP',
  destination: 'both',
  phase: 'surface',
  kind: 'small',
  illustration: 'plant',
  speaker: 'science',
  research: ['R-CROPS', 'R-LED'],
  options: [
    { id: 'greens', success: [{ kind: 'flag', key: 'cropPlan', value: 'greens' }], weight: 2 },
    {
      id: 'potato',
      requires: [{ kind: 'item', item: 'potato' }],
      cost: [{ kind: 'use', item: 'potato' }],
      success: [{ kind: 'setCrop', crop: 'potato', growth: 0 }],
      weight: 2,
    },
    {
      id: 'soy',
      requires: [{ kind: 'item', item: 'soy' }],
      cost: [{ kind: 'use', item: 'soy' }],
      success: [{ kind: 'setCrop', crop: 'soy', growth: 0 }],
      weight: 2,
    },
    {
      id: 'nutrients',
      requires: [{ kind: 'research', id: 'R-CROPS' }],
      crew: { count: 1, skill: 'science', traits: ['botanist'] },
      hours: 2,
      success: [{ kind: 'flag', key: 'nutrientLoop', value: true }],
      weight: 2,
      research: ['R-CROPS'],
    },
  ],
};

const HARVEST: EventDef = {
  id: 'HARVEST',
  destination: 'both',
  phase: 'surface',
  kind: 'small',
  illustration: 'plant',
  speaker: 'science',
  research: ['R-CROPS'],
  options: [
    { id: 'eat', success: [{ kind: 'harvest', fraction: 1, regrow: 0 }], weight: 2 },
    {
      id: 'eyes',
      requires: [{ kind: 'cropIs', crop: 'potato' }],
      success: [{ kind: 'harvest', fraction: 0.75, regrow: 35 }],
      weight: 2,
      research: ['R-CROPS'],
    },
    {
      id: 'switchSoy',
      requires: [{ kind: 'item', item: 'soy' }, { kind: 'cropNot', crop: 'soy' }],
      cost: [{ kind: 'use', item: 'soy' }],
      success: [{ kind: 'harvest', fraction: 1, regrow: 0 }, { kind: 'setCrop', crop: 'soy', growth: 0 }],
      weight: 2,
    },
    {
      id: 'switchPotato',
      requires: [{ kind: 'item', item: 'potato' }, { kind: 'cropNot', crop: 'potato' }],
      cost: [{ kind: 'use', item: 'potato' }],
      success: [{ kind: 'harvest', fraction: 1, regrow: 0 }, { kind: 'setCrop', crop: 'potato', growth: 0 }],
      weight: 2,
    },
  ],
};

const WQ: EventDef = {
  id: 'WQ',
  destination: 'both',
  phase: 'surface',
  kind: 'small',
  illustration: 'water',
  speaker: 'technical',
  research: ['R-WQ', 'R-LOOP'],
  options: [
    {
      id: 'reprocess',
      cost: [{ kind: 'res', key: 'waterL', delta: -6 }, { kind: 'res', key: 'batteryKWh', delta: -3 }],
      success: [{ kind: 'note', key: 'note.reprocessed', tone: 'good' }],
      weight: 2,
      research: ['R-WQ'],
    },
    {
      id: 'filter',
      requires: [{ kind: 'item', item: 'filter' }],
      crew: { count: 1, skill: 'technical' },
      hours: 1,
      cost: [{ kind: 'use', item: 'filter' }],
      success: [{ kind: 'sys', key: 'waterRecycler', delta: 10 }],
      weight: 2,
    },
    {
      id: 'drink',
      check: { base: 0.5, skill: 'science' },
      success: [{ kind: 'note', key: 'note.luckyWater', tone: 'warn' }],
      failure: [
        { kind: 'crew', target: 'all', stat: 'health', delta: -9 },
        { kind: 'crew', target: 'all', stat: 'stress', delta: 8 },
      ],
      weight: 2,
    },
  ],
};

const SAB: EventDef = {
  id: 'SAB',
  destination: 'both',
  phase: 'surface',
  kind: 'main',
  illustration: 'loop',
  speaker: 'technical',
  research: ['R-LOOP', 'R-ECLSS'],
  options: [
    { id: 'vent', success: [{ kind: 'h2', mode: 'vent' }], weight: 3 },
    {
      id: 'sabatier',
      requires: [{ kind: 'any', of: [{ kind: 'research', id: 'R-LOOP' }, { kind: 'trait', trait: 'mechanic' }, { kind: 'trait', trait: 'chemist' }] }],
      crew: { count: 2, skill: 'technical', traits: ['mechanic', 'chemist'] },
      hours: 3,
      cost: [{ kind: 'crew', target: 'assigned', stat: 'fatigue', delta: 10 }],
      check: { base: 0.7, skill: 'technical', traits: ['mechanic', 'chemist'], earth: true },
      success: [{ kind: 'h2', mode: 'sabatier' }],
      failure: [{ kind: 'h2', mode: 'vent' }, { kind: 'sys', key: 'lifeSupport', delta: -5 }],
      weight: 3,
      research: ['R-LOOP'],
    },
  ],
};

// ---------------- Mars ----------------

const WIND: EventDef = {
  id: 'WIND',
  destination: 'mars',
  phase: 'surface',
  kind: 'small',
  illustration: 'dust',
  speaker: 'teamwork',
  research: ['R-WIND'],
  options: [
    {
      id: 'tieDown',
      crew: { count: 2, skill: 'teamwork', outside: true },
      hours: 3,
      cost: [{ kind: 'crew', target: 'assigned', stat: 'fatigue', delta: 12 }],
      success: [{ kind: 'note', key: 'note.windMyth', tone: 'info' }],
      weight: 2,
    },
    {
      id: 'covers',
      crew: { count: 1, skill: 'technical', traits: ['mechanic', 'eva'], outside: true },
      hours: 2,
      success: [{ kind: 'flag', key: 'jointsCovered', value: true }],
      weight: 2,
    },
    {
      id: 'reasoned',
      requires: [{ kind: 'research', id: 'R-WIND' }],
      success: [{ kind: 'flag', key: 'jointsCovered', value: true }, { kind: 'crew', target: 'all', stat: 'stress', delta: -6 }],
      weight: 2,
      research: ['R-WIND'],
    },
    { id: 'ignore', success: [], weight: 2 },
  ],
};

const GEAR: EventDef = {
  id: 'GEAR',
  destination: 'mars',
  phase: 'surface',
  kind: 'main',
  illustration: 'gear',
  speaker: 'technical',
  research: ['R-WIND', 'R-DUST'],
  onOpen: [
    {
      kind: 'if',
      cond: { kind: 'flag', key: 'jointsCovered', value: true },
      then: [{ kind: 'sys', key: 'solar', delta: -6 }],
      else: [{ kind: 'sys', key: 'solar', delta: -20 }],
    },
  ],
  options: [
    {
      id: 'parts',
      requires: [{ kind: 'item', item: 'parts' }],
      crew: { count: 1, skill: 'technical', outside: true },
      hours: 2,
      cost: [{ kind: 'use', item: 'parts' }],
      success: [{ kind: 'sys', key: 'solar', delta: 25 }],
      weight: 3,
    },
    {
      id: 'clean',
      crew: { count: 2, skill: 'technical', traits: ['mechanic', 'eva'], outside: true },
      hours: 3,
      cost: [{ kind: 'crew', target: 'assigned', stat: 'fatigue', delta: 12 }],
      check: { base: 0.55, skill: 'technical', traits: ['mechanic', 'eva'], items: [{ item: 'cleaner', bonus: 0.2 }] },
      success: [{ kind: 'sys', key: 'solar', delta: 18 }],
      failure: [{ kind: 'sys', key: 'solar', delta: 6 }],
      weight: 3,
    },
    { id: 'fixed', success: [{ kind: 'flag', key: 'trackerFixed', value: true }], weight: 3 },
  ],
};

const BRINE: EventDef = {
  id: 'BRINE',
  destination: 'mars',
  phase: 'surface',
  kind: 'main',
  illustration: 'ice',
  speaker: 'science',
  research: ['R-PERCHLORATE'],
  options: [
    {
      id: 'purify',
      requires: [{ kind: 'item', item: 'purifier' }],
      crew: { count: 1, skill: 'technical' },
      hours: 4,
      success: [{ kind: 'res', key: 'waterL', delta: 35 }],
      weight: 3,
    },
    {
      id: 'distill',
      crew: { count: 2, skill: 'technical', traits: ['mechanic', 'chemist'] },
      hours: 5,
      cost: [{ kind: 'res', key: 'batteryKWh', delta: -10 }, { kind: 'crew', target: 'assigned', stat: 'fatigue', delta: 12 }],
      check: { base: 0.6, skill: 'technical', traits: ['mechanic', 'chemist'] },
      success: [{ kind: 'res', key: 'waterL', delta: 16 }, { kind: 'sys', key: 'waterRecycler', delta: -5 }],
      failure: [{ kind: 'res', key: 'waterL', delta: 5 }, { kind: 'sys', key: 'waterRecycler', delta: -8 }],
      weight: 3,
    },
    {
      id: 'raw',
      success: [{ kind: 'sys', key: 'greenhouseHealth', delta: -35 }, { kind: 'res', key: 'waterL', delta: 4 }],
      weight: 3,
    },
    { id: 'leave', success: [{ kind: 'res', key: 'science', delta: 4 }], weight: 3 },
  ],
};

const MARS_SAR: EventDef = {
  id: 'MARS-SAR',
  destination: 'mars',
  phase: 'surface',
  kind: 'main',
  illustration: 'rover',
  speaker: 'teamwork',
  research: ['R-MARS-ENV', 'R-COMMS'],
  subjects: 2,
  options: [
    {
      id: 'rescue',
      crew: { count: 2, skill: 'technical', traits: ['eva', 'pilot', 'rover'], outside: true },
      hours: 3,
      cost: [{ kind: 'crew', target: 'assigned', stat: 'fatigue', delta: 14 }],
      check: { base: 0.6, skill: 'technical', traits: ['eva', 'pilot', 'rover'] },
      success: [{ kind: 'crew', target: 'subject', stat: 'fatigue', delta: 10 }],
      failure: [{ kind: 'crew', target: 'subject', stat: 'health', delta: -15 }, { kind: 'crew', target: 'subject', stat: 'stress', delta: 15 }],
      weight: 3,
    },
    {
      id: 'mast',
      crew: { count: 1, skill: 'technical', traits: ['mechanic'] },
      hours: 1,
      check: { base: 0.55, skill: 'technical', traits: ['mechanic'] },
      success: [{ kind: 'crew', target: 'subject', stat: 'fatigue', delta: 16 }],
      failure: [{ kind: 'crew', target: 'subject', stat: 'health', delta: -10 }, { kind: 'crew', target: 'subject', stat: 'stress', delta: 10 }],
      weight: 3,
    },
    {
      id: 'wait',
      success: [{ kind: 'crew', target: 'subject', stat: 'health', delta: -12 }, { kind: 'crew', target: 'subject', stat: 'stress', delta: 12 }],
      weight: 3,
    },
  ],
};

const DEVIL: EventDef = {
  id: 'DEVIL',
  destination: 'mars',
  phase: 'surface',
  kind: 'small',
  illustration: 'dust',
  speaker: 'technical',
  research: ['R-DUST'],
  onOpen: [{ kind: 'sys', key: 'solar', delta: -20 }],
  options: [
    {
      id: 'clean',
      crew: { count: 1, skill: 'technical', traits: ['eva'], outside: true },
      hours: 2,
      check: { base: 0.7, skill: 'technical', traits: ['eva'], items: [{ item: 'cleaner', bonus: 0.2 }] },
      success: [{ kind: 'sys', key: 'solar', delta: 20 }],
      failure: [{ kind: 'sys', key: 'solar', delta: 8 }],
      weight: 2,
    },
    { id: 'later', success: [], weight: 2 },
  ],
};

// ---------------- Moon ----------------

const QUAKE: EventDef = {
  id: 'QUAKE',
  destination: 'moon',
  phase: 'surface',
  kind: 'main',
  illustration: 'quake',
  speaker: 'technical',
  research: ['R-MOONQUAKE'],
  options: [
    {
      id: 'inspect',
      crew: { count: 2, skill: 'technical', traits: ['mechanic'] },
      hours: 3,
      check: { base: 0.75, skill: 'technical', traits: ['mechanic'], earth: true },
      success: [{ kind: 'sys', key: 'seal', delta: 8 }, { kind: 'sys', key: 'lifeSupport', delta: 5 }],
      failure: [{ kind: 'env', key: 'leakKgH', value: 0.05 }],
      weight: 3,
    },
    {
      id: 'quick',
      crew: { count: 1, skill: 'technical' },
      hours: 1,
      check: { base: 0.5, skill: 'technical', traits: ['mechanic'] },
      success: [],
      failure: [{ kind: 'env', key: 'leakKgH', value: 0.08 }, { kind: 'env', key: 'leakGrowth', value: 0.01 }],
      weight: 3,
    },
    {
      id: 'ignore',
      success: [{ kind: 'env', key: 'leakKgH', value: 0.06 }, { kind: 'env', key: 'leakGrowth', value: 0.01 }],
      weight: 3,
    },
  ],
};

const MICRO: EventDef = {
  id: 'MICRO',
  destination: 'moon',
  phase: 'surface',
  kind: 'main',
  illustration: 'impact',
  speaker: 'technical',
  research: ['R-MICRO'],
  onOpen: [{ kind: 'env', key: 'heatHours', value: 48 }],
  options: [
    {
      id: 'patch',
      requires: [{ kind: 'item', item: 'sealant' }],
      crew: { count: 1, skill: 'technical', traits: ['eva'], outside: true },
      hours: 2,
      cost: [{ kind: 'use', item: 'sealant' }],
      success: [{ kind: 'env', key: 'heatHours', value: 0 }],
      weight: 3,
    },
    {
      id: 'parts',
      requires: [{ kind: 'item', item: 'parts' }],
      crew: { count: 2, skill: 'technical', traits: ['mechanic'], outside: true },
      hours: 3,
      cost: [{ kind: 'use', item: 'parts' }],
      success: [{ kind: 'env', key: 'heatHours', value: 0 }, { kind: 'sys', key: 'solar', delta: 5 }],
      weight: 3,
    },
    { id: 'isolate', success: [{ kind: 'env', key: 'heatHours', value: 20 }], weight: 3 },
  ],
};

const HAYFEVER: EventDef = {
  id: 'HAYFEVER',
  destination: 'moon',
  phase: 'surface',
  kind: 'small',
  illustration: 'suit',
  speaker: 'science',
  research: ['R-MOON-DUST'],
  onOpen: [{ kind: 'crew', target: 'all', stat: 'stress', delta: 4 }],
  options: [
    {
      id: 'cleanHab',
      crew: { count: 2, skill: 'teamwork' },
      hours: 3,
      success: [{ kind: 'crew', target: 'all', stat: 'health', delta: 4 }, { kind: 'crew', target: 'all', stat: 'stress', delta: -6 }],
      weight: 2,
    },
    {
      id: 'protocol',
      requires: [{ kind: 'research', id: 'R-MOON-DUST' }],
      success: [{ kind: 'flag', key: 'dustProtocol', value: true }, { kind: 'crew', target: 'all', stat: 'stress', delta: -8 }, { kind: 'crew', target: 'all', stat: 'health', delta: 3 }],
      weight: 2,
      research: ['R-MOON-DUST'],
    },
    {
      id: 'medkit',
      requires: [{ kind: 'item', item: 'medkit' }],
      cost: [{ kind: 'use', item: 'medkit' }],
      success: [{ kind: 'crew', target: 'all', stat: 'health', delta: 6 }],
      weight: 2,
    },
    { id: 'ignore', success: [{ kind: 'crew', target: 'all', stat: 'health', delta: -6 }, { kind: 'crew', target: 'all', stat: 'stress', delta: 6 }], weight: 2 },
  ],
};

const MOON_SAR: EventDef = {
  id: 'MOON-SAR',
  destination: 'moon',
  phase: 'surface',
  kind: 'main',
  illustration: 'rover',
  speaker: 'teamwork',
  research: ['R-MOON-POLE', 'R-MOON-ENV'],
  subjects: 2,
  options: [
    {
      id: 'rescue',
      crew: { count: 2, skill: 'technical', traits: ['eva', 'pilot', 'rover'], outside: true },
      hours: 3,
      cost: [{ kind: 'crew', target: 'assigned', stat: 'fatigue', delta: 14 }],
      check: { base: 0.6, skill: 'technical', traits: ['eva', 'pilot', 'rover'] },
      success: [{ kind: 'crew', target: 'subject', stat: 'fatigue', delta: 10 }],
      failure: [{ kind: 'crew', target: 'subject', stat: 'health', delta: -14 }, { kind: 'crew', target: 'subject', stat: 'stress', delta: 12 }],
      weight: 3,
    },
    {
      id: 'earth',
      check: { base: 0.5, skill: 'teamwork', earth: true },
      success: [{ kind: 'crew', target: 'subject', stat: 'fatigue', delta: 14 }],
      failure: [{ kind: 'crew', target: 'subject', stat: 'health', delta: -10 }, { kind: 'crew', target: 'subject', stat: 'stress', delta: 10 }],
      weight: 3,
      research: ['R-COMMS'],
    },
    {
      id: 'wait',
      success: [{ kind: 'crew', target: 'subject', stat: 'health', delta: -12 }, { kind: 'crew', target: 'subject', stat: 'stress', delta: 10 }],
      weight: 3,
    },
  ],
};

const ISRU: EventDef = {
  id: 'ISRU',
  destination: 'moon',
  phase: 'surface',
  kind: 'small',
  illustration: 'o2',
  speaker: 'science',
  research: ['R-MOON-O2'],
  options: [
    {
      id: 'run',
      crew: { count: 1, skill: 'science', traits: ['geologist'] },
      hours: 6,
      cost: [{ kind: 'res', key: 'batteryKWh', delta: -12 }],
      check: { base: 0.7, skill: 'science', traits: ['geologist', 'chemist'] },
      success: [{ kind: 'res', key: 'o2Kg', delta: 2.5 }, { kind: 'res', key: 'science', delta: 10 }],
      failure: [{ kind: 'res', key: 'science', delta: 4 }],
      weight: 2,
    },
    {
      id: 'sample',
      crew: { count: 1, skill: 'science' },
      hours: 2,
      success: [{ kind: 'res', key: 'science', delta: 7 }],
      weight: 2,
    },
    { id: 'skip', success: [], weight: 2 },
  ],
};

const ICE: EventDef = {
  id: 'ICE',
  destination: 'moon',
  phase: 'surface',
  kind: 'main',
  illustration: 'ice',
  speaker: 'science',
  research: ['R-MOON-POLE'],
  options: [
    {
      id: 'traverse',
      crew: { count: 2, skill: 'science', traits: ['geologist', 'eva', 'rover'], outside: true },
      hours: 4,
      cost: [{ kind: 'crew', target: 'assigned', stat: 'fatigue', delta: 14 }],
      check: { base: 0.55, skill: 'science', traits: ['geologist', 'eva'], items: [{ item: 'spectro', bonus: 0.1 }] },
      success: [{ kind: 'res', key: 'waterL', delta: 25 }, { kind: 'res', key: 'science', delta: 20 }],
      failure: [{ kind: 'res', key: 'science', delta: 6 }, { kind: 'crew', target: 'assigned', stat: 'health', delta: -8 }],
      weight: 3,
    },
    {
      id: 'rim',
      crew: { count: 1, skill: 'science' },
      hours: 2,
      success: [{ kind: 'res', key: 'science', delta: 8 }],
      weight: 3,
    },
    { id: 'skip', success: [], weight: 3 },
  ],
};

const SHADOW: EventDef = {
  id: 'SHADOW',
  destination: 'moon',
  phase: 'surface',
  kind: 'main',
  illustration: 'shadow',
  speaker: 'technical',
  research: ['R-MOON-POLE', 'R-BATTERY'],
  onOpen: [{ kind: 'env', key: 'darkFactor', value: 0 }],
  options: [
    {
      id: 'essentials',
      success: [{ kind: 'gh', mode: 'off' }, { kind: 'flag', key: 'shadowEssentials', value: true }, { kind: 'env', key: 'darkHours', value: 12 }],
      weight: 3,
    },
    {
      id: 'relocate',
      crew: { count: 2, skill: 'technical', traits: ['eva'], outside: true },
      hours: 2,
      cost: [{ kind: 'crew', target: 'assigned', stat: 'fatigue', delta: 12 }],
      check: { base: 0.6, skill: 'technical', traits: ['eva'], earth: true },
      success: [{ kind: 'env', key: 'darkHours', value: 5 }],
      failure: [{ kind: 'env', key: 'darkHours', value: 12 }],
      weight: 3,
    },
    { id: 'normal', success: [{ kind: 'env', key: 'darkHours', value: 12 }], weight: 3 },
  ],
};

const HEAT: EventDef = {
  id: 'HEAT',
  destination: 'moon',
  phase: 'surface',
  kind: 'main',
  illustration: 'heat',
  speaker: 'technical',
  research: ['R-MOON-ENV'],
  onOpen: [{ kind: 'env', key: 'heatHours', value: 30 }],
  options: [
    {
      id: 'shade',
      crew: { count: 2, skill: 'technical', traits: ['eva'], outside: true },
      hours: 2,
      cost: [{ kind: 'crew', target: 'assigned', stat: 'fatigue', delta: 12 }],
      check: { base: 0.65, skill: 'technical', traits: ['eva'], earth: true },
      success: [{ kind: 'env', key: 'heatHours', value: 6 }],
      failure: [{ kind: 'env', key: 'heatHours', value: 20 }],
      weight: 3,
    },
    { id: 'cutLoads', success: [{ kind: 'gh', mode: 'eco' }, { kind: 'env', key: 'heatHours', value: 15 }], weight: 3 },
    {
      id: 'ride',
      success: [{ kind: 'crew', target: 'all', stat: 'stress', delta: 8 }, { kind: 'sys', key: 'lifeSupport', delta: -8 }],
      weight: 3,
    },
  ],
};

export const EVENTS_2: EventDef[] = [CROP, HARVEST, WQ, SAB, WIND, GEAR, BRINE, MARS_SAR, DEVIL, QUAKE, MICRO, HAYFEVER, MOON_SAR, ISRU, ICE, SHADOW, HEAT];
