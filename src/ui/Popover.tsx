import {
  Popover as AriaPopover,
  type PopoverProps as AriaPopoverProps,
} from 'react-aria-components';
import { useOverlayTransition } from './useOverlayTransition';
import './Popover.css';
export interface PopoverProps extends Omit<AriaPopoverProps, 'className'> {
  className?: string;
  onAfterClose?: () => void;
}
export function Popover({
  className = '',
  onAfterClose,
  ...props
}: PopoverProps) {
  const [overlayKey, overlayRef] = useOverlayTransition(onAfterClose);
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
