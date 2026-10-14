import { expect, type Page, type Locator } from '@playwright/test';
export const qaModes = ['simple', 'scientific', 'convert', 'graph'] as const;
export async function qaSetup(page: Page, theme = 'light', accent = '#6750a4') {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.emulateMedia({
    colorScheme: theme === 'dark' ? 'dark' : 'light',
    reducedMotion: 'reduce',
  });
  await page.addInitScript(
    ({ theme, accent }) => {
      localStorage.setItem(
        'm8e-calc.settings',
        JSON.stringify({
          version: 3,
          state: {
            themeMode: theme,
            accent,
            motionLevel: 'off',
            language: 'de',
          },
        }),
      );
    },
    { theme, accent },
  );
}
export async function ready(page: Page, mode: string) {
  await page.locator(`[data-mode="${mode}"]:not([inert])`).waitFor();
  await page.locator('.ui-loading').waitFor({ state: 'hidden' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}
/** Reach a control using actual Tab events, checking the visible focus target. */
export async function tabTo(page: Page, target: Locator, backwards = false) {
  for (let i = 0; i < 180; i++) {
    if (await target.evaluate((el) => document.activeElement === el)) return;
    await page.keyboard.press(backwards ? 'Shift+Tab' : 'Tab');
  }
  await expect(target).toBeFocused();
}
