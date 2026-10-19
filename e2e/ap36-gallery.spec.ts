import { expect, test, type Locator } from '@playwright/test';
import {
  attach,
  held,
  holdNext,
  idle,
  installMotionProbe,
  picture,
  resume,
  sampleFrames,
  waitFrozen,
} from './ap36Capture';

test.use({ serviceWorkers: 'block' });
test.beforeEach(async ({ page }) => {
  await installMotionProbe(page);
  await page.setViewportSize({ width: 1600, height: 1000 });
});

async function recordClick(dot: Locator, count: number) {
  return dot.evaluateHandle((node, count) => {
    const samples = new Promise<
      { time: number; transform: string; translate: string; opacity: number }[]
    >((resolve) => {
      node
        .closest('.motion-demo')
        ?.querySelector('button')
        ?.addEventListener(
          'click',
          () => {
            const frames: {
              time: number;
              transform: string;
              translate: string;
              opacity: number;
            }[] = [];
            const tick = () => {
              const s = getComputedStyle(node);
              frames.push({
                time: performance.now(),
                transform: s.transform,
                translate: s.translate,
                opacity: Number(s.opacity),
              });
              if (frames.length === count) resolve(frames);
              else requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          },
          { once: true, capture: true },
        );
    });
    return { samples };
  }, count);
}
for (const level of ['full', 'reduced', 'off'] as const) {
  test(`Vanilla demo ${level}: live frames, retarget, OS reduction, Off and unmount`, async ({
    page,
  }, info) => {
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
    const recording = await recordClick(dot, 12);
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
    await dot.evaluate((node) => node.setAttribute('data-ap36-subject', ''));
    await holdNext(page, '[data-ap36-subject]', true);
    await play.click();
    await waitFrozen(page);
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
    await resume(page);
    await idle(page, true);
    // A separate live interruption: no paused animation or artificial clock.
    const activeRecording = await recordClick(dot, 2);
    await play.click();
    const active = await activeRecording.evaluate(({ samples }) => samples);
    await activeRecording.dispose();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const reset = await sampleFrames(dot);
    await attach(info, 'demo-live-os-reset', { active, reset });
    await picture(info, 'demo-os-reset', demo);
    const residual = reset.some(
      (f) =>
        f.opacity < 1 ||
        (f.transform !== 'none' && f.transform !== 'matrix(1, 0, 0, 1, 0, 0)'),
    );
    test.fail(
      process.env.AP36_PHASE === 'before' && level !== 'off' && residual,
      'Pinned baseline restores a sampled value after live OS reset.',
    );
    expect(
      reset.every(
        (f) =>
          f.opacity === 1 &&
          f.animations === 0 &&
          ['none', 'matrix(1, 0, 0, 1, 0, 0)'].includes(f.transform),
      ),
    ).toBe(true);
    await page.getByLabel('Animationsstufe').selectOption('off');
    const off = await sampleFrames(dot);
    await picture(info, 'demo-off', demo);
    expect(
      off.every(
        (f) =>
          f.opacity === 1 &&
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

for (const [motion, os] of [
  ['full', false],
  ['reduced', false],
  ['off', false],
  ['full', true],
] as const) {
  for (const component of ['Dialog', 'Menu', 'SideSheet'] as const) {
    test(`${component} ${motion} OS ${os} closes during a real entrance and reopens with focus`, async ({
      page,
    }, info) => {
      await page.emulateMedia({
        reducedMotion: os ? 'reduce' : 'no-preference',
      });
      await page.addInitScript(
        (motionLevel) =>
          localStorage.setItem(
            'm8e-calc.settings',
            JSON.stringify({ version: 4, state: { motionLevel } }),
          ),
        motion,
      );
      await page.goto('/m8e-calc/#/design');
      const trigger = page
        .locator(
          `[data-component="${component}"] [data-state="default"] button`,
        )
        .first();
      await trigger.scrollIntoViewIfNeeded();
      await idle(page, true);
      const selector = component === 'Menu' ? '.ui-menu-popover' : '.ui-modal';
      await holdNext(page, selector);
      await trigger.click();
      const overlay = page.locator(selector);
      await expect(overlay).toBeVisible();
      if (motion === 'full' && !os) {
        await expect
          .poll(async () => (await held(page)).length)
          .toBeGreaterThan(0);
        await picture(info, `${component}-middle`, overlay);
      } else expect(await held(page)).toEqual([]);
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

test('platform theme reveal retargets and stops on Off and OS reduction', async ({
  page,
}, info) => {
  await page.emulateMedia({
    colorScheme: 'light',
    reducedMotion: 'no-preference',
  });
  await page.goto('/m8e-calc/#/design');
  const native = await page.evaluate(() =>
    Boolean(document.startViewTransition),
  );
  const selector = native ? 'html' : '.theme-snapshot';
  const theme = (value: string) =>
    page.locator(`#root .theme-switch input[value="${value}"]`);
  const root = page.locator('html');
  const reveal = async (value: string) => {
    await idle(page, true);
    await holdNext(page, selector);
    await theme(value).press('Space');
    await expect(root).toHaveAttribute('data-theme', value);
    await expect(root).toHaveAttribute('data-theme-changing', 'true');
    await expect.poll(async () => (await held(page)).length).toBeGreaterThan(0);
    const frames = await held(page);
    if (native)
      expect(
        frames.some((animation) =>
          animation.frames.some((frame) =>
            String(frame.clipPath).startsWith('circle('),
          ),
        ),
      ).toBe(true);
    await attach(info, `platform-theme-${value}`, { native, frames });
    await picture(info, `platform-theme-${value}`, root);
  };
  await reveal('dark');
  await theme('light').press('Space');
  await resume(page);
  await expect(root).toHaveAttribute('data-theme', 'light');
  await expect(root).not.toHaveAttribute('data-theme-changing');
  await idle(page, true);

  await reveal('dark');
  await page.getByLabel('Animationsstufe').selectOption('off');
  await resume(page);
  await expect(root).toHaveAttribute('data-motion', 'off');
  await expect(root).not.toHaveAttribute('data-theme-changing');
  await idle(page, true);
  await theme('light').press('Space');
  await expect(root).toHaveAttribute('data-theme', 'light');
  await idle(page, true);

  await page.getByLabel('Animationsstufe').selectOption('full');
  await reveal('dark');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await resume(page);
  await expect(root).toHaveAttribute('data-motion', 'reduced');
  await expect(root).not.toHaveAttribute('data-theme-changing');
  await expect(page.locator('.theme-snapshot')).toHaveCount(0);
  await idle(page, true);
});
