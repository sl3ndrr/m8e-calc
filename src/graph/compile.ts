import { functionRegistry } from '../engine/functions.ts';
import { floatFactorial } from '../engine/floatFunctions.ts';
import type { Ast, FunctionRegistry } from '../engine/types.ts';
import type { CompiledFunction, CompileOptions } from './types.ts';

const constants: Readonly<Record<string, number>> = Object.freeze({
  pi: Math.PI,
  π: Math.PI,
  e: Math.E,
  phi: (1 + Math.sqrt(5)) / 2,
  φ: (1 + Math.sqrt(5)) / 2,
  tau: 2 * Math.PI,
  τ: 2 * Math.PI,
});
const forbidden = (name: string): boolean =>
  name === 'i' ||
  name === 'j' ||
  /^ans(?:[1-9]\d*)?$/.test(name) ||
  ['__proto__', 'constructor', 'prototype'].includes(name);
export function detectParams(
  ast: Ast,
  variables: readonly string[] = ['x'],
): string[] {
  const names = new Set<string>(),
    stack: { ast: Ast; depth: number }[] = [{ ast, depth: 0 }];
  let visits = 0;
  while (stack.length) {
    const entry = stack.pop();
    if (!entry) break;
    if (++visits > 2048 || entry.depth > 128) return [];
    const node = entry.ast,
      children: Ast[] = [];
    if (
      node.kind === 'identifier' &&
      !variables.includes(node.name) &&
      !Object.hasOwn(constants, node.name) &&
      !forbidden(node.name)
    )
      names.add(node.name);
    if (node.kind === 'binary') children.push(node.left, node.right);
    else if (node.kind === 'unary' || node.kind === 'postfix')
      children.push(node.operand);
    else if (node.kind === 'group') children.push(node.expression);
    else if (node.kind === 'call') children.push(...node.args);
    for (const child of children)
      stack.push({ ast: child, depth: entry.depth + 1 });
  }
  return [...names].sort();
}
type NodeFunction = (variables: readonly number[]) => number;
const finite = (x: number): number => (Number.isFinite(x) ? x : NaN);
const invalid: NodeFunction = () => NaN;
export function compile(ast: Ast, options: CompileOptions): CompiledFunction {
  const parameterNames = Object.freeze(detectParams(ast, options.variables));
  const slots = new Map(
    parameterNames.map((name) => [name, options.params?.[name] ?? 1]),
  );
  const registry: FunctionRegistry = {
    ...functionRegistry,
    ...options.functions,
  };
  const context = { angleMode: options.angleMode ?? 'rad' };
  let visits = 0;
  function build(node: Ast, depth: number): NodeFunction {
    if (++visits > 2048 || depth > 128)
      throw new RangeError('AST resource limit');
    switch (node.kind) {
      case 'number': {
        const n = finite(Number(node.literal));
        return () => n;
      }
      case 'identifier': {
        if (Object.hasOwn(constants, node.name))
          return () => constants[node.name] ?? NaN;
        if (forbidden(node.name)) return invalid;
        const index = options.variables.indexOf(node.name);
        return index >= 0
          ? (values) => finite(values[index] ?? NaN)
          : () => finite(slots.get(node.name) ?? NaN);
      }
      case 'group':
        return build(node.expression, depth + 1);
      case 'unary': {
        const operand = build(node.operand, depth + 1);
        return node.operator === '~'
          ? invalid
          : node.operator === '-'
            ? (values) => -operand(values)
            : operand;
      }
      case 'postfix': {
        const operand = build(node.operand, depth + 1);
        return node.operator === '%'
          ? (values) => operand(values) / 100
          : (values) => floatFactorial(operand(values));
      }
      case 'binary': {
        const left = build(node.left, depth + 1),
          right = build(node.right, depth + 1);
        const op = node.operator;
        if (!['+', '-', '*', '/', '^'].includes(op)) return invalid;
        return (values) => {
          const a = left(values),
            b = right(values);
          if (!Number.isFinite(a) || !Number.isFinite(b)) return NaN;
          switch (op) {
            case '+':
              return finite(a + b);
            case '-':
              return finite(a - b);
            case '*':
              return finite(a * b);
            case '/':
              return b === 0 ? NaN : finite(a / b);
            case '^':
              return (a === 0 && b === 0) || (a < 0 && !Number.isInteger(b))
                ? NaN
                : finite(a ** b);
            default:
              return NaN;
          }
        };
      }
      case 'call': {
        const definition = Object.hasOwn(registry, node.name)
          ? registry[node.name]
          : undefined;
        const impl = definition?.floatImpl,
          arity = definition?.arity;
        if (
          !impl ||
          arity === undefined ||
          (typeof arity === 'number'
            ? node.args.length !== arity
            : node.args.length < arity.min ||
              node.args.length > (arity.max ?? Infinity))
        )
          return invalid;
        const args = node.args.map((arg) => build(arg, depth + 1));
        // Scratch storage belongs to this closure; no global mutable evaluator.
        const numbers = new Array<number>(args.length);
        return (values) => {
          for (let i = 0; i < args.length; i++) {
            const n = args[i]?.(values) ?? NaN;
            if (!Number.isFinite(n)) return NaN;
            numbers[i] = n;
          }
          try {
            return finite(impl(numbers, context));
          } catch {
            return NaN;
          }
        };
      }
      default:
        return invalid;
    }
  }
  let root: NodeFunction;
  try {
    root = build(ast, 0);
  } catch {
    root = invalid;
  }
  return Object.assign((...variables: number[]) => finite(root(variables)), {
    parameterNames,
    setParam(name: string, value: number): boolean {
      if (!slots.has(name) || !Number.isFinite(value)) return false;
      slots.set(name, value);
      return true;
    },
    getParams(): Readonly<Record<string, number>> {
      return Object.fromEntries(slots);
    },
  });
}
