import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Button } from '../../ui/Button';
import { ButtonGroup } from '../../ui/ButtonGroup';
import { Card } from '../../ui/Card';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { Slider } from '../../ui/Slider';
import { Switch } from '../../ui/Switch';
import { TextField } from '../../ui/TextField';
import { snackbarQueue } from '../../ui/snackbarQueue';
import { useMediaQuery } from '../../ui/useMediaQuery';
import { VisuallyHidden } from '../../ui/VisuallyHidden';
import {
  type AngleMode,
  type ComplexMode,
  type EngineError,
  type ValueFormatOptions,
} from '../../engine';
import { t } from '../../shared/i18n/extended';
import { useAppStore } from '../../shared/store';
import { useSettingsStore } from '../../shared/settingsStore';
import { useModeHistory } from '../../shared/useModeHistory';
import type { HistoryEntry } from '../../shared/history';
import {
  browseHistory,
  type HistoryCursor,
  type Insertion,
} from './editorModel';
import {
  displayResult,
  errorKey,
  resultLocale,
  type Calculation,
} from './model';
import { useScientificStore } from './scientificStore';
import {
  CalculationExecutor,
  type CalculationBusy,
} from './calculationExecutor';
import { restoreCalculation, type CalculationRequest } from './workerProtocol';
import type { EditorHandle } from './ExpressionEditor';
import { ScientificKeypad } from './ScientificKeypad';
import { ConstantsPanel, VariablesPanel } from './ReferencePanels';
import { ProgrammerPanel } from './programmer/ProgrammerPanel';
import { integerResult, reconfigure } from './programmer/model';
import {
  defaultWordOptions,
  word,
  type WordOptions,
} from '../../engine/programmer';
import './ScientificMode.css';
import { CopyLinkButton } from '../../app/CopyLinkButton';
import { readModeLink, validateScientificLink } from '../../app/permalinks';
import { useScientificInsertion } from '../../app/scientificInsertion';
import { loadModeModule } from '../../app/ModeErrorBoundary';
const ExpressionEditor = lazy(() =>
  loadModeModule(import('./ExpressionEditor')),
);
const MathDisplay = lazy(() => loadModeModule(import('./MathDisplay')));
export default function ScientificMode() {
  const wide = useMediaQuery('(min-width: 1920px)');
  const locale = useAppStore((s) => s.locale);
  const separator = useSettingsStore((s) => s.decimalSeparator),
    grouping = useSettingsStore((s) => s.grouping);
  const environment = useScientificStore((s) => s.environment),
    environmentRevision = useScientificStore((s) => s.revision),
    remove = useScientificStore((s) => s.remove),
    recovery = useScientificStore((s) => s.recovery);
  const [expression, setExpression] = useState(
      () =>
        readModeLink('scientific', validateScientificLink)?.expression ?? '',
    ),
    [error, setError] = useState<EngineError | null>(null),
    [calculation, setCalculation] = useState<Calculation | null>(null);
  const [angleMode, setAngleMode] = useState<AngleMode>(
      () =>
        readModeLink('scientific', validateScientificLink)?.angleMode ?? 'deg',
    ),
    [complex, setComplex] = useState<ComplexMode>('off');
  const [notation, setNotation] =
      useState<NonNullable<ValueFormatOptions['notation']>>('auto'),
    [digits, setDigits] = useState(15),
    [fraction, setFraction] = useState(false);
  const [programmer, setProgrammer] = useState<WordOptions>(defaultWordOptions),
    [wordValue, setWordValue] = useState(0n);
  const [tab, setTab] = useState('keypad'),
    [storeName, setStoreName] = useState('a'),
    [storeError, setStoreError] = useState('');
  const [editingName, setEditingName] = useState<string | null>(null);
  const [live, setLive] = useState<Calculation | null>(null);
  const [busy, setBusy] = useState<CalculationBusy>(null);
  const [workMessage, setWorkMessage] = useState<
    'cancelled' | 'failed' | null
  >(null);
  const executor = useRef<CalculationExecutor | null>(null);
  const inputRevision = useRef(0),
    executionRevision = useRef(0),
    requestId = useRef(0);
  const previewTimer = useRef<number | null>(null);
  const clearPreviewTimer = useCallback(() => {
    if (previewTimer.current !== null) window.clearTimeout(previewTimer.current);
    previewTimer.current = null;
  }, []);
  const invalidate = useCallback(() => {
    executionRevision.current++;
    clearPreviewTimer();
    executor.current?.cancel();
    setLive(null);
    setWorkMessage(null);
  }, [clearPreviewTimer]);
  useEffect(() => {
    const adapter = new CalculationExecutor(setBusy);
    executor.current = adapter;
    const unsubscribe = useScientificStore.subscribe((next, previous) => {
      if (next.revision !== previous.revision) invalidate();
    });
    return () => {
      clearPreviewTimer();
      unsubscribe();
      adapter.dispose();
      executor.current = null;
    };
  }, [clearPreviewTimer, invalidate]);
  const editor = useRef<EditorHandle>(null),
    cursor = useRef<HistoryCursor>({ index: -1, draft: '' });
  const change = useCallback(
    (text: string) => {
      inputRevision.current++;
      clearPreviewTimer();
      executor.current?.cancelPreview();
      if (!text) {
        invalidate();
        setEditingName(null);
      }
      setLive(null);
      setWorkMessage(null);
      setExpression(text);
      setError(null);
      cursor.current = { index: -1, draft: text };
    },
    [clearPreviewTimer, invalidate],
  );
  const restore = useCallback(
    (entry: HistoryEntry) => {
      const p = entry.payload;
      if (
        !p ||
        typeof p !== 'object' ||
        Array.isArray(p) ||
        p.version !== 1 ||
        typeof p.expression !== 'string'
      )
        return;
      invalidate();
      if (
        p.programmer &&
        typeof p.programmer === 'object' &&
        !Array.isArray(p.programmer)
      ) {
        const config = p.programmer;
        if (
          [8, 16, 32, 64].includes(Number(config.width)) &&
          typeof config.signed === 'boolean' &&
          (config.overflow === 'wrap' || config.overflow === 'error')
        ) {
          const next: WordOptions = {
            width: Number(config.width) as WordOptions['width'],
            signed: config.signed,
            overflow: config.overflow,
          };
          setProgrammer(next);
          setWordValue(0n);
          setTab('computerScience');
        }
      }
      change(p.expression);
      setEditingName(null);
      editor.current?.focus();
    },
    [change, invalidate],
  );
  const { entries, add } = useModeHistory('scientific', restore);
  const bitwise = tab === 'computerScience';
  const options = { angleMode, complex, bitwise, programmer };
  const format = {
    notation,
    digits: bitwise ? 50 : digits,
    locale: resultLocale(locale, separator),
    grouping,
    angleMode,
  };
  const displayed = calculation?.value
    ? displayResult(calculation.value, format, fraction)
    : null;
  const liveText = live?.value
    ? displayResult(live.value, format, fraction).text
    : null;
  useEffect(() => {
    if (!expression.trim() || recovery === 'loading') return;
    const capturedInput = inputRevision.current;
    const capturedExecution = executionRevision.current;
    const adapter = executor.current;
    const timer = window.setTimeout(() => {
      previewTimer.current = null;
      if (!adapter || capturedInput !== inputRevision.current || capturedExecution !== executionRevision.current) return;
      const request: CalculationRequest = {
        version: 1, id: ++requestId.current, kind: 'preview', expression,
        environment, environmentRevision, inputRevision: capturedInput,
        executionRevision: capturedExecution, options: { angleMode, complex, bitwise, programmer }, editingName: null,
      };
      adapter.submit(request, (response) => {
        if (capturedInput !== inputRevision.current || capturedExecution !== executionRevision.current ||
          useScientificStore.getState().revision !== environmentRevision) return;
        if (response.status === 'preview') setLive(response.calculation ? restoreCalculation(response.calculation) : null);
      }, () => {
        if (capturedInput === inputRevision.current && capturedExecution === executionRevision.current) setWorkMessage('failed');
      });
    }, 250);
    previewTimer.current = timer;
    return () => window.clearTimeout(timer);
  }, [expression, environment, environmentRevision, angleMode, complex, bitwise, programmer, recovery]);
  function evaluate(source: string = expression, kind: 'execute' | 'store' = 'execute'): void {
    const snapshot = useScientificStore.getState();
    if (snapshot.recovery === 'loading') return;
    invalidate();
    const revision = executionRevision.current;
    const input = inputRevision.current;
    const request: CalculationRequest = {
      version: 1, id: ++requestId.current, kind, expression: source,
      environment: snapshot.environment, environmentRevision: snapshot.revision,
      inputRevision: input, executionRevision: revision,
      options: { ...options, programmer: { ...programmer } }, editingName: kind === 'execute' ? editingName : null,
    };
    executor.current?.submit(request, (response) => {
      if (revision !== executionRevision.current || snapshot.revision !== useScientificStore.getState().revision) return;
      if (response.status === 'error') {
        if (kind === 'store') setStoreError(t(errorKey(response.error), locale));
        else if (input === inputRevision.current) setError(response.error);
        return;
      }
      if (response.status !== 'success') return;
      const result = restoreCalculation(response.calculation);
      if (!useScientificStore.getState().commitIfCurrent(snapshot.revision, response.environment)) return;
      if (kind === 'store') {
        setStoreError('');
        setTab('variables');
        return;
      }
      // Commit Enter's captured intent, but never overwrite a subsequently edited draft/result.
      if (input === inputRevision.current) {
        setError(null);
        setEditingName(null);
        setCalculation(result);
        const integer = integerResult(result.value);
        if (bitwise && integer !== null) setWordValue(word(integer, programmer));
        cursor.current = { index: -1, draft: source };
      }
      const output = result.value
        ? displayResult(result.value, format, fraction)
        : { text: t('scientific.definitionSaved', locale), latex: '' };
      add({
        input: source, result: output.text,
        payload: {
          version: 1, expression: source,
          ...(bitwise ? { programmer: { ...programmer } } : {}),
          latex: { expression: result.expressionLatex, result: output.latex },
        },
      });
    }, () => {
      if (revision === executionRevision.current) setWorkMessage('failed');
    });
  }
  function selectTab(next: string): void {
    if ((next === 'computerScience') !== bitwise) invalidate();
    setTab(next);
  }
  async function retryStoredEnvironment(): Promise<void> {
    invalidate();
    await useScientificStore.persist.rehydrate();
    if (useScientificStore.getState().recovery === null) {
      setCalculation(null);
      setError(null);
      setLive(null);
      editor.current?.focus();
    }
  }
  function browse(direction: -1 | 1): void {
    const next = browseHistory(
      cursor.current,
      direction,
      expression,
      entries.map((e) => e.input),
    );
    invalidate();
    change(next.text);
    cursor.current = next.cursor;
    setEditingName(null);
    setError(null);
  }
  function insert(insertion: Insertion): void {
    editor.current?.insert(insertion);
  }
  useScientificInsertion((text) => editor.current?.insert({ text }));
  async function copy(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
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
  function store(): void {
    if (!/^[A-Za-z_][A-Za-z_0-9]*$/.test(storeName) || !calculation?.value) {
      setStoreError(t('scientific.storeInvalid', locale));
      return;
    }
    evaluate(`${storeName} = ans`, 'store');
  }
  const math = (latex: string, label: string) => (
    <Suspense fallback={<div className="scientific-math">{label}</div>}>
      <MathDisplay latex={latex} label={label} />
    </Suspense>
  );
  return (
    <section
      className="scientific-workspace"
      aria-label={t('mode.scientific', locale)}
    >
      <header className="scientific-heading">
        {wide && (
          <Button
            variant="text"
            isSelected={tab === 'computerScience'}
            onPress={() =>
              selectTab(tab === 'computerScience' ? 'keypad' : 'computerScience')
            }
          >
            {t('scientific.computerScience', locale)}
          </Button>
        )}
        <span className="scientific-badge">
          {t('scientific.math', locale)} · {t('scientific.physics', locale)}
        </span>
        <CopyLinkButton mode="scientific" data={{ expression, angleMode }} />
      </header>
      {recovery && (
        <Card className="scientific-recovery">
          <p role="status">{t(`scientific.recovery.${recovery}`, locale)}</p>
          {recovery !== 'loading' && (
            <>
              <p>{t('scientific.recovery.session', locale)}</p>
              <Button
                variant="outlined"
                onPress={() => void retryStoredEnvironment()}
              >
                {t('scientific.recovery.retry', locale)}
              </Button>
            </>
          )}
        </Card>
      )}
      <div className="scientific-columns">
        <div className="scientific-main-column">
          <Card className="scientific-expression-card">
            <h2>{t('scientific.expression', locale)}</h2>
            <div className="scientific-mode-controls">
              <div>
                <p className="scientific-control-label">
                  {t('scientific.angle', locale)}
                </p>
                <SegmentedControl
                  aria-label={t('scientific.angle', locale)}
                  value={angleMode}
                  onChange={(v) => {
                    invalidate();
                    setAngleMode(v as AngleMode);
                    setError(null);
                  }}
                  items={(['deg', 'rad', 'grad'] as const).map((id) => ({
                    id,
                    label: t(`scientific.${id}`, locale),
                  }))}
                />
              </div>
              <div>
                <p className="scientific-control-label">
                  {t('scientific.complex', locale)}
                </p>
                <SegmentedControl
                  aria-label={t('scientific.complex', locale)}
                  value={complex}
                  onChange={(v) => {
                    invalidate();
                    setComplex(v as ComplexMode);
                    setError(null);
                  }}
                  items={(['off', 'on'] as const).map((id) => ({
                    id,
                    label: t(`scientific.${id}`, locale),
                  }))}
                />
              </div>
            </div>
            <Suspense
              fallback={
                <div className="scientific-editor scientific-editor-placeholder">
                  {t('ui.loading', locale)}
                </div>
              }
            >
              <ExpressionEditor
                ref={editor}
                value={expression}
                onChange={change}
                onEvaluate={() => evaluate()}
                onBrowse={browse}
                locale={locale}
                error={error}
              />
            </Suspense>
            <p id="scientific-editor-help" className="scientific-help">
              {t('scientific.hint', locale)}
            </p>
            {error && (
              <p
                id="scientific-editor-error"
                className="scientific-error"
                role="alert"
              >
                {t(errorKey(error), locale)}{' '}
                <span>({error.range.start + 1})</span>
              </p>
            )}
            <div
              className="scientific-preview"
              role="status"
              aria-label={t('scientific.preview', locale)}
            >
              {workMessage ? (
                <span role={workMessage === 'failed' ? 'alert' : undefined}>
                  {t(`scientific.work.${workMessage}`, locale)}
                </span>
              ) : busy ? (
                <span>
                  {t(
                    busy === 'preview'
                      ? 'scientific.work.preview'
                      : 'scientific.work.execute',
                    locale,
                  )}
                </span>
              ) : (
                liveText && (
                  <>
                    <span>{t('scientific.preview', locale)}</span>
                    <output>{liveText}</output>
                  </>
                )
              )}
            </div>
            <div className="scientific-actions">
              <Button
                isDisabled={recovery === 'loading'}
                onPress={() => evaluate()}
              >
                {t('scientific.evaluate', locale)}
              </Button>
              <Button
                variant="text"
                onPress={() => {
                  if (busy) {
                    invalidate();
                    setWorkMessage('cancelled');
                  } else change('');
                  editor.current?.focus();
                }}
              >
                {t(busy ? 'scientific.work.cancel' : 'scientific.clear', locale)}
              </Button>
            </div>
          </Card>
          <Card
            className="scientific-result-card"
            aria-label={t('scientific.result', locale)}
          >
            <h2>{t('scientific.result', locale)}</h2>
            <VisuallyHidden>
              <output
                className="scientific-result-text"
                aria-live="polite"
                aria-atomic="true"
              >
                {displayed?.text ?? ''}
              </output>
            </VisuallyHidden>
            {calculation ? (
              <>
                {math(
                  calculation.expressionLatex,
                  t('scientific.expression', locale),
                )}
                {displayed ? (
                  <>{math(displayed.latex, t('scientific.result', locale))}</>
                ) : (
                  <p role="status">{t('scientific.definitionSaved', locale)}</p>
                )}
              </>
            ) : (
              <p className="scientific-empty">
                {t('scientific.emptyResult', locale)}
              </p>
            )}
            <ButtonGroup aria-label={t('scientific.format', locale)} connected>
              {(['auto', 'fixed', 'sci', 'eng'] as const).map((n) => (
                <Button
                  key={n}
                  variant="tonal"
                  isSelected={notation === n}
                  onPress={() => setNotation(n)}
                >
                  {t(`scientific.${n}`, locale)}
                </Button>
              ))}
            </ButtonGroup>
            <Slider
              label={t('scientific.digits', locale)}
              minValue={1}
              maxValue={50}
              value={digits}
              onChange={setDigits}
            />
            <Switch
              isSelected={fraction}
              onChange={setFraction}
              isDisabled={calculation?.value?.kind !== 'number'}
            >
              {t('scientific.fraction', locale)}
            </Switch>
            <div className="scientific-actions">
              <Button
                variant="outlined"
                isDisabled={!displayed}
                onPress={() => {
                  if (displayed) void copy(displayed.text);
                }}
              >
                {t('scientific.copyText', locale)}
              </Button>
              <Button
                variant="outlined"
                isDisabled={!displayed}
                onPress={() => {
                  if (displayed)
                    void copy(
                      `${calculation?.expressionLatex} = ${displayed.latex}`,
                    );
                }}
              >
                {t('scientific.copyLatex', locale)}
              </Button>
            </div>
          </Card>
        </div>
        <div className="scientific-tools" data-tab={tab}>
          <div className="scientific-tabs">
            {!wide && (
              <SegmentedControl
                aria-label={t('scientific.tools', locale)}
                value={tab}
                onChange={selectTab}
                items={(
                  [
                    'keypad',
                    'constants',
                    'variables',
                    'computerScience',
                  ] as const
                ).map((id) => ({ id, label: t(`scientific.${id}`, locale) }))}
              />
            )}
          </div>
          <div className="scientific-keypad-wrap">
            <ScientificKeypad
              locale={locale}
              insert={insert}
              evaluate={() => evaluate()}
              clear={() => {
                change('');
                editor.current?.focus();
              }}
              store={store}
              recall={() => selectTab('variables')}
            />
            <TextField
              label={t('scientific.storeName', locale)}
              value={storeName}
              onChange={(v) => {
                setStoreName(v);
                setStoreError('');
              }}
              isInvalid={!!storeError}
              errorMessage={storeError}
              validationBehavior="aria"
            />
          </div>
          <div className="scientific-reference-column">
            <ConstantsPanel
              locale={locale}
              insert={(text) => insert({ text })}
              copy={(text) => {
                void copy(text);
              }}
            />
            <VariablesPanel
              locale={locale}
              environment={environment}
              format={format}
              insert={(text) => insert({ text })}
              edit={(source, name) => {
                invalidate();
                change(source);
                setEditingName(name);
                selectTab('variables');
                editor.current?.focus();
              }}
              remove={remove}
            />
          </div>
          <div className="scientific-ap9">
            <ProgrammerPanel
              value={wordValue}
              options={programmer}
              locale={locale}
              onRun={(source) => {
                change(source);
                evaluate(source);
              }}
              onConfigure={(next) => {
                try {
                  const value = reconfigure(wordValue, programmer, next);
                  invalidate();
                  setWordValue(value);
                  setProgrammer(next);
                  setError(null);
                } catch {
                  setError({
                    code: 'E_OVERFLOW',
                    range: { start: 0, end: expression.length },
                  });
                }
              }}
              copy={(text) => {
                void copy(text);
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
