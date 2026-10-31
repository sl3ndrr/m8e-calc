import { useId } from 'react';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Icon } from '../../ui/Icon';
import { VisuallyHidden } from '../../ui/VisuallyHidden';
import { NumberRegion } from './NumberRegion';

export function UnitResultCard({
  name,
  value,
  symbol,
  system,
  valueLabel,
  copyLabel,
  copyActionLabel,
  active = false,
  disabled = false,
  onCopy,
}: {
  name: string;
  value: string;
  symbol: string;
  system?: string;
  valueLabel: string;
  copyLabel: string;
  copyActionLabel: string;
  active?: boolean;
  disabled?: boolean;
  onCopy: () => void;
}) {
  const id = useId();
  return (
    <Card className="convert-unit-card" data-active={active || undefined}>
      <span className="convert-unit-name" id={`${id}-name`}>
        {name}
      </span>
      <NumberRegion label={valueLabel}>
        <strong className="expression" id={`${id}-value`}>
          {value}
        </strong>
      </NumberRegion>
      <div className="convert-unit-footer">
        <span className="convert-unit-symbol" id={`${id}-symbol`}>
          {symbol}
        </span>
        <Button
          className="convert-unit-copy"
          variant="text"
          shape="square"
          isDisabled={disabled}
          aria-labelledby={`${id}-name ${id}-value ${id}-symbol${system ? ` ${id}-system` : ''} ${id}-copy`}
          onPress={onCopy}
        >
          <Icon name="content_copy" />
          <span>{copyActionLabel}</span>
          <VisuallyHidden id={`${id}-copy`}>{copyLabel}</VisuallyHidden>
        </Button>
      </div>
      {system && (
        <span className="convert-unit-system" id={`${id}-system`}>
          {system}
        </span>
      )}
    </Card>
  );
}
