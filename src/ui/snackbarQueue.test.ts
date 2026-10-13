import { expect, it, vi } from 'vitest';
import { createSnackbarQueue } from './snackbarQueue';
it('keeps FIFO order and supports cancellation by returned keys', () => {
  const queue = createSnackbarQueue();
  const cancel = vi.fn();
  const first = queue.add({ message: 'First' });
  const skipped = queue.add({ message: 'Skipped' }, { onClose: cancel });
  queue.add({ message: 'Last' });
  queue.close(skipped);
  expect(cancel).toHaveBeenCalledOnce();
  expect(queue.visibleToasts[0]?.content.message).toBe('First');
  queue.close(first);
  expect(queue.visibleToasts[0]?.content.message).toBe('Last');
  queue.clear();
  expect(queue.visibleToasts).toEqual([]);
});
it('preserves Undo without a timeout and clamps informational timeouts', () => {
  const queue = createSnackbarQueue();
  queue.add(
    { message: 'Saved', actionLabel: 'Undo', onAction: () => {} },
    { timeout: 100 },
  );
  expect(queue.visibleToasts[0]?.timeout).toBeUndefined();
  queue.clear();
  queue.add({ message: 'Info' }, { timeout: 100 });
  expect(queue.visibleToasts[0]?.timeout).toBe(5000);
  queue.clear();
});
