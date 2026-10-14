import { sampleCurveDetailed } from '../../graph';
import type { SampleRequest, SampleResponse } from './workerProtocol';
const scope = self as unknown as { onmessage: ((event: MessageEvent<SampleRequest>)=>void) | null; postMessage: (data: SampleResponse)=>void };
scope.onmessage = ({data}) => {
  const start=performance.now();
  const curves=data.curves.map(c=>{
    const result=sampleCurveDetailed(c.curve,data.bounds,data.size);
    return {id:c.id,signature:c.signature,segments:result.segments,truncated:result.truncated};
  });
  scope.postMessage({...data,curves,milliseconds:performance.now()-start});
};
