import { UNSTABLE_ToastQueue as ToastQueue } from 'react-aria-components';

export type SnackbarMessage = { message: string } & (
  | { actionLabel: string; onAction: () => void }
  | { actionLabel?: never; onAction?: never }
);
type ToastOptions = Parameters<ToastQueue<SnackbarMessage>['add']>[1];
interface PendingMessage {
  key: string;
  content: SnackbarMessage;
  options?: ToastOptions;
}
/** FIFO adapter: React Aria's base queue prepends; pending messages must not replace Undo. */
export class SnackbarQueue extends ToastQueue<SnackbarMessage> {
  private pending: PendingMessage[] = [];
  private active: { key: string; alias: string } | undefined;
  private sequence = 0;
  constructor() {
    super({ maxVisibleToasts: 1 });
  }
  override add(content: SnackbarMessage, options?: ToastOptions): string {
    const key = `snackbar-${++this.sequence}`;
    const safeOptions = {
      ...options,
      timeout: content.onAction
        ? undefined
        : options?.timeout
          ? Math.max(5000, options.timeout)
          : undefined,
    };
    const message = { key, content, options: safeOptions };
    if (this.active) this.pending.push(message);
    else this.show(message);
    return key;
  }
  private show(message: PendingMessage): void {
    const key = super.add(message.content, message.options);
    this.active = { key, alias: message.key };
  }
  override close(key: string): void {
    if (key === this.active?.key || key === this.active?.alias) {
      const active = this.active;
      this.active = undefined;
      super.pauseAll();
      super.close(active?.key ?? key);
      const next = this.pending.shift();
      if (next) this.show(next);
    } else {
      const index = this.pending.findIndex((message) => message.key === key);
      if (index >= 0) this.pending.splice(index, 1)[0]?.options?.onClose?.();
    }
  }
  override clear(): void {
    super.pauseAll();
    this.pending = [];
    this.active = undefined;
    super.clear();
  }
}
export function createSnackbarQueue(): SnackbarQueue {
  return new SnackbarQueue();
}
export const snackbarQueue = createSnackbarQueue();
