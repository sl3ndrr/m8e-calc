export interface Rational {
  readonly numerator: bigint;
  readonly denominator: bigint;
}

/** The real number rational + radical * √radicand, in canonical form. */
export interface ExactNumber {
  readonly rational: Rational;
  readonly radical: Rational;
  readonly radicand: bigint;
}

export class UnsupportedExactAnalysis extends Error {}

export const abs = (n: bigint): bigint => (n < 0n ? -n : n);
export const sign = (n: bigint): -1 | 0 | 1 => (n < 0n ? -1 : n > 0n ? 1 : 0);

export function gcd(a: bigint, b: bigint): bigint {
  while (b !== 0n) [a, b] = [b, a % b];
  return abs(a);
}

const coefficientLimit = 1n << 512n;

function reduced(numerator: bigint, denominator: bigint): Rational {
  if (denominator === 0n) throw new UnsupportedExactAnalysis();
  const divisor = gcd(numerator, denominator) * BigInt(sign(denominator));
  return { numerator: numerator / divisor, denominator: denominator / divisor };
}

export function rational(numerator: bigint, denominator = 1n): Rational {
  const value = reduced(numerator, denominator);
  if (
    abs(value.numerator) >= coefficientLimit ||
    value.denominator >= coefficientLimit
  )
    throw new UnsupportedExactAnalysis();
  return value;
}

export const zero = rational(0n);
export const one = rational(1n);
export const negate = (a: Rational): Rational => ({
  numerator: -a.numerator,
  denominator: a.denominator,
});
export const add = (a: Rational, b: Rational): Rational =>
  rational(
    a.numerator * b.denominator + b.numerator * a.denominator,
    a.denominator * b.denominator,
  );
export const multiply = (a: Rational, b: Rational): Rational =>
  rational(a.numerator * b.numerator, a.denominator * b.denominator);
export const divide = (a: Rational, b: Rational): Rational =>
  rational(a.numerator * b.denominator, a.denominator * b.numerator);

export function decimal(source: string): Rational {
  const match = /^([+-]?)(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(source);
  const [, prefix, whole = '', fraction = '', exponent = '0'] = match ?? [];
  const digits = whole + fraction;
  const shift = Number(exponent) - fraction.length;
  if (!digits || digits.length > 360 || !(Math.abs(shift) <= 360))
    throw new UnsupportedExactAnalysis();
  const numerator = BigInt(prefix === '-' ? '-' + digits : digits);
  return shift < 0
    ? reduced(numerator, 10n ** BigInt(-shift))
    : reduced(numerator * 10n ** BigInt(shift), 1n);
}

export const exact = (
  rational: Rational,
  radical = zero,
  radicand = 0n,
): ExactNumber => ({
  rational,
  radical,
  radicand: radical.numerator === 0n ? 0n : radicand,
});

export function evaluateExact(
  coefficients: readonly Rational[],
  x: ExactNumber,
): ExactNumber {
  let a = zero;
  let b = zero;
  for (let i = coefficients.length - 1; i >= 0; i--) {
    const nextA = add(
      add(
        multiply(a, x.rational),
        multiply(multiply(b, x.radical), {
          numerator: x.radicand,
          denominator: 1n,
        }),
      ),
      coefficients[i] ?? zero,
    );
    b = add(multiply(b, x.rational), multiply(a, x.radical));
    a = nextA;
  }
  return exact(a, b, x.radicand);
}

function radicalSign(a: bigint, b: bigint, d: bigint): -1 | 0 | 1 {
  if (!b || !a || sign(a) === sign(b)) return sign(a || b);
  return sign(BigInt(sign(a)) * (a * a - b * b * d));
}

export function compareExact(x: ExactNumber, y: ExactNumber): -1 | 0 | 1 {
  // Put the difference over a common positive denominator, then compare magnitudes.
  const { rational: a, radical: b, radicand: d } = x;
  const { rational: c, radical: e, radicand: f } = y;
  const baseDenominator = a.denominator * c.denominator;
  const p =
    (a.numerator * c.denominator - c.numerator * a.denominator) *
    b.denominator *
    e.denominator;
  const q = b.numerator * e.denominator * baseDenominator;
  const r = -e.numerator * b.denominator * baseDenominator;
  if (d === f) return radicalSign(p, q + r, d);
  const left = radicalSign(p, q, d);
  if (!r || !left || left === sign(r)) return left || sign(r);
  return sign(
    BigInt(left) *
      BigInt(radicalSign(p * p + q * q * d - r * r * f, 2n * p * q, d)),
  );
}

export const exactZero = exact(zero);

function floatRatio(a: bigint, b: bigint, divisor = 1): number {
  if (!a) return 0;
  // Scale each operand independently to keep large integer conversions finite.
  const aShift = Math.max(0, abs(a).toString(2).length - 54);
  const bShift = Math.max(0, b.toString(2).length - 54);
  const divisorShift = Math.floor(Math.log2(Math.abs(divisor)));
  const ratio =
    Number(abs(a) >> BigInt(aShift)) /
    Number(b >> BigInt(bShift)) /
    (divisor / 2 ** divisorShift);
  const shift = Math.floor(Math.log2(Math.abs(ratio)));
  const exponent = aShift - bShift - divisorShift + shift;
  const mantissa = (sign(a) * ratio) / 2 ** shift;
  // Keep the final operation as the one that rounds into the subnormal range.
  return exponent < -1022
    ? mantissa * 2 ** (exponent + 1022) * 2 ** -1022
    : mantissa * 2 ** exponent;
}

export function exactToNumber({
  rational: a,
  radical: b,
  radicand: d,
}: ExactNumber): number {
  const real = floatRatio(a.numerator, a.denominator);
  const radical = floatRatio(b.numerator, b.denominator) * Math.sqrt(Number(d));
  if (real * radical >= 0) return real + radical;
  // Use the conjugate to avoid cancellation at nearly equal magnitudes.
  const p = a.numerator * b.denominator;
  const q = b.numerator * a.denominator;
  return floatRatio(
    p * p - q * q * d,
    (a.denominator * b.denominator) ** 2n,
    real - radical,
  );
}

function integerSqrt(n: bigint): bigint {
  if (n < 2n) return n;
  let estimate = 1n << BigInt(Math.ceil(n.toString(2).length / 2));
  for (;;) {
    const next = (estimate + n / estimate) / 2n;
    if (next >= estimate) return estimate;
    estimate = next;
  }
}

export function simplifySqrt(
  n: bigint,
  spendTrial: () => void,
): { factor: bigint; radicand: bigint } {
  const root = integerSqrt(n);
  if (root * root === n) return { factor: root, radicand: 1n };
  let factor = 1n;
  let radicand = 1n;
  for (
    let divisor = 2n;
    divisor * divisor <= n;
    divisor += divisor === 2n ? 1n : 2n
  ) {
    spendTrial();
    if (n % divisor !== 0n) continue;
    while (n % (divisor * divisor) === 0n) {
      n /= divisor * divisor;
      factor *= divisor;
    }
    if (n % divisor === 0n) {
      n /= divisor;
      radicand *= divisor;
    }
    const rest = integerSqrt(n);
    if (rest * rest === n) return { factor: factor * rest, radicand };
  }
  return { factor, radicand: radicand * n };
}
