import { validateBounds, validatePixelSize } from './geometry.ts';
import { compile } from './compile.ts';
import { angleScale } from '../engine/floatFunctions.ts';
import type {
  Bounds,
  Curve,
  PixelSize,
  Point,
  Tick,
  TickOptions,
} from './types.ts';

function aspect(bounds: Bounds, size: PixelSize): Bounds {
  const centerX = bounds.xMin + (bounds.xMax - bounds.xMin) / 2,
    centerY = bounds.yMin + (bounds.yMax - bounds.yMin) / 2;
  const unit = Math.max(
    (bounds.xMax - bounds.xMin) / size.width,
    (bounds.yMax - bounds.yMin) / size.height,
  );
  return {
    xMin: centerX - (unit * size.width) / 2,
    xMax: centerX + (unit * size.width) / 2,
    yMin: centerY - (unit * size.height) / 2,
    yMax: centerY + (unit * size.height) / 2,
  };
}
function niceStep(raw: number): number {
  const power = 10 ** Math.floor(Math.log10(raw)),
    fraction = raw / power;
  return (
    (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * power
  );
}
function piLabel(value: number): string {
  const sign = value < 0 ? '−' : '',
    n = Math.round(Math.abs(value / Math.PI) * 8);
  if (n === 0) return '0';
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(n, 8),
    numerator = n / divisor,
    denominator = 8 / divisor;
  return `${sign}${numerator === 1 ? '' : numerator}π${denominator === 1 ? '' : `/${denominator}`}`;
}
export class Viewport {
  readonly bounds: Bounds;
  readonly pixelSize: PixelSize;
  readonly lockAspect: boolean;
  constructor(
    bounds: Bounds,
    pixelSize: PixelSize,
    options: { readonly lockAspect?: boolean } = {},
  ) {
    validateBounds(bounds);
    validatePixelSize(pixelSize);
    this.lockAspect = options.lockAspect ?? false;
    const adjusted = this.lockAspect
      ? aspect(bounds, pixelSize)
      : { ...bounds };
    validateBounds(adjusted);
    this.bounds = Object.freeze(adjusted);
    this.pixelSize = Object.freeze({ ...pixelSize });
    Object.freeze(this);
  }
  worldToScreen(p: Point): Point {
    const b = this.bounds;
    return {
      x: ((p.x - b.xMin) / (b.xMax - b.xMin)) * this.pixelSize.width,
      y: ((b.yMax - p.y) / (b.yMax - b.yMin)) * this.pixelSize.height,
    };
  }
  screenToWorld(p: Point): Point {
    const b = this.bounds;
    return {
      x: b.xMin + (p.x / this.pixelSize.width) * (b.xMax - b.xMin),
      y: b.yMax - (p.y / this.pixelSize.height) * (b.yMax - b.yMin),
    };
  }
  zoom(factor: number, anchor: Point): Viewport {
    if (
      !Number.isFinite(factor) ||
      factor <= 0 ||
      ![anchor.x, anchor.y].every(Number.isFinite)
    )
      throw new RangeError('Invalid zoom');
    const p = this.screenToWorld(anchor),
      b = this.bounds;
    return new Viewport(
      {
        xMin: p.x + (b.xMin - p.x) / factor,
        xMax: p.x + (b.xMax - p.x) / factor,
        yMin: p.y + (b.yMin - p.y) / factor,
        yMax: p.y + (b.yMax - p.y) / factor,
      },
      this.pixelSize,
      { lockAspect: this.lockAspect },
    );
  }
  pan(dx: number, dy: number): Viewport {
    if (![dx, dy].every(Number.isFinite)) throw new RangeError('Invalid pan');
    const b = this.bounds,
      x = (-dx / this.pixelSize.width) * (b.xMax - b.xMin),
      y = (dy / this.pixelSize.height) * (b.yMax - b.yMin);
    return new Viewport(
      {
        xMin: b.xMin + x,
        xMax: b.xMax + x,
        yMin: b.yMin + y,
        yMax: b.yMax + y,
      },
      this.pixelSize,
      { lockAspect: this.lockAspect },
    );
  }
  resize(size: PixelSize): Viewport {
    return new Viewport(this.bounds, size, { lockAspect: this.lockAspect });
  }
  withAspectLock(lockAspect: boolean): Viewport {
    return new Viewport(this.bounds, this.pixelSize, { lockAspect });
  }
  toJSON(): { bounds: Bounds; pixelSize: PixelSize; lockAspect: boolean } {
    return {
      bounds: { ...this.bounds },
      pixelSize: { ...this.pixelSize },
      lockAspect: this.lockAspect,
    };
  }
  ticks(axis: 'x' | 'y', options: TickOptions = {}): Tick[] {
    const spacing = options.spacing ?? 80;
    if (!Number.isFinite(spacing) || spacing <= 0)
      throw new RangeError('Invalid tick spacing');
    const b = this.bounds,
      min = axis === 'x' ? b.xMin : b.yMin,
      max = axis === 'x' ? b.xMax : b.yMax,
      pixels = axis === 'x' ? this.pixelSize.width : this.pixelSize.height;
    const raw = (max - min) * Math.max(spacing / pixels, 1 / 1000);
    let step = niceStep(raw);
    if (options.pi) {
      const ratios = [0.125, 0.25, 0.5, 1, 2, 5, 10];
      step =
        (ratios.find((r) => r * Math.PI >= raw) ?? niceStep(raw / Math.PI)) *
        Math.PI;
    }
    if (!Number.isFinite(step) || step <= 0) return [];
    const first = Math.ceil(min / step - 1e-12),
      last = Math.floor(max / step + 1e-12);
    if (
      !Number.isFinite(first) ||
      !Number.isFinite(last) ||
      Math.abs(first) > Number.MAX_SAFE_INTEGER
    )
      return [];
    const ticks: Tick[] = [];
    for (let i = 0; i <= Math.min(1000, last - first); i++) {
      const value = (first + i) * step,
        normalized = Number(value.toPrecision(12));
      ticks.push({
        value: Object.is(value, -0) ? 0 : value,
        label: options.pi
          ? piLabel(value)
          : String(Object.is(normalized, -0) ? 0 : normalized),
      });
    }
    return ticks;
  }
  fitToCurves(curves: readonly Curve[]): Viewport {
    const xs: number[] = [],
      ys: number[] = [];
    for (const curve of curves) {
      const options = { params: curve.params, angleMode: curve.angleMode };
      let from = this.bounds.xMin,
        to = this.bounds.xMax,
        point: (t: number) => Point;
      if (curve.kind === 'parametric') {
        const x = compile(curve.x, { ...options, variables: ['t'] }),
          y = compile(curve.y, { ...options, variables: ['t'] });
        [from, to] = curve.range;
        point = (t) => ({ x: x(t), y: y(t) });
      } else if (curve.kind === 'polar') {
        const f = compile(curve.expression, {
            ...options,
            variables: ['theta'],
          }),
          scale = angleScale(curve.angleMode ?? 'rad');
        [from, to] = curve.range;
        point = (t) => ({
          x: f(t) * Math.cos(t * scale),
          y: f(t) * Math.sin(t * scale),
        });
      } else if (curve.kind === 'vertical') {
        const x = compile(curve.expression, { ...options, variables: [] })();
        if (Number.isFinite(x)) {
          xs.push(x);
          ys.push(this.bounds.yMin, this.bounds.yMax);
        }
        continue;
      } else {
        const f = compile(curve.expression, { ...options, variables: ['x'] });
        point = (t) => ({ x: t, y: f(t) });
      }
      if (
        !Number.isFinite(from) ||
        !Number.isFinite(to) ||
        from >= to ||
        !Number.isFinite(to - from)
      )
        throw new RangeError('Invalid curve range');
      for (let i = 0; i <= 256; i++) {
        const p = point(from + ((to - from) * i) / 256);
        if (Number.isFinite(p.x) && Number.isFinite(p.y)) {
          xs.push(p.x);
          ys.push(p.y);
        }
      }
    }
    if (!xs.length || !ys.length) return this;
    function limits(values: number[]): [number, number] {
      values.sort((a, b) => a - b);
      const lo = values[Math.floor((values.length - 1) * 0.05)] ?? 0,
        hi = values[Math.ceil((values.length - 1) * 0.95)] ?? 0;
      const padding = Math.max(hi - lo, Math.abs(lo) * 0.1, 1) * 0.1;
      return [lo - padding, hi + padding];
    }
    const [xMin, xMax] = limits(xs),
      [yMin, yMax] = limits(ys);
    if (![xMin, xMax, yMin, yMax].every(Number.isFinite)) return this;
    return new Viewport({ xMin, xMax, yMin, yMax }, this.pixelSize, {
      lockAspect: this.lockAspect,
    });
  }
}
