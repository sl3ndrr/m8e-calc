import { expect, it, vi } from 'vitest';
import { exportSettings, importSettings } from '../app/fileTransfer';
import {
  defaultSettings,
  normalizeSettings,
  SETTINGS_KEY,
  SETTINGS_VERSION,
} from './settings';
import { createSettingsStore } from './settingsStore';

it('applies a delayed validated import as one persisted settings update', async () => {
  const saved = new Map<string, string>();
  const storage = {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: vi.fn((key: string, value: string) => {
      saved.set(key, value);
    }),
    removeItem: (key: string) => {
      saved.delete(key);
    },
  };
  const store = createSettingsStore(storage);
  const action = store.getState().applyImportedSettings;
  const expected = {
    ...defaultSettings(),
    themeMode: 'dark' as const,
    language: 'en' as const,
    grouping: false,
    historyLimit: 17,
    uiSize: 125,
  };
  let finishRead: (content: string) => void = () => {
    throw new Error('Reader not initialized');
  };
  const reading = new Promise<string>((resolve) => {
    finishRead = resolve;
  });
  const importing = reading.then((content) => action(importSettings(content)));
  store.getState().updateSettings({ uiSize: 90 });
  const observed: ReturnType<typeof normalizeSettings>[] = [];
  const unsubscribe = store.subscribe((state) => {
    observed.push(normalizeSettings(state));
  });
  storage.setItem.mockClear();
  finishRead(exportSettings(expected));
  await importing;
  unsubscribe();
  expect(normalizeSettings(store.getState())).toEqual(expected);
  expect(observed).toEqual([expected]);
  expect(storage.setItem).toHaveBeenCalledTimes(1);
  expect(JSON.parse(saved.get(SETTINGS_KEY) ?? 'null')).toEqual({
    version: SETTINGS_VERSION,
    state: expected,
  });
  expect(normalizeSettings(createSettingsStore(storage).getState())).toEqual(
    expected,
  );
});

it('rewrites version 4 without retired fields and preserves other preferences', () => {
  let saved: string | null = JSON.stringify({
    version: 4,
    state: { ...defaultSettings(), grouping: false, onlineRates: true },
  });
  const storage = {
    getItem: () => saved,
    setItem: (_key: string, value: string) => {
      saved = value;
    },
    removeItem: () => {
      saved = null;
    },
  };
  const store = createSettingsStore(storage);
  expect(normalizeSettings(store.getState())).toEqual({
    ...defaultSettings(),
    grouping: false,
  });
  expect(JSON.parse(saved ?? 'null')).toEqual({
    version: SETTINGS_VERSION,
    state: { ...defaultSettings(), grouping: false },
  });
  expect(store.getState()).not.toHaveProperty('onlineRates');
});
