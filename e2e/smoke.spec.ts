import { expect, test } from '@playwright/test';
import { modes } from '../src/app/routing';
import { t } from '../src/shared/i18n/extended';
test('loads the production build under the Pages base path without external requests', async ({
  page,
  baseURL,
}) => {
  if (!baseURL) throw new Error('Missing Playwright baseURL');
  const external: string[] = [];
  const errors: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== new URL(baseURL).origin)
      external.push(request.url());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400)
      errors.push(`${response.status()} ${response.url()}`);
  });
  await page.goto('/m8e-calc/');
  await expect(
    page.getByRole('heading', { name: t('mode.simple') }),
  ).toBeVisible();
  for (const mode of modes) {
    await page.goto(`/m8e-calc/#/${mode}`);
    await expect(
      page.getByRole('link', { name: t(`mode.${mode}`) }),
    ).toHaveAttribute('aria-current', 'page');
  }
  await expect(page.locator('a[href="#/design"]')).toHaveCount(0);
  await page.goto('/m8e-calc/#/design');
  await expect(
    page.getByRole('heading', { name: t('mode.simple') }),
  ).toBeVisible();
  await expect(page.locator('.design-lab')).toHaveCount(0);
  await page.goto('/m8e-calc/#/unknown');
  await expect(
    page.getByRole('link', { name: t('mode.simple') }),
  ).toHaveAttribute('aria-current', 'page');
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: t('mode.simple') }),
  ).toBeFocused();
  await page.goto('/m8e-calc/');
  await page.screenshot({
    path: 'test-results/foundation.png',
    fullPage: true,
  });
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

test('normal build retains theme and accent controls without exposing the lab', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/m8e-calc/#/simple');
  const dark = page.getByRole('radio', { name: 'Dunkel', exact: true });
  await dark.locator('..').locator('..').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page
    .getByRole('button', { name: 'Einstellungen', exact: true })
    .click();
  await page.getByRole('button', { name: 'Akzentfarbe anpassen' }).click();
  const picker = page.getByRole('dialog', { name: 'Deine Farbwelt' });
  await picker.getByRole('button', { name: 'Koralle', exact: true }).click();
  await expect(picker.getByLabel('Eigene Farbe')).toHaveValue('#e2675a');
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(dark).toBeChecked();
  await page
    .getByRole('button', { name: 'Einstellungen', exact: true })
    .click();
  await page.getByRole('button', { name: 'Akzentfarbe anpassen' }).click();
  await expect(picker.getByLabel('Eigene Farbe')).toHaveValue('#e2675a');
  await expect(page.locator('a[href="#/design"]')).toHaveCount(0);
});
