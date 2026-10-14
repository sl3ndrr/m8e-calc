import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import ScientificMode from './ScientificMode';
import { createEnvironment } from '../../engine';
import { useScientificStore } from './scientificStore';
import { useHistoryStore } from '../../shared/historyStore';
import { useAppStore } from '../../shared/store';
import { snackbarQueue } from '../../ui';
vi.mock('./ExpressionEditor', () => ({
  default: ({
    value,
    onChange,
    onEvaluate,
    locale,
  }: {
    value: string;
    onChange: (value: string) => void;
    onEvaluate: () => void;
    locale: string;
  }) => (
    <input
      aria-label={locale === 'de' ? 'Ausdruck' : 'Expression'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onEvaluate();
      }}
    />
  ),
}));
vi.mock('./MathDisplay', () => ({
  default: ({ latex, label }: { latex: string; label: string }) => (
    <div aria-label={label}>{latex}</div>
  ),
}));
afterEach(() => {
  vi.useRealTimers();
  useScientificStore.getState().commit(createEnvironment());
  useHistoryStore.getState().resetHistory();
  useAppStore.setState({ locale: 'de' });
  snackbarQueue.clear();
});
it('evaluates, stores history/LaTeX and edits/removes persisted definitions', async () => {
  const user = userEvent.setup();
  render(<ScientificMode />);
  const editor = await screen.findByRole('textbox', { name: 'Ausdruck' });
  fireEvent.change(editor, { target: { value: 'a=5' } });
  await user.click(screen.getByRole('button', { name: 'Auswerten' }));
  expect(useScientificStore.getState().environment.variables.a).toBeDefined();
  expect(useHistoryStore.getState().entries[0]?.payload).toMatchObject({
    version: 1,
    expression: 'a=5',
    latex: { expression: expect.any(String), result: expect.any(String) },
  });
  await user.click(screen.getByRole('radio', { name: 'Variablen' }));
  await user.click(screen.getByRole('button', { name: 'a bearbeiten' }));
  expect(editor).toHaveValue('a = 5');
  await user.click(screen.getByRole('button', { name: 'a löschen' }));
  expect(useScientificStore.getState().environment.variables.a).toBeUndefined();
});
it('debounces previews, hides invalid previews and exposes errors', async () => {
  const user = userEvent.setup();
  render(<ScientificMode />);
  const editor = await screen.findByRole('textbox', { name: 'Ausdruck' });
  vi.useFakeTimers();
  fireEvent.change(editor, { target: { value: 'sin(30°)' } });
  await act(async () => {
    vi.advanceTimersByTime(249);
  });
  expect(screen.getByLabelText('Live-Vorschau')).toBeEmptyDOMElement();
  await act(async () => {
    vi.advanceTimersByTime(1);
  });
  expect(screen.getByLabelText('Live-Vorschau')).toHaveTextContent('0,5');
  expect(useHistoryStore.getState().entries).toHaveLength(0);
  expect(useScientificStore.getState().environment.history).toHaveLength(0);
  fireEvent.change(editor, { target: { value: '1/0' } });
  expect(screen.getByLabelText('Live-Vorschau')).toBeEmptyDOMElement();
  vi.useRealTimers();
  await user.click(screen.getByRole('button', { name: 'Auswerten' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Durch null');
});
it('uses full English metadata and exposes the programmer panel', async () => {
  useAppStore.setState({ locale: 'en' });
  const user = userEvent.setup();
  render(<ScientificMode />);
  await screen.findByRole('textbox', { name: 'Expression' });
  await user.click(screen.getByRole('radio', { name: 'Constants' }));
  await user.type(
    screen.getByRole('textbox', { name: 'Search constants' }),
    'speed',
  );
  expect(screen.getByText('Speed of light')).toBeVisible();
  await user.click(screen.getByRole('radio', { name: 'Computer science' }));
  expect(screen.getByRole('textbox', { name: 'Hexadecimal' })).toBeVisible();
});
