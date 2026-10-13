import { create } from 'zustand';
import {
  persist,
  createJSONStorage,
  type StateStorage,
} from 'zustand/middleware';
import {
  defaultSettings,
  normalizeSettings,
  migrateSettings,
  SETTINGS_KEY,
  SETTINGS_VERSION,
  type Settings,
} from './settings';

/** A denied, full or corrupt storage must never prevent the UI from working. */
export function safeStorage(getStorage: () => StateStorage): StateStorage {
  return {
    getItem: (name) => {
      try {
        return getStorage().getItem(name);
      } catch {
        return null;
      }
    },
    setItem: (name, value) => {
      try {
        return getStorage().setItem(name, value);
      } catch {
        /* In-memory state remains usable. */
      }
    },
    removeItem: (name) => {
      try {
        return getStorage().removeItem(name);
      } catch {
        /* Optional persistence. */
      }
    },
  };
}
interface SettingsState extends Settings {
  updateSettings: (patch: Partial<Settings>) => void;
  resetSettings: () => void;
}
export function createSettingsStore(
  storage: StateStorage,
  reducedMotion = false,
) {
  return create<SettingsState>()(
    persist(
      (set) => ({
        ...defaultSettings(reducedMotion),
        updateSettings: (patch) =>
          set((state) =>
            normalizeSettings({ ...state, ...patch }, reducedMotion),
          ),
        resetSettings: () => set(defaultSettings(reducedMotion)),
      }),
      {
        name: SETTINGS_KEY,
        version: SETTINGS_VERSION,
        storage: createJSONStorage(() => safeStorage(() => storage)),
        partialize: (state) => normalizeSettings(state, reducedMotion),
        migrate: (state, version) =>
          migrateSettings(state, version, reducedMotion),
        merge: (persisted, current) => ({
          ...current,
          ...normalizeSettings(persisted, reducedMotion),
        }),
      },
    ),
  );
}
const reducedMotion =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const useSettingsStore = createSettingsStore(
  safeStorage(() => window.localStorage),
  reducedMotion,
);
