import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { snackbarQueue } from '../ui';
import { App } from './App';
import { t } from '../shared/i18n';
import { useAppStore } from '../shared/store';
import { useHistoryStore } from '../shared/historyStore';
import { useSettingsStore } from '../shared/settingsStore';
const lazyLoads = vi.hoisted(
  () => [] as { name: string; start: number; end?: number }[],
);
vi.mock('./SettingsDialog', async (original) => {
  const load = {
    name: 'settings',
    start: performance.now(),
    end: undefined as number | undefined,
  };
  lazyLoads.push(load);
  const module = await original<typeof import('./SettingsDialog')>();
  load.end = performance.now();
  return module;
});
vi.mock('./HistorySheet', async (original) => {
  const load = {
    name: 'history',
    start: performance.now(),
    end: undefined as number | undefined,
  };
  lazyLoads.push(load);
  const module = await original();
  load.end = performance.now();
  return module;
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
  const events: unknown[] = [];
  const record = (event: Event) =>
    events.push({
      type: event.type,
      at: performance.now(),
      target: (event.target as Element)?.outerHTML?.slice(0, 300),
      active: document.activeElement?.outerHTML?.slice(0, 300),
    });
  const types = [
    'pointerdown',
    'mousedown',
    'pointerup',
    'mouseup',
    'click',
    'focusin',
    'focusout',
    'keydown',
  ];
  types.forEach((type) => document.addEventListener(type, record, true));
  try {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: t('mode.simple') });
    events.push({ phase: 'before-history', at: performance.now() });
    await user.keyboard('{Control>}h{/Control}');
    expect(
      await screen.findByRole('dialog', { name: t('history.title') }),
    ).toBeVisible();
    events.push({ phase: 'history-ready', at: performance.now() });
    await user.keyboard('{Escape}');
    expect(useHistoryStore.getState().visibility.simple).toBe(false);
    events.push({ phase: 'before-settings', at: performance.now() });
    await user.click(screen.getByRole('button', { name: t('shell.settings') }));
    events.push({ phase: 'after-settings-click', at: performance.now() });
    expect(
      await screen.findByRole('dialog', { name: t('shell.settings') }),
    ).toBeVisible();
    console.info('AP48 phases', JSON.stringify({ lazyLoads, events }));
  } catch (error) {
    console.error(
      'AP48 diagnostic',
      JSON.stringify({ lazyLoads, events, body: document.body.innerHTML }),
    );
    throw error;
  } finally {
    types.forEach((type) => document.removeEventListener(type, record, true));
  }
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
  await user.click(screen.getByRole('button', { name: t('shell.settings') }));
  expect(
    await screen.findByRole('region', { name: 'Erscheinungsbild' }),
  ).toBeVisible();
  expect(
    screen.getByRole('button', { name: 'Akzentfarbe anpassen' }),
  ).toBeVisible();
  expect(screen.queryByRole('button', { name: 'App installieren' })).toBeNull();
});
