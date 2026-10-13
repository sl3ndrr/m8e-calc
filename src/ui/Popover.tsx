import type { HTMLAttributes, Ref } from 'react';
import {
  Popover as AriaPopover,
  type PopoverProps as AriaPopoverProps,
} from 'react-aria-components';
import './Popover.css';
export interface AriaSurfaceProps extends Omit<AriaPopoverProps, 'className'> {
  className?: string;
  native?: false;
}
/** Native top-layer adapter preserves AP2 auto-popover/light-dismiss behavior. */
export interface NativePopoverProps extends HTMLAttributes<HTMLDivElement> {
  native: true;
  ref?: Ref<HTMLDivElement>;
}
export type PopoverProps = AriaSurfaceProps | NativePopoverProps;
export function Popover(props: PopoverProps) {
  if (props.native) {
    const { native, className = '', ...rest } = props;
    return (
      <div
        {...rest}
        popover={native ? 'auto' : undefined}
        className={`ui-popover ${className}`}
      />
    );
  }
  const { native, className = '', ...rest } = props;
  return (
    <AriaPopover
      {...rest}
      className={`ui-popover ${className}`}
      data-native={native}
    />
  );
}
