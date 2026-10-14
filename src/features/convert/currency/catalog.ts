import { currencyCodes, currencyProviderId } from '../../../units/currency';
import { t } from '../../../shared/i18n';
import type { Category } from '../../../units';

export function currencyCategory(): Category {
  const de = new Intl.DisplayNames(['de'], { type: 'currency' });
  const en = new Intl.DisplayNames(['en'], { type: 'currency' });
  return {
    id: 'currency',
    names: {
      de: t('currency.category', 'de'),
      en: t('currency.category', 'en'),
    },
    baseUnitId: 'EUR',
    units: currencyCodes.map((code) => ({
      id: code,
      symbol:
        new Intl.NumberFormat('en', {
          style: 'currency',
          currency: code,
          currencyDisplay: 'narrowSymbol',
        })
          .formatToParts(0)
          .find((part) => part.type === 'currency')?.value ?? code,
      names: { de: de.of(code) ?? code, en: en.of(code) ?? code },
      aliases: [],
      system: 'other',
      source: 'ECB via Frankfurter',
      exact: false,
      conversion:
        code === 'EUR'
          ? { kind: 'linear', factor: '1' }
          : { kind: 'dynamicRate', providerId: currencyProviderId },
    })),
  };
}
