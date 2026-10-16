import { isModeId, modeIds, type ModeId } from '../shared/modes';
export const modes = [...modeIds] as const;
export type AppRoute = ModeId | 'design';
/** Empty hashes resume; explicit invalid links always fall back to simple. */
export function parseHash(hash: string, lastMode: ModeId = 'simple', internalLab = typeof __INTERNAL_DESIGN_LAB__ !== 'undefined' && __INTERNAL_DESIGN_LAB__): AppRoute {
  if (!hash || hash === '#' || hash === '#/') return lastMode;
  const candidate = hash.replace(/^#\//, '').split('?')[0];
  return (internalLab && candidate === 'design') || isModeId(candidate) ? candidate : 'simple';
}
