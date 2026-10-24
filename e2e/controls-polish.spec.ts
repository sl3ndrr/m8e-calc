import { expect, test } from '@playwright/test';
import {
  attach,
  held,
  holdNext,
  idle,
  installMotionProbe,
  picture,
  resume,
} from './ap36Capture';
import {
  defaultSettings,
  SETTINGS_KEY,
  SETTINGS_VERSION,
} from '../src/shared/settings';

// Feature-state checks are isolated from SW update toasts; the production
// matrix, comfort and pwa-update suites exercise the real worker separately.
test.use({ serviceWorkers: 'block' });

for (const theme of ['light', 'dark'] as const) {
  test(`checkbox states and theme symbols: ${theme}`, async ({
    page,
  }, info) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    await page.goto('/m8e-calc/#/design');
    await page.evaluate(() => document.fonts.ready);
    const row = page.locator('[data-component="Checkbox"]');
    const input = row.locator('[data-state="default"] input');
    const label = row.locator('[data-state="default"] .ui-checkbox');
    await input.focus();
    await page.keyboard.press('Space');
    await expect(input).toBeChecked();
    await expect(label).toHaveAttribute('data-focus-visible');
    expect(await label.evaluate((e) => getComputedStyle(e).outlineStyle)).toBe(
      'solid',
    );
    await label.click();
    await expect(input).not.toBeChecked();
    await expect(row.locator('[data-state="disabled"] input')).toBeDisabled();
    const mixed = page.locator('.ui-checkbox[data-indeterminate]');
    await expect(mixed.getByRole('checkbox')).toBeChecked({ checked: false });
    expect(
      await mixed
        .getByRole('checkbox')
        .evaluate((e) => (e as HTMLInputElement).indeterminate),
    ).toBe(true);
    for (const box of await page.locator('.ui-checkbox-box').all()) {
      const geometry = await box.evaluate((e) => {
        const outer = e.getBoundingClientRect();
        return Array.from(e.children, (mark) => {
          const r = mark.getBoundingClientRect();
          return {
            dx: r.x + r.width / 2 - outer.x - outer.width / 2,
            dy: r.y + r.height / 2 - outer.y - outer.height / 2,
            fits: r.width <= outer.width - 4 && r.height <= outer.height - 4,
          };
        });
      });
      for (const mark of geometry) {
        expect(Math.abs(mark.dx)).toBeLessThan(0.6);
        expect(Math.abs(mark.dy)).toBeLessThan(0.6);
        expect(mark.fits).toBe(true);
      }
    }
    await label.hover();
    await label.screenshot({ path: info.outputPath(`hover-${theme}.png`) });
    await input.focus();
    await page.keyboard.down('Space');
    await expect(label).toHaveAttribute('data-pressed');
    await label.screenshot({ path: info.outputPath(`pressed-${theme}.png`) });
    await page.keyboard.up('Space');
    await expect(input).toBeChecked();
    await expect(label).toHaveAttribute('data-focus-visible');
    await label.screenshot({
      path: info.outputPath(`focus-selected-${theme}.png`),
    });
    const invalid = row.locator('[data-state="error"] .ui-checkbox');
    await invalid.click();
    await expect(invalid.getByRole('checkbox')).toBeChecked();
    await expect(invalid).toHaveAttribute('data-invalid');
    await row.screenshot({ path: info.outputPath(`checkbox-${theme}.png`) });
    await mixed.screenshot({ path: info.outputPath(`mixed-${theme}.png`) });
    const themeSwitch = page.locator('.theme-switch');
    expect(await themeSwitch.locator('.ui-icon').allTextContents()).toEqual([
      'light_mode',
      'brightness_auto',
      'dark_mode',
    ]);
    await themeSwitch.screenshot({
      path: info.outputPath(`theme-${theme}.png`),
    });
  });
}

for (const motion of ['full', 'reduced', 'off'] as const) {
  test(`selection feedback respects ${motion} and OS reduction`, async ({
    page,
  }, info) => {
    await page.goto('/m8e-calc/#/design');
    await page.getByLabel('Animationsstufe').selectOption(motion);
    const label = page.locator(
      '[data-component="Checkbox"] [data-state="default"] .ui-checkbox',
    );
    const mark = label.locator('.ui-checkbox-check');
    if (motion === 'full') {
      // Freeze the real transition at its start, before a later browser RPC can
      // miss the short token duration on a busy runner.
      await mark.evaluate((element) => {
        const capture = (event: Event) => {
          if (!(event instanceof TransitionEvent)) return;
          if (event.propertyName !== 'opacity') return;
          element.removeEventListener('transitionrun', capture);
          for (const animation of element.getAnimations()) {
            animation.pause();
            animation.currentTime =
              Number(animation.effect?.getTiming().duration) / 4;
          }
        };
        element.addEventListener('transitionrun', capture);
      });
    }
    await label.click();
    const animations = await mark.evaluate((e) => e.getAnimations().length);
    expect(animations > 0).toBe(motion === 'full');
    if (motion === 'full') {
      const middle = await mark.evaluate((e) => {
        for (const animation of e.getAnimations()) {
          animation.pause();
          const duration = Number(animation.effect?.getTiming().duration);
          animation.currentTime = duration / 4;
        }
        const style = getComputedStyle(e);
        return { opacity: Number(style.opacity), transform: style.transform };
      });
      expect(middle.opacity).toBeGreaterThan(0);
      expect(middle.opacity).toBeLessThan(1);
      await label.screenshot({
        path: info.outputPath('selection-full-middle.png'),
        animations: 'allow',
      });
      await mark.evaluate((e) => e.getAnimations().forEach((a) => a.finish()));
    }
    await label.screenshot({
      path: info.outputPath(`selection-${motion}-selected.png`),
    });
    await expect(mark).toHaveCSS('opacity', '1');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await label.click();
    expect(await mark.evaluate((e) => e.getAnimations().length)).toBe(0);
    await expect(mark).toHaveCSS('transform', 'none');
  });
}

for (const language of ['de', 'en'] as const) {
  test(`system theme and persisted choice in ${language}`, async ({ page }) => {
    await page.addInitScript(
      ({ key, version, settings }) => {
        if (!localStorage.getItem(key))
          localStorage.setItem(
            key,
            JSON.stringify({ version, state: settings }),
          );
      },
      {
        key: SETTINGS_KEY,
        version: SETTINGS_VERSION,
        settings: { ...defaultSettings(), language, motionLevel: 'off' },
      },
    );
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/m8e-calc/#/design');
    const system = page.locator('.theme-switch input[value="system"]');
    await expect(system).toBeChecked();
    const before = await system.getAttribute('aria-label');
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(system).not.toHaveAttribute('aria-label', before ?? '');
    await page.locator('.theme-switch input[value="light"]').press('Space');
    await page.reload();
    await expect(
      page.locator('.theme-switch input[value="light"]'),
    ).toBeChecked();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });
}

for (const theme of ['light', 'dark'] as const) {
  for (const [policy, os] of [
    ['full', false],
    ['reduced', false],
    ['off', false],
    ['full', true],
  ] as const) {
    test(`AP45 effects ${theme} ${policy} OS ${os}: native controls and direct slider input`, async ({
      page,
    }, info) => {
      await installMotionProbe(page);
      await page.emulateMedia({
        colorScheme: theme,
        reducedMotion: os ? 'reduce' : 'no-preference',
      });
      await page.goto('/m8e-calc/#/design');
      await page.getByLabel('Animationsstufe').selectOption(policy);
      const full = policy === 'full' && !os;
      const switchRow = page.locator(
        '[data-component="Switch"] [data-state="default"]',
      );
      const input = switchRow.getByRole('switch');
      const track = switchRow.locator('.ui-switch-track');
      const before = await track.evaluate(
        (node) => getComputedStyle(node).backgroundColor,
      );
      if (full) await holdNext(page, '.ui-switch-track');
      await input.press('Space');
      await expect(input).toBeChecked();
      await expect(switchRow.locator('.ui-switch')).toHaveAttribute(
        'data-focus-visible',
      );
      if (full) {
        await expect
          .poll(async () => (await held(page)).length)
          .toBeGreaterThan(0);
        const middle = await track.evaluate(
          (node) => getComputedStyle(node).backgroundColor,
        );
        expect(middle).not.toBe(before);
        await picture(info, 'switch-effects-middle', switchRow);
        await resume(page);
        await idle(page, true);
        const after = await track.evaluate(
          (node) => getComputedStyle(node).backgroundColor,
        );
        expect(middle).not.toBe(after);
        await attach(info, 'switch-colors', { before, middle, after });
      } else
        expect(
          await track.evaluate((node) => node.getAnimations().length),
        ).toBe(0);
      const segments = page.locator(
        '[data-component="SegmentedControl"] [data-state="default"]',
      );
      const radios = segments.getByRole('radio');
      if (full)
        await holdNext(
          page,
          '[data-component="SegmentedControl"] [data-state="default"] .ui-segment',
        );
      await radios.first().press('ArrowRight');
      await expect(radios.nth(1)).toBeChecked();
      const selected = segments.locator('.ui-segment[data-selected]');
      const radius = await selected.evaluate((node) => ({
        radius: getComputedStyle(node).borderRadius,
        expected: getComputedStyle(document.documentElement)
          .getPropertyValue('--md-sys-shape-large')
          .trim(),
        properties: getComputedStyle(node).transitionProperty,
      }));
      expect(radius.properties).not.toMatch(/all|radius/);
      if (full) {
        await expect
          .poll(async () => (await held(page)).length)
          .toBeGreaterThan(0);
        await picture(info, 'segments-effects-middle', segments);
      }
      await attach(info, 'selected-shape', radius);
      await resume(page);
      await idle(page, true);
      const slider = page.locator(
        '[data-component="Slider"] [data-state="default"]',
      );
      const sliderInput = slider.getByRole('slider');
      if (full)
        await holdNext(
          page,
          '[data-component="Slider"] [data-state="default"] .ui-slider-bubble',
        );
      await sliderInput.press('ArrowRight');
      const bubble = slider.locator('.ui-slider-bubble');
      if (full) {
        await expect
          .poll(async () => (await held(page)).length)
          .toBeGreaterThan(0);
        const opacity = await bubble.evaluate((node) =>
          Number(getComputedStyle(node).opacity),
        );
        expect(opacity).toBeGreaterThan(0);
        expect(opacity).toBeLessThan(1);
        await picture(info, 'slider-bubble-middle', slider);
      } else
        expect(
          await bubble.evaluate((node) => node.getAnimations().length),
        ).toBe(0);
      await resume(page);
      const thumb = slider.locator('.ui-slider-thumb');
      const box = await thumb.boundingBox();
      if (!box) throw Error('Slider thumb missing');
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      const positions = [];
      for (const delta of [24, 60, -12]) {
        await page.mouse.move(
          box.x + box.width / 2 + delta,
          box.y + box.height / 2,
        );
        positions.push(
          await slider.evaluate((node) => {
            const track = node
              .querySelector('.ui-slider-track')
              ?.getBoundingClientRect();
            const thumb = node
              .querySelector('.ui-slider-thumb')
              ?.getBoundingClientRect();
            const input = node.querySelector('input');
            if (!track || !thumb || !input) throw Error('Incomplete slider');
            const fraction =
              (Number(input.value) - Number(input.min)) /
              (Number(input.max) - Number(input.min));
            return {
              value: input.value,
              error: Math.abs(
                thumb.x + thumb.width / 2 - track.x - track.width * fraction,
              ),
            };
          }),
        );
      }
      expect(positions.every((p) => p.error < 1)).toBe(true);
      await page.mouse.up();
      await attach(info, 'direct-drag-positions', positions);
      await expect(
        page
          .locator('[data-component="Switch"] [data-state="disabled"]')
          .getByRole('switch'),
      ).toBeDisabled();
      await page.getByLabel('Animationsstufe').selectOption('off');
      await idle(page, true);
    });
  }
}
