import { defineConfig, devices } from '@playwright/test';
import config from './playwright.config';
export default defineConfig({
  ...config,
  workers: 1,
  retries: 0,
  projects: [
    {
      name: 'chromium',
      testMatch: '**/grid-raster.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      testMatch: '**/grid-raster.spec.ts',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testMatch: '**/grid-raster.spec.ts',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
