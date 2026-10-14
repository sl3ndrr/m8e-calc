import { Viewport, type Point } from '../../graph';
import type { Trace } from './model';
import type { SampleResponse } from './workerProtocol';
export interface GraphColors {
  background: string;
  grid: string;
  axis: string;
  label: string;
  curves: string[];
}
export interface Marker extends Point {
  id: string;
  curveId: string;
  label: string;
  confidence: boolean;
}
export interface IntegralShade {
  curveId: string;
  from: number;
  to: number;
  segments: Point[][];
}
export interface CachedPath {
  id: string;
  signature: string;
  path: Path2D;
  length: number;
  viewport: Viewport;
  born: number;
  truncated: boolean;
}
export function cachePaths(
  result: SampleResponse,
  previous: Map<string, CachedPath>,
  now: number,
): Map<string, CachedPath> {
  const viewport = new Viewport(result.bounds, result.size);
  return new Map(
    result.curves.map((c) => {
      const path = new Path2D();
      let length = 0;
      for (const segment of c.segments) {
        let last: Point | undefined;
        for (const p of segment) {
          const s = viewport.worldToScreen(p);
          if (last) {
            path.lineTo(s.x, s.y);
            length += Math.hypot(s.x - last.x, s.y - last.y);
          } else path.moveTo(s.x, s.y);
          last = s;
        }
      }
      const old = previous.get(c.id);
      return [
        c.id,
        {
          id: c.id,
          signature: c.signature,
          path,
          length,
          viewport,
          born: old?.born ?? now,
          truncated: c.truncated,
        },
      ];
    }),
  );
}
export interface DrawOptions {
  viewport: Viewport;
  colors: GraphColors;
  paths: Map<string, CachedPath>;
  rows: { id: string; color: number }[];
  markers: readonly Marker[];
  trace: Trace | null;
  shade: IntegralShade | null;
  fine: boolean;
  pi: boolean;
  now: number;
  animate: boolean;
  transparent?: boolean;
  fontSize: number;
  revealDuration: number;
}
export function drawGraph(
  ctx: CanvasRenderingContext2D,
  options: DrawOptions,
): boolean {
  const { viewport: v, colors: c } = options,
    { width: w, height: h } = v.pixelSize;
  if (options.transparent) ctx.clearRect(0, 0, w, h);
  if (!options.transparent) {
    ctx.fillStyle = c.background;
    ctx.fillRect(0, 0, w, h);
  }
  const xt = v.ticks('x', { spacing: options.fontSize * 6, pi: options.pi }),
    yt = v.ticks('y', { spacing: options.fontSize * 4 });
  const origin = v.worldToScreen({ x: 0, y: 0 });
  const line = (x1: number, y1: number, x2: number, y2: number) => {
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
  };
  function grid(minor: boolean): void {
    ctx.beginPath();
    ctx.strokeStyle = c.grid;
    ctx.lineWidth = minor ? 0.5 : 1;
    ctx.globalAlpha = minor ? 0.4 : 0.8;
    for (const [ticks, axis] of [
      [xt, 'x'],
      [yt, 'y'],
    ] as const) {
      const step = (ticks[1]?.value ?? 0) - (ticks[0]?.value ?? 0);
      const values =
        minor && step > 0
          ? v
              .ticks(axis, {
                spacing:
                  (axis === 'x' ? options.fontSize * 6 : options.fontSize * 4) /
                  5,
              })
              .map((t) => t.value)
          : ticks.map((t) => t.value);
      for (const value of values) {
        const p = v.worldToScreen(
          axis === 'x' ? { x: value, y: 0 } : { x: 0, y: value },
        );
        if (axis === 'x') line(p.x, 0, p.x, h);
        else line(0, p.y, w, p.y);
      }
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (options.fine) grid(true);
  grid(false);
  ctx.beginPath();
  ctx.strokeStyle = c.axis;
  ctx.lineWidth = 1.5;
  if (origin.x >= 0 && origin.x <= w) line(origin.x, 0, origin.x, h);
  if (origin.y >= 0 && origin.y <= h) line(0, origin.y, w, origin.y);
  ctx.stroke();
  ctx.fillStyle = c.label;
  ctx.font = `${options.fontSize}px 'Roboto Mono', monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const tickY = Math.max(6, Math.min(h - options.fontSize * 1.6, origin.y + 8));
  for (const tick of xt) {
    const p = v.worldToScreen({ x: tick.value, y: 0 });
    if (p.x < 24 || p.x > w - 24) continue;
    ctx.fillText(tick.label, p.x, tickY);
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const tickX = Math.max(8, Math.min(w - options.fontSize * 5, origin.x + 10));
  for (const tick of yt) {
    if (tick.value === 0) continue;
    const p = v.worldToScreen({ x: 0, y: tick.value });
    if (p.y > options.fontSize && p.y < h - options.fontSize)
      ctx.fillText(tick.label, tickX, p.y);
  }
  if (options.shade) {
    ctx.save();
    ctx.fillStyle =
      c.curves[
        options.rows.find((r) => r.id === options.shade?.curveId)?.color ?? 0
      ] ?? c.axis;
    ctx.globalAlpha = 0.2;
    for (const seg of options.shade.segments) {
      const first = seg[0],
        last = seg.at(-1);
      if (!first || !last) continue;
      ctx.beginPath();
      const a = v.worldToScreen({ x: first.x, y: 0 });
      ctx.moveTo(a.x, a.y);
      for (const p of seg) {
        const s = v.worldToScreen(p);
        ctx.lineTo(s.x, s.y);
      }
      const b = v.worldToScreen({ x: last.x, y: 0 });
      ctx.lineTo(b.x, b.y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  let active = false;
  for (const row of options.rows) {
    const cache = options.paths.get(row.id);
    if (!cache) continue;
    const base = cache.viewport,
      b = base.bounds,
      start = v.worldToScreen({ x: b.xMin, y: b.yMax }),
      end = v.worldToScreen({ x: b.xMax, y: b.yMin });
    const sx = (end.x - start.x) / base.pixelSize.width,
      sy = (end.y - start.y) / base.pixelSize.height;
    const progress = options.animate
      ? Math.min(
          1,
          (options.now - cache.born) / Math.max(1, options.revealDuration),
        )
      : 1;
    active ||= progress < 1;
    ctx.save();
    ctx.translate(start.x, start.y);
    ctx.scale(sx, sy);
    ctx.strokeStyle = c.curves[row.color] ?? c.axis;
    ctx.lineWidth = Math.max(2.5, options.fontSize / 6) / Math.sqrt(sx * sy);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (progress < 1) {
      ctx.setLineDash([cache.length, cache.length]);
      ctx.lineDashOffset = cache.length * (1 - progress);
    }
    ctx.stroke(cache.path);
    ctx.restore();
  }
  for (const marker of options.markers) {
    const p = v.worldToScreen(marker);
    ctx.beginPath();
    ctx.fillStyle = c.background;
    ctx.strokeStyle =
      c.curves[options.rows.find((r) => r.id === marker.curveId)?.color ?? 0] ??
      c.axis;
    ctx.lineWidth = 2;
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  if (options.trace) {
    const p = v.worldToScreen(options.trace.point);
    ctx.strokeStyle = c.axis;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    line(p.x, 0, p.x, h);
    line(0, p.y, w, p.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = c.label;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
    ctx.fill();
  }
  return active;
}
