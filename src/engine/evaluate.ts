import {
  defaultWordOptions,
  operate,
  parseBase,
  programmerFunctions,
  word,
  type WordOperation,
} from './programmer/index.ts';
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
} from './numeric.ts';
import { functionRegistry } from './functions.ts';
import { parse } from './parser.ts';
import { lookupConstant } from './constants.ts';
import { binaryValue, checkedComplex, normalizeValue } from './values.ts';
import {
  deserializeValue,
  isReserved,
  validateEnvironment,
} from './environment.ts';
class EvaluationFault extends Error {
  readonly error: EvalError;
  constructor(error: EvalError) {
    super();
    this.error = error;
  }
}
function take<T>(r: Result<T, EvalError>): T {
  if (!r.ok) throw new EvaluationFault(r.error);
  return r.value;
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
export function evaluate(
  ast: Ast,
  ctx: EvaluationContext = {},
): Result<Value, EvalError> {
  let work = 0,
    budget = MAX_NODES;
  const mode = ctx.complex ?? 'off';
  const activeFunctions = new Set<string>();
  const normalize = (v: Value, r: SourceRange): Value =>
    take(normalizeValue(v, r, mode));
  function bitOperation(
    op: WordOperation,
    args: readonly Value[],
    range: SourceRange,
  ): Value {
    if (!ctx.bitwise) return take(failure('E_TYPE', range));
    try {
      const integers = args.map((v) => {
        const d = numeric(v, range);
        if (!d.isInteger()) throw new NumericFault('E_DOMAIN');
        if (d.e > 100) throw new NumericFault('E_RESOURCE_LIMIT');
        return BigInt(d.toFixed());
      });
      const result = operate(
        op,
        integers[0] ?? 0n,
        integers[1] ?? 0n,
        ctx.programmer ?? defaultWordOptions,
      );
      return take(checkedNumber(result.toString(), range));
    } catch (e) {
      if (e instanceof NumericFault) return take(failure(e.code, range));
      throw e;
    }
  }
  function visit(
    node: Ast,
    depth: number,
    locals: Readonly<Record<string, Value>> = {},
  ): Value {
    if (++work > budget || depth > MAX_DEPTH)
      return take(failure('E_RESOURCE_LIMIT', node.range));
    const child = (operand: Ast): Value => visit(operand, depth + 1, locals);
    switch (node.kind) {
      case 'assignment':
      case 'definition':
        return take(failure('E_TYPE', node.range));
      case 'number': {
        try {
          const literal = node.literal.toLowerCase();
          if (ctx.bitwise && /^0[xbo]/.test(literal)) {
            const base = literal[1] === 'x' ? 16 : literal[1] === 'b' ? 2 : 8;
            return take(
              checkedNumber(
                parseBase(
                  literal,
                  base,
                  ctx.programmer ?? defaultWordOptions,
                ).toString(),
                node.range,
              ),
            );
          }
          return take(checkedNumber(literal, node.range));
        } catch (e) {
          if (e instanceof NumericFault)
            return take(failure(e.code, node.range));
          throw e;
        }
      }
      case 'identifier': {
        const constant = lookupConstant(node.name);
        if (constant) return take(checkedNumber(constant.value, node.range));
        if (node.name === 'i' || node.name === 'j')
          return mode === 'on'
            ? take(checkedComplex(0, 1, node.range))
            : take(failure('E_DOMAIN', node.range));
        if (node.name === 'ans' || /^ans[1-9][0-9]*$/.test(node.name)) {
          if (node.name === 'ans' && ctx.ans !== undefined)
            return normalize(ctx.ans, node.range);
          const index =
            node.name === 'ans' ? 0 : Number(node.name.slice(3)) - 1;
          const saved = ctx.environment?.history[index];
          return saved
            ? normalize(take(deserializeValue(saved, node.range)), node.range)
            : take(failure('E_UNKNOWN_VARIABLE', node.range));
        }
        if (Object.hasOwn(locals, node.name)) {
          const v = locals[node.name];
          if (v !== undefined) return normalize(v, node.range);
        }
        if (ctx.variables && Object.hasOwn(ctx.variables, node.name)) {
          const v = ctx.variables[node.name];
          if (v !== undefined) return normalize(v, node.range);
        }
        if (
          ctx.environment &&
          Object.hasOwn(ctx.environment.variables, node.name)
        ) {
          const v = ctx.environment.variables[node.name];
          if (v !== undefined)
            return normalize(take(deserializeValue(v, node.range)), node.range);
        }
        return take(failure('E_UNKNOWN_VARIABLE', node.range));
      }
      case 'group':
        return child(node.expression);
      case 'unary': {
        const v = child(node.operand);
        if (node.operator === '~')
          return bitOperation('not', [v], node.operatorRange);
        if (node.operator === '+') {
          if (v.kind === 'list')
            return take(failure('E_TYPE', node.operatorRange));
          return v;
        }
        return take(
          binaryValue(
            '*',
            { kind: 'number', value: new D(-1) },
            v,
            node.operatorRange,
            mode,
          ),
        );
      }
      case 'postfix': {
        const v = child(node.operand);
        if (node.operator === '%')
          return take(
            binaryValue(
              '/',
              v,
              { kind: 'number', value: new D(100) },
              node.operatorRange,
              mode,
            ),
          );
        try {
          return take(
            checkedNumber(
              factorial(numeric(v, node.operatorRange)),
              node.operatorRange,
            ),
          );
        } catch (e) {
          if (e instanceof NumericFault)
            return take(failure(e.code, node.operatorRange));
          throw e;
        }
      }
      case 'binary': {
        const left = child(node.left);
        let right = child(node.right);
        if (
          node.operator === '&' ||
          node.operator === '|' ||
          node.operator === '<<' ||
          node.operator === '>>'
        ) {
          const op =
            node.operator === '&'
              ? 'and'
              : node.operator === '|'
                ? 'or'
                : node.operator === '<<'
                  ? 'shl'
                  : ctx.programmer?.signed
                    ? 'asr'
                    : 'lsr';
          return bitOperation(op, [left, right], node.operatorRange);
        }
        if (
          ctx.percentMode === 'calculator' &&
          (node.operator === '+' || node.operator === '-') &&
          isPercentTerm(node.right)
        )
          right = take(binaryValue('*', left, right, node.operatorRange, mode));
        return take(
          binaryValue(node.operator, left, right, node.operatorRange, mode),
        );
      }
      case 'call': {
        if (
          ctx.bitwise &&
          programmerFunctions.some((name) => name === node.name)
        ) {
          const arity = ['bswap', 'popcount', 'clz', 'ctz'].includes(node.name)
            ? 1
            : 2;
          if (node.args.length !== arity)
            return take(failure('E_ARGUMENT_COUNT', node.range));
          return bitOperation(
            node.name as WordOperation,
            node.args.map(child),
            node.range,
          );
        }
        const user =
          ctx.environment && Object.hasOwn(ctx.environment.functions, node.name)
            ? ctx.environment.functions[node.name]
            : undefined;
        if (user) {
          if (user.parameters.length !== node.args.length)
            return take(failure('E_ARGUMENT_COUNT', node.range));
          if (activeFunctions.has(node.name))
            return take(failure('E_CYCLE', node.range));
          const args = node.args.map(child);
          const bindings: Record<string, Value> = {};
          user.parameters.forEach((p, i) => {
            const v = args[i];
            if (v !== undefined) bindings[p] = v;
          });
          activeFunctions.add(node.name);
          try {
            return visit(user.expression, depth + 1, bindings);
          } catch (e) {
            if (e instanceof EvaluationFault)
              throw new EvaluationFault({ ...e.error, range: node.range });
            if (e instanceof NumericFault)
              return take(failure(e.code, node.range));
            throw e;
          } finally {
            activeFunctions.delete(node.name);
          }
        }
        const definition =
          ctx.functions &&
          Object.hasOwn(ctx.functions, node.name) &&
          node.name !== 'sum' &&
          node.name !== 'prod'
            ? ctx.functions[node.name]
            : Object.hasOwn(functionRegistry, node.name)
              ? functionRegistry[node.name]
              : undefined;
        if (!definition)
          return take(failure('E_UNKNOWN_FUNCTION', node.nameRange));
        if (!acceptsArity(definition.arity, node.args.length))
          return take(failure('E_ARGUMENT_COUNT', node.range));
        const context = {
          angleMode: ctx.angleMode ?? 'rad',
          range: node.range,
          complex: mode,
          numerical: ctx.numerical,
          isReserved: (name: string) => isReserved(name, ctx),
          evaluate: (
            expression: Ast,
            bindings: Readonly<Record<string, Value>> = {},
          ): Result<Value, EvalError> => {
            try {
              return {
                ok: true,
                value: visit(expression, depth + 1, { ...locals, ...bindings }),
              };
            } catch (e) {
              return e instanceof EvaluationFault
                ? { ok: false, error: e.error }
                : failure(
                    e instanceof NumericFault ? e.code : 'E_INTERNAL',
                    expression.range,
                  );
            }
          },
        };
        try {
          if (definition.astImpl) {
            budget = 1000000;
            return normalize(
              take(definition.astImpl(node.args, context)),
              node.range,
            );
          }
          return normalize(
            take(definition.impl(node.args.map(child), context)),
            node.range,
          );
        } catch (e) {
          if (e instanceof EvaluationFault) throw e;
          return take(failure('E_INTERNAL', node.range));
        }
      }
    }
  }
  try {
    if (ctx.environment) {
      const checked = validateEnvironment(ctx.environment, ast.range, ctx);
      if (!checked.ok) return checked;
    }
    const value = visit(ast, 1);
    if (ctx.bitwise && value.kind === 'number' && value.value.isInteger()) {
      if (value.value.e > 100) return failure('E_RESOURCE_LIMIT', ast.range);
      return checkedNumber(
        word(
          BigInt(value.value.toFixed()),
          ctx.programmer ?? defaultWordOptions,
        ).toString(),
        ast.range,
      );
    }
    return { ok: true, value };
  } catch (e) {
    return e instanceof EvaluationFault
      ? { ok: false, error: e.error }
      : failure(e instanceof NumericFault ? e.code : 'E_INTERNAL', ast.range);
  }
}
export function evaluateString(
  src: string,
  ctx: EvaluationContext = {},
): Result<Value, EngineError> {
  const parsed = parse(src, ctx);
  return parsed.ok ? evaluate(parsed.value, ctx) : parsed;
}
