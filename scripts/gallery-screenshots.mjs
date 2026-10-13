/* global document */
import { chromium } from 'playwright';
import { expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const base =
  process.env.GALLERY_URL ?? 'http://127.0.0.1:4173/m8e-calc/#/design';
const output = process.env.GALLERY_OUTPUT ?? 'docs/screenshots';
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({
      viewport: { width: 1600, height: 1100 },
      colorScheme: theme,
      reducedMotion: 'reduce',
    });
    await page.addInitScript(
      (theme) =>
        localStorage.setItem(
          'm8e-calc.settings',
          JSON.stringify({
            version: 1,
            state: {
              themeMode: theme,
              accent: '#6750a4',
              schemeVariant: 'tonalSpot',
              contrast: 'standard',
              motionLevel: 'off',
            },
          }),
        ),
      theme,
    );
    await page.goto(base);

    await page.evaluate(() => document.fonts.ready);
    await page.locator('[data-component="LoadingIndicator"]').waitFor();
    await page.locator('.component-gallery').screenshot({
      path: `${output}/components-${theme}.png`,
      animations: 'disabled',
    });
    for (const name of ['Dialog', 'SideSheet', 'Popover', 'Menu', 'FabMenu']) {
      const trigger = page
        .locator(`[data-component="${name}"] [data-state="default"] button`)
        .first();
      await trigger.click();
      const overlay = page
        .getByRole(name === 'Menu' || name === 'FabMenu' ? 'menu' : 'dialog')
        .last();
      await overlay.waitFor();
      await page.screenshot({
        path: `${output}/components-${theme}-${name.toLowerCase()}.png`,
        animations: 'disabled',
      });
      await page.keyboard.press('Escape');
      await overlay.waitFor({ state: 'hidden' });
      await expect(trigger).toBeFocused();
    }
    for (const state of ['default', 'focus']) {
      await page.reload();
      await page.evaluate(() => document.fonts.ready);
      const tooltip = page.locator(
        `[data-component="Tooltip"] [data-state="${state}"] button`,
      );
      // Enter with native keyboard focus so capture also verifies accessibility.
      await tooltip.focus();
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      await expect(tooltip).toBeFocused();
      await expect(page.getByRole('tooltip')).toBeVisible();
      await page.screenshot({
        path: `${output}/components-${theme}-tooltip${state === 'focus' ? '-rich' : ''}.png`,
        animations: 'disabled',
      });
      await page.keyboard.press('Escape');
      await page.mouse.move(0, 0);
      await page.getByRole('tooltip').waitFor({ state: 'hidden' });
    }
    await page.locator('[data-component="Snackbar"] button').click();
    await page.getByText('Änderung gespeichert.').waitFor();
    await page.screenshot({
      path: `${output}/components-${theme}-snackbar.png`,
      animations: 'disabled',
    });
    await page.close();
  }
} finally {
  await browser.close();
}
