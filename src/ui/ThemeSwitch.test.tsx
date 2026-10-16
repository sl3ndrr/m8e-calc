import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { ThemeSwitch } from './ThemeSwitch';
import { useSettingsStore } from '../shared/settingsStore';
import { defaultSettings } from '../shared/settings';
afterEach(() => useSettingsStore.setState(defaultSettings()));
it('exposes one tab stop and navigates the three radio segments by keyboard', () => {
  useSettingsStore.setState({ ...defaultSettings(), motionLevel: 'off' });
  render(<ThemeSwitch />);
  expect(
    screen.getByRole('radiogroup', { name: 'Erscheinungsbild' }),
  ).toBeVisible();
  const system = screen.getByRole('radio', { name: /System: Hell aktiv/ });
  expect(system).toHaveAttribute('tabindex', '0');
  fireEvent.keyDown(system, { key: 'ArrowRight' });
  const dark = screen.getByRole('radio', { name: 'Dunkel' });
  expect(dark).toHaveFocus();
  expect(dark).toBeChecked();
  fireEvent.keyDown(dark, { key: 'ArrowRight' });
  const light = screen.getByRole('radio', { name: 'Hell' });
  expect(light).toHaveFocus();
  expect(light).toBeChecked();
  fireEvent.keyDown(light, { key: 'End' });
  expect(dark).toHaveFocus();
  fireEvent.keyDown(dark, { key: 'Home' });
  expect(light).toHaveFocus();
});

it('renders one primary symbol per theme, retaining the regular light sun', () => {
  const { container } = render(<ThemeSwitch />);
  expect(Array.from(container.querySelectorAll('.ui-icon'), (icon) => icon.textContent)).toEqual([
    'light_mode', 'brightness_auto', 'dark_mode',
  ]);
  expect(container.querySelector('.system-indicator')).toBeNull();
});
