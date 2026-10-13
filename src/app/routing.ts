export const modes = ['simple', 'scientific', 'convert', 'graph'] as const;
export type Mode = (typeof modes)[number];
export function parseHash(hash: string): Mode {
  return modes.find((mode) => hash === `#/${mode}`) ?? 'simple';
}
