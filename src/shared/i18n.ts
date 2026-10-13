import { de } from './i18n/de';
import { en } from './i18n/en';
export { de, en };
export type MessageKey = keyof typeof de;
export type Locale = 'de' | 'en';
export type Dictionary = { [K in MessageKey]: typeof de[K] extends string ? string : { one: string; other: string } };
export type MessageParams = Record<string, string | number>;
let activeLocale: Locale = 'de';
export function detectLocale(language: string): Locale {
  return language.toLowerCase().startsWith('en') ? 'en' : 'de';
}
export function setI18nLocale(locale: Locale): void { activeLocale = locale; }
export function t(key: MessageKey, params?: MessageParams): string;
/** Compatibility for existing design-system callers. New callers may use t(key, params). */
export function t(key: MessageKey, locale: Locale, params?: MessageParams): string;
export function t(key: MessageKey, localeOrParams: Locale | MessageParams = activeLocale, params: MessageParams = {}): string {
  const locale = typeof localeOrParams === 'string' ? localeOrParams : activeLocale;
  const values = typeof localeOrParams === 'string' ? params : localeOrParams;
  const message = (locale === 'en' ? en : de)[key];
  const template = typeof message === 'string' ? message : (new Intl.PluralRules(locale).select(Number(values.count)) === 'one' ? message.one : message.other);
  return template.replace(/\{(\w+)\}/g, (match, name: string) => String(values[name] ?? match));
}
export interface NumberPreferences { decimalSeparator: 'auto' | 'comma' | 'point'; grouping: boolean }
export function formatNumber(value: number, locale: Locale, preferences: NumberPreferences = { decimalSeparator: 'auto', grouping: true }): string {
  const numberLocale = preferences.decimalSeparator === 'comma' ? 'de-DE' : preferences.decimalSeparator === 'point' ? 'en-US' : locale;
  return new Intl.NumberFormat(numberLocale, { useGrouping: preferences.grouping, maximumFractionDigits: 12 }).format(value);
}
export function formatDate(value: number, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(value);
}
export function formatTime(value: number, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(value);
}
