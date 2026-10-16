import { defineConfig, devices } from '@playwright/test';
import { gallerySpecs } from './playwright.config';

export default defineConfig({
  testDir: './e2e',
  testMatch: gallerySpecs,
  use: {
    ...devices['Desktop Chrome'],
    locale: 'de-DE',
    baseURL: 'http://127.0.0.1:4174',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'gallery' }],
  webServer: {
    command:
      process.env.GALLERY_DEV === '1'
        ? 'npm run dev -- --host 127.0.0.1 --port 4174 --strictPort'
        : 'npm run preview:gallery -- --host 127.0.0.1 --port 4174 --strictPort',
    url: 'http://127.0.0.1:4174/m8e-calc/',
    reuseExistingServer: false,
  },
});
