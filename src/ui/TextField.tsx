import type { ReactNode } from 'react';
import {
  TextField as AriaTextField,
  Label,
  Input,
  Text,
  FieldError,
  type TextFieldProps as AriaTextFieldProps,
} from 'react-aria-components';
import './TextField.css';
import { StateLayer } from './StateLayer';
export interface TextFieldProps extends Omit<
  AriaTextFieldProps,
  'children' | 'className'
> {
  label: string;
  description?: string;
  errorMessage?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
  variant?: 'filled' | 'outlined';
  className?: string;
}
export function TextField({
  label,
  description,
  errorMessage,
  prefix,
  suffix,
  variant = 'outlined',
  className = '',
  ...props
}: TextFieldProps) {
  return (
    <AriaTextField
      {...props}
      className={`ui-text-field ${className}`}
      data-variant={variant}
    >
      <Label>{label}</Label>
      <div className="ui-text-input">
        <StateLayer />
        {prefix && <span aria-hidden="true">{prefix}</span>}
        <Input />
        {suffix && <span aria-hidden="true">{suffix}</span>}
      </div>
      {description && <Text slot="description">{description}</Text>}
      <FieldError>{errorMessage}</FieldError>
    </AriaTextField>
  );
}
