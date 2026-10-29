import { expect, test, type Page, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { t } from '../src/shared/i18n/extended';
import { qaSetup, ready, tabTo } from './qa-setup';
import { replaceGraphExpression } from './graphEditor';
import { currencyCodes } from '../src/units/currency';
import { RATE_ENDPOINT } from '../src/features/convert/currency/rates';

test.use({ serviceWorkers: 'block' });

// Keep the full scan. Explicit activation also protects against changes to
// axe's default/experimental rule selection; require proof it actually ran.
async function accessible(page: Page) {
  const rule = 'label-content-name-mismatch';
  const result = await new AxeBuilder({ page })
    .options({ rules: { [rule]: { enabled: true } } })
    .analyze();
  expect(result.violations).toEqual([]);
  expect(result.incomplete.filter(({ id }) => id === rule)).toEqual([]);
  expect(result.passes.some(({ id }) => id === rule)).toBe(true);
}

function literal(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function includesText(control: Locator, text: string) {
  await expect(control).toHaveAccessibleName(new RegExp(literal(text)));
}

async function labelText(part: Locator) {
  return part.evaluate((node) => {
    const copy = node.cloneNode(true);
    if (copy instanceof Element)
      copy
        .querySelectorAll('[aria-hidden="true"]')
        .forEach((icon) => icon.remove());
    return copy.textContent?.trim() ?? '';
  });
}

for (const locale of ['de', 'en'] as const) {
  test(`visible labels remain in action names (${locale})`, async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await qaSetup(page, 'light', '#6750a4', locale);
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
    await expect(page.locator('.calculator-announcement')).toHaveCount(1);
    await expect(page.locator('.calculator-announcement')).toHaveText('15');
    await expect(page.locator('.calculator-result [aria-live]')).toHaveCount(0);
    await expect(toggle).toHaveAccessibleName(
      t('history.toggleCount', locale, { count: 1 }),
    );
    await toggle.click();
    await expect(page.locator('.history-restore')).toHaveAccessibleName(
      t('history.restore', locale, { input: '12 + 3 15' }),
    );
    await accessible(page);

    await page.goto('/m8e-calc/#/scientific');
    await ready(page, 'scientific');
    const editor = page.getByRole('textbox', {
      name: t('scientific.expression', locale),
      exact: true,
    });
    await editor.fill('a = 5');
    await editor.press('Enter');
    await expect(page.locator('.scientific-definition')).toHaveAccessibleName(
      `a = 5: ${t('scientific.insert', locale, { text: 'a' })}`,
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
      const derivative = page.locator('.scientific-keypad-panel .keypad-cell');
      if (second) {
        const key = derivative.filter({ hasText: 'd/dx' }).getByRole('button');
        await includesText(key, 'd/dx');
      }
      await accessible(page);
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
    const quick = page.getByRole('textbox', {
      name: t('convert.quick', locale),
      exact: true,
    });
    await quick.fill('5 km in m');
    await quick.press('Enter');
    await expect(meter.locator('strong')).toHaveText(
      locale === 'de' ? '5.000' : '5,000',
    );
    for (const card of await page.locator('.convert-unit-card button').all()) {
      for (const part of await card
        .locator(
          '.convert-unit-name, strong, .convert-unit-symbol, .convert-unit-system',
        )
        .all()) {
        // Decorative icon ligature text is not a visible unit symbol.
        await includesText(card, await labelText(part));
      }
    }
    await accessible(page);

    await page.goto('/m8e-calc/#/graph');
    await ready(page, 'graph');
    await page
      .getByRole('button', { name: t('graph.add', locale), exact: true })
      .click();
    await replaceGraphExpression(
      page.locator('.graph-editor [role="textbox"]').first(),
      'x^2',
    );
    await expect(page.locator('canvas.graph-canvas')).toHaveAttribute(
      'data-curve-count',
      '1',
    );
    // Saving graph history is intentionally debounced; wait for the real entry.
    await expect(
      page.locator('button[aria-controls="mode-history"]'),
    ).toHaveAccessibleName(t('history.toggleCount', locale, { count: 1 }));
    await page.locator('button[aria-controls="mode-history"]').click();
    const restore = page.locator('.history-restore');
    await expect(restore).toHaveCount(1);
    for (const part of await restore.locator('.history-expression > *').all()) {
      await includesText(restore, (await part.innerText()).trim());
    }
    await accessible(page);
  });

  test(`long results, currency names and keyboard focus (${locale})`, async ({
    page,
  }) => {
    await qaSetup(page, 'light', '#6750a4', locale);
    await page.setViewportSize(
      locale === 'de'
        ? { width: 1280, height: 800 }
        : { width: 3840, height: 2160 },
    );
    await page.goto('/m8e-calc/#/simple');
    await ready(page, 'simple');
    await page.keyboard.type('1234567890123456');
    const value =
      locale === 'de' ? '1.234.567.890.123.456' : '1,234,567,890,123,456';
    const result = page.locator('.calculator-result');
    await expect(page.locator('.calculator-announcement')).toHaveText(value);
    await expect(result).toHaveAccessibleName(
      `${value} · ${t('simple.copy', locale)}`,
    );
    await tabTo(page, result);
    await expect(result).toBeFocused();
    await expect(result).toHaveAttribute('data-focus-visible', 'true');
    await accessible(page);

    let requests = 0;
    const date = new Date().toISOString().slice(0, 10);
    await page.route(`${RATE_ENDPOINT}**`, (route) => {
      requests++;
      return route.fulfill({
        json: currencyCodes
          .filter((code) => code !== 'EUR')
          .map((quote) => ({
            base: 'EUR',
            quote,
            rate: quote === 'USD' ? 1.25 : 1,
            date,
          })),
      });
    });
    await page.goto('/m8e-calc/#/convert');
    await ready(page, 'convert');
    expect(requests).toBe(0);
    await page
      .getByRole('button', { name: t('shell.settings', locale), exact: true })
      .click();
    const dialog = page.getByRole('dialog', {
      name: t('shell.settings', locale),
    });
    const consent = dialog.getByRole('switch', {
      name: t('currency.online', locale),
    });
    await consent.focus();
    await consent.press('Space');
    await expect(consent).toBeChecked();
    await dialog
      .getByRole('button', { name: t('ui.close', locale), exact: true })
      .click();
    await page
      .getByRole('button', {
        name: t('currency.category', locale),
        exact: true,
      })
      .click();
    const panel = page.locator('.currency-panel');
    await expect(panel.locator('.currency-date')).toBeVisible();
    expect(requests).toBe(1);
    await expect(panel.locator('.convert-unit-card button')).toHaveCount(30);
    const usd = panel.locator('.convert-unit-card button').filter({
      has: page.locator('.convert-unit-name', { hasText: /^USD ·/ }),
    });
    await expect(usd.locator('strong')).toContainText(
      locale === 'de' ? '1,25' : '1.25',
    );
    for (const card of await panel.locator('.convert-unit-card button').all()) {
      for (const part of await card
        .locator('.convert-unit-name, strong, .convert-unit-symbol')
        .all()) {
        await includesText(card, await labelText(part));
      }
      await expect(card.locator('[aria-live], [role="status"]')).toHaveCount(0);
    }
    await tabTo(page, usd);
    await expect(usd).toBeFocused();
    await expect(usd).toHaveAttribute('data-focus-visible', 'true');
    await accessible(page);
    expect(requests).toBe(1);
  });
}
