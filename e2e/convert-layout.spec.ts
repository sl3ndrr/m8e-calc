import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { allowClipboard } from './clipboard';
import { ready } from './qa-setup';
import { t } from '../src/shared/i18n/extended';
import {
  checkConverterGeometry,
  checkConverterLongNames,
  checkConverterScrollAndCopy,
  converterCases,
  converterGeometry,
  converterScenario,
  converterSettings,
} from './convertLayout';

test.use({ serviceWorkers: 'block' });
test('WP-09 visibility measurement rejects a clipped result action', async ({
  page,
}, info) => {
  await converterSettings(page, 'en', 'light', true);
  await page.setViewportSize({ width: 3840, height: 2160 });
  await page.goto('/m8e-calc/#/convert');
  await ready(page, 'convert');
  await converterScenario(page, 'en', ...converterCases[4]);
  await checkConverterGeometry(page, info, 'visibility-control');
  const button = page.locator('.convert-live > .ui-button');
  const original = await button.getAttribute('style');
  try {
    await button.evaluate((node) => {
      const row = node.parentElement;
      if (!row) throw new Error('Missing live row');
      const offset =
        row.getBoundingClientRect().right - node.getBoundingClientRect().right;
      node.style.position = 'relative';
      node.style.left = `${offset + 6}px`;
    });
    const clipped = await converterGeometry(page);
    await info.attach('visibility-negative-control', {
      body: JSON.stringify(clipped, null, 2),
      contentType: 'application/json',
    });
    const action = clipped.liveChildren.find((child) =>
      child.name.includes('ui-button'),
    );
    expect(action).toBeDefined();
    expect(action?.ratio).toBeLessThan(1);
    const panel = clipped.panels.find((item) => item.name === 'convert-main');
    if (!panel) throw new Error('Missing main panel');
    expect(panel.scrollWidth).toBeGreaterThan(panel.clientWidth);
  } finally {
    await button.evaluate((node, style) => {
      if (style === null) node.removeAttribute('style');
      else node.setAttribute('style', style);
    }, original);
  }
  await checkConverterGeometry(page, info, 'visibility-restored');
});
for (const [width, height] of [
  [1280, 900],
  [1920, 1080],
  [3840, 2160],
] as const) {
  for (const locale of ['de', 'en'] as const) {
    for (const theme of ['light', 'dark'] as const) {
      for (const reduced of [false, true]) {
        test(`WP-09 ${width}/${locale}/${theme}/reduced=${reduced}: complete numbers and reserved swap`, async ({
          page,
          context,
        }, info) => {
          await allowClipboard(context);
          await converterSettings(page, locale, theme, reduced);
          await page.setViewportSize({ width, height });
          await page.goto('/m8e-calc/#/convert');
          await ready(page, 'convert');
          await expect(page.locator('html')).toHaveAttribute('lang', locale);
          for (const [index, [source, result]] of converterCases.entries()) {
            const expected = await converterScenario(
              page,
              locale,
              source,
              result,
            );
            await checkConverterGeometry(page, info, String(index));
            if (index === 4)
              await checkConverterScrollAndCopy(page, locale, expected);
          }
          const swap = page.getByRole('button', {
            name: t('convert.swap', locale),
            exact: true,
          });
          // Zero stays a real result through native pointer, Space and Enter swaps.
          await converterScenario(page, locale, '0', '0');
          for (const action of ['click', 'Space', 'Enter']) {
            if (action === 'click') await swap.click();
            else await swap.press(action);
            await expect(
              page.getByRole('textbox', {
                name: t('convert.to', locale),
                exact: true,
              }),
            ).toHaveValue('0');
            await checkConverterGeometry(page, info, `swap-${action}`);
          }
          await checkConverterLongNames(page, locale, info, String(width));
          expect(
            (
              await new AxeBuilder({ page })
                .include('.convert-mode')
                .withRules(['label-content-name-mismatch'])
                .analyze()
            ).violations,
          ).toEqual([]);
          expect(
            (await new AxeBuilder({ page }).include('.convert-mode').analyze())
              .violations,
          ).toEqual([]);
          await info.attach('converter', {
            body: await page.screenshot({ fullPage: true }),
            contentType: 'image/png',
          });
        });
      }
    }
  }
}
