import type { MessageKey } from '../../shared/i18n/extended';
import type { SampleResponse } from './workerProtocol';

export function sampleMessageKeys(
  sample: SampleResponse['curves'][number],
): MessageKey[] {
  if (sample.error)
    return [
      sample.error === 'worker'
        ? 'graph.workerRequired'
        : sample.error === 'timeout'
          ? 'graph.samplingTimeout'
          : sample.error === 'fallback-limit'
            ? 'graph.fallbackLimit'
            : 'graph.samplingInvalid',
    ];
  const d = sample.diagnostics;
  const keys: MessageKey[] = [];
  if (sample.truncated) keys.push('graph.samplingBudget');
  if (!d) return keys;
  keys.push(...d.limits.map((limit) => `graph.limit.${limit}` as MessageKey));
  if (d.status === 'constant-zero') keys.push('graph.implicitZero');
  else if (d.status === 'undefined') keys.push('graph.implicitUndefined');
  else if (d.status === 'empty') keys.push('graph.implicitEmpty');
  if (
    d.unresolvedCells ||
    d.zeroCells ||
    d.rejectedEdges ||
    d.nonFiniteEvaluations ||
    d.status === 'unresolved'
  )
    keys.push('graph.implicitGaps');
  return keys;
}
