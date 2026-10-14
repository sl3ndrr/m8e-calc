import { useRef, useState } from 'react';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { Select } from '../ui/Select';
import { Switch } from '../ui/Switch';
import { Slider } from '../ui/Slider';
import { TextField } from '../ui/TextField';
import { snackbarQueue } from '../ui/snackbarQueue';
import { useSettingsStore } from '../shared/settingsStore';
import { useAppStore } from '../shared/store';
import { useHistoryStore } from '../shared/historyStore';
import {
  motionLevels,
  normalizeSettings,
  THEME_CACHE_KEY,
} from '../shared/settings';
import { formatNumber, t } from '../shared/i18n';
import { clearHistoryWithUndo } from './HistorySheet';
import { downloadFile, exportSettings, importSettings } from './fileTransfer';
export function SettingsDialog({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const locale = useAppStore((state) => state.locale);
  const settings = useSettingsStore();
  const input = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const languageOptions = (['auto', 'de', 'en'] as const).map((id) => ({
    id,
    label: t(`language.${id}`, locale),
  }));
  const motionOptions = motionLevels.map((id) => ({
    id,
    label: t(`motion.${id}`, locale),
  }));
  async function importFile(file: File): Promise<void> {
    try {
      if (file.size > 100000) throw new TypeError('Settings file too large');
      const next = importSettings(await file.text());
      settings.updateSettings({ ...next, onlineRates: settings.onlineRates });
      snackbarQueue.add({ message: t('settings.imported') }, { timeout: 5000 });
    } catch {
      snackbarQueue.add({ message: t('settings.invalid') }, { timeout: 5000 });
    }
  }
  return (
    <Dialog
      title={t('shell.settings', locale)}
      closeLabel={t('ui.close', locale)}
      className="settings-dialog"
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) setConfirmReset(false);
        onOpenChange(open);
      }}
    >
      <div className="settings-sections">
        <Slider
          label={t('comfort.uiSize', locale)}
          minValue={80}
          maxValue={150}
          step={5}
          value={settings.uiSize}
          formatOptions={{ style: 'unit', unit: 'percent' }}
          onChange={(uiSize) => settings.updateSettings({ uiSize })}
        />
        <Switch
          isSelected={settings.presentationHistory}
          onChange={(presentationHistory) =>
            settings.updateSettings({ presentationHistory })
          }
        >
          {t('comfort.presentationHistory', locale)}
        </Switch>
        <section aria-label={t('currency.online', locale)}>
          <Switch
            isSelected={settings.onlineRates}
            onChange={(onlineRates) => settings.updateSettings({ onlineRates })}
            aria-describedby="currency-privacy"
          >
            {t('currency.online', locale)}
          </Switch>
          <p id="currency-privacy">{t('currency.privacy', locale)}</p>
        </section>
        <Select
          label={t('language.label', locale)}
          options={languageOptions}
          selectedKey={settings.language}
          onSelectionChange={(key) => {
            if (key === 'auto' || key === 'de' || key === 'en')
              settings.updateSettings({ language: key });
          }}
        />
        <section aria-label={t('settings.numbers', locale)}>
          <h3>{t('settings.numbers', locale)}</h3>
          <Select
            label={t('settings.decimal', locale)}
            options={[
              { id: 'auto', label: t('language.auto', locale) },
              { id: 'comma', label: t('settings.comma', locale) },
              { id: 'point', label: t('settings.point', locale) },
            ]}
            selectedKey={settings.decimalSeparator}
            onSelectionChange={(key) => {
              if (key === 'auto' || key === 'comma' || key === 'point')
                settings.updateSettings({ decimalSeparator: key });
            }}
          />
          <Switch
            isSelected={settings.grouping}
            onChange={(grouping) => settings.updateSettings({ grouping })}
          >
            {t('settings.grouping', locale)}
          </Switch>
          <p>
            {t('settings.preview', locale)}:{' '}
            <output className="expression">
              {formatNumber(12345.6789, locale, settings)}
            </output>
          </p>
        </section>
        <Select
          label={t('design.motionLevel', locale)}
          options={motionOptions}
          selectedKey={settings.motionLevel}
          onSelectionChange={(key) => {
            const motionLevel = motionLevels.find((level) => level === key);
            if (motionLevel) settings.updateSettings({ motionLevel });
          }}
        />
        <section aria-label={t('history.title', locale)}>
          <h3>{t('history.title', locale)}</h3>
          <TextField
            label={t('settings.limit', locale)}
            type="number"
            value={String(settings.historyLimit)}
            onChange={(value) => {
              const limit = Number(value);
              if (Number.isInteger(limit) && limit >= 1 && limit <= 500)
                settings.updateSettings({ historyLimit: limit });
            }}
          />
          <Button variant="text" onPress={() => clearHistoryWithUndo()}>
            {t('history.clear', locale)}
          </Button>
        </section>
        <section aria-label={t('settings.data', locale)}>
          <h3>{t('settings.data', locale)}</h3>
          <div className="settings-actions">
            <Button
              variant="outlined"
              onPress={() =>
                downloadFile(
                  exportSettings(normalizeSettings(settings)),
                  'm8e-calc-settings.json',
                  'application/json',
                )
              }
            >
              {t('settings.export', locale)}
            </Button>
            <Button variant="outlined" onPress={() => input.current?.click()}>
              {t('settings.import', locale)}
            </Button>
            <input
              ref={input}
              type="file"
              accept="application/json,.json"
              hidden
              aria-label={t('settings.import', locale)}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (file) void importFile(file);
                event.currentTarget.value = '';
              }}
            />
            <Button variant="text" onPress={() => setConfirmReset(true)}>
              {t('settings.reset', locale)}
            </Button>
          </div>
        </section>
        {confirmReset && (
          <section
            className="settings-reset"
            aria-label={t('settings.resetTitle', locale)}
          >
            <h3>{t('settings.resetTitle', locale)}</h3>
            <p>{t('settings.resetHint', locale)}</p>
            <div className="settings-actions">
              <Button variant="outlined" onPress={() => setConfirmReset(false)}>
                {t('settings.cancel', locale)}
              </Button>
              <Button
                onPress={() => {
                  snackbarQueue.clear();
                  settings.resetSettings();
                  useHistoryStore.getState().resetHistory();
                  useAppStore.getState().resetApp();
                  try {
                    localStorage.removeItem(THEME_CACHE_KEY);
                  } catch {
                    /* Optional persistence. */
                  }
                  window.location.hash = '#/simple';
                  setConfirmReset(false);
                  snackbarQueue.add(
                    { message: t('settings.resetDone') },
                    { timeout: 5000 },
                  );
                }}
              >
                {t('settings.reset', locale)}
              </Button>
            </div>
          </section>
        )}
      </div>
    </Dialog>
  );
}
