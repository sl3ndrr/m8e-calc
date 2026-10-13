import { Button, type ButtonProps } from './Button';
import { Icon, type IconName } from './Icon';
import './IconButton.css';
export interface IconButtonProps extends Omit<ButtonProps, 'children'> {
  icon: IconName;
  'aria-label': string;
}
export function IconButton({
  icon,
  className = '',
  ...props
}: IconButtonProps) {
  return (
    <Button {...props} className={`ui-icon-button ${className}`}>
      <Icon name={icon} filled={props.isSelected} />
    </Button>
  );
}
