import {
  parseCurveInput,
  findRoots,
  findExtrema,
  findInflections,
  findIntersections,
  analyzeExact,
  exactToNumber,
  tangentAt,
  definiteIntegral,
  sampleCurve,
  type Bounds,
  type Curve,
  type ExactAnalysis,
  type ExactAnalysisKind,
  type ExactHit,
} from '../../graph';
import type { IntegralShade, Marker } from './renderer';
import { isOneDimensional, type PlotCurve } from './model';
export type AnalysisKind = ExactAnalysisKind | 'tangent' | 'integral';
export type AnalysisMethod = 'numerical' | 'analytical';
export function hasAnalysisMethod(
  kind: AnalysisKind,
): kind is ExactAnalysisKind {
  return kind !== 'tangent' && kind !== 'integral';
}
export interface AnalysisMarker extends Marker {
  label: AnalysisKind;
  exact?: ExactHit;
}
export interface AnalysisResult {
  unsupported?: boolean;
  exactStatus?: ExactAnalysis['status'];
  markers: AnalysisMarker[];
  tangent: Curve | null;
  shade: IntegralShade | null;
  integral: {
    value: number;
    errorEstimate: number;
    confidence: boolean;
  } | null;
}
export function analyze(
  curve: PlotCurve,
  id: string,
  kind: AnalysisKind,
  bounds: Bounds,
  other?: PlotCurve,
  u = 0,
  range?: readonly [number, number],
  method: AnalysisMethod = 'numerical',
): AnalysisResult {
  const result: AnalysisResult = {
    markers: [],
    tangent: null,
    shade: null,
    integral: null,
  };
  if (!isOneDimensional(curve) || (other && !isOneDimensional(other)))
    return { ...result, unsupported: true };
  if (method === 'analytical' && hasAnalysisMethod(kind)) {
    const exact = analyzeExact(curve, kind, bounds, other);
    result.exactStatus = exact.status;
    if (exact.status === 'hits')
      result.markers = exact.hits.map((hit, index) => ({
        x: exactToNumber(hit.x),
        y: exactToNumber(hit.y),
        id: `${id}:${kind}:${index}`,
        curveId: id,
        label: kind,
        confidence: true,
        exact: hit,
      }));
    return result;
  }
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
    kind === 'intersections'
      ? other
        ? findIntersections(curve, other, bounds)
        : []
      : kind === 'integral'
        ? []
        : {
            roots: findRoots,
            extrema: findExtrema,
            inflections: findInflections,
          }[kind](curve, bounds);
  result.markers = points.map((point, index) => ({
    ...point,
    id: `${id}:${kind}:${index}`,
    curveId: id,
    label: kind,
    confidence: point.confidence,
  }));
  return result;
}
