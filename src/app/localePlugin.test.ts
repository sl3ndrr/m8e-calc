import { it, expect } from 'vitest';
import { retainAppLocales } from '../../scripts/localePlugin';
it('retains de/en imports and removes unsupported upstream dictionaries', () => {
  const source = `import $de from "./intl/de-DE.mjs";
import $en from "./intl/en-US.mjs";
import $fr from "./intl/fr-FR.mjs";
const messages = {
 "de-DE": $de,
 "en-US": $en,
 "fr-FR": $fr
};`;
  const result = retainAppLocales(source);
  expect(result).toContain('de-DE');
  expect(result).toContain('en-US');
  expect(result).not.toContain('$fr');
  expect(retainAppLocales('export const unchanged = 1;')).toBe(
    'export const unchanged = 1;',
  );
});
