import type { HistoryEntry } from './history';
export type RestoreCallback = (entry: HistoryEntry) => void;
export interface HistoryAdapter {
  register: (callback: RestoreCallback) => () => void;
  restore: (entry: HistoryEntry) => boolean;
}
/** Registration is transient. Cleanup only removes its own registration (StrictMode-safe). */
export function createHistoryAdapter(): HistoryAdapter {
  let callback: RestoreCallback | undefined;
  return {
    register(next) { callback = next; return () => { if (callback === next) callback = undefined; }; },
    restore(entry) { if (!callback) return false; callback(entry); return true; },
  };
}
