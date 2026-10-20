import {
  matchesRequest,
  type SampleRequest,
  type SampleResponse,
} from './workerProtocol';

/**
 * One running job plus one replaceable successor. Only parameter changes may
 * present a completed intermediate snapshot; freshness still requires latest.
 * Navigation/structure invalidates the generation, including A -> B -> A.
 */
export class SamplingQueue {
  latest: SampleRequest | null = null;
  running: SampleRequest | null = null;
  pending: SampleRequest | null = null;
  private generation = 0;
  private runningGeneration = 0;

  invalidate(structural = false): void {
    if (structural) this.generation++;
    this.latest = null;
    this.pending = null;
  }

  enqueue(request: SampleRequest): void {
    this.latest = request;
    this.pending = request;
  }

  take(): SampleRequest | null {
    if (this.running || !this.pending) return null;
    this.running = this.pending;
    this.pending = null;
    this.runningGeneration = this.generation;
    return this.running;
  }

  complete(result: SampleResponse): {
    present: boolean;
    current: boolean;
  } | null {
    if (!this.running || result.id !== this.running.id) return null;
    const valid = matchesRequest(result, this.running);
    const present =
      valid &&
      this.runningGeneration === this.generation &&
      !!this.latest &&
      JSON.stringify(result.bounds) === JSON.stringify(this.latest.bounds) &&
      JSON.stringify(result.size) === JSON.stringify(this.latest.size);
    const current =
      present && !!this.latest && matchesRequest(result, this.latest);
    this.running = null;
    return { present, current };
  }

  clear(): void {
    this.invalidate(true);
    this.running = null;
  }
}
