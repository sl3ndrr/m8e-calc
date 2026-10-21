import {
  Popover as AriaPopover,
  type PopoverProps as AriaPopoverProps,
} from 'react-aria-components';
import { useOverlayTransition } from './useOverlayTransition';
import './Popover.css';
export interface PopoverProps extends Omit<AriaPopoverProps, 'className'> {
  className?: string;
}
export function Popover({ className = '', children, ...props }: PopoverProps) {
  const transition = useOverlayTransition();
  return (
    <AriaPopover
      {...props}
      key={transition.key}
      onTransitionCancel={transition.onTransitionCancel}
      className={`ui-popover ${className}`}
    >
      {(values) => (
        <div className="ui-popover-content" inert={values.isExiting}>
          {typeof children === 'function' ? children(values) : children}
        </div>
      )}
    </AriaPopover>
  );
}
