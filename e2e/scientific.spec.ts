import { allowClipboard } from './clipboard';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { t } from '../src/shared/i18n';
const route = '/m8e-calc/#/scientific';
// Feature-state checks are isolated from SW update toasts; the production
// matrix, comfort and pwa-update suites exercise the real worker separately.
test.use({ serviceWorkers: 'block' });

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 2560, height: 1440 });
  await page.goto(route);
  await expect(
    page.getByRole('textbox', { name: t('scientific.expression') }),
  ).toBeVisible();
});
test('DEG, definitions, integral, errors, keyboard history and restore', async ({
  page,
}) => {
  const editor = page.getByRole('textbox', {
    name: t('scientific.expression'),
  });
  const result = page.locator('.scientific-result-text');
  await editor.fill('sin(30°)');
  await expect(page.locator('.scientific-preview')).toContainText('0,5');
  await editor.press('Enter');
  await expect(result).toHaveText('0,5');
  await editor.fill('a = 5');
  await editor.press('Enter');
  await expect(result).toHaveText('5');
  await editor.fill('a^2');
  await editor.press('Enter');
  await expect(result).toHaveText('25');
  await editor.fill('integral(x^2, x, 0, 3)');
  await editor.press('Enter');
  await expect(result).toHaveText('9');
  await editor.fill('1/0');
  await editor.press('Enter');
  await expect(page.locator('.scientific-error[role="alert"]')).toContainText(
    t('scientific.error.E_DIVISION_BY_ZERO'),
  );
  await expect(editor).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('.cm-lintRange-error')).toHaveText('/');
  await editor.press('Escape');
  await expect(editor).toHaveText('');
  await editor.press('ArrowUp');
  await expect(editor).toHaveText('integral(x^2, x, 0, 3)');
  await editor.press('ArrowDown');
  await expect(editor).toHaveText('');
  await page.getByRole('button', { name: t('history.toggle') }).click();
  await page
    .getByRole('button', { name: t('history.restore', { input: 'a^2' }) })
    .click();
  await expect(editor).toHaveText('a^2');
  await page.reload();
  await expect(page.locator('.scientific-variables')).toContainText('a = 5');
});
test('insertion wraps a selection, 2nd flips functions, completion and single-line paste', async ({
  page,
}) => {
  const editor = page.getByRole('textbox', {
    name: t('scientific.expression'),
  });
  await editor.fill('30');
  await editor.press('Control+a');
  await page.getByRole('button', { name: /sin einfügen:/ }).click();
  await expect(editor).toHaveText('sin(30)');
  await editor.press('Enter');
  await expect(page.locator('.scientific-result-text')).toHaveText('0,5');
  await page.getByRole('button', { name: t('scientific.second') }).click();
  await expect(
    page.getByRole('button', { name: /asin einfügen:/ }),
  ).toBeVisible();
  await editor.fill('inte');
  await editor.press('Control+Space');
  await expect(page.locator('.cm-tooltip-autocomplete')).toContainText(
    'integral',
  );
  await expect(page.locator('.cm-tooltip-autocomplete')).toContainText(
    'integral(expr, x, a, b)',
  );
  await editor.press('Tab');
  await expect(editor).toHaveText('integral(');
  await editor.press('Escape');
  await editor.fill('1\n+2');
  await expect(editor).toHaveText('1 +2');
  await editor.press('Enter');
  await expect(page.locator('.scientific-result-text')).toHaveText('3');
});
test('formats, copies LaTeX, switches complex mode and stores/recalls variables', async ({
  page,
  context,
}) => {
  await allowClipboard(context);
  const editor = page.getByRole('textbox', {
    name: t('scientific.expression'),
  });
  await editor.fill('1/2');
  await editor.press('Enter');
  const fraction = page.getByRole('switch', { name: t('scientific.fraction') });
  await fraction.focus();
  await fraction.press('Space');
  await expect(page.locator('.scientific-result-text')).toHaveText('1/2');
  await page.getByRole('button', { name: t('scientific.copyLatex') }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    '\\frac{1}{2}',
  );
  await page
    .getByRole('textbox', { name: t('scientific.storeName') })
    .fill('b');
  await page.getByRole('button', { name: t('scientific.store') }).click();
  await expect(page.locator('.scientific-variables')).toContainText('b = 0.5');
  const complexOn = page.getByRole('radio', {
    name: t('scientific.on'),
    exact: true,
  });
  await complexOn.focus();
  await complexOn.press('Space');
  await editor.fill('sqrt(-1)');
  await editor.press('Enter');
  await expect(page.locator('.scientific-result-text')).toContainText('1i');
});
test('compact layout exposes tool tabs and the programmer panel', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const constantsTab = page.getByRole('radio', {
    name: t('scientific.constants'),
    exact: true,
  });
  await constantsTab.focus();
  await constantsTab.press('Space');
  await expect(page.locator('.scientific-constants')).toBeVisible();
  await expect(page.locator('.scientific-keypad-wrap')).toBeHidden();
  const computerTab = page.getByRole('radio', {
    name: t('scientific.computerScience'),
  });
  await computerTab.focus();
  await computerTab.press('Space');
  await expect(
    page.getByRole('textbox', { name: t('programmer.hex') }),
  ).toBeVisible();
});
for (const [width, height] of [
  [2560, 1440],
  [3840, 2160],
] as const)
  for (const theme of ['light', 'dark'] as const)
    test(`scientific ${theme} ${width} screenshot and accessibility`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      await page.evaluate((theme) => {
        const key = 'm8e-calc.settings';
        const data = JSON.parse(localStorage.getItem(key) ?? '{}');
        localStorage.setItem(
          key,
          JSON.stringify({
            ...data,
            state: { ...data.state, themeMode: theme, motionLevel: 'off' },
          }),
        );
      }, theme);
      await page.reload();
      const editor = page.getByRole('textbox', {
        name: t('scientific.expression'),
      });
      await editor.fill('a = 5');
      await editor.press('Enter');
      await editor.fill('integral(x^2, x, 0, 3)');
      await editor.press('Enter');
      await expect(page.locator('.scientific-result-text')).toHaveText('9');
      await page.getByRole('button', { name: t('history.toggle') }).click();
      await expect(page.locator('.shell-history[data-docked]')).toBeVisible();
      await expect(
        page.locator('.scientific-math .katex').first(),
      ).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      for (const selector of [
        '.scientific-main-column',
        '.scientific-keypad-wrap',
        '.scientific-reference-column',
      ])
        await expect(page.locator(selector)).toBeVisible();
      const bounds = await Promise.all(
        [
          '.scientific-main-column',
          '.scientific-keypad-wrap',
          '.scientific-reference-column',
          '.shell-history',
        ].map((s) => page.locator(s).boundingBox()),
      );
      for (const b of bounds) {
        expect(b).not.toBeNull();
        if (b) {
          expect(b.x).toBeGreaterThanOrEqual(0);
          expect(b.x + b.width).toBeLessThanOrEqual(width + 1);
        }
      }
      const [a, b, c] = bounds;
      if (a && b && c) {
        expect(a.x + a.width).toBeLessThanOrEqual(b.x);
        expect(b.x + b.width).toBeLessThanOrEqual(c.x);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (width === 2560 && theme === 'light') {
        const accessibility = await new AxeBuilder({ page })
          .include('.scientific-workspace')
          .analyze();
        expect(accessibility.violations).toEqual([]);
      }
      await page.screenshot({
        path: `test-results/scientific-${theme}-${width}.png`,
        fullPage: true,
      });
    });

test('AP24 KaTeX renders accessible math with local loaded fonts', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const editor = page.getByRole('textbox', {
    name: t('scientific.expression'),
  });
  await editor.fill('integral(x^2, x, 0, 3)');
  await editor.press('Enter');
  await expect(page.locator('.scientific-result-text')).toHaveText('9');
  await expect(
    page.locator('.scientific-math .katex-html').first(),
  ).toBeVisible();
  await expect(
    page.locator('.scientific-math .katex-mathml math').first(),
  ).toBeAttached();
  await expect(page.locator('.scientific-math .katex-error')).toHaveCount(0);
  const fonts = await page.evaluate(async () => {
    await document.fonts.ready;
    const katexFonts = await document.fonts.load('16px KaTeX_Main');
    return {
      faces: katexFonts.map((font) => ({
        family: font.family,
        status: font.status,
      })),
      requests: performance
        .getEntriesByType('resource')
        .map((entry) => entry.name)
        .filter((name) => /\.(woff2?)(?:\?|$)/.test(name)),
      localBase: location.origin + '/m8e-calc/',
    };
  });
  expect(
    fonts.faces.some(
      (font) => font.family.includes('KaTeX') && font.status === 'loaded',
    ),
  ).toBe(true);
  expect(fonts.requests.some((url) => url.includes('KaTeX'))).toBe(true);
  expect(fonts.requests.every((url) => url.startsWith(fonts.localBase))).toBe(
    true,
  );
  expect(errors).toEqual([]);
});
