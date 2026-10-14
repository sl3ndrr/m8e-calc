import { parse } from '../engine/parser.ts';
import { functionRegistry } from '../engine/functions.ts';
import type { Ast, Result } from '../engine/types.ts';
import { detectParams } from './compile.ts';
import type { Curve, CurveInputOptions, GraphError } from './types.ts';

export function parseCurveInput(
  source: string,
  options: CurveInputOptions = {},
): Result<Curve, GraphError> {
  const error = (
    code: string,
    detectedKind?: 'implicit',
  ): Result<Curve, GraphError> => ({
    ok: false,
    error: {
      code,
      range: { start: 0, end: source.length },
      ...(detectedKind ? { detectedKind } : {}),
    },
  });
  if (source.length > 10000) return error('E_RESOURCE_LIMIT');
  const text = source.trim().replace(/θ/g, 'theta');
  const angleMode = options.angleMode ?? 'rad';
  const range = options.range ?? [
    0,
    angleMode === 'deg' ? 360 : angleMode === 'grad' ? 400 : 2 * Math.PI,
  ];
  if (
    !Number.isFinite(range[0]) ||
    !Number.isFinite(range[1]) ||
    range[0] >= range[1] ||
    !Number.isFinite(range[1] - range[0])
  )
    return error('E_DOMAIN');
  const common = {
    ...(options.params ? { params: { ...options.params } } : {}),
    angleMode,
  };
  function expression(
    input: string,
    variables: readonly string[],
  ): Result<Ast, GraphError> {
    const r = parse(input);
    if (!r.ok) return error(r.error.code) as Result<Ast, GraphError>;
    if (r.value.kind === 'assignment' || r.value.kind === 'definition')
      return {
        ok: false,
        error: { code: 'E_SYNTAX', range: { start: 0, end: source.length } },
      };
    const unexpected = detectParams(r.value, variables).some((name) =>
      ['x', 'y', 't', 'theta'].includes(name),
    );
    if (unexpected)
      return {
        ok: false,
        error: {
          code: 'E_UNKNOWN_VARIABLE',
          range: { start: 0, end: source.length },
        },
      };
    const stack: Ast[] = [r.value];
    while (stack.length) {
      const node = stack.pop();
      if (!node) break;
      if (node.kind === 'call') {
        if (
          !Object.hasOwn(functionRegistry, node.name) ||
          !functionRegistry[node.name]?.floatImpl
        )
          return {
            ok: false,
            error: {
              code: 'E_UNSUPPORTED_FUNCTION',
              range: { start: 0, end: source.length },
            },
          };
        stack.push(...node.args);
      } else if (node.kind === 'binary') stack.push(node.left, node.right);
      else if (node.kind === 'group') stack.push(node.expression);
      else if (node.kind === 'unary' || node.kind === 'postfix')
        stack.push(node.operand);
    }
    return r;
  }
  // A tuple has exactly one outer comma; commas within calls do not split it.
  if (text.startsWith('(') && text.endsWith(')')) {
    let depth = 0;
    const commas: number[] = [];
    for (let i = 1; i < text.length - 1; i++) {
      const ch = text[i];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      else if (ch === ',' && depth === 0) commas.push(i);
    }
    if (commas.length) {
      if (commas.length !== 1) return error('E_SYNTAX');
      const split = commas[0] ?? 0;
      const x = expression(text.slice(1, split), ['t']),
        y = expression(text.slice(split + 1, -1), ['t']);
      if (!x.ok) return x;
      if (!y.ok) return y;
      return {
        ok: true,
        value: {
          kind: 'parametric',
          x: x.value,
          y: y.value,
          range: [range[0] ?? 0, range[1] ?? 0],
          ...common,
        },
      };
    }
  }
  const equal = text.indexOf('=');
  let kind: 'explicit' | 'vertical' | 'polar' = 'explicit',
    input = text;
  if (equal >= 0) {
    if (text.indexOf('=', equal + 1) >= 0) return error('E_SYNTAX');
    const left = text.slice(0, equal).replace(/\s/g, ''),
      right = text.slice(equal + 1);
    if (left === 'y' || left === 'f(x)') {
      input = right;
    } else if (left === 'x') {
      kind = 'vertical';
      input = right;
    } else if (left === 'r') {
      kind = 'polar';
      input = right;
    } else {
      const lhs = parse(text.slice(0, equal)),
        rhs = parse(right);
      if (!lhs.ok || !rhs.ok) return error('E_SYNTAX');
      if (lhs.value.kind === 'definition' || lhs.value.kind === 'assignment')
        return error('E_SYNTAX');
      if (!/\b[xy]\b/.test(left + ' ' + right)) return error('E_SYNTAX');
      return error('E_UNSUPPORTED_CURVE', 'implicit');
    }
  }
  const r = expression(
    input,
    kind === 'explicit' ? ['x'] : kind === 'polar' ? ['theta'] : [],
  );
  if (!r.ok) return r;
  return {
    ok: true,
    value:
      kind === 'polar'
        ? {
            kind,
            expression: r.value,
            range: [range[0] ?? 0, range[1] ?? 0],
            ...common,
          }
        : { kind, expression: r.value, ...common },
  };
}
