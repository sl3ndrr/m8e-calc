import { describe, it, expect } from 'vitest';
import { Viewport } from '../../graph';
import { springs } from '../../styles/motion';
import {
  advanceTransition,
  interpolateViewport,
  tryViewport,
} from './viewportTransition';
import { defaultBounds } from './model';

describe('AP21 viewport transitions', () => {
  it('never overshoots, finishes exactly and can replace the goal on every frame', () => {
    const size = { width: 1600, height: 900 };
    const initial = new Viewport(defaultBounds, size, { lockAspect: true });
    let current = initial;
    for (const target of [
      initial.zoom(10, { x: 800, y: 450 }),
      initial.pan(100, 80),
      initial,
    ]) {
      let progress = 0,
        velocity = 0;
      const start = current;
      for (let i = 0; i < 300; i++) {
        const step = advanceTransition(
          progress,
          velocity,
          1 / 60,
          springs['spatial-default'],
        );
        expect(step.progress).toBeGreaterThanOrEqual(progress);
        expect(step.progress).toBeLessThanOrEqual(1);
        progress = step.progress;
        velocity = step.velocity;
        current = interpolateViewport(start, target, progress);
        expect(current.fitBasis).toEqual(target.fitBasis);
        if (step.done) break;
      }
      expect(current).toBe(target);
    }
  });
  it('handles opposite huge centers and rejects only numeric errors locally', () => {
    const size = { width: 1600, height: 900 };
    const from = new Viewport(
      { xMin: 1e308, xMax: 1.1e308, yMin: -1, yMax: 1 },
      size,
    );
    const to = new Viewport(
      { xMin: -1.1e308, xMax: -1e308, yMin: -1e-200, yMax: 1e-200 },
      size,
    );
    for (const p of [0, 0.1, 0.5, 0.99, 1]) {
      expect(
        Object.values(interpolateViewport(from, to, p).bounds).every(
          Number.isFinite,
        ),
      ).toBe(true);
    }
    expect(tryViewport(() => from.zoom(Infinity, { x: 0, y: 0 }))).toBeNull();
    expect(() =>
      tryViewport(() => {
        throw Error('programming error');
      }),
    ).toThrow('programming error');
  });
});
