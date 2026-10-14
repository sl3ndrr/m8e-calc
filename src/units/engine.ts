import type Decimal from 'decimal.js';
import { formatNumber, parseLocalizedNumber } from '../engine/format.ts';
import { categories } from './catalog.ts';
import { UDecimal } from './decimal.ts';
import { UnitError } from './types.ts';
import type {
  Category,
  DynamicRateProvider,
  CompoundOptions,
  ParsedQuery,
  QuantityFormatOptions,
  Unit,
} from './types.ts';

export function normalizeUnitText(text: string): string {
  return text
    .trim()
    .replace(/ß/giu, 'ss')
    .replace(/ä/giu, 'ae')
    .replace(/ö/giu, 'oe')
    .replace(/ü/giu, 'ue')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replaceAll('μ', 'µ')
    .toLowerCase()
    .replace(/\s+/gu, ' ');
}
const terms = (unit: Unit, locale: string): readonly string[] => [
  unit.id,
  unit.symbol,
  unit.names[locale.startsWith('de') ? 'de' : 'en'],
  ...unit.aliases,
];
const finite = (value: Decimal.Value): Decimal => {
  try {
    const result = new UDecimal(value);
    if (result.isFinite()) return result;
  } catch {
    /* Report a stable domain error for malformed decimal inputs. */
  }
  throw new UnitError('E_UNIT_DOMAIN', 'A finite decimal value is required.');
};

/** Custom registries extend the engine through data only. No implicit rate fetching. */
export function createUnitsEngine(
  registry: readonly Category[],
  providers: readonly DynamicRateProvider[] = [],
) {
  const rates = new Map(providers.map((provider) => [provider.id, provider]));
  function rate(unit: Unit): Decimal {
    const c = unit.conversion;
    const provider =
      c.kind === 'dynamicRate' ? rates.get(c.providerId) : undefined;
    if (!provider)
      throw new UnitError('E_UNIT_DYNAMIC_RATE', 'Missing rate provider');
    const value = finite(provider.rateToBase(unit.id));
    if (!value.gt(0))
      throw new UnitError('E_UNIT_DYNAMIC_RATE', 'Invalid rate');
    return value;
  }
  const byId = new Map<string, { unit: Unit; category: Category }>();
  const categoryIds = new Set<string>();
  const aliases = new Map<string, string>();
  for (const category of registry) {
    if (categoryIds.has(category.id))
      throw new UnitError(
        'E_UNIT_CATEGORY',
        `Duplicate category: ${category.id}`,
      );
    categoryIds.add(category.id);
    for (const unit of category.units) {
      if (byId.has(unit.id))
        throw new UnitError('E_UNIT_UNKNOWN', `Duplicate id: ${unit.id}`);
      byId.set(unit.id, { unit, category });
      if (!unit.source || !unit.names.de || !unit.names.en)
        throw new UnitError(
          'E_UNIT_UNKNOWN',
          `Incomplete metadata: ${unit.id}`,
        );
      for (const alias of [unit.id, ...unit.aliases]) {
        const previous = aliases.get(alias);
        if (previous && previous !== unit.id)
          throw new UnitError('E_UNIT_AMBIGUOUS', `Duplicate alias: ${alias}`);
        aliases.set(alias, unit.id);
      }
      const c = unit.conversion;
      if (c.kind === 'linear' || c.kind === 'affine') {
        if (!finite(c.factor).gt(0) || !finite(c.divisor ?? '1').gt(0))
          throw new UnitError(
            'E_UNIT_DOMAIN',
            `Nonpositive factor: ${unit.id}`,
          );
        if (c.kind === 'affine') finite(c.offset);
      }
    }
    const base = byId.get(category.baseUnitId);
    if (
      base?.category !== category ||
      base.unit.conversion.kind !== 'linear' ||
      !finite(base.unit.conversion.factor).eq(
        base.unit.conversion.divisor ?? '1',
      )
    )
      throw new UnitError('E_UNIT_CATEGORY', `Invalid base: ${category.id}`);
  }
  function lookup(id: string) {
    const entry = byId.get(id);
    if (!entry) throw new UnitError('E_UNIT_UNKNOWN', `Unknown unit: ${id}`);
    return entry;
  }
  function toBase(value: Decimal, unit: Unit): Decimal {
    const c = unit.conversion;
    if (c.kind === 'dynamicRate') return value.mul(rate(unit));
    if (c.kind === 'function') return finite(c.toBase(value));
    // Affine convention: base = (value + offset) * factor / divisor.
    return value
      .plus(c.kind === 'affine' ? c.offset : '0')
      .mul(c.factor)
      .div(c.divisor ?? '1');
  }
  function fromBase(value: Decimal, unit: Unit): Decimal {
    const c = unit.conversion;
    if (c.kind === 'dynamicRate') return value.div(rate(unit));
    if (c.kind === 'function') return finite(c.fromBase(value));
    return value
      .mul(c.divisor ?? '1')
      .div(c.factor)
      .minus(c.kind === 'affine' ? c.offset : '0');
  }
  function checkedBase(value: Decimal.Value, fromId: string) {
    const { unit, category } = lookup(fromId);
    const input = finite(value);
    if (category.positiveOnly && !input.gt(0))
      throw new UnitError(
        'E_UNIT_DOMAIN',
        'This category requires positive values.',
      );
    const base = toBase(input, unit);
    if (
      (category.positiveOnly && !base.gt(0)) ||
      (category.minimumBase !== undefined && base.lt(category.minimumBase))
    )
      throw new UnitError(
        'E_UNIT_DOMAIN',
        `Outside category domain: ${category.id}`,
      );
    return { base, category };
  }
  function convert(
    value: Decimal.Value,
    fromId: string,
    toId: string,
  ): Decimal {
    const { base, category } = checkedBase(value, fromId);
    const target = lookup(toId);
    if (target.category !== category)
      throw new UnitError('E_UNIT_CATEGORY', 'Units must share a category.');
    return fromId === toId ? finite(value) : fromBase(base, target.unit);
  }
  function convertAll(
    value: Decimal.Value,
    fromId: string,
  ): Readonly<Record<string, Decimal>> {
    const { base, category } = checkedBase(value, fromId);
    return Object.fromEntries(
      category.units.map((unit) => [
        unit.id,
        unit.id === fromId ? finite(value) : fromBase(base, unit),
      ]),
    );
  }
  function searchUnits(query: string, locale = 'de'): readonly Unit[] {
    const key = normalizeUnitText(query);
    const matches = Array.from(byId.values())
      .map((entry) => entry.unit)
      .filter((unit) =>
        terms(unit, locale).some((term) =>
          normalizeUnitText(term).includes(key),
        ),
      );
    return matches.sort(
      (a, b) =>
        Number(!terms(a, locale).some((t) => normalizeUnitText(t) === key)) -
        Number(!terms(b, locale).some((t) => normalizeUnitText(t) === key)),
    );
  }
  function resolve(text: string, locale: string, category?: Category): Unit {
    const pool = Array.from(byId.values())
      .filter((entry) => !category || entry.category === category)
      .map((entry) => entry.unit);
    const raw = text.trim();
    const exact = pool.filter((unit) => terms(unit, locale).includes(raw));
    const matches = exact.length
      ? exact
      : pool.filter((unit) =>
          terms(unit, locale).some(
            (term) => normalizeUnitText(term) === normalizeUnitText(raw),
          ),
        );
    const found = matches[0];
    if (!found) throw new UnitError('E_UNIT_UNKNOWN', `Unknown unit: ${text}`);
    if (matches.length > 1)
      throw new UnitError('E_UNIT_AMBIGUOUS', `Ambiguous unit: ${text}`);
    return found;
  }
  function parseQuery(query: string, locale = 'de'): ParsedQuery {
    if (query.length > 4096)
      throw new UnitError('E_UNIT_QUERY', 'Query too long.');
    // "in" is both an inch and the English connector. Require text after it.
    const arrows = [...query.matchAll(/\s*(?:->|→)\s*/gu)];
    const separators = arrows.length
      ? arrows
      : [...query.matchAll(/\s+(?:in|to|nach)\s+/giu)];
    if (separators.length > 1)
      throw new UnitError('E_UNIT_QUERY', 'Multiple conversion targets.');
    const split = separators[0];
    const source = split ? query.slice(0, split.index) : query;
    const targetText = split
      ? query.slice((split.index ?? 0) + split[0].length)
      : undefined;
    if (targetText !== undefined && !targetText.trim())
      throw new UnitError('E_UNIT_QUERY', 'Missing target.');
    const numbers = [
      ...source.matchAll(
        /[-+−]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:[eE][+-]?\d+)?(?=\s|[^\d.,]|$)/gu,
      ),
    ];
    const first = numbers[0];
    if (!first || source.slice(0, first.index).trim())
      throw new UnitError('E_UNIT_QUERY', 'Missing quantity.');
    // A unit can contain digits (m², L/100 km); try the whole suffix first.
    function component(token: string, suffix: string) {
      const value = parseLocalizedNumber(token, { locale });
      if (!value.ok)
        throw new UnitError('E_UNIT_QUERY', 'Invalid localized number.');
      return {
        value: finite(value.value.value),
        unit: resolve(suffix, locale),
      };
    }
    let components: { value: Decimal; unit: Unit }[];
    try {
      components = [
        component(first[0], source.slice((first.index ?? 0) + first[0].length)),
      ];
    } catch (error) {
      if (
        !(error instanceof UnitError) ||
        error.code !== 'E_UNIT_UNKNOWN' ||
        numbers.length < 2
      )
        throw error;
      components = numbers.map((match, i) =>
        component(
          match[0],
          source.slice(
            (match.index ?? 0) + match[0].length,
            numbers[i + 1]?.index,
          ),
        ),
      );
    }
    const head = components[0];
    if (!head) throw new UnitError('E_UNIT_QUERY', 'Missing quantity.');
    const category = lookup(head.unit.id).category;
    if (
      components.length > 1 &&
      components.some(
        (c) =>
          lookup(c.unit.id).category !== category ||
          c.unit.conversion.kind !== 'linear',
      )
    )
      throw new UnitError(
        'E_UNIT_COMPOUND',
        'Compound quantities must be linear and share a category.',
      );
    if (
      components.length > 1 &&
      components.slice(1).some((c) => c.value.isNegative())
    )
      throw new UnitError(
        'E_UNIT_COMPOUND',
        'Only the first compound component may have a sign.',
      );
    let value = head.value;
    if (components.length > 1) {
      const sign = head.value.isNegative() ? -1 : 1;
      const base = components
        .reduce(
          (sum, c) => sum.plus(toBase(c.value.abs(), c.unit)),
          new UDecimal(0),
        )
        .mul(sign);
      value = fromBase(base, head.unit);
    }
    checkedBase(value, head.unit.id);
    const target =
      targetText === undefined
        ? undefined
        : resolve(targetText, locale, category);
    return {
      value,
      fromId: head.unit.id,
      ...(target ? { toId: target.id } : {}),
    };
  }
  function formatQuantity(
    value: Decimal.Value,
    unitId: string,
    options: QuantityFormatOptions = {},
  ): string {
    return `${formatNumber(finite(value), options)} ${lookup(unitId).unit.symbol}`;
  }
  function formatCompound(
    value: Decimal.Value,
    fromId: string,
    unitIds: readonly string[],
    options: CompoundOptions = {},
  ): string {
    const { base, category } = checkedBase(value, fromId);
    if (!unitIds.length || new Set(unitIds).size !== unitIds.length)
      throw new UnitError(
        'E_UNIT_COMPOUND',
        'Provide distinct descending units.',
      );
    const units = unitIds.map((id) => lookup(id));
    if (
      units.some(
        (e) => e.category !== category || e.unit.conversion.kind !== 'linear',
      )
    )
      throw new UnitError(
        'E_UNIT_COMPOUND',
        'Compound units must be linear and share a category.',
      );
    const sizes = units.map((e) => toBase(new UDecimal(1), e.unit));
    for (let i = 1; i < sizes.length; i++) {
      const previous = sizes[i - 1];
      const current = sizes[i];
      if (
        !previous ||
        !current ||
        !previous.gt(current) ||
        !previous.div(current).isInteger()
      )
        throw new UnitError(
          'E_UNIT_COMPOUND',
          'Unit ratios must be descending integers.',
        );
    }
    const digits = options.digits ?? 2;
    if (!Number.isInteger(digits) || digits < 0 || digits > 50)
      throw new UnitError(
        'E_UNIT_COMPOUND',
        'digits must be 0..50 decimal places.',
      );
    if (
      options.style === 'clock' &&
      (category.id !== 'time' || unitIds.join(',') !== 'h,min,s')
    )
      throw new UnitError('E_UNIT_COMPOUND', 'Clock output requires h,min,s.');
    const smallest = sizes.at(-1);
    if (!smallest) throw new UnitError('E_UNIT_COMPOUND', 'Missing unit.');
    const roundedBase = base
      .abs()
      .div(smallest)
      .toDecimalPlaces(digits)
      .mul(smallest);
    let remaining = roundedBase;
    const parts = units.map((entry, i) => {
      const size = sizes[i] ?? smallest;
      const last = i === units.length - 1;
      const amount = last ? remaining.div(size) : remaining.div(size).floor();
      remaining = remaining.minus(amount.mul(size));
      // decimal places and significant digits are different contracts.
      let text = formatNumber(amount, {
        digits: 50,
        notation: 'fixed',
        locale: options.locale,
      });
      if (options.style === 'clock' && i > 0 && amount.lt(10))
        text = '0' + text;
      return options.style === 'clock' ? text : `${text} ${entry.unit.symbol}`;
    });
    return (
      (base.isNegative() && !roundedBase.isZero() ? '-' : '') +
      parts.join(options.separator ?? (options.style === 'clock' ? ':' : ' '))
    );
  }
  return {
    convert,
    convertAll,
    searchUnits,
    parseQuery,
    formatQuantity,
    formatCompound,
  };
}
export const {
  convert,
  convertAll,
  searchUnits,
  parseQuery,
  formatQuantity,
  formatCompound,
} = createUnitsEngine(categories);
