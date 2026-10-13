import type Decimal from 'decimal.js';
import type {
  Ast,
  EngineError,
  EvalError,
  EvaluationContext,
  Result,
  SourceRange,
  Value,
} from './types.ts';
import {
  acceptsArity,
  checkedNumber,
  D,
  factorial,
  failure,
  MAX_DEPTH,
  MAX_NODES,
  NumericFault,
  PI_TEXT,
  power,
} from './numeric.ts';
import { functionRegistry } from './functions.ts';
import { parse } from './parser.ts';

class EvaluationFault extends Error {
  readonly error: EvalError;
  constructor(error: EvalError) {
    super();
    this.error = error;
  }
}

function take<T>(result: Result<T, EvalError>): T {
  if (!result.ok) throw new EvaluationFault(result.error);
  return result.value;
}

function normalize(value: Value, range: SourceRange): Value {
  if (value.kind !== 'number') return take(failure('E_TYPE', range));
  return take(checkedNumber(value.value, range));
}

function numeric(value: Value, range: SourceRange): Decimal {
  if (value.kind !== 'number') return take(failure('E_TYPE', range));
  return value.value;
}

function isPercentTerm(ast: Ast): boolean {
  if (ast.kind === 'group') return isPercentTerm(ast.expression);
  if (ast.kind === 'unary') return isPercentTerm(ast.operand);
  return ast.kind === 'postfix' && ast.operator === '%';
}

const constants = Object.freeze({
  pi: new D(PI_TEXT),
  π: new D(PI_TEXT),
  e: new D(1).exp(),
});

export function evaluate(
  ast: Ast,
  ctx: EvaluationContext = {},
): Result<Value, EvalError> {
  let work = 0;
  function visit(node: Ast, depth: number): Value {
    work++;
    if (work > MAX_NODES || depth > MAX_DEPTH)
      return take(failure('E_RESOURCE_LIMIT', node.range));
    const child = (operand: Ast): Value => visit(operand, depth + 1);
    switch (node.kind) {
      case 'number':
        return take(checkedNumber(node.literal, node.range));
      case 'identifier': {
        if (Object.hasOwn(constants, node.name)) {
          const value = constants[node.name as keyof typeof constants];
          return take(checkedNumber(value, node.range));
        }
        if (node.name === 'ans') {
          return ctx.ans === undefined
            ? take(failure('E_UNKNOWN_VARIABLE', node.range))
            : normalize(ctx.ans, node.range);
        }
        if (ctx.variables && Object.hasOwn(ctx.variables, node.name)) {
          const value = ctx.variables[node.name];
          if (value !== undefined) return normalize(value, node.range);
        }
        return take(failure('E_UNKNOWN_VARIABLE', node.range));
      }
      case 'group':
        return child(node.expression);
      case 'unary': {
        const operand = numeric(child(node.operand), node.operatorRange);
        return take(
          checkedNumber(
            node.operator === '-' ? operand.neg() : operand,
            node.operatorRange,
          ),
        );
      }
      case 'postfix': {
        const operand = numeric(child(node.operand), node.operatorRange);
        try {
          return take(
            checkedNumber(
              node.operator === '%' ? operand.div(100) : factorial(operand),
              node.operatorRange,
            ),
          );
        } catch (error) {
          if (error instanceof NumericFault)
            return take(failure(error.code, node.operatorRange));
          throw error;
        }
      }
      case 'binary': {
        const left = numeric(child(node.left), node.operatorRange);
        let right = numeric(child(node.right), node.operatorRange);
        try {
          if (
            ctx.percentMode === 'calculator' &&
            (node.operator === '+' || node.operator === '-') &&
            isPercentTerm(node.right)
          )
            right = left.mul(right);
          let value: Decimal;
          switch (node.operator) {
            case '+':
              value = left.add(right);
              break;
            case '-':
              value = left.sub(right);
              break;
            case '*':
              value = left.mul(right);
              break;
            case '/':
              if (right.isZero())
                return take(failure('E_DIVISION_BY_ZERO', node.operatorRange));
              value = left.div(right);
              break;
            case '^':
              value = power(left, right);
              break;
          }
          return take(checkedNumber(value, node.operatorRange));
        } catch (error) {
          if (error instanceof NumericFault)
            return take(failure(error.code, node.operatorRange));
          throw error;
        }
      }
      case 'call': {
        const definition =
          ctx.functions && Object.hasOwn(ctx.functions, node.name)
            ? ctx.functions[node.name]
            : Object.hasOwn(functionRegistry, node.name)
              ? functionRegistry[node.name]
              : undefined;
        if (definition === undefined)
          return take(failure('E_UNKNOWN_FUNCTION', node.nameRange));
        if (!acceptsArity(definition.arity, node.args.length))
          return take(failure('E_ARGUMENT_COUNT', node.range));
        const args = node.args.map(child);
        try {
          return normalize(
            take(
              definition.impl(args, {
                angleMode: ctx.angleMode ?? 'rad',
                range: node.range,
              }),
            ),
            node.range,
          );
        } catch (error) {
          if (error instanceof EvaluationFault) throw error;
          return take(failure('E_INTERNAL', node.range));
        }
      }
    }
  }
  try {
    return { ok: true, value: visit(ast, 1) };
  } catch (error) {
    return error instanceof EvaluationFault
      ? { ok: false, error: error.error }
      : failure('E_INTERNAL', ast.range);
  }
}

export function evaluateString(
  src: string,
  ctx: EvaluationContext = {},
): Result<Value, EngineError> {
  const parsed = parse(src);
  return parsed.ok ? evaluate(parsed.value, ctx) : parsed;
}
