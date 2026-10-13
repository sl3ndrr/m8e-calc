import { create } from 'zustand';
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from 'zustand/middleware';
import { detectLocale, setI18nLocale, type Locale } from './i18n';
import { useSettingsStore, safeStorage } from './settingsStore';
import { isModeId, type ModeId } from './modes';
export const APP_KEY = 'm8e-calc.app';
interface AppState {
  locale: Locale;
  lastMode: ModeId;
  setLocale: (locale: Locale) => void;
  setLastMode: (mode: ModeId) => void;
  resetApp: () => void;
}
function resolveLocale(): Locale {
  const language = useSettingsStore.getState().language;
  return language === 'auto'
    ? detectLocale(typeof navigator === 'undefined' ? 'de' : navigator.language)
    : language;
}
export function createAppStore(storage: StateStorage) {
  return create<AppState>()(
    persist(
      (set) => ({
        locale: resolveLocale(),
        lastMode: 'simple',
        setLocale: (locale) => {
          useSettingsStore.getState().updateSettings({ language: locale });
          set({ locale });
        },
        setLastMode: (lastMode) => set({ lastMode }),
        resetApp: () => set({ lastMode: 'simple' }),
      }),
      {
        name: APP_KEY,
        version: 1,
        storage: createJSONStorage(() => safeStorage(() => storage)),
        partialize: (state) => ({ lastMode: state.lastMode }),
        migrate: () => ({ lastMode: 'simple' }),
        merge: (persisted, current) => ({
          ...current,
          lastMode:
            typeof persisted === 'object' &&
            persisted !== null &&
            'lastMode' in persisted &&
            isModeId(persisted.lastMode)
              ? persisted.lastMode
              : 'simple',
        }),
      },
    ),
  );
}
export const useAppStore = createAppStore(
  safeStorage(() => window.localStorage),
);
setI18nLocale(useAppStore.getState().locale);
useAppStore.subscribe((state) => setI18nLocale(state.locale));
useSettingsStore.subscribe(() =>
  useAppStore.setState({ locale: resolveLocale() }),
);
