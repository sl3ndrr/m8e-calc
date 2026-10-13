import { expect, it } from 'vitest';
import { bootstrapTheme } from './themeBootstrap';
import { buildScheme } from '../styles/buildScheme';
import {
  defaultSettings,
  themeFingerprint,
  THEME_CACHE_KEY,
  SETTINGS_KEY,
} from '../shared/settings';
it('validates the entire cached palette and handles legacy settings before startup', () => {
  const light = buildScheme('#6750a4');
  const dark = buildScheme('#6750a4', 'tonalSpot', true);
  const settings = { ...defaultSettings(), themeMode: 'dark' as const };
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({ version: 0, state: { theme: 'dark' } }),
  );
  localStorage.setItem(
    THEME_CACHE_KEY,
    JSON.stringify({
      version: 1,
      fingerprint: themeFingerprint(settings),
      light,
      dark,
    }),
  );
  bootstrapTheme({ light, dark });
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(
    document.documentElement.style.getPropertyValue('--md-sys-color-primary'),
  ).toBe(dark['--md-sys-color-primary']);
  localStorage.setItem(
    THEME_CACHE_KEY,
    JSON.stringify({
      version: 1,
      fingerprint: themeFingerprint(settings),
      light,
      dark: { '--md-sys-color-primary': '#ff0000' },
    }),
  );
  bootstrapTheme({ light, dark });
  expect(
    document.documentElement.style.getPropertyValue('--md-sys-color-primary'),
  ).toBe(dark['--md-sys-color-primary']);
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({ version: 999, state: { themeMode: 'dark' } }),
  );
  bootstrapTheme({ light, dark });
  expect(document.documentElement.dataset.theme).toBe('light');
  localStorage.clear();
});
