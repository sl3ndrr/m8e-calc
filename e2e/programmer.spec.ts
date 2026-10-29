import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { t } from '../src/shared/i18n/extended';
test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 2560, height: 1440 });
  await page.goto('/m8e-calc/#/scientific');
  await page
    .getByRole('button', { name: t('scientific.computerScience'), exact: true })
    .click();
});
test('hex input, bit clicks, widths, expression and history restore', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const panel = page.locator('.programmer-panel'),
    grid = panel.locator('.programmer-word-grid');
  const width8 = panel.getByRole('radio', { name: '8', exact: true });
  await width8.focus();
  await width8.press('Space');
  const hex = panel.getByRole('textbox', { name: t('programmer.hex') });
  await hex.fill('FF');
  await hex.press('Enter');
  await expect(hex).toHaveValue('FF');
  await grid
    .getByRole('switch', {
      name: t('programmer.bit', { index: 7 }),
      exact: true,
    })
    .click();
  await expect(hex).toHaveValue('7F');
  const width64 = panel.getByRole('radio', { name: '64', exact: true });
  await width64.focus();
  await width64.press('Space');
  await expect(grid.getByRole('switch')).toHaveCount(64);
  await hex.fill('FFFFFFFFFFFFFFFF');
  await hex.press('Enter');
  await expect(
    panel.getByRole('textbox', { name: t('programmer.dec'), exact: true }),
  ).toHaveValue('18446744073709551615');
  const editor = page.getByRole('textbox', {
    name: t('scientific.expression'),
  });
  await editor.fill('0xFF & 0b1010');
  await editor.press('Enter');
  await expect(page.locator('.scientific-result-text')).toHaveText('10');
  await expect(hex).toHaveValue('000000000000000A');
  await page
    .getByRole('button', { name: /^Verlauf \d+ ein-\/ausblenden$/ })
    .click();
  await page
    .getByRole('button', {
      name: t('history.restore', { input: '0xFF & 0b1010' }),
    })
    .click();
  await expect(editor).toHaveText('0xFF & 0b1010');
  await editor.press('Enter');
  await expect(page.locator('.scientific-result-text')).toHaveText('10');
});
test('drag paints once, keyboard toggles, IEEE and Unicode', async ({
  page,
}) => {
  const panel = page.locator('.programmer-panel'),
    grid = panel.locator('.programmer-word-grid');
  const a = await grid
      .getByRole('switch', { name: 'Bit 31', exact: true })
      .boundingBox(),
    b = await grid
      .getByRole('switch', { name: 'Bit 28', exact: true })
      .boundingBox();
  if (!a || !b) throw Error('missing bit controls');
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
  await page.mouse.up();
  for (const index of [31, 30, 29, 28])
    await expect(
      grid.getByRole('switch', { name: 'Bit ' + index, exact: true }),
    ).toHaveAttribute('aria-checked', 'true');
  const bit = grid.getByRole('switch', { name: 'Bit 28', exact: true });
  await bit.focus();
  await bit.press('Space');
  await expect(bit).toHaveAttribute('aria-checked', 'false');
  await panel
    .getByRole('textbox', { name: t('programmer.floatValue') })
    .fill('0.1');
  await panel
    .getByRole('textbox', { name: t('programmer.floatValue') })
    .press('Enter');
  await expect(panel.locator('.programmer-exact')).toHaveText(
    '0.100000001490116119384765625',
  );
  await panel
    .getByRole('textbox', { name: t('programmer.character'), exact: true })
    .fill('😀');
  await expect(panel.locator('.programmer-utf8')).toContainText('F0 9F 98 80');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
test('screenshots and scaling', async ({ page }) => {
  for (const width of [1920, 3840])
    for (const dark of [false, true]) {
      await page.setViewportSize({
        width,
        height: width === 1920 ? 1080 : 2160,
      });
      await page.emulateMedia({
        colorScheme: dark ? 'dark' : 'light',
        reducedMotion: 'reduce',
      });
      await page
        .getByRole('textbox', { name: t('programmer.hex') })
        .fill('DEADBEEF');
      await page
        .getByRole('textbox', { name: t('programmer.hex') })
        .press('Enter');
      await expect(page.locator('.programmer-word-grid')).toBeVisible();
      const formulas = page.locator('.scientific-result-card .katex');
      await expect(formulas).toHaveCount(2);
      await expect(formulas.nth(0)).toBeVisible();
      await expect(formulas.nth(1)).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await page.locator('.scientific-heading').scrollIntoViewIfNeeded();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path:
          'test-results/programmer-' +
          (dark ? 'dark' : 'light') +
          '-' +
          width +
          '.png',
        fullPage: true,
      });
      const ieee = page.locator('.programmer-ieee');
      const numeric = ieee.getByRole('textbox', {
        name: t('programmer.floatValue'),
      });
      await numeric.fill('0.1');
      await numeric.press('Enter');
      await ieee.scrollIntoViewIfNeeded();
      await page.screenshot({
        path:
          'test-results/programmer-ieee-' +
          (dark ? 'dark' : 'light') +
          '-' +
          width +
          '.png',
        fullPage: true,
      });
    }
});
