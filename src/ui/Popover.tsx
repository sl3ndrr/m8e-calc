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
  const [overlayKey, overlayRef] = useOverlayTransition();
  return (
    <AriaPopover
      {...props}
      defaultOpen={
        overlayKey > 0 && props.defaultOpen != null ? false : props.defaultOpen
      }
      key={overlayKey}
      ref={overlayRef}
      className={`ui-popover ${className}`}
    />
  );
}
