import {
  lazy,
  Suspense,
  useEffect,
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
  const [isOpen, setOpen] = useState(false);
  const ownTrigger = useRef<HTMLButtonElement>(null);
  const trigger = triggerRef ?? ownTrigger;
  const wasOpen = useRef(false);
  useEffect(() => {
    if (isOpen) {
      wasOpen.current = true;
      return;
    }
    if (!wasOpen.current) return;
    wasOpen.current = false;
    // A cold Suspense dialog can be detached before React Aria restores focus.
    // Restore the stable opener after the overlay's own cleanup, without a trap.
    const frame = requestAnimationFrame(() => trigger.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [isOpen, trigger]);
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
      {isOpen && (
        <Popover className="accent-popover">
          <Suspense
            fallback={
              <AriaDialog aria-label={t('accent.open', locale)}>
                <LoadingIndicator label={t('ui.loading', locale)} />
              </AriaDialog>
            }
          >
            <AccentPanel onClose={() => setOpen(false)} />
          </Suspense>
        </Popover>
      )}
    </DialogTrigger>
  );
}
