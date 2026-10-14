import { Suspense, useState } from 'react';
import { useEffect, useRef } from 'react';
import { animateElement } from '../ui/animateElement';

import { useSettingsStore } from '../shared/settingsStore';
import type { ModeId } from '../shared/modes';
import { modeIds } from '../shared/modes';
import { useAppStore } from '../shared/store';
import { ModeErrorBoundary } from './ModeErrorBoundary';
import { t } from '../shared/i18n';
import { LoadingIndicator } from '../ui/LoadingIndicator';
import { useMediaQuery } from '../ui/useMediaQuery';
import { getMode } from './modeRegistry';
function ModePanel({
  mode,
  direction,
  enter,
}: {
  mode: ModeId;
  direction: number;
  enter: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const level = useSettingsStore((state) => state.motionLevel);
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const spatial = level === 'full' && !reduced;
  const off = level === 'off';
  const locale = useAppStore((s) => s.locale);
  const [attempt, setAttempt] = useState(0);
  const Component = getMode(mode).component;
  useEffect(() => {
    if (!enter || off || !panel.current) return;
    const animation = animateElement(
      panel.current,
      [
        {
          opacity: 0,
          transform: `translateX(${spatial ? direction * 32 : 0}px)`,
        },
        { opacity: 1, transform: 'translateX(0)' },
      ],
      spatial ? 'spatial-default' : 'effects-fast',
    );
    return () => animation.stop();
  }, [enter, off, spatial, direction]);
  return (
    <div ref={panel} className="mode-stage" data-mode={mode}>
      <ModeErrorBoundary
        key={attempt}
        locale={locale}
        onReset={(reload) => {
          window.history.replaceState(null, '', `#/${mode}`);
          if (reload) {
            window.location.reload();
            return;
          }
          setAttempt((value) => value + 1);
        }}
      >
        <Suspense fallback={<LoadingIndicator label={t('ui.loading')} />}>
          <Component />
        </Suspense>
      </ModeErrorBoundary>
    </div>
  );
}
export function ModeStage({
  mode,
  routeKey = mode,
}: {
  mode: ModeId;
  routeKey?: string;
}) {
  const [transition, setTransition] = useState({
    mode,
    routeKey,
    direction: 1,
    enter: false,
  });
  if (transition.routeKey !== routeKey)
    setTransition({
      mode,
      routeKey,
      enter: true,
      direction:
        modeIds.indexOf(mode) >= modeIds.indexOf(transition.mode) ? 1 : -1,
    });
  const direction = transition.direction;
  // Direction is an animation hint only. No feature state depends on it.
  return (
    <div className="mode-stage-frame">
      <ModePanel
        key={routeKey}
        mode={mode}
        direction={direction}
        enter={transition.enter}
      />
    </div>
  );
}
