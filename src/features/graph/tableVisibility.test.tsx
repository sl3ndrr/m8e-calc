import { fireEvent, render, screen, act, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import GraphMode from './GraphMode';
import { tableResult } from './model';
vi.mock('./model', async (original) => {
  const actual = await original<typeof import('./model')>();
  return { ...actual, tableResult: vi.fn(actual.tableResult) };
});
vi.mock('./GraphCanvas', () => ({ default: () => <div /> }));
vi.mock('../scientific/ExpressionEditor', () => ({
  default: ({
    value,
    label,
    onChange,
  }: {
    value: string;
    label: string;
    onChange: (s: string) => void;
  }) => (
    <input
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));
it('does no closed-table work; updates an open table only after valid step confirmation or parameter changes', async () => {
  render(<GraphMode />);
  fireEvent.click(screen.getByRole('button', { name: 'Hinzufügen' }));
  const editor = await screen.findByRole('textbox', { name: 'Funktion 1' });
  fireEvent.change(editor, { target: { value: 'a*x+1e-13' } });
  expect(tableResult).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Wertetabelle' }));
  const calls = vi.mocked(tableResult).mock.calls.length;
  expect(calls).toBeGreaterThan(0);
  const step = within(
    screen.getByRole('region', { name: 'Wertetabelle' }),
  ).getByRole('textbox', { name: 'Schrittweite' });
  fireEvent.change(step, { target: { value: '0,1' } });
  expect(vi.mocked(tableResult).mock.calls.length).toBe(calls);
  const form = step.closest('form');
  if (!form) throw Error('No step form');
  fireEvent.submit(form);
  expect(vi.mocked(tableResult).mock.lastCall?.[2]).toBe(0.1);
  const confirmed = vi.mocked(tableResult).mock.calls.length;
  fireEvent.click(
    screen.getByRole('button', { name: 'Sichtbarkeit von Funktion 1' }),
  );
  expect(vi.mocked(tableResult).mock.calls.length).toBe(confirmed);
  for (const value of ['', ' ', '0', '-1', '1e', 'Infinity', '12.34,5']) {
    fireEvent.change(step, { target: { value } });
    fireEvent.submit(form);
  }
  expect(vi.mocked(tableResult).mock.calls.length).toBe(confirmed);
  expect(step).toHaveAttribute('aria-invalid', 'true');
  fireEvent.keyDown(screen.getByRole('slider', { name: 'a' }), {
    key: 'ArrowRight',
  });
  expect(vi.mocked(tableResult).mock.calls.length).toBeGreaterThan(confirmed);
  fireEvent.click(screen.getByRole('button', { name: 'Wertetabelle' }));
  const closed = vi.mocked(tableResult).mock.calls.length;
  await act(async () =>
    fireEvent.change(editor, { target: { value: 'a*x+2' } }),
  );
  expect(vi.mocked(tableResult).mock.calls.length).toBe(closed);
});

it('keeps an edited implicit or invalid selection instead of switching to a different table curve', async () => {
  render(<GraphMode />);
  fireEvent.click(screen.getByRole('button', { name: 'Hinzufügen' }));
  const first = await screen.findByRole('textbox', { name: 'Funktion 1' });
  fireEvent.change(first, { target: { value: 'x^2+y^2=4' } });
  fireEvent.click(screen.getByRole('button', { name: 'Hinzufügen' }));
  const second = await screen.findByRole('textbox', { name: 'Funktion 2' });
  fireEvent.change(second, { target: { value: 'x' } });
  fireEvent.click(screen.getByRole('button', { name: 'Wertetabelle' }));
  const region = screen.getByRole('region', { name: 'Wertetabelle' });
  expect(within(region).getByRole('status')).toHaveTextContent(
    'keinen eindeutigen y-Wert',
  );
  expect(within(region).queryByRole('table')).not.toBeInTheDocument();
  expect(
    within(region).getByRole('button', { name: 'Anwenden' }),
  ).toBeDisabled();
  // Pin a choice explicitly, then turn that exact row into an implicit curve.
  fireEvent.click(within(region).getByRole('button', { name: /x\^2\+y\^2=4/ }));
  fireEvent.click(await screen.findByRole('option', { name: 'x' }));
  expect(within(region).getByRole('table')).toBeInTheDocument();
  fireEvent.change(second, { target: { value: 'x*y=1' } });
  expect(within(region).queryByRole('table')).not.toBeInTheDocument();
  expect(within(region).getByRole('status')).toHaveTextContent(
    'keinen eindeutigen y-Wert',
  );
  fireEvent.change(second, { target: { value: 'sin(' } });
  expect(within(region).getByText(/ausgewählte Kurve/)).toBeInTheDocument();
  expect(within(region).queryByRole('table')).not.toBeInTheDocument();
});
