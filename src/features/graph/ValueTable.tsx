import { useMemo } from 'react';
import type { Bounds } from '../../graph';
import {
  t,
  type Locale,
  type NumberPreferences,
} from '../../shared/i18n/extended';
import { tableResult, type PlotCurve } from './model';
import { formatGraphNumber, type GraphRounding } from './numbers';

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
  if (curve?.kind === 'implicit')
    return <p role="status">{t('graph.implicitActions', locale)}</p>;
  return (
    <>
      <p role={result.stopped ? 'status' : undefined}>
        {t(
          result.stopped === 'precision'
            ? 'graph.tablePrecision'
            : result.stopped === 'limit'
              ? 'graph.tableTruncated'
              : 'graph.tableLimit',
          locale,
        )}
      </p>
      <div className="graph-table-scroll">
        <table>
          <thead>
            <tr>
              <th>
                {curve?.kind === 'parametric'
                  ? 't'
                  : curve?.kind === 'polar'
                    ? 'θ'
                    : curve?.kind === 'vertical'
                      ? 'y'
                      : 'x'}
              </th>
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
