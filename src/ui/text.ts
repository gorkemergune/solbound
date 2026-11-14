import { activeCrew, characterById, type Echo, type JournalEntry, type LockReason, type RunState, type SkillKey } from '../engine';
import { orList } from '../i18n';
import type { Delta } from './store';

type T = (key: string, params?: Record<string, string | number | undefined>) => string;

export function destName(t: T, run: RunState) {
  return run.destination ? t(`dest.${run.destination}`) : '';
}

export function lockText(t: T, r: LockReason, locale: 'en' | 'tr'): string {
  if (r.key === 'lock.any' && r.alts) {
    return t('lock.any', { list: orList(locale, r.alts.map((a) => lockTarget(t, a))) });
  }
  const p = { ...(r.params ?? {}) } as Record<string, string | number>;
  if (typeof p.item === 'string') p.item = t(`item.${p.item}`);
  if (typeof p.trait === 'string') p.trait = t(`trait.${p.trait}`);
  if (typeof p.research === 'string') p.research = t(`${p.research}.title`);
  if (typeof p.crop === 'string') p.crop = t(`crop.${p.crop}`);
  return t(r.key, p);
}

function lockTarget(t: T, r: LockReason): string {
  const p = r.params ?? {};
  if (r.key === 'lock.item') return t(`item.${p.item}`);
  if (r.key === 'lock.trait') return t(`trait.${p.trait}`);
  if (r.key === 'lock.research') return t(`${p.research}.title`);
  return t(r.key, p);
}

export function echoText(t: T, run: RunState, e: Echo): { key: string; params: Record<string, string> } {
  if (e.source.kind === 'item') return { key: 'journal.echo.item', params: { item: t(`item.${e.source.itemId}`) } };
  if (e.source.kind === 'trait') return { key: 'journal.echo.trait', params: { name: characterById(run, e.source.crewId).name, trait: t(`trait.${e.source.traitId}`) } };
  return { key: 'journal.echo.research', params: { research: t(`${e.source.researchId}.title`) } };
}

/** Translate a journal entry. Parameters that are ids are translated at render time, so switching language re-renders history. */
export function journalText(t: T, run: RunState, j: JournalEntry): string {
  const p: Record<string, string | number> = { ...(j.params ?? {}) };
  if (j.key === 'journal.decision') {
    return t('journal.decision', { option: t(`ev.${p.event}.${p.option}.label`) }) + (p.names ? ` — ${p.names}` : '');
  }
  if (typeof p.item === 'string' && p.item) p.item = t(`item.${p.item}`);
  if (typeof p.trait === 'string' && p.trait) p.trait = t(`trait.${p.trait}`);
  if (typeof p.research === 'string' && p.research) p.research = t(`${p.research}.title`);
  if (typeof p.dest === 'string') p.dest = t(`dest.${p.dest}`);
  if (typeof p.cause === 'string') p.cause = t(`cause.${p.cause}`);
  if (typeof p.crop === 'string') p.crop = t(`crop.${p.crop}`);
  if (j.key.endsWith('.title') && j.key.startsWith('ev.')) p.dest = destName(t, run);
  return t(j.key, p);
}

export function speakerFor(run: RunState, skill: SkillKey, exclude?: string): string {
  const m = run.mission!;
  const pool = activeCrew(m).filter((c) => c.id !== 'player' && c.id !== exclude);
  const list = pool.length ? pool : activeCrew(m);
  const best = list.slice().sort((a, b) => characterById(run, b.id).skills[skill] - characterById(run, a.id).skills[skill] || a.id.localeCompare(b.id))[0];
  return best ? characterById(run, best.id).name : run.player.name;
}

/** Visible, engine-computed differences between two states (for the result card). */
export function computeDeltas(before: RunState, after: RunState): Delta[] {
  const a = before.mission;
  const b = after.mission;
  if (!a || !b) return [];
  const out: Delta[] = [];
  const res: [keyof typeof a.resources, string, string][] = [
    ['batteryKWh', 'res.battery', 'kWh'],
    ['o2Kg', 'res.o2', 'kg'],
    ['waterL', 'res.water', 'L'],
    ['foodCrewDays', 'res.food', 'cd'],
    ['science', 'res.science', 'pts'],
  ];
  for (const [k, key, unit] of res) {
    const d = b.resources[k] - a.resources[k];
    if (Math.abs(d) >= 0.05) out.push({ key, value: d, unit });
  }
  for (const k of Object.keys(a.systems) as (keyof typeof a.systems)[]) {
    const d = b.systems[k] - a.systems[k];
    if (Math.abs(d) >= 0.5) out.push({ key: `sys.${k}`, value: d, unit: '%' });
  }
  for (const stat of ['health', 'stress', 'fatigue', 'radiation'] as const) {
    let sum = 0;
    let n = 0;
    for (const c of b.crew) {
      const pc = a.crew.find((x) => x.id === c.id);
      if (!pc || pc.status !== 'active') continue;
      sum += c[stat] - pc[stat];
      n++;
    }
    if (n && Math.abs(sum / n) >= 0.5) out.push({ key: `crewPanel.${stat}`, value: sum / n, unit: 'avg' });
  }
  for (const id of Object.keys(a.items) as (keyof typeof a.items)[]) {
    const d = (b.items[id] ?? 0) - (a.items[id] ?? 0);
    if (d) out.push({ key: `item.${id}`, value: d, unit: 'x' });
  }
  if (a.greenhouseMode !== b.greenhouseMode) out.push({ key: `gh.${b.greenhouseMode}`, value: 0, unit: 'gh' });
  if (a.env.leakKgH > 0 && b.env.leakKgH === 0) out.push({ key: 'sys.seal', value: 0, unit: 'leakFixed' });
  return out;
}
