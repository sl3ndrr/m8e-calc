import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, expect, it } from 'vitest';
import { snackbarQueue } from '../ui';
import { App } from './App';
import { t } from '../shared/i18n';
import { useAppStore } from '../shared/store';
import { useHistoryStore } from '../shared/historyStore';
import { useSettingsStore } from '../shared/settingsStore';
// Compile the settings controller before timing UI interactions in jsdom.
// Its production cold path and rapid history-exit handoff are covered with a
// deliberately held chunk in settings-actions.spec.ts in all three engines.
beforeAll(async () => {
  await import('./SettingsDialog');
});
afterEach(() => {
  snackbarQueue.clear();
  window.location.hash = '';
  useAppStore.setState({ locale: 'de', lastMode: 'simple' });
  useHistoryStore.getState().resetHistory();
  useSettingsStore.getState().resetSettings();
});
it('renders the calculator and lazy modes and follows hash changes', async () => {
  useSettingsStore.getState().updateSettings({ motionLevel: 'off' });
  render(<App />);
  expect(
    await screen.findByRole('heading', { name: t('mode.simple') }),
  ).toBeVisible();
  expect(screen.getByRole('link', { name: t('mode.simple') })).toHaveAttribute(
    'aria-current',
    'page',
  );
  act(() => {
    window.location.hash = '#/graph';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
  expect(screen.getByRole('link', { name: t('mode.graph') })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await waitFor(() => expect(useAppStore.getState().lastMode).toBe('graph'));
});
it('updates visible text and document language from settings', async () => {
  render(<App />);
  act(() => useSettingsStore.getState().updateSettings({ language: 'en' }));
  expect(
    await screen.findByRole('heading', { name: t('mode.simple', 'en') }),
  ).toBeVisible();
  expect(document.documentElement.lang).toBe('en');
});
it('opens history from the shortcut, retains visibility by mode and opens settings', async () => {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole('heading', { name: t('mode.simple') });
  await user.keyboard('{Control>}h{/Control}');
  const history = await screen.findByRole('dialog', {
    name: t('history.title'),
  });
  expect(history).toBeVisible();
  await waitFor(() =>
    expect(history.contains(document.activeElement)).toBe(true),
  );
  await user.keyboard('{Escape}');
  expect(useHistoryStore.getState().visibility.simple).toBe(false);
  await waitFor(() => expect(history).not.toBeInTheDocument());
  await act(async () => {
    await user.click(screen.getByRole('button', { name: t('shell.settings') }));
  });
  expect(
    await screen.findByRole('dialog', { name: t('shell.settings') }),
  ).toBeVisible();
});

it('keeps theme in the shell and places accent only in settings', async () => {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole('heading', { name: t('mode.simple') });
  expect(
    screen.getByRole('radiogroup', { name: 'Erscheinungsbild' }),
  ).toBeVisible();
  expect(
    screen.queryByRole('button', { name: 'Akzentfarbe anpassen' }),
  ).toBeNull();
  expect(
    screen.queryByRole('button', { name: 'App installieren', hidden: true }),
  ).toBeNull();
  await act(async () => {
    await user.click(screen.getByRole('button', { name: t('shell.settings') }));
  });
  expect(
    await screen.findByRole('region', { name: 'Erscheinungsbild' }),
  ).toBeVisible();
  expect(
    screen.getByRole('button', { name: 'Akzentfarbe anpassen' }),
  ).toBeVisible();
  expect(screen.queryByRole('button', { name: 'App installieren' })).toBeNull();
});
