import { test, expect } from '@playwright/test';
// Feature-state checks are isolated from SW update toasts; the production
// matrix, comfort and pwa-update suites exercise the real worker separately.
test.use({ serviceWorkers: 'block' });

for (const language of ['de', 'en'] as const) {
  test(`AP22 keyboard table rounding, committed localized steps and trace (${language})`, async ({
    page,
  }) => {
    await page.addInitScript((language) => {
      localStorage.setItem(
        'm8e-calc.settings',
        JSON.stringify({
          version: 4,
          state: {
            language,
            grouping: true,
            decimalSeparator: 'auto',
            motionLevel: 'off',
          },
        }),
      );
    }, language);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/m8e-calc/#/graph');
    await page
      .getByRole('button', {
        name: language === 'de' ? 'Hinzufügen' : 'Add',
        exact: true,
      })
      .click();
    await page.locator('.graph-editor [role="textbox"]').fill('1e-13');
    const canvas = page.getByRole('application');
    await canvas.focus();
    await canvas.press('ArrowRight');
    await expect(page.locator('.graph-trace')).toContainText('y = 1E-13');
    await expect(page.locator('.graph-trace')).not.toContainText('f(x)');
    const toggle = page.getByRole('button', {
      name: language === 'de' ? 'Wertetabelle' : 'Value table',
      exact: true,
    });
    await toggle.focus();
    await toggle.press('Enter');
    const table = page.locator('.graph-table-section');
    await expect(table.locator('tbody tr').first()).toContainText('1E-13');
    const rounding = table.getByRole('button', {
      name: language === 'de' ? /Rundung/ : /Rounding/,
    });
    await rounding.click();
    await page
      .getByRole('option', {
        name: language === 'de' ? '2 Nachkommastellen' : '2 decimal places',
        exact: true,
      })
      .click();
    await expect(
      table.locator('tbody tr').first().locator('td').last(),
    ).toHaveText('0');
    await expect(table).toContainText(
      language === 'de' ? 'Gerundete Anzeige' : 'Rounded display',
    );
    const step = table.getByRole('textbox', {
      name: language === 'de' ? 'Schrittweite' : 'Step size',
    });
    const previous = await table.locator('tbody tr').count();
    await step.fill(language === 'de' ? '0,1' : '0.1');
    await expect(table.locator('tbody tr')).toHaveCount(previous);
    await step.press('Enter');
    await expect(table.locator('tbody tr')).toHaveCount(201);
    await step.fill('');
    await step.press('Enter');
    await expect(step).toHaveAttribute('aria-invalid', 'true');
    await expect(table.locator('tbody tr')).toHaveCount(201);
    await step.fill(language === 'de' ? '0,001' : '0.001');
    await step.press('Enter');
    await expect(table.locator('tbody tr')).toHaveCount(500);
    await expect(table.getByRole('status')).toContainText('500');
    await expect(table.locator('tbody tr').first()).toBeVisible();
    const tableBox = await table.locator('.graph-table-scroll').boundingBox();
    expect(tableBox?.height).toBeGreaterThanOrEqual(100);
    await page.screenshot({
      path: `test-results/ap22-${language}.png`,
      fullPage: true,
    });
    await toggle.click();
    await toggle.click();
    await expect(rounding).toContainText('2');
  });
}

test('AP22 parameters apply localized ranges atomically; trace names all curve types', async ({
  page,
}) => {
  await page.goto('/m8e-calc/#/graph');
  await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
  const editor = page.locator('.graph-editor [role="textbox"]');
  await editor.fill('a*x');
  await page.getByText('Bereich und Schrittweite', { exact: true }).click();
  const range = page.locator('.graph-parameter form');
  await range.getByRole('textbox', { name: 'Minimum' }).fill('');
  await range.getByRole('button', { name: 'Anwenden' }).click();
  await expect(range.getByRole('alert')).toContainText('Bereich');
  const slider = page.getByRole('slider', { name: 'a', exact: true });
  await expect(slider).toHaveAttribute('min', '-5');
  await range.getByRole('textbox', { name: 'Minimum' }).fill('-2');
  await range.getByRole('textbox', { name: 'Maximum' }).fill('2');
  await range.getByRole('textbox', { name: 'Schrittweite' }).fill('0,1');
  await range.getByRole('button', { name: 'Anwenden' }).click();
  await expect(slider).toHaveAttribute('min', '-2');
  for (const [input, parameter] of [
    ['x=3', null],
    ['(t,t^2)', 't ='],
    ['r=1', 'θ ='],
  ] as const) {
    await editor.fill(input);
    const canvas = page.getByRole('application');
    await canvas.focus();
    await canvas.press('Escape');
    await canvas.press('ArrowRight');
    const trace = page.locator('.graph-trace');
    await expect(trace).toContainText('x =');
    await expect(trace).toContainText('y =');
    if (parameter) await expect(trace).toContainText(parameter);
  }
});

for (const [language, decimalSeparator, grouping, input, expected] of [
  ['en', 'comma', true, '0,1', '1.234,5'],
  ['de', 'point', false, '0.1', '1234.5'],
] as const) {
  test(`AP22 explicit separator ${decimalSeparator} and grouping ${grouping}`, async ({
    page,
  }) => {
    await page.addInitScript(
      ({ language, decimalSeparator, grouping }) => {
        localStorage.setItem(
          'm8e-calc.settings',
          JSON.stringify({
            version: 4,
            state: { language, decimalSeparator, grouping, motionLevel: 'off' },
          }),
        );
      },
      { language, decimalSeparator, grouping },
    );
    await page.goto('/m8e-calc/#/graph');
    await page
      .getByRole('button', {
        name: language === 'de' ? 'Hinzufügen' : 'Add',
        exact: true,
      })
      .click();
    await page.locator('.graph-editor [role="textbox"]').fill('1234.5');
    await page
      .getByRole('button', {
        name: language === 'de' ? 'Wertetabelle' : 'Value table',
        exact: true,
      })
      .click();
    const table = page.locator('.graph-table-section');
    await expect(
      table.locator('tbody tr').first().locator('td').last(),
    ).toHaveText(expected);
    const step = table.getByRole('textbox', {
      name: language === 'de' ? 'Schrittweite' : 'Step size',
    });
    await step.fill(input);
    await step.press('Enter');
    await expect(table.locator('tbody tr')).toHaveCount(201);
    await page.getByRole('application').focus();
    await page.getByRole('application').press('ArrowRight');
    await expect(page.locator('.graph-trace')).toContainText(`y = ${expected}`);
  });
}
