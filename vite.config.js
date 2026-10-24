// @ts-check
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The app is served from https://<user>.github.io/integration-launchpad/,
// so every built asset URL needs that prefix.
export default defineConfig({
  base: '/integration-launchpad/',
  plugins: [react()],
  test: {
    include: ['tests/unit/**/*.test.js', 'tests/integration/**/*.test.js'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.js'],
      reporter: ['text', 'html'],
      thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 },
    },
  },
});
