import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import {
  Button,
  Card,
  Checkbox,
  Fab,
  Icon,
  Select,
  Slider,
  TextField,
  VisuallyHidden,
  snackbarQueue,
  useSpring,
  type SelectOption,
} from '../../ui';
import { t } from '../../shared/i18n';
import { useAppStore } from '../../shared/store';
import { useSettingsStore } from '../../shared/settingsStore';
import { useModeHistory } from '../../shared/useModeHistory';
import { useHistoryStore } from '../../shared/historyStore';
import type { HistoryEntry } from '../../shared/history';
import {
  convert,
  type Category,
  type QuantityFormatOptions,
} from '../../units';
import {
  categoryFor,
  categoryIndex,
  compoundText,
  convertReducer,
  filteredCategories,
  historyDecision,
  historyPayload,
  initialConvertState,
  numericText,
  numberLocale,
  pairKey,
  quantity,
  restorePayload,
  resultsFor,
  sortedUnits,
  unitFor,
  type ConvertState,
  type UnitPair,
} from './model';
import { useConvertStore } from './preferences';
import './ConvertMode.css';
import {
  shortcutMatches,
  isInputTarget,
  shortcutHint,
} from '../../app/shortcuts';
import { CopyLinkButton } from '../../app/CopyLinkButton';
import { readModeLink } from '../../app/permalinks';

function AnimatedNumber({
  value,
  unitId,
  options,
}: {
  value: string;
  unitId: string;
  options: QuantityFormatOptions;
}) {
  const target = Number(value);
  const animated = useSpring(
    Number.isFinite(target) ? target : 0,
    'effects-default',
  );
  const final = numericText(value, unitId, options);
  const text =
    Number.isFinite(target) &&
    Math.abs(target) < 1e15 &&
    Math.abs(animated - target) > Math.max(Math.abs(target), 1) * 1e-8
      ? numericText(String(animated), unitId, options)
      : final;
  return (
    <output
      className="convert-result"
      aria-label={t('convert.result')}
      aria-live="polite"
    >
      <span aria-hidden="true">{text}</span>
      <VisuallyHidden>{final}</VisuallyHidden>
    </output>
  );
}
function unitOptions(
  category: Category,
  locale: 'de' | 'en',
  favorites: readonly UnitPair[],
  recent: readonly UnitPair[],
): SelectOption[] {
  const favoriteIds = new Set(
    favorites
      .filter((p) => p.categoryId === category.id)
      .flatMap((p) => [p.fromId, p.toId]),
  );
  const recentIds = new Set(
    recent
      .filter((p) => p.categoryId === category.id)
      .flatMap((p) => [p.fromId, p.toId]),
  );
  const options = sortedUnits(category, 'system', locale).map((u) => ({
    id: u.id,
    label: `${u.symbol} · ${u.names[locale]}`,
    group: favoriteIds.has(u.id)
      ? t('convert.favorites', locale)
      : recentIds.has(u.id)
        ? t('convert.recent', locale)
        : t(`convert.system.${u.system}`, locale),
    rank: favoriteIds.has(u.id) ? 0 : recentIds.has(u.id) ? 1 : 2,
  }));
  return options.sort((a, b) => a.rank - b.rank);
}
const categorySymbols: Record<string, string> = {
  length: '↔',
  area: '▧',
  volume: '◩',
  mass: '⚖',
  time: '◷',
  temperature: '°',
  speed: '↗',
  acceleration: '↗²',
  force: 'F',
  pressure: 'P',
  energy: 'E',
  power: 'W',
  frequency: '∿',
  angle: '∠',
  data: '01',
  'data-rate': '01/s',
  charge: '±',
};
const signature = (state: ConvertState): string =>
  `${pairKey(state)}:${state.value}`;
export default function ConvertMode() {
  const [state, dispatch] = useReducer(convertReducer, undefined, () => ({
    ...initialConvertState(),
    ...(readModeLink('convert') ?? {}),
  }));
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [queryError, setQueryError] = useState<ConvertState['error']>(null);
  const locale = useAppStore((s) => s.locale);
  const decimalSeparator = useSettingsStore((s) => s.decimalSeparator);
  const grouping = useSettingsStore((s) => s.grouping);
  const preferences = useConvertStore();
  const root = useRef<HTMLElement>(null);
  const categoryGrid = useRef<HTMLDivElement>(null);
  const quick = useRef<HTMLFormElement>(null);
  const fromField = useRef<HTMLDivElement>(null);
  const sent = useRef('');
  const category = categoryFor(state.categoryId);
  const categories = filteredCategories(search, locale);
  const formatLocale = numberLocale(locale, { decimalSeparator, grouping });
  const options = {
    digits: preferences.digits,
    notation: preferences.notation,
    locale: formatLocale,
    grouping,
  };
  const values = useMemo(() => resultsFor(state), [state]);
  const units = sortedUnits(category, preferences.sort, locale);
  const pickerOptions = unitOptions(
    category,
    locale,
    preferences.favorites,
    preferences.recent,
  );
  const favorite = preferences.favorites.some(
    (p) => pairKey(p) === pairKey(state),
  );
  const restore = useCallback((entry: HistoryEntry) => {
    const payload = restorePayload(entry.payload);
    if (!payload) return;
    sent.current = `${pairKey(payload)}:${payload.value}`;
    dispatch({ type: 'restore', payload });
  }, []);
  const { add } = useModeHistory('convert', restore);
  useEffect(() => {
    if (!state.revision || state.error || sent.current === signature(state))
      return;
    const timer = window.setTimeout(() => {
      const latest = useHistoryStore
        .getState()
        .entries.find((e) => e.mode === 'convert');
      const decision = historyDecision(state, latest);
      if (decision === 'skip') return;
      const data = {
        input: `${quantity(state.value, state.fromId, options)} → ${unitFor(state.toId).symbol}`,
        result: quantity(
          convert(state.value, state.fromId, state.toId).toString(),
          state.toId,
          options,
        ),
        payload: historyPayload(state),
      };
      if (decision === 'replace' && latest)
        useHistoryStore.getState().replace(latest.id, data);
      else add(data);
      useConvertStore.getState().remember(state);
      sent.current = signature(state);
    }, 1500);
    return () => window.clearTimeout(timer);
    // Formatting preferences must not reset the quiet period or create history.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.value,
    state.fromId,
    state.toId,
    state.categoryId,
    state.error,
    state.revision,
    add,
  ]);

  useEffect(() => {
    function keydown(event: KeyboardEvent): void {
      if (
        event.isComposing ||
        !root.current ||
        root.current.closest('[inert]') ||
        document.querySelector(
          '[role="dialog"], [role="menu"], [role="listbox"]',
        )
      )
        return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest('.shell-history, .shell-personalization')) return;
      if (
        shortcutMatches('convert.swap', event) &&
        !isInputTarget(event.target)
      ) {
        event.preventDefault();
        dispatch({ type: 'swap' });
        return;
      }
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        target?.closest('input, textarea, select, [contenteditable="true"]')
      )
        return;
      if (shortcutMatches('convert.quick', event)) {
        event.preventDefault();
        quick.current?.querySelector('input')?.focus();
      } else if (shortcutMatches('convert.digits', event)) {
        event.preventDefault();
        fromField.current?.querySelector('input')?.focus();
        dispatch({
          type: 'edit',
          side: 'from',
          text: event.key,
          locale: formatLocale,
          grouping,
        });
      }
    }
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [formatLocale, grouping]);

  function applyQuery(): void {
    const next = convertReducer(state, {
      type: 'query',
      text: query,
      locale: formatLocale,
    });
    setQueryError(next.error);
    if (!next.error) {
      dispatch({ type: 'query', text: query, locale: formatLocale });
      fromField.current?.querySelector('input')?.focus();
    }
  }
  async function copy(value: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      snackbarQueue.add({ message: t('history.copied', locale) });
    } catch {
      snackbarQueue.add({ message: t('history.copyError', locale) });
    }
  }
  const fromText =
    state.draft?.side === 'from'
      ? state.draft.text
      : numericText(state.value, state.fromId, {
          locale: formatLocale,
          digits: 50,
          grouping: false,
        });
  const toText =
    state.draft?.side === 'to'
      ? state.draft.text
      : values[state.toId]
        ? numericText(values[state.toId] ?? '0', state.toId, options)
        : '';
  const compound = preferences.compound
    ? compoundText(state, formatLocale)
    : null;
  const special = [state.fromId, state.toId];
  const yearNote = special.some((id) =>
    ['year', 'decade', 'century', 'ly'].includes(id),
  );
  const machNote = special.includes('mach-isa');
  function pairList(
    pairs: readonly UnitPair[],
    heading: 'convert.favorites' | 'convert.recent',
  ) {
    return (
      <section className="convert-pairs" aria-label={t(heading, locale)}>
        <h3>{t(heading, locale)}</h3>
        <div>
          {pairs.length ? (
            pairs.map((pair) => (
              <Button
                key={pairKey(pair)}
                variant="tonal"
                size="sm"
                onPress={() => dispatch({ type: 'pair', pair })}
                aria-label={t('convert.loadPair', locale, {
                  category: categoryFor(pair.categoryId).names[locale],
                  from: unitFor(pair.fromId).symbol,
                  to: unitFor(pair.toId).symbol,
                })}
              >
                {unitFor(pair.fromId).symbol} → {unitFor(pair.toId).symbol}
              </Button>
            ))
          ) : (
            <p>{t('convert.noPairs', locale)}</p>
          )}
        </div>
      </section>
    );
  }
  return (
    <section
      ref={root}
      className="convert-mode"
      aria-label={t('convert.title', locale)}
    >
      <header className="convert-heading">
        <CopyLinkButton mode="convert" data={state} />
        <div>
          <p className="shell-eyebrow">{t('convert.eyebrow', locale)}</p>
          <h1>{t('convert.title', locale)}</h1>
        </div>
        <p>{t('convert.subtitle', locale)}</p>
      </header>
      <form
        ref={quick}
        aria-label={t('convert.quick', locale)}
        className="convert-quick"
        onSubmit={(event) => {
          event.preventDefault();
          applyQuery();
        }}
      >
        <TextField
          label={t('convert.quick', locale)}
          description={t('convert.quickHint', locale)}
          value={query}
          onChange={(value) => {
            setQuery(value);
            setQueryError(null);
          }}
          isInvalid={!!queryError}
          errorMessage={
            queryError ? t(`convert.error.${queryError}`, locale) : undefined
          }
        />
        <Button type="submit">{t('convert.apply', locale)}</Button>
      </form>
      <div className="convert-layout">
        <aside
          className="convert-categories"
          aria-label={t('convert.categories', locale)}
        >
          <TextField
            type="search"
            label={t('convert.searchCategories', locale)}
            value={search}
            onChange={setSearch}
          />
          <div
            ref={categoryGrid}
            className="convert-category-grid"
            role="toolbar"
            aria-label={t('convert.categories', locale)}
            onKeyDown={(event) => {
              if (
                ![
                  'ArrowLeft',
                  'ArrowRight',
                  'ArrowUp',
                  'ArrowDown',
                  'Home',
                  'End',
                ].includes(event.key)
              )
                return;
              const buttons = [
                ...(categoryGrid.current?.querySelectorAll<HTMLButtonElement>(
                  'button',
                ) ?? []),
              ];
              const index = buttons.indexOf(event.target as HTMLButtonElement);
              if (index < 0) return;
              event.preventDefault();
              const columns =
                buttons.filter(
                  (button) => button.offsetTop === buttons[0]?.offsetTop,
                ).length || 1;
              const nextIndex = categoryIndex(
                index,
                event.key,
                buttons.length,
                columns,
              );
              const next = categories[nextIndex];
              if (next) {
                dispatch({ type: 'category', id: next.id });
                buttons[nextIndex]?.focus();
              }
            }}
          >
            {categories.map((c) => (
              <Card
                key={c.id}
                className="convert-category"
                data-active={c.id === category.id || undefined}
              >
                <Button
                  variant="text"
                  isSelected={c.id === category.id}
                  onPress={() => dispatch({ type: 'category', id: c.id })}
                >
                  <span aria-hidden="true" className="convert-category-icon">
                    {categorySymbols[c.id] ?? '±'}
                  </span>
                  <span>{c.names[locale]}</span>
                </Button>
              </Card>
            ))}
          </div>
          {!categories.length && (
            <p role="status">{t('history.noResults', locale)}</p>
          )}
        </aside>
        <div className="convert-main" key={category.id}>
          <div className="convert-category-heading">
            <h2>{category.names[locale]}</h2>
            <Button
              variant="text"
              isSelected={favorite}
              onPress={() => preferences.toggleFavorite(state)}
              aria-label={t(
                favorite ? 'convert.unfavorite' : 'convert.favorite',
                locale,
              )}
            >
              <Icon name="push_pin" filled={favorite} />
              {t('convert.pair', locale)}
            </Button>
          </div>
          <div className="convert-fields">
            <Card className="convert-field">
              <div ref={fromField}>
                <TextField
                  label={t('convert.from', locale)}
                  inputMode="decimal"
                  value={fromText}
                  onChange={(text) =>
                    dispatch({
                      type: 'edit',
                      side: 'from',
                      text,
                      locale: formatLocale,
                      grouping,
                    })
                  }
                  isInvalid={!!state.error && state.draft?.side !== 'to'}
                  errorMessage={
                    state.error && state.draft?.side !== 'to'
                      ? t(`convert.error.${state.error}`, locale)
                      : undefined
                  }
                />
              </div>
              <Select
                searchable
                label={t('convert.fromUnit', locale)}
                options={pickerOptions}
                selectedKey={state.fromId}
                onSelectionChange={(key) => {
                  if (key)
                    dispatch({ type: 'unit', side: 'from', id: String(key) });
                }}
              />
            </Card>
            <Fab
              icon="swap_horiz"
              aria-label={t('convert.swap', locale)}
              title={`${t('convert.swap', locale)} · ${shortcutHint('convert.swap')}`}
              className="convert-swap"
              isDisabled={!!state.error}
              onPress={() => dispatch({ type: 'swap' })}
              style={{ rotate: `${state.swaps * 180}deg` }}
            />
            <Card className="convert-field convert-target">
              <TextField
                label={t('convert.to', locale)}
                inputMode="decimal"
                value={toText}
                onChange={(text) =>
                  dispatch({
                    type: 'edit',
                    side: 'to',
                    text,
                    locale: formatLocale,
                    grouping,
                  })
                }
                isInvalid={!!state.error && state.draft?.side === 'to'}
                errorMessage={
                  state.error && state.draft?.side === 'to'
                    ? t(`convert.error.${state.error}`, locale)
                    : undefined
                }
              />
              <Select
                searchable
                label={t('convert.toUnit', locale)}
                options={pickerOptions}
                selectedKey={state.toId}
                onSelectionChange={(key) => {
                  if (key)
                    dispatch({ type: 'unit', side: 'to', id: String(key) });
                }}
              />
            </Card>
          </div>
          <div className="convert-live">
            {!state.error && values[state.toId] && (
              <>
                <AnimatedNumber
                  value={values[state.toId] ?? '0'}
                  unitId={state.toId}
                  options={options}
                />
                <span>{unitFor(state.toId).symbol}</span>
                <Button
                  variant="text"
                  aria-label={t('convert.copyResult', locale)}
                  onPress={() => {
                    void copy(
                      quantity(values[state.toId] ?? '0', state.toId, options),
                    );
                  }}
                >
                  <Icon name="content_copy" />
                </Button>
              </>
            )}
          </div>
          <div className="convert-format">
            <Slider
              label={t('convert.precision', locale)}
              minValue={1}
              maxValue={50}
              step={1}
              value={preferences.digits}
              onChange={(digits) => preferences.update({ digits })}
            />
            <Select
              label={t('convert.notation', locale)}
              selectedKey={preferences.notation}
              onSelectionChange={(key) => {
                if (key === 'auto' || key === 'sci' || key === 'eng')
                  preferences.update({ notation: key });
              }}
              options={(['auto', 'sci', 'eng'] as const).map((id) => ({
                id,
                label: t(`convert.notation.${id}`, locale),
              }))}
            />
          </div>
          {['length', 'time'].includes(category.id) && (
            <Checkbox
              isSelected={preferences.compound}
              onChange={(compound) => preferences.update({ compound })}
            >
              {t('convert.compound', locale)}
            </Checkbox>
          )}
          {compound && <output className="convert-compound">{compound}</output>}
          {yearNote && (
            <p className="convert-note">{t('convert.yearNote', locale)}</p>
          )}
          {machNote && (
            <p className="convert-note">{t('convert.machNote', locale)}</p>
          )}
          {pairList(preferences.favorites, 'convert.favorites')}
          {pairList(preferences.recent, 'convert.recent')}
          <p className="convert-keyboard-hint">
            {t('convert.keyboardHint', locale)}
          </p>
        </div>
        <section className="convert-all" aria-label={t('convert.all', locale)}>
          <div className="convert-all-heading">
            <h2>{t('convert.all', locale)}</h2>
            <Select
              label={t('convert.sort', locale)}
              selectedKey={preferences.sort}
              options={(['system', 'size'] as const).map((id) => ({
                id,
                label: t(`convert.sort.${id}`, locale),
              }))}
              onSelectionChange={(key) => {
                if (key === 'system' || key === 'size')
                  preferences.update({ sort: key });
              }}
            />
          </div>
          <div className="convert-unit-grid">
            {units.map((unit) => (
              <Card
                key={unit.id}
                className="convert-unit-card"
                data-active={unit.id === state.toId || undefined}
              >
                <Button
                  variant="text"
                  isDisabled={!!state.error}
                  aria-label={t('convert.copyUnit', locale, {
                    unit: unit.names[locale],
                  })}
                  onPress={() => {
                    const value = values[unit.id];
                    if (value !== undefined)
                      void copy(quantity(value, unit.id, options));
                  }}
                >
                  <span className="convert-unit-name">
                    {unit.names[locale]}
                  </span>
                  <strong className="expression">
                    {values[unit.id] !== undefined
                      ? numericText(values[unit.id] ?? '0', unit.id, options)
                      : '—'}
                  </strong>
                  <span className="convert-unit-symbol">
                    {unit.symbol}
                    <Icon name="content_copy" />
                  </span>
                  <span className="convert-unit-system">
                    {t(`convert.system.${unit.system}`, locale)}
                  </span>
                </Button>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
