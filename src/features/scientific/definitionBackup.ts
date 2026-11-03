import {
  deserializeValue,
  restoreEnvironment,
  serializeValue,
  type Environment,
} from '../../engine';
import { scientificStorageEnvelope } from './scientificPersistence';

export const DEFINITION_BACKUP_FORMAT = 'm8e-calc.definitions';
// 4 MiB bounds file decoding/parsing and leaves room for the independent history.
// The complete storage envelope is checked as well, with the actual current history.
export const MAX_DEFINITION_FILE_BYTES = 4 * 1024 * 1024;
export interface DefinitionBackup {
  readonly format: typeof DEFINITION_BACKUP_FORMAT;
  readonly version: 1;
  readonly variables: Environment['variables'];
  readonly functions: Environment['functions'];
}
export type BackupErrorCode =
  'invalid' | 'version' | 'tooLarge' | 'storageLimit';
export class DefinitionBackupError extends Error {
  constructor(readonly code: BackupErrorCode) {
    super(code);
  }
}
function invalid(): never {
  throw new DefinitionBackupError('invalid');
}
/** Only ordinary, own data properties; no accessors, symbols or foreign prototypes. */
function record(input: unknown): Record<string, unknown> {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(input))
  )
    return invalid();
  for (const key of Reflect.ownKeys(input)) {
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (
      typeof key !== 'string' ||
      !descriptor?.enumerable ||
      !('value' in descriptor)
    )
      return invalid();
  }
  return input as Record<string, unknown>;
}
function fields(
  input: unknown,
  keys: readonly string[],
): Record<string, unknown> {
  const value = record(input);
  if (
    Object.keys(value).length !== keys.length ||
    !keys.every((key) => Object.hasOwn(value, key))
  )
    return invalid();
  return value;
}
function array(input: unknown): unknown[] {
  if (
    !Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Array.prototype ||
    input.length > 2048 ||
    Reflect.ownKeys(input).length !== input.length + 1
  )
    return invalid();
  for (let i = 0; i < input.length; i++) {
    const descriptor = Object.getOwnPropertyDescriptor(input, String(i));
    if (!descriptor?.enumerable || !('value' in descriptor)) return invalid();
  }
  return input;
}
function valueShape(
  input: unknown,
  depth = 0,
  budget = { remaining: 2048 },
): void {
  if (depth > 128 || --budget.remaining < 0) invalid();
  const value = record(input);
  switch (value.kind) {
    case 'number':
      fields(value, ['kind', 'value']);
      break;
    case 'complex':
      fields(value, ['kind', 're', 'im']);
      break;
    case 'list':
      fields(value, ['kind', 'values']);
      for (const item of array(value.values))
        valueShape(item, depth + 1, budget);
      break;
    default:
      invalid();
  }
}
function astShape(
  input: unknown,
  depth = 1,
  budget = { remaining: 2048 },
): void {
  if (depth > 128 || --budget.remaining < 0) invalid();
  const node = record(input);
  const base = ['kind', 'range'];
  fields(node.range, ['start', 'end']);
  switch (node.kind) {
    case 'number':
      fields(node, [...base, 'literal']);
      break;
    case 'identifier':
      fields(node, [...base, 'name']);
      break;
    case 'group':
      fields(node, [...base, 'expression']);
      astShape(node.expression, depth + 1, budget);
      break;
    case 'unary':
    case 'postfix':
      fields(node, [...base, 'operator', 'operatorRange', 'operand']);
      fields(node.operatorRange, ['start', 'end']);
      astShape(node.operand, depth + 1, budget);
      break;
    case 'binary':
      fields(node, [
        ...base,
        'operator',
        'operatorRange',
        'left',
        'right',
        'implicit',
      ]);
      fields(node.operatorRange, ['start', 'end']);
      astShape(node.left, depth + 1, budget);
      astShape(node.right, depth + 1, budget);
      break;
    case 'call':
      fields(node, [...base, 'name', 'nameRange', 'args']);
      fields(node.nameRange, ['start', 'end']);
      for (const arg of array(node.args)) astShape(arg, depth + 1, budget);
      break;
    default:
      invalid();
  }
}
export function validateDefinitionBackup(input: unknown): DefinitionBackup {
  const data = fields(input, ['format', 'version', 'variables', 'functions']);
  if (data.format !== DEFINITION_BACKUP_FORMAT) invalid();
  if (data.version !== 1) throw new DefinitionBackupError('version');
  const variables = record(data.variables),
    functions = record(data.functions);
  if (Object.keys(variables).length + Object.keys(functions).length > 1000)
    invalid();
  for (const value of Object.values(variables)) valueShape(value);
  for (const fn of Object.values(functions)) {
    const definition = fields(fn, ['parameters', 'expression']);
    array(definition.parameters);
    astShape(definition.expression);
  }
  // Neutral validation checks names, values, ranges, parser limits and call cycles.
  // It never evaluates a formula, even one that would fail or be expensive to run.
  const checked = restoreEnvironment({
    version: 1,
    variables,
    functions,
    history: [],
  });
  if (!checked.ok) invalid();
  const backup: DefinitionBackup = {
    format: DEFINITION_BACKUP_FORMAT,
    version: 1,
    variables: checked.value.variables,
    functions: checked.value.functions,
  };
  if (
    new TextEncoder().encode(JSON.stringify(backup)).length >
    MAX_DEFINITION_FILE_BYTES
  )
    throw new DefinitionBackupError('tooLarge');
  // Detach file/preview objects from callers; confirmation validates again.
  return JSON.parse(JSON.stringify(backup)) as DefinitionBackup;
}
/** JSON.parse discards duplicate keys; reject them explicitly, including escaped aliases. */
function rejectDuplicateKeys(content: string): void {
  const stack: (Set<string> | null)[] = [];
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (c === '{') stack.push(new Set());
    else if (c === '[') stack.push(null);
    else if (c === '}' || c === ']') stack.pop();
    else if (c === '"') {
      const start = i++;
      for (; i < content.length; i++) {
        if (content[i] === '\\') i++;
        else if (content[i] === '"') break;
      }
      let next = i + 1;
      while (/\s/.test(content[next] ?? '') && next < content.length) next++;
      if (content[next] === ':') {
        const key: unknown = JSON.parse(content.slice(start, i + 1));
        const keys = stack.at(-1);
        if (typeof key !== 'string' || !keys || keys.has(key)) invalid();
        keys.add(key);
      }
    }
    // Each permitted list/call level adds an object and an array, plus the
    // envelope/function/range wrappers. Deeper JSON cannot satisfy engine limits.
    if (stack.length > 2 * 128 + 8) invalid();
  }
}
export function parseDefinitionBackup(content: string): DefinitionBackup {
  if (
    content.length > MAX_DEFINITION_FILE_BYTES ||
    new TextEncoder().encode(content).length > MAX_DEFINITION_FILE_BYTES
  )
    throw new DefinitionBackupError('tooLarge');
  let data: unknown;
  try {
    data = JSON.parse(content);
    rejectDuplicateKeys(content);
  } catch {
    return invalid();
  }
  return validateDefinitionBackup(data);
}
export function prepareDefinitionReplacement(
  input: unknown,
  current: Environment,
): { environment: Environment; raw: string } {
  const backup = validateDefinitionBackup(input);
  const environment: Environment = {
    version: 1,
    variables: backup.variables,
    functions: backup.functions,
    history: current.history,
  };
  if (!restoreEnvironment(environment).ok) invalid();
  try {
    return { environment, raw: scientificStorageEnvelope(environment) };
  } catch {
    throw new DefinitionBackupError('storageLimit');
  }
}
export function exportDefinitionBackup(environment: Environment): string {
  if (!restoreEnvironment(environment).ok) invalid();
  const variables: Record<string, Environment['variables'][string]> = {};
  for (const [name, saved] of Object.entries(environment.variables)) {
    const value = deserializeValue(saved, { start: 0, end: 0 });
    if (!value.ok) invalid();
    variables[name] = serializeValue(value.value);
  }
  const backup = validateDefinitionBackup({
    format: DEFINITION_BACKUP_FORMAT,
    version: 1,
    variables,
    functions: environment.functions,
  });
  // No export offered unless this session can import it with its preserved history.
  prepareDefinitionReplacement(backup, environment);
  return JSON.stringify(backup);
}
