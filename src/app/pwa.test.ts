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

it('detaches registration and installing-worker listeners after repeated mount/unmount', async () => {
  vi.stubEnv('PROD', true);
  const worker = Object.assign(new EventTarget(), { state: 'installing' });
  const workerRemove = vi.spyOn(worker, 'removeEventListener');
  const reg = Object.assign(new EventTarget(), {
    waiting: null,
    installing: worker,
    update: vi.fn(() => Promise.resolve()),
  });
  const regRemove = vi.spyOn(reg, 'removeEventListener');
  const serviceWorker = Object.assign(new EventTarget(), {
    controller: {},
    register: vi.fn(() => Promise.resolve(reg)),
  });
  vi.stubGlobal('navigator', { serviceWorker });
  for (let i = 0; i < 3; i++) {
    const { unmount } = renderHook(usePwa);
    await waitFor(() =>
      expect(serviceWorker.register).toHaveBeenCalledTimes(i + 1),
    );
    await act(async () => {
      await Promise.resolve();
    });
    unmount();
  }
  expect(
    regRemove.mock.calls.filter(([name]) => name === 'updatefound'),
  ).toHaveLength(3);
  expect(
    workerRemove.mock.calls.filter(([name]) => name === 'statechange'),
  ).toHaveLength(3);
  act(() => {
    worker.state = 'installed';
    worker.dispatchEvent(new Event('statechange'));
  });
  expect(snackbarQueue.visibleToasts).toHaveLength(0);
});

it('does not offer installation without service worker support', () => {
  vi.stubEnv('PROD', true);
  vi.stubGlobal('navigator', {});
  const { result, unmount } = renderHook(usePwa);
  const event = new Event('beforeinstallprompt', { cancelable: true });
  act(() => window.dispatchEvent(event));
  expect(event.defaultPrevented).toBe(false);
  expect(result.current.canInstall).toBe(false);
  act(() => result.current.install());
  expect(result.current.canInstall).toBe(false);
  unmount();
});
