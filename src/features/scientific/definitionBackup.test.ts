import { expect, it, vi } from 'vitest';
import {
  createEnvironment,
  execute,
  parse,
  type Environment,
} from '../../engine';
import {
  DEFINITION_BACKUP_FORMAT,
  DefinitionBackupError,
  exportDefinitionBackup,
  MAX_DEFINITION_FILE_BYTES,
  parseDefinitionBackup,
  prepareDefinitionReplacement,
  validateDefinitionBackup,
} from './definitionBackup';
import { MAX_SCIENTIFIC_STORAGE_LENGTH } from './scientificPersistence';

function step(
  source: string,
  environment = createEnvironment(),
  bitwise = false,
): Environment {
  const result = execute(source, environment, { complex: 'on', bitwise });
  if (!result.ok) throw new Error(result.error.code);
  return result.value.environment;
}
function backup() {
  return {
    format: DEFINITION_BACKUP_FORMAT,
    version: 1,
    variables: { a: { kind: 'number', value: '-42' } },
    functions: {},
  };
}
function ast(source: string) {
  const result = parse(source, { bitwise: true });
  if (!result.ok) throw new Error(result.error.code);
  return result.value;
}
function fn(expression: unknown = ast('x+1')) {
  return { parameters: ['x'], expression };
}
it('roundtrips negative/large/exact values, complex numbers, lists and function AST references without history or settings', () => {
  let original = createEnvironment();
  for (const source of [
    'a=-12345678901234567890123456789012345678901234567890',
    'large=1e9999',
    'tiny=-1e-9999',
    'z=-2-3i',
    'xs=factor(360)',
    'f(x)=x+a',
    'g(x)=f(x)+large',
    'bits(x)=x<<1',
    'delayed(x)=1/0',
    'shl=2',
    'xor=3',
  ])
    original = step(source, original, source === 'bits(x)=x<<1');
  const before = structuredClone(original);
  const content = exportDefinitionBackup(original);
  const restored = parseDefinitionBackup(content);
  expect(restored.variables).toEqual(original.variables);
  expect(restored.functions).toEqual(original.functions);
  expect(Object.keys(JSON.parse(content)).sort()).toEqual([
    'format',
    'functions',
    'variables',
    'version',
  ]);
  for (const excluded of [
    'history',
    'settings',
    'onlineRates',
    'provider',
    'consent',
  ])
    expect(content).not.toContain(`"${excluded}"`);
  expect(original).toEqual(before);
  const current = step('77');
  const next = prepareDefinitionReplacement(restored, current);
  expect(next.environment.history).toBe(current.history);
  expect(next.environment.variables).toEqual(original.variables);
  expect(step('f(2)', next.environment).history[0]).toEqual(
    step('f(2)', original).history[0],
  );
});
it('exports expanded valid value strings in canonical serialized form without display rounding', () => {
  const original: Environment = {
    ...createEnvironment(),
    variables: {
      a: { kind: 'number', value: `-0.${'0'.repeat(49)}1` },
      z: { kind: 'complex', re: `1${'0'.repeat(30)}`, im: '-2' },
    },
  };
  expect(
    parseDefinitionBackup(exportDefinitionBackup(original)).variables,
  ).toEqual({
    a: { kind: 'number', value: '-1e-50' },
    z: { kind: 'complex', re: '1e+30', im: '-2' },
  });
});
it.each([
  null,
  [],
  {},
  { ...backup(), version: 2 },
  { ...backup(), format: 'foreign' },
  { ...backup(), history: [] },
  { ...backup(), settings: {} },
  { ...backup(), onlineRates: false },
  { ...backup(), variables: { sin: { kind: 'number', value: '1' } } },
  { ...backup(), variables: { ans: { kind: 'number', value: '1' } } },
  { ...backup(), variables: { 'a<script>': { kind: 'number', value: '1' } } },
  {
    ...backup(),
    variables: JSON.parse('{"__proto__":{"kind":"number","value":"1"}}'),
  },
  ...['NaN', 'Infinity', '1e10001', '1e-10001', 'x', '1'.repeat(10054)].map(
    (value) => ({ ...backup(), variables: { a: { kind: 'number', value } } }),
  ),
  { ...backup(), variables: { a: { kind: 'complex', re: '1', im: 'NaN' } } },
  {
    ...backup(),
    variables: { a: { kind: 'number', value: '1', foreign: true } },
  },
  {
    ...backup(),
    variables: {
      a: {
        kind: 'list',
        values: new Array(2049).fill({ kind: 'number', value: '1' }),
      },
    },
  },
  { ...backup(), functions: { a: fn() } },
  { ...backup(), functions: { f: { ...fn(), parameters: ['x', 'x'] } } },
  { ...backup(), functions: { f: { ...fn(), parameters: ['ans'] } } },
  { ...backup(), functions: { f: { ...fn(), parameters: [] } } },
  { ...backup(), functions: { f: { ...fn(), extra: true } } },
  ...[
    { kind: 'foreign', range: { start: 0, end: 1 } },
    { ...ast('x'), foreign: true },
    { ...ast('x'), range: { start: 0, end: 10001 } },
    { ...ast('x'), range: { start: 0.5, end: 1 } },
    { ...ast('x'), range: { start: 1, end: 0 } },
    { ...ast('x+1'), operator: 'eval' },
    ast('a=1'),
    ast('f(x)=x'),
  ].map((expression) => ({ ...backup(), functions: { f: fn(expression) } })),
  { ...backup(), functions: { f: fn(ast('g(x)')), g: fn(ast('f(x)')) } },
])(
  'rejects malformed, foreign, colliding or unbounded data (case %#)',
  (input) => {
    expect(() => validateDefinitionBackup(input)).toThrow(
      DefinitionBackupError,
    );
  },
);
it('rejects inherited fields, accessors, sparse/extended arrays, symbols and cyclic value/AST objects', () => {
  const getter = vi.fn(() => '1');
  const inherited = Object.create({ kind: 'number', value: '1' });
  const accessor = Object.defineProperty({ kind: 'number' }, 'value', {
    get: getter,
    enumerable: true,
  });
  const cyclicValue: { kind: string; values: unknown[] } = {
    kind: 'list',
    values: [],
  };
  cyclicValue.values.push(cyclicValue);
  const cyclicAst: {
    kind: string;
    range: { start: number; end: number };
    expression?: unknown;
  } = { kind: 'group', range: { start: 0, end: 1 } };
  cyclicAst.expression = cyclicAst;
  for (const value of [
    inherited,
    accessor,
    cyclicValue,
    { kind: 'list', values: new Array(1) },
    { kind: 'number', value: '1', [Symbol('extra')]: true },
    { kind: 'list', values: Object.assign([], { extra: 'x' }) },
  ])
    expect(() =>
      validateDefinitionBackup({ ...backup(), variables: { a: value } }),
    ).toThrow();
  expect(getter).not.toHaveBeenCalled();
  expect(() =>
    validateDefinitionBackup({ ...backup(), functions: { f: fn(cyclicAst) } }),
  ).toThrow();
  expect(() =>
    validateDefinitionBackup({
      ...backup(),
      functions: { f: Object.create(fn()) },
    }),
  ).toThrow();
});
it('retains all existing definition, parameter and depth limits', () => {
  let expression: unknown = ast('x');
  let value: unknown = { kind: 'number', value: '1' };
  for (let i = 0; i < 130; i++) {
    expression = { kind: 'group', range: { start: 0, end: 1 }, expression };
    value = { kind: 'list', values: [value] };
  }
  expect(() =>
    validateDefinitionBackup({ ...backup(), functions: { f: fn(expression) } }),
  ).toThrow();
  expect(() =>
    validateDefinitionBackup({ ...backup(), variables: { a: value } }),
  ).toThrow();
  expect(() =>
    validateDefinitionBackup({
      ...backup(),
      functions: {
        f: {
          ...fn(),
          parameters: Array.from({ length: 129 }, (_, i) => `p${i}`),
        },
      },
    }),
  ).toThrow();
  expect(() =>
    validateDefinitionBackup({
      ...backup(),
      variables: Object.fromEntries(
        Array.from({ length: 1001 }, (_, i) => [
          `v${i}`,
          { kind: 'number', value: '1' },
        ]),
      ),
    }),
  ).toThrow();
});
it('rejects malformed JSON and duplicate property names, including escaped aliases', () => {
  for (const content of [
    '{broken',
    '{"format":"x","format":"m8e-calc.definitions","version":1,"variables":{},"functions":{}}',
    '{"format":"m8e-calc.definitions","version":1,"variables":{"a":{"kind":"number","value":"1"},"\\u0061":{"kind":"number","value":"2"}},"functions":{}}',
  ])
    expect(() => parseDefinitionBackup(content)).toThrow();
});
it('enforces the inclusive UTF-8 file limit on import and export', () => {
  const content = JSON.stringify(backup());
  expect(
    parseDefinitionBackup(content.padEnd(MAX_DEFINITION_FILE_BYTES)),
  ).toEqual(backup());
  expect(() =>
    parseDefinitionBackup(content.padEnd(MAX_DEFINITION_FILE_BYTES + 1)),
  ).toThrow('tooLarge');
  expect(() =>
    parseDefinitionBackup(
      content +
        ' '.repeat(MAX_DEFINITION_FILE_BYTES - content.length - 1) +
        'é',
    ),
  ).toThrow('tooLarge');
  const environment = {
    ...createEnvironment(),
    variables: Object.fromEntries(
      Array.from({ length: 500 }, (_, i) => [
        `v${i}${'x'.repeat(9000)}`,
        { kind: 'number' as const, value: '1' },
      ]),
    ),
  };
  expect(() => exportDefinitionBackup(environment)).toThrow('tooLarge');
});
it('checks the complete storage envelope symmetrically including preserved history', () => {
  const expanded = { kind: 'number' as const, value: `0.${'0'.repeat(8999)}1` };
  const history = Array.from({ length: 100 }, () => ({
    kind: 'list' as const,
    values: Array.from({ length: 18 }, () => expanded),
  }));
  const current: Environment = { ...createEnvironment(), history };
  const input = {
    ...backup(),
    variables: Object.fromEntries(
      Array.from({ length: 100 }, (_, i) => [
        `v${i}${'x'.repeat(9000)}`,
        { kind: 'number', value: '1' },
      ]),
    ),
  };
  expect(
    JSON.stringify({ state: { environment: current }, version: 1 }).length,
  ).toBeLessThan(MAX_SCIENTIFIC_STORAGE_LENGTH);
  expect(() => prepareDefinitionReplacement(input, current)).toThrow(
    'storageLimit',
  );
  expect(() =>
    exportDefinitionBackup({
      ...current,
      variables: validateDefinitionBackup(input).variables,
    }),
  ).toThrow('storageLimit');
  expect(current.history).toBe(history);
});
