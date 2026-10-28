import { allowClipboard } from './clipboard';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { t } from '../src/shared/i18n/extended';
import type { Environment } from '../src/engine';
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
  // CodeMirror retains the previous, disabled tooltip while a query is pending.
  // Its text alone does not mean that Tab can accept the completion yet.
  const completion = page.locator(
    '.cm-tooltip-autocomplete:not(.cm-tooltip-autocomplete-disabled)',
  );
  await expect(completion).toBeVisible();
  await expect(completion).toContainText('integral');
  await expect(completion).toContainText('integral(expr, x, a, b)');
  // Escape is the documented clear command, including with an open suggestion.
  await editor.press('Escape');
  await expect(editor).toHaveText('');
  await expect(completion).toHaveCount(0);
  await editor.fill('inte');
  await editor.press('Control+Space');
  await expect(completion).toBeVisible();
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

for (const [locale, width] of [
  ['de', 1440],
  ['en', 2560],
] as const) {
  test(`WP-01 ${locale}: define → reload → calculate → reload preserves the scientific environment`, async ({
    page,
    browser,
  }, info) => {
    await page.setViewportSize({ width, height: 1440 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate((language) => {
      const key = 'm8e-calc.settings';
      const data = JSON.parse(localStorage.getItem(key) ?? '{}');
      localStorage.setItem(
        key,
        JSON.stringify({ ...data, state: { ...data.state, language } }),
      );
    }, locale);
    await page.reload();
    const editor = page.getByRole('textbox', {
      name: t('scientific.expression', locale),
    });
    const result = page.locator('.scientific-result-text');
    const run = async (source: string, expected: string) => {
      await editor.fill(source);
      await editor.press('Enter');
      await expect(result).toHaveText(expected);
    };
    const tools = async (computer: boolean) => {
      if (width >= 1920) {
        await page
          .getByRole('button', {
            name: t('scientific.computerScience', locale),
            exact: true,
          })
          .click();
      } else {
        const radio = page.getByRole('radio', {
          name: t(
            computer ? 'scientific.computerScience' : 'scientific.keypad',
            locale,
          ),
          exact: true,
        });
        await radio.focus();
        await radio.press('Space');
      }
    };
    const snapshot = () =>
      page.evaluate(() => {
        const data: { state: { environment: Environment } } = JSON.parse(
          localStorage.getItem('m8e-calc.scientific') ?? '{}',
        );
        return data.state.environment;
      });
    await tools(true);
    await editor.fill('bits(x)=x<<1');
    await editor.press('Enter');
    await expect(
      page.getByText(t('scientific.definitionSaved', locale), { exact: true }),
    ).toBeVisible();
    await tools(false);
    const complex = page.getByRole('radio', {
      name: t('scientific.on', locale),
      exact: true,
    });
    await complex.focus();
    await complex.press('Space');
    await run('v=123', '123');
    await run('shl=2', '2');
    await run('xor=3', '3');
    await run('z=2+3i', '2+3i');
    await run('xs=factor(360)', '[2, 2, 2, 3, 3, 5]');
    await editor.fill('f(x)=x+v');
    await editor.press('Enter');
    await expect(
      page.getByText(t('scientific.definitionSaved', locale), { exact: true }),
    ).toBeVisible();
    await run('f(shl)+xor', '128');
    const before = await snapshot();
    await page.reload();
    await expect(editor).toBeVisible();
    expect(await snapshot()).toEqual(before);
    // The definition label also must not execute shl in a word context.
    if (width < 1920) {
      const variables = page.getByRole('radio', {
        name: t('scientific.variables', locale),
        exact: true,
      });
      await variables.focus();
      await variables.press('Space');
    }
    await expect(page.locator('.scientific-variables')).toContainText(
      'shl = 2',
    );
    await expect(page.locator('.scientific-variables')).toContainText(
      'xor = 3',
    );
    await tools(true);
    await editor.fill('1+1');
    await editor.press('Enter');
    await expect(page.locator('.scientific-error[role="alert"]')).toHaveText(
      `${t('scientific.error.E_RESERVED_NAME', locale)} (1)`,
    );
    expect(await snapshot()).toEqual(before);
    await tools(false);
    await run('ans+v+shl+xor', '256');
    const after = await snapshot();
    expect(after.variables).toEqual(before.variables);
    expect(after.functions).toEqual(before.functions);
    expect(after.history.slice(1)).toEqual(before.history);
    await page.reload();
    await expect(editor).toBeVisible();
    expect(await snapshot()).toEqual(after);
    await run('v+shl+xor', '128');
    await info.attach('wp01-runtime', {
      body: JSON.stringify({
        node: process.version,
        browser: browser.version(),
        locale,
        width,
      }),
      contentType: 'application/json',
    });
  });

  test(`WP-01 ${locale}: recovery keeps the original across a calculation and reload`, async ({
    page,
  }) => {
    const original = '{"state":{"environment":{"version":99}},"version":1}';
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(
      ({ original, language }) => {
        localStorage.setItem('m8e-calc.scientific', original);
        const key = 'm8e-calc.settings';
        const data = JSON.parse(localStorage.getItem(key) ?? '{}');
        localStorage.setItem(
          key,
          JSON.stringify({ ...data, state: { ...data.state, language } }),
        );
      },
      { original, language: locale },
    );
    await page.reload();
    await expect(
      page.getByText(t('scientific.recovery.invalid', locale), { exact: true }),
    ).toBeVisible();
    const editor = page.getByRole('textbox', {
      name: t('scientific.expression', locale),
    });
    await editor.fill('session=7');
    await editor.press('Enter');
    await expect(page.locator('.scientific-result-text')).toHaveText('7');
    expect(
      await page.evaluate(() => localStorage.getItem('m8e-calc.scientific')),
    ).toBe(original);
    await page.reload();
    await expect(
      page.getByText(t('scientific.recovery.invalid', locale), { exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => localStorage.getItem('m8e-calc.scientific')),
    ).toBe(original);
    await page
      .getByRole('button', { name: t('scientific.recovery.retry', locale) })
      .focus();
    await page.keyboard.press('Enter');
    await expect(
      page.getByText(t('scientific.recovery.invalid', locale), { exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => localStorage.getItem('m8e-calc.scientific')),
    ).toBe(original);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);

    // Repair only the fixture in storage. The retry must load it without
    // evaluating the editor draft, restore focus, and release the write gate.
    await editor.fill('session=9');
    await editor.press('Enter');
    await expect(page.locator('.scientific-result-text')).toHaveText('9');
    const repaired: Environment = {
      version: 1,
      variables: {
        v: { kind: 'number', value: '123' },
        shl: { kind: 'number', value: '2' },
      },
      functions: {},
      history: [
        { kind: 'number', value: '2' },
        { kind: 'number', value: '123' },
      ],
    };
    const repairedRaw = JSON.stringify({
      state: { environment: repaired },
      version: 1,
    });
    await page.evaluate((raw) => {
      localStorage.setItem('m8e-calc.scientific', raw);
    }, repairedRaw);
    const retry = page.getByRole('button', {
      name: t('scientific.recovery.retry', locale),
    });
    await retry.focus();
    await retry.press('Enter');
    await expect(retry).toHaveCount(0);
    await expect(editor).toBeFocused();
    await expect(page.locator('.scientific-result-text')).toHaveText('');
    expect(
      await page.evaluate(() => localStorage.getItem('m8e-calc.scientific')),
    ).toBe(repairedRaw);
    await editor.fill('ans+v+shl');
    await editor.press('Enter');
    await expect(page.locator('.scientific-result-text')).toHaveText('127');
    await page.reload();
    await expect(editor).toBeVisible();
    await editor.fill('ans+v+shl');
    await editor.press('Enter');
    await expect(page.locator('.scientific-result-text')).toHaveText('252');
  });
}
