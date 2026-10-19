import { expect, test } from '@playwright/test';
import {
  attach,
  armLiveOff,
  held,
  holdNext,
  idle,
  installMotionProbe,
  picture,
  resume,
  sampleFrames,
  waitFrozen,
} from './ap36Capture';
import { replaceGraphExpression } from './graphEditor';

test.use({ serviceWorkers: 'block' });
test.beforeEach(async ({ page }) => {
  await installMotionProbe(page);
  await page.setViewportSize({ width: 1600, height: 1000 });
});
for (const [level, os] of [
  ['full', false],
  ['reduced', false],
  ['off', false],
  ['full', true],
] as const) {
  test(`history Vanilla entrance ${level} OS ${os}, interrupted by Off and unmount`, async ({
    page,
  }, info) => {
    await page.emulateMedia({ reducedMotion: os ? 'reduce' : 'no-preference' });
    await page.addInitScript((motionLevel) => {
      localStorage.setItem(
        'm8e-calc.settings',
        JSON.stringify({ version: 4, state: { motionLevel } }),
      );
      localStorage.setItem(
        'm8e-calc.history',
        JSON.stringify({
          version: 1,
          state: {
            entries: [
              {
                id: 'ap36',
                mode: 'simple',
                ts: Date.now(),
                input: '2 + 3',
                result: '5',
                pinned: false,
                payload: null,
              },
            ],
            visibility: { simple: true },
            limit: 500,
          },
        }),
      );
    }, level);
    await page.goto('/m8e-calc/#/simple');
    const entry = page.locator('.history-entry');
    await expect(entry).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await idle(page);
    // Warm the lazy settings chunk before freezing the app clock. Its cold load
    // remains covered by startup-budget; this case interrupts a running spring.
    await page
      .getByRole('button', { name: 'Einstellungen', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: /Animationsstufe/ }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await idle(page);
    // Remount through the real sheet toggle, registering the pause before input.
    const toggle = page.getByRole('button', {
      name: 'Verlauf ein-/ausblenden',
    });
    await toggle.click();
    await expect(entry).toHaveCount(0);
    await holdNext(page, '.history-entry', true);
    await toggle.click();
    await expect(entry).toBeVisible();
    await waitFrozen(page);
    const middle = await entry.evaluate((node) => {
      const s = getComputedStyle(node);
      return {
        transform: s.transform,
        translate: s.translate,
        scale: s.scale,
        opacity: Number(s.opacity),
      };
    });
    const captured = await held(page);
    if (level === 'off') expect(captured).toEqual([]);
    else {
      expect(captured.length).toBeGreaterThan(0);
      expect(captured.every((a) => a.state === 'paused')).toBe(true);
      expect(middle.opacity).toBeGreaterThan(0);
      expect(middle.opacity).toBeLessThan(1);
      expect(
        middle.transform !== 'none' ||
          middle.translate !== 'none' ||
          middle.scale !== 'none',
      ).toBe(level === 'full' && !os);
      await picture(info, 'history-middle', entry);
    }
    await attach(info, 'history-held', {
      level,
      os,
      captured,
      middle,
    });
    await resume(page);
    await idle(page);
    // Exercise a genuinely running spring with a common real timebase. The
    // selector's two virtual clicks run on consecutive native browser frames.
    await page
      .getByRole('button', { name: 'Einstellungen', exact: true })
      .click();
    const motionSelect = page.getByRole('button', { name: /Animationsstufe/ });
    await motionSelect.click();
    await page.getByRole('option', { name: 'Aus', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
    let off;
    if (level === 'off') off = await sampleFrames(entry);
    else {
      await motionSelect.click();
      const recording = await armLiveOff(motionSelect, '.history-entry');
      await page
        .getByRole('option', {
          name: level === 'full' ? 'Voll' : 'Reduziert',
          exact: true,
        })
        .click();
      const frames = await recording.evaluate(({ done }) => done);
      await recording.dispose();
      await attach(info, 'history-live-interruption', frames);
      expect(frames.before.at(-1)?.animations).toBeGreaterThan(0);
      expect(frames.before.at(-1)?.opacity).toBeGreaterThan(0);
      expect(frames.before.at(-1)?.opacity).toBeLessThan(1);
      off = frames.after;
    }
    await attach(info, 'history-off-frames', off);
    await picture(info, 'history-off', entry);
    if (process.env.AP36_PHASE === 'before' && level !== 'off')
      expect(off.some((frame) => frame.opacity > 0 && frame.opacity < 1)).toBe(
        true,
      );
    test.fail(
      process.env.AP36_PHASE === 'before' && level !== 'off',
      'Pinned baseline retains a sampled MotionValue after real live Off; AP36 commits its neutral goal.',
    );
    for (const frame of off) {
      expect(frame.opacity).toBe(1);
      expect(['none', 'matrix(1, 0, 0, 1, 0, 0)']).toContain(frame.transform);
      expect(['none', '0px', '0px 0px']).toContain(frame.translate);
      expect(['none', '1', '1 1']).toContain(frame.scale);
      expect(frame.animations).toBe(0);
    }
    const settings = page.locator('.ui-modal .ui-dialog');
    await expect(
      settings.getByRole('heading', { name: 'Einstellungen', exact: true }),
    ).toBeVisible();
    await settings
      .getByRole('button', { name: 'Schließen', exact: true })
      .click();
    await expect(settings).toHaveCount(0);
    await page.getByRole('link', { name: 'Umrechner', exact: true }).click();
    await expect(entry).toHaveCount(0);
    await idle(page);
  });
}

test('rapid mode replacement cancels a held entrance and remains operable', async ({
  page,
}, info) => {
  await page.goto('/m8e-calc/#/scientific');
  await expect(page.locator('.cm-content')).toBeVisible();
  await page.getByRole('link', { name: 'Einfach', exact: true }).click();
  await expect(page.locator('.calculator-value')).toBeVisible();
  await idle(page);
  await holdNext(page, '.mode-stage');
  await page
    .getByRole('link', { name: 'Wissenschaftlich', exact: true })
    .click();
  await expect(page.locator('.mode-stage')).toHaveAttribute(
    'data-mode',
    'scientific',
  );
  const entrance = await held(page);
  expect(entrance.length).toBeGreaterThan(0);
  await picture(info, 'mode-middle', page.locator('.mode-stage'));
  await page.getByRole('link', { name: 'Einfach', exact: true }).click();
  await page.getByRole('link', { name: 'Umrechner', exact: true }).click();
  await page.getByRole('link', { name: 'Einfach', exact: true }).click();
  await resume(page);
  await expect(page.locator('.mode-stage')).toHaveCount(1);
  await expect(page.locator('.mode-stage')).toHaveAttribute(
    'data-mode',
    'simple',
  );
  await page.keyboard.type('2+3=');
  await expect(page.locator('.calculator-announcement')).toHaveText('5');
  await idle(page);
  await attach(info, 'mode-interruption', {
    entrance,
    final: await sampleFrames(page.locator('.mode-stage'), 2),
  });
});

test('fit repeats preserve the goal; native pan and wheel interrupt an active fit', async ({
  page,
}, info) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.goto('/m8e-calc/#/graph');
  await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
  await replaceGraphExpression(
    page.locator('.graph-editor [role="textbox"]'),
    'x^2',
  );
  const canvas = page.locator('canvas.graph-canvas');
  await expect(canvas).toHaveAttribute('data-sampling', 'false');
  await page
    .getByRole('checkbox', { name: 'Seitenverhältnis sperren' })
    .uncheck();
  await idle(page);
  const fit = page.getByRole('button', { name: 'Anpassen', exact: true });
  await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
  await fit.click();
  await expect(canvas).toHaveAttribute('data-moving', 'true');
  const goal = await canvas.getAttribute('data-target-bounds');
  for (let i = 0; i < 3; i++) await fit.click();
  expect(await canvas.getAttribute('data-target-bounds')).toBe(goal);
  await page.clock.runFor(32);
  await picture(info, 'fit-middle', canvas);
  const middle = await canvas.getAttribute('data-bounds');
  expect(middle).not.toBe(goal);
  const box = await canvas.boundingBox();
  if (!box) throw Error('Canvas unavailable');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 60,
    box.y + box.height / 2 + 20,
    { steps: 3 },
  );
  await expect(canvas).toHaveAttribute('data-moving', 'false');
  const panned = await canvas.getAttribute('data-target-bounds');
  expect(panned).not.toBe(goal);
  await page.mouse.up();
  await page.clock.runFor(1500);
  await fit.click();
  await expect(canvas).toHaveAttribute('data-moving', 'true');
  await page.clock.runFor(32);
  await page.mouse.wheel(0, -200);
  await page.clock.runFor(32);
  const zoomed = await canvas.getAttribute('data-target-bounds');
  expect(zoomed).not.toBe(panned);
  await page.clock.resume();
  await expect(canvas).toHaveAttribute('data-moving', 'false');
  await expect(canvas).toHaveAttribute('data-sampling', 'false');
  const frames = await canvas.getAttribute('data-graph-metrics');
  await idle(page);
  await attach(info, 'fit-interruption', {
    goal,
    middle,
    panned,
    zoomed,
    frames,
    final: await canvas.getAttribute('data-bounds'),
  });
});
