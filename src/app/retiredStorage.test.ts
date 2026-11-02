import { expect, it, vi } from 'vitest';
import { clearRetiredStorage } from './retiredStorage';

it('removes retired caches while keeping settings and unrelated feature data', () => {
  const entries = new Map([
    ['m8e-calc.currency-rates', 'retired snapshot'],
    ['m8e-calc.currency-rates.last-attempt', '123'],
    ['m8e-calc.settings', 'settings'],
    ['m8e-calc.scientific', 'definitions'],
    ['m8e-calc.convert', 'favorites'],
  ]);
  const storage = { removeItem: (key: string) => entries.delete(key) };
  clearRetiredStorage(() => storage);
  clearRetiredStorage(() => storage);
  expect(Object.fromEntries(entries)).toEqual({
    'm8e-calc.settings': 'settings',
    'm8e-calc.scientific': 'definitions',
    'm8e-calc.convert': 'favorites',
  });
});

it('continues after an individual failure and tolerates denied storage access', () => {
  const removeItem = vi.fn((key: string) => {
    if (key.endsWith('currency-rates')) throw new Error('denied');
  });
  expect(() => clearRetiredStorage(() => ({ removeItem }))).not.toThrow();
  expect(removeItem).toHaveBeenCalledWith(
    'm8e-calc.currency-rates.last-attempt',
  );
  expect(() =>
    clearRetiredStorage(() => {
      throw new Error('unavailable');
    }),
  ).not.toThrow();
});
