import { expect, it } from 'vitest';
import { serializeTableCsv } from './tableCsv';

it.each([
  ['explicit', 'x_input'],
  ['vertical', 'y_input'],
  ['parametric', 't'],
  ['polar', 'θ'],
] as const)('names the independent variable for %s', (kind, header) => {
  expect(serializeTableCsv(kind, [], 'comma')).toBe(`${header},x,y\r\n`);
});

it.each([
  ['comma', ',', '-1.25e-13,0,-0'],
  ['semicolon', ';', '-1,25e-13;0;-0'],
] as const)(
  'round-trips finite Float64 values in %s CSV',
  (format, delimiter, firstRow) => {
    const rows = [
      { u: -1.25e-13, point: { x: 0, y: -0 } },
      { u: 1 / 3, point: { x: Number.MIN_VALUE, y: Number.MAX_VALUE } },
      { u: 1234.5, point: { x: -1e21, y: -1 / 7 } },
    ];
    const lines = serializeTableCsv('parametric', rows, format).split('\r\n');
    expect(lines).toHaveLength(rows.length + 2);
    expect(lines[1]).toBe(firstRow);
    expect(
      lines
        .slice(1, -1)
        .map((line) =>
          line.split(delimiter).map((field) => Number(field.replace(',', '.'))),
        ),
    ).toEqual(rows.map(({ u, point }) => [u, point.x, point.y]));
  },
);

it('keeps the row and its other fields for each non-finite coordinate', () => {
  expect(
    serializeTableCsv(
      'polar',
      [
        { u: 0, point: { x: NaN, y: 0 } },
        { u: 1, point: { x: Infinity, y: -Infinity } },
      ],
      'semicolon',
    ),
  ).toBe('θ;x;y\r\n0;;0\r\n1;;\r\n');
});
