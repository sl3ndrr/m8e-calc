import { Suspense, useEffect, useState } from 'react';
import { AnimatePresence, motion, useIsPresent } from 'motion/react';
import { springs } from '../styles/motion';
import { useSettingsStore } from '../shared/settingsStore';
import type { ModeId } from '../shared/modes';
import { modeIds } from '../shared/modes';
import { t } from '../shared/i18n';
import { LoadingIndicator, useMediaQuery } from '../ui';
import { getMode } from './modeRegistry';
function ModePanel({ mode, direction, spatial, off }: { mode: ModeId; direction: number; spatial: boolean; off: boolean }) {
  const present = useIsPresent();
  const Component = getMode(mode).component;
  const token = springs[spatial ? 'spatial-default' : 'effects-fast'];
  return <motion.div className="mode-stage" data-mode={mode} inert={!present} aria-hidden={!present || undefined}
    initial={off ? false : { opacity: 0, x: spatial ? direction * 32 : 0 }}
    animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: spatial ? -direction * 32 : 0 }}
    transition={off ? { duration: 0 } : { type: 'spring', stiffness: token.stiffness, damping: 2 * token.damping * Math.sqrt(token.stiffness) }}>
    <Suspense fallback={<LoadingIndicator label={t('ui.loading')} />}><Component /></Suspense>
  </motion.div>;
}
export function ModeStage({ mode }: { mode: ModeId }) {
  const [previous, setPrevious] = useState(mode);
  const direction = modeIds.indexOf(mode) >= modeIds.indexOf(previous) ? 1 : -1;
  useEffect(() => { setPrevious(mode); }, [mode]);
  const level = useSettingsStore(state => state.motionLevel);
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  // Direction is an animation hint only. No feature state depends on it.
  return <div className="mode-stage-frame"><AnimatePresence initial={false} mode="wait" >
    <ModePanel key={mode} mode={mode} direction={direction} spatial={level === 'full' && !reduced} off={level === 'off'} />
  </AnimatePresence></div>;
}
