import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const result = (page: import('@playwright/test').Page) =>
  page.locator('output.calculator-announcement');
test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/m8e-calc/#/simple');
  await expect(
    page.getByRole('heading', { name: 'Einfach rechnen.' }),
  ).toBeVisible();
});
for (const [sequence, expected] of [
  ['0.1+0.2=', '0,3'],
  ['100+10%=', '110'],
  ['200-10%=', '180'],
  ['50*10%=', '5'],
  ['2+3==', '8'],
  ['5=', '5'],
  ['2+*3=', '6'],
  ['2+3*4=', '20'],
  ['9999999999999999+1=', '1e+16'],
  ['12345678901234567', '1.234.567.890.123.456'],
] as const)
  test(`keyboard only: ${sequence}`, async ({ page }) => {
    await page.keyboard.type(sequence);
    await expect(result(page)).toHaveText(expected);
  });
test('keyboard editing, clear-entry and error recovery', async ({ page }) => {
  await page.keyboard.type('12+99');
  await page.keyboard.press('Delete');
  await page.keyboard.type('43');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Enter');
  await expect(result(page)).toHaveText('16');
  await page.keyboard.press('Escape');
  await page.keyboard.type('1/0=');
  await expect(result(page)).toContainText(
    'Durch null kann nicht geteilt werden.',
  );
  await page.keyboard.press('Escape');
  await page.keyboard.type('5=');
  await expect(result(page)).toHaveText('5');
});
test('keyboard presses light the matching key', async ({ page }) => {
  await page.keyboard.down('7');
  await expect(page.locator('[data-key="7"]')).toHaveAttribute(
    'data-key-pressed',
    'true',
  );
  await page.keyboard.up('7');
  await expect(page.locator('[data-key="7"]')).not.toHaveAttribute(
    'data-key-pressed',
  );
});
test('keyboard toggles history and restores its expression with Tab and Enter', async ({
  page,
}) => {
  await page.keyboard.type('2+3=');
  await page.keyboard.press('Control+h');
  await expect(
    page.getByRole('complementary', { name: 'Verlauf' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(result(page)).toHaveText('0');
  const restore = page.getByRole('button', { name: /Wiederherstellen:/ });
  for (let step = 0; step < 60; step++) {
    if (await restore.evaluate((node) => node === document.activeElement))
      break;
    await page.keyboard.press('Tab');
  }
  await expect(restore).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Eintrag wiederhergestellt.')).toBeVisible();
  // Leave the history control so Enter goes to the calculator command.
  await page.keyboard.press('Control+h');
  await page.keyboard.press('Tab');
  await page.keyboard.type('=');
  await expect(result(page)).toHaveText('5');
  await page.keyboard.press('Control+h');
  await expect(
    page.getByRole('complementary', { name: 'Verlauf' }),
  ).toBeVisible();
});
test('Ctrl+V pastes a localized number', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.evaluate(() => navigator.clipboard.writeText('1.234,5'));
  await page.keyboard.type('5+');
  await page.keyboard.press('Control+v');
  await page.keyboard.press('Enter');
  await expect(result(page)).toHaveText('1.239,5');
});
for (const theme of ['light', 'dark'] as const)
  for (const [width, height] of [
    [1920, 1080],
    [3840, 2160],
  ]) {
    test(`simple screenshot ${theme} ${width}×${height}`, async ({ page }) => {
      await page.setViewportSize({
        width: width ?? 1920,
        height: height ?? 1080,
      });
      await page.evaluate((themeMode) => {
        localStorage.setItem(
          'm8e-calc.settings',
          JSON.stringify({
            version: 2,
            state: {
              language: 'de',
              themeMode,
              motionLevel: 'off',
              decimalSeparator: 'comma',
              grouping: true,
            },
          }),
        );
      }, theme);
      await page.reload();
      await expect(
        page.getByRole('heading', { name: 'Einfach rechnen.' }),
      ).toBeVisible();
      await page.keyboard.type('1250+250=');
      await page.keyboard.press('Escape');
      await page.keyboard.type('100+10%=');
      await page.keyboard.press('Control+h');
      await expect(
        page.getByRole('complementary', { name: 'Verlauf' }),
      ).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      const metrics = await page.evaluate(() => {
        const keypad = document.querySelector('.keypad');
        const stage = document.querySelector('.mode-stage-frame');
        return {
          width: keypad?.getBoundingClientRect().width ?? 0,
          overflow:
            stage instanceof HTMLElement &&
            (stage.scrollWidth > stage.clientWidth + 1 ||
              stage.scrollHeight > stage.clientHeight + 1),
        };
      });
      expect(metrics.width).toBeGreaterThan(
        (width ?? 1920) === 3840 ? 1400 : 700,
      );
      expect(metrics.overflow).toBe(false);
      await page.screenshot({
        path: `test-results/simple-${theme}-${width}.png`,
      });
    });
  }
