import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const curves = [
  'a*sin(x)',
  'x^2/5-2',
  'cos(2*x)',
  '(2*cos(t),2*sin(t))',
  'r=2*(1+cos(theta))',
  'exp(-x^2/2)',
];
for (const width of [2560, 3840])
  for (const theme of ['light', 'dark'] as const)
    for (const [accent, seed] of [
      ['iris', '#6750a4'],
      ['teal', '#007f82'],
    ] as const) {
      test(`graph ${width} ${theme} ${accent}`, async ({ page }) => {
        await page.setViewportSize({
          width,
          height: width === 3840 ? 2160 : 1440,
        });
        await page.emulateMedia({
          colorScheme: theme,
          reducedMotion: 'reduce',
        });
        await page.addInitScript(
          ({ theme, seed }) =>
            localStorage.setItem(
              'm8e-calc.settings',
              JSON.stringify({
                version: 2,
                state: {
                  themeMode: theme,
                  accent: seed,
                  motionLevel: 'off',
                  language: 'de',
                },
              }),
            ),
          { theme, seed },
        );
        await page.goto('/m8e-calc/#/graph');
        for (const input of curves) {
          await page
            .getByRole('button', { name: 'Hinzufügen', exact: true })
            .click();
          await page
            .locator('.graph-editor [role="textbox"]')
            .last()
            .fill(input);
        }
        await page.evaluate(() => document.fonts.ready);
        const canvas = page.locator('canvas.graph-canvas');
        await expect(canvas).toHaveAttribute('data-curve-count', '6');
        await expect(canvas).toHaveAttribute('data-truncated', 'false');
        await page.waitForTimeout(250);
        await mkdir('test-results/graph-screenshots', { recursive: true });
        await page.screenshot({
          path: `test-results/graph-screenshots/graph-${width}-${theme}-${accent}.png`,
        });
      });
    }
test('4K six-curve pan render budget and idle rendering', async ({ page }) => {
  await page.setViewportSize({ width: 3840, height: 2160 });
  await page.goto('/m8e-calc/#/graph');
  for (const input of curves) {
    await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
    await page.locator('.graph-editor [role="textbox"]').last().fill(input);
  }
  await page.addStyleTag({
    content:
      '.graph-canvas-wrap { position: fixed; inset: 0; width: 3840px; height: 2160px; z-index: 100; }',
  });
  const canvas = page.locator('canvas.graph-canvas');
  await expect(canvas).toHaveAttribute('data-curve-count', '6');
  await expect(canvas).toHaveAttribute('data-truncated', 'false');
  await page.waitForTimeout(800);
  const box = await canvas.boundingBox();
  if (!box) throw Error('Missing canvas');
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  const framesPromise = page.evaluate(async () => {
    const intervals: number[] = [];
    let last = performance.now();
    for (let i = 0; i < 120; i++) {
      const now = await new Promise<number>((resolve) =>
        requestAnimationFrame(resolve),
      );
      intervals.push(now - last);
      last = now;
    }
    return intervals;
  });
  for (let i = 0; i < 120; i++) {
    await page.mouse.move(
      box.x + box.width * 0.5 + Math.sin(i / 15) * 250,
      box.y + box.height * 0.5 + Math.cos(i / 15) * 100,
    );
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
  const intervals = await framesPromise;
  const metrics = JSON.parse(
    (await canvas.getAttribute('data-graph-metrics')) ?? '{}',
  ) as { frames: number; renderMs: number[]; samplingMs: number };
  const sorted = metrics.renderMs.slice().sort((a, b) => a - b),
    p95 = sorted[Math.floor(sorted.length * 0.95)] ?? Infinity;
  const report = {
    viewport: { width: 3840, height: 2160 },
    canvas: { width: box.width, height: box.height },
    curves: 6,
    renderP95Ms: p95,
    rafAverageMs: intervals.reduce((a, b) => a + b, 0) / intervals.length,
    samplingWorkerMs: metrics.samplingMs,
    note: 'Headless Chromium CPU measurements; refresh rate and GPU vary on physical displays.',
  };
  await writeFile(
    'test-results/graph-performance.json',
    JSON.stringify(report, null, 2),
  );
  expect(p95).toBeLessThan(16.67);
  await page.mouse.move(0, 0);
  await page.waitForTimeout(1600);
  const idle = JSON.parse(
    (await canvas.getAttribute('data-graph-metrics')) ?? '{}',
  ).frames;
  await page.waitForTimeout(300);
  expect(
    JSON.parse((await canvas.getAttribute('data-graph-metrics')) ?? '{}')
      .frames,
  ).toBe(idle);
});
