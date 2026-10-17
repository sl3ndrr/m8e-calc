/** Corners are bottom-left, bottom-right, top-right, top-left. */
export function asymptoticDecider(values: readonly number[]): {
  readonly determinant: number;
  readonly u: number;
  readonly v: number;
} {
  // Scaling avoids overflow in products and preserves the determinant's sign.
  const scale = Math.max(...values.map(Math.abs));
  const [a = 0, b = 0, c = 0, d = 0] = values.map((x) =>
    scale ? x / scale : 0,
  );
  const mixed = a - b + c - d;
  return {
    determinant: a * c - b * d,
    u: mixed ? (a - d) / mixed : 0.5,
    v: mixed ? (a - b) / mixed : 0.5,
  };
}
