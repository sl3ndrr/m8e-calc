import { expect, it } from 'vitest';
import { detectLocale, formatNumber, setI18nLocale } from './i18n';
import { de, en, t, type MessageKey } from './i18n/extended';
import { de as coreDE, en as coreEN, t as coreT } from './i18n';
it('keeps startup messages complete and identical in both translators', () => {
  expect(Object.keys(coreEN).sort()).toEqual(Object.keys(coreDE).sort());
  for (const key of Object.keys(coreDE) as (keyof typeof coreDE)[]) {
    expect(coreDE[key]).toEqual(de[key]);
    expect(coreEN[key]).toEqual(en[key]);
    expect(coreT(key, 'de', { count: 2 })).toBe(t(key, 'de', { count: 2 }));
    expect(coreT(key, 'en', { count: 2 })).toBe(t(key, 'en', { count: 2 }));
  }
  setI18nLocale('en');
  expect(coreT('mode.simple')).toBe(t('mode.simple'));
  expect(t('graph.emptyTitle')).toBe(en['graph.emptyTitle']);
  setI18nLocale('de');
});
it('provides complete dictionaries, interpolation and Intl plurals', () => {
  expect(Object.keys(en).sort()).toEqual(Object.keys(de).sort());
  for (const key of Object.keys(de) as MessageKey[]) {
    expect(t(key, 'de').length).toBeGreaterThan(0);
    expect(t(key, 'en').length).toBeGreaterThan(0);
  }
  expect(t('history.count', 'de', { count: 1 })).toBe('1 Eintrag');
  expect(t('history.count', 'en', { count: 0 })).toBe('0 entries');
  expect(t('history.restore', 'de', { input: '2 + 3' })).toBe(
    'Wiederherstellen: 2 + 3',
  );
  setI18nLocale('en');
  expect(t('history.count', { count: 2 })).toBe('2 entries');
  setI18nLocale('de');
});
it('detects supported languages and formats configured numbers through Intl', () => {
  expect(detectLocale('en-US')).toBe('en');
  expect(detectLocale('fr-FR')).toBe('de');
  expect(
    formatNumber(12345.67, 'en', { decimalSeparator: 'comma', grouping: true }),
  ).toBe('12.345,67');
  expect(
    formatNumber(12345.67, 'de', {
      decimalSeparator: 'point',
      grouping: false,
    }),
  ).toBe('12345.67');
});
