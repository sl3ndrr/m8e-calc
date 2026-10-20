import { expect, it } from 'vitest';
import { newRow, parseRow } from './model';
import { SamplingQueue } from './samplingQueue';
import {
  implicitBudget,
  type SampleRequest,
  type SampleResponse,
} from './workerProtocol';

function request(id: number, input = 'a*sin(x)'): SampleRequest {
  const curve = parseRow({
    ...newRow('curve', input),
    params: { a: { value: id, min: 0, max: 1000, step: 1 } },
  }).curve;
  if (!curve) throw Error(input);
  return {
    version: 2,
    id,
    bounds: { xMin: -4, xMax: 4, yMin: -3, yMax: 3 },
    size: { width: 800, height: 600 },
    budget: implicitBudget,
    curves: [{ id: 'curve', curve, signature: JSON.stringify(curve) }],
  };
}
function response(req: SampleRequest): SampleResponse {
  return {
    ...req,
    milliseconds: 120,
    curves: req.curves.map(({ id, signature }) => ({
      id,
      signature,
      segments: [[{ x: 0, y: req.id }, { x: 1, y: req.id }]],
      evaluations: 2,
      truncated: false,
    })),
  };
}

it('coalesces arbitrarily many updates into one successor and presents completed intermediate snapshots', () => {
  const queue = new SamplingQueue();
  queue.enqueue(request(1));
  const running = queue.take();
  expect(running?.id).toBe(1);
  for (let id = 2; id <= 1000; id++) {
    queue.invalidate();
    queue.enqueue(request(id));
    expect(queue.take()).toBeNull();
    expect(queue.running).toBe(running);
    expect(queue.pending?.id).toBe(id);
  }
  expect(queue.complete(response(request(1)))).toEqual({
    present: true,
    current: false,
  });
  expect(queue.take()?.id).toBe(1000);
  expect(queue.complete(response(request(1000)))).toEqual({
    present: true,
    current: true,
  });
  expect(queue.take()).toBeNull();
  expect(queue.pending).toBeNull();
  expect(queue.running).toBeNull();
});

it('continues to present work slower than the producer and drains the exact final input after pause', () => {
  const queue = new SamplingQueue();
  let latest = 1;
  queue.enqueue(request(latest));
  for (let cycle = 0; cycle < 20; cycle++) {
    const running = queue.take();
    if (!running) throw Error('No running work');
    for (let tick = 0; tick < 3; tick++) {
      queue.invalidate();
      queue.enqueue(request(++latest));
    }
    expect(queue.complete(response(running))).toEqual({
      present: true,
      current: false,
    });
  }
  const final = queue.take();
  if (!final) throw Error('Missing final input');
  expect(final.id).toBe(latest);
  expect(queue.complete(response(final))?.current).toBe(true);
  expect(queue.take()).toBeNull();
});

it('rejects a running old function even after A -> B -> A', () => {
  const queue = new SamplingQueue();
  queue.enqueue(request(1));
  queue.take();
  queue.invalidate(true);
  queue.enqueue(request(2, 'a*x^2-1'));
  queue.invalidate(true);
  queue.enqueue(request(3));
  expect(queue.complete(response(request(1)))).toEqual({
    present: false,
    current: false,
  });
  expect(queue.take()?.id).toBe(3);
});

it('rejects old navigation, malformed responses, duplicate replies and clears all retained jobs', () => {
  const queue = new SamplingQueue();
  queue.enqueue(request(1));
  queue.take();
  const next = request(2);
  next.bounds = { ...next.bounds, xMax: 5 };
  queue.enqueue(next);
  expect(queue.complete(response(request(1)))?.present).toBe(false);
  queue.take();
  const malformed = response(next);
  malformed.curves = [];
  expect(queue.complete(malformed)?.present).toBe(false);
  expect(queue.complete(response(next))).toBeNull();
  queue.enqueue(request(3));
  queue.take();
  queue.enqueue(request(4));
  queue.clear();
  expect(queue.latest).toBeNull();
  expect(queue.pending).toBeNull();
  expect(queue.running).toBeNull();
  expect(queue.complete(response(request(3)))).toBeNull();
});
