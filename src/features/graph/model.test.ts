import { describe, it, expect } from 'vitest';
import { Viewport } from '../../graph';
import {
  initialPlot,
  newRow,
  parseRow,
  plotReducer,
  restorePlot,
  plotPayload,
  normalizeParameter,
  advanceParameter,
  nearestTrace,
  tableValues,
} from './model';
import { analyze } from './analysisAdapter';
describe('plot model and AP12 parser integration', () => {
  it('detects all supported curve types and parameters; implicit input is an error', () => {
    for (const [input, kind] of [
      ['sin(x)', 'explicit'],
      ['x=3', 'vertical'],
      ['(cos(t),sin(t))', 'parametric'],
      ['r=1+cos(theta)', 'polar'],
    ])
      expect(parseRow(newRow('a', input)).curve?.kind).toBe(kind);
    expect(parseRow(newRow('a', 'a*x^2+b*x+c')).names).toEqual(['a', 'b', 'c']);
    expect(parseRow(newRow('a', 'x^2+y^2=4')).error?.code).toBe(
      'E_UNSUPPORTED_CURVE',
    );
    expect(parseRow(newRow('a', 'sin(')).error).not.toBeNull();
  });
  it('preserves identity while editing, toggling and reordering', () => {
    let state = initialPlot();
    state = plotReducer(state, { type: 'add', row: newRow('a', 'x') });
    state = plotReducer(state, { type: 'add', row: newRow('b', 'x^2') });
    state = plotReducer(state, { type: 'reorder', id: 'b', to: 0 });
    expect(state.rows.map((r) => r.id)).toEqual(['b', 'a']);
    state = plotReducer(state, {
      type: 'update',
      id: 'a',
      patch: { input: 'x+1', visible: false },
    });
    expect(state.rows[1]?.input).toBe('x+1');
    state = plotReducer(state, { type: 'delete', id: 'b' });
    expect(state.rows).toHaveLength(1);
  });
  it('restores complete validated plot sets and rejects broken persistence', () => {
    const state = {
      ...initialPlot(),
      rows: [
        {
          ...newRow('a', 'a*x'),
          params: { a: { value: 2, min: -3, max: 3, step: 0.1 } },
        },
      ],
      pi: true,
      lockAspect: true,
    };
    expect(restorePlot(plotPayload(state))).toEqual(state);
    expect(
      restorePlot({ ...state, bounds: { ...state.bounds, xMax: NaN } }),
    ).toBeNull();
    expect(
      restorePlot({ ...state, rows: [...state.rows, ...state.rows] }),
    ).toBeNull();
    expect(
      restorePlot({
        ...state,
        rows: [
          {
            ...state.rows[0],
            params: { a: { value: 1, min: 2, max: 1, step: 0 } },
          },
        ],
      }),
    ).toBeNull();
  });
  it('validates and animates parameter ranges', () => {
    expect(
      normalizeParameter({ value: 10, min: -1, max: 1, step: 0.1 })?.value,
    ).toBe(1);
    expect(
      normalizeParameter({ value: 0, min: 1, max: 1, step: 0.1 }),
    ).toBeNull();
    expect(
      advanceParameter({ value: 0, min: 0, max: 4, step: 0.1 }, 1).value,
    ).toBe(1);
  });
  it('snaps trace to explicit and parametric curves and caps tables', () => {
    const viewport = new Viewport(initialPlot().bounds, {
      width: 1000,
      height: 600,
    });
    expect(
      nearestTrace(
        [parseRow(newRow('a', 'x^2'))],
        viewport,
        viewport.worldToScreen({ x: 2, y: 4 }),
      )?.point,
    ).toEqual({ x: 2, y: 4 });
    const circle = parseRow(newRow('b', '(cos(t),sin(t))'));
    expect(
      nearestTrace([circle], viewport, viewport.worldToScreen({ x: 0, y: 1 }))
        ?.point.y,
    ).toBeCloseTo(1, 3);
    if (circle.curve)
      expect(tableValues(circle.curve, viewport.bounds, 0.0001)).toHaveLength(
        500,
      );
  });
  it('uses roots, tangent and integral APIs without inventing confidence', () => {
    const curve = parseRow(newRow('a', 'x^2-1')).curve;
    if (!curve) throw Error('Missing curve');
    const roots = analyze(curve, 'a', 'roots', initialPlot().bounds).markers;
    expect(roots).toHaveLength(2);
    expect(roots[0]?.x).toBeCloseTo(-1, 8);
    expect(roots[1]?.x).toBeCloseTo(1, 8);
    expect(
      analyze(curve, 'a', 'tangent', initialPlot().bounds, undefined, 1)
        .tangent,
    ).not.toBeNull();
    expect(
      analyze(
        curve,
        'a',
        'integral',
        initialPlot().bounds,
        undefined,
        0,
        [0, 2],
      ).integral?.value,
    ).toBeCloseTo(2 / 3, 8);
  });
});

it('AP21 persists the fit basis, supports old plot sets and rejects corrupt viewport state', () => {
  const base = initialPlot();
  const v = new Viewport(
    base.bounds,
    { width: 1600, height: 900 },
    { lockAspect: true },
  );
  const c = parseRow(newRow('a', 'x^2')).curve;
  if (!c) throw Error('Missing curve');
  const fitted = v.fitToCurves([c]);
  const plot = plotReducer(base, {
    type: 'view',
    bounds: fitted.bounds,
    fitBasis: fitted.fitBasis,
  });
  expect(restorePlot(plotPayload(plot))?.fitBasis).toEqual(v.fitBasis);
  expect(restorePlot(plotPayload(base))).toEqual(base);
  expect(
    restorePlot({ ...plot, fitBasis: { ...v.fitBasis, xMax: Infinity } }),
  ).toBeNull();
  expect(
    plotReducer(plot, { type: 'view', bounds: { ...plot.bounds, xMax: NaN } }),
  ).toBe(plot);
  expect(
    restorePlot({
      ...plot,
      bounds: { xMin: 1e16, xMax: 1e16 + 2, yMin: -1, yMax: 1 },
    }),
  ).toBeNull();
});
