import { expect, test, type Page, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { RuleResult } from 'axe-core';
import { t, type Locale } from '../src/shared/i18n/extended';
import { functionRegistry } from '../src/engine';
import { qaSetup, ready, tabTo } from './qa-setup';
import { replaceGraphExpression } from './graphEditor';
import { currencyCodes } from '../src/units/currency';
import { RATE_ENDPOINT } from '../src/features/convert/currency/rates';

test.use({ serviceWorkers: 'block' });

// Keep the full scan. Explicit activation also protects against changes to
// axe's default/experimental rule selection; require proof it actually ran.
async function accessible(page: Page, locale: Locale) {
  const rule = 'label-content-name-mismatch';
  const result = await new AxeBuilder({ page })
    .options({ rules: { [rule]: { enabled: true } } })
    .analyze();
  expect(result.violations).toEqual([]);
  await reviewSymbols(
    page,
    locale,
    result.incomplete.filter(({ id }) => id === rule),
  );
  expect(result.passes.some(({ id }) => id === rule)).toBe(true);
}

// axe 4.14 intentionally returns "needs review" for single-character symbols.
// Resolve each such node with an exact scope, glyph AND spoken action. Unknown
// controls, changed names and text/formula labels cannot enter this review.
// No node is excluded from the full axe scan.
async function reviewSymbols(
  page: Page,
  locale: Locale,
  results: readonly RuleResult[],
) {
  const known = [
    ...(
      [
        ['⌘', 'comfort.palette'],
        ['?', 'comfort.shortcuts'],
        ['⛶', 'comfort.presentation'],
      ] as const
    ).map(([glyph, key]) => ({
      selector: '.shell-controls button',
      glyph,
      name: t(key, locale),
    })),
    ...(
      [
        ['percent', '%', 'simple.percent'],
        ['clear', 'C', 'simple.clear'],
        ['backspace', '⌫', 'simple.backspace'],
        ['/', '÷', 'simple.divide'],
        ['*', '×', 'simple.multiply'],
        ['-', '−', 'simple.subtract'],
        ['equals', '=', 'simple.equals'],
        ['sign', '±', 'simple.sign'],
        ['decimal', locale === 'de' ? ',' : '.', 'simple.decimal'],
        ['+', '+', 'simple.add'],
      ] as const
    ).map(([id, glyph, key]) => ({
      selector: `.simple-calculator [data-key="${id}"] button`,
      glyph,
      name: t(key, locale),
    })),
    ...['/', '*', '-', '.', '^', '+', '(', ')', ',', '!'].map((text) => ({
      selector: `.scientific-keypad-panel [data-key="${text}"] button`,
      glyph: text === '*' ? '×' : text === '/' ? '÷' : text,
      name: t('scientific.insert', locale, { text }),
    })),
    ...(
      [
        ['0-0', '√', 'sqrt'],
        ['0-0', '∛', 'cbrt'],
        ['3-0', 'Σ', 'sum'],
        ['3-0', 'Π', 'prod'],
        ['3-2', '∫', 'integral'],
      ] as const
    ).map(([id, glyph, name]) => ({
      selector: `.scientific-keypad-panel [data-key="${id}"] button`,
      glyph,
      name: t('scientific.insertFunction', locale, {
        name: `${glyph} (${name})`,
        description: functionRegistry[name]?.doc[locale] ?? name,
      }),
    })),
    {
      selector: '.scientific-keypad-panel [data-key="clear"] button',
      glyph: 'C',
      name: t('scientific.clear', locale),
    },
    {
      selector: '.scientific-keypad-panel [data-key="pi"] button',
      glyph: 'π',
      name: t('scientific.insert', locale, { text: 'pi' }),
    },
    {
      selector: '.scientific-keypad-panel [data-key="degree"] button',
      glyph: '°',
      name: t('scientific.insert', locale, { text: '°' }),
    },
    {
      selector: '.scientific-keypad-panel [data-key="equals"] button',
      glyph: '=',
      name: t('simple.equals', locale),
    },
    {
      selector: '.graph-toolbar button',
      glyph: '+',
      name: t('graph.zoomIn', locale),
    },
    {
      selector: '.graph-toolbar button',
      glyph: '−',
      name: t('graph.zoomOut', locale),
    },
  ];
  const reviewed = [];
  for (const result of results) {
    for (const node of result.nodes) {
      expect(node.target).toHaveLength(1);
      const selector = node.target[0];
      if (typeof selector !== 'string')
        throw new Error('Unreviewed shadow target');
      const control = page.locator(selector);
      await expect(control).toHaveCount(1);
      const glyph = (await control.textContent())?.trim();
      const matches = [];
      for (const entry of known) {
        if (
          entry.glyph === glyph &&
          (await control.evaluate(
            (el, scope) => el.matches(scope),
            entry.selector,
          ))
        )
          matches.push(entry);
      }
      expect(matches, `Unreviewed label: ${node.html}`).toHaveLength(1);
      const expected = matches[0];
      if (!expected) throw new Error('Unreviewed symbol');
      await expect(control).toHaveAccessibleName(expected.name);
      reviewed.push({ target: node.target, glyph, name: expected.name });
    }
  }
  await test
    .info()
    .attach(`label-symbol-review-${test.info().attachments.length}`, {
      body: JSON.stringify(reviewed, null, 2),
      contentType: 'application/json',
    });
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
  test(`symbol review rejects unknown controls, changed actions and formula mismatches (${locale})`, async ({
    page,
  }) => {
    await qaSetup(page, 'light', '#6750a4', locale);
    await page.goto('/m8e-calc/#/simple');
    await ready(page, 'simple');
    const rule = 'label-content-name-mismatch';
    const scan = () =>
      new AxeBuilder({ page })
        .options({ rules: { [rule]: { enabled: true } } })
        .analyze();
    const clear = page.locator('.simple-calculator [data-key="clear"] button');
    await clear.evaluate((el) => el.setAttribute('aria-label', 'Wrong action'));
    const changed = await scan();
    const changedRule = changed.incomplete.find(({ id }) => id === rule);
    const changedNode = changedRule?.nodes.find(({ html }) =>
      html.includes('aria-label="Wrong action"'),
    );
    if (!changedRule || !changedNode)
      throw new Error('Missing changed-action counterexample');
    await expect(
      reviewSymbols(page, locale, [{ ...changedRule, nodes: [changedNode] }]),
    ).rejects.toThrow();
    await clear.evaluate(
      (el, name) => el.setAttribute('aria-label', name),
      t('simple.clear', locale),
    );
    await page.evaluate(() => {
      const button = document.createElement('button');
      button.id = 'wp04-unreviewed';
      button.textContent = '?';
      button.setAttribute('aria-label', 'Unreviewed symbol');
      document.body.append(button);
    });
    const unknown = await scan();
    const unknownRule = unknown.incomplete.find(({ id }) => id === rule);
    const unknownNode = unknownRule?.nodes.find(({ target }) =>
      target.includes('#wp04-unreviewed'),
    );
    if (!unknownRule || !unknownNode)
      throw new Error('Missing unknown-symbol counterexample');
    await expect(
      reviewSymbols(page, locale, [{ ...unknownRule, nodes: [unknownNode] }]),
    ).rejects.toThrow();
    await page.locator('#wp04-unreviewed').evaluate((el) => {
      el.textContent = '1/x';
    });
    expect(
      (await scan()).violations.some(
        ({ id, nodes }) =>
          id === rule &&
          nodes.some(({ target }) => target.includes('#wp04-unreviewed')),
      ),
    ).toBe(true);
  });

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
    await accessible(page, locale);

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
      await accessible(page, locale);
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
    await accessible(page, locale);

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
    await accessible(page, locale);
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
    await accessible(page, locale);

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
    await accessible(page, locale);
    expect(requests).toBe(1);
  });
}
