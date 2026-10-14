import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useMediaQuery } from './useMediaQuery';
import { useSpring } from './useSpring';
import { useSettingsStore } from '../shared/settingsStore';
afterEach(() => vi.restoreAllMocks());
it('subscribes to media changes and unsubscribes on unmount', () => {
  let matches = false;
  let listener: (() => void) | undefined;
  const remove = vi.fn();
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query) =>
      ({
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
        get matches() {
          return matches;
        },
        addEventListener: (
          _event: string,
          callback: EventListenerOrEventListenerObject,
        ) => {
          listener = callback as () => void;
        },
        removeEventListener: remove,
      }) as MediaQueryList,
  );
  const { result, unmount } = renderHook(() =>
    useMediaQuery('(max-width: 600px)'),
  );
  expect(result.current).toBe(false);
  act(() => {
    matches = true;
    listener?.();
  });
  expect(result.current).toBe(true);
  unmount();
  expect(remove).toHaveBeenCalled();
});
it('retargets JS springs synchronously with motion off', () => {
  useSettingsStore.setState({ motionLevel: 'off' });
  const { result, rerender } = renderHook(({ target }) => useSpring(target), {
    initialProps: { target: 0 },
  });
  rerender({ target: 100 });
  expect(result.current).toBe(100);
});
it('keeps scalar springs bounded and releases their last frame on unmount', () => {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query) =>
      ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }) as unknown as MediaQueryList,
  );
  useSettingsStore.setState({ motionLevel: 'full' });
  const pending = new Map<number, FrameRequestCallback>();
  let sequence = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    pending.set(++sequence, callback);
    return sequence;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => pending.delete(id));
  const { result, rerender, unmount } = renderHook(
    ({ target }) => useSpring(target),
    { initialProps: { target: 0 } },
  );
  rerender({ target: 10 });
  let time = performance.now();
  for (let i = 0; i < 300 && pending.size; i++)
    act(() => {
      time += 16;
      const callbacks = [...pending.values()];
      pending.clear();
      callbacks.forEach((callback) => callback(time));
    });
  expect(result.current).toBe(10);
  expect(pending.size).toBe(0);
  rerender({ target: 20 });
  expect(pending.size).toBe(1);
  unmount();
  expect(pending.size).toBe(0);
  vi.unstubAllGlobals();
});
