import { describe, expect, it } from 'vitest';
import { displayFontSize, fitMeasuredDisplay } from './displayFit';

describe('displayFontSize', () => {
  it('keeps short values at the maximum and reserves both ink gutters', () => {
    expect(displayFontSize(800, 60, 112, 24, 0.12)).toBe(112);
    const size = displayFontSize(400, 1000, 112, 24, 0.12);
    expect(size * (1000 / 112 + 0.24)).toBeCloseTo(399);
  });
  it('uses measured advances rather than character count', () => {
    expect(displayFontSize(400, 500, 112, 24, 0.12)).toBeGreaterThan(
      displayFontSize(400, 800, 112, 24, 0.12),
    );
  });
  it('preserves the reading floor for the wrapping fallback', () => {
    expect(displayFontSize(100, 2000, 112, 24, 0.12)).toBe(24);
  });
  it('tolerates a hidden or not yet measurable display', () => {
    expect(displayFontSize(0, 0, 112, 24, 0.12)).toBe(112);
  });
});

it('checks rounded font advances at the actual candidate size', () => {
  const measure = (size: number) => Math.round(size * 0.56) * 17;
  const size = fitMeasuredDisplay(400, 112, 24, 0.12, measure);
  expect(measure(size) + 0.24 * size).toBeLessThanOrEqual(399);
  expect(size).toBeGreaterThan(24);
});
it('keeps short values large and wraps only at the reading floor', () => {
  expect(fitMeasuredDisplay(800, 112, 24, 0.12, (s) => s * 0.56)).toBe(112);
  expect(fitMeasuredDisplay(100, 112, 24, 0.12, (s) => s * 20)).toBe(24);
});
