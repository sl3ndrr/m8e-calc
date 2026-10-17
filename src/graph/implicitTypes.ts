import type { Ast } from '../engine/types.ts';
import type { CurveOptions, SampleResult } from './types.ts';

/** Separate from Curve until AP27 defines the UI/worker/analysis contract. */
export interface ImplicitCurve extends CurveOptions {
  readonly kind: 'implicit';
  /** The zero set of this expression, in the independent variables x and y. */
  readonly expression: Ast;
}

export interface ImplicitSampleOptions {
  /** Maximum side of discovery cells in CSS pixels (default 8). */
  readonly discoveryPixels?: number;
  /** Local normal-distance estimate at chord probes (default 0.25 px). */
  readonly tolerancePixels?: number;
  readonly maxCells?: number;
  readonly maxEvaluations?: number;
  readonly maxDepth?: number;
  readonly maxSamples?: number;
  readonly maxSegments?: number;
}

export type ImplicitLimit =
  'cells' | 'evaluations' | 'depth' | 'samples' | 'segments' | 'precision';

export interface ImplicitDiagnostics {
  readonly status:
    'contours' | 'empty' | 'constant-zero' | 'undefined' | 'unresolved';
  readonly limits: readonly ImplicitLimit[];
  readonly cells: number;
  readonly leaves: number;
  readonly cachedSamples: number;
  readonly outputEdges: number;
  readonly deepestLevel: number;
  readonly nonFiniteEvaluations: number;
  readonly rejectedEdges: number;
  readonly unresolvedCells: number;
  readonly zeroCells: number;
  readonly saddleCells: number;
  readonly transitionCells: number;
  readonly maxEstimatedErrorPixels: number;
}

export interface ImplicitSampleResult extends SampleResult {
  readonly diagnostics: ImplicitDiagnostics;
}
