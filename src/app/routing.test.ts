import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { modes, parseHash } from './routing';
describe('hash routing', () => {
  it.each(modes)('resolves %s', (mode) => {
    expect(parseHash(`#/${mode}`)).toBe(mode);
    expect(parseHash(`#/${mode}?v=1&s=invalid`)).toBe(mode);
  });
  it('falls back to simple for arbitrary unknown hashes', () => {
    fc.assert(
      fc.property(
        fc
          .string()
          .filter((hash) => !modes.some((mode) => hash === `#/${mode}`)),
        (hash) => {
          expect(parseHash(hash)).toBe('simple');
        },
      ),
    );
  });
});

it('resumes only an empty hash and keeps unknown links deterministic', () => {
  expect(parseHash('', 'graph')).toBe('graph');
  expect(parseHash('#/unknown', 'graph')).toBe('simple');
});

