import type Decimal from 'decimal.js';
import type {
  Arity,
  FunctionContext,
  FunctionDefinition,
  Value,
} from './types.ts';
import {
  acceptsArity,
  checkedNumber,
  D,
  failure,
  NumericFault,
} from './numeric.ts';
import { complexFunction } from './complexFunctions.ts';

type NumericImplementation = (
  args: readonly Decimal[],
  context: FunctionContext,
) => Decimal;

export function define(
  name: string,
  arity: Arity,
  category: string,
  de: string,
  en: string,
  compute: NumericImplementation,
): FunctionDefinition {
  return Object.freeze({
    name,
    arity,
    category,
    doc: Object.freeze({ de, en }),
    impl: (args: readonly Value[], context: FunctionContext) => {
      try {
        if (!acceptsArity(arity, args.length))
          return failure('E_ARGUMENT_COUNT', context.range);
        const complex = complexFunction(name, args, context);
        if (complex !== undefined) return complex;
        const numbers: Decimal[] = [];
        for (const arg of args) {
          if (arg.kind !== 'number') return failure('E_TYPE', context.range);
          const normalized = checkedNumber(arg.value, context.range);
          if (!normalized.ok) return normalized;
          numbers.push(normalized.value.value);
        }
        return checkedNumber(compute(numbers, context), context.range);
      } catch (error) {
        return failure(
          error instanceof NumericFault ? error.code : 'E_INTERNAL',
          context.range,
        );
      }
    },
  });
}

export function unary(
  name: string,
  category: string,
  de: string,
  en: string,
  compute: (value: Decimal, context: FunctionContext) => Decimal,
): FunctionDefinition {
  return define(name, 1, category, de, en, (args, context) =>
    compute(args[0] ?? new D(0), context),
  );
}

export function binary(
  name: string,
  category: string,
  de: string,
  en: string,
  compute: (a: Decimal, b: Decimal, context: FunctionContext) => Decimal,
): FunctionDefinition {
  return define(name, 2, category, de, en, (args, context) =>
    compute(args[0] ?? new D(0), args[1] ?? new D(0), context),
  );
}
