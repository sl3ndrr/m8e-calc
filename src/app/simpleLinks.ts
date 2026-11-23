import { MAX_DEPTH } from '../engine/numeric';
import {
  canOpenGroup,
  validateGroupFrame,
  validateRestore,
  initialSimpleState,
  type SimpleState,
} from '../features/simple/model';
import { readModeLink, type SimpleLink, type SimpleLinkV2 } from './permalinks';

function validateGroupedLink(p: Record<string, unknown>): SimpleLinkV2 | null {
  if (
    !Array.isArray(p.groups) ||
    !p.groups.length ||
    p.groups.length > MAX_DEPTH
  )
    return null;
  const active = validateGroupFrame(p.active);
  if (!active) return null;
  const groups: SimpleLinkV2['groups'] = [];
  for (const frame of p.groups) {
    const parent = validateGroupFrame(frame);
    if (!parent || !canOpenGroup(parent)) return null;
    groups.push(parent);
  }
  return { version: 2, active, groups };
}

export function validateSimpleLink(value: unknown): SimpleLink | null {
  if (!value || typeof value !== 'object') return null;
  const p = value as Record<string, unknown>;
  if (p.version === 2) return validateGroupedLink(p);
  const restored = validateRestore(p);
  return restored &&
    typeof p.expression === 'string' &&
    p.expression.length <= 4000 &&
    (p.phase === 'entry' || p.phase === 'operator' || p.phase === 'result')
    ? { ...restored, expression: p.expression, phase: p.phase }
    : null;
}
export function simpleLink(state: SimpleState): SimpleLink {
  const { entry, accumulator, operator, leftExpression, expression, phase } =
    state;
  if (state.groups.length) {
    const link = validateGroupedLink({
      active: {
        entry,
        accumulator,
        operator,
        leftExpression,
        expression,
        phase,
      },
      groups: state.groups,
    });
    if (!link) throw new RangeError('Invalid or oversized Simple group state');
    return link;
  }
  return {
    version: 1,
    entry,
    accumulator,
    operator,
    ...(leftExpression !== null && { leftExpression }),
    expression,
    phase,
  };
}
export function initialLinkedSimple(): SimpleState {
  const link = readModeLink('simple', validateSimpleLink);
  const initial = initialSimpleState();
  if (!link) return initial;
  if (link.version === 2)
    return { ...initial, ...link.active, groups: link.groups };
  return {
    ...initial,
    entry: link.entry,
    accumulator: link.accumulator,
    operator: link.operator,
    leftExpression: link.leftExpression ?? null,
    expression: link.expression,
    phase: link.phase,
  };
}
