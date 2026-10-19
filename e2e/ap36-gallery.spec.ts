import { expect, test } from '@playwright/test';
import {
  attach,
  held,
  holdNext,
  idle,
  installMotionProbe,
  picture,
  resume,
  sampleFrames,
} from './ap36Capture';

test.use({ serviceWorkers: 'block' });
test.beforeEach(async ({ page }) => {
  await installMotionProbe(page);
  await page.setViewportSize({ width: 1600, height: 1000 });
});

for (const level of ['full', 'reduced', 'off'] as const) {
  test(`Vanilla demo ${level}: live frames, retarget, OS reduction, Off and unmount`, async ({
    page,
  }, info) => {
    await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
    await page.goto('/m8e-calc/#/design');
    await page.getByLabel('Animationsstufe').selectOption(level);
    const demo = page
      .locator('.motion-demo')
      .filter({ has: page.getByText('spatial-slow', { exact: true }) });
    const dot = demo.locator('.motion-dot');
    const play = demo.getByRole('button');
    await play.scrollIntoViewIfNeeded();
    await idle(page, true);
    // Start sampling in the browser at click, before Motion receives input.
    const recording = await dot.evaluateHandle((node) => {
      const samples = new Promise<unknown[]>((resolve) => {
        node
          .closest('.motion-demo')
          ?.querySelector('button')
          ?.addEventListener(
            'click',
            () => {
              const frames: unknown[] = [];
              const tick = () => {
                const s = getComputedStyle(node);
                frames.push({
                  time: performance.now(),
                  transform: s.transform,
                  translate: s.translate,
                  opacity: s.opacity,
                });
                if (frames.length === 12) resolve(frames);
                else requestAnimationFrame(tick);
              };
              requestAnimationFrame(tick);
            },
            { once: true, capture: true },
          );
      });
      return { samples };
    });
    await play.click();
    const frames = await recording.evaluate(({ samples }) => samples);
    await recording.dispose();
    if (level !== 'off')
      expect(
        new Set(
          frames.map((f) =>
            JSON.stringify(f, (key, value) =>
              key === 'time' ? undefined : value,
            ),
          ),
        ).size,
      ).toBeGreaterThan(1);
    await attach(info, 'demo-live-frames', { level, frames });
    await idle(page, true);
    await holdNext(page, '.motion-dot');
    await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
    await play.click();
    await page.clock.runFor(120);
    const captured = await held(page);
    if (level !== 'off') {
      const middle = await dot.evaluate((node) => {
        const s = getComputedStyle(node);
        return {
          transform: s.transform,
          translate: s.translate,
          opacity: Number(s.opacity),
        };
      });
      if (level === 'full')
        expect(middle.transform !== 'none' || middle.translate !== 'none').toBe(
          true,
        );
      else {
        expect(middle.opacity).toBeGreaterThan(0.25);
        expect(middle.opacity).toBeLessThan(1);
      }
      await attach(info, 'demo-middle-values', middle);
      await picture(info, 'demo-middle', demo);
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(dot).toHaveCSS('transform', 'none');
    await resume(page);
    await page.clock.resume();
    await page.getByLabel('Animationsstufe').selectOption('off');
    const off = await sampleFrames(dot);
    expect(
      off.every(
        (f) =>
          f.animations === 0 &&
          f.transform === 'none' &&
          (f.translate === 'none' || f.translate === '0px'),
      ),
    ).toBe(true);
    await attach(info, 'demo-interrupted-off', { captured, off });
    await page.getByRole('link', { name: 'Einfach', exact: true }).click();
    await expect(dot).toHaveCount(0);
    await idle(page, true);
  });
}

for (const component of ['Dialog', 'Menu', 'SideSheet'] as const) {
  test(`${component} closes during a real entrance and reopens with focus`, async ({
    page,
  }, info) => {
    await page.goto('/m8e-calc/#/design');
    const trigger = page
      .locator(`[data-component="${component}"] [data-state="default"] button`)
      .first();
    await trigger.scrollIntoViewIfNeeded();
    await idle(page, true);
    const selector = component === 'Menu' ? '.ui-menu-popover' : '.ui-modal';
    await holdNext(page, selector);
    await trigger.click();
    const overlay = page.locator(selector);
    await expect(overlay).toBeVisible();
    await expect.poll(async () => (await held(page)).length).toBeGreaterThan(0);
    await picture(info, `${component}-middle`, overlay);
    await attach(info, `${component}-held`, await held(page));
    await page.keyboard.press('Escape');
    await expect(overlay).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await resume(page);
    await trigger.press('Enter');
    await expect(overlay).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(overlay).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await idle(page, true);
  });
}

test('checkbox reversal and theme fallback interruption have real intermediate states', async ({
  page,
}, info) => {
  await page.addInitScript(() =>
    Object.defineProperty(document, 'startViewTransition', {
      value: undefined,
    }),
  );
  await page.goto('/m8e-calc/#/design');
  const label = page.locator(
    '[data-component="Checkbox"] [data-state="default"] .ui-checkbox',
  );
  await label.scrollIntoViewIfNeeded();
  await holdNext(page, '.ui-checkbox-check');
  await label.click();
  await expect.poll(async () => (await held(page)).length).toBeGreaterThan(0);
  const mark = label.locator('.ui-checkbox-check');
  const state = await sampleFrames(mark, 2);
  expect(state[0]?.opacity).toBeGreaterThan(0);
  expect(state[0]?.opacity).toBeLessThan(1);
  await picture(info, 'checkbox-middle', label);
  await label.click();
  await resume(page);
  await expect(label.getByRole('checkbox')).not.toBeChecked();
  await idle(page, true);
  await holdNext(page, '.theme-snapshot');
  await page.locator('#root .theme-switch input[value="dark"]').press('Space');
  const snapshot = page.locator('.theme-snapshot');
  await expect(snapshot).toHaveCount(1);
  await expect.poll(async () => (await held(page)).length).toBeGreaterThan(0);
  await picture(info, 'theme-middle', page.locator('#root .theme-switch'));
  await attach(info, 'checkbox-theme-interruption', {
    state,
    theme: await held(page),
  });
  await page.locator('#root .theme-switch input[value="light"]').press('Space');
  await resume(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(snapshot).toHaveCount(0);
  await page.getByLabel('Animationsstufe').selectOption('off');
  await label.click();
  await expect(label.getByRole('checkbox')).toBeChecked();
  await idle(page, true);
});
