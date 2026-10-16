import { describe, expect, it } from 'vitest';
import { displayFontSize } from './displayFit';

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
