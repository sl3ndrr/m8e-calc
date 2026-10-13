import { expect, test } from '@playwright/test';
import { modes } from '../src/app/routing';
import { t } from '../src/shared/i18n';
test('loads the production build under the Pages base path without external requests', async ({ page, baseURL }) => {
  const external: string[] = [];
  const errors: string[] = [];
  page.on('request', (request) => { if (new URL(request.url()).origin !== new URL(baseURL!).origin) external.push(request.url()); });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await page.goto('/m8e-calc/');
  await expect(page.getByRole('heading', { name: t('app.foundation') })).toBeVisible();
  for (const mode of modes) {
    await page.goto(`/m8e-calc/#/${mode}`);
    await expect(page.getByRole('link', { name: t(`mode.${mode}`) })).toHaveAttribute('aria-current', 'page');
  }
  await page.goto('/m8e-calc/#/unknown');
  await expect(page.getByRole('link', { name: t('mode.simple') })).toHaveAttribute('aria-current', 'page');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: t('mode.simple') })).toBeFocused();
  await page.goto('/m8e-calc/');
  await page.screenshot({ path: 'test-results/foundation.png', fullPage: true });
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});
