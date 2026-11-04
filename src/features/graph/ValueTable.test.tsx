import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { downloadFile } from '../../app/fileTransfer';
import { compile } from '../../graph';
import ValueTable from './ValueTable';
import { defaultBounds, newRow, parseRow, tableResult } from './model';
vi.mock('../../app/fileTransfer', () => ({ downloadFile: vi.fn() }));
vi.mock('../../graph', async (original) => {
  const actual = await original<typeof import('../../graph')>();
  return { ...actual, compile: vi.fn(actual.compile) };
});
vi.mock('./model', async (original) => ({
  ...(await original<typeof import('./model')>()),
  tableResult: vi.fn((...args: Parameters<typeof tableResult>) =>
    actualTable(...args),
  ),
}));
const { tableResult: actualTable } =
  await vi.importActual<typeof import('./model')>('./model');
it('formats again without evaluating when rounding, language or separators change', () => {
  const curve = parseRow(newRow('a', '1/3')).curve;
  const props = {
    curve,
    bounds: defaultBounds,
    step: 1,
    locale: 'de' as const,
    preferences: { decimalSeparator: 'auto' as const, grouping: true },
  };
  const { rerender } = render(<ValueTable {...props} rounding="auto" />);
  const count = vi.mocked(tableResult).mock.calls.length;
  expect(screen.getAllByText('0,333333333333').length).toBeGreaterThan(0);
  rerender(<ValueTable {...props} rounding={2} />);
  expect(screen.getAllByText('0,33').length).toBeGreaterThan(0);
  rerender(<ValueTable {...props} locale="en" rounding={6} />);
  expect(screen.getAllByText('0.333333').length).toBeGreaterThan(0);
  rerender(
    <ValueTable
      {...props}
      locale="en"
      preferences={{ decimalSeparator: 'comma', grouping: false }}
      rounding={6}
    />,
  );
  expect(screen.getAllByText('0,333333').length).toBeGreaterThan(0);
  rerender(
    <ValueTable
      {...props}
      bounds={{ ...defaultBounds, yMin: -12 }}
      rounding={2}
    />,
  );
  expect(vi.mocked(tableResult).mock.calls.length).toBe(count);
  rerender(<ValueTable {...props} step={2} rounding={2} />);
  expect(vi.mocked(tableResult).mock.calls.length).toBe(count + 1);
});

it('exports the memoized, unrounded rows in both formats without compiling again', async () => {
  const curve = parseRow(newRow('a', '1/3')).curve;
  render(
    <ValueTable
      curve={curve}
      bounds={{ ...defaultBounds, xMin: -1, xMax: 0 }}
      step={1}
      locale="de"
      preferences={{ decimalSeparator: 'point', grouping: true }}
      rounding={2}
    />,
  );
  const tableCalls = vi.mocked(tableResult).mock.calls.length;
  const compileCalls = vi.mocked(compile).mock.calls.length;
  expect(tableCalls).toBeGreaterThan(0);
  expect(compileCalls).toBeGreaterThan(0);
  expect(screen.getAllByText('0.33')).toHaveLength(2);
  const button = screen.getByRole('button', {
    name: 'CSV exportieren (Rohwerte)',
  });
  fireEvent.click(button);
  expect(downloadFile).toHaveBeenLastCalledWith(
    'x_input;x;y\r\n-1;-1;0,3333333333333333\r\n0;0;0,3333333333333333\r\n',
    'm8e-graph-values.csv',
    'text/csv;charset=utf-8',
  );
  fireEvent.click(screen.getByRole('button', { name: /CSV-Format/ }));
  fireEvent.click(
    await screen.findByRole('option', { name: 'Komma / Dezimalpunkt' }),
  );
  fireEvent.click(button);
  expect(downloadFile).toHaveBeenLastCalledWith(
    'x_input,x,y\r\n-1,-1,0.3333333333333333\r\n0,0,0.3333333333333333\r\n',
    'm8e-graph-values.csv',
    'text/csv;charset=utf-8',
  );
  expect(tableResult).toHaveBeenCalledTimes(tableCalls);
  expect(compile).toHaveBeenCalledTimes(compileCalls);
});

it.each([
  [0, -1, 'keine Zeilen', 0],
  [1e16, 1e16 + 100, 'numerisch zu klein', 1],
  [-10, 10, '500 Zeilen', 500],
] as const)(
  'exports only existing rows between %s and %s',
  (xMin, xMax, status, count) => {
    vi.mocked(downloadFile).mockClear();
    render(
      <ValueTable
        curve={parseRow(newRow('a', 'x')).curve}
        bounds={{ ...defaultBounds, xMin, xMax }}
        step={0.001}
        locale="de"
        preferences={{ decimalSeparator: 'auto', grouping: true }}
        rounding="auto"
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(status);
    const button = screen.getByRole('button', {
      name: 'CSV exportieren (Rohwerte)',
    });
    if (count === 0) expect(button).toBeDisabled();
    fireEvent.click(button);
    if (count === 0) {
      expect(downloadFile).not.toHaveBeenCalled();
    } else {
      expect(
        vi.mocked(downloadFile).mock.lastCall?.[0].split('\r\n'),
      ).toHaveLength(count + 2);
    }
  },
);
