import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { usePwa } from './pwa';
import { snackbarQueue } from '../ui';
afterEach(() => {
  snackbarQueue.clear();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it('registers under the base and activates an update only after its snackbar action', async () => {
  vi.stubEnv('PROD', true);
  const postMessage = vi.fn();
  const registration = Object.assign(new EventTarget(), {
    waiting: { postMessage },
    update: vi.fn(() => Promise.resolve()),
  });
  const register = vi.fn(() => Promise.resolve(registration));
  const serviceWorker = Object.assign(new EventTarget(), {
    controller: {},
    register,
  });
  vi.stubGlobal('navigator', { serviceWorker });
  const { unmount } = renderHook(usePwa);
  await waitFor(() => expect(snackbarQueue.visibleToasts).toHaveLength(1));
  expect(register).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}sw.js`, {
    scope: import.meta.env.BASE_URL,
    updateViaCache: 'none',
  });
  expect(postMessage).not.toHaveBeenCalled();
  expect(snackbarQueue.visibleToasts[0]?.content.message).toBe(
    'Neue Version verfügbar',
  );
  act(() => snackbarQueue.visibleToasts[0]?.content.onAction?.());
  expect(postMessage).toHaveBeenCalledWith('SKIP_WAITING');
  unmount();
});
it('offers installation only when the browser supplies its prompt', async () => {
  vi.stubEnv('PROD', true);
  const serviceWorker = Object.assign(new EventTarget(), {
    controller: null,
    register: vi.fn(() => Promise.reject(new Error('Unsupported'))),
  });
  vi.stubGlobal('navigator', { serviceWorker });
  const { result, unmount } = renderHook(usePwa);
  expect(result.current.canInstall).toBe(false);
  const prompt = vi.fn(() => Promise.resolve());
  const event = Object.assign(
    new Event('beforeinstallprompt', {
      cancelable: true,
    }),
    { prompt, userChoice: Promise.resolve({ outcome: 'accepted' }) },
  );
  act(() => window.dispatchEvent(event));
  expect(event.defaultPrevented).toBe(true);
  expect(result.current.canInstall).toBe(true);
  act(() => result.current.install());
  await waitFor(() => expect(result.current.canInstall).toBe(false));
  expect(prompt).toHaveBeenCalledOnce();
  expect(snackbarQueue.visibleToasts).toEqual([]);
  unmount();
});
