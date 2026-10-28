import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { execute } from '../../engine';
import { t } from '../../shared/i18n/extended';
import { VariablesPanel } from './ReferencePanels';
import { useHistoryStore } from '../../shared/historyStore';

it.each([
  ['de', 'fixed', 'v = 12.300'],
  ['en', 'fixed', 'v = 12,300'],
  ['de', 'auto', 'v = 1,23e+4'],
  ['en', 'auto', 'v = 1.23e+4'],
] as const)(
  'separates label, canonical edit and safe list actions in %s (%s)',
  async (locale, notation, label) => {
    let environment = execute('v=12345.678901234567890123456789');
    if (!environment.ok) throw new Error('setup');
    environment = execute('xs=factor(12)', environment.value.environment);
    if (!environment.ok) throw new Error('setup');
    const env = environment.value.environment;
    const snapshot = JSON.stringify(env);
    const history = useHistoryStore.getState().entries;
    const insert = vi.fn(),
      edit = vi.fn(),
      remove = vi.fn();
    const user = userEvent.setup();
    render(
      <VariablesPanel
        locale={locale}
        environment={env}
        format={{ locale, notation, digits: 3, grouping: true }}
        insert={insert}
        edit={edit}
        remove={remove}
      />,
    );
    const panel = screen.getByRole('region', {
      name: t('scientific.variables', locale),
    });
    expect(
      within(panel).getByRole('button', {
        name: `${label}: ${t('scientific.insert', locale, { text: 'v' })}`,
      }),
    ).toHaveTextContent(label);
    const editV = within(panel).getByRole('button', {
      name: t('scientific.edit', locale, { name: 'v' }),
    });
    editV.focus();
    await user.keyboard('{Enter}');
    expect(edit).toHaveBeenCalledExactlyOnceWith(
      'v = 12345.678901234567890123456789',
      'v',
    );
    const editList = within(panel).getByRole('button', {
      name: t('scientific.edit', locale, { name: 'xs' }),
    });
    expect(editList).toBeDisabled();
    expect(editList).toHaveAccessibleDescription(
      t('scientific.listEditUnavailable', locale),
    );
    await user.click(editList);
    expect(edit).toHaveBeenCalledTimes(1);
    const insertList = within(panel).getByRole('button', {
      name: `xs = [2, 2, 3]: ${t('scientific.insert', locale, { text: 'xs' })}`,
    });
    insertList.focus();
    await user.keyboard('{Enter}');
    expect(insert).toHaveBeenCalledExactlyOnceWith('xs');
    expect(JSON.stringify(env)).toBe(snapshot);
    expect(useHistoryStore.getState().entries).toBe(history);
    expect(within(panel).queryByRole('status')).not.toBeInTheDocument();
    expect(within(panel).queryByRole('alert')).not.toBeInTheDocument();
  },
);
