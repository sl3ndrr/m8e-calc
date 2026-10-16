import { parseLocalizedNumber } from '../../engine';
import type { Locale, NumberPreferences } from '../../shared/i18n';
import type { Curve } from '../../graph';
import type { Trace } from './model';

export type GraphRounding = 'auto' | number;
export function graphNumberLocale(locale: Locale, preferences: NumberPreferences): string {
  return preferences.decimalSeparator === 'comma' ? 'de' : preferences.decimalSeparator === 'point' ? 'en' : locale;
}
/** Display only: at most 12 significant digits in Auto, never padded precision. */
export function formatGraphNumber(value: number | undefined, locale: Locale, preferences: NumberPreferences, rounding: GraphRounding = 'auto'): string {
  if (value === undefined || !Number.isFinite(value)) return '—';
  const auto = rounding === 'auto';
  const scientific = auto && value !== 0 && (Math.abs(value) < 1e-6 || Math.abs(value) >= 1e12);
  const formatter = new Intl.NumberFormat(graphNumberLocale(locale, preferences), {
    useGrouping: scientific ? false : preferences.grouping,
    notation: scientific ? 'scientific' : 'standard',
    ...(auto ? { maximumSignificantDigits: 12 } : { maximumFractionDigits: rounding }),
  });
  const parts = formatter.formatToParts(value);
  const zero = parts.filter((p) => p.type === 'integer' || p.type === 'fraction').every((p) => /^0+$/.test(p.value));
  return parts.filter((p) => !(zero && p.type === 'minusSign')).map((p) => p.value).join('');
}
/** Single numeric fields only; formulas retain their existing comma grammar. */
export function parseGraphNumber(text: string, locale: Locale, preferences: NumberPreferences): number | null {
  const result = parseLocalizedNumber(text, { locale: graphNumberLocale(locale, preferences), grouping: preferences.grouping });
  if (!result.ok) return null;
  const value = result.value.value.toNumber();
  return Number.isFinite(value) && (value !== 0 || result.value.value.isZero()) ? value : null;
}
/** Unrounded editable text must round-trip, independently of display precision. */
export function graphInputText(value: number, locale: Locale, preferences: NumberPreferences): string {
  const text = String(value);
  return graphNumberLocale(locale, preferences) === 'de' ? text.replace('.', ',') : text;
}
export function traceText(trace: Trace, kind: Curve['kind'], locale: Locale, preferences: NumberPreferences): string {
  const number = (v: number) => formatGraphNumber(v, locale, preferences);
  const parameter = kind === 'parametric' ? `t = ${number(trace.u)} · ` : kind === 'polar' ? `θ = ${number(trace.u)} · ` : '';
  return `${parameter}x = ${number(trace.point.x)} · y = ${number(trace.point.y)}`;
}
