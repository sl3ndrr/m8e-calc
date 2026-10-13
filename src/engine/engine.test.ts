import { describe, expect, it } from 'vitest';
import Decimal from 'decimal.js';
import {
  evaluate,
  evaluateString,
  functionRegistry,
  numberValue,
  parse,
  print,
} from './index.ts';
import type { Ast, EvaluationContext, Value } from './index.ts';
import {
  angleCases,
  arithmeticCases,
  errorCases,
  inverseCases,
  percentCases,
} from './engineCases.ts';
import { referenceCases } from './referenceCases.ts';

const tables = [
  ...arithmeticCases,
  ...percentCases,
  ...angleCases,
  ...inverseCases,
];
const Reference = Decimal.clone({ precision: 80 });

function value(src: string, ctx?: EvaluationContext): Decimal {
  const result = evaluateString(src, ctx);
  expect(result.ok, src).toBe(true);
  if (!result.ok || result.value.kind !== 'number') throw new Error(src);
  return result.value.value;
}

function input(src: string): Value {
  const result = numberValue(src);
  if (!result.ok) throw new Error(src);
  return result.value;
}

describe('engine contract tables', () => {
  it('has at least 300 named table cases before property tests', () => {
    expect(
      tables.length + errorCases.length + referenceCases.length,
    ).toBeGreaterThanOrEqual(300);
  });
  it.each(tables)('$src → $expected ($ctx)', ({ src, expected, ctx }) => {
    expect(value(src, ctx).toString()).toBe(new Decimal(expected).toString());
  });
  it.each(errorCases)(
    '$src → $code [$start,$end)',
    ({ src, code, start, end, ctx }) => {
      expect(evaluateString(src, ctx)).toEqual({
        ok: false,
        error: { code, range: { start, end } },
      });
    },
  );
  it.each(referenceCases)(
    '$src has ≥45 reference digits ($ctx)',
    ({ src, expected, ctx }) => {
      const actual = new Reference(value(src, ctx));
      const reference = new Reference(expected);
      const tolerance = Reference.max(reference.abs(), '1e-100').mul('1e-45');
      expect(
        actual.sub(reference).abs().lte(tolerance),
        `${src}: ${actual}`,
      ).toBe(true);
    },
  );
});

describe('public AST and context', () => {
  it('exposes a stable binary/power/unary/group AST with original ranges', () => {
    const result = parse(' −2^2 + (3) ');
    expect(result).toMatchObject({
      ok: true,
      value: {
        kind: 'binary',
        operator: '+',
        implicit: false,
        range: { start: 1, end: 11 },
        operatorRange: { start: 6, end: 7 },
        left: {
          kind: 'unary',
          operator: '-',
          operatorRange: { start: 1, end: 2 },
          operand: { kind: 'binary', operator: '^' },
        },
        right: {
          kind: 'group',
          range: { start: 8, end: 11 },
          expression: { kind: 'number', literal: '3' },
        },
      },
    });
  });
  it('marks an implicit product at the right term', () => {
    expect(parse('2 π')).toMatchObject({
      ok: true,
      value: {
        kind: 'binary',
        operator: '*',
        implicit: true,
        operatorRange: { start: 2, end: 2 },
      },
    });
  });
  it('uses variables, constants and ans without mutation', () => {
    const ctx = Object.freeze({
      variables: Object.freeze({ x: input('6'), pi: input('1') }),
      ans: input('4'),
    });
    expect(value('1/2x+ans', ctx).toString()).toBe('7');
    expect(value('2π', ctx).toSignificantDigits(15).toString()).toBe(
      '6.28318530717959',
    );
    expect(value('pi', ctx).toSignificantDigits(15).toString()).toBe(
      '3.14159265358979',
    );
    expect(value('e').toSignificantDigits(15).toString()).toBe(
      '2.71828182845905',
    );
    expect(ctx.ans).toEqual(input('4'));
  });
  it('ignores inherited variables and function names', () => {
    const variables: Record<string, Value> = Object.create({ x: input('9') });
    expect(evaluateString('x', { variables })).toMatchObject({
      ok: false,
      error: { code: 'E_UNKNOWN_VARIABLE' },
    });
  });
  it('evaluates a parsed tree repeatedly with independent contexts', () => {
    const ast = parse('x^2');
    if (!ast.ok) throw new Error('parse');
    const before = JSON.stringify(ast.value);
    for (const x of ['2', '3', '-4']) {
      expect(evaluate(ast.value, { variables: { x: input(x) } })).toEqual({
        ok: true,
        value: input(String(Number(x) ** 2)),
      });
    }
    expect(JSON.stringify(ast.value)).toBe(before);
  });
  it('rounds literals and context inputs to 50 significant digits', () => {
    const literal = '1.234567890123456789012345678901234567890123456789012345';
    expect(value(literal).toString()).toBe(
      '1.234567890123456789012345678901234567890123456789',
    );
    expect(
      value('x', {
        variables: { x: { kind: 'number', value: new Decimal(literal) } },
      }).toString(),
    ).toBe(value(literal).toString());
    expect(value('1/3').precision()).toBe(50);
  });
  it('is independent of the caller decimal.js configuration', () => {
    const precision = Decimal.precision;
    const rounding = Decimal.rounding;
    try {
      Decimal.set({ precision: 3, rounding: Decimal.ROUND_DOWN });
      expect(value('1/3').precision()).toBe(50);
      expect(value('round(2.5)').toString()).toBe('3');
      expect(Decimal.precision).toBe(3);
    } finally {
      Decimal.set({ precision, rounding });
    }
  });
  it('supports registry extension without parser edits', () => {
    const functions = {
      twice: {
        name: 'twice',
        arity: 1,
        category: 'algebra',
        doc: { de: 'Verdoppelt.', en: 'Doubles.' },
        impl: (args: readonly Value[]) => {
          const first = args[0];
          return numberValue(
            first?.kind === 'number' ? first.value.mul(2) : '0',
          );
        },
      },
    };
    expect(value('3twice(4)+sqrt(9)', { functions }).toString()).toBe('27');
    expect(functionRegistry).not.toHaveProperty('twice');
    expect(evaluateString('twice(1,2)', { functions })).toMatchObject({
      ok: false,
      error: { code: 'E_ARGUMENT_COUNT' },
    });
  });
  it('returns a code when a registered implementation throws', () => {
    const functions = {
      bad: {
        name: 'bad',
        arity: 0,
        category: 'algebra',
        doc: { de: 'Test.', en: 'Test.' },
        impl: () => {
          throw new Error('private');
        },
      },
    };
    expect(evaluateString('bad()', { functions })).toEqual({
      ok: false,
      error: { code: 'E_INTERNAL', range: { start: 0, end: 5 } },
    });
  });
  it('documents every registry entry in both languages', () => {
    expect(Object.keys(functionRegistry).length).toBeGreaterThanOrEqual(24);
    for (const [name, definition] of Object.entries(functionRegistry)) {
      expect(definition.name).toBe(name);
      expect(definition.doc.de.length).toBeGreaterThan(0);
      expect(definition.doc.en.length).toBeGreaterThan(0);
      expect(typeof definition.impl).toBe('function');
    }
  });
  it.each(['1e10000', '1e-10000'])(
    'accepts the numerical boundary %s',
    (src) => {
      expect(value(src).toString()).toBe(new Decimal(src).toString());
    },
  );
  it.each([
    '('.repeat(130) + '1' + ')'.repeat(130),
    '-'.repeat(130) + '1',
    '1+'.repeat(2050) + '1',
    '1'.repeat(10001),
  ])('limits excessive work', (src) => {
    expect(evaluateString(src)).toMatchObject({
      ok: false,
      error: { code: 'E_RESOURCE_LIMIT' },
    });
  });
  it('preserves tiny angles and distinguishes values beside a pole', () => {
    expect(value('sin(1e-60)').isZero()).toBe(false);
    expect(value('sin(-1e-1000)').toString()).toBe('-1e-1000');
    expect(value('sin(1e-1000)').toString()).toBe('1e-1000');
    expect(
      value('cos(90.00000000000000000001)', { angleMode: 'deg' }).isZero(),
    ).toBe(false);
    expect(
      value('tan(89.99999999999999999999)', { angleMode: 'deg' }).isFinite(),
    ).toBe(true);
    expect(value('sin(1000000000110)', { angleMode: 'deg' }).toString()).toBe(
      '0.5',
    );
    expect(evaluateString('sin(1e31)')).toMatchObject({
      ok: false,
      error: { code: 'E_DOMAIN' },
    });
  });
  it('prints canonical Unicode operators and exponent literals', () => {
    const ast = parse('−2×3 + .5E-2π');
    if (!ast.ok) throw new Error('parse');
    expect(print(ast.value)).toBe('-2 * 3 + .5E-2 π');
  });
  it('reports non-number values and nonfinite input without throws', () => {
    const future = { kind: 'future' } as unknown as Value;
    expect(evaluateString('x+1', { variables: { x: future } })).toMatchObject({
      ok: false,
      error: { code: 'E_TYPE' },
    });
    expect(numberValue('Infinity')).toMatchObject({
      ok: false,
      error: { code: 'E_OVERFLOW' },
    });
    expect(numberValue('not a number')).toMatchObject({ ok: false });
  });
  it('rounds the exact factorial once', () => {
    expect(value('100!').toString()).toBe(
      '9.3326215443944152681699238856266700490715968264382e+157',
    );
  });
});

// Public type assertion: callers do not depend on parser-private classes.
const publicAst: Ast = {
  kind: 'number',
  literal: '2',
  range: { start: 0, end: 1 },
};
it('accepts a caller-constructed AST', () =>
  expect(evaluate(publicAst)).toEqual({ ok: true, value: input('2') }));
