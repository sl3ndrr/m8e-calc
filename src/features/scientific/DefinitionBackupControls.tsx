import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { t, type Locale } from '../../shared/i18n/extended';
import {
  DefinitionBackupError,
  prepareDefinitionReplacement,
  type DefinitionBackup,
} from './definitionBackup';
import { downloadDefinitions, readDefinitionFile } from './definitionFiles';
import {
  useScientificStore,
  type DefinitionImportResult,
} from './scientificStore';
import './DefinitionBackupControls.css';

interface Preview {
  backup: DefinitionBackup;
  revision: number;
  replacedNames: string[];
}
type Notice =
  | Exclude<DefinitionImportResult, 'ok'>
  | 'exported'
  | 'imported'
  | 'fileError';
export function DefinitionBackupControls({ locale }: { locale: Locale }) {
  const revision = useScientificStore((s) => s.revision);
  const recovery = useScientificStore((s) => s.recovery);
  const importing = useScientificStore((s) => s.importing);
  const [open, setOpen] = useState(false);
  const [reading, setReading] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const exportTrigger = useRef<HTMLButtonElement>(null);
  const readId = useRef(0);
  const scopeId = useId();
  useEffect(
    () => () => {
      readId.current++;
    },
    [],
  );
  const stale = preview !== null && preview.revision !== revision;
  function onOpenChange(next: boolean): void {
    if (useScientificStore.getState().importing) return;
    readId.current++;
    setReading(false);
    setPreview(null);
    setNotice(null);
    setOpen(next);
  }
  function failure(error: unknown): void {
    setNotice(error instanceof DefinitionBackupError ? error.code : 'fileError');
  }
  function showPreview(backup: DefinitionBackup): void {
    const current = useScientificStore.getState();
    if (current.recovery !== null) {
      setNotice('locked');
      return;
    }
    prepareDefinitionReplacement(backup, current.environment);
    setPreview({
      backup,
      revision: current.revision,
      replacedNames: [
        ...Object.keys(current.environment.variables),
        ...Object.keys(current.environment.functions),
      ].sort(),
    });
    setNotice(null);
  }
  async function read(file: File): Promise<void> {
    const id = ++readId.current;
    setReading(true);
    setPreview(null);
    setNotice(null);
    try {
      const backup = await readDefinitionFile(file);
      if (readId.current === id) showPreview(backup);
    } catch (error) {
      if (readId.current === id) failure(error);
    } finally {
      if (readId.current === id) setReading(false);
    }
  }
  async function confirm(): Promise<void> {
    if (!preview) return;
    const result = await useScientificStore
      .getState()
      .replaceDefinitions(preview.revision, preview.backup);
    if (result === 'ok') {
      setPreview(null);
      setNotice('imported');
      requestAnimationFrame(() => exportTrigger.current?.focus());
    } else setNotice(result);
  }
  function names(label: string, values: string[]) {
    return (
      <section aria-label={label}>
        <h3>{label}</h3>
        {values.length ? (
          <ul>
            {values.map((name) => (
              <li key={name}>
                <code>{name}</code>
              </li>
            ))}
          </ul>
        ) : (
          <p>{t('scientific.backup.none', locale)}</p>
        )}
      </section>
    );
  }
  return (
    <>
      <Button variant="outlined" onPress={() => onOpenChange(true)}>
        {t('scientific.backup.open', locale)}
      </Button>
      <Dialog
        title={t('scientific.backup.title', locale)}
        closeLabel={t('ui.close', locale)}
        isOpen={open}
        onOpenChange={onOpenChange}
        isDismissable={!importing}
        isKeyboardDismissDisabled={importing}
        className="scientific-backup-dialog"
        scrollable
      >
        <div
          className="scientific-backup-content"
          aria-busy={reading || importing}
        >
          <p id={scopeId}>{t('scientific.backup.scope', locale)}</p>
          <p>{t('scientific.backup.limit', locale)}</p>
          <div className="scientific-backup-actions">
            <Button
              ref={exportTrigger}
              variant="outlined"
              isDisabled={reading || importing}
              aria-describedby={scopeId}
              onPress={() => {
                try {
                  downloadDefinitions(useScientificStore.getState().environment);
                  setNotice('exported');
                } catch (error) {
                  failure(error);
                }
              }}
            >
              {t('scientific.backup.export', locale)}
            </Button>
            <Button
              variant="outlined"
              isDisabled={recovery !== null || reading || importing}
              aria-describedby={scopeId}
              onPress={() => input.current?.click()}
            >
              {t('scientific.backup.import', locale)}
            </Button>
            <input
              ref={input}
              type="file"
              hidden
              accept=".json,application/json"
              aria-label={t('scientific.backup.file', locale)}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = '';
                if (file) void read(file);
              }}
            />
          </div>
          {recovery !== null && <p>{t('scientific.backup.locked', locale)}</p>}
          <p role="status" aria-atomic="true">
            {reading
              ? t('scientific.backup.reading', locale)
              : importing
                ? t('scientific.backup.saving', locale)
                : notice
                  ? t(`scientific.backup.${notice}`, locale)
                  : ''}
          </p>
          {preview && (
            <section aria-label={t('scientific.backup.preview', locale)}>
              <h3>{t('scientific.backup.preview', locale)}</h3>
              {names(
                t('scientific.backup.variables', locale, {
                  count: Object.keys(preview.backup.variables).length,
                }),
                Object.keys(preview.backup.variables).sort(),
              )}
              {names(
                t('scientific.backup.functions', locale, {
                  count: Object.keys(preview.backup.functions).length,
                }),
                Object.keys(preview.backup.functions).sort(),
              )}
              {names(
                t('scientific.backup.replaced', locale, {
                  count: preview.replacedNames.length,
                }),
                preview.replacedNames,
              )}
              <p>{t('scientific.backup.replaceHint', locale)}</p>
              {stale && <p role="status">{t('scientific.backup.stale', locale)}</p>}
              <div className="scientific-backup-actions">
                {stale && (
                  <Button
                    variant="outlined"
                    isDisabled={recovery !== null || importing}
                    onPress={() => {
                      try {
                        showPreview(preview.backup);
                      } catch (error) {
                        failure(error);
                      }
                    }}
                  >
                    {t('scientific.backup.refresh', locale)}
                  </Button>
                )}
                <Button
                  isDisabled={stale || recovery !== null || reading || importing}
                  onPress={() => void confirm()}
                >
                  {t('scientific.backup.replace', locale)}
                </Button>
                <Button
                  variant="text"
                  isDisabled={importing}
                  onPress={() => onOpenChange(false)}
                >
                  {t('scientific.backup.cancel', locale)}
                </Button>
              </div>
            </section>
          )}
        </div>
      </Dialog>
    </>
  );
}
