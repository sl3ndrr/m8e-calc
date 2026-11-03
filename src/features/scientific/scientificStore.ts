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
import {
  DefinitionBackupError,
  prepareDefinitionReplacement,
} from './definitionBackup';
import {
  MAX_SCIENTIFIC_STORAGE_LENGTH,
  scientificStorageEnvelope,
} from './scientificPersistence';
export { MAX_SCIENTIFIC_STORAGE_LENGTH } from './scientificPersistence';

export const SCIENTIFIC_STORAGE_KEY = 'm8e-calc.scientific';
export type DefinitionImportResult =
  | 'ok'
  | 'locked'
  | 'stale'
  | 'busy'
  | 'invalid'
  | 'version'
  | 'tooLarge'
  | 'storageLimit'
  | 'saveFailed';
export type ScientificRecovery =
  'loading' | 'invalid' | 'unavailable' | 'saveFailed' | null;
interface PersistedScientificState {
  environment: Environment;
  recovery: ScientificRecovery;
}
interface ScientificState extends PersistedScientificState {
  revision: number;
  importing: boolean;
  replaceDefinitions: (
    revision: number,
    backup: unknown,
  ) => Promise<DefinitionImportResult>;
  commitIfCurrent: (revision: number, environment: Environment) => boolean;
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
  let silent = false;
  let pendingWrites = 0;
  let replacementActive = false;
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
      // Do not launch a read that could arrive after the replacement and restore
      // old definitions. merge ignores this synchronous result during the lock.
      if (replacementActive) return blocked('loading');
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
      if (!writable || silent) return;
      try {
        const raw = scientificStorageEnvelope(value.state.environment);
        const saved = storage.setItem(name, raw);
        if (saved instanceof Promise) {
          pendingWrites++;
          return saved.catch(saveFailed).finally(() => {
            pendingWrites--;
          });
        }
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
      (set, get) => ({
        revision: 0,
        importing: false,
        replaceDefinitions: async (revision, backup) => {
          const current = get();
          if (current.importing || pendingWrites) return 'busy';
          if (!writable || current.recovery !== null) return 'locked';
          if (current.revision !== revision) return 'stale';
          let replacement: ReturnType<typeof prepareDefinitionReplacement>;
          try {
            replacement = prepareDefinitionReplacement(
              backup,
              current.environment,
            );
          } catch (error) {
            return error instanceof DefinitionBackupError
              ? error.code
              : 'invalid';
          }
          // Invalidate/terminate outstanding work before IO. Never publish imported
          // definitions until this separate storage operation has actually succeeded.
          replacementActive = true;
          sessionUpdate({ importing: true, revision: revision + 1 });
          try {
            const saved = storage.setItem(
              SCIENTIFIC_STORAGE_KEY,
              replacement.raw,
            );
            if (saved instanceof Promise) await saved;
          } catch {
            replacementActive = false;
            writable = false;
            sessionUpdate({ importing: false, recovery: 'saveFailed' });
            return 'saveFailed';
          }
          replacementActive = false;
          writable = true;
          sessionUpdate({
            environment: replacement.environment,
            importing: false,
            revision: revision + 2,
          });
          return 'ok';
        },
        commitIfCurrent: (revision, environment) => {
          if (
            get().revision !== revision ||
            get().recovery === 'loading' ||
            get().importing
          )
            return false;
          set({ environment, revision: revision + 1 });
          return true;
        },
        environment: createEnvironment(),
        recovery: 'loading',
        commit: (environment) => {
          if (!get().importing)
            set((s) => ({ environment, revision: s.revision + 1 }));
        },
        remove: (name) => {
          if (!get().importing)
            set((s) => ({
              environment: removeDefinition(s.environment, name),
              revision: s.revision + 1,
            }));
        },
      }),
      {
        name: SCIENTIFIC_STORAGE_KEY,
        version: 1,
        storage: guardedStorage,
        partialize: (s) => ({ environment: s.environment, recovery: null }),
        merge: (persisted, current) => {
          if (current.importing) return current;
          const restored = persisted as PersistedScientificState;
          // Only the middleware's accepted hydration may unlock writes. A stale
          // asynchronous read must not change the gate after a newer retry.
          writable = restored.recovery === null;
          return {
            ...current,
            revision: current.revision + 1,
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
  function sessionUpdate(next: Partial<ScientificState>): void {
    silent = true;
    try {
      store.setState(next);
    } finally {
      silent = false;
    }
  }
  const reportFailure = (recovery: ScientificRecovery): void => {
    store.setState({ recovery });
  };
  return store;
}
export const useScientificStore = createScientificStore({
  getItem: (name) => window.localStorage.getItem(name),
  setItem: (name, value) => window.localStorage.setItem(name, value),
  removeItem: (name) => window.localStorage.removeItem(name),
});
