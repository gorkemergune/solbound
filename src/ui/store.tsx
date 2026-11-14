import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { applyCommand, createRun, deserialize, serialize, type Command, type Locale, type Mode, type RunState } from '../engine';
import { initialLocale, isLocaleLoaded, loadLocale, translate, type Params } from '../i18n';

const SAVE_KEY = 'solbound.save.v1';
const LOCALE_KEY = 'solbound.locale';

export function newSeed(): number {
  // Only place where non-deterministic randomness is used: picking a fresh seed for a new run.
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0];
}

type SaveNotice = null | 'corrupt' | 'version';

export type Delta = { key: string; value: number; unit: string; params?: Record<string, string | number> };
export type PendingResult = {
  screenPhase: RunState['phase'];
  eventId: string;
  optionId: string;
  success: boolean;
  probability: number | null;
  task: boolean;
  names: string;
  subjectName?: string;
  deltas: Delta[];
  echoKeys: { key: string; params: Record<string, string> }[];
};

type Store = {
  run: RunState | null;
  locale: Locale | null;
  storageOk: boolean;
  saveNotice: SaveNotice;
  savedRun: RunState | null;
  error: string | null;
  researchOpen: string | null;
  pending: PendingResult | null;
  t: (key: string, params?: Params) => string;
  setLocale: (l: Locale) => void;
  dispatch: (cmd: Command) => { before: RunState | null; after: RunState | null; error?: string };
  startNew: (mode?: Mode, seed?: number) => void;
  resume: () => void;
  quitToTitle: () => void;
  openResearch: (id: string | null) => void;
  setPending: (p: PendingResult | null) => void;
  clearError: () => void;
};

const Ctx = createContext<Store | null>(null);

function safeGet(key: string): { ok: boolean; value: string | null } {
  try {
    return { ok: true, value: window.localStorage.getItem(key) };
  } catch {
    return { ok: false, value: null };
  }
}

function safeSet(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function initialSave(): { run: RunState | null; notice: SaveNotice; ok: boolean } {
  const got = safeGet(SAVE_KEY);
  if (!got.ok) return { run: null, notice: null, ok: false };
  const res = deserialize(got.value);
  if (res.ok) return { run: res.run, notice: null, ok: true };
  return { run: null, notice: res.reason === 'empty' ? null : res.reason, ok: true };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const init = useMemo(initialSave, []);
  const [savedRun, setSavedRun] = useState<RunState | null>(init.run);
  const [run, setRun] = useState<RunState | null>(null);
  // first visit: follow the browser language; the switch stays visible at the top of every screen
  const [locale, setLocaleState] = useState<Locale | null>(() => initialLocale());
  const setLocaleRef = useRef<(l: Locale) => void>(() => undefined);
  const [storageOk, setStorageOk] = useState(init.ok);
  const [error, setError] = useState<string | null>(null);
  const [researchOpen, setResearchOpen] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingResult | null>(null);
  const runRef = useRef<RunState | null>(null);
  runRef.current = run;

  const loc: Locale = locale ?? 'en';
  const t = useCallback((key: string, params?: Params) => translate(loc, key, params), [loc]);

  useEffect(() => {
    document.documentElement.lang = loc;
  }, [loc]);

  // Autosave, throttled: at most every 3 s while the clock runs (the old debounce never fired at 10 ticks/s),
  // plus a flush when the page is hidden. Language is stored separately so switching it never touches the run.
  const lastSave = useRef(0);
  useEffect(() => {
    if (!run) return;
    const wait = Math.max(0, 3000 - (Date.now() - lastSave.current));
    const id = window.setTimeout(() => {
      lastSave.current = Date.now();
      const ok = safeSet(SAVE_KEY, serialize(runRef.current ?? run));
      if (!ok) setStorageOk(false);
    }, wait);
    return () => window.clearTimeout(id);
  }, [run]);

  useEffect(() => {
    const flush = () => {
      if (runRef.current) safeSet(SAVE_KEY, serialize(runRef.current));
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', flush);
    };
  }, []);

  const setLocale = useCallback((l: Locale) => {
    if (!isLocaleLoaded(l)) {
      // fetch the dictionary first, then switch (no flash of keys)
      void loadLocale(l).then(() => setLocaleRef.current(l));
      return;
    }
    setLocaleState(l);
    safeSet(LOCALE_KEY, l);
    // during preparation, generated names follow the language (Turkish crews in Turkish games)
    const r = runRef.current;
    if (r && !r.launched) {
      const res = applyCommand(r, { type: 'localizeNames', locale: l });
      if (!res.error) {
        runRef.current = res.state;
        setRun(res.state);
      }
    }
  }, []);
  setLocaleRef.current = setLocale;

  const dispatch = useCallback((cmd: Command) => {
    const before = runRef.current;
    if (!before) return { before, after: null, error: 'err.phase' };
    const res = applyCommand(before, cmd);
    if (res.error) {
      if (cmd.type !== 'advance') setError(res.error);
      return { before, after: before, error: res.error };
    }
    runRef.current = res.state;
    setRun(res.state);
    return { before, after: res.state };
  }, []);

  const startNew = useCallback(
    (mode: Mode = 'standard', seed?: number) => {
      const r = createRun(seed ?? newSeed(), loc, mode);
      runRef.current = r;
      setRun(r);
      setSavedRun(null);
      setResearchOpen(null);
      setPending(null);
    },
    [loc],
  );

  const resume = useCallback(() => {
    if (!savedRun) return;
    runRef.current = savedRun;
    setRun(savedRun);
  }, [savedRun]);

  const quitToTitle = useCallback(() => {
    if (runRef.current) {
      safeSet(SAVE_KEY, serialize(runRef.current));
      setSavedRun(runRef.current);
    }
    runRef.current = null;
    setRun(null);
    setResearchOpen(null);
    setPending(null);
  }, []);

  const value: Store = {
    run,
    locale,
    storageOk,
    saveNotice: init.notice,
    savedRun,
    error,
    researchOpen,
    pending,
    t,
    setLocale,
    dispatch,
    startNew,
    resume,
    quitToTitle,
    openResearch: setResearchOpen,
    setPending,
    clearError: () => setError(null),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
}

export function useLocale(): Locale {
  return useStore().locale ?? 'en';
}
