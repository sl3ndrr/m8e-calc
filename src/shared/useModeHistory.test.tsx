import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useModeHistory } from './useModeHistory';
import { useHistoryStore } from './historyStore';
import { getMode } from '../app/modeRegistry';
afterEach(() => useHistoryStore.getState().resetHistory());
it('registers a mounted callback, scopes additions and unregisters on unmount', () => {
  const callback = vi.fn();
  const { result, unmount } = renderHook(() =>
    useModeHistory('simple', callback),
  );
  act(() => {
    result.current.add({ input: '2 + 3', result: '5', payload: null });
    useHistoryStore
      .getState()
      .add('graph', { input: 'x', result: 'x', payload: null });
  });
  expect(result.current.entries).toHaveLength(1);
  const entry = result.current.entries[0];
  if (!entry) throw Error('Missing entry');
  expect(result.current.restore(entry)).toBe(true);
  expect(callback).toHaveBeenCalledWith(entry);
  expect(result.current.restore({ ...entry, mode: 'graph' })).toBe(false);
  unmount();
  expect(getMode('simple').historyAdapter.restore(entry)).toBe(false);
});
