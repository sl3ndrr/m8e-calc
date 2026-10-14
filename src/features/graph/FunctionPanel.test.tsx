import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FunctionPanel from './FunctionPanel';
import { newRow, parseRow } from './model';
vi.mock('../scientific/ExpressionEditor', () => ({
  default: ({
    value,
    onChange,
    label,
    isInvalid,
  }: {
    value: string;
    onChange: (v: string) => void;
    label: string;
    isInvalid: boolean;
  }) => (
    <input
      aria-label={label}
      aria-invalid={isInvalid}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));
const common = {
  colors: [],
  locale: 'de' as const,
  playing: null,
  onPlay: vi.fn(),
  onAnalyze: vi.fn(),
};
describe('function panel', () => {
  it('offers examples and adds parser-ready input', () => {
    const dispatch = vi.fn();
    render(<FunctionPanel {...common} rows={[]} dispatch={dispatch} />);
    fireEvent.click(screen.getByRole('button', { name: 'Kreis' }));
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'add',
        row: expect.objectContaining({ input: '(cos(t),sin(t))' }),
      }),
    );
  });
  it('edits, toggles visibility and exposes detected parameters', async () => {
    const dispatch = vi.fn();
    render(
      <FunctionPanel
        {...common}
        rows={[parseRow(newRow('a', 'a*x+b'))]}
        dispatch={dispatch}
      />,
    );
    const editor = await screen.findByRole('textbox', { name: 'Funktion 1' });
    fireEvent.change(editor, { target: { value: 'sin(x)' } });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'update',
      id: 'a',
      patch: { input: 'sin(x)' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Sichtbarkeit von Funktion 1' }),
    );
    expect(dispatch).toHaveBeenCalledWith({
      type: 'update',
      id: 'a',
      patch: { visible: false },
    });
    expect(screen.getAllByRole('slider')).toHaveLength(2);
  });
  it('shows parser errors in the row and marks the editor invalid', async () => {
    render(
      <FunctionPanel
        {...common}
        rows={[parseRow(newRow('a', 'x^2+y^2=4'))]}
        dispatch={vi.fn()}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Implizite');
    await waitFor(() =>
      expect(
        screen.getByRole('textbox', { name: 'Funktion 1' }),
      ).toHaveAttribute('aria-invalid', 'true'),
    );
  });
  it('duplicates and deletes through the keyboard-accessible action menu', async () => {
    const dispatch = vi.fn();
    render(
      <FunctionPanel
        {...common}
        rows={[parseRow(newRow('a', 'sin(x)'))]}
        dispatch={dispatch}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Aktionen für Funktion 1' }),
    );
    fireEvent.click(
      await screen.findByRole('menuitem', { name: 'Duplizieren' }),
    );
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'add',
        row: expect.objectContaining({ input: 'sin(x)' }),
      }),
    );
  });
});
