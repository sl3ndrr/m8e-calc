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
