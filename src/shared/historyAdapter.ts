import type { HistoryEntry } from './history';
/** Returns true once the mode accepts the entry and applies its state update. */
export type RestoreCallback = (entry: HistoryEntry) => boolean;
export interface HistoryAdapter {
  register: (callback: RestoreCallback) => () => void;
  restore: (entry: HistoryEntry) => boolean;
}
/** Registration is transient. Cleanup only removes its own registration (StrictMode-safe). */
export function createHistoryAdapter(): HistoryAdapter {
  let callback: RestoreCallback | undefined;
  return {
    register(next) {
      callback = next;
      return () => {
        if (callback === next) callback = undefined;
      };
    },
    restore(entry) {
      return callback?.(entry) ?? false;
    },
  };
}
