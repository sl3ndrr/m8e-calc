export const modeIds = ['simple', 'scientific', 'convert', 'graph'] as const;
export type ModeId = (typeof modeIds)[number];
export function isModeId(value: unknown): value is ModeId {
  return modeIds.some((mode) => mode === value);
}
