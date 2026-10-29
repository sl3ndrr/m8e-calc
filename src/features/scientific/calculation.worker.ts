import { isCalculationRequest } from './workerProtocol';
import { runCalculation } from './workerCalculation';
import type { CalculationResponse } from './workerProtocol';
const scope = self as unknown as {
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  postMessage: (data: CalculationResponse) => void;
};
scope.onmessage = ({ data }) => {
  if (!isCalculationRequest(data)) return;
  const { version, id, environmentRevision, executionRevision, inputRevision, kind } = data;
  scope.postMessage({ version, id, environmentRevision, executionRevision, inputRevision, kind, status: 'started' });
  scope.postMessage(runCalculation(data));
};
