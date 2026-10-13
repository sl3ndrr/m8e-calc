import { act, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { App } from './App';
import { t } from '../shared/i18n';
import { useAppStore } from '../shared/store';
afterEach(() => {
  window.location.hash = '';
  useAppStore.setState({ locale: 'de' });
});
it('renders the placeholder and follows hash changes', () => {
  render(<App />);
  expect(
    screen.getByRole('heading', { name: t('app.foundation') }),
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
});
it('updates visible text and document language from the store', () => {
  render(<App />);
  act(() => useAppStore.getState().setLocale('en'));
  expect(
    screen.getByRole('heading', { name: t('app.foundation', 'en') }),
  ).toBeVisible();
  expect(document.documentElement.lang).toBe('en');
  expect(document.title).toBe(t('app.name', 'en'));
});
