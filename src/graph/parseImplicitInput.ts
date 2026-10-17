import { parse } from '../engine/parser.ts';
import { functionRegistry } from '../engine/functions.ts';
import type { Ast, Result } from '../engine/types.ts';
import { compile, detectParams } from './compile.ts';
import type { CompiledFunction, CurveOptions, GraphError } from './types.ts';
import type { ImplicitCurve } from './implicitTypes.ts';

/** AP26 opt-in: one scalar expression F, or lhs=rhs normalized to lhs-rhs. */
export function parseImplicitInput(
  source: string,
  options: CurveOptions = {},
): Result<ImplicitCurve, GraphError> {
  const range = { start: 0, end: source.length };
  const error = (code: string): Result<ImplicitCurve, GraphError> => ({
    ok: false,
    error: { code, range, detectedKind: 'implicit' },
  });
  if (source.length > 10000) return error('E_RESOURCE_LIMIT');
  const superscripts: Readonly<Record<string, string>> = {
    '⁰': '0',
    '¹': '1',
    '²': '2',
    '³': '3',
    '⁴': '4',
    '⁵': '5',
    '⁶': '6',
    '⁷': '7',
    '⁸': '8',
    '⁹': '9',
    '⁻': '-',
    '⁺': '+',
  };
  const text = source.replace(
    /[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+/g,
    (exponent) =>
      '^(' + [...exponent].map((c) => superscripts[c]).join('') + ')',
  );
  if (text.length > 10000) return error('E_RESOURCE_LIMIT');
  const equal = text.indexOf('=');
  if (equal >= 0 && text.indexOf('=', equal + 1) >= 0) return error('E_SYNTAX');
  // Do not reinterpret existing graph shorthands, assignments or definitions.
  if (
    equal >= 0 &&
    /^(?:[A-Za-z_πφτθ][\wπφτθ]*|f\s*\([^)]*\))\s*$/.test(
      text.slice(0, equal).trim(),
    )
  )
    return error('E_SYNTAX');
  const left = parse(equal < 0 ? text : text.slice(0, equal));
  if (!left.ok) return error(left.error.code);
  let expression = left.value;
  if (equal >= 0) {
    const right = parse(text.slice(equal + 1));
    if (!right.ok) return error(right.error.code);
    expression = {
      kind: 'binary',
      operator: '-',
      left: expression,
      right: right.value,
      implicit: false,
      operatorRange: { start: equal, end: equal + 1 },
      range,
    };
  }
  const stack: { node: Ast; depth: number }[] = [
    { node: expression, depth: 0 },
  ];
  let visits = 0;
  while (stack.length) {
    const entry = stack.pop();
    if (!entry) break;
    if (++visits > 2048 || entry.depth > 128) return error('E_RESOURCE_LIMIT');
    const { node, depth } = entry;
    const children: readonly Ast[] =
      node.kind === 'binary'
        ? [node.left, node.right]
        : node.kind === 'group'
          ? [node.expression]
          : node.kind === 'unary' || node.kind === 'postfix'
            ? [node.operand]
            : node.kind === 'call'
              ? node.args
              : [];
    if (
      node.kind === 'assignment' ||
      node.kind === 'definition' ||
      (node.kind === 'unary' && node.operator === '~') ||
      (node.kind === 'binary' &&
        !['+', '-', '*', '/', '^'].includes(node.operator))
    )
      return error('E_SYNTAX');
    if (
      node.kind === 'call' &&
      (!Object.hasOwn(functionRegistry, node.name) ||
        !functionRegistry[node.name]?.floatImpl)
    )
      return error('E_UNSUPPORTED_FUNCTION');
    for (const child of children) stack.push({ node: child, depth: depth + 1 });
  }
  if (
    detectParams(expression, ['x', 'y']).some((name) =>
      ['t', 'theta', 'θ'].includes(name),
    )
  )
    return error('E_UNKNOWN_VARIABLE');
  return {
    ok: true,
    value: {
      kind: 'implicit',
      expression,
      ...(options.params ? { params: { ...options.params } } : {}),
      angleMode: options.angleMode ?? 'rad',
    },
  };
}

export function compileImplicitCurve(curve: ImplicitCurve): CompiledFunction {
  return compile(curve.expression, {
    variables: ['x', 'y'],
    params: curve.params,
    angleMode: curve.angleMode,
  });
}
