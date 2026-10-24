import { replaceGraphExpression } from './graphEditor';
import { test, expect, type Page } from '@playwright/test';
import { allowClipboard } from './clipboard';
test.use({ serviceWorkers: 'block' });
async function add(page: Page, input: string) {
  await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
  await replaceGraphExpression(
    page.locator('.graph-editor [role="textbox"]').last(),
    input,
  );
}
async function sampled(page: Page, count: number) {
  const canvas = page.locator('canvas.graph-canvas');
  await expect(canvas).toHaveAttribute('data-sampling', 'false', {
    timeout: 15000,
  });
  await expect
    .poll(
      async () =>
        JSON.parse((await canvas.getAttribute('data-sample-result')) ?? '[]')
          .length,
      { timeout: 15000 },
    )
    .toBe(count);
  return JSON.parse(
    (await canvas.getAttribute('data-sample-result')) ?? '[]',
  ) as {
    id: string;
    signature: string;
    components: number;
    error?: string;
    truncated: boolean;
    diagnostics?: { status: string; limits: string[] };
  }[];
}
test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('AP27 contours, invalid input, component boundaries and explicit action gates', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/m8e-calc/#/graph');
  await add(page, 'x^2+y^2=4');
  const canvas = page.locator('canvas.graph-canvas');
  const editor = page.locator('.graph-editor [role="textbox"]');
  for (const [input, minimum] of [
    ['x^2+y^2=4', 1],
    ['x*y=1', 2],
    ['x*y=0', 4],
    ['((x-3)^2+y^2-1)*((x+3)^2+y^2-1)=0', 2],
  ] as const) {
    await replaceGraphExpression(editor, input);
    const result = await sampled(page, 1);
    expect(result[0]?.components).toBeGreaterThanOrEqual(minimum);
    expect(result[0]?.error).toBeUndefined();
    expect(result[0]?.truncated).toBe(false);
  }
  await canvas.focus();
  await canvas.press('ArrowRight');
  await expect(page.locator('.graph-trace')).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Aktionen für Funktion 1' })
    .press('Enter');
  for (const name of [
    'Nullstellen',
    'Extrema',
    'Schnittpunkte',
    'Tangente',
    'Integral',
  ])
    await expect(
      page.getByRole('menuitem', { name, exact: true }),
    ).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Wertetabelle', exact: true }).click();
  const table = page.getByRole('region', { name: 'Wertetabelle' });
  await expect(table.getByRole('status')).toContainText(
    'keinen eindeutigen y-Wert',
  );
  await expect(table.getByRole('table')).toHaveCount(0);
  await expect(table.getByRole('button', { name: 'Anwenden' })).toBeDisabled();
  await page.screenshot({
    path: info.outputPath('implicit-components-de-light.png'),
  });
  await replaceGraphExpression(editor, 'x^2+y^2=');
  await expect(page.getByRole('alert')).toContainText('Eingabe prüfen');
  await sampled(page, 0);
  await expect(table.getByRole('table')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('AP27 mixed list animation, keyboard visibility/reordering/deletion and stable fit', async ({
  page,
}) => {
  await page.goto('/m8e-calc/#/graph');
  await add(page, 'x^2+y^2=a');
  await add(page, 'sin(x)');
  await sampled(page, 2);
  const canvas = page.locator('canvas.graph-canvas');
  const fit = page.getByRole('button', { name: 'Anpassen', exact: true });
  await fit.click();
  const target = await canvas.getAttribute('data-target-bounds');
  const basis = await canvas.getAttribute('data-fit-basis');
  for (let i = 0; i < 12; i++) await fit.click();
  expect(await canvas.getAttribute('data-target-bounds')).toBe(target);
  expect(await canvas.getAttribute('data-fit-basis')).toBe(basis);
  await page.getByRole('button', { name: 'Parameter a abspielen' }).click();
  await page.waitForTimeout(350);
  await page.getByRole('button', { name: 'Parameter a anhalten' }).click();
  const result = await sampled(page, 2);
  expect(result[0]?.components).toBeGreaterThan(0);
  const slider = page.getByRole('slider', { name: 'a', exact: true });
  await slider.focus();
  await slider.press('ArrowRight');
  await sampled(page, 2);
  await page
    .getByRole('button', { name: 'Sichtbarkeit von Funktion 1' })
    .press('Enter');
  await sampled(page, 1);
  await page
    .getByRole('button', { name: 'Sichtbarkeit von Funktion 1' })
    .press('Enter');
  await page
    .getByRole('button', { name: 'Aktionen für Funktion 1' })
    .press('Enter');
  await page.getByRole('menuitem', { name: 'Nach unten' }).click();
  await expect(
    page.locator('.graph-editor [role="textbox"]').first(),
  ).toHaveText('sin(x)');
  await sampled(page, 2);
  await page
    .getByRole('button', { name: 'Aktionen für Funktion 2' })
    .press('Enter');
  await page.getByRole('menuitem', { name: 'Löschen', exact: true }).click();
  await sampled(page, 1);
});

test('AP27 typing, zoom/pan/resize keep the latest signature and remain responsive under budget exhaustion', async ({
  page,
}) => {
  await page.goto('/m8e-calc/#/graph');
  await add(page, 'x^2+y^2=4');
  await sampled(page, 1);
  const editor = page.locator('.graph-editor [role="textbox"]');
  for (const input of [
    'sin(100*x)*sin(100*y)=0',
    'x^2+y^2=9',
    'x*y=1',
    'x^2+y^2=4',
  ])
    await replaceGraphExpression(editor, input);
  const canvas = page.locator('canvas.graph-canvas');
  const box = await canvas.boundingBox();
  if (!box) throw Error('Canvas');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (let i = 0; i < 4; i++) await page.mouse.wheel(0, i % 2 ? 100 : -100);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 60,
    box.y + box.height / 2 + 30,
    { steps: 5 },
  );
  await page.mouse.up();
  await page.setViewportSize({ width: 1450, height: 950 });
  let result = await sampled(page, 1);
  expect(JSON.parse(result[0]?.signature ?? '{}').kind).toBe('implicit');
  expect(result[0]?.components).toBe(1);
  await replaceGraphExpression(editor, 'sin(100*x)*sin(100*y)=0');
  result = await sampled(page, 1);
  expect(result[0]?.truncated || result[0]?.error === 'timeout').toBe(true);
  await expect(page.locator('.graph-sampling-status')).toContainText(
    /Arbeitsgrenze|3 Sekunden/,
  );
  await replaceGraphExpression(editor, 'x^2+y^2=4');
  result = await sampled(page, 1);
  expect(result[0]?.truncated).toBe(false);
  await canvas.focus();
  await canvas.press('+');
  await expect(canvas).toBeFocused();
});

test('AP27 history, old/new links, reload and PNG contain the displayed contour', async ({
  page,
  context,
}, info) => {
  test.setTimeout(60000);
  await allowClipboard(context);
  await page.goto('/m8e-calc/#/graph');
  await add(page, 'x^2+y^2=4');
  await add(page, 'x');
  await sampled(page, 2);
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          JSON.parse(
            localStorage.getItem('m8e-calc.history') ?? '{}',
          ).state?.entries?.some(
            (e: { mode: string; input: string }) =>
              e.mode === 'graph' && e.input.includes('x^2+y^2=4'),
          ),
        ),
      { timeout: 8000 },
    )
    .toBe(true);
  await page.getByRole('button', { name: 'Link teilen', exact: true }).click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  await replaceGraphExpression(
    page.locator('.graph-editor [role="textbox"]').first(),
    'x*y=1',
  );
  await page
    .getByRole('button', { name: /^Verlauf \d+ ein-\/ausblenden$/ })
    .click();
  await page
    .getByRole('button', {
      name: 'Wiederherstellen: x^2+y^2=4 ; x',
      exact: true,
    })
    .first()
    .click();
  await expect(
    page.locator('.graph-editor [role="textbox"]').first(),
  ).toHaveText('x^2+y^2=4');
  await page.goto(link);
  await page.reload();
  await sampled(page, 2);
  const canvas = page.locator('canvas.graph-canvas');
  // Compare actual colored contour pixels in the downloaded PNG with the screen.
  const screen = await canvas.evaluate((c: HTMLCanvasElement) =>
    c.toDataURL('image/png'),
  );
  const downloadEvent = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'PNG exportieren', exact: true })
    .click();
  const download = await downloadEvent;
  await download.saveAs(info.outputPath('implicit-export.png'));
  const { readFile } = await import('node:fs/promises');
  const bytes = await readFile(info.outputPath('implicit-export.png'));
  const exported = 'data:image/png;base64,' + bytes.toString('base64');
  expect(
    await page.evaluate(
      async ({ screen, exported }) => {
        const pixels = async (src: string) => {
          const image = new Image();
          image.src = src;
          await image.decode();
          const c = document.createElement('canvas');
          c.width = image.width;
          c.height = image.height;
          const ctx = c.getContext('2d');
          if (!ctx) throw Error('Context');
          ctx.drawImage(image, 0, 0);
          return ctx.getImageData(0, 0, c.width, c.height).data;
        };
        const [a, b] = await Promise.all([pixels(screen), pixels(exported)]);
        const dot = document.querySelector('.graph-color-dot');
        if (!dot) throw Error('Missing implicit palette color');
        const swatch = document.createElement('canvas').getContext('2d');
        if (!swatch) throw Error('Missing color context');
        swatch.fillStyle = getComputedStyle(dot).backgroundColor;
        swatch.fillRect(0, 0, 1, 1);
        const ink = swatch.getImageData(0, 0, 1, 1).data;
        let colored = 0,
          matches = 0;
        for (let i = 0; i < a.length; i += 4)
          if (
            Math.max(
              Math.abs((a[i] ?? 0) - (ink[0] ?? 0)),
              Math.abs((a[i + 1] ?? 0) - (ink[1] ?? 0)),
              Math.abs((a[i + 2] ?? 0) - (ink[2] ?? 0)),
            ) < 24
          ) {
            colored++;
            if (
              Math.abs((a[i] ?? 0) - (b[i] ?? 0)) +
                Math.abs((a[i + 1] ?? 0) - (b[i + 1] ?? 0)) +
                Math.abs((a[i + 2] ?? 0) - (b[i + 2] ?? 0)) <
              12
            )
              matches++;
          }
        return colored > 200 && matches / colored > 0.98;
      },
      { screen, exported },
    ),
  ).toBe(true);
});

test('AP27 unavailable Worker has a localized explanation and no synchronous implicit fallback', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.Worker = class {
      constructor() {
        throw Error('worker disabled for regression');
      }
    } as unknown as typeof Worker;
  });
  await page.goto('/m8e-calc/#/graph');
  await add(page, 'x^2+y^2=4');
  const result = await sampled(page, 1);
  expect(result[0]?.error).toBe('worker');
  await expect(page.locator('.graph-sampling-status')).toContainText(
    'Sampling-Worker ist nicht verfügbar',
  );
  await add(page, 'sin(x)');
  const mixed = await sampled(page, 2);
  expect(mixed[1]?.components).toBeGreaterThan(0);
});

test('AP27 English dark theme shows the same action limits and keeps keyboard focus', async ({
  browser,
}, info) => {
  const context = await browser.newContext({
    locale: 'en-US',
    colorScheme: 'dark',
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
    viewport: { width: 1600, height: 1000 },
  });
  const page = await context.newPage();
  await page.goto('/m8e-calc/#/graph');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await replaceGraphExpression(
    page.locator('.graph-editor [role="textbox"]'),
    'x^2+y^2=4',
  );
  await sampled(page, 1);
  await expect(page.getByText(/does not define one y value/)).toBeVisible();
  const actions = page.getByRole('button', { name: 'Actions for function 1' });
  await actions.focus();
  await actions.press('Enter');
  await expect(
    page.getByRole('menuitem', { name: 'Integral', exact: true }),
  ).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(actions).toBeFocused();
  await page.screenshot({ path: info.outputPath('implicit-en-dark.png') });
  await context.close();
});

test('AP27 delayed and duplicated real Worker replies cannot replace a newer equation', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    let hold = true;
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.addEventListener('message', (event: MessageEvent) => {
          if (
            hold &&
            event.data.curves?.some(
              (c: { diagnostics?: unknown }) => c.diagnostics,
            )
          ) {
            hold = false;
            event.stopImmediatePropagation();
            Object.assign(window, { __ap27Held: true });
            const data = event.data;
            setTimeout(
              () => this.dispatchEvent(new MessageEvent('message', { data })),
              1200,
            );
            setTimeout(
              () => this.dispatchEvent(new MessageEvent('message', { data })),
              2200,
            );
          }
        });
      }
    };
  });
  await page.goto('/m8e-calc/#/graph');
  await add(page, 'x^2+y^2=4');
  await expect
    .poll(() => page.evaluate(() => '__ap27Held' in window))
    .toBe(true);
  await page
    .getByRole('button', { name: 'PNG exportieren', exact: true })
    .click();
  await expect(
    page.getByText(
      'Die neue Kurve wird noch berechnet. PNG-Export anschließend erneut starten.',
    ),
  ).toBeVisible();
  await replaceGraphExpression(
    page.locator('.graph-editor [role="textbox"]'),
    'x*y=1',
  );
  const latest = await sampled(page, 1);
  expect(latest[0]?.components).toBeGreaterThanOrEqual(2);
  await page.waitForTimeout(1100);
  const after = await sampled(page, 1);
  expect(after[0]?.signature).toBe(latest[0]?.signature);
  expect(after[0]?.components).toBe(latest[0]?.components);
});

test('AP27 stalled Worker stops after the deadline and a new equation recovers on a new Worker', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    let drop = true;
    window.Worker = class extends NativeWorker {
      postMessage(
        message: unknown,
        transfer: Transferable[] | StructuredSerializeOptions = [],
      ): void {
        const curves = (message as { curves?: { curve: { kind: string } }[] })
          .curves;
        if (drop && curves?.some((c) => c.curve.kind === 'implicit')) {
          drop = false;
          return;
        }
        if (Array.isArray(transfer)) super.postMessage(message, transfer);
        else super.postMessage(message, transfer);
      }
    };
  });
  await page.goto('/m8e-calc/#/graph');
  await add(page, 'x^2+y^2=4');
  const result = await sampled(page, 1);
  expect(result[0]?.error).toBe('timeout');
  await expect(page.locator('.graph-sampling-status')).toContainText(
    '3 Sekunden',
  );
  await replaceGraphExpression(
    page.locator('.graph-editor [role="textbox"]'),
    'x*y=1',
  );
  const recovered = await sampled(page, 1);
  expect(recovered[0]?.error).toBeUndefined();
  expect(recovered[0]?.components).toBeGreaterThanOrEqual(2);
});
