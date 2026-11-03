import type { ComponentProps } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type GraphCanvas from './GraphCanvas';
import GraphMode from './GraphMode';
import { useAppStore } from '../../shared/store';
import { t } from '../../shared/i18n/extended';
import { snackbarQueue } from '../../ui/snackbarQueue';

const canvas = vi.hoisted(() => ({
  pending: undefined as ((pending: boolean) => void) | undefined,
  api: {
    fit: vi.fn(),
    reset: vi.fn(),
    zoom: vi.fn(),
    preset: vi.fn(),
    viewport: () => null,
    desiredViewport: () => null,
    export: vi.fn(() => Promise.reject(new Error('GraphSamplingPending'))),
  },
}));
vi.mock('./GraphCanvas', async () => {
  const { useEffect, useImperativeHandle } = await import('react');
  return {
    default: function Canvas(props: ComponentProps<typeof GraphCanvas>) {
      useImperativeHandle(props.ref, () => canvas.api);
      useEffect(() => {
        canvas.pending = props.onSamplingChange;
      }, [props.onSamplingChange]);
      return <div />;
    },
  };
});
vi.mock('../../ui/snackbarQueue', () => ({
  snackbarQueue: { add: vi.fn() },
}));
afterEach(() => {
  useAppStore.setState({ locale: 'de' });
  vi.clearAllMocks();
});

it.each(['de', 'en'] as const)(
  'describes pending exports from Canvas state and retains rejection in %s',
  async (locale) => {
    useAppStore.setState({ locale });
    render(<GraphMode />);
    const status = screen.getByRole('status');
    const exportButton = screen.getByRole('button', {
      name: t('graph.export', locale),
    });
    expect(exportButton).toHaveAccessibleDescription(
      t('graph.update.pending', locale),
    );
    expect(exportButton).toBeEnabled();
    fireEvent.click(exportButton);
    await waitFor(() =>
      expect(snackbarQueue.add).toHaveBeenCalledWith({
        message: t('graph.exportPending', locale),
      }),
    );
    expect(canvas.api.export).toHaveBeenCalledWith(false);
    for (const pending of [false, true, false]) {
      act(() => canvas.pending?.(pending));
      expect(screen.getByRole('status')).toBe(status);
      expect(exportButton).toHaveAccessibleDescription(
        t(pending ? 'graph.update.pending' : 'graph.update.ready', locale),
      );
      expect(
        screen.getByRole('button', { name: t('graph.copy', locale) }),
      ).toHaveAccessibleDescription(
        t(pending ? 'graph.update.pending' : 'graph.update.ready', locale),
      );
    }
    fireEvent.click(
      screen.getByRole('button', { name: t('graph.reset', locale) }),
    );
    expect(canvas.api.reset).toHaveBeenCalledOnce();
    expect(canvas.api.fit).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', { name: t('graph.fit', locale), exact: true }),
    );
    expect(canvas.api.fit).toHaveBeenCalledOnce();
    expect(
      screen.getByRole('checkbox', { name: t('graph.aspect', locale) }),
    ).toHaveAccessibleDescription(t('graph.aspectHint', locale));
  },
);
