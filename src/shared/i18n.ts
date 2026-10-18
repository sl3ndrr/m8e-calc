import { coreDE as de } from './i18n/coreDE';
import { coreEN as en } from './i18n/coreEN';
export { de, en };
export type MessageKey = keyof typeof de;
export type Locale = 'de' | 'en';
type FullDictionary = typeof import('./i18n/de').de;
export type Dictionary = {
  [K in keyof FullDictionary]: FullDictionary[K] extends string
    ? string
    : { one: string; other: string };
};
export type MessageParams = Record<string, string | number>;
let activeLocale: Locale = 'de';
export function detectLocale(language: string): Locale {
  return language.toLowerCase().split('-')[0] === 'en' ? 'en' : 'de';
}
export function setI18nLocale(locale: Locale): void {
  activeLocale = locale;
}
type Message = string | { readonly one: string; readonly other: string };
/** Each synchronous translator owns its static dictionary imports. */
export function createTranslator<T extends Record<string, Message>>(
  german: T,
  english: { [K in keyof T]: Message },
) {
  type Key = keyof T & string;
  function translate(key: Key, params?: MessageParams): string;
  function translate(key: Key, locale: Locale, params?: MessageParams): string;
  function translate(
    key: Key,
    localeOrParams: Locale | MessageParams = activeLocale,
    params: MessageParams = {},
  ): string {
    const locale =
      typeof localeOrParams === 'string' ? localeOrParams : activeLocale;
    const values = typeof localeOrParams === 'string' ? params : localeOrParams;
    const message = (locale === 'en' ? english : german)[key];
    const template =
      typeof message === 'string'
        ? message
        : new Intl.PluralRules(locale).select(Number(values.count)) === 'one'
          ? message.one
          : message.other;
    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
      String(values[name] ?? match),
    );
  }
  return translate;
}
export const t = createTranslator(de, en);
export interface NumberPreferences {
  decimalSeparator: 'auto' | 'comma' | 'point';
  grouping: boolean;
}
export function formatNumber(
  value: number,
  locale: Locale,
  preferences: NumberPreferences = { decimalSeparator: 'auto', grouping: true },
): string {
  const numberLocale =
    preferences.decimalSeparator === 'comma'
      ? 'de-DE'
      : preferences.decimalSeparator === 'point'
        ? 'en-US'
        : locale;
  return new Intl.NumberFormat(numberLocale, {
    useGrouping: preferences.grouping,
    maximumFractionDigits: 12,
  }).format(value);
}
export function formatDate(value: number, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(value);
}
export function formatTime(value: number, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(value);
}
