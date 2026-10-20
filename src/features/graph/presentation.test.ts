import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { newRow, parseRow } from './model';
import { CurvePresentation } from './presentation';
import type { SampleResponse } from './workerProtocol';

beforeEach(() => {
  vi.stubGlobal(
    'Path2D',
    class {
      moveTo() {}
      lineTo() {}
    },
  );
});
afterEach(() => vi.unstubAllGlobals());

function row(input = 'a*sin(x)', value = 1, visible = true) {
  return parseRow({
    ...newRow('a', input),
    visible,
    params: { a: { value, min: 0.5, max: 3, step: 0.1 } },
  });
}
function result(parsed = row(), id = 1): SampleResponse {
  return {
    version: 2,
    id,
    bounds: { xMin: -4, xMax: 4, yMin: -3, yMax: 3 },
    size: { width: 800, height: 600 },
    milliseconds: 0,
    curves: [
      {
        id: parsed.row.id,
        signature: JSON.stringify(parsed.curve),
        evaluations: 2,
        truncated: false,
        segments: [[{ x: -1, y: 1 }, { x: 1, y: 2 }]],
      },
    ],
  };
}

it.each([
  'a*sin(x)',
  'a*x^2-1',
  '(a*cos(t),a*sin(t))',
  'r=a*(1+cos(theta))',
  'x^2+y^2=a',
])('preserves the reveal and last geometry for parameter updates of %s', (input) => {
  const presentation = new CurvePresentation();
  presentation.configure([row(input)]);
  presentation.replace(result(row(input)), 100);
  const old = presentation.paths.get('a');
  expect(old?.length).toBeGreaterThan(0);
  expect(presentation.configure([row(input, 2)])).toBe(false);
  expect(presentation.paths.get('a')).toBe(old);
  // Replace during the first reveal; its start time must not move forward.
  presentation.replace(result(row(input, 2), 2), 150);
  const next = presentation.paths.get('a');
  expect(next).not.toBe(old);
  expect(next?.path).not.toBe(old?.path);
  expect(next?.born).toBe(100);
  expect(next?.signature).toBe(JSON.stringify(row(input, 2).curve));
  expect(old?.signature).toBe(JSON.stringify(row(input).curve));
  presentation.configure([row(input, 3)]);
  presentation.replace(result(row(input, 3), 3), 5000);
  expect(presentation.paths.get('a')?.born).toBe(100);
});

it('starts the first reveal on geometry, even after changes before the first reply', () => {
  const presentation = new CurvePresentation();
  presentation.configure([row()]);
  presentation.configure([row('a*sin(x)', 2)]);
  presentation.replace(result(row('a*sin(x)', 2)), 400);
  expect(presentation.paths.get('a')?.born).toBe(400);
});

it.each(['hide', 'delete', 'invalid', 'function'] as const)(
  'removes old content immediately on %s and gives reintroduced geometry a new reveal',
  (change) => {
    const presentation = new CurvePresentation();
    presentation.configure([row()]);
    presentation.replace(result(), 100);
    const next =
      change === 'delete'
        ? []
        : [
            change === 'hide'
              ? row('a*sin(x)', 1, false)
              : row(change === 'invalid' ? 'sin(' : 'a*x^2-1'),
          ];
    expect(presentation.configure(next)).toBe(true);
    expect(presentation.paths.size).toBe(0);
    presentation.configure([row()]);
    presentation.replace(result(), 900);
    expect(presentation.paths.get('a')?.born).toBe(900);
  },
);

it('publishes a complete replacement, including empty/error results, without mutating the old cache', () => {
  const presentation = new CurvePresentation();
  presentation.configure([row()]);
  presentation.replace(result(), 100);
  const old = presentation.paths;
  const failed = result(row('a*sin(x)', 2), 2);
  failed.curves = failed.curves.map((curve) => ({
    ...curve,
    segments: [],
    error: 'timeout',
  }));
  presentation.replace(failed, 200);
  expect(presentation.paths).not.toBe(old);
  expect(old.get('a')?.length).toBeGreaterThan(0);
  expect(presentation.paths.get('a')?.length).toBe(0);
  presentation.replace(result(row('a*sin(x)', 3), 3), 300);
  expect(presentation.paths.get('a')?.born).toBe(100);
});

it('does not resume a reveal after Reduced/Off has completed it', () => {
  const presentation = new CurvePresentation();
  presentation.configure([row()]);
  presentation.replace(result(), 100);
  presentation.finishReveals();
  presentation.configure([row('a*sin(x)', 2)]);
  presentation.replace(result(row('a*sin(x)', 2), 2), 150);
  expect(presentation.paths.get('a')?.born).toBeLessThan(0);
});
