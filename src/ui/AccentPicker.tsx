import {
  lazy,
  Suspense,
  useEffect,
  useCallback,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { Dialog as AriaDialog, DialogTrigger } from 'react-aria-components';
import { useAppStore } from '../shared/store';
import { t } from '../shared/i18n';
import { Button } from './Button';
import { Icon } from './Icon';
import { LoadingIndicator } from './LoadingIndicator';
import { Popover } from './Popover';
import './AccentPicker.css';
const AccentPanel = lazy(() => import('./AccentPanel'));
export function AccentPicker({
  triggerRef,
}: {
  triggerRef?: RefObject<HTMLButtonElement | null>;
} = {}) {
  const [isOpen, updateOpen] = useState(false);
  const ownTrigger = useRef<HTMLButtonElement>(null);
  const trigger = triggerRef ?? ownTrigger;
  const mayRestore = useRef(false);
  const restoreFrame = useRef(0);
  const setOpen = useCallback((open: boolean): void => {
    mayRestore.current = !open;
    cancelAnimationFrame(restoreFrame.current);
    restoreFrame.current = 0;
    updateOpen(open);
  }, []);
  const afterClose = useCallback((): void => {
    if (!mayRestore.current) return;
    // Run after the actual exiting scope disappears, rather than before its
    // delayed React Aria cleanup. A subsequent native action owns its focus.
    restoreFrame.current = requestAnimationFrame(() => {
      restoreFrame.current = 0;
      const target = trigger.current;
      if (
        mayRestore.current &&
        target?.isConnected &&
        !target.closest('[inert]')
      )
        target.focus();
      mayRestore.current = false;
    });
  }, [trigger]);
  useEffect(() => {
    if (isOpen || !mayRestore.current) return;
    const cancel = (): void => {
      mayRestore.current = false;
      cancelAnimationFrame(restoreFrame.current);
      restoreFrame.current = 0;
    };
    window.addEventListener('pointerdown', cancel, true);
    window.addEventListener('keydown', cancel, true);
    return () => {
      window.removeEventListener('pointerdown', cancel, true);
      window.removeEventListener('keydown', cancel, true);
    };
  }, [isOpen]);
  useEffect(() => () => cancelAnimationFrame(restoreFrame.current), []);
  const locale = useAppStore((state) => state.locale);
  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={setOpen}>
      <Button
        ref={trigger}
        variant="tonal"
        className="accent-trigger"
        type="button"
        aria-label={t('accent.open', locale)}
        title={t('accent.open', locale)}
      >
        <Icon name="palette" />
        <span>{t('accent.open', locale)}</span>
      </Button>
      <Popover className="accent-popover" onAfterClose={afterClose}>
        <Suspense
          fallback={
            <AriaDialog aria-label={t('accent.open', locale)}>
              <LoadingIndicator label={t('ui.loading', locale)} />
            </AriaDialog>
          }
        >
          <AccentPanel isOpen={isOpen} onClose={() => setOpen(false)} />
        </Suspense>
      </Popover>
    </DialogTrigger>
  );
}
