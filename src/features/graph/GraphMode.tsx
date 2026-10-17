import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { Button } from '../../ui/Button';
import { Checkbox } from '../../ui/Checkbox';
import { Chip } from '../../ui/Chip';
import { Dialog } from '../../ui/Dialog';
import { Select } from '../../ui/Select';
import { TextField } from '../../ui/TextField';
import { snackbarQueue } from '../../ui/snackbarQueue';
import { type Bounds } from '../../graph';
import { t } from '../../shared/i18n';
import { useAppStore } from '../../shared/store';
import { useModeHistory } from '../../shared/useModeHistory';
import type { HistoryEntry } from '../../shared/history';
import {
  initialPlot,
  plotReducer,
  newRow,
  parseRow,
  parsePlotInput,
  parameter,
  advanceParameter,
  plotPayload,
  restorePlot,
  type PlotAction,
  type Trace,
} from './model';
import { analyze, type AnalysisKind } from './analysisAdapter';
import type { IntegralShade, Marker } from './renderer';
import GraphCanvas, { type CanvasHandle } from './GraphCanvas';
import ValueTable from './ValueTable';
import {
  formatGraphNumber,
  parseGraphNumber,
  type GraphRounding,
} from './numbers';
import { useSettingsStore } from '../../shared/settingsStore';
import FunctionPanel from './FunctionPanel';
import './GraphMode.css';
import type { SampleResponse } from './workerProtocol';
import { CopyLinkButton } from '../../app/CopyLinkButton';
import { readModeLink } from '../../app/permalinks';
export default function GraphMode() {
  const [state, dispatch] = useReducer(
    plotReducer,
    undefined,
    () => readModeLink('graph', restorePlot) ?? initialPlot(),
  );
  const [samples, setSamples] = useState<SampleResponse['curves']>([]);
  const [restoreToken, setRestoreToken] = useState(0);
  const [palette, setPalette] = useState<string[]>([]),
    [markers, setMarkers] = useState<Marker[]>([]),
    [shade, setShade] = useState<IntegralShade | null>(null),
    [auxiliary, setAuxiliary] =
      useState<ReturnType<typeof analyze>['tangent']>(null),
    [integral, setIntegral] =
      useState<ReturnType<typeof analyze>['integral']>(null);
  const [integralId, setIntegralId] = useState<string | null>(null),
    [playing, setPlaying] = useState<string | null>(null),
    [table, setTable] = useState(false),
    [tableId, setTableId] = useState<string | null>(null),
    [step, setStep] = useState('1'),
    [tableStep, setTableStep] = useState(1),
    [rounding, setRounding] = useState<GraphRounding>('auto'),
    [background, setBackground] = useState('theme'),
    [exporting, setExporting] = useState(false),
    [context, setContext] = useState<Trace | null>(null),
    [contextOther, setContextOther] = useState<string | null>(null);
  const locale = useAppStore((s) => s.locale),
    canvas = useRef<CanvasHandle>(null),
    lastTrace = useRef<Trace | null>(null),
    latest = useRef(state),
    sent = useRef(JSON.stringify(initialPlot()));
  const preferences = useSettingsStore((s) => s);
  const parsedStep = parseGraphNumber(step, locale, preferences);
  const invalidStep = parsedStep === null || parsedStep <= 0;
  const parsed = useMemo(() => state.rows.map(parseRow), [state.rows]);
  const plotted = useMemo(
    () =>
      auxiliary
        ? [
            ...parsed,
            {
              row: newRow('tangent', '', 7),
              curve: auxiliary,
              error: null,
              names: [],
            },
          ]
        : parsed,
    [parsed, auxiliary],
  );
  useEffect(() => {
    latest.current = state;
  });
  const clearAnalysis = useCallback(() => {
    setMarkers([]);
    setShade(null);
    setAuxiliary(null);
    setIntegral(null);
    setIntegralId(null);
  }, []);
  const change = useCallback(
    (action: PlotAction) => {
      if (
        action.type === 'delete' ||
        (action.type === 'update' && action.patch.input !== undefined)
      ) {
        setPlaying((active) => {
          if (!active) return null;
          const split = active.lastIndexOf(':'),
            id = active.slice(0, split),
            name = active.slice(split + 1);
          if (action.id !== id) return active;
          if (action.type === 'delete') return null;
          const row = latest.current.rows.find((r) => r.id === id);
          return row &&
            parseRow({ ...row, ...action.patch }).names.includes(name)
            ? active
            : null;
        });
      }
      if (action.type !== 'view' && action.type !== 'options') clearAnalysis();
      dispatch(action);
    },
    [clearAnalysis],
  );
  const restore = useCallback(
    (entry: HistoryEntry) => {
      const plot = restorePlot(entry.payload);
      if (!plot) return;
      sent.current = JSON.stringify(plot);
      setPlaying(null);
      setContext(null);
      clearAnalysis();
      setRestoreToken((token) => token + 1);
      dispatch({ type: 'restore', plot });
    },
    [clearAnalysis],
  );
  const { add } = useModeHistory('graph', restore);
  useEffect(() => {
    const signature = JSON.stringify(state);
    if (sent.current === signature || playing) return;
    const timer = window.setTimeout(() => {
      add({
        input: state.rows
          .map((r) => r.input)
          .filter(Boolean)
          .join(' ; '),
        result: t('graph.plotSet', locale, { count: state.rows.length }),
        payload: plotPayload(state),
      });
      sent.current = signature;
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [state, playing, add, locale]);
  useEffect(() => {
    if (!playing) return;
    const split = playing.lastIndexOf(':'),
      id = playing.slice(0, split),
      name = playing.slice(split + 1),
      row = latest.current.rows.find((r) => r.id === id);
    if (!row) return;
    let base = parameter(row, name),
      start = performance.now();
    const timer = window.setInterval(() => {
      const current = latest.current.rows.find((r) => r.id === id);
      if (!current) return;
      const p = parameter(current, name);
      if (p.min !== base.min || p.max !== base.max || p.step !== base.step) {
        base = p;
        start = performance.now();
      }
      change({
        type: 'update',
        id,
        patch: {
          params: {
            ...current.params,
            [name]: advanceParameter(base, (performance.now() - start) / 1000),
          },
        },
      });
    }, 50);
    return () => window.clearInterval(timer);
  }, [playing, change]);
  const onPalette = useCallback(
    (colors: string[]) =>
      setPalette((old) => (old.join() === colors.join() ? old : colors)),
    [],
  );
  const onView = useCallback(
    (bounds: Bounds, fitBasis: Bounds) =>
      dispatch({ type: 'view', bounds, fitBasis }),
    [],
  );
  const onTrace = useCallback((trace: Trace | null) => {
    lastTrace.current = trace;
  }, []);
  const onPlay = useCallback((id: string, name: string) => {
    if (!id) {
      setPlaying(null);
      return;
    }
    setPlaying((old) => (old === `${id}:${name}` ? null : `${id}:${name}`));
  }, []);
  function runAnalysis(
    id: string,
    kind: AnalysisKind,
    other?: string,
    range?: readonly [number, number],
  ): void {
    const row = parsed.find((r) => r.row.id === id);
    if (!row?.curve) return;
    const otherCurve = parsed.find((r) => r.row.id === other)?.curve;
    if (row.curve.kind === 'implicit' || otherCurve?.kind === 'implicit') {
      snackbarQueue.add({ message: t('graph.implicitActions', locale) });
      return;
    }
    if (kind === 'integral' && row.curve.kind !== 'explicit') return;
    if (kind === 'integral' && !range) {
      setIntegralId(id);
      canvas.current?.viewport();
      return;
    }
    const viewport = canvas.current?.viewport();
    if (!viewport) return;
    const u =
      lastTrace.current?.id === id
        ? lastTrace.current.u
        : row.curve.kind === 'parametric' || row.curve.kind === 'polar'
          ? (row.curve.range[0] + row.curve.range[1]) / 2
          : (viewport.bounds.xMin + viewport.bounds.xMax) / 2;
    const result = analyze(
      row.curve,
      id,
      kind,
      viewport.bounds,
      parsed.find((r) => r.row.id === other)?.curve ?? undefined,
      u,
      range,
    );
    setMarkers(result.markers);
    setAuxiliary(result.tangent);
    setShade(result.shade);
    setIntegral(result.integral);
    setIntegralId(null);
    if (!result.markers.length && !result.integral)
      snackbarQueue.add({ message: t('graph.noAnalysis', locale) });
  }
  async function exportPng(copy: boolean): Promise<void> {
    setExporting(true);
    try {
      const blob = await canvas.current?.export(background === 'transparent');
      if (!blob) throw new Error('PNG unavailable');
      if (copy) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        snackbarQueue.add({ message: t('graph.copied', locale) });
      } else {
        const url = URL.createObjectURL(blob),
          link = document.createElement('a');
        link.href = url;
        link.download = 'm8e-graph.png';
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (error) {
      snackbarQueue.add({
        message: t(
          error instanceof Error && error.message === 'GraphSamplingPending'
            ? 'graph.exportPending'
            : 'graph.exportError',
          locale,
        ),
      });
    } finally {
      setExporting(false);
    }
  }
  const selected =
    tableId === null
      ? parsed.find((r) => r.curve)
      : parsed.find((r) => r.row.id === tableId);
  const selectedInput = selected?.row.input;
  const selectedValues = JSON.stringify(
    Object.fromEntries(
      Object.entries(selected?.row.params ?? {}).map(([name, p]) => [
        name,
        p.value,
      ]),
    ),
  );
  const tableCurve = useMemo(() => {
    if (selectedInput === undefined) return null;
    const result = parsePlotInput(selectedInput, {
      params: JSON.parse(selectedValues) as Record<string, number>,
    });
    return result.ok ? result.value : null;
  }, [selectedInput, selectedValues]);
  return (
    <section
      className="graph-mode"
      style={
        Object.fromEntries(
          palette.map((color, index) => [
            `--md-sys-color-graph-${index}`,
            color,
          ]),
        ) as CSSProperties
      }
      aria-label={t('mode.graph', locale)}
    >
      <header className="graph-heading">
        <div className="graph-toolbar">
          <Button
            size="sm"
            variant="tonal"
            onPress={() => canvas.current?.fit()}
          >
            {t('graph.fit', locale)}
          </Button>
          <Button
            size="sm"
            variant="text"
            onPress={() => canvas.current?.reset()}
          >
            {t('graph.reset', locale)}
          </Button>
          <Button
            size="sm"
            variant="text"
            aria-label={t('graph.zoomIn', locale)}
            onPress={() => canvas.current?.zoom(1.3)}
          >
            +
          </Button>
          <Button
            size="sm"
            variant="text"
            aria-label={t('graph.zoomOut', locale)}
            onPress={() => canvas.current?.zoom(1 / 1.3)}
          >
            −
          </Button>
        </div>
        <CopyLinkButton
          mode="graph"
          data={() => ({
            ...state,
            bounds: canvas.current?.desiredViewport()?.bounds ?? state.bounds,
            fitBasis:
              canvas.current?.desiredViewport()?.fitBasis ?? state.fitBasis,
          })}
        />
      </header>
      <div className="graph-options">
        <Checkbox
          isSelected={state.lockAspect}
          onChange={(lockAspect) =>
            change({ type: 'options', patch: { lockAspect } })
          }
        >
          {t('graph.aspect', locale)}
        </Checkbox>
        <Checkbox
          isSelected={state.pi}
          onChange={(pi) => change({ type: 'options', patch: { pi } })}
        >
          {t('graph.pi', locale)}
        </Checkbox>
        <Checkbox
          isSelected={state.fine}
          onChange={(fine) => change({ type: 'options', patch: { fine } })}
        >
          {t('graph.fine', locale)}
        </Checkbox>
        <Select
          label={t('graph.presets', locale)}
          selectedKey={null}
          options={[
            { id: 'standard', label: t('graph.standard', locale) },
            { id: 'trig', label: t('graph.trig', locale) },
            { id: 'unit', label: t('graph.unit', locale) },
          ]}
          onSelectionChange={(key) => {
            const bounds =
              key === 'trig'
                ? { xMin: -2 * Math.PI, xMax: 2 * Math.PI, yMin: -2, yMax: 2 }
                : key === 'unit'
                  ? { xMin: -2, xMax: 2, yMin: -2, yMax: 2 }
                  : initialPlot().bounds;
            canvas.current?.preset(bounds);
          }}
        />
      </div>
      <div className="graph-layout">
        <div className="graph-stage">
          <GraphCanvas
            ref={canvas}
            rows={plotted}
            bounds={state.bounds}
            fitBasis={state.fitBasis}
            restoreToken={restoreToken}
            onSamples={setSamples}
            onViewError={() =>
              snackbarQueue.add({ message: t('graph.viewUnavailable', locale) })
            }
            lockAspect={state.lockAspect}
            pi={state.pi}
            fine={state.fine}
            locale={locale}
            markers={markers}
            shade={shade}
            integralCurveId={integralId}
            onView={onView}
            onIntegral={(from, to) => {
              if (integralId)
                runAnalysis(integralId, 'integral', undefined, [from, to]);
            }}
            onTrace={onTrace}
            onContext={setContext}
            onPalette={onPalette}
          />
          {!state.rows.length && (
            <div className="graph-empty">
              <h2>{t('graph.emptyTitle', locale)}</h2>
              <p>{t('graph.emptyHint', locale)}</p>
            </div>
          )}
          <div aria-live="polite" aria-atomic="true">
            {(markers.length > 0 || integral) && (
              <div
                className="graph-results"
                role="region"
                aria-label={t('graph.results', locale)}
              >
                {markers.map((marker) => (
                  <Chip
                    key={marker.id}
                    kind="input"
                    onPress={() => {
                      const v = canvas.current?.viewport();
                      if (!v) return;
                      const b = v.bounds,
                        dx = (b.xMax - b.xMin) / 2,
                        dy = (b.yMax - b.yMin) / 2;
                      canvas.current?.preset({
                        xMin: marker.x - dx,
                        xMax: marker.x + dx,
                        yMin: marker.y - dy,
                        yMax: marker.y + dy,
                      });
                    }}
                    onRemove={() => {
                      setMarkers((old) =>
                        old.filter((m) => m.id !== marker.id),
                      );
                      if (marker.label === 'tangent') setAuxiliary(null);
                    }}
                    removeLabel={t('graph.removeMarker', locale)}
                  >
                    {t(
                      `graph.analysis.${marker.label as AnalysisKind}`,
                      locale,
                    )}{' '}
                    · ({formatGraphNumber(marker.x, locale, preferences)},{' '}
                    {formatGraphNumber(marker.y, locale, preferences)})
                    {!marker.confidence ? ' ≈' : ''}
                  </Chip>
                ))}
                {integral && (
                  <output>
                    ∫ ={' '}
                    {Number.isFinite(integral.value)
                      ? formatGraphNumber(integral.value, locale, preferences)
                      : '—'}{' '}
                    ·{' '}
                    {t(
                      integral.confidence
                        ? 'graph.estimate'
                        : 'graph.uncertain',
                      locale,
                    )}
                    {Number.isFinite(integral.errorEstimate)
                      ? ` ± ${formatGraphNumber(integral.errorEstimate, locale, preferences)}`
                      : ''}
                  </output>
                )}
              </div>
            )}
          </div>
          <div className="graph-export">
            <Button
              size="sm"
              variant="text"
              isSelected={table}
              onSelectedChange={(open) => {
                setTable(open);
                if (open && tableId === null)
                  setTableId(parsed.find((r) => r.curve)?.row.id ?? null);
              }}
            >
              {t('graph.table', locale)}
            </Button>
            <Select
              label={t('graph.background', locale)}
              selectedKey={background}
              onSelectionChange={(key) => setBackground(String(key))}
              options={[
                { id: 'theme', label: t('graph.themeBackground', locale) },
                { id: 'transparent', label: t('graph.transparent', locale) },
              ]}
            />
            <Button
              size="sm"
              variant="outlined"
              isDisabled={exporting}
              onPress={() => {
                void exportPng(false);
              }}
            >
              {t('graph.export', locale)}
            </Button>
            <Button
              size="sm"
              variant="text"
              isDisabled={exporting}
              onPress={() => {
                void exportPng(true);
              }}
            >
              {t('graph.copy', locale)}
            </Button>
          </div>
          {table && (
            <section
              className="graph-table-section"
              aria-label={t('graph.table', locale)}
            >
              <div>
                <Select
                  label={t('graph.function', locale)}
                  options={parsed
                    .filter((r) => r.curve)
                    .map((r) => ({ id: r.row.id, label: r.row.input }))}
                  selectedKey={selected?.row.id ?? null}
                  onSelectionChange={(key) => setTableId(String(key))}
                />
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (parsedStep !== null && parsedStep > 0)
                      setTableStep(parsedStep);
                  }}
                >
                  <TextField
                    isDisabled={tableCurve?.kind === 'implicit' || !tableCurve}
                    label={t('graph.step', locale)}
                    value={step}
                    onChange={setStep}
                    isInvalid={invalidStep}
                    validationBehavior="aria"
                    errorMessage={t('graph.invalidStep', locale)}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    variant="text"
                    isDisabled={
                      invalidStep ||
                      tableCurve?.kind === 'implicit' ||
                      !tableCurve
                    }
                  >
                    {t('graph.apply', locale)}
                  </Button>
                </form>
                <Select
                  isDisabled={tableCurve?.kind === 'implicit' || !tableCurve}
                  label={t('graph.rounding', locale)}
                  selectedKey={String(rounding)}
                  onSelectionChange={(key) =>
                    setRounding(key === 'auto' ? 'auto' : Number(key))
                  }
                  options={[
                    { id: 'auto', label: t('graph.roundingAuto', locale) },
                    ...Array.from({ length: 13 }, (_, digits) => ({
                      id: String(digits),
                      label: t('graph.roundingDigits', locale, { digits }),
                    })),
                  ]}
                />
              </div>
              <p>
                {t(
                  rounding === 'auto'
                    ? 'graph.roundingHint'
                    : 'graph.roundingFixedHint',
                  locale,
                )}
              </p>
              {!tableCurve && (
                <p role="status">{t('graph.tableUnavailable', locale)}</p>
              )}
              {tableCurve && (
                <ValueTable
                  curve={tableCurve}
                  bounds={state.bounds}
                  step={tableStep}
                  rounding={rounding}
                  locale={locale}
                  preferences={preferences}
                />
              )}
            </section>
          )}
        </div>
        <FunctionPanel
          rows={parsed}
          colors={palette}
          locale={locale}
          dispatch={change}
          playing={playing}
          onPlay={onPlay}
          onAnalyze={runAnalysis}
          samples={samples}
        />
      </div>
      <Dialog
        title={t('graph.actions', locale)}
        closeLabel={t('ui.close', locale)}
        isOpen={!!context}
        onOpenChange={(open) => {
          if (!open) setContext(null);
        }}
      >
        <div className="graph-context">
          {(['roots', 'extrema', 'tangent', 'integral'] as const).map(
            (kind) => (
              <Button
                key={kind}
                isDisabled={
                  kind === 'integral' &&
                  parsed.find((r) => r.row.id === context?.id)?.curve?.kind !==
                    'explicit'
                }
                onPress={() => {
                  if (context) {
                    lastTrace.current = context;
                    runAnalysis(context.id, kind);
                  }
                  setContext(null);
                }}
              >
                {t(`graph.analysis.${kind}`, locale)}
              </Button>
            ),
          )}
          <Select
            label={t('graph.otherCurve', locale)}
            options={parsed
              .filter(
                (r) =>
                  r.curve &&
                  r.row.id !== context?.id &&
                  r.curve.kind !== 'implicit',
              )
              .map((r) => ({ id: r.row.id, label: r.row.input }))}
            selectedKey={contextOther}
            onSelectionChange={(key) =>
              setContextOther(key ? String(key) : null)
            }
          />
          <Button
            isDisabled={
              !parsed.some(
                (r) =>
                  r.row.id === contextOther &&
                  r.curve &&
                  r.curve.kind !== 'implicit',
              )
            }
            onPress={() => {
              if (context && contextOther)
                runAnalysis(context.id, 'intersections', contextOther);
              setContext(null);
            }}
          >
            {t('graph.analysis.intersections', locale)}
          </Button>
        </div>
      </Dialog>
    </section>
  );
}
