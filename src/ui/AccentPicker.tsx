import { lazy, Suspense, useRef, useState, type RefObject } from 'react';
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
      <Popover className="accent-popover">
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
