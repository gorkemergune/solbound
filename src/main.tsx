import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource-variable/space-grotesk';
import './ui/styles.css';
import { App } from './ui/App';
import { StoreProvider } from './ui/store';
import { SpaceWeatherProvider } from './live/useSpaceWeather';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SpaceWeatherProvider>
      <StoreProvider>
        <App />
      </StoreProvider>
    </SpaceWeatherProvider>
  </StrictMode>,
);
