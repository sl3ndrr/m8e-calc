import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ConvertMode from './ConvertMode';
import { useConvertStore } from './preferences';
import { useHistoryStore } from '../../shared/historyStore';
import { useSettingsStore } from '../../shared/settingsStore';
import { useAppStore } from '../../shared/store';
import { getMode } from '../../app/modeRegistry';
import { t } from '../../shared/i18n/extended';
beforeEach(() => {
  useAppStore.setState({ locale: 'de' });
  useSettingsStore
    .getState()
    .updateSettings({ language: 'de', motionLevel: 'off' });
  useHistoryStore.getState().resetHistory();
  useConvertStore.getState().update({
    favorites: [],
    recent: [],
    digits: 8,
    notation: 'auto',
    compound: false,
    sort: 'system',
  });
});
afterEach(() => vi.useRealTimers());
it.each(['de', 'en'] as const)(
  'applies inch queries and announces ambiguity in %s',
  async (locale) => {
    useAppStore.getState().setLocale(locale);
    const user = userEvent.setup();
    render(<ConvertMode />);
    const quick = screen.getByRole('textbox', {
      name: t('convert.quick', locale),
    });
    const from = () =>
      screen.getByRole('textbox', { name: t('convert.from', locale) });
    const to = () =>
      screen.getByRole('textbox', { name: t('convert.to', locale) });
    for (const [text, expected] of [
      ['1 in to cm', locale === 'de' ? '2,54' : '2.54'],
      ['1 in in cm', locale === 'de' ? '2,54' : '2.54'],
      ['3 ft 4 in to cm', locale === 'de' ? '101,6' : '101.6'],
    ] as const) {
      fireEvent.change(quick, { target: { value: text } });
      quick.focus();
      await user.keyboard('{Enter}');
      expect(to()).toHaveValue(expected);
      expect(from()).toHaveFocus();
      expect(quick).not.toHaveAttribute('aria-invalid', 'true');
    }
    const before = (to() as HTMLInputElement).value;
    fireEvent.change(quick, { target: { value: '1 mA in ma' } });
    quick.focus();
    await user.keyboard('{Enter}');
    expect(quick).toHaveFocus();
    expect(quick).toHaveAttribute('aria-invalid', 'true');
    expect(
      screen.getByText(t('convert.error.E_UNIT_AMBIGUOUS', locale)),
    ).toBeVisible();
    expect(to()).toHaveValue(before);
  },
);
it.each(['de', 'en'] as const)(
  'retains the complete visible pair in favorite/recent action names in %s',
  async (locale) => {
    useAppStore.getState().setLocale(locale);
    const pair = { categoryId: 'length', fromId: 'km', toId: 'm' } as const;
    useConvertStore.getState().update({ favorites: [pair], recent: [pair] });
    render(<ConvertMode />);
    const name = `km → m · ${t('convert.loadPair', locale, { category: locale === 'de' ? 'Länge' : 'Length', from: 'km', to: 'm' })}`;
    const controls = screen.getAllByRole('button', { name });
    expect(controls).toHaveLength(2);
    for (const control of controls) expect(control).toHaveTextContent('km → m');
    const control = controls[0];
    if (!control) throw new Error('Missing pair action');
    control.focus();
    await userEvent.setup().keyboard('{Enter}');
    expect(
      screen.getByRole('combobox', {
        name: t('convert.toUnit', locale),
      }),
    ).toHaveValue(locale === 'de' ? 'm · Meter' : 'm · metre');
  },
);
it('converts localized source and target inputs and swaps without rounding the model', async () => {
  const user = userEvent.setup();
  render(<ConvertMode />);
  await user.clear(screen.getByRole('textbox', { name: t('convert.from') }));
  await user.type(
    screen.getByRole('textbox', { name: t('convert.from') }),
    '5',
  );
  expect(screen.getByRole('textbox', { name: t('convert.to') })).toHaveValue(
    '3,106856',
  );
  await user.click(screen.getByRole('button', { name: t('convert.swap') }));
  expect(screen.getByRole('textbox', { name: t('convert.to') })).toHaveValue(
    '5',
  );
  await user.clear(screen.getByRole('textbox', { name: t('convert.to') }));
  await user.type(
    screen.getByRole('textbox', { name: t('convert.to') }),
    '10,5',
  );
  expect(
    screen.getByRole('textbox', { name: t('convert.from') }),
  ).not.toHaveValue('5');
});
it('applies quick entry, keyboard focus and domain errors', async () => {
  const user = userEvent.setup();
  render(<ConvertMode />);
  await user.keyboard('/');
  expect(
    screen.getByRole('textbox', { name: t('convert.quick') }),
  ).toHaveFocus();
  await user.type(
    screen.getByRole('textbox', { name: t('convert.quick') }),
    '72 °F -> °C{Enter}',
  );
  expect(screen.getByRole('heading', { name: 'Temperatur' })).toBeVisible();
  expect(screen.getByRole('textbox', { name: t('convert.to') })).toHaveValue(
    '22,222222',
  );
  const from = screen.getByRole('textbox', { name: t('convert.from') });
  await user.clear(from);
  await user.type(from, '-1000');
  expect(screen.getByText(t('convert.error.E_UNIT_DOMAIN'))).toBeVisible();
  expect(screen.queryByLabelText(t('convert.result'))).not.toBeInTheDocument();
});
it('records after 1.5s quiet, replaces the pair, preserves pins, restores and cancels on unmount', () => {
  vi.useFakeTimers();
  const view = render(<ConvertMode />);
  const from = screen.getByRole('textbox', { name: t('convert.from') });
  fireEvent.change(from, { target: { value: '5' } });
  act(() => vi.advanceTimersByTime(1499));
  expect(useHistoryStore.getState().entries).toHaveLength(0);
  fireEvent.change(from, { target: { value: '6' } });
  act(() => vi.advanceTimersByTime(1500));
  const entry = useHistoryStore.getState().entries[0];
  expect(entry?.payload).toMatchObject({
    value: '6',
    fromId: 'km',
    toId: 'mi',
  });
  if (!entry) throw Error('Missing history');
  act(() => useHistoryStore.getState().togglePin(entry.id));
  fireEvent.change(from, { target: { value: '7' } });
  act(() => vi.advanceTimersByTime(1500));
  expect(useHistoryStore.getState().entries).toHaveLength(1);
  expect(useHistoryStore.getState().entries[0]?.pinned).toBe(true);
  act(() => {
    getMode('convert').historyAdapter.restore(entry);
  });
  expect(from).toHaveValue('6');
  act(() => vi.advanceTimersByTime(2000));
  expect(useHistoryStore.getState().entries[0]?.payload).toMatchObject({
    value: '7',
  });
  fireEvent.change(from, { target: { value: '8' } });
  view.unmount();
  act(() => vi.advanceTimersByTime(2000));
  expect(useHistoryStore.getState().entries).toHaveLength(1);
});
it('groups searchable units with favorites first and filters categories', async () => {
  const user = userEvent.setup();
  render(<ConvertMode />);
  await user.click(screen.getByRole('button', { name: t('convert.favorite') }));
  expect(useConvertStore.getState().favorites).toHaveLength(1);
  const picker = screen.getByRole('combobox', { name: t('convert.fromUnit') });
  await user.clear(picker);
  await user.type(picker, 'Kilometer');
  expect(
    await screen.findByRole('option', { name: 'km · Kilometer' }),
  ).toBeVisible();
  await user.keyboard('{ArrowDown}{Enter}');
  await user.type(
    screen.getByRole('searchbox', { name: t('convert.searchCategories') }),
    'Temperatur',
  );
  expect(screen.getByRole('button', { name: 'Temperatur' })).toBeVisible();
});
