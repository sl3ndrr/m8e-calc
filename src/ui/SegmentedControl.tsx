import type { ReactNode, Ref } from 'react';
import { RadioGroup, Radio, type RadioGroupProps } from 'react-aria-components';
import { StateLayer } from './StateLayer';
import './SegmentedControl.css';
export interface Segment {
  id: string;
  label: ReactNode;
  ariaLabel?: string;
  title?: string;
  isDisabled?: boolean;
}
export interface SegmentedControlProps extends Omit<
  RadioGroupProps,
  'children' | 'className'
> {
  items: readonly Segment[];
  className?: string;
  ref?: Ref<HTMLDivElement>;
  adornment?: ReactNode;
}
export function SegmentedControl({
  items,
  className = '',
  ref,
  adornment,
  ...props
}: SegmentedControlProps) {
  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Delegated shortcuts focus native radio inputs; the wrapper is not a tab stop.
    <div
      onKeyDown={(event) => {
        if (!['Home', 'End'].includes(event.key)) return;
        const enabled = Array.from(
          event.currentTarget.querySelectorAll<HTMLInputElement>(
            'input[type="radio"]:not(:disabled)',
          ),
        );
        const input = event.key === 'Home' ? enabled[0] : enabled.at(-1);
        if (input) {
          event.preventDefault();
          input.focus();
          input.click();
        }
      }}
    >
      <RadioGroup
        {...props}
        ref={ref}
        className={`ui-segments ${className}`}
        orientation={props.orientation ?? 'horizontal'}
      >
        {adornment}
        {items.map((item) => (
          <Radio
            key={item.id}
            value={item.id}
            aria-label={item.ariaLabel}
            isDisabled={item.isDisabled}
            className="ui-segment"
          >
            <StateLayer />
            <span title={item.title}>{item.label}</span>
          </Radio>
        ))}
      </RadioGroup>
    </div>
  );
}
