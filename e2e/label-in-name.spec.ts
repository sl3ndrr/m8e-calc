import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { t } from '../src/shared/i18n/extended';
import { qaSetup, ready } from './qa-setup';

test.use({ serviceWorkers: 'block' });

for (const locale of ['de', 'en'] as const) {
  test(`visible labels remain in action names (${locale})`, async ({ page }) => {
    await qaSetup(page);
    await page.addInitScript((language) => {
      const key = 'm8e-calc.settings';
      const settings = JSON.parse(localStorage.getItem(key) ?? '{}');
      settings.state.language = language;
      localStorage.setItem(key, JSON.stringify(settings));
    }, locale);
    await page.goto('/m8e-calc/#/simple');
    await ready(page, 'simple');
    for (const [id, text] of [
      ['MC', 'MC'],
      ['MR', 'MR'],
      ['M+', 'M+'],
      ['M-', 'M−'],
      ['MS', 'MS'],
      ['clearEntry', 'CE'],
      ['sqrt', '√x'],
      ['square', 'x²'],
      ['reciprocal', '1/x'],
    ] as const) {
      const key = page.locator(`[data-key="${id}"] button`);
      await expect(key).toHaveText(text);
      await expect(key).toHaveAccessibleName(t(`simple.${id}`, locale));
    }
    const toggle = page.locator('button[aria-controls="mode-history"]');
    await expect(toggle).toHaveAccessibleName(
      t('history.toggleCount', locale, { count: 0 }),
    );
    await page.keyboard.type('12+3=');
    await expect(page.locator('.calculator-result')).toHaveAccessibleName(
      `15 · ${t('simple.copy', locale)}`,
    );
    await expect(toggle).toHaveAccessibleName(
      t('history.toggleCount', locale, { count: 1 }),
    );
    await toggle.click();
    await expect(page.locator('.history-restore')).toHaveAccessibleName(
      t('history.restore', locale, { input: '12 + 3 15' }),
    );
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

    await page.goto('/m8e-calc/#/scientific');
    await ready(page, 'scientific');
    const editor = page.getByRole('textbox', {
      name: t('scientific.expression', locale),
      exact: true,
    });
    await editor.fill('a = 5');
    await editor.press('Enter');
    await expect(page.locator('.scientific-definition')).toHaveAccessibleName(
      `a = 5 · ${t('scientific.insert', locale, { text: 'a' })}`,
    );
    for (const second of [false, true]) {
      if (second) {
        await page
          .getByRole('button', {
            name: t('scientific.second', locale),
            exact: true,
          })
          .click();
      }
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    }

    await page.goto('/m8e-calc/#/convert');
    await ready(page, 'convert');
    const unit = locale === 'de' ? 'Meter' : 'metre';
    const meter = page.locator('.convert-unit-card button').filter({
      has: page.locator('.convert-unit-name', {
        hasText: new RegExp(`^${unit}$`),
      }),
    });
    await expect(meter).toHaveAccessibleName(
      new RegExp(`${unit} .* m .*${unit}`),
    );
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
}
