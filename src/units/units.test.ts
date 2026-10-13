import Decimal from 'decimal.js';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  categories,
  convert,
  convertAll,
  createUnitsEngine,
  formatCompound,
  formatQuantity,
  parseQuery,
  searchUnits,
  UnitError,
} from './index.ts';
import { UDecimal } from './decimal.ts';
import { referenceCases } from './referenceCases.ts';

function close(actual: Decimal, expected: Decimal.Value, tolerance = '1e-65') {
  const want = new UDecimal(expected);
  expect(actual.minus(want).abs().lte(want.abs().add(1).mul(tolerance))).toBe(
    true,
  );
}
describe('source-backed references', () => {
  it('contains at least 200 independent, attributed cases', () => {
    expect(referenceCases.length).toBeGreaterThanOrEqual(200);
    expect(
      new Set(referenceCases.map((c) => c.slice(0, 4).join('|'))).size,
    ).toBe(referenceCases.length);
    expect(referenceCases.every((c) => c[4])).toBe(true);
  });
  it.each(referenceCases)('%s %s -> %s = %s', (value, from, to, expected) => {
    close(convert(value, from, to), expected, '1e-45');
  });
});
describe('all category pairs (fast-check)', () => {
  for (const category of categories) {
    it(`${category.id}: every ordered pair, finite fractional magnitudes and signs`, () => {
      const values = fc.tuple(
        fc.integer({ min: 1, max: 100000 }),
        fc.integer({ min: -6, max: 6 }),
        fc.boolean(),
      );
      fc.assert(
        fc.property(values, ([mantissa, exponent, negative]) => {
          let base = new UDecimal(mantissa).mul(new UDecimal(10).pow(exponent));
          if (
            !category.positiveOnly &&
            category.minimumBase === undefined &&
            negative
          )
            base = base.neg();
          for (const from of category.units) {
            const input = convert(base, category.baseUnitId, from.id);
            for (const to of category.units) {
              const target = convert(input, from.id, to.id);
              close(convert(target, to.id, from.id), input);
              close(convert(target, to.id, category.baseUnitId), base);
            }
          }
        }),
        { numRuns: 12, seed: 1010 },
      );
    });
  }
});
describe('catalogue integrity and extension', () => {
  it('validates IDs, explicit aliases, bases and factors', () => {
    expect(() => createUnitsEngine(categories)).not.toThrow();
    expect(
      new Set(categories.flatMap((c) => c.units.map((u) => u.id))).size,
    ).toBe(categories.flatMap((c) => c.units).length);
    for (const category of categories) {
      expect(category.units.length >= 6 || !!category.smallCategoryReason).toBe(
        true,
      );
      expect(
        category.units.every((u) => u.source && u.names.de && u.names.en),
      ).toBe(true);
    }
  });
  it('rejects duplicate IDs, aliases, zero factors and missing base', () => {
    const original = categories[0];
    const sample = original?.units[0];
    if (!original || !sample) throw new Error('missing test data');
    expect(() =>
      createUnitsEngine([{ ...original, units: [...original.units, sample] }]),
    ).toThrow(UnitError);
    expect(() =>
      createUnitsEngine([
        {
          ...original,
          units: original.units.map((u) => ({ ...u, aliases: ['collision'] })),
        },
      ]),
    ).toThrow(UnitError);
    expect(() =>
      createUnitsEngine([
        {
          ...original,
          units: original.units.map((u) =>
            u.id === sample.id
              ? { ...u, conversion: { kind: 'linear', factor: '0' } }
              : u,
          ),
        },
      ]),
    ).toThrow(UnitError);
    expect(() =>
      createUnitsEngine([{ ...original, baseUnitId: 'missing' }]),
    ).toThrow(UnitError);
  });
  it('adds categories/units without changing conversion algorithms', () => {
    const engine = createUnitsEngine([
      {
        id: 'custom',
        names: { de: 'Test', en: 'Test' },
        baseUnitId: 'base',
        units: [
          {
            id: 'base',
            symbol: 'base',
            names: { de: 'Basis', en: 'Base' },
            aliases: [],
            system: 'other',
            source: 'Test definition',
            exact: true,
            conversion: { kind: 'linear', factor: '1' },
          },
          {
            id: 'double',
            symbol: 'double',
            names: { de: 'Doppelt', en: 'Double' },
            aliases: [],
            system: 'other',
            source: 'Test definition',
            exact: true,
            conversion: { kind: 'linear', factor: '2' },
          },
          {
            id: 'future',
            symbol: 'future',
            names: { de: 'Kurs', en: 'Rate' },
            aliases: [],
            system: 'other',
            source: 'AP17',
            exact: false,
            conversion: { kind: 'dynamicRate', providerId: 'offline' },
          },
        ],
      },
    ]);
    expect(engine.convert('3', 'double', 'base').toString()).toBe('6');
    expect(() => engine.convert('3', 'future', 'base')).toThrow(UnitError);
  });
  it('does not depend on or change the global Decimal configuration', () => {
    const precision = Decimal.precision;
    try {
      Decimal.set({ precision: 3 });
      expect(convert('1', 'lb', 'kg').toFixed()).toBe('0.45359237');
    } finally {
      Decimal.set({ precision });
    }
  });
});
describe('temperature, fuel and dimension boundaries', () => {
  it('handles absolute zero and the common intersection exactly', () => {
    expect(convert('-40', 'degC', 'degF').toString()).toBe('-40');
    expect(convert('0', 'K', 'degC').toString()).toBe('-273.15');
    expect(convert('-459.67', 'degF', 'K').toString()).toBe('0');
    expect(() => convert('-0.0001', 'K', 'K')).toThrow(UnitError);
  });
  it('uses exact reciprocal definitions for both gallon standards', () => {
    close(
      convert('5', 'L-100km', 'mpg-us'),
      new UDecimal('378.5411784').div('1.609344').div(5),
    );
    close(
      convert('5', 'L-100km', 'mpg-uk'),
      new UDecimal('454.609').div('1.609344').div(5),
    );
    expect(convert('5', 'L-100km', 'km-L').toString()).toBe('20');
    for (const invalid of ['0', '-1', 'NaN', 'Infinity'])
      expect(() => convert(invalid, 'mpg-us', 'km-L')).toThrow(UnitError);
  });
  it('distinguishes activity, absorbed and equivalent dose, viscosity and torque', () => {
    for (const [a, b] of [
      ['Bq', 'Gy'],
      ['Gy', 'Sv'],
      ['Pa-s', 'm2-s'],
      ['J', 'N-m'],
    ])
      expect(() => convert('1', a ?? '', b ?? '')).toThrow(UnitError);
    expect(convert('1', 'mmHg', 'Pa').eq(convert('1', 'Torr', 'Pa'))).toBe(
      false,
    );
  });
  it('evaluates astronomical and angle definitions without rounded constants', () => {
    close(convert('180', 'deg', 'rad'), UDecimal.acos(-1));
    close(convert('1', 'turn', 'deg'), '360');
    close(
      convert('1', 'pc', 'au'),
      new UDecimal(648000).div(UDecimal.acos(-1)),
    );
    close(convert('1', 'mach-isa', 'm-s'), '340.293988026089', '1e-14');
  });
  it('returns every unit in the source category', () => {
    const all = convertAll('1', 'in');
    expect(Object.keys(all)).toHaveLength(
      categories.find((c) => c.id === 'length')?.units.length ?? 0,
    );
    expect(all.m?.toString()).toBe('0.0254');
    expect(() => convert('1', 'missing', 'm')).toThrow(UnitError);
  });
});
describe('search, parsing and formatting', () => {
  it.each(['km', 'KM', 'Kilometer', 'kilometre'])(
    'finds %s tolerantly',
    (query) => {
      expect(
        searchUnits(query, query === 'kilometre' ? 'en' : 'de').map(
          (u) => u.id,
        ),
      ).toContain('km');
    },
  );
  it('normalizes umlauts and German transliteration', () => {
    for (const query of ['Fuß', 'FUSS', 'FUẞ', 'Ångström', 'Angstroem'])
      expect(searchUnits(query).length).toBeGreaterThan(0);
  });
  it.each([
    ['5 km in mi', 'de', '5', 'km', 'mi'],
    ['72 °F -> °C', 'en', '72', 'degF', 'degC'],
    [
      '3 ft 4 in',
      'en',
      '3.3333333333333333333333333333333333333333333333333333333333333333333',
      'ft',
      undefined,
    ],
    ['1,5 km nach mi', 'de', '1.5', 'km', 'mi'],
    ['5 L/100 km -> mpg US', 'de', '5', 'L-100km', 'mpg-us'],
    ['2 m2', 'en', '2', 'm2', undefined],
    ['1e3 mm -> m', 'en', '1000', 'mm', 'm'],
    [
      '-3 ft 4 in -> cm',
      'en',
      '-3.3333333333333333333333333333333333333333333333333333333333333333333',
      'ft',
      'cm',
    ],
  ])('parses %s', (query, locale, value, from, to) => {
    const parsed = parseQuery(query, locale);
    close(parsed.value, value);
    expect(parsed.fromId).toBe(from);
    expect(parsed.toId).toBe(to);
  });
  it('keeps case-sensitive SI symbols before tolerant lookup', () => {
    expect(parseQuery('1 mA', 'en').fromId).toBe('A-m');
    expect(parseQuery('1 MA', 'en').fromId).toBe('A-M');
    expect(() => parseQuery('1 ma', 'en')).toThrow(UnitError);
  });
  it.each([
    '5 nope',
    'km',
    '3 ft -4 in',
    '3 ft 4 s',
    '3 °C 4 °F',
    '2 km ->',
    '2 km -> s',
    '2 km -> m -> cm',
    '1,2,3 km',
  ])('rejects %s', (query) => {
    expect(() => parseQuery(query)).toThrow(UnitError);
  });
  it('delegates localized significant-digit display to the engine', () => {
    expect(
      formatQuantity('1234.567', 'm', {
        digits: 6,
        locale: 'de',
        grouping: true,
      }),
    ).toBe('1.234,57 m');
    expect(
      formatQuantity('1234.567', 'm', {
        digits: 4,
        notation: 'sci',
        locale: 'en',
      }),
    ).toBe('1.235e+3 m');
  });
  it('splits feet/inches and carries rounded seconds', () => {
    expect(formatCompound('40', 'in', ['ft', 'in'])).toBe('3 ft 4 in');
    expect(formatCompound('-40', 'in', ['ft', 'in'])).toBe('-3 ft 4 in');
    expect(
      formatCompound('3599.999', 's', ['h', 'min', 's'], {
        style: 'clock',
        digits: 2,
      }),
    ).toBe('1:00:00');
    expect(
      formatCompound('3661.5', 's', ['h', 'min', 's'], {
        style: 'clock',
        locale: 'de',
      }),
    ).toBe('1:01:01,5');
    expect(formatCompound('11.999', 'in', ['ft', 'in'], { digits: 2 })).toBe(
      '1 ft 0 in',
    );
    expect(() => formatCompound('1', 'm', ['in', 'ft'])).toThrow(UnitError);
    expect(() => formatCompound('1', 'm', ['ft', 'cm'])).toThrow(UnitError);
    expect(() => formatCompound('1', 'K', ['K', 'degC'])).toThrow(UnitError);
  });
});
