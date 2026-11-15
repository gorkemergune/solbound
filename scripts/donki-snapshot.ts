// Refreshes the bundled offline snapshot (src/live/donki-fallback.json) from NASA DONKI.
// Usage: node scripts/donki-snapshot.ts   (reads NASA_API_KEY from .env; the key is never printed)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fetchSnapshot } from '../src/live/donki.ts';

// key from the environment (CI secret) or the local .env file; never printed
const envFile = new URL('../.env', import.meta.url);
const fromFile = existsSync(envFile) ? readFileSync(envFile, 'utf8').match(/^\s*NASA_API_KEY\s*=\s*(\S+)/m)?.[1] : undefined;
const key = process.env.NASA_API_KEY || fromFile;
if (!key) {
  // fail loudly (a red CI run) instead of silently falling back to DEMO_KEY, which GitHub's shared IPs exhaust
  console.error('NASA_API_KEY is missing: set it in .env or as the repository secret NASA_API_KEY.');
  process.exit(1);
}
const snap = await fetchSnapshot(key, Date.now());
const out = { ...snap, source: 'bundled' };
writeFileSync(new URL('../src/live/donki-fallback.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
// the static file the site serves (no key in the browser); CI can refresh it on a schedule
mkdirSync(new URL('../public/', import.meta.url), { recursive: true });
writeFileSync(new URL('../public/donki-latest.json', import.meta.url), JSON.stringify(snap) + '\n');
const kinds = out.records.reduce((a, r) => ({ ...a, [r.kind]: (a[r.kind] ?? 0) + 1 }), {});
console.log(`saved ${out.records.length} records ${out.rangeStart}..${out.rangeEnd}`, kinds, 'failed:', out.failed);
