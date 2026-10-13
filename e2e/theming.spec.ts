import { expect, test } from '@playwright/test';
import { buildScheme } from '../src/styles/buildScheme';
import {
  defaultSettings,
  SETTINGS_KEY,
  THEME_CACHE_KEY,
  themeFingerprint,
} from '../src/shared/settings';

test('persists theme, seed, variant, contrast and motion, with accessible keyboard controls', async ({
  page,
}) => {
  await page.goto('/m8e-calc/#/design');
  const group = page.getByRole('radiogroup', { name: 'Erscheinungsbild' });
  await group.getByRole('radio', { name: /^System/ }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(group.getByRole('radio', { name: 'Dunkel' })).toBeChecked();
  await expect(group.getByRole('radio', { name: 'Dunkel' })).toBeFocused();
  await page.getByRole('button', { name: 'Akzentfarbe anpassen' }).click();
  const picker = page.getByRole('dialog', { name: 'Deine Farbwelt' });
  await expect(
    picker.getByRole('button', { name: 'Iris', exact: true }),
  ).toBeFocused();
  await picker.getByRole('button', { name: 'Koralle', exact: true }).click();
  await picker.getByRole('button', { name: /Schema-Variante/ }).click();
  await page.getByRole('option', { name: 'Expressive', exact: true }).click();
  await picker.getByRole('button', { name: /Kontrast/ }).click();
  await page.getByRole('option', { name: 'Hoch', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(picker).not.toBeVisible();
  await page.getByLabel('Animationsstufe').selectOption('off');
  await page.reload();
  await expect(group.getByRole('radio', { name: 'Dunkel' })).toBeChecked();
  await expect(page.getByLabel('Animationsstufe')).toHaveValue('off');
  await page.getByRole('button', { name: 'Akzentfarbe anpassen' }).click();
  await expect(picker.getByLabel('Eigene Farbe')).toHaveValue('#e2675a');
  await expect(
    picker.getByRole('button', { name: /Schema-Variante/ }),
  ).toContainText('Expressive');
  await expect(picker.getByRole('button', { name: /Kontrast/ })).toContainText(
    'Hoch',
  );
  await picker.getByRole('button', { name: 'Farben zurücksetzen' }).click();
  await expect(picker.getByLabel('Eigene Farbe')).toHaveValue('#6750a4');
});

test('follows live system changes and keeps explicit light/dark independent', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/m8e-calc/#/design');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(
    page.getByRole('radio', { name: /System: Dunkel aktiv/ }),
  ).toBeChecked();
  await page
    .getByRole('radio', { name: 'Hell', exact: true })
    .locator('..')
    .locator('..')
    .click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page
    .getByRole('radio', { name: /^System/ })
    .locator('..')
    .locator('..')
    .click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('applies persisted mode and matching cached roles before the app can run (no FOUC)', async ({
  page,
}) => {
  const settings = {
    ...defaultSettings(),
    accent: '#008ba9',
    schemeVariant: 'vibrant' as const,
    contrast: 'medium' as const,
  };
  const light = buildScheme(
    settings.accent,
    settings.schemeVariant,
    false,
    settings.contrast,
  );
  const dark = buildScheme(
    settings.accent,
    settings.schemeVariant,
    true,
    settings.contrast,
  );
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.addInitScript(
    ({ settings, light, dark, key, cacheKey, fingerprint }) => {
      localStorage.setItem(
        key,
        JSON.stringify({ version: 1, state: settings }),
      );
      localStorage.setItem(
        cacheKey,
        JSON.stringify({ version: 1, fingerprint, light, dark }),
      );
    },
    {
      settings,
      light,
      dark,
      key: SETTINGS_KEY,
      cacheKey: THEME_CACHE_KEY,
      fingerprint: themeFingerprint(settings),
    },
  );
  await page.route('**/assets/*.js', (route) => route.abort());
  await page.goto('/m8e-calc/#/design');
  await expect(page.locator('#root')).toBeEmpty();
  const beforeApp = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    colorScheme: document.documentElement.style.colorScheme,
    primary: document.documentElement.style.getPropertyValue(
      '--md-sys-color-primary',
    ),
    surface: getComputedStyle(document.documentElement).backgroundColor,
    meta: document
      .querySelector('meta[name="theme-color"]')
      ?.getAttribute('content'),
  }));
  expect(beforeApp.theme).toBe('dark');
  expect(beforeApp.colorScheme).toBe('dark');
  expect(beforeApp.primary).toBe(dark['--md-sys-color-primary']);
  expect(beforeApp.meta).toBe(dark['--md-sys-color-surface']);
  expect(beforeApp.surface).not.toBe('rgba(0, 0, 0, 0)');
});

test('reduced motion defaults to opacity only and switches themes immediately', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/m8e-calc/#/design');
  await expect(page.getByLabel('Animationsstufe')).toHaveValue('reduced');
  await page
    .getByRole('radio', { name: 'Dunkel', exact: true })
    .locator('..')
    .locator('..')
    .click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(
    await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter(
            (animation) =>
              animation.effect instanceof KeyframeEffect &&
              animation.effect.pseudoElement?.startsWith('::view-transition'),
          ).length,
    ),
  ).toBe(0);
  await page
    .getByRole('button', {
      name: 'Spring abspielen · spatial-fast',
      exact: true,
    })
    .click();
  await page.waitForTimeout(500);
  const dot = page.locator('.motion-dot').first();
  await expect(dot).toHaveCSS('transform', 'none');
  await expect(dot).toHaveCSS('opacity', '0.25');
});

test('cross-fade fallback survives rapid changes and leaves no snapshots', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(document, 'startViewTransition', {
      value: undefined,
    }),
  );
  await page.goto('/m8e-calc/#/design');
  await page
    .getByRole('radio', { name: 'Dunkel', exact: true })
    .locator('..')
    .locator('..')
    .click();
  await page
    .getByRole('radio', { name: 'Hell', exact: true })
    .locator('..')
    .locator('..')
    .click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('.theme-snapshot')).toHaveCount(0);
});

test('corrupt storage cannot break prepaint or app startup', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem('m8e-calc.settings', '{invalid');
    localStorage.setItem('m8e-calc.theme-cache', '{invalid');
  });
  await page.goto('/m8e-calc/#/design');
  await expect(
    page.getByRole('heading', { name: 'Raum für deinen Stil.' }),
  ).toBeVisible();
  await page
    .getByRole('radio', { name: 'Dunkel', exact: true })
    .locator('..')
    .locator('..')
    .click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('design lab stays usable at desktop and narrow widths, fonts are local variable assets', async ({
  page,
}) => {
  await page.goto('/m8e-calc/#/design');
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(
      () =>
        document.fonts.check('16px "Roboto Flex"') &&
        document.fonts.check('16px "Roboto Mono"') &&
        document.fonts.check('24px "Material Symbols Rounded"'),
    ),
  ).toBe(true);
  await page.screenshot({
    path: 'test-results/design-light.png',
    fullPage: true,
  });
  await page
    .getByRole('radio', { name: 'Dunkel', exact: true })
    .locator('..')
    .locator('..')
    .click();
  await page.waitForTimeout(800);
  await page.screenshot({
    path: 'test-results/design-dark.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Akzentfarbe anpassen' }).click();
  await page.screenshot({ path: 'test-results/accent-picker.png' });
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test('denied storage keeps appearance usable without runtime errors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    for (const method of ['getItem', 'setItem', 'removeItem'])
      Object.defineProperty(Storage.prototype, method, {
        value: () => {
          throw new DOMException('Denied', 'SecurityError');
        },
      });
  });
  await page.goto('/m8e-calc/#/design');
  await page
    .getByRole('radio', { name: 'Dunkel', exact: true })
    .locator('..')
    .locator('..')
    .click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Akzentfarbe anpassen' }).click();
  await page.getByRole('button', { name: 'Koralle', exact: true }).click();
  expect(errors).toEqual([]);
});
