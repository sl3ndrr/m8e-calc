import { compile } from './compile.ts';
import { angleScale } from '../engine/floatFunctions.ts';
import { clip, validateBounds, validatePixelSize } from './geometry.ts';
import type { Bounds, Curve, PixelSize, Point, SampleResult } from './types.ts';

export function sampleCurve(
  curve: Curve,
  viewport: Bounds,
  pixelSize: PixelSize,
): Point[][] {
  return sampleCurveDetailed(curve, viewport, pixelSize).segments;
}
export function sampleCurveDetailed(
  curve: Curve,
  viewport: Bounds,
  pixelSize: PixelSize,
): SampleResult {
  validateBounds(viewport);
  validatePixelSize(pixelSize);
  const segments: Point[][] = [];
  const options = { params: curve.params, angleMode: curve.angleMode };
  let evaluate: (u: number) => Point,
    from = viewport.xMin,
    to = viewport.xMax;
  if (curve.kind === 'parametric') {
    const x = compile(curve.x, { ...options, variables: ['t'] }),
      y = compile(curve.y, { ...options, variables: ['t'] });
    evaluate = (t) => ({ x: x(t), y: y(t) });
    [from, to] = curve.range;
  } else if (curve.kind === 'polar') {
    const r = compile(curve.expression, { ...options, variables: ['theta'] }),
      scale = angleScale(curve.angleMode ?? 'rad');
    evaluate = (theta) => {
      const radius = r(theta),
        rad = theta * scale;
      return { x: radius * Math.cos(rad), y: radius * Math.sin(rad) };
    };
    [from, to] = curve.range;
  } else if (curve.kind === 'vertical') {
    const x = compile(curve.expression, { ...options, variables: [] })();
    return {
      segments:
        Number.isFinite(x) && x >= viewport.xMin && x <= viewport.xMax
          ? [
              [
                { x, y: viewport.yMin },
                { x, y: viewport.yMax },
              ],
            ]
          : [],
      evaluations: 1,
      truncated: false,
    };
  } else {
    const f = compile(curve.expression, { ...options, variables: ['x'] });
    evaluate = (x) => ({ x, y: f(x) });
  }
  if (
    !Number.isFinite(from) ||
    !Number.isFinite(to) ||
    to <= from ||
    !Number.isFinite(to - from)
  )
    throw new RangeError('Invalid curve range');
  const sx = pixelSize.width / (viewport.xMax - viewport.xMin),
    sy = pixelSize.height / (viewport.yMax - viewport.yMin);
  let evaluations = 0,
    truncated = false,
    current: Point[] | null = null;
  const finite = (p: Point): boolean =>
    Number.isFinite(p.x) && Number.isFinite(p.y);
  const sample = (u: number): Point => {
    if (evaluations >= 100000) {
      truncated = true;
      return { x: NaN, y: NaN };
    }
    evaluations++;
    return evaluate(u);
  };
  const gap = (): void => {
    current = null;
  };
  const append = (a: Point, b: Point): void => {
    const chord = clip(a, b, viewport);
    if (!chord) {
      gap();
      return;
    }
    const [p, q] = chord,
      last = current?.[current.length - 1];
    if (!last || last.x !== p.x || last.y !== p.y) {
      current = [p];
      segments.push(current);
    }
    if (current && (p.x !== q.x || p.y !== q.y)) current.push(q);
  };
  function refine(
    a: number,
    b: number,
    pa: Point,
    pb: Point,
    depth: number,
  ): void {
    if (evaluations >= 100000) {
      truncated = true;
      gap();
      return;
    }
    const mid = a + (b - a) / 2;
    const p1 = sample(a + (b - a) / 4),
      pm = sample(mid),
      p3 = sample(a + (3 * (b - a)) / 4);
    const points = [pa, p1, pm, p3, pb];
    if (points.every((p) => !finite(p))) {
      gap();
      return;
    }
    if (points.every(finite)) {
      const margin = 2 * (viewport.yMax - viewport.yMin);
      if (
        points.every((p) => p.y > viewport.yMax + margin) ||
        points.every((p) => p.y < viewport.yMin - margin)
      ) {
        gap();
        return;
      }
      let error = 0;
      for (let i = 1; i < 4; i++) {
        const p = points[i];
        if (!p) continue;
        error = Math.max(
          error,
          Math.hypot(
            (p.x - (pa.x + ((pb.x - pa.x) * i) / 4)) * sx,
            (p.y - (pa.y + ((pb.y - pa.y) * i) / 4)) * sy,
          ),
        );
      }
      if (error <= 0.25) {
        append(pa, pb);
        return;
      }
    }
    if (depth >= 14 || mid === a || mid === b) {
      gap();
      return;
    }
    refine(a, mid, pa, pm, depth + 1);
    refine(mid, b, pm, pb, depth + 1);
  }
  const count = Math.max(16, Math.min(4096, Math.ceil(pixelSize.width / 8)));
  let a = from,
    pa = sample(a);
  for (let i = 1; i <= count; i++) {
    if (evaluations >= 100000) {
      truncated = true;
      break;
    }
    const b = from + ((to - from) * i) / count,
      pb = sample(b);
    refine(a, b, pa, pb, 0);
    a = b;
    pa = pb;
  }
  return {
    segments: segments.filter((segment) => segment.length >= 2),
    evaluations,
    truncated,
  };
}
