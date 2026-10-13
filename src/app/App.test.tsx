import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import { snackbarQueue } from '../ui';
import { App } from './App';
import { t } from '../shared/i18n';
import { useAppStore } from '../shared/store';
import { useHistoryStore } from '../shared/historyStore';
import { useSettingsStore } from '../shared/settingsStore';
afterEach(() => { snackbarQueue.clear(); window.location.hash = ''; useAppStore.setState({ locale: 'de', lastMode: 'simple' }); useHistoryStore.getState().resetHistory(); useSettingsStore.getState().resetSettings(); });
it('renders lazy placeholders and follows hash changes', async () => {
  useSettingsStore.getState().updateSettings({ motionLevel: 'off' }); render(<App />);
  expect(await screen.findByRole('heading', { name: t('shell.ready') })).toBeVisible();
  expect(screen.getByRole('link', { name: t('mode.simple') })).toHaveAttribute('aria-current','page');
  act(() => { window.location.hash = '#/graph'; window.dispatchEvent(new HashChangeEvent('hashchange')); });
  expect(screen.getByRole('link', { name: t('mode.graph') })).toHaveAttribute('aria-current','page');
  await waitFor(() => expect(useAppStore.getState().lastMode).toBe('graph'));
});
it('updates visible text and document language from settings', async () => {
  render(<App />); act(() => useSettingsStore.getState().updateSettings({ language: 'en' }));
  expect(await screen.findByRole('heading', { name: t('shell.ready', 'en') })).toBeVisible(); expect(document.documentElement.lang).toBe('en');
});
it('opens history from the shortcut, retains visibility by mode and opens settings', async () => {
  const user = userEvent.setup(); render(<App />); await screen.findByRole('heading', { name: t('shell.ready') });
  await user.keyboard('{Control>}h{/Control}'); expect(await screen.findByRole('dialog', { name: t('history.title') })).toBeVisible();
  await user.keyboard('{Escape}'); expect(useHistoryStore.getState().visibility.simple).toBe(false);
  await user.click(screen.getByRole('button', { name: t('shell.settings') })); expect(await screen.findByRole('dialog', { name: t('shell.settings') })).toBeVisible();
});
