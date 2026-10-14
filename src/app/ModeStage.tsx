import { lazy, Suspense, useMemo, useState } from 'react';
import { AnimatePresence, motion, useIsPresent } from 'motion/react';
import { springs } from '../styles/motion';
import { useSettingsStore } from '../shared/settingsStore';
import type { ModeId } from '../shared/modes';
import { modeIds } from '../shared/modes';
import { useAppStore } from '../shared/store';
import { ModeErrorBoundary, ModeLoadError } from './ModeErrorBoundary';
import { t } from '../shared/i18n';
import { LoadingIndicator, useMediaQuery } from '../ui';
import { getMode } from './modeRegistry';
function ModePanel({ mode, direction }: { mode: ModeId; direction: number }) {
  const level = useSettingsStore((state) => state.motionLevel);
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const spatial = level === 'full' && !reduced;
  const off = level === 'off';
  const present = useIsPresent();
  const locale = useAppStore((s) => s.locale);
  const [attempt, setAttempt] = useState(0);
  const Component = useMemo(() => {
    // Each retry gets a fresh React.lazy promise, including after a failed download.
    void attempt;
    return lazy(() => getMode(mode).load().catch(() => { throw new ModeLoadError('Mode load failed'); }));
  }, [mode, attempt]);
  const token = springs[spatial ? 'spatial-default' : 'effects-fast'];
  return (
    <motion.div
      className="mode-stage"
      data-mode={mode}
      inert={!present}
      aria-hidden={!present || undefined}
      custom={direction}
      variants={{
        enter: (axis: number) => ({ opacity: 0, x: spatial ? axis * 32 : 0 }),
        center: { opacity: 1, x: 0 },
        exit: (axis: number) => ({ opacity: 0, x: spatial ? -axis * 32 : 0 }),
      }}
      initial={off ? false : 'enter'}
      animate="center"
      exit="exit"
      transition={
        off
          ? { duration: 0 }
          : {
              type: 'spring',
              stiffness: token.stiffness,
              damping: 2 * token.damping * Math.sqrt(token.stiffness),
            }
      }
    >
      <ModeErrorBoundary key={attempt} locale={locale} onReset={(reload) => {
        window.history.replaceState(null, '', `#/${mode}`);
        if (reload) { window.location.reload(); return; }
        setAttempt((value) => value + 1);
      }}>
      <Suspense fallback={<LoadingIndicator label={t('ui.loading')} />}>
        <Component />
      </Suspense>
      </ModeErrorBoundary>
    </motion.div>
  );
}
export function ModeStage({
  mode,
  routeKey = mode,
}: {
  mode: ModeId;
  routeKey?: string;
}) {
  const [transition, setTransition] = useState({ mode, direction: 1 });
  if (transition.mode !== mode)
    setTransition({
      mode,
      direction:
        modeIds.indexOf(mode) >= modeIds.indexOf(transition.mode) ? 1 : -1,
    });
  const direction = transition.direction;
  // Direction is an animation hint only. No feature state depends on it.
  return (
    <div className="mode-stage-frame">
      <AnimatePresence initial={false} mode="wait" custom={direction}>
        <ModePanel key={routeKey} mode={mode} direction={direction} />
      </AnimatePresence>
    </div>
  );
}

