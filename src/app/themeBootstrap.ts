import type { ColorScheme } from '../styles/buildScheme.ts';
/** Self-contained: Vite embeds the transpiled function before all render-blocking assets. */
export function bootstrapTheme(defaults: {
  light: ColorScheme;
  dark: ColorScheme;
}): void {
  const root = document.documentElement;
  let state: Record<string, unknown> = {};
  let cache: Record<string, unknown> = {};
  try {
    const saved = JSON.parse(
      localStorage.getItem('m8e-calc.settings') ?? 'null',
    );
    if (
      saved &&
      (saved.version === 3 || saved.version === 2 || saved.version === 1 || saved.version === 0) &&
      saved.state &&
      typeof saved.state === 'object'
    ) {
      state = saved.state;
      if (saved.version === 0)
        state = {
          ...state,
          themeMode: state.themeMode ?? state.theme,
          accent: state.accent ?? state.seed,
        };
    }
    cache =
      JSON.parse(localStorage.getItem('m8e-calc.theme-cache') ?? '{}') ?? {};
  } catch {
    /* Defaults also work with denied/corrupt storage. */
  }
  const mode = ['light', 'system', 'dark'].includes(String(state.themeMode))
    ? state.themeMode
    : 'system';
  const dark =
    mode === 'dark' ||
    (mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  const accent =
    typeof state.accent === 'string' && /^#[\da-f]{6}$/i.test(state.accent)
      ? state.accent.toLowerCase()
      : '#6750a4';
  const variant = ['tonalSpot', 'expressive', 'vibrant', 'neutral'].includes(
    String(state.schemeVariant),
  )
    ? state.schemeVariant
    : 'tonalSpot';
  const contrast = ['standard', 'medium', 'high'].includes(
    String(state.contrast),
  )
    ? state.contrast
    : 'standard';
  const fallback = dark ? defaults.dark : defaults.light;
  const candidate = cache[dark ? 'dark' : 'light'];
  const valid =
    cache.version === 1 &&
    cache.fingerprint === `${accent}:${variant}:${contrast}` &&
    typeof candidate === 'object' &&
    candidate !== null &&
    Object.keys(fallback).every((key) =>
      /^#[\da-f]{6}$/i.test(
        String((candidate as Record<string, unknown>)[key]),
      ),
    );
  const colors = valid ? (candidate as ColorScheme) : fallback;
  for (const key of Object.keys(fallback) as (keyof ColorScheme)[])
    root.style.setProperty(key, colors[key] ?? fallback[key] ?? '');
  root.style.colorScheme = dark ? 'dark' : 'light';
  root.dataset.theme = dark ? 'dark' : 'light';
  root.dataset.themeMode = String(mode);
  root.dataset.motion =
    state.motionLevel === 'off'
      ? 'off'
      : matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'reduced'
        : ['full', 'reduced', 'off'].includes(String(state.motionLevel))
          ? String(state.motionLevel)
          : 'full';
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', colors['--md-sys-color-surface'] ?? '');
}

