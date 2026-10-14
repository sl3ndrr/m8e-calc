import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { t } from '../src/shared/i18n';
import { currencyCodes } from '../src/units/currency';
import {
  RATE_CACHE_KEY,
  RATE_ENDPOINT,
} from '../src/features/convert/currency/rates';
const today = new Date().toISOString().slice(0, 10);
const rows = currencyCodes
  .filter((code) => code !== 'EUR')
  .map((quote) => ({
    base: 'EUR',
    quote,
    rate: quote === 'USD' ? 1.25 : quote === 'GBP' ? 0.8 : 1,
    date: today,
  }));
async function toggleConsent(page: Page): Promise<void> {
  await page
    .getByRole('button', { name: t('shell.settings'), exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: t('shell.settings') });
  const control = dialog.getByRole('switch', { name: t('currency.online') });
  const wasEnabled = await control.isChecked();
  await dialog.getByText(t('currency.online'), { exact: true }).click();
  await expect(control).toBeChecked({ checked: !wasEnabled });
  await dialog
    .getByRole('button', { name: t('ui.close'), exact: true })
    .click();
}
async function openCurrency(page: Page): Promise<void> {
  await page
    .getByRole('button', { name: t('currency.category'), exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: t('currency.category'), exact: true }),
  ).toBeVisible();
}
test('opt-in off: no external requests, no currency category, including stored cache', async ({
  page,
}) => {
  const external: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== 'http://127.0.0.1:4173')
      external.push(request.url());
  });
  await page.addInitScript(
    ({ key, rates, date }) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          source: 'ecb-frankfurter',
          date,
          fetchedAt: Date.now(),
          rates,
        }),
      );
    },
    {
      key: RATE_CACHE_KEY,
      date: today,
      rates: {
        EUR: '1',
        ...Object.fromEntries(rows.map((row) => [row.quote, String(row.rate)])),
      },
    },
  );
  await page.route(`${RATE_ENDPOINT}**`, (route) => route.abort());
  await page.goto('/m8e-calc/#/convert');
  await expect(
    page.getByRole('heading', { name: t('convert.title') }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: t('currency.category'), exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole('textbox', { name: t('convert.from'), exact: true })
    .fill('100');
  await page.reload();
  await expect(
    page.getByRole('heading', { name: t('convert.title') }),
  ).toBeVisible();
  expect(external).toEqual([]);
});
test('opt-in on: exactly one request, local conversion and cache; manual refresh and revocation', async ({
  page,
}) => {
  let requests = 0;
  await page.route(`${RATE_ENDPOINT}**`, async (route) => {
    requests++;
    expect(new URL(route.request().url()).pathname).toBe(
      '/v2/providers/ecb/rates',
    );
    expect(route.request().headers().referer).toBeUndefined();
    await route.fulfill({ json: rows });
  });
  await page.goto('/m8e-calc/#/convert');
  await toggleConsent(page);
  await openCurrency(page);
  await expect(page.locator('.currency-date')).toContainText('Stand:');
  await page
    .getByRole('textbox', { name: t('convert.from'), exact: true })
    .fill('100');
  await expect(
    page.getByRole('status').filter({ hasText: t('currency.source') }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('region', { name: t('currency.category'), exact: true })
      .getByLabel(t('convert.result'), { exact: true }),
  ).toContainText('125');
  expect(requests).toBe(1);
  expect(await page.locator('.currency-panel .convert-unit-card').count()).toBe(
    30,
  );
  const picker = page.getByRole('combobox', { name: t('convert.toUnit') });
  await picker.fill('GBP');
  await page.getByRole('option', { name: /GBP/ }).click();
  await expect(
    page.getByLabel(t('convert.result'), { exact: true }),
  ).toContainText('80');
  await page
    .getByRole('button', { name: t('convert.swap'), exact: true })
    .click();
  expect(requests).toBe(1);
  await page.reload();
  await openCurrency(page);
  await expect(page.locator('.currency-date')).toContainText('Stand:');
  expect(requests).toBe(1);
  await page.getByRole('button', { name: t('currency.refresh') }).click();
  await expect.poll(() => requests).toBe(2);
  await toggleConsent(page);
  await expect(
    page.getByRole('button', { name: t('currency.category'), exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('.currency-panel')).toHaveCount(0);
  expect(requests).toBe(2);
});
test('loading, API errors and offline stale fallback remain usable', async ({
  page,
  context,
}) => {
  let finish: (() => void) | undefined;
  const held = new Promise<void>((resolve) => {
    finish = resolve;
  });
  await page.route(`${RATE_ENDPOINT}**`, async (route) => {
    await held;
    await route.fulfill({ status: 503, json: {} });
  });
  await page.goto('/m8e-calc/#/convert');
  await toggleConsent(page);
  await openCurrency(page);
  await expect(
    page.getByRole('progressbar', { name: t('currency.loading') }),
  ).toBeVisible();
  finish?.();
  await expect(
    page.getByText(t('currency.error.api'), { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('progressbar', { name: t('currency.loading') }),
  ).toHaveCount(0);
  await page.evaluate(
    ({ key, rates }) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          source: 'ecb-frankfurter',
          date: '2020-01-01',
          fetchedAt: Date.now() - 2 * 86400000,
          rates: { ...rates, EUR: '1' },
        }),
      );
    },
    {
      key: RATE_CACHE_KEY,
      rates: Object.fromEntries(
        rows.map((row) => [row.quote, String(row.rate)]),
      ),
    },
  );
  await toggleConsent(page);
  await page.evaluate(() => {
    window.location.hash = '#/simple';
  });
  await expect(
    page.getByRole('heading', { name: t('simple.title') }),
  ).toBeVisible();
  await context.setOffline(true);
  await toggleConsent(page);
  await page.evaluate(() => {
    window.location.hash = '#/convert';
  });
  await openCurrency(page);
  await expect(page.locator('.currency-date')).toContainText('2020');
  await expect(
    page.getByText(t('currency.stale'), { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(t('currency.fallback'), { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: t('convert.title') }),
  ).toBeVisible();
  await context.setOffline(false);
});
test('currency UI accessibility and review screenshots', async ({ page }) => {
  await page.route(`${RATE_ENDPOINT}**`, (route) =>
    route.fulfill({ json: rows }),
  );
  await page.goto('/m8e-calc/#/convert');
  await toggleConsent(page);
  await openCurrency(page);
  await expect(page.locator('.currency-date')).toContainText('Stand:');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1920, height: 1080 });
  expect(
    (await new AxeBuilder({ page }).include('.currency-panel').analyze())
      .violations,
  ).toEqual([]);
  const lastCurrency = page
    .locator('.currency-panel .convert-unit-card')
    .last();
  await lastCurrency.scrollIntoViewIfNeeded();
  await expect(lastCurrency).toBeInViewport();
  await page.locator('.currency-panel').evaluate((node) => {
    node.scrollTop = 0;
  });
  await page.screenshot({
    path: 'test-results/currency-light.png',
    fullPage: true,
  });
  await page.evaluate(() => {
    const settings = JSON.parse(
      localStorage.getItem('m8e-calc.settings') ?? '{}',
    );
    settings.state.themeMode = 'dark';
    localStorage.setItem('m8e-calc.settings', JSON.stringify(settings));
  });
  await page.reload();
  await openCurrency(page);
  await page.screenshot({
    path: 'test-results/currency-dark.png',
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
