import { expect, it } from 'vitest';
import { defaultBounds, newRow, parseRow, tableResult, tableValues } from './model';
function curve(input: string) {
  const parsed = parseRow(newRow('a', input));
  if (!parsed.curve) throw Error(input);
  return parsed.curve;
}
it.each(['x', 'x=3', '(t,t^2)', 'r=1'])('tables preserve evaluation and ascending parameter order: %s', (input) => {
  const c = curve(input), values = tableValues(c, defaultBounds, 0.1);
  expect(values.length).toBeGreaterThan(1);
  expect(values.length).toBeLessThanOrEqual(500);
  expect(new Set(values.map((r) => r.u)).size).toBe(values.length);
  values.slice(1).forEach((r, i) => expect(r.u).toBeGreaterThan(values[i]?.u ?? -Infinity));
  if (c.kind === 'explicit') expect(values[0]).toEqual({ u: -10, point: { x: -10, y: -10 } });
  if (c.kind === 'vertical') expect(values[0]).toEqual({ u: -6, point: { x: 3, y: -6 } });
  if (c.kind === 'parametric' || c.kind === 'polar') expect(values[0]?.u).toBe(c.range[0]);
});
it('retains gaps, small values and unrounded fractions', () => {
  expect(tableValues(curve('1/3'), defaultBounds, 1)[0]?.point.y).toBe(1 / 3);
  expect(tableValues(curve('1e-13'), defaultBounds, 1)[0]?.point.y).toBe(1e-13);
  expect(tableValues(curve('1/x'), { ...defaultBounds, xMin: 0 }, 1)[0]?.point.y).toBeNaN();
});
it.each([0, -1, NaN, Infinity])('rejects step %s', (step) => {
  expect(tableValues(curve('x'), defaultBounds, step)).toEqual([]);
});
it('caps at 500 and distinguishes complete, truncated and non-advancing tables', () => {
  const c = curve('x');
  const result = tableResult(c, defaultBounds, 0.001);
  expect(result.rows).toHaveLength(500);
  expect(result.stopped).toBe('limit');
  expect(tableResult(c, { ...defaultBounds, xMin: 0, xMax: 499 }, 1).stopped).toBeNull();
  const stalled = tableResult(c, { ...defaultBounds, xMin: 1e16, xMax: 1e16 + 100 }, 0.1);
  expect(stalled.rows).toHaveLength(1);
  expect(stalled.stopped).toBe('precision');
});
