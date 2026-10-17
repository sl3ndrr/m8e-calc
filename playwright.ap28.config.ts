import { defineConfig, devices } from '@playwright/test';
import config from './playwright.config';
export default defineConfig({
  ...config,
  workers: 1,
  retries: 0,
  projects: [
    {
      name: 'ap28-diagnostic',
      testMatch: '**/ap28-diagnostic.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        locale: 'de-DE',
        trace: 'off',
        serviceWorkers: 'block',
      },
    },
  ],
});
