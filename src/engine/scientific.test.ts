import { describe, expect, it } from 'vitest';
import Decimal from 'decimal.js';
import fc from 'fast-check';
import {
  constantRegistry,
  createEnvironment,
  evaluateString,
  execute,
  formatValue,
  functionRegistry,
  integrate,
  numberValue,
  parse,
  print,
  toFraction,
  toLatex,
} from './index.ts';
import type { Environment, EvaluationContext, Value } from './index.ts';
import { scientificReferenceCases } from './scientificReferenceCases.ts';
import { codata2022 } from './testData/codata2022.ts';
const Ref = Decimal.clone({ precision: 80 });
function take(src: string, ctx: EvaluationContext = {}): Value {
  const r = evaluateString(src, ctx);
  if (!r.ok) throw new Error(`${src}: ${r.error.code}`);
  return r.value;
}
function real(src: string, ctx: EvaluationContext = {}): Decimal {
  const v = take(src, ctx);
  if (v.kind !== 'number') throw new Error(src);
  return v.value;
}
function near(actual: Decimal, expected: string, tolerance: string): void {
  const target = new Ref(expected);
  expect(
    new Ref(actual)
      .sub(target)
      .abs()
      .lte(Ref.max(target.abs(), 1).mul(tolerance)),
    `${actual} ≈ ${target}`,
  ).toBe(true);
}
function step(src: string, environment: Environment): Environment {
  const r = execute(src, environment);
  if (!r.ok) throw new Error(`${src}: ${r.error.code}`);
  return r.value.environment;
}
describe('scientific independent references', () => {
  it('has at least 150 additional cases', () =>
    expect(scientificReferenceCases.length).toBeGreaterThanOrEqual(150));
  it.each(scientificReferenceCases)('$src', (row) => {
    const value = take(row.src, 'complex' in row ? { complex: 'on' } : {});
    if ('expected' in row) {
      expect(value.kind).toBe('number');
      if (value.kind === 'number')
        near(value.value, row.expected, row.tolerance);
    } else {
      expect(value.kind).toBe('complex');
      if (value.kind === 'complex') {
        near(value.re, row.re, row.tolerance);
        near(value.im, row.im, row.tolerance);
      }
    }
  });
});
describe('registry, domains and constants', () => {
  it('documents every registry entry in de and en', () => {
    for (const name of [
      'sinh',
      'cosh',
      'tanh',
      'asinh',
      'acosh',
      'atanh',
      'sec',
      'csc',
      'cot',
      'deg2rad',
      'rad2deg',
      'factorial',
      'gamma',
      'nCr',
      'nPr',
      'gcd',
      'lcm',
      'isPrime',
      'factor',
      'frac',
      'round',
      'total',
      'mean',
      'median',
      'variance',
      'stdev',
      'stdevp',
      'min',
      'max',
      'count',
      'sum',
      'prod',
      'integral',
      'deriv',
      'arg',
      'conj',
      're',
      'im',
    ]) {
      const d = functionRegistry[name];
      expect(d?.name).toBe(name);
      expect(d?.doc.de.length).toBeGreaterThan(10);
      expect(d?.doc.en.length).toBeGreaterThan(10);
    }
  });
  it.each(codata2022)('verifies $id against NIST 2022', (row) => {
    const c = constantRegistry[row.id];
    expect(c).toBeDefined();
    expect(c?.exact).toBe(row.exact);
    if ('prefix' in row && row.prefix)
      expect(new Ref(c?.value ?? 0).toExponential().startsWith(row.value)).toBe(
        true,
      );
    else expect(new Ref(c?.value ?? 0).eq(row.value)).toBe(true);
    expect(c?.name.de).toBeTruthy();
    expect(c?.name.en).toBeTruthy();
    expect(c?.source).toContain('nist.gov');
  });
  it('preserves SI-exact decimal products and aliases', () => {
    expect(real('NA*kB-R').isZero()).toBe(true);
    expect(real('qe').toString()).toBe('1.602176634e-19');
    expect(real('m_e-me+k_B-kB+N_A-NA+g_n-gn').isZero()).toBe(true);
  });
  it.each([
    ['sqrt(-1)', 'E_DOMAIN'],
    ['ln(-1)', 'E_DOMAIN'],
    ['i', 'E_DOMAIN'],
    ['j', 'E_DOMAIN'],
    ['gamma(0)', 'E_DOMAIN'],
    ['gamma(-2)', 'E_DOMAIN'],
    ['gamma(1001)', 'E_RESOURCE_LIMIT'],
    ['acosh(0)', 'E_DOMAIN'],
    ['atanh(1)', 'E_DOMAIN'],
    ['round(1,1.5)', 'E_DOMAIN'],
    ['factor(0)', 'E_DOMAIN'],
    ['factor(1000000000001)', 'E_RESOURCE_LIMIT'],
    ['isPrime(1000000000001)', 'E_RESOURCE_LIMIT'],
    ['nCr(3,4)', 'E_DOMAIN'],
    ['variance(1)', 'E_ARGUMENT_COUNT'],
    ['mean()', 'E_ARGUMENT_COUNT'],
    ['sum(1,pi,1,2)', 'E_RESERVED_NAME'],
    ['sum(1,2,1,2)', 'E_TYPE'],
    ['sum(k,k,0,10000)', 'E_RESOURCE_LIMIT'],
    ['integral(1/x,x,-1,1)', 'E_DIVISION_BY_ZERO'],
    ['arg(0)', 'E_DOMAIN'],
    ['a=5', 'E_TYPE'],
  ])('%s → %s', (src, code) =>
    expect(evaluateString(src)).toMatchObject({ ok: false, error: { code } }),
  );
  it('factors into an ordered list', () => {
    const v = take('factor(360)');
    expect(v.kind).toBe('list');
    if (v.kind === 'list')
      expect(
        v.values.map((x) => (x.kind === 'number' ? x.value.toString() : '')),
      ).toEqual(['2', '2', '2', '3', '3', '5']);
    expect(take('factor(1)')).toEqual({ kind: 'list', values: [] });
  });
  it.each([
    ['gcd(-48,18)', '6'],
    ['gcd(0,0)', '0'],
    ['lcm(-6,8)', '24'],
    ['lcm(0,0)', '0'],
    ['isPrime(1)', '0'],
    ['isPrime(999983)', '1'],
    ['isPrime(999966000289)', '0'],
    ['total()', '0'],
    ['count()', '0'],
    ['sum(k,k,2,1)', '0'],
    ['prod(k,k,2,1)', '1'],
    ['sum(sum(k,k,1,2)+k,k,1,2)', '9'],
    ['sum(k,k,1,3)+k', '16'],
    ['re(3)', '3'],
    ['im(3)', '0'],
    ['sec(0)', '1'],
    ['csc(30)', '2'],
    ['cot(45)', '1'],
  ])('%s', (src, expected) =>
    expect(
      real(src, {
        angleMode: 'deg',
        variables: { k: { kind: 'number', value: new Ref(10) } },
      }).toString(),
    ).toBe(expected),
  );
  it('keeps sum/prod reserved as binders even with custom registry', () =>
    expect(
      real('sum(k,k,1,3)', {
        functions: {
          sum: {
            name: 'sum',
            arity: 4,
            category: 'test',
            doc: { de: 'test', en: 'test' },
            impl: () => numberValue(99),
          },
        },
      }).toString(),
    ).toBe('6'));
});
describe('numerical diagnostics', () => {
  it('returns an error estimate and reversed limits', () => {
    const r = integrate((x) => numberValue(x.mul(x)), new Ref(0), new Ref(1));
    expect(r.ok).toBe(true);
    if (r.ok) {
      near(r.value.value, '0.333333333333333333333333333333', '1e-12');
      expect(r.value.errorEstimate.gte(0)).toBe(true);
      expect(r.value.evaluations).toBe(15);
    }
    near(
      real('integral(x^2,x,1,0)'),
      '-0.3333333333333333333333333333',
      '1e-12',
    );
  });
  it('reports nonconvergence with diagnostics', () => {
    expect(
      evaluateString('integral(exp(x),x,0,10)', {
        numerical: {
          maxIntervals: 1,
          absoluteTolerance: '1e-30',
          relativeTolerance: '1e-30',
        },
      }),
    ).toMatchObject({
      ok: false,
      error: {
        code: 'E_CONVERGENCE',
        details: { evaluations: 15, intervals: 1 },
      },
    });
    expect(evaluateString('deriv(abs(x),x,0)')).toMatchObject({
      ok: false,
      error: { code: 'E_CONVERGENCE' },
    });
  });
  it('rejects invalid tolerance options', () =>
    expect(
      evaluateString('integral(x,x,0,1)', {
        numerical: { relativeTolerance: '-1' },
      }),
    ).toMatchObject({ ok: false, error: { code: 'E_DOMAIN' } }));
});
describe('environment and expression roundtrips', () => {
  it('assigns, late binds functions, maintains ans and JSON roundtrips', () => {
    const initial = createEnvironment();
    let env = step('a=5', initial);
    env = step('f(x)=x^2+a', env);
    env = step('g(x,y)=f(x)+y', env);
    expect(real('g(3,2)', { environment: env }).toString()).toBe('16');
    env = step('a=7', env);
    env = JSON.parse(JSON.stringify(env)) as Environment;
    expect(real('f(3)', { environment: env }).toString()).toBe('16');
    expect(real('ans+ans1+ans2', { environment: env }).toString()).toBe('19');
    expect(initial.variables).toEqual({});
    expect(initial.history).toEqual([]);
  });
  it('uses lexical parameter and binder scopes', () => {
    let env = step('x=10', createEnvironment());
    env = step('f(y)=x+y', env);
    env = step('g(x)=f(1)', env);
    expect(real('g(2)', { environment: env }).toString()).toBe('11');
    env = step('t(x)=sum(x+k,k,1,3)', env);
    expect(real('t(2)', { environment: env }).toString()).toBe('12');
  });
  it.each([
    'pi=3',
    'c=4',
    'sin(x)=x',
    'f(pi)=pi',
    'ans1=2',
    '__proto__=2',
    'f(x,x)=x',
  ])('rejects reserved/duplicate names %s', (src) =>
    expect(execute(src)).toMatchObject({ ok: false }),
  );
  it('rejects cycles and malformed environments without mutation', () => {
    const env = step('f(x)=g(x)', createEnvironment());
    expect(execute('g(x)=f(x)', env)).toMatchObject({
      ok: false,
      error: { code: 'E_CYCLE' },
    });
    expect(execute('a=a+1')).toMatchObject({
      ok: false,
      error: { code: 'E_UNKNOWN_VARIABLE' },
    });
    expect(
      evaluateString('1', {
        environment: { version: 2 } as unknown as Environment,
      }),
    ).toMatchObject({ ok: false, error: { code: 'E_ENVIRONMENT' } });
  });
  it('limits history and preserves complex/list values in JSON', () => {
    let env = createEnvironment();
    for (let n = 0; n < 110; n++) env = step(String(n), env);
    expect(env.history).toHaveLength(100);
    const r = execute('z=3+4i', env, { complex: 'on' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const restored = JSON.parse(
        JSON.stringify(r.value.environment),
      ) as Environment;
      expect(
        formatValue(take('z', { complex: 'on', environment: restored })),
      ).toBe('3+4i');
    }
  });
  it.each([
    'a=5',
    'f(x)=x^2+a',
    'f(x,y)=x+y',
    'sum(k,k,1,4)',
    'integral(x^2,x,0,1)',
  ])('parse/print %s', (src) => {
    const p = parse(src);
    expect(p.ok).toBe(true);
    if (p.ok) {
      const q = parse(print(p.value));
      expect(q.ok).toBe(true);
      if (q.ok) expect(print(q.value)).toBe(print(p.value));
    }
  });
});
describe('output and scientific properties', () => {
  it('formats rectangular and polar complex values', () => {
    const z = take('3+4i', { complex: 'on' });
    expect(formatValue(z)).toBe('3+4i');
    expect(formatValue(z, { complexForm: 'polar', angleMode: 'deg' })).toBe(
      '5∠53.130102354156',
    );
  });
  it('exports fractions and semantic LaTeX', () => {
    expect(toFraction(take('pi'), 1000)).toEqual({
      ok: true,
      value: { numerator: '355', denominator: '113' },
    });
    expect(toFraction(take('-0.125'), 100)).toEqual({
      ok: true,
      value: { numerator: '-1', denominator: '8' },
    });
    expect(toFraction(take('i', { complex: 'on' }))).toMatchObject({
      ok: false,
      error: { code: 'E_TYPE' },
    });
    const ast = parse('integral(x^2,x,0,1)');
    if (!ast.ok) throw new Error('parse');
    expect(toLatex(ast.value)).toBe('\\int_{0}^{1} {x}^{2}\\,\\mathrm{d}x');
    expect(toLatex(take('3+4i', { complex: 'on' }))).toBe('3+4\\mathrm{i}');
  });
  it('fuzzes arbitrary scientific expressions without throwing', () =>
    fc.assert(
      fc.property(fc.string({ maxLength: 300 }), (src) => {
        expect(() => evaluateString(src, { complex: 'on' })).not.toThrow();
        expect(() => execute(src)).not.toThrow();
      }),
      { seed: 71821, numRuns: 500 },
    ));
  it('checks combinatorial, factor and complex identities', () =>
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10000 }), (n) => {
        const v = take(`factor(${n})`);
        if (v.kind !== 'list') throw new Error('list');
        const product = v.values.reduce(
          (a, b) => (b.kind === 'number' ? a.mul(b.value) : a),
          new Ref(1),
        );
        expect(product.eq(n)).toBe(true);
        const z = take(`(${n}+i)*conj(${n}+i)`, { complex: 'on' });
        if (z.kind !== 'complex') throw new Error('complex');
        expect(z.re.eq(n * n + 1) && z.im.isZero()).toBe(true);
      }),
      { seed: 717, numRuns: 100 },
    ));
  it('uses best bounded continued-fraction approximants', () =>
    fc.assert(
      fc.property(
        fc.integer({ min: -1000, max: 1000 }),
        fc.integer({ min: 1, max: 100 }),
        (p, q) => {
          const r = toFraction(take(`${p}/${q}`), q);
          expect(r.ok).toBe(true);
          if (r.ok)
            expect(
              new Ref(r.value.numerator)
                .mul(q)
                .eq(new Ref(r.value.denominator).mul(p)),
            ).toBe(true);
        },
      ),
      { seed: 889, numRuns: 100 },
    ));
});
