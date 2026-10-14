export type {
  Point,
  Bounds,
  PixelSize,
  Curve,
  CurveOptions,
  CurveInputOptions,
  GraphError,
  CompileOptions,
  CompiledFunction,
  SampleResult,
  Estimate,
  AnalysisPoint,
  Extremum,
  Tangent,
  AnalysisOptions,
  Tick,
  TickOptions,
} from './types.ts';
export { compile, detectParams } from './compile.ts';
export { parseCurveInput } from './parseCurveInput.ts';
export { sampleCurve, sampleCurveDetailed } from './sampleCurve.ts';
export { Viewport } from './viewport.ts';
export {
  findRoots,
  findExtrema,
  findInflections,
  findIntersections,
  yIntercept,
  slopeAt,
  tangentAt,
  definiteIntegral,
  areaBetween,
} from './analysis.ts';
