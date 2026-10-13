export const de = {
  'app.name': 'm8e-calc',
  'app.navigation': 'Rechnermodi',
  'app.foundation': 'Das Fundament steht.',
  'app.placeholder': 'Hier entsteht dein Taschenrechner für den Desktop. Die Rechenfunktionen folgen in den nächsten Paketen.',
  'mode.simple': 'Einfach',
  'mode.scientific': 'Wissenschaftlich',
  'mode.convert': 'Umrechner',
  'mode.graph': 'Graphen',
} as const;
export type MessageKey = keyof typeof de;
export type Locale = 'de' | 'en';
export const en: Record<MessageKey, string> = {
  'app.name': 'm8e-calc',
  'app.navigation': 'Calculator modes',
  'app.foundation': 'The foundation is ready.',
  'app.placeholder': 'Your desktop calculator is taking shape. Calculation features will arrive in the next packages.',
  'mode.simple': 'Simple',
  'mode.scientific': 'Scientific',
  'mode.convert': 'Converter',
  'mode.graph': 'Graphs',
};
export function t(key: MessageKey, locale: Locale = 'de'): string {
  return (locale === 'en' ? en : de)[key];
}
