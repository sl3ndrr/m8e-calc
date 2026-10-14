import {
  parseCurveInput,
  findRoots,
  findExtrema,
  findIntersections,
  tangentAt,
  definiteIntegral,
  sampleCurve,
  type Bounds,
  type Curve,
} from '../../graph';
import type { IntegralShade, Marker } from './renderer';
export type AnalysisKind =
  'roots' | 'extrema' | 'intersections' | 'tangent' | 'integral';
export interface AnalysisResult {
  markers: Marker[];
  tangent: Curve | null;
  shade: IntegralShade | null;
  integral: {
    value: number;
    errorEstimate: number;
    confidence: boolean;
  } | null;
}
export function analyze(
  curve: Curve,
  id: string,
  kind: AnalysisKind,
  bounds: Bounds,
  other?: Curve,
  u = 0,
  range?: readonly [number, number],
): AnalysisResult {
  const result: AnalysisResult = {
    markers: [],
    tangent: null,
    shade: null,
    integral: null,
  };
  if (kind === 'integral' && range && curve.kind === 'explicit') {
    const from = Math.max(
        bounds.xMin,
        Math.min(bounds.xMax, Math.min(...range)),
      ),
      to = Math.max(bounds.xMin, Math.min(bounds.xMax, Math.max(...range)));
    result.integral = definiteIntegral(curve, from, to, bounds);
    if (to > from)
      result.shade = {
        curveId: id,
        from,
        to,
        segments: sampleCurve(
          curve,
          { ...bounds, xMin: from, xMax: to },
          { width: 1024, height: 768 },
        ),
      };
    return result;
  }
  if (kind === 'tangent') {
    const tangent = tangentAt(curve, u, bounds);
    if (!tangent.confidence) return result;
    const parsed = parseCurveInput(`${tangent.slope}*x+(${tangent.intercept})`);
    result.tangent = parsed.ok ? parsed.value : null;
    result.markers = [
      {
        ...tangent.point,
        id: `${id}:tangent`,
        curveId: id,
        label: 'tangent',
        confidence: true,
      },
    ];
    return result;
  }
  const points =
    kind === 'roots'
      ? findRoots(curve, bounds)
      : kind === 'extrema'
        ? findExtrema(curve, bounds)
        : kind === 'intersections' && other
          ? findIntersections(curve, other, bounds)
          : [];
  result.markers = points.map((point, index) => ({
    ...point,
    id: `${id}:${kind}:${index}`,
    curveId: id,
    label: kind,
    confidence: point.confidence,
  }));
  return result;
}
