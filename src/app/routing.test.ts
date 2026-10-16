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
          expect(parseHash(hash, 'simple', false)).toBe('simple');
        },
      ),
    );
  });
});

it('resumes only an empty hash and keeps unknown links deterministic', () => {
  expect(parseHash('', 'graph')).toBe('graph');
  expect(parseHash('#/unknown', 'graph')).toBe('simple');
});

it('gates design including old direct links and query strings at the build boundary', () => {
  for (const hash of ['#/design', '#/design?v=1&s=old']) {
    expect(parseHash(hash, 'graph', false)).toBe('simple');
    expect(parseHash(hash, 'graph', true)).toBe('design');
  }
});
