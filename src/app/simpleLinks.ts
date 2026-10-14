import { validateRestore, initialSimpleState, simpleReducer, type SimpleState } from '../features/simple/model';
import { readModeLink, type SimpleLink } from './permalinks';
export function validateSimpleLink(value: unknown): SimpleLink | null {
  if (!value || typeof value !== 'object') return null;
  const p = value as Record<string, unknown>;
  const restored = validateRestore(p);
  return restored && typeof p.expression === 'string' && p.expression.length <= 4000 &&
    (p.phase === 'entry' || p.phase === 'operator' || p.phase === 'result')
    ? { ...restored, expression: p.expression, phase: p.phase } : null;
}
export function simpleLink(state: SimpleState): SimpleLink {
  return {
    version: 1,
    entry: state.entry,
    accumulator: state.accumulator,
    operator: state.operator,
    expression: state.expression,
    phase: state.phase,
  };
}
export function initialLinkedSimple(): SimpleState {
  const p = readModeLink('simple', validateSimpleLink),
    initial = initialSimpleState();
  return p
    ? {
        ...simpleReducer(initial, { type: 'restore', payload: p }),
        phase: p.phase,
        expression: p.expression,
      }
    : initial;
}

