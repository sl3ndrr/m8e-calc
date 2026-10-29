import { afterEach, expect, it, vi } from 'vitest';
import { createEnvironment } from '../../engine';
import { CalculationExecutor } from './calculationExecutor';
import { TestCalculationWorker } from './calculationTestWorker';
import { runCalculation } from './workerCalculation';
import type { CalculationRequest } from './workerProtocol';

function setup() {
  TestCalculationWorker.hold = true;
  const complete = vi.fn(), fail = vi.fn(), busy = vi.fn();
  const workers: TestCalculationWorker[] = [];
  const adapter = new CalculationExecutor(busy, () => {
    const worker = new TestCalculationWorker(); workers.push(worker); return worker;
  });
  const submit = (id: number, kind: CalculationRequest['kind'] = 'preview', expression = String(id)) => {
    const request: CalculationRequest = { version: 1, id, kind, expression,
      environmentRevision: 0, executionRevision: 0, inputRevision: id,
      environment: createEnvironment(), options: { angleMode: 'rad', complex: 'off' }, editingName: null };
    adapter.submit(request, complete, fail); return request;
  };
  return { adapter, workers, complete, fail, busy, submit };
}
afterEach(() => { TestCalculationWorker.instances = []; TestCalculationWorker.hold = false; });
it('keeps Enter running through 1000 preview changes and dispatches only the latest successor', () => {
  const s = setup();
  s.submit(1, 'execute');
  for (let id = 2; id <= 1001; id++) s.submit(id);
  expect(s.workers).toHaveLength(1);
  s.workers[0]?.respond();
  expect(s.complete).toHaveBeenCalledTimes(1);
  expect(s.workers).toHaveLength(2);
  expect(s.workers[1]?.request.id).toBe(1001);
  s.workers[1]?.respond();
  expect(s.complete).toHaveBeenCalledTimes(2);
  expect(s.workers.every((w) => w.terminated)).toBe(true);
  s.adapter.dispose();
});
it('terminates superseded A → B → A previews and two explicit executions, ignoring queued old handlers and duplicates', () => {
  const s = setup();
  s.submit(1, 'preview', '1');
  const old = s.workers[0];
  if (!old) throw new Error('setup');
  const queued = [...old.listeners.get('message') ?? []];
  s.submit(2, 'preview', '2'); s.submit(3, 'preview', '1');
  expect(old.terminated).toBe(true);
  for (const listener of queued) listener(new MessageEvent('message', { data: runCalculation(old.request) }));
  expect(s.complete).not.toHaveBeenCalled();
  s.submit(4, 'execute'); s.submit(5, 'execute');
  for (const worker of s.workers) worker.respond();
  s.workers.at(-1)?.respond();
  expect(s.complete).toHaveBeenCalledTimes(1);
  expect(s.complete.mock.calls[0]?.[0]).toMatchObject({ id: 5 });
  expect(s.workers.every((w) => [...w.listeners.values()].every((listeners) => listeners.size === 0))).toBe(true);
  s.adapter.dispose();
});
it.each(['error', 'messageerror', 'malformed', 'identity'])(
  '%s fails once, discards pending work and needs an explicit new request', (failure) => {
    const s = setup(); s.submit(1, 'execute'); s.submit(2);
    const worker = s.workers[0]; if (!worker) throw new Error('setup');
    if (failure === 'malformed') worker.respond({ version: 99 });
    else if (failure === 'identity') worker.respond({ ...runCalculation(worker.request), executionRevision: 99 });
    else worker.crash(failure);
    worker.crash(); worker.respond();
    expect(s.fail).toHaveBeenCalledTimes(1); expect(s.complete).not.toHaveBeenCalled();
    expect(s.workers).toHaveLength(1); expect(worker.terminated).toBe(true);
    s.submit(3, 'execute'); s.workers[1]?.respond();
    expect(s.complete).toHaveBeenCalledTimes(1);
    s.adapter.dispose();
  },
);
it('cancel and dispose remove listeners, terminate work and prevent any successor or restart', () => {
  const s = setup(); s.submit(1, 'execute'); s.submit(2);
  s.adapter.cancel(); s.workers[0]?.respond();
  expect(s.workers).toHaveLength(1); expect(s.complete).not.toHaveBeenCalled();
  s.submit(3); s.adapter.dispose(); s.workers[1]?.respond(); s.submit(4);
  expect(s.workers).toHaveLength(2); expect(s.complete).not.toHaveBeenCalled();
  expect(s.workers.every((w) => w.terminated && [...w.listeners.values()].every((l) => l.size === 0))).toBe(true);
});
it('handles constructor/postMessage failures without a synchronous computation or retry', () => {
  const s = setup(); s.submit(1); const request = s.workers[0]?.request;
  if (!request) throw new Error('setup'); s.adapter.dispose();
  for (const postFails of [false, true]) {
    const fail = vi.fn(), complete = vi.fn(), factory = vi.fn(() => {
      if (!postFails) throw new Error('worker unavailable');
      const w = new TestCalculationWorker(); w.postMessage = () => { throw new Error('clone failed'); }; return w;
    });
    const adapter = new CalculationExecutor(vi.fn(), factory);
    adapter.submit(request, complete, fail);
    expect(fail).toHaveBeenCalledTimes(1); expect(factory).toHaveBeenCalledTimes(1); expect(complete).not.toHaveBeenCalled();
    adapter.dispose();
  }
});
