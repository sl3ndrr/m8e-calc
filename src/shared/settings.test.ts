import { describe, expect, it } from 'vitest';
import {
  defaultSettings,
  normalizeSettings,
  migrateSettings,
  resolveDark,
  nextThemeMode,
} from './settings';
import { createSettingsStore, safeStorage } from './settingsStore';
import { SETTINGS_KEY } from './settings';
function memoryStorage(initial: string | null = null) {
  let value = initial;
  return {
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next;
    },
    removeItem: () => {
      value = null;
    },
  };
}
describe('settings', () => {
  it('uses system by default and respects the reduced-motion preference', () => {
    expect(defaultSettings().themeMode).toBe('system');
    expect(defaultSettings(true).motionLevel).toBe('reduced');
    expect(
      normalizeSettings({ accent: '#ABCDEF', contrast: 'high' }),
    ).toMatchObject({ accent: '#abcdef', contrast: 'high' });
    expect(
      normalizeSettings(
        { accent: '#fff', motionLevel: 'invalid', themeMode: 'invalid' },
        true,
      ),
    ).toEqual(defaultSettings(true));
    expect(normalizeSettings(null)).toEqual(defaultSettings());
  });
  it('migrates v0 and discards unknown future versions', () => {
    expect(
      migrateSettings({ theme: 'dark', seed: '#008ba9' }, 0),
    ).toMatchObject({ themeMode: 'dark', accent: '#008ba9' });
    expect(migrateSettings({ themeMode: 'dark' }, 999)).toEqual(
      defaultSettings(),
    );
  });
  it('persists only settings, validates rehydration and survives corrupt JSON', () => {
    const storage = memoryStorage();
    const first = createSettingsStore(storage);
    first.getState().updateSettings({
      themeMode: 'dark',
      accent: '#e2675a',
      motionLevel: 'off',
    });
    const payload = JSON.parse(storage.getItem() ?? '{}');
    expect(payload.version).toBe(2);
    expect(payload.state.updateSettings).toBeUndefined();
    expect(createSettingsStore(storage).getState()).toMatchObject(
      payload.state,
    );
    expect(
      createSettingsStore(memoryStorage('{broken')).getState(),
    ).toMatchObject(defaultSettings());
    expect(
      createSettingsStore(
        memoryStorage(
          JSON.stringify({
            version: 1,
            state: { themeMode: 'wrong', accent: 'bad' },
          }),
        ),
      ).getState(),
    ).toMatchObject(defaultSettings());
    expect(
      createSettingsStore(
        memoryStorage(JSON.stringify({ version: 0, state: { theme: 'dark' } })),
      ).getState().themeMode,
    ).toBe('dark');
    first.getState().resetSettings();
    expect(first.getState()).toMatchObject(defaultSettings());
  });
  it('survives quota and denied-storage failures while retaining in-memory settings', () => {
    const denied = safeStorage(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    expect(denied.getItem(SETTINGS_KEY)).toBeNull();
    expect(() => denied.removeItem(SETTINGS_KEY)).not.toThrow();
    const store = createSettingsStore({
      getItem: () => null,
      setItem: () => {
        throw new DOMException('full', 'QuotaExceededError');
      },
      removeItem: () => {},
    });
    expect(() =>
      store.getState().updateSettings({ themeMode: 'dark' }),
    ).not.toThrow();
    expect(store.getState().themeMode).toBe('dark');
  });
  it('resolves system appearance and wraps keyboard navigation', () => {
    expect(resolveDark('light', true)).toBe(false);
    expect(resolveDark('dark', false)).toBe(true);
    expect(resolveDark('system', true)).toBe(true);
    expect(resolveDark('system', false)).toBe(false);
    expect(nextThemeMode('dark', 'ArrowRight')).toBe('light');
    expect(nextThemeMode('light', 'ArrowLeft')).toBe('dark');
    expect(nextThemeMode('system', 'ArrowDown')).toBe('dark');
    expect(nextThemeMode('system', 'ArrowUp')).toBe('light');
    expect(nextThemeMode('system', 'Home')).toBe('light');
    expect(nextThemeMode('light', 'End')).toBe('dark');
  });
});

it('migrates v1 appearance without losing it and validates v2 preferences', () => {
  expect(
    migrateSettings(
      { themeMode: 'dark', accent: '#008ba9', motionLevel: 'off' },
      1,
    ),
  ).toMatchObject({
    themeMode: 'dark',
    accent: '#008ba9',
    motionLevel: 'off',
    language: 'auto',
    historyLimit: 500,
  });
  expect(
    normalizeSettings({
      language: 'en',
      decimalSeparator: 'point',
      grouping: false,
      historyLimit: 10,
    }),
  ).toMatchObject({
    language: 'en',
    decimalSeparator: 'point',
    grouping: false,
    historyLimit: 10,
  });
});
