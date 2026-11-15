import { useEffect, useRef } from 'react';
import { PREP_PHASES } from '../engine';
import { playSfx, setTrack, type TrackId } from '../audio/sound';
import { useStore } from './store';

/** Chooses the music for the current screen and plays effects on launch, landing, events and results. Renders nothing. */
export function AudioDirector() {
  const { run, pending } = useStore();
  const phase = run?.phase ?? null;
  const dest = run?.destination ?? null;
  const m = run?.mission ?? null;
  const ended = m?.ended?.reason ?? null;

  // music per screen
  let track: TrackId | null = 'title';
  if (phase && !PREP_PHASES.includes(phase)) {
    if (phase === 'landing' || phase === 'surface' || phase === 'returnPrep') track = dest === 'moon' ? 'moon' : 'mars';
    else if (phase === 'outbound' || phase === 'returnFlight') track = 'title';
    else track = ended === 'playerLost' || ended === 'allLost' ? 'title' : 'home';
  }
  useEffect(() => setTrack(track), [track]);

  // effects on phase changes
  const lastPhase = useRef(phase);
  useEffect(() => {
    const prev = lastPhase.current;
    lastPhase.current = phase;
    if (!prev || prev === phase) return;
    if (phase === 'outbound') playSfx('launch');
    else if (phase === 'landing') playSfx('land');
    else if (phase === 'returnFlight') playSfx('depart');
  }, [phase]);

  // a new decision card: emergencies get an alarm, everything else a soft chime
  const active = m?.activeEvent ?? null;
  const lastEvent = useRef<string | null>(null);
  useEffect(() => {
    const id = active?.instanceId ?? null;
    if (id && id !== lastEvent.current) playSfx(active!.eventId.startsWith('EMG-') || active!.eventId === 'CREW-CRISIS' ? 'alert' : 'event');
    lastEvent.current = id;
  }, [active]);

  // a decision result
  const lastPending = useRef<typeof pending>(null);
  useEffect(() => {
    if (pending && pending !== lastPending.current && pending.probability !== null) playSfx(pending.success ? 'success' : 'fail');
    lastPending.current = pending;
  }, [pending]);

  // a new countdown (forecast) appears
  const minute = m?.minute ?? 0;
  const announced = m ? m.big.filter((b) => b.announceAt <= minute && !b.closed).length : 0;
  const lastAnnounced = useRef(announced);
  useEffect(() => {
    if (announced > lastAnnounced.current) playSfx('countdown');
    lastAnnounced.current = announced;
  }, [announced]);

  return null;
}
