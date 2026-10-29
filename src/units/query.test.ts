import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { convert, createUnitsEngine, parseQuery, UnitError } from './index.ts';
import { UDecimal } from './decimal.ts';
import type { Category } from './types.ts';

// Alternative registries are part of the public API. Multiword symbols can
// produce real competing interpretations that the standard catalogue cannot.
function registry(symbols: readonly string[]): readonly Category[] {
  return [
    {
      id: 'test',
      names: { de: 'Test', en: 'Test' },
      baseUnitId: 'u0',
      units: symbols.map((symbol, i) => ({
        id: `u${i}`,
        symbol,
        names: { de: symbol, en: symbol },
        aliases: [],
        system: 'other',
        source: 'Parser test definition',
        exact: true,
        conversion: { kind: 'linear', factor: String(i + 1) },
      })),
    },
  ];
}

describe.each(['de', 'en'])('conversion query boundaries in %s', (locale) => {
  it.each([
    ['1 in to cm', '2.54'],
    ['1 in in cm', '2.54'],
    ['3 ft 4 in to cm', '101.6'],
    ['3 ft 4 in in cm', '101.6'],
    ['1 in nach cm', '2.54'],
    ['1 in -> cm', '2.54'],
    ['3 ft 4 in → cm', '101.6'],
    ['-3 ft 4 in to cm', '-101.6'],
  ])(
    'converts %s to the independently known centimetre value',
    (text, want) => {
      const parsed = parseQuery(text, locale);
      expect(parsed.toId).toBe('cm');
      expect(convert(parsed.value, parsed.fromId, 'cm').toString()).toBe(want);
    },
  );

  it('preserves no-target inches, ordinary connectors and SI symbol case', () => {
    expect(parseQuery('1 in', locale).fromId).toBe('in');
    expect(parseQuery('1 in', locale).toId).toBeUndefined();
    expect(parseQuery('3 ft 4 in', locale).toId).toBeUndefined();
    for (const connector of ['in', 'to', 'nach', '->', '→']) {
      const parsed = parseQuery(`5 km ${connector} mi`, locale);
      expect(parsed).toMatchObject({ fromId: 'km', toId: 'mi' });
      expect(convert(parsed.value, parsed.fromId, 'm').toString()).toBe('5000');
    }
    expect(parseQuery('1 mA to MA', locale)).toMatchObject({
      fromId: 'A-m',
      toId: 'A-M',
    });
    expect(() => parseQuery('1 mA in ma', locale)).toThrow(
      expect.objectContaining({ code: 'E_UNIT_AMBIGUOUS' }),
    );
  });

  it('retains localized decimals, digit-bearing units and affine rules', () => {
    const parsed = parseQuery(
      `${locale === 'de' ? '1,5' : '1.5'} in TO cm`,
      locale,
    );
    expect(convert(parsed.value, parsed.fromId, 'cm').toString()).toBe('3.81');
    expect(parseQuery('5 L/100 km to mpg US', locale)).toMatchObject({
      fromId: 'L-100km',
      toId: 'mpg-us',
    });
    expect(parseQuery('2 m2 nach cm2', locale)).toMatchObject({
      fromId: 'm2',
      toId: 'cm2',
    });
    const temperature = parseQuery('-40 °C to °F', locale);
    expect(
      convert(temperature.value, temperature.fromId, 'degF').toString(),
    ).toBe('-40');
    for (const [text, code] of [
      ['3 °C 4 °F to K', 'E_UNIT_COMPOUND'],
      ['3 ft -4 in to cm', 'E_UNIT_COMPOUND'],
      ['3 ft 4 s nach cm', 'E_UNIT_COMPOUND'],
      ['-1 K in °C', 'E_UNIT_DOMAIN'],
      ['0 L/100 km to mpg US', 'E_UNIT_DOMAIN'],
    ] as const)
      expect(() => parseQuery(text, locale)).toThrow(
        expect.objectContaining({ code }),
      );
  });

  it.each([
    '1 in to cm to mm',
    '1 in in cm nach mm',
    '1 in -> cm to mm',
    '1 in to cm -> mm',
    '1 in -> cm → mm',
    '2 km to ',
    '2 km in kg',
  ])('rejects invalid or multiple targets: %s', (text) => {
    expect(() => parseQuery(text, locale)).toThrow(UnitError);
  });

  it('detects competing valid splits and a competing no-target unit', () => {
    const engine = createUnitsEngine(
      registry(['a', 'b', 'c', 'a in b', 'b to c']),
    );
    for (const text of ['1 a in b to c', '1 a in b'])
      expect(() => engine.parseQuery(text, locale)).toThrow(
        expect.objectContaining({ code: 'E_UNIT_AMBIGUOUS' }),
      );
    expect(engine.parseQuery('1 a in b -> c', locale)).toMatchObject({
      fromId: 'u3',
      toId: 'u2',
    });
    expect(engine.parseQuery('1 a -> b to c', locale)).toMatchObject({
      fromId: 'u0',
      toId: 'u4',
    });
  });

  it('never uses a different split to conceal ambiguous unit names', () => {
    const engine = createUnitsEngine(
      registry(['m', 'mA', 'MA', 'm in ma', 'ma in m']),
    );
    for (const text of ['1 m in ma', '1 ma in m'])
      expect(() => engine.parseQuery(text, locale)).toThrow(
        expect.objectContaining({ code: 'E_UNIT_AMBIGUOUS' }),
      );
    const names = createUnitsEngine(registry(['a', 'b', 'a in b', 'A IN B']));
    expect(() => names.parseQuery('1 a In b', locale)).toThrow(
      expect.objectContaining({ code: 'E_UNIT_AMBIGUOUS' }),
    );
  });

  it('bounds candidates and input length without truncating a valid query', () => {
    expect(parseQuery('1 in'.padEnd(4096), locale).fromId).toBe('in');
    expect(() => parseQuery('1 in'.padEnd(4097), locale)).toThrow(
      expect.objectContaining({ code: 'E_UNIT_QUERY' }),
    );
    const atLimit = 'base' + ' in'.repeat(32) + ' end';
    const overLimit = 'base' + ' in'.repeat(33) + ' end';
    const engine = createUnitsEngine(registry(['base', atLimit, overLimit]));
    expect(engine.parseQuery(`1 ${atLimit}`, locale).fromId).toBe('u1');
    expect(() => engine.parseQuery(`1 ${overLimit}`, locale)).toThrow(
      expect.objectContaining({ code: 'E_UNIT_QUERY' }),
    );
    expect(engine.parseQuery(`1 ${overLimit} -> base`, locale)).toMatchObject({
      fromId: 'u2',
      toId: 'u0',
    });
  });

  it('agrees with the international inch definition for generated compound lengths', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 0, max: 11 }),
        fc.constantFrom('in', 'to', 'nach', '->', '→'),
        (feet, inches, connector) => {
          const parsed = parseQuery(
            `${feet} ft ${inches} in ${connector} cm`,
            locale,
          );
          // 1 international inch = 2.54 cm; use the existing domain tolerance.
          const want = new UDecimal((feet * 12 + inches) * 254).div(100);
          expect(
            convert(parsed.value, parsed.fromId, 'cm')
              .minus(want)
              .abs()
              .lte(want.abs().plus(1).mul('1e-65')),
          ).toBe(true);
        },
      ),
      { numRuns: 100, seed: 6006 },
    );
  });
});
