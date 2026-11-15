// End-of-mission rank from science points (gameplay rule). Thresholds come from a 720-game sweep on
// 15 Nov 2026 (careful, science-heavy, random, reckless and early-quitting bots): min 0, median 284,
// 90th percentile 580, max 1025. A careful player usually lands in "researcher" or "senior scientist".
export type RankId = 'cadet' | 'technician' | 'researcher' | 'senior' | 'chief' | 'legend';

export const RANKS: { id: RankId; min: number; icon: string }[] = [
  { id: 'cadet', min: 0, icon: '🎓' },
  { id: 'technician', min: 100, icon: '🔧' },
  { id: 'researcher', min: 200, icon: '🔬' },
  { id: 'senior', min: 350, icon: '🧪' },
  { id: 'chief', min: 500, icon: '🛰️' },
  { id: 'legend', min: 700, icon: '🌟' },
];

/** if anyone died, the rank cannot go above this one: science never comes before the crew */
export const RANK_CAP_IF_LOST: RankId = 'researcher';

export type RankResult = { id: RankId; index: number; icon: string; min: number; next: { id: RankId; min: number } | null; capped: boolean };

export function rankFor(science: number, crewLost: boolean): RankResult {
  let i = 0;
  for (let k = 0; k < RANKS.length; k++) if (science >= RANKS[k].min) i = k;
  const capIndex = RANKS.findIndex((r) => r.id === RANK_CAP_IF_LOST);
  const capped = crewLost && i > capIndex;
  if (capped) i = capIndex;
  const r = RANKS[i];
  const n = capped ? null : (RANKS[i + 1] ?? null);
  return { id: r.id, index: i, icon: r.icon, min: r.min, next: n ? { id: n.id, min: n.min } : null, capped };
}
