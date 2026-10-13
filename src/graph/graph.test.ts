import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { performance as clock } from 'node:perf_hooks';
import { parse, functionRegistry, evaluateString } from '../engine/index.ts';
import type { Ast, FunctionRegistry } from '../engine/index.ts';
import {
  compile,
  detectParams,
  parseCurveInput,
  sampleCurve,
  sampleCurveDetailed,
  Viewport,
  findRoots,
  findExtrema,
  findInflections,
  findIntersections,
  yIntercept,
  slopeAt,
  tangentAt,
  definiteIntegral,
  areaBetween,
} from './index.ts';
import type { Curve, Bounds, Point } from './index.ts';

const bounds: Bounds = { xMin: -5, xMax: 5, yMin: -5, yMax: 5 };
const pixels = { width: 2560, height: 1440 };
function ast(source: string): Ast {
  const r = parse(source);
  if (!r.ok) throw new Error(JSON.stringify(r.error));
  return r.value;
}
function curve(source: string, options = {}): Curve {
  const r = parseCurveInput(source, options);
  if (!r.ok) throw new Error(JSON.stringify(r.error));
  return r.value;
}
function close(actual: number, expected: number, tolerance = 1e-7): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}
function noBridge(source: string, poles: number[]): void {
  const segments = sampleCurve(curve(source), bounds, pixels);
  expect(segments.length).toBeGreaterThanOrEqual(poles.length + 1);
  for (const segment of segments)
    for (let i = 1; i < segment.length; i++) {
      const a = segment[i - 1],
        b = segment[i];
      if (!a || !b) continue;
      for (const pole of poles) expect(a.x < pole && b.x > pole).toBe(false);
    }
}

describe('Float64 compiler', () => {
  it.each([
    ['x^2+2*x+1', 3, 16],
    ['-x^2', 2, -4],
    ['2^3^2', 0, 512],
    ['2^-3', 0, 0.125],
    ['2(x+1)', 3, 8],
    ['50%%', 0, 0.005],
    ['abs(x)', -3, 3],
    ['root(3,x)', -8, -2],
    ['x!', 5, 120],
    ['round(x)', -1.5, -2],
    ['mod(x,3)', -4, 2],
    ['sin(pi/2)', 0, 1],
    ['ln(exp(x))', 2, 2],
  ])('%s', (source, x, expected) =>
    close(compile(ast(source), { variables: ['x'] })(x), expected),
  );
  it.each([
    'sqrt(-1)^2',
    '0*sqrt(-1)',
    '0*(1/0)',
    '1/0',
    'ln(0)',
    '0^0',
    '(-2)^0.5',
    'x!',
    'i*i',
    'factor(4)',
    'sum(x,k,1,4)',
    'unknown(x)',
    'a=2',
    '1e400*0',
    'exp(1000)*0',
  ])('NaN for %s', (source) => {
    expect(compile(ast(source), { variables: ['x'] })(-1)).toBeNaN();
  });
  it('detects parameters including c and updates slots without recompilation', () => {
    const expression = ast('a*x^2+b*x+c+pi');
    expect(detectParams(expression, ['x'])).toEqual(['a', 'b', 'c']);
    const f = compile(expression, {
      variables: ['x'],
      params: { a: 2, b: 3, c: 4 },
    });
    close(f(2), 18 + Math.PI);
    expect(f.setParam('a', 5)).toBe(true);
    close(f(2), 30 + Math.PI);
    expect(f.getParams()).toEqual({ a: 5, b: 3, c: 4 });
    expect(f.setParam('x', 4)).toBe(false);
    expect(f.setParam('pi', 4)).toBe(false);
    expect(f.setParam('a', Infinity)).toBe(false);
    expect(detectParams(ast('sin(x)+e+i+ans'), ['x'])).toEqual([]);
  });
  it.each(['rad', 'deg', 'grad'] as const)(
    'uses registry floats and %s angles',
    (angleMode) => {
      const angle =
        angleMode === 'rad' ? Math.PI / 6 : angleMode === 'deg' ? 30 : 100 / 3;
      close(
        compile(ast('sin(x)'), { variables: ['x'], angleMode })(angle),
        0.5,
      );
      close(
        compile(ast('asin(x)'), { variables: ['x'], angleMode })(0.5),
        angle,
      );
    },
  );
  it('supports custom registry floats and catches faults', () => {
    const base = functionRegistry.sin;
    if (!base) throw new Error('missing sin');
    const functions: FunctionRegistry = {
      custom: {
        ...base,
        name: 'custom',
        floatImpl: (args) => (args[0] ?? 0) * 7,
      },
    };
    close(compile(ast('custom(x)'), { variables: ['x'], functions })(3), 21);
    const broken = {
      custom: {
        ...base,
        name: 'custom',
        floatImpl: () => {
          throw new Error('fault');
        },
      },
    };
    expect(
      compile(ast('custom(x)'), { variables: ['x'], functions: broken })(3),
    ).toBeNaN();
    expect(compile(ast('sin(x,2)'), { variables: ['x'] })(3)).toBeNaN();
  });
  it('agrees with Decimal for native real functions', () => {
    for (const source of [
      'sinh(.3)',
      'acosh(2)',
      'sec(.3)',
      'frac(-2.3)',
      'round(-2.345,2)',
      'nCr(8,3)',
      'gamma(.5)',
      'mean(1,2,3)',
      'variance(1,2,3)',
    ]) {
      const reference = evaluateString(source);
      if (!reference.ok || reference.value.kind !== 'number')
        throw new Error(source);
      close(
        compile(ast(source), { variables: [] })(),
        reference.value.value.toNumber(),
        1e-10,
      );
    }
  });
  it('bounds foreign cyclic ASTs', () => {
    const cyclic: {
      kind: 'group';
      range: { start: number; end: number };
      expression: Ast;
    } = { kind: 'group', range: { start: 0, end: 0 }, expression: ast('x') };
    cyclic.expression = cyclic;
    expect(compile(cyclic, { variables: ['x'] })(0)).toBeNaN();
    expect(detectParams(cyclic, ['x'])).toEqual([]);
  });
});

describe('curve input', () => {
  it.each([
    ['y=x^2', 'explicit'],
    ['f(x)=sin(x)', 'explicit'],
    ['x=3', 'vertical'],
    ['(cos(t),sin(t))', 'parametric'],
    ['(min(t,1),max(t,0))', 'parametric'],
    ['r=1+cos(theta)', 'polar'],
    ['r=1+cos(θ)', 'polar'],
    ['sin(x)', 'explicit'],
  ])('%s → %s', (source, kind) => expect(curve(source).kind).toBe(kind));
  it.each([
    '',
    'y=',
    '(cos(t),)',
    'y==x',
    'f(t)=t',
    'x=y',
    'y=t',
    'r=x',
    '(x,t)',
    'y=unknown(x)',
  ])('rejects %s', (source) => expect(parseCurveInput(source).ok).toBe(false));
  it('recognizes implicit equations with an explicit follow-up error', () => {
    const r = parseCurveInput('x^2+y^2=4');
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(r.error).toMatchObject({
        code: 'E_UNSUPPORTED_CURVE',
        detectedKind: 'implicit',
      });
  });
  it('preserves a custom t range and JSON round trip', () => {
    const c = curve('(t,t^2)', { range: [-2, 3], params: { a: 2 } });
    expect(c).toMatchObject({ range: [-2, 3] });
    expect(
      sampleCurve(JSON.parse(JSON.stringify(c)) as Curve, bounds, pixels),
    ).toEqual(sampleCurve(c, bounds, pixels));
  });
});

describe('adaptive world-space sampling', () => {
  it.each(['sin(x)', 'abs(x)', 'x^x', 'sqrt(x)', 'ln(x)'])(
    'samples %s deterministically and finitely',
    (source) => {
      const c = curve(source),
        segments = sampleCurve(c, bounds, pixels);
      expect(segments.length).toBeGreaterThan(0);
      expect(sampleCurve(c, bounds, pixels)).toEqual(segments);
      for (const p of segments.flat()) {
        expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
        expect(p.x).toBeGreaterThanOrEqual(bounds.xMin - 1e-12);
        expect(p.x).toBeLessThanOrEqual(bounds.xMax + 1e-12);
        expect(p.y).toBeGreaterThanOrEqual(bounds.yMin - 1e-12);
        expect(p.y).toBeLessThanOrEqual(bounds.yMax + 1e-12);
        if (source === 'sqrt(x)' || source === 'ln(x)')
          expect(p.x).toBeGreaterThanOrEqual(0);
      }
    },
  );
  it.each([
    ['1/x', [0]],
    ['1/(x-.013)', [0.013]],
    ['1/(x^2-1)', [-1, 1]],
    [
      'tan(x)',
      [(-3 * Math.PI) / 2, -Math.PI / 2, Math.PI / 2, (3 * Math.PI) / 2],
    ],
  ])('splits %s poles', (source, poles) => noBridge(source, poles));
  it('meets 0.25 px at independent probes of smooth visible chords', () => {
    const box = { xMin: -2, xMax: 2, yMin: -1, yMax: 5 };
    const f = (x: number) => x * x;
    for (const segment of sampleCurve(curve('x^2'), box, pixels))
      for (let i = 1; i < segment.length; i++) {
        const a = segment[i - 1],
          b = segment[i];
        if (!a || !b) continue;
        for (const q of [0.17, 0.43, 0.79]) {
          const x = a.x + (b.x - a.x) * q,
            y = a.y + (b.y - a.y) * q;
          expect(
            (Math.abs(f(x) - y) * pixels.height) / (box.yMax - box.yMin),
          ).toBeLessThanOrEqual(0.250001);
        }
      }
  });
  it.each([
    ['(cos(t),sin(t))', 1],
    ['r=1+cos(theta)', 2],
    ['(sin(3*t),sin(2*t))', 1],
  ])('closed curve %s', (source, radius) => {
    const segments = sampleCurve(curve(source), bounds, pixels),
      points = segments.flat();
    expect(points.length).toBeGreaterThan(100);
    const first = points[0],
      last = points[points.length - 1];
    if (!first || !last) throw new Error('no points');
    close(first.x, last.x);
    close(first.y, last.y);
    expect(Math.max(...points.map((p) => Math.abs(p.x)))).toBeLessThanOrEqual(
      radius + 1e-10,
    );
    if (source.startsWith('(cos'))
      for (const p of points) close(p.x * p.x + p.y * p.y, 1);
  });
  it('polar geometry respects degree mode', () => {
    const points = sampleCurve(
      curve('r=1', { angleMode: 'deg', range: [0, 360] }),
      bounds,
      pixels,
    ).flat();
    expect(
      points.some((p) => Math.abs(p.x) < 1e-10 && Math.abs(p.y - 1) < 1e-10),
    ).toBe(true);
  });
  it('clips a steep continuous line and a vertical line', () => {
    for (const source of ['1e6*x', 'x=3']) {
      const points = sampleCurve(curve(source), bounds, pixels).flat();
      expect(points.length).toBeGreaterThanOrEqual(2);
      close(Math.min(...points.map((p) => p.y)), -5);
      close(Math.max(...points.map((p) => p.y)), 5);
    }
  });
  it('handles NaN/Infinity and enforces bounded work', () => {
    expect(sampleCurve(curve('0*sqrt(-1)'), bounds, pixels)).toEqual([]);
    const r = sampleCurveDetailed(curve('sin(1234567*x)'), bounds, pixels);
    expect(r.evaluations).toBeLessThanOrEqual(100000);
    expect(r.truncated).toBe(true);
    expect(() =>
      sampleCurve(curve('x'), bounds, { width: Infinity, height: 1 }),
    ).toThrow(RangeError);
  });
});

describe('visible numerical analysis', () => {
  it('analyses parametric and polar coordinates in world space', () => {
    for (const circle of [curve('(cos(t),sin(t))'), curve('r=1')]) {
      const roots = findRoots(circle, bounds);
      expect(roots).toHaveLength(2);
      expect(roots.every((p) => Math.abs(p.y) < 1e-7 && p.confidence)).toBe(
        true,
      );
      const extrema = findExtrema(circle, bounds);
      expect(extrema).toHaveLength(2);
      expect(
        extrema.some((p) => Math.abs(p.y - 1) < 1e-7 && p.kind === 'maximum'),
      ).toBe(true);
      expect(findInflections(circle, bounds)).toEqual([]);
      const slope = slopeAt(circle, Math.PI / 2, bounds);
      close(slope.value, 0);
      expect(slope.confidence).toBe(true);
      expect(slopeAt(circle, 0, bounds).confidence).toBe(false);
    }
    const cubic = curve('(t,t^3)', { range: [-1, 1] });
    expect(findInflections(cubic, bounds)).toHaveLength(1);
    const intercept = yIntercept(curve('x=0'), bounds);
    expect(intercept).toBeNull();
  });
  it('refines intersections involving vertical, parametric and polar curves', () => {
    const circles = [curve('(cos(t),sin(t))'), curve('r=1')];
    for (const circle of circles) {
      const hits = findIntersections(circle, curve('x=.5'), bounds);
      expect(hits).toHaveLength(2);
      for (const p of hits) {
        close(p.x, 0.5);
        close(Math.abs(p.y), Math.sqrt(0.75));
        expect(p.confidence).toBe(true);
      }
      expect(findIntersections(circle, curve('1/x'), bounds)).toEqual([]);
    }
    const hits = findIntersections(curve('x=1'), curve('x^2'), bounds);
    expect(hits).toHaveLength(1);
    close(hits[0]?.y ?? NaN, 1);
  });
  const box = { xMin: -Math.PI, xMax: Math.PI, yMin: -10, yMax: 10 };
  it('roots of sine and residual validation at poles', () => {
    const roots = findRoots(curve('sin(x)'), box);
    expect(roots).toHaveLength(3);
    roots.forEach((p, i) => {
      close(p.x, (i - 1) * Math.PI);
      expect(p.confidence).toBe(true);
    });
    expect(findRoots(curve('1/x'), bounds)).toEqual([]);
    expect(findRoots(curve('1/(x-.013)'), bounds)).toEqual([]);
    expect(findRoots(curve('0'), bounds)).toEqual([]);
    expect(findRoots(curve('x'), { ...bounds, yMin: 2 })).toEqual([]);
  });
  it('sine extrema and cubic inflection match analytic values', () => {
    const extrema = findExtrema(curve('sin(x)'), box);
    expect(extrema).toHaveLength(2);
    close(extrema[0]?.x ?? NaN, -Math.PI / 2);
    close(extrema[1]?.x ?? NaN, Math.PI / 2);
    expect(extrema.map((p) => p.kind)).toEqual(['minimum', 'maximum']);
    expect(extrema.every((p) => p.confidence)).toBe(true);
    expect(findExtrema(curve('x^3'), bounds)).toEqual([]);
    const points = findInflections(curve('x^3'), bounds);
    expect(points).toHaveLength(1);
    close(points[0]?.x ?? NaN, 0, 1e-5);
    expect(findInflections(curve('x^2'), bounds)).toEqual([]);
  });
  it('intersections, intercept, slope and tangent', () => {
    const hits = findIntersections(curve('x^2'), curve('2'), bounds);
    expect(hits).toHaveLength(2);
    close(hits[0]?.x ?? NaN, -Math.SQRT2);
    close(hits[1]?.x ?? NaN, Math.SQRT2);
    expect(findIntersections(curve('x'), curve('x'), bounds)).toEqual([]);
    close(yIntercept(curve('x^2+3'), bounds)?.y ?? NaN, 3);
    expect(yIntercept(curve('1/x'), bounds)).toBeNull();
    const slope = slopeAt(curve('sin(x)'), 0, bounds);
    close(slope.value, 1);
    expect(slope.confidence).toBe(true);
    const tangent = tangentAt(curve('x^2'), 2, bounds);
    close(tangent.slope, 4);
    close(tangent.intercept, -4);
    expect(slopeAt(curve('abs(x)'), 0, bounds).confidence).toBe(false);
    expect(slopeAt(curve('sqrt(x)'), 0, bounds).confidence).toBe(false);
  });
  it.each([
    ['x^2', 0, 1, 1 / 3],
    ['sin(x)', 0, Math.PI, 2],
    ['exp(x)', 0, 1, Math.E - 1],
    ['x^2', 1, 0, -1 / 3],
    ['abs(x)', -1, 1, 1],
  ])('GK integral %s', (source, a, b, value) => {
    const result = definiteIntegral(curve(source), a, b, bounds);
    close(result.value, value, 1e-8);
    expect(result.confidence).toBe(true);
    expect(result.errorEstimate).toBeGreaterThanOrEqual(0);
  });
  it('rejects singular integration, out-of-view bounds and reports exhaustion', () => {
    expect(definiteIntegral(curve('1/x'), -1, 1, bounds).confidence).toBe(
      false,
    );
    expect(
      definiteIntegral(curve('1/(x-.013)'), -1, 1, bounds).confidence,
    ).toBe(false);
    expect(definiteIntegral(curve('sqrt(x)'), -1, 1, bounds).confidence).toBe(
      false,
    );
    expect(definiteIntegral(curve('x'), -6, 1, bounds).confidence).toBe(false);
    expect(
      definiteIntegral(curve('sin(100*x)'), 0, 1, bounds, {
        maxEvaluations: 15,
      }).confidence,
    ).toBe(false);
    const area = areaBetween(curve('x'), curve('x^2'), -1, 1, bounds);
    close(area.value, 1, 1e-8);
    expect(area.confidence).toBe(true);
    expect(
      areaBetween(curve('x'), curve('0'), 1, -1, bounds).value,
    ).toBeCloseTo(1, 8);
  });
});

describe('viewport and ticks', () => {
  it('inverts transforms and preserves the zoom anchor', () => {
    const v = new Viewport(bounds, pixels),
      p = { x: 123, y: 456 };
    const world = v.screenToWorld(p),
      back = v.worldToScreen(world);
    close(back.x, p.x);
    close(back.y, p.y);
    const zoom = v.zoom(3, p).worldToScreen(world);
    close(zoom.x, p.x);
    close(zoom.y, p.y);
    const pan = v.pan(20, -30).worldToScreen(world);
    close(pan.x, p.x + 20);
    close(pan.y, p.y - 30);
    expect(v.toJSON()).toMatchObject({ bounds, pixelSize: pixels });
  });
  it('locks aspect across resize and formats 1-2-5 / pi ticks', () => {
    const v = new Viewport(bounds, pixels, { lockAspect: true }).resize({
      width: 800,
      height: 600,
    });
    close(
      (v.bounds.xMax - v.bounds.xMin) / 800,
      (v.bounds.yMax - v.bounds.yMin) / 600,
    );
    const ordinary = v.ticks('x');
    expect(ordinary.length).toBeGreaterThan(2);
    for (const t of ordinary) expect(t.label).not.toBe('-0');
    const angular = new Viewport(
      { xMin: -Math.PI, xMax: Math.PI, yMin: -1, yMax: 1 },
      { width: 800, height: 600 },
    ).ticks('x', { pi: true });
    expect(angular.map((t) => t.label)).toContain('π');
    expect(angular.map((t) => t.label)).toContain('−π');
    expect(angular.map((t) => t.label)).toContain('π/2');
  });
  it('fits curves robustly and validates bounds', () => {
    const v = new Viewport(bounds, pixels).fitToCurves([
      curve('sin(x)'),
      curve('1/x'),
    ]);
    expect(v.bounds.yMax).toBeLessThan(20);
    expect(v.bounds.yMin).toBeGreaterThan(-20);
    expect(() => new Viewport({ ...bounds, xMax: -5 }, pixels)).toThrow(
      RangeError,
    );
    expect(() => new Viewport(bounds, pixels).zoom(0, { x: 0, y: 0 })).toThrow(
      RangeError,
    );
  });
});

describe('termination, fuzzing and performance', () => {
  it('seeded arbitrary inputs never crash parsing', () =>
    fc.assert(
      fc.property(fc.string({ maxLength: 300 }), (source) => {
        const result = parseCurveInput(source);
        expect(typeof result.ok).toBe('boolean');
      }),
      { seed: 12012, numRuns: 250 },
    ));
  it('seeded sampling and viewport properties', () =>
    fc.assert(
      fc.property(
        fc.integer({ min: -20, max: 20 }),
        fc.integer({ min: -20, max: 20 }),
        fc.integer({ min: 100, max: 1000 }),
        (a, b, width) => {
          const c = curve('a*sin(b*x)', { params: { a, b } }),
            size = { width, height: 500 };
          const output = sampleCurveDetailed(c, bounds, size);
          expect(output.evaluations).toBeLessThanOrEqual(100000);
          for (const p of output.segments.flat())
            expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
          const p: Point = { x: a / 4, y: b / 4 },
            v = new Viewport(bounds, size),
            round = v.screenToWorld(v.worldToScreen(p));
          close(round.x, p.x);
          close(round.y, p.y);
        },
      ),
      { seed: 12013, numRuns: 80 },
    ));
  it('2560px regression budget after warm-up', () => {
    const curves = [
      'sin(x)',
      '1/x',
      'tan(x)',
      'abs(x)',
      'x^x',
      'sqrt(x)',
      'ln(x)',
      '(cos(t),sin(t))',
      'r=1+cos(theta)',
      '(sin(3*t),sin(2*t))',
    ].map((source) => curve(source));
    for (let i = 0; i < 20; i++)
      for (const c of curves) sampleCurve(c, bounds, pixels);
    for (const c of curves) {
      const start = clock.now();
      for (let i = 0; i < 40; i++) sampleCurve(c, bounds, pixels);
      expect((clock.now() - start) / 40).toBeLessThan(25);
    }
  }, 15000);
});
