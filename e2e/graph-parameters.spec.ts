import { test, expect, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { replaceGraphExpression } from './graphEditor';
import {
  installParameterProbe,
  readProbe,
  startFrames,
  type ProbeWindow,
} from './graphParameterProbe';

test.use({ serviceWorkers: 'block' });
test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await installParameterProbe(page);
});

async function add(page: Page, input: string) {
  await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
  await replaceGraphExpression(
    page.locator('.graph-editor [role="textbox"]').last(),
    input,
  );
}
async function ready(page: Page) {
  await expect(page.locator('canvas.graph-canvas')).toHaveAttribute(
    'data-sampling',
    'false',
    { timeout: 10000 },
  );
}
async function range(page: Page, min: string, max: string) {
  const control = page.locator('.graph-parameter');
  const details = control.locator('details');
  if (!(await details.evaluate((element) => element.hasAttribute('open'))))
    await details.locator('summary').click();
  await control.getByRole('textbox', { name: 'Minimum', exact: true }).fill(min);
  await control.getByRole('textbox', { name: 'Maximum', exact: true }).fill(max);
  await control.getByRole('button', { name: 'Anwenden', exact: true }).click();
}
async function finalValue(page: Page) {
  await ready(page);
  const value = Number(
    await page.getByRole('slider', { name: 'a', exact: true }).inputValue(),
  );
  const canvas = page.locator('canvas.graph-canvas');
  const snapshot = await canvas.evaluate((element: HTMLCanvasElement) => ({
    requested: JSON.parse(element.dataset.sampleRequest ?? '{}'),
    rendered: JSON.parse(element.dataset.renderedResult ?? '[]'),
    accepted: JSON.parse(element.dataset.sampleResult ?? '[]'),
  }));
  expect(snapshot.rendered).toHaveLength(1);
  expect(snapshot.rendered[0]?.signature).toBe(
    snapshot.requested.curves[0]?.signature,
  );
  expect(snapshot.accepted[0]?.signature).toBe(
    snapshot.rendered[0]?.signature,
  );
  expect(JSON.parse(snapshot.rendered[0].signature).params.a).toBe(value);
  expect(snapshot.rendered[0]?.length).toBeGreaterThan(0);
  return snapshot;
}

for (const input of [
  'a*sin(x)',
  'a*x^2-1',
  '(a*cos(t),a*sin(t))',
  'r=a*(1+cos(theta))',
  'x^2+y^2=a',
]) {
  test(`Full continuity: ${input}, drag, keys, range, playback and pause`, async ({
    page,
    browser,
  }, info) => {
    await page.goto('/m8e-calc/#/graph');
    await add(page, input);
    await range(page, '0,5', '3');
    await ready(page);
    await page.waitForTimeout(1000);
    await startFrames(page);
    // Native pointer drag, followed by both keyboard directions.
    const track = page.locator('.graph-parameter .ui-slider-track');
    const box = await track.boundingBox();
    if (!box) throw Error('Slider track unavailable');
    await page.mouse.move(box.x + box.width * 0.4, box.y + box.height / 2);
    await page.mouse.down();
    for (let i = 0; i < 20; i++) {
      await page.mouse.move(
        box.x + box.width * (0.4 + i / 80),
        box.y + box.height / 2,
      );
      await page.waitForTimeout(30);
    }
    await page.mouse.up();
    const slider = page.getByRole('slider', { name: 'a', exact: true });
    await slider.focus();
    for (const key of ['ArrowRight', 'ArrowLeft', 'ArrowLeft', 'ArrowRight'])
      await slider.press(key);
    await page.getByRole('button', { name: 'Parameter a abspielen' }).click();
    await page.waitForTimeout(1600);
    await range(page, '1', '2,5');
    await page.waitForTimeout(1600);
    await page.getByRole('button', { name: 'Parameter a anhalten' }).click();
    await ready(page);
    const probe = await readProbe(page);
    const blank = probe.frames.filter((frame) => frame.segments === 0);
    const revealedAgain = probe.frames.filter((frame) => frame.revealing);
    const paths = new Set(probe.frames.flatMap((frame) => frame.paths));
    const baseline = process.env.AP43_BASELINE === '1';
    const report = {
      head: process.env.AP43_HEAD ?? process.env.GITHUB_SHA,
      browser: browser.version(),
      node: process.version,
      input,
      baseline,
      blankFrames: blank.length,
      revealFrames: revealedAgain.length,
      ...probe,
    };
    await writeFile(info.outputPath('frames.json'), JSON.stringify(report));
    await info.attach('frames.json', {
      body: JSON.stringify(report),
      contentType: 'application/json',
    });
    await page.screenshot({ path: info.outputPath('paused.png') });
    expect(probe.frames.length).toBeGreaterThan(120);
    expect(paths.size).toBeGreaterThan(8);
    expect(probe.revealsSeen).toBeGreaterThan(0);
    if (baseline) {
      // Same real-stroke collector must identify the original implementation.
      expect(blank.length + revealedAgain.length).toBeGreaterThan(0);
    } else {
      expect(blank).toHaveLength(0);
      expect(revealedAgain).toHaveLength(0);
      const final = await finalValue(page);
      const births = new Set(
        probe.frames.flatMap((frame) => frame.rendered.map((path) => path.born)),
      );
      expect(births.size).toBe(1);
      expect(final.rendered[0]?.born).toBe([...births][0]);
    }
    // A numerical range-field edit clamps the actual parameter, without a spring.
    await range(page, '1', '1,2');
    await ready(page);
    if (!baseline) await finalValue(page);
    await page.waitForTimeout(700);
    const canvas = page.locator('canvas.graph-canvas');
    const idle = await canvas.getAttribute('data-graph-metrics');
    await page.waitForTimeout(250);
    expect(await canvas.getAttribute('data-graph-metrics')).toBe(idle);
  });
}

test('Full slow Worker over 50 ms presents ongoing geometry, keeps export pending, drains pause and cleans up', async ({
  page,
}, info) => {
  await page.goto('/m8e-calc/#/graph');
  await add(page, 'x^2+y^2=a');
  await range(page, '0,5', '3');
  await ready(page);
  await page.waitForTimeout(1000);
  const initialBirth = await page.locator('canvas.graph-canvas').evaluate(
    (element: HTMLCanvasElement) =>
      JSON.parse(element.dataset.renderedResult ?? '[]')[0]?.born,
  );
  await page.evaluate(() => {
    (window as ProbeWindow).__parameterProbe.delay = 180;
  });
  await startFrames(page);
  await page.getByRole('button', { name: 'Parameter a abspielen' }).click();
  await page.waitForTimeout(1200);
  await expect(page.locator('canvas.graph-canvas')).toHaveAttribute(
    'data-sampling',
    'true',
  );
  await page.getByRole('button', { name: 'PNG exportieren', exact: true }).click();
  await expect(
    page.getByText(
      'Die neue Kurve wird noch berechnet. PNG-Export anschließend erneut starten.',
    ),
  ).toBeVisible();
  await page.waitForTimeout(2000);
  await page.getByRole('button', { name: 'Parameter a anhalten' }).click();
  const final = await finalValue(page);
  expect(final.rendered[0]?.born).toBe(initialBirth);
  const probe = await readProbe(page);
  await writeFile(
    info.outputPath('slow-worker-frames.json'),
    JSON.stringify(probe),
  );
  await info.attach('slow-worker-frames.json', {
    body: JSON.stringify(probe),
    contentType: 'application/json',
  });
  expect(probe.frames.length).toBeGreaterThan(120);
  expect(probe.frames.every((frame) => frame.segments > 0)).toBe(true);
  expect(probe.frames.some((frame) => frame.revealing)).toBe(false);
  const signatures = new Set(
    probe.frames.flatMap((frame) =>
      frame.rendered.map((path) => path.signature),
    ),
  );
  expect(signatures.size).toBeGreaterThan(6);
  // Progress in each fixed one-second window, not just a final fresh result.
  const start = probe.frames[0]?.at ?? 0;
  for (let second = 0; second < 3; second++) {
    const window = probe.frames.filter(
      (frame) =>
        frame.at >= start + second * 1000 &&
        frame.at < start + (second + 1) * 1000,
    );
    expect(
      new Set(window.flatMap((frame) => frame.rendered.map((p) => p.signature)))
        .size,
    ).toBeGreaterThanOrEqual(2);
  }
  expect(probe.created).toBe(1);
  expect(probe.maxInFlight).toBe(1);
  expect(probe.inFlight).toBe(0);
  const delayedPosts = probe.posts.filter((post) => post.at >= start);
  const elapsed = (probe.frames.at(-1)?.at ?? start) - start;
  expect(delayedPosts.length).toBeLessThanOrEqual(Math.ceil(elapsed / 180) + 2);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'PNG exportieren', exact: true }).click();
  await (await download).saveAs(info.outputPath('latest-paused.png'));
  await page.goto('/m8e-calc/#/simple');
  await expect
    .poll(() =>
      page.evaluate(() => (window as ProbeWindow).__parameterProbe.terminated),
    )
    .toBe(1);
  expect(
    await page.evaluate(() => (window as ProbeWindow).__parameterProbe.inFlight),
  ).toBe(0);
});

test('updates before first reveal finishes keep its birth and a running old function cannot reappear', async ({
  page,
}) => {
  await page.goto('/m8e-calc/#/graph');
  // Extend the existing token only in this functional interruption probe.
  await page.addStyleTag({
    content: ':root { --md-sys-motion-effects-slow-duration: 3000ms; }',
  });
  await add(page, 'a*sin(x)');
  await ready(page);
  const canvas = page.locator('canvas.graph-canvas');
  const birth = await canvas.evaluate((element: HTMLCanvasElement) =>
    JSON.parse(element.dataset.renderedResult ?? '[]')[0]?.born,
  );
  await page.getByRole('slider', { name: 'a', exact: true }).press('ArrowRight');
  await finalValue(page);
  expect(
    await canvas.evaluate((element: HTMLCanvasElement) =>
      JSON.parse(element.dataset.renderedResult ?? '[]')[0]?.born,
    ),
  ).toBe(birth);
  await page.evaluate(() => {
    (window as ProbeWindow).__parameterProbe.delay = 400;
  });
  await page.getByRole('slider', { name: 'a', exact: true }).press('ArrowRight');
  await expect
    .poll(() =>
      page.evaluate(() => (window as ProbeWindow).__parameterProbe.inFlight),
    )
    .toBe(1);
  await replaceGraphExpression(
    page.locator('.graph-editor [role="textbox"]'),
    'a*x^2-1',
  );
  await expect
    .poll(async () => JSON.parse((await canvas.getAttribute('data-rendered-result')) ?? '[]').length)
    .toBe(0);
  await ready(page);
  const final = await finalValue(page);
  expect(final.rendered[0]?.born).toBeGreaterThan(birth);
  expect(final.accepted[0]?.components).toBeGreaterThan(0);
  await page.waitForTimeout(500);
  expect(await canvas.getAttribute('data-rendered-result')).toBe(
    JSON.stringify(final.rendered),
  );
});

test('current Worker error removes old implicit ink, reports failure and releases outstanding work', async ({
  page,
}) => {
  await page.goto('/m8e-calc/#/graph');
  await add(page, 'x^2+y^2=a');
  await ready(page);
  await page.evaluate(() => {
    (window as ProbeWindow).__parameterProbe.errorNext = true;
  });
  await page.getByRole('slider', { name: 'a', exact: true }).press('ArrowRight');
  await ready(page);
  const canvas = page.locator('canvas.graph-canvas');
  const result = JSON.parse((await canvas.getAttribute('data-sample-result')) ?? '[]');
  expect(result[0]).toMatchObject({ error: 'worker', evaluations: 0, components: 0 });
  expect(
    JSON.parse((await canvas.getAttribute('data-rendered-result')) ?? '[]')[0]?.length,
  ).toBe(0);
  await expect(page.locator('.graph-sampling-status')).toContainText(
    'Sampling-Worker ist nicht verfügbar',
  );
  const probe = await readProbe(page);
  expect(probe.inFlight).toBe(0);
  expect(probe.terminated).toBe(1);
});
