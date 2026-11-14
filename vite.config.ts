import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // NASA_API_KEY from .env is read into the client bundle (a free api.nasa.gov key; see docs).
  envPrefix: ['VITE_', 'NASA_'],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
} as never);
