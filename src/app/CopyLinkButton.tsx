import { Button, snackbarQueue } from '../ui';
import { t } from '../shared/i18n';
import type { ModeId } from '../shared/modes';
import { encodePermalink, type ModeLinks } from './permalinks';
export function CopyLinkButton<M extends ModeId>({
  mode,
  data,
}: {
  mode: M;
  data: ModeLinks[M] | (() => ModeLinks[M]);
}) {
  async function copy(): Promise<void> {
    try {
      const url = new URL(window.location.href);
      url.hash = encodePermalink(
        mode,
        typeof data === 'function' ? data() : data,
      );
      await navigator.clipboard.writeText(url.href);
      snackbarQueue.add(
        { message: t('comfort.linkCopied') },
        { timeout: 5000 },
      );
    } catch {
      snackbarQueue.add({ message: t('comfort.linkError') }, { timeout: 5000 });
    }
  }
  return (
    <Button
      variant="text"
      onPress={() => {
        void copy();
      }}
    >
      {t('comfort.copyLink')}
    </Button>
  );
}
