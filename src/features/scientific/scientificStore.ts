import { create } from 'zustand';
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from 'zustand/middleware';
import { createEnvironment, type Environment } from '../../engine';
import { safeStorage } from '../../shared/settingsStore';
import { normalizeEnvironment, removeDefinition } from './model';
interface ScientificState {
  environment: Environment;
  commit: (environment: Environment) => void;
  remove: (name: string) => void;
}
export function createScientificStore(storage: StateStorage) {
  return create<ScientificState>()(
    persist(
      (set) => ({
        environment: createEnvironment(),
        commit: (environment) => set({ environment }),
        remove: (name) =>
          set((s) => ({ environment: removeDefinition(s.environment, name) })),
      }),
      {
        name: 'm8e-calc.scientific',
        version: 1,
        storage: createJSONStorage(() => safeStorage(() => storage)),
        partialize: (s) => ({ environment: s.environment }),
        merge: (persisted, current) => ({
          ...current,
          environment: normalizeEnvironment(
            persisted &&
              typeof persisted === 'object' &&
              'environment' in persisted
              ? persisted.environment
              : undefined,
          ),
        }),
      },
    ),
  );
}
export const useScientificStore = createScientificStore(
  safeStorage(() => window.localStorage),
);
