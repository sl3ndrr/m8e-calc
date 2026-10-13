import Decimal from 'decimal.js';
import type {
  FormatError,
  FormatOptions,
  LocalizedNumberOptions,
  NumberValue,
  Result,
} from './types.ts';
import { checkedNumber, D, MAX_SOURCE_LENGTH } from './numeric.ts';

interface LocaleInfo {
  readonly decimal: string;
  readonly group: string;
  readonly minus: string;
  readonly digits: readonly string[];
  readonly primary: number;
  readonly secondary: number;
}

const localeCache = new Map<string, LocaleInfo>();

function localeInfo(locale = 'en-US'): LocaleInfo {
  const cached = localeCache.get(locale);
  if (cached) return cached;
  let formatter: Intl.NumberFormat;
  try {
    formatter = new Intl.NumberFormat(locale, { useGrouping: true });
  } catch {
    formatter = new Intl.NumberFormat('en-US', { useGrouping: true });
  }
  const pattern = formatter.formatToParts(1234567890123.5);
  const integers = pattern.filter((part) => part.type === 'integer');
  const primary = Array.from(integers.at(-1)?.value ?? '000').length;
  const secondary = Array.from(integers.at(-2)?.value ?? '000').length;
  const info: LocaleInfo = {
    decimal: pattern.find((part) => part.type === 'decimal')?.value ?? '.',
    group: pattern.find((part) => part.type === 'group')?.value ?? ',',
    minus:
      formatter.formatToParts(-1).find((part) => part.type === 'minusSign')
        ?.value ?? '-',
    digits: Array.from(
      { length: 10 },
      (_, n) =>
        formatter.formatToParts(n).find((part) => part.type === 'integer')
          ?.value ?? String(n),
    ),
    primary,
    secondary,
  };
  if (localeCache.size >= 32) localeCache.clear();
  localeCache.set(locale, info);
  return info;
}

function groupInteger(integer: string, info: LocaleInfo): string {
  const groups: string[] = [];
  let end = integer.length;
  let size = info.primary;
  while (end > 0) {
    groups.unshift(integer.slice(Math.max(0, end - size), end));
    end -= size;
    size = info.secondary;
  }
  return groups.join(info.group);
}

function localizeMantissa(
  mantissa: string,
  info: LocaleInfo,
  grouping: boolean,
): string {
  const negative = mantissa.startsWith('-');
  const unsigned = negative ? mantissa.slice(1) : mantissa;
  const [integer = '0', fraction] = unsigned.split('.');
  const grouped = grouping ? groupInteger(integer, info) : integer;
  const body =
    grouped + (fraction === undefined ? '' : info.decimal + fraction);
  return (
    (negative ? info.minus : '') +
    body.replace(/[0-9]/gu, (digit) => info.digits[Number(digit)] ?? digit)
  );
}

/** Display rounding only; digits always means significant digits. */
export function formatNumber(
  value: NumberValue | Decimal,
  options: FormatOptions = {},
): string {
  const digits =
    Number.isInteger(options.digits) &&
    (options.digits ?? 0) >= 1 &&
    (options.digits ?? 0) <= 50
      ? (options.digits ?? 15)
      : 15;
  const info = localeInfo(options.locale);
  const source = 'kind' in value ? value.value : value;
  const rounded = new D(source).toSignificantDigits(
    digits,
    Decimal.ROUND_HALF_UP,
  );
  const numeric = rounded.isZero() ? new D(0) : rounded;
  let notation = options.notation ?? 'auto';
  if (notation === 'auto')
    notation = numeric.e >= -6 && numeric.e < digits ? 'fixed' : 'sci';
  if (notation === 'fixed')
    return localizeMantissa(numeric.toFixed(), info, options.grouping ?? false);
  if (notation === 'sci') {
    const [mantissa = '0', exponent = '+0'] = numeric
      .toExponential()
      .split('e');
    return `${localizeMantissa(mantissa, info, false)}e${exponent}`;
  }
  const exponent = numeric.isZero() ? 0 : Math.floor(numeric.e / 3) * 3;
  const mantissa = numeric.div(new D(10).pow(exponent)).toFixed();
  return `${localizeMantissa(mantissa, info, false)}e${exponent >= 0 ? '+' : ''}${exponent}`;
}

/** A single localized numeric field, never a whole calculator expression. */
export function parseLocalizedNumber(
  src: string,
  options: LocalizedNumberOptions = {},
): Result<NumberValue, FormatError> {
  const range = { start: 0, end: src.length };
  const invalid = (): Result<never, FormatError> => ({
    ok: false,
    error: { code: 'E_INVALID_LOCALIZED_NUMBER', range },
  });
  try {
    if (src.length > MAX_SOURCE_LENGTH)
      return { ok: false, error: { code: 'E_RESOURCE_LIMIT', range } };
    const info = localeInfo(options.locale);
    let text = src
      .trim()
      .replace(/[\u061c\u200e\u200f]/gu, '')
      .replaceAll('−', '-');
    if (info.minus !== '-') text = text.replaceAll(info.minus, '-');
    for (let i = 0; i < info.digits.length; i++) {
      const digit = info.digits[i];
      if (digit !== undefined && digit !== String(i))
        text = text.replaceAll(digit, String(i));
    }
    const match = /^([+-]?)([^eE]+)(?:[eE]([+-]?\d+))?$/u.exec(text);
    if (!match) return invalid();
    const sign = match[1] ?? '';
    const body = match[2] ?? '';
    const exponent = match[3];
    const parts = body.split(info.decimal);
    if (parts.length > 2) return invalid();
    let integer = parts[0] ?? '';
    const fraction = parts[1];
    if (fraction !== undefined && !/^\d*$/u.test(fraction)) return invalid();
    if (integer.includes(info.group)) {
      if (!options.grouping) return invalid();
      const groups = integer.split(info.group);
      if (groups.some((group) => !/^\d+$/u.test(group))) return invalid();
      if ((groups.at(-1)?.length ?? 0) !== info.primary) return invalid();
      if (
        (groups[0]?.length ?? 0) < 1 ||
        (groups[0]?.length ?? 0) > info.secondary
      )
        return invalid();
      if (groups.slice(1, -1).some((group) => group.length !== info.secondary))
        return invalid();
      integer = groups.join('');
    }
    const normalized =
      sign +
      integer +
      (fraction === undefined ? '' : '.' + fraction) +
      (exponent === undefined ? '' : 'e' + exponent);
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/u.test(normalized))
      return invalid();
    const parsed = checkedNumber(normalized, range);
    if (parsed.ok) return parsed;
    return parsed.error.code === 'E_OVERFLOW'
      ? { ok: false, error: { code: 'E_OVERFLOW', range } }
      : invalid();
  } catch {
    return invalid();
  }
}
