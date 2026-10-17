import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { qaModes, ready } from './qa-setup';

// A controlled previous SW revision, not a claim about an old deployed build.
// Both revisions run the generated production worker and its actual precache;
// only the first cache identity is changed to exercise waiting/activation/cleanup.
for (const initialMode of qaModes) {
  test(`AP25 production SW update from ${initialMode}, then all modes offline`, async ({
    page,
    context,
  }, info) => {
    const worker = await readFile('dist/sw.js', 'utf8');
    const previous = worker.replace(
      /CACHE = PREFIX \+ "([a-f0-9]+)"/,
      'CACHE = PREFIX + "$1-ap25-previous"',
    );
    expect(previous).not.toBe(worker);
    let updated = false;
    const root = resolve('dist');
    const server = createServer((request, response) => {
      void (async () => {
        const path = new URL(request.url ?? '/', 'http://localhost').pathname;
        if (!path.startsWith('/m8e-calc/')) {
          response.writeHead(404).end();
          return;
        }
        const relative = path.slice('/m8e-calc/'.length) || 'index.html';
        const file = resolve(root, relative);
        if (!file.startsWith(root + '/')) {
          response.writeHead(404).end();
          return;
        }
        const mime: Record<string, string> = {
          '.html': 'text/html',
          '.js': 'text/javascript',
          '.css': 'text/css',
          '.json': 'application/json',
          '.webmanifest': 'application/manifest+json',
          '.woff2': 'font/woff2',
          '.png': 'image/png',
          '.svg': 'image/svg+xml',
        };
        const content =
          relative === 'sw.js'
            ? updated
              ? worker
              : previous
            : await readFile(file);
        response.writeHead(200, {
          'Content-Type': mime[extname(file)] ?? 'application/octet-stream',
          'Cache-Control': 'no-store',
        });
        response.end(content);
      })().catch(() => response.writeHead(404).end());
    });
    await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
    try {
      const address = server.address();
      if (!address || typeof address === 'string')
        throw Error('Missing test server');
      const base = `http://127.0.0.1:${address.port}/m8e-calc/`;
      const errors: string[] = [];
      const external: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('request', (request) => {
        if (new URL(request.url()).origin !== new URL(base).origin)
          external.push(request.url());
      });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(`${base}#/${initialMode}`);
      await ready(page, initialMode);
      await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
      await page.waitForFunction(() => !!navigator.serviceWorker.controller);
      const oldCaches = await page.evaluate(() => caches.keys());
      expect(oldCaches.some((name) => name.endsWith('-ap25-previous'))).toBe(
        true,
      );
      updated = true;
      await page.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) throw Error('Registration missing');
        await registration.update();
      });
      const action = page.getByRole('button', {
        name: 'Jetzt aktualisieren',
        exact: true,
      });
      await expect(
        page.getByText('Neue Version verfügbar', { exact: true }),
      ).toBeVisible();
      await expect(action).toBeVisible();
      await info.attach('update-offer', {
        body: await page.screenshot({
          path: info.outputPath('update-offer.png'),
        }),
        contentType: 'image/png',
      });
      await Promise.all([page.waitForEvent('load'), action.click()]);
      await ready(page, initialMode);
      await expect(page).toHaveURL(`${base}#/${initialMode}`);
      await expect
        .poll(() => page.evaluate(() => caches.keys()))
        .not.toEqual(oldCaches);
      const currentCaches = await page.evaluate(() => caches.keys());
      expect(
        currentCaches.some((name) => name.endsWith('-ap25-previous')),
      ).toBe(false);
      const urls = await page.evaluate(async () => {
        const urls: string[] = [];
        for (const name of await caches.keys()) {
          const cache = await caches.open(name);
          urls.push(...(await cache.keys()).map((request) => request.url));
        }
        return urls;
      });
      expect(
        urls.some((url) => /DesignLab|ComponentGallery|MotionDemo/.test(url)),
      ).toBe(false);
      // Provenance is inspected directly, never fetched/pre-cached by the app.
      expect(urls.some((url) => url.endsWith('/build-info.json'))).toBe(false);
      await context.setOffline(true);
      for (const mode of qaModes) {
        await page.goto(`${base}#/${mode}`);
        await page.reload();
        await ready(page, mode);
        if (mode === 'simple') {
          await page.keyboard.type('2+3=');
          await expect(page.locator('.calculator-announcement')).toHaveText(
            '5',
          );
        } else if (mode === 'scientific') {
          const editor = page.getByRole('textbox', {
            name: 'Ausdruck',
            exact: true,
          });
          await editor.fill('sin(30)');
          await editor.press('Enter');
          await expect(page.locator('.scientific-result-text')).toHaveText(
            '0,5',
          );
        } else if (mode === 'convert') {
          const quick = page.getByRole('textbox', {
            name: 'Schnelleingabe',
            exact: true,
          });
          await quick.fill('5 km in mi');
          await quick.press('Enter');
          await expect(page.locator('.convert-result')).toContainText(
            '3,106856',
          );
        } else {
          await page
            .getByRole('button', { name: 'Hinzufügen', exact: true })
            .click();
          await page.locator('.graph-editor [role="textbox"]').fill('sin(x)');
          await expect(page.locator('canvas.graph-canvas')).toHaveAttribute(
            'data-curve-count',
            '1',
          );
        }
        await info.attach(`offline-${mode}`, {
          body: await page.screenshot({
            path: info.outputPath(`offline-${mode}.png`),
          }),
          contentType: 'image/png',
        });
      }
      expect(errors).toEqual([]);
      expect(external).toEqual([]);
      const revisions = info.outputPath('cache-revisions.json');
      await writeFile(
        revisions,
        JSON.stringify({ oldCaches, currentCaches, urls }, null, 2),
      );
      await info.attach('cache-revisions', {
        path: revisions,
        contentType: 'application/json',
      });
    } finally {
      await context.setOffline(false);
      server.closeAllConnections();
      await new Promise<void>((done, reject) =>
        server.close((error) => (error ? reject(error) : done())),
      );
    }
  });
}
