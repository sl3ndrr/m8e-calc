import { useEffect, useState, useSyncExternalStore } from 'react';
import { animate, motionValue } from 'motion';
import { springs, type SpringName } from '../styles/motion';
import { useSettingsStore } from '../shared/settingsStore';
import { useMediaQuery } from './useMediaQuery';
/** Retargetable JS spring, cancelled on unmount, preference change, and interruption. */
export function useSpring(
  target: number,
  name: SpringName = 'spatial-fast',
): number {
  const [value] = useState(() => motionValue(target));
  const level = useSettingsStore((s) => s.motionLevel);
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  useEffect(() => {
    if (reduced || level !== 'full') {
      value.set(target);
      return;
    }
    const token = springs[name];
    const animation = animate(value, target, {
      type: 'spring',
      stiffness: token.stiffness,
      damping: 2 * token.damping * Math.sqrt(token.stiffness),
    });
    return () => animation.stop();
  }, [target, name, value, reduced, level]);
  return useSyncExternalStore(
    (listener) => value.on('change', listener),
    () => value.get(),
    () => target,
  );
}
