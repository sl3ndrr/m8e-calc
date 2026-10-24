import { allowClipboard } from './clipboard';
import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
async function copiedLink(page: Page): Promise<string> {
  await page.getByRole('button', { name: 'Link teilen', exact: true }).click();
  const url = await page.evaluate(() => navigator.clipboard.readText());
  expect(url).toContain('/m8e-calc/#/');
  expect(url).toContain('?v=1&s=');
  return url;
}
test.beforeEach(async ({ page, context }) => {
  await allowClipboard(context);
  await page.setViewportSize({ width: 1920, height: 1080 });
});
test('palette: focus, fuzzy search, arrows, Enter, Escape and conversion preview', async ({
  page,
}) => {
  await page.goto('/m8e-calc/#/simple');
  const trigger = page.getByRole('button', {
    name: 'Befehlspalette',
    exact: true,
  });
  await trigger.focus();
  await page.keyboard.press('Control+k');
  const input = page.getByRole('combobox', {
    name: 'Modus, Aktion, Konstante oder Umrechnung suchen',
  });
  await expect(input).toBeFocused();
  await input.press('Control+k');
  await expect(
    page.getByRole('dialog', { name: 'Befehlspalette' }),
  ).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.press('Control+k');
  await expect(input).toBeFocused();
  await input.fill('wsch');
  await expect(page.getByRole('option')).toContainText('Wissenschaftlich');
  await input.press('Enter');
  await expect(
    page.locator('.mode-stage[data-mode="scientific"]'),
  ).toBeVisible();
  const editor = page.getByRole('textbox', { name: 'Ausdruck', exact: true });
  await editor.focus();
  await page.keyboard.press('Control+k');
  await expect(input).toBeFocused();
  await input.fill('hbar');
  await input.press('Enter');
  await expect(editor).toContainText('hbar');
  await expect(editor).toBeFocused();
  await editor.press('Control+k');
  await input.fill('5 km in mi');
  await expect(page.getByRole('option').first()).toContainText('3,106855961');
  await input.press('ArrowDown');
  await input.press('ArrowUp');
  await expect(input).toHaveAttribute('aria-activedescendant', /-0$/);
  await page.screenshot({
    path: 'docs/screenshots/comfort-palette.png',
    fullPage: true,
  });
  await expect
    .poll(
      async () =>
        (await new AxeBuilder({ page }).include('.command-palette').analyze())
          .violations,
    )
    .toEqual([]);
  await input.press('Escape');
  await expect(editor).toBeFocused();
  await editor.press('Control+k');
  await input.fill('5 km in mi');
  await input.press('Enter');
  await expect(page.locator('.convert-result')).toContainText('3,106856');
});
test('simple permalink restores the editable pending expression', async ({
  page,
}) => {
  await page.goto('/m8e-calc/#/simple');
  await page.locator('.simple-calculator').waitFor();
  await page.keyboard.type('12+3');
  const expression = await page.locator('.calculator-expression').innerText();
  const url = await copiedLink(page);
  await page.goto(url);
  await expect(page.locator('.calculator-expression')).toHaveText(expression);
  await page.getByRole('button', { name: 'Ergebnis berechnen' }).click();
  await expect(page.locator('.calculator-announcement')).toHaveText('15');
});
test('scientific permalink restores expression and angle without executing a definition', async ({
  page,
}) => {
  await page.goto('/m8e-calc/#/scientific?e=sin(30)');
  const editor = page.getByRole('textbox', { name: 'Ausdruck', exact: true });
  await expect(editor).toHaveText('sin(30)');
  await page.getByRole('radio', { name: 'DEG', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  const url = await copiedLink(page);
  await page.goto(url);
  await expect(editor).toHaveText('sin(30)');
  await expect(
    page.getByRole('radio', { name: 'RAD', exact: true }),
  ).toBeChecked();
  await editor.press('Enter');
  await expect(page.locator('.scientific-result-text')).toContainText('-0,988');
});
test('converter permalink restores category, pair and precise value', async ({
  page,
}) => {
  await page.goto('/m8e-calc/#/convert');
  await page
    .getByRole('textbox', { name: 'Schnelleingabe', exact: true })
    .fill('72 °F in °C');
  await page.getByRole('button', { name: 'Übernehmen', exact: true }).click();
  // Sharing is in the quick-entry form, but must not submit a pending query.
  await page
    .getByRole('textbox', { name: 'Schnelleingabe', exact: true })
    .fill('5 km in mi');
  const url = await copiedLink(page);
  await page.goto(url);
  await expect(
    page.getByRole('textbox', { name: 'Von', exact: true }),
  ).toHaveValue('72');
  await expect(page.locator('.convert-category-heading')).toContainText(
    'Temperatur',
  );
  await expect(page.locator('.convert-result')).toContainText('22,222');
});
test('graph permalink restores functions, parameter and viewport', async ({
  page,
}) => {
  await page.goto('/m8e-calc/#/graph');
  await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
  const editor = page.locator('.graph-editor [role="textbox"]').first();
  await editor.fill('a*x^2');
  const slider = page.getByRole('slider', { name: 'a', exact: true });
  await slider.focus();
  await slider.press('ArrowRight');
  await expect(slider).toHaveValue('1.1');
  await page.getByRole('button', { name: 'Vergrößern', exact: true }).click();
  const canvas = page.locator('canvas.graph-canvas');
  await expect
    .poll(
      async () =>
        JSON.parse((await canvas.getAttribute('data-bounds')) ?? '{}').xMax,
    )
    .toBeLessThan(10);
  // Copy after the viewport spring reaches its target.
  await expect
    .poll(
      async () =>
        JSON.parse((await canvas.getAttribute('data-bounds')) ?? '{}').xMax,
    )
    .toBe(10 / 1.3);
  const bounds = await canvas.getAttribute('data-bounds');
  const url = await copiedLink(page);
  await page.goto(url);
  await expect(editor).toHaveText('a*x^2');
  await expect(slider).toHaveValue('1.1');
  await expect(canvas).toHaveAttribute('data-bounds', bounds ?? '');
});
test('invalid links, input shortcut suppression, help, scaling and presentation', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/m8e-calc/#/scientific?v=1&s=invalid');
  const editor = page.getByRole('textbox', { name: 'Ausdruck', exact: true });
  await expect(editor).toHaveText('');
  await editor.fill('sin(30)');
  await editor.press('Enter');
  await expect(page.locator('.scientific-result-text')).toHaveText('0,5');
  await editor.focus();
  const before = await page
    .getByRole('button', { name: /^Verlauf \d+ ein-\/ausblenden$/ })
    .getAttribute('aria-expanded');
  await editor.press('Control+h');
  await expect(
    page.getByRole('button', { name: /^Verlauf \d+ ein-\/ausblenden$/ }),
  ).toHaveAttribute('aria-expanded', before ?? 'false');
  await page.getByRole('button', { name: 'Tastenkürzel', exact: true }).focus();
  await page.keyboard.press('?');
  await expect(
    page.getByRole('dialog', { name: 'Tastenkürzel' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Tastenkürzel' })).toBeHidden();
  await page
    .getByRole('button', { name: 'Einstellungen', exact: true })
    .click();
  const size = page.getByRole('slider', { name: 'UI-Größe', exact: true });
  await size.focus();
  await size.press('End');
  await expect(size).toHaveValue('150');
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('dialog', { name: 'Einstellungen' }),
  ).toBeHidden();
  await page
    .getByRole('button', { name: 'Präsentationsmodus', exact: true })
    .focus();
  await page.keyboard.press('Control+Shift+p');
  await expect(page.locator('.app-shell')).toHaveAttribute(
    'data-presentation',
    'true',
  );
  await expect(page.locator('.shell-rail')).toBeHidden();
  await expect(page.locator('.shell-toolbar')).toBeHidden();
  await expect
    .poll(() =>
      page
        .locator('.scientific-result-card .katex')
        .last()
        .evaluate((node) => parseFloat(getComputedStyle(node).fontSize)),
    )
    .toBeGreaterThan(60);
  await page.screenshot({
    path: 'docs/screenshots/comfort-presentation.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: /Präsentation beenden/ }).click();
  await expect(page.locator('.shell-rail')).toBeVisible();
  expect(errors).toEqual([]);
});
test('PWA installability and all four modes offline after only the first load', async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/m8e-calc/#/simple');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  if (context.browser()?.browserType().name() === 'chromium') {
    const session = await context.newCDPSession(page);
    await expect
      .poll(
        async () =>
          (await session.send('Page.getInstallabilityErrors'))
            .installabilityErrors,
      )
      .toEqual([]);
  }
  const manifest = await page.evaluate(async () => {
    const href = document.querySelector<HTMLLinkElement>(
      'link[rel="manifest"]',
    )?.href;
    return href ? (await fetch(href)).json() : null;
  });
  expect(manifest).toMatchObject({
    start_url: '/m8e-calc/',
    scope: '/m8e-calc/',
    display: 'standalone',
  });
  expect(
    manifest.icons.some((i: { purpose: string }) => i.purpose === 'maskable'),
  ).toBe(true);
  const cachedUrls = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      urls.push(...(await cache.keys()).map((request) => request.url));
    }
    return urls;
  });
  expect(
    cachedUrls.some((url) => /DesignLab|ComponentGallery|MotionDemo/.test(url)),
  ).toBe(false);
  await context.setOffline(true);
  await page.reload();
  await page.locator('.simple-calculator').waitFor();
  // Neither settings nor the color panel was opened before going offline.
  await page
    .getByRole('button', { name: 'Einstellungen', exact: true })
    .click();
  await page.getByRole('button', { name: 'Akzentfarbe anpassen' }).click();
  const picker = page.getByRole('dialog', { name: 'Deine Farbwelt' });
  await picker.getByRole('button', { name: 'Koralle', exact: true }).click();
  await expect(picker.getByLabel('Eigene Farbe')).toHaveValue('#e2675a');
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Akzentfarbe anpassen' }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Einstellungen', exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole('dialog', { name: 'Einstellungen', exact: true }),
  ).toBeHidden();
  await page.keyboard.type('2+3=');
  await expect(page.locator('.calculator-announcement')).toHaveText('5');
  await page.goto('/m8e-calc/#/scientific');
  const editor = page.getByRole('textbox', { name: 'Ausdruck', exact: true });
  await editor.fill('sin(30)');
  await editor.press('Enter');
  await expect(page.locator('.scientific-result-text')).toHaveText('0,5');
  await page.goto('/m8e-calc/#/convert');
  await page
    .getByRole('textbox', { name: 'Schnelleingabe', exact: true })
    .fill('5 km in mi');
  await page.getByRole('button', { name: 'Übernehmen', exact: true }).click();
  await expect(page.locator('.convert-result')).toContainText('3,106856');
  await page.goto('/m8e-calc/#/graph');
  await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
  await page.locator('.graph-editor [role="textbox"]').first().fill('sin(x)');
  await expect(page.locator('canvas.graph-canvas')).toHaveAttribute(
    'data-curve-count',
    '1',
  );
  await expect(page.locator('.graph-error')).toHaveCount(0);
  await page.locator('canvas.graph-canvas').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.graph-trace')).toBeVisible();
  await page.goto('/m8e-calc/#/design?v=1&s=old');
  await expect(page.locator('.simple-calculator')).toBeVisible();
  await expect(page.locator('a[href="#/design"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});
