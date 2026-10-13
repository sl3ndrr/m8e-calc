import type Decimal from 'decimal.js';
import { D, factorial, Guard, PI, requireDomain } from './numeric.ts';

// Stirling log-gamma coefficients B_(2k)/(2k*(2k-1)), DLMF 5.11.1.
const bernoulli: readonly (readonly [string, string])[] = [
  ['1', '12'],
  ['-1', '360'],
  ['1', '1260'],
  ['-1', '1680'],
  ['1', '1188'],
  ['-691', '360360'],
  ['1', '156'],
  ['-3617', '122400'],
  ['43867', '244188'],
  ['-174611', '125400'],
  ['77683', '5796'],
  ['-236364091', '1506960'],
  ['657931', '300'],
  ['-3392780147', '93960'],
  ['1723168255201', '2492028'],
];
export function gamma(x: Decimal): Decimal {
  requireDomain(x.abs().lte(1000), 'E_RESOURCE_LIMIT');
  requireDomain(!(x.lte(0) && x.isInteger()));
  if (x.isInteger() && x.gt(0)) return factorial(x.sub(1));
  if (x.lt('0.5')) {
    // Reduce before multiplying by pi to retain the phase next to negative poles.
    const magnitude = new Guard(x).abs().mod(2);
    const reduced = x.isNegative() ? magnitude.neg() : magnitude;
    const sin = PI.mul(reduced).sin();
    return PI.div(sin.mul(positiveGamma(new Guard(1).sub(x))));
  }
  return positiveGamma(x);
}
function positiveGamma(x: Decimal): Decimal {
  let z = new Guard(x);
  let product = new Guard(1);
  while (z.lt(64)) {
    product = product.mul(z);
    z = z.add(1);
  }
  const inverse = new Guard(1).div(z),
    square = inverse.mul(inverse);
  let power = inverse,
    series = new Guard(0);
  for (const [numerator, denominator] of bernoulli) {
    series = series.add(power.mul(numerator).div(denominator));
    power = power.mul(square);
  }
  const log = z
    .sub('0.5')
    .mul(z.ln())
    .sub(z)
    .add(PI.mul(2).ln().div(2))
    .add(series);
  return log.exp().div(product);
}
export function boundedInteger(
  x: Decimal,
  maximum: string,
  nonnegative = false,
): bigint {
  requireDomain(x.isInteger() && (!nonnegative || x.gte(0)));
  requireDomain(x.abs().lte(maximum), 'E_RESOURCE_LIMIT');
  return BigInt(x.toFixed(0));
}
export function combinatorial(
  n: Decimal,
  r: Decimal,
  combination: boolean,
): Decimal {
  const a = boundedInteger(n, '1000', true),
    b = boundedInteger(r, '1000', true);
  requireDomain(b <= a);
  const count = combination && a - b < b ? a - b : b;
  let product = 1n;
  for (let k = 1n; k <= count; k++)
    product = combination
      ? (product * (a - count + k)) / k
      : product * (a - k + 1n);
  return new D(product.toString());
}
export function gcdBigInt(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b !== 0n) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a;
}
export function primeFactors(x: Decimal): readonly Decimal[] {
  let n = boundedInteger(x, '1000000000000', true);
  requireDomain(n >= 1n);
  const factors: Decimal[] = [];
  for (
    let divisor = 2n;
    divisor * divisor <= n;
    divisor = divisor === 2n ? 3n : divisor + 2n
  ) {
    while (n % divisor === 0n) {
      factors.push(new D(divisor.toString()));
      n /= divisor;
    }
  }
  if (n > 1n) factors.push(new D(n.toString()));
  return factors;
}
export function isPrime(x: Decimal): Decimal {
  const n = boundedInteger(x, '1000000000000', true);
  if (n < 2n) return new D(0);
  if (n === 2n) return new D(1);
  if (n % 2n === 0n) return new D(0);
  for (let divisor = 3n; divisor * divisor <= n; divisor += 2n)
    if (n % divisor === 0n) return new D(0);
  return new D(1);
}
export function variance(args: readonly Decimal[], sample: boolean): Decimal {
  const mean = args.reduce((a, b) => a.add(b), new D(0)).div(args.length);
  // Two-pass centred sum avoids cancellation for large offsets.
  return args
    .reduce((a, b) => a.add(b.sub(mean).pow(2)), new D(0))
    .div(args.length - (sample ? 1 : 0));
}
