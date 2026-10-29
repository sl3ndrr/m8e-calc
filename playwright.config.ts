import { defineConfig, devices } from '@playwright/test';

export const gallerySpecs = [
  '**/accent-picker.spec.ts',
  '**/components.spec.ts',
  '**/theming.spec.ts',
  '**/controls-polish.spec.ts',
  '**/controls-native-zoom.spec.ts',
];

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
      testIgnore: [
        ...gallerySpecs,
        '**/ap36-*.spec.ts',
        '**/build-provenance.spec.ts',
        '**/ap28-diagnostic.spec.ts',
        '**/graph-performance.spec.ts',
        '**/qa-visual.spec.ts',
        '**/qa-performance.spec.ts',
      ],
      use: { locale: 'de-DE', ...devices['Desktop Chrome'] },
    },
    ...(['firefox', 'webkit'] as const).map((name) => ({
      name,
      testMatch: [
        '**/qa-hardening.spec.ts',
        '**/label-in-name.spec.ts',
        '**/comfort.spec.ts',
        '**/settings-actions.spec.ts',
        '**/ap18-ui.spec.ts',
        '**/calculator-rendering.spec.ts',
        '**/simple-calculator.spec.ts',
        '**/scientific.spec.ts',
        '**/scientific-worker.spec.ts',
        '**/convert.spec.ts',
        '**/currency.spec.ts',
        '**/graph.spec.ts',
        '**/grid-raster.spec.ts',
        '**/graph-implicit.spec.ts',
        '**/graph-values.spec.ts',
        '**/graph-parameters.spec.ts',
        '**/product-acceptance.spec.ts',
        '**/pwa-update.spec.ts',
        '**/startup-budget.spec.ts',
      ],
      use: {
        ...devices[name === 'firefox' ? 'Desktop Firefox' : 'Desktop Safari'],
        locale: 'de-DE',
      },
    })),
    {
      name: 'qa-visual',
      testMatch: '**/qa-visual.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'qa-performance',
      testMatch: '**/qa-performance.spec.ts',
      workers: 1,
      use: { ...devices['Desktop Chrome'], trace: 'off' },
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
    reuseExistingServer: false,
  },
});
