// Keeps a NASA DONKI snapshot fresh while the app is open. No secret ever ships to the browser:
//   1. a cached copy younger than CACHE_MS (localStorage),
//   2. the site's own static snapshot `donki-latest.json` (written by `npm run donki:snapshot` / CI with the
//      real key) if it is younger than STATIC_MS,
//   3. a live call with NASA's public DEMO_KEY (limits are per visitor IP, so nobody can drain a shared quota),
//   4. otherwise the newest of what we have (static file, cache, bundled sample).
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { SpaceWeatherSnapshot } from '../engine/spaceweather';
import { fetchSnapshot } from './donki';
import fallback from './donki-fallback.json';

const CACHE_KEY = 'solbound.donki.v1';
/** refresh at most every 3 h (DEMO_KEY allows 10 requests per hour per IP; one refresh uses 5) */
export const REFRESH_MS = 3 * 60 * 60 * 1000;
const STATIC_MS = 6 * 60 * 60 * 1000;
const PUBLIC_KEY = 'DEMO_KEY';

type Status = 'idle' | 'loading' | 'ok' | 'offline';
type SwStore = { snapshot: SpaceWeatherSnapshot; status: Status; lastCheck: string | null; refresh: () => void };

const Ctx = createContext<SwStore | null>(null);
const age = (s: SpaceWeatherSnapshot | null) => (s ? Date.now() - Date.parse(s.fetchedAt) : Infinity);
const valid = (s: unknown): s is SpaceWeatherSnapshot =>
  !!s && typeof s === 'object' && Array.isArray((s as SpaceWeatherSnapshot).records) && typeof (s as SpaceWeatherSnapshot).rangeStart === 'string';

function readCache(): SpaceWeatherSnapshot | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    const s = raw ? JSON.parse(raw) : null;
    return valid(s) ? { ...s, source: 'cache' } : null;
  } catch {
    return null;
  }
}

function writeCache(s: SpaceWeatherSnapshot) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(s));
  } catch {
    /* storage full or blocked: the live copy still works for this session */
  }
}

async function readStatic(): Promise<SpaceWeatherSnapshot | null> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}donki-latest.json`, { cache: 'no-cache' });
    if (!res.ok) return null;
    const s = await res.json();
    return valid(s) ? { ...s, source: 'live' } : null;
  } catch {
    return null;
  }
}

const newest = (...list: (SpaceWeatherSnapshot | null)[]) =>
  list.filter((x): x is SpaceWeatherSnapshot => !!x).sort((a, b) => Date.parse(b.fetchedAt) - Date.parse(a.fetchedAt))[0] ?? null;

export function SpaceWeatherProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<SpaceWeatherSnapshot>(() => readCache() ?? (fallback as SpaceWeatherSnapshot));
  const [status, setStatus] = useState<Status>('idle');
  const [lastCheck, setLastCheck] = useState<string | null>(null);
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setStatus('loading');
    try {
      const stat = await readStatic();
      if (stat && age(stat) < STATIC_MS) {
        writeCache(stat);
        setSnapshot(stat);
        setStatus('ok');
        return;
      }
      try {
        const live = await fetchSnapshot(PUBLIC_KEY, Date.now());
        writeCache(live);
        setSnapshot(live);
        setStatus('ok');
      } catch {
        const best = newest(stat, readCache());
        if (best) setSnapshot(best.source === 'live' ? { ...best, source: 'cache' } : best);
        setStatus('offline');
      }
    } finally {
      busy.current = false;
      setLastCheck(new Date().toISOString());
    }
  }, []);

  useEffect(() => {
    const cached = readCache();
    if (age(cached) > REFRESH_MS) void refresh();
    else {
      setStatus('ok');
      setLastCheck(cached!.fetchedAt);
    }
    const id = window.setInterval(() => void refresh(), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  return <Ctx.Provider value={{ snapshot, status, lastCheck, refresh: () => void refresh() }}>{children}</Ctx.Provider>;
}

export function useSpaceWeather(): SwStore {
  const v = useContext(Ctx);
  if (!v) throw new Error('SpaceWeatherProvider missing');
  return v;
}
