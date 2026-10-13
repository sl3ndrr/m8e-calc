import { useId, useRef, type CSSProperties } from 'react';
import { useSettingsStore } from '../shared/settingsStore';
import { useAppStore } from '../shared/store';
import { defaultSettings } from '../shared/settings';
import { t } from '../shared/i18n';
import {
  buildScheme,
  schemeVariants,
  contrasts,
  roleProperty,
} from '../styles/buildScheme';
import { seeds } from '../styles/seeds';
import { colorHue, colorWithHue } from '../shared/colorInput';
import { useSystemDark } from '../app/theme';
import { resolveDark } from '../shared/settings';
import { Icon } from './Icon';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { Slider } from './Slider';
import { Select } from './Select';
import { Popover } from './Popover';
import './AccentPicker.css';
export function AccentPicker() {
  const id = useId();
  const picker = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const settings = useSettingsStore();
  const locale = useAppStore((state) => state.locale);
  const isDark = resolveDark(settings.themeMode, useSystemDark());
  const palette = buildScheme(
    settings.accent,
    settings.schemeVariant,
    isDark,
    settings.contrast,
  );
  return (
    <>
      <Button
        variant="tonal"
        ref={trigger}
        className="accent-trigger"
        type="button"
        popoverTarget={id}
        aria-label={t('accent.open', locale)}
        title={t('accent.open', locale)}
      >
        <Icon name="palette" />
        <span>{t('accent.open', locale)}</span>
      </Button>
      <Popover
        native
        id={id}
        ref={picker}
        className="accent-popover"
        role="dialog"
        aria-labelledby={`${id}-title`}
        onToggle={(event) => {
          if (event.newState === 'open')
            picker.current?.querySelector<HTMLButtonElement>('.seed')?.focus();
          else if (picker.current?.contains(document.activeElement))
            trigger.current?.focus();
        }}
      >
        <header className="popover-heading">
          <div>
            <h2 id={`${id}-title`}>{t('accent.title', locale)}</h2>
            <p>{t('accent.description', locale)}</p>
          </div>
          <IconButton
            icon="close"
            variant="text"
            className="icon-button"
            popoverTarget={id}
            popoverTargetAction="hide"
            aria-label={t('accent.close', locale)}
          />
        </header>
        <div
          role="group"
          aria-label={t('accent.seeds', locale)}
          className="seed-grid"
        >
          {seeds.map(([name, hex]) => {
            const scheme = buildScheme(
              hex,
              settings.schemeVariant,
              isDark,
              settings.contrast,
            );
            return (
              <Button
                className="seed"
                variant="text"
                isSelected={settings.accent === hex}
                type="button"
                key={name}
                aria-label={t(`seed.${name}`, locale)}
                title={t(`seed.${name}`, locale)}
                aria-pressed={settings.accent === hex}
                style={
                  {
                    '--md-sys-color-seed': scheme[roleProperty('primary')],
                    '--md-sys-color-on-seed': scheme[roleProperty('onPrimary')],
                  } as CSSProperties
                }
                onPress={() => settings.updateSettings({ accent: hex })}
              >
                {settings.accent === hex && <Icon name="check" />}
              </Button>
            );
          })}
        </div>
        <div className="custom-color">
          <label htmlFor={`${id}-custom`}>{t('accent.custom', locale)}</label>
          <input
            id={`${id}-custom`}
            type="color"
            value={settings.accent}
            onChange={(event) =>
              settings.updateSettings({ accent: event.target.value })
            }
          />
          <output htmlFor={`${id}-custom`} className="expression">
            {settings.accent}
          </output>
        </div>
        <Slider
          label={t('accent.hue', locale)}
          minValue={0}
          maxValue={360}
          value={Math.round(colorHue(settings.accent))}
          onChange={(hue) =>
            settings.updateSettings({
              accent: colorWithHue(settings.accent, hue),
            })
          }
        />
        <div
          className="palette-preview"
          role="group"
          aria-label={t('accent.preview', locale)}
        >
          {(['primary', 'secondary', 'tertiary'] as const).map((role) => (
            <div
              key={role}
              style={
                {
                  '--md-sys-color-preview': palette[roleProperty(role)],
                  '--md-sys-color-on-preview':
                    palette[
                      roleProperty(
                        `on${role[0]?.toUpperCase()}${role.slice(1)}`,
                      )
                    ],
                } as CSSProperties
              }
            >
              <span>{t(`color.${role}`, locale)}</span>
              <code>{palette[roleProperty(role)]}</code>
            </div>
          ))}
        </div>
        <Select
          label={t('accent.variant', locale)}
          selectedKey={settings.schemeVariant}
          options={schemeVariants.map((item) => ({
            id: item,
            label: t(`variant.${item}`, locale),
          }))}
          onSelectionChange={(key) => {
            const variant = schemeVariants.find((item) => item === key);
            if (variant) settings.updateSettings({ schemeVariant: variant });
          }}
        />
        <Select
          label={t('accent.contrast', locale)}
          selectedKey={settings.contrast}
          options={contrasts.map((item) => ({
            id: item,
            label: t(`contrast.${item}`, locale),
          }))}
          onSelectionChange={(key) => {
            const contrast = contrasts.find((item) => item === key);
            if (contrast) settings.updateSettings({ contrast });
          }}
        />
        <Button
          variant="tonal"
          className="tonal-button"
          type="button"
          onPress={() => {
            const { accent, schemeVariant, contrast } = defaultSettings();
            settings.updateSettings({ accent, schemeVariant, contrast });
          }}
        >
          <Icon name="restart_alt" />
          {t('accent.reset', locale)}
        </Button>
      </Popover>
    </>
  );
}
