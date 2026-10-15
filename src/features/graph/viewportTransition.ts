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
  return (
    tryViewport(
      () =>
        new Viewport(
          {
            xMin: mix(a.xMin, b.xMin),
            xMax: mix(a.xMax, b.xMax),
            yMin: mix(a.yMin, b.yMin),
            yMax: mix(a.yMax, b.yMax),
          },
          to.pixelSize,
          { lockAspect: to.lockAspect, fitBasis: to.fitBasis },
        ),
    ) ?? to
  );
}
