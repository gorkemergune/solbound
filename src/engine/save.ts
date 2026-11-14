import { CONTENT_VERSION, SCHEMA_VERSION } from './commands';
import type { RunState } from './types';

const PHASES = new Set(['identity', 'destination', 'crew', 'cargo', 'briefing', 'outbound', 'landing', 'surface', 'returnPrep', 'returnFlight', 'debrief']);

export type LoadResult = { ok: true; run: RunState } | { ok: false; reason: 'empty' | 'corrupt' | 'version' };

export function serialize(run: RunState): string {
  return JSON.stringify(run);
}

/** Structural validation: a broken or older save never crashes the game. */
export function deserialize(raw: string | null): LoadResult {
  if (!raw) return { ok: false, reason: 'empty' };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'corrupt' };
  }
  if (!data || typeof data !== 'object') return { ok: false, reason: 'corrupt' };
  const r = data as Partial<RunState>;
  if (r.schemaVersion !== SCHEMA_VERSION || r.contentVersion !== CONTENT_VERSION) return { ok: false, reason: 'version' };
  const okBasics =
    typeof r.seed === 'number' &&
    typeof r.phase === 'string' &&
    PHASES.has(r.phase) &&
    !!r.player &&
    Array.isArray(r.candidates) &&
    r.candidates.length > 0 &&
    Array.isArray(r.crewIds) &&
    typeof r.cargo === 'object';
  if (!okBasics) return { ok: false, reason: 'corrupt' };
  if (r.launched) {
    const m = r.mission;
    if (!m || !Array.isArray(m.crew) || !Array.isArray(m.journal) || !Array.isArray(m.resolved) || typeof m.minute !== 'number' || !m.resources) {
      return { ok: false, reason: 'corrupt' };
    }
  }
  return { ok: true, run: r as RunState };
}
