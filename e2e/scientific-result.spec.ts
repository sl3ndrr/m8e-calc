import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { allowClipboard } from './clipboard';
import { ready } from './qa-setup';
import { t } from '../src/shared/i18n/extended';
import { installScientificWorkerProbe } from './scientificWorkerProbe';

test.use({ serviceWorkers: 'block' });
for (const locale of ['de', 'en'] as const) {
  test(`WP-08 ${locale}: empty, pending, worker completion and errors keep the value slot stable`, async ({
    page,
  }) => {
    const width = locale === 'en' ? 1920 : 1280;
    await page.setViewportSize({ width, height: width === 1920 ? 1080 : 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(
      (language) =>
        localStorage.setItem(
          'm8e-calc.settings',
          JSON.stringify({
            version: 4,
            state: { language, motionLevel: 'off' },
          }),
        ),
      locale,
    );
    await installScientificWorkerProbe(page);
    await page.goto('/m8e-calc/#/scientific');
    await ready(page, 'scientific');
    if (width === 1920) {
      await page
        .getByRole('button', {
          name: t('history.toggleCount', locale, { count: 0 }),
          exact: true,
        })
        .click();
      await expect(page.locator('.shell-history[data-docked]')).toBeVisible();
    }
    const result = page.locator('.scientific-result-text');
    const value = page.locator('.scientific-result-value');
    const announcement = page.locator('.scientific-announcement');
    const height = await value.evaluate(
      (node) => node.getBoundingClientRect().height,
    );
    const card = page.locator('.scientific-result-card');
    const cardHeight = await card.evaluate(
      (node) => node.getBoundingClientRect().height,
    );
    const expectShortLayout = async () => {
      expect(
        await card.evaluate((node) => node.getBoundingClientRect().height),
      ).toBe(cardHeight);
      if (width === 1920) {
        expect(
          await page
            .locator('.mode-stage-frame')
            .evaluate(
              (node) =>
                node.scrollHeight <= node.clientHeight + 1 &&
                node.scrollWidth <= node.clientWidth + 1,
            ),
        ).toBe(true);
      }
    };
    await expectShortLayout();
    const editor = page.getByRole('textbox', {
      name: t('scientific.expression', locale),
      exact: true,
    });
    await expect(result).toBeEmpty();
    await expect(
      page.getByText(t('scientific.emptyResult', locale), { exact: true }),
    ).toBeVisible();
    await editor.fill('sin(30)');
    await editor.press('Enter');
    await expect
      .poll(() =>
        page.evaluate(() => window.__scientificWorkerProbe.replies.length),
      )
      .toBeGreaterThan(0);
    await expect(announcement).toHaveText(t('scientific.work.execute', locale));
    expect(
      await value.evaluate((node) => node.getBoundingClientRect().height),
    ).toBe(height);
    await page.evaluate(() => window.__scientificWorkerProbe.release());
    const expected = locale === 'de' ? '0,5' : '0.5';
    await expect(result).toHaveText(expected);
    await expect(announcement).toHaveText(expected);
    await expect(page.locator('.scientific-preview')).toContainText(expected);
    await expectShortLayout();
    if (width === 1920) {
      const copy = page.getByRole('button', {
        name: t('scientific.copyText', locale),
        exact: true,
      });
      await copy.focus();
      await expect(copy).toBeFocused();
      await expect(copy).toBeInViewport({ ratio: 1 });
      expect(
        await page
          .locator('.mode-stage')
          .evaluate((node) => getComputedStyle(node).overflowY),
      ).toBe('auto');
    }
    expect(
      await value.evaluate((node) => node.getBoundingClientRect().height),
    ).toBe(height);
    await editor.fill('1/0');
    await editor.press('Enter');
    await expect(announcement).toContainText(
      t('scientific.error.E_DIVISION_BY_ZERO', locale),
    );
    expect(
      await value.evaluate((node) => node.getBoundingClientRect().height),
    ).toBe(height);
    await editor.fill('3+4');
    await editor.press('Enter');
    await expect(result).toHaveText('7');
    await page.evaluate(() => {
      window.__scientificWorkerProbe.hold = true;
    });
    await editor.fill('7+8');
    await editor.press('Enter');
    await expect(announcement).toHaveText(t('scientific.work.execute', locale));
    await page.evaluate(() => window.__scientificWorkerProbe.fail());
    await expect(announcement).toHaveText(t('scientific.work.failed', locale));
    await expect(result).toHaveText('7');
    expect(
      await value.evaluate((node) => node.getBoundingClientRect().height),
    ).toBe(height);
    await expect(
      page.locator(
        '.scientific-workspace [role="status"]:not([aria-live="off"]), .scientific-workspace [role="alert"]:not([aria-live="off"])',
      ),
    ).toHaveCount(1);
  });
}
for (const [locale, theme, decimalSeparator, grouping, decimal] of [
  ['de', 'light', 'auto', true, ','],
  ['en', 'dark', 'auto', true, '.'],
  ['de', 'dark', 'point', false, '.'],
  ['en', 'light', 'comma', false, ','],
] as const) {
  test(`WP-08 ${locale}/${theme}/${decimalSeparator}: visible result, copy, announcement and long values`, async ({
    page,
    context,
    browser,
  }, info) => {
    await allowClipboard(context);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: theme });
    await page.addInitScript(
      (settings) =>
        localStorage.setItem(
          'm8e-calc.settings',
          JSON.stringify({ version: 4, state: settings }),
        ),
      {
        language: locale,
        themeMode: theme,
        decimalSeparator,
        grouping,
        motionLevel: 'off',
      },
    );
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/m8e-calc/#/scientific');
    await ready(page, 'scientific');
    const editor = page.getByRole('textbox', {
      name: t('scientific.expression', locale),
      exact: true,
    });
    const result = page.locator('.scientific-result-text');
    const announcement = page.locator('.scientific-announcement');
    const check = async (expected: string) => {
      await expect(result).toBeVisible();
      await expect(result).toHaveText(expected);
      await expect(announcement).toHaveText(expected);
      await expect(result).toHaveAttribute('aria-live', 'off');
      await expect(result).toHaveAccessibleName(t('scientific.result', locale));
      await result.scrollIntoViewIfNeeded();
      expect(
        await result.evaluate((node) => {
          const range = document.createRange();
          range.selectNodeContents(node);
          const selection = getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
          return selection?.toString();
        }),
      ).toBe(expected);
      const copy = page.getByRole('button', {
        name: t('scientific.copyText', locale),
        exact: true,
      });
      await copy.focus();
      await expect(copy).toBeFocused();
      await copy.press('Enter');
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
        expected,
      );
      await expect(
        page.locator(
          '.scientific-workspace [role="status"]:not([aria-live="off"]), .scientific-workspace [role="alert"]:not([aria-live="off"])',
        ),
      ).toHaveCount(1);
      expect(
        await result.evaluate((node) => ({
          width: node.clientWidth,
          scrollWidth: node.scrollWidth,
          height: node.clientHeight,
          scrollHeight: node.scrollHeight,
          numbers: getComputedStyle(node).fontVariantNumeric,
        })),
      ).toEqual(expect.objectContaining({ numbers: 'tabular-nums' }));
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    };
    const run = async (source: string, expected: string) => {
      await editor.fill(source);
      await editor.press('Enter');
      await check(expected);
    };
    await run(
      '1234567.89',
      grouping
        ? decimal === ','
          ? '1.234.567,89'
          : '1,234,567.89'
        : `1234567${decimal}89`,
    );
    await page
      .getByRole('button', { name: t('scientific.sci', locale), exact: true })
      .click();
    await check(`1${decimal}23456789e+6`);
    await page
      .getByRole('button', { name: t('scientific.eng', locale), exact: true })
      .click();
    await check(`1${decimal}23456789e+6`);
    const digits = page.getByRole('slider', {
      name: t('scientific.digits', locale),
    });
    await digits.focus();
    await digits.press('Home');
    await digits.press('ArrowRight');
    await digits.press('ArrowRight');
    await check(`1${decimal}23e+6`);
    await page
      .getByRole('button', { name: t('scientific.fixed', locale), exact: true })
      .click();
    await run('1/7', `0${decimal}143`);
    await digits.focus();
    await digits.press('End');
    await check(
      `0${decimal}14285714285714285714285714285714285714285714285714`,
    );
    await run('-1/2', `-0${decimal}5`);
    const fraction = page.getByRole('switch', {
      name: t('scientific.fraction', locale),
    });
    await fraction.focus();
    await fraction.press('Space');
    await check('-1/2');
    await page
      .getByRole('button', {
        name: t('scientific.copyLatex', locale),
        exact: true,
      })
      .click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
      '\\frac{-1}{2}',
    );
    await fraction.focus();
    await fraction.press('Space');
    const complexOn = page.getByRole('radio', {
      name: t('scientific.on', locale),
      exact: true,
    });
    await complexOn.focus();
    await complexOn.press('Space');
    await expect(complexOn).toBeChecked();
    await run('-2.5+3.75i', `-2${decimal}5+3${decimal}75i`);
    await expect(fraction).toBeDisabled();
    await run('factor(12)', '[2, 2, 3]');
    await editor.fill('f(x)=min(x, 1.5)');
    await editor.press('Enter');
    await expect(result).toHaveText(t('scientific.definitionSaved', locale));
    await expect(announcement).toHaveText(
      t('scientific.definitionSaved', locale),
    );
    await expect(
      page.getByRole('button', {
        name: t('scientific.copyText', locale),
        exact: true,
      }),
    ).toBeDisabled();
    await editor.fill('1/0');
    await editor.press('Enter');
    await expect(page.locator('.scientific-error')).toContainText(
      t('scientific.error.E_DIVISION_BY_ZERO', locale),
    );
    await expect(announcement).toContainText(
      t('scientific.error.E_DIVISION_BY_ZERO', locale),
    );
    await page
      .getByRole('button', { name: t('scientific.sci', locale), exact: true })
      .click();
    await run(
      '-1.234567890123456789012345678901234567890123456789e10000',
      `-1${decimal}234567890123456789012345678901234567890123456789e+10000`,
    );
    await expect(page.locator('.scientific-math .katex-error')).toHaveCount(0);
    await page.evaluate(() => document.fonts.ready);
    expect(
      (
        await new AxeBuilder({ page })
          .include('.scientific-workspace')
          .analyze()
      ).violations,
    ).toEqual([]);
    await result.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: info.outputPath(`wp08-${locale}-${theme}.png`),
      fullPage: true,
    });
    await info.attach('wp08-runtime', {
      body: JSON.stringify({
        node: process.version,
        browser: browser.version(),
        locale,
        theme,
        decimalSeparator,
        grouping,
        width: 1280,
        clipboard:
          info.project.name === 'chromium' ? 'browser' : 'in-memory adapter',
      }),
      contentType: 'application/json',
    });
    expect(errors).toEqual([]);
  });
}
