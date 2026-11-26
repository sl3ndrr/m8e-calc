import { expect, test, type Page } from '@playwright/test';
import { replaceGraphExpression } from './graphEditor';

test.use({ serviceWorkers: 'block', viewport: { width: 1440, height: 960 } });

const numerical = 'Numerisch bestimmen';
const analytical = 'Analytisch bestimmen';
const results = (page: Page) =>
  page.getByRole('region', { name: 'Analyseergebnisse' });

async function addFunction(page: Page, expression: string, index = 0) {
  await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
  const editor = page.locator('.graph-editor [role="textbox"]').nth(index);
  await replaceGraphExpression(editor, expression);
  return editor;
}

async function selectAnalysis(page: Page, name: string) {
  await page.getByRole('button', { name: 'Aktionen für Funktion 1' }).click();
  await page.getByRole('menuitem', { name, exact: true }).click();
  const dialog = page.getByRole('dialog', { name });
  await expect(
    dialog.getByRole('group', { name: 'Bestimmungsmethode' }),
  ).toBeVisible();
  return dialog;
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'm8e-calc.settings',
      JSON.stringify({
        version: 5,
        state: { language: 'de', motionLevel: 'off' },
      }),
    );
  });
});

test('shows exact roots, worked steps and markers at the same coordinates', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    const fillRect = CanvasRenderingContext2D.prototype.fillRect;
    CanvasRenderingContext2D.prototype.fillRect = function (x, y, w, h) {
      if (
        this.canvas.classList.contains('graph-canvas') &&
        x === 0 &&
        y === 0
      ) {
        this.canvas.dataset.testMarkerCenters = '[]';
        this.canvas.dataset.testFrameSize = JSON.stringify({
          width: w,
          height: h,
        });
      }
      fillRect.call(this, x, y, w, h);
    };
    const arc = CanvasRenderingContext2D.prototype.arc;
    CanvasRenderingContext2D.prototype.arc = function (
      x,
      y,
      radius,
      start,
      end,
      counterclockwise,
    ) {
      if (this.canvas.classList.contains('graph-canvas') && radius === 5) {
        const centers: number[][] = JSON.parse(
          this.canvas.dataset.testMarkerCenters ?? '[]',
        );
        this.canvas.dataset.testMarkerCenters = JSON.stringify([
          ...centers,
          [x, y],
        ]);
      }
      arc.call(this, x, y, radius, start, end, counterclockwise);
    };
  });
  await page.goto('/m8e-calc/#/graph');
  const editor = await addFunction(page, 'x^2-2');
  const dialog = await selectAnalysis(page, 'Nullstellen');
  await expect(dialog.getByRole('button', { name: numerical })).toBeEnabled();
  await dialog.getByRole('button', { name: analytical }).click();
  const panel = results(page);
  await expect(
    panel.getByRole('button', { name: /Exakt · x = −√2 ≈ -1,414/ }),
  ).toBeVisible();
  await expect(
    panel.getByRole('button', { name: /Exakt · x = √2 ≈ 1,414/ }),
  ).toBeVisible();
  await panel.getByLabel(/Rechenweg für x = √2/).click();
  await expect(panel.getByText('x² − 2 = 0 ⇒ x² = 2 ⇒ x = √2')).toBeVisible();

  const canvas = page.locator('canvas.graph-canvas');
  await expect
    .poll(() =>
      canvas.evaluate((element: HTMLCanvasElement) => {
        const { xMin, xMax, yMin, yMax } = JSON.parse(
          element.dataset.bounds ?? '{}',
        );
        const { width, height } = JSON.parse(
          element.dataset.testFrameSize ?? '{}',
        );
        const centers: number[][] = JSON.parse(
          element.dataset.testMarkerCenters ?? '[]',
        );
        return centers.map(([x, y]) => [
          Number((xMin + ((x ?? NaN) / width) * (xMax - xMin)).toFixed(2)),
          Number((yMax - ((y ?? NaN) / height) * (yMax - yMin)).toFixed(2)),
        ]);
      }),
    )
    .toEqual([
      [-1.41, 0],
      [1.41, 0],
    ]);
  const screenshot = testInfo.outputPath('analytic-roots.png');
  await page.screenshot({ path: screenshot, animations: 'disabled' });
  await testInfo.attach('analytic-roots', {
    path: screenshot,
    contentType: 'image/png',
  });

  await replaceGraphExpression(editor, 'cos(x)-x');
  await expect(panel).toHaveCount(0);
  await expect(canvas).toHaveAttribute('data-test-marker-centers', '[]');
  await (
    await selectAnalysis(page, 'Nullstellen')
  )
    .getByRole('button', { name: analytical })
    .click();
  await expect(
    panel.getByText('Analytisch für diesen Ausdruck nicht unterstützt.'),
  ).toBeVisible();
  await panel.getByRole('button', { name: numerical }).click();
  await expect(
    panel.getByRole('button', { name: /Nullstellen · ≈ \(0,739/ }),
  ).toBeVisible();
  await expect(panel.getByText('Exakt', { exact: false })).toHaveCount(0);
});

test('classifies stationary inflections and clears exact results when a parameter changes', async ({
  page,
}) => {
  await page.goto('/m8e-calc/#/graph');
  const editor = await addFunction(page, 'x^3');
  await (
    await selectAnalysis(page, 'Wendepunkte')
  )
    .getByRole('button', { name: analytical })
    .click();
  const panel = results(page);
  await expect(
    panel.getByRole('button', {
      name: /Stationärer Wendepunkt · Exakt · \(0 \| 0\)/,
    }),
  ).toBeVisible();
  await panel.getByLabel(/Rechenweg/).click();
  await expect(
    panel.getByText(
      /f′\(0\) = 0, f‴\(0\) = 6 ⇒ f″: − → \+ ⇒ Stationärer Wendepunkt/,
    ),
  ).toBeVisible();
  await (
    await selectAnalysis(page, 'Wendepunkte')
  )
    .getByRole('button', { name: numerical })
    .click();
  await expect(
    panel.getByRole('button', { name: /Wendepunkte · ≈ \(0, 0\)/ }),
  ).toBeVisible();

  await replaceGraphExpression(editor, '(3*x-a)^2');
  await (
    await selectAnalysis(page, 'Extrema')
  )
    .getByRole('button', { name: analytical })
    .click();
  await expect(
    panel.getByRole('button', { name: /Tiefpunkt · Exakt · \(1\/3 \| 0\)/ }),
  ).toBeVisible();
  await page
    .getByRole('slider', { name: 'a', exact: true })
    .press('ArrowRight');
  await expect(panel).toHaveCount(0);
  await (
    await selectAnalysis(page, 'Extrema')
  )
    .getByRole('button', { name: analytical })
    .click();
  await expect(
    panel.getByRole('button', { name: /Tiefpunkt · Exakt · \(11\/30 \| 0\)/ }),
  ).toBeVisible();
});

test('retains both exact intersection coordinates and refreshes the comparison selection', async ({
  page,
}) => {
  await page.goto('/m8e-calc/#/graph');
  const first = await addFunction(page, 'x^2');
  const other = await addFunction(page, 'x+1', 1);
  async function intersections(expression: string) {
    const dialog = await selectAnalysis(page, 'Schnittpunkte');
    await dialog.getByRole('button', { name: /Andere Kurve/ }).click();
    await page.getByRole('option', { name: expression, exact: true }).click();
    await dialog.getByRole('button', { name: analytical }).click();
  }
  await intersections('x+1');
  const panel = results(page);
  await expect(
    panel.getByRole('button', { name: /1\/2 − √5\/2 \| 3\/2 − √5\/2/ }),
  ).toBeVisible();
  await expect(
    panel.getByRole('button', { name: /1\/2 \+ √5\/2 \| 3\/2 \+ √5\/2/ }),
  ).toBeVisible();
  await replaceGraphExpression(other, 'x*x');
  await expect(panel).toHaveCount(0);
  await intersections('x*x');
  await expect(panel.getByText(/Unendlich viele Schnittpunkte/)).toBeVisible();

  await replaceGraphExpression(other, '-1');
  await intersections('-1');
  await expect(
    panel.getByText('Keine reelle Lösung im Suchbereich.'),
  ).toBeVisible();

  await replaceGraphExpression(first, '(x^2-1)/(x-1)');
  await replaceGraphExpression(other, '2');
  await intersections('2');
  await expect(
    panel.getByText('Analytisch für diesen Ausdruck nicht unterstützt.'),
  ).toBeVisible();
  await panel.getByRole('button', { name: numerical }).click();
  await expect(panel).toHaveCount(0);
});
