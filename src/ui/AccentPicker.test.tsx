import { fireEvent, render, screen } from '@testing-library/react';
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
  // jsdom has no native popover presentation; expose its mounted content.
  screen.getByRole('dialog', { hidden: true }).style.display = 'block';
  fireEvent.click(
    screen.getByRole('button', { name: 'Koralle', hidden: true }),
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
  fireEvent.click(
    screen.getByRole('button', { name: 'Farben zurücksetzen', hidden: true }),
  );
  expect(useSettingsStore.getState()).toMatchObject({
    ...defaultSettings(),
    themeMode: 'dark',
    motionLevel: 'off',
  });
}, 20000);
