import type { Page } from '@playwright/test';

export interface ParameterFrame {
  at: number;
  segments: number;
  revealing: boolean;
  paths: number[];
  rendered: { signature: string; born: number; length: number }[];
}
export interface ParameterProbe {
  activity: { at: number; frames: number; visible: string; focused: boolean }[];
  delay: number;
  errorNext: boolean;
  stallNext: boolean;
  created: number;
  terminated: number;
  inFlight: number;
  maxInFlight: number;
  revealsSeen: number;
  posts: { id: number; at: number }[];
  frames: ParameterFrame[];
  start: () => void;
  stop: () => void;
}
declare global {
  interface Window {
    __parameterProbe: ParameterProbe;
  }
}
export type ProbeWindow = Window;

/** Observe real Path2D strokes and clears, including frames with no curve ink.
 * No fake clock, synthetic geometry, screenshots or readback in the rAF loop.
 */
export async function installParameterProbe(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const probe: ParameterProbe = {
      activity: [],
      delay: 0,
      errorNext: false,
      stallNext: false,
      created: 0,
      terminated: 0,
      inFlight: 0,
      maxInFlight: 0,
      revealsSeen: 0,
      posts: [],
      frames: [],
      start: () => {},
      stop: () => {},
    };
    Object.assign(window, { __parameterProbe: probe });
    const segments = new WeakMap<Path2D, number>();
    const ids = new WeakMap<Path2D, number>();
    let nextId = 0;
    let draw: { segments: number; revealing: boolean; paths: number[] } = {
      segments: 0,
      revealing: false,
      paths: [],
    };
    const lineTo = Path2D.prototype.lineTo;
    Path2D.prototype.lineTo = function (x, y) {
      segments.set(this, (segments.get(this) ?? 0) + 1);
      lineTo.call(this, x, y);
    };
    const fillRect = CanvasRenderingContext2D.prototype.fillRect;
    CanvasRenderingContext2D.prototype.fillRect = function (x, y, w, h) {
      if (this.canvas.matches('canvas.graph-canvas') && w > 100 && h > 100)
        draw = { segments: 0, revealing: false, paths: [] };
      fillRect.call(this, x, y, w, h);
    };
    const stroke = CanvasRenderingContext2D.prototype.stroke;
    CanvasRenderingContext2D.prototype.stroke = function (path?: Path2D) {
      if (path && this.canvas.matches('canvas.graph-canvas')) {
        const count = segments.get(path) ?? 0;
        if (!ids.has(path)) ids.set(path, ++nextId);
        draw.segments += count;
        draw.paths.push(ids.get(path) ?? 0);
        const dash = this.getLineDash()[0] ?? 0;
        if (count && dash > 0 && this.lineDashOffset / dash > 0.001) {
          draw.revealing = true;
          probe.revealsSeen++;
        }
      }
      Reflect.apply(stroke, this, path ? [path] : []);
    };
    let frame = 0;
    const sample = () => {
      const canvas = document.querySelector<HTMLCanvasElement>(
        'canvas.graph-canvas',
      );
      if (canvas && probe.frames.length < 1200)
        probe.frames.push({
          at: performance.now(),
          ...draw,
          paths: [...draw.paths],
          rendered: JSON.parse(canvas.dataset.renderedResult ?? '[]'),
        });
      frame = requestAnimationFrame(sample);
    };
    let heartbeat = 0;
    probe.start = () => {
      clearInterval(heartbeat);
      probe.activity = [];
      heartbeat = window.setInterval(() => {
        probe.activity.push({
          at: performance.now(),
          frames: probe.frames.length,
          visible: document.visibilityState,
          focused: document.hasFocus(),
        });
      }, 250);
      cancelAnimationFrame(frame);
      probe.frames = [];
      frame = requestAnimationFrame(sample);
    };
    probe.stop = () => {
      cancelAnimationFrame(frame);
      clearInterval(heartbeat);
    };

    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      private active = false;
      private timers = new Set<number>();
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        probe.created++;
        this.addEventListener('error', () => this.finish());
        this.addEventListener('message', (event: MessageEvent) => {
          // Redispatched delayed replies have already released the active job.
          if (!event.isTrusted) return;
          if (probe.delay && event.data.curves?.length) {
            event.stopImmediatePropagation();
            const data: unknown = event.data;
            const timer = window.setTimeout(() => {
              this.timers.delete(timer);
              this.finish();
              this.dispatchEvent(new MessageEvent('message', { data }));
            }, probe.delay);
            this.timers.add(timer);
          } else this.finish();
        });
      }
      private finish(): void {
        if (this.active) probe.inFlight--;
        this.active = false;
      }
      postMessage(
        message: unknown,
        transfer: Transferable[] | StructuredSerializeOptions = [],
      ): void {
        const request = message as { id: number; curves?: unknown[] };
        probe.posts.push({ id: request.id, at: performance.now() });
        this.active = true;
        probe.inFlight++;
        probe.maxInFlight = Math.max(probe.maxInFlight, probe.inFlight);
        if (probe.stallNext && request.curves?.length) {
          probe.stallNext = false;
          return;
        }
        if (probe.errorNext && request.curves?.length) {
          probe.errorNext = false;
          const timer = window.setTimeout(() => {
            this.timers.delete(timer);
            this.dispatchEvent(new Event('error'));
          }, 10);
          this.timers.add(timer);
          return;
        }
        if (Array.isArray(transfer)) super.postMessage(message, transfer);
        else super.postMessage(message, transfer);
      }
      terminate(): void {
        this.finish();
        for (const timer of this.timers) clearTimeout(timer);
        this.timers.clear();
        probe.terminated++;
        super.terminate();
      }
    };
  });
}

export async function startFrames(page: Page): Promise<void> {
  await page.evaluate(() => (window as ProbeWindow).__parameterProbe.start());
}
export async function readProbe(page: Page) {
  return page.evaluate(() => {
    const probe = (window as ProbeWindow).__parameterProbe;
    probe.stop();
    return {
      activity: probe.activity,
      created: probe.created,
      terminated: probe.terminated,
      inFlight: probe.inFlight,
      maxInFlight: probe.maxInFlight,
      revealsSeen: probe.revealsSeen,
      posts: probe.posts,
      frames: probe.frames,
    };
  });
}
