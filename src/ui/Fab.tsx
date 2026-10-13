import { IconButton, type IconButtonProps } from './IconButton';
import './Fab.css';
export type FabProps = IconButtonProps;
export function Fab({
  className = '',
  size = 'lg',
  variant = 'tonal',
  shape = 'square',
  ...props
}: FabProps) {
  return (
    <IconButton
      {...props}
      size={size}
      variant={variant}
      shape={shape}
      className={`ui-fab ${className}`}
    />
  );
}
