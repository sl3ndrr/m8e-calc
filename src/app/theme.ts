import { supportedEasing } from './browserMotion';
import { useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';
import type { ColorScheme } from '../styles/buildScheme';
import { motionProperties, springs, springToLinear } from '../styles/motion';
import { useSettingsStore } from '../shared/settingsStore';
import {
  THEME_CACHE_KEY,
  resolveDark,
  themeFingerprint,
  type ThemeMode,
  type MotionLevel,
} from '../shared/settings';
const darkQuery = '(prefers-color-scheme: dark)';
const reducedQuery = '(prefers-reduced-motion: reduce)';
export function useSystemDark(): boolean {
  return useSyncExternalStore(
    (listener) => {
      const query = window.matchMedia(darkQuery);
      query.addEventListener('change', listener);
      return () => query.removeEventListener('change', listener);
    },
    () => window.matchMedia(darkQuery).matches,
    () => false,
  );
}
export function effectiveMotion(): MotionLevel {
  const level = useSettingsStore.getState().motionLevel;
  return level === 'off'
    ? 'off'
    : window.matchMedia(reducedQuery).matches
      ? 'reduced'
      : level;
}
const initial =
  typeof window === 'undefined'
    ? undefined
    : (Reflect.get(window, 'm8eThemeBootstrap') as
        | { fingerprint: string; light: ColorScheme; dark: ColorScheme }
        | undefined);
let lastFingerprint = initial?.fingerprint ?? '';
let palettes: { light: ColorScheme; dark: ColorScheme } | undefined = initial;
let pendingFingerprint = '';
export function applyTheme(): void {
  const settings = useSettingsStore.getState();
  const fingerprint = themeFingerprint(settings);
  if (lastFingerprint !== fingerprint && pendingFingerprint !== fingerprint) {
    pendingFingerprint = fingerprint;
    void import('../styles/buildScheme')
      .then(({ buildScheme }) => {
        const current = useSettingsStore.getState();
        if (themeFingerprint(current) !== fingerprint) return;
        palettes = {
          light: buildScheme(
            current.accent,
            current.schemeVariant,
            false,
            current.contrast,
          ),
          dark: buildScheme(
            current.accent,
            current.schemeVariant,
            true,
            current.contrast,
          ),
        };
        lastFingerprint = fingerprint;
        pendingFingerprint = '';
        try {
          localStorage.setItem(
            THEME_CACHE_KEY,
            JSON.stringify({ version: 1, fingerprint, ...palettes }),
          );
        } catch {
          /* Optional persistence. */
        }
        applyTheme();
      })
      .catch(() => {
        pendingFingerprint = '';
      });
  }
  const dark = resolveDark(
    settings.themeMode,
    window.matchMedia(darkQuery).matches,
  );
  const root = document.documentElement;
  for (const [name, value] of Object.entries(
    (dark ? palettes?.dark : palettes?.light) ?? {},
  ))
    root.style.setProperty(name, value);
  root.style.colorScheme = dark ? 'dark' : 'light';
  root.dataset.theme = dark ? 'dark' : 'light';
  root.dataset.themePalette = lastFingerprint;
  root.dataset.themeMode = settings.themeMode;
  root.dataset.motion = effectiveMotion();
  if (root.dataset.motion !== 'full') {
    stopTransition?.();
    root.removeAttribute('data-theme-changing');
  }
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute(
      'content',
      root.style.getPropertyValue('--md-sys-color-surface'),
    );
}
export function initializeTheme(): () => void {
  Object.entries(motionProperties).forEach(([name, value]) =>
    document.documentElement.style.setProperty(
      name,
      name.endsWith('-easing') ? supportedEasing(value) : value,
    ),
  );
  applyTheme();
  const unsubscribe = useSettingsStore.subscribe(applyTheme);
  const dark = window.matchMedia(darkQuery);
  const reduced = window.matchMedia(reducedQuery);
  dark.addEventListener('change', applyTheme);
  reduced.addEventListener('change', applyTheme);
  document.documentElement.dataset.themeReady = 'true';
  return () => {
    unsubscribe();
    dark.removeEventListener('change', applyTheme);
    reduced.removeEventListener('change', applyTheme);
  };
}
let stopTransition: (() => void) | undefined;
let themeChange = 0;
/** Retargetable, non-blocking reveal. Reduced/off switch synchronously. */
export function changeTheme(mode: ThemeMode, origin: HTMLElement): void {
  const request = ++themeChange;
  stopTransition?.();
  document.documentElement.removeAttribute('data-theme-changing');
  const update = () =>
    flushSync(
      () =>
        request === themeChange &&
        useSettingsStore.getState().updateSettings({ themeMode: mode }),
    );
  const current = useSettingsStore.getState().themeMode;
  const system = window.matchMedia(darkQuery).matches;
  if (
    effectiveMotion() !== 'full' ||
    resolveDark(current, system) === resolveDark(mode, system)
  ) {
    update();
    return;
  }
  const { duration, easing } = springToLinear(
    springs['spatial-default'].stiffness,
    springs['spatial-default'].damping,
  );
  document.documentElement.dataset.themeChanging = 'true';
  if (document.startViewTransition) {
    const bounds = origin.getBoundingClientRect();
    const x = bounds.left + bounds.width / 2;
    const y = bounds.top + bounds.height / 2;
    const radius = Math.hypot(
      Math.max(x, innerWidth - x),
      Math.max(y, innerHeight - y),
    );
    const transition = document.startViewTransition(update);
    stopTransition = () => transition.skipTransition();
    void transition.ready
      .then(() => {
        if (request !== themeChange) {
          transition.skipTransition();
          return;
        }
        const animation = document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${radius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration,
            easing: supportedEasing(easing),
            pseudoElement: '::view-transition-new(root)',
          },
        );
        stopTransition = () => {
          animation.cancel();
          transition.skipTransition();
        };
        void animation.finished.catch(() => {});
      })
      .catch(() => {});
    const finish = () => {
      if (request === themeChange)
        document.documentElement.removeAttribute('data-theme-changing');
    };
    void transition.finished.catch(() => {}).finally(finish);
  } else {
    const root = document.getElementById('root');
    const snapshot = root?.cloneNode(true);
    if (!(snapshot instanceof HTMLElement)) {
      document.documentElement.removeAttribute('data-theme-changing');
      update();
      return;
    }
    snapshot.removeAttribute('id');
    snapshot
      .querySelectorAll('[id]')
      .forEach((node) => node.removeAttribute('id'));
    snapshot.classList.add('theme-snapshot');
    snapshot.inert = true;
    snapshot.setAttribute('aria-hidden', 'true');
    snapshot.style.cssText = document.documentElement.style.cssText;
    snapshot.style.setProperty('--snapshot-scroll', `${-window.scrollY}px`);
    document.body.append(snapshot);
    update();
    snapshot.dataset.theme = document.documentElement.dataset.theme;
    snapshot.dataset.motion = 'off';
    const fade = snapshot.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration,
      easing: supportedEasing(easing),
    });
    const finish = () => {
      snapshot.remove();
      if (request === themeChange)
        document.documentElement.removeAttribute('data-theme-changing');
    };
    stopTransition = () => {
      fade.cancel();
      finish();
    };
    void fade.finished.catch(() => {}).finally(finish);
  }
}
