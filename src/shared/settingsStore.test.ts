import { expect, it, vi } from 'vitest';
import { exportSettings, importSettings } from '../app/fileTransfer';
import { defaultSettings, normalizeSettings, SETTINGS_KEY } from './settings';
import { createSettingsStore } from './settingsStore';

it.each(
  [true, false].flatMap((initial) =>
    [true, false].flatMap((current) =>
      [true, false].map((inFile) => ({ initial, current, inFile })),
    ),
  ),
)(
  'imports atomically with consent $initial → $current (file: $inFile)',
  async ({ initial, current, inFile }) => {
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
    store.getState().updateSettings({ onlineRates: initial });
    const startSnapshot = store.getState();
    let finishRead: (content: string) => void = () => {
      throw new Error('Reader not initialized');
    };
    const reading = new Promise<string>((resolve) => {
      finishRead = resolve;
    });
    const importing = reading.then((content) =>
      startSnapshot.applyImportedSettings(importSettings(content)),
    );
    store.getState().updateSettings({ onlineRates: current });
    const imported = {
      ...defaultSettings(),
      themeMode: 'dark' as const,
      language: 'en' as const,
      grouping: false,
      historyLimit: 17,
      uiSize: 125,
      onlineRates: inFile,
    };
    const expected = { ...imported, onlineRates: current };
    const observed: ReturnType<typeof normalizeSettings>[] = [];
    const unsubscribe = store.subscribe((state) => {
      observed.push(normalizeSettings(state));
    });
    storage.setItem.mockClear();
    finishRead(exportSettings(imported));
    await importing;
    unsubscribe();

    expect(normalizeSettings(store.getState())).toEqual(expected);
    expect(observed).toEqual([expected]);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(JSON.parse(saved.get(SETTINGS_KEY) ?? 'null')).toEqual({
      version: 4,
      state: expected,
    });
    expect(normalizeSettings(createSettingsStore(storage).getState())).toEqual(
      expected,
    );
  },
);

it('retains a revocation made after a completed import on reload', () => {
  let saved: string | null = null;
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
  store.getState().updateSettings({ onlineRates: true });
  store
    .getState()
    .applyImportedSettings(
      importSettings(exportSettings({ ...defaultSettings(), grouping: false })),
    );
  expect(store.getState()).toMatchObject({
    grouping: false,
    onlineRates: true,
  });
  store.getState().updateSettings({ onlineRates: false });
  expect(createSettingsStore(storage).getState()).toMatchObject({
    grouping: false,
    onlineRates: false,
  });
});
