import {
  chromium,
  expect,
  test,
  type CDPSession,
  type Locator,
} from '@playwright/test';
import { resolve } from 'node:path';
import { rm, writeFile } from 'node:fs/promises';

async function captureControl(control: Locator, cdp: CDPSession, path: string) {
  await control.scrollIntoViewIfNeeded();
  const rect = await control.evaluate((node) => {
    const r = node.getBoundingClientRect();
    return {
      x: r.x + scrollX,
      y: r.y + scrollY,
      width: r.width,
      height: r.height,
    };
  });
  const layout = await cdp.send('Page.getLayoutMetrics');
  const scale =
    layout.layoutViewport.clientWidth / layout.cssLayoutViewport.clientWidth;
  const result = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
    clip: {
      x: rect.x * scale,
      y: rect.y * scale,
      width: rect.width * scale,
      height: rect.height * scale,
      scale: 1,
    },
  });
  await writeFile(path, Buffer.from(result.data, 'base64'));
}

// A throwaway Chromium profile and local-only extension drive the browser's
// real tab zoom. No CSS zoom, pinch zoom or device-metrics emulation is used.
test('checkbox centers at native browser zoom 100/125/150/200', async ({
  browserName,
}, info) => {
  expect(browserName).toBe('chromium');
  test.setTimeout(180_000);
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
    await page.goto(`${baseURL}/m8e-calc/#/design`);
    await page.locator('.ui-checkbox-box').first().waitFor();
    await page.getByLabel('Animationsstufe').selectOption('off');
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
      const layout = await cdp.send('Page.getLayoutMetrics');
      const dipScale =
        layout.layoutViewport.clientWidth /
        layout.cssLayoutViewport.clientWidth;
      expect(dipScale).toBeCloseTo(zoom);
      for (const theme of ['light', 'dark'] as const) {
        await page.emulateMedia({
          colorScheme: theme,
          reducedMotion: 'reduce',
        });
        for (const uiSize of [80, 100, 150]) {
          await page.evaluate((uiSize) => {
            const raw = localStorage.getItem('m8e-calc.settings');
            if (!raw) throw Error('Missing settings');
            const settings = JSON.parse(raw);
            settings.state.uiSize = uiSize;
            localStorage.setItem('m8e-calc.settings', JSON.stringify(settings));
          }, uiSize);
          await page.goto(`${baseURL}/m8e-calc/#/design`);
          await page.reload();
          await page.evaluate(() => document.fonts.ready);
          const row = page.locator('[data-component="Checkbox"]');
          await row.scrollIntoViewIfNeeded();
          const marks = await page
            .locator('.ui-checkbox-box')
            .evaluateAll((boxes) =>
              boxes.flatMap((box) => {
                const b = box.getBoundingClientRect();
                return Array.from(box.children, (mark) => {
                  const r = mark.getBoundingClientRect();
                  return {
                    dx: r.x + r.width / 2 - b.x - b.width / 2,
                    dy: r.y + r.height / 2 - b.y - b.height / 2,
                  };
                });
              }),
            );
          for (const mark of marks) {
            expect(Math.abs(mark.dx)).toBeLessThan(0.6);
            expect(Math.abs(mark.dy)).toBeLessThan(0.6);
          }
          await captureControl(
            row,
            cdp,
            info.outputPath(`checkbox-${theme}-${zoom}-${uiSize}.png`),
          );
          await page.goto(`${baseURL}/m8e-calc/#/graph`);
          const options = page.locator('.graph-options');
          await expect(options.getByRole('checkbox')).toHaveCount(3);
          for (const label of await options.locator('.ui-checkbox').all()) {
            const input = label.getByRole('checkbox');
            if (!(await input.isChecked())) await label.click();
            await expect(input).toBeChecked();
          }
          const graphMarks = await options
            .locator('.ui-checkbox-check')
            .evaluateAll((items) =>
              items.map((mark) => {
                const r = mark.getBoundingClientRect();
                const b = mark.parentElement?.getBoundingClientRect();
                if (!b) throw Error('Missing checkbox box');
                return {
                  dx: r.x + r.width / 2 - b.x - b.width / 2,
                  dy: r.y + r.height / 2 - b.y - b.height / 2,
                };
              }),
            );
          for (const mark of graphMarks) {
            expect(Math.abs(mark.dx)).toBeLessThan(0.6);
            expect(Math.abs(mark.dy)).toBeLessThan(0.6);
          }
          await captureControl(
            options,
            cdp,
            info.outputPath(`graph-${theme}-${zoom}-${uiSize}.png`),
          );
          measurements.push({
            zoom,
            theme,
            uiSize,
            dipScale,
            marks,
            graphMarks,
          });
        }
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
