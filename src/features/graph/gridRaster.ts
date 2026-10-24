import type { GraphColors } from './renderer';
export function drawFinePattern(
  ctx: CanvasRenderingContext2D,
  xs: number[],
  ys: number[],
  colors: GraphColors,
  width: number,
  height: number,
): boolean {
  const matrix = ctx.getTransform();
  const dpr = matrix.a;
  if (
    !Number.isFinite(dpr) ||
    dpr <= 0 ||
    // Larger physical strokes have engine-dependent coverage when repeated.
    // Retain the original native path above the verified subpixel range.
    dpr > 1.5 ||
    ctx.canvas.width * ctx.canvas.height > 16 * 1024 * 1024 ||
    matrix.b !== 0 ||
    matrix.c !== 0 ||
    matrix.d !== dpr ||
    matrix.e !== 0 ||
    matrix.f !== 0
  )
    return false;
  if (
    !(dpr > 0) ||
    !/^(#[0-9a-f]{3}(?:[0-9a-f]{3})?|rgb\([^/]+\))$/i.test(colors.background)
  )
    return false;
  const axis = (positions: number[], extent: number) => {
    if (positions.length < 2 || !positions.every(Number.isFinite)) return null;
    const values = positions.map((p) => p * dpr).sort((a, b) => a - b);
    const [first, second] = values;
    const last = values.at(-1);
    if (first === undefined || second === undefined || last === undefined)
      return null;
    const step = second - first;
    if (!(step > 1)) return null;
    if (values.some((p, i) => Math.abs(p - (first + i * step)) > 1e-7))
      return null;
    const half = 0.25 * dpr;
    if (first - step + half > 0 || last + step - half < extent * dpr)
      return null;
    for (let n = 1; n <= 256; n++) {
      const period = Math.round(step * n);
      if (period > 256) break;
      if (period > 0 && Math.abs(step * n - period) < 1e-7)
        return {
          step,
          period,
          phase: ((first % period) + period) % period,
        };
    }
    return null;
  };
  const x = axis(xs, width),
    y = axis(ys, height);
  if (!x || !y) return false;
  let layer = fineTiles.get(ctx);
  if (!layer) {
    const canvas = document.createElement('canvas'),
      context = canvas.getContext('2d', { alpha: false });
    if (!context) return false;
    const source = document.createElement('canvas'),
      sourceContext = source.getContext('2d', { alpha: false });
    if (!sourceContext) return false;
    layer = { canvas, context, source, sourceContext };
    fineTiles.set(ctx, layer);
  }
  if (layer.canvas.width !== x.period || layer.canvas.height !== y.period) {
    layer.canvas.width = x.period;
    layer.canvas.height = y.period;
  }
  if (
    layer.source.width !== ctx.canvas.width ||
    layer.source.height !== ctx.canvas.height
  ) {
    layer.source.width = ctx.canvas.width;
    layer.source.height = ctx.canvas.height;
  }
  // Retain the native backing dimensions: WebKit rasterizes a small source differently.
  // Clip work to one integral period; copy only that rasterized period.
  const tile = layer.sourceContext;
  tile.save();
  tile.setTransform(dpr, 0, 0, dpr, 0, 0);
  tile.beginPath();
  tile.rect(0, 0, x.period / dpr, y.period / dpr);
  tile.clip();
  tile.globalAlpha = 1;
  tile.fillStyle = colors.background;
  tile.fill();
  tile.beginPath();
  tile.strokeStyle = colors.grid;
  tile.lineWidth = 0.5;
  tile.globalAlpha = 0.4;
  for (const p of xs) {
    tile.moveTo(p, 0);
    tile.lineTo(p, height);
  }
  for (const p of ys) {
    tile.moveTo(0, p);
    tile.lineTo(width, p);
  }
  tile.stroke();
  tile.restore();
  layer.context.imageSmoothingEnabled = false;
  layer.context.drawImage(
    layer.source,
    0,
    0,
    x.period,
    y.period,
    0,
    0,
    x.period,
    y.period,
  );
  const pattern = ctx.createPattern(layer.canvas, 'repeat');
  if (!pattern) return false;
  pattern.setTransform({ a: 1 / dpr, b: 0, c: 0, d: 1 / dpr, e: 0, f: 0 });
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = 1;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
  return true;
}
const fineTiles = new WeakMap<
  CanvasRenderingContext2D,
  {
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
    source: HTMLCanvasElement;
    sourceContext: CanvasRenderingContext2D;
  }
>();
