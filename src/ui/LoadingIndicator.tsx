import { useEffect, useState } from 'react';
import { ProgressBar } from 'react-aria-components';
import { springs, springToLinear } from '../styles/motion';
import { useSettingsStore } from '../shared/settingsStore';
import { useMediaQuery } from './useMediaQuery';
import { useSpring } from './useSpring';
import { loadingPath } from './loadingShapes';
import './LoadingIndicator.css';
export interface LoadingIndicatorProps {
  label: string;
  size?: number;
}
export function LoadingIndicator({ label, size = 64 }: LoadingIndicatorProps) {
  const level = useSettingsStore((s) => s.motionLevel);
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const full = level === 'full' && !reduced;
  const [target, setTarget] = useState(0);
  const phase = useSpring(target, 'spatial-slow');
  useEffect(() => {
    if (!full) return;
    const token = springs['spatial-slow'];
    const { duration } = springToLinear(token.stiffness, token.damping);
    const timer = window.setInterval(() => setTarget((p) => p + 1), duration);
    return () => window.clearInterval(timer);
  }, [full]);
  return (
    <ProgressBar aria-label={label} isIndeterminate className="ui-loading">
      <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
        <path d={loadingPath(full ? phase : 0)} />
      </svg>
    </ProgressBar>
  );
}
