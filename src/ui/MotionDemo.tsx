import { useEffect, useRef, useState } from 'react';
import { animate, type AnimationPlaybackControls } from 'motion';
import { springs, type SpringName } from '../styles/motion';
import { effectiveMotion } from '../app/theme';
import { useSettingsStore } from '../shared/settingsStore';
import { useAppStore } from '../shared/store';
import { t } from '../shared/i18n/extended';
import { Symbol } from './Symbol';
export function MotionDemo({ name }: { name: SpringName }) {
  const node = useRef<HTMLSpanElement>(null);
  const animation = useRef<AnimationPlaybackControls | null>(null);
  const [active, setActive] = useState(false);
  const locale = useAppStore((state) => state.locale);
  const level = useSettingsStore((state) => state.motionLevel);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reset = () => {
      animation.current?.stop();
      if (node.current) {
        node.current.style.transform = '';
        node.current.style.opacity = '';
      }
    };
    reset();
    query.addEventListener('change', reset);
    return () => {
      reset();
      query.removeEventListener('change', reset);
    };
  }, [level]);
  const spring = springs[name];
  return (
    <div className="motion-demo">
      <div className="motion-track">
        <span ref={node} className="motion-dot" />
      </div>
      <div>
        <code>{name}</code>
        <small>
          {spring.stiffness} / {spring.damping}
        </small>
      </div>
      <button
        className="icon-button"
        type="button"
        aria-label={`${t('design.play', locale)} · ${name}`}
        onClick={() => {
          const next = !active;
          setActive(next);
          if (!node.current) return;
          animation.current?.stop();
          const motion = effectiveMotion();
          const effects = name.startsWith('effects') || motion !== 'full';
          const target = effects
            ? { opacity: next ? 0.25 : 1 }
            : { x: next ? 120 : 0 };
          animation.current = animate(
            node.current,
            target,
            motion === 'off'
              ? { duration: 0 }
              : {
                  type: 'spring',
                  stiffness: spring.stiffness,
                  damping: 2 * spring.damping * Math.sqrt(spring.stiffness),
                  mass: 1,
                },
          );
        }}
      >
        <Symbol name="play_arrow" />
      </button>
    </div>
  );
}
