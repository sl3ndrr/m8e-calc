import { fireEvent, render, screen, act } from '@testing-library/react';
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
  const step = screen.getByRole('textbox', { name: 'Schrittweite' });
  fireEvent.change(step, { target: { value: '0,1' } });
  expect(vi.mocked(tableResult).mock.calls.length).toBe(calls);
  const form = step.closest('form');
  if (!form) throw Error('No step form');
  fireEvent.submit(form);
  expect(vi.mocked(tableResult).mock.lastCall?.[2]).toBe(0.1);
  const confirmed = vi.mocked(tableResult).mock.calls.length;
  for (const value of ['', ' ', '0', '-1', '1e', 'Infinity', '12.34,5']) {
    fireEvent.change(step, { target: { value } });
    fireEvent.submit(form);
  }
  expect(vi.mocked(tableResult).mock.calls.length).toBe(confirmed);
  expect(step).toHaveAttribute('aria-invalid', 'true');
  fireEvent.keyDown(screen.getByRole('slider', { name: 'a' }), { key: 'ArrowRight' });
  expect(vi.mocked(tableResult).mock.calls.length).toBeGreaterThan(confirmed);
  fireEvent.click(screen.getByRole('button', { name: 'Wertetabelle' }));
  const closed = vi.mocked(tableResult).mock.calls.length;
  await act(async () =>
    fireEvent.change(editor, { target: { value: 'a*x+2' } }),
  );
  expect(vi.mocked(tableResult).mock.calls.length).toBe(closed);
});
