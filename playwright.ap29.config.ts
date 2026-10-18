import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  globalSetup: './scripts/ap29-builds.mjs',
  workers: 2,
  outputDir: 'test-results/ap29/browser',
  projects: (['chromium', 'firefox', 'webkit'] as const).map((name) => ({
    name,
    testMatch: [
      '**/build-provenance.spec.ts',
      '**/pwa-update.spec.ts',
      '**/comfort.spec.ts',
    ],
    use: {
      ...devices[name === 'chromium' ? 'Desktop Chrome' : name === 'firefox' ? 'Desktop Firefox' : 'Desktop Safari'],
      locale: 'de-DE',
    },
  })),
});
