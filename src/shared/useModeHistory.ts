import { useCallback, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useHistoryStore } from './historyStore';
import type { HistoryEntry, NewHistoryEntry } from './history';
import type { ModeId } from './modes';
import type { RestoreCallback } from './historyAdapter';
import { getMode } from '../app/modeRegistry';
/** Pass a stable callback (useCallback) to register feature restoration while mounted. */
export function useModeHistory(mode: ModeId, onRestore?: RestoreCallback) {
  const entries = useHistoryStore(useShallow(state => state.entries.filter(e => e.mode === mode)));
  const adapter = getMode(mode).historyAdapter;
  useEffect(() => onRestore ? adapter.register(onRestore) : undefined, [adapter, onRestore]);
  const add = useCallback((entry: NewHistoryEntry) => useHistoryStore.getState().add(mode, entry), [mode]);
  const restore = useCallback((entry: HistoryEntry) => entry.mode === mode && adapter.restore(entry), [mode, adapter]);
  return { entries, add, restore };
}
