import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { cpus, platform, release } from 'node:os';
import { replaceGraphExpression } from './graphEditor';
const curves = [
  'a*sin(x)',
  'x^2/5-2',
  'cos(2*x)',
  '(2*cos(t),2*sin(t))',
  'r=2*(1+cos(theta))',
  'exp(-x^2/2)',
];
test('4K six-curve pan render budget and idle rendering', async ({
  page,
  browser,
}) => {
  await page.setViewportSize({ width: 3840, height: 2160 });
  await page.goto('/m8e-calc/#/graph');
  for (const input of curves) {
    await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
    await replaceGraphExpression(
      page.locator('.graph-editor [role="textbox"]').last(),
      input,
    );
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
  await page.evaluate(() => document.fonts.ready);
  await expect(canvas).toHaveAttribute('data-sampling', 'false', {
    timeout: 15000,
  });
  await expect(canvas).toHaveAttribute('data-curve-count', '6');
  await expect(canvas).toHaveAttribute('data-truncated', 'false');
  await page.waitForTimeout(1000);
  const geometry = await canvas.evaluate((element: HTMLCanvasElement) => ({
    width: element.width,
    height: element.height,
    dpr: devicePixelRatio,
    samples: JSON.parse(element.dataset.sampleResult ?? '[]') as {
      components: number;
      error?: string;
      truncated: boolean;
    }[],
  }));
  expect(geometry).toMatchObject({ width: 3840, height: 2160, dpr: 1 });
  expect(geometry.samples).toHaveLength(6);
  for (const sample of geometry.samples) {
    expect(sample.components).toBeGreaterThan(0);
    expect(sample.error).toBeUndefined();
    expect(sample.truncated).toBe(false);
  }
  const beforeFrames = JSON.parse(
    (await canvas.getAttribute('data-graph-metrics')) ?? '{}',
  ).frames as number;
  const box = await canvas.boundingBox();
  if (!box) throw Error('Missing canvas');
  expect(box).toMatchObject({ x: 0, y: 0, width: 3840, height: 2160 });
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  const intervals = await canvas.evaluate(
    async (element: HTMLCanvasElement) => {
      const intervals: number[] = [];
      let last = await new Promise<number>((resolve) =>
        requestAnimationFrame(resolve),
      );
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
      await new Promise<number>((resolve) => requestAnimationFrame(resolve));
      return intervals;
    },
  );
  await page.mouse.up();
  const metrics = JSON.parse(
    (await canvas.getAttribute('data-graph-metrics')) ?? '{}',
  ) as { frames: number; renderMs: number[]; samplingMs: number };
  const measuredFrames = metrics.frames - beforeFrames;
  const renderMs = measuredFrames
    ? metrics.renderMs.slice(-measuredFrames)
    : [];
  const sorted = renderMs.slice().sort((a, b) => a - b),
    p95 = sorted[Math.floor(sorted.length * 0.95)] ?? Infinity;
  const rafAverageMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const report = {
    head: process.env.AP28_HEAD ?? process.env.GITHUB_SHA ?? null,
    node: process.version,
    browser: browser.version(),
    runner: {
      os: platform(),
      release: release(),
      cpu: cpus()[0]?.model,
      cpus: cpus().length,
      image: process.env.ImageVersion,
    },
    geometry,
    intervals,
    renderMs,
    measuredFrames,
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
  await page.mouse.move(0, 0);
  await expect(canvas).toHaveAttribute('data-sampling', 'false', {
    timeout: 15000,
  });
  await page.waitForTimeout(1600);
  const idle = JSON.parse(
    (await canvas.getAttribute('data-graph-metrics')) ?? '{}',
  ).frames as number;
  await page.waitForTimeout(300);
  const idleAfter = JSON.parse(
    (await canvas.getAttribute('data-graph-metrics')) ?? '{}',
  ).frames as number;
  await writeFile(
    'test-results/graph-performance.json',
    JSON.stringify({ ...report, idleFrames: [idle, idleAfter] }, null, 2),
  );
  expect(measuredFrames).toBeGreaterThanOrEqual(120);
  expect(p95).toBeLessThan(16.67);
  expect(report.observedRafFps).toBeGreaterThanOrEqual(55);
  expect(idleAfter).toBe(idle);
});

test('AP27 2D worker keeps mixed-plot pan responsive at 1280×720', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/m8e-calc/#/graph');
  for (const input of ['x^2+y^2=a', 'sin(x)']) {
    await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
    await replaceGraphExpression(
      page.locator('.graph-editor [role="textbox"]').last(),
      input,
    );
  }
  await page
    .locator('.graph-canvas-wrap')
    .evaluate((e) => document.body.appendChild(e));
  await page.addStyleTag({
    content:
      '.graph-canvas-wrap { position:fixed; inset:0; width:1280px; height:720px; z-index:100; border:none; }',
  });
  const canvas = page.locator('canvas.graph-canvas');
  await expect(canvas).toHaveAttribute('data-sampling', 'false', {
    timeout: 15000,
  });
  await expect(canvas).toHaveAttribute('data-curve-count', '2');
  await page.mouse.move(640, 360);
  await page.mouse.down();
  const intervals = await canvas.evaluate(
    async (element: HTMLCanvasElement) => {
      const intervals: number[] = [];
      let last = await new Promise<number>((resolve) =>
        requestAnimationFrame(resolve),
      );
      for (let i = 0; i < 120; i++) {
        const time = await new Promise<number>((r) => requestAnimationFrame(r));
        intervals.push(time - last);
        last = time;
        element.dispatchEvent(
          new PointerEvent('pointermove', {
            pointerId: 1,
            pointerType: 'mouse',
            buttons: 1,
            clientX: 640 + Math.sin(i / 15) * 100,
            clientY: 360 + Math.cos(i / 15) * 50,
            bubbles: true,
          }),
        );
      }
      await new Promise<number>((resolve) => requestAnimationFrame(resolve));
      return intervals;
    },
  );
  await page.mouse.up();
  await expect(canvas).toHaveAttribute('data-sampling', 'false', {
    timeout: 15000,
  });
  const metrics = JSON.parse(
    (await canvas.getAttribute('data-graph-metrics')) ?? '{}',
  ) as { renderMs: number[]; samplingMs: number };
  const percentile = (values: number[], p: number) =>
    values.slice().sort((a, b) => a - b)[Math.floor(values.length * p)] ??
    Infinity;
  const report = {
    intervals,
    renderMs: metrics.renderMs,
    canvas: { width: 1280, height: 720 },
    curves: 2,
    renderP95Ms: percentile(metrics.renderMs, 0.95),
    rafP95Ms: percentile(intervals, 0.95),
    rafAverageMs: intervals.reduce((a, b) => a + b, 0) / intervals.length,
    workerMs: metrics.samplingMs,
    samples: JSON.parse(
      (await canvas.getAttribute('data-sample-result')) ?? '[]',
    ),
  };
  await writeFile(
    'test-results/graph-implicit-ui-performance.json',
    JSON.stringify(report, null, 2),
  );
  expect(report.renderP95Ms).toBeLessThan(16.67);
  expect(report.rafP95Ms).toBeLessThan(50);
  expect(report.rafAverageMs).toBeLessThan(30);
  expect(report.samples[0]?.error).toBeUndefined();
  expect(report.samples[0]?.truncated).toBe(false);
});
