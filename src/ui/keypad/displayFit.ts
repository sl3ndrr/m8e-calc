/** Fit actual font advances plus both ink gutters; never shrink below the reading floor. */
export function displayFontSize(
  available: number,
  measuredWidth: number,
  maximum: number,
  minimum: number,
  gutter: number,
): number {
  if (available <= 0 || measuredWidth <= 0 || maximum <= 0) return maximum;
  return Math.max(
    minimum,
    Math.min(maximum, (available - 1) / (measuredWidth / maximum + 2 * gutter)),
  );
}
