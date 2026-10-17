import { detectParams } from './compile.ts';
import { validateViewport } from './geometry.ts';
import { asymptoticDecider } from './implicitMarching.ts';
import { compileImplicitCurve } from './parseImplicitInput.ts';
import type { Bounds, PixelSize, Point } from './types.ts';
import type {
  ImplicitCurve,
  ImplicitLimit,
  ImplicitSampleOptions,
  ImplicitSampleResult,
} from './implicitTypes.ts';

interface Cell {
  x: number;
  y: number;
  size: number;
  depth: number;
  blocked?: boolean;
}
interface Node {
  id: string;
  point: Point;
}
type Link = readonly [Node, Node];
interface Edge {
  root?: Node;
  zero?: Link;
  rejected?: boolean;
}
interface Patch {
  links: Link[];
  refine: boolean;
  error: number;
}
type Lines = Map<number, number[]>;

function integer(
  value: number | undefined,
  fallback: number,
  maximum: number,
  minimum = 1,
): number {
  const n = value ?? fallback;
  if (!Number.isSafeInteger(n) || n < minimum || n > maximum)
    throw new RangeError('Invalid implicit work budget');
  return n;
}
function positive(
  value: number | undefined,
  fallback: number,
  maximum: number,
): number {
  const n = value ?? fallback;
  if (!Number.isFinite(n) || n <= 0 || n > maximum)
    throw new RangeError('Invalid implicit pixel criterion');
  return n;
}
function lowerBound(values: readonly number[], x: number): number {
  let a = 0,
    b = values.length;
  while (a < b) {
    const m = (a + b) >>> 1;
    if ((values[m] ?? Infinity) < x) a = m + 1;
    else b = m;
  }
  return a;
}

export function sampleImplicitCurve(
  curve: ImplicitCurve,
  bounds: Bounds,
  pixels: PixelSize,
  options: ImplicitSampleOptions = {},
): Point[][] {
  return sampleImplicitCurveDetailed(curve, bounds, pixels, options).segments;
}

/** Local state only; no clock, global cache, rendering or application state. */
export function sampleImplicitCurveDetailed(
  curve: ImplicitCurve,
  bounds: Bounds,
  pixels: PixelSize,
  options: ImplicitSampleOptions = {},
): ImplicitSampleResult {
  validateViewport(bounds, pixels);
  const maxCells = integer(options.maxCells, 200000, 1000000),
    maxEvaluations = integer(options.maxEvaluations, 1000000, 4000000),
    maxSamples = integer(options.maxSamples, 400000, 1000000),
    maxSegments = integer(options.maxSegments, 50000, 200000),
    maxDepth = integer(options.maxDepth, 10, 16, 0),
    discovery = positive(options.discoveryPixels, 8, 64),
    tolerance = positive(options.tolerancePixels, 0.25, 2),
    nx = Math.max(1, Math.ceil(pixels.width / 32)),
    ny = Math.max(1, Math.ceil(pixels.height / 32)),
    unit = 2 ** (maxDepth + 1),
    width = nx * unit,
    height = ny * unit,
    dx = bounds.xMax - bounds.xMin,
    dy = bounds.yMax - bounds.yMin,
    f = compileImplicitCurve(curve),
    limits = new Set<ImplicitLimit>(),
    samples = new Map<string, number>(),
    roots = new Map<string, Edge>();
  if (discovery < tolerance)
    throw new RangeError(
      'Discovery must not be smaller than the pixel tolerance',
    );
  let evaluations = 0,
    cells = 0,
    deepestLevel = 0,
    nonFiniteEvaluations = 0,
    rejectedEdges = 0,
    unresolvedCells = 0,
    zeroCells = 0,
    saddleCells = 0,
    transitionCells = 0,
    maxEstimatedErrorPixels = 0;
  let leaves: Cell[] = [];
  const key = (x: number, y: number): string => `${x},${y}`;
  const point = (x: number, y: number): Point => ({
    x: x === width ? bounds.xMax : bounds.xMin + dx * (x / width),
    y: y === height ? bounds.yMax : bounds.yMin + dy * (y / height),
  });
  const node = (x: number, y: number): Node => ({
    id: 'v:' + key(x, y),
    point: point(x, y),
  });
  function evaluate(p: Point): number {
    if (evaluations >= maxEvaluations) {
      limits.add('evaluations');
      return NaN;
    }
    evaluations++;
    const v = f(p.x, p.y);
    if (!Number.isFinite(v)) nonFiniteEvaluations++;
    return v;
  }
  function sample(x: number, y: number): number {
    const id = key(x, y),
      cached = samples.get(id);
    if (cached !== undefined) return cached;
    if (samples.size >= maxSamples) {
      limits.add('samples');
      return NaN;
    }
    const value = evaluate(point(x, y));
    samples.set(id, value);
    return value;
  }
  function exhausted(): boolean {
    return limits.has('evaluations') || limits.has('samples');
  }
  function finish(
    segments: Point[][],
    outputEdges: number,
    status: ImplicitSampleResult['diagnostics']['status'],
  ): ImplicitSampleResult {
    return {
      segments,
      evaluations,
      truncated: limits.size > 0,
      diagnostics: {
        status,
        limits: [...limits].sort(),
        cells,
        leaves: leaves.length,
        cachedSamples: samples.size,
        outputEdges,
        deepestLevel,
        nonFiniteEvaluations,
        rejectedEdges,
        unresolvedCells,
        zeroCells,
        saddleCells,
        transitionCells,
        maxEstimatedErrorPixels,
      },
    };
  }
  // Syntactic coordinate independence, not symbolic simplification or solving.
  if (
    !detectParams(curve.expression, []).some(
      (name) => name === 'x' || name === 'y',
    )
  ) {
    const value = evaluate(point(width / 2, height / 2));
    return finish(
      [],
      0,
      value === 0
        ? 'constant-zero'
        : Number.isFinite(value)
          ? 'empty'
          : 'undefined',
    );
  }
  if (!Number.isSafeInteger(nx * ny) || nx * ny > maxCells) {
    limits.add('cells');
    return finish([], 0, 'unresolved');
  }

  function edge(ax: number, ay: number, bx: number, by: number): Edge {
    const aValue = sample(ax, ay),
      bValue = sample(bx, by);
    if (!Number.isFinite(aValue) || !Number.isFinite(bValue))
      return { rejected: true };
    if (aValue !== 0 && bValue !== 0 && aValue < 0 === bValue < 0) return {};
    const id = key(ax, ay) + ':' + key(bx, by),
      cached = roots.get(id);
    if (cached) return cached;
    const a = node(ax, ay),
      b = node(bx, by);
    const interpolate = (t: number): Point => ({
      x: a.point.x + (b.point.x - a.point.x) * t,
      y: a.point.y + (b.point.y - a.point.y) * t,
    });
    let result: Edge;
    if (aValue === 0 && bValue === 0) {
      // Do not draw an edge merely because its endpoints happen to be zeros.
      result = [0.25, 0.5, 0.75].every((t) => evaluate(interpolate(t)) === 0)
        ? { zero: [a, b] }
        : { rejected: true };
    } else if (aValue === 0) result = { root: a };
    else if (bValue === 0) result = { root: b };
    else {
      let lo = 0,
        hi = 1,
        flo = aValue,
        fhi = bValue,
        best = Math.min(Math.abs(aValue), Math.abs(bValue)),
        bestT = Math.abs(aValue) < Math.abs(bValue) ? 0 : 1,
        valid = true;
      const baseline = best,
        threshold = best * 1e-7,
        continuityFloor = Math.min(
          Math.max(Math.abs(aValue), Math.abs(bValue)) * 1e-7,
          baseline * 16,
        );
      for (let i = 0; i < 52; i++) {
        const mid = lo + (hi - lo) / 2,
          value = evaluate(interpolate(mid));
        if (!Number.isFinite(value)) {
          valid = false;
          break;
        }
        if (Math.abs(value) < best) {
          best = Math.abs(value);
          bestT = mid;
        }
        if (value === 0) {
          bestT = mid;
          best = 0;
          break;
        }
        if (flo < 0 === value < 0) {
          lo = mid;
          flo = value;
        } else {
          hi = mid;
          fhi = value;
        }
        if (
          i >= 8 &&
          Math.min(Math.abs(flo), Math.abs(fhi)) > baseline * 4 &&
          best >= baseline * 0.5
        ) {
          valid = false;
          break;
        }
      }
      let bestPoint = interpolate(bestT);
      if (valid && best !== 0) {
        // A final secant inside the tight bracket recovers representable linear
        // roots exactly, including displaced crossing axes.
        const p = interpolate(lo),
          q = interpolate(hi),
          scale = Math.max(Math.abs(flo), Math.abs(fhi)),
          weight = flo / scale / (flo / scale - fhi / scale);
        const candidate = {
          x: p.x + (q.x - p.x) * weight,
          y: p.y + (q.y - p.y) * weight,
        };
        const value = evaluate(candidate);
        if (Number.isFinite(value) && Math.abs(value) < best) {
          best = Math.abs(value);
          bestPoint = candidate;
        }
      }
      result =
        valid &&
        (best <= threshold || Math.abs(flo) + Math.abs(fhi) <= continuityFloor)
          ? {
              root:
                bestPoint.x === a.point.x && bestPoint.y === a.point.y
                  ? a
                  : bestPoint.x === b.point.x && bestPoint.y === b.point.y
                    ? b
                    : { id: 'e:' + id, point: bestPoint },
            }
          : { rejected: true };
    }
    if (result.rejected) rejectedEdges++;
    // At most four potential edges per created cell, including retired parents.
    roots.set(id, result);
    return result;
  }

  function chordError(a: Point, b: Point, cell: Cell): number {
    const hx = (dx * (cell.size / width)) / 32,
      hy = (dy * (cell.size / height)) / 32;
    let error = 0;
    for (const t of [0.25, 0.5, 0.75]) {
      const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      const v = evaluate(p);
      if (!Number.isFinite(v)) return Infinity;
      // Central differences in CSS-pixel coordinates, normalized before subtraction.
      const values = [
        v,
        evaluate({ x: p.x + hx, y: p.y }),
        evaluate({ x: p.x - hx, y: p.y }),
        evaluate({ x: p.x, y: p.y + hy }),
        evaluate({ x: p.x, y: p.y - hy }),
      ];
      if (!values.every(Number.isFinite)) return Infinity;
      const scale = Math.max(...values.map(Math.abs));
      if (scale === 0) continue;
      const [z = 0, xp = 0, xm = 0, yp = 0, ym = 0] = values.map(
        (x) => x / scale,
      );
      const gradient = Math.hypot(
        (xp - xm) / ((2 * cell.size * pixels.width) / width / 32),
        (yp - ym) / ((2 * cell.size * pixels.height) / height / 32),
      );
      const estimate = z === 0 ? 0 : Math.abs(z) / gradient;
      if (!Number.isFinite(estimate)) return Infinity;
      error = Math.max(error, estimate);
    }
    return error;
  }

  function patch(cell: Cell, horizontal?: Lines, vertical?: Lines): Patch {
    const { x, y, size: s } = cell;
    const corners = [
      sample(x, y),
      sample(x + s, y),
      sample(x + s, y + s),
      sample(x, y + s),
    ];
    const probes = [
      ...corners,
      sample(x + s / 2, y),
      sample(x + s, y + s / 2),
      sample(x + s / 2, y + s),
      sample(x, y + s / 2),
      sample(x + s / 2, y + s / 2),
    ];
    const sides = (
      [
        [true, y, x],
        [false, x + s, y],
        [true, y + s, x],
        [false, x, y],
      ] as const
    ).map(([isHorizontal, fixed, from]) => {
      const line = (isHorizontal ? horizontal : vertical)?.get(fixed),
        coords = [from];
      if (line)
        for (
          let i = lowerBound(line, from + 1);
          i < line.length && (line[i] ?? Infinity) < from + s;
          i++
        ) {
          const coordinate = line[i];
          if (coordinate !== undefined) {
            coords.push(coordinate);
            // Fine boundary probes participate in culling as well as extraction.
            probes.push(
              isHorizontal
                ? sample(coordinate, fixed)
                : sample(fixed, coordinate),
            );
          }
        }
      coords.push(from + s);
      return { isHorizontal, fixed, coords };
    });
    if (probes.every((v) => !Number.isFinite(v)))
      return { links: [], refine: false, error: 0 };
    if (probes.every((v) => v === 0)) {
      if (horizontal) zeroCells++;
      return { links: [], refine: false, error: 0 };
    }
    if (probes.every((v) => v > 0) || probes.every((v) => v < 0))
      return { links: [], refine: false, error: 0 };
    if (!probes.every(Number.isFinite))
      return { links: [], refine: true, error: 0 };
    const sideRoots: Node[][] = [],
      zeros: Link[] = [];
    let rejected = false,
      transition = false;
    for (const { isHorizontal, fixed, coords } of sides) {
      if (coords.length > 2) transition = true;
      const found = new Map<string, Node>();
      for (let i = 1; i < coords.length; i++) {
        const a = coords[i - 1] ?? 0,
          b = coords[i] ?? 0;
        const result = isHorizontal
          ? edge(a, fixed, b, fixed)
          : edge(fixed, a, fixed, b);
        if (result.root) found.set(result.root.id, result.root);
        if (result.zero) zeros.push(result.zero);
        if (result.rejected) rejected = true;
      }
      sideRoots.push([...found.values()]);
    }
    if (transition && horizontal) transitionCells++;
    if (rejected) return { links: [], refine: true, error: 0 };
    const all = new Map(sideRoots.flat().map((n) => [n.id, n]));
    let links: Link[] = [];
    if (zeros.length) {
      // Exact zero edges (e.g. x*y=0) are shared graph edges, never diagonal chords.
      const onZero = (p: Point): boolean =>
        zeros.some(([a, b]) =>
          a.point.x === b.point.x
            ? p.x === a.point.x && p.y >= a.point.y && p.y <= b.point.y
            : p.y === a.point.y && p.x >= a.point.x && p.x <= b.point.x,
        );
      if ([...all.values()].some((n) => !onZero(n.point)))
        return { links: [], refine: true, error: 0 };
      links = zeros;
    } else if (sideRoots.some((side) => side.length > 1))
      return { links: [], refine: true, error: 0 };
    else if (all.size === 2) {
      const [a, b] = [...all.values()];
      if (a && b) links = [[a, b]];
    } else if (all.size >= 3) {
      const decider = asymptoticDecider(corners);
      if (horizontal) saddleCells++;
      let crossing: Point | undefined;
      if (Math.abs(decider.determinant) <= 64 * Number.EPSILON) {
        const a = sideRoots[0]?.[0]?.point,
          b = sideRoots[2]?.[0]?.point,
          c = sideRoots[1]?.[0]?.point,
          d = sideRoots[3]?.[0]?.point;
        if (a && b && c && d) {
          const origin = point(x, y),
            extent = point(x + s, y + s),
            wx = extent.x - origin.x,
            wy = extent.y - origin.y,
            ux = (b.x - a.x) / wx,
            uy = (b.y - a.y) / wy,
            vx = (d.x - c.x) / wx,
            vy = (d.y - c.y) / wy,
            determinant = ux * vy - uy * vx,
            t =
              (((c.x - a.x) / wx) * vy - ((c.y - a.y) / wy) * vx) / determinant;
          const p = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
          if (Number.isFinite(t) && t >= 0 && t <= 1 && evaluate(p) === 0)
            crossing = p;
        }
      }
      if (
        crossing ||
        (decider.determinant === 0 &&
          decider.u >= 0 &&
          decider.u <= 1 &&
          decider.v >= 0 &&
          decider.v <= 1)
      ) {
        const p = crossing ?? point(x + s * decider.u, y + s * decider.v);
        if (evaluate(p) !== 0) return { links: [], refine: true, error: 0 };
        const junction: Node = [...all.values()].find(
          (n) => n.point.x === p.x && n.point.y === p.y,
        ) ?? { id: 's:' + key(x, y) + ':' + s, point: p };
        links = [...all.values()].map((n) => [n, junction] as const);
      } else if (all.size === 4) {
        for (const [i, j] of decider.determinant > 0
          ? [
              [0, 1],
              [2, 3],
            ]
          : [
              [0, 3],
              [1, 2],
            ]) {
          const a = sideRoots[i ?? 0]?.[0],
            b = sideRoots[j ?? 0]?.[0];
          if (a && b) links.push([a, b]);
        }
      } else return { links: [], refine: true, error: 0 };
    } else if (probes.some((v) => v < 0) && probes.some((v) => v > 0))
      return { links: [], refine: true, error: 0 };
    let error = 0;
    for (const [a, b] of links)
      error = Math.max(error, chordError(a.point, b.point, cell));
    return { links, refine: error > tolerance, error };
  }

  function split(cell: Cell): Cell[] | null {
    if (exhausted()) return null;
    // Below this pixel size, unresolved numerical/domain cells become explicit
    // gaps. A pole or NaN boundary must not consume every remaining evaluation.
    if (
      Math.max(
        (pixels.width * cell.size) / width,
        (pixels.height * cell.size) / height,
      ) <= tolerance
    )
      return null;
    if (cell.depth >= maxDepth) {
      limits.add('depth');
      return null;
    }
    if (cells + 4 > maxCells) {
      limits.add('cells');
      return null;
    }
    const half = cell.size / 2,
      p = point(cell.x, cell.y),
      m = point(cell.x + half, cell.y + half),
      q = point(cell.x + cell.size, cell.y + cell.size);
    if (p.x === m.x || m.x === q.x || p.y === m.y || m.y === q.y) {
      limits.add('precision');
      return null;
    }
    cells += 4;
    deepestLevel = Math.max(deepestLevel, cell.depth + 1);
    return [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ].map(([ix = 0, iy = 0]) => ({
      x: cell.x + ix * half,
      y: cell.y + iy * half,
      size: half,
      depth: cell.depth + 1,
    }));
  }
  function visit(cell: Cell): void {
    if (exhausted()) {
      unresolvedCells++;
      leaves.push({ ...cell, blocked: true });
      return;
    }
    const pixelsWide = (pixels.width * cell.size) / width,
      pixelsHigh = (pixels.height * cell.size) / height;
    const needsDiscovery = Math.max(pixelsWide, pixelsHigh) > discovery;
    const result = needsDiscovery ? undefined : patch(cell);
    if (needsDiscovery || result?.refine) {
      const children = split(cell);
      if (children) {
        for (const child of children) visit(child);
        return;
      }
      unresolvedCells++;
      leaves.push({ ...cell, blocked: true });
      return;
    }
    leaves.push(cell);
  }
  cells = nx * ny;
  for (let iy = 0; iy < ny; iy++)
    for (let ix = 0; ix < nx; ix++)
      visit({ x: ix * unit, y: iy * unit, size: unit, depth: 0 });

  // Common atomic edge intervals: a fine neighbor's vertices also split the
  // coarse side. Both cells receive exactly the same cached root object.
  let accepted: Link[] = [];
  for (let pass = 0; pass <= maxDepth; pass++) {
    // Retired edge partitions must not accumulate across reconciliation passes.
    roots.clear();
    const hs = new Map<number, Set<number>>(),
      vs = new Map<number, Set<number>>();
    const add = (
      map: Map<number, Set<number>>,
      fixed: number,
      a: number,
      b: number,
    ): void => {
      let values = map.get(fixed);
      if (!values) {
        values = new Set();
        map.set(fixed, values);
      }
      values.add(a);
      values.add(b);
    };
    for (const c of leaves) {
      add(hs, c.y, c.x, c.x + c.size);
      add(hs, c.y + c.size, c.x, c.x + c.size);
      add(vs, c.x, c.y, c.y + c.size);
      add(vs, c.x + c.size, c.y, c.y + c.size);
    }
    const lines = (map: Map<number, Set<number>>): Lines =>
      new Map(
        [...map].map(([fixed, values]) => [
          fixed,
          [...values].sort((a, b) => a - b),
        ]),
      );
    const horizontal = lines(hs),
      vertical = lines(vs),
      next: Cell[] = [];
    accepted = [];
    let changed = false;
    zeroCells = 0;
    saddleCells = 0;
    transitionCells = 0;
    maxEstimatedErrorPixels = 0;
    for (const cell of leaves) {
      if (cell.blocked) {
        next.push(cell);
        continue;
      }
      if (exhausted()) {
        unresolvedCells++;
        next.push({ ...cell, blocked: true });
        continue;
      }
      const result = patch(cell, horizontal, vertical);
      if (result.refine) {
        const children = split(cell);
        if (children) {
          changed = true;
          const previous = leaves;
          leaves = [];
          for (const child of children) visit(child);
          next.push(...leaves);
          leaves = previous;
        } else {
          unresolvedCells++;
          next.push({ ...cell, blocked: true });
        }
      } else {
        next.push(cell);
        if (accepted.length + result.links.length > maxSegments) {
          limits.add('segments');
          unresolvedCells++;
        } else {
          accepted.push(...result.links);
          maxEstimatedErrorPixels = Math.max(
            maxEstimatedErrorPixels,
            result.error,
          );
        }
      }
    }
    leaves = next;
    if (!changed) break;
  }
  const segments = stitch(accepted);
  return finish(
    segments,
    segments.reduce((n, s) => n + s.length - 1, 0),
    segments.length
      ? 'contours'
      : evaluations === nonFiniteEvaluations
        ? 'undefined'
        : unresolvedCells || zeroCells
          ? 'unresolved'
          : 'empty',
  );
}

/** Stop at junctions; never choose an arbitrary branch through a crossing. */
function stitch(links: readonly Link[]): Point[][] {
  const nodes = new Map<string, Node>(),
    adjacency = new Map<string, number[]>(),
    edges: Link[] = [],
    seen = new Set<string>();
  for (const [a, b] of links) {
    if (a.id === b.id || (a.point.x === b.point.x && a.point.y === b.point.y))
      continue;
    const key = [a.id, b.id].sort().join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    const index = edges.length;
    edges.push([a, b]);
    for (const n of [a, b]) {
      nodes.set(n.id, n);
      const incident = adjacency.get(n.id) ?? [];
      incident.push(index);
      adjacency.set(n.id, incident);
    }
  }
  const used = new Set<number>(),
    segments: Point[][] = [];
  function walk(start: string, first: number): void {
    const p = nodes.get(start);
    if (!p) return;
    const polyline = [p.point];
    let current = start,
      index: number | undefined = first;
    while (index !== undefined && !used.has(index)) {
      used.add(index);
      const link = edges[index];
      if (!link) break;
      const next = link[0].id === current ? link[1] : link[0];
      polyline.push(next.point);
      current = next.id;
      const incident = adjacency.get(current) ?? [];
      index =
        incident.length === 2 ? incident.find((i) => !used.has(i)) : undefined;
    }
    if (polyline.length >= 2) segments.push(polyline);
  }
  for (const [id, incident] of adjacency)
    if (incident.length !== 2)
      for (const index of incident) if (!used.has(index)) walk(id, index);
  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    if (edge && !used.has(i)) walk(edge[0].id, i);
  }
  return segments;
}
