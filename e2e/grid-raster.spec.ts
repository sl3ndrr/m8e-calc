import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { drawFinePattern } from '../src/features/graph/gridRaster';

test('AP49 periodic native grid retains raster geometry', async ({
  page,
}, info) => {
  const pixels = await page.evaluate((source) => {
    const draw = new Function('fineTiles', 'return (' + source + ')')(
      new WeakMap(),
    ) as typeof drawFinePattern;
    const cases = [];
    for (const dpr of [1, 1.25, 2]) {
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
        let accelerated = false;
        for (const [index, canvas] of canvases.entries()) {
          canvas.width = Math.round(w * dpr);
          canvas.height = Math.round(h * dpr);
          const ctx = canvas.getContext('2d', { alpha: false })!;
          ctx.scale(dpr, dpr);
          ctx.fillStyle = '#faf8ff';
          ctx.fillRect(0, 0, w, h);
          if (index === 1)
            accelerated = draw(
              ctx,
              xs,
              ys,
              {
                background: '#faf8ff',
                grid: '#c4c7c5',
                axis: '',
                label: '',
                curves: [],
              },
              w,
              h,
            );
          if (index === 0 || !accelerated) {
            ctx.beginPath();
            ctx.strokeStyle = '#c4c7c5';
            ctx.globalAlpha = 0.4;
            ctx.lineWidth = 0.5;
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
        const examples: {
          x: number;
          y: number;
          original: number;
          actual: number;
        }[] = [];
        let different = 0,
          maximum = 0;
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
        cases.push({ dpr, phase, accelerated, different, maximum, examples });
      }
    }
    return cases;
  }, drawFinePattern.toString());
  await mkdir(info.outputDir, { recursive: true });
  await writeFile(
    info.outputPath('grid-pixels.json'),
    JSON.stringify(pixels, null, 2),
  );
  expect(pixels.every((p) => p.accelerated)).toBe(true);
  expect(Math.max(...pixels.map((p) => p.maximum))).toBeLessThanOrEqual(1);
});

test('AP49 retains native fallbacks and reuses a bounded tile across resize', async ({
  page,
}) => {
  const result = await page.evaluate((source) => {
    const cache = new WeakMap();
    const draw = new Function('fineTiles', 'return (' + source + ')')(
      cache,
    ) as typeof drawFinePattern;
    const canvas = document.createElement('canvas');
    canvas.width = 40;
    canvas.height = 40;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw Error('Canvas unavailable');
    const colors = {
      background: '#faf8ff',
      grid: '#c4c7c5',
      axis: '',
      label: '',
      curves: [],
    };
    const a = [1.5, 11.5, 21.5, 31.5],
      b = [2.5, 12.5, 22.5, 32.5];
    const first = draw(ctx, a, a, colors, 40, 40);
    const initial = cache.get(ctx);
    const second = draw(ctx, b, b, colors, 40, 40);
    canvas.width = 80;
    canvas.height = 80;
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    const resized = draw(ctx, b, b, colors, 40, 40);
    const retained = initial === cache.get(ctx);
    const tile = cache.get(ctx) as { canvas: HTMLCanvasElement } | undefined;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const fallbacks = [
      draw(ctx, [0], a, colors, 40, 40),
      draw(ctx, [0, 10, 21], a, colors, 40, 40),
      draw(ctx, [0, 10, 20], a, colors, 40, 40),
      draw(ctx, [0, 10, Number.NaN], a, colors, 40, 40),
      draw(ctx, a, a, { ...colors, background: 'rgba(0,0,0,0.5)' }, 40, 40),
    ];
    ctx.translate(1, 0);
    fallbacks.push(draw(ctx, a, a, colors, 40, 40));
    return {
      first,
      second,
      resized,
      retained,
      tileWidth: tile?.canvas.width,
      tileHeight: tile?.canvas.height,
      fallbacks,
    };
  }, drawFinePattern.toString());
  expect(result.first).toBe(true);
  expect(result.second).toBe(true);
  expect(result.resized).toBe(true);
  expect(result.retained).toBe(true);
  expect(result.tileWidth).toBeLessThanOrEqual(256);
  expect(result.tileHeight).toBeLessThanOrEqual(256);
  expect(result.fallbacks).toEqual([false, false, false, false, false, false]);
});
