import { useEffect, useRef, useState } from 'react';
import { animate } from 'motion';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';
import { SideSheet } from '../ui/SideSheet';
import { TextField } from '../ui/TextField';
import { snackbarQueue } from '../ui/snackbarQueue';
import { useMediaQuery } from '../ui/useMediaQuery';
import { springs } from '../styles/motion';
import { useSettingsStore } from '../shared/settingsStore';
import { useAppStore } from '../shared/store';
import { useHistoryStore } from '../shared/historyStore';
import { useModeHistory } from '../shared/useModeHistory';
import {
  exportHistory,
  groupHistory,
  type ExportFormat,
  type HistoryEntry,
} from '../shared/history';
import type { ModeId } from '../shared/modes';
import { formatTime, t } from '../shared/i18n';
import { downloadFile } from './fileTransfer';
export function clearHistoryWithUndo(mode?: ModeId): void {
  const removed = useHistoryStore.getState().clear(mode);
  if (removed.length)
    snackbarQueue.add({
      message: t('history.cleared'),
      actionLabel: t('ui.undo'),
      onAction: () => useHistoryStore.getState().restoreEntries(removed),
    });
}
function HistoryItem({
  entry,
  restore,
}: {
  entry: HistoryEntry;
  restore: (entry: HistoryEntry) => boolean;
}) {
  const locale = useAppStore((state) => state.locale);
  const level = useSettingsStore((state) => state.motionLevel);
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const element = useRef<HTMLLIElement>(null);
  useEffect(() => {
    const node = element.current;
    if (!node || level === 'off') return;
    const token =
      springs[reduced || level === 'reduced' ? 'effects-fast' : 'spatial-fast'];
    const animation = animate(
      node,
      reduced || level === 'reduced'
        ? { opacity: [0, 1] }
        : { opacity: [0, 1], y: [16, 0], scale: [0.98, 1] },
      {
        type: 'spring',
        stiffness: token.stiffness,
        damping: 2 * token.damping * Math.sqrt(token.stiffness),
      },
    );
    return () => {
      // stop() preserves a sampled MotionValue and may queue its render.
      // Commit the neutral entrance goal before releasing the DOM styles.
      animation.complete();
      animation.stop();
      node.style.opacity = '';
      node.style.transform = '';
    };
  }, [level, reduced]);
  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(entry.result);
      snackbarQueue.add(
        { message: t('history.copied', locale) },
        { timeout: 5000 },
      );
    } catch {
      snackbarQueue.add(
        { message: t('history.copyError', locale) },
        { timeout: 5000 },
      );
    }
  }
  return (
    <li
      ref={element}
      className="history-entry"
      data-pinned={entry.pinned || undefined}
    >
      <Button
        variant="text"
        className="history-restore"
        aria-label={t('history.restore', locale, {
          input: `${entry.input} ${entry.result}`,
        })}
        onPress={() => {
          const restored = restore(entry);
          snackbarQueue.add(
            {
              message: t(
                restored ? 'history.restored' : 'history.unavailable',
                locale,
              ),
            },
            { timeout: 5000 },
          );
        }}
      >
        <span className="history-expression expression">
          <span>{entry.input}</span>{' '}
          <strong>{entry.result}</strong>
        </span>
      </Button>
      <div className="history-entry-footer">
        <time dateTime={new Date(entry.ts).toISOString()}>
          {formatTime(entry.ts, locale)}
        </time>
        <div className="history-entry-actions">
          <IconButton
            icon="push_pin"
            variant="text"
            aria-label={t(
              entry.pinned ? 'history.unpin' : 'history.pin',
              locale,
            )}
            isSelected={entry.pinned}
            onPress={() => useHistoryStore.getState().togglePin(entry.id)}
          />
          <IconButton
            icon="content_copy"
            variant="text"
            aria-label={t('history.copy', locale)}
            onPress={() => {
              void copy();
            }}
          />
          <IconButton
            icon="delete"
            variant="text"
            aria-label={t('history.delete', locale)}
            onPress={() => useHistoryStore.getState().remove(entry.id)}
          />
        </div>
      </div>
    </li>
  );
}
export function HistorySheet({
  mode,
  docked,
  visible,
  onClose,
}: {
  mode: ModeId;
  docked: boolean;
  visible: boolean;
  onClose: () => void;
}) {
  const locale = useAppStore((state) => state.locale);
  const [search, setSearch] = useState('');
  const { entries, restore } = useModeHistory(mode);
  const groups = groupHistory(entries, search, locale);
  function exportFile(format: ExportFormat): void {
    const extensions = { json: 'json', csv: 'csv', markdown: 'md' };
    const mime = {
      json: 'application/json',
      csv: 'text/csv;charset=utf-8',
      markdown: 'text/markdown;charset=utf-8',
    };
    downloadFile(
      exportHistory(entries, format),
      `m8e-calc-${mode}.${extensions[format]}`,
      mime[format],
    );
  }
  const contents = (
    <>
      <div className="history-heading">
        <span className="history-count">
          {t('history.count', locale, { count: entries.length })}
        </span>
        {docked && (
          <IconButton
            icon="close"
            variant="text"
            aria-label={t('ui.close', locale)}
            onPress={onClose}
          />
        )}
      </div>
      <TextField
        label={t('history.search', locale)}
        type="search"
        value={search}
        onChange={setSearch}
      />
      <div className="history-groups">
        {!entries.length ? (
          <div className="history-empty">
            <Icon name="history" />
            <h2>{t('history.empty', locale)}</h2>
            <p>{t('history.emptyHint', locale)}</p>
          </div>
        ) : !groups.length ? (
          <p role="status">{t('history.noResults', locale)}</p>
        ) : (
          groups.map((group) => (
            <section key={group.day} aria-label={group.label}>
              <h3>{group.label}</h3>
              <ul>
                {group.entries.map((entry) => (
                  <HistoryItem key={entry.id} entry={entry} restore={restore} />
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
      <div className="history-tools">
        <Button
          variant="text"
          isDisabled={!entries.length}
          onPress={() => clearHistoryWithUndo(mode)}
        >
          {t('history.clear', locale)}
        </Button>
        <div role="group" aria-label={t('history.export', locale)}>
          {(['json', 'csv', 'markdown'] as const).map((format) => (
            <Button
              key={format}
              variant="outlined"
              size="sm"
              isDisabled={!entries.length}
              onPress={() => exportFile(format)}
            >
              {t(`history.${format}`, locale)}
            </Button>
          ))}
        </div>
      </div>
    </>
  );
  if (docked && !visible) return null;
  return (
    <SideSheet
      title={t('history.title', locale)}
      closeLabel={t('ui.close', locale)}
      mode={docked ? 'docked' : 'modal'}
      isOpen={visible}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {contents}
    </SideSheet>
  );
}
