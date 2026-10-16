import { describe, expect, it } from 'vitest';
import {
  formatGraphNumber,
  graphInputText,
  parseGraphNumber,
  traceText,
} from './numbers';
const preferences = { decimalSeparator: 'auto' as const, grouping: true };
describe('graph numbers (display only)', () => {
  it.each([0, 2, 6, 12])('limits fractions to %i without padding', (digits) => {
    expect(formatGraphNumber(1 / 3, 'en', preferences, digits)).toBe(
      digits === 0 ? '0' : '0.' + '3'.repeat(digits),
    );
    expect(formatGraphNumber(-1 / 3, 'de', preferences, digits)).toBe(
      digits === 0 ? '0' : '-0,' + '3'.repeat(digits),
    );
    expect(formatGraphNumber(1, 'de', preferences, digits)).toBe('1');
    expect(formatGraphNumber(1e-13, 'en', preferences, digits)).toBe('0');
    expect(formatGraphNumber(-0, 'en', preferences, digits)).toBe('0');
  });
  it('keeps tiny nonzero and large finite values visible in Auto', () => {
    expect(formatGraphNumber(1e-13, 'de', preferences)).toBe('1E-13');
    expect(formatGraphNumber(-1e-13, 'en', preferences)).toBe('-1E-13');
    expect(formatGraphNumber(Number.MIN_VALUE, 'de', preferences)).not.toBe(
      '0',
    );
    expect(formatGraphNumber(Number.MAX_VALUE, 'en', preferences)).toContain(
      'E308',
    );
    expect(formatGraphNumber(1 / 3, 'de', preferences)).toBe('0,333333333333');
    expect(formatGraphNumber(-0, 'de', preferences)).toBe('0');
  });
  it.each([NaN, Infinity, -Infinity, undefined])(
    'shows gaps for %s',
    (value) => {
      expect(formatGraphNumber(value, 'de', preferences)).toBe('—');
    },
  );
  it('honours separator override and grouping', () => {
    expect(
      formatGraphNumber(1234.5, 'en', {
        decimalSeparator: 'comma',
        grouping: true,
      }),
    ).toBe('1.234,5');
    expect(
      formatGraphNumber(1234.5, 'de', {
        decimalSeparator: 'point',
        grouping: false,
      }),
    ).toBe('1234.5');
  });
  it.each(['explicit', 'vertical', 'parametric', 'polar'] as const)(
    'labels %s coordinates',
    (kind) => {
      const text = traceText(
        { id: 'a', u: 0.1, point: { x: 1234.5, y: 1e-13 } },
        kind,
        'de',
        preferences,
      );
      expect(text).toContain('x = 1.234,5 · y = 1E-13');
      expect(text).not.toContain('f(x)');
      if (kind === 'parametric') expect(text).toContain('t = 0,1');
      if (kind === 'polar') expect(text).toContain('θ = 0,1');
    },
  );
});
describe('graph single numeric fields', () => {
  it.each([
    '',
    ' ',
    '+',
    '-',
    ',',
    '1e',
    '1e-',
    'Infinity',
    'NaN',
    '1,23,4',
    '12.34,5',
    'min(1,2)',
    '1e309',
    '1e-999',
  ])('rejects %j', (text) => {
    expect(parseGraphNumber(text, 'de', preferences)).toBeNull();
  });
  it('parses locale, overrides, exponents and signed values through the existing parser', () => {
    expect(parseGraphNumber('0,1', 'de', preferences)).toBe(0.1);
    expect(parseGraphNumber('0.1', 'en', preferences)).toBe(0.1);
    expect(
      parseGraphNumber('0,1', 'en', {
        ...preferences,
        decimalSeparator: 'comma',
      }),
    ).toBe(0.1);
    expect(
      parseGraphNumber('0.1', 'de', {
        ...preferences,
        decimalSeparator: 'point',
      }),
    ).toBe(0.1);
    expect(parseGraphNumber('1.234,5', 'de', preferences)).toBe(1234.5);
    expect(
      parseGraphNumber('1.234,5', 'de', { ...preferences, grouping: false }),
    ).toBeNull();
    expect(parseGraphNumber(' -1,2e-3 ', 'de', preferences)).toBe(-0.0012);
    expect(parseGraphNumber('0', 'de', preferences)).toBe(0);
    expect(parseGraphNumber('-0,1', 'de', preferences)).toBe(-0.1);
  });
  it.each([1 / 3, 1e-13, Number.MAX_VALUE, -2, 0.1])(
    'editable text round-trips %s without display rounding',
    (value) => {
      expect(
        parseGraphNumber(
          graphInputText(value, 'de', preferences),
          'de',
          preferences,
        ),
      ).toBe(value);
    },
  );
});
