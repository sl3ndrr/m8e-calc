import {
  UNSTABLE_Toast as Toast,
  UNSTABLE_ToastContent as ToastContent,
  UNSTABLE_ToastRegion as ToastRegion,
  Text,
} from 'react-aria-components';
import { Button } from './Button';
import './Snackbar.css';
import { snackbarQueue, type SnackbarQueue } from './snackbarQueue';
export {
  snackbarQueue,
  createSnackbarQueue,
  SnackbarQueue,
  type SnackbarMessage,
} from './snackbarQueue';
export interface SnackbarProps {
  label: string;
  closeLabel: string;
  queue?: SnackbarQueue;
}
/** Action messages remain until dismissed, so Undo is never lost to a timer. */
export function Snackbar({
  label,
  closeLabel,
  queue = snackbarQueue,
}: SnackbarProps) {
  return (
    <ToastRegion
      queue={queue}
      aria-label={label}
      className="ui-snackbar-region"
    >
      {({ toast }) => (
        <Toast toast={toast} className="ui-snackbar">
          <ToastContent>
            <Text slot="title">{toast.content.message}</Text>
          </ToastContent>
          {toast.content.onAction && (
            <Button
              variant="text"
              className="ui-snackbar-action"
              onPress={() => {
                toast.content.onAction?.();
                queue.close(toast.key);
              }}
            >
              {toast.content.actionLabel}
            </Button>
          )}
          <Button
            variant="text"
            className="ui-snackbar-action"
            slot="close"
            aria-label={closeLabel}
          >
            {closeLabel}
          </Button>
        </Toast>
      )}
    </ToastRegion>
  );
}
