import { useRef } from 'react';
import { useSettingsStore } from '../shared/settingsStore';
import { themeModes } from '../shared/settings';
import { useAppStore } from '../shared/store';
import { t } from '../shared/i18n';
import { changeTheme, useSystemDark } from '../app/theme';
import { SegmentedControl } from './SegmentedControl';
import { Icon, type IconName } from './Icon';
import './ThemeSwitch.css';
const symbols: Record<(typeof themeModes)[number], IconName> = {
  light: 'light_mode',
  system: 'brightness_auto',
  dark: 'dark_mode',
};
export function ThemeSwitch() {
  const mode = useSettingsStore((s) => s.themeMode);
  const locale = useAppStore((s) => s.locale);
  const systemDark = useSystemDark();
  const group = useRef<HTMLDivElement>(null);
  const status = t(
    systemDark ? 'theme.systemDark' : 'theme.systemLight',
    locale,
  );
  return (
    <SegmentedControl
      ref={group}
      className="theme-switch"
      aria-label={t('theme.label', locale)}
      value={mode}
      data-selected={mode}
      adornment={<span className="theme-thumb" aria-hidden="true" />}
      onChange={(value) => {
        const next = themeModes.find((item) => item === value);
        if (next && group.current) changeTheme(next, group.current);
      }}
      items={themeModes.map((item) => ({
        id: item,
        ariaLabel:
          item === 'system'
            ? `${t(`theme.${item}`, locale)} · ${status}`
            : t(`theme.${item}`, locale),
        title:
          item === 'system'
            ? `${t(`theme.${item}`, locale)} · ${status}`
            : t(`theme.${item}`, locale),
        label: (
          <>
            <Icon name={symbols[item]} filled={mode === item} />
            <span className="theme-label">{t(`theme.${item}`, locale)}</span>
            <span className="tooltip" aria-hidden="true">
              {item === 'system' ? status : t(`theme.${item}`, locale)}
            </span>
          </>
        ),
      }))}
    />
  );
}
