import { useSettingsStore } from '../../shared/settingsStore';
import { graphInputText, parseGraphNumber } from './numbers';
import { lazy, Suspense, useRef, useState, type Dispatch } from 'react';
import { Button } from '../../ui/Button';
import { Chip } from '../../ui/Chip';
import { Menu } from '../../ui/Menu';
import { SideSheet } from '../../ui/SideSheet';
import { Slider } from '../../ui/Slider';
import { TextField } from '../../ui/TextField';
import { Select } from '../../ui/Select';
import { t, type Locale } from '../../shared/i18n/extended';
import {
  examples,
  newRow,
  normalizeParameter,
  parameter,
  type Parameter,
  type ParsedRow,
  type PlotAction,
} from './model';
import type { SampleResponse } from './workerProtocol';
import { sampleMessageKeys } from './samplingDiagnostics';
import type { AnalysisKind } from './analysisAdapter';
import { loadModeModule } from '../../app/ModeErrorBoundary';
const Editor = lazy(() =>
  loadModeModule(import('../scientific/ExpressionEditor')),
);
interface Props {
  rows: readonly ParsedRow[];
  samples?: SampleResponse['curves'];
  colors: readonly string[];
  locale: Locale;
  dispatch: Dispatch<PlotAction>;
  playing: string | null;
  onPlay: (id: string, name: string) => void;
  onAnalyze: (id: string, kind: AnalysisKind, other?: string) => void;
}
function ParameterControl({
  row,
  name,
  locale,
  dispatch,
  playing,
  onPlay,
}: Pick<Props, 'locale' | 'dispatch' | 'playing' | 'onPlay'> & {
  row: ParsedRow;
  name: string;
}) {
  const p = parameter(row.row, name);
  const preferences = useSettingsStore((s) => s);
  const [draft, setDraft] = useState({
      min: graphInputText(p.min, locale, preferences),
      max: graphInputText(p.max, locale, preferences),
      step: graphInputText(p.step, locale, preferences),
    }),
    [invalid, setInvalid] = useState(false);
  const update = (patch: Partial<Parameter>) => {
    const next = normalizeParameter({ ...p, ...patch });
    if (next)
      dispatch({
        type: 'update',
        id: row.row.id,
        patch: { params: { ...row.row.params, [name]: next } },
      });
  };
  return (
    <div className="graph-parameter">
      <Slider
        label={name}
        minValue={p.min}
        maxValue={p.max}
        step={p.step}
        value={p.value}
        onChange={(value) => update({ value })}
      />
      <Button
        variant="text"
        size="sm"
        isSelected={playing === `${row.row.id}:${name}`}
        aria-label={t(
          playing === `${row.row.id}:${name}` ? 'graph.pause' : 'graph.play',
          locale,
          { name },
        )}
        onPress={() => onPlay(row.row.id, name)}
      >
        {playing === `${row.row.id}:${name}` ? 'Ⅱ' : '▷'}
      </Button>
      <details>
        <summary>{t('graph.range', locale)}</summary>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const min = parseGraphNumber(draft.min, locale, preferences),
              max = parseGraphNumber(draft.max, locale, preferences),
              step = parseGraphNumber(draft.step, locale, preferences);
            const next =
              min === null || max === null || step === null
                ? null
                : normalizeParameter({
                    ...p,
                    min,
                    max,
                    step,
                  });
            setInvalid(!next);
            if (next) update(next);
          }}
        >
          <div className="graph-range-fields">
            {(['min', 'max', 'step'] as const).map((key) => (
              <TextField
                key={key}
                label={t(`graph.${key}`, locale)}
                value={draft[key]}
                onChange={(value) => setDraft({ ...draft, [key]: value })}
                isInvalid={invalid}
                validationBehavior="aria"
                errorMessage={t('graph.invalidRange', locale)}
              />
            ))}
          </div>
          <Button type="submit" variant="text">
            {t('graph.apply', locale)}
          </Button>
          {invalid && <p role="alert">{t('graph.invalidRange', locale)}</p>}
        </form>
      </details>
    </div>
  );
}
function CurveRow({
  parsed,
  index,
  ...props
}: Props & { parsed: ParsedRow; index: number }) {
  const { row, curve, error, names } = parsed,
    { locale, dispatch } = props;
  const [other, setOther] = useState<string | null>(null);
  const id = `graph-error-${row.id}`,
    help = `graph-help-${row.id}`;
  const sampled = props.samples?.find(
    (c) =>
      row.visible && c.id === row.id && c.signature === JSON.stringify(curve),
  );
  const samplingMessages = sampled ? sampleMessageKeys(sampled) : [];
  const [menuKind, setMenuKind] = useState<AnalysisKind | null>(null);
  return (
    <section
      className="graph-row"
      aria-label={t('graph.functionN', locale, { n: index + 1 })}
      data-curve-id={row.id}
    >
      <div className="graph-row-main">
        <Button
          variant="text"
          size="sm"
          className="graph-color-button"
          isSelected={row.visible}
          aria-label={t('graph.visibility', locale, { n: index + 1 })}
          onPress={() =>
            dispatch({
              type: 'update',
              id: row.id,
              patch: { visible: !row.visible },
            })
          }
        >
          <span
            className="graph-color-dot"
            style={{
              background: `var(--md-sys-color-graph-${row.color})`,
              opacity: row.visible ? 1 : 0.3,
            }}
          />
        </Button>
        <Suspense
          fallback={
            <TextField
              label={t('graph.functionN', locale, { n: index + 1 })}
              value={row.input}
              onChange={(input) =>
                dispatch({ type: 'update', id: row.id, patch: { input } })
              }
            />
          }
        >
          <Editor
            value={row.input}
            locale={locale}
            compact
            label={t('graph.functionN', locale, { n: index + 1 })}
            describedBy={error ? id : help}
            isInvalid={!!error}
            error={null}
            onChange={(input) =>
              dispatch({ type: 'update', id: row.id, patch: { input } })
            }
            onEvaluate={() => {}}
            onBrowse={() => {}}
          />
        </Suspense>
      </div>
      <div className="graph-row-meta">
        <span draggable className="graph-drag-handle">
          <Button
            variant="text"
            size="sm"
            aria-label={t('graph.reorder', locale, { n: index + 1 })}
          >
            ↕
          </Button>
        </span>
        <span id={help}>
          {curve
            ? t(`graph.kind.${curve.kind}`, locale)
            : t('graph.inputHint', locale)}
        </span>
        <Menu
          label={t('graph.actions', locale)}
          trigger={
            <Button
              variant="text"
              size="sm"
              aria-label={t('graph.actionsN', locale, { n: index + 1 })}
            >
              ⋯
            </Button>
          }
          options={[
            {
              id: 'duplicate',
              label: t('graph.duplicate', locale),
              isDisabled: props.rows.length >= 100,
            },
            { id: 'delete', label: t('graph.delete', locale) },
            { id: 'up', label: t('graph.up', locale), isDisabled: index === 0 },
            {
              id: 'down',
              label: t('graph.down', locale),
              isDisabled: index === props.rows.length - 1,
            },
            ...(
              [
                'roots',
                'extrema',
                'intersections',
                'tangent',
                'integral',
              ] as const
            ).map((kind) => ({
              id: kind,
              label: t(`graph.analysis.${kind}`, locale),
              isDisabled:
                !curve ||
                curve.kind === 'implicit' ||
                (kind === 'integral' && curve.kind !== 'explicit'),
            })),
          ]}
          onAction={(key) => {
            if (key === 'duplicate')
              dispatch({
                type: 'add',
                row: {
                  ...row,
                  id: crypto.randomUUID(),
                  params: structuredClone(row.params),
                  color: (row.color + 1) % 8,
                },
              });
            else if (key === 'delete') dispatch({ type: 'delete', id: row.id });
            else if (key === 'up' || key === 'down')
              dispatch({
                type: 'reorder',
                id: row.id,
                to: index + (key === 'up' ? -1 : 1),
              });
            else if (key === 'intersections') {
              setMenuKind('intersections');
            } else props.onAnalyze(row.id, key as AnalysisKind);
          }}
        />
      </div>
      {curve?.kind === 'implicit' && (
        <div className="graph-implicit-help">
          <p>{t('graph.implicitActions', locale)}</p>
          <details>
            <summary>{t('graph.implicitDetails', locale)}</summary>
            <p>{t('graph.implicitFit', locale)}</p>
            <p>{t('graph.implicitAccuracy', locale)}</p>
          </details>
        </div>
      )}
      {samplingMessages.length > 0 && (
        <div role="status" className="graph-sampling-status">
          {samplingMessages.map((key) => (
            <p key={key}>{t(key, locale)}</p>
          ))}
        </div>
      )}
      {error && (
        <p id={id} className="graph-error" role="alert">
          {t(
            error.code === 'E_RESOURCE_LIMIT'
              ? 'graph.inputLimit'
              : error.code === 'E_UNSUPPORTED_CURVE'
                ? 'graph.unsupportedCurve'
                : error.code === 'E_UNSUPPORTED_FUNCTION'
                  ? 'graph.unsupportedFunction'
                  : 'graph.parseError',
            locale,
            { code: error.code },
          )}
        </p>
      )}
      {menuKind === 'intersections' && (
        <div className="graph-intersection">
          <Select
            label={t('graph.otherCurve', locale)}
            options={props.rows
              .filter(
                (r) =>
                  r.curve && r.row.id !== row.id && r.curve.kind !== 'implicit',
              )
              .map((r) => ({ id: r.row.id, label: r.row.input }))}
            selectedKey={other}
            onSelectionChange={(key) => setOther(key ? String(key) : null)}
          />
          <Button
            size="sm"
            isDisabled={
              curve?.kind === 'implicit' ||
              !props.rows.some(
                (r) =>
                  r.row.id === other && r.curve && r.curve.kind !== 'implicit',
              )
            }
            onPress={() => {
              if (other) props.onAnalyze(row.id, 'intersections', other);
              setMenuKind(null);
            }}
          >
            {t('graph.apply', locale)}
          </Button>
        </div>
      )}
      {names.map((name) => (
        <ParameterControl
          key={`${row.id}:${name}`}
          row={parsed}
          name={name}
          {...props}
        />
      ))}
    </section>
  );
}
export default function FunctionPanel(props: Props) {
  const dragging = useRef<string | null>(null);
  const add = (input = '') =>
    props.dispatch({
      type: 'add',
      row: newRow(crypto.randomUUID(), input, props.rows.length),
    });
  return (
    <SideSheet
      mode="docked"
      title={t('graph.functions', props.locale)}
      closeLabel={t('ui.close', props.locale)}
    >
      <div className="graph-panel-intro">
        <p>{t('graph.panelHint', props.locale)}</p>
        <Button
          size="sm"
          isDisabled={props.rows.length >= 100}
          onPress={() => add()}
        >
          {t('graph.add', props.locale)}
        </Button>
      </div>
      <div className="graph-rows">
        {props.rows.map((row, index) => (
          <div
            key={row.row.id}
            onDragStart={(event) => {
              if (
                !(event.target instanceof HTMLElement) ||
                !event.target.closest('.graph-drag-handle')
              ) {
                event.preventDefault();
                return;
              }
              dragging.current = row.row.id;
              event.dataTransfer.effectAllowed = 'move';
            }}
            onDragEnd={() => {
              dragging.current = null;
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (dragging.current)
                props.dispatch({
                  type: 'reorder',
                  id: dragging.current,
                  to: index,
                });
              dragging.current = null;
            }}
          >
            <CurveRow parsed={row} index={index} {...props} />
          </div>
        ))}
      </div>
      {!props.rows.length && (
        <div className="graph-examples">
          <p>{t('graph.examples', props.locale)}</p>
          {examples.map((example) => (
            <Chip key={example.key} onPress={() => add(example.input)}>
              {t(`graph.example.${example.key}`, props.locale)}
            </Chip>
          ))}
        </div>
      )}
    </SideSheet>
  );
}
