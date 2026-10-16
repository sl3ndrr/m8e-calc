import { IconButton } from '../ui/IconButton';
import { Tooltip } from '../ui/Tooltip';
import './CopyLinkButton.css';
import { snackbarQueue } from '../ui/snackbarQueue';
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
    <div className="mode-share">
      <Tooltip
        placement="bottom end"
        UNSTABLE_portalContainer={document.body}
        trigger={
          <IconButton
            type="button"
            icon="share"
            variant="text"
            aria-label={t('comfort.shareLink')}
            onPress={() => {
              void copy();
            }}
          />
        }
      >
        {t('comfort.shareLink')}
      </Tooltip>
    </div>
  );
}
