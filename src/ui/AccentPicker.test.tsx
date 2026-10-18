import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import { AccentPicker } from './AccentPicker';
import { useSettingsStore } from '../shared/settingsStore';
import { defaultSettings } from '../shared/settings';
afterEach(() => useSettingsStore.setState(defaultSettings()));
it('updates seeds and customization, with color reset preserving appearance and motion', async () => {
  const user = userEvent.setup();
  useSettingsStore.setState({
    ...defaultSettings(),
    themeMode: 'dark',
    motionLevel: 'off',
  });
  render(<AccentPicker />);
  await user.click(
    screen.getByRole('button', { name: 'Akzentfarbe anpassen' }),
  );
  const iris = await screen.findByRole('button', { name: 'Iris' });
  await waitFor(() => expect(iris).toHaveFocus());
  await user.click(
    await screen.findByRole('button', { name: 'Koralle' }),
  );
  expect(useSettingsStore.getState().accent).toBe('#e2675a');
  await user.click(screen.getByRole('button', { name: /Schema-Variante/ }));
  await user.click(screen.getByRole('option', { name: 'Lebendig' }));
  await user.click(screen.getByRole('button', { name: /Kontrast/ }));
  await user.click(screen.getByRole('option', { name: 'Mittel' }));
  expect(useSettingsStore.getState()).toMatchObject({
    schemeVariant: 'vibrant',
    contrast: 'medium',
  });
  fireEvent.change(screen.getByLabelText('Eigene Farbe'), {
    target: { value: '#008ba9' },
  });
  expect(useSettingsStore.getState().accent).toBe('#008ba9');
  await user.click(
    screen.getByRole('button', { name: 'Farben zurücksetzen' }),
  );
  expect(useSettingsStore.getState()).toMatchObject({
    ...defaultSettings(),
    themeMode: 'dark',
    motionLevel: 'off',
  });
  await user.keyboard('{Escape}');
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Akzentfarbe anpassen' }),
    ).toHaveFocus(),
  );
}, 20000);
