import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import {
  defaultSettings,
  normalizeSettings,
  SETTINGS_KEY,
  THEME_CACHE_KEY,
} from '../shared/settings';
import { createSettingsStore, useSettingsStore } from '../shared/settingsStore';
import { APP_KEY, useAppStore } from '../shared/store';
import { useHistoryStore } from '../shared/historyStore';
import { emptyHistory, HISTORY_KEY, normalizeHistory } from '../shared/history';
import { createEnvironment, execute } from '../engine';
import {
  SCIENTIFIC_STORAGE_KEY,
  useScientificStore,
} from '../features/scientific/scientificStore';
import {
  normalizePreferences,
  useConvertStore,
} from '../features/convert/preferences';
import {
  parseRateCache,
  RATE_ATTEMPT_KEY,
  RATE_CACHE_KEY,
} from '../features/convert/currency/rates';
import { currencyCodes } from '../units/currency';
import { t } from '../shared/i18n/extended';
import { snackbarQueue } from '../ui/snackbarQueue';
import { exportSettings } from './fileTransfer';
import { SettingsDialog } from './SettingsDialog';

afterEach(() => {
  snackbarQueue.clear();
  useSettingsStore.getState().resetSettings();
  useAppStore.getState().setLocale('de');
  useAppStore.getState().resetApp();
  useHistoryStore.getState().resetHistory();
  useScientificStore.getState().commit(createEnvironment());
  useConvertStore.getState().update(normalizePreferences(null));
  for (const key of [
    THEME_CACHE_KEY,
    RATE_CACHE_KEY,
    RATE_ATTEMPT_KEY,
    'm8e-calc.future',
  ])
    localStorage.removeItem(key);
  Object.defineProperty(navigator, 'language', {
    configurable: true,
    value: 'de-DE',
  });
  vi.restoreAllMocks();
});

function setup(locale: 'de' | 'en', onlineRates: boolean) {
  useAppStore.getState().setLocale(locale);
  useSettingsStore
    .getState()
    .updateSettings({ onlineRates, motionLevel: 'off' });
  const notice = vi.spyOn(snackbarQueue, 'add');
  render(
    <SettingsDialog
      isOpen
      onOpenChange={() => {}}
      installation={{ canInstall: false, install: () => {} }}
    />,
  );
  return {
    user: userEvent.setup(),
    notice,
    input: screen.getByLabelText(t('settings.import', locale)),
    consent: screen.getByRole('switch', { name: t('currency.online', locale) }),
  };
}

function heldFile() {
  let finish: (content: string) => void = () => {
    throw new Error('Reader not initialized');
  };
  let fail: (reason: unknown) => void = () => {
    throw new Error('Reader not initialized');
  };
  const reading = new Promise<string>((resolve, reject) => {
    finish = resolve;
    fail = reject;
  });
  const file = new File(['pending'], 'settings.json', {
    type: 'application/json',
  });
  const text = vi.fn(() => reading);
  Object.defineProperty(file, 'text', { value: text });
  return { file, text, finish, fail };
}

for (const locale of ['de', 'en'] as const) {
  it(`${locale}: resets only settings and global history`, async () => {
    Object.defineProperty(navigator, 'language', {
      configurable: true,
      value: locale === 'de' ? 'de-DE' : 'en-US',
    });
    const s = setup(locale, true);
    const definition = execute('kept=42');
    if (!definition.ok) throw new Error('Definition fixture failed');
    act(() => {
      useSettingsStore
        .getState()
        .updateSettings({ grouping: false, historyLimit: 17 });
      useAppStore.getState().setLastMode('graph');
      const modes = ['simple', 'scientific', 'convert', 'graph'] as const;
      for (const mode of modes) {
        const entry = useHistoryStore.getState().add(mode, {
          input: '1+1',
          result: '2',
          payload: { source: mode },
        });
        useHistoryStore.getState().togglePin(entry.id);
        useHistoryStore.getState().setVisible(mode, true);
      }
      useHistoryStore.getState().setLimit(17);
      useScientificStore.getState().commit(definition.value.environment);
      useConvertStore.getState().update({
        favorites: [{ categoryId: 'length', fromId: 'km', toId: 'mi' }],
        recent: [{ categoryId: 'length', fromId: 'm', toId: 'km' }],
        digits: 50,
        notation: 'eng',
        compound: true,
        sort: 'size',
      });
    });
    localStorage.setItem(THEME_CACHE_KEY, 'old theme cache');
    const rates = {
      version: 1,
      source: 'ecb-frankfurter',
      date: '2026-10-14',
      fetchedAt: Date.parse('2026-10-14T16:00:00Z'),
      rates: Object.fromEntries(currencyCodes.map((code) => [code, '1'])),
    };
    expect(parseRateCache(rates, Date.now())).not.toBeNull();
    localStorage.setItem(RATE_CACHE_KEY, JSON.stringify(rates));
    localStorage.setItem(RATE_ATTEMPT_KEY, '1793448000000');
    // A later storage type must never be implicitly included in this reset.
    localStorage.setItem('m8e-calc.future', 'keep future data');
    const preservedKeys = [
      SCIENTIFIC_STORAGE_KEY,
      'm8e-calc.convert',
      RATE_CACHE_KEY,
      RATE_ATTEMPT_KEY,
      'm8e-calc.future',
    ];
    const preserved = preservedKeys.map((key) => localStorage.getItem(key));
    expect(preserved.every((value) => value !== null)).toBe(true);
    const preferences = normalizePreferences(useConvertStore.getState());
    const settingsBefore = normalizeSettings(useSettingsStore.getState());
    const historyBefore = normalizeHistory(useHistoryStore.getState());
    const trigger = screen.getByRole('button', {
      name: t('settings.reset', locale),
      exact: true,
    });
    await s.user.click(trigger);
    const confirmation = screen.getByRole('region', {
      name: t('settings.resetTitle', locale),
    });
    expect(
      within(confirmation).getByText(t('settings.resetHint', locale)),
    ).toBeVisible();
    await s.user.click(
      within(confirmation).getByRole('button', {
        name: t('settings.cancel', locale),
      }),
    );
    expect(normalizeSettings(useSettingsStore.getState())).toEqual(
      settingsBefore,
    );
    expect(normalizeHistory(useHistoryStore.getState())).toEqual(historyBefore);
    expect(useAppStore.getState().lastMode).toBe('graph');
    expect(localStorage.getItem(THEME_CACHE_KEY)).toBe('old theme cache');
    expect(s.notice).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
    await s.user.click(trigger);
    const reopened = screen.getByRole('region', {
      name: t('settings.resetTitle', locale),
    });
    await s.user.click(
      within(reopened).getByRole('button', {
        name: t('settings.reset', locale),
        exact: true,
      }),
    );
    expect(normalizeSettings(useSettingsStore.getState())).toEqual(
      defaultSettings(),
    );
    expect(normalizeHistory(useHistoryStore.getState())).toEqual(
      emptyHistory(),
    );
    expect(
      JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null').state,
    ).toEqual(defaultSettings());
    expect(
      JSON.parse(localStorage.getItem(HISTORY_KEY) ?? 'null').state,
    ).toEqual(emptyHistory());
    expect(JSON.parse(localStorage.getItem(APP_KEY) ?? 'null').state).toEqual({
      lastMode: 'simple',
    });
    expect(useAppStore.getState().lastMode).toBe('simple');
    expect(useSettingsStore.getState().onlineRates).toBe(false);
    expect(window.location.hash).toBe('#/simple');
    expect(localStorage.getItem(THEME_CACHE_KEY)).toBeNull();
    expect(useScientificStore.getState().environment).toEqual(
      definition.value.environment,
    );
    expect(normalizePreferences(useConvertStore.getState())).toEqual(
      preferences,
    );
    expect(preservedKeys.map((key) => localStorage.getItem(key))).toEqual(
      preserved,
    );
    expect(s.notice).toHaveBeenLastCalledWith(
      { message: t('settings.resetDone', locale) },
      { timeout: 5000 },
    );
    expect(
      screen.queryByRole('region', { name: t('settings.resetTitle', locale) }),
    ).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it.each([
    { initial: true, current: false, changeAfterImport: false },
    { initial: false, current: true, changeAfterImport: false },
    { initial: true, current: true, changeAfterImport: false },
    { initial: false, current: false, changeAfterImport: false },
    { initial: true, current: false, changeAfterImport: true },
  ])(
    `${locale}: retains consent $initial → $current (change after import: $changeAfterImport)`,
    async ({ initial, current, changeAfterImport }) => {
      const s = setup(locale, initial);
      const read = heldFile();
      await s.user.upload(s.input, read.file);
      expect(read.text).toHaveBeenCalledTimes(1);
      expect(s.notice).not.toHaveBeenCalled();
      expect(useSettingsStore.getState().onlineRates).toBe(initial);
      if (initial !== current && !changeAfterImport) {
        await s.user.click(
          screen.getByText(t('currency.online', locale), { exact: true }),
        );
      }
      const atCompletion = changeAfterImport ? initial : current;
      if (atCompletion) expect(s.consent).toBeChecked();
      else expect(s.consent).not.toBeChecked();
      const expected = {
        ...defaultSettings(),
        language: locale,
        historyLimit: 17,
        grouping: false,
        onlineRates: current,
      };
      await act(async () => {
        read.finish(exportSettings({ ...expected, onlineRates: !current }));
      });
      await waitFor(() =>
        expect(s.notice).toHaveBeenCalledWith(
          { message: t('settings.imported', locale) },
          { timeout: 5000 },
        ),
      );
      expect(useSettingsStore.getState().onlineRates).toBe(atCompletion);
      if (changeAfterImport) {
        await s.user.click(
          screen.getByText(t('currency.online', locale), { exact: true }),
        );
      }
      expect(normalizeSettings(useSettingsStore.getState())).toEqual(expected);
      if (current) expect(s.consent).toBeChecked();
      else expect(s.consent).not.toBeChecked();
      expect(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null')).toEqual({
        version: 4,
        state: expected,
      });
      expect(
        normalizeSettings(createSettingsStore(localStorage).getState()),
      ).toEqual(expected);
    },
  );

  it.each(['invalid', 'unreadable', 'oversize'] as const)(
    `${locale}: failed %s import changes neither settings nor consent`,
    async (failure) => {
      const s = setup(locale, true);
      const read = heldFile();
      if (failure === 'oversize')
        Object.defineProperty(read.file, 'size', { value: 100001 });
      await s.user.upload(s.input, read.file);
      if (failure !== 'oversize') {
        expect(read.text).toHaveBeenCalledTimes(1);
        await s.user.click(
          screen.getByText(t('currency.online', locale), { exact: true }),
        );
      } else {
        expect(read.text).not.toHaveBeenCalled();
      }
      const before = normalizeSettings(useSettingsStore.getState());
      const persisted = localStorage.getItem(SETTINGS_KEY);
      const updates = vi.fn();
      const unsubscribe = useSettingsStore.subscribe(updates);
      try {
        if (failure !== 'oversize')
          await act(async () => {
            if (failure === 'unreadable') read.fail(new Error('read failed'));
            else
              read.finish(
                JSON.stringify({
                  version: 4,
                  settings: {
                    grouping: false,
                    historyLimit: 1000,
                    onlineRates: true,
                  },
                }),
              );
          });
        await waitFor(() =>
          expect(s.notice).toHaveBeenCalledWith(
            { message: t('settings.invalid', locale) },
            { timeout: 5000 },
          ),
        );
        expect(normalizeSettings(useSettingsStore.getState())).toEqual(before);
        expect(localStorage.getItem(SETTINGS_KEY)).toBe(persisted);
        expect(
          normalizeSettings(createSettingsStore(localStorage).getState()),
        ).toEqual(before);
        expect(updates).not.toHaveBeenCalled();
      } finally {
        unsubscribe();
      }
    },
  );
}
