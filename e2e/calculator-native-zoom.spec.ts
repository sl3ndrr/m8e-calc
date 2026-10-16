import { chromium, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { rm } from 'node:fs/promises';

// A throwaway Chromium profile and local-only extension drive the browser's
// real tab zoom. No CSS zoom, pinch zoom or device-metrics emulation is used.
test('native browser zoom 100/125/150/200 preserves complete result ink', async ({
  browserName,
}, info) => {
  expect(browserName).toBe('chromium');
  test.slow();
  const profile = info.outputPath('zoom-profile');
  const extension = resolve('e2e/fixtures/ap19-zoom');
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium',
    headless: true,
    viewport: null,
    // Override the Desktop Chrome fixture's default DPR so the browser owns it.
    deviceScaleFactor: undefined,
    locale: 'de-DE',
    args: [
      '--window-size=1920,1080',
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
    ],
  });
  await context.tracing.start({
    screenshots: true,
    snapshots: true,
    sources: true,
  });
  try {
    const worker =
      context.serviceWorkers()[0] ??
      (await context.waitForEvent('serviceworker'));
    const controller = await context.newPage();
    await controller.goto(
      `chrome-extension://${new URL(worker.url()).hostname}/controller.html`,
    );
    const page = await context.newPage();
    const baseURL = String(info.project.use.baseURL);
    await page.goto(`${baseURL}/m8e-calc/#/simple`);
    await page.locator('.calculator-value').waitFor();
    await page.evaluate(() => document.fonts.ready);
    const initial = await page.evaluate(() => ({
      width: innerWidth,
      dpr: devicePixelRatio,
    }));
    const measurements = [];
    for (const zoom of [1, 1.25, 1.5, 2]) {
      const actual = await controller.evaluate(
        async ({ zoom, url }) => {
          const api = (
            globalThis as typeof globalThis & {
              chrome: {
                tabs: {
                  query: (query: { url: string }) => Promise<{ id?: number }[]>;
                  setZoom: (id: number, factor: number) => Promise<void>;
                  getZoom: (id: number) => Promise<number>;
                };
              };
            }
          ).chrome.tabs;
          const [tab] = await api.query({ url });
          if (tab?.id === undefined) throw Error('Calculator tab missing');
          await api.setZoom(tab.id, zoom);
          return api.getZoom(tab.id);
        },
        { zoom, url: 'http://127.0.0.1/*' },
      );
      expect(actual).toBeCloseTo(zoom);
      await expect
        .poll(() => page.evaluate(() => devicePixelRatio))
        .toBeCloseTo(initial.dpr * zoom);
      expect(await page.evaluate(() => innerWidth)).toBeCloseTo(
        initial.width / zoom,
        -1,
      );
      const viewport = page.locator('.calculator-viewport');
      for (const sequence of [
        '9',
        '7',
        '8',
        '1/3=',
        '1234567890123456',
        '9999999999999999+1=',
        '0.000000001*0.000000001=',
      ]) {
        await page.keyboard.press('Escape');
        await page.keyboard.type(sequence);
        if (sequence === '1234567890123456')
          await page.locator('[data-key="sign"] button').press('Space');
        await viewport.evaluate(async (node) => {
          await Promise.all(
            node
              .getAnimations({ subtree: true })
              .map((a) => a.finished.catch(() => {})),
          );
        });
        const metrics = await viewport.evaluate((node) => {
          const box = node.getBoundingClientRect();
          const ink = node.querySelector('.calculator-value');
          if (!ink) throw Error('Result missing');
          return {
            value: ink.textContent,
            fontSize: getComputedStyle(ink).fontSize,
            width: innerWidth,
            dpr: devicePixelRatio,
            fits: Array.from(ink.children).every((c) => {
              const r = c.getBoundingClientRect();
              return (
                r.left >= box.left - 0.6 &&
                r.right <= box.right + 0.6 &&
                r.top >= box.top - 0.6 &&
                r.bottom <= box.bottom + 0.6
              );
            }),
          };
        });
        expect(
          metrics.fits,
          JSON.stringify({ zoom, sequence, ...metrics }),
        ).toBe(true);
        const clipped = await viewport.screenshot();
        const override = await page.addStyleTag({
          content: '.calculator-character { overflow: visible !important; }',
        });
        expect(
          clipped.equals(await viewport.screenshot()),
          `ink at ${zoom}: ${sequence}`,
        ).toBe(true);
        await override.evaluate((node) => node.parentNode?.removeChild(node));
        if (sequence === '9')
          await info.attach(`native-zoom-${zoom}`, {
            body: clipped,
            contentType: 'image/png',
          });
        measurements.push({ zoom, sequence, ...metrics });
      }
    }
    await info.attach('native-zoom-metrics', {
      body: JSON.stringify(measurements, null, 2),
      contentType: 'application/json',
    });
  } finally {
    await context.tracing.stop({
      path: info.outputPath('native-zoom-trace.zip'),
    });
    await context.close();
    await rm(profile, { recursive: true, force: true });
  }
});
