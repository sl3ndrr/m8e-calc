import type { CalculationWorker } from './calculationExecutor';
import type { CalculationRequest } from './workerProtocol';
import { runCalculation } from './workerCalculation';

/** Controlled transport only for tests. Production never falls back to main-thread work. */
export class TestCalculationWorker implements CalculationWorker {
  static instances: TestCalculationWorker[] = [];
  static hold = false;
  readonly listeners = new Map<string, Set<EventListener>>();
  readonly sent: CalculationRequest[] = [];
  terminated = false;
  constructor() {
    TestCalculationWorker.instances.push(this);
  }
  addEventListener(type: string, listener: EventListener): void {
    const list = this.listeners.get(type) ?? new Set<EventListener>();
    list.add(listener);
    this.listeners.set(type, list);
  }
  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
  }
  postMessage(request: CalculationRequest): void {
    this.sent.push(structuredClone(request));
    if (!TestCalculationWorker.hold) queueMicrotask(() => this.respond());
  }
  respond(data: unknown = runCalculation(this.request)): void {
    for (const listener of [...(this.listeners.get('message') ?? [])])
      listener(new MessageEvent('message', { data: structuredClone(data) }));
  }
  get request(): CalculationRequest {
    const request = this.sent[0];
    if (!request) throw new Error('No calculation request');
    return request;
  }
  crash(type = 'error'): void {
    for (const listener of [...(this.listeners.get(type) ?? [])])
      listener(new Event(type));
  }
  terminate(): void {
    this.terminated = true;
  }
}
