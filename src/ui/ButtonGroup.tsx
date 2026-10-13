import { Toolbar, type ToolbarProps } from 'react-aria-components';
import './ButtonGroup.css';
export interface ButtonGroupProps extends Omit<ToolbarProps, 'className'> {
  className?: string;
  connected?: boolean;
}
export function ButtonGroup({
  connected = false,
  className = '',
  ...props
}: ButtonGroupProps) {
  return (
    <Toolbar
      {...props}
      className={`ui-button-group ${className}`}
      data-connected={connected || undefined}
    />
  );
}
