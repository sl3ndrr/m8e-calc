import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { currencyCodes } from '../src/units/currency';
import { RATE_ENDPOINT } from '../src/features/convert/currency/rates';
import { qaSetup, ready } from './qa-setup';

// This diagnostic runs only against the pinned, unmodified main build.
// The ordinary browser suites remain the acceptance gate for the repaired app.
const rule = 'label-content-name-mismatch';
for (const scenario of [
  'simple',
  'scientific',
  'convert',
  'currency',
  'gallery',
]) {
  test(`unmodified main: ${scenario}`, async ({ page }, testInfo) => {
    await qaSetup(page);
    await page.setViewportSize({ width: 2560, height: 1440 });
    const gallery = scenario === 'gallery';
    const mode = scenario === 'currency' ? 'convert' : scenario;
    if (scenario === 'currency') {
      const date = new Date().toISOString().slice(0, 10);
      await page.route(`${RATE_ENDPOINT}**`, (route) =>
        route.fulfill({
          json: currencyCodes
            .filter((quote) => quote !== 'EUR')
            .map((quote) => ({
              base: 'EUR',
              quote,
              rate: 1,
              date,
            })),
        }),
      );
    }
    await page.goto(
      gallery
        ? 'http://127.0.0.1:4174/m8e-calc/#/design'
        : `/m8e-calc/#/${mode}`,
    );
    if (gallery) {
      await expect(page.locator('#components')).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
    } else {
      await ready(page, mode);
    }
    if (scenario === 'simple') {
      await page.keyboard.type('12+3=');
      await expect(page.locator('.calculator-announcement')).toHaveText('15');
      await page.locator('button[aria-controls="mode-history"]').click();
      await expect(page.locator('.history-restore')).toBeVisible();
    }
    if (scenario === 'scientific') {
      const editor = page.getByRole('textbox', {
        name: 'Ausdruck',
        exact: true,
      });
      await editor.fill('a = 5');
      await editor.press('Enter');
      await expect(page.locator('.scientific-definition')).toBeVisible();
      await page.getByRole('button', { name: /2nd/ }).click();
    }
    if (scenario === 'currency') {
      await page
        .getByRole('button', { name: 'Einstellungen', exact: true })
        .click();
      const dialog = page.getByRole('dialog', {
        name: 'Einstellungen',
        exact: true,
      });
      await dialog.getByText('Online-Kurse laden', { exact: true }).click();
      await dialog
        .getByRole('button', { name: 'Schließen', exact: true })
        .click();
      await page
        .getByRole('button', { name: 'Währungen', exact: true })
        .click();
      await expect(page.locator('.currency-date')).toContainText('Stand:');
    }
    const defaults = await new AxeBuilder({ page }).analyze();
    const explicit = await new AxeBuilder({ page })
      .withRules([rule])
      .options({
        rules: { [rule]: { enabled: true } },
      })
      .analyze();
    const summarize = (results: typeof defaults) =>
      results.violations
        .filter((violation) => violation.id === rule)
        .flatMap((violation) =>
          violation.nodes.map((node) => ({
            target: node.target,
            html: node.html,
          })),
        );
    const observed = {
      product: 'de0fcd0a0846f56226e148c14f7b3bf5d1cb387f',
      browser: testInfo.project.name,
      playwright: process.env.EVIDENCE_PLAYWRIGHT,
      axe: defaults.testEngine.version,
      scenario,
      defaults: summarize(defaults),
      explicit: summarize(explicit),
    };
    await testInfo.attach('label-evidence.json', {
      body: JSON.stringify(observed, null, 2),
      contentType: 'application/json',
    });
    console.log(JSON.stringify(observed));
    await page.screenshot({ path: testInfo.outputPath('baseline.png') });
    expect(observed.axe).toBe(process.env.EVIDENCE_AXE);
    expect(observed.explicit.length).toBeGreaterThan(0);
    expect(observed.defaults).toEqual(
      observed.axe === '4.13.0' ? [] : observed.explicit,
    );
  });
}
