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
import { Symbol } from './Symbol';
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
      <button
        ref={trigger}
        className="accent-trigger"
        type="button"
        popoverTarget={id}
        aria-label={t('accent.open', locale)}
        title={t('accent.open', locale)}
      >
        <Symbol name="palette" />
        <span>{t('accent.open', locale)}</span>
      </button>
      <div
        id={id}
        ref={picker}
        popover="auto"
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
          <button
            type="button"
            className="icon-button"
            popoverTarget={id}
            popoverTargetAction="hide"
            aria-label={t('accent.close', locale)}
          >
            <Symbol name="close" />
          </button>
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
              <button
                className="seed"
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
                onClick={() => settings.updateSettings({ accent: hex })}
              >
                {settings.accent === hex && <Symbol name="check" />}
              </button>
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
        <div className="field">
          <label htmlFor={`${id}-hue`}>{t('accent.hue', locale)}</label>
          <input
            id={`${id}-hue`}
            type="range"
            min="0"
            max="360"
            value={Math.round(colorHue(settings.accent))}
            onChange={(event) =>
              settings.updateSettings({
                accent: colorWithHue(
                  settings.accent,
                  Number(event.target.value),
                ),
              })
            }
          />
        </div>
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
        <div className="field">
          <label htmlFor={`${id}-variant`}>{t('accent.variant', locale)}</label>
          <select
            id={`${id}-variant`}
            value={settings.schemeVariant}
            onChange={(event) => {
              const variant = schemeVariants.find(
                (item) => item === event.target.value,
              );
              if (variant) settings.updateSettings({ schemeVariant: variant });
            }}
          >
            {schemeVariants.map((item) => (
              <option key={item} value={item}>
                {t(`variant.${item}`, locale)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${id}-contrast`}>
            {t('accent.contrast', locale)}
          </label>
          <select
            id={`${id}-contrast`}
            value={settings.contrast}
            onChange={(event) => {
              const contrast = contrasts.find(
                (item) => item === event.target.value,
              );
              if (contrast) settings.updateSettings({ contrast });
            }}
          >
            {contrasts.map((item) => (
              <option key={item} value={item}>
                {t(`contrast.${item}`, locale)}
              </option>
            ))}
          </select>
        </div>
        <button
          className="tonal-button"
          type="button"
          onClick={() => {
            const { accent, schemeVariant, contrast } = defaultSettings();
            settings.updateSettings({ accent, schemeVariant, contrast });
          }}
        >
          <Symbol name="restart_alt" />
          {t('accent.reset', locale)}
        </button>
      </div>
    </>
  );
}
