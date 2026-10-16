/* global document, getComputedStyle */
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
const output = 'ap19-evidence/baseline';
await mkdir(output, { recursive: true });
const server = spawn(
  'node',
  [
    'node_modules/vite/bin/vite.js',
    'preview',
    '--host',
    '127.0.0.1',
    '--port',
    '4174',
    '--strictPort',
  ],
  {
    cwd: '.qa-ap19-before',
    stdio: 'inherit',
  },
);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    locale: 'de-DE',
  });
  for (let attempt = 0; ; attempt++) {
    try {
      await fetch('http://127.0.0.1:4174/m8e-calc/');
      break;
    } catch (error) {
      if (attempt > 100) throw error;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  await page.goto('http://127.0.0.1:4174/m8e-calc/#/simple');
  await page.locator('.calculator-value').waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.keyboard.type('9');
  await page.evaluate(async () => {
    await Promise.all(
      document.getAnimations().map((a) => a.finished.catch(() => {})),
    );
  });
  const data = await page.locator('.calculator-character').evaluate((node) => {
    const c = getComputedStyle(node),
      value = getComputedStyle(node.parentElement);
    return {
      fontLoaded: document.fonts.check('550 100px "Roboto Flex"'),
      font: value.fontFamily,
      fontSize: value.fontSize,
      letterSpacing: value.letterSpacing,
      overflow: c.overflow,
      paddingInline: c.paddingInline,
      boxWidth: node.getBoundingClientRect().width,
    };
  });
  const clipped = await page
    .locator('.calculator-result')
    .screenshot({ path: `${output}/9-before.png` });
  // Diagnostic only: reveal the ink outside the original per-character clip.
  await page.addStyleTag({
    content: '.calculator-character { overflow: visible !important; }',
  });
  const revealed = await page
    .locator('.calculator-result')
    .screenshot({ path: `${output}/9-ink-reference.png` });
  data.inkWasClipped = !clipped.equals(revealed);
  if (!data.fontLoaded || !data.inkWasClipped)
    throw new Error(`Baseline did not reproduce: ${JSON.stringify(data)}`);
  await writeFile(`${output}/metrics.json`, JSON.stringify(data, null, 2));
  await page.screenshot({ path: `${output}/main.png` });
} finally {
  await browser.close();
  server.kill();
}
