import type { Page } from '@playwright/test';

function barrier() {
  let release: (() => void) | undefined;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release: () => release?.() };
}

export async function holdChunk(page: Page, name: 'AccentPanel' | 'DesignLab') {
  const requested = barrier();
  const held = barrier();
  await page.route(new RegExp(`/assets/${name}-[^/]+\\.js$`), async (route) => {
    requested.release();
    await held.promise;
    await route.continue();
  });
  return { requested: requested.promise, release: held.release };
}
