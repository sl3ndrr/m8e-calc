import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const curves = [
  'a*sin(x)',
  'x^2/5-2',
  'cos(2*x)',
  '(2*cos(t),2*sin(t))',
  'r=2*(1+cos(theta))',
  'exp(-x^2/2)',
];
test('4K six-curve pan render budget and idle rendering', async ({ page }) => {
  await page.setViewportSize({ width: 3840, height: 2160 });
  await page.goto('/m8e-calc/#/graph');
  for (const input of curves) {
    await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
    await page.locator('.graph-editor [role="textbox"]').last().fill(input);
  }
  // Move only the benchmark surface out of the shell's containment/clipping.
  // The mounted controller and native event handlers remain the production ones.
  await page
    .locator('.graph-canvas-wrap')
    .evaluate((element) => document.body.appendChild(element));
  await page.addStyleTag({
    content:
      '.graph-canvas-wrap { position: fixed; inset: 0; width: 3840px; height: 2160px; z-index: 100; border: none; }',
  });
  const canvas = page.locator('canvas.graph-canvas');
  await expect(canvas).toHaveAttribute('data-curve-count', '6');
  await expect(canvas).toHaveAttribute('data-truncated', 'false');
  await page.waitForTimeout(800);
  const box = await canvas.boundingBox();
  if (!box) throw Error('Missing canvas');
  expect(box).toMatchObject({ x: 0, y: 0, width: 3840, height: 2160 });
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  const intervals = await canvas.evaluate(
    async (element: HTMLCanvasElement) => {
      const intervals: number[] = [];
      let last = performance.now();
      const box = element.getBoundingClientRect();
      // Native mouse-down establishes capture; rAF-paced moves isolate rendering
      // from protocol round trips and trace screenshot encoding at 4K.
      for (let i = 0; i < 120; i++) {
        const now = await new Promise<number>((resolve) =>
          requestAnimationFrame(resolve),
        );
        intervals.push(now - last);
        last = now;
        element.dispatchEvent(
          new PointerEvent('pointermove', {
            pointerId: 1,
            pointerType: 'mouse',
            buttons: 1,
            clientX: box.x + box.width * 0.5 + Math.sin(i / 15) * 250,
            clientY: box.y + box.height * 0.5 + Math.cos(i / 15) * 100,
            bubbles: true,
          }),
        );
      }
      return intervals;
    },
  );
  await page.mouse.up();
  const metrics = JSON.parse(
    (await canvas.getAttribute('data-graph-metrics')) ?? '{}',
  ) as { frames: number; renderMs: number[]; samplingMs: number };
  const sorted = metrics.renderMs.slice().sort((a, b) => a - b),
    p95 = sorted[Math.floor(sorted.length * 0.95)] ?? Infinity;
  const rafAverageMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const report = {
    viewport: { width: 3840, height: 2160 },
    canvas: { width: box.width, height: box.height },
    curves: 6,
    renderP95Ms: p95,
    rafAverageMs,
    observedRafFps: 1000 / rafAverageMs,
    targetFps: 60,
    frameBudgetMs: 1000 / 60,
    samplingWorkerMs: metrics.samplingMs,
    method:
      'Native pointer-down, rAF-paced pointer moves, trace disabled; real mouse and wheel covered by functional E2E.',
    note: 'Headless Chromium measurements; refresh rate and GPU vary on physical displays.',
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
