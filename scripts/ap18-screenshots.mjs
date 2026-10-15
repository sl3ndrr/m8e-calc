// Real browser captures. Run against a production preview, not a mocked page.
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const phase = process.env.AP18_PHASE ?? 'after';
const base = process.env.AP18_BASE_URL ?? 'http://127.0.0.1:4173/m8e-calc/';
const out = `test-results/ap18/${phase}`;
await mkdir(out, { recursive: true });
const modes = ['simple', 'scientific', 'convert', 'graph'];
const labels = ['Einfach', 'Wissenschaftlich', 'Umrechner', 'Graphen'];
const results = [];
async function capture(context, { width, height, theme, size, zoom = 1, worker }) {
  const page = await context.newPage();
  await page.addInitScript(({ theme, size }) => {
    localStorage.clear();
    localStorage.setItem('m8e-calc.settings', JSON.stringify({ version: 4, state: {
      themeMode: theme, motionLevel: 'off', language: 'de', uiSize: size,
    } }));
  }, { theme, size });
  for (const mode of modes) {
    await page.goto(`${base}#/${mode}`);
    if (worker) {
      await worker.evaluate(async ({ base, zoom }) => {
        const tabs = await chrome.tabs.query({});
        const tab = tabs.find((tab) => tab.url?.startsWith(base));
        if (!tab?.id) throw Error('No calculator tab');
        await chrome.tabs.setZoom(tab.id, zoom);
      }, { base, zoom });
      await page.waitForFunction((width) => window.innerWidth === width, width / zoom);
    }
    await page.locator(`.mode-stage[data-mode="${mode}"]`).waitFor();
    await page.locator('.ui-loading').waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: phase === 'before' ? 'Link kopieren' : 'Link teilen', exact: true }).waitFor();
    if (mode === 'simple') {
      await page.getByRole('button', { name: 'Berechnung löschen', exact: true }).click();
      await page.keyboard.type('12+3=');
    }
    if (mode === 'scientific') {
      const e = page.getByRole('textbox', { name: 'Ausdruck', exact: true });
      await e.fill('sin(30)'); await e.press('Enter');
      await page.locator('.scientific-result-text').waitFor();
    }
    if (mode === 'convert') {
      const e = page.getByRole('textbox', { name: 'Schnelleingabe', exact: true });
      await e.fill('5 km in mi'); await e.press('Enter');
    }
    if (mode === 'graph') {
      await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
      await page.locator('.graph-editor [role="textbox"]').last().fill('sin(x)');
      await page.waitForFunction(() => document.querySelector('canvas.graph-canvas')?.dataset.curveCount === '1');
    }
    await page.evaluate(() => document.fonts.ready);
    await page.getByRole('link', { name: labels[modes.indexOf(mode)], exact: true }).focus();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(150);
    const layout = await page.evaluate(() => {
      const heading = document.querySelector('#active-mode-title');
      const share = document.querySelector('.mode-share button');
      const main = document.querySelector('.shell-main');
      const toolbar = share?.closest('.simple-heading, .scientific-heading, .convert-quick, .graph-heading');
      const bounds = (el) => { const r = el?.getBoundingClientRect(); return r && { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
      return { innerWidth, innerHeight, rootWidth: document.documentElement.scrollWidth, heading: bounds(heading), share: bounds(share), main: bounds(main), toolbar: bounds(toolbar), mainOverflow: main.scrollWidth > main.clientWidth + 1 };
    });
    if (phase === 'after') {
      assert(layout.heading?.width > 0, 'visible Shell heading');
      assert(layout.rootWidth <= layout.innerWidth + 1, `document overflow: ${JSON.stringify(layout)}`);
      assert(!layout.mainOverflow, `main overflow: ${JSON.stringify(layout)}`);
      assert(layout.share?.width >= 48 && layout.share?.height >= 48, '48px share target');
      assert(layout.share.right <= layout.innerWidth + 1, 'share clipped horizontally');
      assert(layout.share.x >= layout.toolbar.x && layout.share.right <= layout.toolbar.right + 1, 'share outside toolbar');
      assert(Math.abs(layout.share.right - layout.toolbar.right) < 12, 'share at toolbar right');
      assert(layout.heading.y >= 0 && layout.heading.right <= layout.innerWidth, 'heading clipped');
    }
    const name = `${mode}-${width}x${height}-${theme}-ui${size}-zoom${zoom}`;
    await page.screenshot({ path: `${out}/${name}.png`, fullPage: true, animations: 'disabled' });
    results.push({ name, ...layout });
  }
  await page.close();
}
const browser = await chromium.launch();
try {
  for (const [width, height, size] of [[1280,800,100], [1920,1080,100], [3440,1440,100], [1280,800,80], [1280,800,150]]) {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width, height }, locale: 'de-DE', reducedMotion: 'reduce' });
      await capture(context, { width, height, size, theme });
      await context.close();
    }
  }
} finally { await browser.close(); }
// Chrome's actual tab zoom, rather than CSS zoom or pinch emulation.
const extension = resolve('test-results/ap18/zoom-extension');
await mkdir(extension, { recursive: true });
await writeFile(`${extension}/manifest.json`, JSON.stringify({ manifest_version: 3, name: 'Local zoom QA', version: '1.0', permissions: ['tabs'], background: { service_worker: 'worker.js' } }));
await writeFile(`${extension}/worker.js`, 'chrome.runtime.onInstalled.addListener(() => {});');
const zoomContext = await chromium.launchPersistentContext('', { channel: 'chromium', headless: true, viewport: null, args: ['--window-size=1920,1080', `--disable-extensions-except=${extension}`, `--load-extension=${extension}`], locale: 'de-DE', reducedMotion: 'reduce' });
try {
  const worker = zoomContext.serviceWorkers()[0] ?? await zoomContext.waitForEvent('serviceworker');
  // Content viewport is measured before applying real browser zoom.
  const probe = await zoomContext.newPage();
  const { width, height } = await probe.evaluate(() => ({ width: innerWidth, height: innerHeight }));
  await probe.close();
  for (const theme of ['light', 'dark']) await capture(zoomContext, { width, height, size: 100, theme, zoom: 2, worker });
} finally { await zoomContext.close(); }
await writeFile(`${out}/layout.json`, JSON.stringify(results, null, 2));
