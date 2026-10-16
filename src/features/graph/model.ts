import {
  compile,
  detectParams,
  parseCurveInput,
  Viewport,
  type Bounds,
  type Curve,
  type GraphError,
  type Point,
} from '../../graph';
import { tryViewport } from './viewportTransition';
import type { JsonValue } from '../../shared/history';
export interface Parameter {
  value: number;
  min: number;
  max: number;
  step: number;
}
export interface PlotRow {
  id: string;
  input: string;
  visible: boolean;
  color: number;
  params: Record<string, Parameter>;
}
export interface PlotSet {
  version: 1;
  rows: PlotRow[];
  bounds: Bounds;
  fitBasis?: Bounds;
  lockAspect: boolean;
  pi: boolean;
  fine: boolean;
}
export interface ParsedRow {
  row: PlotRow;
  curve: Curve | null;
  error: GraphError | null;
  names: string[];
}
export const defaultBounds: Bounds = { xMin: -10, xMax: 10, yMin: -6, yMax: 6 };
export const examples = [
  { key: 'parabola', input: 'a*x^2+b*x+c' },
  { key: 'sine', input: 'a*sin(b*x)' },
  { key: 'lissajous', input: '(sin(3*t),sin(2*t))' },
  { key: 'cardioid', input: 'r=1+cos(theta)' },
  { key: 'normal', input: 'exp(-x^2/2)/sqrt(2*pi)' },
  { key: 'circle', input: '(cos(t),sin(t))' },
] as const;
export function newRow(id: string, input = '', color = 0): PlotRow {
  return { id, input, visible: true, color: color % 8, params: {} };
}
export function initialPlot(): PlotSet {
  return {
    version: 1,
    rows: [],
    bounds: defaultBounds,
    lockAspect: false,
    pi: false,
    fine: true,
  };
}
export function parseRow(row: PlotRow): ParsedRow {
  if (!row.input.trim()) return { row, curve: null, error: null, names: [] };
  const result = parseCurveInput(row.input, {
    params: Object.fromEntries(
      Object.entries(row.params).map(([k, p]) => [k, p.value]),
    ),
  });
  if (!result.ok) return { row, curve: null, error: result.error, names: [] };
  const c = result.value;
  const variables =
    c.kind === 'parametric'
      ? ['t']
      : c.kind === 'polar'
        ? ['theta']
        : c.kind === 'explicit'
          ? ['x']
          : [];
  const names = [
    ...new Set(
      (c.kind === 'parametric' ? [c.x, c.y] : [c.expression]).flatMap((ast) =>
        detectParams(ast, variables),
      ),
    ),
  ].sort();
  return { row, curve: c, error: null, names };
}
export function parameter(row: PlotRow, name: string): Parameter {
  return row.params[name] ?? { value: 1, min: -5, max: 5, step: 0.1 };
}
export function normalizeParameter(p: Parameter): Parameter | null {
  if (
    ![p.value, p.min, p.max, p.step].every(Number.isFinite) ||
    p.min >= p.max ||
    p.step <= 0 ||
    p.max - p.min > 1e12
  )
    return null;
  return {
    ...p,
    value: Math.max(p.min, Math.min(p.max, p.value)),
    step: Math.min(p.step, p.max - p.min),
  };
}
export function advanceParameter(p: Parameter, seconds: number): Parameter {
  const span = p.max - p.min;
  const value = p.min + ((p.value - p.min + (seconds * span) / 4) % span);
  return {
    ...p,
    value: Math.min(
      p.max,
      p.min + Math.round((value - p.min) / p.step) * p.step,
    ),
  };
}
export type PlotAction =
  | { type: 'add'; row: PlotRow }
  | { type: 'update'; id: string; patch: Partial<PlotRow> }
  | { type: 'delete'; id: string }
  | { type: 'reorder'; id: string; to: number }
  | { type: 'view'; bounds: Bounds; fitBasis?: Bounds }
  | {
      type: 'options';
      patch: Partial<Pick<PlotSet, 'lockAspect' | 'fine' | 'pi'>>;
    }
  | { type: 'restore'; plot: PlotSet };
export function plotReducer(state: PlotSet, action: PlotAction): PlotSet {
  switch (action.type) {
    case 'add':
      return { ...state, rows: [...state.rows, action.row] };
    case 'update':
      return {
        ...state,
        rows: state.rows.map((r) =>
          r.id === action.id ? { ...r, ...action.patch, id: r.id } : r,
        ),
      };
    case 'delete':
      return { ...state, rows: state.rows.filter((r) => r.id !== action.id) };
    case 'reorder': {
      const row = state.rows.find((r) => r.id === action.id);
      if (!row) return state;
      const rows = state.rows.filter((r) => r.id !== action.id);
      rows.splice(Math.max(0, Math.min(rows.length, action.to)), 0, row);
      return { ...state, rows };
    }
    case 'view': {
      if (
        !tryViewport(
          () =>
            new Viewport(
              action.bounds,
              { width: 1, height: 1 },
              { fitBasis: action.fitBasis },
            ),
        )
      )
        return state;
      return { ...state, bounds: action.bounds, fitBasis: action.fitBasis };
    }
    case 'options':
      return { ...state, ...action.patch };
    case 'restore':
      return action.plot;
  }
}
export function plotPayload(plot: PlotSet): JsonValue {
  return JSON.parse(JSON.stringify(plot)) as JsonValue;
}
export function restorePlot(value: unknown): PlotSet | null {
  try {
    if (!value || typeof value !== 'object') return null;
    const p = value as PlotSet;
    if (
      p.version !== 1 ||
      !Array.isArray(p.rows) ||
      p.rows.length > 100 ||
      typeof p.pi !== 'boolean' ||
      typeof p.fine !== 'boolean' ||
      typeof p.lockAspect !== 'boolean'
    )
      return null;
    new Viewport(
      p.bounds,
      { width: 100, height: 100 },
      { fitBasis: p.fitBasis },
    );
    const ids = new Set<string>();
    for (const r of p.rows) {
      if (
        !r ||
        typeof r.id !== 'string' ||
        ids.has(r.id) ||
        typeof r.input !== 'string' ||
        r.input.length > 10000 ||
        typeof r.visible !== 'boolean' ||
        !Number.isInteger(r.color) ||
        r.color < 0 ||
        r.color > 7 ||
        !r.params ||
        typeof r.params !== 'object'
      )
        return null;
      ids.add(r.id);
      for (const param of Object.values(r.params))
        if (!param) return null;
        else {
          const normalized = normalizeParameter(param);
          if (
            !normalized ||
            normalized.value !== param.value ||
            normalized.step !== param.step
          )
            return null;
        }
    }
    return JSON.parse(JSON.stringify(p)) as PlotSet;
  } catch {
    return null;
  }
}
export function curveEvaluator(curve: Curve): (u: number) => Point {
  const opts = { params: curve.params, angleMode: curve.angleMode };
  if (curve.kind === 'parametric') {
    const x = compile(curve.x, { ...opts, variables: ['t'] }),
      y = compile(curve.y, { ...opts, variables: ['t'] });
    return (u) => ({ x: x(u), y: y(u) });
  }
  const f = compile(curve.expression, {
    ...opts,
    variables:
      curve.kind === 'explicit'
        ? ['x']
        : curve.kind === 'polar'
          ? ['theta']
          : [],
  });
  if (curve.kind === 'polar') {
    const scale =
      curve.angleMode === 'deg'
        ? Math.PI / 180
        : curve.angleMode === 'grad'
          ? Math.PI / 200
          : 1;
    return (u) => ({
      x: f(u) * Math.cos(u * scale),
      y: f(u) * Math.sin(u * scale),
    });
  }
  return curve.kind === 'vertical'
    ? (u) => ({ x: f(), y: u })
    : (u) => ({ x: u, y: f(u) });
}
/** Validate bounds with the pixel size actually sent to the sampler/cache. */
export function samplingViewport(viewport: Viewport): Viewport {
  const b = viewport.bounds;
  const dx = (b.xMax - b.xMin) * 0.35;
  const dy = (b.yMax - b.yMin) * 0.35;
  return (
    tryViewport(
      () =>
        new Viewport(
          {
            xMin: b.xMin - dx,
            xMax: b.xMax + dx,
            yMin: b.yMin - dy,
            yMax: b.yMax + dy,
          },
          {
            width: viewport.pixelSize.width * 1.7,
            height: viewport.pixelSize.height * 1.7,
          },
        ),
    ) ?? viewport
  );
}
export interface Trace {
  id: string;
  point: Point;
  u: number;
}
export function nearestTrace(
  rows: readonly ParsedRow[],
  viewport: Viewport,
  mouse: Point,
): Trace | null {
  let best: Trace | null = null,
    distance = 18;
  for (const { row, curve } of rows) {
    if (!curve || !row.visible) continue;
    const evaluate = curveEvaluator(curve),
      world = viewport.screenToWorld(mouse);
    if (curve.kind === 'vertical') {
      const u = world.y,
        point = evaluate(u),
        screen = viewport.worldToScreen(point),
        d = Math.hypot(screen.x - mouse.x, screen.y - mouse.y);
      if (d < distance) {
        distance = d;
        best = { id: row.id, point, u };
      }
      continue;
    }
    const delta =
      ((viewport.bounds.xMax - viewport.bounds.xMin) * 18) /
      viewport.pixelSize.width;
    const [from, to] =
      curve.kind !== 'parametric' && curve.kind !== 'polar'
        ? [
            Math.max(viewport.bounds.xMin, world.x - delta),
            Math.min(viewport.bounds.xMax, world.x + delta),
          ]
        : curve.range;
    const count = curve.kind === 'explicit' ? 32 : 512;
    let u = from,
      d = Infinity;
    for (let i = 0; i <= count; i++) {
      const at = from + ((to - from) * i) / count,
        s = viewport.worldToScreen(evaluate(at)),
        next = Math.hypot(s.x - mouse.x, s.y - mouse.y);
      if (next < d) {
        u = at;
        d = next;
      }
    }
    let step = (to - from) / count;
    for (let i = 0; i < 12; i++) {
      for (const at of [Math.max(from, u - step), Math.min(to, u + step)]) {
        const s = viewport.worldToScreen(evaluate(at)),
          next = Math.hypot(s.x - mouse.x, s.y - mouse.y);
        if (next < d) {
          u = at;
          d = next;
        }
      }
      step /= 2;
    }
    if (d < distance) {
      distance = d;
      best = { id: row.id, point: evaluate(u), u };
    }
  }
  return best;
}
export function tableValues(
  curve: Curve,
  bounds: Bounds,
  step: number,
): { u: number; point: Point }[] {
  if (!Number.isFinite(step) || step <= 0) return [];
  return tableResult(curve, bounds, step).rows;
}
export function tableResult(
  curve: Curve,
  bounds: Bounds,
  step: number,
): {
  rows: { u: number; point: Point }[];
  stopped: 'limit' | 'precision' | null;
} {
  const rows: { u: number; point: Point }[] = [];
  if (!Number.isFinite(step) || step <= 0) return { rows, stopped: null };
  const [from, to] =
    curve.kind === 'parametric' || curve.kind === 'polar'
      ? curve.range
      : curve.kind === 'vertical'
        ? [bounds.yMin, bounds.yMax]
        : [bounds.xMin, bounds.xMax];
  if (!Number.isFinite(from) || !Number.isFinite(to) || from > to)
    return { rows, stopped: null };
  const evaluate = curveEvaluator(curve);
  for (let i = 0; i <= 500; i++) {
    const u = from + i * step;
    if (!Number.isFinite(u) || u > to) return { rows, stopped: null };
    const previous = rows.at(-1);
    if (previous && u <= previous.u) return { rows, stopped: 'precision' };
    if (i === 500) return { rows, stopped: 'limit' };
    rows.push({ u, point: evaluate(u) });
    if (u === to) return { rows, stopped: null };
  }
  return { rows, stopped: null };
}
