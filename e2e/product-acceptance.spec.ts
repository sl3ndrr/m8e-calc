import { test, expect } from '@playwright/test';
import { qaModes, ready, tabTo } from './qa-setup';
import { t } from '../src/shared/i18n';

// Deliberately pairwise: full package tests cover the individual state spaces.
// These rows cover their interaction in the integrated production shell.
for (const [width, height, language, theme, accent, motionLevel] of [
  [1280, 800, 'de', 'light', '#6750a4', 'full'],
  [1280, 800, 'en', 'dark', '#007f82', 'reduced'],
  [1920, 1080, 'de', 'dark', '#e2675a', 'off'],
  [1920, 1080, 'en', 'light', '#6750a4', 'full'],
  [3840, 2160, 'de', 'light', '#007f82', 'reduced'],
  [3840, 2160, 'en', 'dark', '#e2675a', 'off'],
] as const) {
  test(`AP25 integrated matrix ${width} ${language} ${theme} ${motionLevel}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'no-preference' });
    await page.addInitScript((state) => {
      if (!localStorage.getItem('m8e-calc.settings'))
        localStorage.setItem('m8e-calc.settings', JSON.stringify({ version: 4, state }));
    }, { language, themeMode: 'system', accent, motionLevel });
    const external: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).origin !== 'http://127.0.0.1:4173') external.push(request.url());
    });
    for (const mode of qaModes) {
      await page.goto(`/m8e-calc/#/${mode}`);
      await ready(page, mode);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await expect(page.locator('html')).toHaveAttribute('data-motion', motionLevel);
      const name = t(`mode.${mode}`, language);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
      if (mode === 'simple') {
        await page.keyboard.type('9');
        await expect(page.locator('.calculator-announcement')).toHaveText('9');
      } else if (mode === 'scientific') {
        const editor = page.getByRole('textbox', { name: t('scientific.expression', language), exact: true });
        await editor.fill('1/3');
        await editor.press('Enter');
        await expect(page.locator('.scientific-result-text')).toContainText(language === 'de' ? '0,333' : '0.333');
      } else if (mode === 'convert') {
        const quick = page.getByRole('textbox', { name: t('convert.quick', language), exact: true });
        await quick.fill('72 °F in °C');
        await quick.press('Enter');
        await expect(page.locator('.convert-result')).toContainText(language === 'de' ? '22,222' : '22.222');
      } else {
        await page.getByRole('button', { name: t('graph.add', language), exact: true }).click();
        await page.locator('.graph-editor [role="textbox"]').fill('x^2');
        await expect(page.locator('canvas.graph-canvas')).toHaveAttribute('data-curve-count', '1');
      }
      const share = page.getByRole('button', { name: t('comfort.shareLink', language), exact: true });
      await tabTo(page, share);
      await expect(share).toBeFocused();
      await expect(share).toBeInViewport();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await info.attach(`${mode}-${width}-${language}-${theme}-${motionLevel}`, {
        body: await page.screenshot({ animations: 'allow' }),
        contentType: 'image/png',
      });
    }
    expect(external).toEqual([]);
  });
}

test('AP25 passive build provenance identifies the exact CI source and normal artifact', async ({ request }) => {
  const response = await request.get('/m8e-calc/build-info.json');
  expect(response.ok()).toBe(true);
  const info = await response.json();
  expect(info).toEqual({ schemaVersion: 1, sourceCommit: process.env.GITHUB_SHA ?? null, target: 'normal' });
});
