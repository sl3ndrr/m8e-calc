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
    layer = { canvas, context };
    fineTiles.set(ctx, layer);
  }
  if (layer.canvas.width !== x.period || layer.canvas.height !== y.period) {
    layer.canvas.width = x.period;
    layer.canvas.height = y.period;
  }
  const tile = layer.context;
  tile.setTransform(dpr, 0, 0, dpr, 0, 0);
  tile.globalAlpha = 1;
  tile.fillStyle = colors.background;
  tile.fillRect(0, 0, x.period / dpr, y.period / dpr);
  tile.beginPath();
  tile.strokeStyle = colors.grid;
  tile.lineWidth = 0.5;
  tile.globalAlpha = 0.4;
  for (let p = x.phase - x.step; p <= x.period + 0.5 * dpr; p += x.step) {
    tile.moveTo(p / dpr, 0);
    tile.lineTo(p / dpr, y.period / dpr);
  }
  for (let p = y.phase - y.step; p <= y.period + 0.5 * dpr; p += y.step) {
    tile.moveTo(0, p / dpr);
    tile.lineTo(x.period / dpr, p / dpr);
  }
  tile.stroke();
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
  { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D }
>();
