import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const modes = ['simple', 'scientific', 'convert', 'graph'] as const;
const labels = ['Einfach', 'Wissenschaftlich', 'Umrechner', 'Graphen'] as const;
test('switches lazy modes, resumes the last mode and persists visibility separately', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/m8e-calc/');
  for (let i = 0; i < modes.length; i++) {
    await page.getByRole('link', { name: labels[i], exact: true }).click();
    await expect(page.locator('.mode-stage')).toHaveAttribute(
      'data-mode',
      modes[i] ?? 'simple',
    );
    const toggle = page.getByRole('button', {
      name: 'Verlauf ein-/ausblenden',
    });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('Control+h');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  }
  await page.goto('/m8e-calc/');
  await expect(
    page.getByRole('link', { name: 'Graphen', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Verlauf ein-/ausblenden' }),
  ).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('button', { name: 'Verlauf ein-/ausblenden' }).click();
  await page.getByRole('link', { name: 'Einfach', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Verlauf ein-/ausblenden' }),
  ).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('link', { name: 'Graphen', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Verlauf ein-/ausblenden' }),
  ).toHaveAttribute('aria-expanded', 'false');
});
for (const [width, height] of [
  [1920, 1080],
  [2560, 1440],
  [3840, 2160],
  [3440, 1440],
])
  test(`docked shell has no overflow at ${width}×${height}`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: width ?? 1920,
      height: height ?? 1080,
    });
    await page.goto('/m8e-calc/');
    await expect(
      page.getByRole('heading', { name: 'Einfach rechnen.' }),
    ).toBeVisible();
    for (const label of labels) {
      await page.getByRole('link', { name: label, exact: true }).click();
      const activeStage = page.locator('.mode-stage:not([aria-hidden])');
      await expect(activeStage).toHaveAttribute(
        'data-mode',
        modes[labels.indexOf(label)] ?? 'simple',
      );
      await expect(activeStage).toHaveCSS('opacity', '1');
      await page
        .getByRole('button', { name: 'Verlauf ein-/ausblenden' })
        .click();
      await expect(
        page.getByRole('complementary', { name: 'Verlauf' }),
      ).toBeVisible();
      await expect
        .poll(() =>
          page.evaluate(() => {
            const root = document.documentElement;
            const shell = document.querySelector('.app-shell');
            const stage = document.querySelector('.mode-stage-frame');
            const rail = document.querySelector('.shell-rail');
            const toolbar = document.querySelector('.shell-toolbar');
            const history = document.querySelector(
              '.shell-history .ui-side-sheet-docked',
            );
            return (
              root.scrollWidth <= innerWidth &&
              root.scrollHeight <= innerHeight &&
              history instanceof HTMLElement &&
              history.getBoundingClientRect().right <= innerWidth + 1 &&
              history.parentElement instanceof HTMLElement &&
              Math.abs(
                history.parentElement.clientWidth - history.clientWidth,
              ) <= 1 &&
              [shell, stage, rail, toolbar, history].every(
                (element) =>
                  element instanceof HTMLElement &&
                  element.scrollWidth <= element.clientWidth + 1 &&
                  element.scrollHeight <= element.clientHeight + 1,
              )
            );
          }),
        )
        .toBe(true)
        .catch(async (error) => {
          console.log(
            'QA_OVERFLOW',
            await page.evaluate(() =>
              Array.from(
                document.querySelectorAll(
                  '.app-shell,.mode-stage-frame,.mode-stage,.shell-rail,.shell-toolbar,.shell-history .ui-side-sheet-docked',
                ),
              ).map((element) => {
                const e = element as HTMLElement;
                return {
                  className: e.className,
                  mode: e.dataset.mode,
                  client: [e.clientWidth, e.clientHeight],
                  scroll: [e.scrollWidth, e.scrollHeight],
                  rect: e.getBoundingClientRect().toJSON(),
                };
              }),
            ),
          );
          throw error;
        });
    }
    await page.screenshot({ path: `test-results/app-shell-${width}.png` });
  });
test('history is modal below 1440, closes on Escape and returns focus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/m8e-calc/');
  const toggle = page.getByRole('button', { name: 'Verlauf ein-/ausblenden' });
  await toggle.click();
  await expect(page.getByRole('dialog', { name: 'Verlauf' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});
test('rehydrates real entries, pins/searches/copies/exports and undoes clearing', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.addInitScript(() =>
    localStorage.setItem(
      'm8e-calc.history',
      JSON.stringify({
        version: 1,
        state: {
          entries: [
            {
              id: 'test',
              mode: 'simple',
              ts: Date.now(),
              input: '2 + 3',
              result: '5',
              pinned: false,
              payload: {
                version: 1,
                entry: { value: '3', expression: '3' },
                accumulator: '2',
                operator: '+',
              },
            },
          ],
          visibility: { simple: true },
          limit: 500,
        },
      }),
    ),
  );
  await page.goto('/m8e-calc/');
  await page.getByRole('button', { name: 'Anheften' }).click();
  await expect(
    page.getByRole('button', { name: 'Lösen', exact: true }),
  ).toBeVisible();
  await page.getByRole('searchbox').fill('no match');
  await expect(page.getByText('Keine passenden Einträge.')).toBeVisible();
  await page.getByRole('searchbox').clear();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'JSON', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('m8e-calc-simple.json');
  await page.getByRole('button', { name: 'Wiederherstellen: 2 + 3' }).click();
  await expect(page.getByText('Eintrag wiederhergestellt.')).toBeVisible();
  await page
    .getByRole('button', { name: 'Schließen', exact: true })
    .last()
    .click();
  await page.getByRole('button', { name: 'Alles löschen' }).click();
  await expect(page.getByText('Ein neuer Anfang.')).toBeVisible();
  await page.getByRole('button', { name: 'Rückgängig' }).click();
  await expect(
    page.getByRole('button', { name: 'Wiederherstellen: 2 + 3' }),
  ).toBeVisible();
});
test('settings persist language, number preferences, limit and validated import', async ({
  page,
}) => {
  await page.goto('/m8e-calc/');
  await page
    .getByRole('button', { name: 'Einstellungen', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Einstellungen' });
  await dialog.getByRole('button', { name: /Dezimaltrennzeichen/ }).click();
  await page.getByRole('option', { name: 'Punkt' }).click();
  await dialog.getByRole('spinbutton').fill('100');
  await dialog.getByRole('button', { name: /Sprache/ }).click();
  await page.getByRole('option', { name: 'Englisch' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.keyboard.press('Escape');
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const english = page.getByRole('dialog', { name: 'Settings' });
  await expect(english.getByRole('spinbutton')).toHaveValue('100');
  await english.locator('input[type=file]').setInputFiles({
    name: 'settings.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        version: 2,
        settings: {
          language: 'de',
          historyLimit: 50,
          decimalSeparator: 'comma',
        },
      }),
    ),
  });
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  await expect(page.getByRole('spinbutton')).toHaveValue('50');
});
test('shell and open settings pass axe in light and dark', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/m8e-calc/');
  for (const theme of ['Hell', 'Dunkel']) {
    await page
      .getByRole('radio', { name: theme, exact: true })
      .locator('..')
      .locator('..')
      .click();
    await page.waitForTimeout(800);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
  await page
    .getByRole('button', { name: 'Einstellungen', exact: true })
    .click();
  const modal = page.locator('.settings-dialog');
  await expect(modal).toBeVisible();
  await expect(modal).not.toHaveAttribute('data-entering');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('reduced motion uses opacity only and remains usable through rapid mode changes', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/m8e-calc/');
  await page
    .getByRole('link', { name: 'Wissenschaftlich', exact: true })
    .click();
  const translations = await page.evaluate(async () => {
    const values: number[] = [];
    for (let i = 0; i < 20; i++) {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      document
        .querySelectorAll('.mode-stage')
        .forEach((element) =>
          values.push(
            new DOMMatrixReadOnly(getComputedStyle(element).transform).m41,
          ),
        );
    }
    return values;
  });
  expect(translations.every((value) => value === 0)).toBe(true);
  await page.getByRole('link', { name: 'Graphen', exact: true }).click();
  await page.getByRole('link', { name: 'Einfach', exact: true }).click();
  await expect(page.locator('.mode-stage:not([aria-hidden])')).toHaveAttribute(
    'data-mode',
    'simple',
  );
});
