/** Damping is a ratio, mass is 1, initial velocity is 0. Official Expressive tokens. */
export const springs = {
  'spatial-fast': { stiffness: 800, damping: 0.6 },
  'spatial-default': { stiffness: 380, damping: 0.8 },
  'spatial-slow': { stiffness: 200, damping: 0.8 },
  'effects-fast': { stiffness: 3800, damping: 1 },
  'effects-default': { stiffness: 1600, damping: 1 },
  'effects-slow': { stiffness: 800, damping: 1 },
} as const;
export type SpringName = keyof typeof springs;
export interface LinearSpring {
  easing: string;
  duration: number;
  samples: number[];
}

/** Analytic damped harmonic oscillator sampled at 240 Hz to a stable 0.1% envelope. */
export function springToLinear(
  stiffness: number,
  damping: number,
): LinearSpring {
  if (
    !Number.isFinite(stiffness) ||
    stiffness <= 0 ||
    !Number.isFinite(damping) ||
    damping <= 0 ||
    damping > 1
  )
    throw new RangeError(
      'Stiffness must be positive; damping must be in (0, 1]',
    );
  const omega = Math.sqrt(stiffness);
  const value = (time: number) => {
    if (damping === 1) return 1 - (1 + omega * time) * Math.exp(-omega * time);
    const root = Math.sqrt(1 - damping ** 2);
    const phase = omega * root * time;
    return (
      1 -
      Math.exp(-damping * omega * time) *
        (Math.cos(phase) + (damping / root) * Math.sin(phase))
    );
  };
  let seconds = 0;
  // Bound the residual for all later times, rather than stopping at a zero crossing.
  while (seconds < 30) {
    const envelope =
      damping === 1
        ? (1 + omega * seconds) * Math.exp(-omega * seconds)
        : Math.exp(-damping * omega * seconds) / Math.sqrt(1 - damping ** 2);
    if (envelope < 0.001) break;
    seconds += 1 / 240;
  }
  const duration = Math.ceil(seconds * 1000);
  const count = Math.max(2, Math.ceil(seconds * 240));
  const samples = Array.from({ length: count + 1 }, (_, i) =>
    i === count ? 1 : Number(value(((i / count) * duration) / 1000).toFixed(6)),
  );
  return { duration, samples, easing: `linear(${samples.join(', ')})` };
}
export const motionProperties: Record<string, string> = {
  '--md-sys-motion-press-scale': '0.96',
  '--md-sys-motion-button-press-scale': '0.97',
  '--md-sys-motion-button-press-duration':
    'var(--md-sys-motion-effects-fast-duration)',
  '--md-sys-motion-button-press-easing':
    'var(--md-sys-motion-effects-fast-easing)',
  ...Object.fromEntries(
    Object.entries(springs).flatMap(([name, spring]) => {
      const { duration, easing } = springToLinear(
        spring.stiffness,
        spring.damping,
      );
      return [
        [`--md-sys-motion-${name}-duration`, `${duration}ms`],
        [`--md-sys-motion-${name}-easing`, easing],
        [`--md-sys-motion-${name}-stiffness`, String(spring.stiffness)],
        [`--md-sys-motion-${name}-damping`, String(spring.damping)],
      ];
    }),
  ),
};
