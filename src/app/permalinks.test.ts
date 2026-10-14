import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { decodePermalink, encodePermalink, simpleLink, validateModeLink, type Permalink } from './permalinks';
import { initialSimpleState, simpleReducer } from '../features/simple/model';
import { initialPlot, newRow } from '../features/graph/model';
import { compressLink, decompressLink } from '../shared/linkCodec';
describe('versioned permalinks', () => {
  it('roundtrips all four modes, including graph parameters and viewport', () => {
    const simple = simpleReducer(simpleReducer(initialSimpleState(), { type: 'digit', digit: '5' }), { type: 'operator', operator: '+' });
    const states: Permalink[] = [
      { mode: 'simple', data: simpleLink(simple) },
      { mode: 'scientific', data: { expression: 'sin(30)+π', angleMode: 'deg' } },
      { mode: 'convert', data: { categoryId: 'temperature', fromId: 'degF', toId: 'degC', value: '72' } },
      { mode: 'graph', data: { ...initialPlot(), rows: [{ ...newRow('one', 'a*sin(x)'), params: { a: { value: 2, min: 0, max: 10, step: 0.1 } } }], bounds: { xMin: -2, xMax: 3, yMin: -4, yMax: 5 } } },
    ];
    for (const state of states) {
      // Use the same generic API as every mode's copy button.
      const hash = encodePermalink(state.mode, state.data);
      expect(hash).toContain('?v=1&s=');
      expect(decodePermalink(hash)).toEqual(state);
    }
  });
  it('supports readable scientific examples without executing definitions', () => {
    expect(decodePermalink('#/scientific?e=sin(30)&a=rad')).toEqual({ mode: 'scientific', data: { expression: 'sin(30)', angleMode: 'rad' } });
    expect(decodePermalink('#/scientific?e=x%3D2')).toEqual({ mode: 'scientific', data: { expression: 'x=2', angleMode: 'deg' } });
  });
  it('roundtrips expressions as Unicode JSON and actually compresses repeated plot data', () => {
    fc.assert(fc.property(fc.string({ maxLength: 1000 }), (expression) => {
      const data = { expression, angleMode: 'grad' as const };
      expect(decodePermalink(encodePermalink('scientific', data))).toEqual({ mode: 'scientific', data });
    }));
    const text = JSON.stringify({ rows: Array.from({ length: 30 }, () => newRow('one', 'sin(x)+cos(x)')) });
    expect(compressLink(text).length).toBeLessThan(text.length);
    expect(decompressLink(compressLink(text))).toBe(text);
  });
  it('never throws for arbitrary hashes or compressed malformed JSON', () => {
    fc.assert(fc.property(fc.string({ maxLength: 5000 }), (value) => {
      expect(() => decodePermalink(value)).not.toThrow();
      expect(() => decodePermalink(`#/graph?v=1&s=${value}`)).not.toThrow();
    }), { numRuns: 1000 });
    fc.assert(fc.property(fc.jsonValue(), (value) => {
      const hash = `#/graph?v=1&s=${compressLink(JSON.stringify(value))}`;
      expect(() => decodePermalink(hash)).not.toThrow();
    }), { numRuns: 300 });
  });
  it.each(['#/scientific?v=99&s=AAAA', '#/scientific?e=x&a=invalid', '#/unknown?v=1&s=AAAA', '#/simple?v=1&s=__', '#/graph?v=1&s=' + 'A'.repeat(40000)])('rejects malformed or future link %s', (hash) => expect(decodePermalink(hash)).toBeNull());
  it('validates every mode and bounds decompression', () => {
    expect(validateModeLink('simple', { version: 1, entry: { value: 'Infinity', expression: '0' } })).toBeNull();
    expect(validateModeLink('convert', { categoryId: 'length', fromId: 'km', toId: 'kg', value: '5' })).toBeNull();
    expect(validateModeLink('graph', { ...initialPlot(), bounds: { xMin: 5, xMax: 0, yMin: 0, yMax: 1 } })).toBeNull();
    expect(() => decompressLink('AA')).toThrow();
    expect(() => compressLink('x'.repeat(65537))).toThrow();
  });
});
