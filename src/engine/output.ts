import type {
  Ast,
  EvalError,
  Fraction,
  Result,
  Value,
  ValueFormatOptions,
} from './types.ts';
import { checkedNumber, D, failure } from './numeric.ts';
import { formatNumber } from './format.ts';
import { fromRadians } from './trigonometry.ts';
export function formatValue(
  value: Value,
  options: ValueFormatOptions = {},
): string {
  if (value.kind === 'number') return formatNumber(value, options);
  if (value.kind === 'list')
    return `[${value.values.map((v) => formatValue(v, options)).join(', ')}]`;
  const real = formatNumber(value.re, options),
    imag = formatNumber(value.im.abs(), options);
  if (options.complexForm === 'polar') {
    const magnitude = value.re.mul(value.re).add(value.im.mul(value.im)).sqrt();
    const angle = magnitude.isZero()
      ? new D(0)
      : fromRadians(D.atan2(value.im, value.re), options.angleMode ?? 'rad');
    return `${formatNumber(magnitude, options)}∠${formatNumber(angle, options)}`;
  }
  return `${real}${value.im.isNegative() ? '-' : '+'}${imag}i`;
}
export function toFraction(
  value: Value,
  maxDenominator = 1000000,
): Result<Fraction, EvalError> {
  const range = { start: 0, end: 0 };
  if (value.kind !== 'number') return failure('E_TYPE', range);
  if (
    !Number.isSafeInteger(maxDenominator) ||
    maxDenominator < 1 ||
    maxDenominator > 1e9
  )
    return failure('E_DOMAIN', range);
  const normalized = checkedNumber(value.value, range);
  if (!normalized.ok) return normalized;
  const x = normalized.value.value,
    limit = BigInt(maxDenominator);
  const [integer = '0', fraction = ''] = x.abs().toFixed().split('.');
  const originalN = BigInt(integer + fraction),
    originalD = 10n ** BigInt(fraction.length);
  let n = originalN,
    d = originalD,
    p0 = 0n,
    q0 = 1n,
    p1 = 1n,
    q1 = 0n;
  const result = (p: bigint, q: bigint): Result<Fraction, EvalError> => ({
    ok: true,
    value: {
      numerator: (x.isNegative() ? -p : p).toString(),
      denominator: q.toString(),
    },
  });
  while (d !== 0n) {
    const a = n / d,
      q2 = q0 + a * q1;
    if (q2 > limit) break;
    const p2 = p0 + a * p1;
    p0 = p1;
    q0 = q1;
    p1 = p2;
    q1 = q2;
    const remainder = n - a * d;
    n = d;
    d = remainder;
  }
  if (d === 0n) return result(p1, q1);
  const k = (limit - q0) / q1,
    pBound = p0 + k * p1,
    qBound = q0 + k * q1;
  const abs = (v: bigint): bigint => (v < 0n ? -v : v);
  const boundError = abs(pBound * originalD - originalN * qBound) * q1;
  const convergentError = abs(p1 * originalD - originalN * q1) * qBound;
  return boundError < convergentError ||
    (boundError === convergentError && qBound < q1)
    ? result(pBound, qBound)
    : result(p1, q1);
}
function nameLatex(name: string): string {
  const symbols: Readonly<Record<string, string>> = {
    pi: '\\pi',
    π: '\\pi',
    phi: '\\varphi',
    φ: '\\varphi',
    tau: '\\tau',
    τ: '\\tau',
  };
  if (Object.hasOwn(symbols, name)) return symbols[name] ?? '';
  const escaped = name.replace(/[^A-Za-z0-9]/gu, (c) =>
    c === '_' ? '\\_' : `\\text{${c.codePointAt(0)?.toString(16) ?? ''}}`,
  );
  return /^[A-Za-z]$/.test(name) ? name : `\\mathrm{${escaped}}`;
}
function numberLatex(text: string): string {
  const [mantissa = '0', exponent] = text.split(/[eE]/);
  return exponent === undefined
    ? mantissa
    : `${mantissa}\\times 10^{${Number(exponent)}}`;
}
function priority(ast: Ast): number {
  if (ast.kind === 'binary')
    return ast.operator === '^'
      ? 3
      : ast.operator === '*' || ast.operator === '/'
        ? 1
        : 0;
  return ast.kind === 'unary' ? 2 : ast.kind === 'postfix' ? 4 : 5;
}
function astLatex(ast: Ast): string {
  const wrap = (child: Ast, needed: boolean): string =>
    needed ? `\\left(${astLatex(child)}\\right)` : astLatex(child);
  switch (ast.kind) {
    case 'number':
      return numberLatex(ast.literal);
    case 'identifier':
      return nameLatex(ast.name);
    case 'group':
      return `\\left(${astLatex(ast.expression)}\\right)`;
    case 'assignment':
      return `${nameLatex(ast.name)}=${astLatex(ast.expression)}`;
    case 'definition':
      return `${nameLatex(ast.name)}\\left(${ast.parameters.map(nameLatex).join(',')}\\right)=${astLatex(ast.expression)}`;
    case 'unary':
      return ast.operator + wrap(ast.operand, priority(ast.operand) < 2);
    case 'postfix':
      return (
        wrap(ast.operand, priority(ast.operand) < 4) +
        (ast.operator === '%' ? '\\%' : '!')
      );
    case 'binary': {
      if (ast.operator === '/')
        return `\\frac{${astLatex(ast.left)}}{${astLatex(ast.right)}}`;
      if (ast.operator === '^')
        return `{${wrap(ast.left, priority(ast.left) <= 3)}}^{${astLatex(ast.right)}}`;
      const p = priority(ast),
        left = wrap(ast.left, priority(ast.left) < p),
        right = wrap(ast.right, priority(ast.right) <= p);
      return `${left}${ast.operator === '*' ? '\\cdot ' : ast.operator}${right}`;
    }
    case 'call': {
      const args = ast.args.map(astLatex);
      const [expression, variable, from, to] = args;
      if (ast.name === 'sqrt' && args.length === 1)
        return `\\sqrt{${expression ?? ''}}`;
      if (ast.name === 'integral' && args.length === 4)
        return `\\int_{${from ?? ''}}^{${to ?? ''}} ${expression ?? ''}\\,\\mathrm{d}${variable ?? ''}`;
      if ((ast.name === 'sum' || ast.name === 'prod') && args.length === 4)
        return `${ast.name === 'sum' ? '\\sum' : '\\prod'}_{${variable ?? ''}=${from ?? ''}}^{${to ?? ''}} \\left(${expression ?? ''}\\right)`;
      if (ast.name === 'deriv' && args.length === 3)
        return `\\left.\\frac{\\mathrm{d}}{\\mathrm{d}${variable ?? ''}}\\left(${expression ?? ''}\\right)\\right|_{${variable ?? ''}=${from ?? ''}}`;
      const known = [
        'sin',
        'cos',
        'tan',
        'sinh',
        'cosh',
        'tanh',
        'ln',
        'exp',
        'log',
        'min',
        'max',
      ];
      const fn = known.includes(ast.name)
        ? `\\${ast.name}`
        : `\\operatorname{${nameLatex(ast.name)}}`;
      return `${fn}\\left(${args.join(',')}\\right)`;
    }
  }
}
export function toLatex(input: Ast | Value): string {
  if (input.kind === 'number')
    return 'literal' in input
      ? numberLatex(input.literal)
      : numberLatex(input.value.toString());
  if (input.kind === 'complex')
    return `${numberLatex(input.re.toString())}${input.im.isNegative() ? '-' : '+'}${numberLatex(input.im.abs().toString())}\\mathrm{i}`;
  if (input.kind === 'list')
    return `\\left[${input.values.map(toLatex).join(',')}\\right]`;
  return astLatex(input);
}
