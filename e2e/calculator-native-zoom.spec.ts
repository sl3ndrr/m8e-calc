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
      const capture = async () => {
        await viewport.scrollIntoViewIfNeeded();
        const rect = await viewport.evaluate((node) => {
          const r = node.getBoundingClientRect();
          return {
            x: r.left + scrollX,
            y: r.top + scrollY,
            width: r.width,
            height: r.height,
          };
        });
        // CDP clips use DIP; native browser zoom changes CSS-to-DIP mapping.
        // Locator screenshots otherwise crop the wrong part of the page.
        const result = await cdp.send('Page.captureScreenshot', {
          format: 'png',
          captureBeyondViewport: true,
          clip: {
            x: rect.x * dipScale,
            y: rect.y * dipScale,
            width: rect.width * dipScale,
            height: rect.height * dipScale,
            scale: 1,
          },
        });
        return Buffer.from(result.data, 'base64');
      };
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
        const clipped = await capture();
        const inkPixels = await page.evaluate(async (png) => {
          const bytes = Uint8Array.from(atob(png), (c) => c.charCodeAt(0));
          const bitmap = await createImageBitmap(
            new Blob([bytes], { type: 'image/png' }),
          );
          const canvas = document.createElement('canvas');
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          const ctx = canvas.getContext('2d');
          const ink = document.querySelector('.calculator-value');
          if (!ctx || !ink) throw Error('Missing screenshot decoder or result');
          ctx.drawImage(bitmap, 0, 0);
          const pixels = ctx.getImageData(
            0,
            0,
            canvas.width,
            canvas.height,
          ).data;
          const [red = 0, green = 0, blue = 0] = (
            getComputedStyle(ink).color.match(/\d+/g) ?? []
          ).map(Number);
          let count = 0;
          for (let i = 0; i < pixels.length; i += 4) {
            if (
              Math.abs((pixels[i] ?? 0) - red) < 8 &&
              Math.abs((pixels[i + 1] ?? 0) - green) < 8 &&
              Math.abs((pixels[i + 2] ?? 0) - blue) < 8
            )
              count++;
          }
          bitmap.close();
          return count;
        }, clipped.toString('base64'));
        expect(
          inkPixels,
          `blank native zoom capture at ${zoom}`,
        ).toBeGreaterThan(50);
        const override = await page.addStyleTag({
          content: '.calculator-character { overflow: visible !important; }',
        });
        expect(
          clipped.equals(await capture()),
          `ink at ${zoom}: ${sequence}`,
        ).toBe(true);
        await override.evaluate((node) => node.parentNode?.removeChild(node));
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
