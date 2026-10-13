import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { safeStorage } from './settingsStore';
import { emptyHistory, HISTORY_KEY, HISTORY_VERSION, isHistoryEntry, normalizeHistory, migrateHistory, trimHistory, type HistoryData, type HistoryEntry, type NewHistoryEntry } from './history';
import type { ModeId } from './modes';
interface HistoryState extends HistoryData {
  add: (mode: ModeId, entry: NewHistoryEntry) => HistoryEntry;
  remove: (id: string) => void;
  togglePin: (id: string) => void;
  setVisible: (mode: ModeId, visible: boolean) => void;
  setLimit: (limit: number) => void;
  clear: (mode?: ModeId) => HistoryEntry[];
  restoreEntries: (entries: readonly HistoryEntry[]) => void;
  resetHistory: () => void;
}
export function createHistoryStore(storage: StateStorage, now: () => number = Date.now, id: () => string = () => crypto.randomUUID()) {
  return create<HistoryState>()(persist((set, get) => ({
    ...emptyHistory(),
    add: (mode, data) => {
      const entry: HistoryEntry = { ...data, id: id(), mode, ts: now(), pinned: false };
      if (!isHistoryEntry(entry)) throw new TypeError('Invalid history entry');
      // Snapshot payloads: subsequent feature edits must not mutate persisted history.
      const snapshot: HistoryEntry = JSON.parse(JSON.stringify(entry));
      set(state => ({ entries: trimHistory([snapshot, ...state.entries], state.limit) })); return snapshot;
    },
    remove: id => set(state => ({ entries: state.entries.filter(e => e.id !== id) })),
    togglePin: id => set(state => ({ entries: state.entries.map(e => e.id === id ? { ...e, pinned: !e.pinned } : e) })),
    setVisible: (mode, visible) => set(state => ({ visibility: { ...state.visibility, [mode]: visible } })),
    setLimit: limit => set(state => { const normalized = normalizeHistory({ ...state, limit }); return { limit: normalized.limit, entries: normalized.entries }; }),
    clear: mode => { const entries = get().entries.filter(e => !mode || e.mode === mode); set(state => ({ entries: state.entries.filter(e => mode && e.mode !== mode) })); return entries; },
    restoreEntries: entries => set(state => ({ entries: trimHistory([...state.entries, ...entries.filter(isHistoryEntry)], state.limit) })),
    resetHistory: () => set(emptyHistory()),
  }), { name: HISTORY_KEY, version: HISTORY_VERSION, storage: createJSONStorage(() => safeStorage(() => storage)), partialize: normalizeHistory, migrate: migrateHistory, merge: (persisted, current) => ({ ...current, ...normalizeHistory(persisted) }) }));
}
export const useHistoryStore = createHistoryStore(safeStorage(() => window.localStorage));
