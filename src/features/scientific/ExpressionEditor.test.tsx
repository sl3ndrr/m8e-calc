import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { createRef } from 'react';
import { expect, it, vi } from 'vitest';
import ExpressionEditor, { type EditorHandle } from './ExpressionEditor';
it('wraps the selection through the real CodeMirror adapter and marks engine diagnostics', async () => {
  const ref = createRef<EditorHandle>(),
    change = vi.fn();
  const { rerender } = render(
    <ExpressionEditor
      ref={ref}
      value=""
      locale="de"
      error={null}
      onChange={change}
      onEvaluate={() => {}}
      onBrowse={() => {}}
    />,
  );
  act(() => ref.current?.insert({ text: 'sin(', suffix: ')' }));
  expect(screen.getByRole('textbox', { name: 'Ausdruck' })).toHaveTextContent(
    'sin()',
  );
  expect(change).toHaveBeenCalledWith('sin()');
  act(() => ref.current?.insert({ text: '30' }));
  expect(screen.getByRole('textbox')).toHaveTextContent('sin(30)');
  change.mockClear();
  rerender(
    <ExpressionEditor
      ref={ref}
      value="1/0"
      locale="en"
      error={{ code: 'E_DIVISION_BY_ZERO', range: { start: 1, end: 2 } }}
      onChange={change}
      onEvaluate={() => {}}
      onBrowse={() => {}}
    />,
  );
  expect(screen.getByRole('textbox', { name: 'Expression' })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  expect(change).not.toHaveBeenCalled();
  await waitFor(() =>
    expect(document.querySelector('.cm-lintRange-error')).toHaveTextContent(
      '/',
    ),
  );
});

it.each(['Escape', 'Enter'])(
  '%s retains its calculator action with an open completion',
  async (key) => {
    const ref = createRef<EditorHandle>();
    const change = vi.fn();
    const evaluate = vi.fn();
    render(
      <ExpressionEditor
        ref={ref}
        value="inte"
        locale="de"
        error={null}
        onChange={change}
        onEvaluate={evaluate}
        onBrowse={() => {}}
      />,
    );
    act(() => ref.current?.focus());
    const editor = screen.getByRole('textbox', { name: 'Ausdruck' });
    fireEvent.keyDown(editor, { key: ' ', code: 'Space', ctrlKey: true });
    await waitFor(() => expect(screen.getByRole('listbox')).toBeVisible());
    fireEvent.keyDown(editor, { key, code: key });
    if (key === 'Escape') {
      expect(change).toHaveBeenCalledWith('');
      expect(evaluate).not.toHaveBeenCalled();
    } else {
      expect(evaluate).toHaveBeenCalledOnce();
      expect(change).not.toHaveBeenCalled();
    }
  },
);
