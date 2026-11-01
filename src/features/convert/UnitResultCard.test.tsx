import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { t } from '../../shared/i18n/extended';
import { UnitResultCard } from './UnitResultCard';

it.each(['de', 'en'] as const)(
  'keeps the whole value in the copy name while scrolling has no copy action (%s)',
  async (locale) => {
    const name = locale === 'de' ? 'Meter' : 'metre';
    const value = `-1${locale === 'de' ? ',' : '.'}2345678901234567890123456789012345678901234567891e-10000`;
    const copyLabel = t('convert.copyUnit', locale, { unit: name });
    const onCopy = vi.fn();
    const user = userEvent.setup();
    const view = render(
      <UnitResultCard
        name={name}
        value={value}
        symbol="m"
        system="SI"
        valueLabel={t('convert.valueRegion', locale, { unit: name })}
        copyLabel={copyLabel}
        copyActionLabel={t('convert.copyAction', locale)}
        onCopy={onCopy}
      />,
    );
    const region = screen.getByRole('region', {
      name: t('convert.valueRegion', locale, { unit: name }),
    });
    const copy = screen.getByRole('button', {
      name: `${name} ${value} m SI ${copyLabel}`,
    });
    await user.tab();
    expect(region).toHaveFocus();
    await user.keyboard('{ArrowRight}{End}{Enter} ');
    await user.click(region);
    expect(onCopy).not.toHaveBeenCalled();
    expect(region.textContent).toBe(value);
    expect(region.querySelector('button, input, a, [tabindex]')).toBeNull();
    expect(copy.contains(region)).toBe(false);
    expect(
      view.container.querySelector('[aria-live], [role="status"]'),
    ).toBeNull();
    await user.tab();
    expect(copy).toHaveFocus();
    await user.keyboard('{Enter} ');
    expect(onCopy).toHaveBeenCalledTimes(2);
    await user.click(copy);
    expect(onCopy).toHaveBeenCalledTimes(3);
  },
);
