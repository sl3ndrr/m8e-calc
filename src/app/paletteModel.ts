import { parseQuery, convert, formatQuantity } from '../units';
import { t, type Locale } from '../shared/i18n';
import { completionEntries } from '../features/scientific/registry';
import { seeds } from '../styles/seeds';
import { modeIds } from '../shared/modes';
import { fuzzySearch, type SearchItem } from './fuzzySearch';
export interface PaletteCommand extends SearchItem { action: string; value?: string; detail?: string }
export function paletteCommands(locale: Locale): PaletteCommand[] {
  return [
    ...modeIds.map((mode) => ({ id: `mode.${mode}`, label: t(`mode.${mode}`, locale), keywords: mode, action: 'mode', value: mode })),
    ...(['theme', 'history', 'export', 'settings', 'presentation', 'shortcuts'] as const).map((action) => ({ id: action, label: t(`comfort.${action}`, locale), keywords: action, action })),
    ...seeds.map(([name, value]) => ({ id: `accent.${name}`, label: `${t('comfort.accent', locale)} · ${t(`seed.${name}`, locale)}`, keywords: name, action: 'accent', value })),
    ...completionEntries(locale).map((entry) => ({ id: `insert.${entry.name}`, label: `${entry.name} · ${entry.description}`, keywords: entry.signature, action: 'insert', value: entry.kind === 'function' ? `${entry.name}(` : entry.name, detail: entry.signature })),
  ];
}
export function conversionCommand(query: string, locale: Locale): PaletteCommand | null {
  try {
    if (query.length > 1000) return null;
    const q = parseQuery(query, locale);
    if (!q.toId) return null;
    const result = convert(q.value, q.fromId, q.toId);
    return { id: 'conversion', label: formatQuantity(result, q.toId, { locale, digits: 15 }), detail: query, action: 'conversion', value: query };
  } catch { return null; }
}
export function searchPalette(query: string, locale: Locale): PaletteCommand[] {
  const conversion = conversionCommand(query, locale);
  return [...(conversion ? [conversion] : []), ...fuzzySearch(paletteCommands(locale), query)].slice(0, 50);
}
