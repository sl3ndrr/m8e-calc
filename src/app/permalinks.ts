import { compressLink, decompressLink } from '../shared/linkCodec';
import { isModeId, type ModeId } from '../shared/modes';
import type { SimpleState, RestorePayload } from '../features/simple/model';
import type { UnitPair } from '../features/convert/model';
import type { PlotSet } from '../features/graph/model';
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
export function validateScientificLink(value: unknown): ModeLinks['scientific'] | null {
  if (!value || typeof value !== 'object') return null;
  const p = value as Record<string, unknown>;
  return typeof p.expression === 'string' && p.expression.length <= 10000 &&
    (p.angleMode === 'deg' || p.angleMode === 'rad' || p.angleMode === 'grad')
    ? { expression: p.expression, angleMode: p.angleMode } : null;
}
/** Invalid links are data, never exceptions. Unknown versions are not interpreted. */
export function decodePermalink(hash: string): { mode: ModeId; data: unknown } | null {
  try {
    if (hash.length > 33000 || !hash.startsWith('#/')) return null;
    const [route, query = ''] = hash.slice(2).split('?');
    if (!isModeId(route)) return null;
    const params = new URLSearchParams(query);
    if (params.has('v') && params.get('v') !== '1') return null;
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
    const data = route === 'scientific' ? validateScientificLink(value) : value;
    return data == null ? null : { mode: route, data };
  } catch {
    return null;
  }
}
export function encodePermalink<M extends ModeId>(
  mode: M,
  data: ModeLinks[M],
): string {
  const encoded = compressLink(JSON.stringify(data));
  if (encoded.length > 32768) throw new RangeError('Link too large');
  return `#/${mode}?v=1&s=${encoded}`;
}
export function readModeLink<M extends ModeId>(
  mode: M, validate: (value: unknown) => ModeLinks[M] | null,
): ModeLinks[M] | null {
  const link = decodePermalink(window.location.hash);
  return link?.mode === mode ? validate(link.data) : null;
}
