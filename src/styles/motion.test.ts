import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { springToLinear, springs, motionProperties } from './motion';
describe('springToLinear', () => {
  it('matches all official expressive springs and exports CSS tokens', () => {
    expect(springs).toEqual({
      'spatial-fast': { stiffness: 800, damping: 0.6 },
      'spatial-default': { stiffness: 380, damping: 0.8 },
      'spatial-slow': { stiffness: 200, damping: 0.8 },
      'effects-fast': { stiffness: 3800, damping: 1 },
      'effects-default': { stiffness: 1600, damping: 1 },
      'effects-slow': { stiffness: 800, damping: 1 },
    });
    expect(motionProperties['--md-sys-motion-button-press-duration']).toBe(
      'var(--md-sys-motion-spatial-fast-duration)',
    );
    expect(motionProperties['--md-sys-motion-button-press-easing']).toBe(
      'var(--md-sys-motion-spatial-fast-easing)',
    );
    expect(
      Number(motionProperties['--md-sys-motion-button-press-scale']),
    ).toBeGreaterThan(0.95);
    expect(
      Number(motionProperties['--md-sys-motion-button-press-scale']),
    ).toBeLessThan(1);
    // The expressive scale spring is bounded even at its overshoot; radius
    // never uses this curve. Keep the clickable native button untransformed.
    const scale = Number(
      motionProperties['--md-sys-motion-button-press-scale'],
    );
    const progress = springToLinear(
      springs['spatial-fast'].stiffness,
      springs['spatial-fast'].damping,
    ).samples;
    for (const value of progress) {
      expect(1 + (scale - 1) * value).toBeGreaterThan(0.965);
      expect(1 + (scale - 1) * value).toBeLessThanOrEqual(1);
      expect(scale + (1 - scale) * value).toBeGreaterThanOrEqual(scale);
      expect(scale + (1 - scale) * value).toBeLessThan(1.005);
    }
    for (const [name, spring] of Object.entries(springs)) {
      const result = springToLinear(spring.stiffness, spring.damping);
      expect(result.samples[0]).toBe(0);
      expect(result.samples.at(-1)).toBe(1);
      expect(result.duration).toBeGreaterThan(100);
      expect(result.duration).toBeLessThan(1000);
      expect(result.easing).toMatch(/^linear\(0, /);
      expect(motionProperties[`--md-sys-motion-${name}-easing`]).toBe(
        result.easing,
      );
      if (name.startsWith('effects'))
        expect(
          result.samples.every(
            (value, index, samples) =>
              index === 0 || value >= (samples[index - 1] ?? 0),
          ),
        ).toBe(true);
      else expect(Math.max(...result.samples)).toBeGreaterThan(1);
    }
  });
  it('preserves the damped oscillator and scales duration with stiffness', () => {
    const sample = springToLinear(800, 0.6);
    const index = Math.floor(sample.samples.length / 4);
    const time =
      ((index / (sample.samples.length - 1)) * sample.duration) / 1000;
    const omega = Math.sqrt(800);
    const phase = omega * 0.8 * time;
    expect(sample.samples[index]).toBeCloseTo(
      1 -
        Math.exp(-0.6 * omega * time) *
          (Math.cos(phase) + 0.75 * Math.sin(phase)),
      5,
    );
    fc.assert(
      fc.property(fc.integer({ min: 50, max: 5000 }), (stiffness) => {
        expect(springToLinear(stiffness * 4, 1).duration).toBeCloseTo(
          springToLinear(stiffness, 1).duration / 2,
          -1,
        );
      }),
    );
  });
  it.each([
    [0, 1],
    [-1, 1],
    [NaN, 1],
    [Infinity, 1],
    [800, 0],
    [800, -1],
    [800, 2],
    [800, NaN],
  ])('rejects invalid %s/%s', (stiffness, damping) =>
    expect(() => springToLinear(stiffness, damping)).toThrow(RangeError),
  );
});
