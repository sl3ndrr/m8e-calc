import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { cpus, platform, release } from 'node:os';
import { replaceGraphExpression } from './graphEditor';

const expressions = [
  'a*sin(x)',
  'x^2/5-2',
  'cos(2*x)',
  '(2*cos(t),2*sin(t))',
  'r=2*(1+cos(theta))',
  'exp(-x^2/2)',
];
interface Probe {
  posts: number;
  replies: number;
  workerMs: number[];
  longTasks: number[];
  strokes: number;
  delayRender: number;
  suppressWorker: boolean;
}
declare global {
  interface Window {
    ap28Probe: Probe;
  }
}

async function setup(page: Page) {
  await page.setViewportSize({ width: 3840, height: 2160 });
  await page.addInitScript(() => {
    const probe: Probe = (window.ap28Probe = {
      posts: 0,
      replies: 0,
      workerMs: [],
      longTasks: [],
      strokes: 0,
      delayRender: 0,
      suppressWorker: false,
    });
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.addEventListener(
          'message',
          (event: MessageEvent<{ milliseconds?: number }>) => {
            probe.replies++;
            if (typeof event.data.milliseconds === 'number')
              probe.workerMs.push(event.data.milliseconds);
          },
        );
      }
      postMessage(message: unknown) {
        probe.posts++;
        if (!probe.suppressWorker) super.postMessage(message);
      }
    };
    new PerformanceObserver((list) => {
      probe.longTasks.push(...list.getEntries().map((e) => e.duration));
    }).observe({ type: 'longtask', buffered: true });
    const fill = CanvasRenderingContext2D.prototype.fillRect;
    CanvasRenderingContext2D.prototype.fillRect = function (
      ...args: Parameters<typeof fill>
    ) {
      const until = performance.now() + probe.delayRender;
      while (performance.now() < until) {
        /* deliberate regression control */
      }
      return fill.apply(this, args);
    };
    const stroke = CanvasRenderingContext2D.prototype.stroke;
    CanvasRenderingContext2D.prototype.stroke = function (path?: Path2D) {
      if (path) {
        probe.strokes++;
        Reflect.apply(stroke, this, [path]);
      } else Reflect.apply(stroke, this, []);
    };
  });
  await page.goto('/m8e-calc/#/graph');
  for (const input of expressions) {
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
      '.graph-canvas-wrap { position:fixed; inset:0; width:3840px; height:2160px; z-index:100; border:none; }',
  });
  await page.evaluate(() => document.fonts.ready);
  const canvas = page.locator('canvas.graph-canvas');
  await expect(canvas).toHaveAttribute('data-sampling', 'false', {
    timeout: 15000,
  });
  await expect(canvas).toHaveAttribute('data-curve-count', '6');
  await expect(canvas).toHaveAttribute('data-truncated', 'false');
  await page.waitForTimeout(1000);
  const geometry = await canvas.evaluate((e: HTMLCanvasElement) => ({
    css: { width: e.clientWidth, height: e.clientHeight },
    backing: { width: e.width, height: e.height },
    dpr: devicePixelRatio,
    samples: JSON.parse(e.dataset.sampleResult ?? '[]') as {
      components: number;
      error?: string;
      truncated: boolean;
      signature: string;
    }[],
  }));
  expect(geometry.css).toEqual({ width: 3840, height: 2160 });
  expect(geometry.dpr).toBe(1);
  expect(geometry.backing).toEqual(geometry.css);
  expect(geometry.samples).toHaveLength(6);
  for (const sample of geometry.samples) {
    expect(sample.error).toBeUndefined();
    expect(sample.truncated).toBe(false);
    expect(sample.components).toBeGreaterThan(0);
  }
  return { canvas, geometry };
}

async function windowMeasurement(
  page: Page,
  pan: boolean,
  delayMain = 0,
  count = 120,
) {
  if (pan) {
    await page.mouse.move(1920, 1080);
    await page.mouse.down();
  }
  const result = await page.locator('canvas.graph-canvas').evaluate(
    async (e: HTMLCanvasElement, { pan, delayMain, count }) => {
      const metrics = () =>
        JSON.parse(e.dataset.graphMetrics ?? '{}') as {
          frames: number;
          renderMs: number[];
          samplingMs: number;
        };
      const before = metrics();
      const probe = window.ap28Probe;
      const initial = {
        posts: probe.posts,
        replies: probe.replies,
        strokes: probe.strokes,
        workers: probe.workerMs.length,
        longTasks: probe.longTasks.length,
      };
      const intervals: number[] = [];
      let last = await new Promise<number>((r) => requestAnimationFrame(r));
      for (let i = 0; i < count; i++) {
        const now = await new Promise<number>((r) => requestAnimationFrame(r));
        intervals.push(now - last);
        last = now;
        if (pan)
          e.dispatchEvent(
            new PointerEvent('pointermove', {
              pointerId: 1,
              pointerType: 'mouse',
              buttons: 1,
              clientX: 1920 + Math.sin(i / 15) * 250,
              clientY: 1080 + Math.cos(i / 15) * 100,
              bubbles: true,
            }),
          );
        const until = performance.now() + delayMain;
        while (performance.now() < until) {
          /* scheduling-only negative control */
        }
      }
      // Flush the last dirty draw without a protocol roundtrip in the window.
      await new Promise<number>((r) => requestAnimationFrame(r));
      const after = metrics();
      const frames = after.frames - before.frames;
      const renderMs = after.renderMs.slice(-Math.min(frames, 600));
      const sorted = renderMs.slice().sort((a, b) => a - b);
      const average = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      return {
        intervals,
        renderMs,
        frames,
        renderP95Ms: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
        rafAverageMs: average,
        observedRafFps: 1000 / average,
        workerPosts: probe.posts - initial.posts,
        workerReplies: probe.replies - initial.replies,
        workerMs: probe.workerMs.slice(initial.workers),
        longTasks: probe.longTasks.slice(initial.longTasks),
        curveStrokes: probe.strokes - initial.strokes,
        lastWorkerMs: after.samplingMs,
      };
    },
    { pan, delayMain, count },
  );
  if (pan) {
    // Avoid carrying the deliberately abrupt last synthetic delta into inertia.
    await page.waitForTimeout(120);
    await page.mouse.up();
    await expect(page.locator('canvas.graph-canvas')).toHaveAttribute(
      'data-sampling',
      'false',
      { timeout: 15000 },
    );
    await page.waitForTimeout(400);
  }
  return result;
}

test('AP28 fixed diagnostic windows on unchanged graph code', async ({
  page,
  browser,
}, info) => {
  test.setTimeout(120000);
  const { geometry } = await setup(page);
  const runs: {
    name: string;
    window: number;
    measurement: Awaited<ReturnType<typeof windowMeasurement>>;
  }[] = [];
  for (const name of ['idle-reference', 'pan', 'hidden-pan'] as const) {
    await page.locator('canvas.graph-canvas').evaluate((e, hidden) => {
      e.style.opacity = hidden ? '0' : '1';
    }, name === 'hidden-pan');
    for (let i = 0; i < 3; i++)
      runs.push({
        name,
        window: i,
        measurement: await windowMeasurement(page, name !== 'idle-reference'),
      });
  }
  await page.locator('canvas.graph-canvas').evaluate((e) => {
    e.style.opacity = '1';
    window.ap28Probe.delayRender = 25;
  });
  runs.push({
    name: 'slow-render-25ms',
    window: 0,
    measurement: await windowMeasurement(page, true, 0, 60),
  });
  await page.evaluate(() => {
    window.ap28Probe.delayRender = 0;
  });
  runs.push({
    name: 'slow-main-25ms',
    window: 0,
    measurement: await windowMeasurement(page, true, 25, 60),
  });
  await mkdir('test-results/ap28', { recursive: true });
  await writeFile(
    'test-results/ap28/diagnostic.json',
    JSON.stringify(
      {
        commit: process.env.GITHUB_SHA,
        source: process.env.AP28_SOURCE ?? process.env.GITHUB_SHA,
        node: process.version,
        browser: browser.version(),
        runner: {
          os: platform(),
          release: release(),
          cpu: cpus()[0]?.model,
          cpus: cpus().length,
          image: process.env.ImageVersion,
        },
        parallelIndex: info.parallelIndex,
        geometry,
        runs,
      },
      null,
      2,
    ),
  );
  const slowRender = runs.find(
    (r) => r.name === 'slow-render-25ms',
  )?.measurement;
  const slowMain = runs.find((r) => r.name === 'slow-main-25ms')?.measurement;
  expect(slowRender?.renderP95Ms).toBeGreaterThan(16.67);
  expect(slowRender?.observedRafFps).toBeLessThan(55);
  expect(slowMain?.observedRafFps).toBeLessThan(55);
});
