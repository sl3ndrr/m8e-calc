import { isModeId, modeIds, type ModeId } from '../shared/modes';
export const modes = [...modeIds, 'design'] as const;
export type AppRoute = ModeId | 'design';
/** Empty hashes resume; explicit invalid links always fall back to simple. */
export function parseHash(hash: string, lastMode: ModeId = 'simple'): AppRoute {
  if (!hash || hash === '#' || hash === '#/') return lastMode;
  const candidate = hash.replace(/^#\//, '');
  return candidate === 'design' || isModeId(candidate) ? candidate : 'simple';
}
