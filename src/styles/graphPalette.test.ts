import { it, expect } from 'vitest';
import { graphPalette, graphContrast } from './graphPalette';
import { buildScheme } from './buildScheme';
import { seeds } from './seeds';
it('provides eight accent-derived colors with graph and panel contrast in both themes', () => {
  for (const [, seed] of seeds)
    for (const dark of [false, true]) {
      const scheme = buildScheme(seed, 'tonalSpot', dark),
        backgrounds = [
          scheme['--md-sys-color-surface'],
          scheme['--md-sys-color-surface-container-low'],
        ].filter((c): c is string => !!c),
        palette = graphPalette(seed, dark, backgrounds);
      expect(palette).toHaveLength(8);
      expect(new Set(palette).size).toBe(8);
      for (const c of palette)
        for (const bg of backgrounds)
          expect(graphContrast(c, bg)).toBeGreaterThanOrEqual(3);
    }
});
