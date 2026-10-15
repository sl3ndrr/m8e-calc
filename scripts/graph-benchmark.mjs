import { performance } from 'node:perf_hooks';
import os from 'node:os';
import {
  parseCurveInput,
  sampleCurveDetailed,
  Viewport,
} from '../src/graph/index.ts';

const bounds = { xMin: -5, xMax: 5, yMin: -5, yMax: 5 };
const pixelSize = { width: 2560, height: 1440 };
const curves = [
  'sin(x)',
  '1/x',
  'tan(x)',
  'abs(x)',
  'x^x',
  'sqrt(x)',
  'ln(x)',
  '(cos(t),sin(t))',
  'r=1+cos(theta)',
  '(sin(3*t),sin(2*t))',
].map((source) => {
  const result = parseCurveInput(source);
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return { source, curve: result.value };
});
for (let i = 0; i < 50; i++)
  for (const { curve } of curves) sampleCurveDetailed(curve, bounds, pixelSize);
const results = curves.map(({ source, curve }) => {
  const iterations = 200,
    start = performance.now();
  for (let i = 0; i < iterations; i++)
    sampleCurveDetailed(curve, bounds, pixelSize);
  const sampleMean = (performance.now() - start) / iterations;
  const sample = sampleCurveDetailed(curve, bounds, pixelSize);
  const viewport = new Viewport(bounds, pixelSize, { lockAspect: true });
  for (let i = 0; i < 50; i++) viewport.fitToCurves([curve]);
  const fitStart = performance.now();
  for (let i = 0; i < iterations; i++) viewport.fitToCurves([curve]);
  const fitMean = (performance.now() - fitStart) / iterations;
  return {
    source,
    meanMilliseconds: sampleMean,
    fitMeanMilliseconds: fitMean,
    evaluations: sample.evaluations,
    segments: sample.segments.length,
  };
});
console.log(
  JSON.stringify(
    {
      node: process.version,
      cpu: os.cpus()[0]?.model,
      pixelSize,
      targetMilliseconds: 4,
      regressionLimitMilliseconds: 25,
      results,
    },
    null,
    2,
  ),
);
if (
  results.some(
    (result) =>
      result.meanMilliseconds >= 25 || result.fitMeanMilliseconds >= 25,
  )
)
  process.exitCode = 1;
