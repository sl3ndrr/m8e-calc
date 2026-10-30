import { test as base } from '@playwright/test';

// Keep lifecycle evidence even when a page disappears before a test can attach
// its normal runtime report. This fixture adds no wait, retry or recovery path.
export const test = base.extend<{ scientificLifecycle: void }>({
  scientificLifecycle: [
    async ({ page, browser }, use, info) => {
      const started = Date.now();
      const events: { type: string; atMs: number; message?: string }[] = [];
      const record = (type: string, message?: string) => {
        if (events.length < 128)
          events.push({ type, atMs: Date.now() - started, message });
      };
      const crashed = () => record('page-crash');
      const closed = () => record('page-close');
      const contextClosed = () => record('context-close');
      const disconnected = () => record('browser-disconnected');
      const pageError = (error: Error) => record('page-error', error.message);
      const context = page.context();
      page.on('crash', crashed);
      page.on('close', closed);
      page.on('pageerror', pageError);
      context.on('close', contextClosed);
      browser.on('disconnected', disconnected);
      try {
        await use();
      } finally {
        page.off('crash', crashed);
        page.off('close', closed);
        page.off('pageerror', pageError);
        context.off('close', contextClosed);
        browser.off('disconnected', disconnected);
        await info.attach('scientific-browser-lifecycle', {
          body: JSON.stringify({
            node: process.version,
            browser: browser.version(),
            project: info.project.name,
            viewport: page.viewportSize(),
            pageClosed: page.isClosed(),
            browserConnected: browser.isConnected(),
            events,
          }),
          contentType: 'application/json',
        });
      }
    },
    { auto: true },
  ],
});
