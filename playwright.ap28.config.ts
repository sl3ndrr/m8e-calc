import { defineConfig, devices } from '@playwright/test';
import config from './playwright.config';
export default defineConfig({
  ...config,
  workers: 1,
  retries: 0,
  projects: [
    { name: 'default', testMatch: '**/ap28-diagnostic.spec.ts', use: { ...devices['Desktop Chrome'], locale: 'de-DE', trace: 'off', serviceWorkers: 'block' } },
    { name: 'software', testMatch: '**/ap28-diagnostic.spec.ts', use: { ...devices['Desktop Chrome'], locale: 'de-DE', trace: 'off', serviceWorkers: 'block', launchOptions: { args: ['--disable-gpu'] } } },
  ],
});
