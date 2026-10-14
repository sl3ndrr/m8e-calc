import type {
  AngleMode,
  Ast,
  FunctionRegistry,
  SourceRange,
} from '../engine/types.ts';

export interface Point {
  readonly x: number;
  readonly y: number;
}
export interface Bounds {
  readonly xMin: number;
  readonly xMax: number;
  readonly yMin: number;
  readonly yMax: number;
}
export interface PixelSize {
  readonly width: number;
  readonly height: number;
}
export interface CurveOptions {
  readonly params?: Readonly<Record<string, number>>;
  readonly angleMode?: AngleMode;
}
export type Curve = CurveOptions &
  (
    | { readonly kind: 'explicit' | 'vertical'; readonly expression: Ast }
    | {
        readonly kind: 'parametric';
        readonly x: Ast;
        readonly y: Ast;
        readonly range: readonly [number, number];
      }
    | {
        readonly kind: 'polar';
        readonly expression: Ast;
        readonly range: readonly [number, number];
      }
  );
export interface CurveInputOptions extends CurveOptions {
  readonly range?: readonly [number, number];
}
export interface GraphError {
  readonly code: string;
  readonly range: SourceRange;
  readonly detectedKind?: 'implicit';
}
export interface CompileOptions {
  readonly variables: readonly string[];
  readonly params?: Readonly<Record<string, number>>;
  readonly angleMode?: AngleMode;
  readonly functions?: FunctionRegistry;
}
export interface CompiledFunction {
  (...variables: number[]): number;
  readonly parameterNames: readonly string[];
  setParam(name: string, value: number): boolean;
  getParams(): Readonly<Record<string, number>>;
}
export interface SampleResult {
  readonly segments: Point[][];
  readonly evaluations: number;
  readonly truncated: boolean;
}
export interface Estimate {
  readonly value: number;
  readonly errorEstimate: number;
  readonly confidence: boolean;
}
export interface AnalysisPoint extends Point {
  readonly errorEstimate: number;
  readonly confidence: boolean;
}
export interface Extremum extends AnalysisPoint {
  readonly kind: 'minimum' | 'maximum';
}
export interface Tangent extends Estimate {
  readonly point: Point;
  readonly slope: number;
  readonly intercept: number;
}
export interface AnalysisOptions {
  readonly xTolerance?: number;
  readonly valueTolerance?: number;
  readonly absoluteTolerance?: number;
  readonly relativeTolerance?: number;
  readonly scanIntervals?: number;
  readonly maxIterations?: number;
  readonly maxEvaluations?: number;
}
export interface Tick {
  readonly value: number;
  readonly label: string;
}
export interface TickOptions {
  readonly spacing?: number;
  readonly pi?: boolean;
}
