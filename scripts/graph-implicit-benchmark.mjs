import assert from 'node:assert/strict';
import os from 'node:os';
import { performance } from 'node:perf_hooks';
import {
  compileImplicitCurve,
  parseImplicitInput,
  sampleImplicitCurveDetailed,
} from '../src/graph/index.ts';

const pixelSize = { width: 1280, height: 720 };
const bounds = { xMin: -3, xMax: 3, yMin: -3, yMax: 3 };
const budgets = {
  maxCells: 200000,
  maxEvaluations: 1000000,
  maxSamples: 400000,
  maxDepth: 10,
  maxSegments: 50000,
};
const criteria = { discoveryPixels: 8, tolerancePixels: 0.25 };
const warmupIterations = 2,
  iterations = 5,
  regressionLimitMilliseconds = 1500;
const cases = [
  { source: 'x^2+y^2=4', components: 1, closed: true },
  { source: 'x^2/4+y^2=1', components: 1, closed: true },
  { source: 'x*y=1', components: 2 },
  { source: '(x-.123)*(y-.234)=0', components: 4 },
  { source: '(x-.123)*y=0', components: 4 },
  { source: '(x^2+y^2-1)*((x-1.7)^2+y^2-.16)=0', components: 2, closed: true },
  {
    source: '((x-.4)^2+(y-.43)^2-(6/720)^2)*((x-.42)^2+(y-.43)^2-(6/720)^2)=0',
    components: 2,
    closed: true,
    bounds: { xMin: 0, xMax: 1, yMin: 0, yMax: 1 },
  },
  { source: '1/(x-.123)=0', components: 0 },
  { source: 'sqrt(x)+y=0', components: 1 },
];
const results = [];
for (const reference of cases) {
  const parsed = parseImplicitInput(reference.source);
  assert(parsed.ok, reference.source);
  const curve = parsed.value,
    box = reference.bounds ?? bounds;
  const run = () =>
    sampleImplicitCurveDetailed(curve, box, pixelSize, {
      ...budgets,
      ...criteria,
    });
  for (let i = 0; i < warmupIterations; i++) run();
  const start = performance.now();
  for (let i = 0; i < iterations; i++) run();
  const meanMilliseconds = (performance.now() - start) / iterations;
  const sample = run(),
    f = compileImplicitCurve(curve);
  assert.equal(
    sample.truncated,
    false,
    reference.source + ': exhausted budget',
  );
  assert.equal(
    sample.segments.length,
    reference.components,
    reference.source + ': topology',
  );
  assert(sample.evaluations <= budgets.maxEvaluations);
  assert(sample.diagnostics.cells <= budgets.maxCells);
  assert(sample.diagnostics.cachedSamples <= budgets.maxSamples);
  assert(sample.diagnostics.outputEdges <= budgets.maxSegments);
  for (const line of sample.segments) {
    if (reference.closed)
      assert.deepEqual(line[0], line.at(-1), 'closed reference');
    for (const p of line) {
      assert(Number.isFinite(p.x) && Number.isFinite(p.y));
      assert(
        p.x >= box.xMin &&
          p.x <= box.xMax &&
          p.y >= box.yMin &&
          p.y <= box.yMax,
      );
      assert(
        Math.abs(f(p.x, p.y)) < 1e-8,
        reference.source + ': endpoint residual',
      );
    }
  }
  results.push({
    source: reference.source,
    bounds: box,
    meanMilliseconds,
    evaluations: sample.evaluations,
    segments: sample.segments.length,
    ...sample.diagnostics,
  });
}
console.log(
  JSON.stringify(
    {
      node: process.version,
      cpu: os.cpus()[0]?.model,
      pixelSize,
      criteria,
      budgets,
      warmupIterations,
      iterations,
      targetMilliseconds: 250,
      regressionLimitMilliseconds,
      results,
    },
    null,
    2,
  ),
);
assert(
  results.every((r) => r.meanMilliseconds < regressionLimitMilliseconds),
  '2D performance regression',
);
