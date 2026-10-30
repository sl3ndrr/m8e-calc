import { chromium, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { rm, writeFile } from 'node:fs/promises';
import { ready } from './qa-setup';
import { t } from '../src/shared/i18n/extended';

// Same local-only extension as AP19/AP44: real tab zoom, not CSS or DPR emulation.
test('WP-08 native 100/200% zoom keeps the complete exponent selectable and copyable at 1280px', async ({
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
      '--window-size=1280,900',
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
    ],
  });
  try {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const worker =
      context.serviceWorkers()[0] ??
      (await context.waitForEvent('serviceworker'));
    const controller = await context.newPage();
    await controller.goto(
      `chrome-extension://${new URL(worker.url()).hostname}/controller.html`,
    );
    const page = await context.newPage();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(
      `${String(info.project.use.baseURL)}/m8e-calc/#/scientific`,
    );
    await ready(page, 'scientific');
    const initial = await page.evaluate(() => ({
      width: innerWidth,
      dpr: devicePixelRatio,
    }));
    const cdp = await context.newCDPSession(page);
    const evidence = [];
    for (const [locale, theme, decimal] of [
      ['de', 'light', ','],
      ['en', 'dark', '.'],
    ] as const) {
      await page.evaluate(
        ({ locale, theme }) => {
          const settings = JSON.parse(
            localStorage.getItem('m8e-calc.settings') ?? '{}',
          );
          localStorage.setItem(
            'm8e-calc.settings',
            JSON.stringify({
              ...settings,
              state: {
                ...settings.state,
                language: locale,
                themeMode: theme,
                motionLevel: 'off',
                grouping: true,
                decimalSeparator: 'auto',
              },
            }),
          );
        },
        { locale, theme },
      );
      await page.reload();
      await ready(page, 'scientific');
      const editor = page.getByRole('textbox', {
        name: t('scientific.expression', locale),
        exact: true,
      });
      const digits = page.getByRole('slider', {
        name: t('scientific.digits', locale),
      });
      await digits.focus();
      await digits.press('End');
      await page
        .getByRole('button', { name: t('scientific.sci', locale), exact: true })
        .click();
      await editor.fill(
        '-1.234567890123456789012345678901234567890123456789e10000',
      );
      await editor.press('Enter');
      const expected = `-1${decimal}234567890123456789012345678901234567890123456789e+10000`;
      const result = page.locator('.scientific-result-text');
      await expect(result).toHaveText(expected);
      for (const zoom of [1, 2]) {
        const actual = await controller.evaluate(async (zoom) => {
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
          const [tab] = await api.query({ url: 'http://127.0.0.1/*' });
          if (tab?.id === undefined) throw Error('Calculator tab missing');
          await api.setZoom(tab.id, zoom);
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
        await result.scrollIntoViewIfNeeded();
        const geometry = await result.evaluate((node) => {
          const text = node.firstChild;
          if (!text?.textContent) throw Error('Missing result text');
          const selection = getSelection(),
            range = document.createRange();
          range.selectNodeContents(node);
          selection?.removeAllRanges();
          selection?.addRange(range);
          const selected = selection?.toString();
          range.setStart(text, text.textContent.length - 1);
          const end = range.getBoundingClientRect(),
            box = node.getBoundingClientRect();
          return {
            selected,
            width: node.clientWidth,
            scrollWidth: node.scrollWidth,
            height: node.clientHeight,
            scrollHeight: node.scrollHeight,
            endRight: end.right,
            right: box.right,
            endBottom: end.bottom,
            bottom: box.bottom,
          };
        });
        expect(geometry.selected).toBe(expected);
        expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.width);
        expect(geometry.scrollHeight).toBeLessThanOrEqual(geometry.height);
        expect(geometry.endRight).toBeLessThanOrEqual(geometry.right);
        expect(geometry.endBottom).toBeLessThanOrEqual(geometry.bottom);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        const copy = page.getByRole('button', {
          name: t('scientific.copyText', locale),
          exact: true,
        });
        await copy.focus();
        await expect(copy).toBeFocused();
        await copy.press('Enter');
        expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
          expected,
        );
        await page.evaluate(() => document.fonts.ready);
        await result.scrollIntoViewIfNeeded();
        await page.evaluate(() => getSelection()?.removeAllRanges());
        // Native tab zoom changes DIP/CSS coordinates. Use AP19's capture contract
        // so the evidence actually contains the fully visible result, not a crop
        // of the page origin produced by page.screenshot at 200% tab zoom.
        const bounds = await result.evaluate((node) => {
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
        await writeFile(
          info.outputPath(`wp08-zoom-${locale}-${zoom}.png`),
          Buffer.from(capture.data, 'base64'),
        );
        evidence.push({ locale, theme, zoom, actual, geometry });
      }
    }
    await info.attach('wp08-native-zoom', {
      body: JSON.stringify({
        node: process.version,
        browser: context.browser()?.version(),
        initial,
        evidence,
      }),
      contentType: 'application/json',
    });
  } finally {
    await context.close();
    await rm(profile, { recursive: true, force: true });
  }
});
