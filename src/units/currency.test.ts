import { describe, expect, it } from 'vitest';
import Decimal from 'decimal.js';
import { createUnitsEngine, UnitError, type Category } from './index.ts';
import {
  createCurrencyProvider,
  currencyCodes,
  currencyProviderId,
} from './currency.ts';
const category: Category = {
  id: 'currency',
  names: { de: 'Währung', en: 'Currency' },
  baseUnitId: 'EUR',
  units: currencyCodes.map((code) => ({
    id: code,
    symbol: code,
    names: { de: code, en: code },
    aliases: [],
    system: 'other',
    source: 'ECB',
    exact: false,
    conversion:
      code === 'EUR'
        ? { kind: 'linear', factor: '1' }
        : { kind: 'dynamicRate', providerId: currencyProviderId },
  })),
};
const quotes = Object.fromEntries(
  currencyCodes.map((code) => [
    code,
    code === 'USD' ? '1.25' : code === 'GBP' ? '0.8' : '1',
  ]),
);
describe('AP10 dynamic currency rates', () => {
  it('converts through EUR without binary arithmetic or display rounding', () => {
    const engine = createUnitsEngine(
      [category],
      [createCurrencyProvider(quotes)],
    );
    expect(engine.convert('100', 'USD', 'GBP').toString()).toBe('64');
    expect(engine.convert('0.1', 'EUR', 'USD').toString()).toBe('0.125');
    expect(engine.convert('-12.5', 'USD', 'EUR').toString()).toBe('-10');
    expect(engine.convert('0', 'GBP', 'USD').toString()).toBe('0');
    const exact = engine.convert('1.23456789123456789123456789', 'USD', 'GBP');
    expect(exact.toString()).toBe('0.7901234503901234503901234496');
    engine.formatQuantity(exact, 'GBP', { digits: 2 });
    expect(exact.toString()).toBe('0.7901234503901234503901234496');
    expect(engine.convertAll('100', 'USD').GBP?.toString()).toBe('64');
    expect(engine.convert('1.25', 'USD', 'USD').toString()).toBe('1.25');
  });
  it('keeps providers scoped to an engine and validates supplied rates', () => {
    const before = Decimal.precision;
    const missing = createUnitsEngine([category]);
    expect(() => missing.convert('1', 'USD', 'EUR')).toThrow(UnitError);
    for (const value of ['0', '-1', 'Infinity', 'NaN'])
      expect(() => createCurrencyProvider({ ...quotes, USD: value })).toThrow(
        UnitError,
      );
    const invalid = createUnitsEngine(
      [category],
      [{ id: currencyProviderId, rateToBase: () => new Decimal(0) }],
    );
    expect(() => invalid.convert('1', 'USD', 'EUR')).toThrow(UnitError);
    const provider = createCurrencyProvider(quotes);
    const value = provider.rateToBase('USD');
    value.toDecimalPlaces(1);
    expect(provider.rateToBase('USD').toString()).toBe('0.8');
    expect(Decimal.precision).toBe(before);
    expect(currencyCodes).toHaveLength(30);
  });
});
