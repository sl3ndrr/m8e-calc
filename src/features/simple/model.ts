import { evaluateString, isPercentTerm } from '../../engine/evaluate';
import { numberValue } from '../../engine/numeric';
import { parse } from '../../engine/parser';
import type { EngineError } from '../../engine/types';

export type Operator = '+' | '-' | '*' | '/';
export type Unary = 'percent' | 'sqrt' | 'square' | 'reciprocal';
export type SimpleError = 'divisionByZero' | 'domain' | 'overflow' | 'invalid';
export interface Operand {
  value: string;
  expression: string;
}
export interface Calculation {
  id: number;
  input: string;
  result: string;
  payload: RestorePayload;
}
export interface RestorePayload {
  version: 1;
  entry: Operand;
  accumulator: string | null;
  operator: Operator | null;
  leftExpression?: string;
}
interface GroupFrame {
  phase: 'entry' | 'operator' | 'result' | 'error';
  entry: Operand;
  accumulator: string | null;
  operator: Operator | null;
  leftExpression: string | null;
  expression: string;
}
export interface SimpleState extends GroupFrame {
  groups: GroupFrame[];
  repeat: { operator: Operator; operand: string } | null;
  memory: string | null;
  error: SimpleError | null;
  sequence: number;
  completed: Calculation[];
}
export type SimpleAction =
  | { type: 'digit'; digit: string }
  | {
      type:
        'decimal' | 'sign' | 'backspace' | 'clearEntry' | 'clear' | 'equals';
    }
  | { type: 'parenthesis'; key: '(' | ')' }
  | { type: 'operator'; operator: Operator }
  | { type: 'unary'; operation: Unary }
  | { type: 'memory'; operation: 'MC' | 'MR' | 'M+' | 'M-' | 'MS' }
  | { type: 'paste'; value: string }
  | { type: 'restore'; payload: unknown }
  | { type: 'acknowledge'; through: number };

const operand = (value: string): Operand => ({ value, expression: value });
export function initialSimpleState(): SimpleState {
  return {
    phase: 'entry',
    entry: operand('0'),
    accumulator: null,
    operator: null,
    leftExpression: null,
    groups: [],
    repeat: null,
    memory: null,
    error: null,
    expression: '',
    sequence: 0,
    completed: [],
  };
}
function errorCode(error: EngineError): SimpleError {
  switch (error.code) {
    case 'E_DIVISION_BY_ZERO':
      return 'divisionByZero';
    case 'E_DOMAIN':
      return 'domain';
    case 'E_OVERFLOW':
      return 'overflow';
    default:
      return 'invalid';
  }
}
function calculate(
  expression: string,
): { value: string } | { error: SimpleError } {
  const result = evaluateString(expression, { percentMode: 'calculator' });
  return result.ok && result.value.kind === 'number'
    ? { value: result.value.value.toString() }
    : { error: result.ok ? 'invalid' : errorCode(result.error) };
}
function fail(state: SimpleState, error: SimpleError): SimpleState {
  return { ...state, phase: 'error', error, repeat: null };
}
function reset(state: SimpleState): SimpleState {
  return {
    ...initialSimpleState(),
    memory: state.memory,
    sequence: state.sequence,
    completed: state.completed,
  };
}
function inputExpression(
  state: Pick<GroupFrame, 'accumulator' | 'operator' | 'leftExpression'>,
  right: string,
): string {
  const left = state.leftExpression ?? state.accumulator;
  return state.operator ? `(${left}) ${state.operator} (${right})` : right;
}
function operandAmount(
  state: Pick<GroupFrame, 'accumulator' | 'operator'>,
  expression: string,
): ReturnType<typeof calculate> {
  if (
    state.accumulator !== null &&
    (state.operator === '+' || state.operator === '-') &&
    expression.includes('%')
  ) {
    const parsed = parse(expression);
    if (parsed.ok && isPercentTerm(parsed.value))
      return calculate(`(${state.accumulator}) * (${expression})`);
  }
  return calculate(expression);
}
function withEntry(state: SimpleState, entry: Operand): SimpleState {
  const left = state.leftExpression ?? state.accumulator;
  return {
    ...state,
    entry,
    phase: 'entry',
    error: null,
    repeat: null,
    expression: state.operator
      ? `${left} ${state.operator} ${entry.expression}`
      : entry.expression === entry.value
        ? ''
        : entry.expression,
  };
}
function editable(state: SimpleState): SimpleState {
  if (state.phase === 'error' || state.phase === 'result') return reset(state);
  if (state.phase === 'operator') return withEntry(state, operand('0'));
  return state;
}
function validNumber(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 100 &&
    /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value) &&
    numberValue(value).ok
  );
}
function isOperator(value: unknown): value is Operator {
  return value === '+' || value === '-' || value === '*' || value === '/';
}
/** Versioned history snapshots contain the editable operands before equals, never display rounding. */
export function validateRestore(payload: unknown): RestorePayload | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const p = payload as Record<string, unknown>;
  if (p.version !== 1 || typeof p.entry !== 'object' || p.entry === null)
    return null;
  const e = p.entry as Record<string, unknown>;
  if (
    !validNumber(e.value) ||
    typeof e.expression !== 'string' ||
    e.expression.length > 4000
  )
    return null;
  if (
    !(p.accumulator === null || validNumber(p.accumulator)) ||
    !(p.operator === null || isOperator(p.operator))
  )
    return null;
  if ((p.operator === null) !== (p.accumulator === null)) return null;
  if (p.leftExpression !== undefined) {
    if (
      typeof p.leftExpression !== 'string' ||
      p.leftExpression.length > 4000 ||
      p.accumulator === null
    )
      return null;
    const left = calculate(p.leftExpression);
    const accumulator = numberValue(p.accumulator);
    if (
      'error' in left ||
      !accumulator.ok ||
      left.value !== accumulator.value.value.toString()
    )
      return null;
  }
  const check = operandAmount(
    { accumulator: p.accumulator, operator: p.operator },
    e.expression,
  );
  const numeric = numberValue(e.value);
  if (
    'error' in check ||
    !numeric.ok ||
    check.value !== numeric.value.value.toString()
  )
    return null;
  return {
    version: 1,
    entry: { value: e.value, expression: e.expression },
    accumulator: p.accumulator,
    operator: p.operator,
    ...(p.leftExpression !== undefined && { leftExpression: p.leftExpression }),
  };
}
function binary(
  state: SimpleState,
  operator: Operator,
  left: string,
  right: Operand,
): SimpleState {
  const result = calculate(`(${left}) ${operator} (${right.expression})`);
  if ('error' in result) return fail(state, result.error);
  return { ...state, entry: operand(result.value), error: null };
}
export function simpleExpression(state: SimpleState): string {
  if (!state.groups.length) return state.expression;
  const prefix = state.groups
    .map((frame) => (frame.expression ? `${frame.expression} (` : '('))
    .join('');
  const active =
    state.expression || (state.phase === 'entry' ? state.entry.expression : '');
  return prefix + active;
}
function parenthesis(state: SimpleState, key: '(' | ')'): SimpleState {
  const parent = state.groups.at(-1);
  if (key === ')') {
    if (!parent || state.phase !== 'entry') return state;
    // Spaces mark typed parentheses for the display formatter.
    const expression = `( ${inputExpression(state, state.entry.expression)} )`;
    const result = operandAmount(parent, expression);
    if ('error' in result) return fail(state, result.error);
    return withEntry(
      { ...state, ...parent, groups: state.groups.slice(0, -1) },
      { value: result.value, expression },
    );
  }

  const next =
    state.phase === 'result' || state.phase === 'error' ? reset(state) : state;
  if (next.phase !== 'operator' && (next.entry.value !== '0' || next.expression))
    return fail(state, 'invalid');

  const { phase, entry, accumulator, operator, expression, leftExpression } =
    next;
  return {
    ...next,
    phase: 'operator',
    entry: operand('0'),
    accumulator: null,
    operator: null,
    leftExpression: null,
    expression: '',
    groups: [
      ...next.groups,
      { phase, entry, accumulator, operator, expression, leftExpression },
    ],
  };
}
export function simpleReducer(
  state: SimpleState,
  action: SimpleAction,
): SimpleState {
  switch (action.type) {
    case 'acknowledge':
      return {
        ...state,
        completed: state.completed.filter((c) => c.id > action.through),
      };
    case 'clear':
      return reset(state);
    case 'parenthesis':
      return parenthesis(state, action.key);
    case 'clearEntry':
      return withEntry(
        state.phase === 'error' ? reset(state) : state,
        operand('0'),
      );
    case 'digit': {
      if (!/^\d$/.test(action.digit)) return fail(state, 'invalid');
      const next = editable(state);
      const text =
        next.entry.expression === next.entry.value &&
        !/e/i.test(next.entry.value)
          ? next.entry.value
          : '0';
      if (text.replace(/\D/g, '').length >= 16) return next;
      const value =
        text === '0'
          ? action.digit
          : text === '-0'
            ? `-${action.digit}`
            : text + action.digit;
      return withEntry(next, operand(value));
    }
    case 'decimal': {
      const next = editable(state);
      const text =
        next.entry.expression === next.entry.value &&
        !/e/i.test(next.entry.value)
          ? next.entry.value
          : '0';
      return text.includes('.') ? next : withEntry(next, operand(text + '.'));
    }
    case 'backspace': {
      const parent = state.groups.at(-1);
      if (parent && state.phase === 'operator' && !state.operator)
        return { ...state, ...parent, groups: state.groups.slice(0, -1) };
      if (
        state.phase !== 'entry' ||
        state.entry.expression !== state.entry.value ||
        /e/i.test(state.entry.value)
      )
        return state;
      const value = state.entry.value.slice(0, -1);
      return withEntry(state, operand(!value || value === '-' ? '0' : value));
    }
    case 'sign': {
      if (state.phase === 'error') return state;
      const value = state.entry.value.startsWith('-')
        ? state.entry.value.slice(1)
        : `-${state.entry.value}`;
      const next = state.phase === 'result' ? reset(state) : state;
      // The operand value already reflects percent or unary transforms; negate that exact value.
      return withEntry(next, operand(value));
    }
    case 'paste': {
      if (
        !validNumber(action.value) ||
        (action.value.split(/e/i)[0] ?? '').replace(/\D/g, '').length > 16
      )
        return fail(state, 'invalid');
      const result = numberValue(action.value);
      return result.ok
        ? withEntry(editable(state), operand(result.value.value.toString()))
        : fail(state, 'invalid');
    }
    case 'restore': {
      const payload = validateRestore(action.payload);
      return payload
        ? withEntry(
            {
              ...reset(state),
              accumulator: payload.accumulator,
              operator: payload.operator,
              leftExpression: payload.leftExpression ?? null,
            },
            payload.entry,
          )
        : fail(state, 'invalid');
    }
    case 'memory': {
      if (action.operation === 'MC') return { ...state, memory: null };
      if (action.operation === 'MR')
        return state.memory === null
          ? state
          : withEntry(editable(state), operand(state.memory));
      if (state.phase === 'error') return state;
      if (action.operation === 'MS') {
        const result = calculate(state.entry.value);
        return 'error' in result
          ? fail(state, result.error)
          : { ...state, memory: result.value };
      }
      const result = calculate(
        `(${state.memory ?? '0'}) ${action.operation === 'M+' ? '+' : '-'} (${state.entry.value})`,
      );
      return 'error' in result
        ? fail(state, result.error)
        : { ...state, memory: result.value };
    }
    case 'unary': {
      if (state.phase === 'error') return state;
      const value = state.entry.value;
      const expression =
        action.operation === 'sqrt'
          ? `sqrt(${value})`
          : action.operation === 'square'
            ? `(${value})^2`
            : action.operation === 'reciprocal'
              ? `1/(${value})`
              : `(${value})%`;
      // For +/- the engine supplies the contextual percentage amount; keep the postfix for evaluation.
      const preview =
        action.operation === 'percent' &&
        state.operator &&
        state.accumulator !== null &&
        (state.operator === '+' || state.operator === '-')
          ? `(${state.accumulator}) * (${value})%`
          : expression;
      const result = calculate(preview);
      if ('error' in result) return fail(state, result.error);
      const next = state.phase === 'result' ? reset(state) : state;
      return withEntry(next, { value: result.value, expression });
    }
    case 'operator': {
      if (state.phase === 'error') return state;
      if (
        state.groups.length &&
        state.phase === 'operator' &&
        !state.operator &&
        action.operator === '-'
      )
        return withEntry(state, operand('-0'));
      let next = state;
      if (
        state.operator &&
        state.accumulator !== null &&
        state.phase === 'entry'
      ) {
        next = binary(state, state.operator, state.accumulator, state.entry);
        if (next.error) return next;
      }
      const accumulator = next.entry.value;
      const showSource =
        state.groups.length ||
        state.leftExpression !== null ||
        state.entry.expression.includes('( ');
      const leftExpression =
        showSource && state.phase === 'entry'
          ? inputExpression(state, state.entry.expression)
          : state.leftExpression;
      return {
        ...next,
        accumulator,
        leftExpression,
        operator: action.operator,
        phase: 'operator',
        repeat: null,
        expression: `${leftExpression ?? accumulator} ${action.operator}`,
      };
    }
    case 'equals': {
      if (state.phase === 'error' || state.groups.length) return state;
      const operator =
        state.operator ??
        (state.phase === 'result' ? state.repeat?.operator : null) ??
        null;
      const left = state.accumulator ?? state.entry.value;
      const right =
        state.phase === 'result' && state.repeat
          ? operand(state.repeat.operand)
          : state.entry;
      const input = inputExpression(
        { accumulator: left, operator, leftExpression: state.leftExpression },
        right.expression,
      );
      const result = calculate(input);
      if ('error' in result) return fail(state, result.error);
      // Repeated = reuses the evaluated percentage amount (100+10%== -> 120).
      const amount = operandAmount(
        { accumulator: left, operator },
        right.expression,
      );
      if ('error' in amount) return fail(state, amount.error);
      const id = state.sequence + 1;
      const payload: RestorePayload = {
        version: 1,
        entry: right,
        accumulator: operator ? left : null,
        operator,
        ...(state.leftExpression !== null && {
          leftExpression: state.leftExpression,
        }),
      };
      return {
        ...state,
        entry: operand(result.value),
        accumulator: null,
        operator: null,
        leftExpression: null,
        phase: 'result',
        expression: `${input} =`,
        repeat: operator ? { operator, operand: amount.value } : null,
        sequence: id,
        completed: [
          ...state.completed,
          { id, input, result: result.value, payload },
        ],
      };
    }
  }
}
