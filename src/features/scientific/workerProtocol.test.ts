import { expect, it } from 'vitest';
import { createEnvironment, execute } from '../../engine';
import { calculate, definitionSource } from './model';
import {
  isCalculationRequest,
  isCalculationResponse,
  matchesCalculation,
  restoreCalculation,
  type CalculationRequest,
} from './workerProtocol';
import { runCalculation } from './workerCalculation';

function request(
  expression = '1+2',
  kind: CalculationRequest['kind'] = 'execute',
): CalculationRequest {
  return {
    version: 1,
    id: 1,
    environmentRevision: 2,
    executionRevision: 3,
    inputRevision: 4,
    kind,
    expression,
    environment: createEnvironment(),
    options: { angleMode: 'rad', complex: 'off' },
    editingName: null,
  };
}
it('roundtrips the expensive example with the identical value and environment', () => {
  const job = request('sum(integral(sin(x),x,0,pi),k,1,100)');
  const direct = calculate(job.expression, job.environment, job.options);
  const response = structuredClone(runCalculation(job));
  expect(isCalculationRequest(job)).toBe(true);
  expect(isCalculationResponse(response)).toBe(true);
  expect(matchesCalculation(response, job)).toBe(true);
  if (!direct.ok || response.status !== 'success')
    throw new Error('Expected integral result');
  expect(response.environment).toEqual(direct.environment);
  const restored = restoreCalculation(response.calculation);
  expect(restored.value).toEqual(direct.calculation.value);
  if (restored.value?.kind !== 'number') throw new Error('Expected number');
  expect(restored.value.value.minus(200).abs().lt('1e-12')).toBe(true);
});
it.each(['a=5', 'f(x)=1/0', '1/0', 'sin('])(
  'preview %s never exports an environment',
  (source) => {
    const job = request(source, 'preview');
    const before = structuredClone(job.environment);
    const response = runCalculation(job);
    expect(response).toMatchObject({ status: 'preview', calculation: null });
    expect(response).not.toHaveProperty('environment');
    expect(job.environment).toEqual(before);
  },
);
it('preserves complex/list values, delayed untouched functions and engine errors', () => {
  for (const expression of ['sqrt(-1)', 'factor(360)', 'sin(30°)']) {
    const job = request(expression);
    job.options.complex = 'on';
    const response = structuredClone(runCalculation(job));
    expect(isCalculationResponse(response)).toBe(true);
    if (response.status !== 'success') throw new Error('Expected result');
    expect(restoreCalculation(response.calculation).value).not.toBeNull();
  }
  const saved = execute('bits(x)=x<<1', undefined, { bitwise: true });
  if (!saved.ok) throw new Error('setup');
  const job = request(definitionSource(saved.value.environment, 'bits') ?? '');
  job.environment = saved.value.environment;
  job.editingName = 'bits';
  const response = runCalculation(job);
  expect(response).toMatchObject({
    status: 'success',
    calculation: { value: null },
    environment: job.environment,
  });
  expect(runCalculation(request('1/0'))).toMatchObject({
    status: 'error',
    error: { code: 'E_DIVISION_BY_ZERO', range: { start: 1, end: 2 } },
  });
  expect(runCalculation(request('1'.repeat(10001)))).toMatchObject({
    status: 'error',
    error: { code: 'E_RESOURCE_LIMIT' },
  });
});
it('rejects malformed versions, revisions, options, values, environments and errors', () => {
  const job = request();
  for (const patch of [
    { version: 2 },
    { id: 0 },
    { inputRevision: -1 },
    { executionRevision: NaN },
    { environmentRevision: 0.5 },
    { environment: { version: 99 } },
    { options: { angleMode: 'x' } },
    {
      options: {
        ...job.options,
        programmer: { width: '32', signed: false, overflow: 'wrap' },
      },
    },
  ])
    expect(isCalculationRequest({ ...job, ...patch })).toBe(false);
  const response = runCalculation(job);
  if (response.status !== 'success') throw new Error('setup');
  for (const patch of [
    { version: 2 },
    { environment: { version: 99 } },
    {
      calculation: {
        ...response.calculation,
        value: { kind: 'number', value: 'NaN' },
      },
    },
    { status: 'error', error: { code: 'OTHER', range: { start: 0, end: 0 } } },
    {
      status: 'error',
      error: { code: 'E_DOMAIN', range: { start: 2, end: 1 } },
    },
  ])
    expect(isCalculationResponse({ ...response, ...patch })).toBe(false);
  for (const patch of [
    { id: 2 },
    { kind: 'store' as const },
    { environmentRevision: 3 },
    { executionRevision: 4 },
    { inputRevision: 5 },
    { calculation: { ...response.calculation, expression: 'other' } },
  ])
    expect(matchesCalculation({ ...response, ...patch }, job)).toBe(false);
  expect(
    isCalculationResponse({ ...response, kind: 'preview', status: 'preview' }),
  ).toBe(false);
});
