import { chromium, expect, test, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { rm } from 'node:fs/promises';
import {
  captureCalculatorValue,
  calculatorInkPixels,
} from './calculatorCapture';

async function compareDigitEightPixels(
  page: Page,
  clipped: Buffer,
  unclipped: Buffer,
) {
  return page.evaluate(
    async ([clipped, unclipped]) => {
      const decode = async (encoded: string) => {
        const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
        const bitmap = await createImageBitmap(
          new Blob([bytes], { type: 'image/png' }),
        );
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw Error('Missing screenshot decoder');
        ctx.drawImage(bitmap, 0, 0);
        bitmap.close();
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
      };
      const [actual, reference] = await Promise.all([
        decode(clipped),
        decode(unclipped),
      ]);
      const actualSize = [actual.width, actual.height];
      const referenceSize = [reference.width, reference.height];
      let changedPixels = 0;
      let maxRgbDelta = 0;
      let maxAlphaDelta = 0;
      if (
        actual.width === reference.width &&
        actual.height === reference.height
      ) {
        // Equal image dimensions guarantee a channel in both arrays at each offset.
        const channelDelta = (offset: number) =>
          Math.abs(actual.data[offset]! - reference.data[offset]!);
        for (let i = 0; i < actual.data.length; i += 4) {
          const rgbDelta = Math.max(
            channelDelta(i),
            channelDelta(i + 1),
            channelDelta(i + 2),
          );
          const alphaDelta = channelDelta(i + 3);
          if (rgbDelta || alphaDelta) changedPixels++;
          maxRgbDelta = Math.max(maxRgbDelta, rgbDelta);
          maxAlphaDelta = Math.max(maxAlphaDelta, alphaDelta);
        }
      }
      return {
        actualSize,
        referenceSize,
        changedPixels,
        maxRgbDelta,
        maxAlphaDelta,
      };
    },
    [clipped.toString('base64'), unclipped.toString('base64')] as const,
  );
}

// A throwaway Chromium profile and local-only extension drive the browser's
// real tab zoom. No CSS zoom, pinch zoom or device-metrics emulation is used.
test('native browser zoom 100/125/150/200 preserves complete result ink', async ({
  browserName,
}, info) => {
  expect(browserName).toBe('chromium');
  test.slow();
  const profile = info.outputPath('zoom-profile');
  const extension = resolve('e2e/fixtures/native-tab-zoom');
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
    const cdp = await context.newCDPSession(page);
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
      const layout = await cdp.send('Page.getLayoutMetrics');
      const dipScale =
        layout.layoutViewport.clientWidth /
        layout.cssLayoutViewport.clientWidth;
      expect(dipScale).toBeCloseTo(zoom);
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
        const clipped = await captureCalculatorValue(viewport, cdp);
        const inkPixels = await calculatorInkPixels(page, clipped);
        expect(
          inkPixels,
          `blank native zoom capture at ${zoom}`,
        ).toBeGreaterThan(50);
        const override = await page.addStyleTag({
          content: '.calculator-character { overflow: visible !important; }',
        });
        const unclipped = await captureCalculatorValue(viewport, cdp);
        await override.evaluate((node) => node.parentNode?.removeChild(node));
        if (
          process.platform === 'win32' &&
          zoom === 1.5 &&
          metrics.dpr === 1.5 &&
          sequence === '8'
        ) {
          // PR #118 reported four one-level RGB differences in this Windows raster.
          const pixels = await compareDigitEightPixels(
            page,
            clipped,
            unclipped,
          );
          const referenceInk = await calculatorInkPixels(page, unclipped);
          await info.attach('native-zoom-150-digit-8-metrics', {
            body: JSON.stringify({
              ...metrics,
              inkPixels,
              referenceInk,
              ...pixels,
            }),
            contentType: 'application/json',
          });
          expect(pixels.actualSize, 'capture dimensions').toEqual(
            pixels.referenceSize,
          );
          expect(pixels.changedPixels, 'changed pixels').toBeLessThanOrEqual(4);
          expect(pixels.maxRgbDelta, 'maximum RGB delta').toBeLessThanOrEqual(
            1,
          );
          expect(pixels.maxAlphaDelta, 'maximum alpha delta').toBe(0);
          expect(inkPixels, 'visible ink at 150%: 8').toBe(referenceInk);
        } else {
          expect(clipped.equals(unclipped), `ink at ${zoom}: ${sequence}`).toBe(
            true,
          );
        }
        if (sequence === '9')
          await info.attach(`native-zoom-${zoom}`, {
            body: clipped,
            contentType: 'image/png',
          });
        measurements.push({ zoom, sequence, dipScale, inkPixels, ...metrics });
      }
    }
    await info.attach('native-zoom-metrics', {
      body: JSON.stringify(measurements, null, 2),
      contentType: 'application/json',
    });
  } finally {
    await context.close();
    await rm(profile, { recursive: true, force: true });
  }
});
