import { describe, expect, it } from 'vitest';
import {
  createEnvironment,
  evaluateString,
  execute,
  formatValue,
  parse,
  restoreEnvironment,
  type Environment,
  type EvaluationContext,
} from './index.ts';

function step(
  source: string,
  environment = createEnvironment(),
  ctx: EvaluationContext = {},
) {
  const result = execute(source, environment, ctx);
  if (!result.ok) throw new Error(`${source}: ${result.error.code}`);
  return result.value.environment;
}
function body(source: string) {
  const parsed = parse(source, { bitwise: true });
  if (!parsed.ok) throw new Error('setup');
  return parsed.value;
}

describe('structural environment restoration (WP-01)', () => {
  it('preserves scientific names, all value kinds and the exact ans history', () => {
    let env = createEnvironment();
    for (const source of [
      'v=123',
      'shl=2',
      'xor=3',
      'z=2+3i',
      'xs=factor(360)',
      'f(x)=x+v',
    ])
      env = step(source, env, { complex: 'on' });
    const raw: unknown = JSON.parse(JSON.stringify(env));
    const restored = restoreEnvironment(raw);
    expect(restored).toEqual({ ok: true, value: env });
    if (!restored.ok) throw new Error('restore');
    const next = step('f(shl)+xor', restored.value);
    expect(next.variables).toEqual(env.variables);
    expect(next.functions).toEqual(env.functions);
    expect(next.history.slice(1)).toEqual(env.history);
    expect(next.history[0]).toEqual({ kind: 'number', value: '128' });
    const ans = evaluateString('ans2', { environment: next, complex: 'on' });
    expect(ans.ok && formatValue(ans.value)).toBe('[2, 2, 2, 3, 3, 5]');
    expect(raw).toEqual(env);
  });

  it('accepts delayed programmer bodies and never executes old definitions or narrows values', () => {
    let env = step('v=18446744073709551615');
    env = step('bits(x)=x<<1', env, { bitwise: true });
    env = step('bad(x)=1/0+missing(x)', env);
    const snapshot = JSON.stringify(env);
    expect(restoreEnvironment(JSON.parse(snapshot))).toEqual({
      ok: true,
      value: env,
    });
    expect(JSON.stringify(env)).toBe(snapshot);
    expect(step('bits(2)', env, { bitwise: true }).history[0]).toEqual({
      kind: 'number',
      value: '4',
    });
  });

  it.each(['shl=2', 'xor(x)=x+1', 'f(xor)=xor+1'])(
    'keeps %s intact when the active context conflicts',
    (source) => {
      const env = step(source, step('v=123'));
      const before = JSON.stringify(env);
      for (const result of [
        execute('1+1', env, { bitwise: true }),
        evaluateString('1+1', { environment: env, bitwise: true }),
      ])
        expect(result).toMatchObject({
          ok: false,
          error: { code: 'E_RESERVED_NAME' },
        });
      expect(JSON.stringify(env)).toBe(before);
      expect(step('v+1', env).history[0]).toEqual({
        kind: 'number',
        value: '124',
      });
      expect(restoreEnvironment(env).ok).toBe(true);
    },
  );

  it('rejects malformed names, values, ASTs, ranges and resource violations', () => {
    const env = createEnvironment();
    const fn = (expression: unknown) => ({
      ...env,
      functions: { f: { parameters: ['x'], expression } },
    });
    const value = (v: unknown) => ({ ...env, variables: { v } });
    let deep: unknown = { kind: 'number', value: '1' };
    for (let i = 0; i < 130; i++) deep = { kind: 'list', values: [deep] };
    const cyclic: { kind: 'list'; values: unknown[] } = {
      kind: 'list',
      values: [],
    };
    cyclic.values.push(cyclic);
    const cyclicAst = {
      kind: 'group',
      range: { start: 0, end: 1 },
      expression: {},
    };
    cyclicAst.expression = cyclicAst;
    for (const invalid of [
      null,
      {},
      { ...env, version: 99 },
      { ...env, variables: [] },
      { ...env, variables: { ans: { kind: 'number', value: '1' } } },
      {
        ...env,
        variables: { ['x'.repeat(10001)]: { kind: 'number', value: '1' } },
      },
      value({ kind: 'number', value: '9'.repeat(20000) }),
      value({ kind: 'complex', re: '1', im: 'NaN' }),
      value({ kind: 'number', value: '1e10001' }),
      value(deep),
      value(cyclic),
      value({
        kind: 'list',
        values: Array(2048).fill({ kind: 'number', value: '1' }),
      }),
      fn(cyclicAst),
      fn({ ...body('f(x)'), nameRange: { start: -1, end: 1 } }),
      fn({ ...body('x+1'), operatorRange: { start: 2, end: 1 } }),
      fn({ ...body('1'), range: { start: 0, end: 10001 } }),
      fn(body('a=1')),
      { ...env, history: Array(101).fill({ kind: 'number', value: '1' }) },
      {
        ...env,
        variables: Object.fromEntries(
          Array.from({ length: 1001 }, (_, i) => [
            `v${i}`,
            { kind: 'number', value: '1' },
          ]),
        ),
      },
    ])
      expect(
        restoreEnvironment(invalid),
        'malformed persisted environment',
      ).toMatchObject({ ok: false, error: { code: 'E_ENVIRONMENT' } });
  });

  it('retains expanded numbers at the existing exponent boundaries', () => {
    for (const value of [
      '1' + '0'.repeat(10000),
      '-0.' + '0'.repeat(9999) + '1',
    ]) {
      const env = {
        ...createEnvironment(),
        variables: { v: { kind: 'number' as const, value } },
      };
      expect(restoreEnvironment(env)).toEqual({ ok: true, value: env });
    }
  });

  it('rejects direct and indirect function cycles without evaluating bodies', () => {
    const env: Environment = {
      ...createEnvironment(),
      functions: {
        f: { parameters: ['x'], expression: body('g(x)') },
        g: { parameters: ['x'], expression: body('f(x)') },
      },
    };
    expect(restoreEnvironment(env)).toMatchObject({
      ok: false,
      error: { code: 'E_CYCLE' },
    });
    expect(
      restoreEnvironment({
        ...env,
        functions: { f: { parameters: ['x'], expression: body('f(x)') } },
      }),
    ).toMatchObject({ ok: false, error: { code: 'E_CYCLE' } });
  });
});
