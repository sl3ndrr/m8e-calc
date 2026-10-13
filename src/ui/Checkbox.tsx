import {
  Checkbox as AriaCheckbox,
  type CheckboxProps as AriaCheckboxProps,
} from 'react-aria-components';
import { StateLayer } from './StateLayer';
import { Icon } from './Icon';
import './Checkbox.css';
export interface CheckboxProps extends Omit<AriaCheckboxProps, 'className'> {
  className?: string;
}
export function Checkbox({
  children,
  className = '',
  ...props
}: CheckboxProps) {
  return (
    <AriaCheckbox {...props} className={`ui-checkbox ${className}`}>
      {(state) => (
        <>
          <StateLayer />
          <span className="ui-checkbox-box" aria-hidden="true">
            {state.isIndeterminate ? (
              <span className="ui-checkbox-dash" />
            ) : state.isSelected ? (
              <Icon name="check" />
            ) : null}
          </span>
          {typeof children === 'function' ? children(state) : children}
        </>
      )}
    </AriaCheckbox>
  );
}
