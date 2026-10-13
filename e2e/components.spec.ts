import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { galleryEntries } from '../src/app/galleryEntries';
test('gallery contains every component and supported state, with zero axe violations in light and dark', async ({
  page,
}) => {
  for (const theme of ['light', 'dark']) {
    await page.emulateMedia({
      colorScheme: theme as 'light' | 'dark',
      reducedMotion: 'reduce',
    });
    await page.goto('/m8e-calc/#/design');
    for (const [name, states] of Object.entries(galleryEntries)) {
      const row = page.locator(`[data-component="${name}"]`);
      await expect(row).toHaveCount(1);
      await expect(row.locator('[data-state]')).toHaveCount(states.length);
      for (const state of states)
        await expect(row.locator(`[data-state="${state}"]`)).toBeVisible();
    }
    const result = await new AxeBuilder({ page }).analyze();
    expect(result.violations).toEqual([]);
  }
});
test('keyboard focus, expressive press, connected group and slider use real browser state', async ({
  page,
}) => {
  await page.goto('/m8e-calc/#/design');
  const button = page.locator(
    '[data-component="Button"] [data-state="default"] button',
  );
  await button.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(button).toHaveAttribute('data-focus-visible');
  const initial = await button.evaluate(
    (e) => getComputedStyle(e).borderRadius,
  );
  await page.keyboard.down('Space');
  await expect(button).toHaveAttribute('data-pressed');
  await page.waitForTimeout(350);
  expect(
    await button.evaluate((e) => getComputedStyle(e).borderRadius),
  ).not.toBe(initial);
  await page.keyboard.up('Space');
  const group = page.locator(
    '[data-component="ButtonGroup"] [data-state="default"]',
  );
  const first = group.locator('button').first();
  const neighbor = group.locator('button').nth(1);
  const before = await neighbor.boundingBox();
  await first.focus();
  await page.keyboard.down('Space');
  await page.waitForTimeout(350);
  expect((await first.boundingBox())?.width).toBeGreaterThan(
    (await neighbor.boundingBox())?.width ?? 0,
  );
  expect((await neighbor.boundingBox())?.width).toBeLessThan(
    before?.width ?? 0,
  );
  await page.keyboard.up('Space');
  const slider = page
    .locator('[data-component="Slider"] [data-state="default"]')
    .getByRole('slider');
  await slider.focus();
  await page.keyboard.press('End');
  await expect(slider).toHaveValue('100');
});
test('modal dialog traps focus, restores the trigger, and passes axe', async ({
  page,
}) => {
  await page.goto('/m8e-calc/#/design');
  const trigger = page.locator(
    '[data-component="Dialog"] [data-state="default"] button',
  );
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Dialog', exact: true });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  expect(await dialog.evaluate((e) => e.contains(document.activeElement))).toBe(
    true,
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});
test('reduced motion freezes morphing and JS springs; narrow gallery stays inside viewport', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/m8e-calc/#/design');
  const path = page.locator('.ui-loading path');
  const before = await path.getAttribute('d');
  await page.waitForTimeout(900);
  expect(await path.getAttribute('d')).toBe(before);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.getByRole('button', { name: 'Akzentfarbe anpassen' }).click();
  await expect(
    page.getByRole('button', { name: 'Iris', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Akzentfarbe anpassen' }),
  ).toBeFocused();
});

for (const motion of ['full', 'off']) {
  test(`plain and rich tooltips appear on native keyboard focus with motion ${motion}`, async ({
    page,
  }) => {
    if (motion === 'off') await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/m8e-calc/#/design');
    if (motion === 'off')
      await page.getByLabel('Animationsstufe').selectOption('off');
    for (const state of ['default', 'focus']) {
      const trigger = page.locator(
        `[data-component="Tooltip"] [data-state="${state}"] button`,
      );
      await trigger.focus();
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      await expect(trigger).toBeFocused();
      await expect(page.getByRole('tooltip')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('tooltip')).toBeHidden();
    }
  });
}
