import {
  Popover as AriaPopover,
  PopoverContext,
  useSlottedContext,
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
  const context = useSlottedContext(PopoverContext, props.slot);
  const [overlayKey, overlayRef] = useOverlayTransition(
    onAfterClose,
    props.triggerRef ?? context?.triggerRef,
  );
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
