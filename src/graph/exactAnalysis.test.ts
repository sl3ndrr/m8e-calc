import { describe, expect, it } from 'vitest';
import {
  analyzeExact,
  exactToNumber,
  parseCurveInput,
  type ExactAnalysisKind,
} from './index.ts';
import { exact, rational } from './exactNumbers.ts';
import type { Bounds } from './types.ts';

const view = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
const q = (n: bigint, d = 1n) => exact(rational(n, d));

function curve(source: string, params?: Record<string, number>) {
  const parsed = parseCurveInput(source, { params });
  if (!parsed.ok) throw new Error(`Invalid test expression: ${source}`);
  return parsed.value;
}

function hits(
  source: string,
  kind: ExactAnalysisKind = 'roots',
  bounds: Bounds = view,
) {
  const result = analyzeExact(curve(source), kind, bounds);
  expect(result.status).toBe('hits');
  if (result.status !== 'hits') throw new Error('Expected hits');
  return result.hits;
}

describe('exact graph analysis', () => {
  it('solves rational equations from the original literals and current parameters', () => {
    expect(hits('3*x-1')[0]?.x).toEqual(q(1n, 3n));
    expect(hits('(9007199254740993-9007199254740992)*x-1e-1')[0]?.x).toEqual(
      q(1n, 10n),
    );
    expect(hits('x/2 - 25%')[0]?.x).toEqual(q(1n, 2n));
    const result = analyzeExact(curve('a*x-1', { a: 0.3 }), 'roots', view);
    expect(result).toMatchObject({
      status: 'hits',
      hits: [{ x: q(10n, 3n), y: q(0n) }],
    });
  });

  it('simplifies radicals and keeps distinct hits sorted without Float64 tolerances', () => {
    const radicals = [
      exact(rational(0n), rational(-1n), 2n),
      exact(rational(0n), rational(1n), 2n),
    ];
    const roots = hits('x^2-2');
    expect(roots.map(({ x }) => x)).toEqual(radicals);
    expect(roots[0]?.steps).toContainEqual({
      kind: 'square',
      right: rational(2n),
    });
    expect(roots.map(({ x }) => exactToNumber(x))).toEqual([
      -Math.sqrt(2),
      Math.sqrt(2),
    ]);
    expect(hits('x^2/4-2').map(({ x }) => x.radical)).toEqual([
      rational(-2n),
      rational(2n),
    ]);
    expect(
      hits('(x^2-3)*(x^2-2)*(x-1)*(x-1-1e-25)').map(({ x }) =>
        exactToNumber(x),
      ),
    ).toEqual([-Math.sqrt(3), -Math.sqrt(2), 1, 1, Math.sqrt(2), Math.sqrt(3)]);
  });

  it('recognizes products, removes duplicate roots and finds a double root', () => {
    const roots = hits('(x^2-2)^2*(2*x-4)*(x-2)');
    expect(roots.map(({ x }) => x)).toEqual([
      exact(rational(0n), rational(-1n), 2n),
      exact(rational(0n), rational(1n), 2n),
      q(2n),
    ]);
    expect(roots[2]?.steps.map((step) => step.kind)).toContain('factors');
    expect(hits('(3*x-1)^2').map(({ x }) => x)).toEqual([q(1n, 3n)]);
    expect(hits('(3*x-1)^2', 'extrema')).toMatchObject([
      { x: q(1n, 3n), y: q(0n), classification: 'minimum' },
    ]);
  });

  it('classifies by an exact change of sign and checks stationarity separately', () => {
    expect(analyzeExact(curve('x^3'), 'extrema', view)).toEqual({
      status: 'none',
    });
    expect(analyzeExact(curve('x^4'), 'inflections', view)).toEqual({
      status: 'none',
    });
    const [minimum] = hits('x^4', 'extrema');
    expect(minimum).toMatchObject({
      classification: 'minimum',
      x: q(0n),
      y: q(0n),
    });
    expect(minimum?.steps).toContainEqual(
      expect.objectContaining({
        kind: 'classify',
        derivative: 1,
        order: 4,
        value: q(24n),
        rightSign: 1,
      }),
    );
    expect(hits('x^3', 'inflections')[0]?.classification).toBe(
      'stationaryInflection',
    );
    expect(hits('x^3+x', 'inflections')[0]?.classification).toBe('inflection');
    expect(hits('-(3*x-1)^6', 'extrema')).toMatchObject([
      { x: q(1n, 3n), y: q(0n), classification: 'maximum' },
    ]);
  });

  it('substitutes both intersection ordinates in the same quadratic field', () => {
    const result = analyzeExact(
      curve('x^2'),
      'intersections',
      view,
      curve('x+1'),
    );
    expect(result).toMatchObject({
      status: 'hits',
      hits: [-1n, 1n].map((n) => ({
        x: exact(rational(1n, 2n), rational(n, 2n), 5n),
        y: exact(rational(3n, 2n), rational(n, 2n), 5n),
      })),
    });
    expect(
      analyzeExact(curve('(x+1)^2'), 'intersections', view, curve('x^2+2*x+1')),
    ).toEqual({ status: 'infinite' });
  });

  it('distinguishes empty, coincident and unsupported cases before simplification', () => {
    expect(analyzeExact(curve('x^2+1'), 'roots', view)).toEqual({
      status: 'none',
    });
    expect(analyzeExact(curve('x^2+1e-25'), 'roots', view)).toEqual({
      status: 'none',
    });
    expect(analyzeExact(curve('0'), 'roots', view)).toEqual({
      status: 'infinite',
    });
    expect(analyzeExact(curve('0'), 'inflections', view)).toEqual({
      status: 'none',
    });
    expect(
      analyzeExact(curve('(x^2-1)/(x-1)'), 'intersections', view, curve('2')),
    ).toEqual({ status: 'unsupported' });
    for (const expression of [
      '0/(x-1)',
      '(x-1)^0-1',
      '0*cos(x)',
      'cos(x)-x',
      'pi*x-1',
      'x^25-1',
      'x^5-x+1',
    ]) {
      expect(analyzeExact(curve(expression), 'roots', view)).toEqual({
        status: 'unsupported',
      });
    }
    expect(analyzeExact(curve('x^2-1000000000039'), 'roots', view)).toEqual({
      status: 'unsupported',
    });
  });

  it('compares both coordinates with the search bounds exactly and includes the edges', () => {
    expect(hits('x^2-2', 'roots', { ...view, xMin: 0 })).toHaveLength(1);
    expect(
      hits('x-0.1', 'roots', { ...view, xMin: 0.1, yMin: 0 }),
    ).toHaveLength(1);
    expect(
      analyzeExact(curve('x-1-1e-25'), 'roots', { ...view, xMax: 1 }),
    ).toEqual({ status: 'none' });
    expect(
      analyzeExact(curve('x^2+1.000000000000000000001'), 'extrema', {
        ...view,
        yMax: 1,
      }),
    ).toEqual({ status: 'none' });
  });
});
