import type Decimal from 'decimal.js';
import type {
  ComplexMode,
  ComplexValue,
  EvalError,
  Result,
  SourceRange,
  Value,
} from './types.ts';
import {
  checkedNumber,
  D,
  failure,
  NumericFault,
  power,
  requireDomain,
} from './numeric.ts';

export function checkedComplex(
  re: Decimal.Value,
  im: Decimal.Value,
  range: SourceRange,
): Result<ComplexValue, EvalError> {
  const a = checkedNumber(re, range);
  if (!a.ok) return a;
  const b = checkedNumber(im, range);
  if (!b.ok) return b;
  return {
    ok: true,
    value: { kind: 'complex', re: a.value.value, im: b.value.value },
  };
}
export function complexValue(
  re: Decimal.Value,
  im: Decimal.Value,
): Result<ComplexValue, EvalError> {
  return checkedComplex(re, im, { start: 0, end: 0 });
}
export function normalizeValue(
  value: Value,
  range: SourceRange,
  mode: ComplexMode = 'off',
  depth = 0,
): Result<Value, EvalError> {
  if (depth > 128) return failure('E_RESOURCE_LIMIT', range);
  if (value.kind === 'number') return checkedNumber(value.value, range);
  if (value.kind === 'complex')
    return mode === 'on'
      ? checkedComplex(value.re, value.im, range)
      : failure('E_DOMAIN', range);
  if (value.kind === 'list') {
    if (value.values.length > 2048) return failure('E_RESOURCE_LIMIT', range);
    const values: Value[] = [];
    for (const item of value.values) {
      const r = normalizeValue(item, range, mode, depth + 1);
      if (!r.ok) return r;
      values.push(r.value);
    }
    return { ok: true, value: { kind: 'list', values } };
  }
  return failure('E_TYPE', range);
}
export function components(value: Value): readonly [Decimal, Decimal] {
  if (value.kind === 'complex') return [value.re, value.im];
  requireDomain(value.kind === 'number', 'E_TYPE');
  return [value.kind === 'number' ? value.value : new D(0), new D(0)];
}
export function binaryValue(
  operator: '+' | '-' | '*' | '/' | '^',
  left: Value,
  right: Value,
  range: SourceRange,
  mode: ComplexMode,
): Result<Value, EvalError> {
  try {
    if (left.kind === 'number' && right.kind === 'number') {
      const a = left.value,
        b = right.value;
      if (
        operator === '^' &&
        mode === 'on' &&
        a.isNegative() &&
        !b.isInteger()
      ) {
        const lnRe = a.abs().ln(),
          lnIm = D.acos(-1);
        const magnitude = lnRe.mul(b).exp(),
          angle = lnIm.mul(b);
        return checkedComplex(
          magnitude.mul(angle.cos()),
          magnitude.mul(angle.sin()),
          range,
        );
      }
      requireDomain(operator !== '/' || !b.isZero(), 'E_DIVISION_BY_ZERO');
      return checkedNumber(
        operator === '+'
          ? a.add(b)
          : operator === '-'
            ? a.sub(b)
            : operator === '*'
              ? a.mul(b)
              : operator === '/'
                ? a.div(b)
                : power(a, b),
        range,
      );
    }
    requireDomain(mode === 'on', 'E_DOMAIN');
    const [a, b] = components(left),
      [c, d] = components(right);
    if (operator === '+') return checkedComplex(a.add(c), b.add(d), range);
    if (operator === '-') return checkedComplex(a.sub(c), b.sub(d), range);
    if (operator === '*')
      return checkedComplex(
        a.mul(c).sub(b.mul(d)),
        a.mul(d).add(b.mul(c)),
        range,
      );
    if (operator === '/') {
      const denominator = c.mul(c).add(d.mul(d));
      requireDomain(!denominator.isZero(), 'E_DIVISION_BY_ZERO');
      return checkedComplex(
        a.mul(c).add(b.mul(d)).div(denominator),
        b.mul(c).sub(a.mul(d)).div(denominator),
        range,
      );
    }
    const zero = a.isZero() && b.isZero();
    requireDomain(!(zero && c.isZero() && d.isZero()));
    if (zero) {
      requireDomain(d.isZero() && c.gt(0), 'E_DOMAIN');
      return checkedComplex(0, 0, range);
    }
    if (d.isZero() && c.isInteger()) {
      requireDomain(c.abs().lte(100000), 'E_RESOURCE_LIMIT');
      let n = BigInt(c.abs().toFixed(0));
      let base: Value = { kind: 'complex', re: a, im: b };
      let result: Value = { kind: 'complex', re: new D(1), im: new D(0) };
      while (n > 0n) {
        if (n % 2n === 1n) {
          const r = binaryValue('*', result, base, range, mode);
          if (!r.ok) return r;
          result = r.value;
        }
        n /= 2n;
        if (n > 0n) {
          const r = binaryValue('*', base, base, range, mode);
          if (!r.ok) return r;
          base = r.value;
        }
      }
      return c.isNegative()
        ? binaryValue(
            '/',
            { kind: 'number', value: new D(1) },
            result,
            range,
            mode,
          )
        : { ok: true, value: result };
    }
    const lr = a.mul(a).add(b.mul(b)).sqrt().ln(),
      li = D.atan2(b, a);
    const real = c.mul(lr).sub(d.mul(li)),
      imag = c.mul(li).add(d.mul(lr));
    const magnitude = real.exp();
    requireDomain(!magnitude.isZero(), 'E_OVERFLOW');
    return checkedComplex(
      magnitude.mul(imag.cos()),
      magnitude.mul(imag.sin()),
      range,
    );
  } catch (e) {
    return failure(e instanceof NumericFault ? e.code : 'E_INTERNAL', range);
  }
}
