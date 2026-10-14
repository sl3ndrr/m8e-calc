import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    locale: 'de-DE',
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: '**/graph-performance.spec.ts',
      use: { locale: 'de-DE', ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-graph-performance',
      testMatch: '**/graph-performance.spec.ts',
      dependencies: ['chromium'],
      workers: 1,
      use: { locale: 'de-DE', ...devices['Desktop Chrome'], trace: 'off' },
    },
  ],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/m8e-calc/',
    reuseExistingServer: !process.env.CI,
  },
});
