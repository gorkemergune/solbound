// Domain types for the Solbound simulation. Pure data — no React, no browser APIs.
import type { SpaceWeatherSnapshot } from './spaceweather';

export type Locale = 'en' | 'tr';
export type DestinationId = 'moon' | 'mars';
/** standard: losses are possible. explorer: the same rule chain ends in medical evacuation. */
export type Mode = 'standard' | 'explorer';

/** Landing site (Moon) or arrival season (Mars). Changes power, heat and which events can happen. */
export type SiteId = 'polar' | 'equator' | 'spring' | 'summer';
export type Crop = 'greens' | 'potato' | 'soy';
export type CoverMode = 'auto' | 'open' | 'closed';
export type H2Mode = 'vent' | 'sabatier';
export type Speed = 1 | 2 | 4 | 8 | 16;

export type Phase =
  | 'identity'
  | 'destination'
  | 'crew'
  | 'cargo'
  | 'briefing'
  | 'outbound'
  | 'landing'
  | 'surface'
  | 'returnPrep'
  | 'returnFlight'
  | 'debrief';

export const PREP_PHASES: Phase[] = ['identity', 'destination', 'crew', 'cargo', 'briefing'];

export type SkillKey = 'technical' | 'science' | 'teamwork';
export type Skills = Record<SkillKey, number>;

export type TraitId =
  | 'mechanic'
  | 'eva'
  | 'pilot'
  | 'medic'
  | 'botanist'
  | 'geologist'
  | 'spaceWeather'
  | 'mediator'
  | 'steady'
  | 'quartermaster'
  | 'comms'
  | 'power'
  | 'chemist'
  | 'nutrition'
  | 'rover';

export type Profile = {
  age: number;
  heightCm: number;
  massKg: number;
  experienceYears: number;
  motivationId: string;
};

export type Character = {
  id: string;
  name: string;
  /** true when the player typed the name (keeps it through a profile re-roll). */
  customName: boolean;
  /** used to match name and portrait */
  gender: 'f' | 'm';
  isPlayer: boolean;
  portraitSeed: number;
  backgroundId: string;
  traitId: TraitId;
  skills: Skills;
  profile: Profile;
};

export type CrewStatus = 'active' | 'evacuated' | 'deceased';
export type Routine = 'maintenance' | 'science' | 'rest';

export type CrewState = {
  id: string;
  health: number; // 0..100 (educational index)
  stress: number; // 0..100
  fatigue: number; // 0..100
  radiation: number; // dimensionless exposure index, not a medical dose
  status: CrewStatus;
  routine: Routine;
  taskId: string | null;
  sheltered: boolean;
  /** Set once a health warning has been raised so it is not repeated every hour. */
  warned: boolean;
};

export type ItemId =
  | 'filter'
  | 'parts'
  | 'sealant'
  | 'food'
  | 'battery'
  | 'seeds'
  | 'shield'
  | 'medkit'
  | 'cleaner'
  | 'spectro'
  | 'comfort'
  | 'o2candle'
  | 'moxie'
  | 'potato'
  | 'soy'
  | 'purifier';

export type ResourceKey = 'batteryKWh' | 'o2Kg' | 'waterL' | 'foodCrewDays' | 'science';
export type Resources = Record<ResourceKey, number> & { batteryCapKWh: number };

export type SystemKey =
  | 'lifeSupport'
  | 'waterRecycler'
  | 'solar'
  | 'seal'
  | 'greenhouseHealth'
  | 'greenhouseGrowth'
  | 'shelter';
export type Systems = Record<SystemKey, number>;

export type GreenhouseMode = 'full' | 'eco' | 'off';

export type Environment = {
  /** fraction of sunlight blocked by atmospheric dust (Mars), 0..0.9 */
  dust: number;
  /** extra hourly loss of panel condition while dust is settling */
  dustSettle: number;
  /** hours until the dust storm thins */
  dustHours: number;
  /** O2 leak kg/h (Moon seal) and its hourly growth */
  leakKgH: number;
  leakGrowth: number;
  /** water recycler wear per hour (Mars filter clogging) */
  recyclerWear: number;
  /** solar particle event: active hours remaining (0 = none) */
  speHours: number;
  /** greenhouse wilting per hour (Mars nutrient pump issue) */
  wilt: number;
  /** hours of terrain shadow over the array (polar Moon) */
  darkHours: number;
  /** hours of extra heat load (lunar noon at the equator) */
  heatHours: number;
  /** fraction of solar output left while darkHours > 0 (0 = fully dark; a raised mast array keeps some) */
  darkFactor: number;
  /** fraction of the fission unit's output lost (dusty radiator during the lunar night) */
  fissionLoss: number;
};

/** Predictable "big" events with a visible countdown and preparation tasks. */
export type BigKind = 'storm' | 'night' | 'meteor' | 'dark' | 'resupply' | 'cme' | 'crew';
export type BigEventState = {
  id: string;
  kind: BigKind;
  /** minute the forecast arrives (countdown becomes visible) */
  announceAt: number;
  /** minute the event hits */
  startAt: number;
  /** minute it is over */
  endAt: number;
  /** event card that opens when it hits */
  hitEventId: string;
  /** set once the end has been processed */
  closed: boolean;
  /** real NASA DONKI record this event is based on (index into run.spaceWeather.records) */
  swIndex?: number;
};

/** One row per mission day, recorded at midnight (used by the debrief charts and the recap video). */
export type DaySnapshot = {
  day: number;
  food: number;
  o2: number;
  water: number;
  battery: number;
  batteryCap: number;
  health: number;
  stress: number;
  science: number;
  crew: number;
};

export type PowerReport = {
  generationKW: number;
  demandKW: number;
  servedFraction: Record<'lifeSupport' | 'thermal' | 'water' | 'greenhouse' | 'moxie' | 'sabatier', number>;
  /** constant (fission) part of generation */
  baseKW: number;
  unmetKWh: number;
};

/** Per-hour flows of the last simulated step, used to explain numbers in the UI. */
export type Flows = {
  o2Prod: number;
  moxieProd: number;
  o2Use: number;
  leak: number;
  waterRecovered: number;
  crewWater: number;
  electrolysisWater: number;
  greenhouseWater: number;
  foodUse: number;
  batteryDelta: number;
  sabatierWater: number;
  /** suit consumables for people working outside this hour (O₂ kg, cooling water L, recharge kWh) */
  eva: { people: number; o2: number; water: number; kwh: number };
};

export type JournalEntry = {
  id: number;
  minute: number;
  phase: Phase;
  key: string;
  params?: Record<string, string | number>;
  tone: 'info' | 'good' | 'warn' | 'bad' | 'echo' | 'loss' | 'chat' | 'sw' | 'forecast';
};

export type Echo = {
  eventId: string;
  optionId: string;
  source: { kind: 'item'; itemId: ItemId } | { kind: 'trait'; traitId: TraitId; crewId: string } | { kind: 'research'; researchId: string };
};

export type Task = {
  id: string;
  eventInstanceId: string;
  eventId: string;
  optionId: string;
  crewIds: string[];
  startedAt: number;
  endsAt: number;
  success: boolean;
};

export type ActiveEvent = {
  instanceId: string;
  eventId: string;
  openedAt: number;
  /** for crew-specific emergencies */
  subjectCrewId?: string;
  /** crew members the event is about (e.g. a stranded rover team); they cannot be assigned */
  subjects?: string[];
};

export type ScheduledEvent = { eventId: string; atMinute: number; /** unique id when an event can happen more than once */ instanceId?: string };

export type DecisionRecord = {
  instanceId: string;
  eventId: string;
  optionId: string;
  crewIds: string[];
  minute: number;
  phase: Phase;
  probability: number | null;
  roll: number | null;
  success: boolean;
  weight: number;
};

export type MissionState = {
  /** surface mission minutes since day 1 00:00 (surface clock); transit phases keep it frozen */
  minute: number;
  resources: Resources;
  systems: Systems;
  greenhouseMode: GreenhouseMode;
  crop: Crop;
  ghCover: CoverMode;
  h2Mode: H2Mode;
  env: Environment;
  crew: CrewState[];
  items: Partial<Record<ItemId, number>>;
  queue: ScheduledEvent[];
  activeEvent: ActiveEvent | null;
  resolved: string[];
  decisions: DecisionRecord[];
  tasks: Task[];
  journal: JournalEntry[];
  journalSeq: number;
  flags: Record<string, string | number | boolean>;
  research: string[];
  echoes: Echo[];
  harvests: number;
  big: BigEventState[];
  /** pre-launch endurance estimate and the resulting mission goal (days on the surface) */
  goal: { estimate: number; target: number; limiting: 'food' | 'water' | 'o2' | 'battery' | null };
  /** real space-weather bulletins still to deliver (record index into run.spaceWeather.records) */
  bulletins: { at: number; rec: number }[];
  history: DaySnapshot[];
  chatUsed: string[];
  nextChatMinute: number;
  lastPower: PowerReport | null;
  lastFlows: Flows | null;
  unmet: { o2Hours: number; waterHours: number; foodHours: number; powerKWh: number };
  ended: null | { reason: 'complete' | 'playerLost' | 'allLost' | 'aborted'; minute: number };
};

export type RunState = {
  schemaVersion: number;
  contentVersion: string;
  runId: string;
  seed: number;
  revision: number;
  phase: Phase;
  mode: Mode;
  player: Character;
  candidates: Character[];
  crewIds: string[];
  destination: DestinationId | null;
  site: SiteId | null;
  cargo: Partial<Record<ItemId, number>>;
  mission: MissionState | null;
  manualPause: boolean;
  speed: Speed;
  launched: boolean;
  /** NASA DONKI snapshot attached before launch (null = no real data; the mission still works) */
  spaceWeather: SpaceWeatherSnapshot | null;
};
