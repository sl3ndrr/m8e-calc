import { expect, test } from '@playwright/test';
import { defaultSettings, SETTINGS_KEY, SETTINGS_VERSION } from '../src/shared/settings';

for (const theme of ['light', 'dark'] as const) {
  test(`checkbox states and theme symbols: ${theme}`, async ({ page }, info) => {
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
    expect(await label.evaluate((e) => getComputedStyle(e).outlineStyle)).toBe('solid');
    await label.click();
    await expect(input).not.toBeChecked();
    await expect(row.locator('[data-state="disabled"] input')).toBeDisabled();
    const mixed = page.locator('.ui-checkbox[data-indeterminate]');
    await expect(mixed.getByRole('checkbox')).toBeChecked({ checked: false });
    expect(await mixed.getByRole('checkbox').evaluate((e) => (e as HTMLInputElement).indeterminate)).toBe(true);
    for (const box of await page.locator('.ui-checkbox-box').all()) {
      const geometry = await box.evaluate((e) => {
        const outer = e.getBoundingClientRect();
        return Array.from(e.children, (mark) => {
          const r = mark.getBoundingClientRect();
          return { dx: r.x + r.width / 2 - outer.x - outer.width / 2,
            dy: r.y + r.height / 2 - outer.y - outer.height / 2,
            fits: r.width <= outer.width - 4 && r.height <= outer.height - 4 };
        });
      });
      for (const mark of geometry) {
        expect(Math.abs(mark.dx)).toBeLessThan(0.6);
        expect(Math.abs(mark.dy)).toBeLessThan(0.6);
        expect(mark.fits).toBe(true);
      }
    }
    await row.screenshot({ path: info.outputPath(`checkbox-${theme}.png`) });
    await mixed.screenshot({ path: info.outputPath(`mixed-${theme}.png`) });
    const themeSwitch = page.locator('.theme-switch');
    expect(await themeSwitch.locator('.ui-icon').allTextContents()).toEqual(['light_mode', 'brightness_auto', 'dark_mode']);
    await themeSwitch.screenshot({ path: info.outputPath(`theme-${theme}.png`) });
  });
}

for (const motion of ['full', 'reduced', 'off'] as const) {
  test(`selection feedback respects ${motion} and OS reduction`, async ({ page }) => {
    await page.goto('/m8e-calc/#/design');
    await page.getByLabel('Animationsstufe').selectOption(motion);
    const label = page.locator('[data-component="Checkbox"] [data-state="default"] .ui-checkbox');
    const mark = label.locator('.ui-checkbox-check');
    await label.click();
    const animations = await mark.evaluate((e) => e.getAnimations().map((a) => a.effect?.getKeyframes()));
    expect(animations.length > 0).toBe(motion === 'full');
    await expect(mark).toHaveCSS('opacity', '1');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await label.click();
    expect(await mark.evaluate((e) => e.getAnimations().length)).toBe(0);
    await expect(mark).toHaveCSS('transform', 'none');
  });
}

for (const language of ['de', 'en'] as const) {
  test(`system theme and persisted choice in ${language}`, async ({ page }) => {
    await page.addInitScript(({ key, version, settings }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version, state: settings }));
    }, { key: SETTINGS_KEY, version: SETTINGS_VERSION, settings: { ...defaultSettings(), language, motionLevel: 'off' } });
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
    await expect(page.locator('.theme-switch input[value="light"]')).toBeChecked();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });
}
