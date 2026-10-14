import { snackbarQueue } from '../ui/snackbarQueue';
import { t } from '../shared/i18n';
/** Never put exception text or user input in a global notification. */
export function installGlobalErrorHandlers(target: Window = window): () => void {
  let queued: string | undefined;
  const report = () => {
    if (queued) return;
    queued = snackbarQueue.add({ message: t('error.global') }, {
      timeout: 8000,
      onClose: () => { queued = undefined; },
    });
  };
  target.addEventListener('error', report);
  target.addEventListener('unhandledrejection', report);
  return () => {
    target.removeEventListener('error', report);
    target.removeEventListener('unhandledrejection', report);
    if (queued) snackbarQueue.close(queued);
  };
}
