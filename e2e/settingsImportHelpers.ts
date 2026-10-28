import type { Page } from '@playwright/test';

declare global {
  interface Window {
    __wp03ReadStarted: () => Promise<void>;
    __wp03RateHeld: () => Promise<void>;
  }
}

/** Hold the actual File.text promise; release only after the test's UI action. */
export async function holdSettingsRead(page: Page, unreadable = false) {
  let signalStarted: () => void = () => {
    throw new Error('Read signal not initialized');
  };
  const started = new Promise<void>((resolve) => {
    signalStarted = resolve;
  });
  await page.exposeFunction('__wp03ReadStarted', () => signalStarted());
  await page.evaluate((rejectRead) => {
    const nativeText = File.prototype.text;
    File.prototype.text = function () {
      if (this.name !== 'wp03-settings.json') return nativeText.call(this);
      const pending = new Promise<void>((resolve) => {
        window.addEventListener('wp03:finish-read', () => resolve(), {
          once: true,
        });
      });
      void window.__wp03ReadStarted();
      return pending.then(() => {
        if (rejectRead)
          throw new DOMException('Read failed', 'NotReadableError');
        return nativeText.call(this);
      });
    };
  }, unreadable);
  return {
    started,
    finish: () =>
      page.evaluate(() => {
        window.dispatchEvent(new Event('wp03:finish-read'));
      }),
  };
}

/** Real recorded fetch, but its parsed body arrives after consent is revoked. */
export async function holdRateBody(page: Page, endpoint: string) {
  let signalStarted: () => void = () => {
    throw new Error('Response signal not initialized');
  };
  const started = new Promise<void>((resolve) => {
    signalStarted = resolve;
  });
  await page.exposeFunction('__wp03RateHeld', () => signalStarted());
  await page.evaluate((rateEndpoint) => {
    const nativeFetch = window.fetch;
    let held = false;
    window.fetch = async (...args) => {
      const response = await nativeFetch(...args);
      const input = args[0];
      const url = input instanceof Request ? input.url : String(input);
      if (!held && url.startsWith(rateEndpoint)) {
        held = true;
        const body: unknown = await response.json();
        response.json = () =>
          new Promise<unknown>((resolve) => {
            window.addEventListener('wp03:finish-rate', () => resolve(body), {
              once: true,
            });
            void window.__wp03RateHeld();
          });
      }
      return response;
    };
  }, endpoint);
  return {
    started,
    finish: () =>
      page.evaluate(async () => {
        window.dispatchEvent(new Event('wp03:finish-rate'));
        // The response continuation runs before the next browser frame.
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );
      }),
  };
}
