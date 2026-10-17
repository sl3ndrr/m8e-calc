import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  compileImplicitCurve,
  parseCurveInput,
  parseImplicitInput,
  sampleImplicitCurveDetailed,
} from './index.ts';
import { asymptoticDecider } from './implicitMarching.ts';
import type { Bounds, PixelSize, Point } from './types.ts';
import type {
  ImplicitCurve,
  ImplicitLimit,
  ImplicitSampleOptions,
  ImplicitSampleResult,
} from './implicitTypes.ts';

const box: Bounds = { xMin: -3, xMax: 3, yMin: -3, yMax: 3 };
const pixels: PixelSize = { width: 384, height: 384 };
const budgetCases: [ImplicitSampleOptions, ImplicitLimit][] = [
  [{ maxCells: 8 }, 'cells'],
  [{ maxEvaluations: 25 }, 'evaluations'],
  [{ maxSamples: 5 }, 'samples'],
  [{ maxDepth: 0 }, 'depth'],
  [{ maxSegments: 1 }, 'segments'],
];
function curve(source: string): ImplicitCurve {
  const r = parseImplicitInput(source);
  if (!r.ok) throw new Error(JSON.stringify(r.error));
  return r.value;
}
function sample(
  source: string,
  bounds = box,
  size = pixels,
  options: ImplicitSampleOptions = {},
): ImplicitSampleResult {
  return sampleImplicitCurveDetailed(curve(source), bounds, size, options);
}
function finite(r: ImplicitSampleResult, bounds = box): void {
  expect(JSON.parse(JSON.stringify(r))).toEqual(r);
  for (const line of r.segments) {
    expect(line.length).toBeGreaterThanOrEqual(2);
    for (const p of line) {
      expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
      expect(p.x).toBeGreaterThanOrEqual(bounds.xMin);
      expect(p.x).toBeLessThanOrEqual(bounds.xMax);
      expect(p.y).toBeGreaterThanOrEqual(bounds.yMin);
      expect(p.y).toBeLessThanOrEqual(bounds.yMax);
    }
  }
}
function closed(r: ImplicitSampleResult, count: number): void {
  expect(r.truncated).toBe(false);
  expect(r.diagnostics.unresolvedCells).toBe(0);
  expect(r.segments).toHaveLength(count);
  for (const line of r.segments) expect(line[0]).toEqual(line[line.length - 1]);
}
function distance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    t = Math.max(
      0,
      Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)),
    );
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}
function oracle(
  r: ImplicitSampleResult,
  reference: (t: number) => Point,
  scale: number,
  tolerance = 0.3,
): void {
  // Independent analytic points -> polyline, not the sampler's own residual.
  for (let i = 0; i < 720; i++) {
    const p = reference((i * 2 * Math.PI) / 720);
    let nearest = Infinity;
    for (const line of r.segments)
      for (let j = 1; j < line.length; j++) {
        const a = line[j - 1],
          b = line[j];
        if (a && b) nearest = Math.min(nearest, distance(p, a, b) * scale);
      }
    expect(nearest).toBeLessThanOrEqual(tolerance);
  }
}

describe('AP26 normalization and Float64 compilation', () => {
  it('normalizes both scalar sides, preserves options and compiles two variables', () => {
    const parsed = parseImplicitInput('x² + y² = a^2', {
      params: { a: 2 },
      angleMode: 'deg',
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const f = compileImplicitCurve(parsed.value);
    expect(f(0, 2)).toBe(0);
    expect(f(1, 1)).toBe(-2);
    expect(f.parameterNames).toEqual(['a']);
    expect(f.setParam('a', 3)).toBe(true);
    expect(f(0, 3)).toBe(0);
    expect(parsed.value.params).toEqual({ a: 2 });
    expect(compileImplicitCurve(curve('sqrt(-1)+0*x'))(1, 2)).toBeNaN();
  });
  it('leaves existing equation/parameter semantics and public UI parsing intact', () => {
    for (const source of [
      'y=x^2',
      'x=3',
      'f(x)=sin(x)',
      'r=1+cos(theta)',
      'a=2',
      'x=y',
      '(cos(t),sin(t))',
      'x^2=1=2',
      'sin(x):=x',
      'x+t',
      'sum(x,1,2,x)',
    ])
      expect(parseImplicitInput(source).ok, source).toBe(false);
    const implicit = parseCurveInput('x^2+y^2=4');
    expect(implicit).toMatchObject({
      ok: false,
      error: { code: 'E_UNSUPPORTED_CURVE', detectedKind: 'implicit' },
    });
    for (const source of [
      'y=x^2',
      'x=3',
      'f(x)=sin(x)',
      '(cos(t),sin(t))',
      'r=1+cos(theta)',
    ])
      expect(parseCurveInput(source).ok).toBe(true);
    expect(parseImplicitInput('x'.repeat(10001))).toMatchObject({
      ok: false,
      error: { code: 'E_RESOURCE_LIMIT' },
    });
  });
});

describe('AP26 analytic geometry and conforming adaptive boundaries', () => {
  it('recovers circle and ellipse with independent screen-distance probes', () => {
    const circle = sample('x^2+y^2=4');
    closed(circle, 1);
    finite(circle);
    oracle(circle, (t) => ({ x: 2 * Math.cos(t), y: 2 * Math.sin(t) }), 64);
    const ellipse = sample('x^2/4+y^2=1');
    closed(ellipse, 1);
    oracle(ellipse, (t) => ({ x: 2 * Math.cos(t), y: Math.sin(t) }), 64);
    for (const line of circle.segments)
      for (let i = 1; i < line.length; i++) {
        const a = line[i - 1],
          b = line[i];
        if (a && b)
          expect(
            Math.abs(Math.hypot((a.x + b.x) / 2, (a.y + b.y) / 2) - 2) * 64,
          ).toBeLessThan(0.3);
      }
  });
  it('keeps both hyperbola branches separate and bounds geometric residuals', () => {
    const r = sample('x*y=1');
    expect(r.segments).toHaveLength(2);
    finite(r);
    for (const line of r.segments) {
      const sign = Math.sign(line[0]?.x ?? 0);
      for (const p of line) {
        expect(Math.sign(p.x)).toBe(sign);
        expect(Math.abs(p.x * p.y - 1)).toBeLessThan(1e-8);
      }
      for (let i = 1; i < line.length; i++) {
        const a = line[i - 1],
          b = line[i];
        if (!a || !b) continue;
        const x = (a.x + b.x) / 2,
          y = (a.y + b.y) / 2;
        expect((Math.abs(x * y - 1) / Math.hypot(x, y)) * 64).toBeLessThan(0.3);
      }
    }
  });
  it('handles exact grid-edge and displaced four-arm crossings without diagonal shortcuts', () => {
    for (const [source, x, y] of [
      ['x*y=0', 0, 0],
      ['x^2-y^2=0', 0, 0],
      ['(x-.123)*(y-.234)=0', 0.123, 0.234],
    ] as const) {
      const r = sample(source);
      expect(r.segments, source).toHaveLength(4);
      expect(r.diagnostics.unresolvedCells).toBe(0);
      let junctions = 0;
      for (const line of r.segments) {
        for (const p of [line[0], line[line.length - 1]])
          if (p && Math.hypot(p.x - x, p.y - y) < 1e-8) junctions++;
        for (const p of line)
          expect(
            Math.abs(compileImplicitCurve(curve(source))(p.x, p.y)),
          ).toBeLessThan(1e-8);
      }
      expect(junctions).toBe(4);
    }
  });
  it('uses the asymptotic determinant rather than the centre-sign heuristic', () => {
    // Bilinear centre is positive (mean 2.25) but Q=-91 chooses the other pairing.
    expect(asymptoticDecider([10, -4, 1, -4]).determinant).toBeLessThan(0);
    expect(asymptoticDecider([2, -1, 2, -1]).determinant).toBeGreaterThan(0);
    expect(
      asymptoticDecider([1e300, -2e300, 1e300, -2e300]).determinant,
    ).toBeLessThan(0);
    for (const k of [-0.02, 0.02]) {
      const r = sample(`(x-.123)*(y-.234)=${k}`);
      expect(r.segments).toHaveLength(2);
      expect(r.diagnostics.unresolvedCells).toBe(0);
      for (const line of r.segments) {
        const sign = Math.sign((line[0]?.x ?? 0) - 0.123);
        for (const p of line) expect(Math.sign(p.x - 0.123)).toBe(sign);
      }
    }
  });
  it('closes separate components across different refinement levels', () => {
    const r = sample('(x^2+y^2-1)*((x-1.7)^2+y^2-.16)=0');
    closed(r, 2);
    expect(r.diagnostics.transitionCells).toBeGreaterThan(0);
    oracle(r, (t) => ({ x: Math.cos(t), y: Math.sin(t) }), 64);
    oracle(
      r,
      (t) => ({ x: 1.7 + 0.4 * Math.cos(t), y: 0.4 * Math.sin(t) }),
      64,
    );
    // A false connection between the two circles would violate this separation.
    for (const line of r.segments)
      expect(
        line.every((p) => p.x < 1.15) || line.every((p) => p.x > 1.15),
      ).toBe(true);
  });
  it('finds nearby five-pixel loops at several discovery-grid phases', () => {
    const bounds = { xMin: 0, xMax: 1, yMin: 0, yMax: 1 },
      size = { width: 256, height: 256 },
      radius = 5 / 256;
    for (const shift of [0, 0.7, 1.9, 3.1]) {
      const a = (101.3 + shift) / 256,
        b = a + 12 / 256,
        y = 117.1 / 256;
      const r = sample(
        `((x-${a})^2+(y-${y})^2-${radius ** 2})*((x-${b})^2+(y-${y})^2-${radius ** 2})=0`,
        bounds,
        size,
      );
      closed(r, 2);
      finite(r, bounds);
      expect(r.diagnostics.transitionCells).toBeGreaterThan(0);
      oracle(
        r,
        (t) => ({ x: a + radius * Math.cos(t), y: y + radius * Math.sin(t) }),
        256,
        0.35,
      );
      oracle(
        r,
        (t) => ({ x: b + radius * Math.cos(t), y: y + radius * Math.sin(t) }),
        256,
        0.35,
      );
    }
  });
});

describe('AP26 domains, degeneracy and deterministic limits', () => {
  it('rejects pole sign changes and keeps legitimate contours out of undefined bands', () => {
    const pole = sample('1/(x-.123)=0');
    expect(pole.segments).toEqual([]);
    expect(pole.diagnostics.rejectedEdges).toBeGreaterThan(0);
    const r = sample('(x^2+y^2-1)/(x-.123)=0');
    finite(r);
    expect(r.diagnostics.unresolvedCells).toBeGreaterThan(0);
    for (const line of r.segments)
      expect(
        line.every((p) => p.x < 0.123) || line.every((p) => p.x > 0.123),
      ).toBe(true);
    const sqrt = sample('sqrt(x)+y=0');
    finite(sqrt);
    expect(sqrt.diagnostics.nonFiniteEvaluations).toBeGreaterThan(0);
    expect(sqrt.segments.flat().every((p) => p.x >= 0 && p.y <= 1e-10)).toBe(
      true,
    );
  });
  it('distinguishes constant zero, empty, undefined, flat regions and point degeneracies', () => {
    expect(sample('0').diagnostics.status).toBe('constant-zero');
    expect(sample('1').diagnostics.status).toBe('empty');
    expect(sample('sqrt(-1)').diagnostics.status).toBe('undefined');
    expect(sample('x^2+y^2+1').segments).toEqual([]);
    expect(sample('x^2+y^2=0').segments).toEqual([]);
    const flat = sample('x-x');
    expect(flat.segments).toEqual([]);
    expect(flat.diagnostics.zeroCells).toBeGreaterThan(0);
    const tangent = sample('x^2=0');
    expect(tangent.segments).toHaveLength(1);
    expect(tangent.segments.flat().every((p) => p.x === 0)).toBe(true);
  });
  it.each(budgetCases)(
    'honors %j and reports the exhausted budget',
    (options, limit) => {
      const r = sample('x^2+y^2=4', box, pixels, options);
      finite(r);
      expect(r.truncated).toBe(true);
      expect(r.diagnostics.limits).toContain(limit);
      expect(r.evaluations).toBeLessThanOrEqual(
        options.maxEvaluations ?? 1000000,
      );
      expect(r.diagnostics.cells).toBeLessThanOrEqual(
        options.maxCells ?? 200000,
      );
      expect(r.diagnostics.cachedSamples).toBeLessThanOrEqual(
        options.maxSamples ?? 400000,
      );
      expect(r.diagnostics.outputEdges).toBeLessThanOrEqual(
        options.maxSegments ?? 50000,
      );
    },
  );
  it('rejects invalid budgets, pixel sizes and nonrepresentable viewports', () => {
    for (const options of [
      { maxDepth: 17 },
      { maxCells: NaN },
      { maxEvaluations: 0 },
      { maxSamples: 1.5 },
      { tolerancePixels: Infinity },
      { discoveryPixels: 0 },
    ])
      expect(() => sample('x*y', box, pixels, options)).toThrow(RangeError);
    expect(() => sample('x*y', box, { width: 0, height: 1 })).toThrow(
      RangeError,
    );
    expect(() =>
      sample('x*y', { ...box, xMin: 1e20, xMax: 1e20 + 16384 }),
    ).toThrow(RangeError);
  });
  it('has deterministic, finite, bounded outputs under seeded expression fuzzing', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 8 }),
        fc.integer({ min: -9, max: 9 }),
        fc.integer({ min: 1, max: 9 }),
        (kind, a, b) => {
          const source =
            [
              `x^2+y^2-${b}`,
              `(x-${a / 10})*(y+.123)`,
              `1/(x-${a / 10})+y`,
              `sqrt(x-${a / 10})-y`,
              `sin(${b}*x)+cos(${b}*y)`,
              `x^3-${b}*x+y^2`,
              `abs(x)-abs(y)`,
              `ln(x^2+y^2)-${a}`,
              `(${a}*x+y)^2`,
            ][kind] ?? 'x*y';
          const size = { width: 96, height: 80 },
            opts = {
              maxCells: 4000,
              maxEvaluations: 20000,
              maxSamples: 10000,
              maxSegments: 2000,
              maxDepth: 6,
            };
          const r = sample(source, box, size, opts);
          finite(r);
          expect(sample(source, box, size, opts)).toEqual(r);
          expect(r.evaluations).toBeLessThanOrEqual(opts.maxEvaluations);
          expect(r.diagnostics.cells).toBeLessThanOrEqual(opts.maxCells);
          expect(r.diagnostics.cachedSamples).toBeLessThanOrEqual(
            opts.maxSamples,
          );
          expect(r.diagnostics.outputEdges).toBeLessThanOrEqual(
            opts.maxSegments,
          );
        },
      ),
      { seed: 260017, numRuns: 50 },
    );
  });
  it('matches independent shifted-circle references under seeded fuzzing', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -10, max: 10 }),
        fc.integer({ min: -10, max: 10 }),
        fc.integer({ min: 4, max: 12 }),
        (ix, iy, ir) => {
          const a = ix / 10,
            b = iy / 10,
            radius = ir / 10,
            size = { width: 192, height: 192 };
          const r = sample(
            `(x-(${a}))^2+(y-(${b}))^2=${radius ** 2}`,
            box,
            size,
          );
          closed(r, 1);
          oracle(
            r,
            (t) => ({
              x: a + radius * Math.cos(t),
              y: b + radius * Math.sin(t),
            }),
            32,
            0.35,
          );
        },
      ),
      { seed: 170026, numRuns: 25 },
    );
  });
});
