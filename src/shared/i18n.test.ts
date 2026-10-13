import { expect, it } from 'vitest';
import { de, en, t, type MessageKey } from './i18n';
it('provides matching, nonempty dictionaries and German defaults', () => {
  expect(Object.keys(en).sort()).toEqual(Object.keys(de).sort());
  for (const key of Object.keys(de) as MessageKey[]) { expect(t(key)).toBe(de[key]); expect(t(key, 'en')).toBe(en[key]); expect(en[key].length).toBeGreaterThan(0); }
});
