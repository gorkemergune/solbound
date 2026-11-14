import { lazy, Suspense, useEffect } from 'react';
import { PREP_PHASES } from '../engine';
import { Toast } from './components/common';
import { useStore } from './store';
import { TitleScreen } from './screens/Title';

// Screens are split into separate chunks: the title page loads first, the rest on demand.
const PrepShell = lazy(() => import('./screens/Prep').then((m) => ({ default: m.PrepShell })));
const TransitScreen = lazy(() => import('./screens/Mission').then((m) => ({ default: m.TransitScreen })));
const LandingScreen = lazy(() => import('./screens/Mission').then((m) => ({ default: m.LandingScreen })));
const SurfaceScreen = lazy(() => import('./screens/Mission').then((m) => ({ default: m.SurfaceScreen })));
const ResearchModal = lazy(() => import('./screens/Mission').then((m) => ({ default: m.ResearchModal })));
const DebriefScreen = lazy(() => import('./screens/Debrief').then((m) => ({ default: m.DebriefScreen })));

export function App() {
  const { run, pending, researchOpen } = useStore();
  // after the first paint, fetch the other screens in the background so later transitions are instant
  useEffect(() => {
    const id = window.setTimeout(() => {
      void import('./screens/Prep');
      void import('./screens/Mission');
      void import('./screens/Debrief');
    }, 1500);
    return () => window.clearTimeout(id);
  }, []);
  let screen;
  if (!run) screen = <TitleScreen />;
  else {
    // A pending result is shown on the screen where the decision was made, before moving on.
    const phase = pending?.screenPhase ?? run.phase;
    if (PREP_PHASES.includes(phase)) screen = <PrepShell />;
    else if (phase === 'outbound') screen = <TransitScreen direction="out" />;
    else if (phase === 'landing') screen = <LandingScreen />;
    else if (phase === 'surface' || phase === 'returnPrep') screen = <SurfaceScreen />;
    else if (phase === 'returnFlight') screen = <TransitScreen direction="back" />;
    else screen = <DebriefScreen />;
  }
  return (
    <>
      <a className="skip-link" href="#main">
        Skip / Geç
      </a>
      <Suspense fallback={<div className="screen-loading" aria-busy="true" />}>{screen}</Suspense>
      {/* own boundary: loading the modal chunk must never blank the screen behind it */}
      <Suspense fallback={null}>{researchOpen && <ResearchModal />}</Suspense>
      <Toast />
    </>
  );
}
