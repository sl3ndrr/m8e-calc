import { isCalculationResponse, matchesCalculation, type CalculationRequest, type CalculationResponse } from './workerProtocol';

export type CalculationBusy = CalculationRequest['kind'] | null;
export interface CalculationWorker {
  postMessage: (request: CalculationRequest) => void;
  terminate: () => void;
  addEventListener: (type: 'message' | 'error' | 'messageerror', listener: EventListener) => void;
  removeEventListener: (type: 'message' | 'error' | 'messageerror', listener: EventListener) => void;
}
interface Job {
  request: CalculationRequest;
  complete: (response: CalculationResponse) => void;
  fail: () => void;
}
export function createCalculationWorker(): CalculationWorker {
  return new Worker(new URL('./calculation.worker.ts', import.meta.url), { type: 'module' });
}
/** One running job and only the latest preview successor. No synchronous fallback. */
export class CalculationExecutor {
  private worker: CalculationWorker | null = null;
  private running: Job | null = null;
  private pending: Job | null = null;
  private detach: (() => void) | null = null;
  private disposed = false;
  constructor(
    private readonly busy: (kind: CalculationBusy) => void,
    private readonly factory: () => CalculationWorker = createCalculationWorker,
  ) {}
  submit(request: CalculationRequest, complete: Job['complete'], fail: Job['fail']): void {
    if (this.disposed) return;
    // Explicit execution always wins. Typing only replaces previews, preserving Enter's snapshot.
    if (request.kind !== 'preview' || this.running?.request.kind === 'preview') this.stop();
    this.pending = { request, complete, fail };
    this.pump();
  }
  cancelPreview(): void {
    if (this.pending?.request.kind === 'preview') this.pending = null;
    if (this.running?.request.kind === 'preview') {
      this.stop();
      this.busy(null);
    }
  }
  cancel(): void {
    this.pending = null;
    this.stop();
    if (!this.disposed) this.busy(null);
  }
  dispose(): void {
    this.disposed = true;
    this.pending = null;
    this.stop();
  }
  private stop(): void {
    this.detach?.();
    this.detach = null;
    this.worker?.terminate();
    this.worker = null;
    this.running = null;
  }
  private pump(): void {
    if (this.disposed || this.running || !this.pending) return;
    const job = this.pending;
    this.pending = null;
    this.running = job;
    this.busy(job.request.kind);
    try {
      const worker = this.worker ?? this.factory();
      this.worker = worker;
      const failed = (event?: Event) => {
        if (this.worker !== worker || this.running !== job) return;
        event?.preventDefault();
        this.pending = null;
        this.stop();
        this.busy(null);
        job.fail();
      };
      const message: EventListener = (event) => {
        if (this.worker !== worker || this.running !== job) return;
        const data: unknown = (event as MessageEvent<unknown>).data;
        if (!isCalculationResponse(data)) { failed(); return; }
        // An already queued duplicate/old answer cannot consume the active job.
        if (data.id !== job.request.id) return;
        if (!matchesCalculation(data, job.request) || data.status === 'failure') { failed(); return; }
        if (data.status === 'started') return;
        this.stop();
        this.busy(null);
        job.complete(data);
        this.pump();
      };
      const error: EventListener = (event) => failed(event);
      worker.addEventListener('message', message);
      worker.addEventListener('error', error);
      worker.addEventListener('messageerror', error);
      this.detach = () => {
        worker.removeEventListener('message', message);
        worker.removeEventListener('error', error);
        worker.removeEventListener('messageerror', error);
      };
      worker.postMessage(job.request);
    } catch {
      this.pending = null;
      this.stop();
      this.busy(null);
      job.fail();
    }
  }
}
