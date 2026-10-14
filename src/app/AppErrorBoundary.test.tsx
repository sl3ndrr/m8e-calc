import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { it, expect, vi } from 'vitest';
import { AppErrorBoundary } from './AppErrorBoundary';
import { snackbarQueue } from '../ui/snackbarQueue';
it('contains shared render failures, notifies and focuses the keyboard reset', async () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  snackbarQueue.clear();
  function Broken(): never {
    throw Error('private input');
  }
  const reset = vi.fn();
  render(
    <AppErrorBoundary onReset={reset}>
      <Broken />
    </AppErrorBoundary>,
  );
  expect(
    screen.getByRole('heading', {
      name: 'Die App konnte nicht geladen werden',
    }),
  ).toBeVisible();
  expect(
    await screen.findByText(
      'Etwas ist schiefgegangen. Bitte versuche die Aktion erneut.',
    ),
  ).toBeVisible();
  expect(screen.queryByText('private input')).toBeNull();
  await userEvent.setup().keyboard('{Enter}');
  expect(reset).toHaveBeenCalledOnce();
  snackbarQueue.clear();
  consoleError.mockRestore();
});
