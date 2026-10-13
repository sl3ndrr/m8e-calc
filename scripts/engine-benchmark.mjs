import { performance } from 'node:perf_hooks';
import os from 'node:os';
import { evaluateString } from '../src/engine/index.ts';

const expressions = [
  '0.1+0.2',
  '2(3+4)-5^2',
  '200+15%',
  'sqrt(2)+log(1000)',
  'sin(30)+cos(60)',
];
const context = { angleMode: 'deg', percentMode: 'calculator' };
for (let i = 0; i < 1000; i++)
  evaluateString(expressions[i % expressions.length], context);
const results = expressions.map((src) => {
  const iterations = 3000;
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    const result = evaluateString(src, context);
    if (!result.ok) throw new Error(JSON.stringify(result.error));
  }
  return {
    expression: src,
    meanMilliseconds: (performance.now() - start) / iterations,
  };
});
console.log(
  JSON.stringify(
    { node: process.version, cpu: os.cpus()[0]?.model, results },
    null,
    2,
  ),
);
if (results.some(({ meanMilliseconds }) => meanMilliseconds >= 1))
  process.exitCode = 1;
