import { render, screen, fireEvent, act } from '@testing-library/react';
import { afterEach, it, expect, vi } from 'vitest';
import GraphMode from './GraphMode';
import { useHistoryStore } from '../../shared/historyStore';
import { getMode } from '../../app/modeRegistry';
import { newRow, initialPlot, plotPayload } from './model';
vi.mock('./GraphCanvas', () => ({
  default: () => <div data-testid="canvas" />,
}));
vi.mock('../scientific/ExpressionEditor', () => ({
  default: ({
    value,
    onChange,
    label,
  }: {
    value: string;
    onChange: (s: string) => void;
    label: string;
  }) => (
    <input
      data-testid="graph-test-editor"
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));
afterEach(() => {
  vi.useRealTimers();
  useHistoryStore.getState().clear('graph');
});
it('saves complete plot sets only after three seconds of quiet and restores their parameters', async () => {
  render(<GraphMode />);
  fireEvent.click(screen.getByRole('button', { name: 'Hinzufügen' }));
  const field = await screen.findByTestId('graph-test-editor');
  vi.useFakeTimers();
  fireEvent.change(field, { target: { value: 'a*x' } });
  act(() => vi.advanceTimersByTime(2500));
  expect(
    useHistoryStore.getState().entries.filter((e) => e.mode === 'graph'),
  ).toHaveLength(0);
  fireEvent.change(field, { target: { value: 'a*x+1' } });
  act(() => vi.advanceTimersByTime(2999));
  expect(
    useHistoryStore.getState().entries.filter((e) => e.mode === 'graph'),
  ).toHaveLength(0);
  act(() => vi.advanceTimersByTime(1));
  const entry = useHistoryStore
    .getState()
    .entries.find((e) => e.mode === 'graph');
  expect(entry?.payload).toEqual(
    expect.objectContaining({
      version: 1,
      rows: [expect.objectContaining({ input: 'a*x+1' })],
      bounds: initialPlot().bounds,
    }),
  );
  const plot = {
    ...initialPlot(),
    rows: [
      {
        ...newRow('restored', 'a*x'),
        params: { a: { value: 2, min: -3, max: 3, step: 0.5 } },
      },
    ],
    pi: true,
  };
  act(() => {
    getMode('graph').historyAdapter.restore({
      id: 'restore',
      mode: 'graph',
      ts: 0,
      input: 'a*x',
      result: '',
      pinned: false,
      payload: plotPayload(plot),
    });
  });
  expect(screen.getByRole('textbox', { name: 'Funktion 1' })).toHaveValue(
    'a*x',
  );
  expect(screen.getByRole('slider', { name: 'a' })).toHaveValue('2');
  expect(screen.getByRole('checkbox', { name: 'π-Ticks' })).toBeChecked();
  fireEvent.click(
    screen.getByRole('button', { name: 'Parameter a abspielen' }),
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Aktionen für Funktion 1' }),
  );
  fireEvent.click(screen.getByRole('menuitem', { name: 'Löschen' }));
  expect(screen.queryByRole('slider', { name: 'a' })).not.toBeInTheDocument();
  act(() => vi.advanceTimersByTime(3000));
  expect(
    useHistoryStore
      .getState()
      .entries.filter((e) => e.mode === 'graph')
      .map((e) => e.payload),
  ).toEqual(expect.arrayContaining([expect.objectContaining({ rows: [] })]));
});
