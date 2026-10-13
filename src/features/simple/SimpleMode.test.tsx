import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import SimpleMode from './SimpleMode';
import { useSettingsStore } from '../../shared/settingsStore';
import { useAppStore } from '../../shared/store';
import { useHistoryStore } from '../../shared/historyStore';
import { getMode } from '../../app/modeRegistry';
import { snackbarQueue, Snackbar } from '../../ui';
const result = () => screen.getByLabelText('Ergebnis', { selector: 'output' });
beforeEach(() => {
  useSettingsStore.getState().updateSettings({
    language: 'de',
    motionLevel: 'off',
    decimalSeparator: 'comma',
    grouping: true,
  });
  useAppStore.setState({ locale: 'de' });
  useHistoryStore.getState().resetHistory();
});
afterEach(() => {
  snackbarQueue.clear();
  vi.restoreAllMocks();
});
it('offers every required function and initially disables empty memory recall', () => {
  render(<SimpleMode />);
  expect(screen.getAllByRole('button')).toHaveLength(30);
  expect(screen.getByRole('button', { name: 'Kehrwert' })).toBeVisible();
  expect(
    screen.getByRole('button', { name: 'Speicher abrufen' }),
  ).toBeDisabled();
  expect(result()).toHaveTextContent('0');
});
it('calculates via screen buttons', async () => {
  const user = userEvent.setup();
  render(<SimpleMode />);
  for (const name of [
    'Ziffer 2',
    'Addieren',
    'Ziffer 3',
    'Ergebnis berechnen',
    'Ergebnis berechnen',
  ])
    await user.click(screen.getByRole('button', { name }));
  expect(result()).toHaveTextContent('8');
  expect(useHistoryStore.getState().entries).toHaveLength(2);
});
it('shows a keyboard press on its screen key and releases it', () => {
  const { container } = render(<SimpleMode />);
  fireEvent.keyDown(window, { key: '7' });
  expect(container.querySelector('[data-key="7"]')).toHaveAttribute(
    'data-key-pressed',
  );
  fireEvent.keyUp(window, { key: '7' });
  expect(container.querySelector('[data-key="7"]')).not.toHaveAttribute(
    'data-key-pressed',
  );
  expect(result()).toHaveTextContent('7');
});
it('releases keyboard feedback on window blur', () => {
  const { container } = render(<SimpleMode />);
  fireEvent.keyDown(window, { key: '7' });
  fireEvent.blur(window);
  expect(container.querySelector('[data-key="7"]')).not.toHaveAttribute(
    'data-key-pressed',
  );
});
it('shows an active operator and supports replacement', async () => {
  const user = userEvent.setup();
  const { container } = render(<SimpleMode />);
  await user.keyboard('2+');
  expect(container.querySelector('[data-key="+"]')).toHaveAttribute(
    'data-active',
  );
  await user.keyboard('*3=');
  expect(result()).toHaveTextContent('6');
});
it('localizes errors and recovers with Esc', async () => {
  const user = userEvent.setup();
  render(<SimpleMode />);
  await user.keyboard('1/0=');
  expect(result()).toHaveTextContent('Durch null kann nicht geteilt werden.');
  await user.keyboard('{Escape}5=');
  expect(result()).toHaveTextContent('5');
});
it('renders the memory indicator, recalls, adds, subtracts and clears', async () => {
  const user = userEvent.setup();
  render(<SimpleMode />);
  await user.keyboard('10');
  await user.click(screen.getByRole('button', { name: 'Zahl speichern' }));
  expect(screen.getByLabelText('Zahl im Speicher')).toHaveTextContent('M');
  await user.keyboard('{Escape}3');
  await user.click(
    screen.getByRole('button', { name: 'Zum Speicher addieren' }),
  );
  await user.click(
    screen.getByRole('button', { name: 'Vom Speicher subtrahieren' }),
  );
  await user.click(screen.getByRole('button', { name: 'Speicher abrufen' }));
  expect(result()).toHaveTextContent('10');
  await user.click(screen.getByRole('button', { name: 'Speicher löschen' }));
  expect(screen.getByLabelText('Speicher leer')).toBeEmptyDOMElement();
});
it('pastes a localized number into the pending operation', async () => {
  const user = userEvent.setup();
  render(<SimpleMode />);
  await user.keyboard('5+');
  fireEvent.paste(window, { clipboardData: { getData: () => '1.234,5' } });
  await user.keyboard('=');
  expect(result()).toHaveTextContent('1.239,5');
});
it('rejects nonnumeric paste', () => {
  render(<SimpleMode />);
  fireEvent.paste(window, { clipboardData: { getData: () => 'hello' } });
  expect(result()).toHaveTextContent('Bitte eine gültige Zahl');
});
it('copies the display and announces success through the shared snackbar', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
  render(
    <>
      <SimpleMode />
      <Snackbar label="Benachrichtigungen" closeLabel="Schließen" />
    </>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Ergebnis kopieren' }));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith('0'));
  expect(await screen.findByText('Ergebnis kopiert.')).toBeVisible();
});
it('restores an editable history expression', async () => {
  const user = userEvent.setup();
  render(<SimpleMode />);
  await user.keyboard('100+10%=');
  const entry = useHistoryStore.getState().entries[0];
  if (!entry) throw new Error('Missing entry');
  await user.keyboard('{Escape}');
  act(() => getMode('simple').historyAdapter.restore(entry));
  await user.keyboard('=');
  expect(result()).toHaveTextContent('110');
});
it('does not intercept keyboard or paste inside a form field', async () => {
  const user = userEvent.setup();
  render(
    <>
      <SimpleMode />
      <input aria-label="Test input" />
    </>,
  );
  await user.click(screen.getByRole('textbox'));
  await user.keyboard('123+4=');
  fireEvent.paste(screen.getByRole('textbox'), {
    clipboardData: { getData: () => '55' },
  });
  expect(result()).toHaveTextContent('0');
});
it('suspends global calculator keys when a dialog is open', async () => {
  const user = userEvent.setup();
  render(
    <>
      <SimpleMode />
      <div role="dialog" aria-label="Dialog" />
    </>,
  );
  await user.keyboard('123+4=');
  expect(result()).toHaveTextContent('0');
});
it('responds to decimal and grouping preference changes', async () => {
  const user = userEvent.setup();
  render(<SimpleMode />);
  await user.keyboard('1234,5');
  expect(result()).toHaveTextContent('1.234,5');
  act(() =>
    useSettingsStore
      .getState()
      .updateSettings({ decimalSeparator: 'point', grouping: false }),
  );
  expect(result()).toHaveTextContent('1234.5');
});
