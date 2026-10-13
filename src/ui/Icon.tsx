import type { HTMLAttributes } from 'react';
import './Icon.css';
/** Only names included in the locally hosted font subset. */
export type IconName =
  | 'light_mode'
  | 'brightness_auto'
  | 'dark_mode'
  | 'palette'
  | 'close'
  | 'check'
  | 'restart_alt'
  | 'play_arrow';
export interface IconProps extends Omit<
  HTMLAttributes<HTMLSpanElement>,
  'children'
> {
  name: IconName;
  filled?: boolean;
  label?: string;
}
export function Icon({
  name,
  filled = false,
  label,
  style,
  className = '',
  ...props
}: IconProps) {
  return (
    <span
      {...props}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`symbol ui-icon ${className}`}
      style={style}
      data-filled={filled || undefined}
    >
      {name}
    </span>
  );
}
