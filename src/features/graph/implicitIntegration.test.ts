import { describe, it, expect } from 'vitest';
import { Viewport } from '../../graph';
import { decodePermalink, encodePermalink } from '../../app/permalinks';
import {
  initialPlot,
  newRow,
  parseRow,
  restorePlot,
  plotPayload,
  plotReducer,
  tableResult,
  nearestTrace,
} from './model';
import { analyze } from './analysisAdapter';
import { fitPlot } from './fit';
import { sampleRequest } from './sampling';
import {
  implicitBudget,
  isSampleRequest,
  isSampleResponse,
  matchesRequest,
  type SampleRequest,
} from './workerProtocol';
import { sampleMessageKeys } from './samplingDiagnostics';
const bounds = { xMin: -4, xMax: 4, yMin: -3, yMax: 3 };
function request(inputs: string[]): SampleRequest {
  return {
    version: 2,
    id: 1,
    bounds,
    size: { width: 320, height: 240 },
    budget: implicitBudget,
    curves: inputs.map((input, i) => {
      const curve = parseRow(newRow(String(i), input)).curve;
      if (!curve) throw Error(input);
      return { id: String(i), curve, signature: JSON.stringify(curve) };
    }),
  };
}
describe('AP27 actual AP26 dispatch', () => {
  it.each(['x^2+y^2=4', 'x*y=1', 'x*y=0', '((x-2)^2+y^2-1)*((x+2)^2+y^2-1)=0'])(
    'serializes and samples %s without connecting unrelated components',
    (input) => {
      const req = request([input]);
      expect(isSampleRequest(JSON.parse(JSON.stringify(req)))).toBe(true);
      const result = sampleRequest(req);
      expect(isSampleResponse(JSON.parse(JSON.stringify(result)))).toBe(true);
      const sampled = result.curves[0];
      expect(sampled?.error).toBeUndefined();
      expect(sampled?.truncated).toBe(false);
      expect(sampled?.segments.length).toBeGreaterThan(0);
      if (input === 'x*y=1')
        for (const seg of sampled?.segments ?? []) {
          expect(new Set(seg.map((p) => Math.sign(p.x))).size).toBe(1);
          for (const p of seg) expect(p.x * p.y).toBeCloseTo(1, 5);
        }
      if (input.startsWith('((x-2)')) {
        expect(sampled?.segments).toHaveLength(2);
        for (const seg of sampled?.segments ?? []) {
          expect(seg[0]).toEqual(seg.at(-1));
          expect(new Set(seg.map((p) => Math.sign(p.x))).size).toBe(1);
        }
      }
      if (input === 'x*y=0')
        for (const seg of sampled?.segments ?? [])
          for (const p of seg) expect(p.x * p.y).toBe(0);
    },
  );
  it('preserves mixed order, changed parameters, visibility and deletion', () => {
    let plot = {
      ...initialPlot(),
      rows: [
        newRow('a', 'x^2+y^2=a'),
        newRow('b', 'sin(x)'),
        newRow('c', 'x*y=1'),
      ],
    };
    plot = plotReducer(plot, {
      type: 'update',
      id: 'a',
      patch: { params: { a: { value: 4, min: 1, max: 9, step: 1 } } },
    });
    expect(parseRow(plot.rows[0] ?? newRow('missing')).names).toEqual(['a']);
    expect(
      sampleRequest(request(plot.rows.map((r) => r.input))).curves.map(
        (c) => c.id,
      ),
    ).toEqual(['0', '1', '2']);
    plot = plotReducer(plot, { type: 'reorder', id: 'c', to: 0 });
    plot = plotReducer(plot, {
      type: 'update',
      id: 'a',
      patch: { visible: false },
    });
    plot = plotReducer(plot, { type: 'delete', id: 'b' });
    expect(restorePlot(plotPayload(plot))).toEqual(plot);
    expect(plot.rows.map((r) => [r.id, r.visible])).toEqual([
      ['c', true],
      ['a', false],
    ]);
  });
  it('never runs implicit sampling in the bounded fallback', () => {
    const result = sampleRequest(
      request(['x^2+y^2=4', 'x', 'x+1', 'x+2', 'x+3', 'x+4']),
      true,
    );
    expect(result.curves[0]?.error).toBe('worker');
    expect(result.curves[0]?.evaluations).toBe(0);
    expect(result.curves[5]?.error).toBe('fallback-limit');
  });
  it('shares deterministic 2D budgets and reports limits', () => {
    const req = request(['sin(100*x)*sin(100*y)=0', 'x^2+y^2=4']);
    const result = sampleRequest(req);
    expect(
      result.curves.reduce((n, c) => n + c.evaluations, 0),
    ).toBeLessThanOrEqual(implicitBudget.maxEvaluations);
    expect(
      result.curves.reduce((n, c) => n + (c.diagnostics?.cells ?? 0), 0),
    ).toBeLessThanOrEqual(implicitBudget.maxCells);
    expect(result.curves[0]?.truncated).toBe(true);
    const first = result.curves[0];
    if (!first) throw Error('Missing result');
    expect(sampleMessageKeys(first)).toContain('graph.samplingBudget');
  });
  it('rejects malformed protocols and matches the latest full request only', () => {
    const req = request(['x^2+y^2=4']),
      result = sampleRequest(req);
    expect(matchesRequest(result, req)).toBe(true);
    for (const patch of [
      { version: 1 },
      { id: NaN },
      { budget: {} },
      { size: { width: Infinity, height: 1 } },
      {
        curves: [
          {
            ...req.curves[0],
            curve: { kind: 'implicit', expression: { kind: 'assignment' } },
          },
        ],
      },
    ])
      expect(isSampleRequest({ ...req, ...patch })).toBe(false);
    for (const patch of [
      { id: 2 },
      { bounds: { ...bounds, xMax: 5 } },
      { curves: request(['x*y=1']).curves },
    ])
      expect(matchesRequest(result, { ...req, ...patch })).toBe(false);
    expect(isSampleResponse({ ...result, milliseconds: NaN })).toBe(false);
    expect(
      isSampleResponse({
        ...result,
        curves: [{ ...result.curves[0], segments: [[{ x: NaN, y: 0 }]] }],
      }),
    ).toBe(false);
    expect(
      isSampleResponse({
        ...result,
        curves: [
          {
            ...result.curves[0],
            diagnostics: { status: 'contours', limits: [] },
          },
        ],
      }),
    ).toBe(false);
  });
});

it('keeps old links and complete new plots readable without changing version 1 input storage', () => {
  const old = { ...initialPlot(), rows: [newRow('old', 'sin(x)')] };
  const modern = {
    ...old,
    rows: [...old.rows, newRow('circle', 'x^2+y^2=4')],
    fitBasis: bounds,
  };
  for (const plot of [old, modern]) {
    expect(
      restorePlot(decodePermalink(encodePermalink('graph', plot))?.data),
    ).toEqual(plot);
    expect(restorePlot(plotPayload(plot))).toEqual(plot);
  }
  expect(restorePlot({ ...modern, version: 3 })).toBeNull();
  expect(parseRow(newRow('bad', 'x^2+y^2=')).error).not.toBeNull();
});
it('does not invent 1D values, analysis or a trace for an implicit zero set', () => {
  const parsed = parseRow(newRow('circle', 'x^2+y^2=4'));
  if (!parsed.curve) throw Error('Missing implicit curve');
  expect(tableResult(parsed.curve, bounds, 1)).toEqual({
    rows: [],
    stopped: 'unsupported',
  });
  const view = new Viewport(bounds, { width: 800, height: 600 });
  expect(
    nearestTrace([parsed], view, view.worldToScreen({ x: 2, y: 0 })),
  ).toBeNull();
  for (const kind of [
    'roots',
    'extrema',
    'intersections',
    'tangent',
    'integral',
  ] as const) {
    const result = analyze(
      parsed.curve,
      'circle',
      kind,
      bounds,
      request(['x']).curves[0]?.curve,
      0,
      [-2, 2],
    );
    expect(result).toMatchObject({
      unsupported: true,
      markers: [],
      integral: null,
      tangent: null,
      shade: null,
    });
  }
  const explicit = request(['x']).curves[0]?.curve;
  if (!explicit) throw Error('Missing curve');
  expect(
    analyze(explicit, 'explicit', 'intersections', bounds, parsed.curve)
      .unsupported,
  ).toBe(true);
});
it('fits implicit and mixed sets against the stable AP21 basis across navigation and layout changes', () => {
  const rows = ['x^2+y^2=4', 'x^2'].map((s, i) =>
    parseRow(newRow(String(i), s)),
  );
  for (const set of [
    [rows[0]].filter((r): r is NonNullable<typeof r> => !!r),
    rows,
  ]) {
    let view = new Viewport(
      bounds,
      { width: 1600, height: 900 },
      { lockAspect: true },
    );
    const fitted = fitPlot(view, set);
    for (let i = 0; i < 12; i++) view = fitPlot(view, set);
    expect(view.bounds).toEqual(fitted.bounds);
    expect(view.fitBasis).toEqual(bounds);
    const moved = view.pan(20, 30).zoom(1.2, { x: 800, y: 450 });
    const resized = moved.resize({ width: 900, height: 900 });
    expect(fitPlot(resized, set).fitBasis).toEqual(moved.fitBasis);
    const next = fitPlot(resized, set);
    expect(fitPlot(next, set).bounds).toEqual(next.bounds);
  }
});
