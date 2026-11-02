import { expect, test } from '@playwright/test';
import { t } from '../src/shared/i18n/extended';
import { ready } from './qa-setup';

test.use({ serviceWorkers: 'block' });

for (const locale of ['de', 'en'] as const) {
  test.describe(`local-only ${locale}`, () => {
    test.use({ locale: locale === 'de' ? 'de-DE' : 'en-US' });

    test('old settings and caches cannot restore removed functionality', async ({
      page,
    }) => {
      const external: string[] = [];
      page.on('request', (request) => {
        const url = new URL(request.url());
        if (
          ['http:', 'https:'].includes(url.protocol) &&
          url.origin !== 'http://127.0.0.1:4173'
        )
          external.push(request.url());
      });
      await page.addInitScript((language) => {
        localStorage.setItem(
          'm8e-calc.settings',
          JSON.stringify({
            version: 4,
            state: {
              language,
              onlineRates: true,
              grouping: false,
              motionLevel: 'off',
            },
          }),
        );
        localStorage.setItem('m8e-calc.currency-rates', 'retired snapshot');
        localStorage.setItem('m8e-calc.currency-rates.last-attempt', '123');
      }, locale);
      await page.goto('/m8e-calc/#/convert');
      await ready(page, 'convert');
      await expect(page.locator('.convert-category-grid button')).toHaveCount(
        32,
      );
      const persisted = await page.evaluate(() => ({
        settings: JSON.parse(
          localStorage.getItem('m8e-calc.settings') ?? 'null',
        ),
        cache: localStorage.getItem('m8e-calc.currency-rates'),
        attempt: localStorage.getItem('m8e-calc.currency-rates.last-attempt'),
      }));
      expect(persisted.settings.version).toBe(5);
      expect(persisted.settings.state.grouping).toBe(false);
      expect(persisted.settings.state).not.toHaveProperty('onlineRates');
      expect(persisted.cache).toBeNull();
      expect(persisted.attempt).toBeNull();
      await page
        .getByRole('button', { name: t('shell.settings', locale), exact: true })
        .click();
      const dialog = page.getByRole('dialog', {
        name: t('shell.settings', locale),
      });
      await expect(dialog.getByRole('switch')).toHaveCount(2);
      const policy = await page
        .locator('meta[http-equiv="Content-Security-Policy"]')
        .getAttribute('content');
      expect(policy?.split(';').map((part) => part.trim())).toContain(
        "connect-src 'self'",
      );
      await dialog
        .getByRole('button', { name: t('ui.close', locale), exact: true })
        .click();
      for (const mode of [
        'simple',
        'scientific',
        'graph',
        'convert',
      ] as const) {
        await page.goto(`/m8e-calc/#/${mode}`);
        await ready(page, mode);
      }
      expect(external).toEqual([]);
    });

    test('searchable selects open settings without browser errors', async ({
      page,
    }) => {
      await page.addInitScript(() => {
        const errors: string[] = [];
        window.addEventListener('error', (event) => errors.push(event.message));
        Object.defineProperty(window, '__selectWindowErrors', {
          value: errors,
        });
      });
      await page.goto('/m8e-calc/#/convert');
      await page
        .getByRole('button', { name: t('shell.settings', locale), exact: true })
        .click();
      const dialog = page.getByRole('dialog', {
        name: t('shell.settings', locale),
      });
      await expect(dialog).toBeVisible();
      await expect(
        page.locator('.convert-field:not(.convert-target) .ui-select input'),
      ).toHaveCount(1);
      await expect(
        page.locator('.convert-target .ui-select input'),
      ).toHaveCount(1);
      await page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
      });
      expect(
        await page.evaluate(() => Reflect.get(window, '__selectWindowErrors')),
      ).toEqual([]);
      await expect(
        page.getByText(t('error.global', locale), { exact: true }),
      ).toHaveCount(0);
    });
  });
}
