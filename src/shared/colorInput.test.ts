import { expect, it } from 'vitest';
import { colorHue, colorWithHue } from './colorInput';
it('creates valid colors close to the requested hue, including a chroma floor for neutral seeds', () => {
  for (const seed of ['#6750a4', '#000000', '#ffffff'])
    for (const hue of [0, 90, 180, 270]) {
      const result = colorWithHue(seed, hue);
      expect(result).toMatch(/^#[\da-f]{6}$/);
      const delta = Math.abs(colorHue(result) - hue);
      expect(Math.min(delta, 360 - delta)).toBeLessThan(5);
    }
});
