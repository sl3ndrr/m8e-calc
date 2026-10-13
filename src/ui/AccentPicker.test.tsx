import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { AccentPicker } from './AccentPicker';
import { useSettingsStore } from '../shared/settingsStore';
import { defaultSettings } from '../shared/settings';
afterEach(() => useSettingsStore.setState(defaultSettings()));
it('updates seeds and customization, with color reset preserving appearance and motion', () => {
  useSettingsStore.setState({
    ...defaultSettings(),
    themeMode: 'dark',
    motionLevel: 'off',
  });
  render(<AccentPicker />);
  fireEvent.click(
    screen.getByRole('button', { name: 'Koralle', hidden: true }),
  );
  expect(useSettingsStore.getState().accent).toBe('#e2675a');
  fireEvent.change(screen.getByLabelText('Schema-Variante'), {
    target: { value: 'vibrant' },
  });
  fireEvent.change(screen.getByLabelText('Kontrast'), {
    target: { value: 'medium' },
  });
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
});
