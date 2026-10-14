import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const curves = [
  'a*sin(x)',
  'x^2/5-2',
  'cos(2*x)',
  '(2*cos(t),2*sin(t))',
  'r=2*(1+cos(theta))',
  'exp(-x^2/2)',
];
for (const width of [2560, 3840])
  for (const theme of ['light', 'dark'] as const)
    for (const [accent, seed] of [
      ['iris', '#6750a4'],
      ['teal', '#007f82'],
    ] as const) {
      test(`graph ${width} ${theme} ${accent}`, async ({ page }) => {
        await page.setViewportSize({
          width,
          height: width === 3840 ? 2160 : 1440,
        });
        await page.emulateMedia({
          colorScheme: theme,
          reducedMotion: 'reduce',
        });
        await page.addInitScript(
          ({ theme, seed }) =>
            localStorage.setItem(
              'm8e-calc.settings',
              JSON.stringify({
                version: 2,
                state: {
                  themeMode: theme,
                  accent: seed,
                  motionLevel: 'off',
                  language: 'de',
                },
              }),
            ),
          { theme, seed },
        );
        await page.goto('/m8e-calc/#/graph');
        for (const input of curves) {
          await page
            .getByRole('button', { name: 'Hinzufügen', exact: true })
            .click();
          await page
            .locator('.graph-editor [role="textbox"]')
            .last()
            .fill(input);
        }
        await page.evaluate(() => document.fonts.ready);
        const canvas = page.locator('canvas.graph-canvas');
        await expect(canvas).toHaveAttribute('data-curve-count', '6');
        await expect(canvas).toHaveAttribute('data-truncated', 'false');
        await page.waitForTimeout(250);
        await mkdir('test-results/graph-screenshots', { recursive: true });
        await page.screenshot({
          path: `test-results/graph-screenshots/graph-${width}-${theme}-${accent}.png`,
        });
      });
    }
