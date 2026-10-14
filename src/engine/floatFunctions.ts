import type { AngleMode, FunctionDefinition } from './types.ts';

type FloatImplementation = NonNullable<FunctionDefinition['floatImpl']>;
export function angleScale(mode: AngleMode): number {
  return mode === 'deg' ? Math.PI / 180 : mode === 'grad' ? Math.PI / 200 : 1;
}
export function floatFactorial(x: number): number {
  if (!Number.isInteger(x) || x < 0 || x > 170) return NaN;
  let value = 1;
  for (let n = 2; n <= x; n++) value *= n;
  return value;
}
function gamma(x: number): number {
  if (Math.abs(x) > 1000 || (x <= 0 && Number.isInteger(x))) return NaN;
  // Lanczos g=7, nine coefficients; double precision, away from poles.
  if (x < 0.5) return Math.PI / (Math.sin(Math.PI * x) * gamma(1 - x));
  const coefficients = [
    676.5203681218851, -1259.1392167224028, 771.3234287776531,
    -176.6150291621406, 12.507343278686905, -0.13857109526572012,
    9.984369578019572e-6, 1.5056327351493116e-7,
  ];
  let sum = 0.9999999999998099;
  const z = x - 1;
  for (let i = 0; i < coefficients.length; i++)
    sum += (coefficients[i] ?? 0) / (z + i + 1);
  const t = z + 7.5;
  return Math.sqrt(2 * Math.PI) * t ** (z + 0.5) * Math.exp(-t) * sum;
}
function integerPair(a: number, b: number): boolean {
  return (
    Number.isInteger(a) &&
    Number.isInteger(b) &&
    Math.abs(a) <= 1e15 &&
    Math.abs(b) <= 1e15
  );
}
function gcd(a: number, b: number): number {
  if (!integerPair(a, b)) return NaN;
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}
function combinations(n: number, r: number, permutations: boolean): number {
  if (!integerPair(n, r) || n < 0 || r < 0 || r > n || n > 1000) return NaN;
  if (!permutations) r = Math.min(r, n - r);
  let result = 1;
  for (let i = 1; i <= r; i++) result *= (n - i + 1) / (permutations ? 1 : i);
  return result;
}
function rounded(x: number, places: number): number {
  if (!Number.isInteger(places) || Math.abs(places) > 100) return NaN;
  const scale = 10 ** places,
    magnitude = Math.abs(x) * scale;
  return Number.isFinite(magnitude)
    ? (Math.sign(x) * Math.floor(magnitude + 0.5)) / scale
    : x;
}
function variance(args: readonly number[], population: boolean): number {
  if (args.length < (population ? 1 : 2)) return NaN;
  let mean = 0,
    sum = 0,
    n = 0;
  for (const x of args) {
    n++;
    const delta = x - mean;
    mean += delta / n;
    sum += delta * (x - mean);
  }
  return sum / (n - (population ? 0 : 1));
}
const unary =
  (f: (x: number) => number): FloatImplementation =>
  (args) =>
    f(args[0] ?? NaN);
const binary =
  (f: (a: number, b: number) => number): FloatImplementation =>
  (args) =>
    f(args[0] ?? NaN, args[1] ?? NaN);
const trig =
  (f: (r: number) => number): FloatImplementation =>
  (args, ctx) =>
    f((args[0] ?? NaN) * angleScale(ctx.angleMode));
const inverse =
  (f: (x: number) => number): FloatImplementation =>
  (args, ctx) =>
    f(args[0] ?? NaN) / angleScale(ctx.angleMode);
const reciprocalTrig =
  (cosine: boolean, cotangent = false): FloatImplementation =>
  (args, ctx) => {
    const r = (args[0] ?? NaN) * angleScale(ctx.angleMode);
    const denominator = cosine ? Math.cos(r) : Math.sin(r);
    // Exact quadrantal poles are within a few floating-point ULPs.
    return Math.abs(denominator) <= 4 * Number.EPSILON
      ? NaN
      : (cotangent ? Math.cos(r) : 1) / denominator;
  };
export const floatImplementations: Readonly<
  Record<string, FloatImplementation>
> = Object.freeze({
  sqrt: unary(Math.sqrt),
  cbrt: unary(Math.cbrt),
  abs: unary(Math.abs),
  root: binary((n, x) =>
    !Number.isInteger(n) ||
    n === 0 ||
    (x < 0 && Math.abs(n % 2) !== 1) ||
    (x === 0 && n < 0)
      ? NaN
      : (x < 0 ? -1 : 1) * Math.abs(x) ** (1 / n),
  ),
  exp: unary((x) => {
    const y = Math.exp(x);
    return y === 0 && x !== 0 ? NaN : y;
  }),
  ln: unary(Math.log),
  log: unary(Math.log10),
  log2: unary(Math.log2),
  logb: binary((b, x) =>
    b > 0 && b !== 1 && x > 0 ? Math.log(x) / Math.log(b) : NaN,
  ),
  sin: trig(Math.sin),
  cos: trig(Math.cos),
  tan: (args, ctx) => {
    const r = (args[0] ?? NaN) * angleScale(ctx.angleMode);
    return Math.abs(Math.cos(r)) <= 4 * Number.EPSILON ? NaN : Math.tan(r);
  },
  asin: inverse(Math.asin),
  acos: inverse(Math.acos),
  atan: inverse(Math.atan),
  atan2: (args, ctx) =>
    args[0] === 0 && args[1] === 0
      ? NaN
      : Math.atan2(args[0] ?? NaN, args[1] ?? NaN) / angleScale(ctx.angleMode),
  sec: reciprocalTrig(true),
  csc: reciprocalTrig(false),
  cot: reciprocalTrig(false, true),
  deg2rad: unary((x) => (x * Math.PI) / 180),
  rad2deg: unary((x) => (x * 180) / Math.PI),
  sinh: unary(Math.sinh),
  cosh: unary(Math.cosh),
  tanh: unary(Math.tanh),
  asinh: unary(Math.asinh),
  acosh: unary(Math.acosh),
  atanh: unary(Math.atanh),
  floor: unary(Math.floor),
  ceil: unary(Math.ceil),
  trunc: unary(Math.trunc),
  sign: unary(Math.sign),
  frac: unary((x) => x - Math.trunc(x)),
  round: (args) => rounded(args[0] ?? NaN, args[1] ?? 0),
  min: (args) => args.reduce((a, b) => Math.min(a, b), Infinity),
  max: (args) => args.reduce((a, b) => Math.max(a, b), -Infinity),
  mod: binary((a, b) =>
    b === 0 ? NaN : ((a % Math.abs(b)) + Math.abs(b)) % Math.abs(b),
  ),
  factorial: unary(floatFactorial),
  gamma: unary(gamma),
  nCr: binary((n, r) => combinations(n, r, false)),
  nPr: binary((n, r) => combinations(n, r, true)),
  gcd: binary(gcd),
  lcm: binary((a, b) =>
    !integerPair(a, b)
      ? NaN
      : a === 0 || b === 0
        ? 0
        : Math.abs((a / gcd(a, b)) * b),
  ),
  isPrime: unary((x) => {
    if (!Number.isInteger(x) || x < 0 || x > 1e12) return NaN;
    if (x < 2) return 0;
    if (x % 2 === 0) return x === 2 ? 1 : 0;
    for (let i = 3; i * i <= x; i += 2) if (x % i === 0) return 0;
    return 1;
  }),
  total: (args) => args.reduce((a, b) => a + b, 0),
  count: (args) => args.length,
  mean: (args) => args.reduce((a, b) => a + b / args.length, 0),
  median: (args) => {
    const sorted = [...args].sort((a, b) => a - b),
      middle = Math.floor(sorted.length / 2);
    return sorted.length % 2
      ? (sorted[middle] ?? NaN)
      : ((sorted[middle - 1] ?? NaN) + (sorted[middle] ?? NaN)) / 2;
  },
  variance: (args) => variance(args, false),
  stdev: (args) => Math.sqrt(variance(args, false)),
  stdevp: (args) => Math.sqrt(variance(args, true)),
  re: unary((x) => x),
  im: unary(() => 0),
  conj: unary((x) => x),
  arg: (args, ctx) =>
    (args[0] ?? 0) === 0
      ? NaN
      : (args[0] ?? NaN) < 0
        ? Math.PI / angleScale(ctx.angleMode)
        : 0,
});
