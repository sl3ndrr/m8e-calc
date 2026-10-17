import {
  Viewport,
  type Bounds,
  type ImplicitDiagnostics,
  type PixelSize,
  type Point,
} from '../../graph';
import type { PlotCurve } from './model';

export const implicitBudget = {
  maxCells: 200000,
  maxEvaluations: 1000000,
  maxSamples: 400000,
  maxSegments: 50000,
  maxDepth: 10,
} as const;
export interface SampleRequest {
  version: 2;
  id: number;
  curves: { id: string; curve: PlotCurve; signature: string }[];
  bounds: Bounds;
  size: PixelSize;
  budget: typeof implicitBudget;
}
export interface SampleResponse {
  version: 2;
  id: number;
  curves: {
    id: string;
    signature: string;
    segments: Point[][];
    evaluations: number;
    truncated: boolean;
    diagnostics?: ImplicitDiagnostics;
    error?: 'invalid' | 'worker' | 'fallback-limit' | 'timeout';
  }[];
  bounds: Bounds;
  size: PixelSize;
  milliseconds: number;
}
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const finite = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);
const text = (v: unknown, max: number): v is string =>
  typeof v === 'string' && v.length <= max;
function validView(v: Record<string, unknown>): boolean {
  try {
    if (!object(v.bounds) || !object(v.size)) return false;
    const b = v.bounds,
      s = v.size;
    if (
      ![b.xMin, b.xMax, b.yMin, b.yMax, s.width, s.height].every(finite) ||
      !finite(s.width) ||
      !finite(s.height) ||
      s.width > 16384 ||
      s.height > 16384
    )
      return false;
    new Viewport(b as unknown as Bounds, s as unknown as PixelSize);
    return true;
  } catch {
    return false;
  }
}
/** Check only scalar graph ASTs, with the domain's traversal/depth ceilings. */
function validAst(root: unknown): boolean {
  const stack = [{ value: root, depth: 0 }],
    seen = new Set<unknown>();
  let visits = 0;
  while (stack.length) {
    const item = stack.pop();
    if (
      !item ||
      !object(item.value) ||
      item.depth > 128 ||
      ++visits > 2048 ||
      seen.has(item.value)
    )
      return false;
    const n = item.value;
    seen.add(n);
    const push = (value: unknown) =>
      stack.push({ value, depth: item.depth + 1 });
    if (n.kind === 'number') {
      if (!text(n.literal, 10000)) return false;
    } else if (n.kind === 'identifier') {
      if (!text(n.name, 256)) return false;
    } else if (n.kind === 'group') push(n.expression);
    else if (n.kind === 'binary') {
      if (!['+', '-', '*', '/', '^'].includes(String(n.operator))) return false;
      push(n.left);
      push(n.right);
    } else if (n.kind === 'unary' || n.kind === 'postfix') {
      if (
        !(n.kind === 'unary' ? ['+', '-'] : ['!', '%']).includes(
          String(n.operator),
        )
      )
        return false;
      push(n.operand);
    } else if (n.kind === 'call') {
      if (!text(n.name, 256) || !Array.isArray(n.args) || n.args.length > 2048)
        return false;
      n.args.forEach(push);
    } else return false;
  }
  return true;
}
function validCurve(v: unknown): boolean {
  if (
    !object(v) ||
    !['explicit', 'vertical', 'parametric', 'polar', 'implicit'].includes(
      String(v.kind),
    )
  )
    return false;
  if (
    v.angleMode !== undefined &&
    !['rad', 'deg', 'grad'].includes(String(v.angleMode))
  )
    return false;
  if (
    v.params !== undefined &&
    (!object(v.params) ||
      Object.keys(v.params).length > 2048 ||
      !Object.values(v.params).every(finite))
  )
    return false;
  if (v.kind === 'polar' || v.kind === 'parametric') {
    if (
      !Array.isArray(v.range) ||
      v.range.length !== 2 ||
      !v.range.every(finite) ||
      !(v.range[0] < v.range[1]) ||
      !Number.isFinite(v.range[1] - v.range[0])
    )
      return false;
  }
  return v.kind === 'parametric'
    ? validAst(v.x) && validAst(v.y)
    : validAst(v.expression);
}
export function isSampleRequest(v: unknown): v is SampleRequest {
  if (
    !object(v) ||
    v.version !== 2 ||
    !Number.isSafeInteger(v.id) ||
    !finite(v.id) ||
    v.id < 1 ||
    !validView(v) ||
    !Array.isArray(v.curves) ||
    v.curves.length > 101 ||
    !object(v.budget)
  )
    return false;
  if (
    !Object.entries(implicitBudget).every(
      ([k, value]) => (v.budget as Record<string, unknown>)[k] === value,
    )
  )
    return false;
  const ids = new Set<string>();
  return v.curves.every((c) => {
    if (
      !object(c) ||
      !text(c.id, 256) ||
      ids.has(c.id) ||
      !text(c.signature, 200000) ||
      !validCurve(c.curve)
    )
      return false;
    ids.add(c.id);
    return true;
  });
}
export function isSampleResponse(v: unknown): v is SampleResponse {
  if (
    !object(v) ||
    v.version !== 2 ||
    !Number.isSafeInteger(v.id) ||
    !finite(v.id) ||
    v.id < 1 ||
    !validView(v) ||
    !finite(v.milliseconds) ||
    v.milliseconds < 0 ||
    !Array.isArray(v.curves) ||
    v.curves.length > 101
  )
    return false;
  let points = 0;
  const ids = new Set<string>();
  return v.curves.every((c) => {
    if (
      !object(c) ||
      !text(c.id, 256) ||
      ids.has(c.id) ||
      !text(c.signature, 200000) ||
      !finite(c.evaluations) ||
      c.evaluations < 0 ||
      typeof c.truncated !== 'boolean' ||
      !Array.isArray(c.segments)
    )
      return false;
    ids.add(c.id);
    if (
      c.error !== undefined &&
      !['invalid', 'worker', 'fallback-limit', 'timeout'].includes(
        String(c.error),
      )
    )
      return false;
    if (c.diagnostics !== undefined) {
      const d = c.diagnostics;
      if (
        !object(d) ||
        ![
          'contours',
          'empty',
          'constant-zero',
          'undefined',
          'unresolved',
        ].includes(String(d.status)) ||
        !Array.isArray(d.limits) ||
        !d.limits.every((l) =>
          [
            'cells',
            'evaluations',
            'samples',
            'depth',
            'segments',
            'precision',
          ].includes(String(l)),
        )
      )
        return false;
      for (const key of [
        'cells',
        'leaves',
        'cachedSamples',
        'outputEdges',
        'deepestLevel',
        'nonFiniteEvaluations',
        'rejectedEdges',
        'unresolvedCells',
        'zeroCells',
        'saddleCells',
        'transitionCells',
        'maxEstimatedErrorPixels',
      ])
        if (!finite(d[key]) || d[key] < 0) return false;
    }
    return c.segments.every(
      (s) =>
        Array.isArray(s) &&
        s.every(
          (p) => ++points <= 1000000 && object(p) && finite(p.x) && finite(p.y),
        ),
    );
  });
}
/** Compare against the last *requested* state, never only the running job. */
export function matchesRequest(
  result: SampleResponse,
  request: SampleRequest,
): boolean {
  return (
    result.id === request.id &&
    JSON.stringify(result.bounds) === JSON.stringify(request.bounds) &&
    JSON.stringify(result.size) === JSON.stringify(request.size) &&
    result.curves.length === request.curves.length &&
    result.curves.every(
      (c, i) =>
        c.id === request.curves[i]?.id &&
        c.signature === request.curves[i]?.signature,
    )
  );
}
