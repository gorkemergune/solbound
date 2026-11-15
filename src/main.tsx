import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource-variable/space-grotesk';
import './ui/styles.css';
import { App } from './ui/App';
import { StoreProvider } from './ui/store';
import { SpaceWeatherProvider } from './live/useSpaceWeather';
import { initialLocale, loadLocale } from './i18n';
import { installSoundUnlock } from './audio/sound';

// sound starts on the first click or key press (browser rule)
installSoundUnlock();

// load the starting language before the first paint (Turkish is a lazy chunk)
await loadLocale(initialLocale()).catch(() => undefined);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SpaceWeatherProvider>
      <StoreProvider>
        <App />
      </StoreProvider>
    </SpaceWeatherProvider>
  </StrictMode>,
);
