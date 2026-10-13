import { compile } from './compile.ts';
import {
  pathAxisHits,
  pathExtrema,
  pathInflections,
  pathIntersections,
  pathSlope,
} from './curveAnalysis.ts';
import { validateBounds, visible } from './geometry.ts';
import {
  brent,
  derivative,
  quadrature,
  settings,
  uncertain,
} from './numerical.ts';
import type { Settings } from './numerical.ts';
import type {
  AnalysisOptions,
  AnalysisPoint,
  Bounds,
  Curve,
  Estimate,
  Extremum,
  Tangent,
} from './types.ts';

function explicit(curve: Curve, limits: Settings): (x: number) => number {
  let evaluations = 0;
  if (curve.kind !== 'explicit') return () => NaN;
  const f = compile(curve.expression, {
    variables: ['x'],
    params: curve.params,
    angleMode: curve.angleMode,
  });
  return (x) => (++evaluations <= limits.maxEvaluations ? f(x) : NaN);
}
function roots(
  f: (x: number) => number,
  min: number,
  max: number,
  limits: Settings,
): Estimate[] {
  const candidates: Estimate[] = [];
  let previousX = min,
    previous = f(min),
    allZero =
      Number.isFinite(previous) && Math.abs(previous) <= limits.valueTolerance;
  if (allZero)
    candidates.push({ value: min, errorEstimate: 0, confidence: true });
  for (let i = 1; i <= limits.scanIntervals; i++) {
    const x = min + ((max - min) * i) / limits.scanIntervals,
      y = f(x);
    allZero =
      allZero && Number.isFinite(y) && Math.abs(y) <= limits.valueTolerance;
    if (Number.isFinite(y) && Math.abs(y) <= limits.valueTolerance)
      candidates.push({ value: x, errorEstimate: 0, confidence: true });
    else if (
      Number.isFinite(y) &&
      Number.isFinite(previous) &&
      Math.abs(previous) > limits.valueTolerance &&
      Math.sign(previous) !== Math.sign(y)
    ) {
      const root = brent(f, previousX, x, limits);
      if (root.confidence) candidates.push(root);
    }
    previous = y;
    previousX = x;
  }
  if (allZero) return [];
  candidates.sort((a, b) => a.value - b.value);
  return candidates.filter(
    (point, index) =>
      index === 0 ||
      Math.abs(point.value - (candidates[index - 1]?.value ?? Infinity)) >
        limits.xTolerance * 4,
  );
}
function points(
  candidates: Estimate[],
  f: (x: number) => number,
  bounds: Bounds,
): AnalysisPoint[] {
  return candidates
    .map((p) => ({
      x: p.value,
      y: f(p.value),
      errorEstimate: p.errorEstimate,
      confidence: p.confidence,
    }))
    .filter((p) => visible(p, bounds));
}
export function findRoots(
  curve: Curve,
  bounds: Bounds,
  options: AnalysisOptions = {},
): AnalysisPoint[] {
  validateBounds(bounds);
  if (curve.kind !== 'explicit')
    return pathAxisHits(curve, bounds, settings(options), roots, 'y');
  const limits = settings(options),
    f = explicit(curve, limits);
  return points(roots(f, bounds.xMin, bounds.xMax, limits), f, bounds);
}
export function findExtrema(
  curve: Curve,
  bounds: Bounds,
  options: AnalysisOptions = {},
): Extremum[] {
  validateBounds(bounds);
  if (curve.kind !== 'explicit')
    return pathExtrema(curve, bounds, settings(options), roots);
  const limits = settings(options),
    f = explicit(curve, limits);
  const d = (x: number): number => {
    const r = derivative(f, x, 1, limits);
    return r.confidence ? r.value : NaN;
  };
  const candidates = points(
    roots(d, bounds.xMin, bounds.xMax, limits),
    f,
    bounds,
  );
  const result: Extremum[] = [];
  for (const point of candidates) {
    const step = Math.max(
      limits.xTolerance * 8,
      (bounds.xMax - bounds.xMin) / limits.scanIntervals / 4,
    );
    if (point.x - step < bounds.xMin || point.x + step > bounds.xMax) continue;
    const left = d(point.x - step),
      right = d(point.x + step);
    if (left < 0 && right > 0) result.push({ ...point, kind: 'minimum' });
    else if (left > 0 && right < 0) result.push({ ...point, kind: 'maximum' });
  }
  return result;
}
export function findInflections(
  curve: Curve,
  bounds: Bounds,
  options: AnalysisOptions = {},
): AnalysisPoint[] {
  validateBounds(bounds);
  const limits = settings(options),
    f = explicit(curve, limits);
  // The second derivative's cancellation error is larger than the slope's.
  const derivativeLimits = {
    ...limits,
    absoluteTolerance: options.absoluteTolerance ?? 1e-6,
    relativeTolerance: options.relativeTolerance ?? 1e-6,
  };
  if (curve.kind !== 'explicit')
    return pathInflections(curve, bounds, limits, roots, derivativeLimits);
  const d = (x: number): number => {
    const r = derivative(f, x, 2, derivativeLimits);
    return r.confidence ? r.value : NaN;
  };
  return points(roots(d, bounds.xMin, bounds.xMax, limits), f, bounds).filter(
    (p) => {
      const step = Math.max(
        limits.xTolerance * 8,
        (bounds.xMax - bounds.xMin) / limits.scanIntervals / 4,
      );
      if (p.x - step < bounds.xMin || p.x + step > bounds.xMax) return false;
      const left = d(p.x - step),
        right = d(p.x + step);
      return (
        Number.isFinite(left) && Number.isFinite(right) && left * right < 0
      );
    },
  );
}
export function findIntersections(
  a: Curve,
  b: Curve,
  bounds: Bounds,
  options: AnalysisOptions = {},
): AnalysisPoint[] {
  validateBounds(bounds);
  if (a.kind !== 'explicit' || b.kind !== 'explicit')
    return pathIntersections(a, b, bounds, settings(options));
  const limits = settings(options),
    f = explicit(a, limits),
    g = explicit(b, limits);
  return points(
    roots((x) => f(x) - g(x), bounds.xMin, bounds.xMax, limits),
    f,
    bounds,
  );
}
export function yIntercept(
  curve: Curve,
  bounds: Bounds,
  options: AnalysisOptions = {},
): AnalysisPoint | null {
  validateBounds(bounds);
  if (curve.kind !== 'explicit')
    return (
      pathAxisHits(curve, bounds, settings(options), roots, 'x')[0] ?? null
    );
  const limits = settings(options),
    y = explicit(curve, limits)(0),
    point = { x: 0, y, errorEstimate: 0, confidence: Number.isFinite(y) };
  return visible(point, bounds) ? point : null;
}
export function slopeAt(
  curve: Curve,
  x: number,
  bounds: Bounds,
  options: AnalysisOptions = {},
): Estimate {
  validateBounds(bounds);
  if (curve.kind !== 'explicit')
    return pathSlope(curve, x, bounds, settings(options)).estimate;
  const limits = settings(options),
    f = explicit(curve, limits);
  if (!visible({ x, y: f(x) }, bounds)) return uncertain();
  return derivative(f, x, 1, limits);
}
export function tangentAt(
  curve: Curve,
  x: number,
  bounds: Bounds,
  options: AnalysisOptions = {},
): Tangent {
  validateBounds(bounds);
  if (curve.kind !== 'explicit') {
    const { point, estimate } = pathSlope(curve, x, bounds, settings(options));
    return {
      ...estimate,
      point,
      slope: estimate.value,
      intercept: point.y - estimate.value * point.x,
    };
  }
  const limits = settings(options),
    y = explicit(curve, limits)(x),
    slope = slopeAt(curve, x, bounds, options);
  return {
    ...slope,
    point: { x, y },
    slope: slope.value,
    intercept: y - slope.value * x,
  };
}
function integrationDomain(
  f: (x: number) => number,
  a: number,
  b: number,
  limits: Settings,
): boolean {
  let previousX = a,
    previous = f(a);
  if (!Number.isFinite(previous)) return false;
  for (let i = 1; i <= limits.scanIntervals; i++) {
    const x = a + ((b - a) * i) / limits.scanIntervals,
      y = f(x);
    if (!Number.isFinite(y)) return false;
    if (
      previous !== 0 &&
      y !== 0 &&
      Math.sign(previous) !== Math.sign(y) &&
      !brent(f, previousX, x, limits).confidence
    )
      return false;
    previous = y;
    previousX = x;
  }
  return true;
}
function validIntegralBounds(a: number, b: number, bounds: Bounds): boolean {
  return (
    Number.isFinite(a) &&
    Number.isFinite(b) &&
    a >= bounds.xMin &&
    a <= bounds.xMax &&
    b >= bounds.xMin &&
    b <= bounds.xMax
  );
}
export function definiteIntegral(
  curve: Curve,
  a: number,
  b: number,
  bounds: Bounds,
  options: AnalysisOptions = {},
): Estimate {
  validateBounds(bounds);
  const limits = settings(options),
    f = explicit(curve, limits);
  if (!validIntegralBounds(a, b, bounds) || curve.kind !== 'explicit')
    return uncertain();
  if (!integrationDomain(f, Math.min(a, b), Math.max(a, b), limits))
    return uncertain();
  return quadrature(f, a, b, limits);
}
export function areaBetween(
  a: Curve,
  b: Curve,
  from: number,
  to: number,
  bounds: Bounds,
  options: AnalysisOptions = {},
): Estimate {
  validateBounds(bounds);
  const limits = settings(options),
    f = explicit(a, limits),
    g = explicit(b, limits);
  if (
    !validIntegralBounds(from, to, bounds) ||
    a.kind !== 'explicit' ||
    b.kind !== 'explicit'
  )
    return uncertain();
  const lo = Math.min(from, to),
    hi = Math.max(from, to);
  if (
    !integrationDomain(f, lo, hi, limits) ||
    !integrationDomain(g, lo, hi, limits)
  )
    return uncertain();
  const hits = roots((x) => f(x) - g(x), lo, hi, limits)
    .map((p) => p.value)
    .filter((x) => x > lo && x < hi);
  const cuts = [lo, ...hits, hi];
  let value = 0,
    errorEstimate = 0,
    confidence = true;
  for (let i = 1; i < cuts.length; i++) {
    const estimate = quadrature(
      (x) => Math.abs(f(x) - g(x)),
      cuts[i - 1] ?? lo,
      cuts[i] ?? hi,
      {
        ...limits,
        absoluteTolerance: limits.absoluteTolerance / (cuts.length - 1),
      },
    );
    value += estimate.value;
    errorEstimate += estimate.errorEstimate;
    confidence = confidence && estimate.confidence;
  }
  return { value, errorEstimate, confidence };
}
