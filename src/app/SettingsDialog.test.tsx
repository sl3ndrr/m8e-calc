import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import {
  defaultSettings,
  normalizeSettings,
  SETTINGS_KEY,
} from '../shared/settings';
import { createSettingsStore, useSettingsStore } from '../shared/settingsStore';
import { useAppStore } from '../shared/store';
import { t } from '../shared/i18n/extended';
import { snackbarQueue } from '../ui/snackbarQueue';
import { exportSettings } from './fileTransfer';
import { SettingsDialog } from './SettingsDialog';

afterEach(() => {
  snackbarQueue.clear();
  useSettingsStore.getState().resetSettings();
  useAppStore.getState().setLocale('de');
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
