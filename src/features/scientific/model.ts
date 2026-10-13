import {
  createEnvironment,
  execute,
  formatValue,
  parse,
  print,
  toFraction,
  toLatex,
  type AngleMode,
  type EvaluationContext,
  type ComplexMode,
  type EngineError,
  type Environment,
  type Value,
  type ValueFormatOptions,
} from '../../engine';
import type { Locale, MessageKey } from '../../shared/i18n';
export interface Calculation {
  expression: string;
  expressionLatex: string;
  value: Value | null;
}
export interface ScientificOptions extends Pick<
  EvaluationContext,
  'bitwise' | 'programmer'
> {
  angleMode: AngleMode;
  complex: ComplexMode;
}
/** Expand literal degree suffixes in the UI adapter, retaining source offsets for diagnostics. */
export function normalizeDegrees(
  source: string,
  angleMode: AngleMode,
): { text: string; positions: number[] } {
  let text = '';
  const positions: number[] = [];
  let previous = 0;
  for (const match of source.matchAll(
    /(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?°/g,
  )) {
    const start = match.index;
    const end = start + match[0].length;
    for (let i = previous; i < start; i++) {
      positions.push(i);
      text += source[i];
    }
    const literal = match[0].slice(0, -1);
    const replacement =
      angleMode === 'deg'
        ? literal + ' '
        : `(${literal}*${angleMode === 'rad' ? 'pi/180' : '10/9'})`;
    for (let i = 0; i < replacement.length; i++)
      positions.push(start + Math.min(i, match[0].length - 1));
    text += replacement;
    previous = end;
  }
  for (let i = previous; i < source.length; i++) {
    positions.push(i);
    text += source[i];
  }
  positions.push(source.length);
  return { text, positions };
}
export function calculate(
  expression: string,
  environment: Environment,
  options: ScientificOptions,
) {
  const normalized = normalizeDegrees(expression, options.angleMode);
  const result = execute(normalized.text, environment, options);
  if (!result.ok) {
    const { start, end } = result.error.range;
    return {
      ok: false as const,
      error: {
        ...result.error,
        range: {
          start: normalized.positions[start] ?? expression.length,
          end:
            end === start
              ? (normalized.positions[start] ?? expression.length)
              : Math.min(
                  expression.length,
                  (normalized.positions[end - 1] ?? expression.length - 1) + 1,
                ),
        },
      },
    };
  }
  const ast = parse(normalized.text, options);
  return {
    ok: true as const,
    environment: result.value.environment,
    calculation: {
      expression,
      expressionLatex: ast.ok ? toLatex(ast.value) : '',
      value: result.value.value,
    } satisfies Calculation,
  };
}
export function preview(
  expression: string,
  environment: Environment,
  options: ScientificOptions,
): Calculation | null {
  const parsed = parse(
    normalizeDegrees(expression, options.angleMode).text,
    options,
  );
  if (
    !parsed.ok ||
    parsed.value.kind === 'assignment' ||
    parsed.value.kind === 'definition'
  )
    return null;
  const result = calculate(expression, environment, options);
  return result.ok ? result.calculation : null;
}
export function displayResult(
  value: Value,
  options: ValueFormatOptions,
  fraction: boolean,
): { text: string; latex: string } {
  if (fraction && value.kind === 'number') {
    const r = toFraction(value);
    if (r.ok)
      return {
        text: `${r.value.numerator}/${r.value.denominator}`,
        latex: `\\frac{${r.value.numerator}}{${r.value.denominator}}`,
      };
  }
  const text = formatValue(value, options);
  const canonical = parse(
    formatValue(value, { ...options, locale: 'en', grouping: false }),
  );
  return {
    text,
    latex: canonical.ok ? toLatex(canonical.value) : toLatex(value),
  };
}
export function normalizeEnvironment(input: unknown): Environment {
  if (!input || typeof input !== 'object') return createEnvironment();
  const checked = execute('0', input as Environment, {
    complex: 'on',
    bitwise: true,
  });
  return checked.ok ? (input as Environment) : createEnvironment();
}
export function removeDefinition(
  environment: Environment,
  name: string,
): Environment {
  const variables = { ...environment.variables },
    functions = { ...environment.functions };
  delete variables[name];
  delete functions[name];
  return { ...environment, variables, functions };
}
export function definitionSource(
  environment: Environment,
  name: string,
): string {
  const fn = Object.hasOwn(environment.functions, name)
    ? environment.functions[name]
    : undefined;
  if (fn)
    return `${name}(${fn.parameters.join(', ')}) = ${print(fn.expression)}`;
  const result = execute(name, environment, { complex: 'on', bitwise: true });
  return result.ok && result.value.value
    ? `${name} = ${formatValue(result.value.value, { digits: 50 })}`
    : '';
}
export function errorKey(error: EngineError): MessageKey {
  return `scientific.error.${error.code}`;
}
export function constantMatches(
  id: string,
  name: string,
  symbol: string,
  query: string,
  filter: string,
): boolean {
  const math = ['pi', 'e', 'phi', 'tau'].includes(id);
  return (
    (filter === 'all' || (filter === 'math' ? math : !math)) &&
    `${id} ${name} ${symbol}`
      .toLocaleLowerCase()
      .includes(query.toLocaleLowerCase())
  );
}
export function resultLocale(
  locale: Locale,
  separator: 'auto' | 'comma' | 'point',
): string {
  return separator === 'comma' ? 'de' : separator === 'point' ? 'en' : locale;
}
