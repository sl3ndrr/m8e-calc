import { sampleCurveDetailed, sampleImplicitCurveDetailed } from '../../graph';
import {
  isSampleRequest,
  type SampleRequest,
  type SampleResponse,
} from './workerProtocol';

/** Shared, testable worker dispatch. Budgets cover the entire 2D plot list. */
export function sampleRequest(
  request: SampleRequest,
  fallback = false,
): SampleResponse {
  if (!isSampleRequest(request))
    throw new RangeError('Invalid graph sampling request');
  const count = Math.max(
    1,
    request.curves.filter((c) => c.curve.kind === 'implicit').length,
  );
  let fallbackCount = 0;
  return {
    version: 2,
    id: request.id,
    bounds: request.bounds,
    size: request.size,
    milliseconds: 0,
    curves: request.curves.map((c) => {
      const base = {
        id: c.id,
        signature: c.signature,
        segments: [],
        evaluations: 0,
        truncated: false,
      };
      if (fallback && c.curve.kind === 'implicit')
        return { ...base, error: 'worker' as const };
      // No synchronous replay of a large list after a Worker failure.
      if (
        fallback &&
        (fallbackCount++ >= 4 || JSON.stringify(c.curve).length > 4096)
      )
        return { ...base, truncated: true, error: 'fallback-limit' as const };
      try {
        const result =
          c.curve.kind === 'implicit'
            ? sampleImplicitCurveDetailed(
                c.curve,
                request.bounds,
                request.size,
                {
                  ...request.budget,
                  maxCells: Math.floor(request.budget.maxCells / count),
                  maxEvaluations: Math.floor(
                    request.budget.maxEvaluations / count,
                  ),
                  maxSamples: Math.floor(request.budget.maxSamples / count),
                  maxSegments: Math.floor(request.budget.maxSegments / count),
                },
              )
            : sampleCurveDetailed(
                c.curve,
                request.bounds,
                fallback
                  ? {
                      width: Math.min(512, request.size.width),
                      height: Math.min(512, request.size.height),
                    }
                  : request.size,
              );
        return { ...base, ...result };
      } catch {
        return { ...base, error: 'invalid' as const };
      }
    }),
  };
}
