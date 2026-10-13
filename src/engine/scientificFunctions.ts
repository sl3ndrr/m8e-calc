import type Decimal from 'decimal.js';
import type {
  Ast,
  EvalError,
  FunctionContext,
  FunctionDefinition,
  Result,
  Value,
} from './types.ts';
import {
  checkedNumber,
  D,
  factorial,
  failure,
  Guard,
  NumericFault,
  requireDomain,
} from './numeric.ts';
import { binary, define, unary } from './functionHelpers.ts';
import {
  boundedInteger,
  combinatorial,
  gamma,
  gcdBigInt,
  isPrime,
  primeFactors,
  variance,
} from './scientificNumeric.ts';
import { fromRadians, sineCosine } from './trigonometry.ts';
import { binaryValue } from './values.ts';
import { differentiate, integrate } from './quadrature.ts';

function binder(
  name: string,
  arity: number,
  de: string,
  en: string,
): FunctionDefinition {
  return Object.freeze({
    name,
    arity,
    category: 'calculus',
    doc: Object.freeze({ de, en }),
    impl: (_args: readonly Value[], ctx: FunctionContext) =>
      failure('E_TYPE', ctx.range),
    astImpl: (
      args: readonly Ast[],
      ctx: FunctionContext,
    ): Result<Value, EvalError> => {
      try {
        const [expression, variable, from, to] = args;
        if (!expression || !variable || !from || !ctx.evaluate)
          return failure('E_TYPE', ctx.range);
        if (variable.kind !== 'identifier')
          return failure('E_TYPE', variable.range);
        if (ctx.isReserved?.(variable.name))
          return failure('E_RESERVED_NAME', variable.range);
        const start = ctx.evaluate(from);
        if (!start.ok) return start;
        if (start.value.kind !== 'number') return failure('E_TYPE', from.range);
        const evalAt = (x: Decimal): Result<Value, EvalError> =>
          ctx.evaluate?.(expression, {
            [variable.name]: { kind: 'number', value: x },
          }) ?? failure('E_INTERNAL', ctx.range);
        const realAt = (x: Decimal) => {
          const r = evalAt(x);
          if (!r.ok) return r;
          return r.value.kind === 'number'
            ? { ok: true as const, value: r.value }
            : failure('E_TYPE', expression.range);
        };
        if (name === 'deriv')
          return differentiate(
            realAt,
            start.value.value,
            ctx.numerical,
            ctx.range,
          );
        if (!to) return failure('E_ARGUMENT_COUNT', ctx.range);
        const end = ctx.evaluate(to);
        if (!end.ok) return end;
        if (end.value.kind !== 'number') return failure('E_TYPE', to.range);
        if (name === 'integral') {
          const r = integrate(
            realAt,
            start.value.value,
            end.value.value,
            ctx.numerical,
            ctx.range,
          );
          return r.ok ? checkedNumber(r.value.value, ctx.range) : r;
        }
        requireDomain(
          start.value.value.isInteger() && end.value.value.isInteger(),
        );
        const count = end.value.value.sub(start.value.value).add(1);
        requireDomain(count.lte(10000), 'E_RESOURCE_LIMIT');
        let accumulator: Value = {
          kind: 'number',
          value: new D(name === 'sum' ? 0 : 1),
        };
        for (let n = 0; n < count.toNumber(); n++) {
          const r = evalAt(start.value.value.add(n));
          if (!r.ok) return r;
          const combined = binaryValue(
            name === 'sum' ? '+' : '*',
            accumulator,
            r.value,
            ctx.range,
            ctx.complex ?? 'off',
          );
          if (!combined.ok) return combined;
          accumulator = combined.value;
        }
        return { ok: true, value: accumulator };
      } catch (e) {
        return failure(
          e instanceof NumericFault ? e.code : 'E_INTERNAL',
          ctx.range,
        );
      }
    },
  });
}
const hyperbolic = [
  unary(
    'sinh',
    'hyperbolic',
    'Hyperbolischer Sinus, reell und winkelunabhängig.',
    'Hyperbolic sine, real and independent of angle mode.',
    (x) => x.sinh(),
  ),
  unary(
    'cosh',
    'hyperbolic',
    'Hyperbolischer Kosinus, reell und winkelunabhängig.',
    'Hyperbolic cosine, real and independent of angle mode.',
    (x) => x.cosh(),
  ),
  unary(
    'tanh',
    'hyperbolic',
    'Hyperbolischer Tangens, reell und winkelunabhängig.',
    'Hyperbolic tangent, real and independent of angle mode.',
    (x) => x.tanh(),
  ),
  unary(
    'asinh',
    'hyperbolic',
    'Inverser hyperbolischer Sinus, reell.',
    'Inverse hyperbolic sine, real.',
    (x) => x.asinh(),
  ),
  unary(
    'acosh',
    'hyperbolic',
    'Inverser hyperbolischer Kosinus, x ≥ 1.',
    'Inverse hyperbolic cosine, x ≥ 1.',
    (x) => {
      requireDomain(x.gte(1));
      return x.acosh();
    },
  ),
  unary(
    'atanh',
    'hyperbolic',
    'Inverser hyperbolischer Tangens, abs(x) < 1.',
    'Inverse hyperbolic tangent, abs(x) < 1.',
    (x) => {
      requireDomain(x.abs().lt(1));
      return x.atanh();
    },
  ),
];
export const scientificDefinitions: readonly FunctionDefinition[] = [
  ...hyperbolic,
  ...(['sec', 'csc', 'cot'] as const).map((name) =>
    unary(
      name,
      'trigonometry',
      `${name}: reziproke Winkelfunktion; Pole sind Definitionsfehler.`,
      `${name}: reciprocal trigonometric function; poles are domain errors.`,
      (x, ctx) => {
        const [sin, cos] = sineCosine(x, ctx.angleMode);
        const denominator = name === 'sec' ? cos : sin;
        requireDomain(!denominator.isZero());
        return (name === 'cot' ? cos : new Guard(1)).div(denominator);
      },
    ),
  ),
  unary(
    'deg2rad',
    'trigonometry',
    'Grad zu Radiant, unabhängig vom Winkelmodus.',
    'Degrees to radians, independent of angle mode.',
    (x) => new Guard(x).mul(Guard.acos(-1)).div(180),
  ),
  unary(
    'rad2deg',
    'trigonometry',
    'Radiant zu Grad, unabhängig vom Winkelmodus.',
    'Radians to degrees, independent of angle mode.',
    (x) => fromRadians(new Guard(x), 'deg'),
  ),
  unary(
    'factorial',
    'combinatorics',
    'Fakultät, ganze Zahlen 0…1000; alternativ x!.',
    'Factorial, integers 0…1000; alternatively x!.',
    factorial,
  ),
  unary(
    'gamma',
    'combinatorics',
    'Gamma-Funktion, reell; abs(x) ≤ 1000, keine nichtpositiven ganzzahligen Pole.',
    'Real gamma; abs(x) ≤ 1000, excludes nonpositive integer poles.',
    gamma,
  ),
  binary(
    'nCr',
    'combinatorics',
    'Binomialkoeffizient nCr(n,r), 0 ≤ r ≤ n ≤ 1000, ganzzahlig.',
    'Binomial coefficient nCr(n,r), integer 0 ≤ r ≤ n ≤ 1000.',
    (n, r) => combinatorial(n, r, true),
  ),
  binary(
    'nPr',
    'combinatorics',
    'Geordnete Auswahl nPr(n,r), 0 ≤ r ≤ n ≤ 1000, ganzzahlig.',
    'Ordered selections nPr(n,r), integer 0 ≤ r ≤ n ≤ 1000.',
    (n, r) => combinatorial(n, r, false),
  ),
  binary(
    'gcd',
    'numberTheory',
    'Größter gemeinsamer Teiler ganzer Zahlen, abs ≤ 10^15.',
    'Greatest common divisor of integers, abs ≤ 10^15.',
    (a, b) =>
      new D(
        gcdBigInt(
          boundedInteger(a, '1000000000000000'),
          boundedInteger(b, '1000000000000000'),
        ).toString(),
      ),
  ),
  binary(
    'lcm',
    'numberTheory',
    'Kleinstes gemeinsames Vielfaches, ganzzahlig, abs ≤ 10^15.',
    'Least common multiple of integers, abs ≤ 10^15.',
    (a, b) => {
      const x = boundedInteger(a, '1000000000000000'),
        y = boundedInteger(b, '1000000000000000');
      const g = gcdBigInt(x, y);
      const v = g === 0n ? 0n : (x / g) * y;
      return new D((v < 0n ? -v : v).toString());
    },
  ),
  unary(
    'isPrime',
    'numberTheory',
    'Primprüfung ganzer Zahlen 0…10^12: 1 oder 0.',
    'Primality of integers 0…10^12: returns 1 or 0.',
    isPrime,
  ),
  {
    name: 'factor',
    arity: 1,
    category: 'numberTheory',
    doc: {
      de: 'Aufsteigende Primfaktoren mit Wiederholung, ganze Zahlen 1…10^12.',
      en: 'Ascending prime factors with multiplicity, integers 1…10^12.',
    },
    impl: (args, ctx) => {
      const value = args[0];
      if (args.length !== 1) return failure('E_ARGUMENT_COUNT', ctx.range);
      if (value?.kind !== 'number') return failure('E_TYPE', ctx.range);
      try {
        return {
          ok: true,
          value: {
            kind: 'list',
            values: primeFactors(value.value).map((value) => ({
              kind: 'number',
              value,
            })),
          },
        };
      } catch (e) {
        return failure(
          e instanceof NumericFault ? e.code : 'E_INTERNAL',
          ctx.range,
        );
      }
    },
  },
  unary(
    'frac',
    'rounding',
    'Vorzeichenbehafteter Bruchteil x-trunc(x).',
    'Signed fractional part x-trunc(x).',
    (x) => x.sub(x.trunc()),
  ),
  define(
    'round',
    { min: 1, max: 2 },
    'rounding',
    'round(x,n=0): Dezimalstellen −100…100; Gleichstand vom Nullpunkt weg.',
    'round(x,n=0): decimal places −100…100; ties away from zero.',
    (args) => {
      const x = args[0] ?? new D(0),
        n = args[1] ?? new D(0);
      requireDomain(n.isInteger() && n.abs().lte(100));
      const factor = new D(10).pow(n);
      return x.mul(factor).round().div(factor);
    },
  ),
  define(
    'total',
    { min: 0 },
    'aggregation',
    'Summe aller reellen Argumente; total() = 0.',
    'Sum of all real arguments; total() = 0.',
    (args) => args.reduce((a, b) => a.add(b), new D(0)),
  ),
  define(
    'count',
    { min: 0 },
    'aggregation',
    'Anzahl reeller Argumente; count() = 0.',
    'Count of real arguments; count() = 0.',
    (args) => new D(args.length),
  ),
  define(
    'mean',
    { min: 1 },
    'aggregation',
    'Arithmetischer Mittelwert reeller Argumente.',
    'Arithmetic mean of real arguments.',
    (args) => args.reduce((a, b) => a.add(b), new D(0)).div(args.length),
  ),
  define(
    'median',
    { min: 1 },
    'aggregation',
    'Median sortierter reeller Argumente, Mitte bei gerader Anzahl gemittelt.',
    'Median of sorted real arguments; averages middle pair for even counts.',
    (args) => {
      const sorted = [...args].sort((a, b) => a.cmp(b));
      const middle = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 1
        ? (sorted[middle] ?? new D(0))
        : (sorted[middle - 1] ?? new D(0)).add(sorted[middle] ?? 0).div(2);
    },
  ),
  define(
    'variance',
    { min: 2 },
    'aggregation',
    'Stichprobenvarianz mit Divisor n−1, mindestens zwei reelle Werte.',
    'Sample variance with divisor n−1, at least two real values.',
    (args) => variance(args, true),
  ),
  define(
    'stdev',
    { min: 2 },
    'aggregation',
    'Stichprobenstandardabweichung mit Divisor n−1.',
    'Sample standard deviation with divisor n−1.',
    (args) => variance(args, true).sqrt(),
  ),
  define(
    'stdevp',
    { min: 1 },
    'aggregation',
    'Standardabweichung der Grundgesamtheit mit Divisor n.',
    'Population standard deviation with divisor n.',
    (args) => variance(args, false).sqrt(),
  ),
  ...(['arg', 'conj', 're', 'im'] as const).map((name) =>
    unary(
      name,
      'complex',
      `${name}(z): Hauptargument im Winkelmodus, Konjugation, Real- bzw. Imaginärteil.`,
      `${name}(z): principal argument in angle mode, conjugation, real or imaginary part.`,
      (x) => x,
    ),
  ),
  binder(
    'sum',
    4,
    'sum(expr,k,von,bis): inklusive ganzzahlige Grenzen, AST-Bindung, max. 10000 Glieder.',
    'sum(expr,k,from,to): inclusive integer bounds, AST binding, at most 10000 terms.',
  ),
  binder(
    'prod',
    4,
    'prod(expr,k,von,bis): inklusive ganzzahlige Grenzen, AST-Bindung, max. 10000 Glieder.',
    'prod(expr,k,from,to): inclusive integer bounds, AST binding, at most 10000 terms.',
  ),
  binder(
    'integral',
    4,
    'integral(expr,x,a,b): adaptive Gauß-Kronrod-7/15-Quadratur, E_CONVERGENCE bei Abbruch.',
    'integral(expr,x,a,b): adaptive Gauss-Kronrod 7/15 quadrature; E_CONVERGENCE on failure.',
  ),
  binder(
    'deriv',
    3,
    'deriv(expr,x,stelle): symmetrische Differenzen mit Richardson-Extrapolation.',
    'deriv(expr,x,point): symmetric differences with Richardson extrapolation.',
  ),
];
