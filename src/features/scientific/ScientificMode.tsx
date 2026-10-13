import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Button,
  ButtonGroup,
  Card,
  SegmentedControl,
  Slider,
  Switch,
  TextField,
  snackbarQueue,
  useMediaQuery,
  VisuallyHidden,
} from '../../ui';
import {
  type AngleMode,
  type ComplexMode,
  type EngineError,
  type ValueFormatOptions,
} from '../../engine';
import { t } from '../../shared/i18n';
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
  calculate,
  displayResult,
  errorKey,
  preview,
  resultLocale,
  type Calculation,
} from './model';
import { useScientificStore } from './scientificStore';
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
const ExpressionEditor = lazy(() => import('./ExpressionEditor'));
const MathDisplay = lazy(() => import('./MathDisplay'));
export default function ScientificMode() {
  const wide = useMediaQuery('(min-width: 1920px)');
  const locale = useAppStore((s) => s.locale);
  const separator = useSettingsStore((s) => s.decimalSeparator),
    grouping = useSettingsStore((s) => s.grouping);
  const environment = useScientificStore((s) => s.environment),
    commit = useScientificStore((s) => s.commit),
    remove = useScientificStore((s) => s.remove);
  const [expression, setExpression] = useState(''),
    [error, setError] = useState<EngineError | null>(null),
    [calculation, setCalculation] = useState<Calculation | null>(null);
  const [angleMode, setAngleMode] = useState<AngleMode>('deg'),
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
  const [live, setLive] = useState<{
    expression: string;
    environment: typeof environment;
    angleMode: AngleMode;
    complex: ComplexMode;
    bitwise: boolean;
    programmer: WordOptions;
    calculation: Calculation | null;
  } | null>(null);
  const editor = useRef<EditorHandle>(null),
    cursor = useRef<HistoryCursor>({ index: -1, draft: '' });
  const change = useCallback((text: string) => {
    setExpression(text);
    setError(null);
    cursor.current = { index: -1, draft: text };
  }, []);
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
      editor.current?.focus();
    },
    [change],
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
  const liveCalculation =
    live?.expression === expression &&
    live.environment === environment &&
    live.angleMode === angleMode &&
    live.complex === complex &&
    live.bitwise === bitwise &&
    live.programmer === programmer
      ? live.calculation
      : null;
  const liveText = liveCalculation?.value
    ? displayResult(liveCalculation.value, format, fraction).text
    : null;
  useEffect(() => {
    const timer = window.setTimeout(
      () =>
        setLive({
          expression,
          environment,
          angleMode,
          complex,
          bitwise,
          programmer,
          calculation: preview(expression, environment, {
            angleMode,
            complex,
            bitwise,
            programmer,
          }),
        }),
      250,
    );
    return () => window.clearTimeout(timer);
  }, [expression, environment, angleMode, complex, bitwise, programmer]);
  function evaluate(source: string = expression): void {
    const result = calculate(source, environment, options);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setCalculation(result.calculation);
    const integer = integerResult(result.calculation.value);
    if (bitwise && integer !== null) setWordValue(word(integer, programmer));
    commit(result.environment);
    const output = result.calculation.value
      ? displayResult(result.calculation.value, format, fraction)
      : { text: t('scientific.definitionSaved', locale), latex: '' };
    add({
      input: source,
      result: output.text,
      payload: {
        version: 1,
        expression: source,
        ...(bitwise ? { programmer: { ...programmer } } : {}),
        latex: {
          expression: result.calculation.expressionLatex,
          result: output.latex,
        },
      },
    });
    cursor.current = { index: -1, draft: expression };
  }
  function browse(direction: -1 | 1): void {
    const next = browseHistory(
      cursor.current,
      direction,
      expression,
      entries.map((e) => e.input),
    );
    cursor.current = next.cursor;
    setExpression(next.text);
    setError(null);
  }
  function insert(insertion: Insertion): void {
    editor.current?.insert(insertion);
  }
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
    const result = calculate(`${storeName} = ans`, environment, options);
    if (!result.ok) {
      setStoreError(t(errorKey(result.error), locale));
      return;
    }
    commit(result.environment);
    setStoreError('');
    setTab('variables');
  }
  const math = (latex: string, label: string) => (
    <Suspense fallback={<div className="scientific-math">{label}</div>}>
      <MathDisplay latex={latex} label={label} />
    </Suspense>
  );
  return (
    <section
      className="scientific-workspace"
      aria-label={t('scientific.title', locale)}
    >
      <header className="scientific-heading">
        <div>
          <p>{t('scientific.subtitle', locale)}</p>
          <h1>{t('scientific.title', locale)}</h1>
        </div>
        {wide && (
          <Button
            variant="text"
            isSelected={tab === 'computerScience'}
            onPress={() =>
              setTab(tab === 'computerScience' ? 'keypad' : 'computerScience')
            }
          >
            {t('scientific.computerScience', locale)}
          </Button>
        )}
        <span className="scientific-badge">
          {t('scientific.math', locale)} · {t('scientific.physics', locale)}
        </span>
      </header>
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
            <Suspense fallback={<p>{t('ui.loading', locale)}</p>}>
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
              aria-label={t('scientific.preview', locale)}
            >
              {liveText && (
                <>
                  <span>{t('scientific.preview', locale)}</span>
                  <output>{liveText}</output>
                </>
              )}
            </div>
            <div className="scientific-actions">
              <Button onPress={() => evaluate()}>
                {t('scientific.evaluate', locale)}
              </Button>
              <Button
                variant="text"
                onPress={() => {
                  change('');
                  editor.current?.focus();
                }}
              >
                {t('scientific.clear', locale)}
              </Button>
            </div>
          </Card>
          <Card
            className="scientific-result-card"
            aria-label={t('scientific.result', locale)}
          >
            <h2>{t('scientific.result', locale)}</h2>
            {calculation ? (
              <>
                {math(
                  calculation.expressionLatex,
                  t('scientific.expression', locale),
                )}
                {displayed ? (
                  <>
                    <VisuallyHidden>
                      <output
                        className="scientific-result-text"
                        aria-live="polite"
                      >
                        {displayed.text}
                      </output>
                    </VisuallyHidden>
                    {math(displayed.latex, t('scientific.result', locale))}
                  </>
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
                onChange={setTab}
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
              recall={() => setTab('variables')}
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
              insert={(text) => insert({ text })}
              edit={(source) => {
                change(source);
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
