import {
  Popover as AriaPopover,
  type PopoverProps as AriaPopoverProps,
} from 'react-aria-components';
import './Popover.css';
export interface PopoverProps extends Omit<AriaPopoverProps, 'className'> {
  className?: string;
}
export function Popover({ className = '', ...props }: PopoverProps) {
  return <AriaPopover {...props} className={`ui-popover ${className}`} />;
}
