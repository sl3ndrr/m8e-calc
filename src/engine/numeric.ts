import Decimal from 'decimal.js';
import type {
  Arity,
  EvalError,
  EvalErrorCode,
  NumberValue,
  Result,
  SourceRange,
} from './types.ts';

export const PRECISION = 50;
export const MAX_SOURCE_LENGTH = 10000;
export const MAX_NODES = 2048;
export const MAX_DEPTH = 128;
export const MAX_EXPONENT = 10000;

// Private clones: never set the application's Decimal constructor configuration.
export const D = Decimal.clone({
  precision: PRECISION,
  rounding: Decimal.ROUND_HALF_UP,
  modulo: Decimal.EUCLID,
  minE: -9e15,
  maxE: 9e15,
  toExpNeg: -7,
  toExpPos: 21,
});
export const Guard = Decimal.clone({
  precision: 80,
  rounding: Decimal.ROUND_HALF_UP,
  modulo: Decimal.EUCLID,
  minE: -9e15,
  maxE: 9e15,
  toExpNeg: -7,
  toExpPos: 21,
});
export const PI_TEXT =
  '3.14159265358979323846264338327950288419716939937510582097494459230781640628620899862803482534211706798214808651';
export const PI = new Guard(PI_TEXT);

export function failure(
  code: EvalErrorCode,
  range: SourceRange,
): Result<never, EvalError> {
  return { ok: false, error: { code, range } };
}

export class NumericFault extends Error {
  readonly code: EvalErrorCode;
  constructor(code: EvalErrorCode) {
    super();
    this.code = code;
  }
}

export function requireDomain(
  condition: boolean,
  code: EvalErrorCode = 'E_DOMAIN',
): void {
  if (!condition) throw new NumericFault(code);
}

export function acceptsArity(arity: Arity, count: number): boolean {
  return typeof arity === 'number'
    ? count === arity
    : count >= arity.min && (arity.max === undefined || count <= arity.max);
}

export function checkedNumber(
  input: Decimal.Value,
  range: SourceRange,
): Result<NumberValue, EvalError> {
  try {
    const value = new D(input).toSignificantDigits(PRECISION);
    if (
      !value.isFinite() ||
      (!value.isZero() && Math.abs(value.e) > MAX_EXPONENT)
    ) {
      return failure('E_OVERFLOW', range);
    }
    // Decimal itself can underflow beyond minE. Preserve the error for nonzero literals.
    if (
      value.isZero() &&
      typeof input === 'string' &&
      /[1-9]/.test(input.split(/[eE]/)[0] ?? '')
    ) {
      return failure('E_OVERFLOW', range);
    }
    return {
      ok: true,
      value: { kind: 'number', value: value.isZero() ? new D(0) : value },
    };
  } catch {
    return failure('E_DOMAIN', range);
  }
}

export function numberValue(
  input: Decimal.Value,
): Result<NumberValue, EvalError> {
  return checkedNumber(input, { start: 0, end: 0 });
}

export function power(base: Decimal, exponent: Decimal): Decimal {
  requireDomain(!(base.isZero() && exponent.isZero()));
  requireDomain(
    !(base.isZero() && exponent.isNegative()),
    'E_DIVISION_BY_ZERO',
  );
  requireDomain(!base.isNegative() || exponent.isInteger());
  const value = base.pow(exponent);
  requireDomain(base.isZero() || !value.isZero(), 'E_OVERFLOW');
  return value;
}

export function factorial(value: Decimal): Decimal {
  requireDomain(value.isInteger() && !value.isNegative());
  requireDomain(value.lte(1000), 'E_RESOURCE_LIMIT');
  // Exact bounded integer product, followed by one 50-digit rounding.
  let product = 1n;
  const last = BigInt(value.toFixed(0));
  for (let n = 2n; n <= last; n++) product *= n;
  return new D(product.toString()).toSignificantDigits(PRECISION);
}
