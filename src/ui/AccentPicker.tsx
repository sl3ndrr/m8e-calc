import { lazy, Suspense, useState } from 'react';
import { DialogTrigger } from 'react-aria-components';
import { useAppStore } from '../shared/store';
import { t } from '../shared/i18n';
import { Button } from './Button';
import { Icon } from './Icon';
import './AccentPicker.css';
const AccentPanel = lazy(() => import('./AccentPanel'));
export function AccentPicker() {
  const [isOpen, setOpen] = useState(false);
  const locale = useAppStore((state) => state.locale);
  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={setOpen}>
      <Button
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
        <Suspense fallback={null}>
          <AccentPanel onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </DialogTrigger>
  );
}
