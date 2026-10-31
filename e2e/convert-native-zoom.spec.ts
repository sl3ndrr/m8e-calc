import { chromium, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { rm } from 'node:fs/promises';
import { ready } from './qa-setup';
import { t } from '../src/shared/i18n/extended';
import {
  checkConverterGeometry,
  checkConverterLongNames,
  checkConverterScrollAndCopy,
  converterDigits,
  converterScenario,
  converterSettings,
} from './convertLayout';

// AP19's disposable local extension drives actual tab zoom. CSS zoom and DPR
// emulation cannot substitute for getZoom + layout viewport + DPR evidence.
for (const [width, height] of [
  [1280, 900],
  [1920, 1080],
  [3840, 2160],
] as const) {
  for (const locale of ['de', 'en'] as const) {
    for (const theme of ['light', 'dark'] as const) {
      for (const reduced of [false, true]) {
        test(`WP-09 native 100/200% ${width}/${locale}/${theme}/reduced=${reduced}`, async ({
          browserName,
        }, info) => {
          expect(browserName).toBe('chromium');
          const profile = info.outputPath('zoom-profile');
          const extension = resolve('e2e/fixtures/ap19-zoom');
          const context = await chromium.launchPersistentContext(profile, {
            channel: 'chromium',
            headless: true,
            viewport: null,
            deviceScaleFactor: undefined,
            args: [
              `--window-size=${width},${height}`,
              `--disable-extensions-except=${extension}`,
              `--load-extension=${extension}`,
            ],
          });
          try {
            await context.grantPermissions([
              'clipboard-read',
              'clipboard-write',
            ]);
            const worker =
              context.serviceWorkers()[0] ??
              (await context.waitForEvent('serviceworker'));
            const controller = await context.newPage();
            await controller.goto(
              `chrome-extension://${new URL(worker.url()).hostname}/controller.html`,
            );
            const page = await context.newPage();
            await converterSettings(page, locale, theme, reduced);
            await page.goto(
              `${String(info.project.use.baseURL)}/m8e-calc/#/convert`,
            );
            await ready(page, 'convert');
            await expect(page.locator('html')).toHaveAttribute('lang', locale);
            const initial = await page.evaluate(() => ({
              width: innerWidth,
              dpr: devicePixelRatio,
            }));
            const cdp = await context.newCDPSession(page);
            const browserVersion = await cdp.send('Browser.getVersion');
            for (const zoom of [1, 2]) {
              const actual = await controller.evaluate(async (factor) => {
                const api = (
                  globalThis as typeof globalThis & {
                    chrome: {
                      tabs: {
                        query: (query: {
                          url: string;
                        }) => Promise<{ id?: number }[]>;
                        setZoom: (id: number, factor: number) => Promise<void>;
                        getZoom: (id: number) => Promise<number>;
                      };
                    };
                  }
                ).chrome.tabs;
                const [tab] = await api.query({ url: 'http://127.0.0.1/*' });
                if (tab?.id === undefined)
                  throw new Error('Converter tab missing');
                await api.setZoom(tab.id, factor);
                return api.getZoom(tab.id);
              }, zoom);
              expect(actual).toBe(zoom);
              await expect
                .poll(() => page.evaluate(() => devicePixelRatio))
                .toBeCloseTo(initial.dpr * zoom);
              expect(await page.evaluate(() => innerWidth)).toBeCloseTo(
                initial.width / zoom,
                -1,
              );
              const expected = await converterScenario(
                page,
                locale,
                `-1.${converterDigits}e-10000`,
                `-1.${converterDigits}e-9998`,
              );
              await checkConverterGeometry(page, info, `zoom-${zoom}`);
              await checkConverterScrollAndCopy(page, locale, expected);
              const region = page
                .locator('.convert-unit-card')
                .filter({
                  has: page.locator('.convert-unit-symbol', {
                    hasText: /^cm$/,
                  }),
                })
                .getByRole('region');
              for (const key of ['Home', 'End']) {
                await region.scrollIntoViewIfNeeded();
                await region.focus();
                await region.press(key);
                await expect(region).toBeInViewport({ ratio: 1 });
                const bounds = await region.evaluate((node) => {
                  const rect = node.getBoundingClientRect();
                  return {
                    x: rect.x + scrollX,
                    y: rect.y + scrollY,
                    width: rect.width,
                    height: rect.height,
                  };
                });
                const layout = await cdp.send('Page.getLayoutMetrics');
                const scale =
                  layout.layoutViewport.clientWidth /
                  layout.cssLayoutViewport.clientWidth;
                expect(scale).toBeCloseTo(zoom);
                const capture = await cdp.send('Page.captureScreenshot', {
                  format: 'png',
                  captureBeyondViewport: true,
                  clip: {
                    x: bounds.x * scale,
                    y: bounds.y * scale,
                    width: bounds.width * scale,
                    height: bounds.height * scale,
                    scale: 1,
                  },
                });
                await info.attach(`zoom-${zoom}-${key}`, {
                  body: Buffer.from(capture.data, 'base64'),
                  contentType: 'image/png',
                });
              }
              await info.attach(`runtime-${zoom}`, {
                body: JSON.stringify(
                  {
                    zoom: actual,
                    locale,
                    theme,
                    reduced,
                    browser: browserVersion,
                    node: process.version,
                    viewport: await page.evaluate(() => ({
                      width: innerWidth,
                      height: innerHeight,
                      dpr: devicePixelRatio,
                    })),
                  },
                  null,
                  2,
                ),
                contentType: 'application/json',
              });
              await converterScenario(page, locale, '0', '0');
              await page
                .getByRole('button', {
                  name: t('convert.swap', locale),
                  exact: true,
                })
                .press('Space');
              await checkConverterGeometry(page, info, `zero-swap-${zoom}`);
              await checkConverterLongNames(page, locale, info, String(zoom));
            }
          } finally {
            await context.close();
            await rm(profile, { recursive: true, force: true });
          }
        });
      }
    }
  }
}
