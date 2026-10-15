import type { Bounds, PixelSize, Point } from './types.ts';

export function validateBounds(bounds: Bounds): void {
  const { xMin, xMax, yMin, yMax } = bounds;
  if (
    ![xMin, xMax, yMin, yMax, xMax - xMin, yMax - yMin].every(
      Number.isFinite,
    ) ||
    xMax <= xMin ||
    yMax <= yMin
  )
    throw new RangeError('Invalid graph bounds');
}
export function validatePixelSize(size: PixelSize): void {
  if (![size.width, size.height].every((x) => Number.isFinite(x) && x > 0))
    throw new RangeError('Invalid pixel size');
}
/** Keep endpoint rounding below a quarter CSS pixel, without a world-size cap. */
export function validateViewport(bounds: Bounds, size: PixelSize): void {
  validateBounds(bounds);
  validatePixelSize(size);
  for (const [min, max, pixels] of [
    [bounds.xMin, bounds.xMax, size.width],
    [bounds.yMin, bounds.yMax, size.height],
  ] as const) {
    const unit = (max - min) / pixels;
    const uncertainty = Math.max(Math.abs(min), Math.abs(max)) * Number.EPSILON;
    if (!Number.isFinite(unit) || unit <= 0 || uncertainty / unit > 0.25)
      throw new RangeError('Insufficient viewport precision');
  }
}
export function visible(point: Point, b: Bounds): boolean {
  return (
    Number.isFinite(point.x) &&
    Number.isFinite(point.y) &&
    point.x >= b.xMin &&
    point.x <= b.xMax &&
    point.y >= b.yMin &&
    point.y <= b.yMax
  );
}
/** Liang-Barsky: interpolate in world space, return only the visible chord. */
export function clip(a: Point, b: Point, box: Bounds): [Point, Point] | null {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  let lo = 0,
    hi = 1;
  const p = [-dx, dx, -dy, dy],
    q = [a.x - box.xMin, box.xMax - a.x, a.y - box.yMin, box.yMax - a.y];
  for (let i = 0; i < 4; i++) {
    const pi = p[i] ?? 0,
      qi = q[i] ?? 0;
    if (pi === 0) {
      if (qi < 0) return null;
    } else {
      const r = qi / pi;
      if (pi < 0) lo = Math.max(lo, r);
      else hi = Math.min(hi, r);
      if (lo > hi) return null;
    }
  }
  const point = (t: number): Point => {
    const p = t === 0 ? a : t === 1 ? b : { x: a.x + t * dx, y: a.y + t * dy };
    return {
      x: Math.max(box.xMin, Math.min(box.xMax, p.x)),
      y: Math.max(box.yMin, Math.min(box.yMax, p.y)),
    };
  };
  return [point(lo), point(hi)];
}
