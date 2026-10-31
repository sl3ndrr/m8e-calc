import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { seal, verify } from './ci/build-proof.mjs';

const baseline = '9b5b3736d8fdeb2d2706658e04bfc357883c3134';
const output = resolve('test-results/wp09-baseline');
mkdirSync(output, { recursive: true });
const originalProof = JSON.parse(readFileSync('build-proof.json'));
verify('dist', originalProof, process.env, process.env.BUILD_FINGERPRINT);
const baselineDist = resolve(process.env.RUNNER_TEMP, 'wp09-before/dist');
const baselineContext = { ...process.env, GITHUB_SHA: baseline };
const baselineProof = seal(baselineDist, baselineContext);
writeFileSync(`${output}/before-build-proof.json`, JSON.stringify(baselineProof, null, 2));
writeFileSync(`${output}/after-build-proof.json`, JSON.stringify(originalProof, null, 2));
const digits = '2345678901234567890123456789012345678901234567891';
const cases = [
  ['0', '0'],
  ['-1e-9', '-1e-7'],
  ['-1e-10000', '-1e-9998'],
  ['1e10000', '1e+10002'],
  [`-1.${digits}e-10000`, `-1.${digits}e-9998`],
  [`-0.${'0'.repeat(1200)}1${digits}`, `-1.${digits}e-1199`],
];
const measurements = [];
const images = [];
for (const [width, height] of [[1280, 900], [1920, 1080], [3840, 2160]]) {
  for (const locale of ['de', 'en']) {
    for (const theme of ['light', 'dark']) {
      for (const reduced of [false, true]) {
        for (const [target, port, sourceCommit] of [
          ['before', 4175, baseline],
          ['after', 4173, process.env.GITHUB_SHA],
        ]) {
          const key = `${target}-${width}-${locale}-${theme}-${reduced}`;
          const extension = resolve('e2e/fixtures/ap19-zoom');
          const context = await chromium.launchPersistentContext(`${output}/${key}-profile`, {
            channel: 'chromium',
            headless: true,
            viewport: null,
            deviceScaleFactor: undefined,
            args: [
              '--screen-info={4096x2400}',
              `--window-size=${width},${height}`,
              `--disable-extensions-except=${extension}`,
              `--load-extension=${extension}`,
            ],
          });
          try {
            const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
            const controller = await context.newPage();
            await controller.goto(`chrome-extension://${new URL(worker.url()).hostname}/controller.html`);
            const page = await context.newPage();
            await page.emulateMedia({ colorScheme: theme, reducedMotion: reduced ? 'reduce' : 'no-preference' });
            await page.addInitScript(({ locale, theme }) => {
              localStorage.setItem('m8e-calc.settings', JSON.stringify({
                version: 4,
                state: { language: locale, themeMode: theme, motionLevel: 'full', grouping: false },
              }));
              localStorage.setItem('m8e-calc.convert', JSON.stringify({
                version: 1, state: { digits: 50, notation: 'auto' },
              }));
            }, { locale, theme });
            const url = `http://127.0.0.1:${port}/m8e-calc/`;
            const info = await (await page.request.get(`${url}build-info.json`)).json();
            assert.equal(info.sourceCommit, sourceCommit);
            assert.equal(info.target, 'normal');
            await page.goto(`${url}#/convert`);
            await page.locator('[data-mode="convert"]:not([inert])').waitFor();
            await page.locator('.ui-loading').waitFor({ state: 'hidden' });
            await page.evaluate(() => document.fonts.ready);
            await expect(page.locator('html')).toHaveAttribute('lang', locale);
            const cdp = await context.newCDPSession(page);
            const { windowId } = await cdp.send('Browser.getWindowForTarget');
            await cdp.send('Browser.setContentsSize', { windowId, width, height });
            await expect.poll(() => page.evaluate(() => [innerWidth, innerHeight])).toEqual([width, height]);
            const browser = await cdp.send('Browser.getVersion');
            const initialDpr = await page.evaluate(() => devicePixelRatio);
            for (const zoom of [1, 2]) {
              const actualZoom = await controller.evaluate(async (factor) => {
                const [tab] = await globalThis.chrome.tabs.query({ url: 'http://127.0.0.1/*' });
                if (tab?.id === undefined) throw new Error('Missing converter tab');
                await globalThis.chrome.tabs.setZoom(tab.id, factor);
                return globalThis.chrome.tabs.getZoom(tab.id);
              }, zoom);
              assert.equal(actualZoom, zoom);
              await expect.poll(() => page.evaluate(() => [innerWidth, innerHeight, devicePixelRatio])).toEqual([width / zoom, height / zoom, initialDpr * zoom]);
              for (const [index, [source, result]] of cases.entries()) {
                const local = (value) => locale === 'de' ? value.replace('.', ',') : value;
                const quick = page.getByRole('textbox', { name: locale === 'de' ? 'Schnelleingabe' : 'Quick entry', exact: true });
                await quick.fill(`${local(source)} m in cm`);
                await quick.press('Enter');
                await expect(page.getByRole('textbox', { name: locale === 'de' ? 'Nach' : 'To', exact: true })).toHaveValue(local(result));
                await page.locator('.convert-main').evaluate(async (node) => {
                  await Promise.all(node.getAnimations({ subtree: true }).map((animation) => animation.finished.catch(() => {})));
                });
                await page.locator('.convert-fields').scrollIntoViewIfNeeded();
                const geometry = await page.locator('.convert-mode').evaluate((root) => {
                  const swap = root.querySelector('.convert-swap');
                  if (!swap) throw new Error('Missing swap');
                  const rect = (node) => node.getBoundingClientRect().toJSON();
                  const button = rect(swap);
                  const area = (box) => Math.max(0, Math.min(button.right, box.right) - Math.max(button.left, box.left)) * Math.max(0, Math.min(button.bottom, box.bottom) - Math.max(button.top, box.top));
                  const boxes = (selector) => Array.from(root.querySelectorAll(selector), (node) => ({ rect: rect(node), overlap: area(rect(node)) }));
                  const numbers = Array.from(root.querySelectorAll('.convert-unit-card strong, .convert-result > [aria-hidden="true"]'), (node) => {
                    const range = document.createRange();
                    range.selectNodeContents(node);
                    return { text: node.textContent, rect: range.getBoundingClientRect().toJSON(), lines: new Set(Array.from(range.getClientRects(), (r) => r.top)).size, swapOverlap: area(range.getBoundingClientRect()) };
                  });
                  return {
                    viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
                    swap: button,
                    fields: boxes('.convert-field'),
                    // Native input text is painted inside its input rectangle.
                    // Disjoint rectangles prove no digit overlap; overlap alone
                    // must NOT be reported as proof of covered native glyphs.
                    inputs: boxes('.convert-field input'),
                    labels: boxes('.convert-field label'),
                    numbers,
                    panels: Array.from(root.querySelectorAll('.convert-main, .convert-unit-grid'), (node) => ({ name: node.className, clientWidth: node.clientWidth, scrollWidth: node.scrollWidth })),
                  };
                });
                measurements.push({ target, sourceCommit, buildTarget: 'normal', width, height, locale, theme, reduced, motionLevel: 'full', zoom: actualZoom, browser, node: process.version, case: index, source, ...geometry });
                writeFileSync(`${output}/measurements.json`, JSON.stringify(measurements, null, 2));
                assert.equal(geometry.inputs.length >= 2, true);
                if (target === 'after') {
                  for (const box of [...geometry.fields, ...geometry.inputs, ...geometry.labels]) assert.equal(box.overlap, 0);
                  for (const panel of geometry.panels) assert.ok(panel.scrollWidth <= panel.clientWidth);
                  for (const number of geometry.numbers) assert.equal(number.lines, 1);
                }
                if (index === 4) {
                  const capture = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
                  const bytes = Buffer.from(capture.data, 'base64');
                  const file = `${key}-${zoom}.png`;
                  writeFileSync(`${output}/${file}`, bytes);
                  images.push({ file, sourceCommit, sha256: createHash('sha256').update(bytes).digest('hex') });
                  writeFileSync(`${output}/images.json`, JSON.stringify(images, null, 2));
                }
              }
            }
          } finally {
            await context.close();
          }
        }
      }
    }
  }
}
verify(baselineDist, baselineProof, baselineContext, baselineProof.fingerprint);
verify('dist', originalProof, process.env, process.env.BUILD_FINGERPRINT);
console.log(JSON.stringify({ measurements: measurements.length, images: images.length, before: baseline, after: process.env.GITHUB_SHA }));
