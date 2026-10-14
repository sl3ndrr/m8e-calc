import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { fuzzyScore, fuzzySearch } from './fuzzySearch';
import { conversionCommand, searchPalette } from './paletteModel';
describe('fuzzy command search', () => {
  const items = [{ id: 'science', label: 'Wissenschaftlich' }, { id: 'settings', label: 'Einstellungen', keywords: 'settings' }, { id: 'simple', label: 'Einfach' }];
  it('matches subsequences, accents, case and aliases with stable ranking', () => {
    expect(fuzzySearch(items, 'wsch').map((r) => r.id)).toEqual(['science']);
    expect(fuzzySearch(items, 'SETTINGS')[0]?.id).toBe('settings');
    expect(fuzzyScore('cafe', 'Café')).not.toBeNull();
    expect(fuzzyScore('xyz', 'Einfach')).toBeNull();
    expect(fuzzySearch(items, '')).toEqual(items);
    expect(fuzzyScore('sin', 'sin(x)')).toBeGreaterThan(fuzzyScore('sin', 'some interesting name') ?? 0);
  });
  it('never mutates input and deterministically sorts arbitrary queries', () => {
    fc.assert(fc.property(fc.string(), (query) => {
      expect(fuzzySearch(items, query)).toEqual(fuzzySearch(items, query));
      expect(items.map((r) => r.id)).toEqual(['science', 'settings', 'simple']);
    }));
  });
  it('searches modes, actions, functions and constants in both languages', () => {
    for (const locale of ['de', 'en'] as const) {
      expect(searchPalette('sin', locale).some((c) => c.id === 'insert.sin')).toBe(true);
      expect(searchPalette('hbar', locale).some((c) => c.id === 'insert.hbar')).toBe(true);
      expect(searchPalette('theme', locale).some((c) => c.id === 'theme')).toBe(true);
      expect(searchPalette('graph', locale).some((c) => c.id === 'mode.graph')).toBe(true);
    }
  });
  it('evaluates conversions directly and rejects invalid pairs', () => {
    expect(conversionCommand('5 km in mi', 'de')?.label).toContain('3,106855961');
    expect(searchPalette('5 km in mi', 'en')[0]?.id).toBe('conversion');
    expect(conversionCommand('5 km in kg', 'de')).toBeNull();
    expect(conversionCommand('nonsense', 'en')).toBeNull();
  });
});
