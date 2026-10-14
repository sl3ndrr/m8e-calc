import { useId, useMemo, useRef, useState } from 'react';
import { Dialog } from '../ui';
import { t } from '../shared/i18n';
import { useAppStore } from '../shared/store';
import { searchPalette, type PaletteCommand } from './paletteModel';
import { shortcutHint } from './shortcuts';
import './Comfort.css';
export function CommandPalette({
  onClose,
  onCommand,
}: {
  onClose: () => void;
  onCommand: (command: PaletteCommand) => void;
}) {
  const locale = useAppStore((s) => s.locale);
  const [query, setQuery] = useState(''),
    [active, setActive] = useState(0);
  const results = useMemo(() => searchPalette(query, locale), [query, locale]);
  const id = useId(),
    list = useRef<HTMLUListElement>(null);
  const selected = Math.min(active, Math.max(0, results.length - 1));
  function choose(command: PaletteCommand): void {
    onClose();
    // Let the modal restore its trigger focus before an insertion focuses the editor.
    window.setTimeout(() => onCommand(command), 0);
  }
  return (
    <Dialog
      title={t('comfort.palette', locale)}
      closeLabel={t('ui.close', locale)}
      className="command-palette"
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <label htmlFor={`${id}-input`}>{t('comfort.search', locale)}</label>
      <input
        id={`${id}-input`}
        className="palette-input"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded="true"
        aria-controls={`${id}-list`}
        aria-activedescendant={results.length ? `${id}-${selected}` : undefined}
        aria-describedby={`${id}-hint`}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            const next = results.length
              ? (selected +
                  (event.key === 'ArrowDown' ? 1 : -1) +
                  results.length) %
                results.length
              : 0;
            setActive(next);
            list.current?.children[next]?.scrollIntoView({ block: 'nearest' });
          } else if (event.key === 'Enter') {
            event.preventDefault();
            const command = results[selected];
            if (command) choose(command);
          } else if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            onClose();
          }
        }}
      />
      <p id={`${id}-hint`}>{t('comfort.paletteHint', locale)}</p>
      <ul
        id={`${id}-list`}
        role="listbox"
        aria-label={t('comfort.results', locale)}
        ref={list}
        className="palette-results"
      >
        {results.map((command, index) => (
          <li
            key={command.id}
            id={`${id}-${index}`}
            role="option"
            tabIndex={-1}
            onKeyDown={(event) => {
              if (event.key === 'Enter') choose(command);
            }}
            aria-selected={index === selected}
            onMouseMove={() => setActive(index)}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => choose(command)}
          >
            <span>{command.label}</span>
            <small>{command.detail ?? shortcutHint(command.id)}</small>
          </li>
        ))}
      </ul>
      <p role="status" className="palette-count">
        {results.length
          ? t('comfort.resultCount', locale, { count: results.length })
          : t('history.noResults', locale)}
      </p>
    </Dialog>
  );
}
