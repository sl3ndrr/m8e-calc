import { useMemo } from 'react';
import type { Bounds, Curve } from '../../graph';
import { t, type Locale, type NumberPreferences } from '../../shared/i18n';
import { tableResult } from './model';
import { formatGraphNumber, type GraphRounding } from './numbers';

export default function ValueTable({ curve, bounds, step, locale, preferences, rounding }: {
  curve: Curve | null; bounds: Bounds; step: number; locale: Locale;
  preferences: NumberPreferences; rounding: GraphRounding;
}) {
  const result = useMemo(() => curve ? tableResult(curve, bounds, step) : { rows: [], stopped: null }, [curve, bounds, step]);
  const format = (value: number) => formatGraphNumber(value, locale, preferences, rounding);
  return <>
    {result.stopped && <p role="status">{t(result.stopped === 'precision' ? 'graph.tablePrecision' : 'graph.tableTruncated', locale)}</p>}
    <div className="graph-table-scroll"><table>
      <thead><tr><th>{curve?.kind === 'parametric' ? 't' : curve?.kind === 'polar' ? 'θ' : curve?.kind === 'vertical' ? 'y' : 'x'}</th><th>x</th><th>y</th></tr></thead>
      <tbody>{result.rows.map(({ u, point }) => <tr key={u}><td>{format(u)}</td><td>{format(point.x)}</td><td>{format(point.y)}</td></tr>)}</tbody>
    </table></div>
  </>;
}
