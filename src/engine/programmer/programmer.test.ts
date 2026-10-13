import { describe, expect, it } from 'vitest';
import {
  word,
  fromBits,
  operate,
  parseBase,
  formatBase,
  floatFromBits,
  floatToBits,
  composeFloat,
  characterInfo,
  codepointInfo,
  type WordOptions,
} from './index.ts';
import {
  createEnvironment,
  execute,
  evaluateString,
  parse,
  print,
  toLatex,
} from '../index.ts';
const widths = [8, 16, 32, 64] as const;
describe('fixed words, independent boundary vectors', () => {
  for (const width of widths)
    for (const signed of [false, true]) {
      const o: WordOptions = { width, signed, overflow: 'wrap' };
      const mask = (1n << BigInt(width)) - 1n;
      const max = signed ? mask >> 1n : mask;
      const min = signed ? -(1n << BigInt(width - 1)) : 0n;
      it.each([
        [0n, 0n],
        [1n, 1n],
        [max, max],
        [min, min],
        [max + 1n, min],
        [min - 1n, max],
        [1n << BigInt(width), 0n],
        [-(1n << BigInt(width)), 0n],
      ])(
        'width ' + width + ' signed ' + signed + ' normalizes %s to %s',
        (v, expected) => {
          expect(word(v, o)).toBe(expected);
        },
      );
      it.each([max + 1n, min - 1n])(
        'checked boundary %s ' + width + ' ' + signed,
        (v) => {
          expect(() => word(v, { ...o, overflow: 'error' })).toThrow();
        },
      );
      it.each([
        ['and', 0xa5n, 0x3cn, 0x24n],
        ['or', 0xa5n, 0x3cn, 0xbdn],
        ['xor', 0xa5n, 0x3cn, 0x99n],
        ['nand', 0xa5n, 0x3cn, mask ^ 0x24n],
        ['nor', 0xa5n, 0x3cn, mask ^ 0xbdn],
        ['xnor', 0xa5n, 0x3cn, mask ^ 0x99n],
      ] as const)('%s ' + width + ' ' + signed, (op, a, b, bits) => {
        expect(operate(op, fromBits(a, o), fromBits(b, o), o)).toBe(
          fromBits(bits, o),
        );
      });
      it('NOT, counts and zero ' + width + ' ' + signed, () => {
        expect(operate('not', 0n, 0n, o)).toBe(signed ? -1n : mask);
        expect(operate('popcount', fromBits(mask, o), 0n, o)).toBe(
          BigInt(width),
        );
        expect(operate('clz', 0n, 0n, o)).toBe(BigInt(width));
        expect(operate('ctz', 0n, 0n, o)).toBe(BigInt(width));
        expect(operate('clz', 1n, 0n, o)).toBe(BigInt(width - 1));
        expect(operate('ctz', fromBits(0x80n, o), 0n, o)).toBe(7n);
      });
      it('shifts and rotations ' + width + ' ' + signed, () => {
        const high = fromBits(1n << BigInt(width - 1), o);
        expect(operate('rol', high, 1n, o)).toBe(1n);
        expect(operate('ror', 1n, 1n, o)).toBe(high);
        expect(operate('rol', high, BigInt(width), o)).toBe(high);
        expect(operate('ror', 1n, BigInt(width * 5 + 1), o)).toBe(high);
        expect(operate('lsr', high, BigInt(width), o)).toBe(0n);
        expect(operate('asr', high, BigInt(width), o)).toBe(signed ? -1n : 0n);
        expect(() => operate('rol', 1n, -1n, o)).toThrow();
        expect(() =>
          operate('shl', max, 1n, { ...o, overflow: 'error' }),
        ).toThrow();
      });
      it('byte swap involution ' + width + ' ' + signed, () => {
        const v = fromBits(0xabn, o);
        expect(operate('bswap', v, 0n, o)).toBe(
          fromBits(0xabn << BigInt(width - 8), o),
        );
        expect(operate('bswap', operate('bswap', v, 0n, o), 0n, o)).toBe(v);
      });
      for (const base of [2, 8, 10, 16, 3, 36])
        it('base roundtrip ' + width + ' ' + signed + ' ' + base, () => {
          for (const v of [min, max, 0n, 1n])
            expect(parseBase(formatBase(v, base, o, 'nibble'), base, o)).toBe(
              v,
            );
        });
    }
});
const u: WordOptions = { width: 64, signed: false, overflow: 'error' };
it.each([
  ['0xFF & 0b1010', '10'],
  ['0o377 | 0x100', '511'],
  ['xor(0xFF, 0b1010)', '245'],
  ['1 | 2 & 4', '1'],
  ['1 + 1 << 3', '16'],
  ['64 >> 2 >> 1', '8'],
  ['2^3^2', '512'],
  ['0XABC', '2748'],
  ['~0 & 0xFF', '255'],
  ['18446744073709551615 & 1', '1'],
])('parser %s', (src, expected) => {
  const r = evaluateString(src, { bitwise: true, programmer: u });
  expect(r.ok && r.value.kind === 'number' && r.value.value.toFixed()).toBe(
    expected,
  );
  const p = parse(src, { bitwise: true });
  expect(p.ok).toBe(true);
  if (p.ok) {
    expect(parse(print(p.value), { bitwise: true }).ok).toBe(true);
    expect(toLatex(p.value)).not.toMatch(/(?<!\\)&/);
  }
});
it.each(['1 & 2', '1 | 2', '~1', '1 << 2', '1 >> 2'])(
  'disabled parser %s',
  (src) => expect(parse(src).ok).toBe(false),
);
it.each([
  '0x',
  '0b102',
  '0o8',
  '0xFG',
  '1.5 & 2',
  '1 << -1',
  '1 << 999999999999999999999',
  'xor(1)',
  'xor(1,2,3)',
])('invalid %s', (src) => {
  expect(evaluateString(src, { bitwise: true, programmer: u }).ok).toBe(false);
});
it('xor gated, overflow and signed shift', () => {
  expect(evaluateString('xor(1,2)').ok).toBe(false);
  const r = evaluateString('-128 >> 7', {
    bitwise: true,
    programmer: { width: 8, signed: true, overflow: 'error' },
  });
  expect(r.ok && r.value.kind === 'number' && r.value.value.toString()).toBe(
    '-1',
  );
});
it('persisted bitwise definition, ans and JSON roundtrip', () => {
  const a = execute('f(x) = x & 0xFF', createEnvironment(), { bitwise: true });
  expect(a.ok).toBe(true);
  if (a.ok) {
    const b = execute(
      'f(257)',
      JSON.parse(JSON.stringify(a.value.environment)),
      { bitwise: true },
    );
    expect(
      b.ok &&
        b.value.value?.kind === 'number' &&
        b.value.value.value.toString(),
    ).toBe('1');
  }
});
describe('IEEE exact vectors and raw roundtrips', () => {
  for (const width of [32, 64] as const) {
    const m = width === 32 ? 23 : 52,
      e = width === 32 ? 8 : 11;
    const vectors = [
      [0n, 'zero', '0'],
      [1n, 'subnormal', null],
      [(1n << BigInt(m)) - 1n, 'subnormal', null],
      [1n << BigInt(m), 'normal', null],
      [BigInt((1 << (e - 1)) - 1) << BigInt(m), 'normal', '1'],
      [BigInt((1 << e) - 1) << BigInt(m), 'infinity', 'Infinity'],
      [(BigInt((1 << e) - 1) << BigInt(m)) | 1n, 'nan', 'NaN'],
      [1n << BigInt(width - 1), 'zero', '-0'],
      [
        (1n << BigInt(width - 1)) | (BigInt((1 << e) - 1) << BigInt(m)),
        'infinity',
        '-Infinity',
      ],
    ] as const;
    it.each(vectors)('width ' + width + ' raw %s %s', (bits, kind, exact) => {
      const f = floatFromBits(bits, width);
      expect(f.kind).toBe(kind);
      if (exact !== null) expect(f.exact).toBe(exact);
      expect(composeFloat(f.sign, f.exponent, f.mantissa, width)).toBe(bits);
      if (kind !== 'nan') expect(floatToBits(f.value, width)).toBe(bits);
    });
    it.each([
      0,
      -0,
      1,
      -1,
      0.1,
      Math.PI,
      Infinity,
      -Infinity,
      NaN,
      1e-45,
      5e-324,
    ])('width ' + width + ' numeric %s', (value) => {
      const f = floatFromBits(floatToBits(value, width), width);
      if (Number.isNaN(value)) expect(f.kind).toBe('nan');
      else expect(f.value).toBe(width === 32 ? Math.fround(value) : value);
    });
    it('raw field limits ' + width, () => {
      expect(() => composeFloat(2, 0, 0n, width)).toThrow();
      expect(() => composeFloat(0, 1 << e, 0n, width)).toThrow();
      expect(() => composeFloat(0, 0, 1n << BigInt(m), width)).toThrow();
      expect(() => floatFromBits(-1n, width)).toThrow();
    });
  }
  it('float32 exact decimal and float64 subnormal', () => {
    expect(floatFromBits(0x3dcccccdn, 32).exact).toBe(
      '0.100000001490116119384765625',
    );
    const tiny = floatFromBits(1n, 64).exact;
    expect(tiny.length).toBe(1076);
    expect(tiny.endsWith('625')).toBe(true);
  });
});
it.each([
  ['A', 65, [65]],
  ['ä', 228, [195, 164]],
  ['€', 8364, [226, 130, 172]],
  ['😀', 128512, [240, 159, 152, 128]],
  ['\0', 0, [0]],
  ['𐀀', 65536, [240, 144, 128, 128]],
])('unicode %s', (char, cp, bytes) => {
  expect(characterInfo(char as string)).toEqual({
    character: char,
    codepoint: cp,
    bytes,
  });
  expect(codepointInfo(cp as number)).toEqual({
    character: char,
    codepoint: cp,
    bytes,
  });
});
it.each(['', 'ab', '\ud800', '\udfff'])('invalid character %s', (s) =>
  expect(() => characterInfo(s)).toThrow(),
);
it.each([-1, 0xd800, 0xdfff, 0x110000, 0.5, Infinity])(
  'invalid codepoint %s',
  (n) => expect(() => codepointInfo(n)).toThrow(),
);
