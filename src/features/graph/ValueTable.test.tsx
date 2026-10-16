import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import ValueTable from './ValueTable';
import { defaultBounds, newRow, parseRow, tableResult } from './model';
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
