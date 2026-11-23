import { afterEach, describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { decodePermalink, encodePermalink, type Permalink } from './permalinks';
import {
  initialSimpleState,
  simpleReducer,
  type SimpleState,
} from '../features/simple/model';
import { keyCommand } from '../features/simple/keyboard';
import { MAX_DEPTH } from '../engine/numeric';
import { initialPlot, newRow } from '../features/graph/model';
import {
  initialLinkedSimple,
  simpleLink,
  validateSimpleLink,
} from './simpleLinks';
import { restorePayload } from '../features/convert/model';
import { restorePlot } from '../features/graph/model';
import { compressLink, decompressLink } from '../shared/linkCodec';

function enter(keys: string, start = initialSimpleState()): SimpleState {
  return Array.from(keys).reduce((state, key) => {
    const command = keyCommand(key);
    if (!command) throw new Error(`Unknown test key ${key}`);
    return simpleReducer(state, command.action);
  }, start);
}

function openSimpleLink(payload: unknown): SimpleState {
  const source = compressLink(JSON.stringify(payload));
  window.history.replaceState(null, '', `#/simple?v=1&s=${source}`);
  return initialLinkedSimple();
}

describe('Simple permalink snapshots', () => {
  afterEach(() => window.history.replaceState(null, '', '/'));

  it.each([
    ['2*(3+4', ')=', '14'],
    ['2*(3+(4*5', '))=', '46'],
    ['2*(3+(', '4))=', '14'],
    ['2*(10%+', '0.9)=', '2'],
    ['100+(10%', ')=', '110'],
  ])(
    'restores %s with the full editable group stack',
    (input, tail, result) => {
      const state = enter(input);
      const source = { ...state, memory: '99', sequence: 7 };
      const payload = simpleLink(source);
      expect(payload.version).toBe(2);
      window.history.replaceState(null, '', encodePermalink('simple', payload));
      const restored = initialLinkedSimple();
      expect(restored).toEqual(state);
      expect(enter(tail, restored).entry.value).toBe(result);
      expect(enter(tail, source).entry.value).toBe(result);
    },
  );

  it('restores a unary operation from the keypad inside a group', () => {
    const state = simpleReducer(enter('2*(9'), {
      type: 'unary',
      operation: 'sqrt',
    });
    const restored = openSimpleLink(simpleLink(state));
    expect(restored).toEqual(state);
    expect(enter(')=', restored).entry.value).toBe('6');
  });

  it('restores the legacy v1 pending expression', () => {
    const restored = openSimpleLink({
      version: 1,
      entry: { value: '3', expression: '3' },
      accumulator: '12',
      operator: '+',
      expression: '12 + 3',
      phase: 'entry',
    });
    expect(restored).toEqual(enter('12+3'));
    expect(enter('=', restored).entry.value).toBe('15');
    expect(simpleLink(restored).version).toBe(1);
  });

  it('rejects malformed versions, active frames and parents atomically', () => {
    const payload = simpleLink(enter('2*(3+4'));
    if (payload.version !== 2) throw new Error('Missing group snapshot');
    for (const bad of [
      { ...payload, version: 99 },
      { ...payload, groups: {} },
      { ...payload, groups: [] },
      { ...payload, groups: [null] },
      { ...payload, groups: [payload.active] },
      { ...payload, active: { ...payload.active, phase: 'result' } },
      { ...payload, active: { ...payload.active, accumulator: null } },
      { ...payload, active: { ...payload.active, leftExpression: '1' } },
      {
        ...payload,
        active: { ...payload.active, entry: { value: '5', expression: '4' } },
      },
      {
        ...payload,
        active: {
          ...payload.active,
          entry: { value: '0', expression: 'sin(0)' },
        },
      },
    ]) {
      expect(validateSimpleLink(bad)).toBeNull();
      expect(openSimpleLink(bad)).toEqual(initialSimpleState());
    }
  });

  it('honors the expression and group depth limits in both directions', () => {
    const state = enter('('.repeat(MAX_DEPTH) + '1');
    const atLimit = { ...state, expression: '1'.padEnd(4000) };
    const payload = simpleLink(atLimit);
    expect(openSimpleLink(payload)).toEqual(atLimit);
    for (const oversized of [
      enter('('.repeat(MAX_DEPTH + 1) + '1'),
      { ...atLimit, expression: atLimit.expression + ' ' },
    ]) {
      expect(() => simpleLink(oversized)).toThrow(RangeError);
      expect(
        openSimpleLink({
          version: 2,
          active: oversized,
          groups: oversized.groups,
        }),
      ).toEqual(initialSimpleState());
    }
  });
});

describe('versioned permalinks', () => {
  it('roundtrips all four modes, including graph parameters and viewport', () => {
    const simple = simpleReducer(
      simpleReducer(initialSimpleState(), { type: 'digit', digit: '5' }),
      { type: 'operator', operator: '+' },
    );
    const states: Permalink[] = [
      { mode: 'simple', data: simpleLink(simple) },
      {
        mode: 'scientific',
        data: { expression: 'sin(30)+π', angleMode: 'deg' },
      },
      {
        mode: 'convert',
        data: {
          categoryId: 'temperature',
          fromId: 'degF',
          toId: 'degC',
          value: '72',
        },
      },
      {
        mode: 'graph',
        data: {
          ...initialPlot(),
          rows: [
            {
              ...newRow('one', 'a*sin(x)'),
              params: { a: { value: 2, min: 0, max: 10, step: 0.1 } },
            },
          ],
          bounds: { xMin: -2, xMax: 3, yMin: -4, yMax: 5 },
        },
      },
    ];
    for (const state of states) {
      // Use the same generic API as every mode's copy button.
      const hash = encodePermalink(state.mode, state.data);
      expect(hash).toContain('?v=1&s=');
      expect(decodePermalink(hash)).toEqual(state);
    }
  });
  it('supports readable scientific examples without executing definitions', () => {
    expect(decodePermalink('#/scientific?e=sin(30)&a=rad')).toEqual({
      mode: 'scientific',
      data: { expression: 'sin(30)', angleMode: 'rad' },
    });
    expect(decodePermalink('#/scientific?e=x%3D2')).toEqual({
      mode: 'scientific',
      data: { expression: 'x=2', angleMode: 'deg' },
    });
  });
  it('roundtrips expressions as Unicode JSON and actually compresses repeated plot data', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 1000 }), (expression) => {
        const data = { expression, angleMode: 'grad' as const };
        expect(decodePermalink(encodePermalink('scientific', data))).toEqual({
          mode: 'scientific',
          data,
        });
      }),
    );
    const text = JSON.stringify({
      rows: Array.from({ length: 30 }, () => newRow('one', 'sin(x)+cos(x)')),
    });
    expect(compressLink(text).length).toBeLessThan(text.length);
    expect(decompressLink(compressLink(text))).toBe(text);
  });
  it('never throws for arbitrary hashes or compressed malformed JSON', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 5000 }), (value) => {
        expect(() => decodePermalink(value)).not.toThrow();
        expect(() => decodePermalink(`#/graph?v=1&s=${value}`)).not.toThrow();
      }),
      { numRuns: 1000 },
    );
    fc.assert(
      fc.property(fc.jsonValue(), (value) => {
        const hash = `#/graph?v=1&s=${compressLink(JSON.stringify(value))}`;
        expect(() => decodePermalink(hash)).not.toThrow();
      }),
      { numRuns: 300 },
    );
  });
  it.each([
    '#/scientific?v=99&s=AAAA',
    '#/scientific?e=x&a=invalid',
    '#/unknown?v=1&s=AAAA',
    '#/simple?v=1&s=__',
    '#/graph?v=1&s=' + 'A'.repeat(40000),
  ])('rejects malformed or future link %s', (hash) =>
    expect(decodePermalink(hash)).toBeNull(),
  );
  it('validates every mode and bounds decompression', () => {
    expect(
      validateSimpleLink({
        version: 1,
        entry: { value: 'Infinity', expression: '0' },
      }),
    ).toBeNull();
    expect(
      restorePayload({
        categoryId: 'length',
        fromId: 'km',
        toId: 'kg',
        value: '5',
      }),
    ).toBeNull();
    expect(
      restorePlot({
        ...initialPlot(),
        bounds: { xMin: 5, xMax: 0, yMin: 0, yMax: 1 },
      }),
    ).toBeNull();
    expect(() => decompressLink('AA')).toThrow();
  });
  it('enforces hash, encoded and expanded payload boundaries', () => {
    const short = encodePermalink('scientific', {
      expression: '1',
      angleMode: 'deg',
    });
    const fullHash = (short + '&unused=').padEnd(33000, 'x');
    expect(decodePermalink(fullHash)).toEqual(decodePermalink(short));
    expect(decodePermalink(fullHash + 'x')).toBeNull();

    const fullEncoded = 'A'.repeat(32768);
    expect(decompressLink(fullEncoded)).toHaveLength(12288);
    expect(() => decompressLink(fullEncoded + 'A')).toThrow('Invalid link');
    const expression = Array.from({ length: 10000 }, (_, index) =>
      String.fromCharCode(0x1000 + index),
    ).join('');
    expect(() =>
      encodePermalink('scientific', { expression, angleMode: 'deg' }),
    ).toThrow('Link too large');

    const fullText = 'ä'.repeat(32768);
    const encoded = compressLink(fullText);
    expect(decompressLink(encoded)).toBe(fullText);
    expect(() => compressLink(fullText + 'x')).toThrow(
      'Link payload too large',
    );
    const binary = atob(encoded.replaceAll('-', '+').replaceAll('_', '/'));
    const oversized = btoa(binary + '\0\0')
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replace(/=+$/, '');
    expect(() => decompressLink(oversized)).toThrow(
      'Invalid or oversized link',
    );
  });
});
