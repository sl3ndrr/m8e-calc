import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { drawFinePattern } from '../src/features/graph/gridRaster';
test('AP49 bounded fine-grid raster retains original pixels and native DPR fallback', async ({
  page,
}, info) => {
  const pixels = await page.evaluate((source) => {
    const draw = new Function('fineTiles', 'return (' + source + ')')(
      new WeakMap(),
    ) as typeof drawFinePattern;
    const cases = [];
    const canvases = [
      document.createElement('canvas'),
      document.createElement('canvas'),
    ];
    for (const palette of [
      { background: '#faf8ff', grid: '#c4c7c5' },
      { background: '#212121', grid: '#575958' },
    ])
      for (const dpr of [1, 1.25, 1.5, 1.75, 2, 2.5, 3, 1])
        for (const phase of [0, 0.125, 0.5, 0.875]) {
          const w = 512,
            h = 256;
          const xs = Array.from(
            { length: 40 },
            (_, i) => phase + i * 19.2,
          ).filter((x) => x <= w);
          const ys = Array.from(
            { length: 40 },
            (_, i) => phase + i * 10.8,
          ).filter((y) => y <= h);
          let optimized = false;
          for (const [index, canvas] of canvases.entries()) {
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            const ctx = canvas.getContext('2d', { alpha: false });
            if (!ctx) throw Error('Canvas unavailable');
            ctx.scale(dpr, dpr);
            ctx.fillStyle = palette.background;
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = palette.grid;
            ctx.globalAlpha = 0.4;
            ctx.lineWidth = 0.5;
            if (index === 1)
              optimized = draw(
                ctx,
                xs,
                ys,
                {
                  background: palette.background,
                  grid: palette.grid,
                  axis: '',
                  label: '',
                  curves: [],
                },
                w,
                h,
              );
            if (index === 0 || !optimized) {
              ctx.beginPath();
              for (const x of xs) {
                ctx.moveTo(x, 0);
                ctx.lineTo(x, h);
              }
              for (const y of ys) {
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
              }
              ctx.stroke();
            }
          }
          const arrays = canvases.map((canvas) => {
            const context = canvas.getContext('2d');
            if (!context) throw Error('Canvas unavailable');
            return context.getImageData(0, 0, canvas.width, canvas.height).data;
          });
          const [before, after] = arrays;
          if (!before || !after) throw Error('Missing comparison image');
          let different = 0,
            maximum = 0;
          const examples: {
            x: number;
            y: number;
            original: number;
            actual: number;
          }[] = [];
          for (const [i, original] of before.entries()) {
            const actual = after[i];
            if (actual === undefined) throw Error('Comparison size mismatch');
            const delta = Math.abs(original - actual);
            if (delta) different++;
            if (delta > 1 && examples.length < 8)
              examples.push({
                x: Math.floor(i / 4) % Math.round(w * dpr),
                y: Math.floor(Math.floor(i / 4) / Math.round(w * dpr)),
                original,
                actual,
              });
            maximum = Math.max(maximum, delta);
          }
          cases.push({
            palette,
            dpr,
            phase,
            optimized,
            different,
            maximum,
            examples,
          });
        }
    return cases;
  }, drawFinePattern.toString());
  await mkdir(info.outputDir, { recursive: true });
  await writeFile(
    info.outputPath('grid-pixels.json'),
    JSON.stringify(pixels, null, 2),
  );
  expect(pixels.every((p) => p.optimized === p.dpr <= 1.5)).toBe(true);
  expect(Math.max(...pixels.map((p) => p.maximum))).toBeLessThanOrEqual(1);
});
