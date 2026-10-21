import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { strokeGridAxes } from '../src/features/graph/gridRaster';
test('AP49 separate native grid axes retain original pixels', async ({
  page,
}, info) => {
  const pixels = await page.evaluate((source) => {
    const draw = new Function(
      'return (' + source + ')',
    )() as typeof strokeGridAxes;
    const cases = [];
    for (const dpr of [1, 1.25, 1.5, 2])
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
        const canvases = [
          document.createElement('canvas'),
          document.createElement('canvas'),
        ];
        let tiled = false;
        for (const [index, canvas] of canvases.entries()) {
          canvas.width = Math.round(w * dpr);
          canvas.height = Math.round(h * dpr);
          const ctx = canvas.getContext('2d', { alpha: false });
          if (!ctx) throw Error('Canvas unavailable');
          ctx.scale(dpr, dpr);
          ctx.fillStyle = '#faf8ff';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#c4c7c5';
          ctx.globalAlpha = 0.4;
          ctx.lineWidth = 0.5;
          if (index === 1) {
            draw(ctx, xs, ys, w, h);
            tiled = true;
          } else {
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
        const arrays = canvases.map(
          (c) => c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data,
        );
        let different = 0,
          maximum = 0;
        const examples: {
          x: number;
          y: number;
          original: number;
          actual: number;
        }[] = [];
        for (let i = 0; i < arrays[0]!.length; i++) {
          const delta = Math.abs(arrays[0]![i]! - arrays[1]![i]!);
          if (delta) different++;
          if (delta > 1 && examples.length < 8)
            examples.push({
              x: Math.floor(i / 4) % Math.round(w * dpr),
              y: Math.floor(Math.floor(i / 4) / Math.round(w * dpr)),
              original: arrays[0]![i]!,
              actual: arrays[1]![i]!,
            });
          maximum = Math.max(maximum, delta);
        }
        cases.push({ dpr, phase, tiled, different, maximum, examples });
      }
    return cases;
  }, strokeGridAxes.toString());
  await mkdir(info.outputDir, { recursive: true });
  await writeFile(
    info.outputPath('grid-pixels.json'),
    JSON.stringify(pixels, null, 2),
  );
  expect(pixels.every((p) => p.tiled)).toBe(true);
  expect(Math.max(...pixels.map((p) => p.maximum))).toBeLessThanOrEqual(1);
});
