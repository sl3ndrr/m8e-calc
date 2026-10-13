import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { t } from '../src/shared/i18n';

test.beforeEach(async ({ page }) => {
  await page.goto('/m8e-calc/#/convert');
  await expect(
    page.getByRole('heading', { name: t('convert.title') }),
  ).toBeVisible();
});
test('conversion, target editing, paste, swap and keyboard shortcuts', async ({
  page,
}) => {
  const from = page.getByRole('textbox', {
    name: t('convert.from'),
    exact: true,
  });
  const to = page.getByRole('textbox', { name: t('convert.to'), exact: true });
  await from.fill('5');
  await expect(to).toHaveValue('3,106856');
  await page.getByRole('button', { name: t('convert.swap') }).click();
  await expect(to).toHaveValue('5');
  await page.keyboard.press('Control+Shift+S');
  await expect(from).toHaveValue('5');
  await to.fill('2');
  await expect(from).toHaveValue('3,218688');
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await from.focus();
  await from.press('Control+A');
  await page.evaluate(async () => navigator.clipboard.writeText('1.234,5'));
  await page.keyboard.press('Control+V');
  await expect(from).toHaveValue('1.234,5');
  await page.getByRole('heading', { name: t('convert.title') }).click();
  await page.keyboard.press('7');
  await expect(from).toBeFocused();
  await expect(from).toHaveValue('7');
});
test('quick entry, searchable grouped units, compound output and special cases', async ({
  page,
}) => {
  const quick = page.getByRole('textbox', {
    name: t('convert.quick'),
    exact: true,
  });
  await page.keyboard.press('/');
  await expect(quick).toBeFocused();
  await quick.fill('72 °F -> °C');
  await quick.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Temperatur', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('textbox', { name: t('convert.to'), exact: true }),
  ).toHaveValue('22,222222');
  await quick.fill('40 in -> ft');
  await quick.press('Enter');
  await page.getByRole('checkbox', { name: t('convert.compound') }).check();
  await expect(page.locator('.convert-compound')).toHaveText('3 ft 4 in');
  await page.getByRole('button', { name: t('convert.favorite') }).click();
  const picker = page.getByRole('combobox', { name: t('convert.fromUnit') });
  await picker.fill('Kilometer');
  await page.getByRole('option', { name: 'km · Kilometer' }).click();
  await quick.fill('1 Mach in m/s');
  await quick.press('Enter');
  await expect(page.getByText(t('convert.machNote'))).toBeVisible();
  await quick.fill('1 year in s');
  await quick.press('Enter');
  await expect(page.getByText(t('convert.yearNote'))).toBeVisible();
  await quick.fill('-1 K in °C');
  await quick.press('Enter');
  await expect(page.getByText(t('convert.error.E_UNIT_DOMAIN'))).toBeVisible();
});
test('quiet history replaces pairs, restores and survives reload with favorites', async ({
  page,
}) => {
  const from = page.getByRole('textbox', {
    name: t('convert.from'),
    exact: true,
  });
  await from.fill('5');
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem('m8e-calc.history') ?? '{}').state
            ?.entries?.length ?? 0,
      ),
    )
    .toBe(1);
  await from.fill('6');
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem('m8e-calc.history') ?? '{}').state
            ?.entries?.[0]?.payload?.value,
      ),
    )
    .toBe('6');
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem('m8e-calc.history') ?? '{}').state
            ?.entries?.length,
      ),
    )
    .toBe(1);
  await page.getByRole('button', { name: t('convert.favorite') }).click();
  const quick = page.getByRole('textbox', {
    name: t('convert.quick'),
    exact: true,
  });
  await quick.fill('72 °F -> °C');
  await quick.press('Enter');
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem('m8e-calc.history') ?? '{}').state
            ?.entries?.length,
      ),
    )
    .toBe(2);
  await page.getByRole('heading', { name: t('convert.title') }).click();
  await page.keyboard.press('Control+h');
  await page.locator('.history-restore').filter({ hasText: '6 km' }).click();
  await expect(from).toHaveValue('6');
  await page.reload();
  await expect(
    page
      .getByRole('region', { name: t('convert.favorites'), exact: true })
      .getByRole('button', { name: 'Länge: km nach mi laden' }),
  ).toBeVisible();
});
test('category grid arrows, copying, reduced motion and accessibility', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const category = page.locator('.convert-category-grid button').first();
  await category.focus();
  await page.keyboard.press('ArrowRight');
  await expect(
    page.locator('.convert-category-grid button').nth(1),
  ).toBeFocused();
  await page
    .getByRole('textbox', { name: t('convert.quick'), exact: true })
    .fill('5 km in mi');
  await page.getByRole('button', { name: t('convert.apply') }).click();
  await page
    .getByRole('button', { name: 'Meter kopieren', exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe('5.000 m');
  expect(
    await page
      .locator('.convert-main')
      .evaluate((node) => getComputedStyle(node).animationName),
  ).toBe('none');
  const result = await new AxeBuilder({ page })
    .include('.convert-mode')
    .analyze();
  expect(result.violations).toEqual([]);
});
for (const [width, height] of [
  [1920, 1080],
  [3840, 2160],
]) {
  test(`converter screenshot ${width}×${height}`, async ({ page }) => {
    if (!width || !height) throw new Error('Missing viewport');
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page
      .getByRole('textbox', { name: t('convert.quick'), exact: true })
      .fill('5 km in mi');
    await page.getByRole('button', { name: t('convert.apply') }).click();
    await expect(
      page.getByRole('textbox', { name: t('convert.to'), exact: true }),
    ).toHaveValue('3,106856');
    await page.screenshot({
      path: `test-results/convert-${width}x${height}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
}
