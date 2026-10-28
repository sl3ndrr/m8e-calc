import { expect, it } from 'vitest';
import { createEnvironment, execute } from '../../engine';
import {
  calculate,
  constantMatches,
  definitionSource,
  displayResult,
  normalizeDegrees,
  normalizeEnvironment,
  preview,
  removeDefinition,
  resultLocale,
} from './model';
import { completionEntries } from './registry';
const options = { angleMode: 'deg', complex: 'off' } as const;
it('evaluates degrees, variables and calculus through AP7', () => {
  let env = createEnvironment();
  for (const [expression, expected] of [
    ['sin(30°)', '0.5'],
    ['a = 5', '5'],
    ['a^2', '25'],
    ['integral(x^2, x, 0, 3)', '9'],
  ]) {
    const result = calculate(expression ?? '', env, options);
    expect(result.ok).toBe(true);
    if (result.ok) {
      env = result.environment;
      expect(
        result.calculation.value &&
          displayResult(result.calculation.value, { digits: 15 }, false).text,
      ).toBe(expected);
    }
  }
});
it('keeps previews side effect free and suppresses incomplete/invalid statements', () => {
  const env = createEnvironment(),
    snapshot = JSON.stringify(env);
  expect(preview('1+2', env, options)?.value?.kind).toBe('number');
  for (const s of ['sin(', '2/0', 'a=5', 'f(x)=x^2', 'unknown'])
    expect(preview(s, env, options)).toBeNull();
  expect(JSON.stringify(env)).toBe(snapshot);
});
it('maps errors to the original degree source, including EOF', () => {
  for (const angleMode of ['deg', 'rad', 'grad'] as const) {
    const r = calculate('30° + unknown', createEnvironment(), {
      ...options,
      angleMode,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.range).toEqual({ start: 6, end: 13 });
    expect(normalizeDegrees('30°', angleMode).positions.at(-1)).toBe(3);
  }
  const r = calculate('sin(', createEnvironment(), options);
  if (!r.ok) expect(r.error.range).toEqual({ start: 4, end: 4 });
});
it('converts explicit degrees in rad/grad modes', () => {
  for (const angleMode of ['rad', 'grad'] as const) {
    const r = calculate('sin(30°)', createEnvironment(), {
      ...options,
      angleMode,
    });
    expect(r.ok).toBe(true);
    if (r.ok && r.calculation.value)
      expect(
        displayResult(r.calculation.value, { digits: 15 }, false).text,
      ).toBe('0.5');
  }
});
it('formats scientific/engineering/fraction and supports complex results', () => {
  const r = calculate('1/2', createEnvironment(), options);
  if (r.ok && r.calculation.value) {
    expect(displayResult(r.calculation.value, {}, true)).toEqual({
      text: '1/2',
      latex: '\\frac{1}{2}',
    });
    expect(
      displayResult(r.calculation.value, { locale: 'de' }, false).text,
    ).toBe('0,5');
  }
  const c = calculate('sqrt(-1)', createEnvironment(), {
    ...options,
    complex: 'on',
  });
  expect(c.ok).toBe(true);
  const n = calculate('12345', createEnvironment(), options);
  if (n.ok && n.calculation.value) {
    expect(
      displayResult(n.calculation.value, { notation: 'sci', digits: 3 }, false)
        .text,
    ).toBe('1.23e+4');
    expect(
      displayResult(n.calculation.value, { notation: 'eng', digits: 3 }, false)
        .text,
    ).toBe('12.3e+3');
  }
});
it('validates persisted environments and edits/deletes definitions', () => {
  const r = execute('a=5');
  if (!r.ok) throw Error('setup');
  const f = execute('f(x)=x^2+a', r.value.environment);
  if (!f.ok) throw Error('setup');
  const env = normalizeEnvironment(
    JSON.parse(JSON.stringify(f.value.environment)),
  );
  expect(definitionSource(env, 'a')).toBe('a = 5');
  expect(definitionSource(env, 'f')).toContain('f(x) =');
  expect(removeDefinition(env, 'a').variables).toEqual({});
  expect(env.variables.a).toBeDefined();
  for (const invalid of [
    null,
    {},
    { version: 99 },
    {
      version: 1,
      variables: { a: { kind: 'number', value: 'bad' } },
      functions: {},
      history: [],
    },
  ])
    expect(normalizeEnvironment(invalid)).toEqual(createEnvironment());
});
it('reads definition labels without executing names in a programmer word context', () => {
  const first = execute('v=18446744073709551615');
  if (!first.ok) throw new Error('setup');
  const result = execute('shl=2', first.value.environment);
  if (!result.ok) throw new Error('setup');
  const env = normalizeEnvironment(
    JSON.parse(JSON.stringify(result.value.environment)),
  );
  const before = JSON.stringify(env);
  expect(definitionSource(env, 'shl')).toBe('shl = 2');
  expect(definitionSource(env, 'v')).toBe('v = 18446744073709551615');
  expect(JSON.stringify(env)).toBe(before);
});
it('filters registry metadata and exposes bilingual completion signatures', () => {
  expect(constantMatches('pi', 'Kreiszahl', 'π', 'π', 'math')).toBe(true);
  expect(
    constantMatches('c', 'Lichtgeschwindigkeit', 'c', 'licht', 'physics'),
  ).toBe(true);
  expect(constantMatches('c', 'Light', 'c', '', 'math')).toBe(false);
  for (const locale of ['de', 'en'] as const) {
    const entries = completionEntries(locale);
    expect(entries.find((e) => e.name === 'integral')?.signature).toBe(
      'integral(expr, x, a, b)',
    );
    expect(entries.every((e) => e.description.length > 0)).toBe(true);
  }
  expect(resultLocale('de', 'point')).toBe('en');
  expect(resultLocale('en', 'comma')).toBe('de');
});
