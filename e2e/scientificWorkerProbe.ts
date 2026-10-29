import type { Page } from '@playwright/test';
import type { CalculationRequest } from '../src/features/scientific/workerProtocol';

interface ScientificWorkerProbe {
  hold: boolean;
  created: number;
  terminated: number;
  active: number;
  maxActive: number;
  posts: CalculationRequest[];
  started: number[];
  replies: number[];
  csp: string[];
  release: () => void;
  fail: () => void;
}
declare global { interface Window { __scientificWorkerProbe: ScientificWorkerProbe } }

/** Real production workers and computations. Only final delivery is gated; no clock/sleep simulation. */
export async function installScientificWorkerProbe(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const deliveries: (() => void)[] = [];
    const probe: ScientificWorkerProbe = {
      hold: true, created: 0, terminated: 0, active: 0, maxActive: 0,
      posts: [], started: [], replies: [], csp: [],
      release: () => { probe.hold = false; for (const deliver of deliveries.splice(0)) deliver(); },
      fail: () => {},
    };
    window.__scientificWorkerProbe = probe;
    document.addEventListener('securitypolicyviolation', (event) => probe.csp.push(event.violatedDirective));
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      private active = false;
      private ended = false;
      private readonly tracked: boolean;
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.tracked = String(url).includes('calculation.worker');
        if (!this.tracked) return;
        probe.created++;
        probe.fail = () => this.dispatchEvent(new Event('error', { cancelable: true }));
        this.addEventListener('message', (event: MessageEvent<{ id: number; status: string }>) => {
          if (!event.isTrusted) return;
          if (event.data.status === 'started') { probe.started.push(event.data.id); return; }
          probe.replies.push(event.data.id);
          if (probe.hold) {
            event.stopImmediatePropagation();
            const data: unknown = event.data;
            deliveries.push(() => this.dispatchEvent(new MessageEvent('message', { data })));
          }
        });
      }
      postMessage(message: unknown, transfer: Transferable[] | StructuredSerializeOptions = []): void {
        if (this.tracked) {
          probe.posts.push(structuredClone(message as CalculationRequest));
          this.active = true; probe.active++;
          probe.maxActive = Math.max(probe.maxActive, probe.active);
        }
        if (Array.isArray(transfer)) super.postMessage(message, transfer);
        else super.postMessage(message, transfer);
      }
      terminate(): void {
        if (this.tracked && !this.ended) {
          if (this.active) probe.active--;
          probe.terminated++; this.ended = true; this.active = false;
        }
        super.terminate();
      }
    };
  });
}
