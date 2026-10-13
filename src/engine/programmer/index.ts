import { NumericFault } from '../numeric.ts';
export type WordWidth = 8 | 16 | 32 | 64;
export interface WordOptions {
  readonly width: WordWidth;
  readonly signed: boolean;
  readonly overflow: 'wrap' | 'error';
}
export const defaultWordOptions: WordOptions = {
  width: 32,
  signed: false,
  overflow: 'wrap',
};
export type WordOperation =
  | 'and'
  | 'or'
  | 'xor'
  | 'not'
  | 'nand'
  | 'nor'
  | 'xnor'
  | 'shl'
  | 'lsr'
  | 'asr'
  | 'rol'
  | 'ror'
  | 'bswap'
  | 'popcount'
  | 'clz'
  | 'ctz';
export type BitGrouping = 'none' | 'nibble' | 'byte';
function domain(): never {
  throw new NumericFault('E_DOMAIN');
}
function check(o: WordOptions): void {
  if (
    ![8, 16, 32, 64].includes(o.width) ||
    typeof o.signed !== 'boolean' ||
    !['wrap', 'error'].includes(o.overflow)
  )
    domain();
}
export function mask(o: WordOptions): bigint {
  check(o);
  return (1n << BigInt(o.width)) - 1n;
}
export function fromBits(bits: bigint, o: WordOptions): bigint {
  const m = mask(o),
    b = bits & m;
  return o.signed && b > m >> 1n ? b - m - 1n : b;
}
export function word(value: bigint, o: WordOptions): bigint {
  const m = mask(o),
    min = o.signed ? -((m + 1n) >> 1n) : 0n,
    max = o.signed ? m >> 1n : m;
  if (o.overflow === 'error' && (value < min || value > max))
    throw new NumericFault('E_OVERFLOW');
  return fromBits(value, o);
}
export function operate(
  op: WordOperation,
  a: bigint,
  b: bigint,
  o: WordOptions,
): bigint {
  const m = mask(o),
    value = word(a, o),
    x = value & m;
  const bits = (v: bigint): bigint => fromBits(v, o);
  switch (op) {
    case 'and':
      return bits(x & (word(b, o) & m));
    case 'or':
      return bits(x | (word(b, o) & m));
    case 'xor':
      return bits(x ^ (word(b, o) & m));
    case 'not':
      return bits(~x);
    case 'nand':
      return bits(~(x & (word(b, o) & m)));
    case 'nor':
      return bits(~(x | (word(b, o) & m)));
    case 'xnor':
      return bits(~(x ^ (word(b, o) & m)));
    case 'shl':
      if (b < 0n) domain();
      if (b >= BigInt(o.width)) {
        if (o.overflow === 'error' && value !== 0n)
          throw new NumericFault('E_OVERFLOW');
        return 0n;
      }
      return word(value << b, o);
    case 'lsr':
    case 'asr':
      if (b < 0n) domain();
      return bits(
        (op === 'asr' ? value : x) >>
          (b < BigInt(o.width) ? b : BigInt(o.width)),
      );
    case 'rol':
    case 'ror': {
      if (b < 0n) domain();
      const n = b % BigInt(o.width),
        r = BigInt(o.width) - n;
      return bits(op === 'rol' ? (x << n) | (x >> r) : (x >> n) | (x << r));
    }
    case 'bswap': {
      let result = 0n;
      for (let i = 0; i < o.width; i += 8)
        result = (result << 8n) | ((x >> BigInt(i)) & 255n);
      return bits(result);
    }
    case 'popcount': {
      let v = x,
        count = 0n;
      while (v) {
        v &= v - 1n;
        count++;
      }
      return count;
    }
    case 'clz':
    case 'ctz': {
      let count = 0;
      for (let i = 0; i < o.width; i++) {
        const position = op === 'clz' ? o.width - 1 - i : i;
        if ((x >> BigInt(position)) & 1n) break;
        count++;
      }
      return BigInt(count);
    }
  }
}
export function parseBase(
  source: string,
  base: number,
  o: WordOptions,
): bigint {
  check(o);
  if (!Number.isInteger(base) || base < 2 || base > 36 || source.length > 10000)
    domain();
  let text = source.trim().replaceAll(' ', '').toLowerCase(),
    negative = false;
  if (text.startsWith('-') || text.startsWith('+')) {
    negative = text[0] === '-';
    text = text.slice(1);
  }
  const prefix =
    base === 16 ? '0x' : base === 2 ? '0b' : base === 8 ? '0o' : null;
  if (prefix && text.startsWith(prefix)) text = text.slice(2);
  if (!text || !/^[0-9a-z]+$/.test(text)) domain();
  let value = 0n;
  for (const c of text) {
    const digit = '0123456789abcdefghijklmnopqrstuvwxyz'.indexOf(c);
    if (digit < 0 || digit >= base) domain();
    value = value * BigInt(base) + BigInt(digit);
    if (value > 1n << 64n) {
      if (o.overflow === 'error') throw new NumericFault('E_OVERFLOW');
      value &= mask(o);
    }
  }
  if (negative || base === 10) return word(negative ? -value : value, o);
  if (o.overflow === 'error' && value > mask(o))
    throw new NumericFault('E_OVERFLOW');
  return fromBits(value, o);
}
export function formatBase(
  value: bigint,
  base: number,
  o: WordOptions,
  grouping: BitGrouping = 'none',
): string {
  if (!Number.isInteger(base) || base < 2 || base > 36) domain();
  const v = word(value, o);
  let text = (base === 10 ? v : v & mask(o)).toString(base).toUpperCase();
  const digits =
    base === 2
      ? o.width
      : base === 16
        ? o.width / 4
        : base === 8
          ? Math.ceil(o.width / 3)
          : 0;
  if (digits) text = text.padStart(digits, '0');
  const size =
    grouping === 'none'
      ? 0
      : base === 2
        ? grouping === 'nibble'
          ? 4
          : 8
        : base === 16
          ? grouping === 'nibble'
            ? 1
            : 2
          : 0;
  if (size) {
    const groups: string[] = [];
    while (text.length > size) {
      groups.unshift(text.slice(-size));
      text = text.slice(0, -size);
    }
    groups.unshift(text);
    text = groups.join(' ');
  }
  return text;
}
export type FloatWidth = 32 | 64;
export interface FloatParts {
  readonly bits: bigint;
  readonly sign: number;
  readonly exponent: number;
  readonly mantissa: bigint;
  readonly kind: 'zero' | 'normal' | 'subnormal' | 'infinity' | 'nan';
  readonly value: number;
  readonly exact: string;
}
function layout(width: FloatWidth): {
  mantissa: number;
  exponent: number;
  bias: number;
} {
  if (width !== 32 && width !== 64) domain();
  return width === 32
    ? { mantissa: 23, exponent: 8, bias: 127 }
    : { mantissa: 52, exponent: 11, bias: 1023 };
}
export function composeFloat(
  sign: number,
  exponent: number,
  mantissa: bigint,
  width: FloatWidth,
): bigint {
  const l = layout(width);
  if (
    (sign !== 0 && sign !== 1) ||
    !Number.isInteger(exponent) ||
    exponent < 0 ||
    exponent >= 1 << l.exponent ||
    mantissa < 0n ||
    mantissa >= 1n << BigInt(l.mantissa)
  )
    domain();
  return (
    (BigInt(sign) << BigInt(width - 1)) |
    (BigInt(exponent) << BigInt(l.mantissa)) |
    mantissa
  );
}
export function floatToBits(value: number, width: FloatWidth): bigint {
  layout(width);
  const data = new DataView(new ArrayBuffer(width / 8));
  if (width === 32) {
    data.setFloat32(0, value, false);
    return BigInt(data.getUint32(0, false));
  }
  data.setFloat64(0, value, false);
  return data.getBigUint64(0, false);
}
function exactBinary(coefficient: bigint, power: number, sign: number): string {
  if (coefficient === 0n) return sign ? '-0' : '0';
  let text: string;
  if (power >= 0) text = (coefficient << BigInt(power)).toString();
  else {
    const places = -power,
      digits = (coefficient * 5n ** BigInt(places))
        .toString()
        .padStart(places + 1, '0');
    text = (digits.slice(0, -places) + '.' + digits.slice(-places))
      .replace(/0+$/, '')
      .replace(/\.$/, '');
  }
  return (sign ? '-' : '') + text;
}
export function floatFromBits(bits: bigint, width: FloatWidth): FloatParts {
  const l = layout(width);
  if (bits < 0n || bits >= 1n << BigInt(width)) domain();
  const sign = Number(bits >> BigInt(width - 1)),
    exponent = Number(
      (bits >> BigInt(l.mantissa)) & ((1n << BigInt(l.exponent)) - 1n),
    ),
    mantissa = bits & ((1n << BigInt(l.mantissa)) - 1n);
  const kind =
    exponent === (1 << l.exponent) - 1
      ? mantissa
        ? 'nan'
        : 'infinity'
      : exponent === 0
        ? mantissa
          ? 'subnormal'
          : 'zero'
        : 'normal';
  const data = new DataView(new ArrayBuffer(width / 8));
  if (width === 32) data.setUint32(0, Number(bits), false);
  else data.setBigUint64(0, bits, false);
  const value =
    width === 32 ? data.getFloat32(0, false) : data.getFloat64(0, false);
  const exact =
    kind === 'nan'
      ? 'NaN'
      : kind === 'infinity'
        ? sign
          ? '-Infinity'
          : 'Infinity'
        : exactBinary(
            exponent === 0 ? mantissa : mantissa + (1n << BigInt(l.mantissa)),
            (exponent === 0 ? 1 : exponent) - l.bias - l.mantissa,
            sign,
          );
  return { bits, sign, exponent, mantissa, kind, value, exact };
}
export interface CharacterInfo {
  readonly character: string;
  readonly codepoint: number;
  readonly bytes: readonly number[];
}
export function codepointInfo(codepoint: number): CharacterInfo {
  if (
    !Number.isInteger(codepoint) ||
    codepoint < 0 ||
    codepoint > 0x10ffff ||
    (codepoint >= 0xd800 && codepoint <= 0xdfff)
  )
    domain();
  const c = codepoint;
  const bytes =
    c < 0x80
      ? [c]
      : c < 0x800
        ? [0xc0 | (c >> 6), 0x80 | (c & 63)]
        : c < 0x10000
          ? [0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)]
          : [
              0xf0 | (c >> 18),
              0x80 | ((c >> 12) & 63),
              0x80 | ((c >> 6) & 63),
              0x80 | (c & 63),
            ];
  return { character: String.fromCodePoint(c), codepoint: c, bytes };
}
export function characterInfo(character: string): CharacterInfo {
  if ([...character].length !== 1) domain();
  return codepointInfo(character.codePointAt(0) ?? -1);
}

export const programmerFunctions = [
  'xor',
  'nand',
  'nor',
  'xnor',
  'shl',
  'lsr',
  'asr',
  'rol',
  'ror',
  'bswap',
  'popcount',
  'clz',
  'ctz',
] as const;
