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

/** Verify the candidate at its actual rendered size (font advances can round).
 * Keep a known fitting lower bound; only the reading floor may wrap. */
export function fitMeasuredDisplay(
  available: number,
  maximum: number,
  minimum: number,
  gutter: number,
  measureWidth: (size: number) => number,
): number {
  const candidate = displayFontSize(
    available,
    measureWidth(maximum),
    maximum,
    minimum,
    gutter,
  );
  const fits = (size: number) =>
    measureWidth(size) + 2 * gutter * size <= available - 1;
  if (candidate === minimum || fits(candidate)) return candidate;
  if (!fits(minimum)) return minimum;
  let lower = minimum;
  let upper = candidate;
  for (let step = 0; step < 10; step++) {
    const middle = (lower + upper) / 2;
    if (fits(middle)) lower = middle;
    else upper = middle;
  }
  return lower;
}
