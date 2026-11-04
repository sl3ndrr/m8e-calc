import type { Curve, Point } from '../../graph';

export type TableCsvFormat = 'semicolon' | 'comma';

export const tableVariable = {
  explicit: 'x',
  vertical: 'y',
  parametric: 't',
  polar: 'θ',
} as const satisfies Record<Curve['kind'], string>;

export function serializeTableCsv(
  kind: Curve['kind'],
  rows: readonly { readonly u: number; readonly point: Point }[],
  format: TableCsvFormat,
): string {
  const separator = format === 'semicolon' ? ';' : ',';
  const variable = tableVariable[kind];
  const input =
    variable === 'x' || variable === 'y' ? `${variable}_input` : variable;
  const number = (value: number): string => {
    if (!Number.isFinite(value)) return '';
    const raw = Object.is(value, -0) ? '-0' : String(value);
    return format === 'semicolon' ? raw.replace('.', ',') : raw;
  };

  // Fixed headers and numeric tokens need no escaping in either dialect.
  const header = [input, 'x', 'y'].join(separator);
  const lines = rows.map(({ u, point }) =>
    [number(u), number(point.x), number(point.y)].join(separator),
  );
  return [header, ...lines, ''].join('\r\n');
}
