import { expect, it } from 'vitest';
import { loadingPath, loadingShapes } from './loadingShapes';
it('interpolates five distinct paths with identical SVG topology and a seamless cycle', () => {
  expect(loadingShapes).toHaveLength(5);
  const paths = loadingShapes.map((_, i) => loadingPath(i));
  expect(new Set(paths).size).toBe(5);
  for (const path of paths) expect(path.match(/Q/g)).toHaveLength(32);
  expect(loadingPath(5)).toBe(loadingPath(0));
  expect(loadingPath(0.5)).not.toBe(paths[0]);
  expect(loadingPath(-0.1)).not.toContain('NaN');
  expect(loadingPath(4.999999).length).toBeGreaterThan(500);
});
