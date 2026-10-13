import type {
  Ast,
  Environment,
  EvalError,
  EvaluationContext,
  Execution,
  Result,
  ParseError,
  SerializedValue,
  SourceRange,
  UserFunction,
  Value,
} from './types.ts';
import { checkedNumber, failure, MAX_DEPTH, MAX_NODES } from './numeric.ts';
import { checkedComplex } from './values.ts';
import { lookupConstant } from './constants.ts';
import { functionRegistry } from './functions.ts';
import { parse } from './parser.ts';
import { print } from './print.ts';
import { evaluate } from './evaluate.ts';

export function isReserved(name: string, ctx: EvaluationContext = {}): boolean {
  return (
    lookupConstant(name) !== undefined ||
    Object.hasOwn(functionRegistry, name) ||
    !!(ctx.functions && Object.hasOwn(ctx.functions, name)) ||
    ['i', 'j', 'ans', '__proto__', 'prototype', 'constructor'].includes(name) ||
    /^ans[1-9][0-9]*$/.test(name)
  );
}
function isRecord(input: unknown): boolean {
  return input !== null && typeof input === 'object' && !Array.isArray(input);
}
function validName(name: string): boolean {
  return /^[A-Za-z_][A-Za-z_0-9]*$/.test(name);
}
export function createEnvironment(): Environment {
  return { version: 1, variables: {}, functions: {}, history: [] };
}
export function serializeValue(value: Value): SerializedValue {
  switch (value.kind) {
    case 'number':
      return { kind: 'number', value: value.value.toString() };
    case 'complex':
      return {
        kind: 'complex',
        re: value.re.toString(),
        im: value.im.toString(),
      };
    case 'list':
      return { kind: 'list', values: value.values.map(serializeValue) };
  }
}
export function deserializeValue(
  input: SerializedValue,
  range: SourceRange,
  depth = 0,
  budget = { remaining: MAX_NODES },
): Result<Value, EvalError> {
  if (
    --budget.remaining < 0 ||
    depth > MAX_DEPTH ||
    !isRecord(input) ||
    !Object.hasOwn(input, 'kind')
  )
    return failure('E_ENVIRONMENT', range);
  if (
    input.kind === 'number' &&
    Object.hasOwn(input, 'value') &&
    typeof input.value === 'string'
  )
    return checkedNumber(input.value, range);
  if (
    input.kind === 'complex' &&
    Object.hasOwn(input, 're') &&
    Object.hasOwn(input, 'im') &&
    typeof input.re === 'string' &&
    typeof input.im === 'string'
  )
    return checkedComplex(input.re, input.im, range);
  if (
    input.kind === 'list' &&
    Object.hasOwn(input, 'values') &&
    Array.isArray(input.values) &&
    input.values.length <= MAX_NODES
  ) {
    const values: Value[] = [];
    for (const v of input.values) {
      const r = deserializeValue(v, range, depth + 1, budget);
      if (!r.ok) return r;
      values.push(r.value);
    }
    return { ok: true, value: { kind: 'list', values } };
  }
  return failure('E_ENVIRONMENT', range);
}
function validAst(input: Ast): boolean {
  let count = 0;
  const active = new Set<Ast>();
  function walk(node: Ast, depth: number): boolean {
    if (
      !node ||
      typeof node !== 'object' ||
      depth > MAX_DEPTH ||
      ++count > MAX_NODES ||
      active.has(node)
    )
      return false;
    if (
      !node.range ||
      !Number.isInteger(node.range.start) ||
      !Number.isInteger(node.range.end) ||
      node.range.start < 0 ||
      node.range.end < node.range.start
    )
      return false;
    active.add(node);
    let valid = false;
    const operatorRange =
      'operatorRange' in node ? node.operatorRange : undefined;
    if (
      operatorRange &&
      (!Number.isInteger(operatorRange.start) ||
        !Number.isInteger(operatorRange.end))
    )
      return false;
    switch (node.kind) {
      case 'number':
        valid =
          typeof node.literal === 'string' &&
          /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(node.literal);
        break;
      case 'identifier':
        valid =
          typeof node.name === 'string' &&
          (validName(node.name) || ['π', 'φ', 'τ'].includes(node.name));
        break;
      case 'group':
        valid = walk(node.expression, depth + 1);
        break;
      case 'unary':
      case 'postfix':
        valid =
          !!operatorRange &&
          (node.kind === 'unary' ? ['+', '-'] : ['!', '%']).includes(
            node.operator,
          ) &&
          walk(node.operand, depth + 1);
        break;
      case 'binary':
        valid =
          !!operatorRange &&
          ['+', '-', '*', '/', '^'].includes(node.operator) &&
          typeof node.implicit === 'boolean' &&
          walk(node.left, depth + 1) &&
          walk(node.right, depth + 1);
        break;
      case 'call':
        valid =
          typeof node.name === 'string' &&
          validName(node.name) &&
          !!node.nameRange &&
          Array.isArray(node.args) &&
          node.args.every((a) => walk(a, depth + 1));
        break;
    }
    active.delete(node);
    return valid;
  }
  return walk(input, 1);
}
function calls(ast: Ast, out: Set<string>): void {
  switch (ast.kind) {
    case 'call':
      out.add(ast.name);
      ast.args.forEach((a) => calls(a, out));
      break;
    case 'binary':
      calls(ast.left, out);
      calls(ast.right, out);
      break;
    case 'unary':
    case 'postfix':
      calls(ast.operand, out);
      break;
    case 'group':
    case 'assignment':
    case 'definition':
      calls(ast.expression, out);
      break;
  }
}
export function hasCycle(
  functions: Readonly<Record<string, UserFunction>>,
): boolean {
  const done = new Set<string>(),
    active = new Set<string>();
  function walk(name: string, depth: number): boolean {
    if (depth > MAX_DEPTH || active.has(name)) return true;
    if (done.has(name)) return false;
    const fn = Object.hasOwn(functions, name) ? functions[name] : undefined;
    if (!fn) return false;
    active.add(name);
    const dependencies = new Set<string>();
    calls(fn.expression, dependencies);
    for (const dependency of dependencies)
      if (walk(dependency, depth + 1)) return true;
    active.delete(name);
    done.add(name);
    return false;
  }
  return Object.keys(functions).some((name) => walk(name, 1));
}
export function validateEnvironment(
  env: Environment,
  range: SourceRange,
  ctx: EvaluationContext = {},
): Result<Environment, EvalError> {
  try {
    if (
      !isRecord(env) ||
      !['version', 'variables', 'functions', 'history'].every((key) =>
        Object.hasOwn(env, key),
      ) ||
      env.version !== 1 ||
      !isRecord(env.variables) ||
      !isRecord(env.functions) ||
      !Array.isArray(env.history) ||
      env.history.length > 100 ||
      Object.keys(env.variables).length + Object.keys(env.functions).length >
        1000
    )
      return failure('E_ENVIRONMENT', range);
    for (const [name, value] of Object.entries(env.variables))
      if (
        !validName(name) ||
        isReserved(name, ctx) ||
        Object.hasOwn(env.functions, name) ||
        !deserializeValue(value, range).ok
      )
        return failure('E_ENVIRONMENT', range);
    for (const [name, fn] of Object.entries(env.functions)) {
      if (
        !validName(name) ||
        isReserved(name, ctx) ||
        !fn ||
        !Array.isArray(fn.parameters) ||
        fn.parameters.length === 0 ||
        fn.parameters.length > 128 ||
        new Set(fn.parameters).size !== fn.parameters.length ||
        fn.parameters.some((p) => !validName(p) || isReserved(p, ctx)) ||
        !validAst(fn.expression)
      )
        return failure('E_ENVIRONMENT', range);
      // Validate canonical source against lexer/parser limits as well as runtime shape.
      const parsed = parse(print(fn.expression));
      if (!parsed.ok) return failure('E_ENVIRONMENT', range);
    }
    for (const value of env.history)
      if (!deserializeValue(value, range).ok)
        return failure('E_ENVIRONMENT', range);
    return hasCycle(env.functions)
      ? failure('E_CYCLE', range)
      : { ok: true, value: env };
  } catch {
    return failure('E_ENVIRONMENT', range);
  }
}
export function execute(
  src: string,
  environment: Environment = createEnvironment(),
  ctx: EvaluationContext = {},
): Result<Execution, EvalError | ParseError> {
  const parsed = parse(src);
  if (!parsed.ok) return parsed;
  const ast = parsed.value;
  const valid = validateEnvironment(environment, ast.range, ctx);
  if (!valid.ok) return valid;
  if (ast.kind === 'definition' || ast.kind === 'assignment') {
    if (isReserved(ast.name, ctx))
      return failure('E_RESERVED_NAME', ast.nameRange);
    if (ast.kind === 'definition') {
      if (ast.parameters.some((p) => isReserved(p, ctx)))
        return failure('E_RESERVED_NAME', ast.nameRange);
      if (new Set(ast.parameters).size !== ast.parameters.length)
        return failure('E_DOMAIN', ast.nameRange);
      const functions = {
        ...environment.functions,
        [ast.name]: {
          parameters: [...ast.parameters],
          expression: ast.expression,
        },
      };
      if (hasCycle(functions)) return failure('E_CYCLE', ast.range);
      const variables = { ...environment.variables };
      delete variables[ast.name];
      const env: Environment = { ...environment, variables, functions };
      const check = validateEnvironment(env, ast.range, ctx);
      if (!check.ok) return check;
      return { ok: true, value: { value: null, environment: env } };
    }
  }
  const result = evaluate(ast.kind === 'assignment' ? ast.expression : ast, {
    ...ctx,
    environment,
  });
  if (!result.ok) return result;
  const serialized = serializeValue(result.value);
  const variables =
    ast.kind === 'assignment'
      ? { ...environment.variables, [ast.name]: serialized }
      : { ...environment.variables };
  const functions = { ...environment.functions };
  if (ast.kind === 'assignment') delete functions[ast.name];
  const env: Environment = {
    version: 1,
    variables,
    functions,
    history: [serialized, ...environment.history].slice(0, 100),
  };
  const check = validateEnvironment(env, ast.range, ctx);
  if (!check.ok) return check;
  return { ok: true, value: { value: result.value, environment: env } };
}
