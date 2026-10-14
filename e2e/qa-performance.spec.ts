import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { qaSetup, ready } from './qa-setup';
test('editor interaction latency, layout shift and resources across 20 mode cycles', async ({
  page,
  context,
}, info) => {
  test.setTimeout(180000);
  await qaSetup(page);
  await page.addInitScript(() => {
    const metrics = {
      events: [] as number[],
      cls: 0,
      frames: new Set<number>(),
      observers: 0,
    };
    Object.assign(window, { qaMetrics: metrics });
    if (PerformanceObserver.supportedEntryTypes.includes('event'))
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries())
          if ('interactionId' in entry && entry.interactionId)
            metrics.events.push(entry.duration);
      }).observe({
        type: 'event',
        buffered: true,
        durationThreshold: 16,
      } as PerformanceObserverInit);
    if (PerformanceObserver.supportedEntryTypes.includes('layout-shift'))
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries())
          if (
            'hadRecentInput' in entry &&
            !entry.hadRecentInput &&
            'value' in entry &&
            typeof entry.value === 'number'
          )
            metrics.cls += entry.value;
      }).observe({ type: 'layout-shift', buffered: true });
    const raf = window.requestAnimationFrame.bind(window),
      caf = window.cancelAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => {
      const id = raf((time) => {
        metrics.frames.delete(id);
        callback(time);
      });
      metrics.frames.add(id);
      return id;
    };
    window.cancelAnimationFrame = (id) => {
      metrics.frames.delete(id);
      caf(id);
    };
    const Resize = window.ResizeObserver,
      Mutation = window.MutationObserver;
    window.ResizeObserver = class extends Resize {
      targets = new Set<Element>();
      override observe(target: Element, options?: ResizeObserverOptions) {
        if (!this.targets.size) metrics.observers++;
        this.targets.add(target);
        super.observe(target, options);
      }
      override unobserve(target: Element) {
        if (this.targets.delete(target) && !this.targets.size)
          metrics.observers--;
        super.unobserve(target);
      }
      override disconnect() {
        if (this.targets.size) metrics.observers--;
        this.targets.clear();
        super.disconnect();
      }
    };
    window.MutationObserver = class extends Mutation {
      active = false;
      override observe(target: Node, options?: MutationObserverInit) {
        if (!this.active) {
          metrics.observers++;
          this.active = true;
        }
        super.observe(target, options);
      }
      override disconnect() {
        if (this.active) {
          metrics.observers--;
          this.active = false;
        }
        super.disconnect();
      }
    };
  });
  await page.goto('/m8e-calc/#/scientific');
  await ready(page, 'scientific');
  const editor = page.getByRole('textbox', { name: 'Ausdruck', exact: true });
  await editor.focus();
  await page.keyboard.type('sin(30)+sqrt(9)', { delay: 30 });
  await editor.press('Enter');
  await expect(page.locator('.scientific-result-text')).toHaveText('3,5');
  const editorMetrics = await page.evaluate(() => {
    const m = Reflect.get(window, 'qaMetrics') as {
      events: number[];
      cls: number;
    };
    return { events: [...m.events], cls: m.cls };
  });
  // Warm code paths (including the graph editor) before the steady-state sample.
  async function cycleModes() {
    for (const mode of ['scientific', 'graph', 'convert', 'simple']) {
      await page.evaluate((mode) => {
        window.location.hash = '#/' + mode;
      }, mode);
      await ready(page, mode);
      if (mode === 'graph') {
        await page
          .getByRole('button', { name: 'Hinzufügen', exact: true })
          .click();
        await page.locator('.graph-editor [role="textbox"]').fill('sin(x)');
        await expect(page.locator('canvas.graph-canvas')).toHaveAttribute(
          'data-curve-count',
          '1',
        );
      }
    }
  }
  for (let cycle = 0; cycle < 5; cycle++) await cycleModes();
  const cdp = await context.newCDPSession(page);
  await cdp.send('HeapProfiler.enable');
  async function sample() {
    await cdp.send('HeapProfiler.collectGarbage');
    const heap = await cdp.send('Runtime.getHeapUsage');
    const dom = await cdp.send('Memory.getDOMCounters');
    const browser = await page.evaluate(() => {
      const m = Reflect.get(window, 'qaMetrics') as {
        events: number[];
        cls: number;
        frames: Set<number>;
        observers: number;
      };
      return {
        events: m.events,
        cls: m.cls,
        frames: m.frames.size,
        observers: m.observers,
      };
    });
    return { heap: heap.usedSize, ...dom, ...browser };
  }
  const before = await sample();
  // Hash navigation keeps the same document so cleanup is actually exercised.
  for (let cycle = 0; cycle < 20; cycle++) await cycleModes();
  await expect.poll(async () => (await sample()).frames).toBe(0);
  const after = await sample();
  const latency = Math.max(0, ...editorMetrics.events);
  const result = {
    before,
    after,
    editorMetrics,
    editorInteractionMaxMs: latency,
    eventTimingThresholdMs: 16,
    cycles: 20,
    heapGrowthBytes: after.heap - before.heap,
    listenerGrowth: after.jsEventListeners - before.jsEventListeners,
  };
  mkdirSync('test-results/qa', { recursive: true });
  writeFileSync(
    'test-results/qa/runtime.json',
    JSON.stringify(result, null, 2),
  );
  await info.attach('runtime', {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
  expect(latency).toBeLessThanOrEqual(200);
  expect(editorMetrics.cls).toBe(0);
  expect(after.cls - before.cls).toBe(0);
  expect(after.observers).toBeLessThanOrEqual(before.observers);
  expect(after.jsEventListeners - before.jsEventListeners).toBeLessThanOrEqual(
    5,
  );
  expect(after.nodes - before.nodes).toBeLessThanOrEqual(50);
  expect(after.heap - before.heap).toBeLessThan(2_000_000);
});
