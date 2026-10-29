import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useImperativeHandle, useRef, type Ref } from 'react';
import type { EditorHandle } from './ExpressionEditor';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { TestCalculationWorker } from './calculationTestWorker';
import { runCalculation } from './workerCalculation';
import ScientificMode from './ScientificMode';
import { createEnvironment, execute } from '../../engine';
import { SCIENTIFIC_STORAGE_KEY, useScientificStore } from './scientificStore';
import { useHistoryStore } from '../../shared/historyStore';
import { useAppStore } from '../../shared/store';
import { snackbarQueue } from '../../ui';
vi.mock('./ExpressionEditor', () => ({
  default: function MockEditor({
    ref,
    value,
    onChange,
    onEvaluate,
    locale,
  }: {
    ref?: Ref<EditorHandle>;
    value: string;
    onChange: (value: string) => void;
    onEvaluate: () => void;
    locale: string;
  }) {
    const input = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => ({ focus: () => input.current?.focus(), insert: () => {} }));
    return (
    <input
      ref={input}
      aria-label={locale === 'de' ? 'Ausdruck' : 'Expression'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onEvaluate();
      }}
    />
  ); },
}));
vi.mock('./MathDisplay', () => ({
  default: ({ latex, label }: { latex: string; label: string }) => (
    <div aria-label={label}>{latex}</div>
  ),
}));
beforeEach(() => {
  TestCalculationWorker.instances = [];
  TestCalculationWorker.hold = false;
  vi.stubGlobal('Worker', TestCalculationWorker);
});
afterEach(async () => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  localStorage.removeItem(SCIENTIFIC_STORAGE_KEY);
  await useScientificStore.persist.rehydrate();
  useScientificStore.getState().commit(createEnvironment());
  useHistoryStore.getState().resetHistory();
  useAppStore.setState({ locale: 'de' });
  snackbarQueue.clear();
});

it.each(['de', 'en'] as const)(
  'explains recovery in %s and permits keyboard retry without running old formulas',
  async (locale) => {
    useAppStore.setState({ locale });
    localStorage.setItem(SCIENTIFIC_STORAGE_KEY, '{broken');
    await useScientificStore.persist.rehydrate();
    const user = userEvent.setup();
    render(<ScientificMode />);
    await screen.findByRole('textbox', {
      name: locale === 'de' ? 'Ausdruck' : 'Expression',
    });
    const retry = screen.getByRole('button', {
      name:
        locale === 'de'
          ? 'Gespeicherten Bestand erneut laden'
          : 'Load saved data again',
    });
    expect(
      screen.getByText(
        locale === 'de'
          ? /Der ursprüngliche Bestand bleibt unverändert/
          : /The original data remains unchanged/,
      ),
    ).toBeVisible();
    const result = execute('f(x)=1/0');
    if (!result.ok) throw new Error('setup');
    localStorage.setItem(
      SCIENTIFIC_STORAGE_KEY,
      JSON.stringify({
        state: { environment: result.value.environment },
        version: 1,
      }),
    );
    retry.focus();
    await user.keyboard('{Enter}');
    expect(useScientificStore.getState().recovery).toBeNull();
    expect(useScientificStore.getState().environment).toEqual(
      result.value.environment,
    );
    expect(
      screen.queryByRole('button', { name: retry.textContent ?? '' }),
    ).not.toBeInTheDocument();
  },
);

function activeWorker(): TestCalculationWorker {
  const worker = TestCalculationWorker.instances.at(-1);
  if (!worker) throw new Error('Expected worker request');
  return worker;
}
it('does not replace an explicit snapshot with typing or its preview, or overwrite the newer draft', async () => {
  TestCalculationWorker.hold = true;
  render(<ScientificMode />);
  const editor = await screen.findByRole('textbox', { name: 'Ausdruck' });
  vi.useFakeTimers();
  fireEvent.change(editor, { target: { value: 'a=5' } });
  fireEvent.keyDown(editor, { key: 'Enter' });
  const execution = activeWorker();
  fireEvent.change(editor, { target: { value: 'a+2' } });
  await act(async () => { vi.advanceTimersByTime(250); });
  expect(TestCalculationWorker.instances).toHaveLength(1);
  expect(execution.terminated).toBe(false);
  act(() => execution.respond());
  expect(editor).toHaveValue('a+2');
  expect(screen.getByText('Dein nächster Gedanke beginnt hier.')).toBeInTheDocument();
  expect(useScientificStore.getState().environment.variables.a).toEqual({ kind: 'number', value: '5' });
  expect(useHistoryStore.getState().entries).toHaveLength(1);
  expect(useHistoryStore.getState().entries[0]?.input).toBe('a=5');
  await act(async () => { vi.advanceTimersByTime(250); });
  const preview = activeWorker();
  expect(preview.request.kind).toBe('preview');
  act(() => preview.respond());
  expect(screen.getByLabelText('Live-Vorschau')).toHaveTextContent('7');
  expect(useHistoryStore.getState().entries).toHaveLength(1);
  expect(useScientificStore.getState().environment.history).toHaveLength(1);
});
it('invalidates rapid A → B → A, options and deleted definitions without resurrecting queued responses', async () => {
  TestCalculationWorker.hold = true;
  const saved = execute('a=5'); if (!saved.ok) throw new Error('setup');
  useScientificStore.getState().commit(saved.value.environment);
  render(<ScientificMode />);
  const editor = await screen.findByRole('textbox', { name: 'Ausdruck' });
  vi.useFakeTimers();
  const oldHandlers: (() => void)[] = [];
  for (const value of ['a+1', 'a+2', 'a+1']) {
    fireEvent.change(editor, { target: { value } });
    await act(async () => { vi.advanceTimersByTime(250); });
    const worker = activeWorker();
    const handlers = [...worker.listeners.get('message') ?? []];
    const data = runCalculation(worker.request);
    oldHandlers.push(() => handlers.forEach((h) => h(new MessageEvent('message', { data }))));
  }
  act(() => { oldHandlers[0]?.(); oldHandlers[1]?.(); });
  expect(screen.getByLabelText('Live-Vorschau')).not.toHaveTextContent('6');
  fireEvent.click(screen.getByRole('radio', { name: 'RAD', exact: true }));
  act(() => oldHandlers[2]?.());
  expect(screen.getByLabelText('Live-Vorschau')).not.toHaveTextContent('6');
  await act(async () => { vi.advanceTimersByTime(250); });
  fireEvent.keyDown(editor, { key: 'Enter' });
  const execution = activeWorker();
  const handlers = [...execution.listeners.get('message') ?? []];
  const response = runCalculation(execution.request);
  act(() => useScientificStore.getState().remove('a'));
  act(() => handlers.forEach((h) => h(new MessageEvent('message', { data: response }))));
  expect(execution.terminated).toBe(true);
  expect(useScientificStore.getState().environment.variables.a).toBeUndefined();
  expect(useHistoryStore.getState().entries).toHaveLength(0);
});
it.each(['de', 'en'] as const)('two Enter presses, keyboard cancel, worker failure and unmount are safe in %s', async (locale) => {
  useAppStore.setState({ locale }); TestCalculationWorker.hold = true;
  const view = render(<ScientificMode />);
  const editor = await screen.findByRole('textbox', { name: locale === 'de' ? 'Ausdruck' : 'Expression' });
  fireEvent.change(editor, { target: { value: '1+2' } });
  fireEvent.keyDown(editor, { key: 'Enter' }); const first = activeWorker();
  fireEvent.keyDown(editor, { key: 'Enter' }); const second = activeWorker();
  expect(first.terminated).toBe(true);
  act(() => { first.respond(); second.respond(); second.respond(); });
  expect(useHistoryStore.getState().entries).toHaveLength(1);
  fireEvent.keyDown(editor, { key: 'Enter' }); const cancelled = activeWorker();
  const user = userEvent.setup();
  const cancel = screen.getByRole('button', { name: locale === 'de' ? 'Abbrechen' : 'Cancel', exact: true });
  cancel.focus(); await user.keyboard('{Enter}');
  expect(cancelled.terminated).toBe(true);
  expect(editor).toHaveFocus();
  act(() => cancelled.respond());
  expect(useHistoryStore.getState().entries).toHaveLength(1);
  fireEvent.keyDown(editor, { key: 'Enter' });
  act(() => activeWorker().crash('messageerror'));
  expect(screen.getByRole('alert')).toHaveTextContent(locale === 'de' ? 'erneut auswerten' : 'evaluate again');
  fireEvent.keyDown(editor, { key: 'Enter' });
  const pending = activeWorker(); view.unmount(); pending.respond();
  expect(pending.terminated).toBe(true);
  expect([...pending.listeners.values()].every((listeners) => listeners.size === 0)).toBe(true);
  expect(useHistoryStore.getState().entries).toHaveLength(1);
});
function expressionActions(editor: HTMLElement) {
  const article = editor.closest('article');
  if (!article)
    throw new Error('Expected expression editor inside its article');
  return within(article);
}
it('evaluates, stores history/LaTeX and edits/removes persisted definitions', async () => {
  const user = userEvent.setup();
  render(<ScientificMode />);
  const editor = await screen.findByRole('textbox', { name: 'Ausdruck' });
  fireEvent.change(editor, { target: { value: 'a=5' } });
  await user.click(
    expressionActions(editor).getByRole('button', { name: 'Auswerten' }),
  );
  expect(useScientificStore.getState().environment.variables.a).toBeDefined();
  expect(useHistoryStore.getState().entries[0]?.payload).toMatchObject({
    version: 1,
    expression: 'a=5',
    latex: { expression: expect.any(String), result: expect.any(String) },
  });
  await user.click(
    within(screen.getByRole('radiogroup', { name: 'Bedienfelder' })).getByRole(
      'radio',
      { name: 'Variablen' },
    ),
  );
  await user.click(
    within(screen.getByRole('region', { name: 'Variablen' })).getByRole(
      'button',
      { name: 'a bearbeiten' },
    ),
  );
  expect(editor).toHaveValue('a = 5');
  await user.click(
    within(screen.getByRole('region', { name: 'Variablen' })).getByRole(
      'button',
      { name: 'a löschen' },
    ),
  );
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
  await user.click(
    expressionActions(editor).getByRole('button', { name: 'Auswerten' }),
  );
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

it.each(['de', 'en'] as const)(
  'keeps exact values through untouched definition edits in %s',
  async (locale) => {
    useAppStore.setState({ locale });
    let env = createEnvironment();
    for (const source of [
      'v=-1',
      'large=1e50',
      'precise=1/7',
      'z=-2-3i',
      'xs=factor(12)',
      'f(x)=1/0+missing(x)',
    ]) {
      const next = execute(source, env, { complex: 'on' });
      if (!next.ok) throw new Error(next.error.code);
      env = next.value.environment;
    }
    useScientificStore.getState().commit(env);
    const user = userEvent.setup();
    render(<ScientificMode />);
    const editor = await screen.findByRole('textbox', {
      name: locale === 'de' ? 'Ausdruck' : 'Expression',
    });
    await user.click(
      screen.getByRole('radio', {
        name: locale === 'de' ? 'Variablen' : 'Variables',
      }),
    );
    const panel = screen.getByRole('region', {
      name: locale === 'de' ? 'Variablen' : 'Variables',
    });
    for (const name of ['v', 'large', 'precise', 'z', 'f']) {
      const before = useScientificStore.getState().environment;
      const history = useHistoryStore.getState().entries;
      await user.click(
        within(panel).getByRole('button', {
          name: locale === 'de' ? `${name} bearbeiten` : `Edit ${name}`,
        }),
      );
      expect(useScientificStore.getState().environment).toBe(before);
      expect(useHistoryStore.getState().entries).toBe(history);
      // Replacing the text and restoring exactly the opened source remains lossless.
      const source = (editor as HTMLInputElement).value;
      fireEvent.change(editor, { target: { value: source + ' ' } });
      fireEvent.change(editor, { target: { value: source } });
      editor.focus();
      await user.keyboard('{Enter}');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      const after = useScientificStore.getState().environment;
      expect(after.variables).toEqual(env.variables);
      expect(after.functions).toEqual(env.functions);
      expect(useHistoryStore.getState().entries).toHaveLength(
        history.length + 1,
      );
    }
    const editList = within(panel).getByRole('button', {
      name: locale === 'de' ? 'xs bearbeiten' : 'Edit xs',
    });
    expect(editList).toBeDisabled();
  },
);
