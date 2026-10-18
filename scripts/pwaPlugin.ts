import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';
/** Precache every emitted chunk, worker, font and icon of the selected build target.
 * AP23 excludes the lab at its import root, never by filtering offline assets. */
export function pwaPlugin(): Plugin {
  let base = '/m8e-calc/';
  let publicDir = 'public';
  return {
    name: 'm8e-offline',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      base = config.base;
      publicDir = config.publicDir;
    },
    generateBundle(_options, bundle) {
      const manifest = {
        id: base,
        name: 'm8e-calc',
        short_name: 'm8e-calc',
        lang: 'de',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#16181d',
        theme_color: '#16181d',
        icons: [
          {
            src: `${base}icons/app.svg`,
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: `${base}icons/app-192.png`,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: `${base}icons/app-512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: `${base}icons/app-maskable-512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      };
      const manifestText = JSON.stringify(manifest);
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.webmanifest',
        source: manifestText,
      });
      const files = [
        ...new Set([
          'index.html',
          'manifest.webmanifest',
          'icons/app.svg',
          'icons/app-192.png',
          'icons/app-512.png',
          'icons/app-maskable-512.png',
          ...Object.keys(bundle),
        ]),
      ].filter((f) => !f.endsWith('.map') && f !== 'build-info.json');
      const hash = createHash('sha256');
      hash.update(manifestText);
      for (const file of files.filter((f) => f.startsWith('icons/')))
        hash.update(readFileSync(join(publicDir, file)));
      for (const file of Object.values(bundle))
        hash.update(file.type === 'chunk' ? file.code : file.source);
      const version = hash.digest('hex').slice(0, 16);
      const prefix = `m8e-calc:${base}:`;
      const source = `
const PREFIX = ${JSON.stringify(prefix)}, CACHE = PREFIX + ${JSON.stringify(version)};
const URLS = ${JSON.stringify(files.map((f) => base + f))};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(URLS)));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => { if (event.data === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(${JSON.stringify(base)})) return;
  // Provenance is network-only for both document navigation and ordinary fetch.
  // Never consult either the SW cache or the browser's HTTP cache for this file.
  if (url.pathname === ${JSON.stringify(base + 'build-info.json')}) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }
  const isAppEntry = url.pathname === ${JSON.stringify(base)} || url.pathname === ${JSON.stringify(base + 'index.html')};
  // Hash routing needs only the two app entry paths, never arbitrary documents.
  if (!isAppEntry && !URLS.includes(url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(event.request, { ignoreSearch: true, ignoreVary: true });
    if (cached) return cached;
    if (isAppEntry && event.request.mode === 'navigate') return await cache.match(${JSON.stringify(base + 'index.html')}) || fetch(event.request);
    return fetch(event.request);
  })());
});`;
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}
