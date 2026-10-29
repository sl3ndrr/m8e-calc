import { describe, expect, it } from 'vitest';
import {
  categoryFor,
  categoryIndex,
  compoundText,
  convertReducer,
  filteredCategories,
  historyDecision,
  historyPayload,
  initialConvertState,
  isPair,
  numericText,
  parseInput,
  restorePayload,
  resultsFor,
  sortedUnits,
} from './model';
import type { HistoryEntry } from '../../shared/history';
const query = (text: string, locale = 'de') =>
  convertReducer(initialConvertState(), { type: 'query', text, locale });
describe('converter adapter', () => {
  it.each(['de', 'en'])(
    'keeps inch quick queries and errors atomic in %s',
    (locale) => {
      for (const [text, expected] of [
        ['1 in to cm', '2.54'],
        ['1 in in cm', '2.54'],
        ['3 ft 4 in to cm', '101.6'],
      ] as const) {
        const state = query(text, locale);
        expect(state.error).toBeNull();
        expect(state.toId).toBe('cm');
        expect(resultsFor(state).cm).toBe(expected);
      }
      const accepted = query('1 in to cm', locale);
      const noTarget = convertReducer(accepted, {
        type: 'query',
        text: '2 in',
        locale,
      });
      expect(noTarget.toId).toBe('cm');
      expect(resultsFor(noTarget).cm).toBe('5.08');
      for (const [text, code] of [
        ['1 mA in ma', 'E_UNIT_AMBIGUOUS'],
        ['1 in to cm to mm', 'E_UNIT_QUERY'],
      ] as const) {
        const rejected = convertReducer(accepted, {
          type: 'query',
          text,
          locale,
        });
        expect(rejected).toEqual({ ...accepted, error: code });
        expect(resultsFor(rejected)).toEqual({});
      }
    },
  );
  it('keeps exact values through conversion, target editing and swapping', () => {
    let state = query('5 km in mi');
    expect(resultsFor(state).m).toBe('5000');
    state = convertReducer(state, { type: 'swap' });
    expect(state.fromId).toBe('mi');
    expect(Number(resultsFor(state).km)).toBeCloseTo(5, 12);
    state = convertReducer(state, {
      type: 'edit',
      side: 'to',
      text: '10,5',
      locale: 'de',
      grouping: true,
    });
    expect(Number(resultsFor(state).km)).toBeCloseTo(10.5, 12);
    expect(state.draft).toEqual({ side: 'to', text: '10,5' });
  });
  it('parses localized numbers, paste grouping and exponents', () => {
    expect(parseInput('1.234,5', 'de', true)).toBe('1234.5');
    expect(parseInput('1,234.5', 'en', true)).toBe('1234.5');
    expect(parseInput('1,5e3', 'de', false)).toBe('1500');
    expect(() => parseInput('1.234,5', 'de', false)).toThrow();
  });
  it('applies quick queries and chooses a target for queries without one', () => {
    const state = query('72 °F -> °C');
    expect(state.categoryId).toBe('temperature');
    expect(state.toId).toBe('degC');
    expect(Number(resultsFor(state).degC)).toBeCloseTo(22.2222222, 6);
    expect(query('3 ft 4 in', 'en').fromId).toBe('ft');
    expect(query('2 h').toId).toBe('s');
    expect(query('5 km in kg').error).toBe('E_UNIT_UNKNOWN');
  });
  it('retains invalid drafts and never displays a stale result', () => {
    const state = convertReducer(query('5 km in mi'), {
      type: 'edit',
      side: 'from',
      text: 'oops',
      locale: 'de',
      grouping: true,
    });
    expect(state.draft?.text).toBe('oops');
    expect(resultsFor(state)).toEqual({});
    expect(convertReducer(state, { type: 'swap' })).toBe(state);
    expect(query('-1 K in °C').error).toBe('E_UNIT_DOMAIN');
    expect(query('0 L/100km in mpg').error).not.toBeNull();
  });
  it('restores only validated pairs and finite allowed values', () => {
    const state = query('5 km in mi');
    expect(restorePayload(historyPayload(state))).toEqual({
      categoryId: 'length',
      fromId: 'km',
      toId: 'mi',
      value: '5',
    });
    expect(
      restorePayload({
        categoryId: 'length',
        fromId: 'km',
        toId: 'kg',
        value: '5',
      }),
    ).toBeNull();
    expect(isPair({ categoryId: 'length', fromId: 'km', toId: 'mi' })).toBe(
      true,
    );
    expect(
      restorePayload({
        categoryId: 'length',
        fromId: 'km',
        toId: 'mi',
        value: 'NaN',
      }),
    ).toBeNull();
  });
  it('filters categories, sorts scale sizes and formats without changing stored precision', () => {
    expect(filteredCategories('laenge', 'de').map((c) => c.id)).toEqual([
      'length',
    ]);
    const units = sortedUnits(categoryFor('length'), 'size', 'de');
    expect(units[0]?.id).toBe('angstrom');
    expect(
      numericText('1234.567', 'm', { locale: 'de', digits: 6, grouping: true }),
    ).toBe('1.234,57');
    expect(compoundText(query('40 in -> ft'), 'en')).toBe('3 ft 4 in');
    expect(compoundText(query('3661.5 s in h', 'en'), 'en')).toBe('1:01:01.5');
  });
  it('skips zero and unchanged history; replaces consecutive pairs', () => {
    const state = query('5 km in mi');
    const latest: HistoryEntry = {
      id: '1',
      mode: 'convert',
      ts: 1,
      pinned: true,
      input: '',
      result: '',
      payload: historyPayload(state),
    };
    expect(historyDecision(initialConvertState())).toBe('skip');
    expect(historyDecision(state)).toBe('add');
    expect(historyDecision(state, latest)).toBe('skip');
    expect(historyDecision(query('6 km in mi'), latest)).toBe('replace');
    expect(historyDecision(query('6 km in m'), latest)).toBe('add');
    expect(historyDecision(query('0 km in mi'), latest)).toBe('skip');
  });
  it('moves through grid columns, wraps and handles the last row', () => {
    expect(categoryIndex(0, 'ArrowUp', 5, 2)).toBe(3);
    expect(categoryIndex(4, 'ArrowRight', 5, 2)).toBe(0);
    expect(categoryIndex(4, 'Home', 5, 2)).toBe(0);
    expect(categoryIndex(0, 'End', 5, 2)).toBe(4);
  });
});
