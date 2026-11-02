import {
  chromium,
  expect,
  test,
  type CDPSession,
  type Page,
} from '@playwright/test';
import { resolve } from 'node:path';
import { rm, writeFile } from 'node:fs/promises';
import { checkSettingsFocus } from './settingsFocus';
import { tabTo } from './qa-setup';

async function captureNative(cdp: CDPSession, path: string): Promise<Buffer> {
  // Page.screenshot clips in CSS coordinates at native tab zoom. CDP without
  // a clip captures the entire physical viewport, as required for visual QA.
  const result = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
  });
  const data = Buffer.from(result.data, 'base64');
  await writeFile(path, data);
  return data;
}

async function fits(page: Page, selector: string): Promise<void> {
  await expect
    .poll(() =>
      page.locator(selector).evaluate((node) => {
        const rect = node.getBoundingClientRect();
        return (
          node.scrollWidth <= node.clientWidth + 1 &&
          rect.left >= -1 &&
          rect.right <= innerWidth + 1
        );
      }),
    )
    .toBe(true);
}

// Reuse AP19/AP20's local-only extension for actual tab zoom, not CSS zoom,
// pinch zoom or emulated device metrics. The profile is discarded afterwards.
test('settings and nested accent fit narrow desktop at native 100/200% zoom', async ({
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
    locale: 'de-DE',
    args: [
      '--screen-info={1920x1080}',
      '--window-size=1280,900',
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
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`${String(info.project.use.baseURL)}/m8e-calc/#/simple`);
    await expect(page.locator('.calculator-announcement')).toHaveText('0');
    await page.evaluate(() => document.fonts.ready);
    const cdp = await context.newCDPSession(page);
    const { windowId } = await cdp.send('Browser.getWindowForTarget');
    await cdp.send('Browser.setContentsSize', {
      windowId,
      width: 1280,
      height: 900,
    });
    await expect
      .poll(() => page.evaluate(() => [innerWidth, innerHeight]))
      .toEqual([1280, 900]);
    const initial = await page.evaluate(() => ({
      width: innerWidth,
      dpr: devicePixelRatio,
    }));
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
      expect(actual).toBeCloseTo(zoom);
      await expect
        .poll(() => page.evaluate(() => devicePixelRatio))
        .toBeCloseTo(initial.dpr * zoom);
      expect(await page.evaluate(() => innerWidth)).toBeCloseTo(
        initial.width / zoom,
        -1,
      );
      const layout = await cdp.send('Page.getLayoutMetrics');
      expect(
        layout.layoutViewport.clientWidth /
          layout.cssLayoutViewport.clientWidth,
      ).toBeCloseTo(zoom);
      await fits(page, '.shell-toolbar');
      const opener = page.getByRole('button', {
        name: 'Einstellungen',
        exact: true,
      });
      await opener.click();
      await fits(page, '.settings-dialog');
      await expect(page.locator('.settings-dialog')).not.toHaveAttribute(
        'data-entering',
      );
      const focusSamples = await checkSettingsFocus(
        page,
        page.getByRole('dialog', { name: 'Einstellungen', exact: true }),
      );
      await info.attach(`settings-focus-${zoom}`, {
        body: JSON.stringify(focusSamples),
        contentType: 'application/json',
      });
      if (zoom === 2) {
        const dialog = page.getByRole('dialog', {
          name: 'Einstellungen',
          exact: true,
        });
        const reset = dialog.getByRole('button', {
          name: 'Einstellungen und Verlauf zurücksetzen',
          exact: true,
        });
        await tabTo(page, reset);
        await page.keyboard.press('Enter');
        await info.attach('settings-confirmation-focus-200', {
          body: JSON.stringify(await checkSettingsFocus(page, dialog)),
          contentType: 'application/json',
        });
        const confirmation = dialog.getByRole('region', {
          name: 'Einstellungen und Verlauf zurücksetzen?',
        });
        await tabTo(
          page,
          confirmation.getByRole('button', { name: 'Abbrechen', exact: true }),
        );
        await page.keyboard.press('Enter');
        await expect(reset).toBeFocused();
      }
      const settingsImage = await captureNative(
        cdp,
        info.outputPath(`settings-zoom-${zoom}.png`),
      );
      expect(settingsImage.readUInt32BE(16)).toBe(initial.width * initial.dpr);
      await info.attach(`settings-zoom-${zoom}`, {
        body: settingsImage,
        contentType: 'image/png',
      });
      const trigger = page.getByRole('button', {
        name: 'Akzentfarbe anpassen',
      });
      await trigger.click();
      await expect(page.getByRole('button', { name: 'Iris' })).toBeFocused();
      await fits(page, '.accent-popover');
      await expect(page.locator('.accent-popover')).not.toHaveAttribute(
        'data-entering',
      );
      const accentImage = await captureNative(
        cdp,
        info.outputPath(`accent-zoom-${zoom}.png`),
      );
      expect(accentImage.readUInt32BE(16)).toBe(initial.width * initial.dpr);
      await info.attach(`accent-zoom-${zoom}`, {
        body: accentImage,
        contentType: 'image/png',
      });
      await page.getByRole('button', { name: /Schema-Variante/ }).click();
      await expect(page.getByRole('listbox')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(
        page.getByRole('dialog', { name: 'Deine Farbwelt' }),
      ).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(trigger).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(opener).toBeFocused();
    }
  } finally {
    await context.close();
    await rm(profile, { recursive: true, force: true });
  }
});
