import { sampleRequest } from './sampling';
import { isSampleRequest, type SampleResponse } from './workerProtocol';
const scope = self as unknown as {
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  postMessage: (data: SampleResponse) => void;
};
scope.onmessage = ({ data }) => {
  if (!isSampleRequest(data)) return;
  const start = performance.now();
  const result = sampleRequest(data);
  scope.postMessage({ ...result, milliseconds: performance.now() - start });
};
