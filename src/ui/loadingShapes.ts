export type Point = readonly [number, number];
/** Equal topology lets every coordinate of the SVG path interpolate continuously. */
export const loadingShapes: readonly (readonly Point[])[] = Array.from(
  { length: 5 },
  (_, shape) =>
    Array.from({ length: 32 }, (_, index): Point => {
      const angle = (index * Math.PI) / 16;
      const radius =
        shape === 0
          ? 34
          : shape === 1
            ? 29 + 7 * Math.cos(4 * angle)
            : shape === 2
              ? 28 + 10 * Math.cos(5 * angle)
              : shape === 3
                ? 30 + 6 * Math.cos(8 * angle)
                : 34 /
                  Math.pow(
                    Math.pow(Math.abs(Math.cos(angle)), 4) +
                      Math.pow(Math.abs(Math.sin(angle)), 4),
                    0.25,
                  );
      return [50 + radius * Math.cos(angle), 50 + radius * Math.sin(angle)];
    }),
);
export function loadingPath(phase: number): string {
  const whole = Math.floor(phase);
  const fraction = phase - whole;
  const first =
    loadingShapes[
      ((whole % loadingShapes.length) + loadingShapes.length) %
        loadingShapes.length
    ];
  const next =
    loadingShapes[
      (((whole + 1) % loadingShapes.length) + loadingShapes.length) %
        loadingShapes.length
    ];
  if (!first || !next) return '';
  const points = first.map(([x, y], i): Point => {
    const p = next[i] ?? [x, y];
    return [x + (p[0] - x) * fraction, y + (p[1] - y) * fraction];
  });
  const midpoint = (a: Point, b: Point) =>
    `${((a[0] + b[0]) / 2).toFixed(3)} ${((a[1] + b[1]) / 2).toFixed(3)}`;
  const start = points[0];
  const last = points.at(-1);
  if (!start || !last) return '';
  return (
    `M ${midpoint(last, start)} ` +
    points
      .map(
        (p, i) =>
          `Q ${p[0].toFixed(3)} ${p[1].toFixed(3)} ${midpoint(p, points[(i + 1) % points.length] ?? start)}`,
      )
      .join(' ') +
    ' Z'
  );
}
