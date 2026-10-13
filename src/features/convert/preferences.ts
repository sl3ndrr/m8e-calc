import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { safeStorage } from '../../shared/settingsStore';
import { isPair, pairKey, type UnitPair } from './model';
export interface ConvertPreferences {
  favorites: UnitPair[];
  recent: UnitPair[];
  digits: number;
  notation: 'auto' | 'sci' | 'eng';
  compound: boolean;
  sort: 'system' | 'size';
}
export function normalizePreferences(value: unknown): ConvertPreferences {
  const p = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const pairs = (v: unknown, limit: number): UnitPair[] => {
    const seen = new Set<string>();
    return (Array.isArray(v) ? v : []).filter(isPair).filter(pair => {
      const key = pairKey(pair);
      if (seen.has(key)) return false;
      seen.add(key); return true;
    }).slice(0, limit).map(({ categoryId, fromId, toId }) => ({ categoryId, fromId, toId }));
  };
  return {
    favorites: pairs(p.favorites, 100), recent: pairs(p.recent, 12),
    digits: typeof p.digits === 'number' && Number.isFinite(p.digits) ? Math.max(1, Math.min(50, Math.trunc(p.digits))) : 8,
    notation: p.notation === 'sci' || p.notation === 'eng' ? p.notation : 'auto',
    compound: p.compound === true, sort: p.sort === 'size' ? 'size' : 'system',
  };
}
interface PreferencesState extends ConvertPreferences {
  update: (patch: Partial<ConvertPreferences>) => void;
  toggleFavorite: (pair: UnitPair) => void;
  remember: (pair: UnitPair) => void;
}
export function createConvertStore(storage: StateStorage) {
  return create<PreferencesState>()(persist((set) => ({
    ...normalizePreferences(null),
    update: patch => set(state => normalizePreferences({ ...state, ...patch })),
    toggleFavorite: pair => {
      if (!isPair(pair)) return;
      set(state => normalizePreferences({ ...state, favorites: state.favorites.some(p => pairKey(p) === pairKey(pair)) ? state.favorites.filter(p => pairKey(p) !== pairKey(pair)) : [...state.favorites, pair] }));
    },
    remember: pair => {
      if (!isPair(pair)) return;
      set(state => normalizePreferences({ ...state, recent: [pair, ...state.recent.filter(p => pairKey(p) !== pairKey(pair))] }));
    },
  }), {
    name: 'm8e-calc.convert', version: 1,
    storage: createJSONStorage(() => safeStorage(() => storage)),
    partialize: normalizePreferences,
    migrate: (value, version) => normalizePreferences(version === 1 ? value : null),
    merge: (persisted, current) => ({ ...current, ...normalizePreferences(persisted) }),
  }));
}
export const useConvertStore = createConvertStore(safeStorage(() => window.localStorage));
