import { test, expect, type Page } from '@playwright/test';
async function addFunction(page: Page, input: string): Promise<void> {
  await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
  const editor = page.locator('.graph-editor [role="textbox"]').last();
  await editor.waitFor();
  await editor.fill(input);
}
async function bounds(page: Page) {
  return JSON.parse(
    (await page.locator('canvas.graph-canvas').getAttribute('data-bounds')) ??
      '{}',
  ) as { xMin: number; xMax: number; yMin: number; yMax: number };
}
test('AP13 input, wheel zoom, slider, roots, trace, integral, PNG and restoration', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/m8e-calc/#/graph');
  await addFunction(page, 'a*x^2-1');
  await expect(
    page.getByRole('slider', { name: 'a', exact: true }),
  ).toBeVisible();
  const before = await bounds(page),
    canvas = page.locator('canvas.graph-canvas'),
    box = await canvas.boundingBox();
  if (!box) throw Error('Canvas unavailable');
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.3);
  await page.mouse.wheel(0, -200);
  await expect
    .poll(async () => {
      const b = await bounds(page);
      return b.xMax - b.xMin;
    })
    .toBeLessThan(before.xMax - before.xMin);
  const slider = page.getByRole('slider', { name: 'a', exact: true });
  await slider.focus();
  await slider.press('ArrowRight');
  await expect(slider).toHaveValue('1.1');
  await page.getByRole('button', { name: 'Aktionen für Funktion 1' }).click();
  await page
    .getByRole('menuitem', { name: 'Nullstellen', exact: true })
    .click();
  await expect(page.locator('.graph-results .ui-chip')).toHaveCount(2);
  await canvas.focus();
  await canvas.press('ArrowRight');
  await expect(page.locator('.graph-trace')).toBeVisible();
  await page.getByRole('button', { name: 'Aktionen für Funktion 1' }).click();
  await page.getByRole('menuitem', { name: 'Integral', exact: true }).click();
  await expect(
    page.getByText('Integrationsbereich horizontal ziehen'),
  ).toBeVisible();
  await page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(page.locator('.graph-results output')).toContainText('∫');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'PNG exportieren' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('m8e-graph.png');
  await download.saveAs('test-results/graph-export.png');
  await expect
    .poll(
      async () =>
        page.evaluate(
          () =>
            JSON.parse(
              localStorage.getItem('m8e-calc.history') ?? '{}',
            ).state?.entries?.filter(
              (e: { mode: string }) => e.mode === 'graph',
            ).length ?? 0,
        ),
      { timeout: 7000 },
    )
    .toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
test('invalid input and visibility do not crash the plot; complete plot sets restore', async ({
  page,
}) => {
  await page.goto('/m8e-calc/#/graph');
  await addFunction(page, 'sin(');
  await expect(page.getByRole('alert')).toContainText('Eingabe prüfen');
  await page.locator('.graph-editor [role="textbox"]').fill('a*sin(x)');
  await expect(
    page.getByRole('slider', { name: 'a', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Sichtbarkeit von Funktion 1' })
    .click();
  await expect
    .poll(
      async () =>
        page.evaluate(
          () =>
            JSON.parse(
              localStorage.getItem('m8e-calc.history') ?? '{}',
            ).state?.entries?.filter(
              (e: { mode: string }) => e.mode === 'graph',
            ).length ?? 0,
        ),
      { timeout: 7000 },
    )
    .toBeGreaterThan(0);
  const entry = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem('m8e-calc.history') ?? '{}',
    ).state.entries.find((e: { mode: string }) => e.mode === 'graph'),
  );
  expect(entry.payload.rows[0].visible).toBe(false);
  expect(entry.payload.rows[0].input).toBe('a*sin(x)');
  await page.locator('.graph-editor [role="textbox"]').fill('x^2');
  await page.getByRole('button', { name: 'Verlauf ein-/ausblenden' }).click();
  await page
    .getByRole('button', { name: 'Wiederherstellen: a*sin(x)' })
    .click();
  await expect(page.locator('.graph-editor [role="textbox"]')).toHaveText(
    'a*sin(x)',
  );
  await expect(
    page.getByRole('slider', { name: 'a', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Sichtbarkeit von Funktion 1' }),
  ).toHaveAttribute('aria-pressed', 'false');
});
test('HiDPI canvas and reduced motion keep keyboard zoom usable', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
    locale: 'de-DE',
  });
  const page = await context.newPage();
  await page.goto('/m8e-calc/#/graph');
  await addFunction(page, 'sin(x)');
  const canvas = page.locator('canvas.graph-canvas');
  await expect(canvas).toHaveAttribute('data-curve-count', '1');
  expect(
    await canvas.evaluate((element: HTMLCanvasElement) =>
      Math.abs(element.width - element.clientWidth * 2),
    ),
  ).toBeLessThanOrEqual(2);
  const before = await bounds(page);
  await canvas.focus();
  await canvas.press('+');
  await expect
    .poll(async () => {
      const b = await bounds(page);
      return b.xMax - b.xMin;
    })
    .toBeLessThan(before.xMax - before.xMin);
  await context.close();
});
