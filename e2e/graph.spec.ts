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

test('canvas reloads theme and accent tokens; PNG copies to the clipboard', async ({
  page,
  context,
}) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/m8e-calc/#/graph');
  await addFunction(page, 'sin(x)');
  const canvas = page.locator('canvas.graph-canvas');
  await expect(canvas).toHaveAttribute('data-curve-count', '1');
  const pixel = () =>
    canvas.evaluate((element: HTMLCanvasElement) =>
      Array.from(
        element.getContext('2d')?.getImageData(0, 0, 1, 1).data ?? [],
      ).join(),
    );
  const light = await pixel();
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect.poll(pixel).not.toBe(light);
  const color = await page
    .locator('.graph-color-dot')
    .evaluate((element) => getComputedStyle(element).backgroundColor);
  await page.getByRole('button', { name: 'Akzentfarbe anpassen' }).click();
  await page
    .getByRole('dialog', { name: 'Deine Farbwelt' })
    .getByRole('button', { name: 'Koralle', exact: true })
    .click();
  await page.keyboard.press('Escape');
  await expect
    .poll(() =>
      page
        .locator('.graph-color-dot')
        .evaluate((element) => getComputedStyle(element).backgroundColor),
    )
    .not.toBe(color);
  await page.getByRole('button', { name: 'PNG kopieren' }).click();
  await expect
    .poll(async () =>
      page.evaluate(async () => {
        const items = await navigator.clipboard.read();
        return items.some((item) => item.types.includes('image/png'));
      }),
    )
    .toBe(true);
});

async function settled(page: Page): Promise<void> {
  await expect(page.locator('canvas.graph-canvas')).toHaveAttribute(
    'data-moving',
    'false',
  );
}
async function targetBounds(page: Page) {
  return JSON.parse(
    (await page
      .locator('canvas.graph-canvas')
      .getAttribute('data-target-bounds')) ?? '{}',
  ) as Awaited<ReturnType<typeof bounds>>;
}
async function expectSameView(
  page: Page,
  expected: Awaited<ReturnType<typeof bounds>>,
): Promise<void> {
  await settled(page);
  const actual = await bounds(page);
  const box = await page.locator('canvas.graph-canvas').boundingBox();
  if (!box) throw Error('Canvas unavailable');
  for (const key of ['xMin', 'xMax', 'yMin', 'yMax'] as const) {
    const x = key.startsWith('x');
    const unit = x
      ? (expected.xMax - expected.xMin) / box.width
      : (expected.yMax - expected.yMin) / box.height;
    expect(Math.abs(actual[key] - expected[key]) / unit).toBeLessThanOrEqual(
      0.25,
    );
    expect(Number.isFinite(actual[key])).toBe(true);
  }
}

test('AP21 parabola fit is stable across 12 fits, rapid animated clicks and new navigation', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto('/m8e-calc/#/graph');
  await addFunction(page, 'x^2');
  await page
    .getByRole('checkbox', { name: 'Seitenverhältnis sperren' })
    .check();
  await settled(page);
  const fit = page.getByRole('button', { name: 'Anpassen', exact: true });
  await fit.click();
  await expect(page.locator('canvas.graph-canvas')).toHaveAttribute(
    'data-moving',
    'true',
  );
  const expected = await targetBounds(page);
  for (let i = 0; i < 12; i++) {
    await fit.click();
    expect(await targetBounds(page)).toEqual(expected);
  }
  await expectSameView(page, expected);
  expect(expected.xMax).toBeLessThan(200);
  const canvas = page.locator('canvas.graph-canvas');
  const box = await canvas.boundingBox();
  if (!box) throw Error('Canvas unavailable');
  const b = await bounds(page);
  expect(
    (b.xMax - b.xMin) / box.width / ((b.yMax - b.yMin) / box.height),
  ).toBeCloseTo(1, 8);
  await page.screenshot({ path: 'test-results/ap21-fit-stable.png' });
  await testInfo.attach('AP21 twelve fits with aspect lock', {
    path: 'test-results/ap21-fit-stable.png',
    contentType: 'image/png',
  });
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 70,
    box.y + box.height / 2 + 30,
    { steps: 6 },
  );
  await page.mouse.up();
  await settled(page);
  await page.mouse.wheel(0, -250);
  await settled(page);
  const basis = await targetBounds(page);
  await fit.click();
  const afterNavigation = await targetBounds(page);
  expect(afterNavigation).not.toEqual(expected);
  expect(
    JSON.parse((await canvas.getAttribute('data-fit-basis')) ?? '{}'),
  ).toEqual(basis);
  for (let i = 0; i < 10; i++) await fit.click();
  await expectSameView(page, afterNavigation);
  expect(errors).toEqual([]);
});

test('AP21 replaces obsolete fit goals on curve/parameter changes, presets, reset and resize', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto('/m8e-calc/#/graph');
  await addFunction(page, 'a*x^2');
  await page
    .getByRole('checkbox', { name: 'Seitenverhältnis sperren' })
    .check();
  await settled(page);
  const fit = page.getByRole('button', { name: 'Anpassen', exact: true });
  await fit.click();
  const before = await targetBounds(page);
  await page
    .getByRole('slider', { name: 'a', exact: true })
    .press('ArrowRight');
  await expect
    .poll(async () => (await targetBounds(page)).yMax)
    .toBeGreaterThan(before.yMax);
  await page.locator('.graph-editor [role="textbox"]').fill('sin(x)');
  await expect
    .poll(async () => (await targetBounds(page)).yMax)
    .toBeLessThan(10);
  await settled(page);
  await fit.click();
  await page.getByRole('button', { name: '1:1', exact: true }).click();
  await settled(page);
  const reset = await bounds(page);
  expect(reset.yMin).toBeLessThanOrEqual(-6);
  expect(reset.yMax).toBeGreaterThanOrEqual(6);
  await page.getByRole('button', { name: 'Ansicht' }).click();
  await page.getByRole('option', { name: 'Einheitskreis' }).click();
  await settled(page);
  await fit.click();
  const basis = await page
    .locator('canvas.graph-canvas')
    .getAttribute('data-fit-basis');
  await page.setViewportSize({ width: 1100, height: 1000 });
  await settled(page);
  expect(
    await page.locator('canvas.graph-canvas').getAttribute('data-fit-basis'),
  ).toBe(basis);
  await page
    .getByRole('checkbox', { name: 'Seitenverhältnis sperren' })
    .uncheck();
  await fit.click();
  const expected = await targetBounds(page);
  for (let i = 0; i < 10; i++) await fit.click();
  await expectSameView(page, expected);
  expect(errors).toEqual([]);
});

test('AP21 empty/hidden/invalid fits retain view; extreme constants remain usable', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/m8e-calc/#/graph');
  const fit = page.getByRole('button', { name: 'Anpassen', exact: true });
  const original = await bounds(page);
  await fit.click();
  await expectSameView(page, original);
  await addFunction(page, 'sin(');
  await fit.click();
  await expectSameView(page, original);
  const editor = page.locator('.graph-editor [role="textbox"]');
  await editor.fill('x^2');
  await page
    .getByRole('button', { name: 'Sichtbarkeit von Funktion 1' })
    .click();
  await fit.click();
  await expectSameView(page, original);
  await page
    .getByRole('button', { name: 'Sichtbarkeit von Funktion 1' })
    .click();
  for (const source of ['sqrt(-1)', '1.79e308', '1e-323']) {
    await editor.fill(source);
    await fit.click();
    await expectSameView(page, original);
  }
  for (const source of [
    '1e200',
    '1e-200',
    '0',
    'x=2',
    '(cos(t),sin(t))',
    'r=1+cos(theta)',
  ]) {
    await editor.fill(source);
    await fit.click();
    await settled(page);
    const expected = await bounds(page);
    expect(Object.values(expected).every(Number.isFinite)).toBe(true);
    expect(expected.xMax).toBeGreaterThan(expected.xMin);
    expect(expected.yMax).toBeGreaterThan(expected.yMin);
    await fit.click();
    await expectSameView(page, expected);
  }
  expect(errors).toEqual([]);
});

test('AP21 history and permalink retain the fit basis and copy the desired animated goal', async ({
  page,
  context,
}) => {
  test.setTimeout(45000);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/m8e-calc/#/graph');
  await addFunction(page, 'x^2');
  await page
    .getByRole('checkbox', { name: 'Seitenverhältnis sperren' })
    .check();
  await settled(page);
  await page.getByRole('button', { name: 'Anpassen', exact: true }).click();
  const expected = await targetBounds(page);
  await page
    .getByRole('button', { name: 'Link kopieren', exact: true })
    .click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const entries =
            JSON.parse(localStorage.getItem('m8e-calc.history') ?? '{}').state
              ?.entries ?? [];
          return entries.some(
            (e: { mode: string; payload: { fitBasis?: unknown } }) =>
              e.mode === 'graph' && e.payload.fitBasis,
          );
        }),
      { timeout: 8000 },
    )
    .toBe(true);
  await page.getByRole('button', { name: '1:1', exact: true }).click();
  await page.getByRole('button', { name: 'Verlauf ein-/ausblenden' }).click();
  await page
    .getByRole('button', { name: 'Wiederherstellen: x^2', exact: true })
    .first()
    .click();
  await expectSameView(page, expected);
  await page.getByRole('button', { name: 'Verlauf ein-/ausblenden' }).click();
  await page.getByRole('button', { name: 'Anpassen', exact: true }).click();
  await expectSameView(page, expected);
  await page.goto(link);
  await page.reload();
  await page.getByRole('button', { name: 'Anpassen', exact: true }).click();
  await expectSameView(page, expected);
});
