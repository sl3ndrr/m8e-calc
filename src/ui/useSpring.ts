import { useEffect, useRef, useState } from 'react';
import { springs, type SpringName } from '../styles/motion';
import { useSettingsStore } from '../shared/settingsStore';
import { useMediaQuery } from './useMediaQuery';
/** Retargetable scalar spring. Keeps velocity on retarget; no frames after settling/unmount. */
export function useSpring(
  target: number,
  name: SpringName = 'spatial-fast',
): number {
  const [value, setValue] = useState(target);
  const position = useRef(target),
    velocity = useRef(0);
  const level = useSettingsStore((s) => s.motionLevel);
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const animate = level === 'full' && !reduced;
  useEffect(() => {
    if (!animate) {
      position.current = target;
      velocity.current = 0;
      return;
    }
    let frame = 0,
      last = performance.now();
    const token = springs[name],
      damping = 2 * token.damping * Math.sqrt(token.stiffness);
    const tick = (now: number) => {
      const dt = Math.min(0.032, Math.max(0.001, (now - last) / 1000));
      last = now;
      // Substeps keep critically damped fast springs stable at low refresh rates.
      for (let i = 0; i < 8; i++) {
        velocity.current +=
          (((target - position.current) * token.stiffness -
            velocity.current * damping) *
            dt) /
          8;
        position.current += (velocity.current * dt) / 8;
      }
      if (
        Math.abs(target - position.current) < 0.0001 &&
        Math.abs(velocity.current) < 0.001
      ) {
        position.current = target;
        velocity.current = 0;
        setValue(target);
        return;
      }
      setValue(position.current);
      frame = requestAnimationFrame(tick);
    };
    if (
      Math.abs(target - position.current) > 0.0001 ||
      Math.abs(velocity.current) > 0.001
    )
      frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, name, animate]);
  return animate ? value : target;
}
