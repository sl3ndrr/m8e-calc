import { serializeValue } from '../../engine/environment';
import { calculate, preview, type Calculation } from './model';
import type {
  CalculationRequest,
  CalculationResponse,
  SerializedCalculation,
} from './workerProtocol';

function serialize(calculation: Calculation): SerializedCalculation {
  return {
    ...calculation,
    value:
      calculation.value === null ? null : serializeValue(calculation.value),
  };
}
/** Runs exclusively inside the feature's worker (also directly testable without a browser). */
export function runCalculation(
  request: CalculationRequest,
): CalculationResponse {
  const {
    version,
    id,
    environmentRevision,
    executionRevision,
    inputRevision,
    kind,
  } = request;
  const identity = {
    version,
    id,
    environmentRevision,
    executionRevision,
    inputRevision,
    kind,
  };
  try {
    if (kind === 'preview') {
      const result = preview(
        request.expression,
        request.environment,
        request.options,
      );
      return {
        ...identity,
        status: 'preview',
        calculation: result ? serialize(result) : null,
      };
    }
    const result = calculate(
      request.expression,
      request.environment,
      request.options,
      request.editingName,
    );
    return result.ok
      ? {
          ...identity,
          status: 'success',
          calculation: serialize(result.calculation),
          environment: result.environment,
        }
      : { ...identity, status: 'error', error: result.error };
  } catch {
    return { ...identity, status: 'failure' };
  }
}
