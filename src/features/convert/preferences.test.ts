import { expect, it } from 'vitest';
import { createConvertStore, normalizePreferences } from './preferences';
const pair = { categoryId: 'length', fromId: 'km', toId: 'mi' };
it('validates storage and bounds preferences and pair collections', () => {
  const p = normalizePreferences({
    favorites: [pair, pair, { ...pair, toId: 'kg' }],
    recent: [pair],
    digits: 100,
    notation: 'bad',
    sort: 'size',
    compound: true,
  });
  expect(p.favorites).toEqual([pair]);
  expect(p.digits).toBe(50);
  expect(p.notation).toBe('auto');
  expect(normalizePreferences({ digits: NaN }).digits).toBe(8);
});
it('persists favorites, recent order and formatting and tolerates denied storage', () => {
  const data = new Map<string, string>();
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
  const store = createConvertStore(storage);
  store.getState().toggleFavorite(pair);
  store.getState().remember(pair);
  store.getState().remember({ ...pair, toId: 'm' });
  store.getState().update({ digits: 12, notation: 'eng' });
  const restored = createConvertStore(storage).getState();
  expect(restored.favorites).toEqual([pair]);
  expect(restored.recent.map((p) => p.toId)).toEqual(['m', 'mi']);
  expect(restored.digits).toBe(12);
  store.getState().toggleFavorite(pair);
  expect(store.getState().favorites).toEqual([]);
  const denied = createConvertStore({
    getItem: () => {
      throw Error('denied');
    },
    setItem: () => {
      throw Error('denied');
    },
    removeItem: () => {},
  });
  denied.getState().toggleFavorite(pair);
  expect(denied.getState().favorites).toEqual([pair]);
});
