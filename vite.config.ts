import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    // full 30-day playthroughs can exceed the 5 s default on a busy machine
    testTimeout: 60_000,
  },
} as never);
