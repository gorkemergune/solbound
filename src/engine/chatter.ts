// Crew chatter between decisions. Deterministic (seed + mission hour), driven by the current state,
// never changes resources. Lines live in i18n under `chat.<id>` with {a} and {b} speaker names.
import { Rng, deriveSeed } from './rng';
import { activeCrew, characterById, log } from './rules';
import { bigStatus } from './bigevents';
import type { BigKind, MissionState, RunState, TraitId } from './types';

type ChatDef = {
  id: string;
  /** speaker A needs this trait (if present on the crew) */
  trait?: TraitId;
  when: (run: RunState, m: MissionState, hour: number) => boolean;
  weight?: number;
};

const avg = (m: MissionState, k: 'stress' | 'fatigue') => {
  const a = activeCrew(m);
  return a.reduce((s, c) => s + c[k], 0) / Math.max(1, a.length);
};
const moon = (r: RunState) => r.destination === 'moon';
const mars = (r: RunState) => r.destination === 'mars';
const bat = (m: MissionState) => m.resources.batteryKWh / m.resources.batteryCapKWh;
const always = () => true;
const coming = (m: MissionState, kind: BigKind) => m.big.some((b) => b.kind === kind && bigStatus(b, m.minute) === 'countdown');
const day = (m: MissionState) => Math.floor(m.minute / 1440) + 1;

export const CHATS: ChatDef[] = [
  { id: 'coffee', when: (_r, _m, h) => h >= 7 && h <= 9 },
  { id: 'evening', when: (_r, _m, h) => h >= 19 },
  { id: 'homesick', when: always },
  { id: 'waterLoop', when: always, weight: 2 },
  { id: 'recycler', when: always },
  { id: 'fatigue', when: (_r, m) => avg(m, 'fatigue') > 50, weight: 3 },
  { id: 'stress', when: (_r, m) => avg(m, 'stress') > 45, weight: 3 },
  { id: 'goodMood', when: (_r, m) => avg(m, 'stress') < 25, weight: 2 },
  { id: 'batteryLow', when: (_r, m) => bat(m) < 0.3, weight: 4 },
  { id: 'batteryFull', when: (_r, m) => bat(m) > 0.9 },
  { id: 'foodLow', when: (_r, m) => m.resources.foodCrewDays < activeCrew(m).length * 5, weight: 4 },
  { id: 'harvestSoon', when: (_r, m) => m.systems.greenhouseGrowth > 80, weight: 2 },
  { id: 'potatoEyes', when: (_r, m) => m.crop === 'potato', weight: 2 },
  { id: 'soyProtein', when: (_r, m) => m.crop === 'soy', weight: 2 },
  { id: 'greens', when: (_r, m) => m.crop === 'greens' },
  { id: 'sabatierOn', when: (_r, m) => m.h2Mode === 'sabatier', weight: 2 },
  { id: 'leakWorry', when: (_r, m) => m.env.leakKgH > 0, weight: 4 },
  { id: 'shelter', when: (_r, m) => m.env.speHours > 0, weight: 5 },
  { id: 'busy', when: (_r, m) => m.tasks.length > 0, weight: 2 },
  { id: 'mechDust', trait: 'mechanic', when: always, weight: 2 },
  { id: 'geoRock', trait: 'geologist', when: always, weight: 2 },
  { id: 'botLight', trait: 'botanist', when: always, weight: 2 },
  { id: 'medicCheck', trait: 'medic', when: always, weight: 2 },
  { id: 'swSun', trait: 'spaceWeather', when: always, weight: 2 },
  { id: 'pilotHome', trait: 'pilot', when: always, weight: 2 },
  { id: 'medTalk', trait: 'mediator', when: (_r, m) => avg(m, 'stress') > 30, weight: 2 },
  { id: 'steadyCalm', trait: 'steady', when: always, weight: 2 },
  { id: 'qmCount', trait: 'quartermaster', when: always, weight: 2 },
  { id: 'evaSuit', trait: 'eva', when: always, weight: 2 },
  // Moon
  { id: 'earthView', when: moon, weight: 2 },
  { id: 'moonDust', when: moon, weight: 2 },
  { id: 'moonSilence', when: moon },
  { id: 'moonNight', when: moon },
  { id: 'moonDelay', when: moon },
  { id: 'polarSun', when: (r) => r.site === 'polar', weight: 2 },
  { id: 'iceCraters', when: (r) => r.site === 'polar' },
  { id: 'equatorHeat', when: (r) => r.site === 'equator', weight: 2 },
  { id: 'quakeTalk', when: moon },
  // Mars
  { id: 'marsSol', when: mars, weight: 2 },
  { id: 'marsSky', when: mars },
  { id: 'marsStorm', when: (r, m) => mars(r) && m.env.dust > 0.3, weight: 4 },
  { id: 'marsDelay', when: mars, weight: 2 },
  { id: 'marsSunlight', when: mars },
  { id: 'marsCold', when: mars },
  { id: 'marsYear', when: mars },
  { id: 'marsMagnet', when: mars },
  { id: 'coverTalk', when: mars },
  { id: 'seasonTalk', when: (r) => r.site === 'summer', weight: 2 },
  // 30-day mission: countdowns, time, new specialists
  { id: 'stormComing', when: (_r, m) => coming(m, 'storm'), weight: 5 },
  { id: 'nightComing', when: (_r, m) => coming(m, 'night'), weight: 5 },
  { id: 'meteorComing', when: (_r, m) => coming(m, 'meteor'), weight: 5 },
  { id: 'resupplyComing', when: (_r, m) => coming(m, 'resupply'), weight: 4 },
  { id: 'darkComing', when: (_r, m) => coming(m, 'dark'), weight: 5 },
  { id: 'lunarNightTalk', when: (_r, m) => m.big.some((b) => b.kind === 'night' && bigStatus(b, m.minute) === 'active'), weight: 4 },
  { id: 'commsLink', trait: 'comms', when: always, weight: 2 },
  { id: 'powerGrid', trait: 'power', when: always, weight: 2 },
  { id: 'chemLoop', trait: 'chemist', when: always, weight: 2 },
  { id: 'nutriMeal', trait: 'nutrition', when: always, weight: 2 },
  { id: 'roverDrive', trait: 'rover', when: always, weight: 2 },
  { id: 'solClock', when: mars, weight: 2 },
  { id: 'moonClock', when: moon, weight: 2 },
  { id: 'halfway', when: (_r, m) => day(m) >= 15 && day(m) <= 16, weight: 6 },
  { id: 'lastWeek', when: (_r, m) => day(m) >= 23 && day(m) <= 25, weight: 6 },
];

/** Every few daytime hours, two crew members talk about what is happening. */
export function maybeChat(run: RunState) {
  const m = run.mission!;
  const hour = Math.floor(m.minute / 60) % 24;
  if (m.activeEvent || hour < 7 || hour > 21 || m.minute < m.nextChatMinute) return;
  const crew = activeCrew(m);
  if (crew.length < 2) return;
  const rng = new Rng(deriveSeed(run.seed, 'chat', Math.floor(m.minute)));
  m.nextChatMinute = m.minute + 150 + rng.int(0, 4) * 30;
  let cands = CHATS.filter((c) => !m.chatUsed.includes(c.id) && c.when(run, m, hour) && (!c.trait || crew.some((x) => characterById(run, x.id).traitId === c.trait)));
  if (!cands.length) {
    m.chatUsed = [];
    cands = CHATS.filter((c) => c.when(run, m, hour) && (!c.trait || crew.some((x) => characterById(run, x.id).traitId === c.trait)));
  }
  if (!cands.length) return;
  const total = cands.reduce((a, c) => a + (c.weight ?? 1), 0);
  let roll = rng.next() * total;
  const pick = cands.find((c) => (roll -= c.weight ?? 1) < 0) ?? cands[0];
  const speakerA = pick.trait ? crew.find((x) => characterById(run, x.id).traitId === pick.trait)! : rng.pick(crew);
  const others = crew.filter((x) => x.id !== speakerA.id);
  const speakerB = rng.pick(others);
  m.chatUsed.push(pick.id);
  log(m, run, `chat.${pick.id}`, 'chat', {
    a: characterById(run, speakerA.id).name,
    b: characterById(run, speakerB.id).name,
    aId: speakerA.id,
    bId: speakerB.id,
  });
}
