import { isModeId, type ModeId } from './modes';
import { formatDate, t, type Locale } from './i18n';
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export interface HistoryEntry { id: string; mode: ModeId; ts: number; input: string; result: string; pinned: boolean; payload: JsonValue }
export type NewHistoryEntry = Pick<HistoryEntry, 'input' | 'result' | 'payload'>;
export const HISTORY_KEY = 'm8e-calc.history';
export const HISTORY_VERSION = 1;
export function isJson(value: unknown, depth = 0): value is JsonValue {
  if (depth > 32) return false;
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(item => isJson(item, depth + 1));
  return typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype && Object.values(value).every(item => isJson(item, depth + 1));
}
export function isHistoryEntry(value: unknown): value is HistoryEntry {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === 'string' && v.id.length > 0 && isModeId(v.mode) && typeof v.ts === 'number' && Number.isFinite(v.ts) && v.ts >= 0 && v.ts <= 8640000000000000 && typeof v.input === 'string' && typeof v.result === 'string' && typeof v.pinned === 'boolean' && isJson(v.payload);
}
/** Pins survive ordinary eviction; an absolute cap still applies if all entries are pinned. */
export function trimHistory(entries: readonly HistoryEntry[], limit: number): HistoryEntry[] {
  const seen = new Set<string>();
  const count = Number.isFinite(limit) ? Math.max(1, Math.min(500, Math.trunc(limit))) : 500;
  const sorted = [...entries].sort((a,b) => Number(b.pinned) - Number(a.pinned) || b.ts - a.ts);
  return sorted.filter(entry => { if (seen.has(entry.id)) return false; seen.add(entry.id); return true; }).slice(0, count).sort((a,b) => b.ts - a.ts);
}
export interface HistoryData { entries: HistoryEntry[]; visibility: Record<ModeId, boolean>; limit: number }
export function emptyHistory(): HistoryData { return { entries: [], visibility: { simple: false, scientific: false, convert: false, graph: false }, limit: 500 }; }
export function normalizeHistory(value: unknown): HistoryData {
  const data = emptyHistory();
  if (typeof value !== 'object' || value === null) return data;
  const v = value as Record<string, unknown>;
  if (typeof v.limit === 'number' && Number.isFinite(v.limit)) data.limit = Math.max(1, Math.min(500, Math.trunc(v.limit)));
  if (Array.isArray(v.entries)) data.entries = trimHistory(v.entries.filter(isHistoryEntry), data.limit);
  if (typeof v.visibility === 'object' && v.visibility !== null) {
    const visibility = v.visibility as Record<string, unknown>;
    for (const mode of Object.keys(data.visibility) as ModeId[]) data.visibility[mode] = visibility[mode] === true;
  }
  return data;
}
/** v0 used timestamp instead of ts. Future versions are intentionally discarded. */
export function migrateHistory(value: unknown, version: number): HistoryData {
  if (version === HISTORY_VERSION) return normalizeHistory(value);
  if (version === 0 && typeof value === 'object' && value !== null && 'entries' in value && Array.isArray(value.entries)) return normalizeHistory({ ...value, entries: value.entries.map(entry => typeof entry === 'object' && entry !== null ? { payload: null, pinned: false, ...entry, ts: 'ts' in entry ? entry.ts : 'timestamp' in entry ? entry.timestamp : undefined } : entry) });
  return emptyHistory();
}
export interface HistoryGroup { day: string; label: string; entries: HistoryEntry[] }
function dayKey(ts: number): string { const date = new Date(ts); return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`; }
export function groupHistory(entries: readonly HistoryEntry[], search: string, locale: Locale, now = Date.now()): HistoryGroup[] {
  const groups = new Map<string, HistoryGroup>();
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  const query = search.trim().toLocaleLowerCase(locale);
  for (const entry of [...entries].sort((a,b) => b.ts - a.ts)) {
    if (!`${entry.input} ${entry.result}`.toLocaleLowerCase(locale).includes(query)) continue;
    const day = dayKey(entry.ts);
    const label = day === dayKey(now) ? t('history.today', locale) : day === dayKey(yesterday.getTime()) ? t('history.yesterday', locale) : formatDate(entry.ts, locale);
    const group = groups.get(day) ?? { day, label, entries: [] }; group.entries.push(entry); groups.set(day, group);
  }
  return [...groups.values()];
}
export type ExportFormat = 'json' | 'csv' | 'markdown';
export function exportHistory(entries: readonly HistoryEntry[], format: ExportFormat): string {
  if (format === 'json') return JSON.stringify({ version: HISTORY_VERSION, entries }, null, 2);
  if (format === 'csv') {
    // Quote every cell and neutralize spreadsheet formulas for safe human-readable exports.
    const cell = (v: string) => '"' + (/^[=+@\-\t\r]/.test(v) ? "'" + v : v).replaceAll('"','""') + '"';
    return '\ufeff' + ['id,mode,ts,input,result,pinned,payload', ...entries.map(e => [e.id,e.mode,new Date(e.ts).toISOString(),e.input,e.result,String(e.pinned),JSON.stringify(e.payload)].map(cell).join(','))].join('\r\n');
  }
  const escape = (v: string) => v.replaceAll('\\','\\\\').replaceAll('|','\\|').replace(/[\r\n]+/g,' ').replaceAll('<','&lt;').replaceAll('>','&gt;');
  return ['| Mode | Date | Input | Result | Pinned |','| --- | --- | --- | --- | --- |',...entries.map(e => `| ${e.mode} | ${new Date(e.ts).toISOString()} | ${escape(e.input)} | ${escape(e.result)} | ${e.pinned} |`)].join('\n');
}
