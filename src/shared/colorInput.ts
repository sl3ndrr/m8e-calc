import {
  argbFromHex,
  Hct,
  hexFromArgb,
} from '@material/material-color-utilities';
/** Preserve perceptual chroma/tone while the hue slider changes hue. */
export function colorWithHue(seed: string, hue: number): string {
  const color = Hct.fromInt(argbFromHex(seed));
  return hexFromArgb(
    Hct.from(
      hue,
      Math.max(color.chroma, 24),
      Math.max(20, Math.min(80, color.tone)),
    ).toInt(),
  );
}
export function colorHue(seed: string): number {
  return Hct.fromInt(argbFromHex(seed)).hue;
}
