import {
  contrasts,
  schemeVariants,
  type ContrastLevel,
  type SchemeVariant,
} from '../styles/colorSettings';
export const SETTINGS_KEY = 'm8e-calc.settings';
export const THEME_CACHE_KEY = 'm8e-calc.theme-cache';
export const SETTINGS_VERSION = 3;
export const themeModes = ['light', 'system', 'dark'] as const;
export type ThemeMode = (typeof themeModes)[number];
export const motionLevels = ['full', 'reduced', 'off'] as const;
export type MotionLevel = (typeof motionLevels)[number];
export interface Settings {
  themeMode: ThemeMode;
  accent: string;
  schemeVariant: SchemeVariant;
  contrast: ContrastLevel;
  motionLevel: MotionLevel;
  language: 'auto' | 'de' | 'en';
  decimalSeparator: 'auto' | 'comma' | 'point';
  grouping: boolean;
  historyLimit: number;
  uiSize: number;
  presentationHistory: boolean;
}
export function defaultSettings(reducedMotion = false): Settings {
  return {
    themeMode: 'system',
    accent: '#6750a4',
    schemeVariant: 'tonalSpot',
    contrast: 'standard',
    motionLevel: reducedMotion ? 'reduced' : 'full',
    language: 'auto',
    decimalSeparator: 'auto',
    grouping: true,
    historyLimit: 500,
    uiSize: 100,
    presentationHistory: false,
  };
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function normalizeSettings(
  value: unknown,
  reducedMotion = false,
): Settings {
  const fallback = defaultSettings(reducedMotion);
  if (!isRecord(value)) return fallback;
  return {
    uiSize:
      typeof value.uiSize === 'number' && Number.isFinite(value.uiSize)
        ? Math.max(80, Math.min(150, Math.round(value.uiSize)))
        : fallback.uiSize,
    presentationHistory:
      typeof value.presentationHistory === 'boolean'
        ? value.presentationHistory
        : false,
    language:
      value.language === 'de' || value.language === 'en'
        ? value.language
        : 'auto',
    decimalSeparator:
      value.decimalSeparator === 'comma' || value.decimalSeparator === 'point'
        ? value.decimalSeparator
        : 'auto',
    grouping:
      typeof value.grouping === 'boolean' ? value.grouping : fallback.grouping,
    historyLimit:
      typeof value.historyLimit === 'number' &&
      Number.isFinite(value.historyLimit)
        ? Math.max(1, Math.min(500, Math.trunc(value.historyLimit)))
        : fallback.historyLimit,
    themeMode:
      themeModes.find((item) => item === value.themeMode) ?? fallback.themeMode,
    accent:
      typeof value.accent === 'string' && /^#[\da-f]{6}$/i.test(value.accent)
        ? value.accent.toLowerCase()
        : fallback.accent,
    schemeVariant:
      schemeVariants.find((item) => item === value.schemeVariant) ??
      fallback.schemeVariant,
    contrast:
      contrasts.find((item) => item === value.contrast) ?? fallback.contrast,
    motionLevel:
      motionLevels.find((item) => item === value.motionLevel) ??
      fallback.motionLevel,
  };
}
/** Version 0 used `theme` / `seed`; unknown future versions are never interpreted. */
export function migrateSettings(
  value: unknown,
  version: number,
  reducedMotion = false,
): Settings {
  if (version === 0 && isRecord(value))
    return normalizeSettings(
      {
        ...value,
        themeMode: value.themeMode ?? value.theme,
        accent: value.accent ?? value.seed,
      },
      reducedMotion,
    );
  return normalizeSettings(
    version === 1 || version === 2 || version === SETTINGS_VERSION
      ? value
      : null,
    reducedMotion,
  );
}
export function resolveDark(mode: ThemeMode, systemDark: boolean): boolean {
  return mode === 'dark' || (mode === 'system' && systemDark);
}
export function themeFingerprint(settings: Settings): string {
  return `${settings.accent}:${settings.schemeVariant}:${settings.contrast}`;
}
export function nextThemeMode(mode: ThemeMode, key: string): ThemeMode {
  if (key === 'Home') return 'light';
  if (key === 'End') return 'dark';
  const delta = key === 'ArrowRight' || key === 'ArrowDown' ? 1 : -1;
  return themeModes[(themeModes.indexOf(mode) + delta + 3) % 3] ?? 'system';
}
