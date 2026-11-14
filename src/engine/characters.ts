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
] as const;

export const MOTIVATIONS = ['curiosity', 'family', 'service', 'adventure', 'legacy'] as const;

// International crew pool. Names never determine skills (seeded independently).
const CREW_NAMES = [
  'Ayşe Demir', 'Kenji Sato', 'Amara Okafor', 'Lucas Moreau', 'Elif Kaya', 'Mateo Rojas',
  'Priya Nair', 'Jonas Berg', 'Zeynep Arslan', 'Noah Fischer', 'Leila Haddad', 'Diego Alvarez',
  'Mira Novak', 'Kwame Mensah', 'Selin Yıldız', 'Tomás Silva', 'Hana Kim', 'Arjun Mehta',
  'Ingrid Larsen', 'Can Özdemir', 'Sofia Rossi', 'Yusuf Aydın', 'Chloé Martin', 'Ravi Patel',
];

const PLAYER_NAMES: Record<Locale, string[]> = {
  tr: ['Deniz Aksoy', 'Ece Tunç', 'Bora Kılıç', 'Defne Şahin', 'Emre Polat', 'Nehir Koç', 'Arda Erdem', 'İpek Uslu'],
  en: ['Alex Rivera', 'Sam Okoye', 'Jordan Blake', 'Riley Chen', 'Morgan Hale', 'Casey Lund', 'Taylor Reed', 'Jamie Quinn'],
};

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
    name: rng.pick(PLAYER_NAMES[locale]),
    customName: false,
    isPlayer: true,
    portraitSeed: deriveSeed(seed, 'portrait', 'player'),
    backgroundId: rng.pick(BACKGROUNDS),
    traitId,
    skills: rollSkills(rng, TRAIT_PRIMARY[traitId]),
    profile: profile(rng),
  };
}

export const CANDIDATE_COUNT = 12;

export function generateCandidates(seed: number, count = CANDIDATE_COUNT): Character[] {
  const rng = new Rng(deriveSeed(seed, 'candidates'));
  // Every trait appears at least once; the remainder are seeded extras.
  const traits = rng.shuffle([...TRAITS, ...rng.shuffle(TRAITS).slice(0, Math.max(0, count - TRAITS.length))]).slice(0, count);
  const names = rng.shuffle(CREW_NAMES);
  return traits.map((traitId, i) => ({
    id: `c${String(i + 1).padStart(2, '0')}`,
    name: names[i],
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
  const rng = new Rng(deriveSeed(seed, 'fallback-name', id));
  return id === 'player' ? rng.pick(PLAYER_NAMES[locale]) : rng.pick(CREW_NAMES);
}
