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
export type {
  ImplicitCurve,
  ImplicitSampleOptions,
  ImplicitLimit,
  ImplicitDiagnostics,
  ImplicitSampleResult,
} from './implicitTypes.ts';
export {
  parseImplicitInput,
  compileImplicitCurve,
} from './parseImplicitInput.ts';
export {
  sampleImplicitCurve,
  sampleImplicitCurveDetailed,
} from './sampleImplicitCurve.ts';
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
export { analyzeExact } from './exactAnalysis.ts';
export type {
  Classification,
  ExactAnalysis,
  ExactAnalysisKind,
  ExactHit,
  ExactStep,
} from './exactAnalysis.ts';
export { exactToNumber } from './exactNumbers.ts';
export type { ExactNumber, Rational } from './exactNumbers.ts';
