import {
  Popover as AriaPopover,
  type PopoverProps as AriaPopoverProps,
} from 'react-aria-components';
import { useOverlayTransition } from './useOverlayTransition';
import './Popover.css';
export interface PopoverProps extends Omit<AriaPopoverProps, 'className'> {
  className?: string;
}
export function Popover({ className = '', ...props }: PopoverProps) {
  const transition = useOverlayTransition();
  return (
    <AriaPopover
      {...props}
      key={transition.key}
      ref={transition.ref}
      className={`ui-popover ${className}`}
    />
  );
}
