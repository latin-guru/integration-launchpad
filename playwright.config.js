// @ts-check
import { defineConfig, devices } from '@playwright/test';

// Runs the e2e test against the production build served by `vite preview`,
// so it checks the same files GitHub Pages will serve.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173/integration-launchpad/',
    viewport: { width: 1360, height: 1100 },
    acceptDownloads: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1360, height: 1100 } },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173/integration-launchpad/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
