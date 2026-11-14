import { useEffect, useRef, useState } from 'react';
import { MINUTES_PER_DAY } from '../engine';
import { useStore } from './store';

/** 1× speed: 60 active real seconds = 1 mission day. */
export const REAL_MS_PER_DAY = 60_000;
const MAX_FRAME_MS = 250; // a throttled timer can never dump a big jump into the sim

export type PauseReason = null | 'decision' | 'research' | 'manual' | 'hidden';

/**
 * Browser clock adapter: converts visible, active wall time into mission minutes and sends them to
 * the engine as `advance` commands. The engine never reads a clock itself.
 */
export function useMissionClock(): PauseReason {
  const { run, dispatch, researchOpen, pending } = useStore();
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden);
  const last = useRef<number | null>(null);

  useEffect(() => {
    const onVis = () => {
      setHidden(document.hidden);
      last.current = null; // time while hidden is discarded
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const m = run?.mission;
  const surface = run?.phase === 'surface';
  let reason: PauseReason = null;
  if (surface && m) {
    if (m.activeEvent || pending) reason = 'decision';
    else if (researchOpen) reason = 'research';
    else if (run!.manualPause) reason = 'manual';
    else if (hidden) reason = 'hidden';
  }
  const running = surface && !!m && reason === null && !m.ended;
  const speed = run?.speed ?? 1;

  useEffect(() => {
    if (!running) {
      last.current = null;
      return;
    }
    const id = window.setInterval(() => {
      const now = performance.now();
      const prev = last.current;
      last.current = now;
      if (prev === null) return;
      const dt = Math.min(MAX_FRAME_MS, now - prev);
      dispatch({ type: 'advance', minutes: (dt / REAL_MS_PER_DAY) * MINUTES_PER_DAY * speed });
    }, 100);
    return () => window.clearInterval(id);
  }, [running, speed, dispatch]);

  return reason;
}
