import { test, expect, type Response } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';

test('AP29 controlled production worker: navigation, fetch, changed build and offline failure', async ({ page, context, browser }, info) => {
  const expected = (label: 'a' | 'b') => ({ schemaVersion: 1, sourceCommit: label.repeat(40), target: 'normal' });
  let current: 'a' | 'b' = 'a';
  const requests: { path: string; build: string; mode: string | undefined }[] = [];
  const server = createServer((request, response) => {
    void (async () => {
      const path = new URL(request.url ?? '/', 'http://localhost').pathname;
      requests.push({ path, build: current, mode: request.headers['sec-fetch-mode'] as string | undefined });
      if (!path.startsWith('/m8e-calc/')) { response.writeHead(404).end('outside base'); return; }
      const root = resolve(`test-results/ap29-builds/${current}`);
      const relative = path.slice('/m8e-calc/'.length) || 'index.html';
      const file = resolve(root, relative);
      if (!file.startsWith(root + '/')) { response.writeHead(404).end(); return; }
      const mime: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };
      const content = await readFile(file);
      response.writeHead(200, {
        'Content-Type': mime[extname(file)] ?? 'application/octet-stream',
        // Warm a genuinely cacheable HTTP response for A; B must still reach the server.
        'Cache-Control': relative === 'build-info.json' ? 'public, max-age=3600' : 'no-store',
      });
      response.end(content);
    })().catch(() => response.writeHead(404, { 'Content-Type': 'text/plain' }).end('missing technical resource'));
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  try {
    const address = server.address();
    if (!address || typeof address === 'string') throw Error('Missing server');
    const base = `http://127.0.0.1:${address.port}/m8e-calc/`;
    const url = `${base}build-info.json`;
    const controlled = async () => {
      await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
      await page.waitForFunction(() => !!navigator.serviceWorker.controller);
      expect(await page.evaluate(() => navigator.serviceWorker.controller?.state)).toBe('activated');
    };
    const document = async (response: Response | null, label: 'a' | 'b') => {
      if (!response) throw Error('Navigation response missing');
      const body = await response.text();
      await info.attach(`navigation-${label}`, { body: JSON.stringify({ url: response.url(), status: response.status(), headers: response.headers(), body, requests }), contentType: 'application/json' });
      expect(response.ok()).toBe(true);
      expect(response.headers()['content-type']).toContain('application/json');
      expect(await response.json()).toEqual(expected(label));
    };
    const normalFetch = () => page.evaluate(async (url) => {
      const response = await fetch(url);
      return { status: response.status, type: response.headers.get('content-type'), json: await response.json() };
    }, url);
    await page.goto(`${base}#/simple`);
    await expect(page.locator('.simple-calculator')).toBeVisible();
    await controlled();
    await expect(page.locator('meta[name="ap29-fixture"]')).toHaveAttribute('content', 'a');
    const cachesA = await page.evaluate(() => caches.keys());
    expect(cachesA.length).toBeGreaterThan(0);
    const cachedUrls = await page.evaluate(async () => {
      const urls: string[] = [];
      for (const name of await caches.keys()) urls.push(...(await (await caches.open(name)).keys()).map((r) => r.url));
      return urls;
    });
    expect(cachedUrls.some((u) => u.includes('build-info.json'))).toBe(false);
    expect(requests.filter((r) => r.path.endsWith('/build-info.json'))).toEqual([]);
    expect(await normalFetch()).toEqual({ status: 200, type: 'application/json', json: expected('a') });
    // Same tab, already controlled, real document navigation (address-bar semantics).
    await controlled();
    await document(await page.goto(url), 'a');
    await page.goto(base);
    await controlled();
    // Simulate stale cache pollution, even though neither build precaches provenance.
    await page.evaluate(async ({ url, stale, names }) => {
      for (const name of names) await (await caches.open(name)).put(url, new Response(JSON.stringify(stale), { headers: { 'Content-Type': 'application/json' } }));
    }, { url, stale: expected('a'), names: cachesA });
    current = 'b';
    // No update()/skipWaiting(): the cached app and active worker remain A.
    await page.reload();
    await controlled();
    await expect(page.locator('meta[name="ap29-fixture"]')).toHaveAttribute('content', 'a');
    expect(await normalFetch()).toEqual({ status: 200, type: 'application/json', json: expected('b') });
    const beforeNavigationB = requests.filter((r) => r.path.endsWith('/build-info.json')).length;
    await controlled();
    await document(await page.goto(url), 'b');
    expect(requests.filter((r) => r.path.endsWith('/build-info.json')).length).toBeGreaterThan(beforeNavigationB);
    await document(await page.goto(`${url}?deployment=b`), 'b');
    // Unknown technical URLs must return their real server failure, never the shell.
    const missing = await page.goto(`${base}missing-proof.json`);
    expect(missing?.status()).toBe(404);
    expect(await missing?.text()).toBe('missing technical resource');
    await page.goto(`${base}index.html?entry=1#/scientific?e=sin(30)`);
    await expect(page.getByRole('textbox', { name: 'Ausdruck', exact: true })).toHaveText('sin(30)');
    await controlled();
    await context.setOffline(true);
    const offlineFetch = await page.evaluate(async (url) => {
      try { const r = await fetch(url); return { status: r.status, body: await r.text() }; }
      catch (error) { return { error: String(error) }; }
    }, url);
    expect('error' in offlineFetch || (offlineFetch.status ?? 0) >= 400).toBe(true);
    const offlineNavigation = await page.goto(url, { waitUntil: 'domcontentloaded' }).then(async (r) => ({ status: r?.status() ?? 0, body: await r?.text() }), (error: unknown) => ({ error: String(error) }));
    expect('error' in offlineNavigation || offlineNavigation.status >= 400).toBe(true);
    await info.attach('provenance-evidence', { body: JSON.stringify({ browser: browser.version(), cachesA, cachedUrls, offlineFetch, offlineNavigation, requests }, null, 2), contentType: 'application/json' });
  } finally {
    await context.setOffline(false);
    server.closeAllConnections();
    await new Promise<void>((done, reject) => server.close((error) => error ? reject(error) : done()));
  }
});
