import { useRef } from 'react';
import { useSettingsStore } from '../shared/settingsStore';
import { themeModes, nextThemeMode } from '../shared/settings';
import { useAppStore } from '../shared/store';
import { t } from '../shared/i18n';
import { changeTheme, useSystemDark } from '../app/theme';
import { Symbol } from './Symbol';
const symbols = {
  light: 'light_mode',
  system: 'brightness_auto',
  dark: 'dark_mode',
};
export function ThemeSwitch() {
  const mode = useSettingsStore((state) => state.themeMode);
  const locale = useAppStore((state) => state.locale);
  const systemDark = useSystemDark();
  const group = useRef<HTMLDivElement>(null);
  return (
    <div
      className="theme-switch"
      ref={group}
      role="radiogroup"
      aria-label={t('theme.label', locale)}
      data-selected={mode}
    >
      <span className="theme-thumb" aria-hidden="true" />
      {themeModes.map((item) => {
        const label = t(`theme.${item}`, locale);
        const status = t(
          systemDark ? 'theme.systemDark' : 'theme.systemLight',
          locale,
        );
        return (
          <button
            key={item}
            type="button"
            role="radio"
            aria-checked={mode === item}
            tabIndex={mode === item ? 0 : -1}
            aria-label={item === 'system' ? `${label} · ${status}` : label}
            title={item === 'system' ? `${label} · ${status}` : label}
            onClick={() => {
              if (group.current) changeTheme(item, group.current);
            }}
            onKeyDown={(event) => {
              if (
                ![
                  'ArrowLeft',
                  'ArrowRight',
                  'ArrowUp',
                  'ArrowDown',
                  'Home',
                  'End',
                ].includes(event.key)
              )
                return;
              event.preventDefault();
              const next = nextThemeMode(item, event.key);
              if (group.current) changeTheme(next, group.current);
              const buttons =
                group.current?.querySelectorAll<HTMLButtonElement>('button');
              buttons?.[themeModes.indexOf(next)]?.focus();
            }}
          >
            <Symbol name={symbols[item]} />
            <span className="theme-label">{label}</span>
            {item === 'system' && (
              <span
                className="system-indicator"
                data-dark={systemDark}
                aria-hidden="true"
              >
                <Symbol name={systemDark ? 'dark_mode' : 'light_mode'} />
              </span>
            )}
            <span className="tooltip" aria-hidden="true">
              {item === 'system' ? status : label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
