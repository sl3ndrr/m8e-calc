module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
      startServerReadyPattern: 'Local',
      url: ['simple', 'scientific', 'convert', 'graph'].map(mode => `http://127.0.0.1:4173/m8e-calc/#/${mode}`),
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        formFactor: 'desktop',
        screenEmulation: { mobile: false, width: 1920, height: 1080, deviceScaleFactor: 1, disabled: false },
        chromeFlags: '--no-sandbox --disable-dev-shm-usage',
      },
    },
    assert: { assertions: {
      'categories:performance': ['error', { minScore: 0.95 }],
      'categories:accessibility': ['error', { minScore: 0.95 }],
      'categories:best-practices': ['error', { minScore: 0.95 }],
      'cumulative-layout-shift': ['error', { maxNumericValue: 0 }],
    } },
    upload: { target: 'filesystem', outputDir: 'test-results/lighthouse' },
  },
};
