import { de } from './de';
import { en } from './en';
import { createTranslator } from '../i18n';

// Imported statically by the existing lazy modes/dialogs, before their first render.
export const t = createTranslator(de, en);
export type MessageKey = keyof typeof de;
export { de, en };
export {
  formatNumber,
  formatDate,
  formatTime,
  type Locale,
  type NumberPreferences,
} from '../i18n';
