export const modes = [
  'simple',
  'scientific',
  'convert',
  'graph',
  'design',
] as const;
export type Mode = (typeof modes)[number];
export function parseHash(hash: string): Mode {
  return modes.find((mode) => hash === `#/${mode}`) ?? 'simple';
}
