import { formatNumber, parseLocalizedNumber } from '../../engine/format';
import { numberValue } from '../../engine/numeric';
import type { Locale, NumberPreferences } from '../../shared/i18n';
import type { SimpleState } from './model';

export function numberLocale(
  locale: Locale,
  preferences: NumberPreferences,
): string {
  return preferences.decimalSeparator === 'comma'
    ? 'de-DE'
    : preferences.decimalSeparator === 'point'
      ? 'en-US'
      : locale;
}
export function displayNumber(
  value: string,
  locale: Locale,
  preferences: NumberPreferences,
  editing = false,
): string {
  const parsed = numberValue(value);
  if (!parsed.ok) return value;
  const formatted = formatNumber(parsed.value, {
    locale: numberLocale(locale, preferences),
    grouping: preferences.grouping,
    digits: editing ? 16 : 15,
    notation: editing && !/e/i.test(value) ? 'fixed' : 'auto',
  });
  if (!editing || /e/i.test(value)) return formatted;
  const decimal = numberLocale(locale, preferences).startsWith('de')
    ? ','
    : '.';
  const fraction = value.split('.')[1];
  const padded =
    fraction === undefined
      ? formatted
      : formatted.includes(decimal)
        ? formatted.padEnd(
            formatted.length +
              fraction.length -
              (formatted.split(decimal)[1]?.length ?? 0),
            '0',
          )
        : formatted + decimal + fraction;
  return value.startsWith('-') && parsed.value.value.isZero()
    ? '-' + padded
    : padded;
}
export function displayExpression(
  expression: string,
  locale: Locale,
  preferences: NumberPreferences,
): string {
  return expression
    .replace(/\((\d+(?:\.\d*)?(?:e[+-]?\d+)?)\)/gi, '$1')
    .replace(/\d+(?:\.\d*)?(?:e[+-]?\d+)?/gi, (value) =>
      displayNumber(value, locale, preferences),
    )
    .replaceAll('*', '×')
    .replaceAll('/', '÷')
    .replaceAll('-', '−')
    .replaceAll('sqrt', '√');
}
export function displayState(
  state: SimpleState,
  locale: Locale,
  preferences: NumberPreferences,
): string {
  return displayNumber(
    state.entry.value,
    locale,
    preferences,
    state.phase === 'entry' && state.entry.expression === state.entry.value,
  );
}
/** Paste a single number using the selected separators; no expression execution. */
export function parsePastedNumber(
  text: string,
  locale: Locale,
  preferences: NumberPreferences,
): string | null {
  const parsed = parseLocalizedNumber(text, {
    locale: numberLocale(locale, preferences),
    grouping: preferences.grouping,
  });
  return parsed.ok ? parsed.value.value.toString() : null;
}
