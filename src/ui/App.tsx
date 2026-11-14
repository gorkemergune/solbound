import { PREP_PHASES } from '../engine';
import { Toast } from './components/common';
import { useStore } from './store';
import { DebriefScreen } from './screens/Debrief';
import { LandingScreen, ResearchModal, SurfaceScreen, TransitScreen } from './screens/Mission';
import { PrepShell } from './screens/Prep';
import { TitleScreen } from './screens/Title';

export function App() {
  const { run, pending } = useStore();
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
      {screen}
      <ResearchModal />
      <Toast />
    </>
  );
}
