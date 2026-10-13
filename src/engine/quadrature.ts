import type Decimal from 'decimal.js';
import type {
  EvalError,
  NumericalOptions,
  NumberValue,
  Result,
  SourceRange,
} from './types.ts';
import {
  checkedNumber,
  D,
  failure,
  NumericFault,
  requireDomain,
} from './numeric.ts';

export interface IntegralEstimate {
  readonly value: Decimal;
  readonly errorEstimate: Decimal;
  readonly evaluations: number;
  readonly intervals: number;
}
export type RealCallback = (x: Decimal) => Result<NumberValue, EvalError>;
interface Settings {
  absolute: Decimal;
  relative: Decimal;
  maxIntervals: number;
  maxEvaluations: number;
}
function settings(options: NumericalOptions): Settings {
  const absolute = new D(options.absoluteTolerance ?? '1e-12'),
    relative = new D(options.relativeTolerance ?? '1e-12');
  const maxIntervals = options.maxIntervals ?? 256,
    maxEvaluations = options.maxEvaluations ?? 10000;
  requireDomain(
    absolute.isFinite() &&
      absolute.gt(0) &&
      relative.isFinite() &&
      relative.gt(0),
  );
  requireDomain(
    Number.isInteger(maxIntervals) &&
      maxIntervals >= 1 &&
      maxIntervals <= 4096 &&
      Number.isInteger(maxEvaluations) &&
      maxEvaluations >= 15 &&
      maxEvaluations <= 100000,
  );
  return { absolute, relative, maxIntervals, maxEvaluations };
}
// QUADPACK dqk15: Fullerton's 80-digit calculation, published 33-digit weights.
// https://www.netlib.org/quadpack/dqk15.f
const nodes = [
  '0.991455371120812639206854697526329',
  '0.949107912342758524526189684047851',
  '0.864864423359769072789712788640926',
  '0.741531185599394439863864773280788',
  '0.586087235467691130294144838258730',
  '0.405845151377397166906606412076961',
  '0.207784955007898467600689403773245',
].map((x) => new D(x));
const kronrod = [
  '0.022935322010529224963732008058970',
  '0.063092092629978553290700663189204',
  '0.104790010322250183839876322541518',
  '0.140653259715525918745189590510238',
  '0.169004726639267902826583426598550',
  '0.190350578064785409913256402421014',
  '0.204432940075298892414161999234649',
  '0.209482141084727828012999174891714',
].map((x) => new D(x));
const gauss = [
  '0.129484966168869693270611432679082',
  '0.279705391489276667901467771423780',
  '0.381830050505118944950369775488975',
  '0.417959183673469387755102040816327',
].map((x) => new D(x));
class CallbackFault extends Error {
  readonly error: EvalError;
  constructor(error: EvalError) {
    super();
    this.error = error;
  }
}
function sample(f: RealCallback, x: Decimal): Decimal {
  const r = f(x);
  if (!r.ok) throw new CallbackFault(r.error);
  const normalized = checkedNumber(r.value.value, { start: 0, end: 0 });
  if (!normalized.ok) throw new CallbackFault(normalized.error);
  return normalized.value.value;
}
interface Interval {
  a: Decimal;
  b: Decimal;
  value: Decimal;
  error: Decimal;
}
function interval(f: RealCallback, a: Decimal, b: Decimal): Interval {
  const center = a.add(b).div(2),
    half = b.sub(a).div(2);
  const fc = sample(f, center);
  let k = fc.mul(kronrod[7] ?? 0),
    g = fc.mul(gauss[3] ?? 0),
    absolute = fc.abs().mul(kronrod[7] ?? 0);
  const samples: Decimal[][] = [];
  for (let i = 0; i < 7; i++) {
    const offset = half.mul(nodes[i] ?? 0),
      left = sample(f, center.sub(offset)),
      right = sample(f, center.add(offset));
    const sum = left.add(right),
      weight = kronrod[i] ?? new D(0);
    samples.push([left, right]);
    k = k.add(sum.mul(weight));
    absolute = absolute.add(left.abs().add(right.abs()).mul(weight));
    if (i % 2 === 1) g = g.add(sum.mul(gauss[(i - 1) / 2] ?? 0));
  }
  const mean = k.div(2);
  let asc = fc
    .sub(mean)
    .abs()
    .mul(kronrod[7] ?? 0);
  for (let i = 0; i < samples.length; i++)
    asc = asc.add(
      (samples[i] ?? [])
        .reduce((s, v) => s.add(v.sub(mean).abs()), new D(0))
        .mul(kronrod[i] ?? 0),
    );
  asc = asc.mul(half.abs());
  absolute = absolute.mul(half.abs());
  let error = k.sub(g).mul(half).abs();
  if (!asc.isZero() && !error.isZero())
    error = asc.mul(D.min(1, error.mul(200).div(asc).pow('1.5')));
  // The 33-digit quadrature table, rather than Decimal's 50 digits, sets this floor.
  error = D.max(error, absolute.mul('1e-31'));
  return { a, b, value: k.mul(half), error };
}
export function integrate(
  f: RealCallback,
  a: Decimal,
  b: Decimal,
  options: NumericalOptions = {},
  range: SourceRange = { start: 0, end: 0 },
): Result<IntegralEstimate, EvalError> {
  try {
    const limits = settings(options);
    const ar = checkedNumber(a, range),
      br = checkedNumber(b, range);
    if (!ar.ok) return ar;
    if (!br.ok) return br;
    a = ar.value.value;
    b = br.value.value;
    if (a.eq(b))
      return {
        ok: true,
        value: {
          value: new D(0),
          errorEstimate: new D(0),
          evaluations: 0,
          intervals: 0,
        },
      };
    const reversed = b.lt(a);
    const intervals: Interval[] = [
      interval(f, reversed ? b : a, reversed ? a : b),
    ];
    let value = intervals[0]?.value ?? new D(0),
      error = intervals[0]?.error ?? new D(0),
      evaluations = 15;
    while (error.gt(D.max(limits.absolute, value.abs().mul(limits.relative)))) {
      if (
        intervals.length >= limits.maxIntervals ||
        evaluations + 30 > limits.maxEvaluations
      )
        return {
          ok: false,
          error: {
            code: 'E_CONVERGENCE',
            range,
            details: {
              errorEstimate: error.toString(),
              evaluations,
              intervals: intervals.length,
            },
          },
        };
      let index = 0;
      for (let i = 1; i < intervals.length; i++)
        if ((intervals[i]?.error ?? new D(0)).gt(intervals[index]?.error ?? 0))
          index = i;
      const worst = intervals[index];
      if (!worst) return failure('E_INTERNAL', range);
      const midpoint = worst.a.add(worst.b).div(2);
      if (midpoint.eq(worst.a) || midpoint.eq(worst.b))
        return {
          ok: false,
          error: {
            code: 'E_CONVERGENCE',
            range,
            details: {
              errorEstimate: error.toString(),
              evaluations,
              intervals: intervals.length,
            },
          },
        };
      const left = interval(f, worst.a, midpoint),
        right = interval(f, midpoint, worst.b);
      evaluations += 30;
      intervals.splice(index, 1, left, right);
      value = value.sub(worst.value).add(left.value).add(right.value);
      error = D.max(0, error.sub(worst.error).add(left.error).add(right.error));
    }
    const checked = checkedNumber(reversed ? value.neg() : value, range);
    if (!checked.ok) return checked;
    return {
      ok: true,
      value: {
        value: checked.value.value,
        errorEstimate: error,
        evaluations,
        intervals: intervals.length,
      },
    };
  } catch (e) {
    if (e instanceof CallbackFault) return { ok: false, error: e.error };
    return failure(e instanceof NumericFault ? e.code : 'E_INTERNAL', range);
  }
}
export function differentiate(
  f: RealCallback,
  x: Decimal,
  options: NumericalOptions = {},
  range: SourceRange = { start: 0, end: 0 },
): Result<NumberValue, EvalError> {
  try {
    const limits = settings(options),
      point = checkedNumber(x, range);
    if (!point.ok) return point;
    x = point.value.value;
    let h = D.max(1, x.abs()).mul('0.01');
    const center = sample(f, x);
    let previous: Decimal[] = [];
    let best = new D(0),
      bestError = new D(Infinity);
    let evaluations = 1;
    for (let level = 0; level < 12; level++) {
      const plus = sample(f, x.add(h)),
        minus = sample(f, x.sub(h));
      evaluations += 2;
      const row: Decimal[] = [plus.sub(minus).div(h.mul(2))];
      for (let j = 1; j <= level; j++) {
        const lower = row[j - 1] ?? new D(0),
          old = previous[j - 1] ?? new D(0),
          factor = new D(4).pow(j);
        row.push(lower.mul(factor).sub(old).div(factor.sub(1)));
      }
      const candidate = row[level] ?? new D(0),
        old = previous[level - 1];
      const error =
        old === undefined ? new D(Infinity) : candidate.sub(old).abs();
      const tolerance = D.max(
        limits.absolute,
        candidate.abs().mul(limits.relative),
      );
      const asymmetry = plus
        .sub(center)
        .div(h)
        .sub(center.sub(minus).div(h))
        .abs();
      if (
        level >= 2 &&
        error.lte(tolerance) &&
        asymmetry.lte(
          D.max(tolerance.mul(10), candidate.abs().add(1).mul(h.sqrt())),
        )
      )
        return checkedNumber(candidate, range);
      if (error.lt(bestError)) {
        best = candidate;
        bestError = error;
      }
      previous = row;
      h = h.div(2);
    }
    return {
      ok: false,
      error: {
        code: 'E_CONVERGENCE',
        range,
        details: {
          errorEstimate: bestError.isFinite()
            ? bestError.toString()
            : best.abs().toString(),
          evaluations,
          intervals: 0,
        },
      },
    };
  } catch (e) {
    if (e instanceof CallbackFault) return { ok: false, error: e.error };
    return failure(e instanceof NumericFault ? e.code : 'E_INTERNAL', range);
  }
}
