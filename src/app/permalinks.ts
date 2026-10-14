import { compressLink, decompressLink } from '../shared/linkCodec';
import { isModeId, type ModeId } from '../shared/modes';
import {
  validateRestore,
  initialSimpleState,
  simpleReducer,
  type SimpleState,
  type RestorePayload,
} from '../features/simple/model';
import { restorePayload, type UnitPair } from '../features/convert/model';
import { restorePlot, type PlotSet } from '../features/graph/model';
import type { AngleMode } from '../engine';
export interface SimpleLink extends RestorePayload {
  phase: SimpleState['phase'];
  expression: string;
}
export interface ModeLinks {
  simple: SimpleLink;
  scientific: { expression: string; angleMode: AngleMode };
  convert: UnitPair & { value: string };
  graph: PlotSet;
}
export type Permalink = {
  [M in ModeId]: { mode: M; data: ModeLinks[M] };
}[ModeId];
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
export function validateModeLink<M extends ModeId>(
  mode: M,
  value: unknown,
): ModeLinks[M] | null {
  let valid: unknown = null;
  if (mode === 'simple' && record(value)) {
    const p = validateRestore(value);
    if (
      p &&
      typeof value.expression === 'string' &&
      value.expression.length <= 4000 &&
      ['entry', 'operator', 'result'].includes(String(value.phase))
    )
      valid = { ...p, expression: value.expression, phase: value.phase };
  } else if (mode === 'scientific' && record(value)) {
    if (
      typeof value.expression === 'string' &&
      value.expression.length <= 10000 &&
      ['deg', 'rad', 'grad'].includes(String(value.angleMode))
    )
      valid = { expression: value.expression, angleMode: value.angleMode };
  } else if (mode === 'convert') valid = restorePayload(value);
  else if (mode === 'graph') valid = restorePlot(value);
  return valid as ModeLinks[M] | null;
}
/** Invalid links are data, never exceptions. Unknown versions are not interpreted. */
export function decodePermalink(hash: string): Permalink | null {
  try {
    if (hash.length > 33000 || !hash.startsWith('#/')) return null;
    const [route, query = ''] = hash.slice(2).split('?');
    if (!isModeId(route)) return null;
    const params = new URLSearchParams(query);
    let value: unknown;
    if (params.has('s')) {
      if (params.get('v') !== '1') return null;
      value = JSON.parse(decompressLink(params.get('s') ?? ''));
    } else if (route === 'scientific' && params.has('e')) {
      value = {
        expression: params.get('e'),
        angleMode: params.get('a') ?? 'deg',
      };
    } else return null;
    const data = validateModeLink(route, value);
    return data ? ({ mode: route, data } as Permalink) : null;
  } catch {
    return null;
  }
}
export function encodePermalink<M extends ModeId>(
  mode: M,
  data: ModeLinks[M],
): string {
  const valid = validateModeLink(mode, data);
  if (!valid) throw new TypeError('Invalid mode state');
  const encoded = compressLink(JSON.stringify(valid));
  if (encoded.length > 32768) throw new RangeError('Link too large');
  return `#/${mode}?v=1&s=${encoded}`;
}
export function readModeLink<M extends ModeId>(mode: M): ModeLinks[M] | null {
  const link = decodePermalink(window.location.hash);
  return link?.mode === mode ? (link.data as ModeLinks[M]) : null;
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
  const p = readModeLink('simple'),
    initial = initialSimpleState();
  return p
    ? {
        ...simpleReducer(initial, { type: 'restore', payload: p }),
        phase: p.phase,
        expression: p.expression,
      }
    : initial;
}
