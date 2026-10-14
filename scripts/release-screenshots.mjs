/* global document, requestAnimationFrame */
import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const origin = 'http://127.0.0.1:4175';
const base = `${origin}/m8e-calc/`;
const server = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    'preview',
    '--host',
    '127.0.0.1',
    '--port',
    '4175',
    '--strictPort',
  ],
  { stdio: 'inherit' },
);
let browser;
try {
  let available = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error('Preview server exited');
    try {
      available = (await fetch(base)).ok;
    } catch {
      // Preview has not started yet.
    }
    if (available) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!available) throw new Error('Preview server did not become ready');
  await mkdir('docs/img', { recursive: true });
  browser = await chromium.launch();
  for (const theme of ['light', 'dark']) {
    for (const mode of ['simple', 'scientific', 'convert', 'graph']) {
      const context = await browser.newContext({
        locale: 'de-DE',
        viewport: { width: 2560, height: 1440 },
        deviceScaleFactor: 1,
        colorScheme: theme,
        reducedMotion: 'reduce',
        serviceWorkers: 'block',
      });
      const page = await context.newPage();
      const externalRequests = [];
      page.on('request', (request) => {
        if (new URL(request.url()).origin !== origin)
          externalRequests.push(request.url());
      });
      await page.addInitScript((theme) => {
        localStorage.setItem(
          'm8e-calc.settings',
          JSON.stringify({
            version: 3,
            state: {
              themeMode: theme,
              accent: '#6750a4',
              motionLevel: 'off',
              language: 'de',
            },
          }),
        );
      }, theme);
      await page.goto(`${base}#/${mode}`);
      await page.locator(`[data-mode="${mode}"]:not([inert])`).waitFor();
      await page.locator('.ui-loading').waitFor({ state: 'hidden' });
      if (mode === 'simple') {
        await page.keyboard.type('12+3=');
        await expect(page.locator('.calculator-display')).toBeVisible();
      }
      if (mode === 'scientific') {
        const editor = page.getByRole('textbox', {
          name: 'Ausdruck',
          exact: true,
        });
        await editor.fill('sin(30)');
        await editor.press('Enter');
        await expect(page.locator('.scientific-result-text')).toHaveText('0,5');
        await expect(
          page.locator('.scientific-result-card .katex'),
        ).toHaveCount(2);
      }
      if (mode === 'convert') {
        const editor = page.getByRole('textbox', {
          name: 'Schnelleingabe',
          exact: true,
        });
        await editor.fill('5 km in mi');
        await editor.press('Enter');
        await expect(page.locator('.convert-result')).toContainText('3,106856');
      }
      if (mode === 'graph') {
        await page
          .getByRole('button', { name: 'Hinzufügen', exact: true })
          .click();
        await page.locator('.graph-editor [role="textbox"]').fill('sin(x)');
        await expect(page.locator('canvas.graph-canvas')).toHaveAttribute(
          'data-curve-count',
          '1',
        );
      }
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      );
      await page.screenshot({
        path: `docs/img/${mode}-${theme}.png`,
        animations: 'disabled',
        caret: 'hide',
      });
      if (mode === 'graph' && theme === 'dark') {
        // Render the actual app at a half CSS scale; no synthetic marketing UI.
        const session = await context.newCDPSession(page);
        await session.send('Emulation.setDeviceMetricsOverride', {
          width: 2560,
          height: 1280,
          deviceScaleFactor: 1,
          mobile: false,
          scale: 0.5,
        });
        const { data } = await session.send('Page.captureScreenshot', {
          format: 'png',
          clip: { x: 0, y: 0, width: 2560, height: 1280, scale: 0.5 },
        });
        const { writeFile } = await import('node:fs/promises');
        const image = Buffer.from(data, 'base64');
        expect([image.readUInt32BE(16), image.readUInt32BE(20)]).toEqual([
          1280, 640,
        ]);
        await writeFile('docs/img/social-preview.png', image);
      }
      expect(externalRequests, 'No external runtime requests').toEqual([]);
      await context.close();
    }
  }
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
