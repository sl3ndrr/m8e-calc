import { Dialog } from '../ui';
import { t } from '../shared/i18n';
import { useAppStore } from '../shared/store';
import { shortcuts } from './shortcuts';
export function ShortcutDialog({ onClose }: { onClose: () => void }) {
  const locale = useAppStore((s) => s.locale);
  return (
    <Dialog
      title={t('comfort.shortcuts', locale)}
      closeLabel={t('ui.close', locale)}
      className="shortcut-dialog"
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <p>{t('comfort.shortcutHint', locale)}</p>
      <table className="shortcut-table">
        <thead>
          <tr>
            <th>{t('comfort.action', locale)}</th>
            <th>{t('comfort.keys', locale)}</th>
            <th>{t('comfort.scope', locale)}</th>
          </tr>
        </thead>
        <tbody>
          {shortcuts.map((s) => (
            <tr key={s.id}>
              <td>{t(s.label, locale)}</td>
              <td>
                <kbd>{s.keys.join(' / ')}</kbd>
              </td>
              <td>
                {s.modes?.map((m) => t(`mode.${m}`, locale)).join(', ') ??
                  t('comfort.allModes', locale)}
                {s.inInput ? ` · ${t('comfort.inInput', locale)}` : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Dialog>
  );
}
