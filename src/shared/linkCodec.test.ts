import { expect, it } from 'vitest';
import fc from 'fast-check';
import { compressLink, decompressLink } from './linkCodec';
it('roundtrips bounded arbitrary JSON including Unicode and dictionary resets', () => {
  fc.assert(
    fc.property(fc.jsonValue(), (value) => {
      const text = JSON.stringify(value);
      expect(decompressLink(compressLink(text))).toBe(text);
    }),
    { numRuns: 500 },
  );
  for (const text of ['π café 日本語 😀', 'a'.repeat(65000)])
    expect(decompressLink(compressLink(text))).toBe(text);
});
