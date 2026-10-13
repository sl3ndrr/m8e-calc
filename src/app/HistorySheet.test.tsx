import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { HistorySheet, clearHistoryWithUndo } from './HistorySheet';
import { useHistoryStore } from '../shared/historyStore';
import { getMode } from './modeRegistry';
import { snackbarQueue, Snackbar } from '../ui';
afterEach(() => { useHistoryStore.getState().resetHistory(); snackbarQueue.clear(); });
it('searches, pins, restores and deletes entries through the mode adapter', async () => {
  const user = userEvent.setup(); const entry = useHistoryStore.getState().add('simple', { input: '2 + 3', result: '5', payload: null }); const restore = vi.fn(); const unregister = getMode('simple').historyAdapter.register(restore);
  render(<HistorySheet mode="simple" docked visible onClose={() => {}} />);
  await user.click(screen.getByRole('button', { name: 'Wiederherstellen: 2 + 3' })); expect(restore).toHaveBeenCalledWith(entry);
  await user.click(screen.getByRole('button', { name: 'Anheften' })); expect(useHistoryStore.getState().entries[0]?.pinned).toBe(true);
  await user.type(screen.getByRole('searchbox', { name: 'Verlauf durchsuchen' }), 'missing'); expect(screen.getByText('Keine passenden Einträge.')).toBeVisible();
  await user.clear(screen.getByRole('searchbox')); await user.click(screen.getByRole('button', { name: 'Eintrag löschen' })); expect(screen.getByText('Ein neuer Anfang.')).toBeVisible(); unregister();
});
it('Undo restores the clear snapshot and keeps new entries', async () => {
  const user = userEvent.setup(); useHistoryStore.getState().add('simple', { input: 'first', result: '1', payload: null });
  render(<Snackbar label="Benachrichtigungen" closeLabel="Schließen" />);
  act(() => { clearHistoryWithUndo('simple'); useHistoryStore.getState().add('graph', { input: 'new', result: '2', payload: null }); });
  await user.click(await screen.findByRole('button', { name: 'Rückgängig' })); expect(useHistoryStore.getState().entries).toHaveLength(2);
});
