/** The fine grid consists of open, axis-aligned segments with butt caps. */
export function fillGridSegments(
  ctx: CanvasRenderingContext2D,
  xs: readonly number[],
  ys: readonly number[],
  width: number,
  height: number,
): void {
  const half = ctx.lineWidth / 2;
  ctx.beginPath();
  for (const x of xs) ctx.rect(x - half, 0, ctx.lineWidth, height);
  for (const y of ys) ctx.rect(0, y - half, width, ctx.lineWidth);
  ctx.save();
  ctx.fillStyle = ctx.strokeStyle;
  ctx.fill();
  ctx.restore();
}
