import { expect, type Page, type TestInfo } from '@playwright/test';
import { t } from '../src/shared/i18n/extended';
import { tabTo } from './qa-setup';

export const converterDigits =
  '2345678901234567890123456789012345678901234567891';
export const converterCases = [
  ['0', '0'],
  ['-1e-9', '-1e-7'],
  ['-1e-10000', '-1e-9998'],
  ['1e10000', '1e+10002'],
  [`-1.${converterDigits}e-10000`, `-1.${converterDigits}e-9998`],
  [`-0.${'0'.repeat(1200)}1${converterDigits}`, `-1.${converterDigits}e-1199`],
] as const;

export async function converterSettings(
  page: Page,
  locale: 'de' | 'en',
  theme: 'light' | 'dark',
  reduced: boolean,
) {
  await page.emulateMedia({
    colorScheme: theme,
    reducedMotion: reduced ? 'reduce' : 'no-preference',
  });
  await page.addInitScript(
    ({ locale, theme }) => {
      localStorage.setItem(
        'm8e-calc.settings',
        JSON.stringify({
          version: 4,
          state: {
            language: locale,
            themeMode: theme,
            motionLevel: 'full',
            grouping: false,
          },
        }),
      );
      localStorage.setItem(
        'm8e-calc.convert',
        JSON.stringify({
          version: 1,
          state: { digits: 50, notation: 'auto' },
        }),
      );
    },
    { locale, theme },
  );
}

/** Rectangles, rather than absolute positioning alone, decide a collision. */
export async function converterGeometry(page: Page) {
  return page.locator('.convert-mode').evaluate((root) => {
    const fields = root.querySelector('.convert-fields');
    const swap = fields?.querySelector('.convert-swap');
    if (!fields || !swap) throw new Error('Missing conversion fields');
    const box = swap.getBoundingClientRect();
    const collisions = Array.from(
      fields.querySelectorAll('.convert-field'),
    ).map((field) => {
      const r = field.getBoundingClientRect();
      return (
        Math.max(0, Math.min(box.right, r.right) - Math.max(box.left, r.left)) *
        Math.max(0, Math.min(box.bottom, r.bottom) - Math.max(box.top, r.top))
      );
    });
    const numbers = Array.from(
      root.querySelectorAll(
        '.convert-unit-card strong, .convert-result > [aria-hidden="true"], .currency-panel .convert-result',
      ),
    ).map((node) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      const region = node.closest('.convert-number-scroll');
      if (!region) throw new Error('Number lacks its accessible viewport');
      const rect = range.getBoundingClientRect();
      const bounds = region.getBoundingClientRect();
      return {
        value: node.textContent,
        lines: new Set(Array.from(range.getClientRects(), (r) => r.top)).size,
        vertical:
          rect.top >= bounds.top &&
          rect.bottom <= bounds.top + region.clientHeight,
        scrollHeight: region.scrollHeight,
        clientHeight: region.clientHeight,
        scrollWidth: region.scrollWidth,
        clientWidth: region.clientWidth,
      };
    });
    return {
      viewport: {
        width: innerWidth,
        height: innerHeight,
        dpr: devicePixelRatio,
      },
      pageOverflow: document.documentElement.scrollWidth > innerWidth,
      collisions,
      numbers,
    };
  });
}

export async function checkConverterGeometry(
  page: Page,
  info: TestInfo,
  label: string,
) {
  // Wait for the existing spatial entry/number effects, without disabling them.
  await page
    .locator('.convert-main, .currency-panel')
    .evaluate(async (node) => {
      await Promise.all(
        node
          .getAnimations({ subtree: true })
          .map((a) => a.finished.catch(() => {})),
      );
    });
  const geometry = await converterGeometry(page);
  await info.attach(`geometry-${label}`, {
    body: JSON.stringify(geometry, null, 2),
    contentType: 'application/json',
  });
  expect(geometry.pageOverflow).toBe(false);
  expect(geometry.collisions).toEqual([0, 0]);
  expect(geometry.numbers.length).toBeGreaterThan(1);
  for (const number of geometry.numbers) {
    expect(number.lines, number.value ?? '').toBe(1);
    expect(number.vertical, number.value ?? '').toBe(true);
    expect(number.scrollHeight).toBeLessThanOrEqual(number.clientHeight);
  }
}

export async function checkConverterLongNames(
  page: Page,
  locale: 'de' | 'en',
  info: TestInfo,
  label: string,
) {
  await page
    .locator('.convert-category-grid')
    .getByRole('button', {
      name: locale === 'de' ? 'Dynamische Viskosität' : 'Dynamic viscosity',
      exact: true,
    })
    .click();
  const name =
    locale === 'de'
      ? 'Pfundkraftsekunde pro Quadratfuß'
      : 'pound-force second per square foot';
  const card = page.locator('.convert-unit-card').filter({
    has: page.locator('.convert-unit-name', {
      hasText: new RegExp(`^${name}$`),
    }),
  });
  await expect(card.locator('.convert-unit-name')).toHaveText(name);
  await expect(card.getByRole('button')).toHaveAccessibleName(new RegExp(name));
  await page
    .getByRole('textbox', {
      name: t('convert.from', locale),
      exact: true,
    })
    .fill('-1e-10000');
  await checkConverterGeometry(page, info, `long-name-${label}`);
}

export async function converterScenario(
  page: Page,
  locale: 'de' | 'en',
  source: string,
  result: string,
) {
  const localized = (text: string) =>
    locale === 'de' ? text.replace('.', ',') : text;
  const quick = page.getByRole('textbox', {
    name: t('convert.quick', locale),
    exact: true,
  });
  await quick.fill(`${localized(source)} m in cm`);
  await quick.press('Enter');
  await expect(
    page.getByRole('textbox', { name: t('convert.from', locale), exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole('textbox', { name: t('convert.to', locale), exact: true }),
  ).toHaveValue(localized(result));
  return localized(result);
}

export async function checkConverterScrollAndCopy(
  page: Page,
  locale: 'de' | 'en',
  expected: string,
) {
  const card = page
    .locator('.convert-unit-card')
    .filter({ has: page.locator('.convert-unit-symbol', { hasText: /^cm$/ }) });
  const region = card.getByRole('region');
  await expect(region).toHaveText(expected);
  await tabTo(page, region);
  await expect(region).toBeFocused();
  expect(
    await region.evaluate((node) => getComputedStyle(node).outlineStyle),
  ).toBe('solid');
  expect(
    await region.evaluate((node) => node.scrollWidth > node.clientWidth),
  ).toBe(true);
  // scrollWidth/clientWidth are integer CSS pixels; at actual browser zoom,
  // the native clamped scroll position can be fractional. Measure that exact
  // endpoint first, restore the viewport, then require the key to reach it.
  const scrollEnd = await region.evaluate((node) => {
    const start = node.scrollLeft;
    node.scrollLeft = node.scrollWidth;
    const end = node.scrollLeft;
    node.scrollLeft = start;
    return end;
  });
  await region.press('End');
  await expect
    .poll(() => region.evaluate((node) => node.scrollLeft))
    .toBe(scrollEnd);
  const end = await region.locator('strong').evaluate((node) => {
    const text = node.firstChild;
    if (!text?.textContent) throw new Error('Missing number');
    const range = document.createRange();
    range.setStart(text, text.textContent.length - 1);
    range.setEnd(text, text.textContent.length);
    const box = range.getBoundingClientRect();
    const parent = node.parentElement;
    if (!parent) throw new Error('Missing viewport');
    const bounds = parent.getBoundingClientRect();
    return box.left >= bounds.left && box.right <= bounds.right;
  });
  expect(end, 'final exponent digit reachable with End').toBe(true);
  // Selection and full formatted clipboard value must include the offscreen prefix.
  const selected = await region.locator('strong').evaluate((node) => {
    const range = document.createRange();
    range.selectNodeContents(node);
    const selection = getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    return selection?.toString();
  });
  expect(selected).toBe(expected);
  await page.evaluate(() => getSelection()?.removeAllRanges());
  await region.press('Home');
  await expect.poll(() => region.evaluate((node) => node.scrollLeft)).toBe(0);
  const copy = card.getByRole('button');
  await expect(
    card.locator('button button, button [tabindex], [role="region"] button'),
  ).toHaveCount(0);
  const name = locale === 'de' ? 'Zentimeter' : 'centimetre';
  await expect(copy).toHaveAccessibleName(
    `${name} ${expected} cm ${t('convert.system.si', locale)} ${t('convert.copyUnit', locale, { unit: name })}`,
  );
  await page.keyboard.press('Tab');
  await expect(copy).toBeFocused();
  for (const key of ['Enter', 'Space']) {
    await copy.press(key);
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe(`${expected} cm`);
    await page
      .locator('.ui-snackbar')
      .getByRole('button', { name: t('ui.close', locale), exact: true })
      .click();
    await expect(page.locator('.ui-snackbar')).toHaveCount(0);
    await copy.focus();
  }
  await copy.click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(`${expected} cm`);
  await page
    .locator('.ui-snackbar')
    .getByRole('button', { name: t('ui.close', locale), exact: true })
    .click();
  await expect(page.locator('.ui-snackbar')).toHaveCount(0);
}
