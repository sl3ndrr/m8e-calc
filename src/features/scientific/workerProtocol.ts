import {
  deserializeValue,
  restoreEnvironment,
  type EngineError,
  type Environment,
  type SerializedValue,
} from '../../engine';
import type { Calculation, ScientificOptions } from './model';

export interface CalculationIdentity {
  version: 1;
  id: number;
  environmentRevision: number;
  executionRevision: number;
  inputRevision: number;
  kind: 'preview' | 'execute' | 'store';
}
export interface CalculationRequest extends CalculationIdentity {
  expression: string;
  environment: Environment;
  options: ScientificOptions;
  editingName: string | null;
}
export interface SerializedCalculation {
  expression: string;
  expressionLatex: string;
  value: SerializedValue | null;
}
export type CalculationResponse = CalculationIdentity & (
  | { status: 'started' }
  | { status: 'preview'; calculation: SerializedCalculation | null }
  | { status: 'success'; calculation: SerializedCalculation; environment: Environment }
  | { status: 'error'; error: EngineError }
  | { status: 'failure' }
);
const record = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);
const revision = (v: unknown): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
function identity(v: Record<string, unknown>): boolean {
  return v.version === 1 && revision(v.id) && v.id > 0 &&
    revision(v.environmentRevision) && revision(v.executionRevision) &&
    revision(v.inputRevision) && ['preview', 'execute', 'store'].includes(String(v.kind));
}
export function isCalculationRequest(v: unknown): v is CalculationRequest {
  if (!record(v) || !identity(v) || typeof v.expression !== 'string' ||
    !(v.editingName === null || typeof v.editingName === 'string') ||
    !record(v.options) || !restoreEnvironment(v.environment).ok) return false;
  const o = v.options;
  if (!Object.keys(o).every((key) => ['angleMode', 'complex', 'bitwise', 'programmer'].includes(key))) return false;
  if (!['deg', 'rad', 'grad'].includes(String(o.angleMode)) ||
    !['off', 'on'].includes(String(o.complex)) ||
    (o.bitwise !== undefined && typeof o.bitwise !== 'boolean')) return false;
  return o.programmer === undefined || (record(o.programmer) &&
    [8, 16, 32, 64].includes(Number(o.programmer.width)) &&
    typeof o.programmer.width === 'number' && typeof o.programmer.signed === 'boolean' &&
    ['wrap', 'error'].includes(String(o.programmer.overflow)));
}
function calculation(v: unknown): v is SerializedCalculation {
  if (!record(v) || typeof v.expression !== 'string' ||
    typeof v.expressionLatex !== 'string') return false;
  // Reuse the domain's bounded, neutral value validator; never evaluate a name.
  return v.value === null || restoreEnvironment({
    version: 1, variables: {}, functions: {}, history: [v.value],
  }).ok;
}
const errorCodes: readonly EngineError['code'][] = [
  'E_SYNTAX', 'E_INVALID_NUMBER', 'E_UNEXPECTED_TOKEN', 'E_MISSING_PAREN',
  'E_UNEXPECTED_PAREN', 'E_RESOURCE_LIMIT', 'E_INTERNAL', 'E_DIVISION_BY_ZERO',
  'E_DOMAIN', 'E_OVERFLOW', 'E_UNKNOWN_VARIABLE', 'E_UNKNOWN_FUNCTION',
  'E_ARGUMENT_COUNT', 'E_TYPE', 'E_CONVERGENCE', 'E_CYCLE', 'E_RESERVED_NAME', 'E_ENVIRONMENT',
];
function engineError(v: unknown): v is EngineError {
  if (!record(v) || !errorCodes.some((code) => code === v.code) ||
    !record(v.range) || !revision(v.range.start) || !revision(v.range.end) ||
    v.range.start > v.range.end) return false;
  if (v.details === undefined) return true;
  return record(v.details) && typeof v.details.errorEstimate === 'string' &&
    v.details.errorEstimate.length <= 10053 &&
    /^[+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(v.details.errorEstimate) &&
    revision(v.details.evaluations) && revision(v.details.intervals);
}
export function isCalculationResponse(v: unknown): v is CalculationResponse {
  if (!record(v) || !identity(v)) return false;
  if (v.status === 'failure' || v.status === 'started') return true;
  if (v.status === 'preview') return v.kind === 'preview' &&
    !Object.hasOwn(v, 'environment') && (v.calculation === null || calculation(v.calculation));
  if (v.status === 'error') return v.kind !== 'preview' && engineError(v.error);
  return v.status === 'success' && v.kind !== 'preview' &&
    calculation(v.calculation) && restoreEnvironment(v.environment).ok;
}
export function matchesCalculation(response: CalculationResponse, request: CalculationRequest): boolean {
  return response.id === request.id && response.kind === request.kind &&
    response.environmentRevision === request.environmentRevision &&
    response.executionRevision === request.executionRevision &&
    response.inputRevision === request.inputRevision &&
    (response.status !== 'success' && response.status !== 'preview' ||
      response.calculation === null || response.calculation.expression === request.expression) &&
    (response.status !== 'error' || response.error.range.end <= request.expression.length);
}
/** Only call after validating the response. Decimal instances never cross postMessage. */
export function restoreCalculation(saved: SerializedCalculation): Calculation {
  if (saved.value === null) return { ...saved, value: null };
  const value = deserializeValue(saved.value, { start: 0, end: 0 });
  if (!value.ok) throw new Error('Invalid scientific result');
  return { ...saved, value: value.value };
}
