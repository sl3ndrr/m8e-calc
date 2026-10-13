import { Button, type ButtonProps } from './Button';
import { IconButton } from './IconButton';
import './Chip.css';
export interface ChipProps extends ButtonProps {
  kind?: 'assist' | 'filter' | 'input';
  onRemove?: () => void;
  removeLabel?: string;
}
export function Chip({
  kind = 'assist',
  onRemove,
  removeLabel,
  children,
  className = '',
  ...props
}: ChipProps) {
  return (
    <span className="ui-chip-wrap">
      <Button
        {...props}
        defaultSelected={
          kind === 'filter'
            ? (props.defaultSelected ?? false)
            : props.defaultSelected
        }
        variant="outlined"
        shape="square"
        size="sm"
        className={`ui-chip ${className}`}
      >
        {children}
      </Button>
      {kind === 'input' && onRemove && (
        <IconButton
          className="ui-chip-remove"
          icon="close"
          variant="text"
          aria-label={removeLabel ?? String(children)}
          onPress={onRemove}
          isDisabled={props.isDisabled}
        />
      )}
    </span>
  );
}
