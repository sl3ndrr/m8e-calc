import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { HistorySheet, clearHistoryWithUndo } from './HistorySheet';
import { useHistoryStore } from '../shared/historyStore';
import { getMode } from './modeRegistry';
import { snackbarQueue, Snackbar } from '../ui';
import { useAppStore } from '../shared/store';
import { t } from '../shared/i18n';
afterEach(() => {
  useHistoryStore.getState().resetHistory();
  snackbarQueue.clear();
  useAppStore.getState().setLocale('de');
});
it('searches, pins, restores and deletes entries through the mode adapter', async () => {
  const user = userEvent.setup();
  const entry = useHistoryStore
    .getState()
    .add('simple', { input: '2 + 3', result: '5', payload: null });
  const restore = vi.fn();
  const unregister = getMode('simple').historyAdapter.register(restore);
  render(<HistorySheet mode="simple" docked visible onClose={() => {}} />);
  await user.click(
    screen.getByRole('button', { name: 'Wiederherstellen: 2 + 3 5' }),
  );
  expect(restore).toHaveBeenCalledWith(entry);
  await user.click(screen.getByRole('button', { name: 'Anheften' }));
  expect(useHistoryStore.getState().entries[0]?.pinned).toBe(true);
  await user.type(
    screen.getByRole('searchbox', { name: 'Verlauf durchsuchen' }),
    'missing',
  );
  expect(screen.getByText('Keine passenden Einträge.')).toBeVisible();
  await user.clear(screen.getByRole('searchbox'));
  await user.click(screen.getByRole('button', { name: 'Eintrag löschen' }));
  expect(screen.getByText('Ein neuer Anfang.')).toBeVisible();
  unregister();
});
it('Undo restores the clear snapshot and keeps new entries', async () => {
  const user = userEvent.setup();
  useHistoryStore
    .getState()
    .add('simple', { input: 'first', result: '1', payload: null });
  render(<Snackbar label="Benachrichtigungen" closeLabel="Schließen" />);
  act(() => {
    clearHistoryWithUndo('simple');
    useHistoryStore
      .getState()
      .add('graph', { input: 'new', result: '2', payload: null });
  });
  await user.click(await screen.findByRole('button', { name: 'Rückgängig' }));
  expect(useHistoryStore.getState().entries).toHaveLength(2);
});

for (const locale of ['de', 'en'] as const) {
  it.each([
    ['simple', '12 + 3', '15'],
    ['scientific', 'f(x) = x^2 + 1', 'Definition saved'],
    ['convert', '5 km → m', '5.000 m'],
    ['graph', 'sin(x) ; x^2', '2 functions'],
  ] as const)(
    `keeps the full %s history text in its ${locale} action name`,
    async (mode, input, result) => {
      useAppStore.getState().setLocale(locale);
      const entry = useHistoryStore
        .getState()
        .add(mode, { input, result, payload: null });
      const restore = vi.fn();
      const unregister = getMode(mode).historyAdapter.register(restore);
      const notice = vi.spyOn(snackbarQueue, 'add');
      try {
        render(<HistorySheet mode={mode} docked visible onClose={() => {}} />);
        const control = screen.getByRole('button', {
          name: t('history.restore', locale, { input: `${input} ${result}` }),
        });
        expect(control).toHaveTextContent(`${input} ${result}`);
        control.focus();
        await userEvent.setup().keyboard('{Enter}');
        expect(restore).toHaveBeenCalledExactlyOnceWith(entry);
        expect(notice).toHaveBeenCalledTimes(1);
        expect(control).toHaveFocus();
      } finally {
        unregister();
        notice.mockRestore();
      }
    },
  );
}
