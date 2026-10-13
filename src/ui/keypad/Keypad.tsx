import type { ReactNode } from 'react';
import { Button } from '../Button';
import './Keypad.css';
export type KeyRole =
  'digit' | 'operator' | 'equals' | 'clear' | 'function' | 'memory';
export interface KeypadKeyProps {
  id: string;
  children: ReactNode;
  label: string;
  colorRole?: KeyRole;
  pressed?: boolean;
  active?: boolean;
  disabled?: boolean;
  onPress: () => void;
}
export function KeypadKey({
  id,
  children,
  label,
  colorRole = 'digit',
  pressed,
  active,
  disabled,
  onPress,
}: KeypadKeyProps) {
  return (
    <div
      className="keypad-cell"
      data-key={id}
      data-role={colorRole}
      data-key-pressed={pressed || undefined}
      data-active={active || undefined}
    >
      <Button
        variant="tonal"
        className="keypad-key"
        aria-label={label}
        isDisabled={disabled}
        onPress={onPress}
      >
        {children}
      </Button>
    </div>
  );
}
export function Keypad({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="keypad" role="group" aria-label={label}>
      {children}
    </div>
  );
}
