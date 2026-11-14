import { Rng, deriveSeed } from './rng';
import type { Character, Locale, SkillKey, Skills, TraitId } from './types';

export const TRAITS: TraitId[] = [
  'mechanic',
  'eva',
  'pilot',
  'medic',
  'botanist',
  'geologist',
  'spaceWeather',
  'mediator',
  'steady',
  'quartermaster',
  'comms',
  'power',
  'chemist',
  'nutrition',
  'rover',
];

/** Which skill each trait usually grows out of. Used to shape candidate profiles. */
export const TRAIT_PRIMARY: Record<TraitId, SkillKey> = {
  mechanic: 'technical',
  eva: 'technical',
  pilot: 'technical',
  medic: 'science',
  botanist: 'science',
  geologist: 'science',
  spaceWeather: 'science',
  mediator: 'teamwork',
  steady: 'teamwork',
  quartermaster: 'teamwork',
  comms: 'teamwork',
  power: 'technical',
  chemist: 'science',
  nutrition: 'science',
  rover: 'technical',
};

export const BACKGROUNDS = [
  'submarineEngineer',
  'arcticResearcher',
  'airlinePilot',
  'paramedic',
  'teacher',
  'greenhouseFarmer',
  'volcanologist',
  'softwareEngineer',
  'firefighter',
  'astronomer',
  'chef',
  'mountainGuide',
  'radioOperator',
  'gridEngineer',
  'chemist',
  'dietitian',
  'rallyDriver',
  'marineBiologist',
] as const;

export const MOTIVATIONS = ['curiosity', 'family', 'service', 'adventure', 'legacy'] as const;

// Name pools per game language, split by gender so a name always matches its portrait. Turkish games
// get Turkish crews; English games get plain, common English names. Names never determine skills or
// traits (those come from separate seeded streams), and a person keeps their gender and face when the
// language changes; only the name is re-localised.
export type Gender = 'f' | 'm';
type NamePool = { f: string[]; m: string[]; last: string[] };
export const NAMES: Record<Locale, NamePool> = {
  tr: {
    f: ['Ayşe', 'Elif', 'Zeynep', 'Selin', 'Defne', 'Ece', 'Nehir', 'İpek', 'Melis', 'Derin', 'Ada', 'Eylül', 'Ilgın', 'Zehra', 'Esra', 'Merve', 'Büşra', 'Ceren', 'Gizem', 'Sena', 'Damla', 'Aslı', 'Pınar', 'Gül'],
    m: ['Can', 'Yusuf', 'Emre', 'Bora', 'Arda', 'Kerem', 'Mert', 'Efe', 'Barış', 'Kaan', 'Alp', 'Doruk', 'Burak', 'Onur', 'Serkan', 'Volkan', 'Oğuz', 'Tolga', 'Murat', 'Hakan', 'Cem', 'Ozan', 'Berk', 'Selim'],
    last: ['Demir', 'Kaya', 'Arslan', 'Yıldız', 'Özdemir', 'Aydın', 'Aksoy', 'Tunç', 'Kılıç', 'Şahin', 'Polat', 'Koç', 'Erdem', 'Uslu', 'Çelik', 'Yılmaz', 'Doğan', 'Kurt', 'Öztürk', 'Aslan', 'Karaca', 'Bulut', 'Tekin', 'Güneş', 'Acar', 'Korkmaz', 'Avcı', 'Ateş', 'Kara', 'Sönmez'],
  },
  en: {
    f: ['Emma', 'Olivia', 'Sarah', 'Anna', 'Laura', 'Kate', 'Lucy', 'Grace', 'Emily', 'Hannah', 'Rachel', 'Claire', 'Megan', 'Julia', 'Amy', 'Nora', 'Ellie', 'Rose', 'Maya', 'Helen'],
    m: ['James', 'Daniel', 'Michael', 'David', 'Ryan', 'Mark', 'Adam', 'Ben', 'Tom', 'Sam', 'Jack', 'Luke', 'Chris', 'Matt', 'Paul', 'Peter', 'Nick', 'Owen', 'Ethan', 'Leo'],
    last: ['Carter', 'Brooks', 'Hayes', 'Bennett', 'Walker', 'Mitchell', 'Parker', 'Collins', 'Reed', 'Turner', 'Morgan', 'Foster', 'Price', 'Ward', 'Hughes', 'Cooper', 'Bailey', 'Ellis', 'Grant', 'Shaw', 'Porter', 'Lane', 'Fisher', 'Wells', 'Hart', 'Hunt', 'Young', 'Stone', 'Baker', 'Gray'],
  },
};

function nameFor(rng: Rng, locale: Locale, gender: Gender, used?: { f: Set<string>; l: Set<string> }): string {
  const pool = NAMES[locale];
  for (let i = 0; i < 200; i++) {
    const f = rng.pick(pool[gender]);
    const l = rng.pick(pool.last);
    if (used && (used.f.has(f) || used.l.has(l))) continue;
    used?.f.add(f);
    used?.l.add(l);
    return `${f} ${l}`;
  }
  return `${rng.pick(pool[gender])} ${rng.pick(pool.last)}`;
}

/** Gender of a generated person: seeded and independent of language (so the face never changes). */
export function genderOf(seed: number, id: string): Gender {
  return new Rng(deriveSeed(seed, 'gender', id)).next() < 0.5 ? 'f' : 'm';
}

/** Distinct, gender-matched names for a crew pool (no shared first or family names). */
export function crewNames(seed: number, ids: string[], locale: Locale, reserved: string[] = []): string[] {
  const rng = new Rng(deriveSeed(seed, 'names', locale));
  const used = { f: new Set<string>(), l: new Set<string>() };
  for (const r of reserved) {
    const [f, l] = r.split(' ');
    used.f.add(f);
    if (l) used.l.add(l);
  }
  return ids.map((id) => nameFor(rng, locale, genderOf(seed, id), used));
}

export function playerName(seed: number, locale: Locale): string {
  return nameFor(new Rng(deriveSeed(seed, 'player-name', locale)), locale, genderOf(seed, 'player'));
}

/** How many distinct names the generator can produce (shown in docs/tests). */
export function nameVariety(locale: Locale): number {
  const p = NAMES[locale];
  return (p.f.length + p.m.length) * p.last.length;
}

const SKILL_KEYS: SkillKey[] = ['technical', 'science', 'teamwork'];

/**
 * Skills follow a shared budget (about 150) so no candidate is best at everything:
 * a high primary skill always costs something elsewhere.
 */
function rollSkills(rng: Rng, primary: SkillKey): Skills {
  const others = SKILL_KEYS.filter((k) => k !== primary);
  const [a, b] = rng.shuffle(others);
  const p = rng.int(64, 84);
  const s = rng.int(36, 58);
  const t = Math.max(18, Math.min(52, 150 - p - s + rng.int(-6, 6)));
  return { [primary]: p, [a]: s, [b]: t } as Skills;
}

function profile(rng: Rng) {
  return {
    age: rng.int(27, 48),
    heightCm: rng.int(156, 193),
    massKg: rng.int(54, 90),
    experienceYears: rng.int(1, 16),
    motivationId: rng.pick(MOTIVATIONS),
  };
}

export function generatePlayer(seed: number, locale: Locale): Character {
  const rng = new Rng(deriveSeed(seed, 'player'));
  const traitId = rng.pick(TRAITS);
  return {
    id: 'player',
    name: playerName(seed, locale),
    gender: genderOf(seed, 'player'),
    customName: false,
    isPlayer: true,
    portraitSeed: deriveSeed(seed, 'portrait', 'player'),
    backgroundId: rng.pick(BACKGROUNDS),
    traitId,
    skills: rollSkills(rng, TRAIT_PRIMARY[traitId]),
    profile: profile(rng),
  };
}

export const CANDIDATE_COUNT = 16;

export function generateCandidates(seed: number, locale: Locale = 'en', count = CANDIDATE_COUNT): Character[] {
  const rng = new Rng(deriveSeed(seed, 'candidates'));
  // Every trait appears at least once; the remainder are seeded extras.
  const traits = rng.shuffle([...TRAITS, ...rng.shuffle(TRAITS).slice(0, Math.max(0, count - TRAITS.length))]).slice(0, count);
  const ids = traits.map((_, i) => `c${String(i + 1).padStart(2, '0')}`);
  const names = crewNames(seed, ids, locale, [playerName(seed, locale)]);
  return traits.map((traitId, i) => ({
    id: ids[i],
    name: names[i],
    gender: genderOf(seed, ids[i]),
    customName: false,
    isPlayer: false,
    portraitSeed: deriveSeed(seed, 'portrait', i),
    backgroundId: rng.pick(BACKGROUNDS),
    traitId,
    skills: rollSkills(rng, TRAIT_PRIMARY[traitId]),
    profile: profile(rng),
  }));
}

/** Cleans a user-typed name. Text is never rendered as HTML (React escapes it); this only trims and bounds length. */
export function sanitizeName(raw: string): string {
  return raw.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 28);
}

export function fallbackName(seed: number, id: string, locale: Locale): string {
  if (id === 'player') return playerName(seed, locale);
  return nameFor(new Rng(deriveSeed(seed, 'fallback-name', id)), locale, genderOf(seed, id));
}
