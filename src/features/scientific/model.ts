import {
  createEnvironment,
  deserializeValue,
  execute,
  formatValue,
  parse,
  print,
  restoreEnvironment,
  toFraction,
  toLatex,
  valueSource,
  type AngleMode,
  type EvaluationContext,
  type ComplexMode,
  type EngineError,
  type Environment,
  type Value,
  type ValueFormatOptions,
} from '../../engine';
import type { Locale, MessageKey } from '../../shared/i18n/extended';
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
  editingName: string | null = null,
) {
  // Only the untouched source opened from a definition uses neutral value semantics.
  // Any user edit follows the ordinary active-context validation path (WP-01).
  const unchanged =
    editingName !== null &&
    expression === definitionSource(environment, editingName);
  if (unchanged && Object.hasOwn(environment.functions, editingName)) {
    const checked = restoreEnvironment(environment);
    if (!checked.ok) return { ok: false as const, error: checked.error };
    const ast = parse(expression, { bitwise: true });
    if (!ast.ok) return { ok: false as const, error: ast.error };
    // Confirming a delayed definition must not execute its body or change its AST.
    return {
      ok: true as const,
      environment: checked.value,
      calculation: {
        expression,
        expressionLatex: toLatex(ast.value),
        value: null,
      } satisfies Calculation,
    };
  }
  if (unchanged) options = { ...options, complex: 'on', bitwise: false };
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
/** Compatibility fallback for ephemeral state; persistence must inspect restoreEnvironment's Result. */
export function normalizeEnvironment(input: unknown): Environment {
  const checked = restoreEnvironment(input);
  return checked.ok ? checked.value : createEnvironment();
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
/** Pure presentation and executable source are intentionally separate. */
export function definitionDetails(
  environment: Environment,
  name: string,
  format: ValueFormatOptions = {},
): { text: string; source: string | null } {
  const fn = Object.hasOwn(environment.functions, name)
    ? environment.functions[name]
    : undefined;
  if (fn) {
    const source = `${name}(${fn.parameters.join(', ')}) = ${print(fn.expression)}`;
    return { text: source, source };
  }
  const saved = Object.hasOwn(environment.variables, name)
    ? environment.variables[name]
    : undefined;
  const result = saved ? deserializeValue(saved, { start: 0, end: 0 }) : null;
  if (!result?.ok) return { text: '', source: null };
  const source = valueSource(result.value);
  return {
    text: `${name} = ${formatValue(result.value, format)}`,
    source: source === null ? null : `${name} = ${source}`,
  };
}
export function definitionSource(
  environment: Environment,
  name: string,
): string | null {
  return definitionDetails(environment, name).source;
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
