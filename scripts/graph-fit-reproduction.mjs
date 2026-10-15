// Run against a separately built checkout, e.g. main f48afe1e. No deployment.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const checkout = resolve(process.argv[2] ?? '.');
const output = resolve(process.argv[3] ?? 'test-results/ap21-baseline');
await mkdir(output, { recursive: true });
const server = spawn(
  'npm',
  [
    'run',
    'preview',
    '--',
    '--host',
    '127.0.0.1',
    '--port',
    '4174',
    '--strictPort',
  ],
  { cwd: checkout, stdio: 'inherit' },
);
let browser;
try {
  let ready = false;
  for (let i = 0; i < 100 && !ready; i++) {
    try {
      ready = (await fetch('http://127.0.0.1:4174/m8e-calc/')).ok;
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
    }
    if (!ready) await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!ready) throw Error('Baseline preview did not start');
  browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1600, height: 900 },
    locale: 'de-DE',
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:4174/m8e-calc/#/graph');
  await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
  await page.locator('.graph-editor [role="textbox"]').fill('x^2');
  await page
    .getByRole('checkbox', { name: 'Seitenverhältnis sperren' })
    .press('Space');
  await page.waitForTimeout(2000);
  const read = async () =>
    JSON.parse(
      await page.locator('canvas.graph-canvas').getAttribute('data-bounds'),
    );
  const fit = page.getByRole('button', { name: 'Anpassen', exact: true });
  const before = await read(),
    settled = [];
  for (let i = 0; i < 4; i++) {
    await fit.click();
    await page.waitForTimeout(2000);
    settled.push(await read());
  }
  await page.screenshot({ path: resolve(output, 'settled.png') });
  await page.getByRole('button', { name: '1:1', exact: true }).click();
  await page.waitForTimeout(2000);
  for (let i = 0; i < 12; i++) await fit.click();
  await page.waitForTimeout(2000);
  const rapid = await read();
  await page.screenshot({ path: resolve(output, 'rapid.png') });
  const report = {
    checkout,
    viewport: { width: 1600, height: 900 },
    before,
    settled,
    rapid,
    errors,
    note: 'main silently rejects spans >1e12 in the adapter; the domain itself reaches about ±1.69e16 at fit four. Rapid clicks sample animated intermediate views.',
  };
  await writeFile(
    resolve(output, 'report.json'),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
  if (errors.length) throw Error(errors.join('\n'));
} finally {
  await browser?.close();
  server.kill();
}
