import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import ScientificMode from './ScientificMode';
import { createEnvironment, execute } from '../../engine';
import { SCIENTIFIC_STORAGE_KEY, useScientificStore } from './scientificStore';
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
afterEach(async () => {
  vi.useRealTimers();
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
