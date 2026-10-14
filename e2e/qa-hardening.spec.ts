import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { qaSetup, ready, qaModes, tabTo } from './qa-setup';
// Network-failure injection must reach the network rather than an offline cache.
test.use({ serviceWorkers: 'block' });
for (const theme of ['light', 'dark'])
  for (const seed of ['#6750a4', '#007f82', '#e2675a']) {
    test(`axe all modes ${theme} ${seed}`, async ({ page }) => {
      await qaSetup(page, theme, seed);
      for (const mode of qaModes) {
        await page.goto(`/m8e-calc/#/${mode}`);
        await ready(page, mode);
        if (mode === 'scientific') {
          await page
            .getByRole('textbox', { name: 'Ausdruck', exact: true })
            .fill('sin(30)');
          await page.keyboard.press('Enter');
          await expect(page.locator('.scientific-result-text')).toHaveText(
            '0,5',
          );
        }
        if (mode === 'graph') {
          await page
            .getByRole('button', { name: 'Hinzufügen', exact: true })
            .click();
          await page.locator('.graph-editor [role="textbox"]').fill('sin(x)');
          await expect(page.locator('canvas.graph-canvas')).toHaveAttribute(
            'data-curve-count',
            '1',
          );
        }
        expect(
          (await new AxeBuilder({ page }).analyze()).violations,
          mode,
        ).toEqual([]);
        if (mode === 'scientific') {
          await page
            .getByRole('button', { name: 'Informatik', exact: true })
            .click();
          expect(
            (await new AxeBuilder({ page }).analyze()).violations,
            'programmer',
          ).toEqual([]);
        }
      }
    });
  }
test('keyboard-only core flows and modal/sheet focus restoration', async ({
  page,
}) => {
  await qaSetup(page);
  await page.goto('/m8e-calc/#/simple');
  await ready(page, 'simple');
  await page.keyboard.type('12+3=');
  await expect(page.locator('.calculator-announcement')).toHaveText('15');
  const settings = page.getByRole('button', {
    name: 'Einstellungen',
    exact: true,
  });
  await tabTo(page, settings);
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', {
    name: 'Einstellungen',
    exact: true,
  });
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press('Tab');
    expect(
      await dialog.evaluate((el) => el.contains(document.activeElement)),
    ).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(settings).toBeFocused();
  await page.setViewportSize({ width: 1200, height: 800 });
  const history = page.getByRole('button', {
    name: 'Verlauf ein-/ausblenden',
    exact: true,
  });
  await tabTo(page, history);
  await page.keyboard.press('Enter');
  const sheet = page.getByRole('dialog', { name: 'Verlauf', exact: true });
  await expect(sheet).toBeVisible();
  await page.keyboard.press('Shift+Tab');
  expect(
    await sheet.evaluate((el) => el.contains(document.activeElement)),
  ).toBe(true);
  await page.keyboard.press('Escape');
  await expect(history).toBeFocused();
  await page.keyboard.press('Alt+2');
  await ready(page, 'scientific');
  const editor = page.getByRole('textbox', { name: 'Ausdruck', exact: true });
  await tabTo(page, editor);
  await page.keyboard.type('2+3');
  await page.keyboard.press('Enter');
  await expect(page.locator('.scientific-result-text')).toHaveText('5');
  await page.keyboard.press('Control+k');
  const search = page.getByRole('combobox');
  await expect(search).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(editor).toBeFocused();
  // Alt shortcuts deliberately rest in inputs. Tab back to a shell control before switching.
  await tabTo(page, settings, true);
  await page.keyboard.press('Alt+3');
  await ready(page, 'convert');
  await page.keyboard.press('/');
  await page.keyboard.type('5 km in mi');
  await page.keyboard.press('Enter');
  await expect(page.locator('.convert-result')).toContainText('3,106856');
  await tabTo(page, settings, true);
  await page.keyboard.press('Alt+4');
  await ready(page, 'graph');
  const add = page.getByRole('button', { name: 'Hinzufügen', exact: true });
  await tabTo(page, add);
  await page.keyboard.press('Enter');
  const graphEditor = page.locator('.graph-editor [role="textbox"]').first();
  await tabTo(page, graphEditor);
  await page.keyboard.type('x^2');
  await page.keyboard.press('Enter');
  const canvas = page.locator('canvas.graph-canvas');
  await expect(canvas).toHaveAttribute('data-curve-count', '1');
  await tabTo(
    page,
    page.getByRole('application', { name: 'Interaktive Zeichenfläche' }),
    true,
  );
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.graph-trace')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.graph-trace')).toBeHidden();
});
for (const mode of qaModes)
  test(`200 percent reflow ${mode}`, async ({ page }) => {
    await qaSetup(page);
    // Browser zoom 200% at Full HD exposes a 960×540 CSS viewport; DPR does not simulate zoom.
    await page.setViewportSize({ width: 960, height: 540 });
    await page.goto(`/m8e-calc/#/${mode}`);
    await ready(page, mode);
    if (mode === 'simple') {
      await page.keyboard.type('12+3=');
      await expect(page.locator('.calculator-announcement')).toHaveText('15');
    } else if (mode === 'scientific') {
      const editor = page.getByRole('textbox', {
        name: 'Ausdruck',
        exact: true,
      });
      await editor.fill('2+3');
      await editor.press('Enter');
      await expect(page.locator('.scientific-result-text')).toHaveText('5');
    } else if (mode === 'convert') {
      const quick = page.getByRole('textbox', {
        name: 'Schnelleingabe',
        exact: true,
      });
      await quick.fill('5 km in mi');
      await quick.press('Enter');
      await expect(page.locator('.convert-result')).toContainText('3,106856');
    } else {
      await page
        .getByRole('button', { name: 'Hinzufügen', exact: true })
        .click();
      await page.locator('.graph-editor [role="textbox"]').fill('x^2');
      await expect(page.locator('canvas.graph-canvas')).toHaveAttribute(
        'data-curve-count',
        '1',
      );
    }

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await page.evaluate(() =>
        parseFloat(getComputedStyle(document.documentElement).fontSize),
      ),
    ).toBeGreaterThanOrEqual(16);
    const settings = page.getByRole('button', {
      name: 'Einstellungen',
      exact: true,
    });
    await tabTo(page, settings, true);
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('dialog', { name: 'Einstellungen', exact: true }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(settings).toBeFocused();
  });
for (const storage of ['broken', 'future', 'quota', 'denied'] as const)
  test(`storage ${storage} never crashes any mode`, async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript((storage) => {
      if (storage === 'denied')
        Object.defineProperty(window, 'localStorage', {
          get() {
            throw new DOMException('Denied', 'SecurityError');
          },
        });
      else if (storage === 'quota')
        Storage.prototype.setItem = () => {
          throw new DOMException('Full', 'QuotaExceededError');
        };
      else
        for (const key of [
          'settings',
          'history',
          'scientific',
          'convert',
          'app',
          'theme-cache',
        ])
          localStorage.setItem(
            'm8e-calc.' + key,
            storage === 'broken'
              ? '{broken'
              : JSON.stringify({
                  version: 999,
                  state: { lastMode: [], environment: null },
                }),
          );
    }, storage);
    for (const mode of qaModes) {
      await page.goto(`/m8e-calc/#/${mode}`);
      await ready(page, mode);
      await expect(page.locator(`[data-mode="${mode}"] h1`)).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
test('CSP allows all modes but blocks injected script; no CSP violations in normal use', async ({
  page,
}) => {
  await qaSetup(page);
  await page.addInitScript(() => {
    const violations: string[] = [];
    Object.assign(window, { qaCsp: violations });
    document.addEventListener('securitypolicyviolation', (e) =>
      violations.push(e.violatedDirective),
    );
  });
  for (const mode of qaModes) {
    await page.goto(`/m8e-calc/#/${mode}`);
    await ready(page, mode);
    expect(await page.evaluate(() => Reflect.get(window, 'qaCsp'))).toEqual([]);
  }
  await page.evaluate(() => {
    const s = document.createElement('script');
    s.textContent = 'window.qaInjected=true';
    document.body.append(s);
  });
  expect(
    await page.evaluate(() => Reflect.get(window, 'qaInjected')),
  ).toBeUndefined();
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, 'qaCsp')))
    .toContain('script-src-elem');
});
test('global failures are localized notifications without exception details', async ({
  page,
}) => {
  await qaSetup(page);
  await page.goto('/m8e-calc/#/simple');
  await ready(page, 'simple');
  await page.evaluate(() =>
    window.dispatchEvent(
      new ErrorEvent('error', { message: 'secret user input' }),
    ),
  );
  await expect(
    page.getByText(
      'Etwas ist schiefgegangen. Bitte versuche die Aktion erneut.',
    ),
  ).toBeVisible();
  await expect(page.getByText('secret user input')).toHaveCount(0);
});
test('failed lazy mode can be reset while shell stays usable', async ({
  page,
}) => {
  await qaSetup(page);
  await page.goto('/m8e-calc/#/simple');
  await ready(page, 'simple');
  await page.route('**/ScientificMode-*.js', (route) =>
    route.fulfill({ status: 503, body: 'temporarily unavailable' }),
  );
  await page
    .getByRole('link', { name: 'Wissenschaftlich', exact: true })
    .click();
  await expect(page.locator('.mode-placeholder[role="alert"]')).toContainText(
    'Dieser Modus konnte nicht geladen werden',
  );
  await page.unroute('**/ScientificMode-*.js');
  await page.getByRole('button', { name: 'Zurücksetzen', exact: true }).click();
  await ready(page, 'scientific');
  await expect(
    page.getByRole('textbox', { name: 'Ausdruck', exact: true }),
  ).toBeVisible();
});
