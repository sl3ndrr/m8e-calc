import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { CalculatorDisplay, Keypad, KeypadKey } from './index';
import { t } from '../../shared/i18n';
it('exposes a named keypad, key action and externally controlled press/operator state', async () => {
  const action = vi.fn();
  const user = userEvent.setup();
  const { container, rerender } = render(
    <Keypad label="Keys">
      <KeypadKey
        id="+"
        label="Add"
        colorRole="operator"
        active
        pressed
        onPress={action}
      >
        +
      </KeypadKey>
    </Keypad>,
  );
  expect(screen.getByRole('group', { name: 'Keys' })).toBeVisible();
  expect(container.querySelector('[data-key="+"]')).toHaveAttribute(
    'data-active',
  );
  expect(container.querySelector('[data-key="+"]')).toHaveAttribute(
    'data-key-pressed',
  );
  await user.click(screen.getByRole('button', { name: 'Add' }));
  expect(action).toHaveBeenCalledOnce();
  rerender(
    <Keypad label="Keys">
      <KeypadKey
        id="+"
        label="Add"
        colorRole="operator"
        disabled
        onPress={action}
      >
        +
      </KeypadKey>
    </Keypad>,
  );
  expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
});
it('provides one live numeric output while visual characters are decorative', () => {
  const { container } = render(
    <CalculatorDisplay
      value="12,5"
      expression="10 + 2,5 ="
      copyLabel="Copy"
      resultLabel="Result"
      expressionLabel="Expression"
      onCopy={() => {}}
    />,
  );
  expect(screen.getByRole('status')).toHaveTextContent('12,5');
  expect(screen.getByRole('button')).toHaveAccessibleName('12,5 · Copy');
  expect(
    container.querySelectorAll('.calculator-character[aria-hidden="true"]'),
  ).toHaveLength(4);
});
it('disables copying in error state and announces the localized error', () => {
  render(
    <CalculatorDisplay
      value="0"
      expression="1 ÷ 0"
      error="Cannot divide by zero"
      copyLabel="Copy"
      resultLabel="Result"
      expressionLabel="Expression"
      onCopy={() => {}}
    />,
  );
  expect(screen.getByRole('button', { name: '0 · Copy' })).toBeDisabled();
  expect(screen.getByRole('status')).toHaveTextContent('Cannot divide by zero');
});

it.each(['de', 'en'] as const)(
  'updates the copy name and single live value in %s',
  async (locale) => {
    const copy = vi.fn();
    const user = userEvent.setup();
    const props = {
      expression: '1 / 3',
      copyLabel: t('simple.copy', locale),
      resultLabel: t('simple.result', locale),
      expressionLabel: t('simple.expression', locale),
      onCopy: copy,
    };
    const { rerender } = render(<CalculatorDisplay {...props} value="0" />);
    const value =
      locale === 'de' ? '−1,23456789012345e+100' : '−1.23456789012345e+100';
    rerender(<CalculatorDisplay {...props} value={value} />);
    const button = screen.getByRole('button', {
      name: `${value} · ${props.copyLabel}`,
    });
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent(value);
    expect(button.querySelector('[aria-live]')).toBeNull();
    button.focus();
    await user.keyboard('{Enter}');
    expect(copy).toHaveBeenCalledTimes(1);
    expect(button).toHaveFocus();
  },
);
