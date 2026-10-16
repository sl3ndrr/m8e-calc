import type { BrowserContext } from '@playwright/test';

/** Chromium exercises the real clipboard. Other engines do not expose these
 * permissions in Playwright: keep the app's copy/restore contract testable with
 * an explicitly in-memory clipboard, without claiming OS clipboard coverage. */
export async function allowClipboard(context: BrowserContext) {
  if (context.browser()?.browserType().name() === 'chromium') {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    return;
  }
  const install = () => {
    let text = '';
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value: string) => { text = value; },
        readText: async () => text,
      },
    });
  };
  await context.addInitScript(install);
  for (const page of context.pages()) await page.evaluate(install);
}
