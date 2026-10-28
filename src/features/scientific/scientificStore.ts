import { create } from 'zustand';
import {
  persist,
  type PersistStorage,
  type StateStorage,
} from 'zustand/middleware';
import {
  createEnvironment,
  restoreEnvironment,
  type Environment,
} from '../../engine';
import { removeDefinition } from './model';

export const SCIENTIFIC_STORAGE_KEY = 'm8e-calc.scientific';
// Bound JSON parsing/serialization independently of the engine's per-definition limits.
export const MAX_SCIENTIFIC_STORAGE_LENGTH = 16 * 1024 * 1024;
export type ScientificRecovery =
  'loading' | 'invalid' | 'unavailable' | 'saveFailed' | null;
interface PersistedScientificState {
  environment: Environment;
  recovery: ScientificRecovery;
}
interface ScientificState extends PersistedScientificState {
  commit: (environment: Environment) => void;
  remove: (name: string) => void;
}
function isRecord(input: unknown): input is Record<string, unknown> {
  return input !== null && typeof input === 'object' && !Array.isArray(input);
}
export function createScientificStore(storage: StateStorage) {
  // Keep the original in its one existing key. Never retain or duplicate a raw backup.
  // Writes stay locked after any failed read/validation/save, until an explicit rehydrate.
  let writable = false;
  let reportFailure: ((recovery: ScientificRecovery) => void) | undefined;
  function blocked(recovery: ScientificRecovery) {
    return {
      state: { environment: createEnvironment(), recovery },
      version: 1,
    };
  }
  function read(raw: string | null) {
    if (raw === null) {
      return {
        state: { environment: createEnvironment(), recovery: null },
        version: 1,
      };
    }
    try {
      if (raw.length > MAX_SCIENTIFIC_STORAGE_LENGTH) return blocked('invalid');
      const data: unknown = JSON.parse(raw);
      if (
        !isRecord(data) ||
        (data.version !== undefined && data.version !== 1) ||
        !isRecord(data.state) ||
        !Object.hasOwn(data.state, 'environment')
      )
        return blocked('invalid');
      const restored = restoreEnvironment(data.state.environment);
      if (!restored.ok) return blocked('invalid');
      return {
        state: { environment: restored.value, recovery: null },
        version: 1,
      };
    } catch {
      return blocked('invalid');
    }
  }
  function saveFailed(): void {
    writable = false;
    reportFailure?.('saveFailed');
  }
  const guardedStorage: PersistStorage<PersistedScientificState> = {
    getItem: (name) => {
      writable = false;
      try {
        const raw = storage.getItem(name);
        return raw instanceof Promise
          ? raw.then(read, () => blocked('unavailable'))
          : read(raw);
      } catch {
        return blocked('unavailable');
      }
    },
    setItem: (name, value) => {
      if (!writable) return;
      try {
        const raw = JSON.stringify({
          state: { environment: value.state.environment },
          version: 1,
        });
        if (raw.length > MAX_SCIENTIFIC_STORAGE_LENGTH) {
          saveFailed();
          return;
        }
        const saved = storage.setItem(name, raw);
        if (saved instanceof Promise) return saved.catch(saveFailed);
      } catch {
        saveFailed();
      }
    },
    // persist.clearStorage is explicit; recovery itself never removes the original.
    removeItem: (name) => {
      try {
        const removed = storage.removeItem(name);
        if (removed instanceof Promise) return removed.catch(saveFailed);
      } catch {
        saveFailed();
      }
    },
  };
  const store = create<ScientificState>()(
    persist<ScientificState, [], [], PersistedScientificState>(
      (set) => ({
        environment: createEnvironment(),
        recovery: 'loading',
        commit: (environment) => set({ environment }),
        remove: (name) =>
          set((s) => ({ environment: removeDefinition(s.environment, name) })),
      }),
      {
        name: SCIENTIFIC_STORAGE_KEY,
        version: 1,
        storage: guardedStorage,
        partialize: (s) => ({ environment: s.environment, recovery: null }),
        merge: (persisted, current) => {
          const restored = persisted as PersistedScientificState;
          // Only the middleware's accepted hydration may unlock writes. A stale
          // asynchronous read must not change the gate after a newer retry.
          writable = restored.recovery === null;
          return {
            ...current,
            // A failed retry must also preserve the current in-memory session.
            environment: restored.recovery
              ? current.environment
              : restored.environment,
            recovery: restored.recovery,
          };
        },
      },
    ),
  );
  reportFailure = (recovery) => store.setState({ recovery });
  return store;
}
export const useScientificStore = createScientificStore({
  getItem: (name) => window.localStorage.getItem(name),
  setItem: (name, value) => window.localStorage.setItem(name, value),
  removeItem: (name) => window.localStorage.removeItem(name),
});
