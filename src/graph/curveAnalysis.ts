import { compile } from './compile.ts';
import { angleScale } from '../engine/floatFunctions.ts';
import { visible } from './geometry.ts';
import { derivative, uncertain } from './numerical.ts';
import type { Settings } from './numerical.ts';
import type {
  AnalysisPoint,
  Bounds,
  Curve,
  Estimate,
  Extremum,
  Point,
} from './types.ts';

type RootScanner = (
  f: (u: number) => number,
  from: number,
  to: number,
  limits: Settings,
) => Estimate[];
interface Path {
  from: number;
  to: number;
  point: (u: number) => Point;
}
function path(curve: Curve, bounds: Bounds, limits: Settings): Path {
  const options = { params: curve.params, angleMode: curve.angleMode };
  let from = bounds.xMin,
    to = bounds.xMax,
    evaluate: (u: number) => Point;
  if (curve.kind === 'parametric') {
    const x = compile(curve.x, { ...options, variables: ['t'] }),
      y = compile(curve.y, { ...options, variables: ['t'] });
    [from, to] = curve.range;
    evaluate = (u) => ({ x: x(u), y: y(u) });
  } else if (curve.kind === 'polar') {
    const r = compile(curve.expression, { ...options, variables: ['theta'] }),
      scale = angleScale(curve.angleMode ?? 'rad');
    [from, to] = curve.range;
    evaluate = (u) => {
      const radius = r(u);
      return {
        x: radius * Math.cos(u * scale),
        y: radius * Math.sin(u * scale),
      };
    };
  } else if (curve.kind === 'vertical') {
    const x = compile(curve.expression, { ...options, variables: [] })();
    from = bounds.yMin;
    to = bounds.yMax;
    evaluate = (u) => ({ x, y: u });
  } else {
    const y = compile(curve.expression, { ...options, variables: ['x'] });
    evaluate = (u) => ({ x: u, y: y(u) });
  }
  if (![from, to, to - from].every(Number.isFinite) || to <= from)
    throw new RangeError('Invalid curve range');
  const cache = new Map<number, Point>();
  return {
    from,
    to,
    point: (u) => {
      const saved = cache.get(u);
      if (saved) return saved;
      if (cache.size >= limits.maxEvaluations) return { x: NaN, y: NaN };
      const p = evaluate(u);
      cache.set(u, p);
      return p;
    },
  };
}
function distinct(points: AnalysisPoint[], limits: Settings): AnalysisPoint[] {
  return points.filter(
    (p, i) =>
      !points
        .slice(0, i)
        .some(
          (q) =>
            Math.hypot(p.x - q.x, p.y - q.y) <=
            4 * Math.max(limits.xTolerance, limits.valueTolerance),
        ),
  );
}
function worldPoint(p: Path, root: Estimate): AnalysisPoint {
  return {
    ...p.point(root.value),
    confidence: root.confidence,
    errorEstimate: root.errorEstimate,
  };
}
export function pathAxisHits(
  curve: Curve,
  bounds: Bounds,
  limits: Settings,
  scan: RootScanner,
  coordinate: 'x' | 'y',
): AnalysisPoint[] {
  const p = path(curve, bounds, limits);
  return distinct(
    scan((u) => p.point(u)[coordinate], p.from, p.to, limits)
      .map((root) => worldPoint(p, root))
      .filter((point) => visible(point, bounds)),
    limits,
  );
}
export function pathExtrema(
  curve: Curve,
  bounds: Bounds,
  limits: Settings,
  scan: RootScanner,
): Extremum[] {
  const p = path(curve, bounds, limits),
    f = (u: number): number => p.point(u).y;
  const d = (u: number): number => {
    const result = derivative(f, u, 1, limits);
    return result.confidence ? result.value : NaN;
  };
  const result: Extremum[] = [],
    step = Math.max(
      limits.xTolerance * 8,
      (p.to - p.from) / limits.scanIntervals / 4,
    );
  for (const root of scan(d, p.from, p.to, limits)) {
    const point = worldPoint(p, root);
    if (
      !visible(point, bounds) ||
      root.value - step < p.from ||
      root.value + step > p.to
    )
      continue;
    const left = d(root.value - step),
      right = d(root.value + step);
    if (left < 0 && right > 0) result.push({ ...point, kind: 'minimum' });
    else if (left > 0 && right < 0) result.push({ ...point, kind: 'maximum' });
  }
  return result.filter(
    (point, i) =>
      !result
        .slice(0, i)
        .some(
          (q) =>
            q.kind === point.kind &&
            Math.hypot(point.x - q.x, point.y - q.y) <= limits.xTolerance * 4,
        ),
  );
}
export function pathInflections(
  curve: Curve,
  bounds: Bounds,
  limits: Settings,
  scan: RootScanner,
): AnalysisPoint[] {
  const p = path(curve, bounds, limits),
    x = (u: number): number => p.point(u).x,
    y = (u: number): number => p.point(u).y;
  const secondLimits = {
    ...limits,
    absoluteTolerance: Math.max(limits.absoluteTolerance, 1e-6),
    relativeTolerance: Math.max(limits.relativeTolerance, 1e-6),
  };
  const curvature = (u: number): number => {
    const dx = derivative(x, u, 1, limits),
      dy = derivative(y, u, 1, limits),
      ddx = derivative(x, u, 2, secondLimits),
      ddy = derivative(y, u, 2, secondLimits);
    if (
      ![dx, dy, ddx, ddy].every((r) => r.confidence) ||
      Math.hypot(dx.value, dy.value) <= limits.valueTolerance
    )
      return NaN;
    return dx.value * ddy.value - dy.value * ddx.value;
  };
  const result: AnalysisPoint[] = [],
    step = Math.max(
      limits.xTolerance * 8,
      (p.to - p.from) / limits.scanIntervals / 4,
    );
  for (const root of scan(curvature, p.from, p.to, limits)) {
    if (root.value - step < p.from || root.value + step > p.to) continue;
    const a = curvature(root.value - step),
      b = curvature(root.value + step),
      point = worldPoint(p, root);
    if (
      Number.isFinite(a) &&
      Number.isFinite(b) &&
      a * b < 0 &&
      visible(point, bounds)
    )
      result.push(point);
  }
  return distinct(result, limits);
}
export function pathSlope(
  curve: Curve,
  u: number,
  bounds: Bounds,
  limits: Settings,
): { estimate: Estimate; point: Point } {
  const p = path(curve, bounds, limits),
    point = p.point(u);
  if (u < p.from || u > p.to || !visible(point, bounds))
    return { point, estimate: uncertain() };
  const dx = derivative((t) => p.point(t).x, u, 1, limits),
    dy = derivative((t) => p.point(t).y, u, 1, limits);
  if (
    !dx.confidence ||
    !dy.confidence ||
    Math.abs(dx.value) <= limits.valueTolerance
  )
    return { point, estimate: uncertain() };
  const value = dy.value / dx.value,
    errorEstimate =
      (dy.errorEstimate + Math.abs(value) * dx.errorEstimate) /
      Math.abs(dx.value);
  return {
    point,
    estimate: {
      value,
      errorEstimate,
      confidence:
        Number.isFinite(value) &&
        errorEstimate <=
          Math.max(
            limits.absoluteTolerance,
            limits.relativeTolerance * Math.abs(value),
          ),
    },
  };
}
interface Chord {
  from: number;
  to: number;
  a: Point;
  b: Point;
}
function chords(p: Path, count: number): Chord[] {
  const result: Chord[] = [];
  let from = p.from,
    a = p.point(from);
  for (let i = 1; i <= count; i++) {
    const to = p.from + ((p.to - p.from) * i) / count,
      b = p.point(to);
    if ([a.x, a.y, b.x, b.y].every(Number.isFinite))
      result.push({ from, to, a, b });
    from = to;
    a = b;
  }
  return result;
}
function intersectSeed(a: Chord, b: Chord): [number, number] | null {
  if (
    Math.max(a.a.x, a.b.x) < Math.min(b.a.x, b.b.x) ||
    Math.max(b.a.x, b.b.x) < Math.min(a.a.x, a.b.x) ||
    Math.max(a.a.y, a.b.y) < Math.min(b.a.y, b.b.y) ||
    Math.max(b.a.y, b.b.y) < Math.min(a.a.y, a.b.y)
  )
    return null;
  const ax = a.b.x - a.a.x,
    ay = a.b.y - a.a.y,
    bx = b.b.x - b.a.x,
    by = b.b.y - b.a.y,
    det = ax * by - ay * bx;
  if (!Number.isFinite(det) || det === 0) return null;
  const dx = b.a.x - a.a.x,
    dy = b.a.y - a.a.y;
  const u = (dx * by - dy * bx) / det,
    v = (dx * ay - dy * ax) / det;
  if (u < -1e-12 || u > 1 + 1e-12 || v < -1e-12 || v > 1 + 1e-12) return null;
  return [a.from + (a.to - a.from) * u, b.from + (b.to - b.from) * v];
}
function refineIntersection(
  p: Path,
  q: Path,
  seed: [number, number],
  limits: Settings,
): AnalysisPoint | null {
  let [u, v] = seed;
  const h = Math.max(limits.xTolerance, (p.to - p.from) * 1e-6),
    k = Math.max(limits.xTolerance, (q.to - q.from) * 1e-6);
  for (let i = 0; i < limits.maxIterations; i++) {
    const a = p.point(u),
      b = q.point(v),
      rx = a.x - b.x,
      ry = a.y - b.y,
      residual = Math.hypot(rx, ry);
    if (!Number.isFinite(residual)) return null;
    if (
      residual <= limits.valueTolerance &&
      u >= p.from &&
      u <= p.to &&
      v >= q.from &&
      v <= q.to
    )
      return {
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
        errorEstimate: residual,
        confidence: true,
      };
    const pa = p.point(u - h),
      pb = p.point(u + h),
      qa = q.point(v - k),
      qb = q.point(v + k);
    const dx = (pb.x - pa.x) / (2 * h),
      dy = (pb.y - pa.y) / (2 * h),
      ex = (qb.x - qa.x) / (2 * k),
      ey = (qb.y - qa.y) / (2 * k),
      det = ex * dy - dx * ey;
    if (
      !Number.isFinite(det) ||
      Math.abs(det) <=
        Number.EPSILON * Math.max(1, Math.abs(ex * dy), Math.abs(dx * ey))
    )
      return null;
    const du = (-ey * rx + ex * ry) / det,
      dv = (-dy * rx + dx * ry) / det;
    let accepted = false;
    for (let damping = 1; damping >= 1 / 128; damping /= 2) {
      const nextU = u - damping * du,
        nextV = v - damping * dv;
      if (nextU < p.from || nextU > p.to || nextV < q.from || nextV > q.to)
        continue;
      const nextA = p.point(nextU),
        nextB = q.point(nextV);
      if (Math.hypot(nextA.x - nextB.x, nextA.y - nextB.y) < residual) {
        u = nextU;
        v = nextV;
        accepted = true;
        break;
      }
    }
    if (!accepted) return null;
  }
  return null;
}
export function pathIntersections(
  a: Curve,
  b: Curve,
  bounds: Bounds,
  limits: Settings,
): AnalysisPoint[] {
  const p = path(a, bounds, limits),
    q = path(b, bounds, limits),
    count = Math.min(512, limits.scanIntervals);
  const left = chords(p, count),
    right = chords(q, count),
    result: AnalysisPoint[] = [];
  for (const first of left)
    for (const second of right) {
      const seed = intersectSeed(first, second);
      if (!seed) continue;
      const point = refineIntersection(p, q, seed, limits);
      if (point && visible(point, bounds)) result.push(point);
    }
  return distinct(result, limits).sort((a, b) => a.x - b.x || a.y - b.y);
}
