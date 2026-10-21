/** Keep parallel fine-grid segments in separate native paths for each axis. */
export function strokeGridAxes(
  ctx: CanvasRenderingContext2D,
  xs: readonly number[],
  ys: readonly number[],
  width: number,
  height: number,
): void {
  ctx.beginPath();
  for (const x of xs) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  ctx.stroke();
  ctx.beginPath();
  for (const y of ys) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();
}
