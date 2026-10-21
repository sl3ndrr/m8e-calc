import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
test('AP49 isolate native raster source and integer copies', async ({
  page,
}, info) => {
  const results = await page.evaluate(() => {
    const results = [];
    for (const dpr of [1, 1.25, 1.5, 2])
      for (const phase of [0, 0.125, 0.5, 0.875]) {
        const w = 512,
          h = 256,
          tw = Math.round(96 * dpr),
          th = Math.round(54 * dpr);
        // Only integral periodic lengths can repeat without coordinate drift.
        if (54 * dpr !== th) continue;
        const xs = Array.from(
          { length: 40 },
          (_, i) => phase + i * 19.2,
        ).filter((x) => x <= w);
        const ys = Array.from(
          { length: 40 },
          (_, i) => phase + i * 10.8,
        ).filter((y) => y <= h);
        function canvas(width: number, height: number) {
          const c = document.createElement('canvas');
          c.width = width;
          c.height = height;
          const ctx = c.getContext('2d', { alpha: false });
          if (!ctx) throw Error('Canvas unavailable');
          return { c, ctx };
        }
        function draw(width: number, height: number, clip: boolean) {
          const { c, ctx } = canvas(width, height);
          ctx.scale(dpr, dpr);
          ctx.fillStyle = '#faf8ff';
          ctx.fillRect(0, 0, w, h);
          if (clip) {
            ctx.beginPath();
            ctx.rect(0, 0, tw / dpr, th / dpr);
            ctx.clip();
          }
          ctx.strokeStyle = '#c4c7c5';
          ctx.lineWidth = 0.5;
          ctx.globalAlpha = 0.4;
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
          return c;
        }
        const original = draw(w * dpr, h * dpr, false),
          fullClip = draw(w * dpr, h * dpr, true),
          small = draw(tw, th, false);
        const expected = original
          .getContext('2d')!
          .getImageData(0, 0, tw, th).data;
        function delta(a: Uint8ClampedArray, b: Uint8ClampedArray) {
          let maximum = 0,
            different = 0;
          for (let i = 0; i < a.length; i++) {
            const n = Math.abs(a[i]! - b[i]!);
            maximum = Math.max(maximum, n);
            if (n) different++;
          }
          return { maximum, different };
        }
        const fullExpected = original
          .getContext('2d')!
          .getImageData(0, 0, w * dpr, h * dpr).data;
        for (const [name, source] of [
          ['small', small],
          ['clipped', fullClip],
          ['full', original],
        ] as const) {
          const prefix = source
            .getContext('2d')!
            .getImageData(0, 0, tw, th).data;
          const tile = canvas(tw, th);
          tile.ctx.imageSmoothingEnabled = false;
          tile.ctx.drawImage(source, 0, 0, tw, th, 0, 0, tw, th);
          const image = canvas(w * dpr, h * dpr);
          image.ctx.imageSmoothingEnabled = false;
          for (let y = 0; y < image.c.height; y += th)
            for (let x = 0; x < image.c.width; x += tw)
              image.ctx.drawImage(tile.c, x, y);
          const pattern = canvas(w * dpr, h * dpr);
          pattern.ctx.imageSmoothingEnabled = false;
          const p = pattern.ctx.createPattern(tile.c, 'repeat');
          if (!p) throw Error('Pattern unavailable');
          pattern.ctx.fillStyle = p;
          pattern.ctx.fillRect(0, 0, pattern.c.width, pattern.c.height);
          results.push({
            dpr,
            phase,
            name,
            prefix: delta(expected, prefix),
            copy: delta(
              fullExpected,
              image.ctx.getImageData(0, 0, image.c.width, image.c.height).data,
            ),
            pattern: delta(
              fullExpected,
              pattern.ctx.getImageData(0, 0, pattern.c.width, pattern.c.height)
                .data,
            ),
          });
        }
      }
    return results;
  });
  await mkdir(info.outputDir, { recursive: true });
  await writeFile(
    info.outputPath('grid-source.json'),
    JSON.stringify(results, null, 2),
  );
  expect(
    results
      .filter((r) => r.name === 'full')
      .every((r) => r.prefix.maximum === 0),
  ).toBe(true);
});
