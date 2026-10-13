import { expect, it } from 'vitest';
import { defaultSettings } from '../shared/settings';
import { exportSettings, importSettings } from './fileTransfer';
it('roundtrips all settings and migrates supported previous exports', () => {
  expect(importSettings(exportSettings(defaultSettings()))).toEqual(
    defaultSettings(),
  );
  expect(
    importSettings(
      JSON.stringify({ version: 1, settings: { themeMode: 'dark' } }),
    ).themeMode,
  ).toBe('dark');
});
it('rejects corrupt, future, unknown and invalid fields', () => {
  for (const data of [
    '{}',
    '{broken',
    JSON.stringify({ version: 99, settings: {} }),
    JSON.stringify({ version: 2, settings: { historyLimit: 1000 } }),
    JSON.stringify({ version: 2, settings: { language: 'fr' } }),
    JSON.stringify({ version: 2, settings: {} }),
  ])
    expect(() => importSettings(data)).toThrow();
});
