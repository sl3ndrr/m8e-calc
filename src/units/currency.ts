import { UDecimal } from './decimal.ts';
import { UnitError, type DynamicRateProvider } from './types.ts';

/** Current ECB reference currencies; EUR is the native base. No obsolete BGN/RUB. */
export const currencyCodes = [
  'EUR',
  'AUD',
  'BRL',
  'CAD',
  'CHF',
  'CNY',
  'CZK',
  'DKK',
  'GBP',
  'HKD',
  'HUF',
  'IDR',
  'ILS',
  'INR',
  'ISK',
  'JPY',
  'KRW',
  'MXN',
  'MYR',
  'NOK',
  'NZD',
  'PHP',
  'PLN',
  'RON',
  'SEK',
  'SGD',
  'THB',
  'TRY',
  'USD',
  'ZAR',
] as const;
export const currencyProviderId = 'ecb-frankfurter';
/** Rates quote units per EUR. The AP10 contract instead supplies EUR per unit. */
export function createCurrencyProvider(
  quotes: Readonly<Record<string, string>>,
): DynamicRateProvider {
  const rates = new Map(
    currencyCodes.map((code) => {
      const quote = new UDecimal(
        code === 'EUR' ? '1' : (quotes[code] ?? 'NaN'),
      );
      if (!quote.isFinite() || !quote.gt(0))
        throw new UnitError(
          'E_UNIT_DYNAMIC_RATE',
          `Missing or invalid quote: ${code}`,
        );
      return [code, new UDecimal(1).div(quote)] as const;
    }),
  );
  return {
    id: currencyProviderId,
    rateToBase: (code) => {
      const rate = rates.get(code as (typeof currencyCodes)[number]);
      if (!rate)
        throw new UnitError('E_UNIT_DYNAMIC_RATE', `Unknown currency: ${code}`);
      return new UDecimal(rate);
    },
  };
}
