// Keeps a NASA DONKI snapshot fresh while the app is open: cached in localStorage, refreshed when older
// than REFRESH_MS (and every REFRESH_MS while open), with the bundled snapshot as the offline fallback.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { SpaceWeatherSnapshot } from '../engine/spaceweather';
import { fetchSnapshot } from './donki';
import fallback from './donki-fallback.json';

const CACHE_KEY = 'solbound.donki.v1';
export const REFRESH_MS = 30 * 60 * 1000;
const KEY = (import.meta.env.NASA_API_KEY as string | undefined)?.trim() || 'DEMO_KEY';

type Status = 'idle' | 'loading' | 'ok' | 'offline';
type SwStore = { snapshot: SpaceWeatherSnapshot; status: Status; lastCheck: string | null; refresh: () => void };

const Ctx = createContext<SwStore | null>(null);

function readCache(): SpaceWeatherSnapshot | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as SpaceWeatherSnapshot;
    return Array.isArray(s.records) && typeof s.rangeStart === 'string' ? { ...s, source: 'cache' } : null;
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

export function SpaceWeatherProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<SpaceWeatherSnapshot>(() => readCache() ?? (fallback as SpaceWeatherSnapshot));
  const [status, setStatus] = useState<Status>('idle');
  const [lastCheck, setLastCheck] = useState<string | null>(null);
  const busy = useRef(false);

  const refresh = useCallback(() => {
    if (busy.current) return;
    busy.current = true;
    setStatus('loading');
    fetchSnapshot(KEY, Date.now())
      .then((s) => {
        writeCache(s);
        setSnapshot(s);
        setStatus('ok');
      })
      .catch(() => setStatus('offline'))
      .finally(() => {
        busy.current = false;
        setLastCheck(new Date().toISOString());
      });
  }, []);

  useEffect(() => {
    const cached = readCache();
    const age = cached ? Date.now() - Date.parse(cached.fetchedAt) : Infinity;
    if (age > REFRESH_MS) refresh();
    else {
      setStatus('ok');
      setLastCheck(cached!.fetchedAt);
    }
    const id = window.setInterval(refresh, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  return <Ctx.Provider value={{ snapshot, status, lastCheck, refresh }}>{children}</Ctx.Provider>;
}

export function useSpaceWeather(): SwStore {
  const v = useContext(Ctx);
  if (!v) throw new Error('SpaceWeatherProvider missing');
  return v;
}
