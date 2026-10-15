import { shortcutMatches } from '../../app/shortcuts';
/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- The custom plot application handles Arrow keys; its application region needs a native Tab stop. */
import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from 'react';
import {
  Viewport,
  sampleCurveDetailed,
  type Bounds,
  type Point,
} from '../../graph';
import { useSettingsStore } from '../../shared/settingsStore';
import { useMediaQuery } from '../../ui/useMediaQuery';
import { VisuallyHidden } from '../../ui/VisuallyHidden';
import { graphPalette } from '../../styles/graphPalette';
import { springs } from '../../styles/motion';
import { t, type Locale } from '../../shared/i18n';
import {
  curveEvaluator,
  nearestTrace,
  defaultBounds,
  type ParsedRow,
  type Trace,
} from './model';
import {
  cachePaths,
  drawGraph,
  type CachedPath,
  type GraphColors,
  type IntegralShade,
  type Marker,
} from './renderer';
import type { SampleRequest, SampleResponse } from './workerProtocol';
import {
  advanceTransition,
  interpolateViewport,
  tryViewport,
} from './viewportTransition';
export interface CanvasHandle {
  fit: () => void;
  reset: () => void;
  zoom: (factor: number) => void;
  preset: (bounds: Bounds) => void;
  export: (transparent: boolean) => Promise<Blob>;
  viewport: () => Viewport | null;
  desiredViewport: () => Viewport | null;
}
interface Props {
  ref?: Ref<CanvasHandle>;
  rows: readonly ParsedRow[];
  bounds: Bounds;
  fitBasis?: Bounds;
  restoreToken: number;
  onViewError: () => void;
  lockAspect: boolean;
  fine: boolean;
  pi: boolean;
  locale: Locale;
  markers: readonly Marker[];
  shade: IntegralShade | null;
  integralCurveId: string | null;
  onView: (bounds: Bounds, fitBasis: Bounds) => void;
  onIntegral: (from: number, to: number) => void;
  onTrace: (trace: Trace | null) => void;
  onContext: (trace: Trace) => void;
  onPalette: (colors: string[]) => void;
}
interface Controller {
  configure: (props: Props, animate: boolean) => void;
  fit: () => void;
  reset: () => void;
  zoom: (factor: number, point?: Point) => void;
  preset: (bounds: Bounds) => void;
  export: (transparent: boolean) => Promise<Blob>;
  viewport: () => Viewport;
  desiredViewport: () => Viewport;
}
export default function GraphCanvas({ ref: forwardedRef, ...props }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null),
    controller = useRef<Controller | null>(null);
  const [trace, setTrace] = useState<Trace | null>(null);
  const level = useSettingsStore((s) => s.motionLevel),
    accent = useSettingsStore((s) => s.accent),
    theme = useSettingsStore((s) => s.themeMode),
    variant = useSettingsStore((s) => s.schemeVariant),
    contrast = useSettingsStore((s) => s.contrast);
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const animate = level === 'full' && !reduced;
  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  });
  useImperativeHandle(
    forwardedRef,
    () => ({
      fit: () => controller.current?.fit(),
      reset: () => controller.current?.reset(),
      zoom: (f) => controller.current?.zoom(f),
      preset: (b) => controller.current?.preset(b),
      viewport: () => controller.current?.viewport() ?? null,
      desiredViewport: () => controller.current?.desiredViewport() ?? null,
      export: async (transparent) => {
        if (!controller.current) throw new Error('Canvas unavailable');
        return controller.current.export(transparent);
      },
    }),
    [],
  );
  useEffect(() => {
    const candidate = canvas.current;
    if (!candidate) return;
    const element: HTMLCanvasElement = candidate;
    const canvasContext = element.getContext('2d', {
      alpha: false,
      desynchronized: true,
    });
    if (!canvasContext) return;
    const ctx: CanvasRenderingContext2D = canvasContext;
    let current = latest.current,
      animation = animate,
      disposed = false;
    const initialSize = {
      width: Math.max(1, element.clientWidth),
      height: Math.max(1, element.clientHeight),
    };
    const restoredViewport = tryViewport(
      () =>
        new Viewport(current.bounds, initialSize, {
          lockAspect: current.lockAspect,
          fitBasis: current.fitBasis,
        }),
    );
    let viewport =
      restoredViewport ??
      new Viewport(defaultBounds, initialSize, {
        lockAspect: current.lockAspect,
      });
    let target = viewport,
      animationFrom = viewport,
      progress = 0,
      velocity = 0,
      fitting = false,
      fitCache: { key: string; view: Viewport } | null = null,
      frame = 0,
      dirty = true,
      lastTime = 0,
      moving = false,
      ratio = 0;
    let paths = new Map<string, CachedPath>(),
      colors: GraphColors = {
        background: '',
        grid: '',
        axis: '',
        label: '',
        curves: [],
      };
    let activeTrace: Trace | null = null,
      pointer: {
        id: number;
        point: Point;
        time: number;
        vx: number;
        vy: number;
        from: number | null;
      } | null = null,
      selection: readonly [number, number] | null = null;
    let worker: Worker | null = null,
      busy = false,
      pending: SampleRequest | null = null,
      requestId = 0,
      latestId = 0,
      sampleTimer = 0,
      viewTimer = 0;
    let revealDuration = 1;
    let sampleSignature = '',
      fontSize = 14,
      colorUntil = 0;
    const metrics = {
      frames: 0,
      renderMs: [] as number[],
      samplingMs: 0,
      fitComputations: 0,
      fitMs: 0,
    };
    const readColors = (schedule = true) => {
      const css = getComputedStyle(document.documentElement),
        token = (name: string) =>
          css.getPropertyValue(`--md-sys-color-${name}`).trim();
      fontSize = parseFloat(css.fontSize) * 0.65;
      revealDuration =
        parseFloat(
          css.getPropertyValue('--md-sys-motion-effects-slow-duration'),
        ) || 1;
      colors = {
        background: token('surface'),
        grid: token('outline-variant'),
        axis: token('outline'),
        label: token('on-surface-variant'),
        curves: graphPalette(
          useSettingsStore.getState().accent,
          css.colorScheme === 'dark',
          [token('surface'), token('surface-container-low')],
        ),
      };
      current.onPalette(colors.curves);
      if (schedule) invalidate();
    };
    function invalidate(): void {
      dirty = true;
      if (!frame && !disposed) frame = requestAnimationFrame(render);
    }
    function announce(): void {
      window.clearTimeout(viewTimer);
      const accepted = target;
      viewTimer = window.setTimeout(() => {
        if (target === accepted && !moving)
          current.onView(accepted.bounds, accepted.fitBasis);
      }, 120);
    }
    function visibleRows() {
      return current.rows.filter((r) => r.curve && r.row.visible);
    }
    function requestSamples(exact = false): void {
      const v = viewport,
        b = v.bounds,
        dx = (b.xMax - b.xMin) * 0.35,
        dy = (b.yMax - b.yMin) * 0.35;
      const overscan = tryViewport(
        () =>
          new Viewport(
            {
              xMin: b.xMin - dx,
              xMax: b.xMax + dx,
              yMin: b.yMin - dy,
              yMax: b.yMax + dy,
            },
            v.pixelSize,
          ),
      );
      const bounds =
        exact || !overscan
          ? b
          : {
              xMin: b.xMin - dx,
              xMax: b.xMax + dx,
              yMin: b.yMin - dy,
              yMax: b.yMax + dy,
            };
      const size =
        exact || !overscan
          ? v.pixelSize
          : {
              width: v.pixelSize.width * 1.7,
              height: v.pixelSize.height * 1.7,
            };
      const curves = visibleRows().flatMap((r) =>
        r.curve
          ? [
              {
                id: r.row.id,
                curve: r.curve,
                signature: JSON.stringify(r.curve),
              },
            ]
          : [],
      );
      const signature = JSON.stringify({ curves, bounds, size });
      if (signature === sampleSignature) return;
      sampleSignature = signature;
      pending = { id: ++requestId, curves, bounds, size };
      latestId = requestId;
      pump();
    }
    function accept(result: SampleResponse): void {
      busy = false;
      if (disposed) return;
      if (result.id === latestId) {
        paths = cachePaths(result, paths, performance.now());
        metrics.samplingMs = result.milliseconds;
        element.dataset.curveCount = String(paths.size);
        invalidate();
      }
      pump();
    }
    function pump(): void {
      if (busy || !pending || disposed) return;
      const request = pending;
      pending = null;
      busy = true;
      if (worker) worker.postMessage(request);
      else {
        const start = performance.now();
        const curves = request.curves.map((c) => {
          const result = sampleCurveDetailed(
            c.curve,
            request.bounds,
            request.size,
          );
          return { ...c, ...result };
        });
        accept({ ...request, curves, milliseconds: performance.now() - start });
      }
    }
    function resample(): void {
      window.clearTimeout(sampleTimer);
      sampleTimer = window.setTimeout(
        () => {
          sampleTimer = 0;
          requestSamples();
        },
        moving ? 90 : 0,
      );
    }
    function setView(next: Viewport, spring: boolean): void {
      if (
        JSON.stringify(next.toJSON()) === JSON.stringify(target.toJSON()) &&
        spring &&
        animation
      )
        return;
      window.clearTimeout(viewTimer);
      window.clearTimeout(sampleTimer);
      sampleTimer = 0;
      target = next;
      animationFrom = viewport;
      progress = 0;
      velocity = 0;
      moving = spring && animation;
      element.dataset.targetBounds = JSON.stringify(target.bounds);
      element.dataset.fitBasis = JSON.stringify(target.fitBasis);
      element.dataset.moving = String(moving);
      if (!moving) {
        viewport = next;
        announce();
        resample();
      }
      invalidate();
    }
    function changeView(create: () => Viewport, spring: boolean): void {
      const next = tryViewport(create);
      if (!next) {
        current.onViewError();
        return;
      }
      fitting = false;
      setView(next, spring);
    }
    function fit(): void {
      const curves = visibleRows().flatMap((r) => (r.curve ? [r.curve] : []));
      const key = JSON.stringify([
        curves,
        target.fitBasis,
        target.pixelSize,
        target.lockAspect,
      ]);
      const start = performance.now();
      const cached = fitCache?.key === key;
      const next =
        cached && fitCache ? fitCache.view : target.fitToCurves(curves);
      if (!cached) {
        metrics.fitComputations++;
        metrics.fitMs = performance.now() - start;
      }
      if (next === target && fitCache?.key !== key) {
        if (fitting && moving) setView(viewport, false);
        fitting = false;
        current.onViewError();
        return;
      }
      fitCache = { key, view: next };
      fitting = true;
      setView(next, true);
    }
    function render(time: number): void {
      frame = 0;
      if (disposed) return;
      const start = performance.now();
      if (time < colorUntil) {
        readColors(false);
        dirty = true;
      }
      if (moving) {
        const next = advanceTransition(
          progress,
          velocity,
          (time - lastTime) / 1000 || 0.016,
          springs['spatial-default'],
        );
        progress = next.progress;
        velocity = next.velocity;
        viewport = interpolateViewport(animationFrom, target, progress);
        if (next.done || viewport === target) {
          moving = false;
          viewport = target;
          announce();
          requestSamples();
        } else if (!sampleTimer) {
          sampleTimer = window.setTimeout(() => {
            sampleTimer = 0;
            requestSamples();
          }, 90);
        }
        dirty = true;
      }
      lastTime = time;
      const dpr = window.devicePixelRatio || 1;
      if (ratio !== dpr) {
        ratio = dpr;
        element.width = Math.round(viewport.pixelSize.width * dpr);
        element.height = Math.round(viewport.pixelSize.height * dpr);
        dirty = true;
      }
      let reveal = false;
      if (dirty) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        reveal = drawGraph(ctx, {
          viewport,
          colors,
          paths,
          rows: visibleRows().map((r) => ({
            id: r.row.id,
            color: r.row.color,
          })),
          markers: current.markers,
          shade: current.shade,
          trace: activeTrace,
          fine: current.fine,
          pi: current.pi,
          now: time,
          animate: animation,
          fontSize,
          revealDuration,
        });
        if (selection) {
          const a = viewport.worldToScreen({ x: selection[0], y: 0 }),
            b = viewport.worldToScreen({ x: selection[1], y: 0 });
          ctx.fillStyle = colors.axis;
          ctx.globalAlpha = 0.15;
          ctx.fillRect(
            Math.min(a.x, b.x),
            0,
            Math.abs(a.x - b.x),
            viewport.pixelSize.height,
          );
          ctx.globalAlpha = 1;
        }
        dirty = false;
        metrics.frames++;
        metrics.renderMs.push(performance.now() - start);
        if (metrics.renderMs.length > 600) metrics.renderMs.shift();
        element.dataset.bounds = JSON.stringify(viewport.bounds);
        element.dataset.targetBounds = JSON.stringify(target.bounds);
        element.dataset.fitBasis = JSON.stringify(target.fitBasis);
        element.dataset.moving = String(moving);
        element.dataset.graphMetrics = JSON.stringify(metrics);
        element.dataset.truncated = String(
          [...paths.values()].some((p) => p.truncated),
        );
      }
      if (moving || reveal || time < colorUntil) {
        dirty = true;
        frame = requestAnimationFrame(render);
      }
    }
    const local = (event: MouseEvent | PointerEvent | WheelEvent): Point => {
      const r = element.getBoundingClientRect();
      return { x: event.clientX - r.left, y: event.clientY - r.top };
    };
    function updateTrace(next: Trace | null): void {
      activeTrace = next;
      setTrace(next);
      current.onTrace(next);
      invalidate();
    }
    function down(event: PointerEvent): void {
      if (event.button !== 0) return;
      element.focus();
      element.setPointerCapture(event.pointerId);
      moving = false;
      target = viewport;
      fitting = false;
      window.clearTimeout(viewTimer);
      const point = local(event),
        from = current.integralCurveId ? viewport.screenToWorld(point).x : null;
      pointer = {
        id: event.pointerId,
        point,
        time: event.timeStamp,
        vx: 0,
        vy: 0,
        from,
      };
      if (from !== null) selection = [from, from];
      updateTrace(null);
    }
    function move(event: PointerEvent): void {
      const point = local(event);
      if (pointer && pointer.id === event.pointerId) {
        const dx = point.x - pointer.point.x,
          dy = point.y - pointer.point.y,
          dt = Math.max(1, event.timeStamp - pointer.time);
        if (pointer.from !== null) {
          selection = [pointer.from, viewport.screenToWorld(point).x];
          invalidate();
        } else changeView(() => viewport.pan(dx, dy), false);
        pointer = {
          ...pointer,
          point,
          time: event.timeStamp,
          vx: dx / dt,
          vy: dy / dt,
        };
      } else updateTrace(nearestTrace(current.rows, viewport, point));
    }
    function up(event: PointerEvent): void {
      if (!pointer || pointer.id !== event.pointerId) return;
      const p = pointer;
      pointer = null;
      if (element.hasPointerCapture(event.pointerId))
        element.releasePointerCapture(event.pointerId);
      if (p.from !== null) {
        const to = viewport.screenToWorld(local(event)).x;
        selection = null;
        current.onIntegral(p.from, to);
        invalidate();
      } else if (animation && event.timeStamp - p.time < 100)
        changeView(() => viewport.pan(p.vx * 180, p.vy * 180), true);
      else {
        announce();
        requestSamples();
      }
    }
    function cancel(): void {
      pointer = null;
      selection = null;
      invalidate();
    }
    function wheel(event: WheelEvent): void {
      event.preventDefault();
      const delta =
        event.deltaY *
        (event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? viewport.pixelSize.height
            : 1);
      changeView(
        () =>
          target.zoom(
            Math.exp(-Math.max(-300, Math.min(300, delta)) * 0.002),
            local(event),
          ),
        true,
      );
    }
    function double(event: MouseEvent): void {
      changeView(() => target.zoom(2, local(event)), true);
    }
    function context(event: MouseEvent): void {
      const next = nearestTrace(current.rows, viewport, local(event));
      if (next) {
        event.preventDefault();
        updateTrace(next);
        current.onContext(next);
      }
    }
    function key(event: KeyboardEvent): void {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (shortcutMatches('graph.zoom', event)) {
        event.preventDefault();
        api.zoom(event.key === '-' || event.key === '−' ? 1 / 1.3 : 1.3);
      } else if (shortcutMatches('graph.trace', event)) {
        event.preventDefault();
        const direction =
          event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -1 : 1;
        const row =
          current.rows.find((r) => r.row.id === activeTrace?.id) ??
          visibleRows()[0];
        if (row?.curve) {
          const c = row.curve,
            step =
              ((c.kind === 'parametric' || c.kind === 'polar'
                ? c.range[1] - c.range[0]
                : c.kind === 'vertical'
                  ? viewport.bounds.yMax - viewport.bounds.yMin
                  : viewport.bounds.xMax - viewport.bounds.xMin) /
                viewport.pixelSize.width) *
              8;
          let u = (activeTrace?.u ?? 0) + direction * step;
          if (c.kind === 'parametric' || c.kind === 'polar')
            u = Math.max(c.range[0], Math.min(c.range[1], u));
          const point = curveEvaluator(c)(u);
          if (Number.isFinite(point.x) && Number.isFinite(point.y))
            updateTrace({ id: row.row.id, u, point });
        }
      } else if (shortcutMatches('graph.clearTrace', event)) updateTrace(null);
      else if (shortcutMatches('graph.context', event) && activeTrace) {
        event.preventDefault();
        current.onContext(activeTrace);
      }
    }
    const api: Controller = {
      configure(next, canAnimate) {
        const old = current;
        current = next;
        animation = canAnimate;
        if (!animation && moving) setView(target, false);
        const restored = next.restoreToken !== old.restoreToken;
        if (
          restored ||
          (JSON.stringify(next.bounds) !== JSON.stringify(old.bounds) &&
            JSON.stringify(next.bounds) !== JSON.stringify(target.bounds))
        ) {
          changeView(
            () =>
              new Viewport(next.bounds, viewport.pixelSize, {
                lockAspect: next.lockAspect,
                fitBasis: next.fitBasis,
              }),
            true,
          );
        } else if (next.lockAspect !== old.lockAspect) {
          changeView(() => target.withAspectLock(next.lockAspect), true);
        }
        if (!restored && next.rows !== old.rows && fitting && moving) fit();
        if (next.rows !== old.rows) {
          paths = new Map(
            [...paths].filter(([id]) =>
              next.rows.some((r) => r.row.id === id && r.curve),
            ),
          );
          updateTrace(null);
          resample();
        }
        readColors();
        invalidate();
      },
      fit,
      reset() {
        changeView(
          () =>
            new Viewport(defaultBounds, viewport.pixelSize, {
              lockAspect: current.lockAspect,
            }),
          true,
        );
      },
      preset(bounds) {
        changeView(
          () =>
            new Viewport(bounds, viewport.pixelSize, {
              lockAspect: current.lockAspect,
            }),
          true,
        );
      },
      zoom(factor, point) {
        changeView(
          () =>
            target.zoom(
              factor,
              point ?? {
                x: viewport.pixelSize.width / 2,
                y: viewport.pixelSize.height / 2,
              },
            ),
          true,
        );
      },
      viewport: () => viewport,
      desiredViewport: () => target,
      async export(transparent) {
        const output = document.createElement('canvas'),
          dpr = window.devicePixelRatio || 1;
        output.width = Math.round(viewport.pixelSize.width * dpr);
        output.height = Math.round(viewport.pixelSize.height * dpr);
        const context = output.getContext('2d');
        if (!context) throw new Error('Canvas unavailable');
        // Export is an explicit one-off: always sample the exact current viewport.
        const curves = visibleRows().flatMap((r) => {
          if (!r.curve) return [];
          const sampled = sampleCurveDetailed(
            r.curve,
            viewport.bounds,
            viewport.pixelSize,
          );
          return [
            { id: r.row.id, signature: JSON.stringify(r.curve), ...sampled },
          ];
        });
        const exact = cachePaths(
          {
            id: 0,
            curves,
            bounds: viewport.bounds,
            size: viewport.pixelSize,
            milliseconds: 0,
          },
          paths,
          0,
        );
        context.scale(dpr, dpr);
        drawGraph(context, {
          viewport,
          colors,
          paths: exact,
          rows: visibleRows().map((r) => ({
            id: r.row.id,
            color: r.row.color,
          })),
          markers: current.markers,
          shade: current.shade,
          trace: null,
          fine: current.fine,
          pi: current.pi,
          now: performance.now(),
          animate: false,
          transparent,
          fontSize,
          revealDuration,
        });
        return new Promise<Blob>((resolve, reject) =>
          output.toBlob(
            (blob) =>
              blob ? resolve(blob) : reject(new Error('PNG unavailable')),
            'image/png',
          ),
        );
      },
    };
    controller.current = api;
    try {
      worker = new Worker(new URL('./sampling.worker.ts', import.meta.url), {
        type: 'module',
      });
      worker.onmessage = (event: MessageEvent<SampleResponse>) =>
        accept(event.data);
      worker.onerror = () => {
        worker?.terminate();
        worker = null;
        busy = false;
        sampleSignature = '';
        requestSamples();
      };
    } catch {
      worker = null;
    }
    const resize = () => {
      const r = element.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const size = { width: r.width, height: r.height };
      if (
        size.width === target.pixelSize.width &&
        size.height === target.pixelSize.height
      )
        return;
      const next = tryViewport(() => target.resize(size));
      if (!next) {
        current.onViewError();
        return;
      }
      setView(next, false);
      ratio = 0;
      requestSamples();
      invalidate();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    const mutations = new MutationObserver(() => {
      colorUntil =
        performance.now() +
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue(
            '--md-sys-motion-effects-default-duration',
          ),
        ) +
        100;
      readColors();
    });
    mutations.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style', 'class', 'data-theme'],
    });
    element.addEventListener('pointerdown', down);
    element.addEventListener('pointermove', move);
    element.addEventListener('pointerup', up);
    element.addEventListener('pointercancel', cancel);
    element.addEventListener('wheel', wheel, { passive: false });
    element.addEventListener('dblclick', double);
    element.addEventListener('contextmenu', context);
    const focusTarget = element.parentElement ?? element;
    focusTarget.addEventListener('keydown', key);
    const leave = () => {
      if (!pointer) updateTrace(null);
    };
    element.addEventListener('pointerleave', leave);
    window.addEventListener('resize', resize);
    readColors();
    resize();
    if (!restoredViewport) {
      current.onViewError();
      announce();
    }
    requestSamples();
    invalidate();
    return () => {
      disposed = true;
      controller.current = null;
      cancelAnimationFrame(frame);
      window.clearTimeout(sampleTimer);
      window.clearTimeout(viewTimer);
      worker?.terminate();
      observer.disconnect();
      mutations.disconnect();
      window.removeEventListener('resize', resize);
      element.removeEventListener('pointerdown', down);
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerup', up);
      element.removeEventListener('pointercancel', cancel);
      element.removeEventListener('wheel', wheel);
      element.removeEventListener('dblclick', double);
      element.removeEventListener('contextmenu', context);
      focusTarget.removeEventListener('keydown', key);
      element.removeEventListener('pointerleave', leave);
    };
    // The controller owns browser state; configure updates all live inputs below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    controller.current?.configure(props, animate);
  }, [props, animate, accent, theme, variant, contrast]);
  return (
    <div
      className="graph-canvas-wrap"
      role="application"
      tabIndex={0}
      aria-label={t('graph.canvas', props.locale)}
      aria-describedby="graph-canvas-help"
    >
      <canvas
        ref={canvas}
        className="graph-canvas"
        tabIndex={-1}
        aria-label={t('graph.canvas', props.locale)}
        aria-describedby="graph-canvas-help"
      />
      <p id="graph-canvas-help" className="graph-canvas-help">
        {t(
          props.integralCurveId ? 'graph.integralHint' : 'graph.gestureHint',
          props.locale,
        )}
      </p>
      <VisuallyHidden>
        <output aria-live="polite" aria-atomic="true">
          {trace
            ? `x = ${Number(trace.point.x.toPrecision(8))} · f(x) = ${Number(trace.point.y.toPrecision(8))}`
            : ''}
        </output>
      </VisuallyHidden>
      {trace && (
        <output className="graph-trace" aria-hidden="true">
          x = {Number(trace.point.x.toPrecision(8))} · f(x) ={' '}
          {Number(trace.point.y.toPrecision(8))}
        </output>
      )}
    </div>
  );
}
