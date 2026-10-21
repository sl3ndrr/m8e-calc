interface GridClip {
  left: number;
  right: number;
  top: number;
  bottom: number;
  path: Path2D;
}
interface GridClipCache {
  width: number;
  height: number;
  ratio: number;
  tilePixels: number;
  clips: GridClip[];
}
const gridClips = new WeakMap<CanvasRenderingContext2D, GridClipCache>();
/** Native strokes only; every clip meets on a device-pixel edge. */
export function strokeClippedGrid(
  ctx: CanvasRenderingContext2D,
  xs: readonly number[],
  ys: readonly number[],
  width: number,
  height: number,
  tilePixels = 1024,
): boolean {
  if (!Number.isSafeInteger(tilePixels) || tilePixels <= 0)
    throw new RangeError('Grid tile size must be a positive integer');
  const matrix = ctx.getTransform(),
    ratio = matrix.a;
  if (
    !Number.isFinite(ratio) ||
    ratio <= 0 ||
    matrix.b !== 0 ||
    matrix.c !== 0 ||
    matrix.d !== ratio ||
    matrix.e !== 0 ||
    matrix.f !== 0
  ) {
    ctx.beginPath();
    for (const x of xs) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (const y of ys) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
    return false;
  }
  let cached = gridClips.get(ctx);
  if (
    !cached ||
    cached.width !== width ||
    cached.height !== height ||
    cached.ratio !== ratio ||
    cached.tilePixels !== tilePixels
  ) {
    const clips: GridClip[] = [];
    const pixelsWide = Math.ceil(width * ratio),
      pixelsHigh = Math.ceil(height * ratio);
    for (let py = 0; py < pixelsHigh; py += tilePixels) {
      for (let px = 0; px < pixelsWide; px += tilePixels) {
        const left = px / ratio,
          top = py / ratio,
          right = Math.min(pixelsWide, px + tilePixels) / ratio,
          bottom = Math.min(pixelsHigh, py + tilePixels) / ratio;
        const path = new Path2D();
        path.rect(left, top, right - left, bottom - top);
        clips.push({ left, top, right, bottom, path });
      }
    }
    cached = { width, height, ratio, tilePixels, clips };
    gridClips.set(ctx, cached);
  }
  const padding = ctx.lineWidth / 2 + 1 / ratio;
  for (const clip of cached.clips) {
    ctx.save();
    ctx.clip(clip.path);
    ctx.beginPath();
    for (const x of xs)
      if (x >= clip.left - padding && x <= clip.right + padding) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
    for (const y of ys)
      if (y >= clip.top - padding && y <= clip.bottom + padding) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
    ctx.stroke();
    ctx.restore();
  }
  return true;
}
