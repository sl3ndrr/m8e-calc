import { expect, it } from 'vitest';
import {
  createEnvironment,
  execute,
  type ValueFormatOptions,
} from '../../engine';
import {
  calculate,
  constantMatches,
  definitionSource,
  definitionDetails,
  displayResult,
  normalizeDegrees,
  normalizeEnvironment,
  preview,
  removeDefinition,
  resultLocale,
} from './model';
import { completionEntries } from './registry';
const options = { angleMode: 'deg', complex: 'off' } as const;
it.each([
  ['de', 'auto', true, '1234567.89', 'auto', 15, false, '1.234.567,89'],
  ['en', 'auto', true, '1234567.89', 'auto', 15, false, '1,234,567.89'],
  ['de', 'point', false, '-1234.567', 'fixed', 5, false, '-1234.6'],
  ['en', 'comma', true, '-1234.567', 'fixed', 5, false, '-1.234,6'],
  ['de', 'auto', true, '12345', 'sci', 3, false, '1,23e+4'],
  ['en', 'auto', true, '12345', 'eng', 3, false, '12.3e+3'],
  ['de', 'auto', true, '999999.9', 'eng', 6, false, '1e+6'],
  [
    'en',
    'comma',
    false,
    '1/7',
    'fixed',
    50,
    false,
    '0,14285714285714285714285714285714285714285714285714',
  ],
  ['de', 'auto', true, '-1/2', 'sci', 1, true, '-1/2'],
  ['en', 'auto', false, '2.5-3.75i', 'auto', 15, true, '2.5-3.75i'],
  ['de', 'auto', true, '-1234.5+2.75i', 'fixed', 15, false, '-1.234,5+2,75i'],
  ['de', 'auto', true, 'factor(12)', 'auto', 15, true, '[2, 2, 3]'],
  ['en', 'auto', false, 'factor(1)', 'sci', 1, false, '[]'],
  ['de', 'auto', false, '1e10000', 'sci', 50, false, '1e+10000'],
  ['en', 'comma', true, '-1e-10000', 'sci', 50, false, '-1e-10000'],
] as const)(
  'WP-08: %s/%s formats %s %s as %s/%s (fraction %s)',
  (
    locale,
    separator,
    grouping,
    source,
    notation,
    digits,
    fraction,
    expected,
  ) => {
    const result = calculate(source, createEnvironment(), {
      ...options,
      complex: 'on',
    });
    expect(result.ok).toBe(true);
    if (!result.ok || !result.calculation.value)
      throw new Error('Expected value');
    const value = result.calculation.value;
    const before = JSON.stringify(value);
    const format: ValueFormatOptions = {
      locale: resultLocale(locale, separator),
      grouping,
      notation,
      digits,
    };
    const displayed = displayResult(value, format, fraction);
    expect(displayed.text).toBe(expected);
    expect(displayed.latex).toBe(
      displayResult(
        value,
        { ...format, locale: 'en', grouping: false },
        fraction,
      ).latex,
    );
    expect(JSON.stringify(value)).toBe(before);
    expect(result.calculation.expression).toBe(source);
  },
);

it('WP-08 keeps argument commas and decimal points in formula source, and definitions have no numeric result', () => {
  const result = calculate('min(1.5, 2.5)', createEnvironment(), options);
  if (!result.ok || !result.calculation.value)
    throw new Error('Expected value');
  expect(result.calculation.expression).toBe('min(1.5, 2.5)');
  expect(
    displayResult(result.calculation.value, { locale: 'de' }, false).text,
  ).toBe('1,5');
  expect(result.calculation.expressionLatex).toContain('1.5');
  expect(result.calculation.expressionLatex).toContain('2.5');
  const definition = calculate(
    'f(x)=min(x, 1.5)',
    createEnvironment(),
    options,
  );
  expect(definition.ok).toBe(true);
  if (definition.ok) expect(definition.calculation.value).toBeNull();
});
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

it.each([
  '-1',
  '5000000000',
  '4294967295',
  '4294967296',
  '4294967297',
  '18446744073709551615',
  '18446744073709551616',
  '18446744073709551617',
  '-18446744073709551617',
  '1e50',
  '-1e50',
  '1e-50',
  '-1e-50',
  '0.125',
  '-123.456',
  '1/7',
  '2+3i',
  '-2-3i',
  '0+0i',
  '1e50+1e-50i',
])(
  'preserves unchanged %s across editor contexts and presentation settings',
  (input) => {
    const initial = execute(`v=${input}`, undefined, { complex: 'on' });
    if (!initial.ok) throw new Error(initial.error.code);
    const env = normalizeEnvironment(
      JSON.parse(JSON.stringify(initial.value.environment)),
    );
    const before = JSON.stringify(env);
    const source = definitionSource(env, 'v');
    if (source === null) throw new Error('expected editable scalar');
    for (const locale of ['de', 'en'])
      for (const grouping of [false, true])
        for (const digits of [1, 15, 50])
          for (const notation of ['auto', 'fixed', 'sci', 'eng'] as const)
            expect(
              definitionDetails(env, 'v', {
                locale,
                grouping,
                digits,
                notation,
                complexForm: 'polar',
              }).source,
            ).toBe(source);
    for (const width of [8, 16, 32, 64] as const)
      for (const signed of [false, true])
        for (const overflow of ['wrap', 'error'] as const)
          for (const angleMode of ['deg', 'rad', 'grad'] as const) {
            const result = calculate(
              source,
              env,
              {
                angleMode,
                complex: 'off',
                bitwise: true,
                programmer: { width, signed, overflow },
              },
              'v',
            );
            expect(result.ok).toBe(true);
            if (!result.ok) throw new Error(result.error.code);
            expect(result.environment.variables).toEqual(env.variables);
            expect(result.environment.history[0]).toEqual(env.variables.v);
            expect(result.environment.history.slice(1)).toEqual(env.history);
          }
    expect(JSON.stringify(env)).toBe(before);
  },
);

it('keeps all 50 digits when the displayed label is rounded', () => {
  const initial = execute('v=1/7');
  if (!initial.ok) throw new Error('setup');
  const details = definitionDetails(initial.value.environment, 'v', {
    digits: 3,
    locale: 'de',
    grouping: true,
  });
  expect(details.text).toBe('v = 0,143');
  expect(details.source).toBe(
    'v = 0.14285714285714285714285714285714285714285714285714',
  );
});

it('confirms delayed scientific/programmer functions without running or replacing their ASTs', () => {
  for (const source of [
    'f(x)=sin(x)+v',
    'f(x)=1/0+missing(x)',
    'f(x)=x<<1',
    'f(shl)=shl+1',
  ]) {
    const initial = execute(source, undefined, {
      bitwise: !source.includes('shl'),
    });
    if (!initial.ok) throw new Error(initial.error.code);
    const env = initial.value.environment;
    const canonical = definitionSource(env, 'f');
    if (!canonical) throw new Error('source');
    const before = JSON.stringify(env);
    const result = calculate(
      canonical,
      env,
      { ...options, bitwise: true },
      'f',
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.code);
    expect(result.environment).toBe(env);
    expect(result.calculation.value).toBeNull();
    expect(JSON.stringify(env)).toBe(before);
  }
});

it('keeps active-context protection for changed editor text', () => {
  const initial = execute('shl=2');
  if (!initial.ok) throw new Error('setup');
  const env = initial.value.environment;
  const result = calculate(
    'shl = 3',
    env,
    { ...options, bitwise: true },
    'shl',
  );
  expect(result).toMatchObject({
    ok: false,
    error: { code: 'E_RESERVED_NAME' },
  });
  expect(env.variables.shl).toEqual({ kind: 'number', value: '2' });
});

it('shows stored lists but supplies no executable edit source', () => {
  const initial = execute('xs=factor(12)');
  if (!initial.ok) throw new Error('setup');
  expect(definitionDetails(initial.value.environment, 'xs')).toEqual({
    text: 'xs = [2, 2, 3]',
    source: null,
  });
});
