import { Viewport } from '../../graph';

/** Only expected numeric rejection is recoverable; programming errors stay visible. */
export function tryViewport(create: () => Viewport): Viewport | null {
  try {
    return create();
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    return null;
  }
}

export function advanceTransition(
  progress: number,
  velocity: number,
  seconds: number,
  spring: { stiffness: number; damping: number },
): { progress: number; velocity: number; done: boolean } {
  const dt = Math.max(0, Math.min(0.032, seconds));
  const damping = 2 * spring.damping * Math.sqrt(spring.stiffness);
  for (let i = 0; i < 4; i++) {
    velocity +=
      (((1 - progress) * spring.stiffness - velocity * damping) * dt) / 4;
    progress = Math.min(1, Math.max(progress, progress + (velocity * dt) / 4));
  }
  const done =
    progress >= 1 || (1 - progress < 0.0001 && Math.abs(velocity) < 0.0001);
  return { progress: done ? 1 : progress, velocity: done ? 0 : velocity, done };
}

/** Bounded interpolation cannot overshoot a valid goal. Precision loss snaps to it. */
export function interpolateViewport(
  from: Viewport,
  to: Viewport,
  progress: number,
): Viewport {
  if (progress >= 1) return to;
  const mix = (a: number, b: number) => a * (1 - progress) + b * progress;
  const a = from.bounds,
    b = to.bounds;
  const cx = mix(
    a.xMin + (a.xMax - a.xMin) / 2,
    b.xMin + (b.xMax - b.xMin) / 2,
  );
  const cy = mix(
    a.yMin + (a.yMax - a.yMin) / 2,
    b.yMin + (b.yMax - b.yMin) / 2,
  );
  const sx =
    Math.exp(mix(Math.log(a.xMax - a.xMin), Math.log(b.xMax - b.xMin))) / 2;
  const sy =
    Math.exp(mix(Math.log(a.yMax - a.yMin), Math.log(b.yMax - b.yMin))) / 2;
  return (
    tryViewport(
      () =>
        new Viewport(
          {
            xMin: cx - sx,
            xMax: cx + sx,
            yMin: cy - sy,
            yMax: cy + sy,
          },
          to.pixelSize,
          { lockAspect: to.lockAspect, fitBasis: to.fitBasis },
        ),
    ) ?? to
  );
}
