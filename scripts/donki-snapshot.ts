// Refreshes the bundled offline snapshot (src/live/donki-fallback.json) from NASA DONKI.
// Usage: node scripts/donki-snapshot.ts   (reads NASA_API_KEY from .env; the key is never printed)
import { readFileSync, writeFileSync } from 'node:fs';
import { fetchSnapshot } from '../src/live/donki.ts';

const env = readFileSync(new URL('../.env', import.meta.url), 'utf8');
const key = env.match(/^\s*NASA_API_KEY\s*=\s*(\S+)/m)?.[1] ?? 'DEMO_KEY';
const snap = await fetchSnapshot(key, Date.now());
const out = { ...snap, source: 'bundled' };
writeFileSync(new URL('../src/live/donki-fallback.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
const kinds = out.records.reduce((a, r) => ({ ...a, [r.kind]: (a[r.kind] ?? 0) + 1 }), {});
console.log(`saved ${out.records.length} records ${out.rangeStart}..${out.rangeEnd}`, kinds, 'failed:', out.failed);
