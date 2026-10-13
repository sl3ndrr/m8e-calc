import type { AnalysisOptions, Estimate } from './types.ts';

export interface Settings {
  xTolerance: number;
  valueTolerance: number;
  absoluteTolerance: number;
  relativeTolerance: number;
  scanIntervals: number;
  maxIterations: number;
  maxEvaluations: number;
}
export function settings(options: AnalysisOptions = {}): Settings {
  const result = {
    xTolerance: options.xTolerance ?? 1e-8,
    valueTolerance: options.valueTolerance ?? 1e-8,
    absoluteTolerance: options.absoluteTolerance ?? 1e-9,
    relativeTolerance: options.relativeTolerance ?? 1e-9,
    scanIntervals: options.scanIntervals ?? 1024,
    maxIterations: options.maxIterations ?? 100,
    maxEvaluations: options.maxEvaluations ?? 30000,
  };
  if (
    ![
      result.xTolerance,
      result.valueTolerance,
      result.absoluteTolerance,
      result.relativeTolerance,
    ].every((x) => Number.isFinite(x) && x > 0) ||
    !Number.isInteger(result.scanIntervals) ||
    result.scanIntervals < 16 ||
    result.scanIntervals > 16384 ||
    !Number.isInteger(result.maxIterations) ||
    result.maxIterations < 1 ||
    result.maxIterations > 1000 ||
    !Number.isInteger(result.maxEvaluations) ||
    result.maxEvaluations < 15 ||
    result.maxEvaluations > 100000
  )
    throw new RangeError('Invalid analysis options');
  return result;
}
export const uncertain = (value = NaN, errorEstimate = Infinity): Estimate => ({
  value,
  errorEstimate,
  confidence: false,
});
/** Brent-Dekker: IQI / secant, guarded by bisection and a residual check. */
export function brent(
  f: (x: number) => number,
  a: number,
  b: number,
  limits: Settings,
): Estimate {
  let fa = f(a),
    fb = f(b);
  if (!Number.isFinite(fa) || !Number.isFinite(fb)) return uncertain();
  if (Math.abs(fa) <= limits.valueTolerance)
    return { value: a, errorEstimate: 0, confidence: true };
  if (Math.abs(fb) <= limits.valueTolerance)
    return { value: b, errorEstimate: 0, confidence: true };
  if (Math.sign(fa) === Math.sign(fb)) return uncertain();
  if (Math.abs(fa) < Math.abs(fb)) {
    [a, b] = [b, a];
    [fa, fb] = [fb, fa];
  }
  let c = a,
    fc = fa,
    d = c,
    bisected = true;
  for (let i = 0; i < limits.maxIterations; i++) {
    let s =
      fa !== fc && fb !== fc
        ? (a * fb * fc) / ((fa - fb) * (fa - fc)) +
          (b * fa * fc) / ((fb - fa) * (fb - fc)) +
          (c * fa * fb) / ((fc - fa) * (fc - fb))
        : b - (fb * (b - a)) / (fb - fa);
    const edge = (3 * a + b) / 4,
      tolerance = limits.xTolerance + 4 * Number.EPSILON * Math.abs(b);
    if (
      !Number.isFinite(s) ||
      s <= Math.min(edge, b) ||
      s >= Math.max(edge, b) ||
      (bisected && Math.abs(s - b) >= Math.abs(b - c) / 2) ||
      (!bisected && Math.abs(s - b) >= Math.abs(c - d) / 2) ||
      (bisected && Math.abs(b - c) < tolerance) ||
      (!bisected && Math.abs(c - d) < tolerance)
    ) {
      s = a + (b - a) / 2;
      bisected = true;
    } else bisected = false;
    const fs = f(s);
    if (!Number.isFinite(fs)) return uncertain();
    d = c;
    c = b;
    fc = fb;
    if (Math.sign(fa) !== Math.sign(fs)) {
      b = s;
      fb = fs;
    } else {
      a = s;
      fa = fs;
    }
    if (Math.abs(fa) < Math.abs(fb)) {
      [a, b] = [b, a];
      [fa, fb] = [fb, fa];
    }
    if (Math.abs(fb) <= limits.valueTolerance)
      return { value: b, errorEstimate: Math.abs(b - a), confidence: true };
    if (Math.abs(b - a) <= tolerance) return uncertain(b, Math.abs(b - a));
  }
  return uncertain(b, Math.abs(b - a));
}
export function derivative(
  f: (x: number) => number,
  x: number,
  order: 1 | 2,
  limits: Settings,
): Estimate {
  const scale = Math.max(1, Math.abs(x));
  let h = 0.001 * scale,
    previous = NaN,
    best = NaN,
    error = Infinity,
    left = NaN,
    right = NaN;
  const center = f(x);
  if (!Number.isFinite(center)) return uncertain();
  for (let i = 0; i < 10; i++) {
    const a = f(x - h),
      b = f(x + h);
    if (![a, b].every(Number.isFinite) || x - h === x || x + h === x)
      return uncertain();
    const raw =
      order === 1 ? (b - a) / (2 * h) : (b - center + (a - center)) / (h * h);
    left = (center - a) / h;
    right = (b - center) / h;
    if (i > 0) {
      const extrapolated = raw + (raw - previous) / 3;
      const estimate = Number.isFinite(best)
        ? Math.abs(extrapolated - best)
        : Math.abs(raw - previous);
      const floor =
        (Number.EPSILON * (Math.abs(a) + Math.abs(b) + Math.abs(center))) /
        (order === 1 ? h : h * h);
      if (estimate <= error || !Number.isFinite(best)) {
        best = extrapolated;
        error = Math.max(estimate, floor);
      }
      const target = Math.max(
        limits.absoluteTolerance,
        limits.relativeTolerance * Math.abs(best),
      );
      // Two extrapolated estimates, plus a one-sided smoothness check for order 1.
      if (
        i >= 2 &&
        error <= target &&
        (order === 2 ||
          Math.abs(left - right) <= 1e-3 * Math.max(1, Math.abs(best)))
      )
        return { value: best, errorEstimate: error, confidence: true };
    }
    previous = raw;
    h /= 2;
  }
  const confidence =
    Number.isFinite(best) &&
    error <=
      Math.max(
        limits.absoluteTolerance,
        limits.relativeTolerance * Math.abs(best),
      ) &&
    (order === 2 ||
      Math.abs(left - right) <= 1e-3 * Math.max(1, Math.abs(best)));
  return { value: best, errorEstimate: error, confidence };
}
// Float64 projection of the existing Engine / QUADPACK dqk15 table.
const nodes = [
  0.9914553711208126, 0.9491079123427585, 0.8648644233597691,
  0.7415311855993945, 0.5860872354676911, 0.4058451513773972,
  0.2077849550078985,
];
const kronrod = [
  0.02293532201052922, 0.06309209262997855, 0.1047900103222502,
  0.1406532597155259, 0.1690047266392679, 0.1903505780647854,
  0.2044329400752989, 0.2094821410847278,
];
const gauss = [
  0.1294849661688697, 0.2797053914892767, 0.3818300505051189,
  0.4179591836734694,
];
interface Interval {
  a: number;
  b: number;
  value: number;
  error: number;
}
function interval(f: (x: number) => number, a: number, b: number): Interval {
  const mid = a + (b - a) / 2,
    half = (b - a) / 2,
    fc = f(mid),
    samples: [number, number][] = [];
  let k = fc * (kronrod[7] ?? 0),
    g = fc * (gauss[3] ?? 0),
    absolute = Math.abs(k);
  for (let i = 0; i < 7; i++) {
    const offset = half * (nodes[i] ?? 0),
      left = f(mid - offset),
      right = f(mid + offset),
      weight = kronrod[i] ?? 0;
    samples.push([left, right]);
    k += (left + right) * weight;
    absolute += (Math.abs(left) + Math.abs(right)) * weight;
    if (i % 2 === 1) g += (left + right) * (gauss[(i - 1) / 2] ?? 0);
  }
  const mean = k / 2;
  let asc = Math.abs(fc - mean) * (kronrod[7] ?? 0);
  for (let i = 0; i < samples.length; i++) {
    const pair = samples[i];
    if (pair)
      asc +=
        (Math.abs(pair[0] - mean) + Math.abs(pair[1] - mean)) *
        (kronrod[i] ?? 0);
  }
  asc *= half;
  absolute *= half;
  let error = Math.abs((k - g) * half);
  if (asc > 0 && error > 0)
    error = asc * Math.min(1, ((200 * error) / asc) ** 1.5);
  error = Math.max(error, 50 * Number.EPSILON * absolute);
  return { a, b, value: k * half, error };
}
export function quadrature(
  f: (x: number) => number,
  from: number,
  to: number,
  limits: Settings,
): Estimate {
  if (from === to) return { value: 0, errorEstimate: 0, confidence: true };
  const sign = to < from ? -1 : 1,
    a = Math.min(from, to),
    b = Math.max(from, to);
  const intervals = [interval(f, a, b)];
  let value = intervals[0]?.value ?? NaN,
    error = intervals[0]?.error ?? Infinity,
    evaluations = 15;
  while (
    Number.isFinite(value) &&
    Number.isFinite(error) &&
    error >
      Math.max(
        limits.absoluteTolerance,
        limits.relativeTolerance * Math.abs(value),
      )
  ) {
    if (intervals.length >= 4096 || evaluations + 30 > limits.maxEvaluations)
      return uncertain(value * sign, error);
    let index = 0;
    for (let i = 1; i < intervals.length; i++)
      if ((intervals[i]?.error ?? 0) > (intervals[index]?.error ?? 0))
        index = i;
    const old = intervals[index];
    if (!old) break;
    const mid = old.a + (old.b - old.a) / 2;
    if (mid === old.a || mid === old.b) return uncertain(value * sign, error);
    const left = interval(f, old.a, mid),
      right = interval(f, mid, old.b);
    intervals[index] = left;
    intervals.push(right);
    evaluations += 30;
    value += left.value + right.value - old.value;
    error = Math.max(0, error + left.error + right.error - old.error);
  }
  return {
    value: value * sign,
    errorEstimate: error,
    confidence:
      Number.isFinite(value) &&
      Number.isFinite(error) &&
      error <=
        Math.max(
          limits.absoluteTolerance,
          limits.relativeTolerance * Math.abs(value),
        ),
  };
}
