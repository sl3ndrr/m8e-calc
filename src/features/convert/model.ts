import { parseLocalizedNumber } from '../../engine';
import {
  categories, convert, convertAll, formatQuantity, formatCompound,
  normalizeUnitText, parseQuery, UnitError,
  type Category, type Unit, type UnitErrorCode, type QuantityFormatOptions,
} from '../../units';
import type { HistoryEntry, JsonValue } from '../../shared/history';
import type { Locale, NumberPreferences } from '../../shared/i18n';

export interface UnitPair { categoryId: string; fromId: string; toId: string }
export interface ConvertState extends UnitPair {
  value: string;
  draft: { side: 'from' | 'to'; text: string } | null;
  error: UnitErrorCode | null;
  revision: number;
  swaps: number;
}
export const initialConvertState = (): ConvertState => ({
  categoryId: 'length', fromId: 'km', toId: 'mi', value: '0',
  draft: null, error: null, revision: 0, swaps: 0,
});
export function categoryFor(id: string): Category {
  const category = categories.find(c => c.id === id);
  if (!category) throw new UnitError('E_UNIT_CATEGORY', 'Unknown category');
  return category;
}
export function unitFor(id: string): Unit {
  const unit = categories.flatMap(c => c.units).find(u => u.id === id);
  if (!unit) throw new UnitError('E_UNIT_UNKNOWN', 'Unknown unit');
  return unit;
}
export const pairKey = (pair: UnitPair): string => `${pair.categoryId}:${pair.fromId}:${pair.toId}`;
export function isPair(value: unknown): value is UnitPair {
  if (!value || typeof value !== 'object') return false;
  const p = value as Record<string, unknown>;
  const c = categories.find(c => c.id === p.categoryId);
  return !!c && c.units.some(u => u.id === p.fromId) && c.units.some(u => u.id === p.toId);
}
export function numberLocale(locale: Locale, preferences: NumberPreferences): string {
  return preferences.decimalSeparator === 'comma' ? 'de' : preferences.decimalSeparator === 'point' ? 'en' : locale;
}
export function parseInput(text: string, locale: string, grouping: boolean): string {
  const parsed = parseLocalizedNumber(text, { locale, grouping });
  if (!parsed.ok) throw new UnitError('E_UNIT_DOMAIN', 'Invalid input');
  return parsed.value.value.toString();
}
export const errorCode = (error: unknown): UnitErrorCode => error instanceof UnitError ? error.code : 'E_UNIT_DOMAIN';
export type ConvertAction =
  | { type: 'edit'; side: 'from' | 'to'; text: string; locale: string; grouping: boolean }
  | { type: 'category'; id: string }
  | { type: 'unit'; side: 'from' | 'to'; id: string }
  | { type: 'swap' }
  | { type: 'query'; text: string; locale: string }
  | { type: 'restore'; payload: unknown }
  | { type: 'pair'; pair: UnitPair };
export function restorePayload(payload: unknown): (UnitPair & { value: string }) | null {
  if (!isPair(payload) || !('value' in payload) || typeof payload.value !== 'string') return null;
  try { convert(payload.value, payload.fromId, payload.toId); return { categoryId: payload.categoryId, fromId: payload.fromId, toId: payload.toId, value: payload.value }; }
  catch { return null; }
}
export function convertReducer(state: ConvertState, action: ConvertAction): ConvertState {
  try {
    let next = { ...state, error: null };
    switch (action.type) {
      case 'edit': {
        const draft = { side: action.side, text: action.text };
        try {
          const input = parseInput(action.text, action.locale, action.grouping);
          const value = action.side === 'from' ? convert(input, state.fromId, state.fromId).toString() : convert(input, state.toId, state.fromId).toString();
          return { ...next, draft, value, revision: state.revision + 1 };
        } catch (e) { return { ...state, draft, error: errorCode(e) }; }
      }
      case 'category': {
        const c = categoryFor(action.id);
        if (c.id === state.categoryId) return state;
        next = { ...next, categoryId: c.id, fromId: c.baseUnitId, toId: c.units.find(u => u.id !== c.baseUnitId)?.id ?? c.baseUnitId, value: c.positiveOnly ? '1' : '0', draft: null };
        break;
      }
      case 'unit': {
        if (!categoryFor(state.categoryId).units.some(u => u.id === action.id)) return state;
        next = { ...next, [action.side === 'from' ? 'fromId' : 'toId']: action.id, draft: null };
        convert(next.value, next.fromId, next.toId);
        break;
      }
      case 'swap':
        if (state.error) return state;
        next = { ...next, fromId: state.toId, toId: state.fromId, value: convert(state.value, state.fromId, state.toId).toString(), draft: null, swaps: state.swaps + 1 };
        break;
      case 'query': {
        const q = parseQuery(action.text, action.locale);
        const c = categories.find(c => c.units.some(u => u.id === q.fromId));
        if (!c) return state;
        const toId = q.toId ?? (state.categoryId === c.id ? state.toId : c.baseUnitId);
        convert(q.value, q.fromId, toId);
        next = { ...next, categoryId: c.id, fromId: q.fromId, toId, value: q.value.toString(), draft: null };
        break;
      }
      case 'restore': {
        const restored = restorePayload(action.payload);
        return restored ? { ...next, ...restored, draft: null, revision: state.revision + 1 } : state;
      }
      case 'pair':
        if (!isPair(action.pair)) return state;
        next = { ...next, ...action.pair, value: action.pair.categoryId === state.categoryId ? state.value : categoryFor(action.pair.categoryId).positiveOnly ? '1' : '0', draft: null };
        convert(next.value, next.fromId, next.toId);
        break;
    }
    return { ...next, revision: state.revision + 1 };
  } catch (e) { return { ...state, error: errorCode(e) }; }
}
export function filteredCategories(search: string, locale: Locale): readonly Category[] {
  const query = normalizeUnitText(search);
  return categories.filter(c => normalizeUnitText(c.names[locale]).includes(query));
}
export function sortedUnits(category: Category, sort: 'system' | 'size', locale: Locale): readonly Unit[] {
  return [...category.units].sort((a, b) => {
    if (sort === 'size') {
      const comparison = convert('1', a.id, category.baseUnitId).cmp(convert('1', b.id, category.baseUnitId));
      if (comparison) return comparison;
    } else if (a.system !== b.system) {
      const systems = ['si', 'imperial', 'us', 'other'];
      return systems.indexOf(a.system) - systems.indexOf(b.system);
    }
    return a.names[locale].localeCompare(b.names[locale], locale);
  });
}
export function quantity(value: string, unitId: string, options: QuantityFormatOptions): string {
  return formatQuantity(value, unitId, options);
}
export function numericText(value: string, unitId: string, options: QuantityFormatOptions): string {
  const symbol = unitFor(unitId).symbol;
  return quantity(value, unitId, options).slice(0, -(symbol.length + 1));
}
export function compoundText(state: ConvertState, locale: string): string | null {
  if (state.error) return null;
  if (state.categoryId === 'length') return formatCompound(state.value, state.fromId, ['ft', 'in'], { locale });
  if (state.categoryId === 'time') return formatCompound(state.value, state.fromId, ['h', 'min', 's'], { locale, style: 'clock' });
  return null;
}
export function resultsFor(state: ConvertState): Record<string, string> {
  if (state.error) return {};
  return Object.fromEntries(Object.entries(convertAll(state.value, state.fromId)).map(([id, value]) => [id, value.toString()]));
}
export function historyPayload(state: ConvertState): JsonValue {
  return { categoryId: state.categoryId, fromId: state.fromId, toId: state.toId, value: state.value };
}
export function historyDecision(state: ConvertState, latest?: HistoryEntry): 'skip' | 'replace' | 'add' {
  if (state.error || convert(state.value, state.fromId, state.fromId).isZero()) return 'skip';
  const previous = restorePayload(latest?.payload);
  if (previous && pairKey(previous) === pairKey(state)) return convert(previous.value, state.fromId, state.fromId).eq(state.value) ? 'skip' : 'replace';
  return 'add';
}
/** CSS-grid geometry, including incomplete last rows. */
export function categoryIndex(index: number, key: string, count: number, columns: number): number {
  if (!count) return 0;
  const delta = key === 'ArrowLeft' ? -1 : key === 'ArrowRight' ? 1 : key === 'ArrowUp' ? -columns : key === 'ArrowDown' ? columns : 0;
  return key === 'Home' ? 0 : key === 'End' ? count - 1 : (index + delta + count) % count;
}
