import { expect, it } from 'vitest';
import fc from 'fast-check';
import { formatNumber, numberValue, parseLocalizedNumber } from './index.ts';
import type { FormatOptions } from './index.ts';

function formatted(src: string, options?: FormatOptions): string {
  const result = numberValue(src);
  if (!result.ok) throw new Error(src);
  return formatNumber(result.value, options);
}

it.each([
  ['0', {}, '0'],
  ['-0', {}, '0'],
  ['0.1', {}, '0.1'],
  ['1.234567890123456789', {}, '1.23456789012346'],
  ['999.999', { digits: 3 }, '1e+3'],
  ['0.000001', {}, '0.000001'],
  ['0.0000001', {}, '1e-7'],
  ['123456789012345', {}, '123456789012345'],
  ['1234567890123456', {}, '1.23456789012346e+15'],
  ['1.2345', { notation: 'fixed', digits: 3 }, '1.23'],
  ['1e-7', { notation: 'fixed' }, '0.0000001'],
  ['12345', { notation: 'sci', digits: 4 }, '1.235e+4'],
  ['0', { notation: 'sci' }, '0e+0'],
  ['12345', { notation: 'eng', digits: 4 }, '12.35e+3'],
  ['0.0012345', { notation: 'eng', digits: 4 }, '1.235e-3'],
  ['0.00012345', { notation: 'eng', digits: 4 }, '123.5e-6'],
  ['999999.9', { notation: 'eng', digits: 6 }, '1e+6'],
  ['1234567.89', { locale: 'de-DE', grouping: true }, '1.234.567,89'],
  ['1234567.89', { locale: 'en-US', grouping: true }, '1,234,567.89'],
  ['1234567.89', { locale: 'hi-IN', grouping: true }, '12,34,567.89'],
  ['1234567.89', { locale: 'fr-FR', grouping: true }, '1\u202f234\u202f567,89'],
  ['1234.5', { locale: 'ar-EG' }, '١٢٣٤٫٥'],
  ['1.2345', { digits: 0 }, '1.2345'],
] as const)('formats %s', (src, options, expected) => {
  expect(formatted(src, options)).toBe(expected);
});

it.each([
  ['0,5', 'de-DE', false, '0.5'],
  ['.5', 'en-US', false, '0.5'],
  ['1.234,5', 'de-DE', true, '1234.5'],
  ['1,234.5', 'en-US', true, '1234.5'],
  ['12,34,567.89', 'hi-IN', true, '1234567.89'],
  ['1\u202f234,5', 'fr-FR', true, '1234.5'],
  ['١٢٣٤٫٥', 'ar-EG', false, '1234.5'],
  [' −0,5 ', 'de-DE', false, '-0.5'],
  ['1,2e-3', 'de-DE', false, '0.0012'],
] as const)('parses localized %s', (src, locale, grouping, expected) => {
  const parsed = parseLocalizedNumber(src, { locale, grouping });
  expect(parsed.ok).toBe(true);
  if (parsed.ok) expect(parsed.value.value.toString()).toBe(expected);
});

it.each([
  '',
  '1.5',
  '1,2,3',
  '1.23,4',
  '1.234,5',
  'sqrt(4)',
  '1,5+2',
  '1,5e',
  'NaN',
  'Infinity',
])('rejects malformed/unapproved German input %s', (src) => {
  expect(parseLocalizedNumber(src, { locale: 'de-DE' })).toEqual({
    ok: false,
    error: {
      code: 'E_INVALID_LOCALIZED_NUMBER',
      range: { start: 0, end: src.length },
    },
  });
});

it('validates grouped locale structure rather than deleting separators', () => {
  for (const src of ['12.34,5', '1234.567,5', '.123,5', '1..234,5', '1,2.3']) {
    expect(
      parseLocalizedNumber(src, { locale: 'de-DE', grouping: true }).ok,
    ).toBe(false);
  }
});

it('formats large exact decimals without Number conversion', () => {
  expect(formatted('9007199254740993', { digits: 50, notation: 'fixed' })).toBe(
    '9007199254740993',
  );
  expect(formatted('1e1000', { notation: 'sci' })).toBe('1e+1000');
  expect(formatted('1e-1000', { notation: 'eng' })).toBe('100e-1002');
});

it('localized format-parse roundtrip retains an exactly representable input', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: -100000000, max: 100000000 }),
      fc.constantFrom('de-DE', 'en-US', 'hi-IN', 'fr-FR', 'ar-EG'),
      (integer, locale) => {
        const src = String(integer);
        const text = formatted(src, { locale, grouping: true });
        const result = parseLocalizedNumber(text, { locale, grouping: true });
        expect(result.ok, text).toBe(true);
        if (result.ok)
          expect(result.value.value.toString()).toBe(src === '-0' ? '0' : src);
      },
    ),
    { numRuns: 1000, seed: 5102026 },
  );
});
