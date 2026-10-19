import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  retries: 0,
  use: { locale: 'de-DE', trace: 'on' },
  projects: (['chromium', 'firefox', 'webkit'] as const).flatMap((browserName) =>
    (['production', 'gallery'] as const).map((target) => ({
      name: `${browserName}-${target}`,
      testMatch: target === 'production' ? '**/ap36-motion.spec.ts' : '**/ap36-gallery.spec.ts',
      use: {
        ...devices[browserName === 'chromium' ? 'Desktop Chrome' : browserName === 'firefox' ? 'Desktop Firefox' : 'Desktop Safari'],
        browserName,
        baseURL: target === 'production' ? 'http://127.0.0.1:4173' : 'http://127.0.0.1:4174',
      },
    })),
  ),
  webServer: [
    { command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort', url: 'http://127.0.0.1:4173/m8e-calc/', reuseExistingServer: false },
    { command: 'npm run preview:gallery -- --host 127.0.0.1 --port 4174 --strictPort', url: 'http://127.0.0.1:4174/m8e-calc/', reuseExistingServer: false },
  ],
});
