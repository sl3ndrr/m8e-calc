import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FunctionPanel from './FunctionPanel';
import { newRow, parseRow } from './model';
import type { SampleResponse } from './workerProtocol';
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
  it('keeps successful and pending samples free of empty diagnostic regions', () => {
    const row = parseRow(newRow('a', 'a*x'));
    const sample: SampleResponse['curves'][number] = {
      id: row.row.id,
      signature: JSON.stringify(row.curve),
      segments: [],
      evaluations: 2,
      truncated: false,
    };
    const props = { ...common, rows: [row], dispatch: vi.fn() };
    const { container, rerender } = render(
      <FunctionPanel {...props} samples={[sample]} />,
    );
    expect(
      container.querySelector('.graph-sampling-status'),
    ).not.toBeInTheDocument();
    rerender(<FunctionPanel {...props} samples={[]} />);
    expect(
      container.querySelector('.graph-sampling-status'),
    ).not.toBeInTheDocument();
    rerender(<FunctionPanel {...props} samples={[sample]} />);
    expect(
      container.querySelector('.graph-sampling-status'),
    ).not.toBeInTheDocument();
  });
  it('shows actual sampling warnings and removes them when no longer current', () => {
    const row = parseRow(newRow('a', 'a*x'));
    const sample: SampleResponse['curves'][number] = {
      id: row.row.id,
      signature: JSON.stringify(row.curve),
      segments: [],
      evaluations: 2,
      truncated: true,
    };
    const props = { ...common, rows: [row], dispatch: vi.fn() };
    const { container, rerender } = render(
      <FunctionPanel {...props} samples={[sample]} />,
    );
    expect(container.querySelector('.graph-sampling-status p')).toBeVisible();
    rerender(
      <FunctionPanel
        {...props}
        samples={[{ ...sample, truncated: false, error: 'worker' }]}
      />,
    );
    expect(container.querySelector('.graph-sampling-status')).toHaveTextContent(
      'Sampling-Worker ist nicht verfügbar',
    );
    rerender(
      <FunctionPanel
        {...props}
        samples={[{ ...sample, signature: 'outdated' }]}
      />,
    );
    expect(
      container.querySelector('.graph-sampling-status'),
    ).not.toBeInTheDocument();
    rerender(
      <FunctionPanel {...props} samples={[{ ...sample, truncated: false }]} />,
    );
    expect(
      container.querySelector('.graph-sampling-status'),
    ).not.toBeInTheDocument();
  });
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
        rows={[parseRow(newRow('a', 'x^2+y^2='))]}
        dispatch={vi.fn()}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Eingabe prüfen');
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
  it('keeps the last parameter state until a complete localized range is confirmed', () => {
    const dispatch = vi.fn();
    render(
      <FunctionPanel
        {...common}
        rows={[parseRow(newRow('a', 'a*x'))]}
        dispatch={dispatch}
      />,
    );
    fireEvent.click(screen.getByText('Bereich und Schrittweite'));
    const min = screen.getByLabelText('Minimum'),
      max = screen.getByLabelText('Maximum'),
      step = screen.getByLabelText('Schrittweite');
    expect(step).toHaveValue('0,1');
    fireEvent.change(min, { target: { value: '' } });
    fireEvent.change(max, { target: { value: '2' } });
    expect(dispatch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Anwenden' }));
    expect(dispatch).not.toHaveBeenCalled();
    expect(min).toHaveAttribute('aria-invalid', 'true');
    fireEvent.change(min, { target: { value: '-2' } });
    fireEvent.change(step, { target: { value: '0,1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Anwenden' }));
    expect(dispatch).toHaveBeenLastCalledWith({
      type: 'update',
      id: 'a',
      patch: { params: { a: { value: 1, min: -2, max: 2, step: 0.1 } } },
    });
    dispatch.mockClear();
    for (const value of [' ', '0', '-1', '1e', '1.2,3']) {
      fireEvent.change(step, { target: { value } });
      fireEvent.click(screen.getByRole('button', { name: 'Anwenden' }));
    }
    expect(dispatch).not.toHaveBeenCalled();
  });
});

it.each(['de', 'en'] as const)(
  'explains unavailable implicit actions and disables every analysis entry in %s',
  async (locale) => {
    render(
      <FunctionPanel
        {...common}
        locale={locale}
        rows={[parseRow(newRow('implicit', 'x^2+y^2=4'))]}
        dispatch={vi.fn()}
      />,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(
      screen.getByText(/F\(x, y\) = 0.*(legt|does not)/),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', {
        name:
          locale === 'de'
            ? 'Aktionen für Funktion 1'
            : 'Actions for function 1',
      }),
    );
    for (const name of locale === 'de'
      ? ['Nullstellen', 'Extrema', 'Schnittpunkte', 'Tangente', 'Integral']
      : ['Roots', 'Extrema', 'Intersections', 'Tangent', 'Integral']) {
      expect(await screen.findByRole('menuitem', { name })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
    }
  },
);

it('explains parser resource limits without exposing only a technical error code', () => {
  render(
    <FunctionPanel
      {...common}
      rows={[parseRow(newRow('large', 'x'.repeat(10001)))]}
      dispatch={vi.fn()}
    />,
  );
  expect(screen.getByRole('alert')).toHaveTextContent('Maximal 10000 Zeichen');
});
