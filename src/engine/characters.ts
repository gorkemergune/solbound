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

// Name pools grouped by language/region so first and family names match. Names never determine
// skills or traits (those are seeded independently).
type NameGroup = { first: string[]; last: string[] };
const NAME_GROUPS: Record<string, NameGroup> = {
  tr: {
    first: ['Ayşe', 'Elif', 'Zeynep', 'Selin', 'Defne', 'Ece', 'Nehir', 'İpek', 'Su', 'Melis', 'Derin', 'Ada', 'Can', 'Yusuf', 'Emre', 'Bora', 'Arda', 'Deniz', 'Kerem', 'Mert', 'Efe', 'Barış', 'Umut', 'Kaan', 'Ilgın', 'Tuna', 'Güneş', 'Doruk', 'Eylül', 'Alp'],
    last: ['Demir', 'Kaya', 'Arslan', 'Yıldız', 'Özdemir', 'Aydın', 'Aksoy', 'Tunç', 'Kılıç', 'Şahin', 'Polat', 'Koç', 'Erdem', 'Uslu', 'Çelik', 'Yılmaz', 'Doğan', 'Kurt', 'Öztürk', 'Aslan', 'Karaca', 'Ergün', 'Bulut', 'Tekin'],
  },
  en: {
    first: ['Alex', 'Sam', 'Jordan', 'Riley', 'Morgan', 'Casey', 'Taylor', 'Jamie', 'Avery', 'Quinn', 'Harper', 'Rowan', 'Elliot', 'Skyler', 'Drew', 'Parker', 'Reese', 'Logan', 'Emerson', 'Hayden'],
    last: ['Rivera', 'Blake', 'Chen', 'Hale', 'Lund', 'Reed', 'Quinn', 'Okoye', 'Brooks', 'Carter', 'Hughes', 'Foster', 'Bennett', 'Ward', 'Price', 'Sullivan', 'Hayes', 'Murphy'],
  },
  jp: { first: ['Kenji', 'Hana', 'Yuki', 'Haruto', 'Aiko', 'Ren', 'Sora', 'Mei'], last: ['Sato', 'Tanaka', 'Suzuki', 'Watanabe', 'Ito', 'Nakamura', 'Kobayashi'] },
  ng: { first: ['Amara', 'Chidi', 'Ngozi', 'Tunde', 'Ifeoma', 'Emeka', 'Zainab', 'Femi'], last: ['Okafor', 'Adeyemi', 'Nwosu', 'Balogun', 'Eze', 'Okonkwo'] },
  gh: { first: ['Kwame', 'Ama', 'Kofi', 'Efua', 'Yaw', 'Akosua'], last: ['Mensah', 'Owusu', 'Boateng', 'Asante', 'Appiah'] },
  fr: { first: ['Lucas', 'Chloé', 'Camille', 'Léa', 'Hugo', 'Manon', 'Théo'], last: ['Moreau', 'Martin', 'Dubois', 'Lefèvre', 'Girard', 'Fontaine'] },
  es: { first: ['Mateo', 'Diego', 'Lucía', 'Valentina', 'Sofía', 'Javier', 'Camila', 'Andrés'], last: ['Rojas', 'Alvarez', 'García', 'Morales', 'Castillo', 'Vargas', 'Herrera'] },
  in: { first: ['Priya', 'Arjun', 'Ravi', 'Ananya', 'Kavya', 'Rohan', 'Ishaan', 'Meera'], last: ['Nair', 'Mehta', 'Patel', 'Iyer', 'Reddy', 'Kapoor', 'Rao'] },
  no: { first: ['Jonas', 'Ingrid', 'Astrid', 'Erik', 'Sigrid', 'Lars', 'Freya'], last: ['Berg', 'Larsen', 'Hansen', 'Johansen', 'Lindqvist', 'Dahl'] },
  de: { first: ['Noah', 'Lena', 'Felix', 'Mia', 'Paul', 'Greta', 'Jonas'], last: ['Fischer', 'Weber', 'Schneider', 'Wagner', 'Becker', 'Hoffmann'] },
  ar: { first: ['Leila', 'Omar', 'Yara', 'Karim', 'Nour', 'Samir', 'Rania', 'Hadi'], last: ['Haddad', 'Khalil', 'Mansour', 'Nasser', 'Saleh', 'Farah'] },
  kr: { first: ['Hana', 'Minjun', 'Jiwoo', 'Seoyeon', 'Doyun', 'Haeun'], last: ['Kim', 'Park', 'Lee', 'Choi', 'Jung', 'Kang'] },
  cn: { first: ['Wei', 'Lin', 'Xiao', 'Mei', 'Jun', 'Yan', 'Hao'], last: ['Wang', 'Zhang', 'Liu', 'Chen', 'Zhao', 'Huang'] },
  br: { first: ['Tomás', 'Beatriz', 'Rafael', 'Larissa', 'Gabriel', 'Isabela'], last: ['Silva', 'Santos', 'Oliveira', 'Costa', 'Pereira', 'Almeida'] },
  it: { first: ['Sofia', 'Marco', 'Giulia', 'Luca', 'Chiara', 'Matteo'], last: ['Rossi', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Greco'] },
  pl: { first: ['Mira', 'Jakub', 'Zofia', 'Tomasz', 'Ola', 'Piotr'], last: ['Novak', 'Kowalski', 'Wiśniewska', 'Zieliński', 'Horvat', 'Petrov'] },
  ke: { first: ['Wanjiru', 'Otieno', 'Achieng', 'Kamau', 'Njeri', 'Baraka'], last: ['Mwangi', 'Odhiambo', 'Kiptoo', 'Wambui', 'Kariuki'] },
  mx: { first: ['Ximena', 'Santiago', 'Renata', 'Emiliano', 'Paola'], last: ['Hernández', 'López', 'Ramírez', 'Flores', 'Torres'] },
};

const CREW_GROUPS = Object.keys(NAME_GROUPS);
const PLAYER_GROUPS: Record<Locale, string[]> = { tr: ['tr'], en: ['en'] };

function nameFrom(rng: Rng, groups: string[]): string {
  const g = NAME_GROUPS[rng.pick(groups)];
  return `${rng.pick(g.first)} ${rng.pick(g.last)}`;
}

/** A seeded list of distinct names (no two crew members share a first or family name). */
export function crewNames(seed: number, count: number): string[] {
  const rng = new Rng(deriveSeed(seed, 'names'));
  const out: string[] = [];
  const firsts = new Set<string>();
  const lasts = new Set<string>();
  let guard = 0;
  while (out.length < count && guard++ < 2000) {
    const n = nameFrom(rng, CREW_GROUPS);
    const [f, l] = n.split(' ');
    if (firsts.has(f) || lasts.has(l)) continue;
    firsts.add(f);
    lasts.add(l);
    out.push(n);
  }
  return out;
}

export function playerName(rng: Rng, locale: Locale) {
  return nameFrom(rng, PLAYER_GROUPS[locale]);
}

/** How many distinct names the generator can produce (shown in docs/tests). */
export function nameVariety(): number {
  return Object.values(NAME_GROUPS).reduce((a, g) => a + g.first.length * g.last.length, 0);
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
    name: playerName(rng, locale),
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

export function generateCandidates(seed: number, count = CANDIDATE_COUNT): Character[] {
  const rng = new Rng(deriveSeed(seed, 'candidates'));
  // Every trait appears at least once; the remainder are seeded extras.
  const traits = rng.shuffle([...TRAITS, ...rng.shuffle(TRAITS).slice(0, Math.max(0, count - TRAITS.length))]).slice(0, count);
  const names = crewNames(seed, count);
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
  return id === 'player' ? playerName(rng, locale) : nameFrom(rng, CREW_GROUPS);
}
