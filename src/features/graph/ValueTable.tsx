import { useId, useMemo, useState } from 'react';
import { downloadFile } from '../../app/fileTransfer';
import type { Bounds } from '../../graph';
import {
  t,
  type Locale,
  type NumberPreferences,
} from '../../shared/i18n/extended';
import { Button } from '../../ui/Button';
import { Select } from '../../ui/Select';
import { snackbarQueue } from '../../ui/snackbarQueue';
import { tableResult, type PlotCurve } from './model';
import { formatGraphNumber, type GraphRounding } from './numbers';
import {
  serializeTableCsv,
  tableVariable,
  type TableCsvFormat,
} from './tableCsv';

export default function ValueTable({
  curve,
  bounds,
  step,
  locale,
  preferences,
  rounding,
}: {
  curve: PlotCurve | null;
  bounds: Bounds;
  step: number;
  locale: Locale;
  preferences: NumberPreferences;
  rounding: GraphRounding;
}) {
  const [csvChoice, setCsvChoice] = useState<TableCsvFormat | null>(null);
  const csvFormat = csvChoice ?? (locale === 'de' ? 'semicolon' : 'comma');
  const csvHintId = useId();
  const [from, to] =
    curve?.kind === 'parametric' || curve?.kind === 'polar'
      ? curve.range
      : curve?.kind === 'vertical'
        ? [bounds.yMin, bounds.yMax]
        : [bounds.xMin, bounds.xMax];
  const result = useMemo(
    () =>
      curve
        ? tableResult(
            curve,
            { xMin: from, xMax: to, yMin: from, yMax: to },
            step,
          )
        : { rows: [], stopped: null },
    [curve, from, to, step],
  );
  const format = (value: number) =>
    formatGraphNumber(value, locale, preferences, rounding);
  if (!curve)
    return <p role="status">{t('graph.tableUnavailable', locale)}</p>;
  if (curve.kind === 'implicit')
    return <p role="status">{t('graph.implicitActions', locale)}</p>;
  const kind = curve.kind;
  const empty = result.rows.length === 0;

  function exportCsv() {
    if (empty) return;
    try {
      downloadFile(
        serializeTableCsv(kind, result.rows, csvFormat),
        'm8e-graph-values.csv',
        'text/csv;charset=utf-8',
      );
    } catch {
      snackbarQueue.add({ message: t('graph.tableCsvError', locale) });
    }
  }

  return (
    <>
      <p role={empty || result.stopped ? 'status' : undefined}>
        {t(
          empty
            ? 'graph.tableEmpty'
            : result.stopped === 'precision'
              ? 'graph.tablePrecision'
              : result.stopped === 'limit'
                ? 'graph.tableTruncated'
                : 'graph.tableLimit',
          locale,
        )}
      </p>
      <div className="graph-table-csv">
        <Select
          label={t('graph.tableCsvFormat', locale)}
          selectedKey={csvFormat}
          isDisabled={empty}
          onSelectionChange={(key) => {
            if (key === 'semicolon' || key === 'comma') setCsvChoice(key);
          }}
          options={[
            { id: 'semicolon', label: t('graph.tableCsvSemicolon', locale) },
            { id: 'comma', label: t('graph.tableCsvComma', locale) },
          ]}
        />
        <Button
          size="sm"
          variant="outlined"
          isDisabled={empty}
          aria-describedby={csvHintId}
          onPress={exportCsv}
        >
          {t('graph.tableCsvExport', locale)}
        </Button>
        <p id={csvHintId}>{t('graph.tableCsvHint', locale)}</p>
      </div>
      <div className="graph-table-scroll">
        <table>
          <thead>
            <tr>
              <th>{tableVariable[kind]}</th>
              <th>x</th>
              <th>y</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map(({ u, point }) => (
              <tr key={u}>
                <td>{format(u)}</td>
                <td>{format(point.x)}</td>
                <td>{format(point.y)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
