import { Button, type ButtonProps } from './Button';
import { Icon, type IconName } from './Icon';
import './ExtendedFab.css';
export interface ExtendedFabProps extends ButtonProps {
  icon: IconName;
}
export function ExtendedFab({
  icon,
  children,
  className = '',
  ...props
}: ExtendedFabProps) {
  return (
    <Button
      variant="tonal"
      shape="square"
      size="lg"
      {...props}
      className={`ui-extended-fab ${className}`}
    >
      <Icon name={icon} />
      {children}
    </Button>
  );
}
