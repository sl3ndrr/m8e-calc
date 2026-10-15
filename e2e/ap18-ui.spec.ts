import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ready, qaModes, tabTo } from './qa-setup';
import { t } from '../src/shared/i18n';

for (const locale of ['de', 'en'] as const) {
  test(`mode headings, sharing tooltip, keyboard and clipboard feedback (${locale})`, async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    await page.addInitScript((language) => {
      localStorage.setItem(
        'm8e-calc.settings',
        JSON.stringify({
          version: 4,
          state: {
            language,
            themeMode: 'light',
            motionLevel: 'off',
          },
        }),
      );
    }, locale);
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    for (const mode of qaModes) {
      await page.goto(`/m8e-calc/#/${mode}`);
      await ready(page, mode);
      const name = t(`mode.${mode}`, locale);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
      await expect(page.getByRole('main', { name, exact: true })).toBeVisible();
      await expect(page.locator('.mode-stage h1')).toHaveCount(0);
      await expect(
        page.getByText(
          /Einfach rechnen\.|DEIN RAUM FÜR KLARE GEDANKEN|Von der Idee zum Ergebnis\.|Wissenschaftlich rechnen\.|Ein Wert\. Jede Einheit\. Präzise verbunden\.|FUNKTIONEN ENTDECKEN|EINHEITEN · LIVE/,
        ),
      ).toHaveCount(0);
      const share = page.getByRole('button', {
        name: t('comfort.shareLink', locale),
        exact: true,
      });
      await tabTo(page, share);
      await expect(share).toBeFocused();
      await expect(page.getByRole('tooltip')).toHaveText(
        t('comfort.shareLink', locale),
      );
      const size = await share.boundingBox();
      expect(size?.width).toBeGreaterThanOrEqual(48);
      expect(size?.height).toBeGreaterThanOrEqual(48);
      await share.press('Enter');
      await expect(
        page.getByText(t('comfort.linkCopied', locale), { exact: true }),
      ).toBeVisible();
      expect(
        await page.evaluate(() => navigator.clipboard.readText()),
      ).toContain(`#/${mode}?v=1&s=`);
      await page
        .getByRole('button', { name: t('ui.close', locale), exact: true })
        .click();
      await page.evaluate(() => {
        Object.defineProperty(navigator.clipboard, 'writeText', {
          configurable: true,
          value: () => Promise.reject(new Error('denied')),
        });
      });
      await share.click();
      await expect(
        page.getByText(t('comfort.linkError', locale), { exact: true }),
      ).toBeVisible();
      await page
        .getByRole('button', { name: t('ui.close', locale), exact: true })
        .click();
      await page.evaluate(() => {
        Reflect.deleteProperty(navigator.clipboard, 'writeText');
      });
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa'])
            .analyze()
        ).violations,
      ).toEqual([]);
      await page
        .getByRole('button', {
          name: t('comfort.presentation', locale),
          exact: true,
        })
        .click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
      await expect(page.locator('#active-mode-title')).toHaveClass(
        'ui-visually-hidden',
      );
      await expect(page.getByRole('main', { name, exact: true })).toBeVisible();
      await page
        .getByRole('button', {
          name: new RegExp(t('comfort.exitPresentation', locale)),
        })
        .click();
    }
  });
}
