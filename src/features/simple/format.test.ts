import { expect, it } from 'vitest';
import { displayNumber, parsePastedNumber, numberLocale } from './format';
const comma = { decimalSeparator: 'comma', grouping: true } as const;
const point = { decimalSeparator: 'point', grouping: false } as const;
it.each([
  ['12345.6', '12.345,6'],
  ['0.3', '0,3'],
  ['10000000000000000', '1e+16'],
  ['0.00000001', '1e-8'],
])('formats %s in German as %s', (value, expected) =>
  expect(displayNumber(value, 'de', comma)).toBe(expected),
);
it('preserves trailing decimal input', () =>
  expect(displayNumber('1234.', 'de', comma, true)).toBe('1.234,'));
it('preserves fractional zeros', () =>
  expect(displayNumber('12.300', 'de', comma, true)).toBe('12,300'));
it('preserves negative zero', () =>
  expect(displayNumber('-0.', 'en', point, true)).toBe('-0.'));
it('formats 16 typed digits without rounding', () =>
  expect(displayNumber('1234567890123456', 'en', point, true)).toBe(
    '1234567890123456',
  ));
it('settings override UI language', () =>
  expect(numberLocale('de', point)).toBe('en-US'));
it.each([
  ['1.234,5', '1234.5'],
  ['-0,5', '-0.5'],
  ['1,5e3', '1500'],
  ['2+3', null],
  ['1.23,4', null],
  ['', null],
])('parses German numeric paste %s', (value, expected) =>
  expect(parsePastedNumber(value, 'de', comma)).toBe(expected),
);
it('rejects grouping when disabled', () =>
  expect(parsePastedNumber('1,234.5', 'en', point)).toBeNull());
